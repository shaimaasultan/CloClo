using System;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
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

    // Roughly where the avatar + the temperature/location text sit, as an
    // offset/size within the window — this is the rect the separate,
    // genuinely-interactive _avatarWindow covers (see CreateAvatarHitWindow).
    private const double AvatarOffsetX = 18;
    private const double AvatarOffsetY = 21;
    private const double AvatarWidth = 114;
    private const double AvatarHeight = 185;

    [DllImport("user32.dll")] private static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")] private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
    [DllImport("user32.dll")] private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int x, int y, int cx, int cy, uint flags);

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

        NavigateToWidget();
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
