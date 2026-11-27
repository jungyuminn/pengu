import type { OverlayView } from "./augment";

export type OverlayFitKind = "game" | "notice" | "cards" | "build" | "pick";

export function overlayFitKind(
  view: Pick<OverlayView, "cards" | "build" | "notice" | "armCards"> & {
    champion?: OverlayView["champion"];
  },
): OverlayFitKind {
  if (view.armCards || view.cards.length) return "cards";
  if (view.notice) return "notice";
  if (view.build.length) return "build";
  if (view.champion) return "pick";
  return "game";
}
