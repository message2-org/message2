# Bootstrap Gradle for Android Studio on Windows.
# Run once before the first Gradle sync if you see:
#   java.io.IOException: Incorrect function / Неверная функция
#
# This is NOT a geo/VPN issue — Gradle downloads fine; Windows file locking
# during Android Studio sync is the usual cause.

$ErrorActionPreference = "Stop"

$GradleHome = "C:\gradle-home"
$Jbr = "C:\Program Files\Android\Android Studio\jbr"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path "$Jbr\bin\java.exe")) {
    Write-Error "Android Studio JBR not found at: $Jbr"
}

New-Item -ItemType Directory -Force -Path $GradleHome | Out-Null

$env:GRADLE_USER_HOME = $GradleHome
$env:JAVA_HOME = $Jbr

Push-Location $ProjectRoot
try {
    Write-Host "Installing Gradle wrapper distribution into $GradleHome ..."
    & .\gradlew.bat --version
    if ($LASTEXITCODE -ne 0) {
        throw "gradlew --version failed with exit code $LASTEXITCODE"
    }
    Write-Host ""
    Write-Host "OK. Next in Android Studio:"
    Write-Host "  Settings -> Build, Execution, Deployment -> Build Tools -> Gradle"
    Write-Host "  Gradle user home: $GradleHome"
    Write-Host "  Gradle JDK: jbr-21"
    Write-Host "  Use Gradle from: Specified location ->"
    $dist = Get-ChildItem "$GradleHome\wrapper\dists\gradle-8.9-bin\*\gradle-8.9" -Directory | Select-Object -First 1
    if ($dist) {
        Write-Host "    $($dist.FullName)"
    }
    Write-Host "Then: File -> Sync Project with Gradle Files"
}
finally {
    Pop-Location
}
