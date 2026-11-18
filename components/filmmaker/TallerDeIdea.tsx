import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconoWee } from '../icons/IconoWee';
import IconoDireccional from '../IconoDireccional';
import { TarjetaTuIdea, TiraDeEstructura } from './TarjetaTuIdea';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { ARRANQUES, COPILOTO_DEL_TALLER_ABIERTO, EMPEZAR_CON, EmpezarCon, Opcion, REPARTO_ABIERTO } from '../../constants/filmmakerIdea';
import { IdeaDelTaller, contestarPaso, etiquetaAccesible, estaLista, pasoActual, poner, retrocederPaso } from '../../utils/ideaDeFilmmaker';

export type ModoDelTaller = 'guiado' | 'directo';
export interface MensajeDelTaller { id: number; rol: 'tu' | 'wee'; texto?: string; clave?: string }

/** El nombre accesible de un chip de «Empezar con»: si está cerrado, dice que no está disponible y por qué. */
const etaDeChip = (t: (k: string) => string, e: (typeof EMPEZAR_CON)[number]): string => etiquetaAccesible(t(e.clave), e.cerrada ? t('filmmaker.hubNotYet') : null, e.cerrada ? t(e.claveMotivo) : null);

const CLAVE_DE_SALUDO = { short: 'filmmaker.ideaHelloShort', film: 'filmmaker.ideaHelloFilm', ad: 'filmmaker.ideaHelloAd' } as const;

interface Props {
  idea: IdeaDelTaller;
  onIdea: (idea: IdeaDelTaller) => void;
  modo: ModoDelTaller;
  onModo: (m: ModoDelTaller) => void;
  empezarCon: EmpezarCon;
  onEmpezarCon: (e: EmpezarCon) => void;
  mensajes: readonly MensajeDelTaller[];
  /** Dos zonas (hilo | tarjeta) cuando hay ancho (tableta y escritorio). */
  dosZonas: boolean;
  /** Pantalla corta: se retiran las notas que ya dicen los controles (la pista del modo, el saldo, la nota de Reparto); el motivo del botón apagado se queda. */
  compacto: boolean;
  onAviso: (clave: string) => void;
  creando: boolean;
  fallo: boolean;
  /** Saldo conocido y a cero: solo avisa, no bloquea (preparar no cuesta en el cliente; D5). */
  sinSaldo: boolean;
  onContinuar: () => void;
}

/**
 * EL TALLER DE IDEA (etapa 1 de Filmmaker): el mundo de encima de la caja común. Arriba el hilo —un saludo de Weë, «Empezar con», Guiado/Directo y
 * la pregunta o los arranques—; después la tarjeta viva «Tu idea», la tira de estructura y «Continuar a Reparto», el único botón blanco.
 * NO hay IA aquí (D5 pendiente): lo que se ve sale de lo que la persona elige o escribe; la fila «Weë propone» está cerrada con su motivo.
 */
export const TallerDeIdea: React.FC<Props> = ({ idea, onIdea, modo, onModo, empezarCon, onEmpezarCon, mensajes, dosZonas, compacto, onAviso, creando, fallo, sinSaldo, onContinuar }) => {
  const t = useT();
  const dir = useDireccion();
  const lista = estaLista(idea);
  const paso = pasoActual(idea);
  const refHilo = useRef<ScrollView>(null);
  /* Al llegar un mensaje, cambiar de pregunta o de modo, el hilo vuelve arriba: la pregunta nueva está justo bajo el saludo, antes que la tarjeta. */
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const id = setTimeout(() => refHilo.current?.scrollTo({ y: 0, animated: true }), 60);
    return () => clearTimeout(id);
  }, [mensajes.length, idea.paso, modo]);

  const burbuja = (texto: string, rol: 'tu' | 'wee', clave: string | number) => (
    <View key={clave} style={[styles.burbuja, rol === 'tu' ? styles.burbujaTuya : styles.burbujaWee, { alignSelf: rol === 'tu' ? 'flex-end' : 'flex-start' }]}>
      <Text style={[textoPortada(15, '400'), dir.texto, { color: P.tinta }]} numberOfLines={rol === 'tu' ? 6 : undefined}>{texto}</Text>
    </View>
  );

  const hilo = (
    <View style={styles.hilo}>
      {/* En pantalla corta el saludo se retira: la etiqueta del tipo, bajo el hilo, ya dice de qué producción se trata. */}
      {!compacto ? burbuja(t(CLAVE_DE_SALUDO[idea.tipo]), 'wee', 'saludo') : null}

      <View style={[styles.fila, dir.contenedor]} accessibilityRole="radiogroup" accessibilityLabel={t('filmmaker.ideaStartWith')}>
        {EMPEZAR_CON.map((e) => {
          const sel = empezarCon === e.id;
          return (
            <TouchableOpacity
              key={e.id}
              onPress={e.cerrada ? () => onAviso(e.claveMotivo) : () => onEmpezarCon(e.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={etaDeChip(t, e)}
              accessibilityState={{ selected: sel, disabled: e.cerrada }}
              style={[styles.chip, sel && styles.chipSel, e.cerrada && styles.chipCerrado]}
            >
              <Text style={[textoPortada(14, sel ? '600' : '500'), { color: e.cerrada ? P.tintaSecundaria : P.tinta }]} numberOfLines={1}>{t(e.clave)}</Text>
              {e.cerrada ? <Ionicons name="lock-closed-outline" size={12} color={P.tintaDeshabilitada} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
      {empezarCon === 'script' ? <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.ideaScriptHint')}</Text> : null}

      <View style={[styles.modos, dir.contenedor]} accessibilityRole="radiogroup" accessibilityLabel={t('filmmaker.ideaMode')}>
        {(['guiado', 'directo'] as const).map((m) => {
          const sel = modo === m;
          return (
            <TouchableOpacity key={m} onPress={() => onModo(m)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(m === 'guiado' ? 'filmmaker.ideaModeGuided' : 'filmmaker.ideaModeDirect'), t(m === 'guiado' ? 'filmmaker.ideaModeGuidedHint' : 'filmmaker.ideaModeDirectHint'))} accessibilityState={{ selected: sel }} style={[styles.modo, sel && styles.modoSel]}>
              <Text style={[textoPortada(14, sel ? '600' : '500'), { color: sel ? P.tinta : P.tintaSecundaria }]} numberOfLines={1}>{t(m === 'guiado' ? 'filmmaker.ideaModeGuided' : 'filmmaker.ideaModeDirect')}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!compacto ? <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t(modo === 'guiado' ? 'filmmaker.ideaModeGuidedHint' : 'filmmaker.ideaModeDirectHint')}</Text> : null}

      {mensajes.map((m) => burbuja(m.clave ? t(m.clave) : m.texto ?? '', m.rol, m.id))}

      {modo === 'guiado' ? (
        paso ? (
          <View style={styles.pregunta}>
            {burbuja(t(paso.claveTitulo), 'wee', 'pregunta')}
            {paso.clase === 'choice' ? (
              <View style={[styles.opciones, dir.contenedor]}>
                {paso.opciones.map((o) => <Tarjeta key={o.id} o={o} grande={paso.campo === 'sensation'} onPress={() => onIdea(contestarPaso(idea, { valor: o.id }))} />)}
                <TouchableOpacity onPress={() => onIdea(contestarPaso(idea, 'no-se'))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.idontKnow')} style={[styles.chip, styles.noSe]}>
                  <Text style={[textoPortada(14, '500'), { color: P.tinta }]}>{t('filmmaker.idontKnow')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t(paso.clavePlaceholder)}</Text>
            )}
            <View style={[styles.fila, dir.contenedor]}>
              {idea.paso > 0 ? (
                <TouchableOpacity onPress={() => onIdea(retrocederPaso(idea))} style={styles.enlace} accessibilityRole="button" accessibilityLabel={t('filmmaker.askBack')}>
                  <IconoDireccional name="arrow-back" size={14} color={P.tintaSecundaria} />
                  <Text style={[textoPortada(13, '500'), { color: P.tintaSecundaria }]}>{t('filmmaker.askBack')}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => onIdea(contestarPaso(idea, 'saltar'))} style={styles.enlace} accessibilityRole="button" accessibilityLabel={t('filmmaker.askSkip')}>
                <Text style={[textoPortada(13, '500'), { color: P.tintaSecundaria }]}>{t('filmmaker.askSkip')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          burbuja(t(lista ? 'filmmaker.askDone' : 'filmmaker.askDoneNeedIdea'), 'wee', 'fin')
        )
      ) : !idea.valores.idea ? (
        <View style={styles.pregunta}>
          {burbuja(t('filmmaker.directPrompt'), 'wee', 'directo')}
          <View style={[styles.opciones, dir.contenedor]}>
            {ARRANQUES[idea.tipo].map((a) => (
              <TouchableOpacity key={a.id} onPress={() => onIdea(poner(idea, 'idea', t(a.claveFrase)))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(a.clave), t(a.claveFrase))} style={styles.chip}>
                <Text style={[textoPortada(14, '500'), { color: P.tinta }]}>{t(a.clave)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {/* El copiloto que propone: cerrado con su motivo hasta que D5 lo decida. Nada simulado. */}
      {!COPILOTO_DEL_TALLER_ABIERTO ? (
        <TouchableOpacity onPress={() => onAviso('filmmaker.ideaCopilotClosed')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmaker.ideaCopilot'), t('filmmaker.ideaCopilotClosed'))} accessibilityState={{ disabled: true }} style={[styles.cerrado, dir.contenedor]}>
          <IconoWee name="cerebro" size={16} color={P.tintaDeshabilitada} />
          <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]} numberOfLines={3}>{t('filmmaker.ideaCopilotClosed')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const tarjetas = (
    <View style={styles.tarjetas}>
      <TarjetaTuIdea idea={idea} onCambiar={onIdea} />
      <TiraDeEstructura idea={idea} />
    </View>
  );

  const continuar = (
    <View style={styles.continuar}>
      {sinSaldo && !compacto ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.ideaNoCredits')}</Text> : null}
      {fallo ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tinta }]} accessibilityRole="alert">{t('filmmaker.hubCreateError')}</Text> : null}
      <TouchableOpacity
        onPress={onContinuar}
        disabled={!lista || creando}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={etiquetaAccesible(t('filmmaker.ideaContinue'), lista ? null : t('filmmaker.ideaContinueWhy'))}
        accessibilityState={{ disabled: !lista || creando, busy: creando }}
        style={[styles.principal, (!lista || creando) && styles.principalApagado, dir.contenedor]}
      >
        {creando ? <ActivityIndicator size="small" color={P.tintaDeshabilitada} /> : null}
        <Text style={[textoPortada(16, '600'), { color: lista ? P.sobreAccion : P.tintaDeshabilitada }]} numberOfLines={1}>{creando ? t('filmmaker.hubCreating') : fallo ? t('filmmaker.hubRetry') : t('filmmaker.ideaContinue')}</Text>
        {!creando ? <IconoDireccional name="arrow-forward" size={18} color={lista ? P.sobreAccion : P.tintaDeshabilitada} /> : null}
      </TouchableOpacity>
      {!lista ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} accessibilityLiveRegion="polite">{t('filmmaker.ideaContinueWhy')}</Text> : !REPARTO_ABIERTO && !compacto ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.ideaContinueNote')}</Text> : null}
    </View>
  );

  if (dosZonas) {
    return (
      <View style={styles.dos}>
        <ScrollView ref={refHilo} style={styles.zona} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">{hilo}</ScrollView>
        <View style={styles.zona}>
          <ScrollView style={styles.zona} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">{tarjetas}</ScrollView>
          {continuar}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.uno}>
      <ScrollView ref={refHilo} style={styles.zona} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">{hilo}{tarjetas}</ScrollView>
      {continuar}
    </View>
  );
};

/** Una opción del modo Guiado: la sensación va en tarjeta con icono; las demás, en chip. */
const Tarjeta: React.FC<{ o: Opcion; grande: boolean; onPress: () => void }> = ({ o, grande, onPress }) => {
  const t = useT();
  if (!grande) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(o.clave)} style={styles.chip}>
        <Text style={[textoPortada(14, '500'), { color: P.tinta }]}>{t(o.clave)}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(o.clave)} style={styles.sensacion}>
      {o.icono ? <IconoWee name={o.icono} size={22} color={P.tinta} /> : null}
      <Text style={[textoPortada(14, '600'), { color: P.tinta }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{t(o.clave)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  uno: { flex: 1 },
  dos: { flex: 1, flexDirection: 'row', gap: 16 },
  zona: { flex: 1 },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  hilo: { gap: 10 },
  tarjetas: { gap: 12 },
  burbuja: { maxWidth: '88%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  burbujaWee: { backgroundColor: P.superficie, borderWidth: 1, borderColor: P.bordeCapsula },
  burbujaTuya: { backgroundColor: P.superficieAlta, borderWidth: 1, borderColor: P.bordeLuz },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  chipSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  chipCerrado: { borderStyle: 'dashed', borderColor: P.bordeCapsula, backgroundColor: 'transparent' },
  modos: { flexDirection: 'row', borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, padding: 3, gap: 3 },
  modo: { flex: 1, minHeight: 44, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  modoSel: { backgroundColor: P.superficieAlta, borderWidth: 1, borderColor: P.bordeLuz },
  pregunta: { gap: 10 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sensacion: { width: '48%', flexGrow: 1, minHeight: 60, borderRadius: 18, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 10 },
  noSe: { width: '100%', borderStyle: 'dashed', borderColor: P.bordeCapsula, backgroundColor: 'transparent' },
  enlace: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  cerrado: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  continuar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 6 },
  principal: { minHeight: 52, borderRadius: 26, backgroundColor: P.accion, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  principalApagado: { backgroundColor: 'transparent', borderWidth: 1, borderColor: P.bordeCapsula },
});
