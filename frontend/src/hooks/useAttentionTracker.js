import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

/*
Webcam off-task looking tracker (gaze on screen vs. away), in the spirit of
Sharma, Jermann & Dillenbourg's MOOC eye-tracking work. Everything runs in
the browser: only per-second numbers are sent to the backend, never frames.

These thresholds are working defaults, not values from the literature. Raw
values are stored with each sample so the rule can be re-applied later.
*/
const MAX_YAW_DEG = 25;
const MAX_PITCH_DEG = 20;
const MAX_BLINK = 0.5;
const MAX_EYE_LOOK = 0.6;

const FRAME_INTERVAL_MS = 200;
const SAMPLE_INTERVAL_MS = 1000;
const FLUSH_INTERVAL_MS = 10000;
// A trailing partial second (e.g. right before a pause) is dropped below this
const MIN_FRAMES_PER_SAMPLE = 3;

// Keep in sync with the @mediapipe/tasks-vision version in package.json
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL = "/models/face_landmarker.task";

let landmarkerPromise = null;

// Created once and shared, since loading the model takes a few seconds
function loadLandmarker() {
  if (!landmarkerPromise) {
    const create = async (delegate) => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
    };

    landmarkerPromise = create("GPU")
      .catch(() => create("CPU"))
      .catch((err) => {
        landmarkerPromise = null;
        throw err;
      });
  }

  return landmarkerPromise;
}

const toDeg = (rad) => (rad * 180) / Math.PI;

// Head yaw/pitch from the face's forward axis (third column of the
// column-major 4x4 transform). Only magnitudes are used for the rule.
function headPose(matrix) {
  const [x, y, z] = [matrix.data[8], matrix.data[9], matrix.data[10]];
  return {
    yaw: toDeg(Math.atan2(x, z)),
    pitch: toDeg(Math.atan2(-y, Math.hypot(x, z))),
  };
}

function readFrame(result) {
  const blendshapes = result.faceBlendshapes?.[0]?.categories;
  const matrix = result.facialTransformationMatrixes?.[0];

  if (!blendshapes || !matrix) {
    return { facePresent: false, onScreen: false };
  }

  const score = Object.fromEntries(blendshapes.map((c) => [c.categoryName, c.score]));
  const { yaw, pitch } = headPose(matrix);
  const blink = (score.eyeBlinkLeft + score.eyeBlinkRight) / 2;
  // Signed so direction is kept; both eyes move together when looking sideways
  const lookH = (score.eyeLookOutLeft + score.eyeLookInRight) / 2 - (score.eyeLookInLeft + score.eyeLookOutRight) / 2;
  const lookV = (score.eyeLookUpLeft + score.eyeLookUpRight) / 2 - (score.eyeLookDownLeft + score.eyeLookDownRight) / 2;

  const onScreen =
    Math.abs(yaw) <= MAX_YAW_DEG &&
    Math.abs(pitch) <= MAX_PITCH_DEG &&
    blink < MAX_BLINK &&
    Math.abs(lookH) < MAX_EYE_LOOK &&
    Math.abs(lookV) < MAX_EYE_LOOK;

  return { facePresent: true, onScreen, yaw, pitch, blink, lookH, lookV };
}

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

function toSample(frames, videoTime) {
  const faces = frames.filter((f) => f.facePresent);
  const avg = (key) => mean(faces.map((f) => f[key]));

  return {
    videoTime,
    onScreenRatio: frames.filter((f) => f.onScreen).length / frames.length,
    facePresent: faces.length * 2 >= frames.length,
    yaw: avg("yaw"),
    pitch: avg("pitch"),
    blink: avg("blink"),
    lookH: avg("lookH"),
    lookV: avg("lookV"),
  };
}

/*
status: idle -> requesting -> ready, or denied / error.
Call start() from a user gesture, then setPlaying() from the player events.
getVideoTime() should return the current playback position in seconds.
*/
export default function useAttentionTracker({ userId, lectureId, getVideoTime }) {
  const [status, setStatus] = useState("idle");

  const streamRef = useRef(null);
  const cameraRef = useRef(null);
  const playingRef = useRef(false);
  const framesRef = useRef([]);
  const pendingRef = useRef([]);
  const sessionIdRef = useRef(null);
  const getVideoTimeRef = useRef(getVideoTime);
  getVideoTimeRef.current = getVideoTime;

  const flush = useCallback(() => {
    const samples = pendingRef.current.splice(0);
    if (samples.length === 0 || !userId) return;

    // keepalive lets the last batch go out even while the page is closing
    fetch(`/api/users/${userId}/attention-samples`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lectureId, sessionId: sessionIdRef.current, samples }),
      keepalive: true,
    }).catch((err) => console.error("Error recording attention samples:", err));
  }, [userId, lectureId]);

  const closeSample = useCallback((minFrames) => {
    const frames = framesRef.current.splice(0);
    if (frames.length < minFrames) return;

    let videoTime = null;
    try {
      videoTime = getVideoTimeRef.current?.() ?? null;
    } catch {
      // The player may already be gone (e.g. while unmounting)
    }
    pendingRef.current.push(toSample(frames, Number.isFinite(videoTime) ? videoTime : null));
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    cameraRef.current = null;
  }, []);

  const start = useCallback(async () => {
    // The player remounts after a (re)start, so wait for its next play event
    playingRef.current = false;
    setStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });

      // If the camera is unplugged or access is revoked, the video locks again
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopCamera();
        setStatus("error");
      });

      const camera = document.createElement("video");
      camera.muted = true;
      camera.playsInline = true;
      camera.srcObject = stream;

      streamRef.current = stream;
      cameraRef.current = camera;

      await Promise.all([camera.play(), loadLandmarker()]);
      setStatus("ready");
    } catch (err) {
      console.error("Attention tracker failed to start:", err);
      stopCamera();
      setStatus(err?.name === "NotAllowedError" ? "denied" : "error");
    }
  }, [stopCamera]);

  const setPlaying = useCallback((playing) => {
    playingRef.current = playing;

    if (!playing) {
      closeSample(MIN_FRAMES_PER_SAMPLE);
      flush();
    }
  }, [closeSample, flush]);

  // Sample frames, close 1-second samples and send batches while ready
  useEffect(() => {
    if (status !== "ready") return;

    let landmarker = null;
    loadLandmarker().then((l) => { landmarker = l; });

    const frameTimer = setInterval(() => {
      const camera = cameraRef.current;
      if (!playingRef.current || !landmarker || !camera || camera.readyState < 2) return;

      const frame = readFrame(landmarker.detectForVideo(camera, performance.now()));
      // A hidden tab means the lecture isn't on screen, whatever the face is doing
      framesRef.current.push(document.hidden ? { ...frame, onScreen: false } : frame);
    }, FRAME_INTERVAL_MS);

    const sampleTimer = setInterval(() => {
      if (playingRef.current) closeSample(1);
    }, SAMPLE_INTERVAL_MS);

    const flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

    // Closing the tab doesn't unmount React, so send the last batch here
    const onPageHide = () => {
      closeSample(MIN_FRAMES_PER_SAMPLE);
      flush();
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearInterval(frameTimer);
      clearInterval(sampleTimer);
      clearInterval(flushTimer);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [status, closeSample, flush]);

  // A new lecture is a new viewing session; leaving sends what's left
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
    setStatus("idle");

    return () => {
      closeSample(MIN_FRAMES_PER_SAMPLE);
      flush();
      playingRef.current = false;
      stopCamera();
    };
  }, [lectureId, closeSample, flush, stopCamera]);

  return { status, start, setPlaying };
}
