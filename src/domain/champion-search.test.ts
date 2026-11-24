import { describe, expect, it } from "vitest";
import { championSearchText, matchesChampionSearch } from "./champion-search";

describe("champion search", () => {
  const tahm = championSearchText({
    id: 223,
    key: "TahmKench",
    names: { ko: "탐 켄치", en: "TahmKench" },
  });
  const yi = championSearchText({
    id: 11,
    key: "MasterYi",
    names: { ko: "마스터 이", en: "MasterYi" },
  });
  const tf = championSearchText({
    id: 4,
    key: "TwistedFate",
    names: { ko: "트위스티드 페이트", en: "TwistedFate" },
  });

  it("matches hangul without spaces, initials and english", () => {
    expect(matchesChampionSearch(tahm, "탐켄치")).toBe(true);
    expect(matchesChampionSearch(tahm, "ㅌㅋㅊ")).toBe(true);
    expect(matchesChampionSearch(tahm, "\u1110\u110F\u110E")).toBe(true);
    expect(matchesChampionSearch(tahm, "tahmkench")).toBe(true);
    expect(matchesChampionSearch(tahm, "탐켄")).toBe(true);
  });

  it("matches nicknames and master yi initials", () => {
    expect(matchesChampionSearch(yi, "마이")).toBe(true);
    expect(matchesChampionSearch(yi, "ㅁㅅㅌㅇ")).toBe(true);
    expect(matchesChampionSearch(yi, "masteryi")).toBe(true);
    expect(matchesChampionSearch(tf, "트페")).toBe(true);
    expect(matchesChampionSearch(tf, "twistedfate")).toBe(true);
  });
});
