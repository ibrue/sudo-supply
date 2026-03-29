// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SudoPad",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "SudoPad",
            path: "Sources/SudoPad",
            linkerSettings: [
                .unsafeFlags(["-framework", "Cocoa"]),
                .unsafeFlags(["-framework", "Carbon"]),
                .unsafeFlags(["-framework", "Vision"]),
                .unsafeFlags(["-framework", "ScreenCaptureKit"]),
            ]
        ),
    ]
)
