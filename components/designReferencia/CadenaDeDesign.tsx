import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import {
  CADENA_DE_DESIGN, CLAVE_DE_LA_CLASE, CapacidadDeDesign, EslabonDeLaCadena, capacidadPorId, eslabonDeLaCapacidad,
} from '../../constants/designReferencia';
import { SeleccionDeDesign, eslabonActual, pasosDesde } from '../../utils/designReferencia';
import { BotonDeAccion, CURSOR, Insignia, Pista, nombreDeIcono } from './piezas';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';


interface Props {
  seleccion: SeleccionDeDesign;
  /** Abre el detalle de la capacidad de un eslabón: desde ahí se usa o se simula. */
  onAbrir: (cap: CapacidadDeDesign) => void;
}

const capacidadDe = (e: EslabonDeLaCadena | null): CapacidadDeDesign | undefined => (e ? capacidadPorId(e.capacidad) : undefined);

/**
 * DE LA IMAGEN AL OBJETO, SIN SALIR DE WEË DESIGN (docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md §11).
 *
 * Los seis eslabones, cada uno con lo que es HOY (funciona, a medias, falta el
 * servidor, falta quien lo haga). Recorrerla es simularla: cada eslabón se abre en
 * su detalle, se recorre su trabajo y su resultado entra en el siguiente como
 * material —por referencia, nunca descargado y vuelto a subir—, con su linaje.
 * Los atajos entre pasos son los de la cadena: el siguiente y, si ese se puede
 * saltar, el primero que no.
 *
 * Ningún eslabón dice quién lo hace.
 */
const CadenaDeDesign: React.FC<Props> = ({ seleccion, onAbrir }) => {
  const { theme } = useTheme();
  const t = useT();
  const actual = eslabonActual(seleccion);
  const enCadena = seleccion?.tipo === 'simulada' && !!actual;
  const hechos = new Set(
    seleccion?.tipo === 'simulada' ? seleccion.linaje.map((p) => eslabonDeLaCapacidad(p.capacidadId)?.id).filter(Boolean) : [],
  );
  const { siguiente, salto } = pasosDesde(enCadena && actual ? actual.id : null);
  const primera = capacidadDe(CADENA_DE_DESIGN[0] ?? null);
  const capSiguiente = capacidadDe(siguiente);
  const capSalto = capacidadDe(salto);

  return (
    <View style={estilos.cadena}>
      <Text style={[estilos.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('designRef.chainTitle')}</Text>
      <Pista clave="designRef.chainHint" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.fila} accessibilityLabel={t('designRef.chainTitle')}>
        {CADENA_DE_DESIGN.map((e, i) => {
          const cap = capacidadDe(e);
          const esActual = enCadena && actual?.id === e.id;
          const hecho = hechos.has(e.id);
          return (
            <React.Fragment key={e.id}>
              {i > 0 ? <Ionicons name="chevron-forward" size={scale(14)} color={theme.colors.textSecondary} style={estilos.flecha} /> : null}
              <TouchableOpacity
                onPress={() => (cap ? onAbrir(cap) : undefined)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${t(e.clave)} · ${t(CLAVE_DE_LA_CLASE[e.clase])}`}
                accessibilityHint={e.opcional ? t('designRef.chainOptional') : undefined}
                accessibilityState={{ selected: esActual }}
                style={[
                  estilos.eslabon,
                  {
                    borderColor: esActual ? theme.colors.text : theme.colors.border,
                    backgroundColor: hecho ? theme.colors.glow : theme.colors.card,
                  },
                  CURSOR,
                ]}
              >
                <View style={estilos.eslabonCabeza}>
                  <Ionicons name={nombreDeIcono(e.icono)} size={scale(16)} color={theme.colors.text} />
                  <Text style={[estilos.eslabonNombre, { color: theme.colors.text }]} numberOfLines={1}>{t(e.clave)}</Text>
                </View>
                <Insignia clave={CLAVE_DE_LA_CLASE[e.clase]} tono={e.clase === 'EXISTING' ? 'activo' : e.clase === 'PARTIAL' ? 'aviso' : 'apagado'} />
                {e.opcional ? <Text style={[estilos.opcional, { color: theme.colors.textSecondary }]}>{t('designRef.chainOptional')}</Text> : null}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </ScrollView>
      <View style={estilos.acciones}>
        {!enCadena && primera ? <BotonDeAccion clave="designRef.chainStart" icono="play-outline" principal onPress={() => onAbrir(primera)} /> : null}
        {enCadena && siguiente && capSiguiente ? (
          <BotonDeAccion clave="designRef.chainNext" valores={{ paso: t(siguiente.clave) }} icono="arrow-forward-outline" principal onPress={() => onAbrir(capSiguiente)} />
        ) : null}
        {enCadena && salto && capSalto ? (
          <BotonDeAccion clave="designRef.chainSkip" valores={{ paso: t(salto.clave) }} icono="play-skip-forward-outline" onPress={() => onAbrir(capSalto)} />
        ) : null}
        {enCadena && !siguiente ? <Pista clave="designRef.chainDone" /> : null}
      </View>
    </View>
  );
};

const estilos = StyleSheet.create({
  cadena: { gap: SPACING.xs },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  fila: { alignItems: 'center', gap: SPACING.xs, paddingVertical: scale(2) },
  flecha: { marginHorizontal: scale(2) },
  eslabon: { minWidth: scale(132), minHeight: 44, padding: SPACING.sm, gap: scale(4), borderRadius: BORDER_RADIUS.md, borderWidth: StyleSheet.hairlineWidth },
  eslabonCabeza: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  eslabonNombre: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, maxWidth: scale(150) },
  opcional: { fontSize: scale(11) },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
});

export default CadenaDeDesign;
