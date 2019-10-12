// tslint:disable max-classes-per-file

import { task, Task, TaskStrategy, timeout } from "../src/task";

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
    expect(((stub.performTask as unknown) as Task).isRunning).toBeTruthy();
    ((stub.performTask as unknown) as Task).cancelAll();
    expect(((stub.performTask as unknown) as Task).isRunning).toBeFalsy();
    await timeout(500);
  });
});
