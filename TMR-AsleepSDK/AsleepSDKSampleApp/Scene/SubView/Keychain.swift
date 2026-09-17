//  Keychain.swift
//

import Foundation
import Security

enum Keychain {
    private static let service = Bundle.main.bundleIdentifier ?? "FYP_TMR"
    private static let accountJWT = "app_jwt"

    static func saveJWT(_ token: String) {
        let data = Data(token.utf8)

        // Delete existing
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: accountJWT
        ]
        SecItemDelete(q as CFDictionary)

        // Add new (skip if empty)
        guard !token.isEmpty else { return }
        let add: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: accountJWT,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        SecItemAdd(add as CFDictionary, nil)
    }

    static func readJWT() -> String? {
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: accountJWT,
            kSecReturnData as String: kCFBooleanTrue as Any,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data,
              let token = String(data: data, encoding: .utf8) else { return nil }
        return token
    }

    static func clearJWT() {
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: accountJWT
        ]
        SecItemDelete(q as CFDictionary)
    }
}
