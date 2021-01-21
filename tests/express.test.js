/* global describe, test, expect */
'use strict'

const express = require('express')
const request = require('supertest')

const rTracer = require('../index')

describe('cls-rtracer for Express', () => {
  test('does not return id outside of request', () => {
    const id = rTracer.id()
    expect(id).toBeUndefined()
  })

  test('generates id for request - available in handler', () => {
    const app = express()
    app.use(rTracer.expressMiddleware())

    let id

    app.get('/test', (req, res) => {
      id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(id)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('generates id for request - available in emitters', (done) => {
    const app = express()
    app.use(rTracer.expressMiddleware())

    app.get('/test', (req, res) => {
      const id = rTracer.id()
      req.on('end', () => {
        try {
          expect(rTracer.id()).toEqual(id)
          done()
        } catch (error) {
          done(error)
        }
      })
      res.end()
    })

    request(app).get('/test').catch(done)
  })

  test('uses request id factory when provided', () => {
    const app = express()
    const idFactory = () => 'generated-id'

    app.use(rTracer.expressMiddleware({
      requestIdFactory: idFactory
    }))

    app.get('/test', (req, res) => {
      const id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idFactory())
      })
  })

  test('passes original request to id factory when provided', () => {
    const app = express()
    const idFactory = (req) => {
      return { customHeader: req.headers['x-custom-header'] }
    }

    app.use(rTracer.expressMiddleware({
      requestIdFactory: idFactory
    }))

    app.get('/test', (req, res) => {
      const id = rTracer.id()
      res.json({ id })
    })

    return request(app)
      .get('/test')
      .set('X-Custom-Header', 'foobarbaz')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual({
          customHeader: 'foobarbaz'
        })
      })
  })

  test('ignores header by default', () => {
    const app = express()
    app.use(rTracer.expressMiddleware())

    const idInHead = 'id-from-header'

    app.get('/test', (req, res) => {
      const id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .set('X-Request-Id', idInHead)
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id.length).toBeGreaterThan(0)
        expect(res.body.id).not.toEqual(idInHead)
      })
  })

  test('uses default header in case of override', () => {
    const app = express()
    app.use(rTracer.expressMiddleware({ useHeader: true }))

    const idInHead = 'id-from-header'

    app.get('/test', (req, res) => {
      const id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .set('X-Request-Id', idInHead)
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idInHead)
      })
  })

  test('uses different header in case of override', () => {
    const app = express()
    app.use(rTracer.expressMiddleware({
      useHeader: true,
      headerName: 'x-another-req-id'
    }))

    const idInHead = 'id-from-header'

    app.get('/test', (req, res) => {
      const id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .set('x-another-req-id', idInHead)
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(idInHead)
      })
  })

  test('ignores header if empty', () => {
    const app = express()
    app.use(rTracer.expressMiddleware({ useHeader: true }))

    app.get('/test', (req, res) => {
      const id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .set('X-Request-Id', '')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('ignores header if disabled', () => {
    const app = express()
    app.use(rTracer.expressMiddleware({ useHeader: false }))

    const idInHead = 'id-from-header'

    app.get('/test', (req, res) => {
      const id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .set('X-Request-Id', idInHead)
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).not.toEqual(idInHead)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('generates id for request with callback', () => {
    const app = express()
    app.use(rTracer.expressMiddleware())

    let id

    app.get('/test', (req, res) => {
      setTimeout(() => {
        id = rTracer.id()
        res.json({ id })
      }, 0)
    })

    return request(app).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(id)
        expect(res.body.id.length).toBeGreaterThan(0)
      })
  })

  test('generates different ids for concurrent requests with callbacks', () => {
    const app = express()
    app.use(rTracer.expressMiddleware())

    const ids = {}
    app.get('/test', (req, res) => {
      setTimeout(() => {
        const id = rTracer.id()
        ids[req.query.reqName] = id
        res.json({ id })
      }, 0)
    })

    const server = request(app)
    return Promise.all([
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
    ]).then(([id1, id2]) => {
      expect(id1).toEqual(ids.id1)
      expect(id2).toEqual(ids.id2)
      expect(id1).not.toEqual(id2)
    })
  })

  test('generates different ids for concurrent requests with promises', () => {
    const app = express()
    app.use(rTracer.expressMiddleware())

    const ids = {}
    app.get('/test', (req, res) => {
      new Promise((resolve) => setTimeout(resolve, 0))
        .then(() => {
          const id = rTracer.id()
          ids[req.query.reqName] = id
          res.json({ id })
        })
    })

    const server = request(app)
    return Promise.all([
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
    ]).then(([id1, id2]) => {
      expect(id1).toEqual(ids.id1)
      expect(id2).toEqual(ids.id2)
      expect(id1).not.toEqual(id2)
    })
  })

  test('generates different ids for concurrent requests with async/await', () => {
    const app = express()
    app.use(rTracer.expressMiddleware())

    const ids = {}
    app.get('/test', async (req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      const id = rTracer.id()
      ids[req.query.reqName] = id
      res.json({ id })
    })

    const server = request(app)
    return Promise.all([
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
    ]).then(([id1, id2]) => {
      expect(id1).toEqual(ids.id1)
      expect(id2).toEqual(ids.id2)
      expect(id1).not.toEqual(id2)
    })
  })

  test('does not echo the header when the option is not set', () => {
    const app = express()
    app.use(rTracer.expressMiddleware())

    app.get('/test', (req, res) => {
      const id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-request-id']).toEqual(undefined)
      })
  })

  test('echoes the header when the option is set and a custom header is not defined', () => {
    const app = express()
    app.use(rTracer.expressMiddleware({
      echoHeader: true
    }))

    let id

    app.get('/test', (req, res) => {
      id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-request-id']).toEqual(id)
      })
  })

  test('echoes the header when the option is set and a custom header is defined', () => {
    const app = express()
    app.use(rTracer.expressMiddleware({
      echoHeader: true,
      headerName: 'x-another-req-id'
    }))

    let id

    app.get('/test', (req, res) => {
      id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['x-another-req-id']).toEqual(id)
      })
  })
})
