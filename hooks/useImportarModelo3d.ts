import { useCallback, useRef, useState } from 'react';
import { assetsService } from '../services/assetsService';
import type { RespuestaDeModelos, SubidaDeModelo } from '../services/assetsService';
import { elegirUnArchivo, sePuedeElegirUnArchivo } from '../utils/elegirArchivo';
import {
  BYTES_DE_CABECERA_GLB, MAX_JSON_PARA_CONTAR, leerCabeceraDeModelo, leerJsonDelModelo, nuevaClaveDeImportacion,
} from '../utils/modelo3d';
import type { FalloDeImportacion, PiezasDelModelo } from '../utils/modelo3d';
import type { CreacionParaReferencia } from './useCreacionesParaReferencia';

export type FaseDeImportacion = 'lista' | 'comprobando' | 'preparando' | 'subiendo' | 'terminando' | 'hecha' | 'fallida';

export interface ArchivoDeModelo {
  readonly nombre: string;
  readonly bytes: number;
  readonly piezas: PiezasDelModelo;
}

export interface ImportacionDeModelo {
  /** `null`: todavía no se ha preguntado. Después, lo que dijo el servidor (y sin servidor, que no). */
  readonly abierta: boolean | null;
  /** ¿Se puede elegir un archivo aquí? En la web, sí; en la app nativa, todavía no. */
  readonly puedeElegir: boolean;
  readonly fase: FaseDeImportacion;
  /** De 0 a 1 mientras se suben los bytes. */
  readonly progreso: number;
  readonly fallo: FalloDeImportacion | null;
  readonly archivo: ArchivoDeModelo | null;
  readonly comprobarPuerta: () => void;
  /** Elige un archivo y lo importa con ese nombre. El material listo, o `null` (cancelado o fallido: se dice en `fallo`). */
  readonly importar: (nombre: string) => Promise<CreacionParaReferencia | null>;
  /** Lo que falló en la subida, otra vez, con el MISMO archivo y la MISMA clave: no se duplica nada. */
  readonly reintentar: (nombre: string) => Promise<CreacionParaReferencia | null>;
  readonly cancelar: () => void;
  readonly reiniciar: () => void;
}

/** Cuánto se espera a que el almacén diga que los bytes están, si todavía no los ve (pocas veces: no es una cola). */
const ESPERAS_AL_CONFIRMAR_MS: readonly number[] = [0, 1_500, 4_000];

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const falloDeLaPuerta = (r: Extract<RespuestaDeModelos, { ok: false }>): FalloDeImportacion =>
  r.motivo === 'cerrada' ? 'cerrada'
    : r.motivo === 'peticion_invalida' ? (r.detalle === 'tamano' ? 'demasiado_grande' : 'no_disponible')
      : r.motivo === 'pendiente' ? 'sigue_llegando'
        : r.motivo === 'sin_respuesta' ? 'sin_respuesta'
          : 'no_disponible';

/**
 * 3D DENTRO DE FILMMAKER · IMPORTAR UN MODELO 3D.
 *
 * El recorrido entero, en la app: elegir un GLB, comprobar que lo es, pedir permiso
 * a la puerta `models3d`, mandar los bytes directos al almacén con su progreso y
 * confirmar —el servidor MIRA que están—. Lo que sale es un material de Mis
 * creaciones (`model3d`), el mismo que se elegiría desde allí, y quien lo pidió hace
 * con él lo de siempre: un Element que APUNTA a él y la ficha vinculada.
 *
 * Nada de esto decide nada del dinero ni del dueño: la cuenta sale de la sesión en
 * el servidor, el material se deriva de la clave de la operación y el tamaño real se
 * mide en el almacén. Importar no cobra Credits.
 */
export const useImportarModelo3d = (): ImportacionDeModelo => {
  const [abierta, setAbierta] = useState<boolean | null>(null);
  const [fase, setFase] = useState<FaseDeImportacion>('lista');
  const [progreso, setProgreso] = useState(0);
  const [fallo, setFallo] = useState<FalloDeImportacion | null>(null);
  const [archivo, setArchivo] = useState<ArchivoDeModelo | null>(null);
  const preguntando = useRef(false);
  /* El archivo elegido y su clave: reintentar vuelve a usar los dos. */
  const elegido = useRef<{ file: File; clave: string; piezas: PiezasDelModelo } | null>(null);
  const corte = useRef<AbortController | null>(null);

  const comprobarPuerta = useCallback(() => {
    if (preguntando.current) return;
    preguntando.current = true;
    void assetsService.importacionDeModelosAbierta().then(setAbierta);
  }, []);

  const falla = useCallback((motivo: FalloDeImportacion) => {
    setFallo(motivo);
    setFase('fallida');
    return null;
  }, []);

  /** Pedir, mandar y confirmar, con lo que ya está elegido y comprobado. */
  const subir = useCallback(async (nombre: string): Promise<CreacionParaReferencia | null> => {
    const actual = elegido.current;
    if (!actual) return null;
    const { file, clave, piezas } = actual;
    setFallo(null);
    setProgreso(0);
    setFase('preparando');
    const pedido = await assetsService.pedirSubidaDeModelo({
      operationId: clave,
      bytes: file.size,
      nombre,
      metadatos: piezas as Readonly<Record<string, number>>,
    });
    if (!pedido.ok) return falla(falloDeLaPuerta(pedido));
    const subida = (pedido as { subida?: SubidaDeModelo }).subida;
    if (!subida) return falla('sin_respuesta');

    setFase('subiendo');
    const control = new AbortController();
    corte.current = control;
    const envio = await assetsService.enviarModelo(subida, file, setProgreso, control.signal);
    corte.current = null;
    if (envio === 'cancelado') {
      setFase('lista');
      setProgreso(0);
      return null;
    }
    /*
     * Un envío que falla puede ser un corte… o que los bytes YA estaban (un reintento: el
     * destino es de una sola escritura). Por eso no se da por perdido sin preguntar.
     */
    setFase('terminando');
    for (const ms of ESPERAS_AL_CONFIRMAR_MS) {
      if (ms) await esperar(ms);
      const hecho = await assetsService.confirmarSubidaDeModelo(clave);
      if (hecho.ok && 'assetId' in hecho) {
        setProgreso(1);
        setFase('hecha');
        return { assetId: hecho.assetId, clase: 'model3d', nombre, miniatura: null, creadoEn: Date.now() };
      }
      if (hecho.ok || hecho.motivo !== 'pendiente') return falla(hecho.ok ? 'sin_respuesta' : falloDeLaPuerta(hecho));
      if (envio === 'fallo') return falla('subida_cortada');
    }
    return falla('sigue_llegando');
  }, [falla]);

  const importar = useCallback(async (nombre: string): Promise<CreacionParaReferencia | null> => {
    if (!sePuedeElegirUnArchivo()) return null;
    const file = await elegirUnArchivo('.glb,model/gltf-binary');
    if (!file) return null;
    setFallo(null);
    setProgreso(0);
    setFase('comprobando');
    elegido.current = null;
    setArchivo({ nombre: file.name, bytes: file.size, piezas: {} });
    try {
      const cabecera = leerCabeceraDeModelo(new Uint8Array(await file.slice(0, BYTES_DE_CABECERA_GLB).arrayBuffer()), file.size);
      if (!cabecera.ok) return falla(cabecera.motivo);
      let piezas: PiezasDelModelo = {};
      if (cabecera.bytesDelJson <= MAX_JSON_PARA_CONTAR) {
        const texto = new TextDecoder('utf-8').decode(await file.slice(BYTES_DE_CABECERA_GLB, BYTES_DE_CABECERA_GLB + cabecera.bytesDelJson).arrayBuffer());
        const json = leerJsonDelModelo(texto);
        if (!json.ok) return falla(json.motivo);
        piezas = json.piezas;
      }
      setArchivo({ nombre: file.name, bytes: file.size, piezas });
      elegido.current = { file, clave: nuevaClaveDeImportacion(), piezas };
    } catch {
      return falla('incompleto');
    }
    return subir(nombre);
  }, [falla, subir]);

  const reintentar = useCallback((nombre: string) => subir(nombre), [subir]);

  const cancelar = useCallback(() => {
    corte.current?.abort();
    corte.current = null;
  }, []);

  const reiniciar = useCallback(() => {
    corte.current?.abort();
    corte.current = null;
    elegido.current = null;
    setFase('lista');
    setProgreso(0);
    setFallo(null);
    setArchivo(null);
  }, []);

  return { abierta, puedeElegir: sePuedeElegirUnArchivo(), fase, progreso, fallo, archivo, comprobarPuerta, importar, reintentar, cancelar, reiniciar };
};
