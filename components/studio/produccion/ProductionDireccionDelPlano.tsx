import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import { EspacioDeFilmmaker, elegidoDe } from './espacio';
import { ENFOQUES, LIMITES } from '../../../services/filmmaker/dominio';
import type { FilmmakerOperation, SubjectFocus } from '../../../services/filmmaker/dominio';
import { CLAVE_DEL_ENFOQUE, ESTILOS_CANONICOS, esElEstilo, nombreDelEstilo } from '../../../constants/filmmaker';
import {
  accionesDeEscenaCuentan, cabeOtraAccion, conAccion, conAccionCambiada, conAccionMovida, heredadoDelNivel, propioDelNivel, propiosDentro,
  quienDelSujeto, sujetoConDescripcion, sujetoConEnfoque, sujetoConQuien,
} from '../../../utils/produccionEditable';
import type { AspectoVisual } from '../../../utils/produccionEditable';
import { confirmAction } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';

const isWeb = Platform.OS === 'web';

/**
 * LO QUE SE DIRIGE EN EL PLANO Y AÚN NO TENÍA SITIO (Fase 31 del motor: cada capacidad, en su sitio).
 *
 * Cuatro cosas que F1-A ya sabía hacer, que llegan a la toma, y que no se podían tocar desde Weë Studio:
 *   · QUÉ PASA: las acciones del plano, en orden (`actions`, con `update_shot`); van a la toma justo después de «Qué
 *     se ve». En una escena solo cuentan si no tiene planos: con planos, cada plano dice lo suyo y no se enseña un
 *     control que escribe lo que nadie lee.
 *   · EL SUJETO: quién o qué manda en el encuadre, cómo de cerca y en palabras (`change_subject`).
 *   · EL ESTILO Y EL ÁNIMO DE ESTE NIVEL (`change_style` y `change_mood` con el plano o la escena como ámbito), con lo
 *     heredado dicho; y, como en la escena F1-A quita el de sus planos, se pregunta antes si hay algo que perder.
 *   · MOVERLO A OTRA ESCENA (`move_shot`): se pone al final de la otra.
 * Todo son gestos del controlador de siempre: operaciones de F1-A, sin estado propio y sin llamar a nadie.
 */

/** Una fila de pastillas de las que se elige una; tocar la elegida la quita. */
const Una: React.FC<{ opciones: readonly { valor: string; texto: string }[]; elegida?: string | null; editable: boolean; onElegir: (v: string | null) => void }> = ({ opciones, elegida, editable, onElegir }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.opciones}>
      {opciones.map((o) => {
        const esta = o.valor === elegida;
        return (
          <TouchableOpacity
            key={o.valor}
            onPress={() => onElegir(esta ? null : o.valor)}
            disabled={!editable}
            accessibilityRole="button"
            accessibilityLabel={o.texto}
            accessibilityState={{ selected: esta, disabled: !editable }}
            style={[styles.opcion, { backgroundColor: esta ? theme.colors.accent : theme.colors.surface, borderColor: esta ? theme.colors.accent : theme.colors.border },
              !editable && { opacity: OPACITY.disabled }, isWeb && ({ cursor: editable ? 'pointer' : 'default' } as object)]}
          >
            <Text style={[styles.opcionTexto, { color: esta ? '#1F2937' : theme.colors.text }]} numberOfLines={1}>{o.texto}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/* ── Qué pasa ───────────────────────────────────────────────────────────────────────────────────────────────────── */

export const ProductionQuePasa: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { produccion, seleccion, editable, onGesto } = espacio;
  const [vuelta, setVuelta] = useState(0);
  const elegido = elegidoDe(produccion, seleccion);
  if (!elegido) return null;
  const { escena, plano } = elegido;
  if (!plano && !accionesDeEscenaCuentan(escena)) return null;
  const acciones = (plano ? plano.actions : escena.actions) ?? [];
  const poner = (nuevas: readonly string[] | null) => onGesto([(plano
    ? { op: 'update_shot', shotId: plano.id, changes: { actions: nuevas } }
    : { op: 'update_scene', sceneId: escena.id, changes: { actions: nuevas } }) as FilmmakerOperation]);
  return (
    <Seccion titulo={t('filmmaker.wsActions')}>
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsActionsNote')}</Text>
      {acciones.map((a, i) => (
        <View key={`${i}-${a}`} style={styles.accion}>
          <CampoQueCrece
            etiqueta={t('filmmaker.wsActionN', { numero: i + 1 })}
            valor={a}
            maximo={LIMITES.frase}
            etiquetaGuardar={t('common.save')}
            editable={editable}
            onGuardar={(texto) => poner(conAccionCambiada(acciones, i, texto))}
          />
          <View style={styles.botones}>
            <BotonPequeno icono="arrow-up" etiqueta={t('filmmaker.wsActionUp', { numero: i + 1 })} onPress={() => poner(conAccionMovida(acciones, i, -1))} disabled={!editable || i === 0} />
            <BotonPequeno icono="arrow-down" etiqueta={t('filmmaker.wsActionDown', { numero: i + 1 })} onPress={() => poner(conAccionMovida(acciones, i, 1))} disabled={!editable || i === acciones.length - 1} />
            <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.wsActionRemove', { numero: i + 1 })} onPress={() => poner(conAccionCambiada(acciones, i, ''))} disabled={!editable} />
          </View>
        </View>
      ))}
      {editable && cabeOtraAccion(acciones) && (
        <CampoQueCrece
          key={`nueva-${vuelta}`}
          etiqueta={t('filmmaker.wsActionAdd')}
          valor=""
          placeholder={t('filmmaker.wsActionHint')}
          maximo={LIMITES.frase}
          etiquetaGuardar={t('filmmaker.wsActionAdd')}
          onGuardar={(texto) => {
            if (texto.trim()) poner(conAccion(acciones, texto));
            setVuelta((v) => v + 1);
          }}
        />
      )}
      {!cabeOtraAccion(acciones) && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsActionsFull', { maximo: formato.numero(LIMITES.accionesPorBloque) })}</Text>}
    </Seccion>
  );
};

/* ── El sujeto del plano ────────────────────────────────────────────────────────────────────────────────────────── */

export const ProductionSujeto: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, seleccion, editable, onGesto } = espacio;
  const elegido = elegidoDe(produccion, seleccion);
  const plano = elegido?.plano;
  if (!plano) return null;
  const s = plano.subject;
  const quien = quienDelSujeto(s);
  const poner = (nuevo: typeof s | null) => onGesto([{ op: 'change_subject', target: { shotId: plano.id }, subject: nuevo ?? null }]);
  const candidatos = [
    ...produccion.characters.map((c) => ({ valor: `personaje:${c.id}`, texto: c.name })),
    ...produccion.objects.map((o) => ({ valor: `objeto:${o.id}`, texto: o.name })),
  ];
  return (
    <Seccion titulo={t('filmmaker.wsSubject')}>
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsSubjectNote')}</Text>
      <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsSubjectWho')}</Text>
      {candidatos.length === 0
        ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsSubjectNobody')}</Text>
        : (
          <Una
            opciones={candidatos}
            elegida={quien ? `${quien.tipo}:${quien.id}` : null}
            editable={editable}
            onElegir={(v) => {
              if (v === null) { poner(sujetoConQuien(s, null)); return; }
              const [tipo, ...resto] = v.split(':');
              poner(sujetoConQuien(s, { tipo: tipo === 'objeto' ? 'objeto' : 'personaje', id: resto.join(':') }));
            }}
          />
        )}
      <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsSubjectFocus')}</Text>
      <Una
        opciones={ENFOQUES.map((f) => ({ valor: f, texto: t(CLAVE_DEL_ENFOQUE[f]) }))}
        elegida={s?.focus ?? null}
        editable={editable}
        onElegir={(v) => poner(sujetoConEnfoque(s, v as SubjectFocus | null))}
      />
      <CampoQueCrece
        etiqueta={t('filmmaker.wsSubjectDescription')}
        valor={s?.description ?? ''}
        placeholder={t('filmmaker.wsSubjectDescriptionHint')}
        maximo={LIMITES.frase}
        etiquetaGuardar={t('common.save')}
        editable={editable}
        onGuardar={(texto) => poner(sujetoConDescripcion(s, texto))}
      />
    </Seccion>
  );
};

/* ── El estilo y el ánimo de este nivel ─────────────────────────────────────────────────────────────────────────── */

export const ProductionAspectoDelNivel: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, seleccion, editable, onGesto } = espacio;
  const elegido = elegidoDe(produccion, seleccion);
  if (!elegido) return null;
  const { escena, plano } = elegido;
  const ambito = plano ? { scope: 'shot' as const, shotId: plano.id } : { scope: 'scene' as const, sceneId: escena.id };
  const estilo = propioDelNivel('style', escena, plano);
  const estiloDeFuera = heredadoDelNivel(produccion, 'style', escena, plano);
  const animo = propioDelNivel('mood', escena, plano);
  const animoDeFuera = heredadoDelNivel(produccion, 'mood', escena, plano);
  const token = ESTILOS_CANONICOS.find((e) => esElEstilo(estilo, e.token, t))?.token ?? null;
  /* En una escena, F1-A quita el de sus planos: si alguno tiene el suyo, se pregunta antes. */
  const sinPisar = async (aspecto: AspectoVisual, aplicar: () => void) => {
    const n = plano ? 0 : propiosDentro(produccion, aspecto, escena);
    if (n > 0 && !(await confirmAction(
      t(aspecto === 'style' ? 'filmmaker.wsOverrideStyleConfirm' : 'filmmaker.wsOverrideMoodConfirm', { contador: n }),
      t('filmmaker.wsOverrideSceneDetail'),
      t('filmmaker.wsOverrideApply'),
      false,
      t,
    ))) return;
    aplicar();
  };
  const ponerEstilo = (v: string | null) => { void sinPisar('style', () => onGesto([{ op: 'change_style', target: ambito, style: v }])); };
  return (
    <Seccion titulo={t(plano ? 'filmmaker.wsLookOfShot' : 'filmmaker.wsLookOfScene')}>
      <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsStyle')}</Text>
      <Una
        opciones={ESTILOS_CANONICOS.map((e) => ({ valor: e.token, texto: t(e.clave) }))}
        elegida={token}
        editable={editable}
        onElegir={ponerEstilo}
      />
      {/* Un estilo escrito por alguien que no es de la lista (Weë Brain) se enseña tal cual y se puede quitar. */}
      {!!estilo && !token && (
        <View style={styles.propio}>
          <Text style={[styles.valor, { color: theme.colors.text }]}>{t('filmmaker.wsStyleIs', { estilo })}</Text>
          <BotonPequeno icono="close" etiqueta={t('filmmaker.wsLookClearStyle')} onPress={() => ponerEstilo(null)} disabled={!editable} />
        </View>
      )}
      {!estilo && !!estiloDeFuera && (
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsLookInherits', { valor: nombreDelEstilo(estiloDeFuera, t) })}</Text>
      )}
      <CampoQueCrece
        etiqueta={t('filmmaker.wsDirectionMood')}
        valor={animo ?? ''}
        placeholder={animoDeFuera ? t('filmmaker.wsLookInherits', { valor: animoDeFuera }) : undefined}
        maximo={LIMITES.frase}
        etiquetaGuardar={t('common.save')}
        editable={editable}
        onGuardar={(texto) => { void sinPisar('mood', () => onGesto([{ op: 'change_mood', target: ambito, mood: texto || null }])); }}
      />
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(plano ? 'filmmaker.wsLookShotNote' : 'filmmaker.wsLookSceneNote')}</Text>
    </Seccion>
  );
};

/* ── Mover el plano a otra escena ───────────────────────────────────────────────────────────────────────────────── */

export const ProductionMoverPlano: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, seleccion, editable, onGesto } = espacio;
  const [abierto, setAbierto] = useState(false);
  const elegido = elegidoDe(produccion, seleccion);
  const plano = elegido?.plano;
  if (!elegido || !plano || produccion.scenes.length < 2) return null;
  const otras = produccion.scenes.map((s, i) => ({ s, i })).filter(({ s }) => s.id !== elegido.escena.id);
  return (
    <View style={styles.mover}>
      <BotonPequeno
        icono={abierto ? 'close' : 'return-down-forward-outline'}
        etiqueta={t(abierto ? 'filmmaker.wsMoveShotCancel' : 'filmmaker.wsMoveShot')}
        onPress={() => setAbierto((a) => !a)}
        disabled={!editable}
        conTexto
      />
      {abierto && (
        <>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsMoveShotNote')}</Text>
          <Una
            opciones={otras.map(({ s, i }) => ({
              valor: s.id,
              texto: s.title ? t('filmmaker.wsSceneCrumbTitled', { numero: i + 1, titulo: s.title }) : t('filmmaker.wsSceneCrumb', { numero: i + 1 }),
            }))}
            editable={editable}
            onElegir={(v) => {
              if (v && onGesto([{ op: 'move_shot', shotId: plano.id, toSceneId: v }]).ok) setAbierto(false);
            }}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
  valor: { flex: 1, fontSize: FONT_SIZE.sm },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center', maxWidth: '100%' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  accion: { gap: SPACING.xs },
  botones: { flexDirection: 'row', gap: SPACING.xs },
  propio: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  mover: { gap: SPACING.xs, alignItems: 'flex-start' },
});
