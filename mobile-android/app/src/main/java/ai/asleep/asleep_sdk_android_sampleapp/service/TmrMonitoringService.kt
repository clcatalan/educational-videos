package ai.asleep.asleep_sdk_android_sampleapp.service

import ai.asleep.asleep_sdk_android_sampleapp.R
import ai.asleep.asleep_sdk_android_sampleapp.BuildConfig
import ai.asleep.asleep_sdk_android_sampleapp.sleep.TmrAudioPlayer
import ai.asleep.asleep_sdk_android_sampleapp.ui.main.MainActivity
import ai.asleep.asleepsdk.Asleep
import ai.asleep.asleepsdk.data.Session
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlin.math.roundToInt

class TmrMonitoringService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var audioPlayer: TmrAudioPlayer
    private var consecutiveN3Detections = 0
    private var cueTriggeredForCurrentN3Episode = false
    private var requestInFlight = false
    private var isMonitoring = false
    private var isControlWhiteNoisePlaying = false
    private var studyGroup: String? = null
    private var cueId: String? = null
    private var cueUrl: String? = null
    private var calibratedVolumePercent = DEFAULT_AUDIO_VOLUME_PERCENT
    private var currentVolumePercent = DEFAULT_AUDIO_VOLUME_PERCENT
    private var waitingForSleepAfterWake = false
    private var isVolumeRecoveryActive = false

    private val pollRunnable = object : Runnable {
        override fun run() {
            requestCurrentSleepStage()
            handler.postDelayed(this, POLL_INTERVAL_MS)
        }
    }

    private val recoveryRunnable = object : Runnable {
        override fun run() {
            if (!isVolumeRecoveryActive || waitingForSleepAfterWake) return

            currentVolumePercent = (currentVolumePercent + RECOVERY_STEP_PERCENTAGE_POINTS)
                .coerceAtMost(calibratedVolumePercent)
            audioPlayer.setVolumePercent(currentVolumePercent)
            Log.i(TAG, "Sleep audio recovery volume changed to $currentVolumePercent%")

            if (currentVolumePercent >= calibratedVolumePercent) {
                isVolumeRecoveryActive = false
                Log.i(TAG, "Calibrated volume target reached: $calibratedVolumePercent%")
            } else {
                handler.postDelayed(this, RECOVERY_INTERVAL_MS)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        audioPlayer = TmrAudioPlayer(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                studyGroup = intent.getStringExtra(EXTRA_STUDY_GROUP)
                cueId = intent.getStringExtra(EXTRA_CUE_ID)
                cueUrl = intent.getStringExtra(EXTRA_CUE_URL)
                calibratedVolumePercent = (
                    intent.getFloatExtra(EXTRA_AUDIO_VOLUME, DEFAULT_AUDIO_VOLUME)
                        .coerceIn(0f, 1f) * 100
                    ).roundToInt()
                currentVolumePercent = calibratedVolumePercent
                audioPlayer.setVolumePercent(currentVolumePercent)
                val cueUrlPresent = !cueUrl.isNullOrBlank()
                Log.i(
                    TAG,
                    "Study configuration received: group=$studyGroup, cueId=$cueId, cueUrlPresent=$cueUrlPresent"
                )
                when (studyGroup) {
                    STUDY_GROUP_TMR -> {
                        if (!isTmrCueConfigured()) {
                            Log.w(TAG, "TMR playback disabled: cue URL must be present")
                        }
                    }
                    STUDY_GROUP_CONTROL -> Unit
                    else -> Log.w(
                        TAG,
                        "Audio playback disabled: invalid or unsupported study group=$studyGroup"
                    )
                }
                startMonitoring()
            }
            ACTION_STOP -> stopSelf()
            else -> stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        isMonitoring = false
        handler.removeCallbacks(pollRunnable)
        cancelVolumeRecovery()
        stopControlWhiteNoise()
        audioPlayer.stopCue()
        audioPlayer.release()
        Log.i(TAG, "Service cleanup complete: recovery cancelled and audio player released")
        super.onDestroy()
    }

    private fun startMonitoring() {
        if (isMonitoring) return

        isMonitoring = true
        startForeground(NOTIFICATION_ID, createNotification())
        if (studyGroup == STUDY_GROUP_CONTROL) {
            audioPlayer.playLoopingWhiteNoise()
            isControlWhiteNoisePlaying = true
            Log.i(TAG, "CONTROL white noise started")
        }
        handler.post(pollRunnable)
        if (BuildConfig.DEBUG && DEBUG_SIMULATE_DEEP_SLEEP) {
            simulateStableDeepSleep()
        }
    }

    private fun simulateStableDeepSleep() {
        Log.d(TAG, "Debug simulation: sending two consecutive Deep/N3 readings")
        repeat(REQUIRED_N3_DETECTIONS) {
            handleSleepStage(STAGE_DEEP)
        }
    }

    private fun requestCurrentSleepStage() {
        if (requestInFlight) return
        requestInFlight = true

        Asleep.getCurrentSleepData(
            asleepSleepDataListener = object : Asleep.AsleepSleepDataListener {
                override fun onFail(errorCode: Int, detail: String) {
                    requestInFlight = false
                    Log.w(TAG, "Unable to read current sleep data: $errorCode - $detail")
                }

                override fun onSleepDataReceived(session: Session) {
                    requestInFlight = false
                    if (!isMonitoring) return
                    session.sleepStages?.lastOrNull()?.let(::handleSleepStage)
                }
            }
        )
    }

    private fun handleSleepStage(stage: Int) {
        if (studyGroup == STUDY_GROUP_CONTROL || studyGroup == STUDY_GROUP_TMR) {
            updateVolumeForSleepStage(stage)
        }

        if (studyGroup != STUDY_GROUP_TMR) return

        if (stage == STAGE_DEEP) {
            consecutiveN3Detections++
            if (consecutiveN3Detections >= REQUIRED_N3_DETECTIONS &&
                !cueTriggeredForCurrentN3Episode
            ) {
                val selectedCueUrl = cueUrl
                if (isTmrCueConfigured() && selectedCueUrl != null) {
                    Log.i(TAG, "Stable Deep/N3 detected; triggering TMR cue $cueId")
                    audioPlayer.playCue(selectedCueUrl)
                } else {
                    val cueUrlPresent = !selectedCueUrl.isNullOrBlank()
                    Log.w(
                        TAG,
                        "Stable Deep/N3 detected; skipping TMR playback: group=$studyGroup, cueId=$cueId, cueUrlPresent=$cueUrlPresent"
                    )
                }
                cueTriggeredForCurrentN3Episode = true
            }
            return
        }

        consecutiveN3Detections = 0
        cueTriggeredForCurrentN3Episode = false
        if (stage == STAGE_WAKE || stage == STAGE_LIGHT) {
            audioPlayer.stopCue()
        }
    }

    private fun updateVolumeForSleepStage(stage: Int) {
        when (stage) {
            STAGE_WAKE -> handleWakeDetected()
            STAGE_LIGHT, STAGE_DEEP -> {
                if (waitingForSleepAfterWake) startVolumeRecovery()
            }
        }
    }

    private fun handleWakeDetected() {
        if (waitingForSleepAfterWake) return

        cancelVolumeRecovery()
        waitingForSleepAfterWake = true
        currentVolumePercent = WAKE_VOLUME_PERCENT
        audioPlayer.setVolumePercent(currentVolumePercent)
        Log.i(TAG, "Wake detected; recovery cancelled/reset and audio volume muted to $WAKE_VOLUME_PERCENT%")
    }

    private fun startVolumeRecovery() {
        cancelVolumeRecovery()
        waitingForSleepAfterWake = false
        currentVolumePercent = RECOVERY_START_VOLUME_PERCENT
            .coerceAtMost(calibratedVolumePercent)
        audioPlayer.setVolumePercent(currentVolumePercent)
        Log.i(TAG, "Sleep resumed; volume recovery started at $currentVolumePercent%")

        if (currentVolumePercent >= calibratedVolumePercent) {
            Log.i(TAG, "Calibrated volume target reached: $calibratedVolumePercent%")
            return
        }

        isVolumeRecoveryActive = true
        handler.postDelayed(recoveryRunnable, RECOVERY_INTERVAL_MS)
    }

    private fun cancelVolumeRecovery() {
        handler.removeCallbacks(recoveryRunnable)
        isVolumeRecoveryActive = false
    }

    private fun isTmrCueConfigured(): Boolean =
        studyGroup == STUDY_GROUP_TMR && !cueUrl.isNullOrBlank()

    private fun stopControlWhiteNoise() {
        if (!isControlWhiteNoisePlaying) return

        audioPlayer.stopWhiteNoise()
        isControlWhiteNoisePlaying = false
        Log.i(TAG, "CONTROL white noise stopped")
    }

    private fun createNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_sampleapp)
        .setContentTitle(getString(R.string.app_name))
        .setContentText("Monitoring sleep stage for audio cues")
        .setContentIntent(
            PendingIntent.getActivity(
                this,
                0,
                Intent(this, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        )
        .setOngoing(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .build()

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "TMR sleep monitoring",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    companion object {
        const val ACTION_START =
            "ai.asleep.asleep_sdk_android_sampleapp.action.START_TMR_MONITORING"
        const val ACTION_STOP =
            "ai.asleep.asleep_sdk_android_sampleapp.action.STOP_TMR_MONITORING"
        const val EXTRA_STUDY_GROUP =
            "ai.asleep.asleep_sdk_android_sampleapp.extra.STUDY_GROUP"
        const val EXTRA_CUE_ID =
            "ai.asleep.asleep_sdk_android_sampleapp.extra.CUE_ID"
        const val EXTRA_CUE_URL =
            "ai.asleep.asleep_sdk_android_sampleapp.extra.CUE_URL"
        const val EXTRA_AUDIO_VOLUME =
            "ai.asleep.asleep_sdk_android_sampleapp.extra.AUDIO_VOLUME"

        // Debug builds only: set to true temporarily to trigger the cue on service start.
        private const val DEBUG_SIMULATE_DEEP_SLEEP = false

        const val TAG = "TmrMonitoringService"
        const val CHANNEL_ID = "tmr_sleep_monitoring"
        const val NOTIFICATION_ID = 2001
        const val POLL_INTERVAL_MS = 30_000L
        const val REQUIRED_N3_DETECTIONS = 2
        const val STAGE_WAKE = 0
        const val STAGE_LIGHT = 1
        const val STAGE_DEEP = 2
        private const val STUDY_GROUP_TMR = "TMR"
        private const val STUDY_GROUP_CONTROL = "CONTROL"
        private const val DEFAULT_AUDIO_VOLUME = 0.5f

        // Implementation defaults pending final study-protocol confirmation.
        private const val DEFAULT_AUDIO_VOLUME_PERCENT = 50
        private const val WAKE_VOLUME_PERCENT = 0
        private const val RECOVERY_START_VOLUME_PERCENT = 1
        private const val RECOVERY_STEP_PERCENTAGE_POINTS = 1
        private const val RECOVERY_INTERVAL_MS = 60_000L
    }
}
