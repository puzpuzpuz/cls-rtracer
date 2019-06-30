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

  test('generates id for request', () => {
    const app = Fastify()
    app.use(rTracer.fastifyMiddleware())

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

  test('ignores header by default', () => {
    const app = Fastify()
    app.use(rTracer.fastifyMiddleware())

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
    app.use(rTracer.fastifyMiddleware({ useHeader: true }))

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
    app.use(rTracer.fastifyMiddleware({
      useHeader: true,
      headerName: 'x-another-req-id'
    }))

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
    app.use(rTracer.fastifyMiddleware({ useHeader: true }))

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
    app.use(rTracer.fastifyMiddleware({ useHeader: false }))

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

  test('generates id for request with callback', () => {
    const app = Fastify()
    app.use(rTracer.fastifyMiddleware())

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
    app.use(rTracer.fastifyMiddleware())

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
    ])).then(([ id1, id2 ]) => {
      expect(id1).toEqual(ids['id1'])
      expect(id2).toEqual(ids['id2'])
      expect(id1).not.toEqual(id2)
    })
  })

  test('generates different ids for concurrent requests with promises', () => {
    const app = Fastify()
    app.use(rTracer.fastifyMiddleware())

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
    ])).then(([ id1, id2 ]) => {
      expect(id1).toEqual(ids['id1'])
      expect(id2).toEqual(ids['id2'])
      expect(id1).not.toEqual(id2)
    })
  })

  test('generates different ids for concurrent requests with async/await', () => {
    const app = Fastify()
    app.use(rTracer.fastifyMiddleware())

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
    ])).then(([ id1, id2 ]) => {
      expect(id1).toEqual(ids['id1'])
      expect(id2).toEqual(ids['id2'])
      expect(id1).not.toEqual(id2)
    })
  })
})
