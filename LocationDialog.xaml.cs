using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;

namespace CloCloWidget;

public partial class LocationDialog : Window
{
    private static readonly HttpClient Http = new();

    public string ResolvedCity { get; private set; } = "";
    public double ResolvedLat { get; private set; }
    public double ResolvedLon { get; private set; }

    public LocationDialog(string currentCity)
    {
        InitializeComponent();
        CityBox.Text = currentCity;
        Loaded += (_, _) =>
        {
            CityBox.Focus();
            CityBox.SelectAll();
        };
    }

    private void CityBox_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
    {
        if (e.Key == Key.Enter) _ = ResolveAndCloseAsync();
    }

    private void Ok_Click(object sender, RoutedEventArgs e) => _ = ResolveAndCloseAsync();

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }

    private async Task ResolveAndCloseAsync()
    {
        var name = CityBox.Text.Trim();
        if (name.Length == 0) return;

        OkButton.IsEnabled = false;
        StatusText.Text = "Looking that up…";
        try
        {
            var url = $"https://geocoding-api.open-meteo.com/v1/search?count=1&name={Uri.EscapeDataString(name)}";
            var json = await Http.GetStringAsync(url);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("results", out var results) && results.GetArrayLength() > 0)
            {
                var first = results[0];
                ResolvedLat = first.GetProperty("latitude").GetDouble();
                ResolvedLon = first.GetProperty("longitude").GetDouble();
                ResolvedCity = first.TryGetProperty("name", out var n) ? n.GetString() ?? name : name;
                DialogResult = true;
                Close();
            }
            else
            {
                StatusText.Text = "Couldn't find that place — try a different spelling.";
                OkButton.IsEnabled = true;
            }
        }
        catch
        {
            StatusText.Text = "Couldn't reach the geocoding service — check your connection.";
            OkButton.IsEnabled = true;
        }
    }
}
