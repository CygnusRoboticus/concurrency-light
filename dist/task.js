"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Wraps a generator function in a ConcurrencyTask<T> object, providing
 * debouncing and a flag to check if the generator function is running.
 *
 * usage:
 * ```typescript
 * const doSomething = task(function*() {
 *   yield new Promise((resolve) => {
 *     setTimeout(() => {
 *       resolve('yeah!');
 *     }), 3000);
 *   }, this);
 * });
 *
 * doSomething.isRunning   // false;
 * doSomething();
 * doSomething.isRunning   // true;
 * doSomething();          // silently dropped
 * doSomething.lastResult; //'yeah!'
 * ```
 */
function task(generator, target) {
    let perform = function () { };
    perform = function () {
        if (perform.isRunning) {
            return;
        }
        perform.cancelled = false;
        perform.isRunning = true;
        const iterator = generator.call(target || this);
        // this function keeps calling next() if a promise is yielded
        return recursivelyCallNextOnIterator();
        function recursivelyCallNextOnIterator(data) {
            if (perform.cancelled) {
                return;
            }
            const yielded = iterator.next.apply(iterator, arguments);
            if (yielded.done) {
                perform.isRunning = false;
                perform.lastResult = data;
                return data;
            }
            if (isPromise(yielded.value)) {
                yielded.value
                    .then(result => {
                    recursivelyCallNextOnIterator(result);
                })
                    .catch(e => {
                    perform.isRunning = false;
                    iterator.throw(e);
                });
            }
        }
    };
    perform.cancel = () => {
        perform.cancelled = true;
    };
    return perform;
}
function isPromise(value) {
    return value && typeof value.then === "function";
}
/**
 * TODO: figure out how to hoist context to a child object via a decorator
 *
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
function taskDecorator() {
    return function (target, propertyKey, descriptor) {
        const method = descriptor.value;
        descriptor.value = task(method);
        return descriptor;
    };
}
exports.task = taskDecorator;
