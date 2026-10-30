import { useEffect, useId, useState, type ReactNode } from 'react';
import type { NombreDeAccion, ParametrosPorAccion } from '../api/acciones';
import type { PaginaVista } from '../api/operaciones';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';
import { Cargable } from './Cargable';

/*
 * UNA LISTA QUE DICE HASTA DÓNDE MIRÓ. Todas las listas de la consola avisan igual cuando no enseñan todo, y ninguna
 * dice «no hay» si no ha mirado todo: una lista vacía y parcial se queda en «nada en lo mirado» y deja seguir mirando.
 */
export const AvisoDeLista = ({ examinados, truncado, parcial }: { examinados?: number; truncado: boolean; parcial?: boolean }) => {
  const { t } = useIdioma();
  if (examinados === undefined && !truncado) return null;
  return (
    <p className="nota" data-aviso-de-lista>
      {parcial && examinados !== undefined ? t('admin.lista.parcial', { contador: examinados }) : examinados !== undefined ? t('admin.ops.examinados', { contador: examinados }) : null}
      {truncado && !parcial ? ` ${t('admin.ops.truncado')}` : null}
    </p>
  );
};

/** Buscar en lo que ya llegó. Lo dice: el servidor no busca por esto, y lo que no se ha cargado no se busca. */
export const BuscadorLocal = ({ valor, alCambiar, etiqueta }: { valor: string; alCambiar: (v: string) => void; etiqueta: string }) => {
  const { t } = useIdioma();
  const id = useId();
  return (
    <div className="filtro crece">
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} className="campo" value={valor} onChange={(e) => alCambiar(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby={`${id}-nota`} />
      <small id={`${id}-nota`} className="nota">{t('admin.lista.soloCargado')}</small>
    </div>
  );
};

export const coincide = (buscado: string, ...campos: (string | undefined)[]): boolean => {
  const b = buscado.trim().toLowerCase();
  return !b || campos.some((c) => c?.toLowerCase().includes(b));
};

/** Para las listas de los callables que no devuelven `truncado`: si vino llena, puede haber más. */
export const avisoPorLimite = (recibidos: number, limite: number): boolean => recibidos >= limite;

type ConCursor = { cursor?: string };

export function useListaPaginada<A extends NombreDeAccion, T>(accion: A, parametros: ParametrosPorAccion[A] & ConCursor, leer: (crudo: unknown) => PaginaVista<T>) {
  const [cursor, setCursor] = useState<string | undefined>();
  const clave = JSON.stringify(parametros);
  /* Otros filtros, otra lista: se vuelve a empezar. */
  useEffect(() => setCursor(undefined), [clave]);
  const { estado, recargar } = useAccion(accion, { ...parametros, ...(cursor ? { cursor } : {}) }, leer, (p) => p.items.length === 0 && !p.truncado && !p.parcial);
  return { estado, recargar, seguir: setCursor, alPrincipio: () => setCursor(undefined), enContinuacion: cursor !== undefined };
}

export function ListaPaginada<T>({ lista, vacio, hijos }: {
  lista: ReturnType<typeof useListaPaginada<NombreDeAccion, T>>;
  vacio: string;
  hijos: (items: T[]) => ReactNode;
}) {
  const { t } = useIdioma();
  return (
    <>
      <Cargable estado={lista.estado} recargar={lista.recargar} vacio={lista.enContinuacion ? t('admin.lista.noHayMas') : vacio} hijos={(p) => (
        <>
          {p.items.length > 0 ? hijos(p.items) : <p className="estado vacio">{t('admin.lista.vacioParcial')}</p>}
          <AvisoDeLista examinados={p.examinados} truncado={p.truncado} parcial={p.parcial} />
          {p.cursor && <div className="paginacion"><button type="button" className="boton" onClick={() => lista.seguir(p.cursor)}>{t('admin.lista.siguientes')}</button></div>}
        </>
      )} />
      {lista.enContinuacion && <div className="paginacion"><button type="button" className="boton discreto" onClick={lista.alPrincipio}>{t('admin.lista.alPrincipio')}</button></div>}
    </>
  );
}
