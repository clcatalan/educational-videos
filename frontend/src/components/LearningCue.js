import React, { useEffect, useState } from "react";
import "../styles/LearningCue.css";
import lectureMusic from "../data/lectureMusic";

function LearningCue({ lectureId }) {
  const [selectedMusic, setSelectedMusic] = useState(null);
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

      const current = data.find(
        (a) => Number(a.lecture_id) === Number(lectureId)
      );

      if (current) {
        const music = lectureMusic.find(
          (m) => m.id === current.playlist_id
        );

        setSelectedMusic(music || null);
      } else {
        setSelectedMusic(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function assignMusic(musicId) {
    try {
      const res = await fetch("http://localhost:5001/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lectureId,
          playlistId: musicId, // keep backend field name
        }),
      });

      const result = await res.json();

      if (!result.success) {
        alert(result.message);
        return;
      }

      loadAssignments();
      setIsOpen(false);
      
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
            {selectedMusic
              ? selectedMusic.name
              : "Select Background Music"}
          </p>
        </div>

        <span className={`arrow ${isOpen ? "open" : ""}`}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="playlist-dropdown">

          {lectureMusic.map((music) => {

            const assigned = assignments.find(
              (a) =>
                a.playlist_id === music.id &&
                Number(a.lecture_id) !== Number(lectureId)
            );

            const selected =
              selectedMusic &&
              selectedMusic.id === music.id;

            return (
              <div
                key={music.id}
                className={`playlist-item ${
                  assigned ? "disabled" : ""
                } ${selected ? "selected" : ""}`}
                onClick={() => {
                  if (!assigned) {
                    assignMusic(music.id);
                  }
                }}
              >
                <span>
                  {selected && "✓ "}
                  {music.name}
                </span>

                {assigned && (
                  <span className="assigned-text">
                    (Assigned)
                  </span>
                )}
              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}

export default LearningCue;

