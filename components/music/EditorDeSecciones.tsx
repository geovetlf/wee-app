import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import CajaDePrompt from '../creator/CajaDePrompt';
import { Boton, ChipDeEstado, Nota, Tarjeta, TituloDeBloque } from './piezas';
import { CancionDeMusic, alcanceDeEdicion, duracionDeSeccion, tiempoMmSs } from '../../utils/musicModel';
import { capacidadUsable } from '../../constants/musicCapabilities';
import { SPACING, FONT_SIZE } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  cancion: CancionDeMusic;
  seleccionada?: string;
  onSeleccionar: (id: string) => void;
}

interface Preparada { id: string; seccion: string; texto: string }

/**
 * EDITOR DE SECCIONES.
 *
 * Lista con inicio, fin y duración SOLO cuando se conocen. Seleccionar una sección la resalta en la línea de tiempo.
 * «Preparar modificación» guarda la instrucción como PREPARADA en esta pantalla: no se envía a nadie (la operación
 * `music.editSection` no está conectada) y la pantalla no dice que se haya aplicado. El aviso de alcance es honesto:
 * solo se habla de «solo esta sección» si el motor lo garantiza (`garantizaResto`); si no, se dice que regenerar
 * puede cambiar también el resto. Añadir, quitar y reordenar existen como acciones PENDIENTES (sin soporte hoy).
 */
const EditorDeSecciones: React.FC<Props> = ({ cancion, seleccionada, onSeleccionar }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [texto, setTexto] = useState('');
  const [preparadas, setPreparadas] = useState<Preparada[]>([]);
  const usable = capacidadUsable('sectionEdit');
  const sel = cancion.secciones.find((x) => x.id === seleccionada);
  const alcance = alcanceDeEdicion(cancion);

  const preparar = () => {
    if (!sel || !texto.trim()) return;
    setPreparadas((p) => [...p, { id: `${sel.id}-${p.length}`, seccion: t(`music.section_${sel.tipo}`), texto: texto.trim() }]);
    setTexto('');
  };

  return (
    <View style={s.raiz}>
      <TituloDeBloque>{t('music.sectionsTitle')}</TituloDeBloque>
      {cancion.secciones.length === 0 ? (
        <Tarjeta><Nota>{t('music.sectionsEmpty')}</Nota><Boton texto={t('music.sectionsDetect')} icono="scan-outline" desactivado motivo={t('music.statePending')} /></Tarjeta>
      ) : (
        <View style={{ gap: SPACING.xs }}>
          {cancion.secciones.map((x) => {
            const activa = x.id === seleccionada;
            const dur = duracionDeSeccion(x);
            return (
              <TouchableOpacity
                key={x.id}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
                onPress={() => onSeleccionar(x.id)}
                style={[s.fila, { borderColor: activa ? theme.colors.accent : theme.colors.border, backgroundColor: activa ? theme.colors.accent + '1F' : theme.colors.card }]}
              >
                <Text style={[s.nombre, { color: theme.colors.text }]}>{t(`music.section_${x.tipo}`)}</Text>
                <Text style={[s.tiempo, { color: theme.colors.textSecondary }]}>
                  {x.inicioSec !== undefined && x.finSec !== undefined ? t('music.sectionRange', { inicio: tiempoMmSs(x.inicioSec, formato.numero), fin: tiempoMmSs(x.finSec, formato.numero) }) : t('music.sectionNoTimes')}
                  {dur !== undefined ? ` · ${tiempoMmSs(dur, formato.numero)}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={s.botones}>
        <Boton texto={t('music.sectionAdd')} icono="add-circle-outline" desactivado motivo={t('music.statePending')} />
        <Boton texto={t('music.sectionRemove')} icono="remove-circle-outline" desactivado motivo={t('music.statePending')} />
        <Boton texto={t('music.sectionReorder')} icono="swap-vertical-outline" desactivado motivo={t('music.statePending')} />
      </View>
      <Nota>{t('music.sectionsStructurePending')}</Nota>

      <Tarjeta>
        <TituloDeBloque>{sel ? t('music.sectionEditing', { seccion: t(`music.section_${sel.tipo}`) }) : t('music.sectionPick')}</TituloDeBloque>
        {sel && (
          <>
            <Nota fuerte>{t(alcance === 'localizada' ? 'music.scopeLocal' : 'music.scopeFull')}</Nota>
            <CajaDePrompt
              valor={texto}
              onCambiar={setTexto}
              onEnviar={preparar}
              etiquetaEnviar={t('music.sectionPrepare')}
              placeholder={t('music.sectionInstructionHint')}
            />
            <View style={s.botones}>
              <Boton texto={t('music.sectionRegenerate')} icono="refresh-outline" principal desactivado={!usable} motivo={t('music.statePending')} />
              <Boton texto={t('music.sectionPreview')} icono="headset-outline" desactivado motivo={t('music.noAudioNote')} />
              <ChipDeEstado estado={usable ? 'preparado' : 'pendienteIntegracion'} />
            </View>
            {cancion.versiones.length > 0 && <Nota>{t('music.sectionHistory', { cantidad: formato.numero(cancion.versiones.length) })}</Nota>}
          </>
        )}
        {preparadas.length > 0 && (
          <View style={{ gap: SPACING.xs }} accessibilityLiveRegion="polite">
            <Text style={[s.nombre, { color: theme.colors.text }]}>{t('music.preparedTitle')}</Text>
            {preparadas.map((p) => <Text key={p.id} style={[s.tiempo, { color: theme.colors.textSecondary }]}>{p.seccion}: {p.texto}</Text>)}
            <Nota>{t('music.preparedNote')}</Nota>
          </View>
        )}
      </Tarjeta>
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.md },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, borderWidth: 1, borderRadius: 12, paddingHorizontal: SPACING.md, minHeight: scale(48) },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: '600' },
  tiempo: { fontSize: FONT_SIZE.xs },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' },
});

export default EditorDeSecciones;
