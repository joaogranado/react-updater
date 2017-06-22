/**
 * Module dependencies.
 */

import React, { Component } from 'react';
import { noop, stringify, stringifyFunction } from './utils';
import isPlainObject from 'is-plain-object';

/**
 * State property name.
 */

const STATE_PROPERTY_NAME = '@@STATE';

/**
 * Export `withUpdater`.
 */

export default initialState => {
  return WrappedComponent => {
    return class EnhancedComponent extends Component {
      memoizedCallbackHandlers = {};

      constructor(props) {
        super(props);

        const state = typeof initialState === 'function'
          ? initialState(props)
          : initialState;

        this.state = isPlainObject(state)
          ? state
          : { [STATE_PROPERTY_NAME]: state };
      }

      componentWillUnmount() {
        this.memoizedCallbackHandlers = null;
      }

      createCallbackHandler = (name, createHandler) => {
        return (callback, ...params) => {
          if (process.env.NODE_ENV !== 'production' && !callback.name) {
            // eslint-disable-next-line no-console
            console.warning(
              'Callbacks handlers defined with anonymous functions should be' +
                ' avoided. This can lead to de-optimisations on components' +
                ' that rely on props equality.'
            );

            return noop;
          }

          const id = name + stringifyFunction(callback) + stringify(params);

          if (!this.memoizedCallbackHandlers[id]) {
            const handler = createHandler(callback, params);

            this.memoizedCallbackHandlers[id] = { callback, handler };

            return handler;
          }

          // We need to ensure the handler is updated for different callbacks.
          // Since we check for the callback.name property, if another callback
          // with the same `name` were passed, the returned handler would the
          // call the previous callback.
          if (this.memoizedCallbackHandlers[id].callback !== callback) {
            this.memoizedCallbackHandlers[id] = {
              callback,
              handler: createHandler(callback, params)
            };
          }

          return this.memoizedCallbackHandlers[id].handler;
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
          this.setState(state => {
            if (typeof state[STATE_PROPERTY_NAME] === 'undefined') {
              return callback(state, ...params, ...args);
            }

            return {
              [STATE_PROPERTY_NAME]: callback(
                state[STATE_PROPERTY_NAME],
                ...params,
                ...args
              )
            };
          });
        };
      });

      render() {
        const state = typeof this.state[STATE_PROPERTY_NAME] === 'undefined'
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
    };
  };
};
