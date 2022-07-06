'use strict'

const isWrappedSymbol = Symbol('cls-rtracer-is-wrapped')
const wrappedSymbol = Symbol('cls-rtracer-wrapped-function')

function wrapEmitterMethod (emitter, method, wrapper) {
  if (emitter[method][isWrappedSymbol]) {
    return
  }

  const original = emitter[method]
  const wrapped = wrapper(original)
  wrapped[isWrappedSymbol] = true
  emitter[method] = wrapped

  return wrapped
}

const addMethods = [
  'on',
  'addListener',
  'prependListener'
]

const removeMethods = [
  'off',
  'removeListener'
]

/**
 * Wraps EventEmitter listener registration methods of the given emitter,
 * so that all listeners are run in scope of the provided async resource.
 *
 * Supports registering same listener function to multiple events (or
 * even the same one), as well as subsequent deregistering.
 */
function wrapEmitter (emitter, asyncResource) {
  for (const method of addMethods) {
    wrapEmitterMethod(emitter, method, (original) => function (event, handler) {
      let wrapped = emitter[wrappedSymbol]
      if (wrapped === undefined) {
        wrapped = {}
        emitter[wrappedSymbol] = wrapped
      }
      const wrappedHandler = asyncResource.runInAsyncScope.bind(asyncResource, handler, emitter)
      const existing = wrapped[event]
      if (existing === undefined) {
        wrapped[event] = wrappedHandler
      } else if (typeof existing === 'function') {
        wrapped[event] = [existing, wrappedHandler]
      } else {
        wrapped[event].push(wrappedHandler)
      }
      return original.call(this, event, wrappedHandler)
    })
  }

  for (const method of removeMethods) {
    wrapEmitterMethod(emitter, method, (original) => function (event, handler) {
      let wrappedHandler
      const wrapped = emitter[wrappedSymbol]
      if (wrapped !== undefined) {
        const existing = wrapped[event]
        if (existing !== undefined) {
          if (typeof existing === 'function') {
            wrappedHandler = existing
            delete wrapped[event]
          } else {
            wrappedHandler = existing.pop()
          }
        }
      }
      return original.call(this, event, wrappedHandler || handler)
    })
  }
}

module.exports = {
  wrapEmitter
}
