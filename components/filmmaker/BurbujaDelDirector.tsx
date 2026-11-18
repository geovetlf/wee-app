import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import type { BurbujaDelDirector as Burbuja, EstadoDelDirector } from '../../hooks/useDirectorDeFilmmaker';
import type { PropuestaDelDirector } from '../../services/filmmakerDirectorService';

interface Props {
  burbuja: Burbuja | null;
  propuesta: PropuestaDelDirector | null;
  aviso: string | null;
  estado: EstadoDelDirector;
  aplicada: boolean;
  onAprobar: () => void;
  onDescartar: () => void;
  /** Pantalla corta: la burbuja se pliega a una línea (un toque la abre) para que no tape lo que se está viendo. */
  compacta?: boolean;
  /** Antes de crear la producción: la acción discreta de la propia burbuja («Crear la producción»). */
  onCrear?: () => void;
  /** La propuesta quedó obsoleta (la producción cambió): «Rehacer» pide lo mismo sobre lo de ahora. */
  obsoleta?: boolean;
  onRehacer?: () => void;
}

/** Cuántos porqués se enseñan antes de resumir el resto: la propuesta es corta de ver y se aprueba de un toque. */
const VISIBLES = 3;

/**
 * LA RESPUESTA DE WEË BRAIN SOBRE LA CAJA (no es otro chat: la caja es la común y esto es solo lo que Weë contesta). Una burbuja breve —una
 * pregunta a la vez— y, si propone cambios, su lista corta con Aprobar y Descartar. Nada se aplica sin Aprobar. Si no hay nada que decir, no ocupa sitio.
 */
export const BurbujaDelDirector: React.FC<Props> = ({ burbuja, propuesta, aviso, estado, aplicada, onAprobar, onDescartar, compacta, onCrear, obsoleta, onRehacer }) => {
  const t = useT();
  const dir = useDireccion();
  /* En pantalla corta nace plegada; cada respuesta nueva vuelve a nacer plegada. */
  const [abierta, setAbierta] = useState(false);
  useEffect(() => { setAbierta(false); }, [burbuja?.texto]);
  if (estado === 'pensando') {
    return (
      <View style={[styles.burbuja, dir.contenedor]} accessibilityLiveRegion="polite" accessibilityLabel={t('filmmakerDirector.thinking')}>
        <ActivityIndicator size="small" color={P.tintaSecundaria} />
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]}>{t('filmmakerDirector.thinking')}</Text>
      </View>
    );
  }
  if (!burbuja && !propuesta && !aviso && !aplicada) return null;
  const aplicando = estado === 'aplicando';
  const plegada = !!compacta && !abierta;
  const razones = propuesta ? propuesta.reasons.map((r, i) => r ?? (i === 0 ? t('filmmakerDirector.reasonFallback') : null)).filter((x): x is string => !!x) : [];
  return (
    <View style={styles.caja} accessibilityLiveRegion="polite">
      {burbuja ? (
        <View style={[styles.burbuja, dir.contenedor]}>
          <TouchableOpacity
            style={styles.textos}
            disabled={!compacta}
            onPress={() => setAbierta((a) => !a)}
            accessibilityRole={compacta ? 'button' : 'text'}
            accessibilityLabel={`${t('filmmakerDirector.messageLabel')}. ${burbuja.texto}`}
            accessibilityHint={compacta ? t(plegada ? 'filmmakerDirector.expand' : 'filmmakerDirector.collapse') : undefined}
            accessibilityState={compacta ? { expanded: !plegada } : undefined}
            activeOpacity={0.8}
          >
            {burbuja.demo ? <Text style={[textoPortada(11, '600'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerDirector.demoBadge')}</Text> : null}
            <Text style={[textoPortada(14, '400'), dir.texto, { color: P.tinta }]} numberOfLines={plegada ? 1 : 5}>{burbuja.texto}</Text>
          </TouchableOpacity>
          {!propuesta ? (
            <TouchableOpacity onPress={onDescartar} accessibilityRole="button" accessibilityLabel={t('filmmakerDirector.dismiss')} style={styles.cerrar} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close" size={18} color={P.tintaSecundaria} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {onCrear && burbuja && !propuesta && !plegada ? (
        <TouchableOpacity onPress={onCrear} accessibilityRole="button" accessibilityLabel={t('filmmakerDirector.createNow')} style={[styles.crear, dir.contenedor]} activeOpacity={0.8}>
          <Text style={[textoPortada(14, '600'), { color: P.fondo }]}>{t('filmmakerDirector.createNow')}</Text>
        </TouchableOpacity>
      ) : null}
      {propuesta ? (
        <View style={styles.propuesta}>
          <Text style={[textoPortada(12, '600'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerDirector.proposalTitle')} · {t('filmmakerDirector.changesCount', { contador: propuesta.operations.length })}</Text>
          {(razones.length ? razones : [t('filmmakerDirector.reasonFallback')]).slice(0, compacta ? 2 : VISIBLES).map((r, i) => (
            <Text key={i} style={[textoPortada(13, '400'), dir.texto, { color: P.tinta }]} numberOfLines={2}>• {r}</Text>
          ))}
          {propuesta.touchesUserOrigin.length > 0 ? <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tinta }]} accessibilityRole="alert">{t('filmmakerDirector.yoursWarning', { contador: propuesta.touchesUserOrigin.length })}</Text> : null}
          {obsoleta && aviso ? <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tinta }]} accessibilityRole="alert">{aviso}</Text> : null}
          <View style={[styles.botones, dir.contenedor]}>
            {obsoleta && onRehacer ? (
              <TouchableOpacity onPress={onRehacer} accessibilityRole="button" accessibilityLabel={t('filmmakerDirector.redo')} style={styles.principal} activeOpacity={0.8}>
                <Text style={[textoPortada(14, '600'), { color: P.fondo }]}>{t('filmmakerDirector.redo')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onAprobar} disabled={aplicando} accessibilityRole="button" accessibilityLabel={t('filmmakerDirector.approve')} accessibilityState={{ disabled: aplicando }} style={[styles.principal, aplicando && { opacity: 0.6 }]} activeOpacity={0.8}>
                <Text style={[textoPortada(14, '600'), { color: P.fondo }]}>{aplicando ? t('filmmakerDirector.applying') : t('filmmakerDirector.approve')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onDescartar} disabled={aplicando} accessibilityRole="button" accessibilityLabel={t('filmmakerDirector.discard')} style={styles.secundario} activeOpacity={0.8}>
              <Text style={[textoPortada(14, '600'), { color: P.tinta }]}>{t('filmmakerDirector.discard')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {aplicada && !propuesta ? <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerDirector.applied')}</Text> : null}
      {aviso && !(obsoleta && propuesta) ? <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tinta }]} accessibilityRole="alert">{aviso}</Text> : null}
      {!propuesta && !burbuja && aviso ? (
        <TouchableOpacity onPress={onDescartar} accessibilityRole="button" accessibilityLabel={t('filmmakerDirector.dismiss')} style={styles.cerrarAviso} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[textoPortada(12, '500'), { color: P.tintaSecundaria }]}>{t('filmmakerDirector.dismiss')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  caja: { gap: 8, marginBottom: 8 },
  burbuja: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  propuesta: { gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie },
  botones: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  principal: { minHeight: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: P.tinta, alignItems: 'center', justifyContent: 'center' },
  secundario: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, alignItems: 'center', justifyContent: 'center' },
  crear: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: P.tinta, alignItems: 'center', justifyContent: 'center' },
  cerrar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  cerrarAviso: { alignSelf: 'flex-end', minHeight: 28, justifyContent: 'center' },
});
