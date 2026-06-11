App Store metadata for GrabURL, consumed by `fastlane deliver` via the `fastlane mac submit` lane.

**WARNING:** Before running `fastlane mac submit`, replace the `<landing-page-url>` placeholder in `en-US/privacy_url.txt` and `en-US/marketing_url.txt` with the confirmed production domain — running the lane first would push the literal placeholder URLs to App Store Connect.

At least one macOS screenshot (1280x800 or 2880x1800 PNG) must be placed in `fastlane/screenshots/en-US/` before final App Store submission.
