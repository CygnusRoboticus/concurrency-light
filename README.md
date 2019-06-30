# concurrency-light

Lightweight concurrency management, heavily inspired by [ember-concurrency](https://github.com/machty/ember-concurrency).

## Installation

- `yarn add concurrency-light`
- `npm install --save concurrency-light`

## Usage

```typescript
import { task, TaskStrategy, timeout } from "concurrency-light";

class DocClass {
  constructor() {
    this.asyncSearch("pants");
    this.asyncSearch.isRunning; // true
    this.asyncSearch("skirts"); // restarted
  }

  @task({ strategy: TaskStrategy.Restart })
  *asyncSearch(search: string) {
    yield timeout(500);
    yield fetch(`/api/search?filter[query]=${search}`);
  }
}
```
