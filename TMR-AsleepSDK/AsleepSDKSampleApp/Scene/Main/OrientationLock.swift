//  OrientationLock.swift
//

import UIKit

final class OrientationLock {
    static var mask: UIInterfaceOrientationMask = .portrait

    static func lock(_ mask: UIInterfaceOrientationMask) {
        self.mask = mask
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                    windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: mask)) { error in
                        print("[OrientationLock] geometry update failed: \(error)")
                    }
                    windowScene.keyWindow?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
                }
    }
}
