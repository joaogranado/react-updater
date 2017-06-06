# React Updater

> Functional stateful components made easy

React Updater is a Higher-order Component that provides a state updater function and enforces best practices regarding state management in your React applications.

## Status

[![Travis](https://img.shields.io/travis/joaogranado/react-updater.svg)](https://travis-ci.org/joaogranado/react-updater)
[![Greenkeeper badge](https://badges.greenkeeper.io/joaogranado/react-updater.svg)](https://greenkeeper.io/)

## Installation

```sh
npm install react-updater --save
```

```sh
yarn add react-updater
```

## API

### `withUpdater()`

```js
withUpdater(
  initialState: any | (ownerProps: Object) => any
): HigherOrderComponent
```

Passes three additional props to the base component: a state value, a `update` function to update that state value and a `handle` function which is a subset of the `update` but does not update the component.

#### `update()`

```js
update(handler: Function, ...args): (...args): void
```

This function wraps every callback handler. It takes a callback and returns a new `memoized` callback that will give you the previous state, and additional arguments when the callback is called and ensures the state is updated after the callback.

**Example:**

```js
const onClick = (state, increment) => state + increment;
const Component = props => <div onClick={props.update(onClick, 1)} />;

export default withUpdater()(Component);
```

Since this wraps the callback handler in a `setState` call, the handler should always return a new state which can be an object or a single value.

**Important:** `update` memoizes up to **30** handlers and returns the same reference. This avoids a common pitfall associated with components that rely on props equality by using `shouldComponentUpdate` which can lead to de-optimizations because `shouldComponentUpdate` will return `true` every time since `props.onClick !== nexProps.onClick`. This way `withUpdater` must ensure it always returns the same reference for each handler.

```js
// Bad.
// This will log a error message after 30 calls.
const Component = props => <div onClick={props.update(state => state + 1)} />;

// Good.
const onClick = state => state + 1;
const Component = props => <div onClick={props.update(onClick)} />;

export default withUpdater()(Component);
```

#### `handle()`

```js
handle(handler: Function, ...args): (...args): Function
```

This method is a convenient subset of `update()` but it does not update the state, so there is no need to return a new `state`.

**Example:**

```js
const setUsers = (state, users) => [...state, ...users];
const onClick = props => {
  fetch('/users')
    .then(response => response.json())
    .then(props.update(setUsers));
};

const Component = props => <div onClick={props.handle(onClick, props)} />;

export default withUpdater()(Component);
```

#### `state`
The main difference here is that you can pass any value to the initial state and it will be handled accordingly. If you pass an object as the initial state, the updater will handle it according to the default `setState()` behavior. If you pass a function to the initial state it will be provided with the owner props that can be used to define the initial state.

**Arbitrary value**

```js
const state = 0;
const increment = state => state + 1;
const Counter = props => (
  <div>
    <div>{props.state}</div>
    <button onClick={props.update(increment)}>
      {'+'}
    </button>
  </div>
);

export default withUpdater(state)(Counter);
```

**Plain Object**

```js
const state = { count: 0 };
const increment = state => ({ count: state.count + 1 });
const Counter = props => (
  <div>
    <div>{props.state.count}</div>
    <button onClick={props.update(increment)}>
      {'+'}
    </button>
  </div>
);

export default withUpdater(state)(Counter);
```

**Function**

```js
// ./counter.js
const state = props => props.initialValue;
const increment = state => state + 1;
const component = props => (
  <div>
    <div>{props.state}</div>
    <button onClick={props.update(increment)}>
      {'+'}
    </button>
  </div>
);

export default withUpdater(state)(Counter);

// ./app.js
import Counter from './counter.js';

const App = () => <Counter initialValue={0} />
```

### Bonus

#### Implementing a reducer

Instead of creating several callbacks to update the state we can use a reducer pattern to update the state based on redux-like action types.

```js
const count = (state = 0, action = {}) => {
  switch (action.type) {
    case 'DECREMENT':
      return state - 1;
    case 'INCREMENT':
      return state + 1;
    default:
      return state;
  }
};

const Counter = props => (
  <div>
    <div>{props.state}</div>

    <button onClick={props.update(count, { type: 'DECREMENT' })}>
      {'-'}
    </button>

    <button onClick={props.update(count, { type: 'INCREMENT' })}>
      {'+'}
    </button>
  </div>
);

export default withUpdater(count())(Counter);
```

You can even use [recompose withHandlers](https://github.com/acdlite/recompose/blob/master/docs/API.md#withhandlers) util to map the `props.update(count, { type })` to different methods. Considering the example above:

```js
const count = (state = 0, action = {}) => {
  switch (action.type) {
    case 'DECREMENT':
      return state - 1;
    case 'INCREMENT':
      return state + 1;
    default:
      return state;
  }
};

const Counter = props => (
  <div>
    <div>{props.state}</div>

    <button onClick={props.decrement}>
      {'-'}
    </button>

    <button onClick={props.increment}>
      {'+'}
    </button>
  </div>
);

export default compose(
  withUpdater(count())
  withHandlers({
    decrement: props => props.update(count, { type: DECREMENT }),
    increment: props => props.update(count, { type: INCREMENT })
  })
)(Counter);
```

## References

- [Reason-React](https://github.com/reasonml/reason-react)
- [Recompose](https://github.com/acdlite/recompose)

## Licence

MIT © [João Granado](https://github.com/joaogranado)
