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
declare function taskDecorator<T>(): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export { taskDecorator as task };
