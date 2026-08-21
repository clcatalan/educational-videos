import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LearningCue from "./LearningCue";
import QuizConfirmDialog from "./QuizConfirmDialog";
import { useAuth } from '../context/AuthContext';
import YouTubePlayer from "./YouTubePlayer";
import lectureMusic from "../data/lectureMusic";

function LecturePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuizDialog, setShowQuizDialog] = useState(false);

  // undefined = still loading assignment
  // null = no assignment
  const [assignedMusic, setAssignedMusic] = useState(undefined);

  const audioRef = useRef(null);

  useEffect(() => {
    fetchLecture();
  }, [id]);

  const fetchLecture = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/lectures/${id}`);

      if (!response.ok) {
        throw new Error("Lecture not found");
      }

      const data = await response.json();

      setLecture(data);
      setLoading(false);

      fetch(`/api/users/${currentUser.id}/watched`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId: data.id }),
      }).catch((err) => console.error("Error recording watched lecture:", err));

      fetch(`/api/lectures/${data.id}/quiz`)
        .then((res) => (res.ok ? res.json() : null))
        .then((quiz) => setLecture((prev) => ({ ...prev, quizLink: quiz?.link ?? null })))
        .catch(() => {});
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading lecture...</div>;
  }

  if (!lecture) {
    return (
      <div className="error-container">
        <h2>Lecture not found</h2>

        <button onClick={() => navigate("/")}>
          Back to Lectures
        </button>
      </div>
    );
  }

  const music =
    assignedMusic === undefined
      ? null
      : assignedMusic ||
        lectureMusic[(lecture.id - 1) % lectureMusic.length];

  return (
    <div className="lecture-player-container">

      <button
        className="back-button"
        onClick={() => navigate("/")}
      >
        ← Back to Lectures
      </button>

      <div className="player-content">

        {/* Video + Learning Cue */}
        <div className="player-media-row">
          <div className="video-column">
            <div className="video-wrapper">
              <YouTubePlayer
                videoUrl={lecture.videoUrl}
                onPlay={() => {
                  audioRef.current?.play();
                }}
                onPause={() => {
                  audioRef.current?.pause();
                }}
                onEnd={() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                  }
                  setShowQuizDialog(true);
                }}
              />
            </div>
          </div>

          <LearningCue
            lectureId={lecture.id}
            onMusicChanged={setAssignedMusic}
          />
        </div>

        {music && (
          <div className="audio-player-section">

            <div className="audio-player-header">

              <span className="audio-icon">
                🎵
              </span>

              <h3>Background Music</h3>

              <span className="audio-subtitle">
                {music.name}
              </span>

            </div>

            <audio
              ref={audioRef}
              controls
              loop
              className="audio-player"
            >
              <source
                src={music.file}
                type="audio/mpeg"
              />

              Your browser does not support the audio element.

            </audio>

          </div>
        )}

        <div className="lecture-details">

          <div className="lecture-header">

            <div>

              <span className="category-badge">
                {lecture.category}
              </span>

              <h1>{lecture.title}</h1>

            </div>

            <div className="duration-large">
              ⏱️ {lecture.duration}
            </div>

          </div>

          <div className="instructor-info">

            <span className="instructor-icon">
              👤
            </span>

            <div>

              <strong>Instructor</strong>

              <p>{lecture.instructor}</p>

            </div>

          </div>

          <div className="description-section">

            <h3>About this lecture</h3>

            <p>{lecture.description}</p>

          </div>

        </div>

      </div>

      {showQuizDialog && (
        <QuizConfirmDialog
          quizLink={lecture.quizLink}
          onConfirm={() => navigate(`/lecture/${id}/quiz`)}
          onDecline={() => setShowQuizDialog(false)}
        />
      )}
    </div>
  );
}

export default LecturePlayer;
