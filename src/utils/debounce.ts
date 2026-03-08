/**
 * Debounce utility for TRPG Maps
 */

/**
 * Creates a debounced version of a function that delays execution
 * until after the specified wait time has elapsed since the last call.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Creates a debounced async function that returns a promise.
 * Only the last call within the wait period will execute.
 *
 * @param func - The async function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the async function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<Awaited<ReturnType<T>>> | null = null;
  let resolveFunc: ((value: Awaited<ReturnType<T>>) => void) | null = null;
  let rejectFunc: ((reason: unknown) => void) | null = null;

  return function (this: unknown, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        resolveFunc = resolve;
        rejectFunc = reject;
      });
    }

    timeoutId = setTimeout(async () => {
      try {
        const result = await func.apply(this, args);
        resolveFunc?.(result as Awaited<ReturnType<T>>);
      } catch (error) {
        rejectFunc?.(error);
      } finally {
        timeoutId = null;
        pendingPromise = null;
        resolveFunc = null;
        rejectFunc = null;
      }
    }, wait);

    return pendingPromise;
  };
}
