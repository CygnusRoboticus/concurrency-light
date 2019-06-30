import { ITaskProperty } from "./task-property";
export declare enum TaskStrategy {
    /**
     * The Drop strategy will discard any new calls if the task is currently running.
     */
    Drop = 0,
    /**
     * The KeepLast strategy works as a length=1 queue, keeping the latest call if the task is already running.
     */
    KeepLast = 1,
    /**
     * The Restartable strategy will cancel the currently running instance when it is called.
     */
    Restartable = 2,
    /**
     * The Queue strategy will run calls sequentially FIFO.
     */
    Queue = 3
}
export interface ITaskOptions {
    /**
     * Concurrency strategy this task should use. Default behavior is `TaskStrategy.Concurrent`, which runs any calls concurrently.
     */
    strategy?: TaskStrategy;
    /**
     * Delay before running this task; useful for `TaskStrategy.Restartable`.
     */
    debounce?: number;
}
/**
 * Task-like generator function that handles various concurrency strategies and exposes some state information.
 */
export declare type Task<T = unknown, U = unknown> = ITaskProperty<T, U> & ((this: U) => void);
/**
 * Decorator for generator functions to behave as a task-like function.
 * @see Task<T, U>
 */
export declare function task<T>(taskOptions?: ITaskOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function timeout(delay: number): Promise<unknown>;
