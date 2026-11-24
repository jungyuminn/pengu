export type ThemeMode = "dark" | "light";

export function asThemeMode(value: unknown): ThemeMode {
  return value === "light" ? "light" : "dark";
}

export function windowBackground(theme: ThemeMode): string {
  return theme === "light" ? "#f4f6fa" : "#10141c";
}
