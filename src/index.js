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
      memoizedCallbackHandlers = {};

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

          const callbackName = callback.name || '';
          const stringifiedCallback = Function.prototype.toString.call(
            callback
          );
          const hash = `${name}[${callbackName} ${stringifiedCallback}]${stringify(
            params
          )}`;

          if (!this.memoizedCallbackHandlers[hash]) {
            const handler = createHandler(callback, params);

            this.memoizedCallbackHandlers[hash] = { callback, handler };

            return handler;
          }

          // We need to ensure the handler is updated for different callbacks.
          // Since we check for the callback.name property, if another callback
          // with the same `name` were passed, the returned handler would the
          // call the previous callback so we need to invalidate the cache.
          if (this.memoizedCallbackHandlers[hash].callback !== callback) {
            this.memoizedCallbackHandlers[hash] = {
              callback,
              handler: createHandler(callback, params)
            };
          }

          return this.memoizedCallbackHandlers[hash].handler;
        };
      };

      /**
       * Wraps the callback handler and returns a new function that receives
       * additional arguments.
       */

      handle = this.createCallbackHandler('handle', (callback, params) => {
        return (...args) => callback(...params, ...args);
      });

      /**
       * Wraps the callback handler in a `setState` call and returns a new
       * function that receives the previous state and the given arguments.
       * Since this wraps the callback handler in a `setState` call, the handler
       * should always return a new state which can be an object or a single
       * value.
       */

      update = this.createCallbackHandler('update', (callback, params) => {
        return (...args) => {
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
                return callback(state, ...params, ...args);
              }

              return {
                [STATE_PROPERTY_NAME]: callback(
                  state[STATE_PROPERTY_NAME],
                  ...params,
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
