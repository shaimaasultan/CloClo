# CloClo Desktop Widget

A small always-on-top floating widget for Windows: the Keeper avatar from the
CloClo app, dressed for the real current weather at a location you set,
sitting near your taskbar clock (Windows doesn't allow any app to draw
directly on the system clock itself, so this is the closest a normal app can
get — the bottom-right corner, just above the taskbar).

## Running it

The ready-to-run build is in `publish\CloCloWidget.exe` — just double-click
it. No install, no .NET required (it's self-contained). Windows may show a
SmartScreen prompt the first time since the .exe isn't code-signed; choose
"More info" → "Run anyway".

## Using it

- **Drag** anywhere on the widget to move it. It remembers where you leave it.
- **Right-click** for a menu: set your location, refresh the weather, toggle
  always-on-top, or exit.
- A tray icon (near the clock, in the hidden-icons area) does the same —
  double-click it to show/hide the widget if you ever lose track of it.
- Weather refreshes automatically every 20 minutes, from
  [Open-Meteo](https://open-meteo.com) (no API key, no account).

## Rebuilding from source

```bash
dotnet build
dotnet run
```

To produce another standalone .exe:

```bash
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o ./publish
```

## How it's built

A WPF host window (transparent, borderless, topmost, no taskbar entry) hosts
a `WebView2` control pointed at `Assets/widget.html` — a plain HTML/SVG port
of the app's Keeper avatar (same paths, same weather-conditional clothing:
raincoat, wool hat, sunglasses, storm blanket, held umbrella), with a little
JS that fetches the current temperature and WMO weather code for your saved
location and maps it to the same four sky states (clear/rain/snow/storm) the
app uses. Dragging and the right-click menu are relayed from the page to the
WPF window via `window.chrome.webview.postMessage`, since WebView2 owns all
mouse input within its bounds. Settings (location, window position,
always-on-top) persist to `%AppData%\CloCloWidget\settings.json`.
