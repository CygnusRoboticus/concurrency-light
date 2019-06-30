import { ITaskOptions, Task } from "./task";
import { TaskInstance } from "./task-instance";
export interface ITaskProperty<T, U> {
    /**
     * The last successful result.
     */
    lastSuccess?: T;
    /**
     * The last error result.
     */
    lastError?: Error;
    /**
     * The last result.
     */
    lastResult?: T | Error;
    /**
     * Currently running task instance. Not safe, as it is likely to be replaced by new calls.
     */
    currentRun?: TaskInstance<T, U>;
    /**
     * This is `true` if there are any running task instances.
     */
    isRunning: boolean;
    queuedInstances: Array<TaskInstance<T, U>>;
    runningInstances: Array<TaskInstance<T, U>>;
    /**
     * Cancel all queued or running task instances.
     */
    cancelAll: () => void;
    /**
     * Cancel all queued task instances. Has no effect if not a `Queue` or `KeepLast` task.
     */
    cancelQueued: () => void;
    /**
     * Cancel all running task instances.
     */
    cancelRunning: () => void;
    /**
     * Cancel the latest task instance.
     */
    cancel: () => void;
}
export declare function generatorToTask<T, U>(generator: (this: U) => IterableIterator<T>, opts: ITaskOptions): Task<T, U>;
