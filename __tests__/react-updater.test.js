/* eslint react/prop-types: off */

/**
 * Module dependencies.
 */

import { mount } from 'enzyme';
import React from 'react';
import withUpdater from '../src/index';

describe('withUpdater', () => {
  it('passes the owner props if the initial state is a function', () => {
    const initialState = jest.fn();
    const WithUpdater = withUpdater(initialState)(() => null);

    mount(<WithUpdater foo={'bar'} />);

    expect(initialState).toHaveBeenCalledWith({ foo: 'bar' });
  });

  describe('handle', () => {
    it('calls console.error if the maximum number of callbacks is exceeded', () => {
      /* eslint-disable no-console */
      const error = console.error;
      console.error = jest.fn();
      /* eslint-enable no-console */

      const component = props => {
        for (let i = 0; i < 31; i++) {
          props.handle(() => {});
        }

        return null;
      };
      const WithUpdater = withUpdater()(component);

      mount(<WithUpdater />);

      /* eslint-disable no-console */
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error.mock.calls[0][0]).toMatchSnapshot();

      console.error = error;
      /* eslint-enable no-console */
    });

    it('it returns the same handler for different arguments', () => {
      const handler = () => {};
      const component = props => {
        expect(props.handle(handler, 'foo')('bar')).toBe(
          props.handle(handler, 'biz')('buz')
        );

        return null;
      };
      const WithUpdater = withUpdater()(component);

      mount(<WithUpdater />);
    });

    it('calls the given handler with the given arguments', () => {
      const handler = jest.fn();
      const component = props => {
        props.handle(handler, 'foo')('bar');

        return null;
      };
      const WithUpdater = withUpdater()(component);

      mount(<WithUpdater />);

      expect(handler).toHaveBeenCalledWith('foo', 'bar');
    });
  });

  describe('update', () => {
    it('calls console.error if the maximum number of callbacks is exceeded', () => {
      /* eslint-disable no-console */
      const error = console.error;
      console.error = jest.fn();
      /* eslint-enable no-console */

      const component = props => {
        for (let i = 0; i < 31; i++) {
          props.update(() => {});
        }

        return null;
      };
      const WithUpdater = withUpdater()(component);

      mount(<WithUpdater />);

      /* eslint-disable no-console */
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error.mock.calls[0][0]).toMatchSnapshot();

      console.error = error;

      /* eslint-enable no-console */
    });

    it('it returns the same handler for different arguments', () => {
      const handler = () => {};

      class Component extends React.Component {
        componentDidMount() {
          expect(this.props.update(handler, 'foo')('bar')).toBe(
            this.props.update(handler, 'biz')('buz')
          );
        }

        render() {
          return null;
        }
      }

      const WithUpdater = withUpdater()(Component);

      mount(<WithUpdater />);
    });

    it('calls the given handler with the initial state and the given arguments', () => {
      const handler = jest.fn();

      class Component extends React.Component {
        componentDidMount() {
          this.props.update(handler, 'foo')('bar');
        }

        render() {
          return null;
        }
      }

      const WithUpdater = withUpdater(0)(Component);

      mount(<WithUpdater />);

      expect(handler).toHaveBeenCalledWith(0, 'foo', 'bar');
    });

    it('updates the state if it is not an object', () => {
      const Passthrough = () => <div />;
      class Component extends React.Component {
        componentDidMount() {
          this.props.update(state => state + 1)();
        }

        render() {
          return <Passthrough state={this.props.state} />;
        }
      }

      const WithUpdater = withUpdater(0)(Component);
      const wrapper = mount(<WithUpdater />);

      expect(wrapper.find('Passthrough').props().state).toBe(1);
    });

    it('updates the state if it is an object', () => {
      const Passthrough = () => <div />;
      class Component extends React.Component {
        componentDidMount() {
          this.props.update(state => ({
            count: state.count + 1
          }))();
        }

        render() {
          return <Passthrough state={this.props.state} />;
        }
      }

      const WithUpdater = withUpdater({ count: 0 })(Component);
      const wrapper = mount(<WithUpdater />);

      expect(wrapper.find('Passthrough').props().state).toEqual({ count: 1 });
    });
  });
});
