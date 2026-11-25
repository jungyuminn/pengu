import { MAX_OFFER_CARDS } from "./mayhem-augment";

export interface OcrLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const TITLE_NOISE = /^(피해량|저항|치유|회복|보조|골드|이동속도|보조피해량|주력피해량)$/;

export function titleLinesFromOcr(lines: OcrLine[], imageWidth: number, imageHeight: number): string[] {
  const usable = lines.filter((line) => line.text.trim().replace(/\s+/g, "").length >= 2);
  if (!usable.length || imageWidth < 8 || imageHeight < 8) return [];

  const sorted = [...usable].sort((left, right) => left.y - right.y || left.x - right.x);
  const clusters: OcrLine[][] = [];
  const yGap = Math.max(16, imageHeight * 0.08);
  for (const line of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(line.y - averageY(last)) <= yGap) last.push(line);
    else clusters.push([line]);
  }

  const ranked = clusters
    .map((cluster) => ({ cluster, score: clusterScore(cluster, imageWidth, imageHeight) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0]?.cluster ?? [];
  return columnGroups(best, imageWidth)
    .map(pickTitle)
    .filter((text): text is string => Boolean(text))
    .slice(0, MAX_OFFER_CARDS);
}

function columnGroups(lines: OcrLine[], imageWidth: number): OcrLine[][] {
  const sorted = [...lines].sort((left, right) => left.x - right.x);
  const gap = Math.max(24, imageWidth * 0.1);
  const cols: OcrLine[][] = [];
  for (const line of sorted) {
    const last = cols[cols.length - 1];
    const at = line.x + line.width / 2;
    if (last && Math.abs(at - averageX(last)) <= gap) last.push(line);
    else cols.push([line]);
  }
  return cols;
}

function pickTitle(column: OcrLine[]): string | null {
  const usable = column.filter((line) => !isTitleNoise(line.text));
  if (!usable.length) return null;
  const best = [...usable].sort((left, right) => right.height - left.height || left.y - right.y)[0];
  return best?.text.trim() || null;
}

function isTitleNoise(text: string): boolean {
  return TITLE_NOISE.test(text.trim().replace(/\s+/g, ""));
}

function clusterScore(cluster: OcrLine[], imageWidth: number, imageHeight: number): number {
  const centers = cluster.map((line) => line.x + line.width / 2).sort((left, right) => left - right);
  const spread = centers.length >= 2 ? (centers[centers.length - 1]! - centers[0]!) / imageWidth : 0;
  const slots = Math.min(MAX_OFFER_CARDS, Math.max(3, cluster.length));
  const filled = Array.from({ length: slots }, (_, slot) => slot).filter((slot) =>
    cluster.some((line) => {
      const at = (line.x + line.width / 2) / imageWidth;
      return at >= slot / slots && at < (slot + 1) / slots;
    }),
  ).length;
  const y = averageY(cluster) / imageHeight;
  const yScore = y > 0.1 && y < 0.9 ? 3 : 0;
  const size = cluster.reduce((sum, line) => sum + line.height, 0) / cluster.length;
  return filled * 12 + Math.min(cluster.length, MAX_OFFER_CARDS) * 4 + spread * 8 + yScore + size;
}

function averageY(lines: OcrLine[]): number {
  return lines.reduce((sum, line) => sum + line.y, 0) / lines.length;
}

function averageX(lines: OcrLine[]): number {
  return lines.reduce((sum, line) => sum + line.x + line.width / 2, 0) / lines.length;
}
