/**
 * Throttle function that limits how often a function can be called
 * @param func - The function to throttle
 * @param delay - The delay in milliseconds between allowed calls
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): T {
  let lastCall = 0;
  let timeoutId: number | null = null;
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - timeSinceLastCall);
    }
  }) as T;
}

