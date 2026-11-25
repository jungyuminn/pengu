export interface LiveBoardItem {
  id: number;
  slot: number;
}

export interface LiveBoardPlayer {
  riotId: string;
  gameName: string;
  tagLine: string;
  summonerName: string;
  championName: string;
  team: string;
  isDead: boolean;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  items: LiveBoardItem[];
}

export interface LiveBoard {
  gameTime: number;
  gameMode: string;
  selfRiotId: string | null;
  selfSummonerName: string | null;
  selfGold: number | null;
  players: LiveBoardPlayer[];
}
