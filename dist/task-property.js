"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_1 = require("./task");
const task_instance_1 = require("./task-instance");
/**
 * Wraps a generator function in an ITaskProperty<T> object, providing
 * debouncing and a flag to check if the generator function is running.
 *
 * usage:
 * ```typescript
 * const doSomething = generatorToTask(function*() {
 *   yield new Promise((resolve) => {
 *     setTimeout(() => {
 *       resolve('yeah!');
 *     }), 1000);
 *   }, this);
 * }, { strategy: TaskStrategy.Restartable });
 *
 * doSomething.isRunning   // false;
 * doSomething();
 * doSomething.isRunning   // true;
 * doSomething();          // silently dropped
 * doSomething.lastResult; //'yeah!'
 * ```
 */
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
        else if (perform.isRestartable) {
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
        queue: [],
        running: [],
        isConcurrent: !opts.strategy,
        isDrop: opts.strategy === task_1.TaskStrategy.Drop,
        isKeepLast: opts.strategy === task_1.TaskStrategy.KeepLast,
        isQueue: opts.strategy === task_1.TaskStrategy.Queue,
        isRestartable: opts.strategy === task_1.TaskStrategy.Restartable,
        lastError: undefined,
        lastResult: undefined,
        lastSuccess: undefined,
        run(instance) {
            const instanceRun = instance.perform();
            this.currentRun = instance;
            this.running.push(instance);
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
                const position = this.running.indexOf(instance);
                const queuePosition = this.queue.indexOf(instance);
                if (position >= 0) {
                    this.running.splice(position);
                }
                if (queuePosition >= 0) {
                    this.queue.splice(queuePosition);
                }
                if (this.currentRun === instance) {
                    this.currentRun = undefined;
                }
            }
        },
        runQueue() {
            if (this.isRunning) {
                // do nothing
            }
            else if (this.queue.length) {
                const instance = this.queue.pop();
                return this.run(instance).then(() => {
                    return this.runQueue();
                });
            }
            else {
                return Promise.resolve(this.lastSuccess);
            }
        },
        enqueue(instance) {
            this.queue.unshift(instance);
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
            this.queue.forEach(i => {
                i.cancel();
                this.removeTask(i);
            });
        },
        cancelRunning() {
            this.running.forEach(i => {
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
