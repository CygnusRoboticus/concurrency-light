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

export type TaskProperty<T, U> = ITaskProperty<T, U> & ((this: U) => void);

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
export function generatorToTask<T, U>(
  generator: (this: U) => IterableIterator<T>,
  opts: ITaskOptions
): TaskProperty<T, U> {
  let perform: TaskProperty<T, U>;

  perform = function(this: U, ...args: unknown[]) {
    const instance = new TaskInstance(this, generator, args, opts.debounce);

    if (perform.isQueue) {
      perform.enqueue(instance);
      return perform.runQueue();
    } else if (perform.isKeepLast) {
      perform.cancelQueued();
      perform.enqueue(instance);
      return perform.runQueue();
    } else if (!perform.isRunning) {
      return perform.run(instance);
    } else if (perform.isDrop) {
      perform.drop(instance);
      return perform.currentRun;
    } else if (perform.isRestartable) {
      perform.cancelAll();
      return perform.run(instance);
    } else {
      // isConcurrent
      return perform.run(instance);
    }
  } as any;

  Object.assign(perform, {
    currentRun: undefined,
    queue: [] as Array<TaskInstance<T, U>>,
    running: [] as Array<TaskInstance<T, U>>,

    isConcurrent: !opts.strategy,
    isDrop: opts.strategy === TaskStrategy.Drop,
    isKeepLast: opts.strategy === TaskStrategy.KeepLast,
    isQueue: opts.strategy === TaskStrategy.Queue,
    isRestartable: opts.strategy === TaskStrategy.Restartable,

    lastError: undefined,
    lastResult: undefined,
    lastSuccess: undefined,

    run(this: TaskProperty<T, U>, instance: TaskInstance<T, U>) {
      const instanceRun = instance.perform();
      this.currentRun = instance;
      this.running.push(instance);

      return instanceRun
        .then(result => {
          this.lastSuccess = result;
          this.lastResult = result;
          this.removeTask(instance);
          return result;
        })
        .catch(error => {
          if (error instanceof CancellationError) {
            this.lastError = error;
            this.lastResult = error;
          }
          this.removeTask(instance);
          return error;
        });
    },

    removeTask(instance?: TaskInstance<T, U>) {
      if (instance) {
        const position = this.running.indexOf(instance);
        const queuePosition = this.queue.indexOf(instance);
        if (position >= 0) {
          this.running.splice(position);
        }
        if (queuePosition >= 0) {
          this.queue.splice(queuePosition);
        }
        if (this.currentRun === instance) {
          this.currentRun = undefined;
        }
      }
    },

    runQueue(this: TaskProperty<T, U>) {
      if (this.isRunning) {
        // do nothing
      } else if (this.queue.length) {
        const instance = this.queue.pop()!;
        return this.run(instance).then(() => {
          return this.runQueue();
        });
      } else {
        return Promise.resolve(this.lastSuccess);
      }
    },

    enqueue(instance: TaskInstance<T, U>) {
      this.queue.unshift(instance);
    },
    drop(this: TaskProperty<T, U>, instance: TaskInstance<T, U>) {
      instance.drop();
      this.removeTask(instance);
    },
    cancel(this: TaskProperty<T, U>) {
      if (this.currentRun) {
        this.currentRun.cancel();
        this.removeTask(this.currentRun);
      }
    },
    cancelInstance(this: TaskProperty<T, U>, instance: TaskInstance<T, U>) {
      instance.cancel();
      this.removeTask(instance);
    },
    cancelQueued(this: TaskProperty<T, U>) {
      this.queue.forEach(i => {
        i.cancel();
        this.removeTask(i);
      });
    },
    cancelRunning(this: TaskProperty<T, U>) {
      this.running.forEach(i => {
        i.cancel();
        this.removeTask(i);
      });
    },
    cancelAll(this: TaskProperty<T, U>) {
      this.cancelQueued();
      this.cancelRunning();
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
