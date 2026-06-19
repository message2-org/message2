# Android client (Kotlin + Jetpack Compose)

Native Android app for Message2.

## Open in Android Studio

**Root directory:** `apps/android` (this folder).

Do **not** open `apps/android/app` as the project root — that path is only the `:app` Gradle module.

1. Android Studio → **File → Open…**
2. Select `apps/android` (the folder that contains `settings.gradle.kts` and `gradlew.bat`)
3. **Settings → Build, Execution, Deployment → Build Tools → Gradle**
   - **Gradle JDK:** `jbr-21` (Embedded JDK / JetBrains Runtime 21)
4. Wait for Gradle sync to finish
5. Choose run configuration **app** and start an emulator or device

## Troubleshooting Gradle sync

### `Could not install Gradle distribution … java.io.IOException: Неверная функция`

**This is not a Russia / VPN / geo-blocking issue.** If the network were blocked, you would see timeout, SSL, or HTTP errors — not «Неверная функция».

«Неверная функция» = Windows `Incorrect function`: Java cannot **lock a file** while Gradle unpacks into the cache. Android Studio hits this more often than the terminal because it uses its own Gradle installer with aggressive file locking, and Defender/antivirus may scan `%USERPROFILE%\.gradle` during sync.

**Recommended fix (Windows):**

1. Close Android Studio completely.
2. From PowerShell in this folder, run:

   ```powershell
   .\setup-gradle.ps1
   ```

   This downloads Gradle into `C:\gradle-home` (outside the user profile cache that often triggers the bug).

3. In Android Studio → **Settings → Build, Execution, Deployment → Build Tools → Gradle**:
   - **Gradle user home:** `C:\gradle-home`
   - **Gradle JDK:** `jbr-21`
   - **Use Gradle from:** `Specified location` →  
     `C:\gradle-home\wrapper\dists\gradle-8.9-bin\90cnw93cvbtalezasaz0blq0a\gradle-8.9`
4. Open **`apps/android`** (not `app/`) → **File → Sync Project with Gradle Files**.

If sync still fails, add Windows Defender exclusions for `C:\gradle-home` and `D:\dev\message2\apps\android`, then repeat step 2.

Manual terminal check (should succeed without VPN):

```bat
set GRADLE_USER_HOME=C:\gradle-home
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
cd apps\android
gradlew.bat --version
```

## Phase 3 status (current)

Native Compose shell aligned with `apps/web` colors and layout patterns:

- **Auth** — login/register card, theme toggle, brand logo, session restore
- **Chat list** — search, avatars with hash gradients, unread badges, E2EE label, load from API with mock fallback
- **Chat** — message bubbles, real load/send via API, polling every 4s for near-realtime updates
- **Theme** — dark default (purple accent), light (blue accent)

Backend mode targets messaging service via emulator host bridge (`10.0.2.2`). When backend is unavailable, UI shows errors and falls back to mock data where possible.

## Modules (planned)

- `app`: UI and navigation
- `core-crypto`: key management and local secure storage
- `feature-chat`: chat timeline and message compose
- `feature-media`: media capture and preview

## Security

- Private keys in Android Keystore
- Certificate pinning for API gateway
- Biometric lock support for app unlock
