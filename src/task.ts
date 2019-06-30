import { generatorToTask, ITaskProperty } from "./task-property";

export enum TaskStrategy {
  /**
   * The Drop strategy will discard any new calls if the task is currently running.
   */
  Drop,
  /**
   * The KeepLast strategy works as a length=1 queue, keeping the latest call if the task is already running.
   */
  KeepLast,
  /**
   * The Restartable strategy will cancel the currently running instance when it is called.
   */
  Restartable,
  /**
   * The Queue strategy will run calls sequentially FIFO.
   */
  Queue
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
export type Task<T = unknown, U = unknown> = ITaskProperty<T, U> &
  ((this: U) => void);

/**
 * Decorator for generator functions to behave as a task-like function.
 * @see Task<T, U>
 */
export function task<T>(taskOptions: ITaskOptions = {}) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const method: () => IterableIterator<T> = descriptor.value;
    descriptor.value = generatorToTask(method, taskOptions);
    return descriptor;
  };
}

export function timeout(delay: number) {
  return new Promise(resolve => setTimeout(resolve, delay));
}
