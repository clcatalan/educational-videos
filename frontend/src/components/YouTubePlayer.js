import React from "react";
import YouTube from "react-youtube";

function getVideoId(url) {
  const match = url.match(/embed\/([^?]+)/);
  return match ? match[1] : "";
}

export default function YouTubePlayer({
  videoUrl,
  onPlay,
  onPause,
  onEnd,
}) {
  const opts = {
    width: "100%",
    height: "500",
    playerVars: {
      rel: 0,
      modestbranding: 1,
    },
  };

  return (
    <YouTube
      videoId={getVideoId(videoUrl)}
      opts={opts}
      onPlay={onPlay}
      onPause={onPause}
      onEnd={onEnd}
    />
  );
}

