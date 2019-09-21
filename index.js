'use strict'

const cls = require('cls-hooked')
const uuidv4 = require('uuid/v4')

// generate a unique value for namespace
const nsid = `rtracer:${uuidv4()}`
const ns = cls.createNamespace(nsid)

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
    ns.bindEmitter(req)
    ns.bindEmitter(res)

    let requestId
    if (useHeader) {
      requestId = req.headers[headerName.toLowerCase()]
    }
    requestId = requestId || uuidv4()

    ns.run(() => {
      ns.set('requestId', requestId)
      next()
    })
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
    ns.bindEmitter(ctx.req)
    ns.bindEmitter(ctx.res)

    let requestId
    if (useHeader) {
      requestId = ctx.request.headers[headerName.toLowerCase()]
    }
    requestId = requestId || uuidv4()

    return new Promise(ns.bind((resolve, reject) => {
      ns.set('requestId', requestId)
      return next().then(resolve).catch(reject)
    }))
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
    ns.bindEmitter(this.req)
    ns.bindEmitter(this.res)

    const clsCtx = ns.createContext()
    ns.enter(clsCtx)
    try {
      let requestId
      if (useHeader) {
        requestId = this.request.headers[headerName.toLowerCase()]
      }
      requestId = requestId || uuidv4()
      ns.set('requestId', requestId)

      yield next
    } finally {
      ns.exit(clsCtx)
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
      ns.bindEmitter(request.raw.req)
      ns.bindEmitter(request.raw.res)

      const clsCtx = ns.createContext()
      ns.enter(clsCtx)

      request.plugins[pluginName] = {
        context: clsCtx
      }

      let requestId
      if (useHeader) {
        requestId = request.headers[headerName.toLowerCase()]
      }
      requestId = requestId || uuidv4()
      ns.set('requestId', requestId)

      return h.continue
    })

    server.events.on('response', request => {
      const clsCtx = request.plugins[pluginName].context
      ns.exit(clsCtx)
    })
  }
})

/**
 * Returns request tracer id or `undefined` in case if the call is made from an outside CLS context.
 */
const id = () => ns.get('requestId')

module.exports = {
  expressMiddleware,
  fastifyMiddleware: expressMiddleware,
  koaMiddleware,
  koaV1Middleware,
  hapiPlugin,
  id
}
