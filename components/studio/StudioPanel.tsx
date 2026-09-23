import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { HERRAMIENTAS_POR_AREA, GRUPOS_DE_HERRAMIENTAS, HerramientaDeStudio, AreaDeStudio } from '../../constants/studioTools';
import { EntradaDeStudio, ExperienciaDeStudio, entradaPorId, experienciasDeLaEntrada } from '../../constants/studioExperiences';
import StudioControles, { ControlesElegidos } from './StudioControles';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

export interface EleccionDeStudio {
  entrada: EntradaDeStudio;
  experiencia?: ExperienciaDeStudio;
  herramienta?: HerramientaDeStudio;
  controles: ControlesElegidos;
}

interface Props {
  entrada: EntradaDeStudio;
  onVolver: () => void;
  /** Lo elegido vuelve al compositor: el sitio donde se escribe es uno solo. */
  onElegir: (eleccion: EleccionDeStudio) => void;
  porFila: number;
}

/**
 * LAS CAPAS DOS Y TRES DEL STUDIO, UNA DETRÁS DE OTRA.
 *
 *   CAPA 2  qué quieres conseguir: Retrato, Timelapse, Narración.
 *   CAPA 3  con qué detalle: encuadre, luz, movimiento.
 *
 * La tercera NO se ve hasta que la segunda está contestada, y ahí está todo el
 * asunto: los controles de cámara son más de cincuenta, y enseñados antes de
 * saber qué se quiere hacer no son potencia, son un panel técnico. Elegida una
 * experiencia, aparecen solo los suyos —tres para un retrato, ocho para un
 * vídeo cinematográfico, ninguno para un cartel—.
 *
 * ── Dos entradas siguen enseñando el catálogo de siempre ────────────────────
 *
 * Documentos y "Más herramientas". No es una excepción olvidada: en "Más" no se
 * empieza algo, se busca algo concreto —quitar un fondo, sacar los silencios—,
 * y para buscar una lista por familias funciona mejor que una experiencia. Y a
 * Documentos no se le inventan experiencias mientras Weë no llegue de verdad a
 * hacer un documento: sería dibujar una puerta a un sitio al que no se llega.
 *
 * ── Y elegir no genera nada ─────────────────────────────────────────────────
 *
 * Al final del camino se vuelve al compositor con la intención puesta: la
 * experiencia, sus controles y el texto empezado. El Studio encamina; quien
 * crea es la experiencia común, con todo esto de contexto.
 */
const StudioPanel: React.FC<Props> = ({ entrada, onVolver, onElegir, porFila }) => {
  const { theme } = useTheme();
  const t = useT();

  /* Dentro del panel se avanza un paso: de las experiencias a sus controles. */
  const [elegida, setElegida] = useState<ExperienciaDeStudio | null>(null);
  const [controles, setControles] = useState<ControlesElegidos>({});
  /* El motivo que se está explicando, cuando se toca algo que todavía no se puede. */
  const [explicando, setExplicando] = useState<string | null>(null);

  const puerta = entradaPorId(entrada);
  const titulo = puerta?.marca ?? (puerta ? t(puerta.clave as string) : '');
  const experiencias = experienciasDeLaEntrada(entrada);
  const esCatalogo = experiencias.length === 0;

  const volverUnPaso = () => (elegida ? setElegida(null) : onVolver());

  /* ── Una tarjeta, igual para una experiencia y para una herramienta ────── */
  const tarjeta = (clave: string, icono: string, id: string, onPress: () => void, pendiente?: string) => (
    <TouchableOpacity
      key={id}
      style={[styles.hueco, { width: `${100 / porFila}%` as any }]}
      onPress={pendiente ? () => setExplicando(pendiente) : onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={pendiente ? `${t(clave)} — ${t(pendiente)}` : t(clave)}
      accessibilityState={{ disabled: !!pendiente }}
    >
      <View style={[
        styles.pieza,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        /*
          LO QUE TODAVÍA NO SE PUEDE HACER SE VE, Y SE VE QUE NO SE PUEDE.
          Apagada y con su sello. Ni escondida —nadie sabría que existe— ni
          igual que las demás —alguien gastaría Credits en algo que no va a
          salir—. Tocarla cuenta por qué falta, que es lo único útil que puede
          hacer hoy.
        */
        !!pendiente && { opacity: OPACITY.disabled },
        isWeb && ({ cursor: 'pointer' } as any),
      ]}>
        <Ionicons name={icono as any} size={scale(22)} color={theme.colors.text} />
        <Text style={[styles.piezaTexto, { color: theme.colors.text }]} numberOfLines={2}>{t(clave)}</Text>
        {!!pendiente && (
          <View style={[styles.sello, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.selloTexto, { color: theme.colors.textSecondary }]}>{t('studio.soon')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.panel}>
      <View style={styles.cabecera}>
        <TouchableOpacity
          onPress={volverUnPaso}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
        >
          <Ionicons name="chevron-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1}>
          {elegida ? t(elegida.clave) : titulo}
        </Text>
      </View>

      {/*
        Los vídeos avisan de su límite aquí y no al final: es lo que cambia lo
        que vas a pedir, así que se dice antes de elegir, no después.
      */}
      {entrada === 'videos' && !elegida && (
        <View style={[styles.nota, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="time-outline" size={scale(15)} color={theme.colors.textSecondary} />
          <Text style={[styles.notaTexto, { color: theme.colors.textSecondary }]}>{t('studio.vidLimit')}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dentro}>
        {/* ── CAPA 3 · los controles de la experiencia elegida ───────────── */}
        {elegida ? (
          <>
            {elegida.pideMaterial && (
              <View style={[styles.nota, { backgroundColor: theme.colors.surface, marginHorizontal: SPACING.lg }]}>
                <Ionicons name="image-outline" size={scale(15)} color={theme.colors.textSecondary} />
                <Text style={[styles.notaTexto, { color: theme.colors.textSecondary }]}>{t('studio.needsMaterial')}</Text>
              </View>
            )}

            {elegida.controles.length > 0 ? (
              <StudioControles
                familias={elegida.controles}
                elegido={controles}
                onElegir={(ruta, valor) =>
                  setControles((antes) => (antes[ruta] === valor ? quitar(antes, ruta) : { ...antes, [ruta]: valor }))
                }
              />
            ) : (
              /* Sin controles no se deja un hueco mudo: se dice por qué no hay. */
              <Text style={[styles.sinControles, { color: theme.colors.textSecondary }]}>
                {t('studio.noControls')}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.seguir, { backgroundColor: theme.colors.accent }, isWeb && ({ cursor: 'pointer' } as any)]}
              onPress={() => onElegir({ entrada, experiencia: elegida, controles })}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('studio.continue')}
            >
              <Text style={styles.seguirTexto}>{t('studio.continue')}</Text>
            </TouchableOpacity>
          </>
        ) : esCatalogo ? (
          /* ── El catálogo de siempre: Documentos y "Más herramientas" ──── */
          entrada === 'more' ? (
            GRUPOS_DE_HERRAMIENTAS.map((grupo) => (
              <View key={grupo.id} style={styles.grupo}>
                <Text style={[styles.grupoTitulo, { color: theme.colors.textSecondary }]}>{t(grupo.clave)}</Text>
                <View style={styles.rejilla}>
                  {grupo.herramientas.map((h) =>
                    tarjeta(h.clave, h.icono, grupo.id + h.id, () => onElegir({ entrada, herramienta: h, controles: {} }))
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.rejilla}>
              {(HERRAMIENTAS_POR_AREA[(puerta?.area ?? 'images') as Exclude<AreaDeStudio, 'more'>] ?? []).map((h) =>
                tarjeta(h.clave, h.icono, h.id, () => onElegir({ entrada, herramienta: h, controles: {} }))
              )}
            </View>
          )
        ) : (
          /* ── CAPA 2 · qué quieres conseguir ─────────────────────────────── */
          <View style={styles.rejilla}>
            {experiencias.map((x) => tarjeta(x.clave, x.icono, x.id, () => setElegida(x), x.pendiente))}
          </View>
        )}
      </ScrollView>

      {/*
        POR QUÉ ESA NO SE PUEDE TODAVÍA.

        Debajo y en su sitio, no en una alerta que tape lo que se estaba
        mirando. Dice qué pieza concreta falta —no «pronto»—, porque «pronto»
        no ayuda a decidir qué hacer ahora.
      */}
      {!!explicando && (
        <View style={[styles.motivo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="information-circle-outline" size={scale(17)} color={theme.colors.textSecondary} />
          <Text style={[styles.motivoTexto, { color: theme.colors.text }]}>{t(explicando)}</Text>
          <TouchableOpacity
            onPress={() => setExplicando(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('studio.dismiss')}
            style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
          >
            <Ionicons name="close" size={scale(16)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/** Quitar una ruta es des-elegirla: tocar lo puesto lo suelta. */
const quitar = (de: ControlesElegidos, ruta: string): ControlesElegidos => {
  const { [ruta]: _fuera, ...resto } = de;
  return resto;
};

const styles = StyleSheet.create({
  panel: { flex: 1 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  titulo: { fontSize: scale(26), fontWeight: FONT_WEIGHT.bold, letterSpacing: scale(-0.4), flexShrink: 1 },
  nota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  notaTexto: { fontSize: FONT_SIZE.xs, flexShrink: 1 },
  dentro: { paddingBottom: SPACING.xxxl, gap: SPACING.xl },
  grupo: { gap: SPACING.sm },
  grupoTitulo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: scale(0.5),
    paddingHorizontal: SPACING.lg + SPACING.xs,
  },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg - SPACING.xs },
  hueco: { padding: SPACING.xs },
  pieza: {
    borderRadius: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    minHeight: scale(96),
  },
  piezaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, lineHeight: scale(18) },
  sello: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.full,
  },
  selloTexto: { fontSize: scale(10), fontWeight: FONT_WEIGHT.semibold, textTransform: 'uppercase', letterSpacing: scale(0.4) },
  motivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  motivoTexto: { fontSize: FONT_SIZE.sm, flex: 1, lineHeight: scale(19) },
  sinControles: { fontSize: FONT_SIZE.sm, paddingHorizontal: SPACING.xl, lineHeight: scale(20) },
  seguir: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.md + scale(2),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
  },
  seguirTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: '#1F2937' },
});

export default StudioPanel;
