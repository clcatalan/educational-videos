package ai.asleep.asleep_sdk_android_sampleapp.sleep

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer

class TmrAudioPlayer(context: Context) {
    private val player = ExoPlayer.Builder(context.applicationContext).build()

    fun playCue() {
        player.setMediaItem(MediaItem.fromUri(CUE_ASSET_URI))
        player.prepare()
        player.play()
    }

    fun stopCue() {
        player.stop()
        player.clearMediaItems()
    }

    fun release() {
        player.release()
    }

    private companion object {
        const val CUE_ASSET_URI = "asset:///test_cue.mp3"
    }
}
