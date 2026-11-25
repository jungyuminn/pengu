import { isMayhemQueue, type MayhemMatch, type MayhemPlayer } from "../../domain/mayhem";

export interface LcuSummoner {
  puuid?: string;
  gameName?: string;
  displayName?: string;
  tagLine?: string;
  profileIconId?: number;
}

export interface LcuMatchList {
  games?: LcuGame[] | { games?: LcuGame[] };
}

interface LcuGame {
  gameId?: number;
  gameCreation?: number;
  gameDuration?: number;
  gameLength?: number;
  queueId?: number;
  gameMode?: string;
  participants?: LcuParticipant[];
  participantIdentities?: Array<{
    participantId?: number;
    player?: LcuPlayer;
  }>;
}

interface LcuPlayer {
  puuid?: string;
  gameName?: string;
  summonerName?: string;
  displayName?: string;
  tagLine?: string;
}

interface LcuParticipant {
  participantId?: number;
  teamId?: number;
  championId?: number;
  spell1Id?: number;
  spell2Id?: number;
  stats?: LcuStats;
  win?: boolean | string;
  kills?: number;
  deaths?: number;
  assists?: number;
  champLevel?: number;
  goldEarned?: number;
  totalDamageDealtToChampions?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  playerAugment1?: number;
  playerAugment2?: number;
  playerAugment3?: number;
  playerAugment4?: number;
  playerAugment5?: number;
  playerAugment6?: number;
}

interface LcuStats extends LcuParticipant {}

export function summonerName(
  row: LcuSummoner,
): { puuid: string; gameName: string; tagLine: string; profileIconId: number | null } | null {
  const puuid = String(row.puuid ?? "").trim();
  if (!puuid) return null;
  const iconId = Number(row.profileIconId);
  return {
    puuid,
    gameName: String(row.gameName || row.displayName || "").trim(),
    tagLine: String(row.tagLine ?? "").trim(),
    profileIconId: Number.isInteger(iconId) && iconId >= 0 ? iconId : null,
  };
}

export function gamesFromList(payload: LcuMatchList | null | undefined): unknown[] {
  const games = payload?.games;
  if (Array.isArray(games)) return games;
  if (games && Array.isArray(games.games)) return games.games;
  return [];
}

export function mapMayhemGame(raw: unknown, puuid: string): MayhemMatch | null {
  if (!raw || typeof raw !== "object") return null;
  const game = raw as LcuGame;
  if (!isMayhemQueue(game.queueId, game.gameMode)) return null;
  const gameId = Number(game.gameId);
  if (!Number.isFinite(gameId) || gameId <= 0) return null;

  const participant = findParticipant(game, puuid);
  if (!participant) return null;
  const stats = participant.stats ?? participant;
  return {
    gameId,
    playedAt: Number(game.gameCreation) || 0,
    durationSec: durationOf(game),
    championId: Number(participant.championId) || 0,
    win: isWin(stats.win),
    kills: Number(stats.kills) || 0,
    deaths: Number(stats.deaths) || 0,
    assists: Number(stats.assists) || 0,
    augmentIds: augmentIdsOf(stats),
    players: playersOf(game),
  };
}

export function mayhemGameId(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const game = raw as LcuGame;
  if (!isMayhemQueue(game.queueId, game.gameMode)) return null;
  const gameId = Number(game.gameId);
  return Number.isFinite(gameId) && gameId > 0 ? gameId : null;
}

function findParticipant(game: LcuGame, puuid: string): LcuParticipant | null {
  const identity = game.participantIdentities?.find((row) => row.player?.puuid === puuid);
  if (identity?.participantId == null) return null;
  return game.participants?.find((row) => row.participantId === identity.participantId) ?? null;
}

function playersOf(game: LcuGame): MayhemPlayer[] {
  const identities = new Map(
    (game.participantIdentities ?? []).map((row) => [Number(row.participantId), row.player ?? {}]),
  );
  return (game.participants ?? []).flatMap((row) => {
    const id = Number(row.participantId);
    if (!Number.isFinite(id) || id <= 0) return [];
    const stats = row.stats ?? row;
    const player = identities.get(id) ?? {};
    return [
      {
        puuid: String(player.puuid ?? "").trim(),
        gameName: String(player.gameName || player.summonerName || player.displayName || "").trim(),
        tagLine: String(player.tagLine ?? "").trim(),
        teamId: Number(row.teamId) || 0,
        championId: Number(row.championId) || 0,
        win: isWin(stats.win),
        kills: Number(stats.kills) || 0,
        deaths: Number(stats.deaths) || 0,
        assists: Number(stats.assists) || 0,
        level: Number(stats.champLevel) || 0,
        gold: Number(stats.goldEarned) || 0,
        damage: Number(stats.totalDamageDealtToChampions) || 0,
        cs: (Number(stats.totalMinionsKilled) || 0) + (Number(stats.neutralMinionsKilled) || 0),
        spellIds: [Number(row.spell1Id) || 0, Number(row.spell2Id) || 0].filter((spell) => spell > 0),
        itemIds: [0, 1, 2, 3, 4, 5, 6].map((slot) => Number(stats[`item${slot}` as keyof LcuStats]) || 0),
        augmentIds: augmentIdsOf(stats),
      },
    ];
  });
}

function durationOf(game: LcuGame): number {
  const value = Number(game.gameDuration ?? game.gameLength) || 0;
  return value > 10000 ? Math.round(value / 1000) : value;
}

function isWin(value: boolean | string | undefined): boolean {
  if (value === true) return true;
  return String(value ?? "").toLowerCase() === "win";
}

function augmentIdsOf(stats: LcuStats): number[] {
  return [
    stats.playerAugment1,
    stats.playerAugment2,
    stats.playerAugment3,
    stats.playerAugment4,
    stats.playerAugment5,
    stats.playerAugment6,
  ].flatMap((id) => {
    const value = Number(id);
    return Number.isFinite(value) && value > 0 ? [value] : [];
  });
}
