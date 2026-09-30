import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import { Aviso, BotonPequeno, Seccion } from './ProductionPiezas';
import ProductionSelectorDeGuardados from './ProductionSelectorDeGuardados';
import { capacidadDeCreacion } from '../../../constants/assetsDeFilmmaker';
import type { ElementoGuardado } from '../../../services/elementsService';
import { EspacioDeFilmmaker, elegidoDe } from './espacio';
import { LIMITES, estadoEfectivo, repartoDelPlano, requisitosDeProduccion } from '../../../services/filmmaker/dominio';
import { CLASES_POR_FICHA, CLAVE_DE_CAPACIDAD, CLAVE_DEL_PAPEL_DE_REFERENCIA, PAPELES_DEL_PLANO } from '../../../constants/filmmaker';
import type { FilmmakerOperation, ProductionReference } from '../../../services/filmmaker/dominio';
import { conLaDelPapel } from '../../../utils/produccionEditable';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';

const isWeb = Platform.OS === 'web';

/** Unas pastillas que se encienden y se apagan: varias a la vez (o una sola, con `unica`: la de un fotograma). */
const Varias: React.FC<{ opciones: readonly { valor: string; texto: string }[]; elegidas: ReadonlySet<string>; editable: boolean; onCambiar: (v: string, encendida: boolean) => void; unica?: boolean }> = ({ opciones, elegidas, editable, onCambiar, unica }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.opciones}>
      {opciones.map((o) => {
        const esta = elegidas.has(o.valor);
        return (
          <TouchableOpacity
            key={o.valor}
            onPress={() => onCambiar(o.valor, !esta)}
            disabled={!editable}
            accessibilityRole={unica ? 'radio' : 'checkbox'}
            accessibilityLabel={o.texto}
            accessibilityState={{ checked: esta, disabled: !editable }}
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

/**
 * QUIÉN Y QUÉ HAY EN LO ELEGIDO, EDITABLE (Fase 23 del motor, el espacio de trabajo; antes se leía y nada más).
 *
 * El reparto del plano (o de la escena), su estado —vestuario y cómo está: postura, gesto, emoción, en palabras—,
 * los objetos que salen, el lugar de la escena y las referencias del plano. Todo con operaciones de F1-A que ya
 * existían (`update_shot`, `update_scene`, `set_character_state`, `change_location`), sin un grafo paralelo: las
 * fichas son las de la producción, y aquí solo se dice cuáles salen.
 *
 * Lo heredado se dice: un plano sin reparto propio sale con el de su escena (`repartoDelPlano`), y el estado de un
 * personaje en un plano es el de la escena salvo que el plano diga otro (`estadoEfectivo`). Tocarlo lo hace propio.
 *
 * Y las referencias, con la verdad: ponerlas en un plano hoy impide generarlo, hasta que se valide un modelo que las
 * use (Fase 18). Se avisa antes, no después.
 *
 * Fase 31 del motor: las referencias del plano, POR PAPEL —primer fotograma, último fotograma, movimiento y audio, que
 * son las entradas que Seedance ya sabe recibir, y «otras»—, cada papel con su hueco aunque esté vacío: quien busca
 * «el fotograma inicial» lo encuentra en el plano, y lee ahí mismo que generar con él llegará cuando se valide su
 * modelo (el contrato 1, su precio y su prueba real). Un fotograma es uno como mucho: elegir otro sustituye al primero.
 */
const ProductionEnElPlano: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, seleccion, editable, onGesto } = espacio;
  const [estadoDe, setEstadoDe] = useState<string | null>(null);
  /* 3D dentro de Filmmaker: de qué clase se está eligiendo algo guardado (en el sitio de la lista, como en el proyecto). */
  const [desdeGuardados, setDesdeGuardados] = useState<'personaje' | 'objeto' | 'lugar' | null>(null);
  const cargarGuardados = espacio.elementos?.cargar;
  useEffect(() => { if (desdeGuardados && cargarGuardados) cargarGuardados(CLASES_POR_FICHA[desdeGuardados]); }, [desdeGuardados, cargarGuardados]);
  const elegido = elegidoDe(produccion, seleccion);
  if (!elegido) return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsDirectorNoSelection')}</Text>;
  const { escena, plano } = elegido;
  const reparto = new Set(plano ? repartoDelPlano(escena, plano) : escena.characterIds ?? []);
  const heredado = !!plano && plano.characterIds === undefined && (escena.characterIds?.length ?? 0) > 0;
  const objetos = new Set((plano ? plano.objectIds : escena.objectIds) ?? []);
  const referencias = new Set(plano?.referenceIds ?? []);
  /* Cómo se llama una referencia aquí: su descripción o su número en Proyecto › Referencias (el papel ya es el hueco). */
  const nombreDeReferencia = (r: ProductionReference) => r.description || t('filmmaker.wsReferenceNumbered', { numero: produccion.references.indexOf(r) + 1 });
  const papelesConHueco = new Set<string>(PAPELES_DEL_PLANO.map((x) => x.papel));
  const otras = produccion.references.filter((r) => !r.role || !papelesConHueco.has(r.role));
  const cambiarLista = (campo: 'characterIds' | 'objectIds' | 'referenceIds', actual: ReadonlySet<string>, id: string, encendida: boolean) => {
    const nueva = encendida ? [...actual, id] : [...actual].filter((x) => x !== id);
    const op: FilmmakerOperation = plano
      ? { op: 'update_shot', shotId: plano.id, changes: { [campo]: nueva.length ? nueva : null } } as FilmmakerOperation
      : { op: 'update_scene', sceneId: escena.id, changes: { [campo]: nueva.length ? nueva : null } } as FilmmakerOperation;
    onGesto([op]);
  };
  const objetivo = plano ? { shotId: plano.id } : { sceneId: escena.id };
  /* Con referencias, ¿qué capacidad pediría este plano? La calcula F1-A (sus requisitos); si la producción no está lista, no se dice nada. */
  const capacidad = (() => {
    if (!plano || !referencias.size) return undefined;
    const r = requisitosDeProduccion(produccion);
    const c = r.ok ? r.requirements.shots.find((s) => s.unitId === plano.id)?.capability : undefined;
    return c ? CLAVE_DE_CAPACIDAD[c] : undefined;
  })();
  /*
   * DESDE LO GUARDADO, EN ESTE PLANO (3D dentro de Filmmaker). La identidad manda: si la producción ya tiene una ficha
   * vinculada a ese guardado, entra ESA ficha —su ID, el mismo en todos los planos donde sale—; si no, se añade una
   * ficha con su nombre, vinculada a él en su versión, y entra. Todo en un solo gesto de F1-A.
   */
  const puedeDesdeGuardados = !!espacio.elementos && !!espacio.idsDeFichas && editable;
  const desdeGuardado = (clase: 'personaje' | 'objeto' | 'lugar', e: ElementoGuardado) => {
    const fichas: readonly { readonly id: string; readonly element?: { readonly elementId: string } }[] = clase === 'personaje' ? produccion.characters : clase === 'objeto' ? produccion.objects : produccion.locations;
    const ya = fichas.find((f) => f.element?.elementId === e.elementId);
    const nuevoId = clase === 'personaje' ? espacio.idsDeFichas?.personaje : clase === 'objeto' ? espacio.idsDeFichas?.objeto : espacio.idsDeFichas?.lugar;
    if (!ya && !nuevoId) return;
    const id = ya?.id ?? (nuevoId as () => string)();
    const vinculo = { element: { elementId: e.elementId, version: e.version } };
    const alta: FilmmakerOperation[] = ya ? [] : clase === 'personaje'
      ? [{ op: 'add_character', character: { id, name: e.name } }, { op: 'update_character', characterId: id, changes: vinculo } as FilmmakerOperation]
      : clase === 'objeto'
        ? [{ op: 'add_object', object: { id, name: e.name } }, { op: 'update_object', objectId: id, changes: vinculo } as FilmmakerOperation]
        : [{ op: 'add_location', location: { id, name: e.name } }, { op: 'update_location', locationId: id, changes: vinculo } as FilmmakerOperation];
    let uso: FilmmakerOperation;
    if (clase === 'lugar') {
      uso = { op: 'change_location', sceneId: escena.id, locationId: id };
    } else {
      const campo = clase === 'personaje' ? 'characterIds' : 'objectIds';
      const nueva = [...new Set([...(clase === 'personaje' ? reparto : objetos), id])];
      uso = plano
        ? { op: 'update_shot', shotId: plano.id, changes: { [campo]: nueva } } as FilmmakerOperation
        : { op: 'update_scene', sceneId: escena.id, changes: { [campo]: nueva } } as FilmmakerOperation;
    }
    if (onGesto([...alta, uso]).ok) setDesdeGuardados(null);
  };
  if (desdeGuardados && espacio.elementos) {
    return <ProductionSelectorDeGuardados elementos={espacio.elementos} onElegir={(e) => desdeGuardado(desdeGuardados, e)} onVolver={() => setDesdeGuardados(null)} />;
  }
  const botonDesdeGuardados = (clase: 'personaje' | 'objeto' | 'lugar') => (puedeDesdeGuardados
    ? <BotonPequeno icono={capacidadDeCreacion('plano_desde_guardados').icono} etiqueta={t('filmmaker.wsShotFromSaved')} onPress={() => setDesdeGuardados(clase)} conTexto />
    : null);
  const conEstado = estadoDe && reparto.has(estadoDe) ? estadoDe : null;
  const estado = conEstado ? estadoEfectivo(escena, plano, conEstado) : undefined;
  return (
    <View style={styles.bloque}>
      <Seccion titulo={t(plano ? 'filmmaker.wsCharactersInShot' : 'filmmaker.wsCharactersInScene')}>
        {produccion.characters.length === 0
          ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsCastEmpty')}</Text>
          : (
            <Varias
              opciones={produccion.characters.map((c) => ({ valor: c.id, texto: c.name }))}
              elegidas={reparto}
              editable={editable}
              onCambiar={(id, si) => cambiarLista('characterIds', reparto, id, si)}
            />
          )}
        {heredado && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsCastInherited')}</Text>}
        {botonDesdeGuardados('personaje')}
      </Seccion>

      {reparto.size > 0 && (
        <Seccion titulo={t('filmmaker.wsCharacterState')}>
          <View style={styles.opciones}>
            {[...reparto].map((id) => {
              const c = produccion.characters.find((x) => x.id === id);
              if (!c) return null;
              const activo = conEstado === id;
              return (
                <TouchableOpacity key={id} onPress={() => setEstadoDe(activo ? null : id)} accessibilityRole="button" accessibilityState={{ selected: activo }} accessibilityLabel={t('filmmaker.wsCharacterStateOf', { nombre: c.name })}
                  style={[styles.opcion, { backgroundColor: activo ? theme.colors.glow : theme.colors.surface, borderColor: activo ? theme.colors.accent : theme.colors.border }]}>
                  <Text style={[styles.opcionTexto, { color: theme.colors.text }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!conEstado && (
            <>
              <CampoQueCrece
                etiqueta={t('filmmaker.wsWardrobe')}
                valor={estado?.wardrobe ?? ''}
                maximo={LIMITES.frase}
                etiquetaGuardar={t('common.save')}
                editable={editable}
                onGuardar={(texto) => onGesto([{ op: 'set_character_state', target: objetivo, characterId: conEstado, wardrobe: texto || null }])}
              />
              <CampoQueCrece
                etiqueta={t('filmmaker.wsHowTheyAre')}
                valor={estado?.appearanceNotes ?? ''}
                placeholder={t('filmmaker.wsHowTheyAreHint')}
                maximo={LIMITES.frase}
                etiquetaGuardar={t('common.save')}
                editable={editable}
                onGuardar={(texto) => onGesto([{ op: 'set_character_state', target: objetivo, characterId: conEstado, appearanceNotes: texto || null }])}
              />
              <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(plano ? 'filmmaker.wsStateInheritedShot' : 'filmmaker.wsStateScene')}</Text>
            </>
          )}
        </Seccion>
      )}

      <Seccion titulo={t(plano ? 'filmmaker.wsObjectsInShot' : 'filmmaker.wsObjectsInScene')}>
        {produccion.objects.length === 0
          ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsObjectEmpty')}</Text>
          : (
            <Varias
              opciones={produccion.objects.map((o) => ({ valor: o.id, texto: o.name }))}
              elegidas={objetos}
              editable={editable}
              onCambiar={(id, si) => cambiarLista('objectIds', objetos, id, si)}
            />
          )}
        {botonDesdeGuardados('objeto')}
      </Seccion>

      <Seccion titulo={t('filmmaker.wsLocationOfScene')}>
        {produccion.locations.length === 0
          ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsPlaceEmpty')}</Text>
          : (
            <Varias
              opciones={produccion.locations.map((l) => ({ valor: l.id, texto: l.name }))}
              elegidas={new Set(escena.locationId ? [escena.locationId] : [])}
              editable={editable}
              onCambiar={(id, si) => onGesto([{ op: 'change_location', sceneId: escena.id, locationId: si ? id : null }])}
            />
          )}
        {botonDesdeGuardados('lugar')}
      </Seccion>

      {!!plano && (
        <Seccion titulo={t('filmmaker.wsShotReferences')}>
          <Aviso texto={t('filmmaker.wsShotReferencesSoon')} icono="time-outline" tono="neutro" />
          {PAPELES_DEL_PLANO.map(({ papel, uno }) => {
            const delPapel = produccion.references.filter((r) => r.role === papel);
            return (
              <View key={papel} style={styles.hueco}>
                <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t(CLAVE_DEL_PAPEL_DE_REFERENCIA[papel])}</Text>
                {delPapel.length === 0
                  ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsShotRoleEmpty')}</Text>
                  : (
                    <Varias
                      unica={uno}
                      opciones={delPapel.map((r) => ({ valor: r.id, texto: nombreDeReferencia(r) }))}
                      elegidas={referencias}
                      editable={editable}
                      onCambiar={(id, si) => (uno
                        ? onGesto([{ op: 'update_shot', shotId: plano.id, changes: { referenceIds: conLaDelPapel(plano.referenceIds, produccion.references, papel, id, si) } }])
                        : cambiarLista('referenceIds', referencias, id, si))}
                    />
                  )}
              </View>
            );
          })}
          <View style={styles.hueco}>
            <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsShotRoleOthers')}</Text>
            {otras.length === 0
              ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(produccion.references.length ? 'filmmaker.wsShotRoleOthersNone' : 'filmmaker.wsNoReferences')}</Text>
              : (
                <Varias
                  opciones={otras.map((r) => ({ valor: r.id, texto: nombreDeReferencia(r) }))}
                  elegidas={referencias}
                  editable={editable}
                  onCambiar={(id, si) => cambiarLista('referenceIds', referencias, id, si)}
                />
              )}
          </View>
          {referencias.size > 0 && <Aviso texto={t('filmmaker.wsReferencesBlockTake')} />}
          {/* Fase 27 del motor: lo que haría falta, dicho con la capacidad que F1-A calcula para este plano. */}
          {!!capacidad && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsShotWouldNeed', { capacidad: t(capacidad) })}</Text>}
        </Seccion>
      )}
      {/* 3D dentro de Filmmaker: la puesta en escena en 3D, cerrada con su porqué (le faltan su editor y su sitio en F1-A). */}
      <BotonPequeno icono={capacidadDeCreacion('escena_3d').icono} etiqueta={t('filmmaker.wsScene3d')} onPress={() => undefined}
        disabled porque={t(capacidadDeCreacion('escena_3d').porque ?? '')} conTexto />
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.lg },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
  hueco: { gap: SPACING.xs },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
});

export default ProductionEnElPlano;
