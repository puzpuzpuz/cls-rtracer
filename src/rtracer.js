'use strict'

const { wrapEmitter } = require('./util')
const { v1: uuidv1 } = require('uuid')
const { AsyncLocalStorage, AsyncResource } = require('async_hooks')

const pluginName = 'cls-rtracer'

const als = new AsyncLocalStorage()

const wrapHttpEmitters = (req, res) => {
  const asyncResource = new AsyncResource('cls-rtracer')
  wrapEmitter(req, asyncResource)
  wrapEmitter(res, asyncResource)
}

const expressSetResHeaderFn = (res, headerName, requestId) => {
  res.set(headerName, requestId)
}
const fastifySetResHeaderFn = (res, headerName, requestId) => {
  res.setHeader(headerName, requestId)
}

/**
 * Generates a function to generate tracer middleware for Express/Fastify.
 * @param setResHeaderFn {function} function used to set response header
 */
const expressMiddleware = (setResHeaderFn) => {
  /**
   * Generates a request tracer middleware for Express/Fastify.
   *
   * @param {Object} options possible options
   * @param {boolean} options.useHeader respect request header flag
   *                                    (default: `false`)
   * @param {string} options.headerName request header name, used if `useHeader`/`echoHeader` is set to `true`
   *                                    (default: `X-Request-Id`)
   * @param {function} options.requestIdFactory function used to generate request ids
   *                                    (default: UUIDs v1)
   * @param {boolean} options.echoHeader injects `headerName` header into the response
   *                                    (default: `false`)
   */
  return ({
    useHeader = false,
    headerName = 'X-Request-Id',
    requestIdFactory = uuidv1,
    echoHeader = false
  } = {}) => {
    return (req, res, next) => {
      let requestId
      if (useHeader) {
        requestId = req.headers[headerName.toLowerCase()]
      }
      requestId = requestId || requestIdFactory(req)

      if (echoHeader) {
        setResHeaderFn(res, headerName, requestId)
      }

      als.run(requestId, () => {
        wrapHttpEmitters(req, res)
        next()
      })
    }
  }
}

/**
 * Request tracer plugin for Fastify.
 *
 * @param {Object} options possible options
 * @param {boolean} options.useHeader respect request header flag
 *                                    (default: `false`)
 * @param {string} options.headerName request header name, used if `useHeader`/`echoHeader` is set to `true`
 *                                    (default: `X-Request-Id`)
 * @param {boolean} options.useFastifyRequestId respect Fastify request id flag
 *                                    (default: `false`)
 * @param {function} options.requestIdFactory function used to generate request ids
 *                                    (default: UUIDs v1)
 * @param {boolean} options.echoHeader injects `headerName` header into the response
 *                                    (default: `false`)
 */
const fastifyPlugin = (fastify, options, next) => {
  const {
    useHeader = false,
    headerName = 'X-Request-Id',
    useFastifyRequestId = false,
    requestIdFactory = uuidv1,
    echoHeader = false
  } = options

  fastify.addHook('onRequest', (request, reply, done) => {
    let requestId
    if (useHeader) {
      requestId = request.headers[headerName.toLowerCase()]
    }
    if (useFastifyRequestId) {
      requestId = requestId || request.id
    }
    requestId = requestId || requestIdFactory(request)

    if (echoHeader) {
      reply.header(headerName, requestId)
    }

    als.run(requestId, () => {
      wrapHttpEmitters(request.raw, reply.raw || reply.res)
      done()
    })
  })
  next()
}

fastifyPlugin[Symbol.for('skip-override')] = true
fastifyPlugin[Symbol.for('fastify.display-name')] = pluginName

/**
 * Generates a request tracer middleware for Koa v2.
 *
 * @param {Object} options possible options
 * @param {boolean} options.useHeader respect request header flag
 *                                    (default: `false`)
 * @param {string} options.headerName request header name, used if `useHeader`/`echoHeader` is set to `true`
 *                                    (default: `X-Request-Id`)
 * @param {function} options.requestIdFactory function used to generate request ids
 *                                    (default: UUIDs v1)
 * @param {boolean} options.echoHeader injects `headerName` header into the response
 *                                    (default: `false`)
 */
const koaMiddleware = ({
  useHeader = false,
  headerName = 'X-Request-Id',
  requestIdFactory = uuidv1,
  echoHeader = false
} = {}) => {
  return (ctx, next) => {
    let requestId
    if (useHeader) {
      requestId = ctx.request.headers[headerName.toLowerCase()]
    }
    requestId = requestId || requestIdFactory(ctx.request)

    if (echoHeader) {
      ctx.set(headerName, requestId)
    }

    return als.run(requestId, () => {
      wrapHttpEmitters(ctx.req, ctx.res)
      return next()
    })
  }
}

/**
 * Generates a request tracer middleware for Koa v1.
 *
 * @param {Object} options possible options
 * @param {boolean} options.useHeader respect request header flag
 *                                    (default: `false`)
 * @param {string} options.headerName request header name, used if `useHeader`/`echoHeader` is set to `true`
 *                                    (default: `X-Request-Id`)
 * @param {function} options.requestIdFactory function used to generate request ids
 *                                    (default: UUIDs v1)
 * @param {boolean} options.echoHeader injects `headerName` header into the response
 *                                    (default: `false`)
 */
const koaV1Middleware = ({
  useHeader = false,
  headerName = 'X-Request-Id',
  requestIdFactory = uuidv1,
  echoHeader = false
} = {}) => {
  return function * (next) {
    let requestId
    if (useHeader) {
      requestId = this.request.headers[headerName.toLowerCase()]
    }
    requestId = requestId || requestIdFactory(this.request)

    if (echoHeader) {
      this.response.set(headerName, requestId)
    }

    als.enterWith(requestId)
    try {
      wrapHttpEmitters(this.req, this.res)
      yield next
    } finally {
      als.enterWith(undefined)
    }
  }
}

/**
 * Request tracer plugin for Hapi.
 *
 * @type {{once: boolean, name: string, register: hapiPlugin.register}}
 */
const hapiPlugin = ({
  name: pluginName,
  once: true,
  register: async (server, options) => {
    const {
      useHeader = false,
      headerName = 'X-Request-Id',
      requestIdFactory = uuidv1,
      echoHeader = false
    } = options

    server.ext('onRequest', (request, h) => {
      let requestId
      if (useHeader) {
        requestId = request.headers[headerName.toLowerCase()]
      }
      requestId = requestId || requestIdFactory(request)

      als.enterWith(requestId)
      wrapHttpEmitters(request.raw.req, request.raw.res)

      return h.continue
    })

    if (echoHeader) {
      server.ext('onPreResponse', async (request, h) => {
        if (request.response.output) { // Response is a Boom error
          request.response.output.headers[headerName] = id()
        } else {
          request.response.header(headerName, id())
        }
        return h.continue
      })
    }

    server.events.on('response', () => {
      als.enterWith(undefined)
    })
  }
})

/**
 * Runs the given function in scope of the id.
 *
 * @param {Function} fn function to run
 * @param {*} id optional id to be available in the function
 */
const runWithId = (fn, id) => {
  id = id || uuidv1()
  return als.run(id, fn)
}

/**
 * Returns request tracer id or `undefined` in case if the call
 * is made outside of the CLS context.
 */
const id = () => als.getStore()

module.exports = {
  expressMiddleware: expressMiddleware(expressSetResHeaderFn),
  fastifyPlugin,
  fastifyMiddleware: expressMiddleware(fastifySetResHeaderFn),
  koaMiddleware,
  koaV1Middleware,
  hapiPlugin,
  runWithId,
  id
}
