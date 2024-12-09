import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { AppProcess, kUrl } from './app-process.js'
import { waitForPort } from './wait-for-port.js'

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
   * Return the resolved application URL.
   *
   * @example
   * defineLauncher({
   *   url({ context }) {
   *     return `http://localhost:${context.port}`
   *   }
   * })
   */
  url: (options: {
    context: Context
    env: Record<string, string>
    appProcess: ChildProcessWithoutNullStreams
  }) => Promise<string | URL>
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

      // Spawn the application.
      const app = new AppProcess({
        command,
        env,
        cwd: runOptions?.cwd,
      })
      const childProcess = await app.launch()

      // Wait for the provided application URL to be up.
      const url = await options.url({
        context,
        env,
        appProcess: childProcess,
      })
      const resolvedUrl = url instanceof URL ? url : new URL(url)
      app[kUrl] = resolvedUrl

      await waitForPort(+resolvedUrl.port)

      return app
    },
  }
}
