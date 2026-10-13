import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { notify } from '../utils/notify';
import { documentosDePost, tamanoParaLeer, DocumentoDePost } from '../utils/documentosDePublicacion';

/**
 * LOS DOCUMENTOS DE UNA PUBLICACIÓN, en el Wäll (R9 · D). Una fila por PDF: icono de trazo, el nombre (contenido de la
 * persona: no se traduce), «PDF · 1,2 MB» y un chevrón. Tocarla lo abre con el visor del sistema (`expo-web-browser`;
 * en web, una pestaña nueva). Sin documentos no dibuja nada. Lo que llega del documento se sanea antes de pintar
 * (`documentosDePost`): una publicación la pudo escribir cualquiera.
 */
const DocumentosDelPost: React.FC<{ documentos?: unknown }> = ({ documentos }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const lista = documentosDePost(documentos);
  if (lista.length === 0) return null;

  const tamano = (d: DocumentoDePost) => {
    const { clave, valor } = tamanoParaLeer(d.bytes);
    return t(clave, { tamano: formato?.numero ? formato.numero(valor) : String(valor) });
  };
  const abrir = async (d: DocumentoDePost) => {
    try {
      await WebBrowser.openBrowserAsync(d.url);
    } catch {
      notify(t('wall.documentOpenFailed'));
    }
  };

  return (
    <View style={styles.lista}>
      {lista.map((d, i) => (
        <TouchableOpacity
          key={`${d.url}-${i}`}
          onPress={() => void abrir(d)}
          activeOpacity={0.7}
          style={[styles.fila, { borderColor: theme.colors.border }]}
          accessibilityRole="link"
          accessibilityLabel={t('wall.openDocument', { nombre: d.nombre })}
        >
          <Ionicons name="document-text-outline" size={24} color={theme.colors.text} />
          <View style={styles.textos}>
            <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={2}>{d.nombre}</Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{t('wall.documentMeta', { tipo: 'PDF', tamano: tamano(d) })}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  lista: { gap: 8, marginTop: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  nombre: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12 },
});

export default DocumentosDelPost;
