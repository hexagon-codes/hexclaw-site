import AppKit
import ScreenCaptureKit
import ImageIO
import UniformTypeIdentifiers
import CryptoKit

@main struct CaptureNativeWindow {
    @MainActor static func main() async throws {
        _ = NSApplication.shared
        _ = CGMainDisplayID()
        let appURL = URL(fileURLWithPath: "/Applications/HexClaw.app")
        let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
        let windows = content.windows.filter { window in
            guard window.title == "HexClaw", window.frame.width >= 900,
                  let owner = window.owningApplication,
                  owner.bundleIdentifier == "com.hexclaw.desktop",
                  let running = NSRunningApplication(processIdentifier: owner.processID) else { return false }
            return running.bundleURL == appURL
        }
        guard windows.count == 1, let bundle = Bundle(url: appURL), let binary = bundle.executableURL else {
            throw NSError(domain: "NativeCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: "Expected one visible installed HexClaw window"])
        }
        let window = windows[0]
        if let owner = window.owningApplication, let running = NSRunningApplication(processIdentifier: owner.processID) {
            running.activate(options: [])
            try await Task.sleep(for: .milliseconds(350))
        }
        let filter = SCContentFilter(desktopIndependentWindow: window)
        let configuration = SCStreamConfiguration()
        configuration.width = Int(window.frame.width * 2)
        configuration.height = Int(window.frame.height * 2)
        configuration.showsCursor = false
        configuration.includeChildWindows = false
        configuration.ignoreShadowsSingleWindow = true
        let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: configuration)
        let destinationURL = URL(fileURLWithPath: CommandLine.arguments[1])
        guard let destination = CGImageDestinationCreateWithURL(destinationURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
            throw NSError(domain: "NativeCapture", code: 2)
        }
        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else { throw NSError(domain: "NativeCapture", code: 3) }
        // 来源记录随私有原图保存；官网只发布脱敏后的素材及其校验值。
        let record: [String: Any] = [
            "source": "installed-native-window",
            "captured_at": ISO8601DateFormatter().string(from: Date()),
            "bundle_id": "com.hexclaw.desktop",
            "app_path": appURL.path,
            "app_version": bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown",
            "binary_sha256": SHA256.hash(data: try Data(contentsOf: binary)).map { String(format: "%02x", $0) }.joined(),
            "window_id": window.windowID,
            "width": image.width,
            "height": image.height,
            "sha256": SHA256.hash(data: try Data(contentsOf: destinationURL)).map { String(format: "%02x", $0) }.joined()
        ]
        try JSONSerialization.data(withJSONObject: record, options: [.prettyPrinted, .sortedKeys]).write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
        print("Installed native window captured: \(image.width)×\(image.height)")
    }
}
