export const GRADES = ["S", "A", "B", "C"] as const;

export type Grade = (typeof GRADES)[number];

export function tierNumber(grade: Grade): 1 | 2 | 3 | 4 {
  if (grade === "S") return 1;
  if (grade === "A") return 2;
  if (grade === "B") return 3;
  return 4;
}

export function gradeFromAramggTier(tier: number | string | null | undefined): Grade | null {
  if (tier === null || tier === undefined || tier === "") {
    return null;
  }

  if (typeof tier === "number") {
    if (tier <= 1) return "S";
    if (tier === 2) return "A";
    if (tier === 3) return "B";
    return "C";
  }

  const normalized = String(tier).trim().toUpperCase();
  if (normalized === "S+" || normalized === "S" || normalized === "T1") return "S";
  if (normalized === "A" || normalized === "T2") return "A";
  if (normalized === "B" || normalized === "T3") return "B";
  if (normalized === "C" || normalized === "D" || normalized === "T4" || normalized === "T5") {
    return "C";
  }
  return null;
}

export function gradeAdvice(grade: Grade | null | undefined): string {
  if (grade === "S") return "성능과 인기가 모두 좋아요";
  if (grade === "A") return "안정적으로 자주 골라요";
  if (grade === "B") return "상황에 따라 선택해요";
  if (grade === "C") return "이 챔피언에겐 잘 맞지 않아요";
  return "";
}

export function gradeFromPickRateRank(rank: number, total: number): Grade {
  if (total <= 0 || rank <= 0) return "C";
  const percentile = (rank - 1) / total;
  if (percentile <= 0.12) return "S";
  if (percentile <= 0.32) return "A";
  if (percentile <= 0.62) return "B";
  return "C";
}
