import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { LIMITES_DE_REFERENCIA, nivelDeDecibelios, validarAudioDeReferencia, ResultadoDeValidacion } from '../utils/musicAudio';

/*
 * WEË MUSIC — AUDIO REAL DEL DISPOSITIVO: GRABAR Y REPRODUCIR.
 *
 * Usa `expo-av`, que el proyecto ya tiene (lo usan los mensajes de voz de WeeTalk y los Weëls). `expo-av` está en
 * deuda de migración a `expo-audio`: este archivo es el ÚNICO sitio de Weë Music que lo toca, así que migrarlo
 * será cambiar un archivo. No se añade ninguna dependencia nueva.
 *
 * Todo lo que sale de aquí es AUDIO REAL: la grabación es lo que captó el micrófono y los niveles de la forma de onda
 * son los que midió el propio grabador. Si la plataforma no entrega medidor (algunos navegadores), no hay forma de
 * onda y la pantalla lo dice; nunca se dibuja una onda inventada para una grabación real.
 */

export type EstadoDeGrabacion = 'inactiva' | 'pidiendoPermiso' | 'grabando' | 'lista' | 'sinPermisos' | 'error';

export interface Grabacion { uri: string; duracionSec: number; picos: number[] }

export const useGrabadoraMusic = () => {
  const [estado, setEstado] = useState<EstadoDeGrabacion>('inactiva');
  const [segundos, setSegundos] = useState(0);
  const [nivel, setNivel] = useState(0);
  const [grabacion, setGrabacion] = useState<Grabacion | null>(null);
  const [aviso, setAviso] = useState<ResultadoDeValidacion | null>(null);
  const rec = useRef<Audio.Recording | null>(null);
  const picos = useRef<number[]>([]);
  const viva = useRef(true);

  useEffect(() => () => {
    viva.current = false;
    rec.current?.stopAndUnloadAsync().catch(() => undefined);
    rec.current = null;
  }, []);

  const soltarModo = () => Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);

  const parar = useCallback(async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    try {
      const st = await r.stopAndUnloadAsync();
      const uri = r.getURI();
      await soltarModo();
      if (!viva.current) return;
      const duracionSec = Math.round((st.durationMillis ?? 0) / 1000);
      if (!uri) { setEstado('error'); return; }
      const v = validarAudioDeReferencia({ mime: 'audio/m4a', nombre: 'grabacion.m4a', duracionSec });
      setAviso(v === 'ok' ? null : v);
      setGrabacion({ uri, duracionSec, picos: picos.current.slice() });
      setEstado('lista');
    } catch {
      if (viva.current) setEstado('error');
    }
  }, []);

  const empezar = useCallback(async () => {
    if (rec.current) return;
    setAviso(null);
    setEstado('pidiendoPermiso');
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { setEstado('sinPermisos'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      picos.current = [];
      setSegundos(0);
      setGrabacion(null);
      const opciones = { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true } as Audio.RecordingOptions;
      const { recording } = await Audio.Recording.createAsync(
        opciones,
        (s) => {
          if (!viva.current || !s.isRecording) return;
          const seg = Math.floor((s.durationMillis ?? 0) / 1000);
          setSegundos(seg);
          const n = nivelDeDecibelios(s.metering);
          if (s.metering !== undefined) picos.current.push(n);
          setNivel(n);
          if (seg >= LIMITES_DE_REFERENCIA.maxSec) parar();
        },
        150,
      );
      rec.current = recording;
      setEstado('grabando');
    } catch {
      await soltarModo();
      if (viva.current) setEstado('error');
    }
  }, [parar]);

  const descartar = useCallback(() => {
    setGrabacion(null);
    setAviso(null);
    setSegundos(0);
    setNivel(0);
    setEstado('inactiva');
  }, []);

  return { estado, segundos, nivel, grabacion, aviso, empezar, parar, descartar };
};

/** Reproduce un audio real por su URI. Sin URI no hay reproducción posible. */
export const useReproductorMusic = (uri?: string) => {
  const sonido = useRef<Audio.Sound | null>(null);
  const [sonando, setSonando] = useState(false);
  const [posicionSec, setPosicionSec] = useState(0);
  const [duracionSec, setDuracionSec] = useState<number | undefined>(undefined);
  const [fallo, setFallo] = useState(false);

  const soltar = useCallback(async () => {
    const s = sonido.current;
    sonido.current = null;
    if (s) await s.unloadAsync().catch(() => undefined);
    setSonando(false);
    setPosicionSec(0);
  }, []);

  useEffect(() => { soltar(); setFallo(false); setDuracionSec(undefined); return () => { soltar(); }; }, [uri, soltar]);

  const alternar = useCallback(async () => {
    if (!uri) return;
    try {
      if (!sonido.current) {
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (st) => {
          if (!st.isLoaded) return;
          setPosicionSec((st.positionMillis ?? 0) / 1000);
          if (st.durationMillis) setDuracionSec(st.durationMillis / 1000);
          setSonando(st.isPlaying);
          if (st.didJustFinish) { setSonando(false); setPosicionSec(0); sound.setPositionAsync(0).catch(() => undefined); }
        });
        sonido.current = sound;
        return;
      }
      const st = await sonido.current.getStatusAsync();
      if (st.isLoaded) { if (st.isPlaying) await sonido.current.pauseAsync(); else await sonido.current.playAsync(); }
    } catch {
      setFallo(true);
    }
  }, [uri]);

  const saltar = useCallback(async (sec: number) => {
    try { await sonido.current?.setPositionAsync(Math.max(0, sec * 1000)); } catch { /* sin sonido cargado: nada que mover */ }
  }, []);

  return { sonando, posicionSec, duracionSec, fallo, alternar, saltar, hayAudio: !!uri };
};

/** Elegir un archivo de audio: solo en la web (selector del navegador). En nativo no hay selector de archivos en esta compilación. */
export const SELECTOR_DE_AUDIO_DISPONIBLE = Platform.OS === 'web';

export interface ArchivoElegido { uri: string; nombre: string; mime: string; bytes: number; duracionSec?: number }

export const elegirArchivoDeAudio = (): Promise<ArchivoElegido | null> =>
  new Promise((resolve) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') { resolve(null); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) { resolve(null); return; }
      const uri = URL.createObjectURL(f);
      const base: ArchivoElegido = { uri, nombre: f.name, mime: f.type, bytes: f.size };
      try {
        const a = new (window as any).Audio(uri) as HTMLAudioElement;
        a.onloadedmetadata = () => resolve({ ...base, duracionSec: Number.isFinite(a.duration) ? Math.round(a.duration) : undefined });
        a.onerror = () => resolve(base);
      } catch {
        resolve(base);
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
