import ExpoModulesCore
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Turns text read from a recipe photo into a structured recipe using Apple's
/// on-device language model (Foundation Models, iOS 26+). Runs entirely on the
/// device; nothing is sent anywhere. Callers fall back to a rule-based parser
/// when the model isn't available.
public class RecipeModelModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RecipeModel")

    /// "available", or why not: "unsupportedOS", "deviceNotEligible",
    /// "appleIntelligenceNotEnabled", "modelNotReady" or "unavailable".
    Function("availability") { () -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        return Self.describe(SystemLanguageModel.default.availability)
      }
      #endif
      return "unsupportedOS"
    }

    AsyncFunction("structureRecipe") { (text: String) async throws -> [String: Any] in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        return try await Self.structure(text)
      }
      #endif
      throw Exception(name: "ModelUnavailable", description: "The on-device model needs iOS 26.")
    }
  }

  #if canImport(FoundationModels)
  @available(iOS 26.0, *)
  private static func describe(_ availability: SystemLanguageModel.Availability) -> String {
    switch availability {
    case .available:
      return "available"
    case .unavailable(.deviceNotEligible):
      return "deviceNotEligible"
    case .unavailable(.appleIntelligenceNotEnabled):
      return "appleIntelligenceNotEnabled"
    case .unavailable(.modelNotReady):
      return "modelNotReady"
    case .unavailable:
      return "unavailable"
    }
  }

  /// The model works within a few thousand tokens; a recipe page is well under this.
  private static let maxInputCharacters = 6000

  private static let instructions = """
    You turn text that was read from a photo of a recipe into a structured recipe.
    The text came from OCR: lines may be broken mid-sentence, columns may be \
    interleaved, and there may be clutter such as page numbers or headers. \
    Fix obvious misreadings of measurement units, such as "tosp" for "tbsp". \
    Only use what is in the text: never invent ingredients, amounts or steps.
    """

  @available(iOS 26.0, *)
  private static func structure(_ text: String) async throws -> [String: Any] {
    guard case .available = SystemLanguageModel.default.availability else {
      throw Exception(name: "ModelUnavailable", description: "The on-device model isn't available.")
    }
    let session = LanguageModelSession(instructions: instructions)
    let response = try await session.respond(
      to: "Recipe text:\n\(text.prefix(maxInputCharacters))",
      generating: ScannedRecipe.self,
      options: GenerationOptions(sampling: .greedy)
    )
    let recipe = response.content
    return [
      "title": recipe.title,
      "description": recipe.description,
      "ingredients": recipe.ingredients,
      "steps": recipe.steps,
    ]
  }
  #endif
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
struct ScannedRecipe {
  @Guide(description: "The recipe's name, in title case.")
  var title: String

  @Guide(description: """
    The recipe's short introduction if the page has one, otherwise an empty \
    string. Not the servings or times line.
    """)
  var description: String

  @Guide(description: """
    Every ingredient, one per item, written with its amount first as it appears, \
    for example "2 tbsp olive oil" or "3 cloves garlic, minced". Split combined \
    items like "salt and pepper to taste" into separate items. No section headings.
    """)
  var ingredients: [String]

  @Guide(description: """
    The instructions in order, one item per step, each a complete sentence or \
    paragraph without its step number. Join lines that were broken mid-sentence.
    """)
  var steps: [String]
}
#endif
