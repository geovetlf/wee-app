import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import HojaInferior from '../../workspace/HojaInferior';
import CampoDeBusqueda from '../../workspace/CampoDeBusqueda';
import { BotonPequeno, Chip, Seccion } from './ProductionPiezas';
import type { FilmmakerOperation, FilmmakerProduction } from '../../../services/filmmaker/dominio';
import type { ElementosParaVincular } from '../../../hooks/useElementosParaVincular';
import { coincideConLaBusqueda } from '../../../utils/buscarPorNombre';
import { CLASES_POR_FICHA, nombreDelEstilo } from '../../../constants/filmmaker';
import type { Estructura } from './ProductionProjectPanel';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';

const TITULO: Readonly<Record<Exclude<Estructura, 'storyboard' | 'planos'>, string>> = {
  idea: 'filmmaker.wsIdea',
  guion: 'filmmaker.wsScript',
  personajes: 'filmmaker.characters',
  lugares: 'filmmaker.wsLocations',
  moodboard: 'filmmaker.wsMoodboard',
};

/**
 * LO QUE LA PRODUCCIÓN YA SABE DE SÍ MISMA: la idea, el guion, quién sale, dónde,
 * y su moodboard, para leerlo de un vistazo.
 *
 * Se lee, no se edita: lo que sí se dirige —la descripción de cada escena y cada
 * plano, su cámara, su luz, sus líneas— se dirige en el visor, en Weë AI Director
 * y en las propiedades del plano.
 *
 * Con una excepción desde la Fase 20 del motor: cada personaje y cada lugar se
 * pueden VINCULAR con uno de los que la cuenta tiene guardados (los vínculos de
 * la Fase 10), o dejar de estarlo, con las operaciones de F1-A de siempre. Qué se
 * puede elegir lo dicen las clases que encajan con esa ficha, y el servidor lo
 * vuelve a comprobar al guardar.
 */
type FichaVinculable = 'personaje' | 'lugar';
type Vinculo = { readonly elementId: string; readonly version: number };
const operacionDelVinculo = (ficha: FichaVinculable, id: string, element: Vinculo | null): FilmmakerOperation =>
  (ficha === 'personaje'
    ? { op: 'update_character', characterId: id, changes: { element } }
    : { op: 'update_location', locationId: id, changes: { element } });

const ProductionStructureSheet: React.FC<{
  produccion: FilmmakerProduction;
  que: Exclude<Estructura, 'storyboard' | 'planos'>;
  onCerrar: () => void;
  /** Fase 20 · para vincular las fichas con lo guardado. Sin esto, la hoja solo se lee, como antes. */
  vinculos?: { editable: boolean; onGesto: (ops: readonly FilmmakerOperation[]) => unknown; elementos: ElementosParaVincular };
}> = ({ produccion, que, onCerrar, vinculos }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [eligiendo, setEligiendo] = useState<{ ficha: FichaVinculable; id: string } | null>(null);
  /* Lo que se busca entre lo guardado ya cargado (Fase 22 del motor, arreglo R7). */
  const [busqueda, setBusqueda] = useState('');
  const fichaDeLaHoja: FichaVinculable | null = que === 'personajes' ? 'personaje' : que === 'lugares' ? 'lugar' : null;
  const cargar = vinculos?.elementos.cargar;
  /* Lo guardado se pide al abrir el reparto o los lugares, por las clases que encajan con esa ficha. */
  useEffect(() => { if (fichaDeLaHoja && cargar) cargar(CLASES_POR_FICHA[fichaDeLaHoja]); }, [fichaDeLaHoja, cargar]);
  const texto = (valor: string | undefined, vacio: string) => (
    <Text style={[styles.texto, { color: valor ? theme.colors.text : theme.colors.textSecondary }]}>{valor || vacio}</Text>
  );
  const ficha = (clave: string, nombre: string, detalle?: string, abajo?: React.ReactNode) => (
    <View key={clave} style={[styles.ficha, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.nombre, { color: theme.colors.text }]}>{nombre}</Text>
      {!!detalle && <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{detalle}</Text>}
      {abajo}
    </View>
  );
  /* Su vínculo: con quién está —y quitarlo—, o vincularlo. Solo si la hoja puede vincular. */
  const vinculo = (tipo: FichaVinculable, id: string, element?: Vinculo) => {
    if (!vinculos) return null;
    if (element) {
      const nombre = vinculos.elementos.lista.find((e) => e.elementId === element.elementId)?.name;
      return (
        <View style={styles.vinculo}>
          <Chip texto={nombre ? t('filmmaker.wsElementLinked', { nombre }) : t('filmmaker.wsElementLinkedUnknown')} icono="link-outline" tono="acento" />
          <BotonPequeno icono="close-circle-outline" etiqueta={t('filmmaker.wsElementUnlink')} onPress={() => { vinculos.onGesto([operacionDelVinculo(tipo, id, null)]); }} disabled={!vinculos.editable} conTexto />
        </View>
      );
    }
    return <BotonPequeno icono="link-outline" etiqueta={t('filmmaker.wsElementLink')} onPress={() => setEligiendo({ ficha: tipo, id })} disabled={!vinculos.editable} conTexto />;
  };
  const direccion = produccion.creativeDirection;

  let cuerpo: React.ReactNode = null;
  if (que === 'idea') {
    cuerpo = (
      <>
        <Seccion titulo={t('filmmaker.intent')}>{texto(produccion.intent.freeText ?? produccion.intent.objective, t('filmmaker.wsNothingYet'))}</Seccion>
        <Seccion titulo={t('filmmaker.creativeDirection')}>
          {texto(formato.lista([direccion.visualStyle ? nombreDelEstilo(direccion.visualStyle, t) : undefined, direccion.mood, direccion.tone].filter((x): x is string => !!x)), t('filmmaker.noCreativeDirection'))}
        </Seccion>
      </>
    );
  } else if (que === 'guion') {
    cuerpo = produccion.scenes.length === 0
      ? texto(undefined, t('filmmaker.wsNothingYet'))
      : produccion.scenes.map((s, i) => {
        const lineas = [...(s.dialogue ?? []), ...s.shots.flatMap((p) => p.dialogue ?? [])];
        return (
          <Seccion key={s.id} titulo={s.title ? t('filmmaker.wsSceneCrumbTitled', { numero: i + 1, titulo: s.title }) : t('filmmaker.wsSceneCrumb', { numero: i + 1 })}>
            {texto(s.description, t('filmmaker.noDescription'))}
            {lineas.map((l) => (
              <Text key={l.id} style={[styles.linea, { color: theme.colors.text, borderLeftColor: theme.colors.accent }]}>{l.text}</Text>
            ))}
          </Seccion>
        );
      });
  } else if (que === 'personajes') {
    cuerpo = produccion.characters.length === 0
      ? texto(undefined, t('filmmaker.noCharacters'))
      : produccion.characters.map((c) => ficha(c.id, c.name, c.identityDescription, vinculo('personaje', c.id, c.element)));
  } else if (que === 'lugares') {
    cuerpo = produccion.locations.length === 0
      ? texto(undefined, t('filmmaker.wsNoLocations'))
      : produccion.locations.map((l) => ficha(l.id, l.name, l.description, vinculo('lugar', l.id, l.element)));
  } else {
    const paleta = direccion.color?.palette ?? [];
    cuerpo = (
      <>
        <Seccion titulo={t('filmmaker.creativeDirection')}>
          {texto(formato.lista([direccion.visualStyle ? nombreDelEstilo(direccion.visualStyle, t) : undefined, direccion.mood, direccion.color?.grading].filter((x): x is string => !!x)), t('filmmaker.noCreativeDirection'))}
          {paleta.length > 0 && (
            <View style={styles.paleta}>
              {paleta.map((c) => <View key={c} style={[styles.color, { backgroundColor: c, borderColor: theme.colors.border }]} />)}
            </View>
          )}
        </Seccion>
        <Seccion titulo={t('filmmaker.wsReferencesList')}>
          {produccion.references.length === 0
            ? texto(undefined, t('filmmaker.wsNoReferences'))
            : produccion.references.map((r) => ficha(r.id, r.description ?? r.id))}
        </Seccion>
      </>
    );
  }

  /* Eligiendo con qué vincular una ficha: la lista de lo guardado, en lugar de la hoja. */
  if (eligiendo && vinculos) {
    const { carga, lista, hayMas, cargandoMas, cargarMas } = vinculos.elementos;
    const elegir = (e: { elementId: string; version: number }) => {
      vinculos.onGesto([operacionDelVinculo(eligiendo.ficha, eligiendo.id, { elementId: e.elementId, version: e.version })]);
      setEligiendo(null);
      setBusqueda('');
    };
    /*
     * Fase 22 del motor (arreglo R7): por páginas y en su orden —lo que llega se pone detrás—, con «Cargar más»
     * mientras quede algo, y un filtro por nombre sobre lo ya cargado, que dice que es sobre lo cargado.
     */
    const visibles = lista.filter((e) => coincideConLaBusqueda(e.name, busqueda));
    cuerpo = (
      <Seccion titulo={t('filmmaker.wsElementPickTitle')}>
        {carga === 'listos' && lista.length > 0 && (
          <>
            <CampoDeBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder={t('filmmaker.wsElementSearch')} />
            {!!busqueda.trim() && hayMas && texto(undefined, t('filmmaker.wsElementSearchLoaded'))}
          </>
        )}
        {carga === 'error'
          ? <Text style={[styles.texto, { color: theme.colors.error }]}>{t('filmmaker.wsElementPickError')}</Text>
          : carga !== 'listos'
            ? texto(undefined, t('common.loading'))
            : lista.length === 0
              ? texto(undefined, t('filmmaker.wsElementPickEmpty'))
              : visibles.length === 0
                ? texto(undefined, t('filmmaker.wsElementSearchNone'))
                : visibles.map((e) => <BotonPequeno key={e.elementId} icono="link-outline" etiqueta={e.name} onPress={() => elegir(e)} conTexto />)}
        {carga === 'listos' && hayMas && (
          <BotonPequeno icono="chevron-down" etiqueta={cargandoMas ? t('common.loading') : t('filmmaker.wsElementLoadMore')} onPress={cargarMas} disabled={cargandoMas} conTexto />
        )}
        <BotonPequeno icono="arrow-back" etiqueta={t('common.back')} onPress={() => { setEligiendo(null); setBusqueda(''); }} conTexto />
      </Seccion>
    );
  }

  return (
    <HojaInferior
      visible
      titulo={t(TITULO[que])}
      subtitulo={t(vinculos && fichaDeLaHoja ? 'filmmaker.wsStructureLinkable' : 'filmmaker.wsReferencesReadOnly')}
      onCerrar={onCerrar}
    >
      {cuerpo}
    </HojaInferior>
  );
};

const styles = StyleSheet.create({
  texto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5 },
  ficha: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: 4 },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
  linea: { fontSize: FONT_SIZE.sm, fontStyle: 'italic', borderLeftWidth: 2, paddingLeft: SPACING.sm },
  paleta: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  color: { width: 28, height: 28, borderRadius: 6, borderWidth: 1 },
  vinculo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.xs },
});

export default ProductionStructureSheet;
