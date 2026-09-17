//
//  RootFlowView.swift
//

import SwiftUI

struct RootFlowView: View {

    @AppStorage(StorageKeys.participantId) private var participantId = ""
    @AppStorage(StorageKeys.didFinishPreCalibration) private var didFinishPreCalibration = false
    @AppStorage(StorageKeys.didFinishSleep) private var didFinishSleep = false

    @State private var showLogin = false

    var body: some View {
        let pid = participantId.trimmingCharacters(in: .whitespacesAndNewlines)

        Group {
            if pid.isEmpty {
                Color.clear.onAppear { showLogin = true }
            } else if !didFinishPreCalibration {
                PreCalibrationView { didFinishPreCalibration = true }
            } else if !didFinishSleep {
                MainView { didFinishSleep = true }
            } else {
                PostTrackingView()
            }
        }
        .background(Color(red: 0.29, green: 0.42, blue: 0.58).ignoresSafeArea())
        .foregroundColor(.white)
        .fullScreenCover(isPresented: $showLogin) {
            LoginView()
        }
        .onChange(of: participantId) { newValue in
            showLogin = newValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }
}
