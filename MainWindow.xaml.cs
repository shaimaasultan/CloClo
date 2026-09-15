using System;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Input;
using Microsoft.Web.WebView2.Core;
using DrawingForms = System.Windows.Forms;
using ContextMenu = System.Windows.Controls.ContextMenu;
using MenuItem = System.Windows.Controls.MenuItem;
using Separator = System.Windows.Controls.Separator;

namespace CloCloWidget;

public partial class MainWindow : Window
{
    private WidgetSettings _settings = WidgetSettings.Load();
    private DrawingForms.NotifyIcon? _trayIcon;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        Closing += (_, _) => SaveWindowPosition();
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        PlaceWindow();
        SetupTrayIcon();

        Topmost = _settings.AlwaysOnTop;

        await Web.EnsureCoreWebView2Async();
        // WebView2 is a native windowed control that paints its own opaque
        // background by default, regardless of the host WPF window's
        // AllowsTransparency — without this, the widget shows as a plain
        // white rectangle instead of a floating avatar.
        Web.DefaultBackgroundColor = System.Drawing.Color.Transparent;
        Web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        Web.CoreWebView2.Settings.AreDevToolsEnabled = false;
        Web.CoreWebView2.Settings.IsStatusBarEnabled = false;
        Web.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

        NavigateToWidget();
    }

    private void NavigateToWidget()
    {
        var assetsDir = Path.Combine(AppContext.BaseDirectory, "Assets");
        var htmlPath = Path.Combine(assetsDir, "widget.html");
        var query =
            $"?lat={_settings.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
            $"&lon={_settings.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}" +
            $"&city={Uri.EscapeDataString(_settings.City)}";
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
        Dispatcher.Invoke(() =>
        {
            switch (type)
            {
                case "dragStart":
                    try { DragMove(); } catch { /* button already released */ }
                    SaveWindowPosition();
                    break;
                case "contextMenu":
                    var x = msg.TryGetProperty("x", out var xv) ? xv.GetDouble() : Left;
                    var y = msg.TryGetProperty("y", out var yv) ? yv.GetDouble() : Top;
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

        var menu = new DrawingForms.ContextMenuStrip();
        menu.Items.Add("Show / hide", null, (_, _) => ToggleVisible());
        menu.Items.Add("Set location…", null, (_, _) => OpenLocationDialog());
        var topMost = new DrawingForms.ToolStripMenuItem("Always on top", null, (_, _) => ToggleAlwaysOnTop()) { Checked = _settings.AlwaysOnTop };
        menu.Items.Add(topMost);
        var startup = new DrawingForms.ToolStripMenuItem("Start with Windows", null, (_, _) => ToggleStartWithWindows()) { Checked = StartupRegistration.IsEnabled() };
        menu.Items.Add(startup);
        menu.Items.Add(new DrawingForms.ToolStripSeparator());
        menu.Items.Add("Exit", null, (_, _) => System.Windows.Application.Current.Shutdown());
        _trayIcon.ContextMenuStrip = menu;
    }

    private void ShowContextMenu(double screenX, double screenY)
    {
        var menu = new ContextMenu();
        var setLocation = new MenuItem { Header = "Set location…" };
        setLocation.Click += (_, _) => OpenLocationDialog();
        var refresh = new MenuItem { Header = "Refresh weather" };
        refresh.Click += (_, _) => NavigateToWidget();
        var alwaysOnTop = new MenuItem { Header = "Always on top", IsCheckable = true, IsChecked = _settings.AlwaysOnTop };
        alwaysOnTop.Click += (_, _) => ToggleAlwaysOnTop();
        var startup = new MenuItem { Header = "Start with Windows", IsCheckable = true, IsChecked = StartupRegistration.IsEnabled() };
        startup.Click += (_, _) => ToggleStartWithWindows();
        var exit = new MenuItem { Header = "Exit" };
        exit.Click += (_, _) => System.Windows.Application.Current.Shutdown();

        menu.Items.Add(setLocation);
        menu.Items.Add(refresh);
        menu.Items.Add(alwaysOnTop);
        menu.Items.Add(startup);
        menu.Items.Add(new Separator());
        menu.Items.Add(exit);
        menu.IsOpen = true;
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
