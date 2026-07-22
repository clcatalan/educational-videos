import React, { useEffect, useState } from "react";
import "../styles/LearningCue.css";

const playlists = [
  {
    id: "14KtkIpsvzDSCXR24EqHCL",
    name: "Deep Focus"
  },
  {
    id: "2ODMZHnO9zcajVJ54Rlhz7",
    name: "Lo-Fi Study"
  },
  {
    id: "1T4YBOdnXTVtkQaVguaAUq",
    name: "Peaceful Piano"
  },
  {
    id: "0vvXsWCC9xrXsKd4FyS8kM",
    name: "Brain Food"
  },
  {
    id: "5Ob9EjYpTvbmNGxhdQe5JM",
    name: "Instrumental Focus"
  }
];

function LearningCue({ lectureId }) {
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [lectureId]);

  async function loadAssignments() {
    try {
      const res = await fetch("http://localhost:5001/api/assignments");
      const data = await res.json();

      setAssignments(data);

      // Find playlist assigned to this lecture
      const current = data.find(
        a => Number(a.lecture_id) === Number(lectureId)
      );

      if (current) {
        const playlist = playlists.find(
          p => p.id === current.playlist_id
        );

        if (playlist) {
          setSelectedPlaylist(playlist);
        }
      } else {
        setSelectedPlaylist(null);
      }

    } catch (err) {
      console.error(err);
    }
  }

  async function assignPlaylist(playlist) {
    try {
      const res = await fetch("http://localhost:5001/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lectureId,
          playlistId: playlist.id
        })
      });

      const result = await res.json();

      if (!result.success) {
        alert(result.message);
        return;
      }

      setSelectedPlaylist(playlist);
      setIsOpen(false);

      loadAssignments();

    } catch (err) {
      console.error(err);
    }
  }

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

          {playlists.map((playlist) => {

            const assigned = assignments.find(
              a =>
                a.playlist_id === playlist.id &&
                Number(a.lecture_id) !== Number(lectureId)
            );

            const selected =
              selectedPlaylist &&
              selectedPlaylist.id === playlist.id;

            return (
              <div
                key={playlist.id}
                className={`playlist-item ${
                  assigned ? "disabled" : ""
                } ${selected ? "selected" : ""}`}
                onClick={() => {
                  if (!assigned) {
                    assignPlaylist(playlist);
                  }
                }}
              >

                <span>
                  {selected && "✓ "}
                  {playlist.name}
                </span>

                {assigned && (
                  <span className="assigned-text">
                    Assigned
                  </span>
                )}

              </div>
            );
          })}

        </div>
      )}

      {/* Spotify Embed */}
      {selectedPlaylist && (
        <iframe
          src={`https://open.spotify.com/embed/playlist/${selectedPlaylist.id}`}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{
            border: "none",
            borderRadius: "12px",
            marginTop: "15px"
          }}
          title="Spotify Playlist"
        />
      )}

    </div>
  );
}

export default LearningCue;

