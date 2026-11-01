import { useRef, useState } from 'react';
import { leerAuditoria, type EntradaDeAuditoriaVista } from '../api/operaciones';
import { Cargable } from '../componentes/Cargable';
import { AvisoDeLista } from '../componentes/Lista';
import { Dato, Datos, Etiqueta, Filtros, Seccion, Selector, Tabla, useOrden, type Tono } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { Vista } from '../componentes/Vista';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

const LIMITE = 50;
const RESULTADOS = ['ok', 'intento', 'denegado', 'error'] as const;

/** Lo no previsto se queda en atención: es mejor mirarlo de más que dejarlo pasar. */
export const tonoDeAuditoria = (r: string | undefined): Tono => (r === 'ok' ? 'ok' : r === 'denegado' || r === 'error' ? 'error' : r ? 'atencion' : 'sinDatos');

const claveDe = (e: EntradaDeAuditoriaVista) => `${e.correlacion}/${e.en}/${e.resultado}`;

/**
 * Un `intento` se escribe antes de una escritura y su cierre cuando se sabe cómo acabó, con la misma correlación. Las
 * entradas llegan de más a menos reciente, así que el cierre de un intento que se ve también se vería: si no está, no lo hay.
 */
export const correlacionesCerradas = (items: EntradaDeAuditoriaVista[]) => new Set(items.filter((e) => e.resultado !== 'intento' && e.correlacion).map((e) => e.correlacion));

/** Las filas ordenables de lo cargado. Sin elegir nada, el orden del servidor: de más a menos reciente. */
const TablaDeEntradas = ({ filtradas, abierta, nombreDe, sinCierre, alAbrir }: { filtradas: EntradaDeAuditoriaVista[]; abierta: string | null; nombreDe: (r: string | undefined) => string; sinCierre: (e: EntradaDeAuditoriaVista) => boolean; alAbrir: (e: EntradaDeAuditoriaVista, boton: HTMLButtonElement) => void }) => {
  const { t, fecha } = useIdioma();
  const nada = t('admin.comun.sinDato');
  const { filas, orden } = useOrden(filtradas, { 0: (e) => e.en, 1: (e) => e.actor, 2: (e) => e.accion, 3: (e) => e.recurso, 6: (e) => e.resultado });
  return (
    <Tabla ancha accionFija orden={orden} secundarias={[4, 5]} cabeceras={[t('admin.auditoria.cuando'), t('admin.auditoria.quien'), t('admin.auditoria.accion'), t('admin.auditoria.recurso'), t('admin.auditoria.correlacion'), t('admin.auditoria.entorno'), t('admin.auditoria.resultado'), t('admin.auditoria.detalle')]}>
      {filas.map((e) => (
        <tr key={claveDe(e)}>
          <td>{fecha(e.en)}</td>
          <td className="codigo">{[e.actor, e.rol].filter(Boolean).join(' · ') || nada}</td>
          <td className="codigo">{e.accion ?? nada}</td>
          <td className="codigo">{e.recurso ?? nada}</td>
          <td className="codigo">{e.correlacion ?? nada}</td>
          <td>{e.entorno ?? nada}</td>
          <td>
            <span className="etiquetas">
              <Etiqueta tono={tonoDeAuditoria(e.resultado)}>{nombreDe(e.resultado)}</Etiqueta>
              {sinCierre(e) ? <Etiqueta tono="atencion">{t('admin.auditoria.sinCierre')}</Etiqueta> : null}
            </span>
          </td>
          <td><button type="button" className="boton pequeno" aria-expanded={abierta === claveDe(e)} onClick={(ev) => alAbrir(e, ev.currentTarget)}>{t('admin.auditoria.verDetalle')}</button></td>
        </tr>
      ))}
    </Tabla>
  );
};

/** El registro de auditoría de administración: solo se lee. Nadie puede editarlo ni borrarlo desde la consola. */
const Entradas = () => {
  const { t, fecha } = useIdioma();
  const { estado, recargar } = useAccion('opsAdmin.auditoria', { limit: LIMITE }, leerAuditoria, (p) => p.items.length === 0);
  const [resultado, setResultado] = useState('');
  const [texto, setTexto] = useState('');
  const [abierta, setAbierta] = useState<string | null>(null);
  const origen = useRef<HTMLButtonElement | null>(null);
  const detalle = useRef<HTMLHeadingElement>(null);
  const nada = t('admin.comun.sinDato');
  const nombreDe = (r: string | undefined) => (r && (RESULTADOS as readonly string[]).includes(r) ? t(`admin.auditoria.resultados.${r}`) : r ?? nada);

  return (
    <Seccion titulo={t('admin.auditoria.entradas')} pie={<Procedencia fuente="opsAdmin.auditoria (adminAudit)" estado={estado} />}>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.auditoria.sinEntradas')} hijos={(p) => {
        const cerradas = correlacionesCerradas(p.items);
        const sinCierre = (e: EntradaDeAuditoriaVista) => e.resultado === 'intento' && (!e.correlacion || !cerradas.has(e.correlacion));
        const buscado = texto.trim().toLowerCase();
        const filtradas = p.items.filter((e) => (!resultado || e.resultado === resultado) && (!buscado || [e.actor, e.accion, e.recurso, e.correlacion].some((v) => v?.toLowerCase().includes(buscado))));
        const elegida = abierta === null ? undefined : p.items.find((e) => claveDe(e) === abierta);
        return (
          <>
            <Filtros>
              <Selector etiqueta={t('admin.auditoria.resultado')} valor={resultado} alCambiar={setResultado} todas={t('admin.ops.todos')} opciones={RESULTADOS.map((r) => ({ valor: r, texto: nombreDe(r) }))} />
              <label className="filtro crece">
                <span>{t('admin.auditoria.filtroTexto')}</span>
                <input className="campo" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" spellCheck={false} />
              </label>
            </Filtros>
            <p className="nota">{t('admin.auditoria.filtroNota', { contador: p.items.length })}</p>
            {filtradas.length === 0 ? <p className="estado vacio">{t('admin.auditoria.sinCoincidencias')}</p> : (
              <TablaDeEntradas filtradas={filtradas} abierta={abierta} nombreDe={nombreDe} sinCierre={sinCierre} alAbrir={(e, boton) => {
                origen.current = boton;
                setAbierta(claveDe(e));
                requestAnimationFrame(() => detalle.current?.focus());
              }} />
            )}
            <AvisoDeLista truncado={p.truncado} />
            {elegida && (
              <div className="panel-detalle">
                <div className="panel-detalle-cabeza">
                  <h3 ref={detalle} tabIndex={-1}>{t('admin.auditoria.detalle')}</h3>
                  <button type="button" className="boton pequeno" onClick={() => { setAbierta(null); origen.current?.focus(); }}>{t('admin.comun.cerrar')}</button>
                </div>
                <Datos>
                  <Dato etiqueta={t('admin.auditoria.cuando')} valor={fecha(elegida.en)} />
                  <Dato etiqueta={t('admin.auditoria.quien')} valor={<span className="codigo">{elegida.actor ?? nada}</span>} />
                  <Dato etiqueta={t('admin.auditoria.rol')} valor={elegida.rol ?? nada} />
                  <Dato etiqueta={t('admin.auditoria.accion')} valor={<span className="codigo">{elegida.accion ?? nada}</span>} />
                  <Dato etiqueta={t('admin.auditoria.recurso')} valor={<span className="codigo">{elegida.recurso ?? nada}</span>} />
                  <Dato etiqueta={t('admin.auditoria.resultado')} valor={<Etiqueta tono={tonoDeAuditoria(elegida.resultado)}>{nombreDe(elegida.resultado)}</Etiqueta>} />
                  <Dato etiqueta={t('admin.auditoria.correlacion')} valor={<span className="codigo">{elegida.correlacion ?? nada}</span>} />
                  <Dato etiqueta={t('admin.auditoria.entorno')} valor={elegida.entorno ?? nada} />
                  {elegida.codigoDeError ? <Dato etiqueta={t('admin.auditoria.codigoDeError')} valor={<span className="codigo">{elegida.codigoDeError}</span>} /> : null}
                  {elegida.motivo ? <Dato etiqueta={t('admin.auditoria.motivo')} valor={elegida.motivo} /> : null}
                  {elegida.metadatos.map(([clave, valor]) => <Dato key={clave} etiqueta={clave} valor={<span className="codigo">{valor}</span>} />)}
                </Datos>
                {sinCierre(elegida) ? <p className="nota">{t('admin.auditoria.sinCierreAyuda')}</p> : null}
              </div>
            )}
          </>
        );
      }} />
    </Seccion>
  );
};

export const Auditoria = () => {
  const { t } = useIdioma();
  return (
    <Vista titulo={t('admin.auditoria.titulo')} descripcion={t('admin.auditoria.descripcion')} dominios={['l']}>
      <Entradas />
    </Vista>
  );
};
