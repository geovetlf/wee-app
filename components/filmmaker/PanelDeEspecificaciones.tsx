import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { IdeaDelTaller, duracionDe, duracionesDelTipo, etiquetaAccesible, poner } from '../../utils/ideaDeFilmmaker';
import { elegirModelo, modeloDeLaIdea, opcionesDe } from '../../utils/especificacionesDeFilmmaker';
import { useCapacidadesDeVideo } from '../../hooks/useCapacidadesDeVideo';
import { RejillaDeModelos } from './PanelDeEspecificacionesModelos';

type Props = { idea: IdeaDelTaller; onIdea: (i: IdeaDelTaller) => void };

const claveDeSonido = (a: 'si' | 'no' | 'desconocido') => (a === 'si' ? 'filmmakerSpecs.soundYes' : a === 'no' ? 'filmmakerSpecs.soundNo' : 'filmmakerSpecs.soundUnknown');

/**
 * EL CUERPO DE LAS ESPECIFICACIONES (vive dentro de la hoja «Proyecto»): modelo (abre la rejilla de píldoras), formato, resolución, duración y sonido.
 * Las opciones salen del modelo elegido (`utils/especificacionesDeFilmmaker.ts`); lo que el modelo no admite no se ofrece. «Más ajustes» (variantes y semilla)
 * va plegado y cerrado con su motivo hasta que el servidor los acepte. Sin coste inventado: «precio por confirmar».
 */
export const CuerpoDeEspecificaciones: React.FC<Props & { onModelos: () => void }> = ({ idea, onIdea, onModelos }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const [mas, setMas] = useState(false);
  const modelo = modeloDeLaIdea(idea);
  const o = opcionesDe(modelo);
  const total = duracionDe(idea);
  const entradas = useCapacidadesDeVideo().entradasDe(modelo?.idServidor);
  const chip = (clave: string, etiqueta: string, sel: boolean, onPress: () => void) => (
    <TouchableOpacity key={clave} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiqueta} accessibilityState={{ selected: sel }} style={[styles.chip, sel && styles.chipSel]}>
      <Text style={[textoPortada(14, sel ? '600' : '500'), { color: P.tinta }]}>{etiqueta}</Text>
    </TouchableOpacity>
  );
  const etiqueta = (clave: string) => <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t(clave)}</Text>;
  return (
    <View style={styles.cuerpo}>
      {etiqueta('filmmakerSpecs.model')}
      <TouchableOpacity onPress={onModelos} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSpecs.model'), modelo ? modelo.nombre : t('filmmakerSpecs.auto'))} style={[styles.selector, dir.contenedor]}>
        <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta, flex: 1 }]} numberOfLines={1}>{modelo ? modelo.nombre : t('filmmakerSpecs.auto')}</Text>
        <Ionicons name="chevron-down" size={16} color={P.tintaSecundaria} />
      </TouchableOpacity>

      {etiqueta('filmmaker.projFormat')}
      <View style={[styles.fila, dir.contenedor]}>
        {chip('fauto', t('filmmakerSpecs.auto'), !idea.valores.format, () => onIdea(poner(idea, 'format', '')))}
        {o.formatos.map((f) => chip(`f${f}`, `⁦${f}⁩`, idea.valores.format === f, () => onIdea(poner(idea, 'format', f))))}
      </View>

      {etiqueta('filmmaker.projResolution')}
      <View style={[styles.fila, dir.contenedor]}>
        {chip('rauto', t('filmmakerSpecs.auto'), !idea.valores.resolution, () => onIdea(poner(idea, 'resolution', '')))}
        {o.resoluciones.map((r) => chip(`r${r}`, r, idea.valores.resolution === r, () => onIdea(poner(idea, 'resolution', r))))}
      </View>

      {etiqueta('filmmaker.projDuration')}
      <View style={[styles.fila, dir.contenedor]}>
        {duracionesDelTipo(idea.tipo).map((s) => chip(`d${s}`, t('filmmaker.hubSeconds', { n: formato.numero(s) }), s === total, () => onIdea(poner(idea, 'duration', String(s)))))}
      </View>
      {o.porCuadro ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.perShot', { min: formato.numero(o.porCuadro.min), max: formato.numero(o.porCuadro.max) })}</Text> : null}

      {etiqueta('filmmakerSpecs.sound')}
      <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]}>{t(claveDeSonido(o.audio))}</Text>
      <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.soundHint')}</Text>

      <TouchableOpacity onPress={() => setMas((v) => !v)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.projAdvanced')} accessibilityState={{ expanded: mas }} style={[styles.mas, dir.contenedor]}>
        <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]}>{t('filmmaker.projAdvanced')} · {t('filmmakerSpecs.seedFold')}</Text>
        <Ionicons name={mas ? 'chevron-up' : 'chevron-down'} size={16} color={P.tintaSecundaria} />
      </TouchableOpacity>
      {mas ? (
        <View style={styles.cuerpo}>
          <View style={[styles.fila, dir.contenedor]}>
            {[t('filmmakerSpecs.variants'), t('filmmakerSpecs.seed')].map((n) => (
              <View key={n} style={[styles.chip, styles.cerrado]} accessible accessibilityLabel={etiquetaAccesible(n, t('filmmakerSpecs.soon'))} accessibilityState={{ disabled: true }}>
                <Text style={[textoPortada(14, '500'), { color: P.tintaSecundaria }]}>{n}</Text>
              </View>
            ))}
          </View>
          <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} accessibilityLiveRegion="polite">{t('filmmakerSpecs.moreClosed')}</Text>
          {modelo ? (
            <>
              <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.inputsTitle')}</Text>
              <View style={[styles.fila, dir.contenedor]}>
                {([['referencias', 'filmmakerSpecs.inRefs'], ['fotogramas', 'filmmakerSpecs.inFrames'], ['extender', 'filmmakerSpecs.inExtend'], ['editar', 'filmmakerSpecs.inEdit']] as const).map(([k, clave]) => {
                  const si = entradas[k];
                  return (
                    <View key={k} style={[styles.chip, !si && styles.cerrado]} accessible accessibilityLabel={etiquetaAccesible(t(clave), t(si ? 'filmmakerSpecs.available' : 'filmmakerSpecs.soon'))} accessibilityState={{ disabled: !si }}>
                      <Text style={[textoPortada(14, '500'), { color: si ? P.tinta : P.tintaSecundaria }]}>{t(clave)}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      ) : null}
      <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.costTbc')}</Text>
    </View>
  );
};

/** El contenido de la hoja: el cuerpo, o la rejilla de modelos en su lugar (un solo Modal, sin hojas encimadas). */
export const ContenidoDeEspecificaciones: React.FC<Props> = ({ idea, onIdea }) => {
  const [modelos, setModelos] = useState(false);
  if (modelos) return <RejillaDeModelos valor={idea.valores.model ?? ''} onElegir={(id) => { onIdea(elegirModelo(idea, id)); setModelos(false); }} onVolver={() => setModelos(false)} />;
  return <CuerpoDeEspecificaciones idea={idea} onIdea={onIdea} onModelos={() => setModelos(true)} />;
};

/**
 * EL RESUMEN EN LA PANTALLA (el «estudio de comando» de la Idea): una píldora de modelo y, debajo, cuatro datos en rejilla (formato, resolución, duración, sonido).
 * Todo se toca para abrir la hoja. Compacto (teclado abierto o pantalla corta): solo una línea.
 */
export const ResumenDeEspecificaciones: React.FC<{ idea: IdeaDelTaller; compacto: boolean; onAbrir: () => void }> = ({ idea, compacto, onAbrir }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const modelo = modeloDeLaIdea(idea);
  const o = opcionesDe(modelo);
  const auto = t('filmmakerSpecs.auto');
  const nombre = modelo ? modelo.nombre : auto;
  const f = idea.valores.format ? `⁦${idea.valores.format}⁩` : auto;
  const r = idea.valores.resolution || auto;
  const d = t('filmmaker.hubSeconds', { n: formato.numero(duracionDe(idea)) });
  const s = t(claveDeSonido(o.audio));
  const q = modelo?.perfil ? t(modelo.perfil === 'rapido' ? 'filmmakerSpecs.qualityFast' : modelo.perfil === 'calidad' ? 'filmmakerSpecs.qualityBest' : 'filmmakerSpecs.qualityBalanced') : auto;
  const etiquetaCompleta = etiquetaAccesible(t('filmmakerSpecs.summaryLabel'), nombre, f, r, d, q, s, t('filmmakerSpecs.openLabel'));
  if (compacto) {
    return (
      <TouchableOpacity onPress={onAbrir} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaCompleta} style={[styles.linea, dir.contenedor]}>
        <Text style={[textoPortada(13, '600'), dir.texto, { color: P.tinta, flexShrink: 1 }]} numberOfLines={1}>{nombre} · {f} · {r} · {d}</Text>
        <Ionicons name="options-outline" size={16} color={P.tintaSecundaria} />
      </TouchableOpacity>
    );
  }
  const dato = (clave: string, valor: string, cerrado = false) => (
    <View key={clave} style={[styles.dato, cerrado && styles.cerrado]}>
      <Text style={[textoPortada(11, '500'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{t(clave)}</Text>
      <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{valor}</Text>
    </View>
  );
  return (
    <TouchableOpacity onPress={onAbrir} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaCompleta} style={styles.tarjeta}>
      <View style={[styles.cabeza, dir.contenedor]}>
        <View style={{ flex: 1 }}>
          <Text style={[textoPortada(11, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.model')}</Text>
          <Text style={[textoPortada(17, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{nombre}</Text>
        </View>
        <Ionicons name="options-outline" size={20} color={P.tintaSecundaria} />
      </View>
      <View style={[styles.rejilla, dir.contenedor]}>
        {dato('filmmaker.projFormat', f)}
        {dato('filmmaker.projResolution', r)}
        {dato('filmmaker.projDuration', d)}
        {dato('filmmakerSpecs.quality', q)}
        {dato('filmmakerSpecs.sound', s)}
        {dato('filmmakerSpecs.variants', t('filmmakerSpecs.soon'), true)}
      </View>
      <View style={[styles.pie, dir.contenedor]}>
        <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]} numberOfLines={1}>{t('filmmakerSpecs.seedFold')} · {t('filmmakerSpecs.soon')}</Text>
        <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria, flexShrink: 1 }]} numberOfLines={1}>{t('filmmakerSpecs.costTbc')}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cuerpo: { gap: 10 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center' },
  chipSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  cerrado: { opacity: 0.7 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo },
  mas: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  linea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16 },
  tarjeta: { alignSelf: 'stretch', marginHorizontal: 20, padding: 16, gap: 14, borderRadius: 24, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  dato: { width: '33.33%', minHeight: 44, gap: 2, paddingRight: 8 },
});
