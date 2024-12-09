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
import { getPort } from 'get-port'

export const launcher = defineLauncher({
  async context() {
    return {
      port: await getPort(),
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

### `waitForPort(port: number[, options])`

- `port` `<number>` A port number to await.
- `options` `<Object>`
  - `timeout` `<number>`
  - `retryInterval` `<number>`
  - `maxRetries` `<number>`
- Returns: `<Promise>`

Returns a Promise that resolves whenever a process starts running at the given port.

```ts
import { defineLauncher, waitForPort } from '@epic-web/app-launcher'
import { getPort } from 'get-port'

const laundher = defineLauncher({
  async context() {
    return {
      port: await getPort(),
    }
  },
  async ready({ context }) {
    await waitForPort(context.port)
  },
})
```
