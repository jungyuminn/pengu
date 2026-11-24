export function dataRefreshLabel(syncedAt: string, patch = ""): string {
  const at = new Date(syncedAt);
  const time = Number.isNaN(at.getTime())
    ? "데이터 갱신: -"
    : `데이터 갱신: ${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const ver = patch.trim();
  return ver ? `${time} (${ver})` : time;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
