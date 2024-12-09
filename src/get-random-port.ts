import net from 'node:net'
import { DeferredPromise } from '@open-draft/deferred-promise'

/**
 * Returns a random vacant port number.
 * Handy when you want to spawn your application on a random port.
 *
 * @example
 * const port = await getRandomPort()
 */
export async function getRandomPort(): Promise<number> {
  const portPromise = new DeferredPromise<number>()

  const server = net.createServer()
  server.unref()

  server.listen(0, () => {
    const address = server.address()

    if (address == null) {
      portPromise.reject(
        new Error(
          'Failed to get a random port: connection opened without a port',
        ),
      )
      return
    }

    const port =
      typeof address === 'string' ? +new URL(address).port : address?.port

    server.close((error) => {
      if (error) {
        portPromise.reject(error)
        return
      }

      portPromise.resolve(port)
    })
  })

  server.once('error', (error) => {
    console.error(error)
    portPromise.reject(
      new Error(
        'Failed to get a random port. Please see the additional context above.',
      ),
    )
  })

  return await portPromise
}
