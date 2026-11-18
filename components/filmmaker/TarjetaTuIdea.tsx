import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { IconoWee } from '../icons/IconoWee';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { CAMPOS_DE_IDEA, CampoDeIdea, FORMATOS_DE_ANUNCIO } from '../../constants/filmmakerIdea';
import { IdeaDelTaller, contestados, duracionesDelTipo, etiquetaAccesible, estaLista, estructuraDe, noSe, poner } from '../../utils/ideaDeFilmmaker';

/** La relación de aspecto («4:5», «9:16») es notación latina: se aísla para que no se reordene en árabe o hebreo. */
const latino = (s: string) => `⁦${s}⁩`;

/**
 * LA TARJETA VIVA «TU IDEA» (taller de Idea de Filmmaker): una fila por campo del tipo —título, frase, tono, duración, protagonistas, giro; en un
 * anuncio, producto, marca, llamada a la acción…— y cada fila se edita con un toque, en su sitio: texto escrito o una opción de una lista corta con
 * «No sé». Lo contestado se marca; lo que la persona dejó «No sé» sale «por decidir» (no se inventa nada). Los cambios suben por `onCambiar`.
 */
export const TarjetaTuIdea: React.FC<{ idea: IdeaDelTaller; onCambiar: (idea: IdeaDelTaller) => void }> = ({ idea, onCambiar }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const [editando, setEditando] = useState<string | null>(null);
  const { hechos, total } = contestados(idea);

  const mostrar = (c: CampoDeIdea): string | null => {
    const v = idea.valores[c.id];
    if (!v) return null;
    if (c.clase === 'choice') { const o = c.opciones?.find((x) => x.id === v); return o ? t(o.clave) : v; }
    if (c.clase === 'duration') return t('filmmaker.hubSeconds', { n: formato.numero(Number(v)) });
    if (c.clase === 'format') return latino(v);
    return v;
  };

  return (
    <View style={styles.tarjeta} accessibilityLabel={t('filmmaker.ideaCardTitle')}>
      <View style={[styles.cabeza, dir.contenedor]}>
        <IconoWee name="chispas" size={18} color={P.tinta} />
        <Text style={[textoPortada(17, '600'), dir.texto, { color: P.tinta, flex: 1 }]} accessibilityRole="header" numberOfLines={1}>{t('filmmaker.ideaCardTitle')}</Text>
        <Text style={[textoPortada(13, '500'), { color: P.tintaSecundaria }]}>{t('filmmaker.ideaCardCount', { hechos: formato.numero(hechos), total: formato.numero(total) })}</Text>
      </View>
      {CAMPOS_DE_IDEA[idea.tipo].map((c) => {
        const valor = mostrar(c);
        const pendiente = !!idea.porDecidir[c.id];
        const abierto = editando === c.id;
        const hecho = !!valor || pendiente;
        return (
          <View key={c.id} style={[styles.fila, abierto && styles.filaAbierta]}>
            <TouchableOpacity
              onPress={() => setEditando(abierto ? null : c.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={etiquetaAccesible(t(c.clave), valor ?? (pendiente ? t('filmmaker.ideaToDecide') : t('filmmaker.ideaEmptyField')))}
              accessibilityState={{ expanded: abierto }}
              style={[styles.cabezaDeFila, dir.contenedor]}
            >
              <View style={[styles.punto, hecho && styles.puntoHecho]} />
              <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tintaSecundaria, width: 112 }]} numberOfLines={2}>{t(c.clave)}</Text>
              <Text style={[textoPortada(15, valor ? '500' : '400'), dir.texto, { color: valor ? P.tinta : P.tintaSecundaria, flex: 1 }]} numberOfLines={c.larga ? 3 : 1}>
                {valor ?? (pendiente ? t('filmmaker.ideaToDecide') : t('filmmaker.ideaEmptyField'))}
              </Text>
              <IconoWee name={abierto ? 'chevronArriba' : 'redactar'} size={16} color={P.tintaSecundaria} />
            </TouchableOpacity>
            {abierto ? <Editor campo={c} idea={idea} onCambiar={onCambiar} onCerrar={() => setEditando(null)} /> : null}
          </View>
        );
      })}
    </View>
  );
};

/** El editor de una fila: un campo de texto o las opciones de una lista corta. */
const Editor: React.FC<{ campo: CampoDeIdea; idea: IdeaDelTaller; onCambiar: (i: IdeaDelTaller) => void; onCerrar: () => void }> = ({ campo, idea, onCambiar, onCerrar }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const valor = idea.valores[campo.id] ?? '';

  if (campo.clase === 'text') {
    return (
      <View style={styles.editor}>
        <TextInput
          value={valor}
          onChangeText={(v) => onCambiar(poner(idea, campo.id, v))}
          autoFocus
          multiline={!!campo.larga}
          maxLength={campo.tope || undefined}
          onSubmitEditing={campo.larga ? undefined : onCerrar}
          blurOnSubmit={!campo.larga}
          returnKeyType={campo.larga ? 'default' : 'done'}
          placeholder={t('filmmaker.ideaEmptyField')}
          placeholderTextColor={P.tintaSecundaria}
          selectionColor={P.luz}
          accessibilityLabel={t(campo.clave)}
          style={[styles.campo, textoPortada(15, '400'), dir.texto, { color: P.tinta, minHeight: campo.larga ? 76 : 44 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
        />
        <TouchableOpacity onPress={onCerrar} style={styles.listo} accessibilityRole="button" accessibilityLabel={t('filmmaker.ideaFieldDone')}>
          <Text style={[textoPortada(14, '600'), { color: P.tinta }]}>{t('filmmaker.ideaFieldDone')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const opciones: { id: string; texto: string }[] =
    campo.clase === 'choice' ? (campo.opciones ?? []).map((o) => ({ id: o.id, texto: t(o.clave) }))
    : campo.clase === 'duration' ? [...new Set([...duracionesDelTipo(idea.tipo), Number(valor) || 0].filter((n) => n > 0))].sort((a, b) => a - b).map((n) => ({ id: String(n), texto: t('filmmaker.hubSeconds', { n: formato.numero(n) }) }))
    : FORMATOS_DE_ANUNCIO.map((f) => ({ id: f, texto: latino(f) }));

  return (
    <View style={[styles.opciones, dir.contenedor]}>
      {opciones.map((o) => {
        const sel = valor === o.id;
        return (
          <TouchableOpacity key={o.id} onPress={() => onCambiar(poner(idea, campo.id, o.id))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={o.texto} accessibilityState={{ selected: sel }} style={[styles.chip, sel && styles.chipSel]}>
            <Text style={[textoPortada(14, sel ? '600' : '500'), { color: P.tinta }]}>{o.texto}</Text>
          </TouchableOpacity>
        );
      })}
      {campo.clase === 'choice' ? (
        <TouchableOpacity onPress={() => onCambiar(noSe(idea, campo.id))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.idontKnow')} accessibilityState={{ selected: !!idea.porDecidir[campo.id] }} style={[styles.chip, !!idea.porDecidir[campo.id] && styles.chipSel]}>
          <Text style={[textoPortada(14, '500'), { color: P.tinta }]}>{t('filmmaker.idontKnow')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

/**
 * LA TIRA DE ESTRUCTURA: aparece cuando la idea está lista. Los beats salen de la plantilla del tipo y los planos son una ESTIMACIÓN
 * (el mayor entre los beats y la duración dividida en tramos de 6 s). No es una propuesta de IA: el copiloto la afinará cuando esté abierto (D5).
 */
export const TiraDeEstructura: React.FC<{ idea: IdeaDelTaller }> = ({ idea }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  if (!estaLista(idea)) return null;
  const { beats, planos, segundos } = estructuraDe(idea);
  return (
    <View style={styles.estructura} accessibilityLabel={t('filmmaker.structTitle')}>
      <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmaker.structTitle')}</Text>
      <View style={[styles.beats, dir.contenedor]}>
        {beats.map((b, i) => (
          <View key={b.id} style={styles.beat}>
            <Text style={[textoPortada(12, '500'), { color: P.tintaSecundaria }]}>{formato.numero(i + 1)}</Text>
            <Text style={[textoPortada(14, '500'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{t(b.clave)}</Text>
          </View>
        ))}
      </View>
      <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>
        {t('filmmaker.structSummary', { planos: formato.numero(planos), segundos: formato.numero(segundos) })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tarjeta: { borderRadius: 20, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie, paddingHorizontal: 14, paddingVertical: 10 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  fila: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.borde },
  filaAbierta: { paddingBottom: 10 },
  cabezaDeFila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6 },
  punto: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: P.bordeLuz },
  puntoHecho: { backgroundColor: P.tinta, borderColor: P.tinta },
  editor: { gap: 8 },
  campo: { borderRadius: 14, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.fondo, paddingHorizontal: 12, paddingVertical: 10 },
  listo: { alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeLuz, alignItems: 'center', justifyContent: 'center' },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center' },
  chipSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  estructura: { borderRadius: 20, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, padding: 14, gap: 10 },
  beats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  beat: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: P.fondo, borderWidth: 1, borderColor: P.bordeCapsula },
});
