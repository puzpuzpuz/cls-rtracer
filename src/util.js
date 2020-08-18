'use strict'

const isWrappedSymbol = Symbol('cls-rtracer-is-wrapped')
const wrappedSymbol = Symbol('cls-rtracer-wrapped-function')

function wrapEmitterMethod (emitter, method, wrapper) {
  if (emitter[method][isWrappedSymbol]) {
    return
  }

  const original = emitter[method]
  const wrapped = wrapper(original, method)
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
 * Wraps EventEmitter listener registration methods of the
 * given emitter, so that all listeners are run in scope of
 * the provided async resource.
 */
function wrapEmitter (emitter, asyncResource) {
  for (const method of addMethods) {
    wrapEmitterMethod(emitter, method, (original) => function (name, handler) {
      handler[wrappedSymbol] = asyncResource.runInAsyncScope.bind(asyncResource, handler, emitter)
      return original.call(this, name, handler[wrappedSymbol])
    })
  }

  for (const method of removeMethods) {
    wrapEmitterMethod(emitter, method, (original) => function (name, handler) {
      return original.call(this, name, handler[wrappedSymbol] || handler)
    })
  }
}

module.exports = {
  wrapEmitter
}
