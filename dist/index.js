'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});

var _iterall = require('iterall');

const defaultOnError = err => {
  throw new Error(err);
};
// Turn a callback-based listener into an async iterator
// Based on https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts

function callbackToAsyncIterator(listener, options = {}) {
  var _options$onError = options.onError;
  const onError =
    _options$onError === undefined ? defaultOnError : _options$onError;
  var _options$buffering = options.buffering;
  const buffering =
      _options$buffering === undefined ? true : _options$buffering,
    onClose = options.onClose;

  try {
    let pullQueue = [];
    let pushQueue = [];
    let listening = true;
    let listenerReturnValue;
    let listenerReturnedValue = false;
    let closingWaitingOnListenerReturnValue = false;
    // Start listener
    listener(value => pushValue(value))
      .then(a => {
        listenerReturnValue = a;
        listenerReturnedValue = true;
        if (closingWaitingOnListenerReturnValue) emptyQueue();
      })
      .catch(err => {
        onError(err);
      });

    function pushValue(value) {
      if (pullQueue.length !== 0) {
        pullQueue.shift()({ value, done: false });
      } else if (buffering === true) {
        pushQueue.push(value);
      }
    }

    function pullValue() {
      return new Promise(resolve => {
        if (pushQueue.length !== 0) {
          resolve({ value: pushQueue.shift(), done: false });
        } else {
          pullQueue.push(resolve);
        }
      });
    }

    function emptyQueue() {
      if (onClose && !listenerReturnedValue) {
        closingWaitingOnListenerReturnValue = true;
        return;
      }
      if (listening) {
        listening = false;
        pullQueue.forEach(resolve => resolve({ value: undefined, done: true }));
        pullQueue = [];
        pushQueue = [];
        if (onClose) {
          try {
            const closeRet = onClose(listenerReturnValue);
            if (closeRet) closeRet.catch(e => onError(e));
          } catch (e) {
            onError(e);
          }
        }
      }
    }

    return {
      next() {
        return listening ? pullValue() : this.return();
      },
      return() {
        emptyQueue();
        return Promise.resolve({ value: undefined, done: true });
      },
      throw(error) {
        emptyQueue();
        onError(error);
        return Promise.reject(error);
      },
      [_iterall.$$asyncIterator]() {
        return this;
      },
    };
  } catch (err) {
    onError(err);
    return {
      next() {
        return Promise.reject(err);
      },
      return() {
        return Promise.reject(err);
      },
      throw(error) {
        return Promise.reject(error);
      },
      [_iterall.$$asyncIterator]() {
        return this;
      },
    };
  }
}

exports.default = callbackToAsyncIterator;
