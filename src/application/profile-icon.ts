export function profileIconUrl(id: number | null | undefined): string | null {
  if (id == null) return null;
  const value = Number(id);
  if (!Number.isInteger(value) || value < 0) return null;
  return `https://cdn.communitydragon.org/latest/profile-icon/${value}`;
}
