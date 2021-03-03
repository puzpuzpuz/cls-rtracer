'use strict'

const rTracer = require('../index')

// first - configure pino logger

const logger = require('pino')({
  mixin () {
    return { request_id: rTracer.id() }
  }
})

// next - configure and start Koa app

const Koa = require('koa')
const app = new Koa()

app.use(rTracer.koaMiddleware())

app.use(async (ctx) => {
  logger.info('Starting request handling')
  const result = await fakeDbAccess()
  ctx.body = result
})

async function fakeDbAccess () {
  return new Promise((resolve) => {
    setTimeout(() => {
      logger.info('Logs from fakeDbAccess')
      resolve({ message: 'Hello from cls-rtracer Koa example' })
    }, 0)
  })
}

app.listen(3000, (err) => {
  if (err) {
    logger.error('The app could not start')
  }
  logger.info('The app is listening on 3000')
})
