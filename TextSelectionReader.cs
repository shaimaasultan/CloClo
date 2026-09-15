using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Clipboard = System.Windows.Clipboard;

namespace CloCloWidget;

// Grabs whatever text is highlighted in another app. There's no cross-app
// "get the current selection" API, so this uses the same trick most quick
// lookup/translate utilities do: bring the target window back to the
// foreground (clicking our own widget likely stole it), simulate Ctrl+C,
// then read the clipboard — comparing against what was there before so a
// stale clipboard value isn't mistaken for a fresh selection.
public static class TextSelectionReader
{
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    private const byte VK_CONTROL = 0x11;
    private const byte VK_C = 0x43;
    private const uint KEYEVENTF_KEYUP = 0x0002;

    public static async Task<string?> ReadSelectedTextAsync(IntPtr targetWindow)
    {
        if (targetWindow == IntPtr.Zero) return null;

        string? before = TryGetClipboardText();

        SetForegroundWindow(targetWindow);
        await Task.Delay(120);

        keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
        keybd_event(VK_C, 0, 0, UIntPtr.Zero);
        keybd_event(VK_C, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

        await Task.Delay(150);

        var after = TryGetClipboardText();
        if (string.IsNullOrEmpty(after) || after == before) return null;
        return after;
    }

    private static string? TryGetClipboardText()
    {
        try { return Clipboard.ContainsText() ? Clipboard.GetText() : null; }
        catch { return null; }
    }
}
