export function formatTeamPercentage(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(value >= 1 ? 0 : 1)}%`;
}

export function formatTeamNumber(value: number | null | undefined): string {
  return (Number(value) || 0).toLocaleString("vi-VN", {
    maximumFractionDigits: 0,
  });
}

export function formatTeamDate(date: string): string {
  const [, month, day] = date.split("-");
  return month && day ? `${day}-${month}` : date;
}

export function formatTeamDateSlash(date: string): string {
  return formatTeamDate(date).replace("-", "/");
}

export function formatTeamSignedPoints(delta: number | null | undefined): string {
  if (delta == null || Number.isNaN(delta)) return "–";
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${Math.abs(delta * 100).toFixed(1)}đ`;
}

export function formatTeamDeltaLabel(delta: number | null | undefined): string {
  if (delta == null || Number.isNaN(delta)) return "•";
  if (delta > 0) return `↑ ${formatTeamSignedPoints(delta)}`;
  if (delta < 0) return `↓ ${formatTeamSignedPoints(delta)}`;
  return "→ 0.0đ";
}
