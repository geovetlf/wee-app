import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IconoWee } from '../icons/IconoWee';
import { MarcaDeCredits } from '../CreditsPill';
import { NombreDeIcono } from '../icons/trazosDeWee';
import EspacioDeEscritura from '../EspacioDeEscritura';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDireccion } from '../../hooks/useDireccion';
import { useIdentidadActiva } from '../../hooks/useEContact';
import type { MyWees } from '../../hooks/useMyWees';
import { pagesService, WeePage } from '../../services/pagesService';
import { projectsService, WeeProject } from '../../services/projectsService';
import { getExperienceById } from '../../constants/weeExperiences';
import { FUNCIONES_ANADIBLES, nombreVisibleDeExperiencia } from '../../constants/myWeesDestinos';
import { EXPERIENCIAS_DE_MYWEES, MAXIMO_DE_ACCESOS, TipoDeAcceso, crearAcceso, idDeAcceso, idDePaginaDesdeTexto } from '../../utils/myWees';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * Cuántas Weë Pages públicas se piden para elegir. Es la consulta que ya hace
 * la pantalla de Weë Pages (`pagesService.publicadas`), con su mismo filtro y
 * sin índice ni regla nueva; aquí solo se pide una tanda algo mayor.
 */
const TANDA_DE_PAGINAS_PUBLICAS = 50;

/**
 * EL SELECTOR DE DESTINOS DE MYWEËS.
 *
 * Enseña lo que se puede añadir, por grupos, y cada fila se añade o se quita con
 * un toque. Todo lo que ofrece existe ya y tiene ruta: las experiencias y las
 * funciones salen de un catálogo del cliente; las páginas y los proyectos, de
 * las mismas lecturas que usan sus pantallas.
 *
 * WEË PAGES PÚBLICAS DE OTRAS PERSONAS
 * -----------------------------------
 * Las Weë Pages son públicas por naturaleza. Aquí se pueden elegir de dos maneras,
 * las dos con lecturas que las reglas ya permiten:
 *
 *  · de la lista de páginas publicadas (`pagesService.publicadas`), que se
 *    filtra en el dispositivo por nombre o @usuario mientras se escribe;
 *  · pegando el enlace de una página (o su identificador): se lee esa página con
 *    `pagesService.leer`, la misma lectura con la que se abre.
 *
 * Añadir una página no la copia ni concede nada: guarda su identificador, y el
 * acceso abre la página original como la abre cualquiera.
 */
interface Props {
  visible: boolean;
  onClose: () => void;
  myWees: MyWees;
}

type Fila = { tipo: TipoDeAcceso; ref: string; nombre: string; detalle?: string; icono: NombreDeIcono; titulo?: string };

const SelectorDeDestinos: React.FC<Props> = ({ visible, onClose, myWees }) => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  const { user } = useAuth();
  const { nombreLista } = useIdentidadActiva();

  const [mias, setMias] = useState<WeePage[] | null>(null);
  const [publicas, setPublicas] = useState<WeePage[] | null>(null);
  const [proyectos, setProyectos] = useState<WeeProject[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  /* La página encontrada por su enlace: `null` mientras no se ha buscado, `false` si no existe o no es pública. */
  const [porEnlace, setPorEnlace] = useState<WeePage | false | null>(null);
  const [buscandoEnlace, setBuscandoEnlace] = useState(false);

  /* Se lee al abrir, no al montar: el selector está montado con la pantalla y casi nunca se abre. */
  useEffect(() => {
    if (!visible || !user) return;
    let vigente = true;
    setFallo(false);
    const cuenta = user.uid;
    void Promise.allSettled([
      pagesService.mias(cuenta),
      pagesService.publicadas(TANDA_DE_PAGINAS_PUBLICAS),
      projectsService.list(cuenta),
    ]).then(([a, b, c]) => {
      if (!vigente) return;
      setMias(a.status === 'fulfilled' ? a.value : []);
      setPublicas(b.status === 'fulfilled' ? b.value.filter((p) => p.ownerAccountId !== cuenta) : []);
      setProyectos(c.status === 'fulfilled' ? c.value : []);
      setFallo(a.status === 'rejected' || b.status === 'rejected' || c.status === 'rejected');
    });
    return () => {
      vigente = false;
    };
  }, [visible, user]);

  useEffect(() => {
    if (visible) return;
    setBusqueda('');
    setPorEnlace(null);
  }, [visible]);

  /* La búsqueda, sobre lo ya leído: nombre o @usuario que contengan lo escrito. Sin consulta nueva por cada letra. */
  const publicasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase().replace(/^@/, '');
    if (!publicas) return [];
    if (!q) return publicas;
    return publicas.filter((p) => p.name.toLocaleLowerCase().includes(q) || p.handle.toLocaleLowerCase().includes(q));
  }, [publicas, busqueda]);

  /* ¿Lo escrito parece el enlace o el id de una página? Solo entonces se ofrece leerla. */
  const idEscrito = useMemo(() => {
    const id = idDePaginaDesdeTexto(busqueda);
    return id && /[/]|^[A-Za-z0-9_-]{16,}$/.test(busqueda.trim()) ? id : null;
  }, [busqueda]);

  useEffect(() => setPorEnlace(null), [idEscrito]);

  const buscarPorEnlace = async () => {
    if (!idEscrito || buscandoEnlace) return;
    setBuscandoEnlace(true);
    try {
      const pagina = await pagesService.leer(idEscrito);
      /* Solo lo PUBLICADO es público. Un borrador propio se añade desde «Mis Weë Pages». */
      setPorEnlace(pagina && pagina.status === 'published' ? pagina : false);
    } catch {
      setPorEnlace(false);
    } finally {
      setBuscandoEnlace(false);
    }
  };

  const lleno = myWees.accesos.length >= MAXIMO_DE_ACCESOS;

  const alternar = (f: Fila) => {
    const id = idDeAcceso(f.tipo, f.ref);
    if (myWees.tiene(id)) return myWees.quitar(id);
    myWees.anadir(crearAcceso(f.tipo, f.ref, f.titulo, Date.now()));
  };

  const fila = (f: Fila) => {
    const puesto = myWees.tiene(idDeAcceso(f.tipo, f.ref));
    const apagada = !puesto && lleno;
    return (
      <TouchableOpacity
        key={`${f.tipo}:${f.ref}`}
        onPress={() => alternar(f)}
        disabled={apagada}
        style={[styles.fila, { borderColor: puesto ? theme.colors.interactionBorder : theme.colors.border, backgroundColor: puesto ? theme.colors.interactionSoft : theme.colors.card, opacity: apagada ? 0.4 : 1 }]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: puesto, disabled: apagada }}
        aria-pressed={puesto}
        accessibilityLabel={puesto ? t('mywees.remove', { nombre: f.nombre }) : `${t('mywees.add')}: ${f.nombre}`}
      >
        {f.icono === 'credits' ? (
          <MarcaDeCredits size={scale(13)} color={theme.colors.interaction} style={styles.filaMarca} />
        ) : (
          <IconoWee name={f.icono} size={scale(20)} color={theme.colors.interaction} />
        )}
        <View style={styles.filaTextos}>
          <Text style={[styles.filaNombre, dir.texto, { color: theme.colors.text }]} numberOfLines={2}>{f.nombre}</Text>
          {f.detalle ? <Text style={[styles.filaDetalle, dir.texto, { color: theme.colors.textSecondary }]} numberOfLines={1}>{f.detalle}</Text> : null}
        </View>
        <Ionicons name={puesto ? 'checkmark-circle' : 'add-circle-outline'} size={scale(22)} color={puesto ? theme.colors.interaction : theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const deUnaPagina = (p: WeePage): Fila => ({ tipo: 'pagina', ref: p.id, nombre: p.name || `@${p.handle}`, detalle: p.handle ? `@${p.handle}` : undefined, icono: 'documento', titulo: p.name || p.handle });

  const grupo = (titulo: string) => (
    <Text style={[styles.grupo, dir.texto, { color: theme.colors.textSecondary }]} accessibilityRole="header">{titulo}</Text>
  );
  const nota = (texto: string) => <Text style={[styles.nota, dir.texto, { color: theme.colors.textSecondary }]}>{texto}</Text>;
  const rueda = <ActivityIndicator size="small" color={theme.colors.accent} style={styles.rueda} accessibilityLabel={t('common.loading')} />;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.velo, { backgroundColor: theme.colors.backdrop }]}>
        <SafeAreaView style={[styles.hoja, dir.contenedor, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
          <View style={[styles.cabecera, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.titulo, dir.texto, { color: theme.colors.text }]} numberOfLines={1} accessibilityRole="header">{t('mywees.add')}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.listo, { backgroundColor: theme.colors.interactionSoft }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.done')}>
              <Text style={[styles.listoTexto, { color: theme.colors.interaction }]}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          {/* El buscador de páginas va a media hoja: el teclado se acomoda como en el resto de Weë (EspacioDeEscritura). */}
          <EspacioDeEscritura style={styles.cuerpo}>
          <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
            {fallo ? <Text style={[styles.nota, dir.texto, { color: theme.colors.error }]} accessibilityRole="alert">{t('common.somethingWentWrong')}</Text> : null}

            {grupo(t('mywees.groupExperiences'))}
            {EXPERIENCIAS_DE_MYWEES.map((id) => {
              const exp = getExperienceById(id);
              return fila({ tipo: 'experiencia', ref: id, nombre: nombreVisibleDeExperiencia(id, exp?.name ?? id), icono: exp?.icono ?? 'capas' });
            })}

            {grupo(t('mywees.groupFeatures'))}
            {/* La agenda es la del perfil activo: ËContact con el Perfil Real, ẄContact con el Perfil Weë. Nunca las dos. */}
            {FUNCIONES_ANADIBLES.map((f) => fila({ tipo: 'funcion', ref: f.id, nombre: f.clave ? t(f.clave) : nombreLista, icono: f.icono }))}

            {grupo(t('mywees.groupMyPages'))}
            {mias === null ? rueda : mias.length === 0 ? nota(t('common.noResults')) : mias.map((p) => fila(deUnaPagina(p)))}

            {grupo(t('mywees.groupPublicPages'))}
            <View style={[styles.buscador, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="search" size={scale(18)} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.buscadorTexto, dir.texto, { color: theme.colors.text }]}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder={t('mywees.searchPages')}
                placeholderTextColor={theme.colors.textSecondary}
                accessibilityLabel={t('mywees.searchPages')}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={buscarPorEnlace}
              />
            </View>
            {idEscrito !== null && porEnlace === null ? (
              <TouchableOpacity onPress={buscarPorEnlace} disabled={buscandoEnlace} style={[styles.enlace, { borderColor: theme.colors.interactionBorder }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('nav.search')}>
                {buscandoEnlace ? <ActivityIndicator size="small" color={theme.colors.interaction} /> : <Ionicons name="link-outline" size={scale(18)} color={theme.colors.interaction} />}
                <Text style={[styles.enlaceTexto, dir.texto, { color: theme.colors.interaction }]}>{t('nav.search')}</Text>
              </TouchableOpacity>
            ) : null}
            {porEnlace === false ? nota(t('common.noResults')) : null}
            {porEnlace ? fila(deUnaPagina(porEnlace)) : null}
            {publicas === null
              ? rueda
              : publicasFiltradas.length > 0
                ? publicasFiltradas.filter((p) => !porEnlace || p.id !== porEnlace.id).map((p) => fila(deUnaPagina(p)))
                : porEnlace === null && !idEscrito
                  ? nota(t('common.noResults'))
                  : null}

            {grupo(t('menu.projects'))}
            {proyectos === null ? rueda : proyectos.length === 0 ? nota(t('common.noResults')) : proyectos.map((p) => fila({ tipo: 'proyecto', ref: p.id, nombre: p.name, icono: 'carpeta', titulo: p.name }))}
          </ScrollView>
          </EspacioDeEscritura>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  velo: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  hoja: {
    width: '100%',
    maxWidth: scale(640),
    height: '92%',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titulo: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  listo: { minHeight: scale(36), justifyContent: 'center', paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full },
  listoTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  cuerpo: { flex: 1 },
  contenido: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxxl },
  grupo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, marginTop: SPACING.md },
  nota: { fontSize: FONT_SIZE.sm, lineHeight: scale(19) },
  rueda: { alignSelf: 'flex-start', marginVertical: SPACING.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: scale(52),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filaMarca: { width: scale(20), textAlign: 'center' },
  filaTextos: { flex: 1, minWidth: 0 },
  filaNombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium },
  filaDetalle: { fontSize: FONT_SIZE.xs },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(46),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buscadorTexto: { flex: 1, minWidth: 0, fontSize: FONT_SIZE.base, paddingVertical: SPACING.sm },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: scale(44), paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1 },
  enlaceTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, flexShrink: 1 },
});

export default SelectorDeDestinos;
