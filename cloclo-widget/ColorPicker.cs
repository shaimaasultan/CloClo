using System;
using System.Drawing;

namespace CloCloWidget;

// Samples a single screen pixel's color and formats it a few common ways —
// the actual eyedropper interaction (live preview while hovering, click to
// finalize) lives in ColorPickerOverlay.xaml.cs; this class is just the
// "what color is at this point, and how do I write it down" primitives.
public static class ColorPicker
{
    public static Color GetColorAt(System.Drawing.Point screenPoint)
    {
        using var bitmap = new Bitmap(1, 1);
        using var g = Graphics.FromImage(bitmap);
        g.CopyFromScreen(screenPoint, System.Drawing.Point.Empty, new Size(1, 1));
        return bitmap.GetPixel(0, 0);
    }

    public static string ToHex(Color c) => $"#{c.R:X2}{c.G:X2}{c.B:X2}";

    public static string ToRgbString(Color c) => $"rgb({c.R}, {c.G}, {c.B})";

    public static string ToHslString(Color c)
    {
        double r = c.R / 255.0, g = c.G / 255.0, b = c.B / 255.0;
        double max = Math.Max(r, Math.Max(g, b));
        double min = Math.Min(r, Math.Min(g, b));
        double h, s;
        double l = (max + min) / 2;

        if (max == min)
        {
            h = s = 0;
        }
        else
        {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max == r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max == g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }

        return $"hsl({Math.Round(h * 360)}, {Math.Round(s * 100)}%, {Math.Round(l * 100)}%)";
    }
}
