import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useBrainChat } from '../../hooks/useBrainChat';
import CajaDePrompt from '../creator/CajaDePrompt';
import SlotDeImagen from './SlotDeImagen';
import {
  FASHION_IMAGEN_VALIDADA, FashionModo, SELECCION_VACIA, SeleccionDeFashion, alternarOpcion, crearIntencion, hayEleccion, materialesQueFaltan,
} from '../../constants/fashionModes';
import { armarBrief } from '../../utils/fashionBrief';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  modo: FashionModo;
  onVolver: () => void;
  /** Lo que ya traía la persona al entrar (por ejemplo, desde una puerta de Weë Studio). */
  inicial?: { texto?: string; imageUri?: string };
}

const claveDelBorrador = (modo: string) => `wee.fashion.borrador.${modo}`;

/**
 * EL COMPOSER DE WEË FASHION (v0).
 *
 * Una experiencia sobre los sistemas compartidos, NO un motor: no habla con ninguna API.
 *  · La ORIENTACIÓN DE ESTILO es real y es la de siempre: el mensaje se manda a Weë Brain por `useBrainChat`
 *    (mismo servicio, mismo cobro de Credits, mismos errores humanizados, mismo aviso de «demostración»). Un mensaje
 *    de muestra se marca como Demostración y no consume Credits.
 *  · La GENERACIÓN DE IMAGEN no se abre mientras `FASHION_IMAGEN_VALIDADA` sea false: se dice con todas las letras
 *    («pendiente de validación») y la configuración queda preparada como intención estructurada. Nunca se enseña
 *    una imagen simulada como si fuera un resultado.
 *  · Las imágenes que se eligen viven solo en esta pantalla: no se suben ni se guardan. El borrador guarda solo
 *    texto y elecciones, en este dispositivo.
 */
const FashionComposer: React.FC<Props> = ({ modo, onVolver, inicial }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const navigation = useNavigation<any>();
  const chat = useBrainChat();

  const [texto, setTexto] = useState(inicial?.texto ?? '');
  const [sel, setSel] = useState<SeleccionDeFashion>(SELECCION_VACIA);
  const [imagenes, setImagenes] = useState<Record<string, string | undefined>>(inicial?.imageUri ? { persona: inicial.imageUri } : {});
  const [guardado, setGuardado] = useState(false);
  const [pidio, setPidio] = useState(false);
  const desde = useRef(0);

  /* El borrador de este modo (texto y elecciones, nunca imágenes). */
  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(claveDelBorrador(modo.id))
      .then((raw) => {
        if (!vivo || !raw) return;
        const d = JSON.parse(raw);
        if (!inicial?.texto && typeof d.texto === 'string') setTexto(d.texto);
        if (d.sel && typeof d.sel === 'object') setSel({ elegidas: d.sel.elegidas ?? {}, idk: !!d.sel.idk });
      })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [modo.id, inicial?.texto]);

  const tiene = useMemo(() => Object.fromEntries(Object.entries(imagenes).map(([k, v]) => [k, !!v])), [imagenes]);
  const faltan = materialesQueFaltan(modo, tiene);
  const intencion = useMemo(() => crearIntencion(modo, sel, texto, tiene), [modo, sel, texto, tiene]);

  const pedirOrientacion = useCallback(async () => {
    if (!chat.user) { navigation.navigate('Login'); return; }
    if (chat.busy) return;
    const brief = armarBrief({ t, lista: (xs) => formato.lista(xs) }, modo, sel, texto);
    desde.current = chat.messages.length;
    setPidio(true);
    await chat.send(brief);
  }, [chat, navigation, t, formato, modo, sel, texto]);

  const guardar = useCallback(async () => {
    try {
      await AsyncStorage.setItem(claveDelBorrador(modo.id), JSON.stringify({ texto: texto.trim().slice(0, 300), sel }));
      setGuardado(true);
    } catch { setGuardado(false); }
  }, [modo.id, texto, sel]);

  useEffect(() => { setGuardado(false); }, [texto, sel]);

  const respuestas = pidio ? chat.messages.slice(desde.current).filter((m) => m.role === 'wee') : [];
  const ultima = respuestas[respuestas.length - 1];

  const lineasDeRevision = modo.grupos.flatMap((g) => {
    const id = sel.elegidas[g.id]?.[0];
    const op = g.opciones.find((o) => o.id === id);
    return op ? [t('fashion.reviewLine', { grupo: t(g.claveTitulo), valor: t(op.clave) })] : [];
  });
  if (sel.idk) lineasDeRevision.push(t('fashion.idk'));

  return (
    <View style={styles.raiz}>
      <TouchableOpacity accessibilityRole="button" onPress={onVolver} style={styles.volver} hitSlop={8}>
        <Ionicons name="chevron-back" size={scale(18)} color={theme.colors.accentDark} />
        <Text style={[styles.volverTexto, { color: theme.colors.accentDark }]}>{t('fashion.backToFashion')}</Text>
      </TouchableOpacity>

      <View style={styles.cabecera}>
        <View style={[styles.circulo, { backgroundColor: theme.colors.accent + '26' }]}>
          <Ionicons name={modo.icono as any} size={scale(26)} color={theme.colors.accentDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={[styles.titulo, { color: theme.colors.text }]}>{t(modo.claveTitulo)}</Text>
          <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>{t(modo.claveDescripcion)}</Text>
        </View>
      </View>

      {/* Lo que se necesita antes de empezar */}
      <Text accessibilityRole="header" style={[styles.seccion, { color: theme.colors.text }]}>{t('fashion.materialsTitle')}</Text>
      <View style={styles.pila}>
        {modo.materiales.map((m) => (
          <SlotDeImagen
            key={m.id}
            claveTitulo={m.claveTitulo}
            claveAyuda={m.claveAyuda}
            obligatorio={m.obligatorio}
            uri={imagenes[m.id]}
            onElegir={(uri) => setImagenes((a) => ({ ...a, [m.id]: uri }))}
            onQuitar={() => setImagenes((a) => ({ ...a, [m.id]: undefined }))}
          />
        ))}
      </View>

      {/* Opciones sugeridas: se cambian con el modo; ninguna es obligatoria */}
      <Text accessibilityRole="header" style={[styles.seccion, { color: theme.colors.text }]}>{t('fashion.optionsTitle')}</Text>
      {modo.grupos.map((g) => (
        <View key={g.id} style={styles.grupo}>
          <Text style={[styles.grupoTitulo, { color: theme.colors.textSecondary }]}>{t(g.claveTitulo)}</Text>
          <View style={styles.chips}>
            {g.opciones.map((o) => {
              const activa = sel.elegidas[g.id]?.includes(o.id);
              return (
                <TouchableOpacity
                  key={o.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !!activa }}
                  onPress={() => setSel((s) => alternarOpcion(s, g.id, o.id))}
                  style={[styles.chip, { borderColor: activa ? theme.colors.accent : theme.colors.border, backgroundColor: activa ? theme.colors.accent + '26' : theme.colors.card }]}
                >
                  <Text style={[styles.chipTexto, { color: theme.colors.text }]}>{t(o.clave)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected: sel.idk }}
        onPress={() => setSel((s) => ({ ...s, idk: !s.idk }))}
        style={[styles.chip, styles.idk, { borderColor: sel.idk ? theme.colors.accent : theme.colors.border, backgroundColor: sel.idk ? theme.colors.accent + '26' : theme.colors.card }]}
      >
        <Ionicons name="help-circle-outline" size={scale(16)} color={theme.colors.accentDark} />
        <Text style={[styles.chipTexto, { color: theme.colors.text }]}>{t('fashion.idk')}</Text>
      </TouchableOpacity>

      {/* Revisar */}
      <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text accessibilityRole="header" style={[styles.grupoTitulo, { color: theme.colors.text, fontWeight: FONT_WEIGHT.semibold }]}>{t('fashion.reviewTitle')}</Text>
        {hayEleccion(sel) || texto.trim() ? (
          <>
            {lineasDeRevision.map((l) => <Text key={l} style={[styles.linea, { color: theme.colors.text }]}>{l}</Text>)}
            {texto.trim() ? <Text style={[styles.linea, { color: theme.colors.text }]} numberOfLines={3}>{texto.trim()}</Text> : null}
          </>
        ) : (
          <Text style={[styles.linea, { color: theme.colors.textSecondary }]}>{t('fashion.reviewEmpty')}</Text>
        )}
        {faltan.length > 0 && (
          <Text style={[styles.linea, { color: theme.colors.textSecondary }]}>
            {t('fashion.reviewMissing', { lista: formato.lista(modo.materiales.filter((m) => faltan.includes(m.id)).map((m) => t(m.claveTitulo))) })}
          </Text>
        )}
      </View>

      {/* Qué puede hacer Weë ahora: cada estado, con su nombre */}
      <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.estado}>
          <Ionicons name="checkmark-circle" size={scale(18)} color={theme.colors.success} />
          <Text style={[styles.linea, { color: theme.colors.text, flex: 1 }]}>{t('fashion.statusText')}</Text>
        </View>
        <View style={styles.estado}>
          <Ionicons name={FASHION_IMAGEN_VALIDADA ? 'checkmark-circle' : 'time-outline'} size={scale(18)} color={FASHION_IMAGEN_VALIDADA ? theme.colors.success : theme.colors.warning} />
          <Text style={[styles.linea, { color: theme.colors.text, flex: 1 }]}>{t('fashion.statusImage')}</Text>
        </View>
        {!FASHION_IMAGEN_VALIDADA && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('fashion.statusImageHelp')}</Text>}
      </View>

      {modo.avisos.map((a) => <Text key={a} style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(`fashion.${a}`)}</Text>)}

      {/* Pedir la orientación con lo ya elegido: no hace falta escribir nada (la caja de abajo es para quien prefiere decirlo con sus palabras). */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('fashion.askAdvice')}
        onPress={pedirOrientacion}
        activeOpacity={0.85}
        style={[styles.pedir, { backgroundColor: theme.colors.accent, opacity: chat.busy ? 0.6 : 1 }]}
      >
        <Ionicons name="sparkles-outline" size={scale(18)} color="#1F2937" />
        <Text style={styles.pedirTexto}>{chat.busy ? t('fashion.askAdviceBusy') : t('fashion.askAdvice')}</Text>
      </TouchableOpacity>

      {/* Escribir y pedir orientación: la caja común de Weë AI */}
      <CajaDePrompt
        valor={texto}
        onCambiar={setTexto}
        onEnviar={pedirOrientacion}
        etiquetaEnviar={t('fashion.askAdvice')}
        placeholder={t('fashion.describeHint')}
        ocupado={chat.busy}
      />

      <TouchableOpacity accessibilityRole="button" onPress={guardar} style={styles.guardar} hitSlop={8}>
        <Ionicons name="bookmark-outline" size={scale(16)} color={theme.colors.accentDark} />
        <Text style={[styles.volverTexto, { color: theme.colors.accentDark }]}>{guardado ? t('fashion.draftSaved') : t('fashion.saveDraft')}</Text>
      </TouchableOpacity>

      {/* El resultado real, o su estado real */}
      {chat.busy && (
        <View style={styles.estado} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.colors.accentDark} />
          <Text style={[styles.linea, { color: theme.colors.textSecondary }]}>{t('fashion.askAdviceBusy')}</Text>
        </View>
      )}
      {!chat.busy && pidio && chat.error ? (
        <Text accessibilityLiveRegion="assertive" style={[styles.linea, { color: theme.colors.error }]}>{chat.error || t('fashion.errorAdvice')}</Text>
      ) : null}
      {!chat.busy && ultima && (
        <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" style={[styles.grupoTitulo, { color: theme.colors.text, fontWeight: FONT_WEIGHT.semibold }]}>{t('fashion.adviceTitle')}</Text>
          <Text selectable style={[styles.linea, { color: theme.colors.text }]}>{ultima.text}</Text>
          {ultima.demo ? (
            <Text style={[styles.nota, { color: theme.colors.warning }]}>{t('fashion.statusDemo')}</Text>
          ) : (
            <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
              {ultima.credits ? t('fashion.adviceCost', { credits: ultima.credits }) : t('fashion.adviceFree')}
            </Text>
          )}
        </View>
      )}
      {/* La intención estructurada queda lista para el flujo de imagen cuando exista; hoy no sale de esta pantalla. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 0 }} testID={`fashion-intencion-${intencion.modo}`} />
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { gap: SPACING.md, paddingBottom: SPACING.xxxl },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', minHeight: scale(40) },
  volverTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  circulo: { width: scale(52), height: scale(52), borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.semibold },
  sub: { fontSize: FONT_SIZE.sm, marginTop: 2 },
  seccion: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginTop: SPACING.md },
  pila: { gap: SPACING.sm },
  grupo: { gap: SPACING.xs },
  grupoTitulo: { fontSize: FONT_SIZE.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: { borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minHeight: scale(40), justifyContent: 'center' },
  chipTexto: { fontSize: FONT_SIZE.sm },
  idk: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start' },
  tarjeta: { borderWidth: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.xs },
  linea: { fontSize: FONT_SIZE.base, lineHeight: scale(22) },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  estado: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pedir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: BORDER_RADIUS.full, minHeight: scale(48), paddingHorizontal: SPACING.xl },
  pedirTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: '#1F2937' },
  guardar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start', minHeight: scale(40) },
});

export default FashionComposer;
