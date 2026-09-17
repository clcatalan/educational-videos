//
//  NetLogin.swift
//

import Foundation

enum NetLoginError: Error, LocalizedError {
    case badURL, badResponse
    case server(status: Int, message: String)
    case decoding(String)

    var errorDescription: String? {
        switch self {
        case .badURL: return "Invalid backend URL."
        case .badResponse: return "Unexpected response from server."
        case .server(let status, let message): return "Server error \(status): \(message)"
        case .decoding(let message): return "Failed to decode response: \(message)"
        }
    }
}

// MARK: - Models

struct AppUser: Decodable {
    let id: Int
    let username: String
    let flow: String?
    let preferredLectureIds: [Int]?
    let preferencesSet: Bool?
    let isAdmin: Bool?
}

struct UserResponse: Decodable { let user: AppUser }
private struct ServerErrorBody: Decodable { let message: String? }

struct Lecture: Decodable {
    let id: Int
    let title: String
    let description, instructor, duration, category, thumbnail: String?
    let videoUrl: String
}

struct QuizLink: Decodable {
    let id, lectureId: Int
    let link: String
}

struct LatestStudy: Decodable {
    let lectureId: Int
    let title: String
    let quizUrl, watchedAt, studyGroup, cueId, cueUrl: String?
}

struct LatestSleepStage: Decodable {
    let sessionId: String
    let seqNum, inferenceSeqNum: Int?
    let sleepStage: Int
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
        case seqNum = "seq_num"
        case inferenceSeqNum = "inference_seq_num"
        case sleepStage = "sleep_stage"
        case createdAt = "created_at"
    }
}

struct LiveSleepReport: Decodable {
    let asleepUserId, sessionId: String?
    let sleepStages: [Int]
    let sleepEfficiency: Double?
    let sleepLatency, wakeupLatency: Int?
    let sleepTime, wakeTime: String?
    let timeInWake, timeInSleep, timeInBed, timeInSleepPeriod: Int
    let timeInRem, timeInLight, timeInDeep: Int
    let wakeRatio, sleepRatio, remRatio, lightRatio, deepRatio: Double?
    let latestStage: Int?
    let sampleCount, intervalSeconds: Int
    let updatedAt: String?
}

private struct LiveSleepStageResponse: Decodable { let liveReport: LiveSleepReport }
private struct FinalizeLiveSleepStageResponse: Decodable { let liveReport: LiveSleepReport }

// MARK: - NetLogin

struct NetLogin {

    private static let baseURL = BackendConfig.apiURL

    // MARK: - Authentication

    static func register(username: String) async throws -> AppUser {
        try await postUsername(path: "auth/register", username: username)
    }

    static func login(username: String) async throws -> AppUser {
        try await postUsername(path: "auth/login", username: username)
    }

    static func loginOrRegister(username: String) async throws -> AppUser {
        do { return try await login(username: username) }
        catch NetLoginError.server(let status, _) where status == 401 {
            return try await register(username: username)
        }
    }

    // MARK: - Study

    static func fetchLatestStudy(userId: Int) async throws -> LatestStudy {
        try decode(LatestStudy.self, from: await sendGET("users/\(userId)/latest-study"))
    }

    // MARK: - Lectures

    static func fetchLectures() async throws -> [Lecture] {
        try decode([Lecture].self, from: await sendGET("lectures"))
    }

    static func fetchLecture(id: Int) async throws -> Lecture {
        try decode(Lecture.self, from: await sendGET("lectures/\(id)"))
    }

    static func fetchLectureQuiz(lectureId: Int) async throws -> QuizLink? {
        let request = URLRequest(url: baseURL.appendingPathComponent("lectures/\(lectureId)/quiz"))
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw NetLoginError.badResponse }
        if http.statusCode == 404 { return nil }
        try validate(http, data: data)
        return try decode(QuizLink.self, from: data)
    }

    // MARK: - Preferences

    static func savePreferences(userId: Int, preferredIds: [Int]) async throws {
        try await sendJSON(
            path: "users/\(userId)/preferences",
            method: "PUT",
            body: ["preferredIds": preferredIds]
        )
    }

    // MARK: - Watched Lectures

    static func recordWatched(userId: Int, lectureId: Int) async throws {
        try await sendJSON(
            path: "users/\(userId)/watched",
            method: "POST",
            body: ["lectureId": lectureId]
        )
    }

    // MARK: - TMR / Asleep

    static func bindAsleepUser(databaseUserId: Int, asleepUserId: String) async throws {
        let url = baseURL.appendingPathComponent("participants/\(databaseUserId)/bind-asleep-user")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["user_id": asleepUserId])

        print("[Bind] POST", url.absoluteString)
        print("[Bind] body user_id =", asleepUserId)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }

        print("[Bind] HTTP", http.statusCode)
        print("[Bind] response:", String(data: data, encoding: .utf8) ?? "")

        guard (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
    }

    static func logJingle(asleepUserId: String, sessionId: String?, seqNum: Int?) {
        let url = baseURL.appendingPathComponent("participants/jingle")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = [
            "user_id": asleepUserId,
            "session_id": sessionId ?? "pending"
        ]
        if let seqNum { body["seq_num"] = seqNum }

        do { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        catch {
            print("[NetLogin] Failed to encode jingle body:", error)
            return
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error {
                print("[NetLogin] Jingle error:", error)
                return
            }

            if let http = response as? HTTPURLResponse,
               !(200..<300).contains(http.statusCode) {
                let text = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
                print("[NetLogin] Jingle HTTP \(http.statusCode):", text)
            }
        }.resume()
    }

    // MARK: - Live Sleep Stage

    static func saveLiveSleepStage(
        asleepUserId: String,
        sessionId: String?,
        sequenceNumber: Int?,
        sleepStage: Int
    ) async throws -> LiveSleepReport {
        var body: [String: Any] = [
            "asleep_user_id": asleepUserId,
            "sleep_stage": sleepStage
        ]

        if let sessionId { body["session_id"] = sessionId }
        if let sequenceNumber {
            body["seq_num"] = sequenceNumber
            body["inference_seq_num"] = sequenceNumber / 10
        }

        let data = try await sendJSON(
            path: "sleep-stage/live",
            method: "POST",
            body: body
        )

        return try decode(LiveSleepStageResponse.self, from: data).liveReport
    }

    static func finalizeLiveSleepStages(
        asleepUserId: String,
        sessionId: String
    ) async throws -> LiveSleepReport {
        let data = try await sendJSON(
            path: "sleep-stage/finalize",
            method: "POST",
            body: [
                "asleep_user_id": asleepUserId,
                "session_id": sessionId
            ]
        )

        return try decode(FinalizeLiveSleepStageResponse.self, from: data).liveReport
    }

    static func fetchLatestSleepStage(asleepUserId: String) async throws -> LatestSleepStage? {
        do {
            return try decode(
                LatestSleepStage.self,
                from: await sendGET("sleep-stage/latest/\(asleepUserId)")
            )
        } catch NetLoginError.server(let status, _) where status == 404 {
            return nil
        }
    }

    static func injectStageTwo(asleepUserId: String) async throws {
        var request = URLRequest(
            url: baseURL
                .appendingPathComponent("sleep-stage/debug-inject")
                .appendingPathComponent(asleepUserId)
        )
        request.httpMethod = "POST"

        let data = try await send(request)
        print("[DEV Sleep Stage] Response:", String(data: data, encoding: .utf8) ?? "")
    }

    // MARK: - Quiz

    static func saveQuiz(
        userId: Int,
        kind: String,
        score: Int,
        startedAt: Date,
        submittedAt: Date,
        answers: [String]
    ) async throws {
        var answersDictionary: [String: String] = [:]
        for (index, answer) in answers.enumerated() {
            answersDictionary[String(format: "q%02d", index + 1)] = answer
        }

        try await sendJSON(
            path: "quiz/\(userId)/\(kind)",
            method: "PUT",
            body: [
                "score": score,
                "startedAt": startedAt.ISO8601Format(),
                "submittedAt": submittedAt.ISO8601Format(),
                "answers": answersDictionary
            ]
        )
    }

    // MARK: - Helpers

    private static func postUsername(path: String, username: String) async throws -> AppUser {
        let data = try await sendJSON(
            path: path,
            method: "POST",
            body: ["username": username]
        )
        return try decode(UserResponse.self, from: data).user
    }

    private static func sendGET(_ path: String) async throws -> Data {
        try await send(URLRequest(url: baseURL.appendingPathComponent(path)))
    }

    @discardableResult
    private static func sendJSON(
        path: String,
        method: String,
        body: Any
    ) async throws -> Data {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await send(request)
    }

    private static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do { return try JSONDecoder().decode(type, from: data) }
        catch { throw NetLoginError.decoding(error.localizedDescription) }
    }

    private static func validate(_ http: HTTPURLResponse, data: Data) throws {
        guard (200..<300).contains(http.statusCode) else {
            let message =
                (try? JSONDecoder().decode(ServerErrorBody.self, from: data))?.message
                ?? String(data: data, encoding: .utf8)
                ?? "Unknown error"

            throw NetLoginError.server(status: http.statusCode, message: message)
        }
    }

    @discardableResult
    private static func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw NetLoginError.badResponse }

        do { try validate(http, data: data) }
        catch {
            if case NetLoginError.server(let status, let message) = error {
                print("[NetLogin] \(request.url?.path ?? "") failed with status \(status): \(message)")
            }
            throw error
        }

        return data
    }
}
