/* global describe, test, expect */
'use strict'

const { runWithId, id } = require('../src/middleware')

describe('runWithId', () => {
  test('runs function in scope of generated id', (done) => {
    expect(id()).toBeUndefined()

    runWithId(() => {
      const availableId = id()
      expect(availableId.length).toBeGreaterThan(0)

      setTimeout(() => {
        expect(id()).toEqual(availableId)
        done()
      }, 0)
    })
  })

  test('runs function in scope of overriden id', () => {
    runWithId(() => {
      expect(id()).toEqual(42)
    }, 42)
  })

  test('supports awaiting the function', (done) => {
    async function asyncFn () {
      await runWithId(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(id()).toEqual(42)
      }, 42)
    }

    asyncFn().then(done).catch(done)
  })
})
