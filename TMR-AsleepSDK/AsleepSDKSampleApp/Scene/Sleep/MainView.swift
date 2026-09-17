//
//  MainView.swift
//

import SwiftUI

struct MainView: View {

    let onSleepFinished: () -> Void

    private let apiKey = Bundle.main.object(forInfoDictionaryKey: "API_KEY") as? String ?? ""

    @AppStorage("sampleapp+baseurl") private var baseUrl = ""
    @StateObject private var viewModel = MainView.ViewModel()

    @State private var startTime: Date?
    @State private var isInitializingConfig = false
    @State private var now = Date()

    var body: some View {
        VStack(spacing: 24) {
            if viewModel.isTracking {
                trackingInProgressView
            } else {
                trackingReadyView
            }

            if let error = viewModel.error {
                Text(error)
                    .font(.footnote)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            Image("AsleepLogo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(height: 50)
        }
        .padding()
        .onTapGesture { endTextEditing() }
        .onReceive(Timer.publish(every: 60, on: .main, in: .common).autoconnect()) {
            now = $0
        }
        .onChange(of: viewModel.config != nil) { _ in
            isInitializingConfig = false
        }
        .onChange(of: viewModel.sessionId) { newValue in
            guard let newValue, !newValue.isEmpty, !viewModel.isTracking else { return }

            print("[SDK TEST] Session closed successfully:", newValue)
            onSleepFinished()
        }
    }
}

private extension MainView {

    var trackingOnOffButton: some View {
        Button(viewModel.isTracking ? "Stop Tracking" : "Start Tracking") {
            viewModel.isTracking
                ? stopTracking()
                : startTracking(hasConfig: viewModel.config != nil)
        }
        .buttonStyle(CommonButtonStyle())
        .disabled(isInitializingConfig)
    }

    func startTracking(hasConfig: Bool) {
        guard !isInitializingConfig else { return }

        guard !apiKey.isEmpty else {
            print("[Asleep] Missing API_KEY in Info.plist")
            return
        }

        viewModel.sessionId = nil
        viewModel.sequenceNumber = nil
        viewModel.error = nil
        startTime = Date()

        print("[SDK TEST] Start Tracking pressed")

        if hasConfig {
            isInitializingConfig = true
            print("[SDK TEST] Existing config found")

            viewModel.trackingManager?.startTracking()
            isInitializingConfig = false
        } else {
            isInitializingConfig = true
            print("[SDK TEST] Creating Asleep config")

            viewModel.initAsleepConfig(
                apiKey: apiKey,
                userId: "",
                baseUrl: baseUrl.isEmpty ? nil : URL(string: baseUrl),
                callbackUrl: BackendConfig.asleepWebhookURL
            )
        }
    }

    func stopTracking() {
        print("[SDK TEST] Stop Tracking requested")

        isInitializingConfig = false
        viewModel.trackingManager?.stopTracking()
    }

    var trackingReadyView: some View {
        VStack(spacing: 16) {
            Text("Are you ready to sleep?")
                .font(.title2)
                .bold()

            Text("""
            This is currently running in Asleep SDK test mode.

            The app will test microphone recording, Asleep session creation and repeated audio uploads.

            Tap Start Tracking, Turn your phone face down and leave it running.
            """)
            .multilineTextAlignment(.center)
            .foregroundColor(.black)

            trackingOnOffButton
        }
    }
    
    var trackingInProgressView: some View {
        VStack(spacing: 20) {

            Text("Sleep Tracking in Progress...")
                .font(.title2)
                .bold()

            if let asleepUserId = viewModel.asleepUserId {
                VStack(spacing: 4) {
                    Text("Asleep User")
                        .font(.caption)
                        .foregroundColor(.black)

                    Text(asleepUserId)
                        .font(.caption2)
                        .multilineTextAlignment(.center)
                }
            }

            if let sequence = viewModel.sequenceNumber {
                VStack(spacing: 4) {
                    Text("Latest Upload Sequence")
                        .font(.caption)
                        .foregroundColor(.black)

                    Text(String(sequence))
                        .font(.system(size: 32, weight: .semibold))
                }
            }

            if let startTime {
                Text("Elapsed time")
                    .font(.subheadline)
                    .foregroundColor(.black)

                Text("\(elapsedMinutes(from: startTime)) min")
                    .font(.system(size: 32, weight: .semibold))
            }

            #if DEBUG
            Button("Inject Stage 2") {
                viewModel.debugInjectStage(2)
            }
            .buttonStyle(CommonButtonStyle())

            Button("Inject Awake") {
                viewModel.debugInjectStage(0)
            }
            .buttonStyle(CommonButtonStyle())
            #endif

            Button("I'm Awake") {
                stopTracking()
            }
            .buttonStyle(CommonButtonStyle())
        }
    }

    func elapsedMinutes(from start: Date) -> Int {
        Int(Date().timeIntervalSince(start) / 60)
    }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
        MainView(onSleepFinished: {})
    }
}
