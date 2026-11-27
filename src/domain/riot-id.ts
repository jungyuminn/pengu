export interface RiotId {
  gameName: string;
  tagLine: string;
}

export function parseRiotId(raw: string): RiotId {
  const value = raw.trim();
  const at = value.lastIndexOf("#");
  if (at <= 0 || at === value.length - 1) {
    throw new Error("닉네임#태그 형식이 필요합니다.");
  }
  const gameName = value.slice(0, at).trim();
  const tagLine = value.slice(at + 1).trim();
  if (!gameName || !tagLine) throw new Error("닉네임#태그 형식이 필요합니다.");
  return { gameName, tagLine };
}

export function riotIdLabel(id: RiotId): string {
  return `${id.gameName}#${id.tagLine}`;
}

export function riotIdKey(id: RiotId): string {
  return riotIdLabel(id).toLowerCase();
}
