using System.Drawing;

namespace CloCloWidget;

// Samples a single screen pixel's color — the actual eyedropper behavior
// (live preview while hovering, click to finalize) lives in
// MainWindow.xaml.cs, which is what needs the polling loop and mouse-button
// state; this class is just the "what color is at this point" primitive.
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
}
