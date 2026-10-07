import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useT } from '../../contexts/IdiomaContext';
import CajaDePrompt, { AccionDeLaCaja } from '../creator/CajaDePrompt';
import FichaDeContexto from '../creator/FichaDeContexto';
import type { Adjunto } from '../../constants/weeWorkspaces';
import {
  CLAVE_DE_LA_INTENCION, CLAVE_DEL_NO_SE, INTENCIONES, IntencionDeDesign, QUE_SE_DISENA, CapacidadDeDesign,
} from '../../constants/designReferencia';
import { EstadoDeLaCapacidad, capacidadesDeLaIntencion } from '../../utils/designReferencia';
import { BotonDeCapacidad, Pestanas, Pista } from './piezas';
import { SPACING } from '../../constants/design';

interface Props {
  intencion: IntencionDeDesign;
  onIntencion: (i: IntencionDeDesign) => void;
  /** «¿Qué quieres diseñar?»: el `optionId` de la plantilla, o null = «No sé» (Weë Brain pregunta). */
  que: string | null;
  onQue: (q: string | null) => void;
  texto: string;
  onTexto: (s: string) => void;
  adjuntos: readonly Adjunto[];
  onQuitarAdjunto: (i: number) => void;
  /** Lo elegido en los ajustes, ya dicho en palabras. */
  ajustes: readonly string[];
  onAjustes: () => void;
  onAdjuntar: () => void;
  onEnviar: () => void;
  /** Editar sin un trabajo elegido: la caja no manda nada, y lo dice. */
  puedeEscribir: boolean;
  estadoDe: (cap: CapacidadDeDesign) => EstadoDeLaCapacidad;
  onCapacidad: (cap: CapacidadDeDesign) => void;
}

const OPCIONES_DE_INTENCION = INTENCIONES.map((id) => ({ id, clave: CLAVE_DE_LA_INTENCION[id] }));
const NO_SE = '__no_se__';
const OPCIONES_DE_QUE = [...QUE_SE_DISENA.map((q) => ({ id: q.id, clave: q.clave })), { id: NO_SE, clave: CLAVE_DEL_NO_SE }];

const PLACEHOLDER: Record<IntencionDeDesign, string> = {
  crear: 'design.placeholder',
  transformar: 'designRef.placeholderTransform',
  editar: 'designRef.placeholderEdit',
};
const PISTA: Record<IntencionDeDesign, string> = {
  crear: 'designRef.priceBeforeCreate',
  transformar: 'designRef.intentHintTransform',
  editar: 'designRef.intentHintEdit',
};

/**
 * EL COMPOSER DE WEË DESIGN: CREAR, TRANSFORMAR O EDITAR. Nunca «usar» a nadie.
 *
 * La caja es `CajaDePrompt`, la de todas las secciones: crece y no pierde sus
 * botones (CLAUDE.md §9) y es el mismo Weë Brain (CLAUDE.md §10). Aquí solo se
 * dice QUÉ se quiere hacer y con qué; quién lo hace lo decide el Router, y la
 * persona nunca lo ve. Lo que la intención todavía no puede hacer se ve apagado,
 * con su motivo, encima de la caja.
 *
 * Sin micrófono: en Weë Design no hay dictado conectado y un botón que no hace lo
 * que dice no se pone.
 */
const ComposerDeDesign: React.FC<Props> = (p) => {
  const t = useT();
  const capacidades = capacidadesDeLaIntencion(p.intencion);

  const acciones: AccionDeLaCaja[] = [];
  if (p.intencion !== 'editar') {
    acciones.push({
      icono: 'image-outline',
      etiqueta: p.intencion === 'crear' ? t('designRef.capStyleReference') : t('designRef.attachSpacePhoto'),
      alPulsar: p.onAdjuntar,
    });
    acciones.push({ icono: 'options-outline', etiqueta: t('studio.settingsLabel'), alPulsar: p.onAjustes });
  }

  return (
    <View style={estilos.composer}>
      <Pestanas opciones={OPCIONES_DE_INTENCION} elegida={p.intencion} onElegir={p.onIntencion} etiqueta={t('designRef.composerLabel')} />
      {capacidades.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.fila} accessibilityLabel={t('designRef.capsLabel')}>
          {capacidades.map((cap) => <BotonDeCapacidad key={cap.id} cap={cap} estado={p.estadoDe(cap)} onPress={p.onCapacidad} compacto />)}
        </ScrollView>
      ) : null}
      {p.intencion === 'crear' ? (
        <Pestanas
          opciones={OPCIONES_DE_QUE}
          elegida={p.que ?? NO_SE}
          onElegir={(id) => p.onQue(id === NO_SE ? null : id)}
          etiqueta={t('catalogo.designGridTitle')}
        />
      ) : null}
      {(p.adjuntos.length > 0 || p.ajustes.length > 0) ? (
        <View style={estilos.fichas}>
          {p.adjuntos.map((a, i) => (
            <FichaDeContexto
              key={`${a.uri}-${i}`}
              icono="image-outline"
              texto={a.nombre ?? t('studio.reference')}
              onQuitar={() => p.onQuitarAdjunto(i)}
              etiquetaQuitar={t('studio.removeContext')}
            />
          ))}
          {p.ajustes.map((texto) => <FichaDeContexto key={texto} icono="options-outline" texto={texto} />)}
        </View>
      ) : null}
      <CajaDePrompt
        valor={p.texto}
        onCambiar={p.onTexto}
        onEnviar={p.onEnviar}
        etiquetaEnviar={t('studio.sendLabel')}
        placeholder={t(PLACEHOLDER[p.intencion])}
        acciones={acciones}
        editable={p.puedeEscribir}
      />
      <Pista clave={PISTA[p.intencion]} />
    </View>
  );
};

const estilos = StyleSheet.create({
  composer: { gap: SPACING.xs },
  fila: { gap: SPACING.xs, paddingVertical: 2 },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
});

export default ComposerDeDesign;
