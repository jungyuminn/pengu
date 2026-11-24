import type { Rarity } from "../../domain/augment";

export function toRarity(value: string | number | undefined): Rarity {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("prism") || text.includes("프리즘") || text === "2") return "prismatic";
  if (text.includes("gold") || text.includes("골드") || text === "1") return "gold";
  if (text.includes("silver") || text.includes("실버") || text === "0") return "silver";
  return "unknown";
}
