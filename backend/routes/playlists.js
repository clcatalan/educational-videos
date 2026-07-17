const express = require("express");

const router = express.Router();

const playlists = require("../data/playlists");

router.get("/", (req, res) => {
  res.json(playlists);
});

module.exports = router;


