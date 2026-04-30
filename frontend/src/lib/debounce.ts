


export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): T {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delayMs);
  }) as T;
}
