/* eslint react/prop-types: off */

/**
 * Module dependencies.
 */

import { mount } from 'enzyme';
import { noop } from '../src/utils';
import React, { Component } from 'react';
import withUpdater from '../src/index';

describe('withUpdater', () => {
  it('sets the display name according to the component displayName', () => {
    const component = () => {};
    component.displayName = 'foo';

    expect(withUpdater()(component).displayName).toBe('withUpdater(foo)');
  });

  it('sets the display name according to the default function name', () => {
    const foo = () => null;

    expect(withUpdater()(foo).displayName).toBe('withUpdater(foo)');
  });

  it('sets the display name to be `Component`', () => {
    expect(withUpdater()(() => null).displayName).toBe(
      'withUpdater(Component)'
    );
  });

  it('passes the owner props if the initial state is a function', () => {
    const initialState = jest.fn();
    const WithUpdater = withUpdater(initialState)(() => null);

    mount(<WithUpdater foo={'bar'} />);

    expect(initialState).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('cleans up the memoized callback handlers when the component unmounts', () => {
    const handler = () => {};
    const Component = props => {
      props.update(handler);

      return null;
    };
    const WithUpdater = withUpdater()(Component);
    const wrapper = mount(<WithUpdater foo={'bar'} />);

    expect(wrapper.node.memoizedCallbackHandlers).toMatchSnapshot(
      'memoizedCallbackHandlers collection'
    );

    wrapper.unmount();

    expect(wrapper.node.memoizedCallbackHandlers).toBeNull();
  });

  describe('handle', () => {
    it('calls the given handler with the given arguments', () => {
      const handler = jest.fn();
      const WrappedComponent = props =>
        <button onClick={() => props.handle(handler, 'foo')('bar')} />;

      const WithUpdater = withUpdater(0)(WrappedComponent);
      const wrapper = mount(<WithUpdater />);

      wrapper.find('button').simulate('click');

      expect(handler.mock.calls[0][0]).toBe('foo');
      expect(handler.mock.calls[0][1]).toBe('bar');
    });
  });

  describe('update', () => {
    it('calls console.warn if the given callback is not a function', () => {
      /* eslint-disable no-console */
      const error = console.error;
      console.error = jest.fn();
      /* eslint-enable no-console */

      const Component = props => {
        props.update(null);

        return null;
      };
      const WithUpdater = withUpdater()(Component);

      mount(<WithUpdater />);

      /* eslint-disable no-console */
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error.mock.calls[0][0]).toMatchSnapshot(
        'Non-function callback error'
      );

      console.error = error;
      /* eslint-enable no-console */
    });

    it('returns a no-op function if the given callback is not a function', () => {
      /* eslint-disable no-console */
      const error = console.error;
      console.error = jest.fn();
      /* eslint-enable no-console */

      const Component = props => {
        expect(props.update(null)).toBe(noop);

        return null;
      };
      const WithUpdater = withUpdater()(Component);

      mount(<WithUpdater />);

      /* eslint-disable no-console */
      console.error = error;
      /* eslint-enable no-console */
    });

    it('calls console.warn if the given callback is a anonymous function', () => {
      /* eslint-disable no-console */
      const warn = console.warn;
      console.warn = jest.fn();
      /* eslint-enable no-console */

      const Component = props => {
        props.update(() => {});

        return null;
      };
      const WithUpdater = withUpdater()(Component);

      mount(<WithUpdater />);

      /* eslint-disable no-console */
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0][0]).toMatchSnapshot(
        'Anonymous function warn'
      );

      console.warn = warn;
      /* eslint-enable no-console */
    });

    it('handles undefined state returned from the state updater', () => {
      const handler = () => {};
      const Passthrough = () => <div />;
      const WrappedComponent = props =>
        <div>
          <button onClick={props.update(handler)} />;
          <Passthrough state={props.state} />
        </div>;
      const WithUpdater = withUpdater()(WrappedComponent);
      const wrapper = mount(<WithUpdater />);

      wrapper.find('button').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBeUndefined();
    });

    it('calls the given handler with the initial state and the given arguments', () => {
      const handler = jest.fn();
      const WrappedComponent = props =>
        <button onClick={() => props.update(handler, 'foo')('bar')} />;
      const WithUpdater = withUpdater(0)(WrappedComponent);
      const wrapper = mount(<WithUpdater />);

      wrapper.find('button').simulate('click');

      expect(handler.mock.calls[0][0]).toBe(0);
      expect(handler.mock.calls[0][1]).toBe('foo');
      expect(handler.mock.calls[0][2]).toBe('bar');
    });

    it('preserves the referential identity on subsequent renders', () => {
      class Passthrough extends Component {
        componentWillReceiveProps(props) {
          expect(props.foo).toBe(this.props.foo);
        }

        render() {
          return null;
        }
      }

      const handler = () => {};
      const WrappedComponent = props =>
        <Passthrough foo={props.update(handler)} />;
      const WithUpdater = withUpdater(0)(WrappedComponent);
      const wrapper = mount(<WithUpdater />);

      wrapper.update();
    });

    it('preserves the referential identity for different parameters', () => {
      class Passthrough extends Component {
        componentWillReceiveProps(props) {
          expect(props.foo).toBe(this.props.foo);
        }

        render() {
          return null;
        }
      }

      const handler = () => {};
      let count = 0;
      const WrappedComponent = props => {
        count++;

        return <Passthrough foo={props.update(handler, count)} />;
      };
      const WithUpdater = withUpdater(0)(WrappedComponent);

      const wrapper = mount(<WithUpdater />);

      wrapper.update();
    });

    it('preserves the referential identity of the handler if one of the handlers is removed', () => {
      class Passthrough extends Component {
        componentWillReceiveProps(props) {
          expect(props.foo).toBe(this.props.foo);
        }

        render() {
          return null;
        }
      }

      const bar = () => {};
      const WrappedComponent = props =>
        <div>
          {props.show ? <div onClick={props.update(bar)} /> : null}

          <Passthrough foo={props.update(bar)} />
        </div>;
      const WithUpdater = withUpdater(0)(WrappedComponent);

      class Wrapper extends Component {
        state = { show: true };

        onClick = () => {
          this.setState(({ show }) => ({ show: !show }));
        };

        render() {
          return (
            <div>
              <button onClick={this.onClick} />
              <WithUpdater show={this.state.show} />
            </div>
          );
        }
      }

      const wrapper = mount(<Wrapper />);

      wrapper.find('button').simulate('click');
      wrapper.find('button').simulate('click');
    });

    it('calls event persist() method', () => {
      const persist = jest.fn();
      const handler = (state, event) => event.target.value;
      const WrappedComponent = props =>
        <div>
          <input onChange={props.update(handler)} />
        </div>;
      const WithUpdater = withUpdater('')(WrappedComponent);
      const wrapper = mount(<WithUpdater />);

      wrapper.find('input').simulate('change', { persist });

      expect(persist).toHaveBeenCalledTimes(1);
    });

    it('calls event destructor() method', () => {
      const destructor = jest.fn();
      const handler = (state, event) => event.target.value;
      const WrappedComponent = props =>
        <div>
          <input onChange={props.update(handler)} />
        </div>;
      const WithUpdater = withUpdater('')(WrappedComponent);
      const wrapper = mount(<WithUpdater />);

      wrapper.find('input').simulate('change', { destructor });

      expect(destructor).toHaveBeenCalledTimes(1);
    });

    it('updates the state accordingly if one of the handlers is removed', () => {
      const handler = (state, increment) => state + increment;
      const handler1 = state => handler(state, 1);
      const handler2 = state => handler(state, 2);

      const Passthrough = () => <div />;
      const WrappedComponent = props =>
        <div>
          {props.show
            ? <div id={'bar'} onClick={props.update(handler2)} />
            : null}

          <div id={'foo'} onClick={props.update(handler1)} />

          <Passthrough state={props.state} />
        </div>;
      const WithUpdater = withUpdater(0)(WrappedComponent);

      class Wrapper extends Component {
        state = { show: true };

        onClick = () => {
          this.setState(({ show }) => ({ show: !show }));
        };

        render() {
          return (
            <div>
              <button onClick={this.onClick} />
              <WithUpdater show={this.state.show} />
            </div>
          );
        }
      }

      const wrapper = mount(<Wrapper />);

      expect(wrapper.find('Passthrough').props().state).toBe(0);

      wrapper.find('#foo').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(1);

      wrapper.find('#bar').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(3);

      wrapper.find('button').simulate('click');
      wrapper.find('#foo').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(4);

      wrapper.find('button').simulate('click');
      wrapper.find('#foo').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(5);

      wrapper.find('#bar').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(7);
    });

    it('updates the state accordingly for the same handler with different parameters', () => {
      let count = 0;
      const handler = (state, value) => state + value;
      const Passthrough = () => <div />;
      const WrappedComponent = props => {
        count++;

        return (
          <div>
            <button onClick={props.update(handler, count)} />
            <Passthrough state={props.state} />
          </div>
        );
      };
      const WithUpdater = withUpdater(0)(WrappedComponent);

      const wrapper = mount(<WithUpdater />);

      expect(wrapper.find('Passthrough').props().state).toBe(0);

      wrapper.find('button').simulate('click');

      expect(wrapper.find('Passthrough').props().state).toBe(1);

      wrapper.find('button').simulate('click');

      expect(wrapper.find('Passthrough').props().state).toBe(3);
    });

    it('does not preserve the referential identity of the handler on subsequent renders if the callback handler changes', () => {
      class Passthrough extends Component {
        componentWillReceiveProps(props) {
          expect(props.foo).not.toBe(this.props.foo);
        }

        render() {
          return null;
        }
      }
      const WrappedComponent = props =>
        <Passthrough foo={props.update(props.handler)} />;

      const WithUpdater = withUpdater(0)(WrappedComponent);

      class Wrapper extends Component {
        state = { handler: () => {} };

        updateHandler = () => {
          this.setState({ handler: () => {} });
        };

        render() {
          return (
            <div>
              <button onClick={this.updateHandler} />

              <WithUpdater handler={this.state.handler} />
            </div>
          );
        }
      }

      const wrapper = mount(<Wrapper />);

      wrapper.find('button').simulate('click');
    });

    it('updates the state if the handler changes', () => {
      const Passthrough = () => <div />;
      const WrappedComponent = props =>
        <div>
          <button id={'foo'} onClick={props.update(props.handler)} />

          <Passthrough state={props.state} />
        </div>;
      const WithUpdater = withUpdater(0)(WrappedComponent);

      class Wrapper extends Component {
        state = { handler: state => state + 1 };

        updateHandler = () => {
          this.setState({ handler: state => state + 2 });
        };

        render() {
          return (
            <div>
              <button id={'bar'} onClick={this.updateHandler} />

              <WithUpdater handler={this.state.handler} />
            </div>
          );
        }
      }

      const wrapper = mount(<Wrapper />);

      expect(wrapper.find('Passthrough').props().state).toBe(0);

      wrapper.find('#foo').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(1);

      wrapper.find('#bar').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(1);

      wrapper.find('#foo').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(3);
    });

    it('updates the state if the initial state is not an object', () => {
      const Passthrough = () => <div />;
      const handler = state => state + 1;
      class Component extends React.Component {
        componentDidMount() {
          this.props.update(handler)();
        }

        render() {
          return <Passthrough state={this.props.state} />;
        }
      }

      const WithUpdater = withUpdater(0)(Component);
      const wrapper = mount(<WithUpdater />);

      expect(wrapper.find('Passthrough').props().state).toBe(1);
    });

    it('updates the state if the initial state is an object', () => {
      const Passthrough = () => <div />;
      const handler = state => ({
        count: state.count + 1
      });
      class Component extends React.Component {
        componentDidMount() {
          this.props.update(handler)();
        }

        render() {
          return <Passthrough state={this.props.state} />;
        }
      }

      const WithUpdater = withUpdater({ count: 0 })(Component);
      const wrapper = mount(<WithUpdater />);

      expect(wrapper.find('Passthrough').props().state).toEqual({ count: 1 });
    });

    it('updates the state accordingly', () => {
      const increment = (state, increment) => state + increment;
      const increment1 = state => increment(state, 1);
      const increment2 = state => increment(state, 2);
      const increment3 = state => increment(state, 3);

      const Passthrough = () => <div />;
      const WrappedComponent = props =>
        <div>
          <button id={'foo'} onClick={props.update(increment1)} />
          <button id={'bar'} onClick={props.update(increment2)} />
          <button id={'biz'} onClick={props.update(increment3)} />

          <Passthrough state={props.state} />
        </div>;

      const WithUpdater = withUpdater(0)(WrappedComponent);
      const wrapper = mount(<WithUpdater />);

      wrapper.find('#foo').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(1);

      wrapper.find('#bar').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(3);

      wrapper.find('#bar').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(5);

      wrapper.find('#biz').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(8);

      wrapper.find('#foo').simulate('click');
      expect(wrapper.find('Passthrough').props().state).toBe(9);
    });
  });
});
