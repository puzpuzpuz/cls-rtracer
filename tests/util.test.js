/* global describe, test, expect */
'use strict'

const { EventEmitter } = require('events')
const { AsyncResource, executionAsyncId } = require('async_hooks')
const { wrapEmitter } = require('../src/util')

describe('wrapEmitter', () => {
  test('binds event listenters with async resource', (done) => {
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
})
