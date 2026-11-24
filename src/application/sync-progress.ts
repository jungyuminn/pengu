export function statsSyncLabel(): string {
  return "증강·챔피언 통계 받는 중...";
}

export function championBuildLabel(done: number, total: number): string {
  return `챔피언 빌드 받는 중 (${done}/${total})...`;
}

export function matchHistoryLabel(): string {
  return "전적 받는 중...";
}
