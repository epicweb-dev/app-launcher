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
import { defineLauncher } from '@epic-web/app-launcher'
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

> [!NOTE]
> Calling `.run()` on the launcher returns a _diposable_ application object. Use the special `using` keyword to automatically close the application process once the test is done.

### Extend

You can create a launcher by _extending_ an existing launcher. Provide the launcher object you want to extend as the value of the `extends` property when creating a launcher:

```ts
import { remoteUtils } from 'msw/node'
import { launcher } from './remix.launcher.js'

export const launcher = defineLauncher({
  extends: launcher,
  async env() {
    return {
      [remoteUtils.variableName]: remoteUtils.getContextId(),
    }
  },
})
```

Extending an existing launcher will inherit the following of its properties:

- `env`

## API

### `defineLauncher(options)`

- `options` `<Object>`
  - `context` `<Function>` A function that returns the context object. The context object is later shared across the other options.
  - `env` `<Function>` A function that returns an object representing environment variables to add to the spawned application process.
  - `command` `<Function>` A function that returns a string indicating the CLI command to run the application (e.g. `npm start`).
  - `ready` `<Function>` A function that must return a promise that resolves when the application is considered launched (e.g. wait for a process to be established on a certain port).

### `waitForPort(port[, options])`

- `port` `<number>` A port number to await.
- `options` `<Object>`
  - `timeout` `<number>` The timeout duration (in ms). If the port is still vacant after this duration has passed, the promise rejects.
  - `retryInterval` `<number>` The interval (in ms) between individual retries.
  - `maxRetries` `<number>` The total number of retries before rejecting the returned promise.
- Returns: `<Promise>`

Returns a promise that resolves whenever a process starts running at the given port.

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
