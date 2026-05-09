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
      let entries = wrapped[event]
      if (entries === undefined) {
        entries = []
        wrapped[event] = entries
      }
      entries.push([handler, wrappedHandler])
      return original.call(this, event, wrappedHandler)
    })
  }

  for (const method of removeMethods) {
    wrapEmitterMethod(emitter, method, (original) => function (event, handler) {
      let wrappedHandler = handler
      const wrapped = emitter[wrappedSymbol]
      if (wrapped !== undefined) {
        const entries = wrapped[event]
        if (entries !== undefined) {
          // Match Node's EventEmitter.removeListener: when the same listener
          // is registered multiple times, the most recently added one is removed.
          for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i][0] === handler) {
              wrappedHandler = entries[i][1]
              entries.splice(i, 1)
              if (entries.length === 0) delete wrapped[event]
              break
            }
          }
        }
      }
      return original.call(this, event, wrappedHandler)
    })
  }
}

module.exports = {
  wrapEmitter
}
