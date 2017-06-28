/**
 * Export `noop`.
 */

export const noop = () => {};

/**
 * Export `stringify`.
 */

export const stringify = value =>
  JSON.stringify(
    value,
    (key, value) => (typeof value === 'function' ? value.toString() : value)
  );
