// Web: the recorder hands back a temporary blob: URL that disappears on
// reload, so a kept recording is turned into a data: URL and saved with the
// app's other data. Phones use recordedTones.native.ts.

type Reader = {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  result: unknown;
  readAsDataURL(blob: unknown): void;
};

export async function keepRecording(_contactId: string, tempUri: string): Promise<string> {
  const blob = await (await fetch(tempUri)).blob();
  const ReaderCtor = (globalThis as { FileReader?: new () => Reader }).FileReader;
  if (!ReaderCtor) throw new Error('FileReader unavailable');
  return new Promise<string>((resolve, reject) => {
    const reader = new ReaderCtor();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the recording'));
    reader.readAsDataURL(blob);
  });
}

// Nothing to clean up: the data: URL lived only in saved settings.
export function discardRecording(_uri: string): void {}
