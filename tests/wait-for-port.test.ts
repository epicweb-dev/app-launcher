import net from 'node:net'
import { setTimeout } from 'node:timers/promises'
import { waitForPort } from '../src/wait-for-port.js'
import { DeferredPromise } from '@open-draft/deferred-promise'

async function createServer(port: number) {
  const serverPromise = new DeferredPromise<void>()
  const server = net.createServer()
  server.listen(port, () => {
    serverPromise.resolve()
  })
  await serverPromise

  return {
    [Symbol.asyncDispose]() {
      const closePromise = new DeferredPromise<void>()
      server.unref()
      server.close((error) => {
        if (error) {
          closePromise.reject(error)
          return
        }
        closePromise.resolve()
      })
      return closePromise
    },
  }
}

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  vi.restoreAllMocks()
})

test('resolves if the port already has process running on it', async () => {
  await using _ = await createServer(56001)
  await expect(waitForPort(56001)).resolves.toBeUndefined()
})

test('resolves ...', async () => {
  const portPromise = waitForPort(56002)
  await setTimeout(250)
  await using _ = await createServer(56002)

  await expect(portPromise).resolves.toBeUndefined()
})

test('rejects if no process was established on the port within the timeout window', async () => {
  await expect(waitForPort(55555)).rejects.toThrow('Failed to wait for port "55555": retries limit reached')
  expect(console.error).toHaveBeenCalledWith(expect.objectContaining({
    code: 'ECONNREFUSED',
  }))
})

test('supports a custom timeout option', async () => {
  const portPromise = waitForPort(56003, { timeout: 100 }).catch((error) => error)
  await setTimeout(250)
  await using _ = await createServer(56003)

  await expect(portPromise).resolves.toStrictEqual(new Error('Failed to wait for port "56003": timeout'))
})
