import { useState, type ReactNode } from 'react';
import { ESTADOS_DE_CREACION, ESTADOS_DE_TRABAJO, EXPERIENCIAS_CON_SERVIDOR, NOMBRE_DE_EXPERIENCIA } from '../api/acciones';
import { leerCola, leerCreaciones, leerGeneraciones, leerNoDisponibles, leerProducciones, leerReservas, leerTrabajos, leerUsoIa, type CreacionVista, type TrabajoVista } from '../api/operaciones';
import { Cargable } from '../componentes/Cargable';
import { BuscadorLocal, ListaPaginada, coincide, useListaPaginada } from '../componentes/Lista';
import { Etiqueta, Filtros, Pestanas, Seccion, Selector, Tabla, useOrden, type Tono } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { Vista } from '../componentes/Vista';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

/*
 * OPERACIONES: cómo van los trabajos, las creaciones y las generaciones, sin tocar nada. Todo sale de `opsAdmin`, que
 * comprueba el permiso en cada llamada y deja constancia. Cada bloque solo se monta si la sesión tiene su permiso, y
 * dice hasta dónde miró (`componentes/Lista`): «no hay» nunca significa más de lo que se vio.
 *
 * Va por pestañas, y solo se consulta la que se ve: cada lectura de `opsAdmin` deja una entrada en `adminAudit`, así que
 * abrir esta vista no debería dejar diez.
 */
/** Lo que el servidor manda y la consola sabe decir. Un estado nuevo se enseña tal cual: mejor crudo que inventado. */
const ESTADOS_CONOCIDOS = ['queued', 'running', 'waiting', 'cancel_requested', 'completed', 'failed', 'timed_out', 'cancelled', 'asking', 'planned', 'done', 'PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
export const useEstado = () => {
  const { t } = useIdioma();
  return (e: string | undefined): string => (!e ? t('admin.comun.sinDato') : ESTADOS_CONOCIDOS.includes(e) ? t(`admin.ops.estados.${e}`) : e);
};
/** El tono de un estado de trabajo, creación o generación. Lo desconocido se queda neutro: no se le supone nada. */
export const tonoDeOperacion = (e: string | undefined): Tono => {
  if (!e) return 'sinDatos';
  if (['completed', 'done', 'COMPLETED'].includes(e)) return 'ok';
  if (['failed', 'timed_out', 'FAILED'].includes(e)) return 'error';
  return 'neutro';
};
const nombreDeExperiencia = (e: string | undefined, nada: string): string => (e ? (NOMBRE_DE_EXPERIENCIA as Record<string, string>)[e] ?? e : nada);

/** `atascado`: la tabla es de lo que no se mueve, y entonces cada fila dice si eso pide atención o no. */
const TablaDeTrabajos = ({ items, atascado = false }: { items: TrabajoVista[]; atascado?: boolean }) => {
  const { t, fecha, numero } = useIdioma();
  const estadoDe = useEstado();
  const nada = t('admin.comun.sinDato');
  const { filas, orden } = useOrden(items, { 1: (j) => j.estado, 2: (j) => j.capacidad, 4: (j) => j.intentos, 5: (j) => j.actualizado });
  return (
    <Tabla ancha orden={orden} numericas={[4]} cabeceras={[t('admin.ops.trabajo'), t('admin.ops.estado'), t('admin.ops.capacidad'), t('admin.ops.proveedor'), t('admin.ops.intentos'), t('admin.ops.actualizado'), t('admin.ops.cuenta')]}>
      {filas.map((j) => (
        <tr key={j.id}>
          <th scope="row" className="codigo">{j.id}</th>
          <td>
            <span className="etiquetas">
              <Etiqueta tono={tonoDeOperacion(j.estado)}>{estadoDe(j.estado)}</Etiqueta>
              {j.dentroDePlazo ? <Etiqueta>{t('admin.ops.dentroDePlazo')}</Etiqueta> : atascado ? <Etiqueta tono="atencion">{t('admin.ops.sinMoverse')}</Etiqueta> : null}
            </span>
          </td>
          <td>{j.capacidad ?? nada}</td>
          <td>{[j.proveedor, j.modelo].filter(Boolean).join(' / ') || nada}</td>
          <td>{numero(j.intentos)}</td>
          <td>{fecha(j.actualizado)}</td>
          <td className="codigo">{j.cuenta ?? nada}</td>
        </tr>
      ))}
    </Tabla>
  );
};

const Atascados = () => {
  const { t, numero } = useIdioma();
  const minutos = 30;
  const lista = useListaPaginada('opsAdmin.atascados', { minutos, limit: 25 }, leerTrabajos);
  return (
    <Seccion titulo={t('admin.ops.atascados')} ayuda={t('admin.ops.atascadosAyuda', { minutos: numero(minutos) })} pie={<Procedencia fuente="opsAdmin.atascados (jobs)" estado={lista.estado} />}>
      <ListaPaginada lista={lista} vacio={t('admin.ops.sinAtascados')} hijos={(items) => <TablaDeTrabajos atascado items={items} />} />
    </Seccion>
  );
};

const Cola = () => {
  const { t, fecha, numero } = useIdioma();
  const lista = useListaPaginada('opsAdmin.cola', { limit: 25 }, leerCola);
  const nada = t('admin.comun.sinDato');
  return (
    <Seccion titulo={t('admin.ops.cola')} ayuda={t('admin.ops.colaAyuda')} pie={<Procedencia fuente="opsAdmin.cola (jobQueue)" estado={lista.estado} />}>
      <ListaPaginada lista={lista} vacio={t('admin.ops.sinCola')} hijos={(items) => (
        <Tabla ancha numericas={[4]} cabeceras={[t('admin.ops.trabajo'), t('admin.ops.motivo'), t('admin.ops.encolado'), t('admin.ops.disponible'), t('admin.ops.entregas'), t('admin.ops.estado')]}>
          {items.map((c) => (
            <tr key={c.id}>
              <th scope="row" className="codigo">{c.id}</th>
              <td>{c.motivo ?? nada}</td>
              <td>{fecha(c.encolado)}</td>
              <td>{fecha(c.disponible)}</td>
              <td>{numero(c.entregas)}</td>
              <td>
                <span className="etiquetas">
                  {c.apartado ? <Etiqueta tono="atencion">{t('admin.ops.apartado')}</Etiqueta> : null}
                  {c.enVuelo ? <Etiqueta>{t('admin.ops.enVuelo')}</Etiqueta> : null}
                  {c.retrasado ? <Etiqueta tono="atencion">{t('admin.ops.retrasado')}</Etiqueta> : null}
                </span>
              </td>
            </tr>
          ))}
        </Tabla>
      )} />
    </Seccion>
  );
};

const Trabajos = () => {
  const { t } = useIdioma();
  const estadoDe = useEstado();
  const [filtro, setFiltro] = useState('');
  const lista = useListaPaginada('opsAdmin.trabajos', { limit: 25, ...(filtro ? { estado: filtro } : {}) }, leerTrabajos);
  return (
    <Seccion titulo={t('admin.ops.trabajos')} ayuda={t('admin.ops.trabajosAyuda')} pie={<Procedencia fuente="opsAdmin.trabajos (jobs)" estado={lista.estado} />}>
      <Filtros>
        <Selector etiqueta={t('admin.ops.estado')} valor={filtro} alCambiar={setFiltro} todas={t('admin.ops.noTerminados')} opciones={ESTADOS_DE_TRABAJO.map((e) => ({ valor: e, texto: estadoDe(e) }))} />
      </Filtros>
      <ListaPaginada lista={lista} vacio={t('admin.ops.sinTrabajos')} hijos={(items) => <TablaDeTrabajos items={items} />} />
    </Seccion>
  );
};

const TablaDeCreaciones = ({ items }: { items: CreacionVista[] }) => {
  const { t, fecha, numero } = useIdioma();
  const estadoDe = useEstado();
  const nada = t('admin.comun.sinDato');
  const { filas, orden } = useOrden(items, { 1: (c) => c.experiencia, 2: (c) => c.estado, 4: (c) => c.creditsCobrados, 5: (c) => c.creado, 6: (c) => c.actualizado });
  return (
    <Tabla ancha orden={orden} numericas={[4]} cabeceras={[t('admin.ops.creacion'), t('admin.ops.experiencia'), t('admin.ops.estado'), t('admin.ops.pasos'), t('admin.ops.creditsCobrados'), t('admin.ops.creado'), t('admin.ops.actualizado'), t('admin.ops.cuenta')]}>
      {filas.map((c) => (
        <tr key={c.id}>
          <th scope="row" className="codigo">{c.id}</th>
          <td>{nombreDeExperiencia(c.experiencia, nada)}</td>
          <td>
            <span className="etiquetas">
              <Etiqueta tono={tonoDeOperacion(c.estado)}>{estadoDe(c.estado)}</Etiqueta>
              {c.abandonado ? <Etiqueta tono="atencion">{t('admin.ops.abandonado')}</Etiqueta> : null}
              {c.demo ? <Etiqueta>{t('admin.ops.demo')}</Etiqueta> : null}
            </span>
          </td>
          <td>{t('admin.ops.pasosValor', { total: numero(c.pasos), fallidos: numero(c.pasosFallidos) })}</td>
          <td>{numero(c.creditsCobrados)}</td>
          <td>{fecha(c.creado)}</td>
          <td>{fecha(c.actualizado)}</td>
          <td className="codigo">{c.cuenta ?? nada}</td>
        </tr>
      ))}
    </Tabla>
  );
};

const CreacionesAtascadas = () => {
  const { t, numero } = useIdioma();
  const minutos = 30;
  const lista = useListaPaginada('opsAdmin.creacionesAtascadas', { minutos, limit: 25 }, leerCreaciones);
  return (
    <Seccion titulo={t('admin.ops.creacionesAtascadas')} ayuda={t('admin.ops.creacionesAtascadasAyuda', { minutos: numero(minutos) })} pie={<Procedencia fuente="opsAdmin.creacionesAtascadas (creatorJobs)" estado={lista.estado} />}>
      <ListaPaginada lista={lista} vacio={t('admin.ops.sinCreacionesAtascadas')} hijos={(items) => <TablaDeCreaciones items={items} />} />
    </Seccion>
  );
};

const Creaciones = () => {
  const { t } = useIdioma();
  const estadoDe = useEstado();
  const [experiencia, setExperiencia] = useState('');
  const [filtro, setFiltro] = useState('');
  const [buscado, setBuscado] = useState('');
  const lista = useListaPaginada('opsAdmin.creaciones', { limit: 25, ...(experiencia ? { experiencia } : {}), ...(filtro ? { estado: filtro } : {}) }, leerCreaciones);
  return (
    <Seccion titulo={t('admin.ops.creaciones')} ayuda={t('admin.ops.creacionesAyuda')} pie={<Procedencia fuente="opsAdmin.creaciones (creatorJobs)" estado={lista.estado} />}>
      <Filtros>
        <Selector etiqueta={t('admin.ops.experiencia')} valor={experiencia} alCambiar={setExperiencia} todas={t('admin.ops.todas')} opciones={EXPERIENCIAS_CON_SERVIDOR.map((e) => ({ valor: e, texto: NOMBRE_DE_EXPERIENCIA[e] }))} />
        <Selector etiqueta={t('admin.ops.estado')} valor={filtro} alCambiar={setFiltro} todas={t('admin.ops.todos')} opciones={ESTADOS_DE_CREACION.map((e) => ({ valor: e, texto: estadoDe(e) }))} />
        <BuscadorLocal etiqueta={t('admin.ops.buscarCreacion')} valor={buscado} alCambiar={setBuscado} />
        {(experiencia || filtro || buscado) && <button type="button" className="boton discreto" onClick={() => { setExperiencia(''); setFiltro(''); setBuscado(''); }}>{t('admin.ops.limpiar')}</button>}
      </Filtros>
      <ListaPaginada lista={lista} vacio={t('admin.ops.sinCreaciones')} hijos={(items) => {
        const visibles = items.filter((c) => coincide(buscado, c.id, c.cuenta));
        return visibles.length === 0 ? <p className="estado vacio">{t('admin.lista.sinCoincidencias')}</p> : <TablaDeCreaciones items={visibles} />;
      }} />
    </Seccion>
  );
};

const Producciones = () => {
  const { t, fecha } = useIdioma();
  const lista = useListaPaginada('opsAdmin.producciones', { limit: 25 }, leerProducciones);
  const nada = t('admin.comun.sinDato');
  return (
    <Seccion titulo={t('admin.ops.producciones')} ayuda={t('admin.ops.produccionesAyuda')} pie={<Procedencia fuente="opsAdmin.producciones (productions)" estado={lista.estado} />}>
      <ListaPaginada lista={lista} vacio={t('admin.ops.sinProducciones')} hijos={(items) => (
        <Tabla cabeceras={[t('admin.ops.produccion'), t('admin.ops.estado'), t('admin.ops.actualizado'), t('admin.ops.cuenta')]}>
          {items.map((x) => (
            <tr key={x.id}><th scope="row" className="codigo">{x.id}</th><td><Etiqueta>{x.estado ?? nada}</Etiqueta></td><td>{fecha(x.actualizada)}</td><td className="codigo">{x.cuenta ?? nada}</td></tr>
          ))}
        </Tabla>
      )} />
    </Seccion>
  );
};

/** El coste de proveedor solo llega con permiso de finanzas: sin él, la columna no existe. */
const Generaciones = ({ conCoste }: { conCoste: boolean }) => {
  const { t, fecha, numero } = useIdioma();
  const estadoDe = useEstado();
  const [experiencia, setExperiencia] = useState('');
  const lista = useListaPaginada('opsAdmin.generaciones', { limit: 25, ...(experiencia ? { experiencia } : {}) }, leerGeneraciones);
  const nada = t('admin.comun.sinDato');
  return (
    <Seccion titulo={t('admin.ops.generaciones')} ayuda={conCoste ? t('admin.ops.costeNota') : undefined} pie={<Procedencia fuente="opsAdmin.generaciones (aiGenerations)" estado={lista.estado} />}>
      <Filtros>
        <Selector etiqueta={t('admin.ops.experiencia')} valor={experiencia} alCambiar={setExperiencia} todas={t('admin.ops.todas')} opciones={EXPERIENCIAS_CON_SERVIDOR.map((e) => ({ valor: e, texto: NOMBRE_DE_EXPERIENCIA[e] }))} />
      </Filtros>
      <ListaPaginada lista={lista} vacio={t('admin.ops.sinGeneraciones')} hijos={(items) => (
        <Tabla ancha numericas={conCoste ? [5, 6, 7] : [5, 6]} cabeceras={[t('admin.ops.fecha'), t('admin.ops.experiencia'), t('admin.ops.capacidad'), t('admin.ops.proveedor'), t('admin.ops.estado'), t('admin.ops.duracionMs'), t('admin.ops.creditsCobrados'), ...(conCoste ? [t('admin.ops.costeUsd')] : [])]}>
          {items.map((g) => (
            <tr key={g.id}>
              <td>{fecha(g.creado)}</td>
              <td>{nombreDeExperiencia(g.experiencia, nada)}</td>
              <td>{g.capacidad ?? nada}</td>
              <td>{[g.proveedor, g.modelo].filter(Boolean).join(' / ') || nada}</td>
              <td><Etiqueta tono={tonoDeOperacion(g.estado)}>{estadoDe(g.estado)}</Etiqueta></td>
              <td>{numero(g.duracionMs)}</td>
              <td>{numero(g.creditsCobrados)}</td>
              {conCoste ? <td>{numero(g.costeUsd)}</td> : null}
            </tr>
          ))}
        </Tabla>
      )} />
    </Seccion>
  );
};

const UsoDelDia = ({ conCoste }: { conCoste: boolean }) => {
  const { t, numero } = useIdioma();
  const { estado, recargar } = useAccion('opsAdmin.usoIa', {}, leerUsoIa, (u) => !u.existe || u.items.length === 0);
  return (
    <Seccion titulo={t('admin.ops.usoIa')} pie={<Procedencia fuente="opsAdmin.usoIa (aiUsage)" estado={estado} />}>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.ops.sinUsoIa')} hijos={(u) => (
        <Tabla numericas={conCoste ? [2, 3, 4, 5] : [2, 3, 4]} cabeceras={[t('admin.ops.capacidad'), t('admin.ops.proveedor'), t('admin.ops.llamadas'), t('admin.ops.fallos'), t('admin.ops.creditsCobrados'), ...(conCoste ? [t('admin.ops.costeUsd')] : [])]}>
          {u.items.map((f) => (
            <tr key={`${f.capacidad}/${f.proveedor}`}>
              <th scope="row">{f.capacidad}</th><td>{f.proveedor}</td><td>{numero(f.llamadas)}</td><td>{numero(f.fallos)}</td><td>{numero(f.credits)}</td>{conCoste ? <td>{numero(f.usd)}</td> : null}
            </tr>
          ))}
        </Tabla>
      )} />
    </Seccion>
  );
};

const Reservas = () => {
  const { t, fecha, numero } = useIdioma();
  const lista = useListaPaginada('opsAdmin.reservas', { minutos: 120, limit: 25 }, leerReservas);
  const nada = t('admin.comun.sinDato');
  return (
    <Seccion titulo={t('admin.ops.reservas')} ayuda={t('admin.ops.reservasAyuda')} pie={<Procedencia fuente="opsAdmin.reservas (creditTransactions)" estado={lista.estado} />}>
      <ListaPaginada lista={lista} vacio={t('admin.ops.sinReservas')} hijos={(items) => (
        <Tabla numericas={[2]} cabeceras={[t('admin.ops.fecha'), t('admin.ops.servicio'), t('admin.ops.importe'), t('admin.ops.cuenta')]}>
          {items.map((r) => (
            <tr key={r.id}><td>{fecha(r.creada)}</td><td>{r.servicio ?? nada}</td><td>{numero(r.importe)}</td><td className="codigo">{r.cuenta ?? nada}</td></tr>
          ))}
        </Tabla>
      )} />
    </Seccion>
  );
};

/** Lo traduce la consola, por identificador; un identificador nuevo del servidor se enseña tal cual. */
const FALTAN_CONOCIDOS = ['incidentes', 'guardian', 'saludPersistida', 'barrido', 'music', 'design', 'totalesDeCuentas', 'restricciones'];

const NoDisponible = () => {
  const { t } = useIdioma();
  const { estado, recargar } = useAccion('opsAdmin.capacidades', undefined, leerNoDisponibles, (l) => l.length === 0);
  return (
    <Seccion titulo={t('admin.ops.noDisponible')} ayuda={t('admin.ops.noDisponibleAyuda')} pie={<Procedencia fuente="opsAdmin.capacidades" estado={estado} />}>
      <Cargable estado={estado} recargar={recargar} hijos={(l) => (
        <ul className="filas" role="list">
          {l.map((c) => (
            <li key={c.id} className="fila">
              <div className="fila-texto"><span className="fila-principal">{FALTAN_CONOCIDOS.includes(c.id) ? t(`admin.ops.faltan.${c.id}`) : c.id}</span></div>
              <div className="fila-estado"><Etiqueta tono="noIntegrada">{t('admin.estado.noIntegrada')}</Etiqueta></div>
            </li>
          ))}
        </ul>
      )} />
    </Seccion>
  );
};

type Pestana = 'atencion' | 'creaciones' | 'motor' | 'ia' | 'reservas' | 'sinFuente';

const Si = ({ cond, children }: { cond: boolean; children: ReactNode }) => (cond ? <>{children}</> : null);

export const Operaciones = ({ permisos }: { permisos: readonly string[] }) => {
  const { t } = useIdioma();
  const puede = (p: string) => permisos.includes(p);
  const opciones = ([
    ['atencion', 'ops.read'], ['creaciones', 'ops.read'], ['motor', 'ops.read'], ['ia', 'ai.read'], ['reservas', 'finance.read'], ['sinFuente', 'ops.read'],
  ] as const).filter(([, permiso]) => puede(permiso)).map(([clave]) => ({ clave: clave as Pestana, texto: t(`admin.ops.pestanas.${clave}`) }));
  const [elegida, setElegida] = useState<Pestana | null>(null);
  const activa = elegida ?? opciones[0]?.clave ?? 'atencion';
  const conCoste = puede('finance.read');
  return (
    <Vista titulo={t('admin.ops.titulo')} descripcion={t('admin.ops.descripcion')} dominios={['e', 'f', 'i', 'j', 'o']}>
      <Pestanas etiqueta={t('admin.ops.titulo')} opciones={opciones} activa={activa} alCambiar={setElegida}>
        <Si cond={activa === 'atencion'}>
          <CreacionesAtascadas />
          <Atascados />
          <Cola />
        </Si>
        <Si cond={activa === 'creaciones'}>
          <Creaciones />
          <Producciones />
        </Si>
        <Si cond={activa === 'motor'}>
          <Trabajos />
        </Si>
        <Si cond={activa === 'ia'}>
          <Generaciones conCoste={conCoste} />
          <UsoDelDia conCoste={conCoste} />
        </Si>
        <Si cond={activa === 'reservas'}>
          <Reservas />
        </Si>
        <Si cond={activa === 'sinFuente'}>
          <NoDisponible />
        </Si>
      </Pestanas>
    </Vista>
  );
};
