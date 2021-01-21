/* global describe, test, expect */
'use strict'

const Koa = require('koa')
const request = require('supertest')

const rTracer = require('../index')

describe('cls-rtracer for Koa', () => {
  test('does not return id outside of request', () => {
    const id = rTracer.id()
    expect(id).toBeUndefined()
  })

  test('generates id for request - available in handler', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware())

    let id

    app.use((ctx) => {
      id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(id)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('generates id for request - available in emitters', (done) => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware())

    app.use((ctx) => {
      const id = rTracer.id()
      ctx.req.on('close', () => {
        try {
          expect(rTracer.id()).toEqual(id)
          done()
        } catch (error) {
          done(error)
        }
      })
      ctx.body = 'hello world'
    })

    request(app.callback()).get('/').catch(done)
  })

  test('uses request id factory when provided', () => {
    const app = new Koa()
    const idFactory = () => 'generated-id'

    app.use(rTracer.koaMiddleware({
      requestIdFactory: idFactory
    }))

    app.use((ctx) => {
      const id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idFactory())
      })
  })

  test('passes original request to id factory when provided', () => {
    const app = new Koa()
    const idFactory = (req) => {
      return { client_ip: req.headers.client_ip }
    }

    app.use(rTracer.koaMiddleware({
      requestIdFactory: idFactory
    }))

    app.use((ctx) => {
      const id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback())
      .get('/')
      .set('client_ip', '127.0.0.1')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual({
          client_ip: '127.0.0.1'
        })
      })
  })

  test('ignores header by default', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware())

    const idInHead = 'id-from-header'

    app.use((ctx) => {
      const id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .set('X-Request-Id', idInHead)
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id.length).toBeGreaterThan(0)
        expect(res.body.id).not.toEqual(idInHead)
      })
  })

  test('uses default header in case of override', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware({ useHeader: true }))

    const idInHead = 'id-from-header'

    app.use((ctx) => {
      const id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .set('X-Request-Id', idInHead)
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idInHead)
      })
  })

  test('uses different header in case of override', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware({
      useHeader: true,
      headerName: 'x-another-req-id'
    }))

    const idInHead = 'id-from-header'

    app.use((ctx) => {
      const id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .set('x-another-req-id', idInHead)
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idInHead)
      })
  })

  test('ignores header if empty', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware({ useHeader: true }))

    app.use((ctx) => {
      const id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .set('X-Request-Id', '')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('ignores header if disabled', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware({ useHeader: false }))

    const idInHead = 'id-from-header'

    app.use((ctx) => {
      const id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .set('X-Request-Id', idInHead)
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).not.toEqual(idInHead)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('generates id for request with promise', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware())

    let id

    app.use(async (ctx) => {
      return new Promise((resolve) => setTimeout(resolve, 0))
        .then(() => {
          id = rTracer.id()
          ctx.body = { id }
        })
    })

    return request(app.callback()).get('/')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(id)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('generates different ids for concurrent requests with promises', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware())

    const ids = {}
    app.use(async (ctx) => {
      return new Promise((resolve) => setTimeout(resolve, 0))
        .then(() => {
          const id = rTracer.id()
          ids[ctx.request.query.reqName] = id
          ctx.body = { id }
        })
    })

    const server = request(app.callback())
    return Promise.all([
      server.get('/')
        .query({ reqName: 'id1' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        }),
      server.get('/')
        .query({ reqName: 'id2' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        })
    ]).then(([id1, id2]) => {
      expect(id1).toEqual(ids.id1)
      expect(id2).toEqual(ids.id2)
      expect(id1).not.toEqual(id2)
    })
  })

  test('generates different ids for concurrent requests with async/await', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware())

    const ids = {}
    app.use(async (ctx) => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      const id = rTracer.id()
      ids[ctx.request.query.reqName] = id
      ctx.body = { id }
    })

    const server = request(app.callback())
    return Promise.all([
      server.get('/')
        .query({ reqName: 'id1' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        }),
      server.get('/')
        .query({ reqName: 'id2' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        })
    ]).then(([id1, id2]) => {
      expect(id1).toEqual(ids.id1)
      expect(id2).toEqual(ids.id2)
      expect(id1).not.toEqual(id2)
    })
  })

  test('does not echo the header when the option is not set', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware())

    let id

    app.use((ctx) => {
      id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-request-id']).toEqual(undefined)
      })
  })

  test('echoes the header when the option is set', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware({ echoHeader: true }))

    let id

    app.use((ctx) => {
      id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-request-id']).toEqual(id)
      })
  })

  test('echoes the header when the option is set and a custom header is not defined', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware({
      echoHeader: true
    }))

    let id

    app.use((ctx) => {
      id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-request-id']).toEqual(id)
      })
  })

  test('echoes the header when the option is set and a custom header is defined', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware({
      echoHeader: true,
      headerName: 'x-another-req-id'
    }))

    let id

    app.use((ctx) => {
      id = rTracer.id()
      ctx.body = { id }
    })

    return request(app.callback()).get('/')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-another-req-id']).toEqual(id)
      })
  })
})
