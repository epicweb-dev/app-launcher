/**
 * Returns a Promise that resolves when the given port has a process
 * running on it. If no process is established on the given port
 * within the timeout window, the returned promise rejects.
 *
 * @example
 * await waitForPort(3000)
 */
export async function waitForPort(
  port: number,
  options?: { timeout?: number },
): Promise<void> {
  throw new Error('Not Implemented')
}
