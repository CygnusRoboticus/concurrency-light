import { assert } from "chai";
import "mocha";
import { task, TaskStrategy, timeout } from "../src/task";

describe("task", () => {
  it("is restartable", async () => {
    class TestClass {
      counter = 0;

      @task({ strategy: TaskStrategy.Restartable })
      *performTask(count: number) {
        yield timeout(1000);
        this.counter += count;
      }
    }

    const stub = new TestClass();
    stub.performTask(1);
    stub.performTask(2);
    await stub.performTask(3);
    assert.equal(stub.counter, 3);
  });
});
