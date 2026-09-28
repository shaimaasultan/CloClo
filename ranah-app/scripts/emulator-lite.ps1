# Starts the Pixel_8 emulator with the smallest memory/CPU footprint that
# still runs CloClo, waits for it to boot, and (optionally) opens the app.
#
#   .\scripts\emulator-lite.ps1              # start + open CloClo dev build
#   .\scripts\emulator-lite.ps1 -NoApp       # just start the emulator
#   .\scripts\emulator-lite.ps1 -Stop        # shut it down
#   .\scripts\emulator-lite.ps1 -Ram 1536    # try even less RAM (MB)
param(
  [string]$Avd = 'Pixel_8',
  [int]$Ram = 2048,
  [int]$Cores = 2,
  [switch]$NoApp,
  [switch]$Stop
)

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$emulator = "$sdk\emulator\emulator.exe"
$adb = "$sdk\platform-tools\adb.exe"

if ($Stop) {
  & $adb emu kill 2>$null | Out-Null
  Start-Sleep 3
  Get-Process qemu-system-x86_64, emulator -ErrorAction SilentlyContinue | Stop-Process -Force
  & $adb kill-server 2>$null
  'Emulator stopped.'
  return
}

# -no-snapshot-load/-save: cold boot every time, so a hung snapshot can never
#   block startup, and no multi-GB snapshot is written on exit.
# -no-audio / -no-boot-anim: less to run.
# -memory / -cores: cap what the guest may take from the PC.
# -gpu swangle_indirect: software rendering, so the emulator doesn't reserve
#   host GPU memory (slower drawing, but far lighter on a RAM-tight PC).
# -netfast: skip network throttling emulation.
$emulatorArgs = @(
  '-avd', $Avd,
  '-memory', $Ram, '-cores', $Cores,
  '-no-snapshot-load', '-no-snapshot-save',
  '-no-audio', '-no-boot-anim',
  '-gpu', 'swangle_indirect',
  '-netfast'
)
Start-Process -FilePath $emulator -ArgumentList $emulatorArgs

'Booting (first cold boot takes 1-3 minutes)...'
$booted = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep 5
  if ((& $adb shell getprop sys.boot_completed 2>$null) -match '1') { $booted = $true; break }
}
if (-not $booted) { 'Did not finish booting - run with -Stop and try again.'; return }
'Booted.'

$p = Get-Process qemu-system-x86_64 -ErrorAction SilentlyContinue
if ($p) { "Emulator memory: $([math]::Round($p.WorkingSet64 / 1MB)) MB" }

if (-not $NoApp) {
  # 10.0.2.2 is the emulator's alias for this PC, where Metro runs (port 8081).
  & $adb shell am start -a android.intent.action.VIEW -d 'cloclo://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081' | Out-Null
  'Opened CloClo. Start Metro first (npx expo start --dev-client) if it shows a launcher screen.'
}
