let { Worker,isMainThread,parentPort, workerData } = require('worker_threads');//node新增的线程模块，用于创建新线程
let Lock = require('./tools/lock').Lock;//线程锁工具类
let WorkerPool = require('./tools/pool').WorkerPool;//线程池工具类
const path = require('path');

/*
=================线程锁的使用====================
*/
function lock_use(){

    /*SharedArrayBuffer，简称sab,是一个主线程可以和worker线程间共享数据的对象，
    即同一个sab可以被多个线程编写*/
    const sharedBuffer = new SharedArrayBuffer(1 * Int32Array.BYTES_PER_ELEMENT);

    /*threads之间通过sab共享数据，可真正操作ArrayBuffer时并不直接使用该对象，而是TypeArray。
    如Int32Array*/
    const sharedArray = new Int32Array(sharedBuffer);
    //创建工作线程
    const worker = new Worker('./test-lock-thread.js', {workerData: sharedBuffer});//建新线程

    Lock.initialize(sharedArray, 0);//初始化锁
    
    const lock = new Lock(sharedArray, 0);//创建锁实例
    
    console.log('----主线程A开始----');
    
    console.log('----主线程A获取锁，阻断状态，走其他线程---');
    lock.lock();
    
    // 3s后释放锁
    setTimeout(() => {
        console.log('----主线程A释放锁----');
        lock.unlock(); // (B)
    }, 3000)
    
    /*主线程和工作线程通信，主线程中可以直接使用worker实例，在子线程中使用parentPort
    parentPort的实际类型是MessagePort ，而MessagePort和worker的关系是 ：worker.MessagePort
    */

    /*
    worker.postMessage('hello worker');//主线程发
    worker.on('message',(msg)=>{//主线程收
        console.log(msg);
    })
    */

}

/*
=================线程池的使用====================
*/
function pool_use(){

    //然后新建和执行，初始化线程数为4
    const pool = new WorkerPool(path.join(__dirname, './test-pool-thread.js'), 4);
    //创建有是个元素的数组，并且都填充为null
    const items = [...new Array(10)].fill(null);//只是提供一个运行次数
    /*
    Promise.all
    参数：一个promise组成的数组
    返回值：当Promise.all数组中所有promise都reolve之后，在then中返回结果数组，如果抛出错误，只会返回报错的那一个
    */

    //4个线程，10个任务,这里注意用map，返回Promise数组，
    //forEach没有返回值，只是操作每个item不能用
    let list = items.map(
        //async默认返回promise,这里等于生成10个Promise
        async (item, i) => {
            const res = await pool.run(i);
            console.log(`任务${i}完成了:`,res);//单个输出了，那就没必要在下边all整个输出了
            return res;
        }
    )
    console.log(list);
    Promise.all(list)
    .then((result) => {
        console.log('-------最终结果------')
        console.log( result);
        // 销毁线程池
        pool.destroy();

    })
    .catch((err)=>{
        console.log(err);
        //销毁线程池
        pool.destroy();
    });

}

//如果是在主线程内部
if(isMainThread){

    lock_use()
    
    
    //pool_use();

}






/*
//PS：补充

const promise1 = Promise.resolve(3);
const promise2 = 42;
const promise3 = new Promise((resolve, reject) => {
  setTimeout(resolve, 100, 'foo');
});

Promise.all([promise1, promise2, promise3]).then((values) => {
  console.log(values);
});
// expected output: Array [3, 42, "foo"]




*/