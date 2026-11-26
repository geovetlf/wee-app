import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { IdeaDelTaller, duracionDe, duracionesDelTipo, etiquetaAccesible, poner } from '../../utils/ideaDeFilmmaker';
import { CALIDAD_POR_DEFECTO, CalidadDeProduccion, RESOLUCION_POR_DEFECTO, efectivas, elegirCalidad, elegirModelo, formatoPorDefectoDelTipo as formatoPorDefecto, opcionesDe, semillaDe } from '../../utils/especificacionesDeFilmmaker';
import { DURACION_POR_DEFECTO } from '../../constants/filmmakerIdea';
import { useCapacidadesDeVideo } from '../../hooks/useCapacidadesDeVideo';
import { RejillaDeModelos } from './PanelDeEspecificacionesModelos';

/** A qué control se lleva la hoja al abrirla desde una celda de la tarjeta. */
export type FocoDeEspecificaciones = 'model' | 'format' | 'resolution' | 'duration' | 'sound';
type Props = { idea: IdeaDelTaller; onIdea: (i: IdeaDelTaller) => void };

const claveDeSonido = (a: 'si' | 'no' | 'desconocido') => (a === 'si' ? 'filmmakerSpecs.soundYes' : a === 'no' ? 'filmmakerSpecs.soundNo' : 'filmmakerSpecs.soundUnknown');

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
  const e = efectivas(idea);
  const o = opcionesDe(e.modelo);
  const servidor = useCapacidadesDeVideo().opcionesDe(e.modelo.idServidor);
  const porDefecto = t('filmmakerSpecs.byDefault');
  /** Una opción: lleva su valor real y, la que Weë aplica por defecto, la marca «Por defecto». Elegir la de por defecto devuelve el campo a «sin elegir». */
  const chip = (clave: string, etiqueta: string, sel: boolean, esDefecto: boolean, onPress: () => void) => (
    <TouchableOpacity key={clave} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(etiqueta, esDefecto ? porDefecto : '')} accessibilityState={{ selected: sel }} style={[styles.chip, sel && styles.chipSel]}>
      <Text style={[textoPortada(14, sel ? '600' : '500'), { color: P.tinta }]}>{etiqueta}</Text>
      {esDefecto ? <Text style={[textoPortada(10, '500'), { color: P.tintaSecundaria }]}>{porDefecto}</Text> : null}
    </TouchableOpacity>
  );
  /** Una opción cerrada: se ve, no se puede tocar (nunca activa si no hace nada). */
  const cerrada = (clave: string, etiqueta: string, sel = false) => (
    <View key={clave} style={[styles.chip, styles.cerrado, sel && styles.chipSel]} accessible accessibilityLabel={etiquetaAccesible(etiqueta, t('filmmakerSpecs.soon'))} accessibilityState={{ disabled: true, selected: sel }}>
      <Text style={[textoPortada(14, '500'), { color: P.tintaSecundaria }]}>{etiqueta}</Text>
    </View>
  );
  const etiqueta = (clave: string) => <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t(clave)}</Text>;
  const nota = (clave: string) => <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t(clave)}</Text>;
  const sec = (id: string, hijos: React.ReactNode) => <View key={id} style={styles.seccion} onLayout={(ev: LayoutChangeEvent) => onPosicion?.(id, ev.nativeEvent.layout.y)}>{hijos}</View>;
  const perfil = e.modelo.perfil === 'rapido' ? 'filmmakerSpecs.qualityFast' : e.modelo.perfil === 'calidad' ? 'filmmakerSpecs.qualityBest' : 'filmmakerSpecs.qualityBalanced';
  const CALIDADES: readonly { valor: CalidadDeProduccion; clave: string }[] = [
    { valor: 'standard', clave: 'filmmakerSpecs.qualityFast' }, { valor: 'high', clave: 'filmmakerSpecs.qualityBalanced' }, { valor: 'max', clave: 'filmmakerSpecs.qualityBest' },
  ];
  return (
    <View style={styles.cuerpo}>
      {sec('model', <>
        {etiqueta('filmmakerSpecs.model')}
        <TouchableOpacity onPress={onModelos} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSpecs.model'), e.modelo.nombre, e.modeloPorDefecto ? porDefecto : '')} style={[styles.selector, dir.contenedor]}>
          <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta, flex: 1 }]} numberOfLines={1}>{e.modelo.nombre}</Text>
          {e.modeloPorDefecto ? <Text style={[textoPortada(11, '500'), { color: P.tintaSecundaria }]}>{porDefecto}</Text> : null}
          <Ionicons name="chevron-down" size={16} color={P.tintaSecundaria} />
        </TouchableOpacity>
        {e.modeloPorDefecto ? nota('filmmakerSpecs.defaultNote') : null}
      </>)}
      {sec('format', <>
        {etiqueta('filmmaker.projFormat')}
        <View style={[styles.fila, dir.contenedor]}>
          {o.formatos.map((f) => chip(`f${f}`, `⁦${f}⁩`, e.formato === f, f === formatoPorDefecto(idea.tipo), () => onIdea(poner(idea, 'format', f === formatoPorDefecto(idea.tipo) ? '' : f))))}
        </View>
      </>)}
      {sec('resolution', <>
        {etiqueta('filmmaker.projResolution')}
        <View style={[styles.fila, dir.contenedor]}>
          {o.resoluciones.map((r) => chip(`r${r}`, r, e.resolucion === r, r === RESOLUCION_POR_DEFECTO, () => onIdea(poner(idea, 'resolution', r === RESOLUCION_POR_DEFECTO ? '' : r))))}
        </View>
      </>)}
      {sec('duration', <>
        {etiqueta('filmmakerSpecs.durationTotal')}
        <View style={[styles.fila, dir.contenedor]}>
          {duracionesDelTipo(idea.tipo).map((sg) => chip(`d${sg}`, t('filmmaker.hubSeconds', { n: formato.numero(sg) }), sg === e.duracion, sg === DURACION_POR_DEFECTO[idea.tipo], () => onIdea(poner(idea, 'duration', sg === DURACION_POR_DEFECTO[idea.tipo] ? '' : String(sg)))))}
        </View>
        {o.porCuadro ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.perShot', { min: formato.numero(o.porCuadro.min), max: formato.numero(o.porCuadro.max) })}</Text> : null}
      </>)}
      {sec('quality', <>
        {etiqueta('filmmakerSpecs.quality')}
        {e.calidad === null ? (
          <View style={[styles.fila, dir.contenedor]}>{cerrada('qfijo', t(perfil), true)}</View>
        ) : (
          <View style={[styles.fila, dir.contenedor]}>
            {CALIDADES.map((c) => chip(`q${c.valor}`, t(c.clave), e.calidad === c.valor, c.valor === CALIDAD_POR_DEFECTO, () => onIdea(elegirCalidad(idea, c.valor))))}
          </View>
        )}
        {nota(e.calidad === null ? 'filmmakerSpecs.qualityFixed' : 'filmmakerSpecs.qualityHint')}
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
              placeholder={formato.numero(0)} placeholderTextColor={P.tintaSecundaria} accessibilityLabel={t('filmmakerSpecs.seedFold')}
              style={[styles.semilla, dir.texto, textoPortada(15, '600'), { color: P.tinta }]} />
            {nota('filmmakerSpecs.seedHint')}
          </>
        ) : nota('filmmakerSpecs.seedClosed')}
      </>)}
      <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.costTbc')}</Text>
    </View>
  );
};

/** El contenido de la hoja: el cuerpo, o la rejilla de modelos en su lugar (un solo Modal, sin hojas encimadas). */
export const ContenidoDeEspecificaciones: React.FC<Props & { modelos: boolean; onModelos: (abierta: boolean) => void; onPosicion?: (id: string, y: number) => void }> = ({ idea, onIdea, modelos, onModelos, onPosicion }) => {
  if (modelos) return <RejillaDeModelos valor={idea.valores.model ?? ''} recomendado={efectivas(elegirModelo(idea, '')).modelo} onElegir={(id) => { onIdea(elegirModelo(idea, id)); onModelos(false); }} />;
  return <CuerpoDeEspecificaciones idea={idea} onIdea={onIdea} onModelos={() => onModelos(true)} onPosicion={onPosicion} />;
};

/**
 * EL RESUMEN EN LA PANTALLA (el «estudio de comando» de la Idea): modelo y, debajo, cuatro datos en rejilla (formato, resolución, duración, sonido). Cada celda
 * abre la hoja llevada a SU control (≥44 dp); «Ajustar» deja claro que se toca. Compacto (teclado abierto o pantalla corta): solo una línea.
 */
export const ResumenDeEspecificaciones: React.FC<{ idea: IdeaDelTaller; compacto: boolean; onAbrir: (foco?: FocoDeEspecificaciones) => void }> = ({ idea, compacto, onAbrir }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const e = efectivas(idea);
  const nombre = e.modelo.nombre;
  const f = `⁦${e.formato}⁩`;
  const r = e.resolucion;
  const d = t('filmmaker.hubSeconds', { n: formato.numero(e.duracion) });
  const s = t(claveDeSonido(e.audio));
  const porDefecto = t('filmmakerSpecs.byDefault');
  if (compacto) {
    return (
      <TouchableOpacity onPress={() => onAbrir()} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSpecs.summaryLabel'), nombre, f, r, d, s, t('filmmakerSpecs.openLabel'))} style={[styles.linea, dir.contenedor]}>
        <Ionicons name="options-outline" size={16} color={P.tinta} />
        <Text style={[textoPortada(13, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{t('filmmakerSpecs.configure')}</Text>
        <Text style={[textoPortada(11, '400'), dir.texto, { color: P.tintaSecundaria, flexShrink: 1 }]} numberOfLines={1}>{[nombre, f, r, d].join(' · ')}</Text>
      </TouchableOpacity>
    );
  }
  const dato = (clave: string, valor: string, foco: FocoDeEspecificaciones, esDefecto: boolean) => (
    <TouchableOpacity key={clave} onPress={() => onAbrir(foco)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(clave), valor, esDefecto ? porDefecto : '', t('filmmakerSpecs.openLabel'))} style={styles.dato}>
      <Text style={[textoPortada(11, '500'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{t(clave)}{esDefecto ? ` · ${porDefecto}` : ''}</Text>
      <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{valor}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={styles.tarjeta}>
      <TouchableOpacity onPress={() => onAbrir('model')} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSpecs.model'), nombre, e.modeloPorDefecto ? porDefecto : '', t('filmmakerSpecs.openLabel'))} style={[styles.cabeza, dir.contenedor]}>
        <View style={{ flex: 1 }}>
          <Text style={[textoPortada(11, '500'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{t('filmmakerSpecs.model')}{e.modeloPorDefecto ? ` · ${porDefecto}` : ''}</Text>
          <Text style={[textoPortada(17, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{nombre}</Text>
        </View>
        <View style={[styles.ajustar, dir.contenedor]}>
          <Text style={[textoPortada(13, '600'), { color: P.tinta }]}>{t('filmmakerSpecs.adjust')}</Text>
          <Ionicons name="options-outline" size={18} color={P.tinta} />
        </View>
      </TouchableOpacity>
      <View style={[styles.rejilla, dir.contenedor]}>
        {dato('filmmaker.projFormat', f, 'format', e.formatoPorDefecto)}
        {dato('filmmaker.projResolution', r, 'resolution', e.resolucionPorDefecto)}
        {dato('filmmaker.projDuration', d, 'duration', e.duracionPorDefecto)}
        {dato('filmmakerSpecs.sound', s, 'sound', false)}
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
  chip: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center' },
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
