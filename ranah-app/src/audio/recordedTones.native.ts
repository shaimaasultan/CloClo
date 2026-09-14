// iOS / Android: the recorder writes to a temporary file the system may clear,
// so a kept recording is copied into the app's documents folder, where it
// survives restarts.
import { Directory, File, Paths } from 'expo-file-system';

export async function keepRecording(contactId: string, tempUri: string): Promise<string> {
  const folder = new Directory(Paths.document, 'ringtones');
  if (!folder.exists) folder.create({ idempotent: true, intermediates: true });
  const extension = tempUri.split('?')[0].split('.').pop() || 'm4a';
  // A fresh name each time, so a new take never plays a cached old one.
  const destination = new File(folder, `${contactId}-${Date.now()}.${extension}`);
  new File(tempUri).copy(destination);
  return destination.uri;
}

export function discardRecording(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}
