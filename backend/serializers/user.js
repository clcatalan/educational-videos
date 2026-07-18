const toUser = row => ({
  id: row.id,
  username: row.username,
  preferredLectureIds: row.preferred_lecture_ids,
  preferencesSet: row.preferences_set,
  isAdmin: row.is_admin,
});

module.exports = { toUser };
