import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import type { AssetDoc } from '../../services/vistaDeAsset';
import { CLAVE_DE_ESTADO, CLAVE_DE_TIPO, estadoVisible, origenDe } from '../../services/vistaDeAsset';
import { frasesDeDerechos } from '../../utils/derechosDelMaterial';
import { nombreDeLaRegion } from '../../i18n/formato';
import {
  AJUSTES_DE_ENTREGA, CLAVE_DE_LA_SALIDA, CLAVE_DE_LA_SECCION, DESTINOS_DE_ENTREGA, FORMATOS_DE_ENTREGA, CapacidadDeDesign,
  SeccionDelInspector, capacidadPorId,
} from '../../constants/designReferencia';
import {
  CLAVE_DE_LA_RELACION, CLAVE_DEL_ESTADO_DE_TRABAJO, ESTADO_DESDE_CREATOR_JOB, EstadoDeLaCapacidad, SECCIONES_POR_SELECCION,
  SeleccionDeDesign, TipoDeSeleccion, capacidadesDeLaSeccion, fallidoSinReintento, CLAVE_DE_LO_QUE_PRODUCE,
} from '../../utils/designReferencia';
import PanelDeVersiones from './PanelDeVersiones';
import { BotonDeCapacidad, Insignia, ListaDeAjustes, Pestanas, Pista, TituloDeBloque } from './piezas';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  seleccion: SeleccionDeDesign;
  tipo: TipoDeSeleccion;
  seccion: SeccionDelInspector | null;
  onSeccion: (s: SeccionDelInspector) => void;
  estadoDe: (cap: CapacidadDeDesign) => EstadoDeLaCapacidad;
  onCapacidad: (cap: CapacidadDeDesign) => void;
}

const CLAVE_DEL_ORIGEN: Record<'subido' | 'generado' | 'derivado', string> = {
  subido: 'designRef.originUploaded',
  generado: 'designRef.originGenerated',
  derivado: 'designRef.originDerived',
};

/**
 * EL INSPECTOR: «¿qué elegí?» y «¿qué puedo hacer con esto?».
 *
 * Solo las secciones que tocan a lo elegido (`SECCIONES_POR_SELECCION`): una
 * imagen no enseña esqueleto ni malla; un modelo enseña todo lo suyo. En «Objeto»,
 * lo que el Core sabe del material —clase, estado, origen, fecha, versión,
 * derechos visibles—, separado de lo interno: ni proveedor, ni modelo, ni ids de
 * nadie. Proyecto, material, versión y trabajo son cosas distintas y se dicen por
 * separado.
 */
const Inspector: React.FC<Props> = ({ seleccion, tipo, seccion, onSeccion, estadoDe, onCapacidad }) => {
  const { theme } = useTheme();
  const { t, formato, locale } = useIdioma();
  const secciones = SECCIONES_POR_SELECCION[tipo];
  const activa: SeccionDelInspector | null = seccion && secciones.includes(seccion) ? seccion : secciones[0] ?? null;

  if (!seleccion || !activa) {
    return (
      <View style={estilos.inspector}>
        <Pista clave="designRef.inspectorEmpty" />
      </View>
    );
  }

  const dato = (etiqueta: string, valor: string) => (
    <View key={etiqueta} style={estilos.dato}>
      <Text style={[estilos.etiqueta, { color: theme.colors.textSecondary }]}>{t(etiqueta)}</Text>
      <Text style={[estilos.valor, { color: theme.colors.text }]}>{valor}</Text>
    </View>
  );

  const propiedades = () => {
    if (seleccion.tipo === 'simulada') {
      const nombre = (id: string | undefined) => {
        const cap = id ? capacidadPorId(id) : undefined;
        return cap ? t(cap.clave) : '';
      };
      const padre = seleccion.linaje.length > 1 ? seleccion.linaje[seleccion.linaje.length - 2] : undefined;
      return (
        <>
          <Insignia clave="designRef.simulatedBadge" tono="aviso" />
          {dato('designRef.propKind', t(CLAVE_DE_LO_QUE_PRODUCE[seleccion.salida]))}
          {dato('designRef.propRelation', t(CLAVE_DE_LA_RELACION[seleccion.relacion], { origen: nombre(padre?.capacidadId) }))}
          {dato('designRef.propJob', t('designRef.jobSimulated'))}
          {seleccion.linaje.length > 1 ? dato('designRef.propLineage', seleccion.linaje.map((p) => nombre(p.capacidadId)).join(' › ')) : null}
          {seleccion.padreId ? <Pista clave="designRef.handoffByReference" /> : null}
          <Pista clave="designRef.canvasSimulated" />
        </>
      );
    }
    if (seleccion.tipo === 'trabajo') {
      const j = seleccion.job;
      return (
        <>
          {dato('designRef.propGoal', j.goal)}
          {dato('designRef.propState', t(CLAVE_DEL_ESTADO_DE_TRABAJO[ESTADO_DESDE_CREATOR_JOB[j.status]]))}
          {fallidoSinReintento(j) ? <Insignia clave="designRef.wsRetryUnavailable" tono="aviso" /> : null}
        </>
      );
    }
    const a: AssetDoc = seleccion.asset;
    const frases = frasesDeDerechos(a.derechos);
    return (
      <>
        {dato('designRef.propKind', t(CLAVE_DE_TIPO[a.kind]))}
        {dato('designRef.propState', t(CLAVE_DE_ESTADO[estadoVisible(a.status)]))}
        {dato('designRef.propOrigin', t(CLAVE_DEL_ORIGEN[origenDe(a)]))}
        {dato('designRef.propCreated', formato.fecha(new Date(a.createdAt)))}
        {dato('designRef.stepVersion', t(a.previousVersionId ? 'designRef.versionHasPrevious' : 'designRef.versionFirst'))}
        <PanelDeVersiones />
        {frases.length > 0 ? (
          <View style={estilos.dato}>
            <Text style={[estilos.etiqueta, { color: theme.colors.textSecondary }]}>{t('creaciones.rightsTitle')}</Text>
            {frases.map((f) => (
              <Text key={f.clave} style={[estilos.valor, { color: theme.colors.text }]}>
                {f.lugares ? t(f.clave, { lugares: formato.lista(f.lugares.map((codigo) => nombreDeLaRegion(codigo, locale))) }) : t(f.clave)}
              </Text>
            ))}
          </View>
        ) : null}
      </>
    );
  };

  return (
    <View style={estilos.inspector}>
      <Pestanas
        opciones={secciones.map((id) => ({ id, clave: CLAVE_DE_LA_SECCION[id] }))}
        elegida={activa}
        onElegir={onSeccion}
        etiqueta={t('designRef.surfInspector')}
      />
      <ScrollView contentContainerStyle={estilos.dentro} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {activa === 'objeto' ? propiedades() : null}
        {capacidadesDeLaSeccion(activa).map((cap) => (
          <View key={cap.id} style={estilos.capacidad}>
            <BotonDeCapacidad cap={cap} estado={estadoDe(cap)} onPress={onCapacidad} />
            {cap.id === 'exportFor' ? (
              <View style={estilos.destinos}>
                <TituloDeBloque clave="designRef.destinationsLabel" />
                <View style={estilos.fila}>
                  {DESTINOS_DE_ENTREGA.map((d) => <Insignia key={d.id} clave={d.clave} />)}
                </View>
                <ListaDeAjustes titulo="designRef.deliveryTitle" ajustes={AJUSTES_DE_ENTREGA} motivo="designRef.deliveryPending" etiquetas={FORMATOS_DE_ENTREGA} />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const estilos = StyleSheet.create({
  inspector: { flex: 1, gap: SPACING.xs },
  dentro: { gap: SPACING.sm, paddingBottom: SPACING.lg },
  dato: { gap: scale(2) },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  valor: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  capacidad: { gap: SPACING.xs },
  destinos: { gap: SPACING.xs, paddingLeft: SPACING.sm },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
});

export default Inspector;
