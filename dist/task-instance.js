"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_1 = require("./task");
var TaskState;
(function (TaskState) {
    TaskState[TaskState["Idle"] = 0] = "Idle";
    TaskState[TaskState["Running"] = 1] = "Running";
    TaskState[TaskState["Dropped"] = 2] = "Dropped";
    TaskState[TaskState["Cancelled"] = 3] = "Cancelled";
    TaskState[TaskState["Finished"] = 4] = "Finished";
})(TaskState || (TaskState = {}));
// tslint:disable max-classes-per-file
class CancellationError extends Error {
    constructor() {
        super("task cancelled");
    }
}
exports.CancellationError = CancellationError;
class TaskInstance {
    constructor(context, generator, args, debounce) {
        this.context = context;
        this.generator = generator;
        this.args = args;
        this.debounce = debounce;
        this.state = TaskState.Idle;
    }
    get isCancelled() {
        return this.state === TaskState.Cancelled;
    }
    perform() {
        this.state = TaskState.Running;
        const iterator = this.generator.apply(this.context, this.args);
        this.run = this.debounce
            ? task_1.timeout(this.debounce).then(() => this.iterate(iterator))
            : this.iterate(iterator);
        return this.run;
    }
    iterate(iterator, data) {
        if (this.isCancelled) {
            return Promise.reject(new CancellationError());
        }
        const yielded = iterator.next();
        if (yielded.done) {
            this.state = TaskState.Finished;
            return Promise.resolve(yielded.value);
        }
        else if (isPromise(yielded.value)) {
            return yielded.value
                .then(result => this.iterate(iterator, result))
                .catch(e => {
                this.state = TaskState.Finished;
                return Promise.reject(e);
            });
        }
        else {
            return this.iterate(iterator, yielded.value);
        }
    }
    drop() {
        this.state = TaskState.Dropped;
    }
    cancel() {
        this.state = TaskState.Cancelled;
    }
}
exports.TaskInstance = TaskInstance;
function isPromise(value) {
    return value && typeof value.then === "function";
}
