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

## How It Works

React functional components are stateless so we need to use classes if we want to have local state. A simple solution to this is to delegate the state to an ancestor by creating an Higher-order Component to wrap the stateless component into a stateful component. The problem here is that if we return a new callback handler on subsequent renders we cannot guarantee reference equality, which can be a problem for components that rely on `props` equality.

By memoizing state updaters and additional parameters, React Updater guarantees the referential equality of the callback handlers across renders.

It also requires you to pass a function as state updater. This has some benefits: it ensures the state is always predictable across multiple calls of `setState()` and you can unit test complex state transitions without shallow render.

Since in functional components you cannot access `this`, it provides you a way to attach `props` and other data to your state updaters without using closures.

To create a stateful functional component you just need to define the initial state, specify your state updaters and pass them to the `update()` function. That's it!

```js
import React from 'react';
import ReactDOM from 'react-dom';
import withUpdater from 'react-updater';

// Initial state.
const state = 0;

// State updaters.
const increment = (state, props, event) => state + props.step;
const decrement = (state, props, event) => state - props.step;

const Counter = (props) => (
  <div>
    <h1>{props.state}</h1>
    <button onClick={props.update(decrement, props)}>{'-'}</button>
    <button onClick={props.update(increment, props)}>{'+'}</button>
  </div>
);

const App = withUpdater(state)(Counter);

ReactDOM.render(<App step={1} />, document.getElementById('root'));
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
update(handler: Function, ...params): (...args): void
```

This function wraps every callback handler. It takes a callback and returns a **memoized** callback that will give you the previous state, and additional arguments when the callback is called and ensures the state is updated after the callback.

```js
const onClick = (state, increment) => state + increment;
const Component = props => <div onClick={props.update(onClick, 1)} />;

export default withUpdater(0)(Component);
```

Since this wraps the callback handler in a `setState` call, the handler should always return a new state which can be an object or a single value.

**Important:** `update` memoizes the given state updaters in order to avoid a common pitfall associated with components that rely on props equality by using `shouldComponentUpdate`. This can be avoided with the class syntax by using `this.onClick`, but if you pass inline functions as a state updater, `update()` will return a new callback handler. This can lead to de-optimizations because `shouldComponentUpdate` will return `true` on every render since `props.onClick !== nexProps.onClick`.

If you you register the same callback with different data multiple times, ince the `update()` function memoizes the state updater and attaches the additional data to the new callback handler, so the expected parameters will be the ones passed on the last call of `update()`. To avoid this limitation consider the following example:

```js
// If you click on the `#first` button the final state will be "2" instead of "1",
// since the final value corresponds to the last call of `update()` for the same
// state updater, so the `step` parameter will be "2".
const increment = (state, step) => state + step;

withUpdater(0)(props => (
  <div>
    <h1>{props.state}</h1>
    <button id={'first'} onClick={props.update(increment, 1)} />
    <button id={'second'} onClick={props.update(increment, 2)} />
  </div>
));

// Instead do the following:
const increment = (state, step) => state + step;
const incrementOne = state => increment(state, 1);
const incrementTwo = state => increment(state, 2);

withUpdater(0)(props => (
  <div>
    <h1>{props.state}</h1>
    <button id={'first'} onClick={props.update(incrementOne)} />
    <button id={'second'} onClick={props.update(incrementTwo)} />
  </div>
));

// However if the attached data has the same value it is ok to do the following:
const increment = (state, props) => state + props.step;

withUpdater(0)(props => (
  <div>
    <h1>{props.state}</h1>
    <button id={'first'} onClick={props.update(increment, props)} />
    <button id={'second'} onClick={props.update(increment, props)} />
  </div>
));
```

#### `handle()`

```js
handle(handler: Function, ...params): (...args): Function
```

This method is a convenient subset of `update()` but it does not update the state, so there is no need to return a new `state`. This allows passing `props` or other data to events without needing to use closures, while keeping the function referential identity.

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
You can pass any arbitrary value to the initial state and it will be handled accordingly. If you pass an object as the initial state, the updater will handle it according to the default `setState()` behavior. If you pass a function to the initial state it will be provided with the owner props that can be used to define the initial state.

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
const count = (state = 0, action) => {
  switch (action) {
    case 'DECREMENT':
      return state - 1;
    case 'INCREMENT':
      return state + 1;
    default:
      return state;
  }
};

const increment = state => count(state, 'INCREMENT');
const decrement = state => count(state, 'DECREMENT');

const Counter = props => (
  <div>
    <div>{props.state}</div>

    <button onClick={props.update(decrement)}>
      {'-'}
    </button>

    <button onClick={props.update(increment)}>
      {'+'}
    </button>
  </div>
);

export default withUpdater(count())(Counter);
```

## References
This library takes some cues from to the [Reason-React](https://github.com/reasonml/reason-react) implementation of the state updater.

## Licence

MIT © [João Granado](https://github.com/joaogranado)
