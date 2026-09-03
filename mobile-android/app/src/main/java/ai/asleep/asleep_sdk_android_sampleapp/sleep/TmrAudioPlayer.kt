package ai.asleep.asleep_sdk_android_sampleapp.sleep

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer

class TmrAudioPlayer(context: Context) {
    private val player = ExoPlayer.Builder(context.applicationContext).build()

    fun setVolume(volume: Float) {
        player.volume = volume.coerceIn(0f, 1f)
    }

    fun playCue(cueUrl: String) {
        player.repeatMode = Player.REPEAT_MODE_OFF
        player.setMediaItem(MediaItem.fromUri(cueUrl))
        player.prepare()
        player.play()
    }

    fun playLoopingWhiteNoise() {
        player.repeatMode = Player.REPEAT_MODE_ONE
        player.setMediaItem(MediaItem.fromUri(CONTROL_WHITE_NOISE_URI))
        player.prepare()
        player.play()
    }

    fun stopCue() {
        stopPlayback()
    }

    fun stopWhiteNoise() {
        stopPlayback()
    }

    fun stopPreview() {
        stopPlayback()
    }

    private fun stopPlayback() {
        player.stop()
        player.clearMediaItems()
    }

    fun release() {
        player.release()
    }

    private companion object {
        const val CONTROL_WHITE_NOISE_URI = "asset:///white_noise.mp3"
    }
}
