import ExpoModulesCore
import UIKit
import Vision

/// Reads printed or handwritten text from a photo, entirely on the device,
/// using Apple's Vision framework, and prepares photos for upload when the
/// user allows cloud scanning.
public class TextRecognitionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TextRecognition")

    /// Returns each recognized line with its bounding box, in image fractions
    /// with the origin at the top left, sorted top to bottom.
    AsyncFunction("recognizeText") { (uri: String) -> [[String: Any]] in
      guard let image = Self.loadImage(uri), let cgImage = image.cgImage else {
        throw Exception(name: "ImageUnreadable", description: "Couldn't open the photo at \(uri)")
      }

      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true
      request.automaticallyDetectsLanguage = true

      let handler = VNImageRequestHandler(
        cgImage: cgImage,
        orientation: CGImagePropertyOrientation(image.imageOrientation),
        options: [:]
      )
      try handler.perform([request])

      let lines: [[String: Any]] = (request.results ?? []).compactMap { observation in
        guard let candidate = observation.topCandidates(1).first else { return nil }
        let box = observation.boundingBox  // Vision's origin is bottom left.
        return [
          "text": candidate.string,
          "confidence": candidate.confidence,
          "x": box.minX,
          "y": 1 - box.maxY,
          "width": box.width,
          "height": box.height,
        ]
      }
      return lines.sorted { ($0["y"] as! CGFloat) < ($1["y"] as! CGFloat) }
    }

    /// Shrinks a photo so its longest edge is at most `maxEdge` pixels, upright,
    /// and returns it as base64 JPEG. Used to upload pages for cloud scanning.
    AsyncFunction("encodeJpeg") { (uri: String, maxEdge: Double, quality: Double) -> String in
      guard let image = Self.loadImage(uri) else {
        throw Exception(name: "ImageUnreadable", description: "Couldn't open the photo at \(uri)")
      }
      let scale = min(1, maxEdge / max(image.size.width, image.size.height))
      let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
      let format = UIGraphicsImageRendererFormat.default()
      format.scale = 1
      // Drawing applies the photo's orientation, so the result is always upright.
      let resized = UIGraphicsImageRenderer(size: size, format: format).image { _ in
        image.draw(in: CGRect(origin: .zero, size: size))
      }
      guard let data = resized.jpegData(compressionQuality: quality) else {
        throw Exception(name: "ImageUnreadable", description: "Couldn't encode the photo.")
      }
      return data.base64EncodedString()
    }
  }

  private static func loadImage(_ uri: String) -> UIImage? {
    if let url = URL(string: uri), url.isFileURL {
      return UIImage(contentsOfFile: url.path)
    }
    return UIImage(contentsOfFile: uri)
  }
}

private extension CGImagePropertyOrientation {
  init(_ orientation: UIImage.Orientation) {
    switch orientation {
    case .up: self = .up
    case .upMirrored: self = .upMirrored
    case .down: self = .down
    case .downMirrored: self = .downMirrored
    case .left: self = .left
    case .leftMirrored: self = .leftMirrored
    case .right: self = .right
    case .rightMirrored: self = .rightMirrored
    @unknown default: self = .up
    }
  }
}
