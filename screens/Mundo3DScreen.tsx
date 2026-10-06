import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import CreatorShell from '../components/creator/CreatorShell';
import { Chip } from '../components/creator/ui';
import { TarjetaTresD } from '../components/creator/TarjetaTresD';
import { MUNDO_3D_EN_LA_APP } from '../constants/studioExperiences';
import { mundoService } from '../services/mundoService';
import { uploadCreatorImage } from '../services/creatorUploads';
import { newRequestId } from '../services/creditsService';
import type { AssetDoc } from '../services/assetsService';
import type { MainStackParamList } from '../navigation/MainStackNavigator';
import type { EspacioDelMundo, PeticionDeMundo3D } from '../services/escena3d';
import {
  AccionDelMundo3D,
  CLAVE_DE_ACCION,
  ENTRADA_VACIA,
  ESTADO_INICIAL,
  ErrorDelMundo3D,
  EstadoDelMundo3D,
  EventoDelMundo3D,
  avanzar,
  errorDelMundo3D,
  esDesenlaceIncierto,
  eventoDelTrabajoDeMundo,
  leerErrorDelServidor,
  palabrasQueViajan,
  peticionDelMundo3D,
  presentacionDelMundo3D,
} from '../utils/crearMundo3D';
import { notify } from '../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * «CREAR MUNDO 3D» — WEË STUDIO → 3D WORLD → CREAR MUNDO 3D.
 *
 * Se llega desde la caja del Studio, con lo escrito y la foto adjunta. Aquí no hay otra caja: lo que la persona
 * contó se enseña tal cual (para cambiarlo se vuelve al Studio), y lo único que se pregunta es si el lugar es
 * abierto o cerrado, siempre con «🤷 No sé». Después, el precio que dice el servidor, Crear, y cómo va —en cola,
 * creando, parando— hasta el mundo en «Mis creaciones».
 *
 * Toda la lógica es del compositor puro (`utils/crearMundo3D.ts`); aquí solo se conectan sus eventos con el servicio
 * (`services/mundoService.ts`, la única puerta a `generateWorld`) y se pinta lo que dice su presentación. Con la puerta
 * de la experiencia cerrada (`MUNDO_3D_EN_LA_APP`), la pantalla no llama a nada: dice que no está disponible.
 */

/* Las tres respuestas a «¿abierto o cerrado?». `null` es «No sé»: decide Weë. */
const ESPACIOS: { id: EspacioDelMundo | null; clave: string }[] = [
  { id: 'exterior', clave: 'studio.worldSpaceOutdoor' },
  { id: 'interior', clave: 'studio.worldSpaceIndoor' },
  { id: null, clave: 'studio.worldSpaceIdk' },
];

/* Mientras el trabajo puede seguir en el servidor, lo que diga la puerta manda. */
const VIVAS = new Set(['en_cola', 'generando', 'cancelando']);
/* La reserva de Credits se cierra cuando el trabajo acaba: es el momento de preguntar UNA vez cómo acabó. */
const CERRADAS = new Set(['COMPLETED', 'REFUNDED', 'FAILED']);

const sinConexion = (): ErrorDelMundo3D => ({ tipo: 'sin_conexion', clave: 'weeai.errOffline', reintentable: true });

const Mundo3DScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'Mundo3D'>>();
  const cuenta = user?.uid ?? '';

  const [estado, setEstado] = useState<EstadoDelMundo3D>(() => ({
    ...ESTADO_INICIAL,
    entrada: { ...ENTRADA_VACIA, descripcion: route.params?.descripcion ?? '' },
  }));
  /* La foto del teléfono o del navegador, todavía sin subir. Se sube al pedir el precio, no antes. */
  const [fotoLocal, setFotoLocal] = useState<string | null>(route.params?.imageUri ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [material, setMaterial] = useState<AssetDoc | null>(null);
  /* Un requestId POR INTENTO: reintentar es otra creación, y su reserva es otra. */
  const requestId = useRef<string | null>(null);
  /*
   * UN TOQUE CADA VEZ. El estado de React llega tarde: dos toques seguidos en «Crear por N Credits» verían los dos el
   * precio a la vista, y cada uno mandaría su requestId —dos reservas, dos mundos, dos cobros—. Esto se sabe al
   * instante, antes de cualquier render.
   */
  const enCamino = useRef(false);
  /*
   * LA PETICIÓN CUYO DESENLACE NO SE SABE. Tras un error que no dice si llegó (red, sin código, fallo genérico), se
   * guarda su requestId y el siguiente «Crear por N Credits» la vuelve a pedir CON ESE: el servidor reconoce la misma
   * creación (UN REQUEST = UNA GENERACIÓN = UN COBRO). En cuanto la puerta cuenta algo de ella, se suelta.
   */
  const pendiente = useRef<string | null>(null);

  const despachar = useCallback((evento: EventoDelMundo3D) => setEstado((e) => avanzar(e, evento, { cuenta })), [cuenta]);
  const presentacion = useMemo(() => presentacionDelMundo3D(estado, { cuenta }), [estado, cuenta]);

  const volver = useCallback(() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Studio')), [navigation]);

  /** Lo que contesta la puerta (crear, estado, cancelar), a la máquina. */
  const alContestar = useCallback((respuesta: unknown) => {
    const evento = eventoDelTrabajoDeMundo(respuesta as Parameters<typeof eventoDelTrabajoDeMundo>[0]);
    if (evento) despachar(evento);
  }, [despachar]);

  /**
   * Cómo va, preguntado UNA vez: «sabido» si la puerta conoce la petición, «no_existe» si no tiene rastro de ella, y
   * «sin_respuesta» si no se pudo preguntar (el trabajo, si existe, sigue en el servidor).
   */
  const preguntar = useCallback(async (id: string): Promise<'sabido' | 'no_existe' | 'sin_respuesta'> => {
    try {
      alContestar(await mundoService.estado(id));
      if (pendiente.current === id) pendiente.current = null;
      return 'sabido';
    } catch (error) {
      if (leerErrorDelServidor(error).motivo === 'no_existe') {
        if (pendiente.current === id) pendiente.current = null;
        return 'no_existe';
      }
      console.warn('3D World: no se pudo preguntar por el mundo', error);
      return 'sin_respuesta';
    }
  }, [alContestar]);

  const cotizar = useCallback(async (peticion: PeticionDeMundo3D) => {
    try {
      const q = await mundoService.cotizar(peticion);
      despachar({ tipo: 'presupuesto', creditos: q.credits });
    } catch (error) {
      despachar({ tipo: 'fallo', error: errorDelMundo3D(error) ?? sinConexion() });
    }
  }, [despachar]);

  /** Crear: subir la foto si hace falta, validar con el contrato y pedir el precio. Ni un Credit se mueve aquí. */
  const crear = useCallback(async () => {
    if (!MUNDO_3D_EN_LA_APP || enCamino.current) return;
    enCamino.current = true;
    try {
      let entrada = estado.entrada;
      if (!entrada.imagen && fotoLocal && cuenta) {
        setSubiendo(true);
        try {
          entrada = { ...entrada, imagen: { tipo: 'storage', url: await uploadCreatorImage(cuenta, fotoLocal) } };
        } catch (error) {
          console.warn('3D World: no se pudo subir la foto', error);
          notify(t('studio.worldUploadFailed'));
          return;
        } finally {
          setSubiendo(false);
        }
        despachar({ tipo: 'editar', entrada });
      }
      despachar({ tipo: 'enviar' });
      const r = peticionDelMundo3D(entrada, cuenta);
      if (r.ok) await cotizar(r.peticion);
    } finally {
      enCamino.current = false;
    }
  }, [estado.entrada, fotoLocal, cuenta, despachar, cotizar, t]);

  /** Confirmar con el precio a la vista: UN requestId, UNA reserva, UNA generación. */
  const confirmar = useCallback(async () => {
    if (enCamino.current || estado.fase !== 'presupuestado' || !estado.peticion || estado.creditos === null) return;
    enCamino.current = true;
    /* Si la anterior quedó sin saberse cómo acabó, se vuelve a pedir LA MISMA; si no, una nueva. */
    const id = pendiente.current ?? newRequestId('mundo3d');
    requestId.current = id;
    despachar({ tipo: 'confirmar' });
    try {
      alContestar(await mundoService.crear(estado.peticion, id, estado.creditos));
      pendiente.current = null;
    } catch (error) {
      const fallo = errorDelMundo3D(error);
      if (fallo && !esDesenlaceIncierto(fallo)) {
        /* Un fallo cierto: no se reservó nada, o se devolvió. Reintentar es otra creación. */
        pendiente.current = null;
        despachar({ tipo: 'fallo', error: fallo });
      } else {
        /* No se sabe si llegó: se pregunta por ESA petición. Sin respuesta, se dice; y «Reintentar» la pide con el MISMO id. */
        pendiente.current = id;
        if ((await preguntar(id)) !== 'sabido') despachar({ tipo: 'fallo', error: fallo ?? sinConexion() });
      }
    } finally {
      enCamino.current = false;
    }
  }, [estado.fase, estado.peticion, estado.creditos, despachar, alContestar, preguntar]);

  const cancelar = useCallback(async () => {
    const id = requestId.current;
    if (!id) return;
    try {
      alContestar(await mundoService.cancelar(id));
    } catch (error) {
      console.warn('3D World: no se pudo pedir parar', error);
      notify(t(errorDelMundo3D(error)?.clave ?? 'weeai.errOffline'));
    }
  }, [alContestar, t]);

  const reintentar = useCallback(async () => {
    if (!estado.peticion) return;
    const peticion = estado.peticion;
    despachar({ tipo: 'reintentar' });
    await cotizar(peticion);
  }, [estado.peticion, despachar, cotizar]);

  /* Mientras el mundo se hace, se escucha su reserva; cuando se cierra, se pregunta cómo acabó. */
  const vivo = VIVAS.has(estado.fase);
  useEffect(() => {
    const id = requestId.current;
    if (!vivo || !id) return undefined;
    return mundoService.observarReserva(
      id,
      (reserva) => { if (reserva && CERRADAS.has(reserva)) void preguntar(id); },
      () => console.warn('3D World: no se pudo escuchar la reserva'),
    );
  }, [vivo, preguntar]);

  /* Al volver a la pantalla, lo que haya pasado mientras tanto. */
  useFocusEffect(useCallback(() => {
    if (vivo && requestId.current) void preguntar(requestId.current);
  }, [vivo, preguntar]));

  /* Terminado: el material de la cuenta, para su nombre, su archivo y sus derechos. */
  const assetId = estado.mundo?.assetId;
  useEffect(() => {
    let vigente = true;
    if (assetId) mundoService.material(assetId).then((m) => { if (vigente) setMaterial(m); });
    return () => { vigente = false; };
  }, [assetId]);

  const elegirFoto = useCallback(async () => {
    if (enCamino.current) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const elegido = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const foto = elegido.canceled ? null : elegido.assets?.[0];
    if (!foto?.uri) return;
    setFotoLocal(foto.uri);
    /* Otra foto es otra petición: la subida anterior ya no vale. */
    despachar({ tipo: 'editar', entrada: { ...estado.entrada, imagen: null } });
  }, [estado.entrada, despachar]);

  const elegirEspacio = useCallback((espacio: EspacioDelMundo | null) => {
    if (enCamino.current) return;
    despachar({ tipo: 'editar', entrada: { ...estado.entrada, espacio } });
  }, [estado.entrada, despachar]);

  const alPulsar = (accion: AccionDelMundo3D) => {
    switch (accion) {
      case 'crear': void crear(); break;
      case 'confirmar': void confirmar(); break;
      case 'cancelar': void cancelar(); break;
      case 'reintentar': void reintentar(); break;
      /* Cambiar es volver a lo que se puso, con lo mismo: la foto y el espacio aquí; las palabras, en el Studio. */
      case 'cambiar': despachar({ tipo: 'editar', entrada: estado.entrada }); break;
      case 'conseguir_credits': navigation.navigate('CreditStore'); break;
      case 'iniciar_sesion': navigation.navigate('Login'); break;
      case 'ver_creaciones': navigation.navigate('MisCreaciones'); break;
      case 'volver': volver(); break;
      default: break;
    }
  };

  const etiquetaDe = (accion: AccionDelMundo3D): string =>
    accion === 'confirmar' ? t(CLAVE_DE_ACCION.confirmar, { credits: presentacion.creditos ?? 0 }) : t(CLAVE_DE_ACCION[accion]);
  const PRINCIPALES: ReadonlySet<AccionDelMundo3D> = new Set(['crear', 'confirmar', 'reintentar', 'conseguir_credits', 'iniciar_sesion', 'ver_creaciones']);

  /* ── Con la puerta cerrada: ni una llamada. ───────────────────────────── */
  if (!MUNDO_3D_EN_LA_APP) {
    return (
      <CreatorShell activeId="studio" overline={t('studio.world3dTitle')} title={t('studio.xpCreateWorld')} breadcrumb="Weë Studio" onBack={volver}>
        <View style={[styles.box, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.boxTitle, { color: theme.colors.text }]}>{t('common.notAvailable')}</Text>
          <Text style={[styles.boxText, { color: theme.colors.textSecondary }]}>{t('studio.pendWorld')}</Text>
          <TouchableOpacity onPress={volver} style={[styles.button, styles.secondary, { borderColor: theme.colors.border }]} activeOpacity={0.85} accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: theme.colors.text }]}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </CreatorShell>
    );
  }

  const enReposo = estado.fase === 'quieto' || estado.fase === 'entrada_invalida';
  /* Las palabras que VIAJAN: las de la petición si ya se envió, o las de la persona recortadas como se mandarán. */
  const palabras = estado.peticion?.descripcion ?? palabrasQueViajan(estado.entrada);
  const puedeCrear = !subiendo && (presentacion.sePuedeCrear || (!!fotoLocal && !estado.entrada.imagen));
  const ocupado = presentacion.ocupado || subiendo;

  return (
    <CreatorShell activeId="studio" overline={t('studio.world3dTitle')} title={t('studio.xpCreateWorld')} breadcrumb="Weë Studio" onBack={volver}>
      <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>{t('studio.worldIntro')}</Text>

      {estado.fase === 'completado' && estado.mundo ? (
        <TarjetaTresD
          tipo="world"
          nombre={material?.name || estado.entrada.descripcion || undefined}
          derechos={material?.derechos ?? estado.mundo.derechos}
          url={mundoService.urlDe(material)}
          mimeType={material?.mimeType}
          onVerCreaciones={() => navigation.navigate('MisCreaciones')}
        />
      ) : (
        <>
          {/* ── La foto ── */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {fotoLocal ? (
              <Image source={{ uri: fotoLocal }} style={styles.foto} contentFit="cover" accessibilityIgnoresInvertColors />
            ) : (
              <Text style={[styles.boxText, { color: theme.colors.textSecondary }]}>{t('weeai.uploadToWork')}</Text>
            )}
            {enReposo && !subiendo && (
              <TouchableOpacity onPress={elegirFoto} style={[styles.button, styles.secondary, { borderColor: theme.colors.border }]} activeOpacity={0.85} accessibilityRole="button">
                <Text style={[styles.secondaryText, { color: theme.colors.text }]}>{t(fotoLocal ? 'studio.worldChangePhoto' : 'weeai.pickFromPhotos')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Lo que contó, tal cual: es contenido ── */}
          {!!palabras && (
            <View style={styles.bloque}>
              <Text style={[styles.label, { color: theme.colors.text }]}>{t('studio.worldYourWords')}</Text>
              <Text style={[styles.palabras, { color: theme.colors.textSecondary }]}>{palabras}</Text>
            </View>
          )}

          {/* ── ¿Abierto o cerrado? Siempre con «No sé» ── */}
          <View style={styles.bloque}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{t('studio.worldSpaceQuestion')}</Text>
            <View style={styles.chips}>
              {ESPACIOS.map((e) => (
                <Chip
                  key={e.clave}
                  label={t(e.clave)}
                  active={estado.entrada.espacio === e.id}
                  onPress={enReposo && !subiendo ? () => elegirEspacio(e.id) : undefined}
                />
              ))}
            </View>
          </View>
        </>
      )}

      {/* ── Cómo va ── */}
      {(subiendo || !!presentacion.claveTitulo || !!presentacion.claveMensaje) && (
        <View style={[styles.estado, { backgroundColor: theme.colors.surface }]} accessibilityLiveRegion="polite">
          {ocupado && <ActivityIndicator color={theme.colors.accent} />}
          <View style={styles.estadoTexto}>
            {(subiendo || !!presentacion.claveTitulo) && (
              <Text style={[styles.label, { color: theme.colors.text }]}>{t(subiendo ? 'weeai.uploadingPhoto' : (presentacion.claveTitulo as string))}</Text>
            )}
            {!subiendo && !!presentacion.claveMensaje && (
              <Text style={[styles.boxText, { color: theme.colors.textSecondary }]}>{t(presentacion.claveMensaje)}</Text>
            )}
          </View>
        </View>
      )}

      {/* ── Lo que se puede hacer ahora ── */}
      <View style={styles.acciones}>
        {presentacion.acciones.map((accion) => {
          const principal = PRINCIPALES.has(accion);
          const desactivada = accion === 'crear' ? !puedeCrear : false;
          return (
            <TouchableOpacity
              key={accion}
              onPress={() => alPulsar(accion)}
              disabled={desactivada}
              style={[
                styles.button,
                principal ? { backgroundColor: theme.colors.accent } : [styles.secondary, { borderColor: theme.colors.border }],
                desactivada && { opacity: 0.5 },
              ]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: desactivada }}
            >
              <Text style={principal ? styles.buttonText : [styles.secondaryText, { color: theme.colors.text }]}>{etiquetaDe(accion)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  intro: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  foto: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BORDER_RADIUS.md,
  },
  bloque: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  palabras: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
    fontStyle: 'italic',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  estado: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  estadoTexto: {
    flex: 1,
    gap: scale(2),
  },
  acciones: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  box: {
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  boxTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  boxText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  button: {
    paddingHorizontal: SPACING.lg,
    height: scale(44),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1F2937',
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
  secondary: {
    borderWidth: 1,
  },
  secondaryText: {
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
});

/* Weë AI es de la cuenta, no de un perfil: el taller se ve claro con las dos caras. */
export default enTemaClaro(Mundo3DScreen);
