# concurrency-light

Lightweight concurrency management, heavily inspired by [ember-concurrency](https://github.com/machty/ember-concurrency).

## Installation

- `yarn add concurrency-light`
- `npm install --save concurrency-light`

## Usage

```typescript
class DocClass {
  constructor() {
    this.asyncSearch("pants");
    this.asyncSearch.isRunning; // true
    this.asyncSearch("skirts"); // restarted
  }

  @task({ strategy: TaskStrategy.Restartable })
  *asyncSearch(search: string) {
    yield timeout(500);
    yield this.fetch(`/api/search?filter[query]=${search}`);
  }
}
```
