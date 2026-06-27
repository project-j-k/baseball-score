export function buildGameUrl(gameId: string, base: string): string {
  const url = new URL(base);
  url.searchParams.set('g', gameId);
  return url.toString();
}

export function parseGameIdFromUrl(href: string): string | null {
  try {
    const url = new URL(href);
    return url.searchParams.get('g');
  } catch {
    return null;
  }
}

export function getBackendUrl(): string {
  return import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';
}
