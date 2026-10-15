import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { Nota, Tarjeta, TituloDeBloque } from './piezas';
import { CAPACIDADES_MUSIC, capacidadUsable } from '../../constants/musicCapabilities';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';

/**
 * «QUÉ PUEDE HACER WEË MUSIC HOY» — la matriz de capacidades hecha pantalla.
 * Una fila por capacidad: su nombre, su estado real (implementada / preparada / pendiente), si está habilitada, qué
 * proveedores la declaran en su documentación pública (confirmación documental, NO integración), y el coste, que hoy
 * es siempre «por confirmar». Los nombres de proveedor son marcas de terceros y se escriben tal cual.
 */
const MatrizDeCapacidades: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  return (
    <View style={s.raiz}>
      <TituloDeBloque>{t('music.matrixTitle')}</TituloDeBloque>
      <Nota>{t('music.matrixNote')}</Nota>
      {CAPACIDADES_MUSIC.map((c) => {
        const usable = capacidadUsable(c.id);
        const color = c.estado === 'implementada' ? theme.colors.success : c.estado === 'preparada' ? theme.colors.warning : theme.colors.textSecondary;
        return (
          <Tarjeta key={c.id}>
            <View style={s.fila}>
              <Text style={[s.nombre, { color: theme.colors.text, flex: 1 }]}>{t(`music.${c.claveTitulo}`)}</Text>
              <View style={[s.pill, { borderColor: color + '88', backgroundColor: color + '18' }]}>
                <Text style={[s.pillTexto, { color: theme.colors.text }]}>{t(`music.status_${c.estado}`)}</Text>
              </View>
            </View>
            <Nota>{t(`music.${c.claveNota}`)}</Nota>
            <Nota>
              {t('music.matrixEnabled', { valor: t(usable ? 'music.yes' : 'music.no') })}
              {' · '}
              {t('music.matrixProviders', { lista: c.proveedores.length ? formato.lista(c.proveedores.map((p) => t(`music.provider_${p}`))) : t('music.none') })}
              {' · '}
              {t(c.coste === 'sinCoste' ? 'music.matrixNoCost' : 'music.costUnknownShort')}
            </Nota>
          </Tarjeta>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  pill: { borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  pillTexto: { fontSize: FONT_SIZE.xs },
});

export default MatrizDeCapacidades;
