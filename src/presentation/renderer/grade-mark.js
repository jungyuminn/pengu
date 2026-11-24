function tierNumber(grade) {
  if (grade === "S") return 1;
  if (grade === "A") return 2;
  if (grade === "B") return 3;
  if (grade === "C") return 4;
  return null;
}

function gradeMark(grade, extraClass) {
  return gradeBadge(grade, extraClass, true);
}

function gradeLetter(grade, extraClass) {
  return gradeBadge(grade, extraClass, false);
}

function gradeBadge(grade, extraClass, asNumber) {
  const n = tierNumber(grade);
  const klass = extraClass ? ` ${extraClass}` : "";
  if (n == null) {
    return `<span class="tier-mark unknown${klass}" aria-label="등급 없음">?</span>`;
  }
  const label = asNumber ? String(n) : grade;
  const spoken = asNumber ? `${n}티어` : grade;
  return `<span class="tier-mark t${n}${klass}" aria-label="${spoken}"><span>${label}</span></span>`;
}
