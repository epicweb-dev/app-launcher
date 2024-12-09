import net from 'node:net'
import { getRandomPort } from '../src/get-random-port.js'

async function isPortVacant(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server
      .unref()
      .once('error', (error: NodeJS.ErrnoException) => {
        server.close()
        if (error.code == 'EADDRINUSE' || error.code === 'EADDRNOTAVAIL') {
          return resolve(false)
        }
        reject(error)
      })
      .once('listening', () => {
        resolve(
          new Promise((resolve, reject) => {
            server.close((error) => {
              if (error) {
                return reject(error)
              }
              resolve(true)
            })
          }),
        )
      })
      .listen(port)
  })
}

test('returns a random vacant port', async () => {
  const port = await getRandomPort()

  expect(port).toBeTypeOf('number')
  expect(port.toString()).toMatch(/^[0-9]+$/)
  await expect(isPortVacant(port)).resolves.toBe(true)
})
