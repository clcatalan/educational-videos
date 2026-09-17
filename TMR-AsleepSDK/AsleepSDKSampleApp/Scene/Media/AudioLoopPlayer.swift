//
//  AudioLoopPlayer.swift
//

import Foundation
import AVFoundation

final class AudioLoopPlayer {
    private var player: AVAudioPlayer?

    func startLooping(resource: String, ext: String) {
        guard let url = Bundle.main.url(
            forResource: resource,
            withExtension: ext
        ) else {
            print("[AudioLoopPlayer] Missing \(resource).\(ext) in bundle")
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()

            try session.setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )

            try session.setActive(true)

            player = try AVAudioPlayer(contentsOf: url)
            player?.numberOfLoops = -1
            player?.volume = 1.0
            player?.prepareToPlay()

            let started = player?.play() ?? false

            print(
                "[AudioLoopPlayer] Started looping \(resource).\(ext), success: \(started)"
            )
        } catch {
            print("[AudioLoopPlayer] Failed to start audio:", error)
        }
    }

    func pause() {
        player?.pause()
    }

    func resume() {
        player?.play()
    }

    func stop() {
        player?.stop()
        player = nil
    }
}
