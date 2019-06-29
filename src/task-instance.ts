import { TaskProperty } from "./task-property";

// tslint:disable max-classes-per-file
export class CancellationError extends Error {
  constructor() {
    super("task cancelled");
  }
}

export class TaskInstance<T, U> {
  run?: Promise<T>;
  isStarted = false;
  isRunning = false;
  isDropped = false;
  isCancelled = false;
  isFinished = false;

  constructor(
    private context: U,
    private generator: (this: U) => IterableIterator<T>,
    private args: unknown[]
  ) {}

  perform() {
    this.isStarted = true;
    this.isRunning = true;
    this.isDropped = true;
    this.isCancelled = false;
    this.isFinished = false;

    const iterator = this.generator.apply(this.context, this.args as []);

    // this function keeps calling next() if a promise is yielded
    this.run = this.iterate(iterator);
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
      this.isRunning = false;

      return Promise.resolve(data!);
    } else if (isPromise(yielded.value)) {
      return yielded.value
        .then(result => this.iterate(iterator, result))
        .catch(e => Promise.reject(e));
    } else {
      return this.iterate(iterator, yielded.value);
    }
  }

  drop() {
    this.isDropped = true;
  }

  cancel() {
    this.isCancelled = true;
  }
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return value && typeof (value as Promise<T>).then === "function";
}
