using System;
using System.Runtime.InteropServices;

namespace CloCloWidget;

// Launches (or brings to the foreground) an app by its AppUserModelId —
// the same mechanism the Start Menu and taskbar use under the hood.
// There's no clean WinRT-projected API for "activate this app" given just
// an AUMID, so this goes through the classic COM interface directly.
public static class AppLauncher
{
    public static void TryActivate(string? appUserModelId)
    {
        if (string.IsNullOrWhiteSpace(appUserModelId)) return;
        TryActivateChecked(appUserModelId);
    }

    // For cases where we know roughly which app should handle something
    // (e.g. "whatever handles Calendar/Contacts") but not exactly which one
    // is installed, since that varies by machine and Windows version — new
    // Outlook vs. classic Mail & Calendar vs. classic desktop Outlook, etc.
    // Tries each in order and stops at the first one Windows actually
    // recognizes, checked via the real HRESULT rather than just "didn't
    // throw" (ActivateApplication uses PreserveSig — a bad AUMID returns a
    // failure code here, it doesn't throw).
    public static void TryActivateFirst(params string[] appUserModelIds)
    {
        foreach (var id in appUserModelIds)
        {
            if (TryActivateChecked(id)) return;
        }
    }

    private static bool TryActivateChecked(string appUserModelId)
    {
        try
        {
            var manager = (IApplicationActivationManager)new ApplicationActivationManager();
            var hr = manager.ActivateApplication(appUserModelId, string.Empty, ActivateOptions.None, out _);
            return hr == 0;
        }
        catch
        {
            // Not every AUMID we see is activatable this way (e.g. a
            // browser's own generic id without a specific PWA registration)
            // — best-effort, nothing to do if it fails.
            return false;
        }
    }

    [Flags]
    private enum ActivateOptions
    {
        None = 0x00000000,
        DesignMode = 0x00000001,
        NoErrorUI = 0x00000002,
        NoSplashScreen = 0x00000004,
    }

    // Only the first vtable slot (ActivateApplication) is declared — that's
    // all we call, and COM interop maps declared methods to vtable slots in
    // order, so the two other real methods on this interface
    // (ActivateForFile, ActivateForProtocol) can be left out safely.
    [ComImport]
    [Guid("2e941141-7f97-4756-ba1d-9decde894a3d")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IApplicationActivationManager
    {
        [PreserveSig]
        int ActivateApplication(
            [MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,
            [MarshalAs(UnmanagedType.LPWStr)] string arguments,
            ActivateOptions options,
            out uint processId);
    }

    [ComImport]
    [Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")]
    private class ApplicationActivationManager
    {
    }
}
