using System;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using DrawingForms = System.Windows.Forms;

namespace CloCloWidget;

public partial class MainWindow : Window
{
    private WidgetSettings _settings = WidgetSettings.Load();
    private DrawingForms.NotifyIcon? _trayIcon;
    private DispatcherTimer? _topmostTimer;
    private DateTime _lastMouseDownAt = DateTime.MinValue;
    private static readonly TimeSpan DoubleClickWindow = TimeSpan.FromMilliseconds(450);

    private const int GWL_EXSTYLE = -20;
    private const int WS_EX_TRANSPARENT = 0x00000020;
    private const int WM_NCHITTEST = 0x0084;
    private const int HTTRANSPARENT = -1;
    private static readonly IntPtr HWND_TOPMOST = new(-1);
    private const uint SWP_NOSIZE = 0x0001;
    private const uint SWP_NOMOVE = 0x0002;
    private const uint SWP_NOACTIVATE = 0x0010;

    // Roughly where the avatar + the temperature/location text sit, as a
    // fraction of the window's own size — outside this box (mostly the
    // empty corners) clicks fall through to the desktop instead. Approximate
    // by design: WebView2 renders through its own separate child window, so
    // there's no cheap way to ask "what did that exact pixel's alpha come
    // out to" the way a plain WPF-only visual would allow.
    private const double ContentLeft = 0.12;
    private const double ContentRight = 0.88;
    private const double ContentTop = 0.10;
    private const double ContentBottom = 0.98;

    [DllImport("user32.dll")] private static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")] private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
    [DllImport("user32.dll")] private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT { public int Left, Top, Right, Bottom; }

    private static readonly (string Value, string Label)[] SkyOptions =
    {
        ("auto", "Auto (live)"),
        ("clear", "Clear"),
        ("rain", "Rain"),
        ("snow", "Snow"),
        ("storm", "Storm"),
    };

    public MainWindow()
    {
        InitializeComponent();
        SourceInitialized += MainWindow_SourceInitialized;
        Loaded += MainWindow_Loaded;
        Closing += (_, _) => SaveWindowPosition();
    }

    private void MainWindow_SourceInitialized(object? sender, EventArgs e)
    {
        var hwnd = new WindowInteropHelper(this).Handle;

        var exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
        exStyle &= ~WS_EX_TRANSPARENT; // a different, unwanted click-through flag
        SetWindowLong(hwnd, GWL_EXSTYLE, exStyle);

        HwndSource.FromHwnd(hwnd)?.AddHook(WndProc);
    }

    // Windows asks every window "is this point yours?" via WM_NCHITTEST
    // before delivering a click. Answering HTTRANSPARENT outside the
    // approximate avatar/text box hands that click straight to whatever's
    // behind it on the desktop instead of swallowing it — with a true
    // per-pixel-alpha window there's no colour to key off, so this checks
    // cursor position against the window's own rectangle instead of a pixel
    // colour.
    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WM_NCHITTEST)
        {
            var lp = unchecked((int)lParam.ToInt64());
            var x = unchecked((short)(lp & 0xFFFF));
            var y = unchecked((short)((lp >> 16) & 0xFFFF));

            if (!GetWindowRect(hwnd, out var rect)) return IntPtr.Zero;
            var w = rect.Right - rect.Left;
            var h = rect.Bottom - rect.Top;
            if (w <= 0 || h <= 0) return IntPtr.Zero;

            var relX = (double)(x - rect.Left) / w;
            var relY = (double)(y - rect.Top) / h;
            if (relX < ContentLeft || relX > ContentRight || relY < ContentTop || relY > ContentBottom)
            {
                handled = true;
                return new IntPtr(HTTRANSPARENT);
            }
        }
        return IntPtr.Zero;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        PlaceWindow();
        SetupTrayIcon();

        Topmost = _settings.AlwaysOnTop;
        SetupTopmostTimer();

        await Web.EnsureCoreWebView2Async();
        Web.DefaultBackgroundColor = System.Drawing.Color.Transparent;
        Web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        Web.CoreWebView2.Settings.AreDevToolsEnabled = false;
        Web.CoreWebView2.Settings.IsStatusBarEnabled = false;
        Web.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

        NavigateToWidget();
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

    private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        JsonElement msg;
        try
        {
            msg = JsonDocument.Parse(e.WebMessageAsJson == "null" ? e.TryGetWebMessageAsString() : e.WebMessageAsJson).RootElement;
            if (msg.ValueKind != JsonValueKind.Object)
                msg = JsonDocument.Parse(e.TryGetWebMessageAsString()).RootElement;
        }
        catch
        {
            return;
        }

        var type = msg.TryGetProperty("type", out var t) ? t.GetString() : null;
        var x = msg.TryGetProperty("x", out var xv) ? xv.GetDouble() : Left;
        var y = msg.TryGetProperty("y", out var yv) ? yv.GetDouble() : Top;
        Dispatcher.Invoke(() =>
        {
            switch (type)
            {
                case "dragStart":
                    // Double-click detection lives here, not in the page's own
                    // JS — a right-click wasn't reliably reaching the widget
                    // (see the note by ReassertTopmost), and the same z-order
                    // issue plus DragMove()'s brief blocking call per click
                    // could just as easily throw off the browser's own
                    // dblclick timing. Two mousedowns close enough together
                    // opens the menu instead of just moving the window.
                    var now = DateTime.UtcNow;
                    if (now - _lastMouseDownAt < DoubleClickWindow)
                    {
                        _lastMouseDownAt = DateTime.MinValue;
                        ShowContextMenu(x, y);
                        break;
                    }
                    _lastMouseDownAt = now;
                    try { DragMove(); } catch { /* button already released */ }
                    SaveWindowPosition();
                    break;
                case "contextMenu":
                    ShowContextMenu(x, y);
                    break;
            }
        });
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
        _settings.Save();
    }

    private void ToggleStartWithWindows()
    {
        StartupRegistration.SetEnabled(!StartupRegistration.IsEnabled());
    }

    private void ToggleVisible()
    {
        Visibility = Visibility == Visibility.Visible ? Visibility.Hidden : Visibility.Visible;
    }
}
