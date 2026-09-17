import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { useIdioma } from '../contexts/IdiomaContext';
import { IDIOMAS, filasDeIdioma, varianteDelLocale } from '../i18n/idiomas';

/*
 * CONFIGURACIÓN → IDIOMA.
 *
 * No es una pantalla nueva de nada: es la misma cabecera, la misma tarjeta y la
 * misma fila que el resto de Configuración, con la marca de selección donde
 * Weë la pone siempre. Nada de colores nuevos ni de controles inventados.
 *
 * TRES DECISIONES DE INTERFAZ QUE NO SON GRATUITAS:
 *
 * 1 · SIN BANDERAS. Un idioma no es un país. El español no es de España, el
 *     inglés no es de Estados Unidos y el árabe no cabe en ninguna bandera.
 *     Poner una obliga a elegir un país por lengua y deja fuera a todos los
 *     demás que la hablan.
 *
 * 2 · CADA IDIOMA, EN SU IDIOMA. "Deutsch", no "Alemán". Quien busca el suyo lo
 *     busca escrito como lo escribiría él, y si la app está ahora mismo en una
 *     lengua que no entiende, un nombre traducido no le sirve para nada.
 *
 * 3 · LOS QUE FALTAN SE VEN, APAGADOS. Están en la lista con un "Próximamente"
 *     y no se pueden tocar. Es más honesto que esconderlos: se ve que Weë va a
 *     ir a más y no se promete nada que no exista.
 */
const IdiomaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const { theme } = useTheme();
  const { t, idioma, locale, cambiarIdioma } = useIdioma();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        paddingTop: isDesktop ? 0 : insets.top + 8,
      }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('language.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/*
          Se dice antes de tocar nada: cambiar el idioma cambia Weë, no lo que
          escribe la gente. Es la duda que tiene cualquiera al ver esta lista.
        */}
        <Text style={[styles.explicacion, { color: theme.colors.textSecondary }]}>
          {t('language.explanation')}
        </Text>

        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {/*
              Una fila por idioma, salvo los que tienen escrituras distintas: el
              chino pinta dos —简体 y 繁體— y sigue siendo UN idioma. La marca de
              selección compara la VARIANTE, no el idioma, porque con el chino
              puesto los dos comparten `idioma === 'zh'` y si no, se marcarían
              las dos filas a la vez.
            */}
            {filasDeIdioma().map((fila) => {
              const variante = varianteDelLocale(locale);
              const puesto = variante
                ? fila.idioma === idioma && fila.clave === variante.locale
                : fila.clave === idioma;
              return (
                <TouchableOpacity
                  key={fila.clave}
                  style={[styles.fila, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
                  onPress={() => cambiarIdioma(fila.clave)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: puesto }}
                  accessibilityLabel={fila.nombreNativo}
                >
                  <Text
                    style={[
                      styles.nombre,
                      { color: theme.colors.text },
                      puesto && styles.nombrePuesto,
                    ]}
                    /* El nombre va en su propio idioma, así que también en su
                       propia dirección: el árabe se alineará solo cuando llegue. */
                    // eslint-disable-next-line react-native/no-raw-text
                  >
                    {fila.nombreNativo}
                  </Text>
                  {puesto && (
                    <Ionicons name="checkmark" size={22} color={theme.colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Los que vienen. Se ven, no se tocan. */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('language.comingSoonTitle')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {IDIOMAS.filter((i) => !i.listo).map((i) => (
              <View
                key={i.codigo}
                style={[styles.fila, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
              >
                <Text style={[styles.nombre, { color: theme.colors.textSecondary }]}>{i.nombreNativo}</Text>
                <Text style={[styles.pronto, { color: theme.colors.textSecondary }]}>
                  {t('language.comingSoon')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
};

/* Mismas medidas que SettingsScreen: esto tiene que parecer la misma pantalla. */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4, width: 32 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerRight: { width: 32 },
  content: { flex: 1 },
  explicacion: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 12, overflow: 'hidden' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nombre: { fontSize: 16, flexShrink: 1 },
  nombrePuesto: { fontWeight: '600' },
  pronto: { fontSize: 12 },
});

export default IdiomaScreen;
