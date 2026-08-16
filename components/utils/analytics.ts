export function getLast6Months() {
  const months = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: months[d.getMonth()]
    });
  }
  return result;
}

export function groupByMonth(data: any[], dateField: string, amountField: string) {
  const groups: Record<string, number> = {};
  for (const item of data) {
    if (!item[dateField]) continue;
    // item[dateField] is expected to be a timestamp string, e.g. "2026-08-13T12:00:00Z"
    const date = new Date(item[dateField]);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    groups[key] = (groups[key] || 0) + (item[amountField] || 0);
  }
  return groups;
}

export function calculateTrend(currentValue: number, previousValue: number) {
  if (previousValue === 0 && currentValue === 0) return 0;
  if (previousValue === 0) return null; // "—" au lieu d'un pourcentage absurde ou div/0
  const diff = currentValue - previousValue;
  const percentage = (diff / previousValue) * 100;
  return percentage;
}
