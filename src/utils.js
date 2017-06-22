/**
 * Export `noop`.
 */

export const noop = () => {};

/**
 * Export `stringify`.
 */

export const stringify = value =>
  JSON.stringify(value, (key, value) => {
    if (typeof value === 'function') {
      return stringifyFunction(value);
    }

    return value;
  });

/**
 * Export `stringifyFunction`.
 */

export const stringifyFunction = fn => `[Function ${fn.name}]`;
