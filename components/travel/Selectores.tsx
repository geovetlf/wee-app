import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../IconoDireccional';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { nombreDeLaRegion, nombreDelIdioma } from '../../i18n/formato';
import { TRAVEL } from './tema';
import { Chip, FilaDeChips } from './Piezas';
import { MONEDAS } from '../../constants/travelDemo';

/*
 * WEËTRAVEL — SELECTORES: fecha, moneda, país e idioma. Los nombres de meses, días, monedas, países e idiomas salen
 * de Intl con el idioma activo (i18n/formato.ts): ninguno está escrito a mano.
 */

const dia = (y: number, m: number, d: number) => new Date(y, m, d, 12);
const iso = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

/** Un mes en rejilla; se elige un día. `valor` y `onCambiar` en AAAA-MM-DD. */
export const SelectorFecha: React.FC<{ valor: string; onCambiar: (iso: string) => void; resaltados?: string[] }> = ({ valor, onCambiar, resaltados = [] }) => {
  const { t, formato, locale } = useIdioma();
  const base = valor ? new Date(`${valor}T12:00:00`) : new Date();
  const [visible, setVisible] = useState(() => dia(base.getFullYear(), base.getMonth(), 1));
  const y = visible.getFullYear();
  const m = visible.getMonth();
  const celdas = useMemo(() => {
    const huecos = (dia(y, m, 1).getDay() + 6) % 7;
    const cuantos = new Date(y, m + 1, 0).getDate();
    return [...Array(huecos).fill(null), ...Array.from({ length: cuantos }, (_, i) => dia(y, m, i + 1))];
  }, [y, m]);
  const iniciales = useMemo(() => Array.from({ length: 7 }, (_, i) => formato.fecha(dia(2024, 0, 1 + i), { weekday: 'narrow' })), [formato]);
  const cabecera = formato.fecha(visible, { month: 'long', year: 'numeric' });
  return (
    <View style={s.calendario}>
      <View style={s.calCabecera}>
        <TouchableOpacity onPress={() => setVisible(dia(y, m - 1, 1))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('travel.prevMonth')}>
          <IconoDireccional name="chevron-back" size={20} color={TRAVEL.tinta} />
        </TouchableOpacity>
        <Text style={s.calMes}>{cabecera.charAt(0).toLocaleUpperCase(locale) + cabecera.slice(1)}</Text>
        <TouchableOpacity onPress={() => setVisible(dia(y, m + 1, 1))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('travel.nextMonth')}>
          <IconoDireccional name="chevron-forward" size={20} color={TRAVEL.tinta} />
        </TouchableOpacity>
      </View>
      <View style={s.calRejilla}>
        {iniciales.map((l, i) => <Text key={`i${i}`} style={s.calInicial}>{l}</Text>)}
        {celdas.map((f, i) => {
          if (!f) return <View key={`h${i}`} style={s.calCelda} />;
          const clave = iso(f);
          const elegido = clave === valor;
          const marcado = resaltados.includes(clave);
          return (
            <TouchableOpacity
              key={clave}
              onPress={() => onCambiar(clave)}
              style={[s.calCelda, marcado && s.calMarcado, elegido && s.calElegido]}
              accessibilityRole="button"
              accessibilityState={{ selected: elegido }}
              accessibilityLabel={formato.fecha(f, { day: 'numeric', month: 'long', year: 'numeric' })}
            >
              <Text style={[s.calNumero, elegido && { color: '#FFFFFF' }]}>{formato.numero(f.getDate())}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/** La moneda se elige por su código ISO 4217 (el mismo en todos los idiomas); el locale solo decide cómo se escribe el importe. */
export const SelectorMoneda: React.FC<{ valor: string; onCambiar: (m: string) => void }> = ({ valor, onCambiar }) => (
  <FilaDeChips>
    {MONEDAS.map((m) => <Chip key={m} texto={m} activo={valor === m} onPress={() => onCambiar(m)} />)}
  </FilaDeChips>
);

/** Países por su código; el nombre, de Intl.DisplayNames. Con buscador. */
export const SelectorPais: React.FC<{ codigos: string[]; elegidos: string[]; onAlternar: (codigo: string) => void }> = ({ codigos, elegidos, onAlternar }) => {
  const { t, locale } = useIdioma();
  const dir = useDireccion();
  const [q, setQ] = useState('');
  const lista = codigos
    .map((c) => ({ c, nombre: nombreDeLaRegion(c, locale) }))
    .filter((x) => !q.trim() || x.nombre.toLocaleLowerCase(locale).includes(q.trim().toLocaleLowerCase(locale)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, locale));
  return (
    <View style={s.pais}>
      <View style={s.buscar}>
        <Ionicons name="search-outline" size={17} color={TRAVEL.gris} />
        <TextInput value={q} onChangeText={setQ} placeholder={t('travel.searchCountry')} placeholderTextColor={TRAVEL.gris} style={[s.buscarInput, dir.texto]} accessibilityLabel={t('travel.searchCountry')} />
      </View>
      <View style={s.paisRejilla}>
        {lista.map((x) => <Chip key={x.c} texto={x.nombre} activo={elegidos.includes(x.c)} onPress={() => onAlternar(x.c)} />)}
      </View>
    </View>
  );
};

/** Idiomas por su código BCP 47; el nombre, de Intl.DisplayNames. */
export const SelectorIdioma: React.FC<{ codigos: string[]; valor: string; onCambiar: (c: string) => void }> = ({ codigos, valor, onCambiar }) => {
  const { locale } = useIdioma();
  return (
    <FilaDeChips>
      {codigos.map((c) => <Chip key={c} texto={nombreDelIdioma(c, locale)} activo={valor === c} onPress={() => onCambiar(c)} />)}
    </FilaDeChips>
  );
};

const s = StyleSheet.create({
  calendario: { borderRadius: 18, borderWidth: 1, borderColor: TRAVEL.borde, padding: 12, gap: 8 },
  calCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calMes: { fontSize: 15, fontWeight: '800', color: TRAVEL.tinta },
  calRejilla: { flexDirection: 'row', flexWrap: 'wrap' },
  calInicial: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700', color: TRAVEL.gris, paddingVertical: 4 },
  calCelda: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999, maxHeight: 44 },
  calMarcado: { backgroundColor: TRAVEL.lila },
  calElegido: { backgroundColor: TRAVEL.morado },
  calNumero: { fontSize: 14, fontWeight: '600', color: TRAVEL.tinta },
  pais: { gap: 10 },
  buscar: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 14, borderWidth: 1, borderColor: TRAVEL.borde, paddingHorizontal: 12 },
  buscarInput: { flex: 1, fontSize: 15, color: TRAVEL.tinta },
  paisRejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
