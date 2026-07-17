import React, { useState } from "react";
import "../styles/LearningCue.css";

const playlists = [
  "Deep Focus",
  "Peaceful Piano",
  "Lo-Fi Beats",
  "Brain Food",
  "Instrumental Study"
];

function LearningCue() {
  const [selectedPlaylist, setSelectedPlaylist] = useState("Select Playlist");
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (playlist) => {
    setSelectedPlaylist(playlist);
    setIsOpen(false);
  };

  return (
    <div className="learning-cue">
      <div
        className="cue-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h3>🎵 Learning Cue</h3>
          <p>{selectedPlaylist}</p>
        </div>

        <span className={`arrow ${isOpen ? "open" : ""}`}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="playlist-dropdown">
          {playlists.map((playlist) => (
            <div
              key={playlist}
              className="playlist-item"
              onClick={() => handleSelect(playlist)}
            >
              {playlist}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LearningCue;

