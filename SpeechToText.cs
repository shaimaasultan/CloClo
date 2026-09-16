using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Windows.Globalization;
using Windows.Media.SpeechRecognition;

namespace CloCloWidget;

// One-shot voice dictation via Windows' own speech recognition, appended to
// a running text file rather than shown ephemerally in the label — nothing
// to copy/paste out by hand. Each language needs its own installed Windows
// Speech Recognition pack, which turned out to be a separate feature from
// text-to-speech voices (a machine can have Arabic TTS without Arabic
// speech recognition, or vice versa) — checked and handled explicitly
// rather than assumed, since SpeechReader.cs already hit a similar gap.
public static class SpeechToText
{
    public const string EnglishLanguageTag = "en-US";
    public const string ArabicLanguageTag = "ar-SA";

    public static async Task<(string? Text, string? Error)> RecognizeAsync(string languageTag)
    {
        var language = new Language(languageTag);
        var installed = SpeechRecognizer.SupportedTopicLanguages.Any(l => l.LanguageTag == language.LanguageTag);
        if (!installed)
        {
            return (null, $"{language.DisplayName} speech recognition isn't installed. Add it in " +
                "Settings > Time & language > Language & region.");
        }

        try
        {
            using var recognizer = new SpeechRecognizer(language);
            await recognizer.CompileConstraintsAsync();
            var result = await recognizer.RecognizeAsync();
            if (result.Status != SpeechRecognitionResultStatus.Success || string.IsNullOrWhiteSpace(result.Text))
            {
                return (null, "Didn't catch that — try again.");
            }
            return (result.Text, null);
        }
        catch (Exception ex) when (ex.HResult == unchecked((int)0x80045509))
        {
            // Distinct from a plain mic-permission problem: Windows requires
            // accepting its online speech recognition privacy policy at
            // least once (Settings > Privacy & security > Speech) before
            // ANY app can use SpeechRecognizer at all — found by hitting
            // this exact failure while testing, not documented anywhere
            // obvious.
            return (null, "Windows' speech recognition isn't set up yet — go to Settings > Privacy & security " +
                "> Speech and turn on \"Online speech recognition\", then try again.");
        }
        catch (Exception ex)
        {
            return (null, $"Microphone unavailable — check Settings > Privacy & security > Microphone. ({ex.Message})");
        }
    }

    // Next to the exe itself, not Documents — Controlled Folder Access
    // (Windows' ransomware protection) blocks unrecognized apps from
    // writing into Documents/Desktop/Pictures/etc. by default, discovered
    // by hitting exactly that block while testing this. The app's own
    // install folder isn't one of the protected locations.
    private static string DictationFolder =>
        Path.Combine(AppContext.BaseDirectory, "docs");

    public static string CreateNewFile()
    {
        Directory.CreateDirectory(DictationFolder);
        var path = Path.Combine(DictationFolder, $"Dictation-{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.txt");
        File.WriteAllText(path, string.Empty);
        return path;
    }

    public static void Append(string filePath, string text)
    {
        Directory.CreateDirectory(DictationFolder);
        File.AppendAllText(filePath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {text}{Environment.NewLine}");
    }
}
