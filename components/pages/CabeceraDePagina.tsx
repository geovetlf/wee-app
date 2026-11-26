import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useT } from '../../contexts/IdiomaContext';
import { tipoDePagina, colorDeObra } from '../../constants/pageTypes';
import { PALETA_WEEPAGE as P, ETIQUETA_WEEPAGE, interfazWeePage } from '../../constants/estiloWeePage';
import { useFuenteDeObra } from '../../hooks/useFuenteDeObra';
import type { BorradorDePagina } from '../../services/pagesService';

/** La cara que presenta la página, ya resuelta para pintarla. null = nadie. */
export interface PresentadorDePagina {
  nombre: string;
  foto?: string;
}

export type PaginaParaPintar = Omit<BorradorDePagina, 'presenter'> & {
  followersCount: number;
  featured?: string[];
  scenes?: { title: string; videoURL: string; posterURL: string }[];
  updatedAtMs?: number;
  publishedAtMs?: number;
};

/*
 * LA CABECERA DE UNA WEË PAGE (plantilla negra, boceto del 2026-11-23): portada a sangre con un velo que funde a negro,
 * la etiqueta del tipo («LIBRO · NOVELA»), el título en EB Garamond, «Presentada por <cara>», la línea de la obra y las
 * acciones. Sin portada se pinta una portada TIPOGRÁFICA (el título solo, sobre la pared, con el filete del color de obra).
 *
 * Es la misma pieza en la vista previa del editor y en la página publicada: lo que se ve antes de publicar es lo que se
 * publica. `acciones` son los botones de la página publicada (Seguir, Compartir…); en la vista previa no van.
 */
const CabeceraDePagina: React.FC<{
  pagina: PaginaParaPintar;
  presentador?: PresentadorDePagina | null;
  alPulsarPresentador?: () => void;
  acciones?: React.ReactNode;
  /** Ancho disponible: decide móvil o escritorio. */
  ancho: number;
}> = ({ pagina, presentador, alPulsarPresentador, acciones, ancho }) => {
  const t = useT();
  const obra = useFuenteDeObra();
  const tipo = tipoDePagina(pagina.type);
  const amplio = ancho >= 1024;
  const margen = amplio ? Math.min(120, Math.max(32, Math.round(ancho * 0.08))) : 20;
  const altoPortada = pagina.coverURL ? (amplio ? 640 : Math.min(560, Math.round(ancho * 1.25))) : (amplio ? 420 : 300);
  const etiqueta = [t(tipo.claveTitulo), pagina.details?.genre].filter(Boolean).join(' · ');
  const acento = colorDeObra(pagina.workColor);

  return (
    <View>
      <View style={[s.portada, { height: altoPortada }]}>
        {!!pagina.coverURL && <Image source={{ uri: pagina.coverURL }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />}
        {!!pagina.coverURL && (
          <LinearGradient
            colors={['rgba(5,5,5,0.55)', 'rgba(5,5,5,0)', 'rgba(5,5,5,0)', P.n0]}
            locations={[0, 0.22, 0.5, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
        <View style={[s.portadaPie, { paddingHorizontal: margen, paddingBottom: amplio ? 64 : 20 }]}>
          {!pagina.coverURL && <View style={[s.filete, { backgroundColor: acento }]} />}
          <Text style={[ETIQUETA_WEEPAGE, { color: P.etiquetaSobrePortada }]} numberOfLines={2}>{etiqueta}</Text>
          <Text
            style={[obra(amplio ? 76 : 40, '500'), s.titulo, { lineHeight: Math.round((amplio ? 76 : 40) * 1.08), maxWidth: amplio ? 820 : undefined }]}
            accessibilityRole="header"
          >
            {pagina.name}
          </Text>
        </View>
      </View>

      <View style={[s.cuerpo, { paddingHorizontal: margen, maxWidth: amplio ? 1200 + margen * 2 : undefined }]}>
        <View style={s.filaPresenta}>
          {presentador ? (
            <TouchableOpacity
              onPress={alPulsarPresentador}
              disabled={!alPulsarPresentador}
              accessibilityRole={alPulsarPresentador ? 'link' : undefined}
              style={s.presenta}
              activeOpacity={0.8}
            >
              <View style={s.avatar}>
                {presentador.foto
                  ? <Image source={{ uri: presentador.foto }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  : <Text style={[obra(15), { color: P.tinta }]}>{presentador.nombre.trim().charAt(0).toLocaleUpperCase()}</Text>}
              </View>
              <View style={s.presentaTextos}>
                <Text style={[interfazWeePage(12), { color: P.t3 }]} numberOfLines={1}>{t('pages.presentedBy')}</Text>
                <Text style={[interfazWeePage(14, '600'), { color: P.tinta }]} numberOfLines={1}>{presentador.nombre}</Text>
              </View>
            </TouchableOpacity>
          ) : <View style={s.presenta} />}
          <Text style={[interfazWeePage(12), { color: P.t2 }]} numberOfLines={1}>{t('pages.followers', { contador: pagina.followersCount })}</Text>
        </View>
        {!!pagina.shortDescription && (
          <Text style={[obra(amplio ? 21 : 19), s.linea, { maxWidth: amplio ? 640 : undefined }]}>{pagina.shortDescription}</Text>
        )}
        {acciones}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  portada: { backgroundColor: P.n1, overflow: 'hidden', justifyContent: 'flex-end' },
  portadaPie: { gap: 10 },
  filete: { width: 40, height: 2, borderRadius: 2, marginBottom: 6 },
  titulo: { color: P.tinta, letterSpacing: -0.4 },
  cuerpo: { width: '100%', alignSelf: 'center', paddingTop: 8, gap: 18 },
  filaPresenta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  presenta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minHeight: 44 },
  presentaTextos: { flexShrink: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: P.n3 },
  linea: { color: P.obraTexto },
});

export default CabeceraDePagina;
