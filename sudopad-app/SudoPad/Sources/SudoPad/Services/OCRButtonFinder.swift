import Cocoa
import Vision

/// Fallback detection method: captures a screenshot of the frontmost window
/// and uses Apple's Vision framework to OCR text, then locates button regions.
///
/// This runs entirely on-device using Apple's built-in ML models.
/// No data leaves the machine.
final class OCRButtonFinder {

    /// Search for a button matching the action using OCR on the frontmost window
    func findButton(for action: PadAction, pid: pid_t) -> ActionResult {
        guard let screenshot = captureWindow(pid: pid) else {
            return .notFound(reason: "Could not capture window screenshot")
        }

        let searchTerms = action.searchTerms.map { $0.lowercased() }

        // Run Vision OCR
        guard let observations = performOCR(on: screenshot) else {
            return .notFound(reason: "OCR failed")
        }

        let imageSize = CGSize(
            width: CGFloat(screenshot.width),
            height: CGFloat(screenshot.height)
        )

        // Find matching text observations
        for observation in observations {
            guard let candidate = observation.topCandidates(1).first else { continue }
            let text = candidate.string.lowercased().trimmingCharacters(in: .whitespaces)

            for term in searchTerms {
                if text == term || text.contains(term) {
                    // Convert Vision coordinates (bottom-left origin, normalized)
                    // to screen coordinates (top-left origin, pixels)
                    let boundingBox = observation.boundingBox
                    let screenPoint = visionToScreenPoint(
                        boundingBox: boundingBox,
                        imageSize: imageSize,
                        pid: pid
                    )

                    if let point = screenPoint {
                        print("[SudoPad] OCR found '\(candidate.string)' at (\(point.x), \(point.y))")
                        return .foundOCR(point: point, method: .ocr)
                    }
                }
            }
        }

        return .notFound(reason: "OCR found no matching text")
    }

    /// Capture the frontmost window of the given PID
    private func captureWindow(pid: pid_t) -> CGImage? {
        // Get the window list for this PID
        let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []

        // Find the first window belonging to our target PID
        for window in windowList {
            guard let windowPID = window[kCGWindowOwnerPID as String] as? pid_t,
                  windowPID == pid,
                  let windowID = window[kCGWindowNumber as String] as? CGWindowID else {
                continue
            }

            // Capture just this window
            if let image = CGWindowListCreateImage(
                .null,
                .optionIncludingWindow,
                windowID,
                [.boundsIgnoreFraming, .nominalResolution]
            ) {
                return image
            }
        }

        return nil
    }

    /// Run Vision OCR on a CGImage
    private func performOCR(on image: CGImage) -> [VNRecognizedTextObservation]? {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false

        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        do {
            try handler.perform([request])
            return request.results
        } catch {
            print("[SudoPad] Vision OCR error: \(error)")
            return nil
        }
    }

    /// Convert Vision bounding box to screen coordinates
    private func visionToScreenPoint(
        boundingBox: CGRect,
        imageSize: CGSize,
        pid: pid_t
    ) -> CGPoint? {
        // Get the window's screen position
        let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []

        for window in windowList {
            guard let windowPID = window[kCGWindowOwnerPID as String] as? pid_t,
                  windowPID == pid,
                  let bounds = window[kCGWindowBounds as String] as? [String: CGFloat] else {
                continue
            }

            let windowX = bounds["X"] ?? 0
            let windowY = bounds["Y"] ?? 0

            // Vision coordinates: origin at bottom-left, normalized 0-1
            // Screen coordinates: origin at top-left, pixels
            let centerX = windowX + boundingBox.midX * imageSize.width
            let centerY = windowY + (1.0 - boundingBox.midY) * imageSize.height

            return CGPoint(x: centerX, y: centerY)
        }

        return nil
    }
}
