## HttpClient.ts

build a http client using window.fetch

## key takeaways

- When we make a CORS request that requires preflight (like a POST with custom headers), the browser will:
  - First automatically send the OPTIONS request
  - Handle the preflight response
  - Then send our actual request if preflight succeeds
  - All of this happens before our fetch call even starts executing
- Application of `AbortController`
  - handlle timeout
  - proactively cancel ongoing request

```tsx
  private pendingRequests: Map<string, AbortController>;

  public cancelRequest(requestKey: string): void {
    const controller = this.pendingRequests.get(requestKey);

    if (controller) {
      controller.abort();
      this.pendingRequests.delete(requestKey);
    }
  }
```
