// availableOn is a plain "YYYY-MM-DD" day; parse it as a local date so it
// isn't shifted by timezone the way new Date("YYYY-MM-DD") (UTC) would be.
function parseDay(availableOn) {
  const [year, month, day] = availableOn.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Short explanation of why a lecture can't be watched today
export function availabilityMessage(lecture) {
  if (lecture.available || !lecture.availableOn) return null;

  const day = parseDay(lecture.availableOn);
  const label = day.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return day !== today
    ? `Watch on ${label}`
    : `No longer available (was ${label})`;
}
