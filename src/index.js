/**
 * Module dependencies.
 */

import React, { Component } from 'react';
import isPlainObject from 'is-plain-object';

/**
 * State property name.
 */

const STATE_PROPERTY_NAME = '@@STATE';
const MAX_CALLBACKS_COUNT = 30;

/**
 * Export `withUpdater`.
 */

export default (initialState = null) => {
  return WrappedComponent => {
    return class EnhancedComponent extends Component {
      cachedHandleCallbacks = {};
      cachedUpdateCallbacks = {};
      cachedUpdateCount = 0;
      cachedHandleCount = 0;
      handleCallbacksRefs = new Map();
      updateCallbacksRefs = new Map();

      constructor(props) {
        super(props);

        if (typeof initialState === 'function') {
          const state = initialState(props);

          this.state = isPlainObject(state)
            ? state
            : { [STATE_PROPERTY_NAME]: state };
        } else {
          this.state = isPlainObject(initialState)
            ? initialState
            : { [STATE_PROPERTY_NAME]: initialState };
        }
      }

      /**
       * Wraps the callback handler and returns a new function that receives
       * additional arguments.
       * This method memoizes up to **30** handlers in order to avoid a common
       * pitfall associated with components that rely on props equality
       * (e.g:. `shouldComponentUpdate`) which can lead to de-optimizations.
       */

      handle = (fn, ...values) => {
        if (!this.handleCallbacksRefs.has(fn)) {
          if (
            process.env.NODE_ENV !== 'production' &&
            this.cachedHandleCount === MAX_CALLBACKS_COUNT
          ) {
            // eslint-disable-next-line no-console
            console.error(
              'Maximum "handle" callbacks size exceeded. This probably is because' +
                ' you are creating inline handlers inside the render method,' +
                ' which results in a new handler on every render which can lead' +
                ' to de-optimizations by components that rely on props equality.'
            );
          }

          this.handleCallbacksRefs.set(fn, this.cachedHandleCount);
          this.cachedHandleCount++;
        }

        const hash = this.handleCallbacksRefs.get(fn) + JSON.stringify(values);

        if (this.cachedHandleCallbacks[hash]) {
          return this.cachedHandleCallbacks[hash];
        }

        this.cachedHandleCallbacks[hash] = (...args) => {
          fn(...values, ...args);
        };

        return this.cachedHandleCallbacks[hash];
      };

      /**
       * Wraps the callback handler in a `setState` call and returns a new
       * function that receives the previous state and the given arguments.
       * Since this wraps the callback handler in a `setState` call, the handler
       * should always return a new state which can be an object or a single
       * value.
       * This method memoizes up to **30** handlers in order to avoid a common
       * pitfall associated with components that rely on props equality
       * (e.g:. `shouldComponentUpdate`) which can lead to de-optimizations.
       */

      update = (fn, ...values) => {
        if (!this.updateCallbacksRefs.has(fn)) {
          if (
            process.env.NODE_ENV !== 'production' &&
            this.cachedUpdateCount === MAX_CALLBACKS_COUNT
          ) {
            // eslint-disable-next-line no-console
            console.error(
              'Maximum "update" callbacks size exceeded. This probably is because' +
                ' you are creating inline handlers inside the render method,' +
                ' which results in a new handler on every render which can lead' +
                ' to de-optimizations by components that rely on props equality.'
            );

            return;
          }

          this.updateCallbacksRefs.set(fn, this.cachedUpdateCount);
          this.cachedUpdateCount++;
        }

        const hash = this.updateCallbacksRefs.get(fn) + JSON.stringify(values);

        if (this.cachedUpdateCallbacks[hash]) {
          return this.cachedUpdateCallbacks[hash];
        }

        this.cachedUpdateCallbacks[hash] = (...args) => {
          this.setState(state => {
            if (typeof state[STATE_PROPERTY_NAME] === 'undefined') {
              return fn(state, ...values, ...args);
            }

            return {
              [STATE_PROPERTY_NAME]: fn(
                state[STATE_PROPERTY_NAME],
                ...values,
                ...args
              )
            };
          });
        };

        return this.cachedUpdateCallbacks[hash];
      };

      componentWillUnmount() {
        this.cachedHandleCallbacks = null;
        this.cachedHandleCount = null;
        this.cachedUpdateCallbacks = null;
        this.cachedUpdateCount = null;
        this.handleCallbacksRefs = null;
        this.updateCallbacksRefs = null;
      }

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
