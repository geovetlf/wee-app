import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useMisEContacts, PersonaEnAgenda } from '../hooks/useEContact';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { confirmAction, notify } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * ËCONTACT · ẄCONTACT — tu gente en Weë.
 *
 * Una conexión de Weë es MUTUA: alguien la pide y la otra parte la acepta. Esta
 * pantalla enseña las tres caras de eso, y en este orden:
 *
 *   1. Solicitudes recibidas      → lo que espera respuesta TUYA, primero
 *   2. Tus ËContacts / ẄContacts  → las conexiones hechas
 *   3. Solicitudes enviadas       → lo que espera respuesta ajena
 *
 * Lo que pide algo de ti va arriba. Lo que solo informa, debajo. Una sección sin
 * nada no se enseña.
 *
 * UNA PANTALLA, DOS AGENDAS
 * -------------------------
 * La lista es la del PERFIL ACTIVO, no la de la cuenta. Con el Perfil Real se
 * llama ËContact; con el Perfil Weë, ẄContact. Y no se mezclan nunca: son dos
 * consultas distintas con dos claves distintas. Cambiar de perfil no mueve
 * ninguna relación — cambia lo que se está mirando.
 *
 * Decidir cuál es la identidad activa, filtrar por ella y operar con ella es de
 * `useEContact`. Aquí no se toca ningún uid: se pintan personas.
 *
 * QUÉ SE VE DE UNA PERSONA
 * ------------------------
 * Su nombre y su avatar. Nunca un uid. Y debajo, con qué cara está ahí —"Perfil
 * real" o "Perfil Weë"—, porque las dos caras de alguien son dos contactos
 * distintos y hay que poder distinguirlos.
 *
 * Aceptar no lo hace esta pantalla ni el servicio: lo hace la callable
 * `acceptEContact`, en el servidor.
 */

type Seccion = 'recibidas' | 'contactos' | 'enviadas';

interface Fila {
  persona: PersonaEnAgenda;
  seccion: Seccion;
}

const EContactScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const navigation = useNavigation<any>();
  /* Toda la agenda del perfil activo, con las acciones ya atadas a él. */
  const {
    contactos,
    recibidas,
    enviadas,
    total,
    cargando,
    recargar,
    nombreLista,
    nombrePlural,
    hayAgenda,
    motivo,
    aceptar,
    rechazar,
    cancelar,
    eliminar,
  } = useMisEContacts();

  const [refrescando, setRefrescando] = useState(false);
  /* Sobre quién se está trabajando ahora mismo: evita el doble toque. */
  const [ocupado, setOcupado] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  }, [recargar]);

  /*
   * Una sola puerta para las cuatro acciones: bloquear a esa persona, hacerlo,
   * recargar y soltar. Si falla, se dice y se recarga igual, para que la lista
   * nunca enseñe algo que ya no es verdad.
   */
  const ejecutar = async (identidad: string, hacer: () => Promise<void>) => {
    if (ocupado) return;
    setOcupado(identidad);
    try {
      await hacer();
    } catch (error) {
      notify(t('econtact.failed'), error instanceof Error ? error.message : undefined);
    } finally {
      await recargar();
      setOcupado(null);
    }
  };

  const preguntar = async (titulo: string, mensaje: string, identidad: string, hacer: () => Promise<void>) => {
    if (await confirmAction(titulo, mensaje, t('common.yes'), true, t)) await ejecutar(identidad, hacer);
  };

  const abrirPerfil = (identidad: string) => navigation.navigate('UserProfile', { userId: identidad });

  const secciones = useMemo(() => {
    const armar = (personas: PersonaEnAgenda[], seccion: Seccion): Fila[] =>
      personas.map((persona) => ({ persona, seccion }));

    return [
      { key: 'recibidas' as const, titulo: t('econtact.requestsReceived'), data: armar(recibidas, 'recibidas') },
      { key: 'contactos' as const, titulo: t('econtact.yours', { lista: nombrePlural }), data: armar(contactos, 'contactos') },
      { key: 'enviadas' as const, titulo: t('econtact.requestsSent'), data: armar(enviadas, 'enviadas') },
    ].filter((s) => s.data.length > 0);
  }, [recibidas, contactos, enviadas, nombrePlural]);

  // ─── Piezas ────────────────────────────────────────────────────────────────

  const Accion: React.FC<{ etiqueta: string; icono: any; relleno?: boolean; onPress: () => void; ocupada: boolean }> = ({
    etiqueta,
    icono,
    relleno,
    onPress,
    ocupada,
  }) => (
    <TouchableOpacity
      style={[
        styles.accion,
        {
          backgroundColor: relleno ? theme.colors.accent : 'transparent',
          borderColor: relleno ? theme.colors.accent : theme.colors.border,
        },
      ]}
      onPress={onPress}
      disabled={ocupada}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      {ocupada ? (
        <ActivityIndicator size="small" color={relleno ? '#fff' : theme.colors.textSecondary} />
      ) : (
        <Ionicons name={icono} size={scale(18)} color={relleno ? '#fff' : theme.colors.text} />
      )}
    </TouchableOpacity>
  );

  const renderFila = ({ item }: { item: Fila }) => {
    const { persona, seccion } = item;
    const { perfil, identidad, etiqueta, tipo } = persona;
    const ocupada = ocupado === identidad;
    const nombre = perfil.displayName;

    /*
     * La segunda línea dice con QUÉ CARA está ahí esa persona. En las recibidas
     * se completa con lo que está pidiendo, para que la solicitud se lea entera
     * sin abrir nada.
     */
    const detalle = seccion === 'recibidas' ? t('econtact.wantsToConnect', { lista: etiqueta }) : etiqueta;

    return (
      <View style={[styles.fila, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.persona}
          onPress={() => abrirPerfil(identidad)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('econtact.openProfile', { etiqueta: etiqueta.toLowerCase(), nombre })}
        >
          <AvatarDisplay
            avatarType={perfil.avatarType}
            avatarId={perfil.avatarId}
            photoURL={perfil.photoURLThumbnail || perfil.photoURL}
            size={scale(44)}
          />
          <View style={styles.textos}>
            <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>
              {nombre}
            </Text>
            <Text
              style={[
                styles.detalle,
                { color: tipo === 'wee' ? theme.colors.accent : theme.colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {detalle}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.acciones}>
          {seccion === 'recibidas' && (
            <>
              <Accion
                etiqueta={t('econtact.accept', { nombre })}
                icono="checkmark"
                relleno
                ocupada={ocupada}
                onPress={() => ejecutar(identidad, () => aceptar(identidad))}
              />
              <Accion
                etiqueta={t('econtact.reject', { nombre })}
                icono="close"
                ocupada={ocupada}
                onPress={() =>
                  preguntar(t('econtact.rejectTitle'), t('econtact.rejectConfirm', { nombre }), identidad, () =>
                    rechazar(identidad)
                  )
                }
              />
            </>
          )}

          {seccion === 'contactos' && (
            <Accion
              etiqueta={t('econtact.removeFrom', { nombre, lista: nombrePlural })}
              icono="person-remove-outline"
              ocupada={ocupada}
              onPress={() =>
                preguntar(
                  t('econtact.removeTitle', { lista: nombreLista }),
                  t('econtact.removeConfirm', { nombre, lista: nombrePlural }),
                  identidad,
                  () => eliminar(identidad)
                )
              }
            />
          )}

          {seccion === 'enviadas' && (
            <Accion
              etiqueta={t('econtact.withdraw', { nombre })}
              icono="time-outline"
              ocupada={ocupada}
              onPress={() =>
                preguntar(t('econtact.withdrawTitle'), t('econtact.withdrawConfirm', { nombre }), identidad, () =>
                  cancelar(identidad)
                )
              }
            />
          )}
        </View>
      </View>
    );
  };

  /*
   * Tres vacíos, porque son tres cosas distintas: no has entrado, tu perfil
   * activo no tiene agenda, o todavía no tienes a nadie. Con el mismo texto en
   * los tres casos, alguien se quedaría mirando una pantalla que no explica por
   * qué está vacía.
   */
  const renderVacio = () => {
    const contenido =
      motivo === 'sin-sesion'
        ? {
            titulo: t('econtact.yoursWhenYouSignIn', { lista: nombrePlural }),
            texto: `${nombreLista} guarda tus conexiones de Weë. Inicia sesión para verlas.`,
          }
        : motivo === 'perfil-sin-agenda'
          ? {
              titulo: t('econtact.noAgenda'),
              texto:
                'ËContact y ẄContact son las conexiones entre personas. Cambia a tu Perfil Real o a tu Perfil Weë para verlas.',
            }
          : {
              titulo: t('econtact.noneYet', { lista: nombrePlural }),
              texto:
                'Aquí estará tu gente en Weë. Una conexión se hace entre dos: una persona la propone y la otra acepta.',
            };

    return (
      <View style={styles.vacio}>
        <Text style={styles.vacioEmoji}>🤝</Text>
        <Text style={[styles.vacioTitulo, { color: theme.colors.text }]}>{contenido.titulo}</Text>
        <Text style={[styles.vacioTexto, { color: theme.colors.textSecondary }]}>{contenido.texto}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.volver}
          activeOpacity={0.7}
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={scale(23)} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextos}>
          {/* El título es el de la identidad activa: ËContact o ẄContact. */}
          <Text style={[styles.headerTitulo, { color: theme.colors.text }]}>🤝 {nombreLista}</Text>
          {!cargando && hayAgenda && total > 0 && (
            <Text style={[styles.headerSubtitulo, { color: theme.colors.textSecondary }]}>
              {t('econtact.count', { contador: total, lista: total === 1 ? nombreLista : nombrePlural })}
            </Text>
          )}
        </View>
      </View>

      {cargando && hayAgenda ? (
        <View style={styles.cargando}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(item) => `${item.seccion}_${item.persona.identidad}`}
          renderItem={renderFila}
          renderSectionHeader={({ section }) => (
            <View style={[styles.seccion, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.seccionTitulo, { color: theme.colors.textSecondary }]}>{section.titulo}</Text>
              <Text style={[styles.seccionCuenta, { color: theme.colors.textSecondary }]}>{section.data.length}</Text>
            </View>
          )}
          ListEmptyComponent={renderVacio}
          contentContainerStyle={secciones.length === 0 ? styles.listaVacia : styles.lista}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={theme.colors.accent} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  volver: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextos: {
    flex: 1,
    minWidth: 0,
  },
  headerTitulo: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
  },
  headerSubtitulo: {
    fontSize: FONT_SIZE.sm,
  },
  lista: {
    paddingBottom: SPACING.xl,
  },
  listaVacia: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  seccionTitulo: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  seccionCuenta: {
    fontSize: FONT_SIZE.sm,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    /* Objetivo táctil cómodo, sin scale(): en web multiplicaría por 0,9. */
    minHeight: 64,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  persona: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minWidth: 0,
  },
  textos: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  detalle: {
    fontSize: FONT_SIZE.sm,
  },
  acciones: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  accion: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  vacioEmoji: {
    fontSize: scale(44),
  },
  vacioTitulo: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  vacioTexto: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
    lineHeight: scale(22),
  },
});

export default EContactScreen;
