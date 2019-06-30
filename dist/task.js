"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_property_1 = require("./task-property");
var TaskStrategy;
(function (TaskStrategy) {
    TaskStrategy[TaskStrategy["Drop"] = 0] = "Drop";
    TaskStrategy[TaskStrategy["KeepLast"] = 1] = "KeepLast";
    TaskStrategy[TaskStrategy["Restartable"] = 2] = "Restartable";
    TaskStrategy[TaskStrategy["Queue"] = 3] = "Queue";
})(TaskStrategy = exports.TaskStrategy || (exports.TaskStrategy = {}));
/**
 * usage:
 * ```typescript
 * class Foo {
 *   @task()
 *   *doSomething() {
 *     yield asyncAction();
 *   }
 * }
 * ```
 */
function task(taskOptions = {}) {
    return (target, propertyKey, descriptor) => {
        const method = descriptor.value;
        descriptor.value = task_property_1.generatorToTask(method, taskOptions);
        return descriptor;
    };
}
exports.task = task;
function timeout(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
}
exports.timeout = timeout;
