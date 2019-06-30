declare enum TaskState {
    Idle = 0,
    Running = 1,
    Dropped = 2,
    Cancelled = 3,
    Finished = 4
}
export declare class CancellationError extends Error {
    constructor();
}
export declare class TaskInstance<T, U> {
    private context;
    private generator;
    private args;
    private debounce?;
    run?: Promise<T>;
    state: TaskState;
    readonly isCancelled: boolean;
    constructor(context: U, generator: (this: U) => IterableIterator<T>, args: unknown[], debounce?: number | undefined);
    perform(): Promise<T>;
    iterate(iterator: IterableIterator<T>): Promise<T>;
    drop(): void;
    cancel(): void;
}
export {};
