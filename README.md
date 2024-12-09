# App Launcher

Utility for launching your applications on a per-test basis.

## Usage

### Install

```sh
npm install @epic-web/app-launcher
```

### Define launcher

```ts
// remix.launcher.ts
import { defineLauncher, getRandomPort } from '@epic-web/app-launcher'

export const launcher = defineLauncher({
  async context() {
    return {
      port: await getRandomPort(),
    }
  },
  env({ context }) {
    return {
      PORT: context.port.toString(),
    }
  },
  command() {
    return `npm start`
  },
  async ready({ context }) {
    await waitForPort(context.port)
  },
})
```

### Use

```ts
import { launcher } from './remix.launcher.js'

test('renders the homepage', async ({ page }) => {
  await using app = await launcher.run()

  await page.goto(app.url.href)
  await expect(page.getByText("Welcome!")).toBeVisible()
})
```

### Extend

```ts
import { launchers } from '@epic-web/app-launcher'
import { remoteUtils } from 'msw/node'

export const launcher = defineLauncher({
  extends: launchers.remix,
  async env() {
    return {
      [remoteUtils.variableName]: remoteUtils.getContextId(),
    }
  },
})
```

## API

### `defineLauncher()`

### `getRandomPort()`

### `waitForPort(port: number)`

- Returns `Promise<void>` that resolves when the given port ...
