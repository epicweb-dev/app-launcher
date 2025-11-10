import { test, expectTypeOf } from 'vitest'
import { defineLauncher, type RunOptions } from '../src/define-launcher.js'
import type { AppProcess } from '../src/app-process.js'

test('returns the launcher instance', async () => {
  const launcher = defineLauncher({} as any)

  expectTypeOf(launcher.run).toEqualTypeOf<
    (options?: RunOptions<unknown>) => Promise<AppProcess>
  >()
})

test('infers the context type', async () => {
  const launcher = defineLauncher({
    context() {
      return { name: 'john' } as const
    },
    env({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ readonly name: 'john' }>()
      return {}
    },
    command({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ readonly name: 'john' }>()
      return ''
    },
    url({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ readonly name: 'john' }>()
      return ''
    },
  })

  launcher.run({
    env({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ readonly name: 'john' }>()
      return {}
    },
  })
})

test('infers the environment variables type', async () => {
  const launcher = defineLauncher({
    env() {
      return { PORT: '3000', PROCESS_ID: '123' }
    },
    command({ env }) {
      expectTypeOf(env).toEqualTypeOf<{ PORT: string; PROCESS_ID: string }>()
      return ''
    },
    url({ env }) {
      expectTypeOf(env).toEqualTypeOf<{ PORT: string; PROCESS_ID: string }>()
      return ''
    },
  })
})
