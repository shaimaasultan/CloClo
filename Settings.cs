using System;
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
