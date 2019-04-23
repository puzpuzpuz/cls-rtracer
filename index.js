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
 * Generates a request tracer middleware for Koa.
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
    let requestId
    if (useHeader) {
      requestId = ctx.request.headers[headerName.toLowerCase()]
    }
    requestId = requestId || uuidv4()

    return new Promise(ns.bind((resolve, reject) => {
      ns.bindEmitter(ctx.req)
      ns.bindEmitter(ctx.res)
      ns.set('requestId', requestId)
      return next().then(resolve).catch(reject)
    }))
  }
}

/**
 * Returns request tracer id or `undefined` in case if the call is made from an outside CLS context.
 */
const id = () => ns.get('requestId')

module.exports = {
  expressMiddleware,
  koaMiddleware,
  id
}
