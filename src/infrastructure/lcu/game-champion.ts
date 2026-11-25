export interface GameflowMember {
  championId?: number;
  puuid?: string;
  summonerInternalName?: string;
  summonerName?: string;
}

export interface GameflowSession {
  gameData?: {
    playerChampionSelections?: Array<{
      championId?: number;
      summonerInternalName?: string;
    }>;
    teamOne?: GameflowMember[];
    teamTwo?: GameflowMember[];
  };
}

export interface CurrentSummoner {
  puuid?: string;
  internalName?: string;
  displayName?: string;
  gameName?: string;
}

export function championIdFromGameflow(
  session: GameflowSession | null,
  me: CurrentSummoner | null,
): number | null {
  const data = session?.gameData;
  if (!data) return null;
  const members = [...(data.teamOne ?? []), ...(data.teamTwo ?? [])];
  const mine =
    members.find((row) => Boolean(me?.puuid) && row.puuid === me?.puuid) ??
    members.find((row) => Boolean(me?.internalName) && row.summonerInternalName === me?.internalName) ??
    members.find((row) => Boolean(me?.displayName) && row.summonerName === me?.displayName) ??
    members.find((row) => Boolean(me?.gameName) && row.summonerName === me?.gameName);
  if (mine && positiveId(mine.championId)) return mine.championId;

  const picks = data.playerChampionSelections ?? [];
  const myPick = picks.find((row) => Boolean(me?.internalName) && row.summonerInternalName === me?.internalName);
  return myPick && positiveId(myPick.championId) ? myPick.championId : null;
}

function positiveId(value: number | null | undefined): value is number {
  return typeof value === "number" && value > 0;
}
