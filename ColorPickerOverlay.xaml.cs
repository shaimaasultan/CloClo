using System;
using System.Windows;
using System.Windows.Input;

namespace CloCloWidget;

// A fullscreen, effectively-invisible window that owns mouse input while
// picking is active — the first attempt at this (polling GetAsyncKeyState
// from a background timer, no real window under the cursor) couldn't
// change the system cursor at all (whichever real window was actually
// under the pointer controlled that, not us) and couldn't stop a click
// from also reaching whatever was underneath. A real topmost window
// covering the whole virtual screen fixes both: it genuinely owns
// WM_SETCURSOR and the click itself while it's up, confirmed by user
// report that neither worked with the polling version.
//
// Background is #01000000 (alpha 1/255), not fully transparent — a
// layered window at alpha 0 is invisible to hit-testing entirely, the
// same trick _avatarWindow already relies on elsewhere in this app.
public partial class ColorPickerOverlay : Window
{
    public event Action<System.Drawing.Color>? Previewed;
    public event Action<System.Drawing.Color>? Picked;
    public event Action? Cancelled;

    public ColorPickerOverlay()
    {
        InitializeComponent();
        Left = SystemParameters.VirtualScreenLeft;
        Top = SystemParameters.VirtualScreenTop;
        Width = SystemParameters.VirtualScreenWidth;
        Height = SystemParameters.VirtualScreenHeight;

        MouseMove += (_, _) => Previewed?.Invoke(SampleAtCursor());
        MouseLeftButtonDown += (_, _) =>
        {
            Picked?.Invoke(SampleAtCursor());
            Close();
        };
        KeyDown += (_, e) =>
        {
            if (e.Key == Key.Escape)
            {
                Cancelled?.Invoke();
                Close();
            }
        };
        Loaded += (_, _) => Focus(); // needs keyboard focus to actually see Escape
    }

    private static System.Drawing.Color SampleAtCursor() =>
        ColorPicker.GetColorAt(System.Windows.Forms.Cursor.Position);
}
