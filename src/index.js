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
      cachedUpdateCount = 0;
      cachedHandleCount = 0;
      handleCallbacksRefs = new WeakMap();
      updateCallbacksRefs = new WeakMap();

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

          const handler = (...args) => fn(...handler.values, ...args);

          handler.values = values;
          this.handleCallbacksRefs.set(fn, handler);
          this.cachedHandleCount++;

          return handler;
        }

        const cached = this.handleCallbacksRefs.get(fn);

        cached.values = values;

        return cached;
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
          }

          const updater = (...args) => {
            const { values } = updater;

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

          updater.values = values;
          this.updateCallbacksRefs.set(fn, updater);
          this.cachedUpdateCount++;

          return updater;
        }

        const cached = this.updateCallbacksRefs.get(fn);

        cached.values = values;

        return cached;
      };

      componentWillUnmount() {
        this.cachedHandleCount = null;
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
