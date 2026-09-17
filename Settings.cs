using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace CloCloWidget;

public class WidgetSettings
{
    public string City { get; set; } = "Cairo";
    public double Latitude { get; set; } = 30.0444;
    public double Longitude { get; set; } = 31.2357;
    public double? WindowLeft { get; set; }
    public double? WindowTop { get; set; }
    public bool AlwaysOnTop { get; set; } = true;
    // "auto" follows the real forecast; otherwise one of clear/rain/snow/storm,
    // picked by hand from the right-click menu, overriding the live sky.
    public string Sky { get; set; } = "auto";
    // Where dictated text (see SpeechToText.cs) currently gets appended —
    // null until the first dictation ever happens, then persists across
    // restarts so "append" keeps landing in the same file until the user
    // explicitly starts a new one.
    public string? DictationFilePath { get; set; }
    // Which media-bar icons are currently shown — the bar only has room
    // for about 7 at once (see MainWindow.xaml.cs's icon layout math), so
    // this is how the "Icons" menu lets newer/less-essential ones (convert,
    // color) be swapped in without silently overflowing the bar. Defaults
    // to exactly the icons that existed before this became configurable.
    public HashSet<string> EnabledIcons { get; set; } = new()
    {
        "youtube", "spotify", "bell", "search", "gpu", "read", "mic",
    };
    // How long with no keyboard/mouse input anywhere on the system (see
    // IdleDetection.cs) before Keeper visually falls asleep — 0 means
    // never. Picked from the right-click menu's "Sleep after" submenu.
    public int SleepAfterMinutes { get; set; } = 5;

    private static string FolderPath =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "CloCloWidget");

    private static string FilePath => Path.Combine(FolderPath, "settings.json");

    public static WidgetSettings Load()
    {
        try
        {
            if (File.Exists(FilePath))
            {
                var json = File.ReadAllText(FilePath);
                var loaded = JsonSerializer.Deserialize<WidgetSettings>(json);
                if (loaded != null) return loaded;
            }
        }
        catch
        {
            // Corrupt or unreadable settings file: fall back to defaults below.
        }
        return new WidgetSettings();
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(FolderPath);
            var json = JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(FilePath, json);
        }
        catch
        {
            // Best-effort persistence; losing a save isn't fatal.
        }
    }
}
