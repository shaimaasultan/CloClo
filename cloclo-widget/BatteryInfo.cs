using System;
using System.Windows.Forms;

namespace CloCloWidget;

// Battery percentage/charging state/remaining time, straight from Windows'
// own power status (the same info Explorer's own battery flyout shows) —
// entirely local and synchronous, no network call and nothing to poll
// externally.
public static class BatteryInfo
{
    public record Status(double Percent, bool Charging, string? TimeRemaining);

    public static Status? Read()
    {
        var power = SystemInformation.PowerStatus;
        if (power.BatteryChargeStatus.HasFlag(BatteryChargeStatus.NoSystemBattery)) return null;

        var charging = power.BatteryChargeStatus.HasFlag(BatteryChargeStatus.Charging);
        // Windows only exposes an estimate for time-until-empty, not
        // time-until-full, so charging simply shows no time at all rather
        // than a made-up number.
        var timeRemaining = !charging ? FormatTimeRemaining(power.BatteryLifeRemaining) : null;

        return new Status(Math.Round(power.BatteryLifePercent * 100), charging, timeRemaining);
    }

    private static string? FormatTimeRemaining(int seconds)
    {
        if (seconds < 0) return null; // -1 means "Windows doesn't know yet"
        var ts = TimeSpan.FromSeconds(seconds);
        return ts.TotalHours >= 1 ? $"{(int)ts.TotalHours}h {ts.Minutes}m" : $"{ts.Minutes}m";
    }
}
