// availableOn is a plain "YYYY-MM-DD" day; parse it as a local date so it
// isn't shifted a day by timezone the way new Date("YYYY-MM-DD") (UTC) is.
export function parseDay(availableOn) {
  const [year, month, day] = availableOn.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDay(availableOn) {
  if (!availableOn) return 'Any day';

  return parseDay(availableOn).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
