name: Build Android APK (Shadow Legends)

on:
push:
branches:
\- main
\- master
workflow_dispatch:

permissions:
contents: write

jobs:
build-apk:
name: Compile HTML5 Game to Android APK
runs-on: ubuntu-latest

```
steps:
  - name: 1. Checkout Repository
    uses: actions/checkout@v4

  - name: 2. Setup Node.js 20
    uses: actions/setup-node@v4
    with:
      node-version: '20'

  - name: 3. Setup Java JDK 21 (Required by Capacitor 7/8 & Gradle)
    uses: actions/setup-java@v4
    with:
      distribution: 'temurin'
      java-version: '21'

  - name: 4. Setup Android SDK
    uses: android-actions/setup-android@v3

  - name: 5. Prepare Web Assets Directory (www/)
    run: |
      mkdir -p www
      cp index.html www/
      [ -d css ] && cp -r css www/
      [ -d js ] && cp -r js www/
      [ -d assets ] && cp -r assets www/
      [ -f manifest.json ] && cp manifest.json www/ || true
      [ -f sw.js ] && cp sw.js www/ || true

  - name: 6. Initialize Capacitor & Configure Android Project
    run: |
      if [ ! -f package.json ]; then
        npm init -y
      fi
      npm install @capacitor/core @capacitor/cli @capacitor/android

      cat << 'EOF' > capacitor.config.json
      {
        "appId": "com.shadowlegends.fighter16bit",
        "appName": "Shadow Legends",
        "webDir": "www",
        "bundledWebRuntime": false,
        "server": {
          "androidScheme": "https"
        }
      }
      EOF

      if [ ! -d android ]; then
        npx cap add android
      else
        npx cap sync android
      fi

  - name: 7. Force Landscape Orientation & Fullscreen in AndroidManifest.xml
    run: |
      MANIFEST_FILE="android/app/src/main/AndroidManifest.xml"
      if [ -f "$MANIFEST_FILE" ]; then
        sed -i 's/android:name=".MainActivity"/android:name=".MainActivity" android:screenOrientation="sensorLandscape" android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"/g' "$MANIFEST_FILE"
      fi

  - name: 8. Build Android APK with Gradle
    working-directory: ./android
    run: |
      chmod +x gradlew
      ./gradlew assembleDebug
      mkdir -p ../dist
      cp app/build/outputs/apk/debug/app-debug.apk ../dist/Shadow-Legends.apk

  - name: 9. Upload APK as Workflow Artifact
    uses: actions/upload-artifact@v4
    with:
      name: Shadow-Legends-Android-APK
      path: dist/Shadow-Legends.apk
      retention-days: 30

  - name: 10. Publish APK to GitHub Releases (latest-apk)
    uses: softprops/action-gh-release@v2
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    with:
      tag_name: latest-apk
      name: "Shadow Legends Android APK (Auto-Build)"
      body: |
        ### 📲 Unduh Aplikasi Android Shadow Legends (16-Bit Fighter)
        File `Shadow-Legends.apk` di bawah ini dibuat secara otomatis oleh GitHub Actions.
        - **Orientasi:** Landscape Penuh (16:9)
        - **Karakter:** Moopy, Simon, Xeera, Violey
      files: dist/Shadow-Legends.apk
      prerelease: false

```