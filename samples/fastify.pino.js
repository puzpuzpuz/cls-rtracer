'use strict'

const rTracer = require('../index')

// first - configure pino logger

const logger = require('pino')({
  mixin () {
    return { requestId: rTracer.id() }
  }
})

// next - configure and start Fastify app

const Fastify = require('fastify')
const app = new Fastify()

app.register(rTracer.fastifyPlugin)

app.get('/', async (request, reply) => {
  logger.info('Starting request handling')
  const result = await fakeDbAccess()
  reply.send(result)
})

async function fakeDbAccess () {
  return new Promise((resolve) => {
    setTimeout(() => {
      logger.info('Logs from fakeDbAccess')
      resolve({ message: 'Hello from cls-rtracer Fastify example' })
    }, 0)
  })
}

app.listen(3000, (err) => {
  if (err) {
    logger.error('The app could not start')
  }
  logger.info('The app is listening on 3000')
})
