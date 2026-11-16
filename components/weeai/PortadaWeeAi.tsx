import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IconoDireccional from '../IconoDireccional';
import { IconoWee } from '../icons/IconoWee';
import type { NombreDeIcono } from '../icons/trazosDeWee';
import { TarjetaDePlantilla } from './TarjetaDePlantilla';
import { DetalleDePlantilla } from './DetalleDePlantilla';
import { VistaPreviaDePlantilla } from './VistaPreviaDePlantilla';
import HojaDeElementos from './video/HojaDeElementos';
import type { EstadoDePersonalizar } from './video/PersonalizarVideo';
import type { ElementoElegido } from '../../constants/catalogoElementos';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useDireccion } from '../../hooks/useDireccion';
import { useEstiloWeeAi } from '../../hooks/useEstiloWeeAi';
import { useUserById } from '../../hooks/useUserById';
import type { EstadoDePlantillas } from '../../hooks/usePlantillas';
import { EXPERIENCIA_DE_CATEGORIA, FILTROS_DE_PLANTILLA, FiltroDePlantilla, PlantillaWeeAi, tituloDePlantilla, ModoDePersonalizar, modoPorDefectoDe } from '../../constants/plantillasWeeAi';
import { MUSICA_EN_LA_UI, PORTADA_DE_WEEAI, getExperienceById } from '../../constants/weeExperiences';
import { FASHION_MODOS } from '../../constants/fashionModes';
import { ESPACIO_WEEAI as SPACING, RADIO_WEEAI, textoWeeAi } from '../../constants/estiloWeeAi';
import { scale } from '../../utils/scale';

/*
 * Áreas de la portada: Video e Imagen (2026-11-16). Todo lo demás se alcanza desde «Herramientas»; Moda es un GRUPO de ahí que reúne el ecosistema
 * de Fashion (sus modos, las pantallas que ya existen) con el id interno de siempre, `business`, que no se movió.
 */
const ID_DE_MODA = 'business';
/* Qué se ofrece sale de la bandera de siempre (PORTADA_DE_WEEAI); ninguna experiencia ni id se mueve. */
const HAY_IMAGEN = (PORTADA_DE_WEEAI.puertas as readonly string[]).includes('design');
const HAY_MODA = (PORTADA_DE_WEEAI.puertas as readonly string[]).includes(ID_DE_MODA);

const ANCHO_MAXIMO = 760;
/** Alturas de los esqueletos, variadas como las del muro real: sin saltos al llegar las tarjetas. */
const ESQUELETOS = [150, 110, 130, 170, 120, 140];

/**
 * LA PORTADA DE WEËAI (boceto v2, pantallas 1 y 2), en monocromo y sin líneas: dos puertas —Video y Herramientas—, y debajo
 * el muro de plantillas. Se separa con tono y espacio, no con trazos; lo seleccionado se dice invirtiendo (tinta sobre fondo).
 * El saldo y la compra viven en la cabecera (`CreditsPill`): aquí no hay precios ni lógica de Credits.
 */
export const PortadaWeeAi: React.FC<{ plantillas: PlantillaWeeAi[]; estado: EstadoDePlantillas; recargar: () => void }> = ({ plantillas, estado, recargar }) => {
  const c = useEstiloWeeAi();
  const t = useT();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { hasWeeProfile } = useUserProfile();
  const { width } = useWindowDimensions();
  const [filtro, setFiltro] = useState<FiltroDePlantilla>('todas');
  const [herramientas, setHerramientas] = useState(false);
  const [moda, setModa] = useState(false);
  const [abierta, setAbierta] = useState<PlantillaWeeAi | null>(null);
  const [vista, setVista] = useState<PlantillaWeeAi | null>(null);
  /* «Personalizar» (cara o cuerpo) y las ranuras de personaje de la plantilla abierta: el detalle y «Tu versión» comparten el mismo estado. Solo interfaz: no se envía. */
  const [modo, setModo] = useState<ModoDePersonalizar>('cara');
  const [huecos, setHuecos] = useState<Record<string, ElementoElegido | null>>({});
  const [ranuraAbierta, setRanuraAbierta] = useState<string | null>(null);
  const abrir = (p: PlantillaWeeAi | null) => {
    setAbierta(p);
    if (p) {
      setModo(modoPorDefectoDe(p));
      setHuecos({});
    }
  };
  const personalizar: EstadoDePersonalizar = {
    modo,
    onModo: setModo,
    huecos,
    onElegir: setRanuraAbierta,
    onQuitar: (id) => setHuecos((h) => ({ ...h, [id]: null })),
  };

  /* El nombre de quien publicó la plantilla abierta: lo lee la atribución del resultado. */
  const { userProfile: autorAbierto } = useUserById((vista ?? abierta)?.autorId);
  const visibles = useMemo(() => plantillas.filter((p) => filtro === 'todas' || p.categoria === filtro), [plantillas, filtro]);
  /* Dos columnas: cada tarjeta a la columna más baja, para que el muro quede parejo. */
  const columnas = useMemo(() => {
    const cols: { items: PlantillaWeeAi[]; alto: number }[] = [{ items: [], alto: 0 }, { items: [], alto: 0 }];
    for (const p of visibles) {
      const col = cols[0].alto <= cols[1].alto ? cols[0] : cols[1];
      col.items.push(p);
      col.alto += 1 / p.aspecto + 0.45;
    }
    return cols;
  }, [visibles]);
  const anchoUtil = Math.min(width, ANCHO_MAXIMO) - SPACING.md * 2;
  const anchoDeColumna = Math.floor((anchoUtil - SPACING.sm) / 2);

  const conCuenta = (fn: () => void) => () => (user ? fn() : navigation.navigate('Login'));
  const irA = (id: string) => navigation.navigate('Specialist', { id });
  const irAModa = (modo: string) => navigation.navigate('Specialist', { id: ID_DE_MODA, modo });
  const avatar = conCuenta(() => navigation.navigate(hasWeeProfile ? 'AiAvatar' : 'WeeProfileCreation'));
  const generar = (p: PlantillaWeeAi, duracion?: number) => {
    if (!user) return navigation.navigate('Login');
    /* El flujo de siempre: el prompt llega predefinido y solo pide lo que falta (la foto). La duración, si hay, va en el pedido. */
    const goal = duracion ? `${p.prompt}\n${duracion} s` : p.prompt;
    const nombreDelAutor = p.autorNombre || autorAbierto?.displayName;
    setVista(null);
    setAbierta(null);
    navigation.navigate('CreatorFlow', { experienceId: p.experiencia ?? EXPERIENCIA_DE_CATEGORIA[p.categoria], goal, plantilla: { titulo: tituloDePlantilla(p, t), ...(nombreDelAutor ? { autor: nombreDelAutor } : {}) } });
  };

  const puerta = (icono: NombreDeIcono, clave: string, onPress: () => void, grande: boolean, expandida?: boolean) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={expandida === undefined ? undefined : { expanded: expandida }}
      aria-expanded={expandida}
      style={[styles.puerta, { flex: grande ? 1.5 : 1, backgroundColor: grande ? c.seleccion : c.superficie }]}
    >
      <IconoWee name={icono} size={scale(28)} color={grande ? c.sobreSeleccion : c.tinta} />
      <Text style={[styles.puertaTexto, textoWeeAi('enfasis', '600'), dir.texto, { color: grande ? c.sobreSeleccion : c.tinta }]} numberOfLines={2}>{t(clave)}</Text>
    </TouchableOpacity>
  );

  const filaDeHerramienta = (clave: string, icono: NombreDeIcono, onPress: () => void, texto?: string) => (
    <TouchableOpacity key={clave} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" style={[styles.herramienta, dir.contenedor, { backgroundColor: c.superficie }]}>
      <IconoWee name={icono} size={scale(22)} color={c.tinta} />
      <Text style={[styles.herramientaTexto, textoWeeAi('cuerpo', '500'), dir.texto, { color: c.tinta }]} numberOfLines={2}>{texto ?? t(clave)}</Text>
      <IconoDireccional name="chevron-forward" size={scale(16)} color={c.tintaTerciaria} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.raiz}>
      <View style={[styles.puertas, dir.contenedor]}>
        {puerta('claqueta', 'composer.kindVideo', () => navigation.navigate('CrearVideo'), true)}
        {HAY_IMAGEN ? puerta('galeria', 'composer.kindImage', () => irA('design'), false) : null}
        {puerta('capas', 'weeai.tools', () => setHerramientas((v) => !v), false, herramientas)}
      </View>
      {herramientas ? (
        <View style={styles.herramientas}>
          {/* Weë Brain es marca: no se traduce. */}
          {filaDeHerramienta('brain', 'cerebro', () => irA('brain'), 'Weë Brain')}
          {/* Moda: un grupo de una palabra que plega su ecosistema (los modos de Fashion, con sus pantallas de siempre). */}
          {HAY_MODA ? <TouchableOpacity onPress={() => setModa((v) => !v)} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ expanded: moda }} aria-expanded={moda} style={[styles.herramienta, dir.contenedor, { backgroundColor: c.superficie }]}>
            <IconoWee name="vestido" size={scale(22)} color={c.tinta} />
            <Text style={[styles.herramientaTexto, textoWeeAi('cuerpo', '500'), dir.texto, { color: c.tinta }]} numberOfLines={1}>{t('weeai.filterFashion')}</Text>
            <IconoWee name={moda ? 'chevronArriba' : 'chevronAbajo'} size={scale(16)} color={c.tintaTerciaria} />
          </TouchableOpacity> : null}
          {HAY_MODA && moda ? FASHION_MODOS.map((m) => (
            <TouchableOpacity key={m.id} onPress={() => irAModa(m.id)} activeOpacity={0.7} accessibilityRole="button" style={[styles.herramienta, styles.subherramienta, dir.contenedor, { backgroundColor: c.superficie }]}>
              <Text style={[styles.herramientaTexto, textoWeeAi('cuerpo', '500'), dir.texto, { color: c.tinta }]} numberOfLines={2}>{t(m.claveTitulo)}</Text>
              <IconoDireccional name="chevron-forward" size={scale(16)} color={c.tintaTerciaria} />
            </TouchableOpacity>
          )) : null}
          {/* El nombre de WeëMusic es marca: sale de la experiencia, no se traduce. Detrás de la bandera MUSICA_EN_LA_UI (apagada por defecto). */}
          {MUSICA_EN_LA_UI ? filaDeHerramienta('music', 'notas', () => irA('music'), getExperienceById('music')?.name) : null}
          {filaDeHerramienta('weeai.avatarForWeeProfile', 'perfilWee', avatar)}
        </View>
      ) : null}

      <Text style={[styles.seccion, textoWeeAi('titulo', '600'), dir.texto, { color: c.tinta }]} accessibilityRole="header">{t('weeai.templatesTitle')}</Text>
      <Text style={[styles.sub, textoWeeAi('cuerpo'), dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.templatesSub')}</Text>
      <View style={[styles.filtros, dir.contenedor]}>
        {FILTROS_DE_PLANTILLA.map((f) => {
          const puesto = f.id === filtro;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFiltro(f.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: puesto }}
              aria-pressed={puesto}
              style={[styles.filtro, { backgroundColor: puesto ? c.seleccion : c.superficie }]}
            >
              <Text style={[textoWeeAi('nota', puesto ? '600' : '500'), { color: puesto ? c.sobreSeleccion : c.tinta }]} numberOfLines={1}>{t(f.clave)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {estado === 'cargando' ? (
        <View style={[styles.muro, dir.contenedor]} accessibilityLabel={t('common.loading')}>
          {[0, 1].map((col) => (
            <View key={col} style={styles.columna}>
              {ESQUELETOS.filter((_, i) => i % 2 === col).map((alto, i) => (
                <View key={i} style={[styles.esqueleto, { height: alto, backgroundColor: c.superficie }]} />
              ))}
            </View>
          ))}
          <ActivityIndicator style={styles.girando} color={c.tintaSecundaria} />
        </View>
      ) : estado === 'error' ? (
        <View style={styles.aviso}>
          <Text style={[textoWeeAi('cuerpo'), styles.avisoTexto, dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.templatesError')}</Text>
          <TouchableOpacity onPress={recargar} accessibilityRole="button" style={[styles.reintentar, { backgroundColor: c.superficie }]}>
            <Text style={[textoWeeAi('cuerpo', '600'), { color: c.tinta }]}>{t('creaciones.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : visibles.length === 0 ? (
        <View style={styles.aviso}>
          <Text style={[textoWeeAi('cuerpo'), styles.avisoTexto, dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.noTemplates')}</Text>
        </View>
      ) : (
        <View style={[styles.muro, dir.contenedor]}>
          {columnas.map((col, i) => (
            <View key={i} style={styles.columna}>
              {col.items.map((p) => <TarjetaDePlantilla key={p.id} plantilla={p} ancho={anchoDeColumna} onPress={() => abrir(p)} />)}
            </View>
          ))}
        </View>
      )}

      <DetalleDePlantilla
        plantilla={abierta && !vista ? abierta : null}
        onClose={() => setAbierta(null)}
        similares={abierta ? plantillas.filter((p) => p.categoria === abierta.categoria && p.id !== abierta.id).slice(0, 6) : []}
        onElegirSimilar={(p) => abrir(p)}
        personalizar={personalizar}
        onRecrear={(p) => setVista(p)}
        onAbrirPublicacion={(postId) => { setAbierta(null); navigation.navigate('PostDetail', { postId }); }}
      />
      <VistaPreviaDePlantilla plantilla={vista} onClose={() => setVista(null)} onGenerar={generar} personalizar={personalizar} />
      <HojaDeElementos
        visible={ranuraAbierta !== null}
        paraRanura
        elegidos={[]}
        onClose={() => setRanuraAbierta(null)}
        onListo={(sel) => {
          const primero = sel.find((e) => e.tipo === 'personaje' || e.tipo === 'galeria') ?? null;
          if (ranuraAbierta) setHuecos((h) => ({ ...h, [ranuraAbierta]: primero }));
          setRanuraAbierta(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { width: '100%', maxWidth: ANCHO_MAXIMO, alignSelf: 'center' },
  puertas: { flexDirection: 'row', gap: SPACING.sm },
  puerta: { minHeight: 104, borderRadius: RADIO_WEEAI.tarjeta, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md, overflow: 'hidden' },
  puertaTexto: { textAlign: 'center' },
  herramientas: { marginTop: SPACING.sm, gap: SPACING.sm },
  subherramienta: { marginStart: SPACING.lg },
  herramienta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 52, paddingHorizontal: SPACING.md, borderRadius: RADIO_WEEAI.control },
  herramientaTexto: { flex: 1, minWidth: 0 },
  seccion: { marginTop: SPACING.lg },
  sub: { marginTop: SPACING.xs, marginBottom: SPACING.md },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  filtro: { minHeight: 44, borderRadius: RADIO_WEEAI.pastilla, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  muro: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  columna: { flex: 1, minWidth: 0 },
  esqueleto: { borderRadius: RADIO_WEEAI.tarjeta, marginBottom: SPACING.sm },
  girando: { position: 'absolute', alignSelf: 'center', top: scale(60), start: '48%' },
  aviso: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  avisoTexto: { textAlign: 'center' },
  reintentar: { minHeight: 44, borderRadius: RADIO_WEEAI.pastilla, paddingHorizontal: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
});
