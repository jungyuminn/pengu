export interface ItemTextSource {
  description?: string;
  plaintext?: string;
  stats?: Record<string, number>;
}

const STAT_LABELS: Array<[string, string, "flat" | "percent"]> = [
  ["FlatPhysicalDamageMod", "공격력", "flat"],
  ["FlatMagicDamageMod", "주문력", "flat"],
  ["FlatHPPoolMod", "체력", "flat"],
  ["FlatMPPoolMod", "마나", "flat"],
  ["FlatArmorMod", "방어력", "flat"],
  ["FlatSpellBlockMod", "마법 저항력", "flat"],
  ["FlatMovementSpeedMod", "이동 속도", "flat"],
  ["PercentMovementSpeedMod", "이동 속도", "percent"],
  ["PercentAttackSpeedMod", "공격 속도", "percent"],
  ["FlatCritChanceMod", "치명타 확률", "percent"],
  ["PercentLifeStealMod", "생명력 흡수", "percent"],
  ["FlatHPRegenMod", "체력 재생", "flat"],
];

export function formatItemText(row: ItemTextSource): string {
  const html = row.description ?? "";
  const body = stripItemHtml(html);
  const stats = hasStatsBlock(html) ? "" : formatStatLines(row.stats);
  const effect = body || (row.plaintext ?? "").trim();
  return [stats, effect].filter(Boolean).join("\n\n");
}

export function stripItemHtml(value: string): string {
  return decodeEntities(
    value
      .replace(/<\/stats>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n"),
  ).trim();
}

function hasStatsBlock(html: string): boolean {
  const inner = html.match(/<stats\b[^>]*>([\s\S]*?)<\/stats>/i)?.[1] ?? "";
  return stripItemHtml(inner).length > 0;
}

function formatStatLines(stats: Record<string, number> | undefined): string {
  if (!stats) return "";
  return STAT_LABELS.flatMap(([key, label, kind]) => {
    const value = stats[key];
    if (!Number.isFinite(value) || value === 0) return [];
    return [`${label} ${kind === "percent" ? percent(value) : String(value)}`];
  }).join("\n");
}

function percent(value: number): string {
  const amount = Math.abs(value) <= 1 ? value * 100 : value;
  const shown = Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace(/\.0$/, "");
  return `${shown}%`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
