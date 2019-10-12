import { ITask, ITaskOptions, TaskStrategy } from "./task";
import { CancellationError, TaskInstance } from "./task-instance";

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

interface ITaskPropertyInternal<T, U> extends ITaskProperty<T, U> {
  isConcurrent: boolean;
  isDrop: boolean;
  isKeepLast: boolean;
  isQueue: boolean;
  isRestart: boolean;
  context: U;
  cancelInstance: (instance: TaskInstance<T, U>) => void;
  drop: (instance: TaskInstance<T, U>) => void;
  enqueue: (instance: TaskInstance<T, U>) => void;
  removeTask: (instance: TaskInstance<T, U>) => void;
  run: (instance: TaskInstance<T, U>) => Promise<T>;
  runQueue: () => Promise<T>;
}

export function generatorToTask<T, U>(
  generator: (this: U) => Generator<T>,
  opts: ITaskOptions
): ITask<T, U> {
  let perform: ITaskPropertyInternal<T, U>;

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
    } else if (perform.isRestart) {
      perform.cancelAll();
      return perform.run(instance);
    } else {
      // isConcurrent
      return perform.run(instance);
    }
  } as any;

  Object.assign(perform, {
    currentRun: undefined,
    queuedInstances: [] as Array<TaskInstance<T, U>>,
    runningInstances: [] as Array<TaskInstance<T, U>>,

    isConcurrent: !opts.strategy,
    isDrop: opts.strategy === TaskStrategy.Drop,
    isKeepLast: opts.strategy === TaskStrategy.KeepLast,
    isQueue: opts.strategy === TaskStrategy.Queue,
    isRestart: opts.strategy === TaskStrategy.Restart,

    lastError: undefined,
    lastResult: undefined,
    lastSuccess: undefined,

    run(this: ITaskPropertyInternal<T, U>, instance: TaskInstance<T, U>) {
      const instanceRun = instance.perform();
      this.currentRun = instance;
      this.runningInstances.push(instance);

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
        const position = this.runningInstances.indexOf(instance);
        const queuePosition = this.queuedInstances.indexOf(instance);
        if (position >= 0) {
          this.runningInstances.splice(position);
        }
        if (queuePosition >= 0) {
          this.queuedInstances.splice(queuePosition);
        }
        if (this.currentRun === instance) {
          this.currentRun = undefined;
        }
      }
    },

    runQueue(this: ITaskPropertyInternal<T, U>) {
      if (this.isRunning) {
        return this.currentRun!.run!;
      } else if (this.queuedInstances.length) {
        const instance = this.queuedInstances.pop()!;
        return this.run(instance).then(() => this.runQueue());
      } else {
        return Promise.resolve(this.lastSuccess);
      }
    },

    enqueue(instance: TaskInstance<T, U>) {
      this.queuedInstances.unshift(instance);
    },
    drop(this: ITaskPropertyInternal<T, U>, instance: TaskInstance<T, U>) {
      instance.drop();
      this.removeTask(instance);
    },
    cancel(this: ITaskPropertyInternal<T, U>) {
      if (this.currentRun) {
        this.currentRun.cancel();
        this.removeTask(this.currentRun);
      }
    },
    cancelInstance(
      this: ITaskPropertyInternal<T, U>,
      instance: TaskInstance<T, U>
    ) {
      instance.cancel();
      this.removeTask(instance);
    },
    cancelQueued(this: ITaskPropertyInternal<T, U>) {
      this.queuedInstances.forEach(i => {
        i.cancel();
        this.removeTask(i);
      });
    },
    cancelRunning(this: ITaskPropertyInternal<T, U>) {
      this.runningInstances.forEach(i => {
        i.cancel();
        this.removeTask(i);
      });
    },
    cancelAll(this: ITaskPropertyInternal<T, U>) {
      this.cancelQueued();
      this.cancelRunning();
      this.cancel();
    }
  });

  Object.defineProperties(perform, {
    isRunning: {
      get(this: ITaskPropertyInternal<T, U>) {
        return !!this.currentRun;
      }
    }
  });

  return (perform as unknown) as ITask<T, U>;
}
