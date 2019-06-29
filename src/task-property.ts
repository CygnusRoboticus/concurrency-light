import { ITaskOptions, TaskStrategy } from "./task";
import { CancellationError, TaskInstance } from "./task-instance";

interface ITaskProperty<T, U> {
  isDrop: boolean;
  isKeepLast: boolean;
  isQueue: boolean;
  isRestartable: boolean;

  lastSuccess?: T;
  lastError?: Error;
  lastResult?: T | Error;
  lastRun?: TaskInstance<T, U>;

  context: U;
  instances: Array<TaskInstance<T, U>>;
  isRunning: boolean;
  isCancelled: boolean;
  dequeue: () => Promise<T>;
  drop: (instance: TaskInstance<T, U>) => void;
  enqueue: (instance: TaskInstance<T, U>) => void;
  cancel: (instance: TaskInstance<T, U>) => void;
  cancelAll: () => void;
  cancelQueued: () => void;
}

export type TaskProperty<T, U> = ITaskProperty<T, U> & ((this: U) => void);

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
export function generatorToTask<T, U>(
  generator: (this: U) => IterableIterator<T>,
  opts: ITaskOptions
): TaskProperty<T, U> {
  let perform: TaskProperty<T, U>;

  perform = function(this: U, ...args: unknown[]) {
    const instance = new TaskInstance(this, generator, args);

    if (!perform.isRunning) {
      perform.enqueue(instance);
    } else {
      if (perform.isDrop) {
        perform.drop(instance);
      } else if (perform.isRestartable) {
        perform.cancelAll();
        perform.enqueue(instance);
      } else if (perform.isQueue) {
        perform.enqueue(instance);
      } else if (perform.isKeepLast) {
        perform.cancelQueued();
        perform.enqueue(instance);
      } else {
        perform.enqueue(instance);
      }
    }

    return perform.dequeue();
  } as any;

  Object.assign(perform, {
    instances: [] as Array<TaskInstance<T, U>>,

    isDrop: opts.strategy === TaskStrategy.Drop,
    isKeepLast: opts.strategy === TaskStrategy.KeepLast,
    isQueue: opts.strategy === TaskStrategy.Queue,
    isRestartable: opts.strategy === TaskStrategy.Restartable,

    lastError: undefined,
    lastResult: undefined,
    lastRun: undefined,
    lastSuccess: undefined,

    dequeue(this: TaskProperty<T, U>) {
      if (this.lastRun) {
        if (this.lastRun.isFinished) {
          this.lastRun = undefined;
          return this.dequeue();
        } else if (this.isQueue) {
          return this.lastRun.run!.then(() => this.dequeue());
        } else if (this.isRestartable) {
          this.cancel(this.lastRun);
          return this.dequeue();
        }
      } else if (this.instances.length) {
        this.lastRun = this.instances.pop()!;
        const run = this.lastRun.perform();
        return run
          .then(result => {
            this.lastSuccess = result;
            this.lastResult = result;
            this.lastRun = undefined;
          })
          .catch(error => {
            if (error instanceof CancellationError) {
              this.lastError = error;
              this.lastResult = error;
            }
            this.lastRun = undefined;
          });
      } else {
        return Promise.resolve(this.lastSuccess);
      }
    },
    enqueue(instance: TaskInstance<T, U>) {
      this.instances.unshift(instance);
    },
    cancel(instance: TaskInstance<T, U>) {
      instance.cancel();
      if (this.lastRun === instance) {
        this.lastRun = undefined;
      }
    },
    cancelQueued() {
      this.instances
        .filter(i => !i.isRunning)
        .forEach(i => {
          i.cancel();
          this.removeTask(i);
        });
    },
    cancelAll() {
      this.instances.forEach(i => {
        i.cancel();
        this.removeTask(i);
      });
      this.lastRun = undefined;
    },
    removeTask(instance: TaskInstance<T, U>) {
      const position = this.instances.indexOf(instance);
      this.instances.splice(position);
    }
  });

  Object.defineProperties(perform, {
    isRunning: {
      get(this: TaskProperty<T, U>) {
        return this.instances.some(i => i.isRunning);
      }
    }
  });

  return perform as TaskProperty<T, U>;
}
