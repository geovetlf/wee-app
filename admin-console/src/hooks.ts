import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { NombreDeAccion, ParametrosPorAccion } from './api/acciones';
import { ErrorDeAdmin, clasificarError } from './api/errores';
import { useCliente } from './servicios';

export type EstadoDeCarga<T> =
  | { fase: 'inactivo' }
  | { fase: 'cargando' }
  | { fase: 'vacio' }
  /** `leidoEn`: cuándo respondió el servidor (ms). La consola lo enseña para que se sepa lo fresco que es el dato. */
  | { fase: 'ok'; datos: T; leidoEn: number }
  | { fase: 'error'; error: ErrorDeAdmin };

/**
 * Lo que una vista comparte con sus consultas (`componentes/Vista`): el botón «Actualizar» sube `generacion` y las
 * consultas se repiten; cada una avisa de cuándo empieza y de cuándo el servidor contestó, para que la cabecera pueda
 * decir la hora de verdad. Solo se repite algo cuando alguien lo pide: la consola no consulta sola, porque cada lectura
 * de datos de personas deja una entrada en `adminAudit`.
 */
export interface RefrescoDeVista {
  generacion: number;
  empezar: () => void;
  terminar: (leidoEn?: number) => void;
  /** Qué consultas de la vista están ahora en error: la cabecera no puede decir «actualizado» si alguna falló. */
  informar: (consulta: string, conError: boolean) => void;
}
export const ContextoDeVista = createContext<RefrescoDeVista | null>(null);

/**
 * Pide una acción de la lista permitida y la deja en uno de cinco estados. `parametros === null` = todavía no se
 * pide (por ejemplo, el formulario de una cuenta aún sin enviar). Una respuesta que llega tarde, de una petición
 * ya superada, se descarta. `esVacio` decide cuándo «ok» es en realidad «sin datos».
 *
 * `manual`: no se repite con «Actualizar». Es para lo que una persona pidió a mano, como consultar UNA cuenta: repetirlo
 * sin que lo pida dejaría en la auditoría una consulta que nadie hizo.
 *
 * Al repetir la misma consulta los datos anteriores se quedan a la vista hasta que llega la respuesta, y si falla los
 * sustituye el error: nunca se enseña un dato viejo como si fuera el último.
 */
export function useAccion<A extends NombreDeAccion, T>(
  accion: A,
  parametros: ParametrosPorAccion[A] | null,
  leer: (crudo: unknown) => T,
  esVacio: (datos: T) => boolean = () => false,
  opciones: { manual?: boolean } = {},
): { estado: EstadoDeCarga<T>; recargar: () => void } {
  const cliente = useCliente();
  const vista = useContext(ContextoDeVista);
  const [estado, setEstado] = useState<EstadoDeCarga<T>>(parametros === null ? { fase: 'inactivo' } : { fase: 'cargando' });
  const [intento, setIntento] = useState(0);
  const ultimo = useRef(0);
  const clave = JSON.stringify(parametros);
  const claveLeida = useRef<string | null>(null);
  const leerRef = useRef(leer);
  const vacioRef = useRef(esVacio);
  const vistaRef = useRef(opciones.manual ? null : vista);
  leerRef.current = leer;
  vacioRef.current = esVacio;
  vistaRef.current = opciones.manual ? null : vista;
  const generacion = opciones.manual ? 0 : vista?.generacion ?? 0;
  const idDeConsulta = useId();
  useEffect(() => () => vistaRef.current?.informar(idDeConsulta, false), [idDeConsulta]);

  useEffect(() => {
    if (parametros === null) {
      setEstado({ fase: 'inactivo' });
      return;
    }
    const numero = ++ultimo.current;
    const repetida = claveLeida.current === clave;
    setEstado((antes) => (repetida && antes.fase === 'ok' ? antes : { fase: 'cargando' }));
    const aviso = vistaRef.current;
    aviso?.empezar();
    let cerrada = false;
    const cerrar = (leidoEn?: number) => {
      if (cerrada) return;
      cerrada = true;
      aviso?.terminar(leidoEn);
    };
    cliente.llamar(accion, parametros as ParametrosPorAccion[A]).then(
      (crudo) => {
        if (numero !== ultimo.current) return;
        const datos = leerRef.current(crudo);
        const leidoEn = Date.now();
        claveLeida.current = clave;
        setEstado(vacioRef.current(datos) ? { fase: 'vacio' } : { fase: 'ok', datos, leidoEn });
        aviso?.informar(idDeConsulta, false);
        cerrar(leidoEn);
      },
      (error) => {
        if (numero !== ultimo.current) return;
        claveLeida.current = null;
        setEstado({ fase: 'error', error: clasificarError(error) });
        aviso?.informar(idDeConsulta, true);
        cerrar();
      },
    );
    return () => {
      ultimo.current++;
      cerrar();
    };
    // `clave` representa a `parametros` por valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, accion, clave, intento, generacion]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);
  return { estado, recargar };
}
