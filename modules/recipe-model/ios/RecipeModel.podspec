Pod::Spec.new do |s|
  s.name           = 'RecipeModel'
  s.version        = '1.0.0'
  s.summary        = 'On-device recipe structuring with Apple Foundation Models'
  s.description    = 'Structures scanned recipe text with the on-device model on iOS 26+, for Mealz.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # Weak link so the app still launches on iOS versions without the framework.
  s.weak_frameworks = 'FoundationModels'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
