# cls-rtracer

[![travis](https://travis-ci.org/puzpuzpuz/cls-rtracer.svg?branch=master)](https://travis-ci.org/puzpuzpuz/cls-rtracer.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/puzpuzpuz/cls-rtracer/badge.svg?branch=master)](https://coveralls.io/github/puzpuzpuz/cls-rtracer?branch=master)
[![npm](https://img.shields.io/npm/v/cls-rtracer.svg)](https://www.npmjs.com/package/cls-rtracer)
[![npm](https://img.shields.io/npm/dm/cls-rtracer.svg)](https://www.npmjs.com/package/cls-rtracer)

# cls-rtracer

Request Tracer - Express and Koa middlewares for CLS-based request id generation, batteries included. An out-of-the-box solution for adding request ids into your logs.

Automatically generates a UUID value as the id for each request and stores it in Continuation-Local Storage (CLS, see [cls-hooked](https://github.com/jeff-lewis/cls-hooked)). Optionally, if the request contains `X-Request-Id` header, uses its value instead. Allows to obtain the generated request id anywhere in your routes later and use it for logging or any other purposes.

Tested and works fine with Express v4 and Koa v2.

## How to use it - Step 1

Install:

```bash
npm install --save cls-rtracer
```

## How to use it - Step 2 (Express users)

Use the middleware provided by the library before the first middleware that needs to have access to request ids. Note that some middlewares, e.g. body-parser or express-jwt, may cause CLS context to get lost. To avoid such issues, you should use any third party middleware that does not need access to request ids *before* you use this middleware.

```javascript
const express = require('express')
const rTracer = require('cls-rtracer')

const app = express()
// any third party middleware that does not need access to request ids goes here
// ...

app.use(rTracer.expressMiddleware())
// optionally, you can override default middleware config:
// app.use(rTracer.expressMiddleware({
//   useHeader: true,
//   headerName: 'X-Your-Request-Header'
// }))

// all code in middlewares, starting from here, has access to request ids
```

Obtain request id in middlewares on the incoming request:

```javascript
// an example middleware for a generic find entity endpoint
app.get('/api/v1/entity/{id}', (req, res, next) => {
  entityService.find(req.params.id)
    .then((entity) => {
      // you can obtain the request id here
      const requestId = rTracer.id()
      console.log(`requestId: ${requestId}`)
      
      res.json(entity)
    })
    .catch(next)
})
```

You can access the same request id from code that does not have access to the Express' `req` object.

```javascript
// an imaginary entity-service.js
async function find (entityId) {
  // you can obtain the request id here
  const requestId = rTracer.id()
  // ...
}
```

## How to use it - Step 2 (Koa users)

Use the middleware provided by the library before the first middleware that needs to have access to request ids. Note that some middlewares may cause CLS context to get lost. To avoid such issues, you should use any third party middleware that does not need access to request ids *before* you use this middleware.

```javascript
const Koa = require('koa')
const rTracer = require('cls-rtracer')

const app = new Koa()
// any third party middleware that does not need access to request ids goes here
// ...

app.use(rTracer.koaMiddleware())
// optionally, you can override default middleware config:
// app.use(rTracer.koaMiddleware({
//   useHeader: true,
//   headerName: 'X-Your-Request-Header'
// }))

// all code in middlewares, starting from here, has access to request ids
```

Obtain request id in middlewares on the incoming request:

```javascript
// an example middleware for a generic find entity endpoint
// router config is skipped for the sake of simplicity
app.use(async (ctx) => {
  const entity = await entityService.find(req.params.id)
  // you can obtain the request id here
  const requestId = rTracer.id()
  console.log(`requestId: ${requestId}`)

  ctx.body = entity
})
```

You can access the same request id from code that does not have access to the Koa's `ctx` object.

```javascript
// an imaginary entity-service.js
async function find (entityId) {
  // you can obtain the request id here
  const requestId = rTracer.id()
  // ...
}
```

## Integration with loggers

The main use case for this library is request id generation and logging automation. You can integrate with any logger library in a single place and get request ids in logs across your Express application.

Without having a request id, as a correlation value, in your logs, you will not be able to determine which log entries belong to the process of handling the same request. You could generate a request id manually and store it in the Express' `req` or Koa's `ctx` objects, but then you will have to explicitly pass the object into all other modules on the route. And cls-rtracer comes to the rescue!

Let's consider integration with [winston](https://github.com/winstonjs/winston), one of most popular logging libraries.

```javascript
const { createLogger, format, transports } = require('winston')
const { combine, timestamp, printf } = format

// a custom format that outputs request id
const rTracerFormat = printf((info) => {
  const rid = rTracer.id()
  return rid
    ? `${info.timestamp} [request-id:${rid}]: ${info.message}`
    : `${info.timestamp}: ${info.message}`
})

const logger = createLogger({
  format: combine(
    timestamp(),
    rTracerFormat
  ),
  transports: [new transports.Console()]
})
```

Complete examples for both Express and Koa are available in `/examples/` directory.

## Middleware configuration

These are the available config options for the `expressMiddleware(options)` and `koaMiddleware(options)` functions. All config entries are optional.

```javascript
{
  // Respect request header flag (default: false).
  // If set to true, the middleware will be using a value from the specified header (if the value is present).
  useHeader: false,
  // Request header name, case insensitive (default: X-Request-Id).
  // Used if useHeader is set to true.
  headerName: 'X-Request-Id'
}
```

## Troubleshooting

To avoid weird behavior:

* Make sure you require `cls-rtracer` as the first dependency in your app. Some popular packages may use async which breaks CLS.

For Node 10 users:

* Node 10.0.x-10.3.x is not supported. That's because V8 version 6.6 introduced a bug that breaks async_hooks during async/await. Node 10.4.x uses V8 v6.7 where the bug is fixed. See: https://github.com/nodejs/node/issues/20274.

## License

Licensed under MIT.
