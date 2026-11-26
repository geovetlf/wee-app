import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import EspacioDeEscritura from '../EspacioDeEscritura';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { useResponsive } from '../../hooks/useResponsive';
import { IconoWee } from '../icons/IconoWee';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SP } from '../../constants/estiloWeeAi';
import { BotonPrincipal, SelectorDeCara, Aviso } from './PiezasDeCrear';

export interface OpcionesDePublicar {
  texto: string;
  mostrarIdea: boolean;
}

interface Props {
  visible: boolean;
  /** «Publicar como Weël» o «Publicar en el Ẅall». */
  titulo: string;
  caras: { id: string; tipo?: 'real' | 'wee'; nombre: string }[];
  cara: string;
  onCara: (id: string) => void;
  /** La línea automática de «Cómo lo hice» (tipo y duración), ya en el idioma de quien mira. */
  lineaDeComo: string;
  idea: string;
  /** Si se recrea el estilo de alguien: «Inspirado en …». */
  inspiradoEn?: string;
  onPublicar: (o: OpcionesDePublicar) => Promise<boolean>;
  onCerrar: () => void;
}

/**
 * PUBLICAR, EN UNA HOJA (boceto 06): sin pantalla nueva. Quién publica, un texto opcional y «Cómo lo hice» ya relleno
 * —sin datos técnicos: ni modelos, ni proveedores, ni prompts internos—, con el interruptor «Mostrar mi idea» (esa idea
 * es la que viaja con «Recrear este estilo»). Publicar es gratis: no toca Credits.
 */
const HojaDePublicar: React.FC<Props> = ({ visible, titulo, caras, cara, onCara, lineaDeComo, idea, inspiradoEn, onPublicar, onCerrar }) => {
  const t = useT();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const [texto, setTexto] = useState('');
  const [mostrarIdea, setMostrarIdea] = useState(true);
  const [publicando, setPublicando] = useState(false);
  const [fallo, setFallo] = useState(false);

  useEffect(() => { if (visible) { setFallo(false); setPublicando(false); } }, [visible]);

  const publicar = async () => {
    setPublicando(true);
    setFallo(false);
    const ok = await onPublicar({ texto, mostrarIdea }).catch(() => false);
    setPublicando(false);
    if (!ok) setFallo(true);
  };

  const ideaCorta = idea.trim().length > 60 ? `${idea.trim().slice(0, 60)}…` : idea.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar} accessibilityViewIsModal>
      {/* El teclado se acomoda con la pieza común de Weë (iOS mide solo; Android lo rellena): el texto y «Publicar» siguen a la vista. */}
      <EspacioDeEscritura style={styles.fondo}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCerrar} accessibilityRole="button" accessibilityLabel={t('publicar.cerrar')} activeOpacity={1} />
        <View style={[styles.hoja, isDesktop ? styles.hojaEscritorio : null, { paddingBottom: Math.max(insets.bottom, SP.md) + SP.sm }]}>
          <View style={styles.tirador} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
            <View style={[styles.cabecera, dir.contenedor]}>
              <Text style={[textoPortada(20, '600'), styles.encoge, dir.texto, { color: P.tinta }]} accessibilityRole="header">{titulo}</Text>
              <TouchableOpacity onPress={onCerrar} style={styles.cerrar} accessibilityRole="button" accessibilityLabel={t('publicar.cerrar')}>
                <IconoWee name="cerrar" size={22} color={P.tintaSecundaria} />
              </TouchableOpacity>
            </View>

            <SelectorDeCara caras={caras} puesta={cara} onElegir={onCara} etiqueta={t('publicar.quienPublica')} />

            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder={t('publicar.textoDeLaPublicacion')}
              placeholderTextColor={P.tintaDeshabilitada}
              multiline
              maxLength={2000}
              style={[textoPortada(15, '400', { lineHeight: 21 }), styles.campo, dir.texto, { color: P.tinta }]}
              accessibilityLabel={t('publicar.textoDeLaPublicacion')}
            />

            <View style={styles.como}>
              <View style={[styles.fila, dir.contenedor]}>
                <Text style={[textoPortada(14, '600'), styles.encoge, dir.texto, { color: P.tinta }]}>{t('wall.howIMadeIt')}</Text>
                <View style={styles.auto}><Text style={[textoPortada(11, '600'), { color: P.tintaSecundaria }]}>{t('publicar.automatico')}</Text></View>
              </View>
              <Text style={[textoPortada(13, '400', { lineHeight: 20 }), dir.texto, { color: P.tintaSecundaria }]}>
                <Text style={{ color: P.tinta }}>{t('publicar.hechoConWeeAi')}</Text>{` · ${lineaDeComo}`}
              </Text>
              {mostrarIdea && ideaCorta ? <Text style={[textoPortada(13, '400', { lineHeight: 20 }), dir.texto, { color: P.tintaSecundaria }]}>{t('publicar.ideaCitada', { idea: ideaCorta })}</Text> : null}
              {inspiradoEn ? <Text style={[textoPortada(13, '400', { lineHeight: 20 }), dir.texto, { color: P.tintaSecundaria }]}>{inspiradoEn}</Text> : null}
              <View style={[styles.fila, styles.interruptor, dir.contenedor]}>
                <View style={styles.encoge}>
                  <Text style={[textoPortada(14, '500'), dir.texto, { color: P.tinta }]}>{t('publicar.mostrarMiIdea')}</Text>
                  <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('publicar.mostrarMiIdeaHint')}</Text>
                </View>
                <Switch
                  value={mostrarIdea}
                  onValueChange={setMostrarIdea}
                  trackColor={{ false: P.bordeCapsula, true: P.tinta }}
                  thumbColor={mostrarIdea ? P.fondo : '#C9CED6'}
                  accessibilityLabel={t('publicar.mostrarMiIdea')}
                  accessibilityHint={t('publicar.mostrarMiIdeaHint')}
                />
              </View>
            </View>

            {fallo ? <Aviso texto={t('publicar.errorPublicar')} /> : null}
            <BotonPrincipal texto={publicando ? t('publicar.publicando') : t('publicar.publicarBoton')} onPress={publicar} ocupado={publicando} />
          </ScrollView>
        </View>
      </EspacioDeEscritura>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  hoja: { backgroundColor: P.fondoSecundario, borderTopStartRadius: 28, borderTopEndRadius: 28, borderColor: P.borde, borderTopWidth: 1, paddingTop: 10, paddingHorizontal: SP.md, maxHeight: '92%', width: '100%', alignSelf: 'center' },
  hojaEscritorio: { maxWidth: 560, borderRadius: 28, marginBottom: SP.xl, borderWidth: 1 },
  tirador: { width: 40, height: 5, borderRadius: 3, backgroundColor: P.bordeCapsula, alignSelf: 'center', marginBottom: 12 },
  contenido: { gap: 12, paddingBottom: SP.xs },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  encoge: { flex: 1, minWidth: 0 },
  campo: { backgroundColor: P.superficie, borderColor: P.borde, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, minHeight: 64, maxHeight: 160, textAlignVertical: 'top' },
  como: { backgroundColor: P.superficie, borderColor: P.borde, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  auto: { borderColor: P.bordeCapsula, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  interruptor: { marginTop: 4 },
});

export default HojaDePublicar;
