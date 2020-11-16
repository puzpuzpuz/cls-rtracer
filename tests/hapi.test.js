/* global describe, test, expect, afterEach */
'use strict'

const Hapi = require('@hapi/hapi')
const request = require('supertest')

const rTracer = require('../index')

const setupServer = async ({
  options = {},
  handler = () => 'Response'
}) => {
  const server = Hapi.server()

  server.route({
    method: 'GET',
    path: '/',
    handler
  })

  await server.register({
    plugin: rTracer.hapiPlugin,
    options
  })
  await server.initialize()

  return server
}

describe('cls-rtracer for Hapi', () => {
  let server

  afterEach(async () => {
    if (server) {
      await server.stop()
      server = null
    }
  })

  test('does not return id outside of request', () => {
    const id = rTracer.id()
    expect(id).toBeUndefined()
  })

  test('generates id for request - available in handler', async () => {
    let id
    server = await setupServer({
      handler: () => {
        id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result.id).toEqual(id)
    expect(res.result.id.length).toBeGreaterThan(0)
  })

  test('generates id for request - available in emitters', (done) => {
    let id
    setupServer({
      handler: (request) => {
        id = rTracer.id()
        request.raw.req.on('close', () => {
          try {
            expect(rTracer.id()).toEqual(id)
            done()
          } catch (error) {
            done(error)
          }
        })
        return 'hello world'
      }
    }).then((server) => {
      // have to use supertest here to get events emitted
      return request(server.listener).get('/')
    }).catch(done)
  })

  test('uses request id factory when provided', async () => {
    const idFactory = () => 'generated-id'

    server = await setupServer({
      options: {
        requestIdFactory: idFactory
      },
      handler: () => {
        const id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result.id).toEqual(idFactory())
  })

  test('ignores header by default', async () => {
    const idInHead = 'id-from-header'
    let id

    server = await setupServer({
      handler: () => {
        id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/',
      headers: {
        'X-Request-Id': idInHead
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result.id.length).toBeGreaterThan(0)
    expect(res.result.id).not.toEqual(idInHead)
  })

  test('uses default header in case of override', async () => {
    const idInHead = 'id-from-header'
    let id

    server = await setupServer({
      options: {
        useHeader: true
      },
      handler: () => {
        id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/',
      headers: {
        'X-Request-Id': idInHead
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result.id).toEqual(idInHead)
  })

  test('uses different header in case of override', async () => {
    const idInHead = 'id-from-header'
    let id

    server = await setupServer({
      options: {
        useHeader: true,
        headerName: 'x-another-req-id'
      },
      handler: () => {
        id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/',
      headers: {
        'x-another-req-id': idInHead
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result.id).toEqual(idInHead)
  })

  test('ignores header if empty', async () => {
    let id

    server = await setupServer({
      options: {
        useHeader: true
      },
      handler: () => {
        id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/',
      headers: {
        'X-Request-Id': ''
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result.id).toEqual(id)
    expect(res.result.id.length).toBeGreaterThan(0)
  })

  test('ignores header if disabled', async () => {
    const idInHead = 'id-from-header'
    let id

    server = await setupServer({
      options: {
        useHeader: false
      },
      handler: () => {
        id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/',
      headers: {
        'X-Request-Id': idInHead
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result.id).not.toEqual(idInHead)
    expect(res.result.id.length).toBeGreaterThan(0)
  })

  test('generates id for request with promise', async () => {
    let id

    server = await setupServer({
      handler: async () => {
        await new Promise(resolve => setImmediate(resolve))
        id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result.id).toEqual(id)
    expect(res.result.id.length).toBeGreaterThan(0)
  })

  test('generates different ids for concurrent requests with promises', async () => {
    const ids = {}

    server = await setupServer({
      handler: async (request) => {
        await new Promise(resolve => setImmediate(resolve))

        const id = rTracer.id()
        ids[request.query.reqName] = id
        return { id }
      }
    })

    const [res1, res2] = await Promise.all([
      server.inject({
        method: 'get',
        url: '/?reqName=id1'
      }),
      server.inject({
        method: 'get',
        url: '/?reqName=id2'
      })
    ])

    expect(res1.statusCode).toBe(200)
    expect(res1.result.id.length).toBeGreaterThan(0)
    expect(res2.statusCode).toBe(200)
    expect(res2.result.id.length).toBeGreaterThan(0)
    expect(res1.result.id).toEqual(ids.id1)
    expect(res2.result.id).toEqual(ids.id2)
    expect(res1.result.id).not.toEqual(res2.result.id)
  })

  test('does not echo the header when the option is not set', async () => {
    server = await setupServer({
      handler: () => {
        const id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['x-request-id']).toEqual(undefined)
  })

  test('echoes the header when the option is set and a custom header is not defined', async () => {
    let id

    server = await setupServer({
      options: {
        echoHeader: true
      },
      handler: () => {
        id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['x-request-id']).toEqual(id)
  })

  test('echoes the header when the option is set and a custom header is defined', async () => {
    let id

    server = await setupServer({
      options: {
        echoHeader: true,
        headerName: 'x-another-req-id'
      },
      handler: () => {
        id = rTracer.id()
        return { id }
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/'
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['x-another-req-id']).toEqual(id)
  })

  test('echoes the header when the option is set and an error is thrown', async () => {
    let id

    server = await setupServer({
      options: {
        echoHeader: true
      },
      handler: () => {
        id = rTracer.id()
        throw new Error(id)
      }
    })

    const res = await server.inject({
      method: 'get',
      url: '/'
    })

    expect(res.statusCode).toBe(500)
    expect(res.headers['x-request-id']).toEqual(id)
  })
})
