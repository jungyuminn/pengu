export interface ChampSelectSession {
  localPlayerCellId?: number;
  myTeam?: Array<{
    cellId?: number;
    championId?: number;
    championPickIntent?: number;
  }>;
  actions?: Array<
    Array<{
      actorCellId?: number;
      championId?: number;
      completed?: boolean;
      isInProgress?: boolean;
      type?: string;
    }>
  >;
}

export function champSelectChampionId(
  current: number | null | undefined,
  session: ChampSelectSession | null | undefined,
): number | null {
  if (positive(current)) return current;
  const me = session?.myTeam?.find((player) => player.cellId === session.localPlayerCellId);
  if (positive(me?.championId)) return me.championId;
  if (positive(me?.championPickIntent)) return me.championPickIntent;
  const action = (session?.actions ?? []).flat().find((row) => {
    if (row.actorCellId !== session?.localPlayerCellId) return false;
    if (row.type && row.type !== "pick") return false;
    return row.isInProgress !== false && !row.completed && positive(row.championId);
  });
  return positive(action?.championId) ? action.championId : null;
}

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
