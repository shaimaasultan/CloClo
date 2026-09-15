using System;
using System.Linq;
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

            // manager.GetCurrentSession() is Windows' own guess at "the"
            // session — it's whichever one last had media-key focus, which
            // can stick to an app that's since paused, gone idle, or even
            // closed, instead of following whatever's actually audible now.
            // Prefer a session that's actually reporting Playing.
            var session = manager.GetSessions()
                .FirstOrDefault(s => s.GetPlaybackInfo()?.PlaybackStatus
                    == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                ?? manager.GetCurrentSession();
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
