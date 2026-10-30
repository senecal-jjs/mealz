Pod::Spec.new do |s|
  s.name           = 'ICloudDrive'
  s.version        = '1.0.0'
  s.summary        = 'Files in the app’s iCloud Drive container'
  s.description    = 'Backs up the recipes people add in Mealz to their own iCloud Drive.'
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
