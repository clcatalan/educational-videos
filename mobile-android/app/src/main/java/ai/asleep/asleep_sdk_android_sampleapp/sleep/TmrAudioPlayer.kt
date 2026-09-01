package ai.asleep.asleep_sdk_android_sampleapp.sleep

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer

class TmrAudioPlayer(context: Context) {
    private val player = ExoPlayer.Builder(context.applicationContext).build()

    fun playCue(cueUrl: String) {
        player.setMediaItem(MediaItem.fromUri(cueUrl))
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
}
