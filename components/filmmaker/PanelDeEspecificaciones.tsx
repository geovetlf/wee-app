import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { IdeaDelTaller, duracionDe, duracionesDelTipo, etiquetaAccesible, poner } from '../../utils/ideaDeFilmmaker';
import { calidadDe, elegirModelo, modeloDeLaIdea, opcionesDe, semillaDe } from '../../utils/especificacionesDeFilmmaker';
import { useCapacidadesDeVideo } from '../../hooks/useCapacidadesDeVideo';
import { RejillaDeModelos } from './PanelDeEspecificacionesModelos';

/** A qué control se lleva la hoja al abrirla desde una celda de la tarjeta. */
export type FocoDeEspecificaciones = 'model' | 'format' | 'resolution' | 'duration' | 'sound';
type Props = { idea: IdeaDelTaller; onIdea: (i: IdeaDelTaller) => void };

const claveDeSonido = (a: 'si' | 'no' | 'desconocido') => (a === 'si' ? 'filmmakerSpecs.soundYes' : a === 'no' ? 'filmmakerSpecs.soundNo' : 'filmmakerSpecs.soundUnknown');
const CALIDADES: readonly { valor: string; clave: string }[] = [
  { valor: 'standard', clave: 'filmmakerSpecs.qualityFast' }, { valor: 'high', clave: 'filmmakerSpecs.qualityBalanced' }, { valor: 'max', clave: 'filmmakerSpecs.qualityBest' },
];

/**
 * EL CUERPO DE LAS ESPECIFICACIONES (vive dentro de la hoja «Ajustes del vídeo»): modelo (abre la rejilla de píldoras), formato, resolución, duración total,
 * calidad, sonido, variantes y semilla. Las opciones salen del modelo elegido (`utils/especificacionesDeFilmmaker.ts`). Todo lo que existe se VE; lo que aún
 * no hace nada sale CERRADO con su motivo (aspecto apagado, sin acción): variantes (el servidor aún no multiplica tomas), calidad con un modelo elegido (la fija el
 * modelo) y la semilla mientras el modelo no la admita. Calidad con «Auto» sí es real: se guarda en la producción y el servidor elige el modelo con ella.
 */
export const CuerpoDeEspecificaciones: React.FC<Props & { onModelos: () => void; onPosicion?: (id: string, y: number) => void }> = ({ idea, onIdea, onModelos, onPosicion }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const [mas, setMas] = useState(false);
  const modelo = modeloDeLaIdea(idea);
  const o = opcionesDe(modelo);
  const total = duracionDe(idea);
  const calidad = calidadDe(idea);
  const servidor = useCapacidadesDeVideo().opcionesDe(modelo?.idServidor);
  const chip = (clave: string, etiqueta: string, sel: boolean, onPress: () => void) => (
    <TouchableOpacity key={clave} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiqueta} accessibilityState={{ selected: sel }} style={[styles.chip, sel && styles.chipSel]}>
      <Text style={[textoPortada(14, sel ? '600' : '500'), { color: P.tinta }]}>{etiqueta}</Text>
    </TouchableOpacity>
  );
  /** Una opción cerrada: se ve, no se puede tocar, y dice por qué (nunca activa si no hace nada). */
  const cerrada = (clave: string, etiqueta: string, sel = false) => (
    <View key={clave} style={[styles.chip, styles.cerrado, sel && styles.chipSel]} accessible accessibilityLabel={etiquetaAccesible(etiqueta, t('filmmakerSpecs.soon'))} accessibilityState={{ disabled: true, selected: sel }}>
      <Text style={[textoPortada(14, '500'), { color: P.tintaSecundaria }]}>{etiqueta}</Text>
    </View>
  );
  const etiqueta = (clave: string) => <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t(clave)}</Text>;
  const nota = (clave: string) => <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t(clave)}</Text>;
  const sec = (id: string, hijos: React.ReactNode) => <View key={id} style={styles.seccion} onLayout={(e: LayoutChangeEvent) => onPosicion?.(id, e.nativeEvent.layout.y)}>{hijos}</View>;
  const perfil = modelo?.perfil === 'rapido' ? 'filmmakerSpecs.qualityFast' : modelo?.perfil === 'calidad' ? 'filmmakerSpecs.qualityBest' : 'filmmakerSpecs.qualityBalanced';
  return (
    <View style={styles.cuerpo}>
      <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmakerSpecs.sheetTitle')}</Text>
      {sec('model', <>
        {etiqueta('filmmakerSpecs.model')}
        <TouchableOpacity onPress={onModelos} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSpecs.model'), modelo ? modelo.nombre : t('filmmakerSpecs.auto'))} style={[styles.selector, dir.contenedor]}>
          <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta, flex: 1 }]} numberOfLines={1}>{modelo ? modelo.nombre : t('filmmakerSpecs.auto')}</Text>
          <Ionicons name="chevron-down" size={16} color={P.tintaSecundaria} />
        </TouchableOpacity>
      </>)}
      {sec('format', <>
        {etiqueta('filmmaker.projFormat')}
        <View style={[styles.fila, dir.contenedor]}>
          {chip('fauto', t('filmmakerSpecs.auto'), !idea.valores.format, () => onIdea(poner(idea, 'format', '')))}
          {o.formatos.map((f) => chip(`f${f}`, `⁦${f}⁩`, idea.valores.format === f, () => onIdea(poner(idea, 'format', f))))}
        </View>
      </>)}
      {sec('resolution', <>
        {etiqueta('filmmaker.projResolution')}
        <View style={[styles.fila, dir.contenedor]}>
          {chip('rauto', t('filmmakerSpecs.auto'), !idea.valores.resolution, () => onIdea(poner(idea, 'resolution', '')))}
          {o.resoluciones.map((r) => chip(`r${r}`, r, idea.valores.resolution === r, () => onIdea(poner(idea, 'resolution', r))))}
        </View>
      </>)}
      {sec('duration', <>
        {etiqueta('filmmakerSpecs.durationTotal')}
        <View style={[styles.fila, dir.contenedor]}>
          {duracionesDelTipo(idea.tipo).map((s) => chip(`d${s}`, t('filmmaker.hubSeconds', { n: formato.numero(s) }), s === total, () => onIdea(poner(idea, 'duration', String(s)))))}
        </View>
        {o.porCuadro ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.perShot', { min: formato.numero(o.porCuadro.min), max: formato.numero(o.porCuadro.max) })}</Text> : null}
      </>)}
      {sec('quality', <>
        {etiqueta('filmmakerSpecs.quality')}
        {modelo ? (
          <View style={[styles.fila, dir.contenedor]}>{cerrada('qfijo', t(perfil), true)}</View>
        ) : (
          <View style={[styles.fila, dir.contenedor]}>
            {chip('qauto', t('filmmakerSpecs.auto'), !calidad, () => onIdea(poner(idea, 'quality', '')))}
            {CALIDADES.map((c) => chip(`q${c.valor}`, t(c.clave), calidad === c.valor, () => onIdea(poner(idea, 'quality', c.valor))))}
          </View>
        )}
        {nota(modelo ? 'filmmakerSpecs.qualityFixed' : 'filmmakerSpecs.qualityHint')}
      </>)}
      {sec('sound', <>
        {etiqueta('filmmakerSpecs.sound')}
        <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]}>{t(claveDeSonido(o.audio))}</Text>
        {nota('filmmakerSpecs.soundHint')}
      </>)}
      {sec('variants', <>
        {etiqueta('filmmakerSpecs.variants')}
        <View style={[styles.fila, dir.contenedor]}>{[1, 2, 3, 4].map((n) => cerrada(`v${n}`, formato.numero(n), n === 1))}<Ionicons name="lock-closed" size={14} color={P.tintaSecundaria} /></View>
        {nota('filmmakerSpecs.variantsClosed')}
      </>)}
      {sec('seed', <>
        <TouchableOpacity onPress={() => servidor.semilla && setMas((v) => !v)} disabled={!servidor.semilla} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSpecs.seedFold'), servidor.semilla ? '' : t('filmmakerSpecs.soon'))}
          accessibilityState={{ expanded: servidor.semilla && mas, disabled: !servidor.semilla }} style={[styles.mas, dir.contenedor, !servidor.semilla && styles.cerrado]}>
          <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]}>{t('filmmakerSpecs.seedFold')}</Text>
          {servidor.semilla ? <Ionicons name={mas ? 'chevron-up' : 'chevron-down'} size={16} color={P.tintaSecundaria} /> : <Ionicons name="lock-closed" size={14} color={P.tintaSecundaria} />}
        </TouchableOpacity>
        {servidor.semilla && mas ? (
          <>
            <TextInput value={idea.valores.seed ?? ''} onChangeText={(v) => onIdea(poner(idea, 'seed', v.replace(/\D/g, '').slice(0, 10)))} keyboardType="number-pad" maxLength={10}
              placeholder={t('filmmakerSpecs.auto')} placeholderTextColor={P.tintaSecundaria} accessibilityLabel={t('filmmakerSpecs.seedFold')}
              style={[styles.semilla, dir.texto, textoPortada(15, '600'), { color: P.tinta }]} />
            {nota('filmmakerSpecs.seedHint')}
          </>
        ) : nota(modelo ? 'filmmakerSpecs.seedClosed' : 'filmmakerSpecs.seedNeedsModel')}
      </>)}
      <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.costTbc')}</Text>
    </View>
  );
};

/** El contenido de la hoja: el cuerpo, o la rejilla de modelos en su lugar (un solo Modal, sin hojas encimadas). */
export const ContenidoDeEspecificaciones: React.FC<Props & { onPosicion?: (id: string, y: number) => void }> = ({ idea, onIdea, onPosicion }) => {
  const [modelos, setModelos] = useState(false);
  if (modelos) return <RejillaDeModelos valor={idea.valores.model ?? ''} onElegir={(id) => { onIdea(elegirModelo(idea, id)); setModelos(false); }} onVolver={() => setModelos(false)} />;
  return <CuerpoDeEspecificaciones idea={idea} onIdea={onIdea} onModelos={() => setModelos(true)} onPosicion={onPosicion} />;
};

/**
 * EL RESUMEN EN LA PANTALLA (el «estudio de comando» de la Idea): modelo y, debajo, cuatro datos en rejilla (formato, resolución, duración, sonido). Cada celda
 * abre la hoja llevada a SU control (≥44 dp); «Ajustar» deja claro que se toca. Compacto (teclado abierto o pantalla corta): solo una línea.
 */
export const ResumenDeEspecificaciones: React.FC<{ idea: IdeaDelTaller; compacto: boolean; onAbrir: (foco?: FocoDeEspecificaciones) => void }> = ({ idea, compacto, onAbrir }) => {
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
  if (compacto) {
    return (
      <TouchableOpacity onPress={() => onAbrir()} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSpecs.summaryLabel'), nombre, f, r, d, s, t('filmmakerSpecs.openLabel'))} style={[styles.linea, dir.contenedor]}>
        <Text style={[textoPortada(13, '600'), dir.texto, { color: P.tinta, flexShrink: 1 }]} numberOfLines={1}>{[nombre, idea.valores.format ? f : '', idea.valores.resolution ? r : '', d].filter(Boolean).join(' · ')}</Text>
        <Ionicons name="options-outline" size={16} color={P.tintaSecundaria} />
      </TouchableOpacity>
    );
  }
  const dato = (clave: string, valor: string, foco: FocoDeEspecificaciones) => (
    <TouchableOpacity key={clave} onPress={() => onAbrir(foco)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(clave), valor, t('filmmakerSpecs.openLabel'))} style={styles.dato}>
      <Text style={[textoPortada(11, '500'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{t(clave)}</Text>
      <Text style={[textoPortada(15, '600'), dir.texto, { color: valor === auto ? P.tintaSecundaria : P.tinta }]} numberOfLines={1}>{valor}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={styles.tarjeta}>
      <TouchableOpacity onPress={() => onAbrir('model')} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSpecs.model'), nombre, t('filmmakerSpecs.openLabel'))} style={[styles.cabeza, dir.contenedor]}>
        <View style={{ flex: 1 }}>
          <Text style={[textoPortada(11, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.model')}</Text>
          <Text style={[textoPortada(17, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{nombre}</Text>
        </View>
        <View style={[styles.ajustar, dir.contenedor]}>
          <Text style={[textoPortada(13, '600'), { color: P.tinta }]}>{t('filmmakerSpecs.adjust')}</Text>
          <Ionicons name="options-outline" size={18} color={P.tinta} />
        </View>
      </TouchableOpacity>
      <View style={[styles.rejilla, dir.contenedor]}>
        {dato('filmmaker.projFormat', f, 'format')}
        {dato('filmmaker.projResolution', r, 'resolution')}
        {dato('filmmaker.projDuration', d, 'duration')}
        {dato('filmmakerSpecs.sound', s, 'sound')}
      </View>
      <View style={styles.pie}>
        {semillaDe(idea) !== null ? <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{`${t('filmmakerSpecs.seedFold')} · ${formato.numero(semillaDe(idea) as number)}`}</Text> : null}
        <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{t('filmmakerSpecs.costTbc')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cuerpo: { gap: 10, paddingBottom: 24 },
  seccion: { gap: 10 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center' },
  chipSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  cerrado: { opacity: 0.5 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo },
  semilla: { minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, paddingHorizontal: 16 },
  mas: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  linea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16 },
  tarjeta: { alignSelf: 'stretch', marginHorizontal: 20, padding: 16, gap: 14, borderRadius: 24, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  pie: { gap: 4 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  dato: { width: '50%', minHeight: 48, justifyContent: 'center', gap: 2, paddingRight: 8 },
  ajustar: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 4 },
});
