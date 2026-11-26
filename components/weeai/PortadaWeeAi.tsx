import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NombreDeIcono } from '../icons/trazosDeWee';
import { IconoWee } from '../icons/IconoWee';
import { CabeceraDePortada } from './CabeceraDePortada';
import { HeroDePortada } from './HeroDePortada';
import { PuertasDePortada, PuertaDePortada, ALTO_DE_PUERTA, HUECO_DE_PUERTAS } from './PuertasDePortada';
import CajaDePrompt, { AccionDeLaCaja } from '../creator/CajaDePrompt';
import { CajaAnclada } from '../creator/CajaQueCrece';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { useDireccion } from '../../hooks/useDireccion';
import { useBorradores } from '../../hooks/useBorradores';
import { dejarFotoPendiente } from '../../utils/fotoPendiente';
import { MAX_WEEL_SEC } from '../../utils/publicacionDeWeeAi';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SPACING } from '../../constants/estiloWeeAi';

const ANCHO_MAXIMO = 760;
/** Lo que mide la cabecera y lo mínimo que se reserva al hero cuando la caja crece. */
const ALTO_DE_CABECERA = 56;
const ALTO_MINIMO_DEL_HERO = 70;
/** Aire entre la caja y las puertas. */
const AIRE = 12;
/** Holgura constante entre lo último y la barra inferior (>= 16 dp en cualquier altura). */
const HOLGURA_SOBRE_LA_BARRA = 20;
/** Lo que mide la caja vacía con sus botones; las puertas y el hero se reparten lo que queda. */
const ALTO_DE_LA_CAJA_VACIA = 112;
/** La fila de píldoras discretas (Borradores) cuando hay algo que enseñar. */
const ALTO_DE_DISCRETOS = 48;
const ALTO_DE_PUERTAS_EN_FILA = 170;

/**
 * LA PORTADA DE WEËAI SENCILLA (boceto aprobado por el dueño, 2026-11-23) — PANTALLA FIJA: cabecera, hero, la caja común y
 * TRES puertas para publicar —Imagen, Video corto y Editar mi foto— caben siempre en una pantalla, sin desplazarse.
 *
 * Lo que cambia frente a la v2: la rejilla de ocho módulos pasa a tres puertas en filas a lo ancho (en escritorio, en fila);
 * Filmmaker y Music no aparecen (archivados, docs/ARCHIVO.md) y la caja pierde el botón de Audio. El «+» de la caja ya no está
 * en «Próximamente»: adjunta una foto y lleva a «Editar mi foto». Escribir y enviar sin elegir nada sigue yendo a Weë Brain;
 * con Imagen o Video marcados, va a crear eso mismo con la idea ya escrita. Debajo, la píldora discreta de Borradores (solo si
 * hay alguno; de retos de comunidad no hay datos todavía y no se inventan).
 *
 * El saldo y la compra viven en la cabecera (`CreditsPill`): aquí no hay precios ni lógica de Credits.
 */
export const PortadaWeeAi: React.FC = () => {
  const { t, formato } = useIdioma();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isDesktop } = useResponsive();
  const dir = useDireccion();
  const borradores = useBorradores();
  /* La caja universal: lo escrito y, si se marcó imagen o video, el contexto con el que viaja. Sin marca, Weë Brain. */
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<null | 'imagen' | 'video'>(null);
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });

  const conCuenta = (fn: () => void) => () => (user ? fn() : navigation.navigate('Login'));
  const crear = (tipoDeCreacion: 'imagen' | 'video' | 'editar', idea?: string) => navigation.navigate('CrearPublicacion', { tipo: tipoDeCreacion, ...(idea ? { idea } : {}) });
  /* La caja es la misma inteligencia que las demás (CLAUDE.md §10): sin marca, Weë Brain; con Imagen o Video, esa creación. */
  const enviar = conCuenta(() => {
    const goal = texto.trim();
    if (!goal) return;
    setTexto('');
    if (tipo) crear(tipo, goal);
    else navigation.navigate('CreatorFlow', { experienceId: 'brain', goal });
  });

  /* El «+»: una foto de la galería → «Editar mi foto». La foto viaja en memoria, nunca en la ruta. */
  const adjuntarFoto = conCuenta(async () => {
    try {
      if (Platform.OS !== 'web') {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: false });
      if (r.canceled || !r.assets?.[0]?.uri) return;
      dejarFotoPendiente(r.assets[0].uri);
      crear('editar', texto.trim() || undefined);
      setTexto('');
    } catch {
      /* Sin galería (permiso negado o cancelado): no pasa nada y la portada sigue donde estaba. */
    }
  });

  const acciones: AccionDeLaCaja[] = [
    { icono: 'add', iconoWee: 'mas', etiqueta: t('publicar.adjuntarFoto'), alPulsar: () => { void adjuntarFoto(); } },
  ];
  const accionesDerecha: AccionDeLaCaja[] = [
    { icono: 'image-outline', iconoWee: 'galeria' as NombreDeIcono, etiqueta: t('publicar.puertaImagen'), alPulsar: () => setTipo((v) => (v === 'imagen' ? null : 'imagen')), activa: tipo === 'imagen' },
    { icono: 'videocam-outline', iconoWee: 'claqueta' as NombreDeIcono, etiqueta: t('publicar.puertaVideo'), alPulsar: () => setTipo((v) => (v === 'video' ? null : 'video')), activa: tipo === 'video' },
  ];

  const puertas: PuertaDePortada[] = [
    { id: 'imagen', icono: 'galeria', nombre: t('publicar.puertaImagen'), desc: t('publicar.puertaImagenDesc'), alPulsar: conCuenta(() => crear('imagen')) },
    { id: 'video', icono: 'claqueta', nombre: t('publicar.puertaVideo'), desc: t('publicar.puertaVideoDesc', { segundos: formato.numero(MAX_WEEL_SEC) }), alPulsar: conCuenta(() => crear('video')) },
    { id: 'editar', icono: 'pincel', nombre: t('publicar.puertaEditar'), desc: t('publicar.puertaEditarDesc'), alPulsar: conCuenta(() => crear('editar')) },
  ];

  /* El reparto vertical: las puertas tienen su alto; el hero se queda con lo que sobre (con un mínimo) y la caja crece hasta su tope. */
  const ancho = medida.ancho || ANCHO_MAXIMO;
  const alto = isDesktop ? Math.max(medida.alto, 720) : medida.alto || 700;
  const conDiscretos = !!borradores.projectId && borradores.total > 0;
  const altoDePuertas = isDesktop ? ALTO_DE_PUERTAS_EN_FILA : puertas.length * ALTO_DE_PUERTA + (puertas.length - 1) * HUECO_DE_PUERTAS;
  const topeDeLaCaja = Math.max(
    130,
    alto - (isDesktop ? 0 : ALTO_DE_CABECERA) - altoDePuertas - (conDiscretos ? ALTO_DE_DISCRETOS : 0) - HOLGURA_SOBRE_LA_BARRA - AIRE * 2 - ALTO_MINIMO_DEL_HERO,
  );

  return (
    <View style={styles.raiz} onLayout={(e: LayoutChangeEvent) => { const { width, height } = e.nativeEvent.layout; setMedida((antes) => (Math.abs(antes.ancho - width) > 1 || Math.abs(antes.alto - height) > 1 ? { ancho: Math.round(width), alto: Math.round(height) } : antes)); }}>
      {!isDesktop ? <CabeceraDePortada /> : null}
      {/* En escritorio el marco no reparte la altura (se desplaza): el hero lleva la suya, como en el boceto (330). */}
      <View style={isDesktop ? styles.heroEscritorio : styles.heroTelefono}>
        <HeroDePortada ancho={ancho} etiqueta={t('publicar.heroEtiqueta')} titulo={t('publicar.heroTitulo')} sub={t('publicar.heroSub')} />
      </View>
      <View style={[styles.bloque, { marginBottom: AIRE }]}>
        <CajaAnclada alto={topeDeLaCaja}>
          <CajaDePrompt
            portada
            valor={texto}
            onCambiar={setTexto}
            onEnviar={enviar}
            etiquetaEnviar={t('studio.sendLabel')}
            placeholder={t('nav.weeAiQuestion')}
            acciones={acciones}
            accionesDerecha={accionesDerecha}
          />
        </CajaAnclada>
      </View>
      <View style={[styles.bloque, { paddingBottom: conDiscretos ? 0 : HOLGURA_SOBRE_LA_BARRA }]}>
        <PuertasDePortada puertas={puertas} enFila={isDesktop} />
      </View>
      {conDiscretos ? (
        <View style={[styles.bloque, styles.discretos, dir.contenedor, { paddingBottom: HOLGURA_SOBRE_LA_BARRA }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Project', { id: borradores.projectId })}
            style={[styles.pildora, dir.contenedor]}
            accessibilityRole="button"
            accessibilityLabel={t('publicar.borradoresConTotal', { total: formato.numero(borradores.total) })}
          >
            <IconoWee name="carpeta" size={15} color={P.tintaSecundaria} />
            <Text style={[textoPortada(13, '600'), { color: P.tinta }]} numberOfLines={1}>{t('publicar.borradores')}</Text>
            <Text style={[textoPortada(13, '500'), { color: P.tintaSecundaria }]} numberOfLines={1}>{formato.numero(borradores.total)}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1, width: '100%', maxWidth: ANCHO_MAXIMO, alignSelf: 'center' },
  bloque: { paddingHorizontal: SPACING.md },
  heroTelefono: { flex: 1, minHeight: ALTO_MINIMO_DEL_HERO },
  heroEscritorio: { height: 330 },
  discretos: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingTop: AIRE },
  pildora: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: P.superficie, borderColor: P.borde, borderWidth: 1 },
});
