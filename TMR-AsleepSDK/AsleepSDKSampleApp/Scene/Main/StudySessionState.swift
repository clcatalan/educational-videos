//  StudySessionState.swift
//

import Foundation

enum StudySessionState {

    static let progressKeys = [
        StorageKeys.didFinishPreCalibration,
        StorageKeys.didFinishSleep
    ]

    static let loginKeys = [
        StorageKeys.participantId,
        StorageKeys.userId,
        StorageKeys.flow,
        StorageKeys.lectureId,
        StorageKeys.assignedMusic
    ]

    static func resetStudyProgress() {
        for key in progressKeys {
            UserDefaults.standard.set(false, forKey: key)
        }

        print("[StudySessionState] Sleep progress reset")
    }

    static func resetForFreshLaunch() {
        for key in loginKeys {
            UserDefaults.standard.removeObject(forKey: key)
        }

        resetStudyProgress()

        print("[StudySessionState] Fresh launch reset")
    }
}
