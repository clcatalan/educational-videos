import React, { useState, useEffect } from "react";
import { FaSpotify } from "react-icons/fa";
import "../styles/LearningCue.css";

function LearningCue() {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => setPlaylists(data))
      .catch((err) => console.error(err));
  }, []);

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

          <p>
            {selectedPlaylist
              ? selectedPlaylist.name
              : "Select Playlist"}
          </p>
        </div>

        <span className={`arrow ${isOpen ? "open" : ""}`}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="playlist-dropdown">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="playlist-item"
              onClick={() => handleSelect(playlist)}
            >
              {playlist.name}
            </div>
          ))}
        </div>
      )}

      {selectedPlaylist && (
        <div className="spotify-link">
          <a
            href={selectedPlaylist.url}
            target="_blank"
            rel="noreferrer"
            className="spotify-button"
          >
            <FaSpotify className="spotify-icon" />
            <span>Open in Spotify</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default LearningCue;