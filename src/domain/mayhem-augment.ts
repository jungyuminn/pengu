export const MAYHEM_AUGMENT_LEVELS = [3, 7, 11, 15] as const;
export const MAX_OFFER_CARDS = 6;
export const START_PICK_UNTIL = 95;
export const LATER_PICK_HUNT_S = 80;

export interface AugmentOfferState {
  gameTime: number;
  level: number;
  isDead: boolean;
  completed: number;
  watching?: boolean;
  secondsAtLevel?: number | null;
}

export function shouldReadAugmentScreen(state: AugmentOfferState): boolean {
  if (state.watching) return true;
  if (state.completed <= 0 && state.gameTime < START_PICK_UNTIL) return true;
  const next = MAYHEM_AUGMENT_LEVELS[state.completed];
  if (next == null) return false;
  if (state.isDead && state.level >= next - 1) return true;
  if (state.level !== next) return false;
  if (state.secondsAtLevel != null && state.secondsAtLevel > LATER_PICK_HUNT_S) return false;
  return true;
}

export function skipMissedStartPick(state: AugmentOfferState): number {
  if (state.watching) return state.completed;
  if (state.completed === 0 && state.gameTime >= START_PICK_UNTIL) return 1;
  return state.completed;
}
