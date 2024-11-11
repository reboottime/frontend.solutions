# README

## Features

Design Idea comes from [Vue Element UI remote search](https://element-plus.org/en-US/component/select.html#remote-search)

Key learning:

to give flexibility to data processing

```tsx
const remoteMethod = (query, {signal}) => {
    return ...
}
```

### Features

- keyboard navigation
- cache search result
- handle Race condition using abort controller
- debounced search
