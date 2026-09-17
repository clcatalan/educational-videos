//
//  PreCalibrationView.swift
//

import SwiftUI

struct PreCalibrationView: View {

    let onNext: () -> Void

    @AppStorage(StorageKeys.assignedMusic) private var assignedMusic = ""

    private let cueController = CueController()

    @State private var isTestJinglePlaying = false
    @State private var didPlayTestSound = false
    @State private var didStopTestSoundOnce = false
    @State private var checkCharger = false
    @State private var checkPlacement = false
    @State private var checkDND = false
    @State private var checkInternet = false

    private var allChecked: Bool {
        checkCharger && checkPlacement && checkDND && checkInternet
    }

    private var canContinue: Bool {
        allChecked && didPlayTestSound && didStopTestSoundOnce && !isTestJinglePlaying
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Calibration Check")
                        .font(.title)
                        .bold()

                    Text("Lets begin the next part of out TMR study. Please read the following instructions and complete the tasks before moving on.")
                        .font(.headline)
                }

                stageCard(
                    title: "Phone & environment",
                    bullets: [
                        "Try to sleep in a quiet environment.",
                        "Ideally, sleep alone.",
                        "If not possible, keep the phone closer to you than others in the room."
                    ],
                    systemImage: "moon.zzz.fill"
                )

                stageCard(
                    title: "What will happen",
                    bullets: [
                        "The app will track your sleep.",
                        "It may or may not play the sound paired with your study session during the night."
                    ],
                    systemImage: "waveform.path.ecg"
                )

                checklistCard
                soundCard

                Button(action: onNext) {
                    Text("Next")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .foregroundColor(.white)
                }
                .buttonStyle(.borderedProminent)
                .padding(.top, 8)
                .disabled(!canContinue)
                .opacity(canContinue ? 1 : 0.5)
            }
            .padding()
        }
        .foregroundColor(.primary)
        .onDisappear {
            stopTestJingleIfNeeded()
        }
    }

    // MARK: - Cards

    private func stageCard(
        title: String,
        bullets: [String],
        systemImage: String
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                    .font(.title2)

                Text(title)
                    .font(.headline)

                Spacer()
            }

            VStack(alignment: .leading, spacing: 6) {
                ForEach(bullets, id: \.self) {
                    bullet($0)
                }
            }
            .font(.subheadline)
        }
        .padding()
        .background(.thinMaterial)
        .cornerRadius(14)
    }

    private var checklistCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "checklist")
                    .font(.title3)

                Text("Before Starting")
                    .font(.headline)

                Spacer()
            }

            checkboxRow(
                isOn: $checkCharger,
                text: "My phone is **plugged into a charger**."
            )

            checkboxRow(
                isOn: $checkPlacement,
                text: "My phone is placed **beside my pillow or within arm’s reach**."
            )

            checkboxRow(
                isOn: $checkDND,
                text: "My phone is on **Do Not Disturb** and notifications are **silent**."
            )

            checkboxRow(
                isOn: $checkInternet,
                text: "My phone is connected to **Wi-Fi/Mobile Data** throughout the night."
            )
        }
        .padding()
        .background(.thinMaterial)
        .cornerRadius(14)
    }

    private var soundCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "speaker.wave.2.fill")
                    .font(.title3)

                Text("Set your volume")
                    .font(.headline)

                Spacer()
            }

            VStack(alignment: .leading, spacing: 6) {
                bullet("Click on the **Play Test Sound** button below, then manually adjust your phone volume until the sound is just barely perceivable.")
                bullet("When ready, **Stop Test Sound** and Click **Next**.")
            }
            .font(.subheadline)

            if assignedMusic.isEmpty {
                Text("No study cue has been assigned.")
                    .font(.footnote)
                    .foregroundColor(.red)
            }

            Button {
                toggleTestJingle()
            } label: {
                Text(isTestJinglePlaying ? "Stop Test Sound" : "Play Test Sound")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(CommonButtonStyle())
            .disabled(!allChecked || assignedMusic.isEmpty)
            .opacity(allChecked && !assignedMusic.isEmpty ? 1 : 0.5)

            if !allChecked {
                Text("Complete the checklist to enable the test sound.")
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(.thinMaterial)
        .cornerRadius(14)
    }

    private func checkboxRow(
        isOn: Binding<Bool>,
        text: String
    ) -> some View {
        Button {
            isOn.wrappedValue.toggle()
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(
                    systemName: isOn.wrappedValue
                        ? "checkmark.square.fill"
                        : "square"
                )
                .font(.title3)

                Text(.init(text))
                    .font(.subheadline)

                Spacer()
            }
            .contentShape(Rectangle())
            .foregroundColor(.black)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func bullet(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
            Text(.init(text))
        }
    }

    // MARK: - Sound

    private func toggleTestJingle() {
        if isTestJinglePlaying {
            stopTestJingleIfNeeded()
            didStopTestSoundOnce = true
        } else {
            guard !assignedMusic.isEmpty else { return }

            isTestJinglePlaying = true
            didPlayTestSound = true
            cueController.playJingle(resource: assignedMusic)
        }
    }

    private func stopTestJingleIfNeeded() {
        guard isTestJinglePlaying else { return }

        cueController.stop()
        isTestJinglePlaying = false
    }
}
