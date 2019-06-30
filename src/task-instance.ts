import { timeout } from "./task";

enum TaskState {
  Idle,
  Running,
  Dropped,
  Cancelled,
  Finished
}

// tslint:disable max-classes-per-file
export class CancellationError extends Error {
  constructor() {
    super("task cancelled");
  }
}

export class TaskInstance<T, U> {
  run?: Promise<T>;
  state = TaskState.Idle;

  get isCancelled() {
    return this.state === TaskState.Cancelled;
  }

  constructor(
    private context: U,
    private generator: (this: U) => IterableIterator<T>,
    private args: unknown[],
    private debounce?: number
  ) {}

  perform() {
    this.state = TaskState.Running;

    const iterator = this.generator.apply(this.context, this.args as []);

    this.run = this.debounce
      ? timeout(this.debounce).then(() => this.iterate(iterator))
      : this.iterate(iterator);

    return this.run;
  }

  iterate(iterator: IterableIterator<T>, data?: T): Promise<T> {
    if (this.isCancelled) {
      return Promise.reject(new CancellationError());
    }

    const yielded: {
      value: T | Promise<T>;
      done: boolean;
    } = iterator.next();

    if (yielded.done) {
      this.state = TaskState.Finished;

      return Promise.resolve(yielded.value!);
    } else if (isPromise(yielded.value)) {
      return yielded.value
        .then(result => this.iterate(iterator, result))
        .catch(e => {
          this.state = TaskState.Finished;
          return Promise.reject(e);
        });
    } else {
      return this.iterate(iterator, yielded.value);
    }
  }

  drop() {
    this.state = TaskState.Dropped;
  }

  cancel() {
    this.state = TaskState.Cancelled;
  }
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return value && typeof (value as Promise<T>).then === "function";
}
