import { describe, expect, it } from "vitest";
import { formatItemText } from "./item-text";

describe("formatItemText", () => {
  it("keeps stats from the html description instead of the short plaintext", () => {
    expect(
      formatItemText({
        plaintext: "치명타 확률이 대폭 증가합니다.",
        description:
          "<mainText><stats>공격력 <attention>75</attention><br>치명타 확률 <attention>25%</attention></stats><br><br></mainText>",
      }),
    ).toBe("공격력 75\n치명타 확률 25%");
  });

  it("keeps unique effects under the stats block", () => {
    expect(
      formatItemText({
        plaintext: "취급주의",
        description:
          "<mainText><stats>공격력 <attention>36</attention><br>체력 <attention>333</attention></stats><br><br><passive>주문 검</passive><br>다음 기본 공격이 추가 피해를 입힙니다.</mainText>",
      }),
    ).toBe("공격력 36\n체력 333\n\n주문 검\n다음 기본 공격이 추가 피해를 입힙니다.");
  });

  it("fills missing html stats from the numeric stats object", () => {
    expect(
      formatItemText({
        plaintext: "전투에서 벗어나 있을 때는 이동 속도가 대폭 상승합니다.",
        description: "",
        stats: { FlatMovementSpeedMod: 45 },
      }),
    ).toBe("이동 속도 45\n\n전투에서 벗어나 있을 때는 이동 속도가 대폭 상승합니다.");
  });

  it("does not duplicate stats when the html already has them", () => {
    expect(
      formatItemText({
        description: "<stats>공격 속도 <attention>30%</attention></stats>",
        stats: { PercentAttackSpeedMod: 0.3 },
      }),
    ).toBe("공격 속도 30%");
  });
});
