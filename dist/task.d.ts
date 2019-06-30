export declare enum TaskStrategy {
    Drop = 0,
    KeepLast = 1,
    Restartable = 2,
    Queue = 3
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
export declare function task<T>(taskOptions?: ITaskOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function timeout(delay: number): Promise<{}>;
