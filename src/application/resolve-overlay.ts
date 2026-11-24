import type { OverlayChampion } from "../domain/champion";
import type { OverlayCard, OverlayView, StatsSnapshot } from "../domain/augment";
import { matchAugment } from "../domain/match-name";

export function resolveOverlay(
  snapshot: StatsSnapshot | null,
  champion: OverlayChampion | null,
  titles: string[],
): OverlayView {
  const matched = titles
    .map((query, index) => toCard(snapshot, query, index))
    .filter((card): card is OverlayCard => card !== null);

  const cardsVisible = matched.length >= 2 && matched.some((card) => card.augment !== null);

  return {
    visible: cardsVisible || champion !== null,
    champion,
    source: snapshot?.source ?? null,
    cards: cardsVisible ? matched : [],
  };
}

function toCard(
  snapshot: StatsSnapshot | null,
  query: string,
  index: number,
): OverlayCard | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return {
    slot: index,
    query: trimmed,
    augment: snapshot ? matchAugment(trimmed, snapshot.augments) : null,
  };
}
