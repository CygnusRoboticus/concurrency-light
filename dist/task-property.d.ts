import { ITaskOptions } from "./task";
import { TaskInstance } from "./task-instance";
interface ITaskProperty<T, U> {
    isConcurrent: boolean;
    isDrop: boolean;
    isKeepLast: boolean;
    isQueue: boolean;
    isRestartable: boolean;
    lastSuccess?: T;
    lastError?: Error;
    lastResult?: T | Error;
    currentRun?: TaskInstance<T, U>;
    context: U;
    queue: Array<TaskInstance<T, U>>;
    running: Array<TaskInstance<T, U>>;
    isRunning: boolean;
    isCancelled: boolean;
    cancelAll: () => void;
    cancelInstance: (instance: TaskInstance<T, U>) => void;
    cancelQueued: () => void;
    cancelRunning: () => void;
    cancel: () => void;
    drop: (instance: TaskInstance<T, U>) => void;
    enqueue: (instance: TaskInstance<T, U>) => void;
    removeTask: (instance: TaskInstance<T, U>) => void;
    run: (instance: TaskInstance<T, U>) => Promise<T>;
    runQueue: () => Promise<T>;
}
export declare type TaskProperty<T, U> = ITaskProperty<T, U> & ((this: U) => void);
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
export declare function generatorToTask<T, U>(generator: (this: U) => IterableIterator<T>, opts: ITaskOptions): TaskProperty<T, U>;
export {};
