export function resolveApiKey(override: string, bundled: string): string {
  return override.trim() || bundled.trim();
}
