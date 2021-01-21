/* global describe, test, expect */
'use strict'

const Fastify = require('fastify')
const request = require('supertest')

const rTracer = require('../index')

describe('cls-rtracer for Fastify', () => {
  test('does not return id outside of request', () => {
    const id = rTracer.id()
    expect(id).toBeUndefined()
  })

  test('generates id for request - available in handler', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin)

    let id

    app.get('/test', async (_, reply) => {
      id = rTracer.id()
      reply.send({ id })
    })

    return app.ready().then(() => request(app.server).get('/test'))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(id)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('generates id for request - available in emitters', (done) => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin)

    app.get('/test', async (request, reply) => {
      const id = rTracer.id()
      request.raw.on('close', () => {
        try {
          expect(rTracer.id()).toEqual(id)
          done()
        } catch (error) {
          done(error)
        }
      })
      return 'hello world'
    })

    app.ready().then(() => request(app.server).get('/test')).catch(done)
  })

  test('uses request id factory when provided', () => {
    const app = Fastify()
    const idFactory = () => 'generated-id'

    app.register(rTracer.fastifyPlugin, {
      requestIdFactory: idFactory
    })

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready().then(() => request(app.server).get('/test'))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idFactory())
      })
  })

  test('passes original request to id factory when provided', () => {
    const app = Fastify()
    const idFactory = (req) => {
      return { customHeader: req.headers['x-custom-header'] }
    }

    app.register(rTracer.fastifyPlugin, {
      requestIdFactory: idFactory
    })

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready().then(() => request(app.server)
      .get('/test')
      .set('X-Custom-Header', 'foobarbaz'))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual({
          customHeader: 'foobarbaz'
        })
      })
  })

  test('ignores header by default', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin)

    const idInHead = 'id-from-header'

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready()
      .then(() => request(app.server).get('/test').set('X-Request-Id', idInHead))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id.length).toBeGreaterThan(0)
        expect(res.body.id).not.toEqual(idInHead)
      })
  })

  test('uses default header in case of override', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, { useHeader: true })

    const idInHead = 'id-from-header'

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready()
      .then(() => request(app.server).get('/test').set('X-Request-Id', idInHead))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idInHead)
      })
  })

  test('uses different header in case of override', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, {
      useHeader: true,
      headerName: 'x-another-req-id'
    })

    const idInHead = 'id-from-header'

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready()
      .then(() => request(app.server).get('/test').set('x-another-req-id', idInHead))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idInHead)
      })
  })

  test('ignores header if empty', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, { useHeader: true })

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready()
      .then(() => request(app.server).get('/test').set('X-Request-Id', ''))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('ignores header if disabled', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, { useHeader: false })

    const idInHead = 'id-from-header'

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready()
      .then(() => request(app.server).get('/test').set('X-Request-Id', idInHead))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).not.toEqual(idInHead)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('uses fastify id in case of override', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, { useFastifyRequestId: true })

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready()
      .then(() => request(app.server).get('/test'))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(1)
      })
  })

  test('uses header instead of fastify id in case of override', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, {
      useHeader: true,
      useFastifyRequestId: true
    })

    const idInHead = 'id-from-header'

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready()
      .then(() => request(app.server).get('/test').set('X-Request-Id', idInHead))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idInHead)
      })
  })

  test('generates id for request with callback', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, { useHeader: true })

    let id

    app.get('/test', async (_, reply) => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      id = rTracer.id()
      reply.send({ id })
    })

    return app.ready().then(() => request(app.server).get('/test'))
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(id)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('generates different ids for concurrent requests with callbacks', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, { useHeader: true })

    const ids = {}
    app.get('/test', async (request, reply) => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      const id = rTracer.id()
      ids[request.query.reqName] = id
      reply.send({ id })
    })

    const server = request(app.server)
    return app.ready().then(() => Promise.all([
      server.get('/test')
        .query({ reqName: 'id1' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        }),
      server.get('/test')
        .query({ reqName: 'id2' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        })
    ])).then(([id1, id2]) => {
      expect(id1).toEqual(ids.id1)
      expect(id2).toEqual(ids.id2)
      expect(id1).not.toEqual(id2)
    })
  })

  test('generates different ids for concurrent requests with promises', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, { useHeader: true })

    const ids = {}
    app.get('/test', async (request, reply) => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      const id = rTracer.id()
      ids[request.query.reqName] = id
      reply.send({ id })
    })

    const server = request(app.server)
    return app.ready().then(() => Promise.all([
      server.get('/test')
        .query({ reqName: 'id1' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        }),
      server.get('/test')
        .query({ reqName: 'id2' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        })
    ])).then(([id1, id2]) => {
      expect(id1).toEqual(ids.id1)
      expect(id2).toEqual(ids.id2)
      expect(id1).not.toEqual(id2)
    })
  })

  test('generates different ids for concurrent requests with async/await', () => {
    const app = Fastify()
    app.register(rTracer.fastifyPlugin, { useHeader: true })

    const ids = {}
    app.get('/test', async (request, reply) => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      const id = rTracer.id()
      ids[request.query.reqName] = id
      reply.send({ id })
    })

    const server = request(app.server)
    return app.ready().then(() => Promise.all([
      server.get('/test')
        .query({ reqName: 'id1' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        }),
      server.get('/test')
        .query({ reqName: 'id2' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        })
    ])).then(([id1, id2]) => {
      expect(id1).toEqual(ids.id1)
      expect(id2).toEqual(ids.id2)
      expect(id1).not.toEqual(id2)
    })
  })

  test('does not echo the header when the option is not set', () => {
    const app = Fastify()

    app.register(rTracer.fastifyPlugin)

    app.get('/test', async (_, reply) => {
      const id = rTracer.id()
      reply.send({ id })
    })

    return app.ready().then(() => request(app.server).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-request-id']).toEqual(undefined)
      }))
  })

  test('echoes the header when the option is set and a custom header is not defined', () => {
    const app = Fastify()

    app.register(rTracer.fastifyPlugin, {
      echoHeader: true
    })

    let id

    app.get('/test', async (_, reply) => {
      id = rTracer.id()
      reply.send({ id })
    })

    return app.ready().then(() => request(app.server).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-request-id']).toEqual(id)
      }))
  })

  test('echoes the header when the option is set and a custom header is defined', () => {
    const app = Fastify()

    app.register(rTracer.fastifyPlugin, {
      echoHeader: true,
      headerName: 'x-another-req-id'
    })

    let id

    app.get('/test', async (_, reply) => {
      id = rTracer.id()
      reply.send({ id })
    })

    return app.ready().then(() => request(app.server).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-another-req-id']).toEqual(id)
      }))
  })
})
