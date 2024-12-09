import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { AppProcess } from './app-process.js'

export interface DefineLauncherOptions<Context> {
  /**
   * Provide a launcher to extend.
   * When extended, the base launcher options, like `env`,
   * will be inherited by the new launcher.
   */
  extends?: Launcher

  /**
   * Define a context object exposed to the other launcher methods.
   *
   * @example
   * defineLauncher({
   *   async context() {
   *     return { port: await getRandomPort() }
   *   }
   * })
   */
  context?: () => Context | Promise<Context>

  /**
   * Define environment variables for this launcher.
   * Environment variables will be forwarded to the run `command`
   * automatically.
   *
   * @example
   * defineLauncher({
   *   env() {
   *     return { FOO: 'bar' }
   *   }
   * })
   */
  env?: (options: {
    context: Context
  }) => Record<string, string> | Promise<Record<string, string>>

  /**
   * Define a command that runs your application.
   *
   * @example
   * defineLauncher({
   *   command() {
   *     return `npm start`
   *   }
   * })
   */
  command: (options: {
    context: Context
    env: Record<string, string>
  }) => string | Promise<string>

  /**
   * Return a promise that resolves when your application is ready.
   *
   * @example
   * defineLauncher({
   *   async ready({ context }) {
   *     await waitForPort(context.port)
   *   }
   * })
   */
  ready: (options: {
    context: Context
    env: Record<string, string>
    appProcess: ChildProcessWithoutNullStreams
  }) => Promise<void>
}

export interface Launcher {
  [kLauncherOptions]: DefineLauncherOptions<any>

  run(runOptions: RunOptions): Promise<AppProcess>
}

export interface RunOptions {
  cwd?: string
}

export const kLauncherOptions = Symbol('kLauncherOptions')

export function defineLauncher<Context>(
  options: DefineLauncherOptions<Context>,
): Launcher {
  return {
    [kLauncherOptions]: options,

    async run(runOptions) {
      const context = (await options.context?.()) ?? ({} as Context)
      const baseEnv = await options.extends?.[kLauncherOptions].env?.({
        context,
      })
      const customEnv = await options.env?.({ context })
      const env = {
        ...(baseEnv || {}),
        ...(customEnv || {}),
      }

      const command = await options.command({ context, env })

      const app = new AppProcess({
        command,
        env,
        cwd: runOptions?.cwd,
      })
      const childProcess = await app.launch()

      await options.ready({
        context,
        env,
        appProcess: childProcess,
      })

      return app
    },
  }
}
