import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import {
  AJUSTES_DE_ENTREGA, AJUSTES_DE_GENERACION_3D, CapacidadDeDesign, CLAVE_DE_LA_CLASE, CLAVE_DE_LA_ELEGIBILIDAD, CLAVE_DE_LA_ENTRADA,
  CLAVE_DE_LO_QUE_FALTA, CLAVE_DEL_IMPACTO, CLAVE_DEL_REQUISITO, ELEGIR_QUIEN_LO_HACE_EN_LA_APP, FORMATOS_DE_ENTREGA,
  capacidadPorId, eslabonDeLaCapacidad,
} from '../../constants/designReferencia';
import {
  CLAVE_DEL_ESTADO_DE_TRABAJO, CLAVE_DEL_ESTADO_DEL_PASO, CLAVE_DEL_NIVEL, CLAVE_DEL_PASO, EstadoDeLaCapacidad, PASOS,
  cancelacionEn, estadosSimulados, recorridoDe, siguientesDe,
} from '../../utils/designReferencia';
import { CLAVE_DE_LO_QUE_PRODUCE, clavesDeLoQueUsa } from '../../utils/designReferencia';
import { CLAVE_DEL_MOTIVO_DEL_MUNDO, CONTEXTO_DEL_MUNDO_EN_DESIGN, estadoDelMundoEnDesign } from '../../utils/design3d';
import { CURSOR, Insignia, ListaDeAjustes, Pista, TituloDeBloque, nombreDeIcono } from './piezas';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';


interface Props {
  cap: CapacidadDeDesign | null;
  estado: EstadoDeLaCapacidad | null;
  onCerrar: () => void;
  /** Solo se ofrece si la capacidad está disponible: lleva a su camino de verdad. */
  onUsar: (cap: CapacidadDeDesign) => void;
  /** Otra capacidad (lo que sigue, o el atajo): la misma hoja, con ella. */
  onAbrirCapacidad: (id: string) => void;
  /** Al final de la simulación: un resultado SIMULADO en el lienzo, marcado como tal. */
  onVerSimulado: (cap: CapacidadDeDesign) => void;
}

/**
 * EL DETALLE DE UNA CAPACIDAD, Y SU RECORRIDO SIMULADO.
 *
 * Contesta lo que el dueño pide de cada capacidad: dónde vive, qué produce, qué le
 * falta, quién podría hacerla (dato de la Línea B, sin nombres), qué decisiones la
 * esperan y sus diecinueve pasos, cada uno con su estado (existe, pendiente, no
 * aplica).
 *
 * «Simular el recorrido» la recorre de punta a punta sin ejecutar NADA: los estados
 * por los que pasaría un trabajo, el precio dicho como pendiente (nunca un número),
 * qué se podría parar y qué no, qué quedaría en «Mis creaciones» y qué se puede
 * hacer después —que abre otra capacidad: así se navega todo Weë Design como un
 * solo sistema—. Cada paso lo avanza la persona; no hay temporizadores que finjan
 * trabajo, y cada pantalla dice SIMULACIÓN.
 */
const HojaDeCapacidad: React.FC<Props> = ({ cap, estado, onCerrar, onUsar, onAbrirCapacidad, onVerSimulado }) => {
  const { theme } = useTheme();
  const t = useT();
  const [simulando, setSimulando] = useState(false);
  const [indice, setIndice] = useState(0);

  /* Otra capacidad, otra hoja: se empieza por su detalle. */
  useEffect(() => {
    setSimulando(false);
    setIndice(0);
  }, [cap?.id]);

  const pasos = useMemo(() => (cap ? recorridoDe(cap) : null), [cap]);
  const estados = useMemo(() => (cap ? estadosSimulados(cap) : []), [cap]);
  const siguientes = useMemo(() => (cap ? siguientesDe(cap.salida) : []), [cap]);

  if (!cap || !estado || !pasos) return null;

  const actual = estados[Math.min(indice, estados.length - 1)];
  const alFinal = indice >= estados.length - 1;
  const parar = cancelacionEn(cap, actual);
  const precioReal = pasos.cotizacion === 'YES';
  const atajo = cap.atajo ? capacidadPorId(cap.atajo) : undefined;
  const eslabon = eslabonDeLaCapacidad(cap.id);
  /* Los ajustes del paso «opciones»: los de crear en 3D, o los de entregar. Apagados y con su motivo. */
  const creaEn3d = cap.ejecutaPor === 'motor' && cap.categoria === 'A' && cap.salida === 'model3d';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={[estilos.fondo, { backgroundColor: theme.colors.backdrop }]}>
        <View style={[estilos.hoja, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]} accessibilityViewIsModal>
          <View style={estilos.cabecera}>
            <Ionicons name={nombreDeIcono(cap.icono)} size={scale(22)} color={theme.colors.text} />
            <Text style={[estilos.nombre, { color: theme.colors.text }]} accessibilityRole="header" numberOfLines={2}>{t(cap.clave)}</Text>
            <TouchableOpacity onPress={onCerrar} accessibilityRole="button" accessibilityLabel={t('common.close')} style={estilos.cerrar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={scale(22)} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={estilos.dentro} showsVerticalScrollIndicator={false}>
            <View style={estilos.filaInsignias}>
              <Insignia clave={CLAVE_DEL_NIVEL[estado.nivel]} tono={estado.disponible ? 'activo' : 'apagado'} />
              <Insignia clave="designRef.rowLabel" valores={{ fila: cap.fila }} />
            </View>
            {!!estado.motivo && <Text style={[estilos.motivo, { color: theme.colors.text }]}>{t(estado.motivo)}</Text>}
            {(cap.capacidades as readonly string[]).includes(CONTEXTO_DEL_MUNDO_EN_DESIGN.capacidad)
              ? estadoDelMundoEnDesign().motivos.map((m) => <Pista key={m} clave={CLAVE_DEL_MOTIVO_DEL_MUNDO[m]} />)
              : null}

            {!simulando ? (
              <>
                <Dato etiqueta="designRef.sheetWhere" valor={t(CLAVE_DE_LA_ENTRADA[cap.entrada])} />
                <Dato etiqueta="designRef.sheetOutput" valor={t(CLAVE_DE_LO_QUE_PRODUCE[cap.salida])} />
                <Dato etiqueta="designRef.sheetAsset" valor={t(CLAVE_DEL_IMPACTO[cap.impacto])} />
                <Dato etiqueta="designRef.sheetWho" valor={t(CLAVE_DE_LA_ELEGIBILIDAD[cap.elegibilidad])} />
                {ELEGIR_QUIEN_LO_HACE_EN_LA_APP && <EleccionDeGobierno />}
                {cap.requiere.length > 0 && (
                  <Dato etiqueta="designRef.sheetNeeds" valor={cap.requiere.map((r) => t(CLAVE_DEL_REQUISITO[r])).join(' · ')} />
                )}
                {cap.decisiones.length > 0 && <Dato etiqueta="designRef.sheetDecisions" valor={t('designRef.sheetDecisionOpen')} />}
                {eslabon && <Dato etiqueta="designRef.chainTitle" valor={`${t(eslabon.clave)} · ${t(CLAVE_DE_LA_CLASE[eslabon.clase])}`} />}
                {eslabon && eslabon.falta.length > 0 && (
                  <Dato etiqueta="designRef.chainMissing" valor={eslabon.falta.map((x) => t(CLAVE_DE_LO_QUE_FALTA[x])).join(' · ')} />
                )}
                {cap.capacidades.length > 0 && <Dato etiqueta="designRef.sheetUses" valor={clavesDeLoQueUsa(cap.capacidades).map((k) => t(k)).join(' · ')} />}
                {creaEn3d && <ListaDeAjustes titulo="designRef.genTitle" ajustes={AJUSTES_DE_GENERACION_3D} motivo="designRef.genPending" />}
                {cap.id === 'exportFor' && (
                  <ListaDeAjustes titulo="designRef.deliveryTitle" ajustes={AJUSTES_DE_ENTREGA} motivo="designRef.deliveryPending" etiquetas={FORMATOS_DE_ENTREGA} />
                )}

                {cap.enDesign ? (
                  <View style={estilos.avisoSimulacion}>
                    <Insignia clave="designRef.simulatedBadge" tono="aviso" />
                    <Pista clave="designRef.simBanner" />
                  </View>
                ) : null}
                <TituloDeBloque clave="designRef.sheetFlow" />
                <View style={estilos.recorrido}>
                  {PASOS.map((p) => (
                    <View key={p} style={[estilos.paso, { borderColor: theme.colors.border }]}>
                      <Text style={[estilos.pasoNombre, { color: theme.colors.text }]} numberOfLines={1}>{t(CLAVE_DEL_PASO[p])}</Text>
                      <Insignia clave={CLAVE_DEL_ESTADO_DEL_PASO[pasos[p]]} tono={pasos[p] === 'YES' ? 'activo' : pasos[p] === 'PENDING' ? 'aviso' : 'apagado'} />
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={[estilos.simulacion, { borderColor: theme.colors.warning, backgroundColor: theme.colors.surface }]}>
                <Text style={[estilos.simBanner, { color: theme.colors.text }]}>{t('designRef.simBanner')}</Text>
                <View style={estilos.estados}>
                  {estados.map((e, i) => (
                    <Insignia key={`${e}-${i}`} clave={CLAVE_DEL_ESTADO_DE_TRABAJO[e]} tono={i === indice ? 'activo' : 'apagado'} />
                  ))}
                </View>
                <Text style={[estilos.simActual, { color: theme.colors.text }]}>{t(CLAVE_DEL_ESTADO_DE_TRABAJO[actual])}</Text>
                {(actual === 'QUOTING' || actual === 'WAITING_FOR_CONFIRMATION') && (
                  <Pista clave={precioReal ? 'designRef.priceBeforeCreate' : 'designRef.pricePending'} />
                )}
                {(actual === 'QUEUED' || actual === 'PROCESSING') && (
                  <Pista clave={parar === 'logica' ? 'designRef.cancelLogical' : parar === 'con_parada' ? 'designRef.cancelWithStop' : 'designRef.cancelNone'} />
                )}
                {alFinal && (
                  <>
                    <Pista clave="designRef.simResult" />
                    <Pista clave={CLAVE_DEL_IMPACTO[cap.impacto]} />
                    {eslabon && eslabon.entra !== 'texto' ? <Pista clave="designRef.handoffByReference" /> : null}
                    {eslabon?.id === 'entregar' ? <Pista clave="designRef.chainDone" /> : null}
                    {cap.salida !== 'none' && cap.salida !== 'file' && (
                      <BotonDeTexto clave="designRef.simShowOnCanvas" onPress={() => onVerSimulado(cap)} />
                    )}
                    <TituloDeBloque clave="designRef.stepNext" />
                    {siguientes.length > 0 ? (
                      <View style={estilos.siguientes}>
                        {siguientes.map((s) => (
                          <BotonDeTexto key={s.id} clave={s.clave} onPress={() => onAbrirCapacidad(s.id)} />
                        ))}
                      </View>
                    ) : (
                      <Pista clave="designRef.stepNa" />
                    )}
                  </>
                )}
              </View>
            )}
          </ScrollView>

          <View style={[estilos.pie, { borderTopColor: theme.colors.border }]}>
            {simulando ? (
              <>
                <BotonDeTexto clave="designRef.previous" onPress={() => (indice > 0 ? setIndice(indice - 1) : setSimulando(false))} />
                {!alFinal && <BotonDeTexto clave="designRef.next" principal onPress={() => setIndice(indice + 1)} />}
              </>
            ) : (
              <>
                {!!atajo && <BotonDeTexto clave="designRef.shortcutBefore" valores={{ capacidad: t(atajo.clave) }} onPress={() => onAbrirCapacidad(atajo.id)} />}
                {cap.enDesign && <BotonDeTexto clave="designRef.simulate" onPress={() => { setIndice(0); setSimulando(true); }} />}
                {estado.disponible && <BotonDeTexto clave="designRef.use" principal onPress={() => onUsar(cap)} />}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

/** Una fila «etiqueta: valor». */
const Dato: React.FC<{ etiqueta: string; valor: string; tecnico?: boolean }> = ({ etiqueta, valor, tecnico }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={estilos.dato}>
      <Text style={[estilos.datoEtiqueta, { color: theme.colors.textSecondary }]}>{t(etiqueta)}</Text>
      <Text style={[estilos.datoValor, { color: theme.colors.text }, tecnico && estilos.tecnico]}>{valor}</Text>
    </View>
  );
};

/**
 * LA ELECCIÓN DE GOBIERNO (puerta cerrada por defecto): «Automático» elegido y la
 * elección manual apagada, con su motivo. No sabe ningún nombre de proveedor.
 */
const EleccionDeGobierno: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={[estilos.gobierno, { borderColor: theme.colors.border }]} accessibilityRole="radiogroup">
      <View style={estilos.opcion} accessibilityRole="radio" accessibilityState={{ checked: true, disabled: true }}>
        <Ionicons name="radio-button-on" size={scale(18)} color={theme.colors.text} />
        <Text style={[estilos.datoValor, { color: theme.colors.text }]}>{t('designRef.whoAuto')}</Text>
      </View>
      <View style={estilos.opcion} accessibilityRole="radio" accessibilityState={{ checked: false, disabled: true }}>
        <Ionicons name="radio-button-off" size={scale(18)} color={theme.colors.textSecondary} />
        <Text style={[estilos.datoValor, { color: theme.colors.textSecondary }]}>{t('designRef.whoChoose')}</Text>
      </View>
      <Pista clave="designRef.whoChooseHint" />
    </View>
  );
};

const BotonDeTexto: React.FC<{ clave: string; onPress: () => void; principal?: boolean; valores?: Record<string, string | number> }> = ({ clave, onPress, principal, valores }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t(clave, valores)}
      style={[
        estilos.boton,
        principal ? { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent } : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        CURSOR,
      ]}
    >
      <Text style={[estilos.botonTexto, { color: principal ? '#1F2937' : theme.colors.text }]} numberOfLines={2}>{t(clave, valores)}</Text>
    </TouchableOpacity>
  );
};

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  hoja: {
    width: '100%',
    maxWidth: scale(640),
    maxHeight: '88%',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg, paddingBottom: SPACING.sm },
  nombre: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dentro: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.sm },
  filaInsignias: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  motivo: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  dato: { gap: scale(2) },
  datoEtiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  datoValor: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  avisoSimulacion: { gap: SPACING.xs, alignItems: 'flex-start' },
  tecnico: { fontFamily: Platform.OS === 'web' ? 'ui-monospace, Consolas, monospace' : (Platform.OS === 'ios' ? 'Menlo' : 'monospace'), fontSize: FONT_SIZE.xs },
  recorrido: { gap: scale(6) },
  paso: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, paddingBottom: scale(6), borderBottomWidth: StyleSheet.hairlineWidth },
  pasoNombre: { flex: 1, fontSize: FONT_SIZE.sm },
  simulacion: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderStyle: 'dashed', padding: SPACING.md, gap: SPACING.sm },
  simBanner: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  estados: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  simActual: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  siguientes: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  gobierno: { borderWidth: StyleSheet.hairlineWidth, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, gap: SPACING.xs },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 32 },
  pie: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: SPACING.sm, padding: SPACING.lg, borderTopWidth: StyleSheet.hairlineWidth },
  boton: { minHeight: 44, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full, borderWidth: 1, justifyContent: 'center' },
  botonTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
});

export default HojaDeCapacidad;
