import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import ProductionSelectorDeGuardados from './ProductionSelectorDeGuardados';
import ProductionCrearFicha from './ProductionCrearFicha';
import { BotonPequeno, Chip } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import { AMBIENTES, LIMITES, RASGOS, TIPOS_DE_OBJETO } from '../../../services/filmmaker/dominio';
import type { AppearanceProfile, AppearanceTraitKey, FilmmakerOperation, ProductionCharacter, ProductionLocation, ProductionObject } from '../../../services/filmmaker/dominio';
import { CLASES_POR_FICHA, CLAVE_DEL_AMBIENTE, CLAVE_DEL_RASGO, CLAVE_DEL_TIPO_DE_OBJETO, RASGOS_POR_FICHA } from '../../../constants/filmmaker';
import { conRasgo } from '../../../utils/produccionEditable';
import { TIPO_DEL_CORE_POR_FICHA, capacidadDeCreacion, tipoDelCoreParaObjeto } from '../../../constants/assetsDeFilmmaker';
import type { ResultadoDeCrearElemento } from '../../../services/elementsService';
import type { CreacionParaReferencia } from '../../../hooks/useCreacionesParaReferencia';
import { confirmAction } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

export type ClaseDeFicha = 'personaje' | 'lugar' | 'objeto';
type Vinculo = { readonly elementId: string; readonly version: number };

/** Cómo se llama cada cosa de cada clase: el título, añadir, el nombre y la descripción. */
const TEXTOS: Readonly<Record<ClaseDeFicha, { anadir: string; nombre: string; descripcion: string; vacia: string; quitar: string; quitarTodo: string; icono: string }>> = {
  personaje: {
    anadir: 'filmmaker.wsCastAdd', nombre: 'filmmaker.wsCastName', descripcion: 'filmmaker.wsCastWho', vacia: 'filmmaker.wsCastEmpty',
    quitar: 'filmmaker.wsCastRemoveConfirm', quitarTodo: 'filmmaker.wsCastRemoveLinked', icono: 'person-outline',
  },
  lugar: {
    anadir: 'filmmaker.wsPlaceAdd', nombre: 'filmmaker.wsPlaceName', descripcion: 'filmmaker.wsPlaceWhat', vacia: 'filmmaker.wsPlaceEmpty',
    quitar: 'filmmaker.wsPlaceRemoveConfirm', quitarTodo: 'filmmaker.wsPlaceRemoveLinked', icono: 'location-outline',
  },
  objeto: {
    anadir: 'filmmaker.wsObjectAdd', nombre: 'filmmaker.wsObjectName', descripcion: 'filmmaker.wsObjectWhat', vacia: 'filmmaker.wsObjectEmpty',
    quitar: 'filmmaker.wsObjectRemoveConfirm', quitarTodo: 'filmmaker.wsObjectRemoveLinked', icono: 'cube-outline',
  },
};

type Ficha = ProductionCharacter | ProductionLocation | ProductionObject;

/** Lo que dice un rasgo de la apariencia, en palabras (`undefined` si no dice nada). */
const descripcionDelRasgo = (ap: AppearanceProfile | undefined, r: AppearanceTraitKey): string | undefined =>
  (ap?.[r] as { description?: string } | undefined)?.description;

/**
 * Los rasgos que se enseñan en una ficha: los que F1-A pensó para su clase y, además, cualquier otro que ya diga algo
 * (lo pudo escribir Weë Brain): lo que llega al vídeo se ve y se puede quitar.
 */
const rasgosVisibles = (clase: ClaseDeFicha, ap: AppearanceProfile | undefined): readonly AppearanceTraitKey[] => [
  ...RASGOS_POR_FICHA[clase],
  ...RASGOS.filter((r) => !RASGOS_POR_FICHA[clase].includes(r) && !!descripcionDelRasgo(ap, r)),
];

/* ── Las operaciones de F1-A de cada clase: las de siempre, ni una nueva ─── */
const anadir = (clase: ClaseDeFicha, id: string, name: string): FilmmakerOperation =>
  (clase === 'personaje' ? { op: 'add_character', character: { id, name } }
    : clase === 'lugar' ? { op: 'add_location', location: { id, name } }
      : { op: 'add_object', object: { id, name } });
const cambiar = (clase: ClaseDeFicha, id: string, changes: Record<string, unknown>): FilmmakerOperation =>
  (clase === 'personaje' ? { op: 'update_character', characterId: id, changes }
    : clase === 'lugar' ? { op: 'update_location', locationId: id, changes }
      : { op: 'update_object', objectId: id, changes }) as FilmmakerOperation;
const quitar = (clase: ClaseDeFicha, id: string, cascade?: boolean): FilmmakerOperation =>
  (clase === 'personaje' ? { op: 'remove_character', characterId: id, ...(cascade ? { cascade } : {}) }
    : clase === 'lugar' ? { op: 'remove_location', locationId: id, ...(cascade ? { cascade } : {}) }
      : { op: 'remove_object', objectId: id, ...(cascade ? { cascade } : {}) });

/** Una fila de opciones de las que se elige una; tocar la elegida la quita. */
const Opciones: React.FC<{ opciones: readonly { valor: string; texto: string }[]; elegida?: string; editable: boolean; onElegir: (v: string | null) => void }> = ({ opciones, elegida, editable, onElegir }) => {
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

/**
 * EL REPARTO, LOS LUGARES Y LOS OBJETOS DE LA PRODUCCIÓN, EDITABLES (Fase 23 del motor, el espacio de trabajo).
 *
 * F1-A ya sabía crearlos, cambiarlos y quitarlos —`add_*`, `update_*`, `remove_*`— y nadie podía hacerlo desde la app:
 * la hoja de la estructura solo los enseñaba. Aquí cada ficha se crea con su nombre, se le dice qué es (un personaje,
 * quién es y cómo suena; un lugar, qué es y si es interior o exterior; un objeto, qué es y de qué clase), se vincula a
 * lo guardado de la cuenta —la Fase 10 lo comprueba al guardar— y se quita, preguntando antes y, si otras cosas la
 * usan, diciéndolo. Todo son gestos del controlador de siempre: se ve al momento y se guarda como lo demás.
 *
 * No es un segundo grafo: las fichas son las de la producción, con sus ids, y quien sale en cada escena o plano sigue
 * siendo `characterIds`/`objectIds` de F1-A (se eligen en el plano). Nada de esto genera ni cobra.
 *
 * Fase 31 del motor: la APARIENCIA, rasgo a rasgo —rostro, pelo, cuerpo, vestuario, accesorios y maquillaje de un
 * personaje; entorno, luz y colores de un lugar; materiales y colores de un objeto—. Cada rasgo descrito llega a la toma
 * junto al nombre (es lo que más ayuda a que alguien sea el mismo de un plano a otro) y no se podía escribir en ningún
 * sitio. Y SUSTITUIR a un personaje por otro en toda la producción (`replace_character`): donde salía, en sus líneas y
 * en su continuidad, pasa a salir el otro; el primero sigue en el reparto.
 */
const ProductionFichas: React.FC<{ clase: ClaseDeFicha; espacio: EspacioDeFilmmaker; nuevoId?: () => string }> = ({ clase, espacio, nuevoId }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, editable, onGesto, elementos } = espacio;
  const [abierta, setAbierta] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  /* Fase 31: la apariencia de qué ficha está desplegada, y a quién se está sustituyendo. */
  const [apariencia, setApariencia] = useState<string | null>(null);
  const [sustituyendo, setSustituyendo] = useState<string | null>(null);
  /* 3D dentro de Filmmaker: crear de otra forma (en el sitio de la lista), y guardar en la cuenta para reutilizar. */
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ readonly texto: string; readonly error?: boolean } | null>(null);
  const textos = TEXTOS[clase];
  const lista: readonly Ficha[] = clase === 'personaje' ? produccion.characters : clase === 'lugar' ? produccion.locations : produccion.objects;
  const cargar = elementos?.cargar;
  /* Lo guardado se pide al abrir el selector, por las clases que encajan con esta ficha. */
  useEffect(() => { if (eligiendo && cargar) cargar(CLASES_POR_FICHA[clase]); }, [eligiendo, clase, cargar]);

  /* Lo que dice cada motivo por el que no se pudo guardar en la cuenta. */
  const fraseDelMotivo = (r: ResultadoDeCrearElemento) => (r.ok ? '' : t(r.motivo === 'material' ? 'filmmaker.wsSaveFailedMaterial' : r.motivo === 'forma' ? 'filmmaker.wsSaveFailedShape' : 'filmmaker.wsSaveFailedNoAnswer'));
  const tipoDelCore = (f?: Ficha) => (clase === 'objeto' ? tipoDelCoreParaObjeto((f as ProductionObject | undefined)?.kind) : TIPO_DEL_CORE_POR_FICHA[clase]);
  const yaVinculada = (elementId: string) => lista.find((f) => (f.element as Vinculo | undefined)?.elementId === elementId);

  /* Desde lo guardado: si ya está en la producción, es LA MISMA ficha (el mismo ID en todos los planos); si no, una nueva vinculada. */
  const desdeGuardado = (e: { readonly elementId: string; readonly name: string; readonly version: number }) => {
    const ya = yaVinculada(e.elementId);
    if (ya) { setAviso({ texto: t('filmmaker.wsCreateAlreadyHere', { nombre: ya.name }) }); setAbierta(ya.id); setCreando(false); return; }
    if (!nuevoId) return;
    const id = nuevoId();
    if (onGesto([anadir(clase, id, e.name), cambiar(clase, id, { element: { elementId: e.elementId, version: e.version } })]).ok) { setAbierta(id); setCreando(false); }
  };

  /*
   * Desde Mis creaciones: el material se guarda en la cuenta como la cosa (un Element que APUNTA a él, sin copiarlo) y
   * entra vinculada. Un modelo recién importado hace exactamente lo mismo: ya es material de Mis creaciones.
   */
  const desdeCreacion = async (nombre: string, c: CreacionParaReferencia, importado?: boolean) => {
    if (!elementos?.crear || !nuevoId) return;
    setGuardando('nueva');
    setAviso(null);
    const r = await elementos.crear({ type: tipoDelCore(), name: nombre, refs: [{ assetId: c.assetId, role: 'primary', kind: c.clase }] });
    setGuardando(null);
    if (!r.ok) { setAviso({ texto: fraseDelMotivo(r), error: true }); return; }
    const id = nuevoId();
    if (onGesto([anadir(clase, id, nombre), cambiar(clase, id, { element: { elementId: r.elemento.elementId, version: r.elemento.version } })]).ok) {
      setAbierta(id);
      setCreando(false);
      if (importado) setAviso({ texto: t('filmmaker.wsImport3dDone', { nombre }) });
    }
  };

  /* Guardar una ficha para reutilizarla: un Element de su clase, con su nombre, lo que dice y los materiales de sus referencias. */
  const guardarParaReutilizar = async (f: Ficha) => {
    if (!elementos?.crear) return;
    const descripcion = clase === 'personaje' ? (f as ProductionCharacter).identityDescription : (f as ProductionLocation | ProductionObject).description;
    const materiales = (f.referenceIds ?? [])
      .map((id) => produccion.references.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => !!r?.assetId)
      .slice(0, 32)
      .map((r, i) => ({ assetId: r.assetId as string, role: (i === 0 ? 'primary' : 'reference') as 'primary' | 'reference', kind: r.kind }));
    setGuardando(f.id);
    setAviso(null);
    const r = await elementos.crear({
      type: tipoDelCore(f), name: f.name,
      ...(descripcion ? { description: descripcion.slice(0, 500) } : {}),
      refs: materiales,
    });
    setGuardando(null);
    if (!r.ok) { setAviso({ texto: fraseDelMotivo(r), error: true }); return; }
    if (onGesto([cambiar(clase, f.id, { element: { elementId: r.elemento.elementId, version: r.elemento.version } })]).ok) {
      setAviso({ texto: t('filmmaker.wsSaveForReuseDone', { nombre: r.elemento.name }) });
    }
  };

  if (creando && elementos) {
    return (
      <ProductionCrearFicha
        clase={clase}
        espacio={espacio}
        onDesdeGuardado={desdeGuardado}
        onDesdeCreacion={(nombre, c, importado) => { void desdeCreacion(nombre, c, importado); }}
        guardando={guardando === 'nueva'}
        error={aviso?.error ? aviso.texto : null}
        onVolver={() => { setCreando(false); setAviso(null); }}
      />
    );
  }

  if (eligiendo && elementos) {
    return (
      <ProductionSelectorDeGuardados
        elementos={elementos}
        onElegir={(e) => { onGesto([cambiar(clase, eligiendo, { element: { elementId: e.elementId, version: e.version } })]); setEligiendo(null); }}
        onVolver={() => setEligiendo(null)}
      />
    );
  }

  const quitarFicha = async (f: Ficha) => {
    if (!(await confirmAction(t(textos.quitar, { nombre: f.name }), '', t('filmmaker.remove'), true, t))) return;
    const r = onGesto([quitar(clase, f.id)]);
    if (!r.ok && r.problems.some((p) => p.code === 'operation_blocked')) {
      if (await confirmAction(t(textos.quitar, { nombre: f.name }), t(textos.quitarTodo), t('filmmaker.remove'), true, t)) onGesto([quitar(clase, f.id, true)]);
    }
  };

  const nombreGuardado = (v: Vinculo | undefined) => (v ? elementos?.lista.find((e) => e.elementId === v.elementId)?.name : undefined);

  const sustituir = async (de: ProductionCharacter, a: ProductionCharacter) => {
    if (!(await confirmAction(
      t('filmmaker.wsCastReplaceConfirm', { de: de.name, a: a.name }),
      t('filmmaker.wsCastReplaceDetail', { de: de.name, a: a.name }),
      t('filmmaker.wsCastReplace'),
      false,
      t,
    ))) return;
    if (onGesto([{ op: 'replace_character', fromCharacterId: de.id, toCharacterId: a.id }]).ok) setSustituyendo(null);
  };

  return (
    <View style={styles.bloque}>
      {lista.length === 0 && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(textos.vacia)}</Text>}
      {!!aviso && <Text style={[styles.nota, { color: aviso.error ? theme.colors.error : theme.colors.textSecondary }]} accessibilityLiveRegion="polite">{aviso.texto}</Text>}
      {lista.map((f) => {
        const vinculo = f.element as Vinculo | undefined;
        const nombreDelVinculo = nombreGuardado(vinculo);
        const suDescripcion = clase === 'personaje' ? (f as ProductionCharacter).identityDescription : (f as ProductionLocation | ProductionObject).description;
        const abiertaEsta = abierta === f.id;
        return (
          <View key={f.id} style={[styles.ficha, { backgroundColor: theme.colors.card, borderColor: abiertaEsta ? theme.colors.accent : theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => setAbierta(abiertaEsta ? null : f.id)}
              style={[styles.cabecera, isWeb && ({ cursor: 'pointer' } as object)]}
              accessibilityRole="button"
              accessibilityState={{ expanded: abiertaEsta }}
              accessibilityLabel={t(abiertaEsta ? 'filmmaker.wsCardClose' : 'filmmaker.wsCardOpen', { nombre: f.name })}
            >
              <Ionicons name={textos.icono as any} size={scale(16)} color={theme.colors.accent} />
              <View style={styles.cabeceraTextos}>
                <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>{f.name}</Text>
                {!!suDescripcion && !abiertaEsta && <Text style={[styles.nota, { color: theme.colors.textSecondary }]} numberOfLines={2}>{suDescripcion}</Text>}
              </View>
              {!!vinculo && <Chip texto={nombreDelVinculo ? t('filmmaker.wsElementLinked', { nombre: nombreDelVinculo }) : t('filmmaker.wsElementLinkedUnknown')} icono="link-outline" tono="acento" />}
              <Ionicons name={abiertaEsta ? 'chevron-up' : 'chevron-down'} size={scale(14)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {abiertaEsta && (
              <View style={styles.dentro}>
                <CampoQueCrece
                  etiqueta={t(textos.nombre)}
                  valor={f.name}
                  maximo={LIMITES.nombre}
                  etiquetaGuardar={t('common.save')}
                  editable={editable}
                  onGuardar={(texto) => { if (texto.trim()) onGesto([cambiar(clase, f.id, { name: texto.trim() })]); }}
                />
                <CampoQueCrece
                  etiqueta={t(textos.descripcion)}
                  valor={suDescripcion ?? ''}
                  maximo={LIMITES.texto}
                  etiquetaGuardar={t('common.save')}
                  editable={editable}
                  onGuardar={(texto) => onGesto([cambiar(clase, f.id, clase === 'personaje' ? { identityDescription: texto || null } : { description: texto || null })])}
                />
                {clase === 'personaje' && (
                  <CampoQueCrece
                    etiqueta={t('filmmaker.wsCastVoice')}
                    valor={(f as ProductionCharacter).voice?.description ?? ''}
                    placeholder={t('filmmaker.wsCastVoicePlaceholder')}
                    maximo={LIMITES.frase}
                    etiquetaGuardar={t('common.save')}
                    editable={editable}
                    onGuardar={(texto) => {
                      const voz = (f as ProductionCharacter).voice;
                      const { description: _antes, ...resto } = voz ?? {};
                      void _antes;
                      const nueva = texto ? { ...resto, description: texto } : resto;
                      onGesto([cambiar(clase, f.id, { voice: Object.keys(nueva).length ? nueva : null })]);
                    }}
                  />
                )}
                {clase === 'personaje' && (
                  /* Fase 27 del motor: elegir una voz de Weë. El catálogo está vacío hasta su prueba real (Fase 19), y guardarla
                     en el personaje pide un sitio en F1-A que no tiene: se enseña cerrado y se dice. */
                  <View style={styles.acciones}>
                    <BotonPequeno icono="mic-outline" etiqueta={t('filmmaker.wsVoiceChoose')} onPress={() => undefined} disabled conTexto />
                    <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsVoiceCatalogClosed')}</Text>
                  </View>
                )}
                {/* Fase 31 del motor: la apariencia, plegada para que la ficha no se haga eterna; se dice cuántos rasgos hay. */}
                <BotonPequeno
                  icono={apariencia === f.id ? 'chevron-up' : 'color-wand-outline'}
                  etiqueta={t('filmmaker.wsAppearance', { numero: rasgosVisibles(clase, f.appearance).filter((r) => !!descripcionDelRasgo(f.appearance, r)).length })}
                  onPress={() => setApariencia(apariencia === f.id ? null : f.id)}
                  conTexto
                />
                {apariencia === f.id && (
                  <View style={styles.apariencia}>
                    <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsAppearanceNote')}</Text>
                    {rasgosVisibles(clase, f.appearance).map((r) => (
                      <CampoQueCrece
                        key={r}
                        etiqueta={t(CLAVE_DEL_RASGO[r])}
                        valor={descripcionDelRasgo(f.appearance, r) ?? ''}
                        maximo={LIMITES.frase}
                        etiquetaGuardar={t('common.save')}
                        editable={editable}
                        onGuardar={(texto) => onGesto([cambiar(clase, f.id, { appearance: conRasgo(f.appearance, r, texto) })])}
                      />
                    ))}
                  </View>
                )}
                {clase === 'personaje' && lista.length > 1 && (
                  <View style={styles.sustituir}>
                    <BotonPequeno
                      icono={sustituyendo === f.id ? 'close' : 'swap-horizontal-outline'}
                      etiqueta={t(sustituyendo === f.id ? 'filmmaker.wsCastReplaceCancel' : 'filmmaker.wsCastReplaceStart')}
                      onPress={() => setSustituyendo(sustituyendo === f.id ? null : f.id)}
                      disabled={!editable}
                      conTexto
                    />
                    {sustituyendo === f.id && (
                      <>
                        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsCastReplaceBy', { nombre: f.name })}</Text>
                        <Opciones
                          opciones={lista.filter((o) => o.id !== f.id).map((o) => ({ valor: o.id, texto: o.name }))}
                          editable={editable}
                          onElegir={(v) => {
                            const otro = lista.find((o) => o.id === v);
                            if (otro) void sustituir(f as ProductionCharacter, otro as ProductionCharacter);
                          }}
                        />
                      </>
                    )}
                  </View>
                )}
                {clase === 'lugar' && (
                  <Opciones
                    opciones={AMBIENTES.map((a) => ({ valor: a, texto: t(CLAVE_DEL_AMBIENTE[a]) }))}
                    elegida={(f as ProductionLocation).setting}
                    editable={editable}
                    onElegir={(v) => onGesto([cambiar(clase, f.id, { setting: v })])}
                  />
                )}
                {clase === 'objeto' && (
                  <Opciones
                    opciones={TIPOS_DE_OBJETO.map((k) => ({ valor: k, texto: t(CLAVE_DEL_TIPO_DE_OBJETO[k]) }))}
                    elegida={(f as ProductionObject).kind}
                    editable={editable}
                    onElegir={(v) => onGesto([cambiar(clase, f.id, { kind: v })])}
                  />
                )}
                <View style={styles.acciones}>
                  {!!elementos && (vinculo
                    ? <BotonPequeno icono="close-circle-outline" etiqueta={t('filmmaker.wsElementUnlink')} onPress={() => onGesto([cambiar(clase, f.id, { element: null })])} disabled={!editable} conTexto />
                    : <BotonPequeno icono="link-outline" etiqueta={t('filmmaker.wsElementLink')} onPress={() => setEligiendo(f.id)} disabled={!editable} conTexto />)}
                  {/* 3D dentro de Filmmaker: guardarla en la cuenta para reutilizarla (en otra producción y, mañana, en Weë Design). */}
                  {!!elementos?.crear && !vinculo && (
                    <BotonPequeno icono={capacidadDeCreacion('guardar_para_reutilizar').icono} etiqueta={guardando === f.id ? t('filmmaker.wsCreateSaving') : t('filmmaker.wsSaveForReuse')}
                      onPress={() => { void guardarParaReutilizar(f); }} disabled={!editable || guardando !== null} conTexto />
                  )}
                  {/* Su versión 3D y, en un lugar, su escena 3D: cerradas, con su porqué (ver constants/assetsDeFilmmaker.ts). */}
                  <BotonPequeno icono={capacidadDeCreacion('crear_en_3d').icono} etiqueta={t('filmmaker.wsCreateVersion3d')} onPress={() => undefined}
                    disabled porque={t(capacidadDeCreacion('crear_en_3d').porque ?? '')} conTexto />
                  {clase === 'lugar' && (
                    <BotonPequeno icono={capacidadDeCreacion('escena_3d').icono} etiqueta={t('filmmaker.wsOpenScene3d')} onPress={() => undefined}
                      disabled porque={t(capacidadDeCreacion('escena_3d').porque ?? '')} conTexto />
                  )}
                  <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.remove')} onPress={() => { void quitarFicha(f); }} disabled={!editable} conTexto />
                </View>
              </View>
            )}
          </View>
        );
      })}
      {editable && !!nuevoId && (
        <CampoQueCrece
          key={`nueva-${vuelta}`}
          etiqueta={t(textos.anadir)}
          valor=""
          placeholder={t(textos.nombre)}
          maximo={LIMITES.nombre}
          etiquetaGuardar={t(textos.anadir)}
          onGuardar={(texto) => {
            if (!texto.trim()) return;
            const id = nuevoId();
            if (onGesto([anadir(clase, id, texto.trim())]).ok) setAbierta(id);
            setVuelta((v) => v + 1);
          }}
        />
      )}
      {/* 3D dentro de Filmmaker: las otras formas de crear, en el sitio de la lista (ni una sección ni una pantalla nuevas). */}
      {editable && !!nuevoId && !!elementos && (
        <BotonPequeno icono="add-circle-outline" etiqueta={t('filmmaker.wsCreateOther')} onPress={() => { setAviso(null); setCreando(true); }} conTexto />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  ficha: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, minHeight: 44 },
  cabeceraTextos: { flex: 1, gap: 2, minWidth: 0 },
  nombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  dentro: { padding: SPACING.md, paddingTop: 0, gap: SPACING.sm },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  apariencia: { gap: SPACING.sm },
  sustituir: { gap: SPACING.xs, alignItems: 'flex-start' },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
});

export default ProductionFichas;
