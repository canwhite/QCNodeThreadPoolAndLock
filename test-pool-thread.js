// worker.js
const { isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
    throw new Error('Its not a worker');
}

//生成3个随机数的数组，并将数组排序
const doCalcs = (data) => {
    const collection = [];
    
    for (let i = 0; i < 3; i++) {
        collection[i] = Math.round(Math.random() * 1000);
    }
    
    return collection.sort((a, b) => { return a - b });
};
//2.子线程接收传过来的数据，并进行cpu耗时操作
parentPort.on('message', (data) => {
    const result = doCalcs(data);
    parentPort.postMessage(result);
});
