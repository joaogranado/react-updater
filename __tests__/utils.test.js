/**
 * Module dependencies.
 */

import { noop, stringify } from '../src/utils';

describe('utils', () => {
  describe('stringify', () => {
    it('stringifies an object containing a function', () => {
      const bar = () => {};

      expect(stringify({ foo: () => {}, bar, biz: 'foo' })).toMatchSnapshot();
    });
  });

  describe('noop', () => {
    it('is a function', () => {
      expect(typeof noop === 'function').toBe(true);
    });

    it('returns undefined', () => {
      expect(noop()).toBeUndefined();
    });
  });
});
