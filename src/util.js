'use strict'

/**
 * Monkey patches `.emit()` method of the given emitter, so
 * that all event listeners are run in scope of the provided
 * async resource.
 */
const wrapEmitter = (emitter, asyncResource) => {
  const original = emitter.emit
  emitter.emit = function (type, ...args) {
    return asyncResource.runInAsyncScope(original, emitter, type, ...args)
  }
}

module.exports = {
  wrapEmitter
}
