import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TarjetaDePlantilla } from './TarjetaDePlantilla';
import { DetalleDePlantilla } from './DetalleDePlantilla';
import { VistaPreviaDePlantilla } from './VistaPreviaDePlantilla';
import { FiltrosDePlantillas } from './GaleriaDePlantillas';
import HojaDeElementos from './video/HojaDeElementos';
import type { EstadoDePersonalizar } from './video/PersonalizarVideo';
import type { ElementoElegido } from '../../constants/catalogoElementos';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDireccion } from '../../hooks/useDireccion';
import { useUserById } from '../../hooks/useUserById';
import type { EstadoDePlantillas } from '../../hooks/usePlantillas';
import { EXPERIENCIA_DE_CATEGORIA, FiltroDePlantilla, PlantillaWeeAi, tituloDePlantilla, ModoDePersonalizar, modoPorDefectoDe } from '../../constants/plantillasWeeAi';
import { ESPACIO_WEEAI as SPACING, PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { scale } from '../../utils/scale';

const ANCHO_MAXIMO = 760;
/** Alturas de los esqueletos, variadas como las del muro real: sin saltos al llegar las tarjetas. */
const ESQUELETOS = [150, 110, 130, 170, 120, 140];

/**
 * EL MURO DE PLANTILLAS (la pantalla `Plantillas`, 2026-11-17): lo que antes vivía debajo de la portada de WeëAI, ahora en su
 * propia pantalla. Filtros (Para ti, Video, Imagen, Moda, Comida, Viajes), muro de dos columnas, detalle a pantalla completa,
 * «Tu versión» (Recrear) y «Generar» hacia `CreatorFlow`: la misma lógica de siempre, movida sin cambios. Sin Credits ni llamadas nuevas.
 */
export const PantallaDePlantillas: React.FC<{ plantillas: PlantillaWeeAi[]; estado: EstadoDePlantillas; recargar: () => void }> = ({ plantillas, estado, recargar }) => {
  const t = useT();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [filtro, setFiltro] = useState<FiltroDePlantilla>('todas');
  const [anchoMedido, setAnchoMedido] = useState(0);
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
  const anchoDePagina = anchoMedido || Math.min(width, ANCHO_MAXIMO);
  const anchoDeColumna = Math.floor((anchoDePagina - SPACING.md * 2 - SPACING.sm) / 2);

  const generar = (p: PlantillaWeeAi, duracion?: number) => {
    if (!user) return navigation.navigate('Login');
    /* El flujo de siempre: el prompt llega predefinido y solo pide lo que falta (la foto). La duración, si hay, va en el pedido. */
    const goal = duracion ? `${p.prompt}\n${duracion} s` : p.prompt;
    const nombreDelAutor = p.autorNombre || autorAbierto?.displayName;
    setVista(null);
    setAbierta(null);
    navigation.navigate('CreatorFlow', { experienceId: p.experiencia ?? EXPERIENCIA_DE_CATEGORIA[p.categoria], goal, plantilla: { titulo: tituloDePlantilla(p, t), ...(nombreDelAutor ? { autor: nombreDelAutor } : {}) } });
  };

  return (
    <View style={styles.raiz} onLayout={(e: LayoutChangeEvent) => { const w = Math.round(e.nativeEvent.layout.width); setAnchoMedido((antes) => (Math.abs(antes - w) > 1 ? w : antes)); }}>
      <FiltrosDePlantillas filtro={filtro} onCambiar={setFiltro} />

      {estado === 'cargando' ? (
        <View style={[styles.muro, styles.bloque, dir.contenedor]} accessibilityLabel={t('common.loading')}>
          {[0, 1].map((col) => (
            <View key={col} style={styles.columna}>
              {ESQUELETOS.filter((_, i) => i % 2 === col).map((alto, i) => (
                <View key={i} style={[styles.esqueleto, { height: alto, backgroundColor: P.superficie }]} />
              ))}
            </View>
          ))}
          <ActivityIndicator style={styles.girando} color={P.tintaSecundaria} />
        </View>
      ) : estado === 'error' ? (
        <View style={[styles.aviso, styles.bloque]}>
          <Text style={[textoPortada(15), styles.avisoTexto, dir.texto, { color: P.tintaSecundaria }]}>{t('weeai.templatesError')}</Text>
          <TouchableOpacity onPress={recargar} accessibilityRole="button" style={[styles.reintentar, { backgroundColor: P.superficie }]}>
            <Text style={[textoPortada(15, '600'), { color: P.tinta }]}>{t('creaciones.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : visibles.length === 0 ? (
        <View style={[styles.aviso, styles.bloque]}>
          <Text style={[textoPortada(15), styles.avisoTexto, dir.texto, { color: P.tintaSecundaria }]}>{t('weeai.noTemplates')}</Text>
        </View>
      ) : (
        <View style={[styles.muro, styles.bloque, dir.contenedor]}>
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
  raiz: { width: '100%', maxWidth: ANCHO_MAXIMO, alignSelf: 'center', paddingTop: SPACING.sm },
  bloque: { paddingHorizontal: SPACING.md },
  muro: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  columna: { flex: 1, minWidth: 0 },
  esqueleto: { borderRadius: 20, marginBottom: SPACING.sm },
  girando: { position: 'absolute', alignSelf: 'center', top: scale(60), start: '48%' },
  aviso: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  avisoTexto: { textAlign: 'center' },
  reintentar: { minHeight: 44, borderRadius: 999, paddingHorizontal: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
});
