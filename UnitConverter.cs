using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace CloCloWidget;

// Parses a selected "<number> <unit>" phrase (e.g. "20 USD", "5 km") and
// converts it — length/weight/temperature done locally via a shared base
// unit per category (so any unit in a category can convert to any other,
// not just one fixed pair), currency via a free no-API-key exchange-rate
// service (frankfurter.app — same "free, no key" spirit as the
// weather/geocoding APIs already used elsewhere).
public static class UnitConverter
{
    public record UnitDef(string Key, string Label, Func<double, double> ToBase, Func<double, double> FromBase)
    {
        public override string ToString() => Label;
    }

    // Base units: km (length), kg (weight), °C (temperature) — arbitrary
    // choices, any unit converts to any other in its category via this
    // shared intermediate rather than needing an entry per pair.
    public static readonly Dictionary<string, UnitDef[]> Categories = new()
    {
        ["length"] = new[]
        {
            new UnitDef("km", "km", v => v, v => v),
            new UnitDef("mi", "mi", v => v * 1.60934, v => v * 0.621371),
            new UnitDef("m", "m", v => v / 1000, v => v * 1000),
            new UnitDef("ft", "ft", v => v * 0.0003048, v => v * 3280.84),
        },
        ["weight"] = new[]
        {
            new UnitDef("kg", "kg", v => v, v => v),
            new UnitDef("lb", "lb", v => v * 0.453592, v => v * 2.20462),
        },
        ["temperature"] = new[]
        {
            new UnitDef("c", "°C", v => v, v => v),
            new UnitDef("f", "°F", v => (v - 32) * 5 / 9, v => v * 9 / 5 + 32),
            new UnitDef("k", "K", v => v - 273.15, v => v + 273.15),
        },
    };

    // Shown together whenever any currency is recognized — a fixed,
    // practical set rather than every ISO code, matching the same
    // "common peers" idea the local unit categories use.
    public static readonly string[] CommonCurrencies = { "USD", "CAD", "EUR", "GBP", "JPY" };

    private static readonly HttpClient Http = new();
    private static readonly Regex Pattern = new(@"^\s*(-?\d+(?:\.\d+)?)\s*°?\s*([a-zA-Z]+)\s*$", RegexOptions.Compiled);

    // Aliases accepted when parsing free-text selections, mapped to a
    // canonical (category, key) pair — separate from Categories' own keys
    // since a selection might say "kilometers" where the category table
    // only needs to know "km".
    private static readonly (string[] Aliases, string Category, string Key)[] UnitAliases =
    {
        (new[] { "km", "kilometer", "kilometers", "kilometre", "kilometres" }, "length", "km"),
        (new[] { "mi", "mile", "miles" }, "length", "mi"),
        (new[] { "m", "meter", "meters", "metre", "metres" }, "length", "m"),
        (new[] { "ft", "foot", "feet" }, "length", "ft"),
        (new[] { "kg", "kilogram", "kilograms", "kilo", "kilos" }, "weight", "kg"),
        (new[] { "lb", "lbs", "pound", "pounds" }, "weight", "lb"),
        (new[] { "c", "celsius" }, "temperature", "c"),
        (new[] { "f", "fahrenheit" }, "temperature", "f"),
        (new[] { "k", "kelvin" }, "temperature", "k"),
    };

    public record ParsedSelection(double Value, string Category, string UnitKey);

    // Category is "length"/"weight"/"temperature" for the local units
    // above, or "currency" for any recognized 3-letter code.
    public static (ParsedSelection? Parsed, string? Error) ParseSelection(string text)
    {
        var match = Pattern.Match(text.Trim());
        if (!match.Success)
        {
            return (null, "Select just a number and a unit, like \"20 USD\" or \"5 km\".");
        }

        var value = double.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        var unitText = match.Groups[2].Value;

        var alias = UnitAliases.FirstOrDefault(u => u.Aliases.Contains(unitText, StringComparer.OrdinalIgnoreCase));
        if (alias.Aliases != null)
        {
            return (new ParsedSelection(value, alias.Category, alias.Key), null);
        }

        if (unitText.Length == 3 && unitText.All(char.IsLetter))
        {
            return (new ParsedSelection(value, "currency", unitText.ToUpperInvariant()), null);
        }

        return (null, $"\"{unitText}\" isn't a unit or currency I recognize.");
    }

    // Converts within a local category, returning every OTHER unit's value
    // (the caller already knows fromKey's own value — it's whatever was
    // typed).
    public static Dictionary<string, double> ConvertLocal(string category, string fromKey, double value)
    {
        var units = Categories[category];
        var from = units.First(u => u.Key == fromKey);
        var baseValue = from.ToBase(value);

        var result = new Dictionary<string, double>();
        foreach (var u in units)
        {
            if (u.Key == fromKey) continue;
            result[u.Key] = u.FromBase(baseValue);
        }
        return result;
    }

    public static async Task<(Dictionary<string, double>? Results, string? Error)> ConvertCurrencyMultiAsync(double amount, string fromCode)
    {
        var targets = CommonCurrencies.Where(c => c != fromCode).ToArray();
        if (targets.Length == 0) return (new Dictionary<string, double>(), null);

        try
        {
            var url = "https://api.frankfurter.app/latest?amount=" +
                $"{amount.ToString(CultureInfo.InvariantCulture)}&from={fromCode}&to={string.Join(",", targets)}";
            var json = await Http.GetStringAsync(url);
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("rates", out var rates))
            {
                return (null, $"\"{fromCode}\" isn't a currency code I could look up.");
            }

            var result = new Dictionary<string, double>();
            foreach (var t in targets)
            {
                if (rates.TryGetProperty(t, out var el)) result[t] = el.GetDouble();
            }
            return (result, null);
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

    public static string FormatNumber(double v) => Math.Round(v, 2).ToString("0.##", CultureInfo.InvariantCulture);
}
