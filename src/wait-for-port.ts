import net from 'node:net'
import { setTimeout } from 'node:timers/promises'

const DEFAULT_RETRY_INTERVAL = 500
const DEFAULT_TIMEOUT = 10_000
const MAX_RETRIES = 5

/**
 * Returns a Promise that resolves when the given port has a process
 * running on it. If no process is established on the given port
 * within the timeout window, the returned promise rejects.
 *
 * @example
 * await waitForPort(3000)
 */
export async function waitForPort(
  port: number,
  options?: { timeout?: number; retryInterval?: number; maxRetries?: number },
): Promise<void> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT
  const retryInterval = options?.retryInterval ?? DEFAULT_RETRY_INTERVAL
  const maxRetries = options?.maxRetries ?? MAX_RETRIES
  let retry = 0

  const attempt = (lastError?: Error) => {
    return new Promise<void>((resolve, reject) => {
      if (retry === maxRetries) {
        if (lastError) {
          console.error(lastError)
          return reject(
            new Error(
              `Failed to wait for port "${port}": retries limit reached. Please see the additional context above.`,
            ),
          )
        }

        return reject(
          new Error(`Failed to wait for port "${port}": retries limit reached`),
        )
      }

      retry++

      const socket = net
        .connect({ port, timeout: options?.timeout ?? DEFAULT_TIMEOUT }, () => {
          socket.destroy()
          resolve()
        })
        .once('error', (error) => {
          setTimeout(retryInterval).then(() => resolve(attempt(error)))
        })
      socket.unref()
    })
  }

  return Promise.race([
    attempt(),
    new Promise<void>((_, reject) => {
      return setTimeout(timeout).then(() => {
        reject(new Error(`Failed to wait for port "${port}": timeout`))
      })
    }),
  ])
}
