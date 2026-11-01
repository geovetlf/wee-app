import { useState, type FormEvent } from 'react';
import { CREDITS_POR_USD_DE_REFERENCIA, leerCostes, leerEstadisticasDeCredits, leerEstadoDelMotor, leerSaldo, leerTransacciones, type TransaccionVista } from '../api/modelos';
import { Cargable } from '../componentes/Cargable';
import { AvisoDeLista, avisoPorLimite } from '../componentes/Lista';
import { Aviso, Dato, Datos, Etiqueta, Seccion, Tabla, useOrden, type Tono } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { Vista } from '../componentes/Vista';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

const LIMITE = 25;
const TIPOS_CONOCIDOS = ['usage', 'refund', 'grant', 'purchase'];
const TONO_DE_MOVIMIENTO: Record<string, Tono> = { COMPLETED: 'ok', AUTHORIZED: 'neutro', FAILED: 'error', REFUNDED: 'neutro' };

const TablaDeMovimientos = ({ items }: { items: TransaccionVista[] }) => {
  const { t, fecha, numero } = useIdioma();
  const nada = t('admin.comun.sinDato');
  const { filas, orden } = useOrden(items, { 0: (m) => m.creada, 1: (m) => m.tipo, 2: (m) => m.estado, 3: (m) => m.importe, 4: (m) => m.servicio });
  return (
    <Tabla ancha orden={orden} numericas={[3]} cabeceras={[t('admin.credits.fecha'), t('admin.credits.tipo'), t('admin.credits.estado'), t('admin.credits.importe'), t('admin.credits.servicio'), t('admin.credits.motivo'), t('admin.credits.origen')]}>
      {filas.map((m) => (
        <tr key={m.id}>
          <td>{fecha(m.creada)}</td>
          <td>{m.tipo ? (TIPOS_CONOCIDOS.includes(m.tipo) ? t(`admin.credits.tipos.${m.tipo}`) : m.tipo) : nada}</td>
          <td>{m.estado ? <Etiqueta tono={TONO_DE_MOVIMIENTO[m.estado] ?? 'neutro'}>{m.estado in TONO_DE_MOVIMIENTO ? t(`admin.credits.estados.${m.estado}`) : m.estado}</Etiqueta> : nada}</td>
          <td>{numero(m.importe)}</td>
          <td>{m.servicio ?? nada}</td>
          <td>{m.motivo ?? nada}</td>
          <td>{m.origen ?? nada}</td>
        </tr>
      ))}
    </Tabla>
  );
};

const Totales = () => {
  const { t, numero } = useIdioma();
  const { estado, recargar } = useAccion('creditsAdmin.stats', undefined, leerEstadisticasDeCredits, (e) => e.vacio);
  return (
    <Seccion titulo={t('admin.credits.totales')} pie={<Procedencia fuente="creditsAdmin.stats" estado={estado} />}>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.credits.sinEstadisticas')} hijos={(e) => (
        <>
          <Datos>
            <Dato resaltar etiqueta={t('admin.credits.enCirculacion')} valor={numero(e.global.enCirculacion)} />
            <Dato etiqueta={t('admin.credits.comprados')} valor={numero(e.global.comprados)} />
            <Dato etiqueta={t('admin.credits.otorgados')} valor={numero(e.global.otorgados)} />
            <Dato etiqueta={t('admin.credits.gastados')} valor={numero(e.global.gastados)} />
            <Dato etiqueta={t('admin.credits.reembolsados')} valor={numero(e.global.reembolsados)} />
            <Dato etiqueta={t('admin.credits.ingresosUsd')} valor={numero(e.global.ingresosUsd)} />
            <Dato etiqueta={t('admin.credits.fallidas')} valor={numero(e.global.fallidas)} />
          </Datos>
          {/* Consumo por servicio: lo acumula el Credit Engine en cada gasto y reembolso (creditStats.global.byService). */}
          <h3>{t('admin.credits.porServicio')}</h3>
          {e.porServicio.length === 0 ? <p className="estado vacio">{t('admin.credits.sinPorServicio')}</p> : (
            <Tabla numericas={[1, 2, 3]} cabeceras={[t('admin.credits.servicio'), t('admin.credits.gastados'), t('admin.credits.operaciones'), t('admin.credits.reembolsados')]}>
              {e.porServicio.map((s) => (
                <tr key={s.servicio}>
                  <th scope="row" className="codigo">{s.servicio}</th>
                  <td>{numero(s.gastado)}</td>
                  <td>{numero(s.operaciones)}</td>
                  <td>{numero(s.reembolsado)}</td>
                </tr>
              ))}
            </Tabla>
          )}
          {e.diario.length > 0 && (
            <>
              <h3>{t('admin.credits.diario')}</h3>
              <Tabla numericas={[1, 2, 3, 4]} cabeceras={[t('admin.credits.dia'), t('admin.credits.comprados'), t('admin.credits.otorgados'), t('admin.credits.gastados'), t('admin.credits.reembolsados')]}>
                {e.diario.map((d) => (
                  <tr key={d.id}>
                    <th scope="row">{d.id.replace(/^daily_/, '')}</th>
                    <td>{numero(d.comprados)}</td>
                    <td>{numero(d.otorgados)}</td>
                    <td>{numero(d.gastados)}</td>
                    <td>{numero(d.reembolsados)}</td>
                  </tr>
                ))}
              </Tabla>
            </>
          )}
        </>
      )} />
    </Seccion>
  );
};

/** Lo pide una persona a mano y queda en la auditoría: «Actualizar» no lo repite por su cuenta. */
const ConsultaDeCuenta = () => {
  const { t, numero } = useIdioma();
  const [escrito, setEscrito] = useState('');
  const [uid, setUid] = useState<string | null>(null);
  const saldo = useAccion('creditsAdmin.balance', uid === null ? null : { userId: uid }, leerSaldo, (s) => s === null, { manual: true });
  const historial = useAccion('creditsAdmin.userHistory', uid === null ? null : { userId: uid, limit: LIMITE }, leerTransacciones, (l) => l.length === 0, { manual: true });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const limpio = escrito.trim();
    if (limpio) setUid(limpio);
  };

  return (
    <Seccion titulo={t('admin.credits.cuenta')} ayuda={t('admin.credits.cuentaAyuda')}>
      <form className="formulario en-linea" onSubmit={enviar}>
        <label className="crece">
          <span>{t('admin.credits.uid')}</span>
          <input className="campo" value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
        <button type="submit" className="boton primario" disabled={!escrito.trim() || saldo.estado.fase === 'cargando'}>{t('admin.credits.consultar')}</button>
      </form>

      {saldo.estado.fase === 'error' && saldo.estado.error.tipo === 'no-encontrado' ? (
        <p className="estado vacio">{t('admin.credits.cuentaNoEncontrada')}</p>
      ) : (
        <Cargable estado={saldo.estado} recargar={saldo.recargar} hijos={(s) => s && (
          <>
            <Datos>
              <Dato resaltar etiqueta={t('admin.credits.saldo')} valor={numero(s.saldo)} />
              <Dato etiqueta={t('admin.credits.ganadoEnTotal')} valor={numero(s.ganadoEnTotal)} />
              <Dato etiqueta={t('admin.credits.gastadoEnTotal')} valor={numero(s.gastadoEnTotal)} />
            </Datos>
            {!s.inicializado && <p className="nota">{t('admin.credits.sinInicializar')}</p>}
          </>
        )} />
      )}

      {uid !== null && !(saldo.estado.fase === 'error' && saldo.estado.error.tipo === 'no-encontrado') && (
        <>
          <h3>{t('admin.credits.historial')}</h3>
          <Cargable estado={historial.estado} recargar={historial.recargar} vacio={t('admin.credits.sinHistorial')} hijos={(items) => (
            <>
              <TablaDeMovimientos items={items} />
              <AvisoDeLista truncado={avisoPorLimite(items.length, LIMITE)} />
            </>
          )} />
        </>
      )}
    </Seccion>
  );
};

const Reembolsadas = () => {
  const { t } = useIdioma();
  const { estado, recargar } = useAccion('creditsAdmin.failed', { limit: LIMITE }, leerTransacciones, (l) => l.length === 0);
  return (
    <Seccion titulo={t('admin.credits.fallidasTitulo')} pie={<Procedencia fuente="creditsAdmin.failed" estado={estado} />}>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.credits.sinFallidas')} hijos={(items) => (
        <>
          <TablaDeMovimientos items={items} />
          <AvisoDeLista truncado={avisoPorLimite(items.length, LIMITE)} />
        </>
      )} />
    </Seccion>
  );
};

/**
 * La conversión que informa el servidor (`creditsPerUsd` de `aiSettings/global`, vía `engineAdmin.status`). Se pinta
 * lo que dice el motor, no una cifra escrita aquí; si no coincide con la referencia de Weë (US$ 1 = 100 Credits),
 * se avisa en vez de esconderlo.
 */
const Conversion = () => {
  const { t, numero } = useIdioma();
  const { estado, recargar } = useAccion('engineAdmin.status', undefined, leerEstadoDelMotor);
  return (
    <Seccion titulo={t('admin.credits.conversion')} pie={<Procedencia fuente="engineAdmin.status" estado={estado} />}>
      <Cargable estado={estado} recargar={recargar} hijos={(motor) => (
        motor.creditsPorUsd === undefined ? <p className="estado vacio">{t('admin.credits.conversionSinDato')}</p> : (
          <>
            <Datos>
              <Dato resaltar etiqueta={t('admin.credits.conversionEtiqueta')} valor={t('admin.credits.conversionValor', { creditos: numero(motor.creditsPorUsd) })} />
            </Datos>
            {motor.creditsPorUsd !== CREDITS_POR_USD_DE_REFERENCIA && (
              <Aviso tono="atencion" alerta>{t('admin.credits.conversionDistinta', { referencia: numero(CREDITS_POR_USD_DE_REFERENCIA) })}</Aviso>
            )}
            <p className="nota">{t('admin.credits.conversionNota')}</p>
          </>
        )
      )} />
    </Seccion>
  );
};

const Costes = () => {
  const { t, numero } = useIdioma();
  const { estado, recargar } = useAccion('creditsAdmin.costs', undefined, leerCostes, (c) => c.servicios.length === 0);
  return (
    <Seccion titulo={t('admin.credits.costes')} pie={<Procedencia fuente="creditsAdmin.costs" estado={estado} />}>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.credits.sinCostes')} hijos={(c) => (
        <Tabla numericas={[1]} cabeceras={[t('admin.credits.servicio'), t('admin.credits.costeCredits')]}>
          {c.servicios.map((s) => (
            <tr key={s.servicio}><th scope="row" className="codigo">{s.servicio}</th><td>{numero(s.credits)}</td></tr>
          ))}
        </Tabla>
      )} />
    </Seccion>
  );
};

export const Credits = ({ puedeLeer }: { puedeLeer: (permiso: string) => boolean }) => {
  const { t } = useIdioma();
  return (
    <Vista titulo={t('admin.credits.titulo')} descripcion={t('admin.credits.descripcion')} dominios={['c']}>
      <Aviso titulo={t('admin.credits.recargasTitulo')}>{t('admin.credits.recargasTexto')}</Aviso>
      <Totales />
      <ConsultaDeCuenta />
      <Reembolsadas />
      <div className="rejilla">
        <Costes />
        {puedeLeer('ai.read') && <Conversion />}
      </div>
    </Vista>
  );
};
