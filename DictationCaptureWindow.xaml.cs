using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows;

namespace CloCloWidget;

// Delegates the actual listening to Windows' own Voice Typing (Win+H)
// instead of calling WinRT's SpeechRecognizer directly — Voice Typing turned
// out to reliably capture real audio on this machine while our own
// SpeechRecognizer-based attempt (see SpeechToText.cs) did not, tracked down
// to the Windows input device that held the "Default Device" role not being
// the physical microphone. Voice Typing has no way to hand recognized text
// back to a caller programmatically; it only types into whatever control
// currently has keyboard focus — so this window exists purely to be that
// focused text target.
public partial class DictationCaptureWindow : Window
{
    [DllImport("user32.dll")] private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo);
    private const byte VK_LWIN = 0x5B;
    private const byte VK_H = 0x48;
    private const byte VK_ESCAPE = 0x1B;
    private const uint KEYEVENTF_KEYUP = 0x0002;

    public string CapturedText { get; private set; } = "";

    public DictationCaptureWindow()
    {
        InitializeComponent();
        Loaded += async (_, _) =>
        {
            CaptureBox.Focus();
            // Give the window's focus a moment to fully settle before
            // triggering Voice Typing — sending Win+H immediately after
            // Loaded risked it targeting a still-transitioning focus state
            // during testing.
            await Task.Delay(300);
            OpenVoiceTyping();
        };
    }

    private static void OpenVoiceTyping()
    {
        keybd_event(VK_LWIN, 0, 0, System.UIntPtr.Zero);
        keybd_event(VK_H, 0, 0, System.UIntPtr.Zero);
        keybd_event(VK_H, 0, KEYEVENTF_KEYUP, System.UIntPtr.Zero);
        keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, System.UIntPtr.Zero);
    }

    // Escape dismisses Voice Typing's floating UI if it's open, and is a
    // harmless no-op if it isn't — unlike sending Win+H again, which
    // TOGGLES it, so if it had already auto-closed on its own (e.g. after a
    // pause in speech) that would have reopened a fresh instance instead of
    // closing anything. There's no public API to just ask it to close, or
    // to check whether it's currently open at all.
    private static void CloseVoiceTyping()
    {
        keybd_event(VK_ESCAPE, 0, 0, System.UIntPtr.Zero);
        keybd_event(VK_ESCAPE, 0, KEYEVENTF_KEYUP, System.UIntPtr.Zero);
    }

    private void Save_Click(object sender, RoutedEventArgs e)
    {
        CapturedText = CaptureBox.Text.Trim();
        CloseVoiceTyping();
        DialogResult = true;
        Close();
    }

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        CloseVoiceTyping();
        DialogResult = false;
        Close();
    }
}
