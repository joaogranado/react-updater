/* eslint react/prop-types: off */

/**
 * Module dependencies.
 */

import { mount } from 'enzyme';
import { noop } from '../src/utils';
import React, { Component } from 'react';
import withUpdater from '../src/index';

describe('withUpdater', () => {
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
    it('calls console.warning if the given callback is a anonymous function', () => {
      /* eslint-disable no-console */
      const warning = console.warning;
      console.warning = jest.fn();
      /* eslint-enable no-console */

      const Component = props => {
        props.update(() => {});

        return null;
      };
      const WithUpdater = withUpdater()(Component);

      mount(<WithUpdater />);

      /* eslint-disable no-console */
      expect(console.warning).toHaveBeenCalledTimes(1);
      expect(console.warning.mock.calls[0][0]).toMatchSnapshot(
        'Anonymous function warning'
      );

      console.warning = warning;
      /* eslint-enable no-console */
    });

    it('returns a no-op function if the given callback is a anonymous function', () => {
      /* eslint-disable no-console */
      const warning = console.warning;
      console.warning = jest.fn();
      /* eslint-enable no-console */

      const Component = props => {
        expect(props.update(() => {})).toBe(noop);

        return null;
      };
      const WithUpdater = withUpdater()(Component);

      mount(<WithUpdater />);

      /* eslint-disable no-console */
      console.warning = warning;
      /* eslint-enable no-console */
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

    it('preserves the referencial identity on subsequent renders', () => {
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

    it('preserves the referencial identity of the handler if one of the handlers is removed', () => {
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

    it('updates the state accordingly if one of the handlers is removed', () => {
      const bar = (state, increment) => state + increment;
      const Passthrough = () => <div />;
      const WrappedComponent = props =>
        <div>
          {props.show
            ? <div id={'bar'} onClick={props.update(bar, 2)} />
            : null}

          <div id={'foo'} onClick={props.update(bar, 1)} />

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

    it('does not preserve the referencial identity of the handler on subsequent renders if the callback handler changes', () => {
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

    it('updates the state if it is not an object', () => {
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

    it('updates the state if it is an object', () => {
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
      const Passthrough = () => <div />;
      const WrappedComponent = props =>
        <div>
          <button id={'foo'} onClick={props.update(increment, 1)} />
          <button id={'bar'} onClick={props.update(increment, 2)} />
          <button id={'biz'} onClick={props.update(increment, 3)} />

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
