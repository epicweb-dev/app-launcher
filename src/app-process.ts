import { type ChildProcess, spawn } from 'node:child_process'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { invariant } from '@epic-web/invariant'

export interface AppProcessOptions {
  command: string
  env?: Record<string, string>
  cwd?: string
}

export const kUrl = Symbol('kUrl')
export const kLaunch = Symbol('kLaunch')

export class AppProcess {
  private io?: ChildProcess
  private [kUrl]?: URL

  constructor(protected readonly options: AppProcessOptions) {}

  get url(): URL {
    const url = this[kUrl]

    invariant(
      url != null,
      'Failed to get a URL of the launched application: application not running. Did you forget to call `await launcher.run()`?',
    )

    return url
  }

  /**
   * Spawns the child process with the configured application.
   * @note This method must never be used publicly. Use `launcher.run()` instead.
   */
  async [kLaunch](): Promise<ChildProcess> {
    const [command, ...args] = this.options.command.split(' ')

    invariant(
      command != null,
      'Failed to launch application: "command" could not be parsed',
    )

    this.io = spawn(command, args, {
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

  /**
   * Stop the running application.
   */
  public async dispose(): Promise<void> {
    invariant(
      this.io != null,
      'Failed to dispose of a launched application: application is not running. Did you forget to run `await launcher.run()`?',
    )

    // The application has been exited by other means (e.g. unhandled exception).
    if (this.io.exitCode !== null) {
      return
    }

    const exitPromise = new DeferredPromise<void>()

    this.io.once('exit', (exitCode) => {
      if (exitCode === 0) {
        exitPromise.resolve()
        return
      }

      exitPromise.reject(new Error(`Process exited with code ${exitCode}`))
    })

    if (!this.io.kill('SIGTERM')) {
      exitPromise.reject('SIGTERM did not succeed')
    }

    await exitPromise
  }

  async [Symbol.asyncDispose]() {
    await this.dispose()
  }
}
