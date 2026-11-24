export function isSyncedToday(syncedAt: string, now = new Date()): boolean {
  const then = new Date(syncedAt);
  if (Number.isNaN(then.getTime())) return false;
  return then.toDateString() === now.toDateString();
}
