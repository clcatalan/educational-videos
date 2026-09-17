//
//  BackendConfig.swift
//

import Foundation

enum BackendConfig {

    // iPhone -> local backend
    static let serverURL = URL(string: "http://192.168.10.133:5001")!
    // Asleep cloud -> backend
    static let asleepWebhookURL = URL(string: "https://platypus-upheaval-uncooked.ngrok-free.dev/api/asleep-webhook")!
    static var apiURL: URL {serverURL.appendingPathComponent("api")}
}
