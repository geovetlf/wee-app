import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { uploadCreatorImage } from '../services/creatorUploads';
import { ReferenciaDeIdea, RolDeReferencia, agregar, cambiarRol as conRol, hayCupo, marcar, quitar as sinReferencia, rolPorDefecto } from '../utils/referenciasDeFilmmaker';

/** Lo que `uploadCreatorImage` lanza, en una clave de i18n que la persona entiende. */
const claveDelFallo = (e: unknown): string => (e instanceof Error && e.message === 'foto-demasiado-grande' ? 'filmmaker.refTooBig' : 'filmmaker.refError');

/**
 * Las imágenes adjuntas a la idea: subir desde el dispositivo (al Storage de Weë, `users/{uid}/creator-inputs`, como el resto de Weë AI) o traer una
 * creación que ya existe (entra lista, sin subir de nuevo). Cada una lleva su estado (subiendo / lista / error), se quita de un toque y el error se reintenta.
 * `aviso` es una CLAVE de i18n (o null): quien pinta la resuelve con `t()`.
 */
export function useReferenciasDeFilmmaker() {
  const { user } = useAuth();
  const [referencias, setReferencias] = useState<readonly ReferenciaDeIdea[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const contador = useRef(0);
  const siguienteId = () => `ref-${Date.now().toString(36)}-${contador.current++}`;

  const subir = useCallback(async (id: string, uri: string) => {
    if (!user) { setReferencias((r) => marcar(r, id, { estado: 'error' })); setAviso('filmmaker.hubNeedSession'); return; }
    try {
      const url = await uploadCreatorImage(user.uid, uri);
      setReferencias((r) => marcar(r, id, { estado: 'lista', url }));
    } catch (e) {
      setReferencias((r) => marcar(r, id, { estado: 'error' }));
      setAviso(claveDelFallo(e));
    }
  }, [user]);

  /** Abre la galería del dispositivo y sube lo elegido; entra con el rol por defecto (Personaje si aún no hay ninguno) y se cambia después. */
  const elegirDelDispositivo = useCallback(async () => {
    setAviso(null);
    if (!hayCupo(referencias)) return;
    try {
      if (Platform.OS !== 'web') {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) { setAviso('filmmaker.refPermission'); return; }
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
      const uri = !r.canceled ? r.assets[0]?.uri : undefined;
      if (!uri) return;
      const id = siguienteId();
      setReferencias((x) => agregar(x, { id, rol: rolPorDefecto(x), uri, estado: 'subiendo', origen: 'subida' }));
      void subir(id, uri);
    } catch {
      setAviso('filmmaker.refError');
    }
  }, [referencias, subir]);

  /** Una creación que ya está en Weë: entra lista, sin subir otra vez. */
  const usarCreacion = useCallback((url: string) => {
    setAviso(null);
    setReferencias((x) => agregar(x, { id: siguienteId(), rol: rolPorDefecto(x), uri: url, url, estado: 'lista', origen: 'creaciones' }));
  }, []);

  const reintentar = useCallback((id: string) => {
    const una = referencias.find((x) => x.id === id);
    if (!una || una.origen !== 'subida') return;
    setAviso(null);
    setReferencias((x) => marcar(x, id, { estado: 'subiendo' }));
    void subir(id, una.uri);
  }, [referencias, subir]);

  const cambiarRol = useCallback((id: string, rol: RolDeReferencia) => setReferencias((x) => conRol(x, id, rol)), []);
  const quitar = useCallback((id: string) => setReferencias((x) => sinReferencia(x, id)), []);
  return { referencias, aviso, elegirDelDispositivo, usarCreacion, reintentar, quitar, cambiarRol };
}
