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

class TmrMonitoringService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var audioPlayer: TmrAudioPlayer
    private var consecutiveN3Detections = 0
    private var cueTriggeredForCurrentN3Episode = false
    private var requestInFlight = false
    private var isMonitoring = false

    private val pollRunnable = object : Runnable {
        override fun run() {
            requestCurrentSleepStage()
            handler.postDelayed(this, POLL_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        audioPlayer = TmrAudioPlayer(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startMonitoring()
            ACTION_STOP -> stopSelf()
            else -> stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        isMonitoring = false
        handler.removeCallbacks(pollRunnable)
        audioPlayer.stopCue()
        audioPlayer.release()
        super.onDestroy()
    }

    private fun startMonitoring() {
        if (isMonitoring) return

        isMonitoring = true
        startForeground(NOTIFICATION_ID, createNotification())
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
                    session.sleepStages?.lastOrNull()?.let(::handleSleepStage)
                }
            }
        )
    }

    private fun handleSleepStage(stage: Int) {
        if (stage == STAGE_DEEP) {
            consecutiveN3Detections++
            if (consecutiveN3Detections >= REQUIRED_N3_DETECTIONS &&
                !cueTriggeredForCurrentN3Episode
            ) {
                audioPlayer.playCue()
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
    }
}
