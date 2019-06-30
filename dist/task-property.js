"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_1 = require("./task");
const task_instance_1 = require("./task-instance");
function generatorToTask(generator, opts) {
    let perform;
    perform = function (...args) {
        const instance = new task_instance_1.TaskInstance(this, generator, args, opts.debounce);
        if (perform.isQueue) {
            perform.enqueue(instance);
            return perform.runQueue();
        }
        else if (perform.isKeepLast) {
            perform.cancelQueued();
            perform.enqueue(instance);
            return perform.runQueue();
        }
        else if (!perform.isRunning) {
            return perform.run(instance);
        }
        else if (perform.isDrop) {
            perform.drop(instance);
            return perform.currentRun;
        }
        else if (perform.isRestart) {
            perform.cancelAll();
            return perform.run(instance);
        }
        else {
            // isConcurrent
            return perform.run(instance);
        }
    };
    Object.assign(perform, {
        currentRun: undefined,
        queuedInstances: [],
        runningInstances: [],
        isConcurrent: !opts.strategy,
        isDrop: opts.strategy === task_1.TaskStrategy.Drop,
        isKeepLast: opts.strategy === task_1.TaskStrategy.KeepLast,
        isQueue: opts.strategy === task_1.TaskStrategy.Queue,
        isRestart: opts.strategy === task_1.TaskStrategy.Restart,
        lastError: undefined,
        lastResult: undefined,
        lastSuccess: undefined,
        run(instance) {
            const instanceRun = instance.perform();
            this.currentRun = instance;
            this.runningInstances.push(instance);
            return instanceRun
                .then(result => {
                this.lastSuccess = result;
                this.lastResult = result;
                this.removeTask(instance);
                return result;
            })
                .catch(error => {
                if (error instanceof task_instance_1.CancellationError) {
                    this.lastError = error;
                    this.lastResult = error;
                }
                this.removeTask(instance);
                return error;
            });
        },
        removeTask(instance) {
            if (instance) {
                const position = this.runningInstances.indexOf(instance);
                const queuePosition = this.queuedInstances.indexOf(instance);
                if (position >= 0) {
                    this.runningInstances.splice(position);
                }
                if (queuePosition >= 0) {
                    this.queuedInstances.splice(queuePosition);
                }
                if (this.currentRun === instance) {
                    this.currentRun = undefined;
                }
            }
        },
        runQueue() {
            if (this.isRunning) {
                return this.currentRun.run;
            }
            else if (this.queuedInstances.length) {
                const instance = this.queuedInstances.pop();
                return this.run(instance).then(() => this.runQueue());
            }
            else {
                return Promise.resolve(this.lastSuccess);
            }
        },
        enqueue(instance) {
            this.queuedInstances.unshift(instance);
        },
        drop(instance) {
            instance.drop();
            this.removeTask(instance);
        },
        cancel() {
            if (this.currentRun) {
                this.currentRun.cancel();
                this.removeTask(this.currentRun);
            }
        },
        cancelInstance(instance) {
            instance.cancel();
            this.removeTask(instance);
        },
        cancelQueued() {
            this.queuedInstances.forEach(i => {
                i.cancel();
                this.removeTask(i);
            });
        },
        cancelRunning() {
            this.runningInstances.forEach(i => {
                i.cancel();
                this.removeTask(i);
            });
        },
        cancelAll() {
            this.cancelQueued();
            this.cancelRunning();
            this.cancel();
        }
    });
    Object.defineProperties(perform, {
        isRunning: {
            get() {
                return !!this.currentRun;
            }
        }
    });
    return perform;
}
exports.generatorToTask = generatorToTask;
