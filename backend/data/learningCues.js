const learningCues = {
  forest: { name: "Forest Rain", filename: "forest-rain.mp3" },
  piano: { name: "Soft Piano", filename: "soft-piano.mp3" },
  lofi: { name: "Lo-Fi Focus", filename: "lofi-focus.mp3" },
  ocean: { name: "Ocean Waves", filename: "ocean-waves.mp3" },
  ambient: { name: "Ambient Space", filename: "ambient-space.mp3" },
};

const lectureCueAssignments = [
  { lectureId: 1, cueId: "piano" },
  { lectureId: 2, cueId: "lofi" },
  { lectureId: 3, cueId: "lofi" },
  { lectureId: 4, cueId: "ocean" },
];

module.exports = { learningCues, lectureCueAssignments };
