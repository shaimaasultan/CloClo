using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Threading;
using DrawingForms = System.Windows.Forms;

namespace CloCloWidget;

public partial class MainWindow : Window
{
    private WidgetSettings _settings = WidgetSettings.Load();
    private DrawingForms.NotifyIcon? _trayIcon;
    private DispatcherTimer? _topmostTimer;
    private Window? _avatarWindow;

    private const int GWL_EXSTYLE = -20;
    private const int WS_EX_TRANSPARENT = 0x00000020;
    private static readonly IntPtr HWND_TOPMOST = new(-1);
    private const uint SWP_NOSIZE = 0x0001;
    private const uint SWP_NOMOVE = 0x0002;
    private const uint SWP_NOACTIVATE = 0x0010;

    // The widget renders at 1.3x (see #stage's zoom in widget.html) — every
    // rect below is the original 150x270-canvas value times that same
    // factor, since WPF (unlike CSS) has no idea the page is zoomed and
    // needs the actual on-screen pixel positions to hit-test correctly.
    private const double Scale = 1.3;

    // Roughly where the avatar + the temperature/location text sit, as an
    // offset/size within the window — this is the rect the separate,
    // genuinely-interactive _avatarWindow covers (see CreateAvatarHitWindow).
    // Widened from a tighter 18/114 so the pause button at the right edge
    // of the now-playing label — see below — actually falls inside it; a
    // rect outside _avatarWindow's own bounds never receives a click at
    // all, it just falls through to the desktop (learned this the hard way
    // with the now-removed switch icon).
    private const double AvatarOffsetX = 10 * Scale;
    private const double AvatarOffsetY = 21 * Scale;
    private const double AvatarWidth = 140 * Scale;
    private const double AvatarHeight = 245 * Scale;

    // The four icon buttons, always visible, in coordinates relative to
    // _avatarWindow (i.e. already minus AvatarOffsetX/Y) — must stay in
    // sync with #mediaBar's layout in widget.html. Clicking one switches
    // what the label below is watching (search shows a picker instead).
    private static readonly Rect YoutubeIconRect = new(14 * Scale, 187 * Scale, 18 * Scale, 20 * Scale);
    private static readonly Rect SpotifyIconRect = new(42 * Scale, 187 * Scale, 18 * Scale, 20 * Scale);
    private static readonly Rect BellIconRect = new(70 * Scale, 187 * Scale, 18 * Scale, 20 * Scale);
    private static readonly Rect SearchIconRect = new(98 * Scale, 187 * Scale, 18 * Scale, 20 * Scale);
    // The pause button inside the label itself — same coordinate space.
    // Only acts while actually watching something (_watchedFetcher is
    // set); otherwise the label (and this button) isn't even shown. Spans
    // the label's full (now two-line) height rather than trying to track
    // exactly where the button glyph sits within it.
    private static readonly Rect PauseIconRect = new(116 * Scale, 211 * Scale, 22 * Scale, 34 * Scale);
    // The list button, notifications only — opens Windows' own flyout
    // (the full list) instead of launching an app. Sits just left of the
    // pause button; only meaningful while _watchingNotifications, but
    // harmless to check unconditionally since the label isn't shown at
    // all when nothing's being watched.
    private static readonly Rect ListIconRect = new(96 * Scale, 211 * Scale, 20 * Scale, 34 * Scale);
    // The rest of the label (icon/note + both text lines) — clicking there
    // opens the app. Checked after PauseIconRect/ListIconRect, which it
    // overlaps, so those rects' clicks are claimed first.
    private static readonly Rect LabelBodyRect = new(0, 211 * Scale, 137 * Scale, 34 * Scale);

    private static readonly string[] YoutubeAumids = { "edge", "chrome" };
    private static readonly string[] SpotifyAumids = { "spotify" };

    // Whatever the label is currently following — set by clicking an icon,
    // kept live by _nowPlayingTimer until it actually stops (rather than a
    // timed popup that hides itself regardless of whether it's still
    // relevant), or until the pause button stops it explicitly. A plain
    // fetcher delegate so the same watch/poll/pause machinery works for
    // both "what's playing in this app" and "the latest notification".
    // Icon is a data: URI (notifications only — media has none) or null.
    private Func<Task<(string Title, string Subtitle, string? Icon, string? AppUserModelId)?>>? _watchedFetcher;
    private string? _watchedAppUserModelId;
    // Notifications aren't really "one app" the way media is — the label
    // shows only the latest of possibly several, so clicking it opens
    // Windows' own notification flyout (the full list) rather than
    // launching whatever app happened to send the latest one.
    private bool _watchingNotifications;
    private DispatcherTimer? _nowPlayingTimer;

    [DllImport("user32.dll")] private static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")] private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
    [DllImport("user32.dll")] private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    private const byte VK_LWIN = 0x5B;
    private const byte VK_N = 0x4E;
    private const uint KEYEVENTF_KEYUP = 0x0002;

    private static readonly (string Value, string Label)[] SkyOptions =
    {
        ("auto", "Auto (live)"),
        ("clear", "Clear"),
        ("cloudy", "Cloudy"),
        ("windy", "Windy"),
        ("fog", "Fog"),
        ("rain", "Rain"),
        ("snow", "Snow"),
        ("storm", "Storm"),
    };

    public MainWindow()
    {
        InitializeComponent();
        SourceInitialized += MainWindow_SourceInitialized;
        Loaded += MainWindow_Loaded;
        Closing += (_, _) =>
        {
            SaveWindowPosition();
            _avatarWindow?.Close();
        };
    }

    // This window is purely a visual layer now — every click passes
    // straight through it (WS_EX_TRANSPARENT) to whatever's behind it on
    // the desktop. The only thing that's ever actually clickable is the
    // separate _avatarWindow created in CreateAvatarHitWindow, so there's
    // no WM_NCHITTEST guesswork about pixel colours or fractional boxes:
    // a plain, ordinary, fully hit-testable window either is or isn't
    // under the cursor.
    private void MainWindow_SourceInitialized(object? sender, EventArgs e)
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        var exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
        exStyle |= WS_EX_TRANSPARENT;
        SetWindowLong(hwnd, GWL_EXSTYLE, exStyle);
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        PlaceWindow();
        SetupTrayIcon();
        CreateAvatarHitWindow();

        Topmost = _settings.AlwaysOnTop;
        SetupTopmostTimer();

        await Web.EnsureCoreWebView2Async();
        Web.DefaultBackgroundColor = System.Drawing.Color.Transparent;
        Web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        Web.CoreWebView2.Settings.AreDevToolsEnabled = false;
        Web.CoreWebView2.Settings.IsStatusBarEnabled = false;
        // Every NavigateToWidget() call (Refresh weather, a location or sky
        // change) reloads the page from scratch, dropping whatever label
        // was showing. Push a fresh one once the new page is actually ready,
        // rather than relying on "did it change" — from the host's side
        // nothing changed, but the page lost it regardless.
        Web.CoreWebView2.NavigationCompleted += (_, _) => _ = RefreshWatched();

        NavigateToWidget();
    }

    // "Current session" (tried first) turned out to be Windows' own guess
    // at what's relevant — whichever app last had media-key focus — which
    // could stick to a browser tab that wasn't even playing anymore instead
    // of actually-playing Spotify. Clicking an icon instead asks about one
    // specific thing, and keeps watching it — the label stays up for as
    // long as it's still relevant, and disappears once it actually isn't,
    // rather than hiding itself after a fixed delay regardless.
    private void WatchApp(string[] aumidMatches)
    {
        _watchingNotifications = false;
        Watch(async () =>
        {
            var info = await NowPlaying.GetForAppAsync(aumidMatches);
            return info is { } np ? (np.Title, np.Artist, (string?)null, (string?)np.AppUserModelId) : ((string, string, string?, string?)?)null;
        });
    }

    private void WatchNotifications()
    {
        _watchingNotifications = true;
        Watch(async () =>
        {
            var n = await NotificationWatcher.GetLatestAsync();
            return n is { } latest ? ($"{latest.AppName}: {latest.Title}", latest.Body, latest.IconDataUri, latest.AppUserModelId) : ((string, string, string?, string?)?)null;
        });
    }

    private void Watch(Func<Task<(string Title, string Subtitle, string? Icon, string? AppUserModelId)?>> fetcher)
    {
        _watchedFetcher = fetcher;
        _nowPlayingTimer ??= CreateNowPlayingTimer();
        _nowPlayingTimer.Start(); // idempotent — resumes it if the pause button stopped it earlier
        _ = RefreshWatched();
    }

    // The pause button inside the label itself, not a fourth icon — stops
    // polling immediately and hides the label, rather than waiting for the
    // next 4s tick to notice "nothing" on its own.
    private void StopWatching()
    {
        _watchedFetcher = null;
        _watchedAppUserModelId = null;
        _nowPlayingTimer?.Stop();
        try { Web.CoreWebView2?.PostWebMessageAsJson("{\"type\":\"nowPlaying\",\"title\":null,\"artist\":null,\"icon\":null}"); } catch { }
    }

    // Clicking the label body (anywhere but the pause/list buttons)
    // launches whichever app it's showing — media or notification alike —
    // using the AUMID captured from the last successful poll rather than
    // re-querying on click.
    private void OpenWatchedApp() => AppLauncher.TryActivate(_watchedAppUserModelId);

    // The list button, notifications only — opens the full list instead
    // of launching just the one app that sent the latest notification.
    // Win+N is the standard shortcut for Windows' notification flyout on
    // both Windows 10 and 11 — simulating it is simpler and more robust
    // than trying to activate the flyout's own host process by AUMID.
    private void OpenNotificationFlyout()
    {
        keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
        keybd_event(VK_N, 0, 0, UIntPtr.Zero);
        keybd_event(VK_N, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    // Two sections: apps that currently hold a media session (▶, same as
    // before — YouTube/Spotify are just two hardcoded guesses at this same
    // list), and below a separator, every other currently-running app
    // (from RunningApps.List(), the same visible-window set Alt-Tab shows)
    // in case what the user's after isn't playing anything (yet), or isn't
    // media at all — picking one still watches it, and also brings it to
    // the foreground right away so clicking it always does *something*
    // visible even if it never reports a track.
    private async void ShowAppPicker(double screenX, double screenY)
    {
        var menu = new DrawingForms.ContextMenuStrip();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var manager = await Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
            foreach (var session in manager.GetSessions())
            {
                var aumid = session.SourceAppUserModelId;
                if (string.IsNullOrWhiteSpace(aumid) || !seen.Add(aumid)) continue;

                var label = aumid;
                try
                {
                    var appInfo = Windows.ApplicationModel.AppInfo.GetFromAppUserModelId(aumid);
                    if (!string.IsNullOrWhiteSpace(appInfo?.DisplayInfo?.DisplayName)) label = appInfo.DisplayInfo.DisplayName;
                }
                catch { /* fall back to the raw AUMID */ }

                var playing = session.GetPlaybackInfo()?.PlaybackStatus
                    == Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing;
                var itemText = playing ? $"▶ {label}" : label;
                var match = aumid; // capture for the closure below
                menu.Items.Add(itemText, null, (_, _) => WatchApp(new[] { match }));
            }
        }
        catch { /* leave the "playing" section empty/fallback below */ }

        try
        {
            var running = RunningApps.List();
            if (running.Count > 0 && menu.Items.Count > 0)
            {
                menu.Items.Add(new DrawingForms.ToolStripSeparator());
            }
            foreach (var app in running)
            {
                // Most plain Win32 apps never register an AUMID, so this
                // is often null — dedupe against the "playing" section by
                // AUMID when there is one, otherwise nothing to collide
                // with, so just show it.
                if (app.AppUserModelId != null && !seen.Add(app.AppUserModelId)) continue;
                var aumid = app.AppUserModelId;
                var hwnd = app.WindowHandle;
                menu.Items.Add(app.Title, null, (_, _) =>
                {
                    if (aumid != null)
                    {
                        WatchApp(new[] { aumid });
                        AppLauncher.TryActivate(aumid);
                    }
                    else
                    {
                        // No AUMID to watch media through — just bring it
                        // to the foreground directly via its window handle.
                        RunningApps.Activate(hwnd);
                    }
                });
            }
        }
        catch { /* leave the "running" section empty */ }

        if (menu.Items.Count == 0)
        {
            menu.Items.Add("Nothing found to watch", null, (_, _) => { }).Enabled = false;
        }
        menu.Show(new System.Drawing.Point((int)Math.Round(screenX), (int)Math.Round(screenY)));
    }

    private DispatcherTimer CreateNowPlayingTimer()
    {
        var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(4) };
        timer.Tick += async (_, _) => await RefreshWatched();
        timer.Start();
        return timer;
    }

    private async Task RefreshWatched()
    {
        if (_watchedFetcher == null) return;
        var result = await _watchedFetcher();
        _watchedAppUserModelId = result?.AppUserModelId;
        var json = result is { } r
            ? $"{{\"type\":\"nowPlaying\",\"title\":{JsonSerializer.Serialize(r.Title)},\"artist\":{JsonSerializer.Serialize(r.Subtitle)},\"icon\":{JsonSerializer.Serialize(r.Icon)},\"isNotification\":{(_watchingNotifications ? "true" : "false")}}}"
            : "{\"type\":\"nowPlaying\",\"title\":null,\"artist\":null,\"icon\":null,\"isNotification\":false}";
        try { Web.CoreWebView2?.PostWebMessageAsJson(json); } catch { /* page not ready yet */ }
    }

    // A second, genuinely interactive window, invisible and sized to
    // roughly the character + its temperature/location text, sitting on
    // top of the (click-through) render window. It owns dragging and the
    // right-click/double-click menu directly via normal WPF mouse events —
    // no WebView2 message relay needed, since WebView2 never sees mouse
    // input at all once the parent is WS_EX_TRANSPARENT.
    private void CreateAvatarHitWindow()
    {
        _avatarWindow = new Window
        {
            Owner = this,
            WindowStyle = WindowStyle.None,
            AllowsTransparency = true,
            // Alpha must be non-zero, or this layered window becomes fully
            // click-through at the OS/DWM level regardless of any hit-test
            // logic — WPF's Brushes.Transparent is alpha 0 and was silently
            // swallowing every click (confirmed via WindowFromPoint missing
            // this window entirely, even dead-centre). 1/255 is visually
            // invisible but non-zero, so the whole window stays hit-testable.
            Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromArgb(1, 0, 0, 0)),
            ShowInTaskbar = false,
            ResizeMode = ResizeMode.NoResize,
            Topmost = _settings.AlwaysOnTop,
            Width = AvatarWidth,
            Height = AvatarHeight,
            Left = Left + AvatarOffsetX,
            Top = Top + AvatarOffsetY,
        };
        _avatarWindow.PreviewMouseLeftButtonDown += AvatarWindow_MouseLeftButtonDown;
        _avatarWindow.MouseRightButtonUp += (_, _) => ShowContextMenuAtCursor();
        _avatarWindow.LocationChanged += (_, _) =>
        {
            Left = _avatarWindow.Left - AvatarOffsetX;
            Top = _avatarWindow.Top - AvatarOffsetY;
        };
        _avatarWindow.Show();
    }

    private void AvatarWindow_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        var p = e.GetPosition(_avatarWindow);
        if (YoutubeIconRect.Contains(p))
        {
            WatchApp(YoutubeAumids);
            return;
        }
        if (SpotifyIconRect.Contains(p))
        {
            WatchApp(SpotifyAumids);
            return;
        }
        if (BellIconRect.Contains(p))
        {
            WatchNotifications();
            return;
        }
        if (SearchIconRect.Contains(p))
        {
            // Plain arithmetic rather than _avatarWindow.PointToScreen(p) or
            // a separate DrawingForms.Cursor.Position read — both of those
            // returned distorted/stale values during testing (confirmed via
            // logging: Left/Top and p were individually correct, but
            // PointToScreen's result was nowhere near their sum), while
            // Left/Top and GetPosition share the same DIU coordinate space
            // for this plain, untransformed window, so adding them directly
            // is both simpler and the one that's actually been verified.
            ShowAppPicker(_avatarWindow!.Left + p.X, _avatarWindow.Top + p.Y);
            return;
        }
        if (PauseIconRect.Contains(p) && _watchedFetcher != null)
        {
            StopWatching();
            return;
        }
        if (ListIconRect.Contains(p) && _watchedFetcher != null && _watchingNotifications)
        {
            OpenNotificationFlyout();
            return;
        }
        if (LabelBodyRect.Contains(p) && _watchedFetcher != null && _watchedAppUserModelId != null)
        {
            OpenWatchedApp();
            return;
        }

        if (e.ClickCount >= 2)
        {
            ShowContextMenuAtCursor();
            return;
        }
        try { _avatarWindow!.DragMove(); } catch { /* button already released */ }
        SaveWindowPosition();
    }

    private void ShowContextMenuAtCursor()
    {
        var p = DrawingForms.Cursor.Position;
        ShowContextMenu(p.X, p.Y);
    }

    // A window being marked "topmost" does not always mean it stays visually
    // and interactively above every other app — when another app's window
    // becomes the active/foreground window (which happens constantly if
    // that's whatever you're actually using), Windows can end up rendering
    // and hit-testing that foreground window above a topmost-but-inactive
    // one anyway, even over areas the foreground window doesn't visually
    // occupy. Re-asserting HWND_TOPMOST every couple of seconds — a
    // well-worn trick among "always on top" utility apps — wins the widget
    // back its spot instead of it silently going dead to clicks.
    private void SetupTopmostTimer()
    {
        _topmostTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
        _topmostTimer.Tick += (_, _) => ReassertTopmost();
        _topmostTimer.Start();
        ReassertTopmost();
    }

    private void ReassertTopmost()
    {
        if (!_settings.AlwaysOnTop) return;
        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd != IntPtr.Zero)
        {
            SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE);
        }
        // Reasserted second so it lands in front of the (also topmost) render
        // window — it's the one that actually needs to catch the click.
        if (_avatarWindow != null)
        {
            var avatarHwnd = new WindowInteropHelper(_avatarWindow).Handle;
            if (avatarHwnd != IntPtr.Zero)
            {
                SetWindowPos(avatarHwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE);
            }
        }
    }

    private void NavigateToWidget()
    {
        var assetsDir = Path.Combine(AppContext.BaseDirectory, "Assets");
        var htmlPath = Path.Combine(assetsDir, "widget.html");
        var query =
            $"?lat={_settings.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
            $"&lon={_settings.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
            $"&city={Uri.EscapeDataString(_settings.City)}" +
            $"&sky={Uri.EscapeDataString(_settings.Sky)}";
        Web.CoreWebView2.Navigate(new Uri(htmlPath).AbsoluteUri + query);
    }

    private void PlaceWindow()
    {
        if (_settings.WindowLeft is double left && _settings.WindowTop is double top)
        {
            Left = left;
            Top = top;
            return;
        }
        // Default spot: bottom-right corner, just above the taskbar — as close
        // to "on top of the clock" as Windows actually allows an app to sit.
        var area = SystemParameters.WorkArea;
        Left = area.Right - Width - 16;
        Top = area.Bottom - Height - 16;
    }

    private void SaveWindowPosition()
    {
        _settings.WindowLeft = Left;
        _settings.WindowTop = Top;
        _settings.Save();
    }

    private void SetupTrayIcon()
    {
        _trayIcon = new DrawingForms.NotifyIcon
        {
            Icon = System.Drawing.SystemIcons.Application,
            Visible = true,
            Text = "CloClo weather",
        };
        _trayIcon.DoubleClick += (_, _) => ToggleVisible();
        _trayIcon.ContextMenuStrip = BuildMenu(includeShowHide: true);
    }

    // Shown two ways: as the tray icon's menu (Windows positions it near the
    // tray automatically), and via .Show(Point) at the cursor for a
    // right-click on the widget itself — a WPF ContextMenu popup turned out
    // to be unreliable on this window (AllowsTransparency + a WebView2's own
    // native child window both interfere with WPF's popup placement), so
    // both paths share this one WinForms menu instead.
    private DrawingForms.ContextMenuStrip BuildMenu(bool includeShowHide)
    {
        var menu = new DrawingForms.ContextMenuStrip();
        if (includeShowHide)
        {
            menu.Items.Add("Show / hide", null, (_, _) => ToggleVisible());
        }
        menu.Items.Add("Set location…", null, (_, _) => OpenLocationDialog());
        menu.Items.Add(BuildSkyMenu());
        menu.Items.Add("Refresh weather", null, (_, _) => NavigateToWidget());
        var topMost = new DrawingForms.ToolStripMenuItem("Always on top", null, (_, _) => ToggleAlwaysOnTop()) { Checked = _settings.AlwaysOnTop };
        menu.Items.Add(topMost);
        var startup = new DrawingForms.ToolStripMenuItem("Start with Windows", null, (_, _) => ToggleStartWithWindows()) { Checked = StartupRegistration.IsEnabled() };
        menu.Items.Add(startup);
        menu.Items.Add(new DrawingForms.ToolStripSeparator());
        menu.Items.Add("Exit", null, (_, _) => System.Windows.Application.Current.Shutdown());
        return menu;
    }

    private DrawingForms.ToolStripMenuItem BuildSkyMenu()
    {
        var weather = new DrawingForms.ToolStripMenuItem("Weather");
        var items = SkyOptions
            .Select(opt => new DrawingForms.ToolStripMenuItem(opt.Label) { Checked = _settings.Sky == opt.Value })
            .ToArray();
        for (int i = 0; i < items.Length; i++)
        {
            var value = SkyOptions[i].Value;
            items[i].Click += (_, _) =>
            {
                SetSky(value);
                foreach (var it in items) it.Checked = false;
                items[Array.FindIndex(SkyOptions, o => o.Value == value)].Checked = true;
            };
            weather.DropDownItems.Add(items[i]);
        }
        return weather;
    }

    private void SetSky(string sky)
    {
        _settings.Sky = sky;
        _settings.Save();
        NavigateToWidget();
    }

    private void ShowContextMenu(double screenX, double screenY)
    {
        var menu = BuildMenu(includeShowHide: false);
        menu.Show(new System.Drawing.Point((int)Math.Round(screenX), (int)Math.Round(screenY)));
    }

    private void OpenLocationDialog()
    {
        var dialog = new LocationDialog(_settings.City) { Owner = this };
        if (dialog.ShowDialog() == true)
        {
            _settings.City = dialog.ResolvedCity;
            _settings.Latitude = dialog.ResolvedLat;
            _settings.Longitude = dialog.ResolvedLon;
            _settings.Save();
            NavigateToWidget();
        }
    }

    private void ToggleAlwaysOnTop()
    {
        _settings.AlwaysOnTop = !_settings.AlwaysOnTop;
        Topmost = _settings.AlwaysOnTop;
        if (_avatarWindow != null) _avatarWindow.Topmost = _settings.AlwaysOnTop;
        _settings.Save();
    }

    private void ToggleStartWithWindows()
    {
        StartupRegistration.SetEnabled(!StartupRegistration.IsEnabled());
    }

    private void ToggleVisible()
    {
        Visibility = Visibility == Visibility.Visible ? Visibility.Hidden : Visibility.Visible;
        if (_avatarWindow != null) _avatarWindow.Visibility = Visibility;
    }
}
