//  PostTrackingView.swift
//

import SwiftUI

struct PostTrackingView: View {

    @Environment(\.openURL) private var openURL

    @AppStorage(StorageKeys.participantId) private var participantId = ""
    @AppStorage(StorageKeys.userId) private var userId = ""
    @AppStorage(StorageKeys.flow) private var flow = ""
    @AppStorage(StorageKeys.lectureId) private var lectureId = 0

    @State private var surveyBaseURL: String?
    @State private var isLoading = true
    @State private var errorMessage: String?

    private var surveyURL: URL? {
        guard let surveyBaseURL else { return nil }

        var components = URLComponents(string: surveyBaseURL)

        var items = components?.queryItems ?? []

        items.append(contentsOf: [
            URLQueryItem(name: "participant_id", value: participantId),
            URLQueryItem(name: "user_id", value: userId),
            URLQueryItem(name: "flow", value: flow),
            URLQueryItem(name: "lecture_id", value: String(lectureId))
        ])

        components?.queryItems = items
        return components?.url
    }

    var body: some View {
        VStack(spacing: 20) {

            Spacer()

            Image(systemName: "sun.max.fill")
                .font(.system(size: 50))

            Text("Good Morning!")
                .font(.title2)
                .bold()

            Text("""
            Your sleep tracking has ended.

            Please proceed to complete the final quiz and post-sleep questionnaire.

            Thank you for participating in the study.
            """)
            .multilineTextAlignment(.center)
            .padding(.horizontal)

            if isLoading {
                ProgressView("Loading survey...")
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            Button {
                guard let surveyURL else { return }

                print("[PostSleep] Opening survey:", surveyURL.absoluteString)
                openURL(surveyURL)

            } label: {
                Text("Open Post-Sleep Survey")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .font(.headline)
            }
            .buttonStyle(.borderedProminent)
            .disabled(surveyURL == nil || isLoading)

            Spacer()
                .frame(height: 30)
        }
        .padding()
        .task {
            await loadSurvey()
        }
    }

    private func loadSurvey() async {
        guard let id = Int(userId) else {
            await MainActor.run {
                errorMessage = "Invalid user ID."
                isLoading = false
            }
            return
        }

        do {
            let study = try await NetLogin.fetchLatestStudy(userId: id)

            await MainActor.run {
                surveyBaseURL = study.quizUrl
                lectureId = study.lectureId
                isLoading = false

                print("[PostSleep] Lecture:", study.lectureId)
                print("[PostSleep] Survey:", study.quizUrl ?? "none")
            }

        } catch {
            await MainActor.run {
                errorMessage = "Unable to load post-sleep survey."
                isLoading = false
            }

            print("[PostSleep] Failed:", error.localizedDescription)
        }
    }
}
