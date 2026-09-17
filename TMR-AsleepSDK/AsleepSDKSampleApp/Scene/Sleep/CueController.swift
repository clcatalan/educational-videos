//
//  CueController.swift
//

import Foundation
import AVFoundation

final class CueController: NSObject, AVAudioPlayerDelegate {

    private let jingleExt = "mp3"
    private var player: AVAudioPlayer?

    private(set) var isRunning = false
    private(set) var currentVolume: Float = 1.0

    var onPlay: (() -> Void)?

    func playJingle(
        resource: String,
        configureAudioSession: Bool = true,
        loop: Bool = false
    ) {
        DispatchQueue.main.async {
            self.stop()

            guard let url = Bundle.main.url(
                forResource: resource,
                withExtension: self.jingleExt
            ) else {
                print("[CueController] Missing \(resource).\(self.jingleExt)")
                return
            }

            do {
                let session = AVAudioSession.sharedInstance()

                print("[CueController] Current category:", session.category.rawValue)
                print("[CueController] Current mode:", session.mode.rawValue)

                if configureAudioSession {
                    try session.setCategory(.playback, mode: .default)
                    try session.setActive(true)
                    print("[CueController] Audio session configured for calibration")
                } else {
                    print("[CueController] Using existing Asleep audio session")
                }

                let player = try AVAudioPlayer(contentsOf: url)
                player.delegate = self
                player.numberOfLoops = loop ? -1 : 0
                player.volume = self.currentVolume
                player.prepareToPlay()

                self.player = player

                let didPlay = player.play()
                print("[CueController] Playing \(resource).\(self.jingleExt):", didPlay)

                self.isRunning = didPlay

                if didPlay {
                    self.onPlay?()
                } else {
                    print("[CueController] AVAudioPlayer failed to start")
                }
            } catch {
                self.isRunning = false
                print("[CueController] Audio error:", error.localizedDescription)
            }
        }
    }

    func stop() {
        isRunning = false
        player?.stop()
        player = nil
    }

    func setVolume(_ value: Float) {
        let clamped = max(0, min(1, value))

        currentVolume = clamped
        player?.volume = clamped

        print("[CueController] Volume:", clamped)
    }

    func audioPlayerDidFinishPlaying(
        _ player: AVAudioPlayer,
        successfully flag: Bool
    ) {
        isRunning = false
        self.player = nil
        print("[CueController] Playback finished")
    }
}
