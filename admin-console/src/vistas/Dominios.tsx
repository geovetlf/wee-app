import { useState } from 'react';
import { DOMINIOS, TONO_DE_ESTADO, dominioPorId, estadoDeDominio, type Dominio } from '../dominios';
import { Icono } from '../componentes/Iconos';
import { Aviso, Etiqueta, Filtros, Seccion, Selector, Tabla } from '../componentes/Piezas';
import { Vista } from '../componentes/Vista';
import { useIdioma } from '../i18n/i18n';
import type { RutaDeConsola } from './Consola';

/*
 * EL CATÁLOGO DE DOMINIOS. No pide nada al servidor: dice qué existe y qué no. Por eso lo ve toda la administración: no hay
 * ningún dato de nadie, y un rol que no pueda abrir una sección lo sabe aquí en vez de encontrarse con un menú a medias.
 */

/** La tabla de dominios, también en el Panorama. */
export const TablaDeDominios = ({ dominios = DOMINIOS }: { dominios?: readonly Dominio[] }) => {
  const { t } = useIdioma();
  return (
    <Tabla largas={[2]} cabeceras={[t('admin.dominios.dominio'), t('admin.dominios.estado'), t('admin.dominios.responsabilidad')]}>
      {dominios.map((d) => {
        const estado = estadoDeDominio(d);
        return (
          <tr key={d.id}>
            <th scope="row"><a className="enlace-de-fila" href={`#/dominios/${d.id}`}><span className="letra" aria-hidden="true">{d.id.toUpperCase()}</span>{t(`admin.dominios.lista.${d.id}.nombre`)}</a></th>
            <td><Etiqueta tono={TONO_DE_ESTADO[estado]}>{t(`admin.dominios.estados.${estado}`)}</Etiqueta></td>
            <td>{t(`admin.dominios.lista.${d.id}.responsabilidad`)}</td>
          </tr>
        );
      })}
    </Tabla>
  );
};

const Detalle = ({ dominio, rutas }: { dominio: Dominio; rutas: readonly RutaDeConsola[] }) => {
  const { t } = useIdioma();
  const estado = estadoDeDominio(dominio);
  const nada = t('admin.comun.sinDato');
  return (
    <Vista titulo={t(`admin.dominios.lista.${dominio.id}.nombre`)} descripcion={t(`admin.dominios.lista.${dominio.id}.responsabilidad`)} refrescable={false}>
      <p className="migas"><a className="enlace-texto-suelto" href="#/dominios">{t('admin.dominios.volver')}</a></p>
      <Seccion titulo={t('admin.dominios.estadoReal')} acciones={<Etiqueta tono={TONO_DE_ESTADO[estado]}>{t(`admin.dominios.estados.${estado}`)}</Etiqueta>}>
        <Tabla largas={[2]} cabeceras={[t('admin.dominios.funcion'), t('admin.dominios.estado'), t('admin.dominios.fuente')]}>
          {dominio.funciones.map((f) => (
            <tr key={f.clave}>
              <th scope="row">{t(`admin.dominios.lista.${dominio.id}.funciones.${f.clave}`)}</th>
              <td><Etiqueta tono={TONO_DE_ESTADO[f.estado]}>{t(`admin.dominios.estadosFuncion.${f.estado}`)}</Etiqueta></td>
              <td className="codigo">{f.fuente?.join(', ') ?? nada}</td>
            </tr>
          ))}
        </Tabla>
      </Seccion>
      <Seccion titulo={t('admin.dominios.dependencias')}>
        <p>{t(`admin.dominios.lista.${dominio.id}.dependencias`)}</p>
      </Seccion>
      <Seccion titulo={t('admin.dominios.dondeSeVe')}>
        {dominio.rutas.length === 0 ? <p className="estado vacio">{t('admin.dominios.sinPantalla')}</p> : (
          <ul className="filas" role="list">
            {dominio.rutas.map((r) => (
              <li key={r} className="fila">
                <div className="fila-texto"><span className="fila-principal">{t(`admin.nav.${r}`)}</span></div>
                <div className="fila-estado">
                  {rutas.includes(r)
                    ? <a className="enlace-texto-suelto" href={`#/${r}`}>{t('admin.panorama.abrir', { que: t(`admin.nav.${r}`) })}<Icono nombre="flecha" tamano={15} /></a>
                    : <Etiqueta tono="sinDatos">{t('admin.dominios.sinPermiso')}</Etiqueta>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </Vista>
  );
};

export const Dominios = ({ id, rutas }: { id?: string; rutas: readonly RutaDeConsola[] }) => {
  const { t } = useIdioma();
  const [filtro, setFiltro] = useState('');
  const dominio = id ? dominioPorId(id) : undefined;
  if (dominio) return <Detalle key={dominio.id} dominio={dominio} rutas={rutas} />;
  const lista = filtro ? DOMINIOS.filter((d) => estadoDeDominio(d) === filtro) : DOMINIOS;
  const de = (estado: string) => DOMINIOS.filter((d) => estadoDeDominio(d) === estado).length;
  return (
    <Vista titulo={t('admin.dominios.titulo')} descripcion={t('admin.dominios.descripcion')} refrescable={false}>
      {id && <Aviso tono="atencion">{t('admin.dominios.noExiste')}</Aviso>}
      <Aviso titulo={t('admin.dominios.definicionTitulo')}>{t('admin.dominios.definicion')}</Aviso>
      <Seccion titulo={t('admin.dominios.todos')} ayuda={t('admin.dominios.recuento', { operativos: de('operativo'), parciales: de('parcial'), pendientes: de('pendiente') })}>
        <Filtros>
          <Selector etiqueta={t('admin.dominios.estado')} valor={filtro} alCambiar={setFiltro} todas={t('admin.ops.todos')} opciones={(['operativo', 'parcial', 'pendiente'] as const).map((e) => ({ valor: e, texto: t(`admin.dominios.estados.${e}`) }))} />
        </Filtros>
        {lista.length === 0 ? <p className="estado vacio">{t('admin.dominios.sinCoincidencias')}</p> : <TablaDeDominios dominios={lista} />}
      </Seccion>
    </Vista>
  );
};
