//
//  MainViewModel.swift
//

import Foundation
import Combine
import AsleepSDK
import SwiftUI

extension MainView {
    final class ViewModel: ObservableObject {

        private(set) var trackingManager: Asleep.SleepTrackingManager?

        @Published var asleepUserId: String?
        @Published var sessionId: String?
        @Published var sequenceNumber: Int?
        @Published var liveReport: LiveSleepReport?
        @Published var error: String?
        @Published var isTracking = false
        @Published private(set) var config: Asleep.Config?

        private var stagePollingTask: Task<Void, Never>?
        private var cueDurationTask: Task<Void, Never>?
        private var cueVolumeTask: Task<Void, Never>?
        private let cueController = CueController()

        // MARK: - TMR State

        private var previousSleepStage: Int?
        private var currentSleepStage: Int?
        private var lastProcessedStageKey: String?

        private var currentCueVolume: Float = 1.0
        private let cueDuration: TimeInterval = 180
        private let cueVolumeInterval: TimeInterval = 60
        private let cueVolumeStep: Float = 0.01

        // MARK: - Backend

        private func bindAsleepUser(asleepUserId: String) async {
            let storedUserId = UserDefaults.standard.string(forKey: StorageKeys.userId) ?? ""

            guard let databaseUserId = Int(storedUserId) else {
                print("[Bind] Invalid database user ID:", storedUserId)
                return
            }

            print("[Bind] Binding database user \(databaseUserId) to Asleep user \(asleepUserId)")

            do {
                try await NetLogin.bindAsleepUser(databaseUserId: databaseUserId, asleepUserId: asleepUserId)
                print("[Bind] Success")
            } catch {
                print("[Bind] Failed:", error.localizedDescription)
            }
        }

        private func saveLiveSleepStage(stage: Int, asleepUserId: String, sequenceNumber: Int?) async {
            do {
                let report = try await NetLogin.saveLiveSleepStage(
                    asleepUserId: asleepUserId,
                    sessionId: sessionId,
                    sequenceNumber: sequenceNumber,
                    sleepStage: stage
                )

                await MainActor.run { self.liveReport = report }

                print("[LiveStage] Saved stage \(stage), sequence \(sequenceNumber ?? -1)")
                print(
                    "[LiveReport]",
                    "Efficiency:", report.sleepEfficiency as Any,
                    "Wake:", report.timeInWake,
                    "Light:", report.timeInLight,
                    "Deep:", report.timeInDeep,
                    "REM:", report.timeInRem,
                    "Sleep:", report.timeInSleep
                )
            } catch {
                print("[LiveStage] Failed:", error.localizedDescription)
            }
        }

        // MARK: - Sleep Stage Polling

        private func startSleepStagePolling() {
            stopSleepStagePolling()

            guard let asleepUserId else {
                print("[SleepStagePolling] No Asleep user ID")
                return
            }

            print("[SleepStagePolling] Starting backend polling")

            stagePollingTask = Task { [weak self] in
                guard let self else { return }

                while !Task.isCancelled {
                    do {
                        if let stage = try await NetLogin.fetchLatestSleepStage(asleepUserId: asleepUserId) {
                            print("[SleepStagePolling] stage =", stage.sleepStage)

                            let stageKey = "\(stage.sessionId)|\(stage.seqNum ?? -1)|\(stage.inferenceSeqNum ?? -1)|\(stage.createdAt ?? "")"

                            if stageKey != self.lastProcessedStageKey {
                                self.lastProcessedStageKey = stageKey
                                await self.handleSleepStage(stage.sleepStage, asleepUserId: asleepUserId)
                            } else {
                                print("[SleepStagePolling] Same logged stage already processed")
                            }
                        } else {
                            print("[SleepStagePolling] No stage available yet")
                        }
                    } catch {
                        print("[SleepStagePolling] Error:", error.localizedDescription)
                    }

                    do { try await Task.sleep(for: .seconds(30)) }
                    catch { break }
                }

                print("[SleepStagePolling] Polling stopped")
            }
        }

        private func stopSleepStagePolling() {
            guard stagePollingTask != nil else { return }
            stagePollingTask?.cancel()
            stagePollingTask = nil
            print("[SleepStagePolling] Polling cancelled")
        }

        // MARK: - TMR Algorithm

        @MainActor
        private func handleSleepStage(_ stage: Int, asleepUserId: String) {
            let previous = previousSleepStage
            currentSleepStage = stage

            print("[TMR] Previous stage:", previous as Any, "Current stage:", stage)

            if cueController.isRunning && stage != 2 {
                print("[TMR] Transition away from N3 detected")
                stopCuePlayback(reduceNextVolume: true)
            }

            if previous == 2 && stage == 2 {
                startTMRStimulationIfNeeded(asleepUserId: asleepUserId)
            }

            previousSleepStage = stage
        }

        @MainActor
        private func startTMRStimulationIfNeeded(asleepUserId: String) {
            let flow = UserDefaults.standard.string(forKey: StorageKeys.flow) ?? ""
            guard flow == "TMR" else {
                print("[TMR] Consecutive N3 detected but flow is", flow)
                return
            }

            guard !cueController.isRunning else {
                print("[TMR] Consecutive N3 continues — cue already playing")
                return
            }

            let assignedMusic = UserDefaults.standard.string(forKey: StorageKeys.assignedMusic) ?? ""
            guard !assignedMusic.isEmpty else {
                print("[TMR] No assigned music")
                return
            }

            print("[TMR] Consecutive N3 confirmed")
            print("[TMR] Starting 3-minute cue:", assignedMusic)
            print("[TMR] Starting volume:", currentCueVolume)

            cueController.setVolume(currentCueVolume)
            cueController.playJingle(resource: assignedMusic, configureAudioSession: false, loop: true)

            #if !DEBUG
            NetLogin.logJingle(asleepUserId: asleepUserId, sessionId: sessionId, seqNum: sequenceNumber)
            #endif

            startCueVolumeRamp()
            startCueDurationTimer()
        }

        @MainActor
        private func startCueVolumeRamp() {
            cueVolumeTask?.cancel()

            cueVolumeTask = Task { [weak self] in
                guard let self else { return }

                for minute in 1...2 {
                    do { try await Task.sleep(for: .seconds(self.cueVolumeInterval)) }
                    catch { return }

                    guard !Task.isCancelled,
                          self.cueController.isRunning,
                          self.currentSleepStage == 2
                    else { return }

                    let newVolume = min(1.0, self.currentCueVolume + self.cueVolumeStep)
                    self.currentCueVolume = newVolume
                    self.cueController.setVolume(newVolume)

                    print("[TMR] N3 minute \(minute) — volume increased to", newVolume)
                }
            }
        }

        @MainActor
        private func startCueDurationTimer() {
            cueDurationTask?.cancel()

            cueDurationTask = Task { [weak self] in
                guard let self else { return }

                do { try await Task.sleep(for: .seconds(self.cueDuration)) }
                catch { return }

                guard !Task.isCancelled, self.cueController.isRunning else { return }

                print("[TMR] 3-minute cue duration complete")
                self.stopCuePlayback(reduceNextVolume: false)
            }
        }

        @MainActor
        private func stopCuePlayback(reduceNextVolume: Bool) {
            cueDurationTask?.cancel()
            cueDurationTask = nil

            cueVolumeTask?.cancel()
            cueVolumeTask = nil

            cueController.stop()

            if reduceNextVolume {
                currentCueVolume = max(0, min(1, currentCueVolume * 0.95))
                cueController.setVolume(currentCueVolume)

                print("[TMR] Cue stopped due to transition toward Wake")
                print("[TMR] Next cue volume reduced to", currentCueVolume)
            } else {
                print("[TMR] Cue stopped normally")
            }
        }

        @MainActor
        private func resetTMRState() {
            cueDurationTask?.cancel()
            cueDurationTask = nil

            cueVolumeTask?.cancel()
            cueVolumeTask = nil

            cueController.stop()

            previousSleepStage = nil
            currentSleepStage = nil
            lastProcessedStageKey = nil
            currentCueVolume = 1.0

            print("[TMR] State reset")
        }

        // MARK: - Debug

        #if DEBUG
        @MainActor
        func debugInjectStage(_ stage: Int) {
            let id = asleepUserId ?? "debug-user"
            print("[DEV Sleep Stage] Injecting local stage", stage)
            handleSleepStage(stage, asleepUserId: id)
        }
        #endif

        // MARK: - Asleep Configuration

        func initAsleepConfig(apiKey: String, userId: String, baseUrl: URL?, callbackUrl: URL?) {
            print("[Config] Initializing Asleep config, userId=\(userId.isEmpty ? "nil(auto)" : userId)")

            if let callbackUrl {
                print("[Config] Callback URL:", callbackUrl.absoluteString)
            } else {
                print("[Config] Callback URL disabled")
            }

            Asleep.initAsleepConfig(
                apiKey: apiKey,
                userId: userId.isEmpty ? nil : userId,
                baseUrl: baseUrl,
                callbackUrl: callbackUrl,
                delegate: self
            )
        }

        func initSleepTrackingManager() {
            guard let config else {
                print("[SleepTracking] Cannot create manager: config missing")
                return
            }

            print("[SleepTracking] Creating SleepTrackingManager")
            trackingManager = Asleep.createSleepTrackingManager(config: config, delegate: self)
        }
    }
}

// MARK: - Config Delegate

extension MainView.ViewModel: AsleepConfigDelegate {

    func userDidJoin(userId: String, config: Asleep.Config) {
        print("[ConfigDelegate] Asleep user joined: \(userId)")

        Task { @MainActor in
            self.config = config
            self.asleepUserId = userId
            self.initSleepTrackingManager()

            guard self.trackingManager != nil else {
                self.error = "SleepTrackingManager could not be created."
                return
            }

            print("[SDK TEST] Calling startTracking()")
            self.trackingManager?.startTracking()
        }

        #if !DEBUG
        Task { await self.bindAsleepUser(asleepUserId: userId) }
        #endif
    }

    func didFailUserJoin(error: Asleep.AsleepError) {
        print("[ConfigDelegate] didFailUserJoin:", error)

        Task { @MainActor in
            self.isTracking = false
            self.error = error.localizedDescription
        }
    }

    func userDidDelete(userId: String) {
        print("[ConfigDelegate] userDidDelete userId:", userId)
    }
}

// MARK: - Sleep Tracking Delegate

extension MainView.ViewModel: AsleepSleepTrackingManagerDelegate {

    func didCreate() {
        print("[SleepTracking] Tracking started.")

        Task { @MainActor in
            self.resetTMRState()
            self.isTracking = true
            self.error = nil
            self.sequenceNumber = nil
            self.sessionId = nil
            self.liveReport = nil
        }

        #if !DEBUG
        startSleepStagePolling()
        #endif
    }

    func didUpload(sequence: Int) {
        print("[SleepTracking] didUpload sequence: \(sequence)")

        Task { @MainActor in
            self.sequenceNumber = sequence
        }

        if sequence > 0 && sequence % 10 == 0 {
            print("[Asleep SDK] Requesting latest analysis")
            trackingManager?.requestAnalysis()
        }
    }

    func didClose(sessionId: String) {
        print("[SleepTracking] Tracking stopped, sessionId: \(sessionId)")

        stopSleepStagePolling()
        let currentAsleepUserId = asleepUserId

        Task { @MainActor in
            self.resetTMRState()
            self.isTracking = false
            self.sessionId = sessionId
        }

        if let currentAsleepUserId {
            Task {
                do {
                    let report = try await NetLogin.finalizeLiveSleepStages(
                        asleepUserId: currentAsleepUserId,
                        sessionId: sessionId
                    )

                    await MainActor.run {
                        self.liveReport = report
                    }

                    print("[LiveStage] Finalized rows with sessionId:", sessionId)
                    print(
                        "[LiveReport] Final live summary",
                        "Efficiency:", report.sleepEfficiency as Any,
                        "Wake:", report.timeInWake,
                        "Light:", report.timeInLight,
                        "Deep:", report.timeInDeep,
                        "REM:", report.timeInRem,
                        "Sleep:", report.timeInSleep
                    )
                } catch {
                    print("[LiveStage] Finalize failed:", error.localizedDescription)
                }
            }
        }

        print("[SDK TEST] Backend completion skipped")
    }

    func didFail(error: Asleep.AsleepError) {
        print("[SleepTrackingDelegate] didFail:", error)

        Task { @MainActor in
            self.error = error.localizedDescription
        }
    }

    func analysing(session: Asleep.Model.Session) {
        guard let sleepStages = session.sleepStages,
              let latestStage = sleepStages.last
        else {
            print("[Asleep SDK] analysing callback received with no sleep stages")
            return
        }

        print("[Asleep SDK] analysing callback. Latest stage:", latestStage)

        guard let asleepUserId else {
            print("[TMR] No Asleep user ID available")
            return
        }

        let sequence = sequenceNumber

        Task {
            await self.saveLiveSleepStage(
                stage: latestStage,
                asleepUserId: asleepUserId,
                sequenceNumber: sequence
            )
        }

        Task { @MainActor in
            self.handleSleepStage(latestStage, asleepUserId: asleepUserId)
        }
    }

    func didInterrupt() {
        print("[SleepTrackingDelegate] Tracking interrupted")

        Task { @MainActor in
            self.error = "Sleep tracking was temporarily interrupted."
        }
    }

    func didResume() {
        print("[SleepTrackingDelegate] Tracking resumed")

        Task { @MainActor in
            self.isTracking = true
            self.error = nil
        }
    }

    func micPermissionWasDenied() {
        print("[SleepTrackingDelegate] Microphone permission denied")
        stopSleepStagePolling()

        Task { @MainActor in
            self.resetTMRState()
            self.isTracking = false
            self.error = "Microphone permission was denied."
        }
    }
}
