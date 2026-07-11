# Pin fastlane so the iOS pipeline can't be broken by a silent gem roll-forward.
# Same pin as neon-merge/pochi — 2.236.0 double-base64-decoded the App Store Connect
# .p8 key in the altool upload path (TestFlight error 259); 2.236.1 reverted that fix.
source "https://rubygems.org"

gem "fastlane", "2.236.1"
