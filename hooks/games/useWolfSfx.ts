import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { Buffer } from "buffer";
import { useCallback, useEffect, useMemo, useRef } from "react";

export type WolfSfxName = "success" | "error" | "combo" | "transition" | "result";

type ToneProfile = {
  frequency: number;
  durationMs: number;
  volume: number;
};

const SAMPLE_RATE = 8000;

const TONE_PROFILES: Record<WolfSfxName, ToneProfile> = {
  success: { frequency: 740, durationMs: 110, volume: 0.42 },
  error: { frequency: 180, durationMs: 140, volume: 0.5 },
  combo: { frequency: 920, durationMs: 75, volume: 0.34 },
  transition: { frequency: 520, durationMs: 80, volume: 0.3 },
  result: { frequency: 660, durationMs: 140, volume: 0.38 },
};

function createToneSource(profile: ToneProfile): { uri: string } {
  const sampleCount = Math.max(1, Math.floor((SAMPLE_RATE * profile.durationMs) / 1000));
  const dataSize = sampleCount * 2;
  const byteLength = 44 + dataSize;
  const wav = new Uint8Array(byteLength);
  const view = new DataView(wav.buffer);

  // RIFF/WAVE header
  wav[0] = 82;
  wav[1] = 73;
  wav[2] = 70;
  wav[3] = 70;
  view.setUint32(4, 36 + dataSize, true);
  wav[8] = 87;
  wav[9] = 65;
  wav[10] = 86;
  wav[11] = 69;
  wav[12] = 102;
  wav[13] = 109;
  wav[14] = 116;
  wav[15] = 32;
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  wav[36] = 100;
  wav[37] = 97;
  wav[38] = 116;
  wav[39] = 97;
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp((-4 * i) / sampleCount);
    const sample = Math.sin(2 * Math.PI * profile.frequency * t) * profile.volume * envelope;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  const base64 = Buffer.from(wav.buffer).toString("base64");
  return { uri: `data:audio/wav;base64,${base64}` };
}

export function useWolfSfx() {
  const soundsRef = useRef<Partial<Record<WolfSfxName, Audio.Sound>>>({});
  const readyRef = useRef(false);

  const preload = useCallback(async () => {
    if (readyRef.current) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      for (const key of Object.keys(TONE_PROFILES) as WolfSfxName[]) {
        const profile = TONE_PROFILES[key];
        const { sound } = await Audio.Sound.createAsync(
          createToneSource(profile),
          {
            shouldPlay: false,
            volume: profile.volume,
          },
          undefined,
          false,
        );
        soundsRef.current[key] = sound;
      }

      readyRef.current = true;
    } catch {
      // Fallback silencioso caso áudio não esteja disponível no dispositivo.
      readyRef.current = false;
    }
  }, []);

  const play = useCallback(
    async (name: WolfSfxName) => {
      try {
        if (!readyRef.current) {
          await preload();
        }

        const sound = soundsRef.current[name];
        if (!sound) return;

        await sound.stopAsync().catch(() => {});
        await sound.setPositionAsync(0).catch(() => {});
        await sound.playAsync().catch(() => {});
      } catch {
        // Não interrompe o fluxo do jogo por falha de áudio.
      }
    },
    [preload],
  );

  useEffect(() => {
    return () => {
      const unloadPromises = Object.values(soundsRef.current).map((sound) => sound?.unloadAsync().catch(() => {}));
      void Promise.all(unloadPromises);
      soundsRef.current = {};
      readyRef.current = false;
    };
  }, []);

  return useMemo(
    () => ({ preload, play }),
    [preload, play],
  );
}

