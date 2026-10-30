import ExpoModulesCore
import Foundation

/// iCloud key-value storage (NSUbiquitousKeyValueStore): a few small strings
/// that follow the user's Apple ID to their other devices and to a reinstall.
/// Without iCloud (signed out, or the entitlement missing) values stay on this
/// device only, which is harmless.
public class ICloudKeyValueModule: Module {
  private var store: NSUbiquitousKeyValueStore { NSUbiquitousKeyValueStore.default }

  public func definition() -> ModuleDefinition {
    Name("ICloudKeyValue")

    OnCreate {
      // Asks iCloud for anything newer than the copy on this device.
      NSUbiquitousKeyValueStore.default.synchronize()
    }

    /// Whether the user is signed in to iCloud.
    Function("isSignedIn") { () -> Bool in
      FileManager.default.ubiquityIdentityToken != nil
    }

    Function("getString") { (key: String) -> String? in
      self.store.string(forKey: key)
    }

    Function("setString") { (key: String, value: String) in
      self.store.set(value, forKey: key)
      self.store.synchronize()
    }

    /// Every string whose key starts with `prefix`.
    Function("entries") { (prefix: String) -> [String: String] in
      var found: [String: String] = [:]
      for (key, value) in self.store.dictionaryRepresentation where key.hasPrefix(prefix) {
        if let text = value as? String { found[key] = text }
      }
      return found
    }
  }
}
