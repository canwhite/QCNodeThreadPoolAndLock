const path = require('path');
const { Worker } = require('worker_threads');

//跑起来
//node --experimental-worker 01-worker_pool.js

/*
线程池的封装
*/
class WorkerPool {
    //构造函数
    constructor(workerPath, numOfThreads) {
        //执行文件路径
        this.workerPath = workerPath;
        //线程个数
        this.numOfThreads = numOfThreads;
        //初始化数据
        this.init();
    }

    //初始化数据
    init() {
        //线程引用数组
        this._workers = [];                    
        //已经被激活的线程数组
        this._activeWorkers = [];              
        //排队队列
        this._queue = [];  
        //如果线程个数<1,抛出错误                    
        if (this.numOfThreads < 1) {
            throw new Error('线程池最小线程数应为1');
        }
        //for循环创建子线程
        for (let i = 0;i < this.numOfThreads; i++) {
            //创建子线程，执行耗时操作
            const worker = new Worker(this.workerPath);
            //将子线程加入线程数组
            this._workers[i] = worker;
            //新建的线程都处于非激活状态
            this._activeWorkers[i] = false;
        }
    }

    // 结束线程池中所有线程
    destroy() {
        for (let i = 0; i < this.numOfThreads; i++) {
            //如果依然存在活跃线程，抛出错误
            if (this._activeWorkers[i]) {
                throw new Error(`${i}号线程仍在工作中...`);
            }
            //如果此线程没有在工作，关闭线程
            this._workers[i].terminate();
        }
    }

    // 检查是否有空闲worker
    checkWorkers() {
        //检查是否有闲置线程，并返回
        for (let i = 0; i < this.numOfThreads; i++) {
            if (!this._activeWorkers[i]) {
                return i;
            }
        }
        return -1;
    }
    //============对外运行函数，接收外界传过来的参数================
    run(getData) {
        //返回Promise，因为使用的时候await等待着Promise返回值
        return new Promise((resolve, reject) => {
            //查找闲置线程
            const restWorkerId = this.checkWorkers();
            //把数据和block包装好
            const queueItem = {
                getData,//传进来的数据
                callback: (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    return resolve(result);
                }//block的展开
            }
            
            // 如果线程池已满，那么就往队列中添加数据
            if (restWorkerId === -1) {
                this._queue.push(queueItem);
                return null;
            }
            
            // 如果有空余线程，那就拿到空余线程id和操作包直接跑
            this.runWorker(restWorkerId, queueItem);
        })
    }
    //操作子线程
    async runWorker(workerId, queueItem) {
        //得到将要被操作的子线程
        const worker = this._workers[workerId];
        //将此线程激活，防止被其他任务使用
        this._activeWorkers[workerId] = true;

        // 线程信息回调
        const messageCallback = (result) => {
            //调用block存值，然后run()中block展开，resolve拿到值，Promise传值成功
            queueItem.callback(null, result);
            cleanUp();
        };
           
        // 线程错误回调
        const errorCallback = (error) => {
            //调用block存值，然后run中block展开，reject拿到值，Promise传值成功
            queueItem.callback(error);
            cleanUp();
        };

        // 任务结束消除旧监听器,若还有待完成任务,继续完成
        const cleanUp = () => {
            //去除对message和error的消息监听，是worker本身的方法
            worker.removeAllListeners('message');
            worker.removeAllListeners('error');
            //将对应线程放回闲置状态
            this._activeWorkers[workerId] = false;
            
            //如果排队队列是空的，说明已经没有多余任务要执行了，我们结束就可以了
            if (this._queue.length == 0) {
                return null;
            }
            //如果排队队列中还有任务，那么这个线程也别让它闲着了，重新激活开始处理排队任务的操作包
            this.runWorker(workerId, this._queue.shift());
            //PS：shift()用于将数组的第一个元素从数组中删除，并返回第一个元素
        }
        //=============此方法进来后直接执行的是这部分 ===================
        // 线程创建监听结果/错误，并执行上边的回调方法
        worker.once('message', messageCallback);
        worker.once('error', errorCallback);
        // 1.向子线程传递初始data
        worker.postMessage(queueItem.getData);
    }
}

exports.WorkerPool = WorkerPool;




/*
用forEach会报错，forEach返回的是一个个的值
错误原因是，promise.all的参数应该是数组，而不是一个个的值

items.forEach(
    //async默认返回promise，会给上边新建的空数组填充，promise元素
    async (item, i,list) => {
        list[i] = await pool.run(i);
        console.log(`任务${i}完成了:`,list[i]);//单个输出了，那就没必要在下边all整个输出了
        //如果不返回res,则最终结果是undefined
        //PS：map()对每一个元素操作return，并返回一个新数组，需要有返回值。
    }
))
*/