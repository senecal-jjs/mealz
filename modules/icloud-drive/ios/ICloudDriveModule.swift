import ExpoModulesCore
import Foundation

/// Files in the app's iCloud Drive container (the first one in its
/// entitlements), kept out of sight of the Files app. Paths are relative to
/// the container, e.g. "recipes/my-abc.json". Reads and writes go through
/// NSFileCoordinator, as iCloud requires, and a file that's only in iCloud is
/// downloaded before it's read.
public class ICloudDriveModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ICloudDrive")

    /// Whether iCloud Drive can be used: signed in, and the container exists.
    /// Looking up the container can take a moment, so this runs off the main thread.
    AsyncFunction("isAvailable") { () -> Bool in
      FileManager.default.ubiquityIdentityToken != nil && Self.container() != nil
    }

    AsyncFunction("writeText") { (path: String, text: String) in
      let url = try Self.url(path)
      try Self.makeParent(of: url)
      try Self.coordinate(writing: url) { target in
        try text.write(to: target, atomically: true, encoding: .utf8)
      }
    }

    AsyncFunction("readText") { (path: String) -> String in
      let url = try Self.url(path)
      try Self.download(url)
      var text = ""
      try Self.coordinate(reading: url) { source in
        text = try String(contentsOf: source, encoding: .utf8)
      }
      return text
    }

    /// Copies a local file (a file:// URI) into the container.
    AsyncFunction("copyIn") { (path: String, fromUri: String) in
      guard let source = URL(string: fromUri) else {
        throw Exception(name: "BadUri", description: "Not a file URI: \(fromUri)")
      }
      let url = try Self.url(path)
      try Self.makeParent(of: url)
      try Self.coordinate(writing: url) { target in
        if FileManager.default.fileExists(atPath: target.path) {
          try FileManager.default.removeItem(at: target)
        }
        try FileManager.default.copyItem(at: source, to: target)
      }
    }

    /// Copies a file from the container to a local file (a file:// URI).
    AsyncFunction("copyOut") { (path: String, toUri: String) in
      guard let destination = URL(string: toUri) else {
        throw Exception(name: "BadUri", description: "Not a file URI: \(toUri)")
      }
      let url = try Self.url(path)
      try Self.download(url)
      try FileManager.default.createDirectory(
        at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
      try Self.coordinate(reading: url) { source in
        if FileManager.default.fileExists(atPath: destination.path) {
          try FileManager.default.removeItem(at: destination)
        }
        try FileManager.default.copyItem(at: source, to: destination)
      }
    }

    AsyncFunction("remove") { (path: String) in
      let url = try Self.url(path)
      try Self.coordinate(writing: url, options: .forDeleting) { target in
        if FileManager.default.fileExists(atPath: target.path) {
          try FileManager.default.removeItem(at: target)
        }
      }
    }

    /// The names of the files in a folder, including ones not downloaded yet.
    AsyncFunction("list") { (folder: String) -> [String] in
      let url = try Self.url(folder)
      let names = (try? FileManager.default.contentsOfDirectory(atPath: url.path)) ?? []
      // Files not yet downloaded can appear as ".name.icloud" placeholders.
      return names.compactMap { name in
        if name.hasPrefix(".") && name.hasSuffix(".icloud") {
          return String(name.dropFirst().dropLast(".icloud".count))
        }
        return name.hasPrefix(".") ? nil : name
      }
    }
  }

  private static func container() -> URL? {
    FileManager.default.url(forUbiquityContainerIdentifier: nil)
  }

  private static func url(_ path: String) throws -> URL {
    guard let root = container() else {
      throw Exception(name: "NoICloud", description: "iCloud Drive isn't available")
    }
    // Outside "Documents", so the files don't show in the Files app.
    return root.appendingPathComponent("Backup", isDirectory: true).appendingPathComponent(path)
  }

  private static func makeParent(of url: URL) throws {
    try FileManager.default.createDirectory(
      at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  }

  private static func coordinate(
    writing url: URL, options: NSFileCoordinator.WritingOptions = [],
    _ body: (URL) throws -> Void
  ) throws {
    var coordinationError: NSError?
    var bodyError: Error?
    NSFileCoordinator().coordinate(writingItemAt: url, options: options, error: &coordinationError) {
      target in
      do { try body(target) } catch { bodyError = error }
    }
    if let error = coordinationError ?? bodyError { throw error }
  }

  private static func coordinate(reading url: URL, _ body: (URL) throws -> Void) throws {
    var coordinationError: NSError?
    var bodyError: Error?
    NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) {
      source in
      do { try body(source) } catch { bodyError = error }
    }
    if let error = coordinationError ?? bodyError { throw error }
  }

  /// Starts downloading a file that's only in iCloud and waits up to 30 seconds for it.
  private static func download(_ url: URL) throws {
    let status = try? url.resourceValues(forKeys: [.ubiquitousItemDownloadingStatusKey])
      .ubiquitousItemDownloadingStatus
    if status == nil || status == .current { return }
    try FileManager.default.startDownloadingUbiquitousItem(at: url)
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline {
      var fresh = url
      fresh.removeAllCachedResourceValues()
      let now = try? fresh.resourceValues(forKeys: [.ubiquitousItemDownloadingStatusKey])
        .ubiquitousItemDownloadingStatus
      if now == .current || now == .downloaded { return }
      Thread.sleep(forTimeInterval: 0.25)
    }
    throw Exception(name: "DownloadTimeout", description: "Couldn't download \(url.lastPathComponent)")
  }
}
