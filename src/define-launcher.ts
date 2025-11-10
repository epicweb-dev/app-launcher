import type { ChildProcess } from 'node:child_process'
import { AppProcess, kUrl } from './app-process.js'
import { waitForPort } from './wait-for-port.js'

export interface LauncherInit<Context, Env extends Record<string, string>> {
  /**
   * Provide a launcher to extend.
   * When extended, the base launcher options, like `env`,
   * will be inherited by the new launcher.
   */
  extends?: Launcher

  /**
   * Run the launcher in debug mode.
   */
  debug?: boolean

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
  env?: (options: { context: Context }) => Env | Promise<Env>

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
  command: (options: { context: Context; env: Env }) => string | Promise<string>

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
    env: Env
    appProcess: ChildProcess
  }) => string | URL | Promise<string | URL>
}

export interface Launcher<Context = any> {
  [kLauncherOptions]: LauncherInit<Context, any>

  run: (runOptions?: RunOptions<Context>) => Promise<AppProcess>
}

export interface RunOptions<Context = any> {
  cwd?: string
  env?: (options: {
    context: Context
  }) => Record<string, string> | Promise<Record<string, string>>
}

export const kLauncherOptions = Symbol('kLauncherOptions')

export function defineLauncher<
  Context,
  Env extends Record<string, string> = {},
>(options: LauncherInit<Context, Env>): Launcher<Context> {
  return {
    [kLauncherOptions]: options,

    async run(runOptions) {
      const context = (await options.context?.()) ?? ({} as Context)
      const baseEnv = await options.extends?.[kLauncherOptions].env?.({
        context,
      })
      const launcherEnv = await options.env?.({ context })
      const runEnv = await runOptions?.env?.({ context })

      const env = {
        ...(baseEnv || {}),
        ...(launcherEnv || {}),
        ...(runEnv || {}),
      }
      const command = await options.command({ context, env })

      // Spawn the application.
      const app = new AppProcess({
        command,
        env,
        cwd: runOptions?.cwd,
      })
      const childProcess = await app.launch()

      if (options?.debug) {
        childProcess.stdout?.pipe(process.stdout)
        childProcess.stderr?.pipe(process.stderr)
      }

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
