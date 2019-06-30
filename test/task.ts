// tslint:disable max-classes-per-file

import { assert } from "chai";
import "mocha";
import { task, TaskStrategy, timeout, Task } from "../src/task";

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
    assert.equal(stub.counter, 6);
  });

  it("is restartable", async () => {
    class TestClass {
      counter = 0;

      @task({ strategy: TaskStrategy.Restartable })
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
    assert.equal(stub.counter, 3);
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
    assert.equal(stub.counter, 1);
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
    assert.equal(stub.counter, 6);
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
    assert.equal(stub.counter, 4);
  });

  it("is debounce-able", async () => {
    class TestClass {
      counter = 0;

      @task({ debounce: 100, strategy: TaskStrategy.Restartable })
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
    assert.equal(stub.counter, 3);
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
    assert.notOk(((stub as unknown) as Task).isRunning);
    stub.performTask(1);
    assert.ok(((stub.performTask as unknown) as Task).isRunning);
    ((stub.performTask as unknown) as Task).cancelAll();
    assert.notOk(((stub.performTask as unknown) as Task).isRunning);
    await timeout(500);
  });
});
