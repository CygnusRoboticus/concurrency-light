// tslint:disable max-classes-per-file

import { ITask, task, TaskStrategy, timeout } from "../src/task";

describe("task", () => {
  it("is concurrent", async () => {
    class TestClass {
      counter = 0;

      @task()
      *performTask(count: number) {
        yield timeout(100);
        this.counter += count;
      }
    }

    const stub = new TestClass();
    stub.performTask(1);
    stub.performTask(2);
    stub.performTask(3);
    await timeout(500);
    expect(stub.counter).toEqual(6);
  });

  it("is restartable", async () => {
    class TestClass {
      counter = 0;

      @task({ strategy: TaskStrategy.Restart })
      *performTask(count: number) {
        yield timeout(100);
        this.counter += count;
      }
    }

    const stub = new TestClass();
    stub.performTask(1);
    stub.performTask(2);
    stub.performTask(3);
    await timeout(500);
    expect(stub.counter).toEqual(3);
  });

  it("is droppable", async () => {
    class TestClass {
      counter = 0;

      @task({ strategy: TaskStrategy.Drop })
      *performTask(count: number) {
        yield timeout(100);
        this.counter += count;
      }
    }

    const stub = new TestClass();
    stub.performTask(1);
    stub.performTask(2);
    stub.performTask(3);
    await timeout(500);
    expect(stub.counter).toEqual(1);
  });

  it("is queue-able", async () => {
    class TestClass {
      counter = 0;

      @task({ strategy: TaskStrategy.Queue })
      *performTask(count: number) {
        yield timeout(100);
        this.counter += count;
      }
    }

    const stub = new TestClass();
    stub.performTask(1);
    stub.performTask(2);
    stub.performTask(3);
    await timeout(500);
    expect(stub.counter).toEqual(6);
  });

  it("is keepLast-able", async () => {
    class TestClass {
      counter = 0;

      @task({ strategy: TaskStrategy.KeepLast })
      *performTask(count: number) {
        yield timeout(100);
        this.counter += count;
      }
    }

    const stub = new TestClass();
    stub.performTask(1);
    stub.performTask(2);
    stub.performTask(3);
    await timeout(500);
    expect(stub.counter).toEqual(4);
  });

  it("is debounce-able", async () => {
    class TestClass {
      counter = 0;

      @task({ debounce: 100, strategy: TaskStrategy.Restart })
      *performTask(count: number) {
        this.counter += count;
        yield this.counter;
      }
    }

    const stub = new TestClass();
    stub.performTask(1);
    stub.performTask(2);
    stub.performTask(3);
    await timeout(500);
    expect(stub.counter).toEqual(3);
  });

  it("exposes state", async () => {
    class TestClass {
      counter = 0;

      @task()
      *performTask(count: number) {
        this.counter += count;
        yield this.counter;
      }
    }

    const stub = new TestClass();
    stub.performTask(1);
    expect(((stub.performTask as unknown) as ITask).isRunning).toBeTruthy();
    ((stub.performTask as unknown) as ITask).cancelAll();
    expect(((stub.performTask as unknown) as ITask).isRunning).toBeFalsy();
    await timeout(500);
  });

  it("has a real return value", async () => {
    class TestClass {
      counter = 0;

      @task()
      *performTask(count: number) {
        this.counter += count;
        return this.counter;
      }
    }

    const stub = new TestClass();
    const value = await stub.performTask(3);
    expect(value).toEqual(3);
  });

  it("exposes errors appropriately", async () => {
    class TestClass {
      @task()
      *performTask() {
        return Promise.reject(new Error("whatever"));
      }
    }

    const stub = new TestClass();
    try {
      await stub.performTask();
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});
