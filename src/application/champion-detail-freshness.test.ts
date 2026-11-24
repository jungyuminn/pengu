import { describe, expect, it } from "vitest";
import type { ChampionDetail } from "../domain/champion-detail";
import { CHAMPION_DETAIL_SCHEMA, hasUsableChampionDetail, isFreshChampionDetail } from "./champion-detail-freshness";

describe("hasUsableChampionDetail", () => {
  it("rejects rows that only have skill order", () => {
    expect(hasUsableChampionDetail(detail({ augments: [augment()], skillOrder: "Q > W > E" }))).toBe(false);
  });

  it("rejects old cached details without the current schema", () => {
    expect(
      isFreshChampionDetail({
        syncedAt: new Date().toISOString(),
        detail: detail({
          augments: [augment()],
          coreItems: [{ name: "강철심장", iconUrl: null }],
        }),
      }),
    ).toBe(false);
    expect(
      isFreshChampionDetail({
        syncedAt: new Date().toISOString(),
        schema: CHAMPION_DETAIL_SCHEMA,
        detail: detail({
          augments: [augment()],
          coreItems: [{ name: "강철심장", iconUrl: null }],
        }),
      }),
    ).toBe(true);
  });

  it("accepts rows with augments and a build", () => {
    expect(
      hasUsableChampionDetail(
        detail({
          augments: [augment()],
          coreItems: [{ name: "강철심장", iconUrl: null }],
        }),
      ),
    ).toBe(true);
  });
});

function augment(): ChampionDetail["augments"][number] {
  return {
    id: 1,
    name: "거인",
    grade: "S",
    rarity: "prismatic",
    pickRate: 1,
    winRate: 50,
    iconUrl: null,
  };
}

function detail(partial: Partial<ChampionDetail>): ChampionDetail {
  return {
    id: 223,
    name: "탐 켄치",
    title: "",
    key: "TahmKench",
    iconUrl: null,
    roles: [],
    grade: "S",
    pickRate: 1,
    winRate: 50,
    patch: "16.23",
    augments: [],
    coreItems: [],
    startingItems: [],
    summoners: [],
    skillOrder: "",
    trios: [],
    ...partial,
  };
}
