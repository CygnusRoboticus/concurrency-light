"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_property_1 = require("./task-property");
var TaskStrategy;
(function (TaskStrategy) {
    /**
     * The Drop strategy will discard any new calls if the task is currently running.
     */
    TaskStrategy[TaskStrategy["Drop"] = 0] = "Drop";
    /**
     * The KeepLast strategy works as a length=1 queue, keeping the latest call if the task is already running.
     */
    TaskStrategy[TaskStrategy["KeepLast"] = 1] = "KeepLast";
    /**
     * The Restart strategy will cancel the currently running instance when it is called.
     */
    TaskStrategy[TaskStrategy["Restart"] = 2] = "Restart";
    /**
     * The Queue strategy will run calls sequentially FIFO.
     */
    TaskStrategy[TaskStrategy["Queue"] = 3] = "Queue";
})(TaskStrategy = exports.TaskStrategy || (exports.TaskStrategy = {}));
/**
 * Decorator for generator functions to behave as a task-like function.
 * @see Task<T, U>
 */
function task(taskOptions = {}) {
    return (_, __, descriptor) => {
        const method = descriptor.value;
        descriptor.value = task_property_1.generatorToTask(method, taskOptions);
        return descriptor;
    };
}
exports.task = task;
/**
 * Creates a delayed promise. Useful for manually debouncing.
 */
function timeout(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
}
exports.timeout = timeout;
