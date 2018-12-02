/* global describe, test, expect */
'use strict'

const Koa = require('koa')
const request = require('supertest')

const rTracer = require('../index')

describe('koa-rtracer', () => {
  test('does not return id outside of request', () => {
    const id = rTracer.id()
    expect(id).toBeUndefined()
  })

  test('generates id for request', () => {
    const app = new Koa()
    app.use(rTracer.koaMiddleware())

    let id

    app.get('/test', (req, res) => {
      id = rTracer.id()
      res.json({ id })
    })

    return request(app).get('/test')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toEqual(id)
      })
  })

  test('uses header by default', () => {
    const app = Koa()
    app.use(rTracer.koaMiddleware())

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
    const app = Koa()
    app.use(rTracer.koaMiddleware({ headerName: 'x-another-req-id' }))

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
    const app = Koa()
    app.use(rTracer.koaMiddleware())

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
    const app = Koa()
    app.use(rTracer.koaMiddleware({ useHeader: false }))

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
    const app = Koa()
    app.use(rTracer.koaMiddleware())

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
      })
  })

  test('generates different ids for concurrent requests with callbacks', () => {
    const app = Koa()
    app.use(rTracer.koaMiddleware())

    const ids = {}
    app.get('/test', (req, res) => {
      setTimeout(() => {
        const id = rTracer.id()
        ids[req.query.reqName] = id
        res.json({ id })
      }, 0)
    })

    return Promise.all([
      request(app).get('/test')
        .query({ reqName: 'id1' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        }),
      request(app).get('/test')
        .query({ reqName: 'id2' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        })
    ]).then(([ id1, id2 ]) => {
      expect(id1).toEqual(ids['id1'])
      expect(id2).toEqual(ids['id2'])
      expect(id1).not.toEqual(id2)
    })
  })

  test('generates different ids for concurrent requests with promises', () => {
    const app = Koa()
    app.use(rTracer.koaMiddleware())

    const ids = {}
    app.get('/test', (req, res) => {
      const handle = async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
        const id = rTracer.id()
        ids[req.query.reqName] = id
        res.json({ id })
      }
      handle()
    })

    return Promise.all([
      request(app).get('/test')
        .query({ reqName: 'id1' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        }),
      request(app).get('/test')
        .query({ reqName: 'id2' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        })
    ]).then(([ id1, id2 ]) => {
      expect(id1).toEqual(ids['id1'])
      expect(id2).toEqual(ids['id2'])
      expect(id1).not.toEqual(id2)
    })
  })

  test('generates different ids for concurrent requests with async/await', () => {
    const app = Koa()
    app.use(rTracer.koaMiddleware())

    const ids = {}
    app.get('/test', (req, res) => {
      new Promise((resolve) => setTimeout(resolve, 0))
        .then(() => {
          const id = rTracer.id()
          ids[req.query.reqName] = id
          res.json({ id })
        })
    })

    return Promise.all([
      request(app).get('/test')
        .query({ reqName: 'id1' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        }),
      request(app).get('/test')
        .query({ reqName: 'id2' })
        .then(res => {
          expect(res.statusCode).toBe(200)
          expect(res.body.id.length).toBeGreaterThan(0)
          return res.body.id
        })
    ]).then(([ id1, id2 ]) => {
      expect(id1).toEqual(ids['id1'])
      expect(id2).toEqual(ids['id2'])
      expect(id1).not.toEqual(id2)
    })
  })
})
