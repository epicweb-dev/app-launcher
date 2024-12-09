import { type ChildProcess, spawn } from 'node:child_process'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { invariant } from '@epic-web/invariant'

export interface AppProcessOptions {
  command: string
  env?: Record<string, string>
  cwd?: string
}

export const kUrl = Symbol('kUrl')

export class AppProcess {
  private io?: ChildProcess
  private controller: AbortController
  private [kUrl]?: URL

  constructor(protected readonly options: AppProcessOptions) {
    this.controller = new AbortController()
  }

  get url(): URL {
    const url = this[kUrl]

    invariant(
      url != null,
      'Failed to get a URL of the launched application: application not running. Did you forget to call `await launcher.run()`?',
    )

    return url
  }

  public async launch(): Promise<ChildProcess> {
    const [command, ...args] = this.options.command.split(' ')

    invariant(
      command != null,
      'Failed to launch application: "command" could not be parsed',
    )

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

  public async dispose(): Promise<void> {
    invariant(
      !this.controller.signal.aborted,
      'Failed to dispose of a launched application: already disposed',
    )

    invariant(
      this.io != null,
      'Failed to dispose of a launched application: application is not running. Did you forget to run `await launcher.run()`?',
    )

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
    await this.dispose()
  }
}
