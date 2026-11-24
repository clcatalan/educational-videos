/*
SM-2 spaced repetition (SuperMemo 2), as described in
https://dev.to/umangsinha12/how-spaced-repetition-actually-works-the-sm-2-algorithm-1ge3

Each participant + lecture keeps { repetition, intervalDays, easiness }.
After each review, the quiz grade (0-5) gives the next state; the next
review is intervalDays after today.
*/

const INITIAL_EASINESS = 2.5;
const MIN_EASINESS = 1.3;
// Grades below this are a failed recall
const PASSING_QUALITY = 3;

// Quiz percentage -> SM-2 grade. Lowest percentage needed for each grade.
const QUALITY_THRESHOLDS = [
  { minPct: 90, quality: 5 },
  { minPct: 75, quality: 4 },
  { minPct: 60, quality: 3 },
  { minPct: 40, quality: 2 },
  { minPct: 20, quality: 1 },
];

function qualityFromScore(pct) {
  return QUALITY_THRESHOLDS.find(t => pct >= t.minPct)?.quality ?? 0;
}

/*
TEMPORARY, for demos: start every participant + lecture as if they had
already passed twice (the 1-day and 6-day steps), so the very first quiz
already uses interval x easiness. A failed quiz also falls back to this
point instead of 0. Set to false to return to standard SM-2.
Only affects lectures with no review yet; existing lecture_reviews rows
keep their stored repetition.
*/
const DEMO_SKIP_EARLY_STEPS = true;

const START_REPETITION = DEMO_SKIP_EARLY_STEPS ? 2 : 0;

const INITIAL_STATE = {
  repetition: START_REPETITION,
  intervalDays: DEMO_SKIP_EARLY_STEPS ? 6 : 0,
  easiness: INITIAL_EASINESS,
};

function nextReview(state = INITIAL_STATE, quality) {
  const { repetition, intervalDays, easiness } = state;

  // Failed recall: start the sequence over; easiness is left as is
  if (quality < PASSING_QUALITY) {
    return { repetition: START_REPETITION, intervalDays: 1, easiness };
  }

  // Interval uses the easiness from before this review
  let interval;
  if (repetition === 0) interval = 1;
  else if (repetition === 1) interval = 6;
  else interval = Math.trunc(intervalDays * easiness);

  const miss = 5 - quality;
  const newEasiness = Math.max(MIN_EASINESS, easiness + (0.1 - miss * (0.08 + miss * 0.02)));

  return {
    repetition: repetition + 1,
    intervalDays: interval,
    // Rounded so floating-point drift doesn't build up across reviews
    easiness: Math.round(newEasiness * 1000) / 1000,
  };
}

module.exports = { qualityFromScore, nextReview, INITIAL_STATE, INITIAL_EASINESS };
