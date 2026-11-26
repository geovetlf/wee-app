import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import type { useImagenesDeFilmmaker } from '../../hooks/useImagenesDeFilmmaker';
import type { PeticionDeImagenes } from '../../services/filmmakerImagenesService';

export type ImagenesDeFilmmaker = ReturnType<typeof useImagenesDeFilmmaker>;

interface Props {
  imagenes: ImagenesDeFilmmaker;
  /** Lo que se pediría ahora, o por qué todavía no se puede pedir. */
  peticion: { ok: true; peticion: PeticionDeImagenes } | { ok: false; falta: 'estilo' | 'referencia' | 'nada' };
}

const Boton: React.FC<{ texto: string; onPress: () => void; apagado?: boolean; testID?: string }> = ({ texto, onPress, apagado, testID }) => (
  <TouchableOpacity testID={testID} onPress={onPress} disabled={apagado} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={texto} accessibilityState={{ disabled: !!apagado }} style={[styles.boton, apagado && { opacity: 0.5 }]}>
    <Text style={[textoPortada(14, '600'), { color: P.tinta, textAlign: 'center' }]} numberOfLines={2}>{texto}</Text>
  </TouchableOpacity>
);

/**
 * LAS IMÁGENES DEL UNIVERSO, JUNTO AL OBJETO QUE LAS USA. Una sola fila que cambia con el momento: crear → «≈ N Credits» + confirmar → «Creando 3 de 8…» +
 * cancelar → listo / reintentar lo que no salió. Con la capacidad cerrada (`IMAGENES_DE_FILMMAKER_ABIERTAS`) este componente no se monta: la pantalla
 * deja su línea de «Pronto». Nada técnico (ni modelos ni proveedores); el precio que se enseña es el que se cobra.
 */
export const ImagenesDelUniverso: React.FC<Props> = ({ imagenes: im, peticion }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const falta = peticion.ok ? null : peticion.falta;
  const hayFallos = im.items.some((i) => i.estado === 'error' || i.estado === 'cancelada');
  const cuesta = im.cotizacion;

  if (im.estado === 'generando') {
    return (
      <View style={styles.bloque} testID="universo-imagenes" accessibilityLiveRegion="polite">
        <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta }]}>{t('filmmakerImagenes.progress', { hechas: formato.numero(im.progreso.hechas), total: formato.numero(Math.max(im.progreso.total, im.progreso.hechas)) })}</Text>
        <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerImagenes.progressNote')}</Text>
        <Boton texto={t('filmmakerImagenes.cancel')} onPress={() => { void im.cancelar(); }} testID="universo-imagenes-cancelar" />
      </View>
    );
  }

  if (im.estado === 'cotizado' && cuesta) {
    return (
      <View style={styles.bloque} testID="universo-imagenes" accessibilityLiveRegion="polite">
        <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta }]}>{cuesta.credits > 0 ? t('filmmakerImagenes.quote', { credits: formato.numero(cuesta.credits) }) : t('filmmakerImagenes.quoteFree')}</Text>
        {cuesta.usanLasDeLaPersona > 0 ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerImagenes.yoursCount', { contador: cuesta.usanLasDeLaPersona })}</Text> : null}
        {im.errorClave ? <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tinta }]}>{t(im.errorClave)}</Text> : null}
        <View style={[styles.fila, dir.contenedor]}>
          <Boton texto={t('filmmakerProd.confirmCreate')} onPress={() => { void im.confirmar(); }} testID="universo-imagenes-confirmar" />
          <Boton texto={t('filmmakerImagenes.cancel')} onPress={im.quitar} />
        </View>
      </View>
    );
  }

  const motivo = im.estado === 'error' && im.errorClave ? t(im.errorClave) : falta === 'referencia' ? t('filmmakerImagenes.errNoReference') : falta === 'estilo' ? t('filmmakerImagenes.errNoStyle') : falta === 'nada' ? t('filmmakerImagenes.errNoItems') : null;
  const texto = im.estado === 'listo'
    ? (hayFallos ? t('filmmakerImagenes.donePartial', { hechas: formato.numero(im.progreso.hechas), total: formato.numero(im.progreso.total) }) : t('filmmakerImagenes.done'))
    : null;
  return (
    <View style={styles.bloque} testID="universo-imagenes">
      {texto ? <Text style={[textoPortada(13, '600'), dir.texto, { color: P.tinta }]} accessibilityLiveRegion="polite">{texto}</Text> : null}
      {motivo ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} accessibilityLiveRegion="polite">{motivo}</Text> : null}
      {im.estado === 'listo' ? (
        hayFallos ? <Boton texto={t('filmmakerImagenes.retry')} onPress={() => { void im.reintentarFallidos(); }} testID="universo-imagenes-reintentar" /> : null
      ) : (
        <Boton texto={im.estado === 'error' ? t('filmmakerImagenes.retry') : t('filmmakerImagenes.createUniverse')} apagado={!peticion.ok || im.estado === 'cotizando'} onPress={() => { if (peticion.ok) void im.cotizar(peticion.peticion); }} testID="universo-imagenes-crear" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: 8, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  boton: { flexGrow: 1, flexBasis: 140, minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: P.bordeLuz, alignItems: 'center', justifyContent: 'center' },
});
