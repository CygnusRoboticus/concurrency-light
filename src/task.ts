import { generatorToTask } from "./task-property";

export enum TaskStrategy {
  Drop,
  KeepLast,
  Restartable,
  Queue
}

export interface ITaskOptions {
  strategy?: TaskStrategy;
  debounce?: number;
}

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
