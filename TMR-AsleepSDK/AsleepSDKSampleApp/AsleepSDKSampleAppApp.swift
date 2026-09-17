//
//  AsleepSDKSampleAppApp.swift
//

import SwiftUI

@main
struct AsleepSDKSampleAppApp: App {

    @UIApplicationDelegateAdaptor(AppDelegate.self)
    private var appDelegate

    init() {
        StudySessionState.resetForFreshLaunch()
    }

    var body: some Scene {
        WindowGroup {
            RootFlowView()
        }
    }
}
