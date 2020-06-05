'use strict'

const wrapEmitter = (emitter, asyncResource) => {
  const original = emitter.emit;
  emitter.emit = (type, ...args) => {
    return asyncResource.runInAsyncScope(original, emitter, type, ...args);
  }
}

module.exports = {
  wrapEmitter
}
