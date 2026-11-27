import { createHash } from "crypto";
import { InvalidSample, type MatchSample } from "../../domain/collection-match";
import { augmentSlotsOf, type LcuGame } from "../lcu/match-mapper";

export function accountRef(puuid: string): string {
  return createHash("sha256").update(puuid).digest("hex");
}

export function lcuSample(raw: unknown, owner?: string) {
  if (!raw || typeof raw !== "object") throw new InvalidSample("game-shape");
  const game = raw as LcuGame;
  if (!Array.isArray(game.participants)) throw new InvalidSample("participants");
  const ids = new Set(game.participants.map(row => row?.participantId));
  if (game.participantIdentities != null && !Array.isArray(game.participantIdentities)) {
    throw new InvalidSample("identities");
  }
  const accounts = new Set<string>();
  for (const identity of game.participantIdentities ?? []) {
    const puuid = identity?.player?.puuid;
    if (typeof puuid === "string" && puuid.trim() && ids.has(identity.participantId)) {
      accounts.add(accountRef(puuid.trim()));
    }
  }
  if (owner && !accounts.has(owner)) throw new InvalidSample("owner-unverified");
  const sample: MatchSample = {
    platform: game.platformId ?? "",
    gameId: game.gameId ?? 0,
    version: game.gameVersion ?? "",
    queueId: game.queueId ?? 0,
    mode: game.gameMode ?? "",
    players: game.participants.map(row => {
      if (!row || typeof row !== "object") throw new InvalidSample("participant");
      const stats = row.stats ?? row;
      const slots = augmentSlotsOf(stats);
      if (slots.every(value => value == null)) throw new InvalidSample("augment-data-missing");
      const win = typeof stats.win === "string" ? stats.win.toLowerCase() : stats.win;
      if (![true, false, "win", "fail", "loss", "lose"].includes(win ?? "")) throw new InvalidSample("outcome");
      return {
        participantId: row.participantId ?? 0,
        teamId: row.teamId ?? 0,
        championId: row.championId ?? 0,
        win: win === true || win === "win",
        augments: slots.map(value => value == null || value === 0 ? null : value),
      };
    }),
  };
  return { sample, accounts: owner ? [] : [...accounts] };
}
