'use strict'

const rTracer = require('../index')

// first - configure pino logger

const logger = require('pino')({
  mixin () {
    return { requestId: rTracer.id() }
  }
})

// next - configure and start Express app

const express = require('express')

const app = express()
app.use(rTracer.expressMiddleware())

app.get('/', function (req, res) {
  logger.info('Starting request handling')
  fakeDbAccess()
    .then((result) => res.json(result))
})

async function fakeDbAccess () {
  return new Promise((resolve) => {
    setTimeout(() => {
      logger.info('Logs from fakeDbAccess')
      resolve({ message: 'Hello from cls-rtracer Express example' })
    }, 0)
  })
}

app.listen(3000, (err) => {
  if (err) {
    logger.error('The app could not start')
  }
  logger.info('The app is listening on 3000')
})
