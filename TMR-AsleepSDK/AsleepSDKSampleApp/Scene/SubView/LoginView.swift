//
//  LoginView.swift
//

import SwiftUI

@available(iOS 15.0, *)
struct LoginView: View {

    @Environment(\.dismiss) private var dismiss
    @State private var username = ""
    @State private var isSubmitting = false
    @State private var errorMsg: String?

    @AppStorage(StorageKeys.participantId) private var storedParticipantId = ""
    @AppStorage(StorageKeys.userId) private var storedUserId = ""
    @AppStorage(StorageKeys.flow) private var storedFlow = ""
    @AppStorage(StorageKeys.lectureId) private var storedLectureId = 0
    @AppStorage(StorageKeys.assignedMusic) private var storedAssignedMusic = ""

    private var trimmedUsername: String {
        username.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Participant Login")) {
                    TextField("Username", text: $username)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                }

                Button {
                    Task { await submit() }
                } label: {
                    isSubmitting ? AnyView(ProgressView()) : AnyView(Text("Login"))
                }
                .buttonStyle(CommonButtonStyle())
                .disabled(isSubmitting || trimmedUsername.isEmpty)
                .opacity(trimmedUsername.isEmpty ? 0.45 : 1)
                .listRowBackground(Color.clear)

                if let errorMsg {
                    Text(errorMsg).foregroundColor(.red)
                }
            }
            .scrollContentBackground(.hidden)
            .background(
                Color(red: 0.29, green: 0.42, blue: 0.58)
                    .ignoresSafeArea()
            )
            .navigationTitle("Login")
        }
        .navigationViewStyle(.stack)
    }

    private func submit() async {
        isSubmitting = true
        errorMsg = nil
        defer { isSubmitting = false }

        do {
            let user = try await NetLogin.login(username: trimmedUsername)
            let study = try await NetLogin.fetchLatestStudy(userId: user.id)

            guard let flow = study.studyGroup,
                  flow == "TMR" || flow == "CONTROL"
            else {
                errorMsg = "Participant study group was not assigned."
                return
            }

            guard let cueUrl = study.cueUrl,
                  let url = URL(string: cueUrl)
            else {
                errorMsg = "No study cue was assigned to this participant."
                return
            }

            let cueResource = url.deletingPathExtension().lastPathComponent

            guard !cueResource.isEmpty else {
                errorMsg = "Invalid study cue."
                return
            }

            storedParticipantId = user.username
            storedUserId = String(user.id)
            storedFlow = flow
            storedLectureId = study.lectureId
            storedAssignedMusic = cueResource

            print("[Login] participant_id =", storedParticipantId)
            print("[Login] user_id =", storedUserId)
            print("[Login] flow =", storedFlow)
            print("[Login] lecture_id =", storedLectureId)
            print("[Login] cue_id =", study.cueId ?? "nil")
            print("[Login] cue_url =", cueUrl)
            print("[Login] assigned_music =", storedAssignedMusic)

            StudySessionState.resetStudyProgress()
            dismiss()

        } catch NetLoginError.server(let status, let message) {
            print("[Login] Server \(status):", message)

            errorMsg = status == 404
                ? "No completed study session was found for this enrolment code."
                : "Unable to retrieve study information."

        } catch {
            print("[Login] Failed:", error.localizedDescription)
            errorMsg = "Unable to log in."
        }
    }
}
