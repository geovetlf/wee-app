import { Children, cloneElement, isValidElement, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { useT } from '../i18n/i18n';
import { Icono, type NombreDeIcono } from './Iconos';

/*
 * EL SISTEMA DE LA CONSOLA: las piezas con las que se pintan todas las vistas. Los estados de la consola son siempre un
 * texto con su icono, nunca solo un color. Los aspectos están en `estilos.css`, sobre sus tokens.
 */

export const Seccion = ({ titulo, ayuda, acciones, pie, children, className }: { titulo: string; ayuda?: ReactNode; acciones?: ReactNode; pie?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`seccion${className ? ` ${className}` : ''}`}>
    <header className="seccion-cabeza">
      <div className="seccion-titulos">
        <h2>{titulo}</h2>
        {ayuda ? <p className="nota">{ayuda}</p> : null}
      </div>
      {acciones ? <div className="seccion-acciones">{acciones}</div> : null}
    </header>
    <div className="seccion-cuerpo">{children}</div>
    {pie ? <footer className="seccion-pie">{pie}</footer> : null}
  </section>
);

export const Dato = ({ etiqueta, valor, resaltar }: { etiqueta: string; valor: ReactNode; resaltar?: boolean }) => (
  <div className={`dato${resaltar ? ' resaltado' : ''}`}>
    <dt>{etiqueta}</dt>
    <dd>{valor}</dd>
  </div>
);

export const Datos = ({ children }: { children: ReactNode }) => <dl className="datos">{children}</dl>;

/** Lo que dice el estado de un dato. `neutro` es información sin juicio: «En cola» no es ni bueno ni malo. */
export type Tono = 'ok' | 'atencion' | 'error' | 'sinDatos' | 'noIntegrada' | 'parcial' | 'neutro';

const ICONO_DE_TONO: Partial<Record<Tono, NombreDeIcono>> = {
  ok: 'correcto',
  atencion: 'atencion',
  error: 'error',
  sinDatos: 'sinDatos',
  noIntegrada: 'noIntegrada',
  parcial: 'parcial',
};

export const Etiqueta = ({ children, tono = 'neutro' }: { children: ReactNode; tono?: Tono }) => {
  const icono = ICONO_DE_TONO[tono];
  return (
    <span className={`etiqueta ${tono}`}>
      {icono ? <Icono nombre={icono} tamano={13} /> : null}
      {children}
    </span>
  );
};

/** Un aviso de bloque: `info` explica una limitación, `atencion` pide mirar algo. */
export const Aviso = ({ tono = 'info', titulo, children, alerta }: { tono?: 'info' | 'atencion' | 'error'; titulo?: string; children: ReactNode; alerta?: boolean }) => (
  <div className={`aviso ${tono}`} role={alerta ? 'alert' : undefined}>
    <Icono nombre={tono === 'info' ? 'info' : tono} />
    <div>
      {titulo ? <strong>{titulo}</strong> : null}
      <p>{children}</p>
    </div>
  </div>
);

/** Un indicador de los de arriba de una vista. El estado es opcional: un total de Credits no es ni bueno ni malo. */
export const Indicador = ({ etiqueta, icono, valor, estado, desglose, pie, enlace, enlaceTexto }: {
  etiqueta: string;
  icono: NombreDeIcono;
  valor: ReactNode;
  estado?: ReactNode;
  desglose?: ReactNode;
  pie?: ReactNode;
  enlace?: string;
  enlaceTexto?: string;
}) => {
  const id = useId();
  return (
    <article className="indicador" aria-labelledby={id}>
      <div className="indicador-cabeza">
        <Icono nombre={icono} />
        <h2 id={id}>{etiqueta}</h2>
        {enlace ? <a className="indicador-enlace" href={enlace} aria-label={enlaceTexto}><Icono nombre="flecha" tamano={16} /></a> : null}
      </div>
      <div className="indicador-valor">{valor}</div>
      {estado ? <div className="indicador-estado">{estado}</div> : null}
      {desglose ? <dl className="desglose">{desglose}</dl> : null}
      {pie ? <div className="indicador-pie">{pie}</div> : null}
    </article>
  );
};

export const Indicadores = ({ children }: { children: ReactNode }) => <div className="indicadores">{children}</div>;

/** Una línea de un `desglose`: etiqueta a la izquierda y valor a la derecha. */
export const Linea = ({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) => (
  <div className="linea">
    <dt>{etiqueta}</dt>
    <dd>{valor}</dd>
  </div>
);

type Celda = ReactElement<Record<string, unknown>>;

export interface Orden {
  /** Las columnas que se pueden ordenar. */
  columnas: readonly number[];
  activa: number | null;
  sentido: 'asc' | 'desc';
  alElegir: (columna: number | null, sentido?: 'asc' | 'desc') => void;
}

/**
 * Ordenar lo que YA está cargado: el servidor no ordena por estas columnas. La tabla lo dice en cuanto hay un orden elegido,
 * porque ordenar una página no es ordenar la lista. Sin elegir nada se queda el orden del servidor.
 */
export function useOrden<T>(items: readonly T[], valores: Partial<Record<number, (x: T) => string | number | undefined>>): { filas: readonly T[]; orden: Orden } {
  const [activa, setActiva] = useState<number | null>(null);
  const [sentido, setSentido] = useState<'asc' | 'desc'>('asc');
  const filas = useMemo(() => {
    const valor = activa === null ? undefined : valores[activa];
    if (!valor) return items;
    /* Lo que no tiene dato va al final en los dos sentidos: un hueco no es ni el mayor ni el menor. */
    return [...items].sort((a, b) => {
      const x = valor(a), y = valor(b);
      if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sentido === 'asc' ? c : -c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activa, sentido]);
  const orden: Orden = {
    columnas: Object.keys(valores).map(Number),
    activa,
    sentido,
    alElegir: (columna, nuevo) => {
      if (columna === activa && !nuevo) setSentido((s) => (s === 'asc' ? 'desc' : 'asc'));
      else { setActiva(columna); setSentido(nuevo ?? 'asc'); }
    },
  };
  return { filas, orden };
}

/**
 * Una tabla de la consola. Por debajo del ancho de su propio contenedor las filas se apilan en fichas (`estilos.css`),
 * así que no hay desplazamiento horizontal en un móvil. Por eso cada celda lleva en `data-et` el nombre de su columna, y
 * por eso los roles van explícitos: `display: block` borra la semántica de tabla en los lectores de pantalla.
 *
 *   · `numericas`: columnas alineadas a la derecha en escritorio, con cifras de ancho fijo.
 *   · `secundarias`: columnas que se quitan cuando no caben. SOLO si lo que dicen está en otro sitio, como un detalle.
 *   · `orden`: de `useOrden`; en escritorio se ordena desde la cabecera, y en fichas (sin cabecera) con un selector.
 *   · `largas`: columnas de texto corrido, que en una ficha ocupan todo el ancho.
 *   · `ancha`: pasa a fichas antes, porque tiene muchas columnas (de 4 a 6, algo antes que las de 2 o 3).
 */
export const Tabla = ({ cabeceras, children, accionFija = false, numericas = [], secundarias = [], largas = [], ancha = false, orden }: {
  cabeceras: string[];
  children: ReactNode;
  accionFija?: boolean;
  numericas?: number[];
  secundarias?: number[];
  largas?: number[];
  ancha?: boolean;
  orden?: Orden;
}) => {
  const t = useT();
  const claseDe = (i: number): string | undefined => [numericas.includes(i) ? 'num' : '', secundarias.includes(i) ? 'secundaria' : '', largas.includes(i) ? 'largo' : ''].filter(Boolean).join(' ') || undefined;
  const filas = Children.map(children, (fila) => {
    if (!isValidElement(fila)) return fila;
    const elemento = fila as Celda;
    return cloneElement(elemento, { role: 'row' }, Children.map(elemento.props.children as ReactNode, (celda, i) => {
      if (!isValidElement(celda)) return celda;
      const c = celda as Celda;
      const propia = c.props.className as string | undefined;
      return cloneElement(c, { role: c.type === 'th' ? 'rowheader' : 'cell', 'data-et': cabeceras[i], className: [propia, claseDe(i)].filter(Boolean).join(' ') || undefined });
    }));
  });
  return (
    <div className={`tabla-contenedor${accionFija ? ' accion-fija' : ''}${ancha ? ' ancha' : cabeceras.length > 3 ? ' media' : ''}`}>
      {orden && (
        <label className="orden-movil">
          <span>{t('admin.lista.ordenar')}</span>
          <select className="campo" value={orden.activa === null ? '' : `${orden.activa}:${orden.sentido}`} onChange={(e) => {
            const [c, s] = e.target.value.split(':');
            if (c === '') orden.alElegir(null); else orden.alElegir(Number(c), s as 'asc' | 'desc');
          }}>
            <option value="">{t('admin.lista.ordenServidor')}</option>
            {orden.columnas.flatMap((i) => [
              <option key={`${i}a`} value={`${i}:asc`}>{`${cabeceras[i]} ↑`}</option>,
              <option key={`${i}d`} value={`${i}:desc`}>{`${cabeceras[i]} ↓`}</option>,
            ])}
          </select>
        </label>
      )}
      <table role="table">
        <thead role="rowgroup">
          <tr role="row">{cabeceras.map((c, i) => (
            <th key={c} role="columnheader" scope="col" className={claseDe(i)} aria-sort={orden?.columnas.includes(i) ? (orden.activa === i ? (orden.sentido === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}>
              {orden?.columnas.includes(i)
                ? <button type="button" className={`cabecera-orden${orden.activa === i ? ' activa' : ''}`} onClick={() => orden.alElegir(i)}>{c}<span className="flecha-orden"><Icono nombre={orden.activa === i ? (orden.sentido === 'asc' ? 'sube' : 'baja') : 'orden'} tamano={13} /></span></button>
                : c}
            </th>
          ))}</tr>
        </thead>
        <tbody role="rowgroup">{filas}</tbody>
      </table>
      {orden && orden.activa !== null ? <p className="nota orden-nota">{t('admin.lista.ordenLocal')}</p> : null}
    </div>
  );
};

export const Selector = ({ etiqueta, valor, opciones, alCambiar, todas }: { etiqueta: string; valor: string; opciones: readonly { valor: string; texto: string }[]; alCambiar: (v: string) => void; todas: string }) => (
  <label className="filtro">
    <span>{etiqueta}</span>
    <select className="campo" value={valor} onChange={(e) => alCambiar(e.target.value)}>
      <option value="">{todas}</option>
      {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
    </select>
  </label>
);

export const Filtros = ({ children }: { children: ReactNode }) => <div className="filtros">{children}</div>;

/** Pestañas de verdad: flechas para moverse entre ellas y una sola parada de tabulador. El panel es el contenido activo. */
export function Pestanas<K extends string>({ etiqueta, opciones, activa, alCambiar, children }: {
  etiqueta: string;
  opciones: readonly { clave: K; texto: string }[];
  activa: K;
  alCambiar: (clave: K) => void;
  children: ReactNode;
}) {
  const base = useId();
  const lista = useRef<HTMLDivElement>(null);
  const alPulsar = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = opciones.findIndex((o) => o.clave === activa);
    const destino = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? opciones.length - 1 : null;
    if (destino === null) return;
    e.preventDefault();
    const siguiente = (destino + opciones.length) % opciones.length;
    alCambiar(opciones[siguiente].clave);
    lista.current?.querySelectorAll('button')[siguiente]?.focus();
  };
  return (
    <>
      <div className="pestanas" role="tablist" aria-label={etiqueta} ref={lista}>
        {opciones.map((o) => (
          <button key={o.clave} type="button" role="tab" id={`${base}-${o.clave}`} aria-selected={o.clave === activa} aria-controls={`${base}-panel`} tabIndex={o.clave === activa ? 0 : -1} className={`pestana${o.clave === activa ? ' activa' : ''}`} onClick={() => alCambiar(o.clave)} onKeyDown={alPulsar}>
            {o.texto}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${activa}`} className="panel-de-pestana">
        {children}
      </div>
    </>
  );
}
