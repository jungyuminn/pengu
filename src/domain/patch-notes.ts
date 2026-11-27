const CLIENT_MAJOR_MIN = 15;
const CLIENT_MAJOR_MAX = 19;

export function patchNotesLabel(patch: string): string {
  const trimmed = patch.trim();
  const match = /^(\d+)(\..*)?$/.exec(trimmed);
  if (!match) return trimmed;
  const major = Number(match[1]);
  if (!Number.isInteger(major) || major < CLIENT_MAJOR_MIN || major > CLIENT_MAJOR_MAX) {
    return trimmed;
  }
  return `${major + 10}${match[2] ?? ""}`;
}
