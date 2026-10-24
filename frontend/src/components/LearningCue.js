import React, { useEffect, useState } from "react";
import "../styles/LearningCue.css";
import lectureMusic from "../data/lectureMusic";

const PREVIEW_SECONDS = 10;

// The cue must be picked and confirmed before the video can play,
// and is locked from then on so it can't change mid-video.
function LearningCue({ lectureId, onMusicChanged, locked, onConfirm }) {
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [lectureId]);

  useEffect(() => {
    if (locked) setIsOpen(false);
  }, [locked]);

  // Keep the preview to the first few seconds of the track
  function limitPreview(e) {
    const audio = e.currentTarget;

    if (audio.currentTime >= PREVIEW_SECONDS) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  async function loadAssignments() {
    try {
      const res = await fetch("http://localhost:5001/api/assignments");
      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
        console.error("Failed to load assignments:", data);
        return;
      }

      setAssignments(data);

      const current = data.find(
        (a) => Number(a.lecture_id) === Number(lectureId)
      );

      // Preselect the previous assignment; the user still has to confirm it
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

  async function confirmMusic() {
    if (!selectedMusic) return;

    try {
      setConfirming(true);

      const res = await fetch("http://localhost:5001/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lectureId,
          playlistId: selectedMusic.id,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        alert(result.message);
        return;
      }

      if (onMusicChanged) {
        onMusicChanged(selectedMusic);
      }

      if (onConfirm) {
        onConfirm();
      }

      await loadAssignments();

    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className={`learning-cue ${locked ? "locked" : ""}`}>

      <div
        className="cue-header"
        onClick={() => {
          if (!locked) setIsOpen(!isOpen);
        }}
      >
        <div>
          <h3>🎵 Learning Cue</h3>

          <p>
            {locked && "🔒 "}
            {selectedMusic
              ? selectedMusic.name
              : "Select Background Music"}
          </p>
        </div>

        {!locked && (
          <span className={`arrow ${isOpen ? "open" : ""}`}>
            ▼
          </span>
        )}
      </div>

      {!locked && isOpen && (
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
                    setSelectedMusic(music);
                  }
                }}
              >
                <span>
                  {selected && "✓ "}
                  {music.name}
                </span>
              </div>

            );
          })}

        </div>
      )}

      {!locked && selectedMusic && (
        <div className="cue-preview">
          <span className="cue-preview-label">
            Preview ({PREVIEW_SECONDS}s)
          </span>

          {/* key gives each track a fresh element; <source> src changes are ignored */}
          <audio
            key={selectedMusic.file}
            controls
            className="cue-preview-player"
            onTimeUpdate={limitPreview}
            onSeeking={limitPreview}
          >
            <source src={selectedMusic.file} type="audio/mpeg" />
          </audio>
        </div>
      )}

      {!locked && (
        <div className="cue-confirm">
          <button
            className="cue-confirm-button"
            disabled={!selectedMusic || confirming}
            onClick={confirmMusic}
          >
            {confirming ? "Confirming..." : "Confirm track"}
          </button>
        </div>
      )}

    </div>
  );
}

export default LearningCue;
