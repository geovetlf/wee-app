import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { useIdioma } from '../contexts/IdiomaContext';
import { confirmAction, notify } from '../utils/notify';
import { useWallet } from '../hooks/useWallet';
import { formatearDuracion, formatearNumero } from '../i18n/formato';
import { AvisoDelPersonaje, autonomyService, EntradaDelRegistro, ErrorDeAutonomia, EstadoDelPase, VistaDeAutonomia } from '../services/autonomyService';
import { COLOR, ESPACIO, LINEA, RADIO, TIPO } from './personaje/estilo';
import Icono from './personaje/Iconos';
import { Barra, Boton, GrupoDeOpciones, Opcion, Rotulo } from './personaje/Piezas';
import BandejaDeAprobaciones from './personaje/BandejaDeAprobaciones';
import RegistroDelPersonaje from './personaje/RegistroDelPersonaje';

/*
 * LA AUTONOMÍA CON IA DEL PERSONAJE, dentro de su ficha (docs/AUTONOMIA.md).
 *
 * Programar 24 h, 3 días o una semana (30 Credits por cada 24 h, cobrados al
 * empezar cada día), ver el estado y el tiempo que queda, apagarla, y revisar
 * la bandeja: avisos de temas delicados y aprobaciones (aprobar / rechazar), y
 * el registro de lo que hizo (que el dueño puede vaciar).
 * La app no decide ni cobra nada: todo pasa por la función `autonomiaPersonaje`.
 * Todos los textos salen de `character.*`; el estilo, de `personaje/estilo.ts`.
 */

const VIVOS: EstadoDelPase[] = ['activa', 'pausadaPorWee', 'pausadaPorTope', 'pausadaSinSaldo'];
const CLAVE_DE_ESTADO: Record<EstadoDelPase, string> = {
  activa: 'character.statusActive', pausadaPorWee: 'character.statusPausedWee', pausadaPorTope: 'character.statusPausedCap',
  pausadaSinSaldo: 'character.statusPausedNoCredits', apagada: 'character.statusOff', terminada: 'character.statusDone',
};
/** La forma corta del estado, para el rótulo de la cabecera. */
const CLAVE_DE_ROTULO: Record<EstadoDelPase, string> = {
  activa: 'character.statusActive', pausadaPorWee: 'character.statusPausedShort', pausadaPorTope: 'character.statusPausedShort',
  pausadaSinSaldo: 'character.statusPausedShort', apagada: 'character.statusOff', terminada: 'character.statusDone',
};
const CLAVE_DE_CASO: Record<string, string> = {
  dinero_o_pagos: 'character.caseMoney', datos_personales_del_dueno: 'character.casePersonalData', encuentros_o_contacto_fuera: 'character.caseMeeting',
  salud_o_crisis: 'character.caseHealth', denuncia_o_conflicto: 'character.caseConflict', fuera_de_los_limites: 'character.caseLimits',
};
const CLAVE_DE_ERROR: Record<string, string> = {
  sinSaldo: 'character.errorNoCredits', yaActivo: 'character.errorAlreadyActive', puertaCerrada: 'character.errorMaintenance', cobroNoDisponible: 'character.autonomyClosed', fichaIncompleta: 'character.autonomyNeedsSheet',
  avisoNoEncontrado: 'character.errorNoticeNotFound', avisoCaducado: 'character.errorNoticeExpired', yaResuelto: 'character.errorNoticeResolved',
  noEsTuPersonaje: 'character.errorNotYours', duracionNoPermitida: 'character.errorDurationNotAllowed', sinPase: 'character.errorNoPass',
  cuentaDesactivada: 'character.errorAccountDeactivated',
};
/* Por qué está parado el reloj de un pase en pausa (`pase.motivo`, lo escribe el servidor). */
const CLAVE_DE_MOTIVO: Record<string, string> = {
  falloDeWee: 'character.motiveWeeFailure', puertaCerrada: 'character.motiveMaintenance',
};
/** Cada cuánto se vuelve a preguntar el estado, solo con la pantalla a la vista. */
const REFRESCO_MS = 60_000;

interface Props {
  perfilId: string;
  /** La ficha GUARDADA está completa (el servidor la vuelve a comprobar). */
  fichaLista: boolean;
  /** Avisa a la ficha de si hay un pase vivo (para decir que el nivel se aplica al guardar). */
  onPaseVivo?: (vivo: boolean) => void;
}

const AutonomiaDelPersonaje: React.FC<Props> = ({ perfilId, fichaLista, onPaseVivo }) => {
  const { t, locale } = useIdioma();
  const { balance } = useWallet();
  const [vista, setVista] = useState<VistaDeAutonomia | null>(null);
  const [cargando, setCargando] = useState(true);
  /* Un fallo al CARGAR (red, servidor) no es «todavía no está disponible»: tiene su propio estado. */
  const [errorDeCarga, setErrorDeCarga] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  /* Candados contra el doble toque: el estado llega viejo dentro del mismo tick; una ref no. */
  const ocupadoRef = useRef(false);
  const ajustandoRef = useRef(false);
  const vistaRef = useRef<VistaDeAutonomia | null>(null);
  const [resolviendo, setResolviendo] = useState<string | null>(null);
  const [dias, setDias] = useState(1);
  /* El tope diario de encargos a Weë AI que el dueño elige al activar (aparte del pase). Empieza en «No encargar». */
  const [topeEncargos, setTopeEncargos] = useState(0);
  const [ajustando, setAjustando] = useState(false);
  const [avisos, setAvisos] = useState<AvisoDelPersonaje[]>([]);
  const [registro, setRegistro] = useState<EntradaDelRegistro[]>([]);
  const [borrandoRegistro, setBorrandoRegistro] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const n = (v: number) => formatearNumero(v, locale);

  const ponerVista = useCallback((v: VistaDeAutonomia) => { vistaRef.current = v; setVista(v); setErrorDeCarga(false); }, []);

  const recargar = useCallback(async () => {
    try {
      ponerVista(await autonomyService.estado(perfilId));
    } catch {
      /* Si ya había una vista, un refresco fallido la deja como estaba; si no, se dice que no se pudo cargar. */
      if (!vistaRef.current) setErrorDeCarga(true);
    } finally { setCargando(false); setAhora(Date.now()); }
  }, [perfilId, ponerVista]);

  const reintentar = () => { setCargando(true); setErrorDeCarga(false); recargar(); };

  useEffect(() => {
    const dejar = autonomyService.escucharAvisos(perfilId, setAvisos);
    const dejarRegistro = autonomyService.escucharRegistro(perfilId, setRegistro);
    return () => { dejar(); dejarRegistro(); };
  }, [perfilId]);

  /*
   * El refresco cada minuto, SOLO con la pantalla a la vista: con la pestaña
   * oculta (web) o la app en segundo plano (teléfono) se para, y al volver se
   * pregunta en el acto. En la web manda `visibilitychange`; en el teléfono, `AppState`.
   */
  useEffect(() => {
    const enWeb = Platform.OS === 'web' && typeof document !== 'undefined';
    const visible = () => (enWeb ? document.visibilityState !== 'hidden' : AppState.currentState === 'active');
    let cada: ReturnType<typeof setInterval> | null = null;
    const arrancar = () => { if (!cada) cada = setInterval(recargar, REFRESCO_MS); };
    const parar = () => { if (cada) { clearInterval(cada); cada = null; } };
    const alCambiar = () => { if (visible()) { recargar(); arrancar(); } else parar(); };
    recargar();
    if (visible()) arrancar();
    if (enWeb) {
      document.addEventListener('visibilitychange', alCambiar);
      return () => { parar(); document.removeEventListener('visibilitychange', alCambiar); };
    }
    const sub = AppState.addEventListener('change', alCambiar);
    return () => { parar(); sub.remove(); };
  }, [recargar]);

  /* Si el servidor no ofrece la duración elegida, se elige la primera que sí ofrece. */
  useEffect(() => {
    if (vista?.bloquesPermitidos?.length && !vista.bloquesPermitidos.includes(dias)) setDias(vista.bloquesPermitidos[0]);
  }, [vista, dias]);

  const fallo = (e: unknown) => notify(t('common.error'), t(CLAVE_DE_ERROR[(e as ErrorDeAutonomia)?.motivo] || 'character.errorGeneric'));

  /* Activar y Apagar comparten candado: el segundo toque (o el segundo diálogo) no hace nada. */
  const conCandado = async (accion: () => unknown) => {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    try { await accion(); } finally { ocupadoRef.current = false; setOcupado(false); }
  };

  const activar = () => conCandado(async () => {
    if (!vista) return;
    const c = vista.creditosPorBloque;
    /* Lo que se cobra, entero y antes de cobrar: hoy, el total, los encargos aparte y que lo no empezado no se cobra. */
    const cuerpo = [
      dias === 1 ? t('character.confirmBodyOneDay', { creditos: n(c) }) : t('character.confirmBodyDays', { creditos: n(c), total: n(c * dias) }),
      topeEncargos > 0 ? t('character.confirmEncargos', { tope: n(topeEncargos) }) : t('character.confirmEncargosNone'),
    ].join('\n\n');
    const ok = await confirmAction(t('character.confirmTitle'), cuerpo, t('character.activateButtonToday', { creditos: n(c) }), false, t);
    if (!ok) return;
    setOcupado(true);
    try { ponerVista(await autonomyService.programar(perfilId, dias, topeEncargos)); } catch (e) { fallo(e); }
  });

  const apagar = () => conCandado(async () => {
    const ok = await confirmAction(t('character.turnOff'), t('character.turnOffConfirm'), t('character.turnOff'), true, t);
    if (!ok) return;
    setOcupado(true);
    try { ponerVista(await autonomyService.apagar(perfilId)); } catch (e) { fallo(e); }
  });

  /* La bandeja se revisa en lote: un aviso a la vez, y el resultado lo trae el servidor. */
  const resolver = async (avisoId: string, decision: 'aprobar' | 'rechazar') => {
    if (resolviendo) return;
    setResolviendo(avisoId);
    try {
      const nueva = decision === 'aprobar' ? await autonomyService.aprobar(perfilId, avisoId) : await autonomyService.rechazar(perfilId, avisoId);
      ponerVista(nueva);
    } catch (e) { fallo(e); } finally { setResolviendo(null); setAhora(Date.now()); }
  };

  const borrarRegistro = async () => {
    if (borrandoRegistro) return;
    const ok = await confirmAction(t('character.logClearTitle'), t('character.logClearBody'), t('character.logClear'), true, t);
    if (!ok) return;
    setBorrandoRegistro(true);
    try { ponerVista(await autonomyService.borrarRegistro(perfilId)); } catch (e) { fallo(e); } finally { setBorrandoRegistro(false); }
  };

  /* Con el pase activo, cambiar el tope gasta (o deja de gastar) dinero: subirlo pide confirmación; bajarlo no. */
  const ajustarEncargos = async (tope: number) => {
    if (ajustandoRef.current) return;
    const topeActual = vistaRef.current?.pase?.topeDeCreditosDeEncargos ?? 0;
    if (tope === topeActual) return;
    ajustandoRef.current = true;
    try {
      if (tope > topeActual) {
        const ok = await confirmAction(t('character.encargosLabel'), t('character.raiseCapBody', { tope: n(tope) }), t('character.raiseCapConfirm'), false, t);
        if (!ok) return;
      }
      setAjustando(true);
      ponerVista(await autonomyService.ajustarEncargos(perfilId, tope));
    } catch (e) { fallo(e); } finally { ajustandoRef.current = false; setAjustando(false); }
  };
  const topesDeEncargos = vista?.topesDeEncargos?.length ? vista.topesDeEncargos : [0, 50, 150, 400];
  const etiquetaDeTope = (c: number) => (c === 0 ? t('character.encargosNone') : t('character.encargosUpTo', { creditos: formatearNumero(c, locale) }));

  const etiquetaDeDias = (d: number) => (d === 1 ? t('character.duration1') : d === 3 ? t('character.duration3') : d === 7 ? t('character.duration7') : t('character.durationCustom', { dias: n(d) }));
  const textoDelCaso = useCallback((caso?: string) => t(CLAVE_DE_CASO[caso || ''] || 'character.caseConflict'), [t]);
  const pase = vista?.pase;
  const vivo = !!pase && VIVOS.includes(pase.estado);
  const abierta = !!vista && vista.abierta;
  const motivo = pase?.motivo ? CLAVE_DE_MOTIVO[pase.motivo] : undefined;

  useEffect(() => { onPaseVivo?.(vivo); }, [vivo, onPaseVivo]);

  return (
    <View style={s.caja}>
      <View style={s.cabeza}>
        <View style={s.sello}><Icono nombre="autonomia" tamano={20} color={COLOR.blanco} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.titulo} accessibilityRole="header">{t('character.autonomyTitle')}</Text>
        </View>
        {pase && (abierta || vivo) ? <Rotulo relleno={pase.estado === 'activa'} texto={t(CLAVE_DE_ROTULO[pase.estado])} /> : null}
      </View>

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={COLOR.blanco} accessibilityLabel={t('common.loading')} /></View>
      ) : errorDeCarga || !vista ? (
        <View style={s.bloque} accessibilityLiveRegion="polite">
          <Text style={s.texto}>{t('character.loadAutonomyFailed')}</Text>
          <Boton texto={t('character.loadRetry')} variante="secundario" onPress={reintentar} />
        </View>
      ) : !abierta && !vivo ? (
        <View style={s.fila}>
          <Icono nombre="bloqueado" tamano={16} color={COLOR.textoSecundario} />
          <Text style={[s.texto, { flex: 1 }]}>{t('character.autonomyClosed')}</Text>
        </View>
      ) : (
        <>
          <Text style={s.texto}>{t('character.autonomyIntro', { creditos: n(vista.creditosPorBloque), acciones: n(vista.accionesPorBloque) })}</Text>

          {vivo && pase ? (
            <View style={s.bloque}>
              {/* Un pase vivo y pagado se enseña siempre, también con la puerta cerrada: su estado, por qué y cómo apagarlo. */}
              {pase.estado !== 'activa' ? <Text style={s.nota} accessibilityLiveRegion="polite">{t(CLAVE_DE_ESTADO[pase.estado])}</Text> : null}
              {motivo ? <Text style={s.nota}>{t(motivo)}</Text> : null}
              <View style={s.cifras}>
                <View style={s.cifra} accessible accessibilityLabel={t('character.remaining', { tiempo: formatearDuracion(pase.tiempoRestanteMs, locale) })}>
                  <View style={s.fila}>
                    <Icono nombre="reloj" tamano={14} color={COLOR.textoTenue} />
                    <Text style={s.cifraRotulo}>{t('character.remainingLabel')}</Text>
                  </View>
                  <Text style={s.cifraValor} numberOfLines={1} adjustsFontSizeToFit>{formatearDuracion(pase.tiempoRestanteMs, locale)}</Text>
                </View>
                <View style={s.cifra}>
                  <View style={s.fila}>
                    <Icono nombre="acciones" tamano={14} color={COLOR.textoTenue} />
                    <Text style={s.cifraRotulo}>{t('character.actionsLabel')}</Text>
                  </View>
                  <Text style={s.cifraValor} numberOfLines={1}>
                    {n(pase.accionesEnBloque)}<Text style={s.cifraDe}> / {n(pase.accionesPorBloque)}</Text>
                  </Text>
                  <Barra
                    valor={pase.accionesPorBloque ? pase.accionesEnBloque / pase.accionesPorBloque : 0}
                    etiqueta={t('character.actionsUsed', { usadas: n(pase.accionesEnBloque), total: n(pase.accionesPorBloque) })}
                  />
                </View>
              </View>
              <View style={s.encargos}>
                <Text style={s.etiqueta}>{t('character.encargosLabel')}</Text>
                <Text style={s.nota}>{t('character.encargosToday', { gastado: n(pase.creditosDeEncargosHoy ?? 0), tope: n(pase.topeDeCreditosDeEncargos ?? 0) })}</Text>
                {abierta ? (
                  <GrupoDeOpciones etiqueta={t('character.encargosLabel')}>
                    {topesDeEncargos.map((c) => (
                      <Opcion key={c} texto={etiquetaDeTope(c)} activa={(pase.topeDeCreditosDeEncargos ?? 0) === c} onPress={() => ajustarEncargos(c)} deshabilitada={ajustando} />
                    ))}
                  </GrupoDeOpciones>
                ) : null}
              </View>
              <Boton texto={t('character.turnOff')} icono="apagar" variante="secundario" onPress={apagar} cargando={ocupado} />
            </View>
          ) : (
            <View style={s.bloque}>
              {pase ? <Text style={s.nota}>{t('character.statusLine', { estado: t(CLAVE_DE_ESTADO[pase.estado]) })}</Text> : null}
              {!fichaLista ? (
                <View style={[s.fila, s.requisito]}>
                  <Icono nombre="bloqueado" tamano={16} color={COLOR.texto} />
                  <Text style={[s.textoClaro, { flex: 1 }]}>{t('character.autonomyNeedsSheet')}</Text>
                </View>
              ) : null}
              <Text style={s.etiqueta}>{t('character.durationLabel')}</Text>
              <GrupoDeOpciones etiqueta={t('character.durationLabel')}>
                {vista.bloquesPermitidos.map((d) => (
                  <Opcion key={d} texto={etiquetaDeDias(d)} activa={dias === d} onPress={() => setDias(d)} />
                ))}
              </GrupoDeOpciones>
              <Text style={s.nota}>
                {dias === 1
                  ? t('character.durationTotalOneDay', { creditos: n(vista.creditosPorBloque) })
                  : t('character.durationTotal', { total: n(vista.creditosPorBloque * dias), creditos: n(vista.creditosPorBloque) })}
              </Text>
              <Text style={s.etiqueta}>{t('character.encargosLabel')}</Text>
              <Text style={s.nota}>{t('character.encargosHint')}</Text>
              <GrupoDeOpciones etiqueta={t('character.encargosLabel')}>
                {topesDeEncargos.map((c) => (
                  <Opcion key={c} texto={etiquetaDeTope(c)} activa={topeEncargos === c} onPress={() => setTopeEncargos(c)} />
                ))}
              </GrupoDeOpciones>
              <View style={s.pieDeActivar}>
                {balance !== null ? <Text style={s.nota}>{t('character.balance', { creditos: n(balance) })}</Text> : null}
                <Boton
                  texto={t('character.activateButtonToday', { creditos: n(vista.creditosPorBloque) })}
                  icono="autonomia"
                  onPress={activar}
                  disabled={ocupado || !fichaLista}
                  cargando={ocupado}
                  pista={!fichaLista ? t('character.autonomyNeedsSheet') : undefined}
                />
              </View>
            </View>
          )}
        </>
      )}

      {!cargando && (abierta || avisos.length > 0) ? (
        <>
          <View style={s.divisor} />
          <BandejaDeAprobaciones
            avisos={avisos}
            ahora={ahora}
            textoDelCaso={textoDelCaso}
            onAprobar={(id) => resolver(id, 'aprobar')}
            onRechazar={(id) => resolver(id, 'rechazar')}
            resolviendo={resolviendo}
          />
        </>
      ) : null}

      {!cargando && (abierta || registro.length > 0) ? (
        <>
          <View style={s.divisor} />
          <RegistroDelPersonaje entradas={registro} ahora={ahora} onBorrar={borrarRegistro} borrando={borrandoRegistro} />
        </>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  caja: { borderWidth: LINEA, borderColor: COLOR.lineaMedia, borderRadius: RADIO.xl, backgroundColor: COLOR.tarjeta, padding: ESPACIO.xl, gap: ESPACIO.lg },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md },
  sello: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLOR.lineaFuerte, alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR.negro },
  titulo: { ...TIPO.titulo, color: COLOR.texto },
  centro: { paddingVertical: ESPACIO.xl, alignItems: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.sm },
  texto: { ...TIPO.cuerpo, color: COLOR.textoSecundario },
  textoClaro: { ...TIPO.pequeno, color: COLOR.texto },
  nota: { ...TIPO.pequeno, color: COLOR.textoSecundario },
  etiqueta: { ...TIPO.pequenoFuerte, color: COLOR.texto, marginTop: ESPACIO.xs },
  bloque: { gap: ESPACIO.md },
  requisito: { padding: ESPACIO.md, borderRadius: RADIO.md, borderWidth: LINEA, borderColor: COLOR.lineaMedia, backgroundColor: COLOR.carbon, alignItems: 'flex-start' },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.md },
  cifra: { flexGrow: 1, flexBasis: 150, gap: ESPACIO.sm, padding: ESPACIO.lg, borderRadius: RADIO.lg, borderWidth: LINEA, borderColor: COLOR.linea, backgroundColor: COLOR.carbon },
  cifraRotulo: { ...TIPO.rotulo, color: COLOR.textoTenue, flexShrink: 1 },
  cifraValor: { ...TIPO.cifra, color: COLOR.blanco, fontVariant: ['tabular-nums'] },
  cifraDe: { ...TIPO.cuerpo, color: COLOR.textoTenue },
  encargos: { gap: ESPACIO.sm, padding: ESPACIO.lg, borderRadius: RADIO.lg, borderWidth: LINEA, borderColor: COLOR.linea, backgroundColor: COLOR.carbon },
  pieDeActivar: { gap: ESPACIO.sm, marginTop: ESPACIO.xs },
  divisor: { height: LINEA, backgroundColor: COLOR.linea, marginVertical: ESPACIO.xs },
});

export default AutonomiaDelPersonaje;
