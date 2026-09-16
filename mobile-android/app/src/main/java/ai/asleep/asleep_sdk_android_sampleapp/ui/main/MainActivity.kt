package ai.asleep.asleep_sdk_android_sampleapp.ui.main

import ai.asleep.asleep_sdk_android_sampleapp.BuildConfig
import ai.asleep.asleep_sdk_android_sampleapp.R
import ai.asleep.asleep_sdk_android_sampleapp.databinding.ActivityMainBinding
import ai.asleep.asleep_sdk_android_sampleapp.sleep.TmrAudioPlayer
import ai.asleep.asleep_sdk_android_sampleapp.study.LatestStudy
import ai.asleep.asleep_sdk_android_sampleapp.study.StudyApiClient
import ai.asleep.asleep_sdk_android_sampleapp.ui.Constants
import ai.asleep.asleep_sdk_android_sampleapp.ui.Constants.EXTRA_ASLEEP_USER_ID
import ai.asleep.asleep_sdk_android_sampleapp.ui.Constants.EXTRA_FROM_STATE
import ai.asleep.asleep_sdk_android_sampleapp.ui.Constants.EXTRA_SESSION_ID
import ai.asleep.asleep_sdk_android_sampleapp.ui.autotracking.AutoTrackingDialogFragment
import ai.asleep.asleep_sdk_android_sampleapp.ui.report.ReportActivity
import ai.asleep.asleep_sdk_android_sampleapp.utils.PreferenceHelper
import ai.asleep.asleep_sdk_android_sampleapp.utils.showErrorDialog
import ai.asleep.asleepsdk.Asleep
import ai.asleep.asleepsdk.data.Session
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.SeekBar
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.DialogFragment
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var permissionManager: PermissionManager
    private lateinit var studyApiClient: StudyApiClient
    private lateinit var calibrationAudioPlayer: TmrAudioPlayer
    private var latestStudy: LatestStudy? = null
    private var sleepSetupStarted = false
    private var calibrationPreviewPlaying = false

    private val asleepViewModel: AsleepViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        permissionManager = PermissionManager(this)
        studyApiClient = StudyApiClient(BuildConfig.STUDY_API_BASE_URL.trimEnd('/'))
        calibrationAudioPlayer = TmrAudioPlayer(this)
        setPermissionObserver()
        setStudyFlowListeners()
        setAudioCalibrationListeners()

        // Define Main screen by AsleepState
        lifecycleScope.launch {
            asleepViewModel.asleepState.collect { state ->
                when (state) {
                    AsleepState.STATE_IDLE -> {
                        if (sleepSetupStarted) checkRunningService()
                    }
                    AsleepState.STATE_INITIALIZING -> {
                        binding.llButtons.visibility = View.VISIBLE
                        binding.btnControlTracking.text = "No user id"
                        binding.btnControlTracking.isEnabled = false
                    }
                    AsleepState.STATE_INITIALIZED -> {
                        binding.llButtons.visibility = View.VISIBLE
                        binding.llTrackingInfo.visibility = View.GONE
                        binding.btnControlTracking.apply {
                            isEnabled = true
                            text = getString(R.string.button_text_start_tracking)
                            setOnClickListener {
                                if (permissionManager.allPermissionsGranted.value == true) {
                                    stopCalibrationPreview()
                                    asleepViewModel.beginSleepTracking()
                                } else {
                                    permissionManager.checkAndRequestPermissions()
                                }
                            }
                        }
                    }
                    AsleepState.STATE_TRACKING_STARTING, AsleepState.STATE_TRACKING_STOPPING -> {
                        binding.llButtons.visibility = View.GONE
                        binding.btnControlTracking.isEnabled = false
                        binding.btnControlTracking.text = "LOADING"
                    }
                    AsleepState.STATE_TRACKING_STARTED -> {
                        binding.llButtons.visibility = View.GONE
                        binding.llTrackingInfo.visibility = View.VISIBLE
                        binding.btnControlTracking.apply {
                            isEnabled = true
                            text = getString(R.string.button_text_stop_tracking)
                            setOnClickListener {
                                if (asleepViewModel.isEnoughTrackingTime()) {
                                    asleepViewModel.endSleepTracking()
                                } else {
                                    showInsufficientTimeDialog()
                                }
                            }
                        }
                    }
                    is AsleepState.STATE_ERROR -> {
                        binding.btnControlTracking.isEnabled = false
                        showErrorDialog(supportFragmentManager)
                    }
                }
            }
        }

        binding.apply {
            binding.btnGotoReport.setOnClickListener { gotoReportActivity(Constants.StateName.INIT.name) }
            btnAutotracking.setOnClickListener {
                if (permissionManager.allPermissionsGranted.value == true) {
                    val dialog: DialogFragment = AutoTrackingDialogFragment()
                    dialog.show(supportFragmentManager, "AutoTrackingDialogFragment")
                } else {
                    permissionManager.checkAndRequestPermissions()
                }
            }
            tvVersion.text = BuildConfig.VERSION_NAME
        }

        asleepViewModel.asleepUserId.observe(this) { asleepUserId ->
            binding.tvAsleepUserId.text = getString(R.string.status_message_asleep_id, asleepUserId)
        }
        asleepViewModel.sequence.observe(this) { sequence ->
            val sequenceText = "${getString(R.string.tracking_label_uploaded_sequence)} $sequence"
            binding.tvSequence.text = sequenceText
        }
        asleepViewModel.currentSleepData.observe(this) {
            it?.let { binding.tvCurrentSleepData.text = getCurrentSleepDataText(it) }
        }
        asleepViewModel.warningMessage.observe(this) { warningMessage ->
            binding.tvWarningMessage.text = warningMessage
        }
        asleepViewModel.shouldGoToReport.observe(this) { shouldGoToReport ->
            if (shouldGoToReport) { gotoReportActivity(Constants.StateName.TRACKING.name) }
        }
    }

    private fun setStudyFlowListeners() {
        binding.btnLoadStudy.setOnClickListener {
            val username = binding.etParticipantUsername.text.toString().trim()
            if (username.isBlank()) {
                showStudyError(getString(R.string.participant_username_required))
                return@setOnClickListener
            }

            setStudyLoading(true)
            studyApiClient.loginAndLoadLatestStudy(
                username = username,
                onSuccess = { study ->
                    runOnUiThread {
                        setStudyLoading(false)
                        latestStudy = study
                        binding.tvLatestLectureTitle.text = study.title
                        binding.studyLoginContainer.visibility = View.GONE
                        binding.quizConfirmationContainer.visibility = View.VISIBLE
                        val hasQuizUrl = !study.quizUrl.isNullOrBlank()
                        binding.btnQuizNo.isEnabled = hasQuizUrl
                        binding.tvQuizError.visibility = if (hasQuizUrl) View.GONE else View.VISIBLE
                        if (!hasQuizUrl) {
                            binding.tvQuizError.text = getString(R.string.missing_quiz_url)
                        }
                    }
                },
                onError = { message ->
                    runOnUiThread {
                        setStudyLoading(false)
                        showStudyError(message)
                    }
                }
            )
        }

        binding.btnQuizNo.setOnClickListener {
            val quizUrl = latestStudy?.quizUrl
            if (quizUrl.isNullOrBlank()) {
                binding.tvQuizError.text = getString(R.string.missing_quiz_url)
                binding.tvQuizError.visibility = View.VISIBLE
                return@setOnClickListener
            }
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(quizUrl)))
            } catch (_: Exception) {
                binding.tvQuizError.text = "Unable to open the quiz link."
                binding.tvQuizError.visibility = View.VISIBLE
            }
        }

        binding.btnQuizYes.setOnClickListener { showSleepSetup() }
    }

    private fun setStudyLoading(loading: Boolean) {
        binding.btnLoadStudy.isEnabled = !loading
        binding.etParticipantUsername.isEnabled = !loading
        binding.studyLoading.visibility = if (loading) View.VISIBLE else View.GONE
        if (loading) binding.tvStudyError.visibility = View.GONE
    }

    private fun setAudioCalibrationListeners() {
        val savedVolume = PreferenceHelper.getAudioVolume(this)
        binding.seekAudioVolume.progress = (savedVolume * 100).roundToInt()
        updateAudioVolumeLabel(savedVolume)
        calibrationAudioPlayer.setVolume(savedVolume)
        asleepViewModel.setAudioVolume(savedVolume)

        binding.seekAudioVolume.setOnSeekBarChangeListener(
            object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    val volume = progress / 100f
                    calibrationAudioPlayer.setVolume(volume)
                    asleepViewModel.setAudioVolume(volume)
                    PreferenceHelper.saveAudioVolume(this@MainActivity, volume)
                    updateAudioVolumeLabel(volume)
                }

                override fun onStartTrackingTouch(seekBar: SeekBar?) = Unit
                override fun onStopTrackingTouch(seekBar: SeekBar?) = Unit
            }
        )

        binding.btnTestAudio.setOnClickListener {
            if (calibrationPreviewPlaying) {
                stopCalibrationPreview()
            } else {
                startCalibrationPreview()
            }
        }
    }

    private fun startCalibrationPreview() {
        val study = latestStudy ?: return
        binding.tvAudioCalibrationError.visibility = View.GONE
        when (study.studyGroup) {
            STUDY_GROUP_CONTROL -> calibrationAudioPlayer.playLoopingWhiteNoise()
            STUDY_GROUP_TMR -> {
                val selectedCueUrl = study.cueUrl
                if (selectedCueUrl.isNullOrBlank()) {
                    binding.tvAudioCalibrationError.setText(R.string.audio_calibration_missing_cue)
                    binding.tvAudioCalibrationError.visibility = View.VISIBLE
                    return
                }
                calibrationAudioPlayer.playCue(selectedCueUrl)
            }
            else -> {
                binding.tvAudioCalibrationError.setText(R.string.audio_calibration_invalid_group)
                binding.tvAudioCalibrationError.visibility = View.VISIBLE
                return
            }
        }
        calibrationPreviewPlaying = true
        binding.btnTestAudio.setText(R.string.stop_test_audio)
    }

    private fun stopCalibrationPreview() {
        if (!calibrationPreviewPlaying) return
        calibrationAudioPlayer.stopPreview()
        calibrationPreviewPlaying = false
        binding.btnTestAudio.setText(R.string.test_audio)
    }

    private fun updateAudioVolumeLabel(volume: Float) {
        binding.tvAudioVolume.text = getString(
            R.string.audio_volume_percent,
            (volume * 100).roundToInt()
        )
    }

    private fun showStudyError(message: String) {
        binding.tvStudyError.text = message
        binding.tvStudyError.visibility = View.VISIBLE
    }

    private fun showSleepSetup() {
        if (sleepSetupStarted) return
        latestStudy?.let {
            asleepViewModel.setTmrStudyContext(
                studyGroup = it.studyGroup,
                cueId = it.cueId,
                cueUrl = it.cueUrl
            )
        }
        sleepSetupStarted = true
        binding.quizConfirmationContainer.visibility = View.GONE
        binding.sleepSetupContainer.visibility = View.VISIBLE
        binding.audioCalibrationContainer.visibility = View.VISIBLE
        permissionManager.checkAllPermissions()
        checkRunningService()
    }

    override fun onStop() {
        stopCalibrationPreview()
        super.onStop()
    }

    override fun onDestroy() {
        calibrationAudioPlayer.release()
        super.onDestroy()
    }

    private fun showInsufficientTimeDialog() {
        val dialog = InsufficientTimeDialogFragment()
        dialog.show(supportFragmentManager, "InsufficientTimeDialogFragment")
    }

    private fun getCurrentSleepDataText(session: Session): String {
        var currentStagesText = ""
        session.sleepStages?.let {
            if (it.isNotEmpty()) {
                currentStagesText += "Current Sleep Stage: ${it.last()}\n"
            } else {
                currentStagesText += "Current Stages: checkable if sequence is 10+"
            }
        }
        session.snoringStages?.let {
            if (it.isNotEmpty()) {
                currentStagesText += "Current Snoring Stage: ${it.last()}\n"
            }
        }
        return currentStagesText
    }

    private fun setPermissionObserver() {
        permissionManager.batteryOptimized.observe(this) { batteryOptimized ->
            binding.tvIgnoreBatteryOpt.text = getString(
                R.string.status_message_ignore_battery_optimization,
                batteryOptimized.toString()
            )
        }
        permissionManager.micPermission.observe(this) { micPermission ->
            binding.tvMicPermission.text = getString(
                R.string.status_message_microphone_permission,
                micPermission.toString()
            )
        }
        permissionManager.notificationPermission.observe(this) { notificationPermission ->
            binding.tvNotiPermission.text = getString(
                R.string.status_message_notification_permission,
                notificationPermission.toString()
            )
        }
    }

    private fun gotoReportActivity(state: String) {
        val asleepUserId = asleepViewModel.asleepUserId.value
        asleepUserId?.let { userid ->
            val intent = Intent(this@MainActivity, ReportActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(EXTRA_ASLEEP_USER_ID, userid)
                putExtra(EXTRA_FROM_STATE, state)
                if (state.equals(Constants.StateName.TRACKING.name)) {
                    putExtra(EXTRA_SESSION_ID, asleepViewModel.sessionId.value)
                }
            }
            startActivity(intent)
        }
    }

    private fun checkRunningService() {
        val isRunningService = Asleep.isSleepTrackingAlive(applicationContext)
        if (isRunningService) {
            asleepViewModel.connectSleepTracking()
        } else {
            asleepViewModel.initAsleepConfig()
        }
    }

    private companion object {
        const val STUDY_GROUP_TMR = "TMR"
        const val STUDY_GROUP_CONTROL = "CONTROL"
    }
}
