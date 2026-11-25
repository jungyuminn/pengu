import type { OverlayChampion } from "../domain/champion";
import type { OverlayCard, OverlayView, StatsSnapshot } from "../domain/augment";
import type { ChampionAugmentRow } from "../domain/champion-detail";
import { withChampionAugmentGrade } from "../domain/champion-augment-grade";
import { matchAugment } from "../domain/match-name";

export function resolveOverlay(
  snapshot: StatsSnapshot | null,
  champion: OverlayChampion | null,
  titles: string[],
  championAugments: ChampionAugmentRow[] = [],
): OverlayView {
  const matched = titles
    .map((query, index) => toCard(snapshot, query, index, championAugments))
    .filter((card): card is OverlayCard => card !== null);

  const hits = matched.filter((card) => card.augment !== null);
  const cardsVisible = hits.length >= 1;

  return {
    visible: cardsVisible || champion !== null,
    champion,
    source: snapshot?.source ?? null,
    cards: cardsVisible ? hits : [],
    build: [],
  };
}

function toCard(
  snapshot: StatsSnapshot | null,
  query: string,
  index: number,
  championAugments: ChampionAugmentRow[],
): OverlayCard | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const matched = snapshot ? matchAugment(trimmed, snapshot.augments) : null;
  return {
    slot: index,
    query: trimmed,
    augment: matched ? withChampionAugmentGrade(matched, championAugments) : null,
  };
}
