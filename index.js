'use strict'

const { AsyncLocalStorage } = require('async_hooks')
const uuidv1 = require('uuid/v1')

const als = new AsyncLocalStorage()

/**
 * Generates a request tracer middleware for Express.
 * @param {Object} options possible options
 * @param {boolean} options.useHeader respect request header flag
 *                                    (default: `false`)
 * @param {string} options.headerName request header name, used if `useHeader` is set to `true`
 *                                    (default: `X-Request-Id`)
 */
const expressMiddleware = ({
  useHeader = false,
  headerName = 'X-Request-Id'
} = {}) => {
  return (req, res, next) => {
    // TODO
    // ns.bindEmitter(req)
    // ns.bindEmitter(res)

    let requestId
    if (useHeader) {
      requestId = req.headers[headerName.toLowerCase()]
    }
    requestId = requestId || uuidv1()

    als.run(requestId, next)
  }
}

/**
 * Generates a request tracer middleware for Koa v2.
 * @param {Object} options possible options
 * @param {boolean} options.useHeader respect request header flag
 *                                    (default: `false`)
 * @param {string} options.headerName request header name, used if `useHeader` is set to `true`
 *                                    (default: `X-Request-Id`)
 */
const koaMiddleware = ({
  useHeader = false,
  headerName = 'X-Request-Id'
} = {}) => {
  return (ctx, next) => {
    // TODO
    // ns.bindEmitter(ctx.req)
    // ns.bindEmitter(ctx.res)

    let requestId
    if (useHeader) {
      requestId = ctx.request.headers[headerName.toLowerCase()]
    }
    requestId = requestId || uuidv1()

    return als.run(requestId, next)
  }
}

/**
 * Generates a request tracer middleware for Koa v1.
 * @param {Object} options possible options
 * @param {boolean} options.useHeader respect request header flag
 *                                    (default: `false`)
 * @param {string} options.headerName request header name, used if `useHeader` is set to `true`
 *                                    (default: `X-Request-Id`)
 */
const koaV1Middleware = ({
  useHeader = false,
  headerName = 'X-Request-Id'
} = {}) => {
  return function * (next) {
    // TODO
    // ns.bindEmitter(this.req)
    // ns.bindEmitter(this.res)

    let requestId
    if (useHeader) {
      requestId = this.request.headers[headerName.toLowerCase()]
    }
    requestId = requestId || uuidv1()

    als.enterWith(requestId)
    try {
      yield next
    } finally {
      als.enterWith(undefined)
    }
  }
}

const pluginName = 'cls-rtracer'

/**
 * A request tracer plugin for Hapi
 * @type {{once: boolean, name: string, register: hapiPlugin.register}}
 */
const hapiPlugin = ({
  name: pluginName,
  once: true,
  register: async (server, options) => {
    const {
      useHeader = false,
      headerName = 'X-Request-Id'
    } = options

    server.ext('onRequest', (request, h) => {
      // TODO
      // ns.bindEmitter(request.raw.req)
      // ns.bindEmitter(request.raw.res)

      let requestId
      if (useHeader) {
        requestId = request.headers[headerName.toLowerCase()]
      }
      requestId = requestId || uuidv1()
      als.enterWith(requestId)

      return h.continue
    })

    server.events.on('response', request => {
      als.enterWith(undefined)
    })
  }
})

/**
 * Returns request tracer id or `undefined` in case if the call is made from
 * an outside CLS context.
 */
const id = () => als.getStore()

module.exports = {
  expressMiddleware,
  fastifyMiddleware: expressMiddleware,
  koaMiddleware,
  koaV1Middleware,
  hapiPlugin,
  id
}
