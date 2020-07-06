//lock说白了，在这里是写了一个状态机，当作锁呀
const UNLOCKED = 0;
const LOCKED_NO_WAITERS = 1;
const LOCKED_POSSIBLE_WAITERS = 2;
const NUMINTS = 1;

class Lock {
    
    //构造函数里边数据的初始化
    //iab是传进来的typeArray,ibse是指传进来的index，我们把typeArray的首位给了锁使用
    constructor(iab, ibase) {
        if (!(iab instanceof Int32Array && ibase|0 === ibase && ibase >= 0 && ibase+NUMINTS <= iab.length)) {
            throw new Error(`Bad arguments to Lock constructor: ${iab} ${ibase}`);
        }
        this.iab = iab;
        this.ibase = ibase;
    }
    //如果传进来的数据不满足条件，就抛出错误，
    //如果满足条件就给typeArr的对应index赋初值，并返回index
    static initialize(iab, ibase) {
        if (!(iab instanceof Int32Array && ibase|0 === ibase && ibase >= 0 && ibase+NUMINTS <= iab.length)) {
            throw new Error(`Bad arguments to Lock constructor: ${iab} ${ibase}`);
        }
        Atomics.store(iab, ibase, UNLOCKED);
        return ibase;
    }
    //获取锁或者等待直到我们可以往下运行，锁不能递归
    lock() {
        //获取typeArray和index
        const iab = this.iab;
        const stateIdx = this.ibase;
        var c;
        //当进程A活取锁成功时候，A处一开始应该是UNLOCKED,和后边!==应该是UNLOCKED,不满足，跳过
        //但前边Atomics.compareExchange返回是UNLOCKED，并把 LOCKED_NO_WAITERS和 UNLOCKED做了置换
        //等到B处，再执行lock获取锁的时候，此时LOCKED_NO_WAITERS !== UNLOCKED ,走进do while
        if ((c = Atomics.compareExchange(iab, stateIdx, UNLOCKED, LOCKED_NO_WAITERS)) !== UNLOCKED) { // A
            do {
                //if时满足期望值，返回LOCKED_NO_WAITERS，并把LOCKED_NO_WAITERS和LOCKED_POSSIBLE_WAITERS做替换，且!== UNLOCKED
                if (c === LOCKED_POSSIBLE_WAITERS|| Atomics.compareExchange(iab, stateIdx, LOCKED_NO_WAITERS, LOCKED_POSSIBLE_WAITERS) !== UNLOCKED) {
                    //进入if，Atomics.wait index位置在上一步已经替换为期望值，所以等待，最后一个参数是等待时间
                    Atomics.wait(iab, stateIdx, LOCKED_POSSIBLE_WAITERS, Number.POSITIVE_INFINITY);
                }
            } 
            //走到do while之后，while时c = LOCKED_NO_WAITERS 和期望值不符，走进if
            while ((c = Atomics.compareExchange(iab, stateIdx, UNLOCKED, LOCKED_POSSIBLE_WAITERS)) !== UNLOCKED); // B
        }
    }
    //判断目前是不是无锁状态
    tryLock() {
        const iab = this.iab;
        const stateIdx = this.ibase;
        return Atomics.compareExchange(iab, stateIdx, UNLOCKED, LOCKED_NO_WAITERS) === UNLOCKED;
    }
    //解锁
    unlock() {
        const iab = this.iab;
        const stateIdx = this.ibase;
        //index位置上的值减去1，并且返回旧值为LOCKED_POSSIBLE_WAITERS==2
        var v0 = Atomics.sub(iab, stateIdx, 1);
        //LOCKED_POSSIBLE_WAITERS==2 不等于OCKED_NO_WAITERS==1 重新置初值
        if (v0 !== LOCKED_NO_WAITERS) {
            //置初值
            Atomics.store(iab, stateIdx, UNLOCKED);
            //通知休眠的wait执行
            Atomics.notify(iab, stateIdx, 1);
        }
    }
    toString() {
        return "Lock:{ibase:" + this.ibase +"}";
    }
}
exports.Lock = Lock;


/*======================Atomics.compareExchange=============================
Atomics.compareExchange(typedArray, index, expectedValue, replacementValue)：
如果 index 位置的值为 expectedValue，则与 replcementValue 交换，返回旧值。

const buffer = new SharedArrayBuffer(16);
const uint8 = new Uint8Array(buffer);
uint8[0] = 5;

//index位置的值是5，和下边的期望值相等，置换5和2，返回为5
Atomics.compareExchange(uint8, 0, 5, 2); // returns 5


console.log(Atomics.load(uint8, 0));
// expected output: 2


//重要的，这时候index位置上的值已经被替换成2了

Atomics.compareExchange(uint8, 0, 5, 4); // returns 2
console.log(Atomics.load(uint8, 0));
// expected output: 2



*/