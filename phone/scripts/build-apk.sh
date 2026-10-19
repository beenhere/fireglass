#!/usr/bin/env bash
# Builds an installable release APK (arm64, signed with the local debug keystore).
# Output: android/app/build/outputs/apk/release/app-release.apk
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
CI=1 npx expo prebuild --platform android
(cd android && ./gradlew assembleRelease -x lint)
ls -lh android/app/build/outputs/apk/release/app-release.apk
