/* global describe, test, expect */
'use strict'

const { EventEmitter } = require('events')
const { AsyncResource, executionAsyncId } = require('async_hooks')
const { wrapEmitter } = require('../src/util')

describe('wrapEmitter', () => {
  test('binds event listeners with async resource', (done) => {
    const emitter = new EventEmitter()
    const asyncResource = new AsyncResource('foobar')
    wrapEmitter(emitter, asyncResource)
    setTimeout(() => {
      emitter.emit('foo')
    }, 0)

    emitter.on('foo', () => {
      try {
        expect(executionAsyncId()).toEqual(asyncResource.asyncId())
        done()
      } catch (error) {
        done(error)
      }
    })
  })

  test('does not bind previously registered event listeners', (done) => {
    const emitter = new EventEmitter()
    const asyncResource = new AsyncResource('foobar')

    emitter.on('foo', () => {
      try {
        expect(executionAsyncId()).not.toEqual(asyncResource.asyncId())
        done()
      } catch (error) {
        done(error)
      }
    })

    wrapEmitter(emitter, asyncResource)
    setTimeout(() => {
      emitter.emit('foo')
    }, 0)
  })

  test('does not prevent event listeners from being removed', (done) => {
    const emitter = new EventEmitter()
    const asyncResource = new AsyncResource('foobar')
    wrapEmitter(emitter, asyncResource)

    const listener = () => {
      done(new Error('Boom'))
    }
    emitter.on('foo', listener)
    emitter.off('foo', listener)

    emitter.emit('foo')
    done()
  })

  test('wraps only once on multiple invocations', () => {
    const emitter = new EventEmitter()
    const asyncResource = new AsyncResource('foobar')

    const unwrappedMethod = emitter.addListener
    wrapEmitter(emitter, asyncResource)
    const wrappedMethod1 = emitter.addListener
    wrapEmitter(emitter, asyncResource)
    const wrappedMethod2 = emitter.addListener

    expect(unwrappedMethod).not.toEqual(wrappedMethod1)
    expect(wrappedMethod1).toEqual(wrappedMethod2)
  })
})

test('allows registering same listener function to different events', () => {
  const emitter = new EventEmitter()
  const asyncResource = new AsyncResource('foobar')

  let called = 0

  wrapEmitter(emitter, asyncResource)
  emitter.on('foo', myListener)
  emitter.on('bar', myListener)

  emitter.emit('foo')
  emitter.emit('bar')

  expect(called).toEqual(2)

  function myListener () {
    called++
  }
})

test('allows registering same listener function to same event', () => {
  const emitter = new EventEmitter()
  const asyncResource = new AsyncResource('foobar')

  let called = 0

  wrapEmitter(emitter, asyncResource)
  emitter.on('foo', myListener)
  emitter.on('foo', myListener)

  emitter.emit('foo')

  expect(called).toEqual(2)

  function myListener () {
    called++
  }
})

test('allows registering self-deregistering listener function', () => {
  const emitter = new EventEmitter()
  const asyncResource = new AsyncResource('foobar')

  let called = 0

  wrapEmitter(emitter, asyncResource)
  emitter.on('foo', myListener)
  emitter.on('bar', myListener)
  emitter.on('bar', myListener)
  emitter.on('bar', myListener)

  emitter.emit('foo')
  emitter.emit('foo')
  emitter.emit('bar')
  emitter.emit('bar')

  expect(called).toEqual(1)

  function myListener () {
    emitter.removeListener('foo', myListener)
    emitter.removeListener('foo', myListener) // This call is redundant, so it should be ignored.
    emitter.removeListener('bar', myListener)
    emitter.removeListener('bar', myListener)
    emitter.removeListener('bar', myListener)
    called++
  }
})
