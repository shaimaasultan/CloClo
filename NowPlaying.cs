using System;
using System.Threading.Tasks;
using Windows.Media.Control;

namespace CloCloWidget;

public readonly record struct NowPlayingInfo(string Title, string Artist);

// Whatever's currently playing system-wide (Spotify, a browser tab, Windows
// Media Player, ...), via the same session manager Windows itself uses for
// the volume flyout's media controls. Unpackaged desktop apps can call this
// without any special permission prompt on modern Windows — if it's ever
// unavailable (older Windows, or nothing playing), this just returns null.
public static class NowPlaying
{
    public static async Task<NowPlayingInfo?> GetCurrentAsync()
    {
        try
        {
            var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
            var session = manager.GetCurrentSession();
            if (session == null) return null;

            var props = await session.TryGetMediaPropertiesAsync();
            if (props == null || string.IsNullOrWhiteSpace(props.Title)) return null;

            return new NowPlayingInfo(props.Title, props.Artist ?? "");
        }
        catch
        {
            return null;
        }
    }
}
