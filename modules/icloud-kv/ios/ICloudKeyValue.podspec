Pod::Spec.new do |s|
  s.name           = 'ICloudKeyValue'
  s.version        = '1.0.0'
  s.summary        = 'iCloud key-value storage'
  s.description    = 'Keeps small values, like the scan credit recovery code, in the user’s iCloud for Mealz.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
