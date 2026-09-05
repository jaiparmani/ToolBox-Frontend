/** Shared shape for the "money owed" summary — used by any screen that shows split balances. */
export function computeSettle(balances) {
  if (!balances) return null;
  const owed = balances.totalOwedToYou || 0;
  const youOwe = balances.totalYouOwe || 0;
  if (owed <= 0 && youOwe <= 0) return null;
  const people = (balances.balances || []).filter((b) => b.owed > 0);
  const names = people.slice(0, 2).map((p) => p.name).join(', ');
  const label = people.length === 0
    ? (youOwe > 0 ? 'balances to settle' : '')
    : people.length === 1
      ? `from ${people[0].name}`
      : `across ${people.length} people · ${names}${people.length > 2 ? '…' : ''}`;
  return { owed, youOwe, label };
}
