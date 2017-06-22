export const stringifyFunction = fn => `[Function ${fn.name}]`;
export const noop = () => {};
export const stringify = value =>
  JSON.stringify(value, (key, value) => {
    if (typeof value === 'function') {
      return stringifyFunction(value);
    }

    return value;
  });
