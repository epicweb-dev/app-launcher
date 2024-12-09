import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { DeferredPromise } from '@open-draft/deferred-promise'

export interface ProcessWrapOptions {
  command: string
  env?: Record<string, string>
  cwd?: string
}

export class AppProcess {
  private io: ChildProcessWithoutNullStreams
  private controller: AbortController

  constructor(protected readonly options: ProcessWrapOptions) {
    this.controller = new AbortController()
  }

  get url(): URL {
    return new URL('')
  }

  public async launch(): Promise<ChildProcessWithoutNullStreams> {
    const [command, ...args] = this.options.command.split(' ')

    this.io = spawn(command, args, {
      signal: this.controller.signal,
      cwd: this.options.cwd,
      env: {
        ...process.env,
        ...(this.options.env || {}),
      },
    })

    const spawnPromise = new DeferredPromise<void>()
    this.io.once('spawn', () => spawnPromise.resolve())
    this.io.once('error', (error) => spawnPromise.reject(error))

    await spawnPromise

    return this.io
  }

  public async kill(): Promise<void> {
    if (this.io.exitCode !== null) {
      return Promise.resolve()
    }

    const exitPromise = new DeferredPromise<void>()

    this.io.once('exit', (exitCode) => {
      if (exitCode === 0) {
        exitPromise.resolve()
        return
      }

      exitPromise.reject(new Error(`Process exited with code ${exitCode}`))
    })

    this.controller.abort()
    await exitPromise
  }

  async [Symbol.asyncDispose]() {
    await this.kill()
  }
}
