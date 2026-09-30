import { useCallback, useRef, useState } from 'react';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { assetsService, vistaDeAsset } from '../services/assetsService';
import type { AssetDoc } from '../services/assetsService';

/**
 * Las clases de material que se piden aquí. `model3d` (3D dentro de Filmmaker) solo la pide «Crear › Desde Mis
 * creaciones», para que un modelo tuyo sea la cosa que se guarda; como referencia de una toma sigue cerrada.
 */
export type ClaseDeReferencia = 'image' | 'video' | 'audio' | 'model3d';

export interface CreacionParaReferencia {
  readonly assetId: string;
  readonly clase: ClaseDeReferencia;
  /** Su nombre, si lo tiene. Sin él, quien pinta dice de qué clase es y cuándo se hizo. */
  readonly nombre: string | null;
  /** La imagen con la que se reconoce, si la hay. */
  readonly miniatura: string | null;
  readonly creadoEn: number;
}

export type CargaDeCreaciones = 'sin_pedir' | 'cargando' | 'listas' | 'error';

export interface CreacionesParaReferencia {
  readonly carga: CargaDeCreaciones;
  readonly clase: ClaseDeReferencia | null;
  /** En el orden del servidor (las más recientes primero), sin repetidas. */
  readonly lista: readonly CreacionParaReferencia[];
  readonly hayMas: boolean;
  readonly cargandoMas: boolean;
  readonly cargar: (clase: ClaseDeReferencia) => void;
  readonly cargarMas: () => void;
}

const aCreacion = (a: AssetDoc, clase: ClaseDeReferencia): CreacionParaReferencia => {
  const v = vistaDeAsset(a);
  return {
    assetId: v.assetId,
    clase,
    nombre: v.nombre?.trim() || null,
    miniatura: assetsService.miniatura(a)?.url ?? null,
    creadoEn: v.creadoEn,
  };
};

/**
 * MIS CREACIONES, PARA USARLAS COMO REFERENCIA (Fase 27 del motor: las referencias, de verdad).
 *
 * Lo que la cuenta ya hizo —imágenes, vídeos, audio— es lo que una producción puede usar como referencia: su estilo,
 * un personaje, un lugar, el primer o el último fotograma, un movimiento, un sonido. Se pide por clase y por páginas
 * (`assetsService.listar`, el de Mis creaciones: la cuenta, no la cara; nunca la colección entera) y «Cargar más» pone
 * la página siguiente DETRÁS, sin reordenar ni repetir. Lo que llega de una petición anterior no se pinta. Elegir no
 * guarda nada aquí: quien lo abre hace `add_reference`, y el servidor comprueba al guardar que el material es de la
 * cuenta (Fase 10).
 */
export const useCreacionesParaReferencia = (): CreacionesParaReferencia => {
  const { user } = useAuth();
  const cuenta = user?.uid ?? null;
  const [carga, setCarga] = useState<CargaDeCreaciones>('sin_pedir');
  const [clase, setClase] = useState<ClaseDeReferencia | null>(null);
  const [lista, setLista] = useState<readonly CreacionParaReferencia[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const peticion = useRef(0);
  const cursor = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const cargar = useCallback((nueva: ClaseDeReferencia) => {
    const esta = ++peticion.current;
    setClase(nueva);
    setCarga('cargando');
    setLista([]);
    setHayMas(false);
    setCargandoMas(false);
    cursor.current = null;
    if (!cuenta) { setCarga('error'); return; }
    void (async () => {
      try {
        const p = await assetsService.listar(cuenta, { kind: nueva });
        if (esta !== peticion.current) return;
        cursor.current = p.cursor;
        setLista(p.items.map((a) => aCreacion(a, nueva)));
        setHayMas(p.hayMas);
        setCarga('listas');
      } catch {
        if (esta === peticion.current) setCarga('error');
      }
    })();
  }, [cuenta]);

  const cargarMas = useCallback(() => {
    if (!cuenta || !clase || !hayMas || cargandoMas || carga !== 'listas' || !cursor.current) return;
    const esta = peticion.current;
    const deEsta = clase;
    setCargandoMas(true);
    void (async () => {
      try {
        const p = await assetsService.listar(cuenta, { kind: deEsta }, cursor.current);
        if (esta !== peticion.current) return;
        cursor.current = p.cursor;
        setLista((antes) => {
          const vistos = new Set(antes.map((c) => c.assetId));
          return [...antes, ...p.items.map((a) => aCreacion(a, deEsta)).filter((c) => !vistos.has(c.assetId))];
        });
        setHayMas(p.hayMas);
      } catch {
        /* Una página que no llegó deja lo cargado como estaba, y se puede volver a pedir. */
      } finally {
        if (esta === peticion.current) setCargandoMas(false);
      }
    })();
  }, [cuenta, clase, hayMas, cargandoMas, carga]);

  return { carga, clase, lista, hayMas, cargandoMas, cargar, cargarMas };
};
