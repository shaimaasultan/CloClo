using System.Speech.Synthesis;

namespace CloCloWidget;

// Has Keeper read text aloud via Windows' own speech synthesis (SAPI) —
// the same voices as Narrator, works fully offline.
public static class SpeechReader
{
    private static readonly SpeechSynthesizer Synth = new();

    public static void Speak(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return;
        Synth.SpeakAsyncCancelAll();
        Synth.SpeakAsync(text);
    }

    public static void Stop() => Synth.SpeakAsyncCancelAll();
}
