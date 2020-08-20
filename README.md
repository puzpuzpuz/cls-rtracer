[![travis](https://travis-ci.org/puzpuzpuz/cls-rtracer.svg?branch=master)](https://travis-ci.org/puzpuzpuz/cls-rtracer.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/puzpuzpuz/cls-rtracer/badge.svg?branch=master)](https://coveralls.io/github/puzpuzpuz/cls-rtracer?branch=master)
[![npm](https://img.shields.io/npm/v/cls-rtracer.svg)](https://www.npmjs.com/package/cls-rtracer)
[![npm](https://img.shields.io/npm/dm/cls-rtracer.svg)](https://www.npmjs.com/package/cls-rtracer)

# cls-rtracer

Request Tracer - Express & Koa middlewares and Fastify & Hapi plugins for CLS-based request id generation, batteries included. An out-of-the-box solution for adding request ids into your logs. Check out [this blog post](https://medium.com/@apechkurov/request-id-tracing-in-node-js-applications-c517c7dab62d) that describes the rationale behind `cls-rtracer`.

Automatically generates a UUID V1 value as the id for each request and stores it in `AsyncLocalStorage` (CLS core API, see [this blog post](https://itnext.io/one-node-js-cls-api-to-rule-them-all-1670ac66a9e8)). Optionally, if the request contains `X-Request-Id` header, uses its value instead. Allows to obtain the generated request id anywhere in your routes later and use it for logging or any other purposes.

Tested and works fine with Express v4, Fastify v2 and v3, Koa v1 and v2, and Hapi v18.

## Supported Node.js versions

As `cls-rtracer` v2 depends on [`AsyncLocalStorage API`](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynclocalstorage), it requires Node.js 12.17.0+, 13.14.0+, or 14.0.0+. If you happen to use an older Node.js version, you should use [`cls-rtracer` v1](https://github.com/puzpuzpuz/cls-rtracer/tree/1.x) which is based on [`cls-hooked`](https://github.com/jeff-lewis/cls-hooked).

## How to use it - Step 1

Install:

```bash
npm install --save cls-rtracer
```

Note for TypeScript users: typings are included.

## How to use it - Step 2 (Common instructions)

Use the middleware (or plugin) provided by the library before the first middleware that needs to have access to request ids. Note that some middlewares, may cause CLS context (i.e. Async Hooks execution path) to get lost. To avoid such issues, you should use any third party middleware that does not need access to request ids *before* you use this middleware. See issue #20 as an example.

## How to use it - Step 2 (Express users)

Use the middleware provided by the library:

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

## How to use it - Step 2 (Fastify users)

Use the plugin provided by the library:

```javascript
const fastify = require('fastify')()
const rTracer = require('cls-rtracer')

// any third party plugin that does not need access to request ids goes here
// ...

fastify.register(rTracer.fastifyPlugin)
// optionally, you can override default plugin config:
// fastify.register(rTracer.fastifyPlugin, {
//   useHeader: true,
//   headerName: 'X-Your-Request-Header',
//   useFastifyRequestId: true
// }))

// all code in plugins or handlers, starting from here, has access to request ids
```

Obtain request id in handlers on the incoming request:

```javascript
// an example handler for a generic find entity endpoint
// router config is skipped for the sake of simplicity
app.get('/test', async (request, reply) => {
  const entity = await entityService.find(request.params.id)
  // you can obtain the request id here
  const requestId = rTracer.id()
  console.log(`requestId: ${requestId}`)

  reply.send(entity)
})
```

You can access the same request id from code that does not have access to the Fastify's `request` object.

```javascript
// an imaginary entity-service.js
async function find (entityId) {
  // you can obtain the request id here
  const requestId = rTracer.id()
  // ...
}
```

### Legacy Fastify middleware

There is a connect-style middleware available for Fastify v2, but it is deprecated and may be removed in one of upcoming releases. If you happen to use it in your application, you should migrate to the Fastify plugin.

```js
fastify.use(rTracer.fastifyMiddleware())
```

## How to use it - Step 2 (Koa users)

Use the middleware provided by the library:

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

### Koa v1 support

For Koa v1 use the `koaV1Middleware(options)` function.

## How to use it - Step 2 (Hapi users)

Use the plugin provided by the library:

```javascript
const Hapi = require('@hapi/hapi')
const rTracer = require('cls-rtracer')

const init = async () => {
  const server = Hapi.server({
    port: 3000,
    host: 'localhost'
  })
  // any third party plugin that does not need access to request ids goes here
  // ...

  await server.register({
    plugin: rTracer.hapiPlugin
  })

  // optionally, you can override default middleware config:
  //  await server.register({
  //    plugin: rTracer.hapiPlugin,
  //    options: {
  //      useHeader: true,
  //      headerName: 'X-Your-Request-Header'
  //    }
  //  })

  // all code in routes, starting from here, has access to request ids
}

init()
```

Obtain request id in route handlers on the incoming request:

```javascript
// an example route for a generic find entity endpoint
server.route({
  method: 'GET',
  path: '/test',
  handler: async (request, h) => {
    const entity = await entityService.find(request.params.id)
    // you can obtain the request id here
    const requestId = rTracer.id()
    console.log(`requestId: ${requestId}`)

    return entity
  }
})
```

You can access the same request id from code that does not have access to the Hapi's `request` object.

```javascript
// an imaginary entity-service.js
async function find (entityId) {
  // you can obtain the request id here
  const requestId = rTracer.id()
  // ...
}
```

## Integration with loggers

The main use case for this library is request id generation and logging automation. You can integrate with any logger library in a single place and get request ids in logs across your application.

Without having request id, as a correlation value, in your logs, you will not be able to determine which log entries belong to code that handles the same request. You could generate request ids manually and store them in the Express' `req` object (or Fastify's `request`, or Koa's `ctx`), but then you will have to explicitly pass the object into all other modules on the route. And that's when `cls-rtracer` comes to the rescue!

Here is how you can integrate `cls-rtracer` with [winston](https://github.com/winstonjs/winston), one of most popular logging libraries.

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

Complete samples for Express, Fastify and Koa are available in `/samples/` directory.

## Configuration

These are the available config options for the middleware/plugin functions. All config entries are optional.

```javascript
{
  // Respect request header flag (default: false).
  // If set to true, the middleware/plugin will always use a value from
  // the specified header (if the value is present).
  useHeader: false,
  // Request header name, case insensitive (default: 'X-Request-Id').
  // Used if useHeader is set to true.
  headerName: 'X-Request-Id',
  // Use request id generated by Fastify instead of generating a new id.
  // Only available for the Fastify plugin.
  useFastifyRequestId: false
}
```

## Advanced features

In certain situations you may want to have an id available outside of the request handler scope, say, in a code that acts as a background job. In this case you may use the `runWithId()` function:

```js
const rTracer = require('cls-rtracer')

rTracer.runWithId(() => {
  console.log(rTracer.id()) // id is available here
  setInterval(() => {
    console.log(rTracer.id()) // and here
  }, 1000)
})

// you may override id by providing the 2nd argument
rTracer.runWithId(() => {
  // ...
}, 42) // 42 is the id override here

// async/await syntax is also supported, as `runWithId()`
// returns the result of `fn`
await rTracer.runWithId(myAsyncFn)
```

## Troubleshooting

To avoid weird behavior:

* Make sure you use any third party middleware (or plugin) that does not need access to request ids *before* you use `cls-rtracer`. See [this section](#how-to-use-it---step-2-common-instructions).

Note: there is a small chance that you are using one of rare libraries that do not play nice with Async Hooks API. So, if you face the issue when the context (and thus, the request id) is lost at some point of async calls chain, please submit GitHub issue with a detailed description.

## Performance impact

Note that this library has a certain performance impact on your application due to Async Hooks API usage. So, you need to decide if the benefit of being able to trace requests in logs without any boilerplate is more valuable for you than the disadvantage of performance impact.

The author of this library did some basic performance testing. See [this tweet](https://twitter.com/AndreyPechkurov/status/1234189388436967426) to see the results. The overhead also decreased in `cls-rtracer` v2 due to migration to the core API. See [this tweet](https://twitter.com/AndreyPechkurov/status/1268950294165143553?s=20) to learn more.

## License

Licensed under MIT.
