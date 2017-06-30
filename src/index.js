/**
 * Module dependencies.
 */

import React, { Component } from 'react';
import { noop, stringify } from './utils';

/**
 * State property name.
 */

const STATE_PROPERTY_NAME = '@@STATE';

/**
 * Export `withUpdater`.
 */

export default initialState => {
  return WrappedComponent => {
    class WithUpdater extends Component {
      memoizedCallbackHandlers = new WeakMap();

      constructor(props) {
        super(props);

        const state = typeof initialState === 'function'
          ? initialState(props)
          : initialState;

        this.state = Object.prototype.toString.call(state) === '[object Object]'
          ? state
          : { [STATE_PROPERTY_NAME]: state };
      }

      /**
       * Clean up.
       */

      componentWillUnmount() {
        this.memoizedCallbackHandlers = null;
      }

      /**
       * Create callback handler.
       */

      createCallbackHandler = (name, createHandler) => {
        return (callback, ...params) => {
          if (process.env.NODE_ENV !== 'production') {
            if (typeof callback !== 'function') {
              // eslint-disable-next-line no-console
              console.error(
                `The given callback of type ${typeof callback}` +
                  ' should be a function.'
              );

              return noop;
            }

            if (!callback.name) {
              // eslint-disable-next-line no-console
              console.warn(
                'Callbacks handlers defined with anonymous functions should' +
                  ' be avoided. This can lead to de-optimizations on' +
                  ' components that rely on props equality. If you are seeing' +
                  ' this message on older browsers and you are not passing an' +
                  ' anonymous function you need to use a polyfill for' +
                  ' Function.name.'
              );
            }
          }

          if (!this.memoizedCallbackHandlers.has(callback)) {
            const handler = createHandler(callback);

            this.memoizedCallbackHandlers.set(callback, handler);

            handler.data = params;

            return handler;
          }

          const handler = this.memoizedCallbackHandlers.get(callback);

          handler.data = params;

          return handler;
        };
      };

      /**
       * Wraps the callback handler and returns a new function that receives
       * additional arguments.
       */

      handle = this.createCallbackHandler('handle', callback => {
        const handler = (...args) => callback(...handler.data, ...args);

        return handler;
      });

      /**
       * Wraps the callback handler in a `setState` call and returns a new
       * function that receives the previous state and the given arguments.
       * Since this wraps the callback handler in a `setState` call, the handler
       * should always return a new state which can be an object or a single
       * value.
       */

      update = this.createCallbackHandler('update', callback => {
        const handler = (...args) => {
          let event;

          // A synthetic event cannot be accessed in an asynchronous way -
          // e.g. inside `setState()` - so we need to call `event.persist()`
          // event to remove the synthetic event from the pool.
          // We clean up the event manually when the callback of `setState()` is
          // invoked.
          for (const arg of args) {
            if (arg && typeof arg.persist === 'function') {
              event = arg;
              event.persist();

              break;
            }
          }

          this.setState(
            state => {
              if (!(STATE_PROPERTY_NAME in state)) {
                return callback(state, ...handler.data, ...args);
              }

              return {
                [STATE_PROPERTY_NAME]: callback(
                  state[STATE_PROPERTY_NAME],
                  ...handler.data,
                  ...args
                )
              };
            },
            () => {
              if (event && typeof event.destructor === 'function') {
                event.destructor();
              }
            }
          );
        };

        return handler;
      });

      /**
       * Render.
       */

      render() {
        const state = !(STATE_PROPERTY_NAME in this.state)
          ? this.state
          : this.state[STATE_PROPERTY_NAME];

        return (
          <WrappedComponent
            {...this.props}
            handle={this.handle}
            state={state}
            update={this.update}
          />
        );
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      const wrappedComponentDisplayName =
        WrappedComponent.displayName || WrappedComponent.name || 'Component';

      WithUpdater.displayName = `withUpdater(${wrappedComponentDisplayName})`;
    }

    return WithUpdater;
  };
};
