let Lock = require('./tools/lock').Lock;//获取锁实例
let { parentPort, workerData } = require('worker_threads');
const sharedArray = new Int32Array(workerData);
const lock = new Lock(sharedArray, 0);

console.log('----进入到其他线程B内部----'); // (A)// 获取锁

console.log('----其他线程B内部获取锁，等待主线程释放锁，这里才能释放，向下执行----'); 
lock.lock(); // (B) blocks!，此时锁已经被主线程获取，因此在此阻塞，等待主线程释放，再继续执行
console.log('----其他线程锁B已释放----'); // (C)

/*
主线程和工作线程通信
*/


/*
parentPort.on('message', (msg) => { //工作线程收
    console.log(msg); 
    parentPort.close()//工作线程收完，如果没有其它监听,记得关闭监听，否则一直监听
});

// parentPort.postMessage="hello";  //这种赤裸裸的错误千万不要泛
parentPort.postMessage('hello main');//工作线程发

*/

