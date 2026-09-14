import { useCallback, useEffect, useRef, useState } from 'react';

// Live transcript of your side of a call, using the device's own speech
// recognition (expo-speech-recognition: the browser's speech API on the web,
// Apple's and Google's recognizers on phones). Free, no account — it only
// hears this device's microphone.

type SpeechPackage = typeof import('expo-speech-recognition');

// Loaded defensively: in Expo Go the native module is missing and importing
// the package throws. Then the call screen just says transcripts aren't
// available here instead of the whole app crashing.
let speech: SpeechPackage | null = null;
try {
  speech = require('expo-speech-recognition') as SpeechPackage;
} catch {
  speech = null;
}

// Chosen once at load, so hooks are always called in the same order.
const useSpeechEvent: SpeechPackage['useSpeechRecognitionEvent'] =
  speech?.useSpeechRecognitionEvent ?? ((() => {}) as SpeechPackage['useSpeechRecognitionEvent']);

export type TranscriptStatus =
  | 'starting'
  | 'listening'
  | 'muted'
  | 'denied'
  | 'unavailable'
  | 'unsupported-language'
  | 'error';

export interface TranscriptLine {
  id: number;
  text: string;
  at: number;
}

interface Options {
  // The call is live.
  active: boolean;
  // Your microphone is muted: stop listening until unmuted.
  muted: boolean;
  // BCP-47 language you're speaking, e.g. "en-US" or "ar-EG".
  lang: string;
}

const MAX_RETRY_MS = 5000;

export function useLiveTranscript({ active, muted, lang }: Options) {
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [interim, setInterim] = useState('');
  const [status, setStatus] = useState<TranscriptStatus>('starting');

  const wanted = active && !muted;
  const wantedRef = useRef(wanted);
  wantedRef.current = wanted;
  const langRef = useRef(lang);
  langRef.current = lang;
  const interimRef = useRef('');
  // Permission refused or language unsupported: don't keep retrying.
  const blocked = useRef(false);
  const running = useRef(false);
  const errors = useRef(0);
  const nextId = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setInterimText = (text: string) => {
    interimRef.current = text;
    setInterim(text);
  };

  const addLine = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLines((prev) => [...prev, { id: nextId.current++, text: trimmed, at: Date.now() }]);
  };

  const begin = useCallback(async () => {
    const recognizer = speech?.ExpoSpeechRecognitionModule;
    if (!recognizer || !recognizer.isRecognitionAvailable()) {
      setStatus('unavailable');
      return;
    }
    try {
      const { granted } = await recognizer.requestPermissionsAsync();
      if (!granted) {
        blocked.current = true;
        setStatus('denied');
        return;
      }
      if (!wantedRef.current || running.current) return;
      recognizer.start({ lang: langRef.current, interimResults: true, continuous: true, addsPunctuation: true });
    } catch {
      setStatus('error');
    }
  }, []);

  const clearRetry = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
  };

  // Listen while the call is live and you're not muted; a new language
  // restarts listening.
  useEffect(() => {
    const recognizer = speech?.ExpoSpeechRecognitionModule;
    if (!wanted) {
      clearRetry();
      if (running.current) {
        try {
          recognizer?.abort();
        } catch {
          // Already stopped.
        }
      }
      setInterimText('');
      if (active && muted) setStatus('muted');
      return;
    }
    blocked.current = false;
    errors.current = 0;
    setStatus('starting');
    // A short pause lets a previous session finish stopping first.
    retryTimer.current = setTimeout(() => void begin(), 200);
    return () => {
      clearRetry();
      try {
        recognizer?.abort();
      } catch {
        // Already stopped.
      }
    };
  }, [wanted, active, muted, lang, begin]);

  useSpeechEvent('start', () => {
    running.current = true;
    if (wantedRef.current) setStatus('listening');
  });

  useSpeechEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    errors.current = 0;
    if (event.isFinal) {
      addLine(text);
      setInterimText('');
    } else {
      setInterimText(text);
    }
  });

  useSpeechEvent('error', (event) => {
    switch (event.error) {
      case 'aborted':
      case 'no-speech':
      case 'speech-timeout':
        return;
      case 'not-allowed':
      case 'service-not-allowed':
        blocked.current = true;
        setStatus('denied');
        return;
      case 'language-not-supported':
        blocked.current = true;
        setStatus('unsupported-language');
        return;
      default:
        errors.current += 1;
        setStatus('error');
    }
  });

  // Recognition ends by itself after pauses (and after each phrase on older
  // phones): keep what was heard and pick up listening again while the call
  // goes on, waiting longer after repeated errors.
  useSpeechEvent('end', () => {
    running.current = false;
    if (interimRef.current) {
      addLine(interimRef.current);
      setInterimText('');
    }
    if (!wantedRef.current || blocked.current) return;
    clearRetry();
    const delay = Math.min(MAX_RETRY_MS, 400 * 2 ** errors.current);
    retryTimer.current = setTimeout(() => {
      if (wantedRef.current && !blocked.current && !running.current) void begin();
    }, delay);
  });

  return { lines, interim, status };
}
