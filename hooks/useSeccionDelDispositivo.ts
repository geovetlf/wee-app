/*
 * Conecta la sección «En este dispositivo» (utils/seccionDelDispositivo.ts) con el aparato: la
 * ubicación de la plataforma, AsyncStorage para los metadatos y la entrega del archivo exportado.
 * La lógica vive en el controlador; aquí solo se guarda el estado y se recarga al entrar.
 *
 * Cada acción recarga la sección al terminar, así lo que se ve sale siempre de la misma
 * comprobación (`verificarRecurso`), nunca de una copia de la pantalla.
 */
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { crearAlmacenDeMetadatos } from '../services/almacenLocal/almacenDeMetadatos';
import { crearAlmacenSobrePuerto } from '../services/almacenLocal/sobrePuerto';
import { puertoDeUbicacionDelDispositivo, tiendaDeUbicacion } from '../services/almacenLocal/ubicacion';
import { entregarArchivo } from '../services/almacenLocal/entrega';
import { ErrorAlmacenLocal, type AlmacenLocal } from '../services/almacenLocal/tipos';
import type { CatalogoLocal } from '../utils/catalogoLocal';
import {
  abrirProyectoEnSeccion,
  activarSeccion,
  cargarSeccion,
  crearProyectoEnSeccion,
  duplicarProyectoEnSeccion,
  eliminarProyectoEnSeccion,
  exportarProyectoEnSeccion,
  nombreDeArchivoDeExportacion,
  volverAPermitirSeccion,
  type DependenciasDeLaSeccion,
  type ErrorDeLaSeccion,
  type ResultadoDeAccion,
  type VistaDeLaSeccion,
  type ArchivoDeLaSeccion,
} from '../utils/seccionDelDispositivo';

const ES_WEB = Platform.OS === 'web';

/** Las dependencias reales. Una sola vez por operación: cada una abre lo que necesita. */
const crearDependencias = (cuentaId: string | undefined): DependenciasDeLaSeccion => {
  const puerto = puertoDeUbicacionDelDispositivo;
  const plataforma = ES_WEB ? 'web' : 'nativo';
  return {
    puerto,
    tienda: tiendaDeUbicacion,
    metadatos: crearAlmacenDeMetadatos(AsyncStorage, { plataforma }),
    archivosDe: (referenciaWee: string): AlmacenLocal => {
      if (!puerto) throw new ErrorAlmacenLocal('no_disponible', 'sin ubicación en este aparato');
      return crearAlmacenSobrePuerto(puerto.puertoDeArchivos(referenciaWee), {
        plataforma,
        persistencia: ES_WEB ? 'desconocida' : 'no_garantizada',
      });
    },
    ahora: () => Date.now(),
    cuentaId,
  };
};

export interface SeccionDelDispositivo {
  vista: VistaDeLaSeccion | null;
  cargando: boolean;
  ocupado: boolean;
  error: ErrorDeLaSeccion | null;
  limpiarError: () => void;
  activar: () => Promise<void>;
  volverAPermitir: () => Promise<void>;
  crearProyecto: (nombre: string) => Promise<boolean>;
  abrirProyecto: (projectId: string) => Promise<ResultadoDeAccion<ArchivoDeLaSeccion[]>>;
  duplicarProyecto: (projectId: string, nombreDeLaCopia: string) => Promise<boolean>;
  eliminarProyecto: (projectId: string) => Promise<boolean>;
  exportarProyecto: (projectId: string) => Promise<boolean>;
}

export const useSeccionDelDispositivo = (): SeccionDelDispositivo => {
  const { user } = useAuth();
  const cuentaId = user?.uid;
  const [vista, setVista] = useState<VistaDeLaSeccion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaSeccion | null>(null);
  /** El catálogo abierto por la última carga. Las acciones lo usan sin esperar a un render. */
  const catalogoRef = useRef<CatalogoLocal | null>(null);

  const aplicar = useCallback((nueva: VistaDeLaSeccion) => {
    catalogoRef.current = nueva.catalogo;
    setVista(nueva);
  }, []);

  const recargar = useCallback(async () => {
    try {
      aplicar(await cargarSeccion(crearDependencias(cuentaId)));
    } catch (fallo) {
      console.warn('No se pudo cargar la sección del dispositivo:', fallo);
    } finally {
      setCargando(false);
    }
  }, [cuentaId, aplicar]);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  const conOcupado = async (operacion: () => Promise<void>): Promise<void> => {
    setOcupado(true);
    try {
      await operacion();
    } finally {
      setOcupado(false);
    }
  };

  /** Ejecuta una acción sobre el catálogo abierto y recarga la sección después. */
  const ejecutar = async <T>(operacion: (catalogo: CatalogoLocal) => Promise<ResultadoDeAccion<T>>): Promise<ResultadoDeAccion<T>> => {
    const catalogo = catalogoRef.current;
    if (!catalogo) return { ok: false, error: 'errorNoDisponible' };
    const resultado = await operacion(catalogo);
    setError(resultado.ok ? null : resultado.error);
    await recargar();
    return resultado;
  };

  const activar = () =>
    conOcupado(async () => {
      aplicar(await activarSeccion(crearDependencias(cuentaId)));
    });

  const volverAPermitir = () =>
    conOcupado(async () => {
      const registro = vista?.estado.registro;
      if (registro) aplicar(await volverAPermitirSeccion(crearDependencias(cuentaId), registro));
    });

  const crearProyecto = async (nombre: string): Promise<boolean> => {
    let creado = false;
    await conOcupado(async () => {
      creado = (await ejecutar((catalogo) => crearProyectoEnSeccion(catalogo, nombre))).ok;
    });
    return creado;
  };

  const abrirProyecto = async (projectId: string): Promise<ResultadoDeAccion<ArchivoDeLaSeccion[]>> => {
    let resultado: ResultadoDeAccion<ArchivoDeLaSeccion[]> = { ok: false, error: 'errorDesconocido' };
    await conOcupado(async () => {
      resultado = await ejecutar((catalogo) => abrirProyectoEnSeccion(catalogo, projectId));
    });
    return resultado;
  };

  const duplicarProyecto = async (projectId: string, nombreDeLaCopia: string): Promise<boolean> => {
    let hecho = false;
    await conOcupado(async () => {
      hecho = (await ejecutar((catalogo) => duplicarProyectoEnSeccion(catalogo, projectId, nombreDeLaCopia))).ok;
    });
    return hecho;
  };

  const eliminarProyecto = async (projectId: string): Promise<boolean> => {
    let hecho = false;
    await conOcupado(async () => {
      hecho = (await ejecutar((catalogo) => eliminarProyectoEnSeccion(catalogo, projectId))).ok;
    });
    return hecho;
  };

  const exportarProyecto = async (projectId: string): Promise<boolean> => {
    let entregado = false;
    await conOcupado(async () => {
      const nombre = vista?.estado.proyectos.find((proyecto) => proyecto.projectId === projectId)?.name ?? '';
      const resultado = await ejecutar((catalogo) => exportarProyectoEnSeccion(catalogo, projectId, Date.now()));
      if (resultado.ok) entregado = await entregarArchivo(nombreDeArchivoDeExportacion(nombre), resultado.valor);
    });
    return entregado;
  };

  return {
    vista,
    cargando,
    ocupado,
    error,
    limpiarError: () => setError(null),
    activar,
    volverAPermitir,
    crearProyecto,
    abrirProyecto,
    duplicarProyecto,
    eliminarProyecto,
    exportarProyecto,
  };
};
