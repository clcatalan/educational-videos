import React from "react";

const MESSAGES = {
  denied: "Camera access was blocked. Allow the camera for this site in your browser's address bar, then try again.",
  error: "The camera couldn't be started. Check that it's connected and not in use by another app, then try again.",
};

// Shown in the locked video area until the webcam attention tracker is running
function AttentionGate({ status, onEnable }) {
  const requesting = status === "requesting";

  return (
    <div className="attention-gate">
      <p>📷 This study measures whether you're looking at the lecture, using your webcam.</p>

      <small>
        Video is analysed on your device only. No images or recordings are uploaded,
        just whether your face is turned toward the screen each second.
      </small>

      {MESSAGES[status] && <small className="attention-gate-error">{MESSAGES[status]}</small>}

      <button className="dialog-save" onClick={onEnable} disabled={requesting}>
        {requesting ? "Starting camera..." : status === "idle" ? "Enable camera" : "Try again"}
      </button>
    </div>
  );
}

export default AttentionGate;
