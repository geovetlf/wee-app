import { useState, type ReactNode } from 'react';
import { ESTADOS_DE_CREACION, ESTADOS_DE_TRABAJO, EXPERIENCIAS_CON_SERVIDOR, NOMBRE_DE_EXPERIENCIA } from '../api/acciones';
import { leerCreaciones, leerGeneraciones, leerNoDisponibles, leerProducciones, leerReservas, leerTrabajos, leerUsoIa, type TrabajoVista } from '../api/operaciones';
import { Cargable } from '../componentes/Cargable';
import { Etiqueta, Seccion, Tabla } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

/*
 * OPERACIONES: cómo van los trabajos, las creaciones y las generaciones, sin tocar nada. Todo sale de `opsAdmin`, que
 * comprueba el permiso en cada llamada y deja constancia. Cada bloque solo se monta si la sesión tiene su permiso, y
 * dice qué parte de la colección miró (`examinados`): «no hay» nunca significa más de lo que se vio.
 */
/** Lo que el servidor manda y la consola sabe decir. Un estado nuevo se enseña tal cual: mejor crudo que inventado. */
const ESTADOS_CONOCIDOS = ['queued', 'running', 'waiting', 'cancel_requested', 'completed', 'failed', 'timed_out', 'cancelled', 'asking', 'planned', 'done', 'PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
const useEstado = () => {
  const { t } = useIdioma();
  return (e: string | undefined): string => (!e ? t('admin.comun.sinDato') : ESTADOS_CONOCIDOS.includes(e) ? t(`admin.ops.estados.${e}`) : e);
};
const nombreDeExperiencia = (e: string | undefined, nada: string): string => (e ? (NOMBRE_DE_EXPERIENCIA as Record<string, string>)[e] ?? e : nada);

const Examinados = ({ examinados, truncado }: { examinados?: number; truncado: boolean }) => {
  const { t } = useIdioma();
  if (examinados === undefined && !truncado) return null;
  return (
    <p className="nota">
      {examinados !== undefined ? t('admin.ops.examinados', { contador: examinados }) : null}
      {truncado ? ` ${t('admin.ops.truncado')}` : null}
    </p>
  );
};

const Selector = ({ etiqueta, valor, opciones, alCambiar, todas }: { etiqueta: string; valor: string; opciones: readonly { valor: string; texto: string }[]; alCambiar: (v: string) => void; todas: string }) => (
  <label className="filtro">
    <span>{etiqueta}</span>
    <select value={valor} onChange={(e) => alCambiar(e.target.value)}>
      <option value="">{todas}</option>
      {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
    </select>
  </label>
);

const TablaDeTrabajos = ({ items }: { items: TrabajoVista[] }) => {
  const { t, fecha, numero } = useIdioma();
  const estadoDe = useEstado();
  const nada = t('admin.comun.sinDato');
  return (
    <Tabla cabeceras={[t('admin.ops.trabajo'), t('admin.ops.estado'), t('admin.ops.capacidad'), t('admin.ops.proveedor'), t('admin.ops.intentos'), t('admin.ops.actualizado'), t('admin.ops.cuenta')]}>
      {items.map((j) => (
        <tr key={j.id}>
          <th scope="row">{j.id}</th>
          <td>{estadoDe(j.estado)}</td>
          <td>{j.capacidad ?? nada}</td>
          <td>{[j.proveedor, j.modelo].filter(Boolean).join(' / ') || nada}</td>
          <td>{numero(j.intentos)}</td>
          <td>{fecha(j.actualizado)}</td>
          <td>{j.cuenta ?? nada}</td>
        </tr>
      ))}
    </Tabla>
  );
};

const Atascados = () => {
  const { t, numero } = useIdioma();
  const minutos = 30;
  const { estado, recargar } = useAccion('opsAdmin.atascados', { minutos, limit: 25 }, leerTrabajos, (p) => p.items.length === 0 && !p.truncado);
  return (
    <Seccion titulo={t('admin.ops.atascados')}>
      <p className="nota">{t('admin.ops.atascadosAyuda', { minutos: numero(minutos) })}</p>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.ops.sinAtascados')} hijos={(p) => (
        <>
          <TablaDeTrabajos items={p.items} />
          <Examinados examinados={p.examinados} truncado={p.truncado} />
        </>
      )} />
      <Procedencia fuente="opsAdmin.atascados (jobs)" estado={estado} />
    </Seccion>
  );
};

const Trabajos = () => {
  const { t } = useIdioma();
  const estadoDe = useEstado();
  const [filtro, setFiltro] = useState('');
  const { estado, recargar } = useAccion('opsAdmin.trabajos', { limit: 25, ...(filtro ? { estado: filtro } : {}) }, leerTrabajos, (p) => p.items.length === 0);
  return (
    <Seccion titulo={t('admin.ops.trabajos')}>
      <p className="nota">{t('admin.ops.trabajosAyuda')}</p>
      <div className="filtros">
        <Selector etiqueta={t('admin.ops.estado')} valor={filtro} alCambiar={setFiltro} todas={t('admin.ops.noTerminados')} opciones={ESTADOS_DE_TRABAJO.map((e) => ({ valor: e, texto: estadoDe(e) }))} />
      </div>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.ops.sinTrabajos')} hijos={(p) => (
        <>
          <TablaDeTrabajos items={p.items} />
          <Examinados truncado={p.truncado} />
        </>
      )} />
      <Procedencia fuente="opsAdmin.trabajos (jobs)" estado={estado} />
    </Seccion>
  );
};

const Creaciones = () => {
  const { t, fecha, numero } = useIdioma();
  const estadoDe = useEstado();
  const [experiencia, setExperiencia] = useState('');
  const [filtro, setFiltro] = useState('');
  const { estado, recargar } = useAccion('opsAdmin.creaciones', { limit: 25, ...(experiencia ? { experiencia } : {}), ...(filtro ? { estado: filtro } : {}) }, leerCreaciones, (p) => p.items.length === 0);
  const nada = t('admin.comun.sinDato');
  return (
    <Seccion titulo={t('admin.ops.creaciones')}>
      <p className="nota">{t('admin.ops.creacionesAyuda')}</p>
      <div className="filtros">
        <Selector etiqueta={t('admin.ops.experiencia')} valor={experiencia} alCambiar={setExperiencia} todas={t('admin.ops.todas')} opciones={EXPERIENCIAS_CON_SERVIDOR.map((e) => ({ valor: e, texto: NOMBRE_DE_EXPERIENCIA[e] }))} />
        <Selector etiqueta={t('admin.ops.estado')} valor={filtro} alCambiar={setFiltro} todas={t('admin.ops.todos')} opciones={ESTADOS_DE_CREACION.map((e) => ({ valor: e, texto: estadoDe(e) }))} />
      </div>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.ops.sinCreaciones')} hijos={(p) => (
        <>
          <Tabla cabeceras={[t('admin.ops.creacion'), t('admin.ops.experiencia'), t('admin.ops.estado'), t('admin.ops.pasos'), t('admin.ops.creditsCobrados'), t('admin.ops.creado'), t('admin.ops.cuenta')]}>
            {p.items.map((c) => (
              <tr key={c.id}>
                <th scope="row">{c.id}</th>
                <td>{nombreDeExperiencia(c.experiencia, nada)}</td>
                <td>
                  {estadoDe(c.estado)}
                  {c.abandonado ? <> <Etiqueta tono="aviso">{t('admin.ops.abandonado')}</Etiqueta></> : null}
                  {c.demo ? <> <Etiqueta>{t('admin.ops.demo')}</Etiqueta></> : null}
                </td>
                <td>{t('admin.ops.pasosValor', { total: numero(c.pasos), fallidos: numero(c.pasosFallidos) })}</td>
                <td>{numero(c.creditsCobrados)}</td>
                <td>{fecha(c.creado)}</td>
                <td>{c.cuenta ?? nada}</td>
              </tr>
            ))}
          </Tabla>
          <Examinados examinados={p.examinados} truncado={p.truncado} />
        </>
      )} />
      <Procedencia fuente="opsAdmin.creaciones (creatorJobs)" estado={estado} />
    </Seccion>
  );
};

const Producciones = () => {
  const { t, fecha } = useIdioma();
  const { estado, recargar } = useAccion('opsAdmin.producciones', { limit: 25 }, leerProducciones, (p) => p.items.length === 0);
  const nada = t('admin.comun.sinDato');
  return (
    <Seccion titulo={t('admin.ops.producciones')}>
      <p className="nota">{t('admin.ops.produccionesAyuda')}</p>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.ops.sinProducciones')} hijos={(p) => (
        <Tabla cabeceras={[t('admin.ops.produccion'), t('admin.ops.estado'), t('admin.ops.actualizado'), t('admin.ops.cuenta')]}>
          {p.items.map((x) => (
            <tr key={x.id}><th scope="row">{x.id}</th><td>{x.estado ?? nada}</td><td>{fecha(x.actualizada)}</td><td>{x.cuenta ?? nada}</td></tr>
          ))}
        </Tabla>
      )} />
      <Procedencia fuente="opsAdmin.producciones (productions)" estado={estado} />
    </Seccion>
  );
};

const Generaciones = () => {
  const { t, fecha, numero } = useIdioma();
  const estadoDe = useEstado();
  const { estado, recargar } = useAccion('opsAdmin.generaciones', { limit: 25 }, leerGeneraciones, (p) => p.items.length === 0);
  const nada = t('admin.comun.sinDato');
  return (
    <Seccion titulo={t('admin.ops.generaciones')}>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.ops.sinGeneraciones')} hijos={(p) => (
        <>
          <Tabla cabeceras={[t('admin.ops.fecha'), t('admin.ops.experiencia'), t('admin.ops.capacidad'), t('admin.ops.proveedor'), t('admin.ops.estado'), t('admin.ops.duracionMs'), t('admin.ops.creditsCobrados'), t('admin.ops.costeUsd')]}>
            {p.items.map((g) => (
              <tr key={g.id}>
                <td>{fecha(g.creado)}</td>
                <td>{nombreDeExperiencia(g.experiencia, nada)}</td>
                <td>{g.capacidad ?? nada}</td>
                <td>{[g.proveedor, g.modelo].filter(Boolean).join(' / ') || nada}</td>
                <td>{estadoDe(g.estado)}</td>
                <td>{numero(g.duracionMs)}</td>
                <td>{numero(g.creditsCobrados)}</td>
                <td>{numero(g.costeUsd)}</td>
              </tr>
            ))}
          </Tabla>
          <p className="nota">{t('admin.ops.costeNota')}</p>
          <Examinados examinados={p.examinados} truncado={p.truncado} />
        </>
      )} />
      <Procedencia fuente="opsAdmin.generaciones (aiGenerations)" estado={estado} />
    </Seccion>
  );
};

const UsoDelDia = () => {
  const { t, numero } = useIdioma();
  const { estado, recargar } = useAccion('opsAdmin.usoIa', {}, leerUsoIa, (u) => !u.existe || u.items.length === 0);
  return (
    <Seccion titulo={t('admin.ops.usoIa')}>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.ops.sinUsoIa')} hijos={(u) => (
        <Tabla cabeceras={[t('admin.ops.capacidad'), t('admin.ops.proveedor'), t('admin.ops.llamadas'), t('admin.ops.fallos'), t('admin.ops.creditsCobrados'), t('admin.ops.costeUsd')]}>
          {u.items.map((f) => (
            <tr key={`${f.capacidad}/${f.proveedor}`}>
              <th scope="row">{f.capacidad}</th><td>{f.proveedor}</td><td>{numero(f.llamadas)}</td><td>{numero(f.fallos)}</td><td>{numero(f.credits)}</td><td>{numero(f.usd)}</td>
            </tr>
          ))}
        </Tabla>
      )} />
      <Procedencia fuente="opsAdmin.usoIa (aiUsage)" estado={estado} />
    </Seccion>
  );
};

const Reservas = () => {
  const { t, fecha, numero } = useIdioma();
  const { estado, recargar } = useAccion('opsAdmin.reservas', { minutos: 120, limit: 25 }, leerReservas, (p) => p.items.length === 0);
  const nada = t('admin.comun.sinDato');
  return (
    <Seccion titulo={t('admin.ops.reservas')}>
      <p className="nota">{t('admin.ops.reservasAyuda')}</p>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.ops.sinReservas')} hijos={(p) => (
        <Tabla cabeceras={[t('admin.ops.fecha'), t('admin.ops.servicio'), t('admin.ops.importe'), t('admin.ops.cuenta')]}>
          {p.items.map((r) => (
            <tr key={r.id}><td>{fecha(r.creada)}</td><td>{r.servicio ?? nada}</td><td>{numero(r.importe)}</td><td>{r.cuenta ?? nada}</td></tr>
          ))}
        </Tabla>
      )} />
      <Procedencia fuente="opsAdmin.reservas (creditTransactions)" estado={estado} />
    </Seccion>
  );
};

/** Lo traduce la consola, por identificador; un identificador nuevo del servidor se enseña tal cual. */
const FALTAN_CONOCIDOS = ['incidentes', 'guardian', 'saludPersistida', 'barrido', 'music', 'design', 'totalesDeCuentas', 'restricciones'];

const NoDisponible = () => {
  const { t } = useIdioma();
  const { estado, recargar } = useAccion('opsAdmin.capacidades', undefined, leerNoDisponibles, (l) => l.length === 0);
  return (
    <Seccion titulo={t('admin.ops.noDisponible')}>
      <p className="nota">{t('admin.ops.noDisponibleAyuda')}</p>
      <Cargable estado={estado} recargar={recargar} hijos={(l) => (
        <ul className="lista-sin-fuente">
          {l.map((c) => <li key={c.id}>{FALTAN_CONOCIDOS.includes(c.id) ? t(`admin.ops.faltan.${c.id}`) : c.id}</li>)}
        </ul>
      )} />
    </Seccion>
  );
};

const Si = ({ cond, children }: { cond: boolean; children: ReactNode }) => (cond ? <>{children}</> : null);

export const Operaciones = ({ permisos }: { permisos: readonly string[] }) => {
  const { t } = useIdioma();
  const puede = (p: string) => permisos.includes(p);
  return (
    <>
      <header className="cabecera-vista">
        <h1>{t('admin.ops.titulo')}</h1>
        <p>{t('admin.ops.descripcion')}</p>
      </header>
      <Si cond={puede('ops.read')}>
        <Atascados />
        <Trabajos />
        <Creaciones />
        <Producciones />
      </Si>
      <Si cond={puede('ai.read')}>
        <Generaciones />
        <UsoDelDia />
      </Si>
      <Si cond={puede('finance.read')}>
        <Reservas />
      </Si>
      <Si cond={puede('ops.read')}>
        <NoDisponible />
      </Si>
    </>
  );
};
