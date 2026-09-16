using System;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace CloCloWidget;

// Converts a selected "<number> <unit>" phrase (e.g. "20 USD", "5 km") to
// a paired unit — length/weight/temperature done locally, currency via a
// free no-API-key exchange-rate service (same "free, no key" spirit as the
// open-meteo weather/geocoding calls already used elsewhere).
public static class UnitConverter
{
    private static readonly HttpClient Http = new();
    private static readonly Regex Pattern = new(@"^\s*(-?\d+(?:\.\d+)?)\s*°?\s*([a-zA-Z]+)\s*$", RegexOptions.Compiled);

    // Each local unit converts to exactly one other — a fixed pairing
    // rather than a full N-way system, since the point is a quick glance
    // at "the other common unit", not a general converter.
    private static readonly (string[] Names, string ToName, Func<double, double> Convert)[] LocalUnits =
    {
        (new[] { "km", "kilometer", "kilometers", "kilometre", "kilometres" }, "mi", v => v * 0.621371),
        (new[] { "mi", "mile", "miles" }, "km", v => v * 1.60934),
        (new[] { "m", "meter", "meters", "metre", "metres" }, "ft", v => v * 3.28084),
        (new[] { "ft", "foot", "feet" }, "m", v => v * 0.3048),
        (new[] { "kg", "kilogram", "kilograms", "kilo", "kilos" }, "lb", v => v * 2.20462),
        (new[] { "lb", "lbs", "pound", "pounds" }, "kg", v => v * 0.453592),
        (new[] { "c", "celsius" }, "°F", v => v * 9 / 5 + 32),
        (new[] { "f", "fahrenheit" }, "°C", v => (v - 32) * 5 / 9),
    };

    public static async Task<(string? Result, string? Error)> ConvertAsync(string text)
    {
        var match = Pattern.Match(text.Trim());
        if (!match.Success)
        {
            return (null, "Select just a number and a unit, like \"20 USD\" or \"5 km\".");
        }

        var value = double.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        var unit = match.Groups[2].Value;

        var local = LocalUnits.FirstOrDefault(u => u.Names.Contains(unit, StringComparer.OrdinalIgnoreCase));
        if (local.Names != null)
        {
            var converted = local.Convert(value);
            return ($"{FormatNumber(value)} {unit} = {FormatNumber(converted)} {local.ToName}", null);
        }

        if (unit.Length == 3 && unit.All(char.IsLetter))
        {
            return await ConvertCurrencyAsync(value, unit.ToUpperInvariant());
        }

        return (null, $"\"{unit}\" isn't a unit or currency I recognize.");
    }

    private static async Task<(string? Result, string? Error)> ConvertCurrencyAsync(double amount, string fromCode)
    {
        // CAD as the "home" currency (this widget's own location is set up
        // for a Canadian user) — converting an amount already in CAD goes
        // to USD instead, since that's the most likely second currency
        // someone would want.
        var toCode = fromCode == "CAD" ? "USD" : "CAD";
        try
        {
            var url = $"https://api.frankfurter.app/latest?amount={amount.ToString(CultureInfo.InvariantCulture)}&from={fromCode}&to={toCode}";
            var json = await Http.GetStringAsync(url);
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("rates", out var rates) || !rates.TryGetProperty(toCode, out var rateEl))
            {
                return (null, $"\"{fromCode}\" isn't a currency code I could look up.");
            }
            var converted = rateEl.GetDouble();
            return ($"{FormatNumber(amount)} {fromCode} = {FormatNumber(converted)} {toCode}", null);
        }
        catch (HttpRequestException ex) when (ex.StatusCode.HasValue)
        {
            // A real HTTP response came back, just not a success one — for
            // this API that's what an unrecognized currency code looks
            // like (confirmed: 404 "not found" for a made-up code), as
            // opposed to StatusCode being null, which means no response
            // arrived at all (DNS/connectivity failure).
            return (null, $"\"{fromCode}\" isn't a currency code I could look up.");
        }
        catch
        {
            return (null, "Couldn't reach the currency conversion service — check your connection.");
        }
    }

    private static string FormatNumber(double v) => Math.Round(v, 2).ToString("0.##", CultureInfo.InvariantCulture);
}
