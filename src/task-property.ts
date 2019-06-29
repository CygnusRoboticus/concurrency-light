import { ITaskOptions, TaskStrategy } from "./task";
import { CancellationError, TaskInstance } from "./task-instance";

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
  instances: Array<TaskInstance<T, U>>;
  isRunning: boolean;
  isCancelled: boolean;
  dequeue: () => Promise<T>;
  drop: (instance: TaskInstance<T, U>) => void;
  enqueue: (instance: TaskInstance<T, U>) => void;
  cancelAll: () => void;
  cancelInstance: (instance: TaskInstance<T, U>) => void;
  cancelQueued: () => void;
  cancel(): () => void;
}

export type TaskProperty<T, U> = ITaskProperty<T, U> & ((this: U) => void);

function removeTask<T, U>(
  property: TaskProperty<T, U>,
  instance?: TaskInstance<T, U>
) {
  if (instance) {
    const position = property.instances.indexOf(instance);
    if (position) {
      property.instances.splice(position);
    }
    if (property.currentRun === instance) {
      property.currentRun = undefined;
    }
  }
}

function run<T, U>(property: TaskProperty<T, U>) {
  const instance = property.instances.pop()!;
  const instanceRun = instance.perform();
  property.currentRun = instance;

  return instanceRun
    .then(result => {
      property.lastSuccess = result;
      property.lastResult = result;
      removeTask(property, instance);
    })
    .catch(error => {
      if (error instanceof CancellationError) {
        property.lastError = error;
        property.lastResult = error;
      }
      removeTask(property, instance);
    });
}

/**
 * Wraps a generator function in a ConcurrencyTask<T> object, providing
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
export function generatorToTask<T, U>(
  generator: (this: U) => IterableIterator<T>,
  opts: ITaskOptions
): TaskProperty<T, U> {
  let perform: TaskProperty<T, U>;

  perform = function(this: U, ...args: unknown[]) {
    const instance = new TaskInstance(this, generator, args, opts.debounce);

    if (!perform.isRunning) {
      perform.enqueue(instance);
    } else {
      if (perform.isDrop) {
        perform.drop(instance);
      } else if (perform.isKeepLast) {
        perform.cancelQueued();
        perform.enqueue(instance);
      } else if (perform.isQueue) {
        perform.enqueue(instance);
      } else if (perform.isRestartable) {
        perform.cancelAll();
        perform.enqueue(instance);
      } else {
        perform.enqueue(instance);
      }
    }

    return perform.dequeue();
  } as any;

  Object.assign(perform, {
    currentRun: undefined,
    instances: [] as Array<TaskInstance<T, U>>,

    isConcurrent: !opts.strategy,
    isDrop: opts.strategy === TaskStrategy.Drop,
    isKeepLast: opts.strategy === TaskStrategy.KeepLast,
    isQueue: opts.strategy === TaskStrategy.Queue,
    isRestartable: opts.strategy === TaskStrategy.Restartable,

    lastError: undefined,
    lastResult: undefined,
    lastSuccess: undefined,

    dequeue(this: TaskProperty<T, U>) {
      if (this.isRunning) {
        const instance = this.currentRun!;
        if (instance.isFinished) {
          removeTask(this, instance);
          return this.dequeue();
        } else if (this.isQueue || this.isKeepLast) {
          return instance.run!.then(() => {
            removeTask(this, instance);
            return this.dequeue();
          });
        } else if (this.isConcurrent && this.instances.length) {
          return run(this);
        }
      } else if (this.instances.length) {
        return run(this);
      } else {
        return Promise.resolve(this.lastSuccess);
      }
    },

    enqueue(instance: TaskInstance<T, U>) {
      this.instances.unshift(instance);
    },
    drop(this: TaskProperty<T, U>, instance: TaskInstance<T, U>) {
      instance.drop();
      removeTask(this, instance);
    },
    cancel(this: TaskProperty<T, U>) {
      if (this.currentRun) {
        this.currentRun.cancel();
        removeTask(this, this.currentRun);
      }
    },
    cancelInstance(this: TaskProperty<T, U>, instance: TaskInstance<T, U>) {
      instance.cancel();
      removeTask(this, instance);
    },
    cancelQueued(this: TaskProperty<T, U>) {
      this.instances.forEach(i => {
        i.cancel();
        removeTask(this, i);
      });
    },
    cancelAll(this: TaskProperty<T, U>) {
      this.cancelQueued();
      this.cancel();
    }
  });

  Object.defineProperties(perform, {
    isRunning: {
      get(this: TaskProperty<T, U>) {
        return !!this.currentRun;
      }
    }
  });

  return perform as TaskProperty<T, U>;
}
