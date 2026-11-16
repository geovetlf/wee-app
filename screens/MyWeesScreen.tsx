import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import IconoDireccional from '../components/IconoDireccional';
import { IconoWee } from '../components/icons/IconoWee';
import { MarcaDeCredits } from '../components/CreditsPill';
import { RellenoDeMarca } from '../components/GradienteDeMarca';
import SelectorDeDestinos from '../components/mywees/SelectorDeDestinos';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useDireccion } from '../hooks/useDireccion';
import { useIdentidadActiva } from '../hooks/useEContact';
import { useMyWees } from '../hooks/useMyWees';
import { pagesService } from '../services/pagesService';
import { projectsService } from '../services/projectsService';
import { pintarAcceso } from '../constants/myWeesDestinos';
import { NombreDeIcono } from '../components/icons/trazosDeWee';
import { AccesoDeMyWees, destinoDeAcceso } from '../utils/myWees';
import { confirmAction } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * MYWEËS — el organizador personal de accesos directos.
 *
 * Empieza VACÍO, siempre: no trae nada puesto ni recomienda nada. La persona
 * añade accesos a destinos que ya existen —las experiencias, funciones de Weë,
 * sus Weë Pages, Weë Pages públicas de otras personas, sus proyectos— y los
 * ordena. Tocar uno abre el destino ORIGINAL por su ruta de siempre.
 *
 * Lo que esta pantalla NO hace: crear, copiar ni modificar nada de lo que hay
 * detrás de un acceso; conceder permisos; guardar nada fuera del dispositivo.
 * Quitar un acceso lo quita de la lista y nada más.
 *
 * La organización es del perfil activo de la cuenta (`useMyWees`): la del Perfil
 * Real y la del Perfil Weë son dos listas distintas.
 */

/** Lo que se sabe de un destino que vive en el servidor (una página, un proyecto). */
type Estado = { disponible: boolean | null; nombre?: string };

/** ¿El servidor dijo que no se puede leer? Una página que dejó de ser pública contesta así. */
const esPermisoDenegado = (error: unknown): boolean => /permission-denied|insufficient permissions/i.test(String((error as { code?: string; message?: string })?.code ?? '') + String((error as { message?: string })?.message ?? ''));

const MyWeesScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { nombreLista } = useIdentidadActiva();
  const myWees = useMyWees();
  const { accesos, cargando, disponible, sinGuardar, recargar } = myWees;

  /* «Personalizar» del menú llega con `personalizar`: la pantalla abre ya en modo de organizar. */
  const [organizando, setOrganizando] = useState<boolean>(!!route.params?.personalizar);
  const [selector, setSelector] = useState(false);
  const [estados, setEstados] = useState<Record<string, Estado>>({});

  /* Al volver de un destino —una Weë Page pudo añadirse o quitarse desde su propia pantalla— se vuelve a leer lo guardado. */
  useFocusEffect(useCallback(() => recargar(), [recargar]));

  /*
   * ¿SIGUE EXISTIENDO CADA DESTINO?
   *
   * Las experiencias y las funciones son de la app: existen siempre. Una página
   * o un proyecto pueden haberse borrado, o la página haber dejado de ser
   * pública. Se pregunta con las MISMAS lecturas que usan sus pantallas
   * (`pagesService.leer`, `projectsService.get`): ni consultas ni reglas nuevas.
   *
   *  · existe → se pinta con su nombre de hoy;
   *  · no existe, o el servidor niega la lectura → «No disponible», y se puede quitar;
   *  · no se pudo preguntar (sin red) → no se afirma nada: se pinta con el
   *    nombre guardado y abrirlo dirá lo que haya.
   */
  const porComprobar = useMemo(() => accesos.filter((a) => a.tipo === 'pagina' || a.tipo === 'proyecto').map((a) => a.id).join('|'), [accesos]);
  useEffect(() => {
    let vigente = true;
    const pendientes = accesos.filter((a) => (a.tipo === 'pagina' || a.tipo === 'proyecto') && estados[a.id] === undefined);
    if (pendientes.length === 0) return;
    void Promise.all(
      pendientes.map(async (a): Promise<[string, Estado]> => {
        try {
          if (a.tipo === 'pagina') {
            const pagina = await pagesService.leer(a.ref);
            return [a.id, pagina ? { disponible: true, nombre: pagina.name } : { disponible: false }];
          }
          const proyecto = await projectsService.get(a.ref);
          return [a.id, proyecto ? { disponible: true, nombre: proyecto.name } : { disponible: false }];
        } catch (error) {
          return [a.id, { disponible: esPermisoDenegado(error) ? false : null }];
        }
      }),
    ).then((pares) => {
      if (vigente) setEstados((previos) => ({ ...previos, ...Object.fromEntries(pares) }));
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porComprobar]);

  /** Nombre e icono de un acceso, resueltos al pintar. Lo que es marca no se traduce; lo que escribió una persona, tampoco. */
  const pintar = (a: AccesoDeMyWees): { nombre: string; icono?: NombreDeIcono; detalle: string } =>
    pintarAcceso(a, t, nombreLista, estados[a.id]?.nombre);

  const abrir = (a: AccesoDeMyWees) => {
    const destino = destinoDeAcceso(a);
    if (!destino) return;
    if (destino.pideCuenta && !user) return navigation.navigate('Login');
    navigation.navigate(destino.ruta, destino.params);
  };

  const pedirRestaurar = async () => {
    const ok = await confirmAction(t('mywees.restore'), t('mywees.restoreConfirm'), t('mywees.restore'), true, t);
    if (!ok) return;
    myWees.restaurar();
    setOrganizando(false);
  };

  const cabecera = (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.botonDeCabecera} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.back')}>
        <IconoDireccional name="arrow-back" size={scale(23)} color={theme.colors.text} />
      </TouchableOpacity>
      {/* MyWeës es marca: se escribe igual en todos los idiomas. */}
      <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1} accessibilityRole="header">{t('menu.myWees')}</Text>
      {disponible && accesos.length > 0 && (
        <TouchableOpacity
          onPress={() => setOrganizando((v) => !v)}
          style={[styles.pastilla, { borderColor: theme.colors.interactionBorder, backgroundColor: organizando ? theme.colors.interactionSoft : 'transparent' }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: organizando }}
          aria-pressed={organizando}
          accessibilityLabel={organizando ? t('common.done') : t('menu.customize')}
        >
          <Ionicons name={organizando ? 'checkmark' : 'options-outline'} size={scale(16)} color={theme.colors.interaction} />
          <Text style={[styles.pastillaTexto, dir.texto, { color: theme.colors.interaction }]} numberOfLines={1}>
            {organizando ? t('common.done') : t('menu.customize')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  /* Sin sesión no hay MyWeës: es de una cuenta y de un perfil. Se dice, y se ofrece entrar. */
  if (!disponible) {
    return (
      <SafeAreaView style={[styles.contenedor, dir.contenedor, { backgroundColor: theme.colors.background }]} edges={['top']}>
        {cabecera}
        <View style={styles.vacio}>
          <IconoWee name="capas" size={scale(44)} color={theme.colors.interaction} />
          <Text style={[styles.vacioTitulo, dir.texto, { color: theme.colors.text }]}>{t('mywees.emptyTitle')}</Text>
          <Text style={[styles.vacioTexto, dir.texto, { color: theme.colors.textSecondary }]}>{t('auth.signInToContinue')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={[styles.botonPrincipal, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityRole="button">
            <RellenoDeMarca radio={BORDER_RADIUS.full} />
            <Text style={[styles.botonPrincipalTexto, { color: theme.colors.onPrimary }]}>{t('menu.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.contenedor, dir.contenedor, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {cabecera}

      {cargando ? (
        <View style={styles.vacio} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : accesos.length === 0 ? (
        /*
          EL ESTADO VACÍO ES EL DE PARTIDA, NO UN ERROR. Dice qué es esto, que se
          llena a gusto de cada persona, y ofrece el primer paso. Nada precargado.
        */
        <ScrollView contentContainerStyle={styles.vacio}>
          <View style={[styles.vacioIcono, { backgroundColor: theme.colors.interactionSoft }]}>
            <IconoWee name="capas" size={scale(40)} color={theme.colors.interaction} />
          </View>
          <Text style={[styles.vacioTitulo, dir.texto, { color: theme.colors.text }]}>{t('mywees.emptyTitle')}</Text>
          <Text style={[styles.vacioTexto, dir.texto, { color: theme.colors.textSecondary }]}>{t('mywees.emptyHint')}</Text>
          <TouchableOpacity onPress={() => setSelector(true)} style={[styles.botonPrincipal, { backgroundColor: theme.colors.accent }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('mywees.add')}>
            <RellenoDeMarca radio={BORDER_RADIUS.full} />
            <Ionicons name="add" size={scale(20)} color={theme.colors.onPrimary} />
            <Text style={[styles.botonPrincipalTexto, { color: theme.colors.onPrimary }]}>{t('mywees.add')}</Text>
          </TouchableOpacity>
          <Text style={[styles.aviso, dir.texto, { color: theme.colors.textSecondary }]}>{t('mywees.localNotice')}</Text>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.lista} keyboardShouldPersistTaps="handled">
          {sinGuardar && (
            <Text style={[styles.error, dir.texto, { color: theme.colors.error }]} accessibilityRole="alert">{t('mywees.saveFailed')}</Text>
          )}
          {accesos.map((a, i) => {
            const p = pintar(a);
            const noDisponible = estados[a.id]?.disponible === false;
            return (
              <View key={a.id} style={[styles.fila, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                <TouchableOpacity
                  style={styles.filaToque}
                  onPress={() => abrir(a)}
                  disabled={noDisponible || organizando}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: noDisponible || organizando }}
                  accessibilityLabel={noDisponible ? `${p.nombre}, ${t('common.notAvailable')}` : p.nombre}
                >
                  <View style={[styles.filaIcono, { backgroundColor: theme.colors.interactionSoft, opacity: noDisponible ? 0.5 : 1 }]}>
                    {p.icono === 'credits' ? (
                      <MarcaDeCredits size={scale(14)} color={theme.colors.interaction} />
                    ) : (
                      <IconoWee name={p.icono ?? 'capas'} size={scale(20)} color={theme.colors.interaction} />
                    )}
                  </View>
                  <View style={styles.filaTextos}>
                    <Text style={[styles.filaNombre, dir.texto, { color: noDisponible ? theme.colors.textSecondary : theme.colors.text }]} numberOfLines={2}>{p.nombre}</Text>
                    <Text style={[styles.filaDetalle, dir.texto, { color: noDisponible ? theme.colors.error : theme.colors.textSecondary }]} numberOfLines={1}>
                      {noDisponible ? t('common.notAvailable') : p.detalle}
                    </Text>
                  </View>
                </TouchableOpacity>

                {organizando ? (
                  /*
                    REORDENAR SIN ARRASTRAR. Subir y bajar son dos botones: sirven
                    con el dedo, con el teclado y con el lector de pantalla, y no
                    dependen del sentido de lectura —la lista es vertical—. Cada uno
                    dice a quién mueve; en los extremos se apagan.
                  */
                  <View style={styles.acciones}>
                    <TouchableOpacity onPress={() => myWees.mover(a.id, -1)} disabled={i === 0} style={[styles.accion, i === 0 && styles.accionApagada]} hitSlop={6} accessibilityRole="button" accessibilityState={{ disabled: i === 0 }} accessibilityLabel={t('mywees.moveUp', { nombre: p.nombre })}>
                      <Ionicons name="chevron-up" size={scale(20)} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => myWees.mover(a.id, 1)} disabled={i === accesos.length - 1} style={[styles.accion, i === accesos.length - 1 && styles.accionApagada]} hitSlop={6} accessibilityRole="button" accessibilityState={{ disabled: i === accesos.length - 1 }} accessibilityLabel={t('mywees.moveDown', { nombre: p.nombre })}>
                      <Ionicons name="chevron-down" size={scale(20)} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => myWees.quitar(a.id)} style={styles.accion} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('mywees.remove', { nombre: p.nombre })}>
                      <Ionicons name="close" size={scale(20)} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : noDisponible ? (
                  /* Un destino que ya no existe se puede quitar sin entrar a organizar. */
                  <TouchableOpacity onPress={() => myWees.quitar(a.id)} style={styles.accion} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('mywees.remove', { nombre: p.nombre })}>
                    <Ionicons name="close" size={scale(20)} color={theme.colors.error} />
                  </TouchableOpacity>
                ) : (
                  <IconoDireccional name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
                )}
              </View>
            );
          })}

          <TouchableOpacity onPress={() => setSelector(true)} style={[styles.anadir, { borderColor: theme.colors.interactionBorder }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('mywees.add')}>
            <Ionicons name="add" size={scale(20)} color={theme.colors.interaction} />
            <Text style={[styles.anadirTexto, dir.texto, { color: theme.colors.interaction }]}>{t('mywees.add')}</Text>
          </TouchableOpacity>

          {organizando && (
            <TouchableOpacity onPress={pedirRestaurar} style={styles.restaurar} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('mywees.restore')}>
              <Text style={[styles.restaurarTexto, dir.texto, { color: theme.colors.error }]}>{t('mywees.restore')}</Text>
            </TouchableOpacity>
          )}

          {/* El aviso, discreto y siempre: esto vive en este dispositivo. No se promete nube. */}
          <Text style={[styles.aviso, dir.texto, { color: theme.colors.textSecondary }]}>{t('mywees.localNotice')}</Text>
        </ScrollView>
      )}

      <SelectorDeDestinos visible={selector} onClose={() => setSelector(false)} myWees={myWees} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  botonDeCabecera: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    minHeight: scale(36),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    flexShrink: 1,
  },
  pastillaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, flexShrink: 1 },
  vacio: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, gap: SPACING.md },
  vacioIcono: { width: scale(84), height: scale(84), borderRadius: scale(42), alignItems: 'center', justifyContent: 'center' },
  vacioTitulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, textAlign: 'center' },
  vacioTexto: { fontSize: FONT_SIZE.base, lineHeight: scale(22), textAlign: 'center', maxWidth: scale(360) },
  botonPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    minHeight: scale(46),
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  botonPrincipalTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  aviso: { fontSize: FONT_SIZE.xs, lineHeight: scale(18), textAlign: 'center', marginTop: SPACING.lg, maxWidth: scale(420), alignSelf: 'center' },
  error: { fontSize: FONT_SIZE.sm, textAlign: 'center', marginBottom: SPACING.xs },
  lista: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: scale(120), width: '100%', maxWidth: scale(720), alignSelf: 'center' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(60),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filaToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minWidth: 0 },
  filaIcono: { width: scale(40), height: scale(40), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  filaTextos: { flex: 1, minWidth: 0, gap: scale(1) },
  filaNombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium },
  filaDetalle: { fontSize: FONT_SIZE.xs },
  acciones: { flexDirection: 'row', alignItems: 'center' },
  accion: { minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  accionApagada: { opacity: 0.25 },
  anadir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    minHeight: scale(48),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: SPACING.xs,
  },
  anadirTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium },
  restaurar: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  restaurarTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
});

export default MyWeesScreen;
