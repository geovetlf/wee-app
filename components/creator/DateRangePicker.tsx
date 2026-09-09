import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/*
 * ─── ¿Cuándo viajas? ────────────────────────────────────────────────────────
 *
 * Un calendario de dos toques: el primero pone la salida, el segundo el regreso.
 * No hay campos que rellenar, ni modo, ni un botón de "cambiar a regreso": la
 * pantalla dice en cada momento qué toca ("Toca el día que vuelves") y con el
 * segundo toque queda hecho. Si el segundo día es anterior al primero, empieza
 * de nuevo desde ahí, que es lo que la persona quiere decir.
 *
 * Lo que devuelve NO es una estructura: es la frase que cualquiera escribiría,
 * "del 12 al 22 de octubre de 2026". Así se lee bien en la conversación y la
 * entiende el mismo lector del servidor que ya interpreta lo que la gente teclea.
 * Un solo formato entre las dos orillas.
 *
 * No se puede elegir un día pasado. Y no hay dependencia nueva: son dos bucles
 * y una rejilla.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Mediodía UTC: así ningún huso horario mueve un día de sitio. */
const dia = (anio: number, mes: number, numero: number): Date => new Date(Date.UTC(anio, mes, numero, 12));
const hoyUTC = (): Date => {
  const ahora = new Date();
  return dia(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
};

const escrito = (fecha: Date, conAnio = true): string =>
  `${fecha.getUTCDate()} de ${MESES[fecha.getUTCMonth()]}${conAnio ? ` de ${fecha.getUTCFullYear()}` : ''}`;

/**
 * La frase con la que se habla de unas fechas. Es la MISMA que arma el servidor
 * (`frasedeFechas` en creator/templates.ts): si una cambia, cambia la otra.
 */
export const frasedeFechas = (salida: Date, regreso: Date): string => {
  if (salida.getTime() === regreso.getTime()) return `el ${escrito(salida)}`;
  const mismoMes = salida.getUTCMonth() === regreso.getUTCMonth() && salida.getUTCFullYear() === regreso.getUTCFullYear();
  if (mismoMes) return `del ${salida.getUTCDate()} al ${escrito(regreso)}`;
  return `del ${escrito(salida)} al ${escrito(regreso)}`;
};

/** "11 días · 10 noches", contando los dos extremos. */
export const duracionEscrita = (salida: Date, regreso: Date): string => {
  const noches = Math.round((regreso.getTime() - salida.getTime()) / 86400000);
  const dias = noches + 1;
  return `${dias} ${dias === 1 ? 'día' : 'días'} · ${noches} ${noches === 1 ? 'noche' : 'noches'}`;
};

interface DateRangePickerProps {
  /** Se llama con la frase lista para enviar: "del 12 al 22 de octubre de 2026". */
  onConfirm: (frase: string) => void;
  /** "Todavía no lo sé": seguir sin fechas, sin inventarse ninguna. */
  onSkip: () => void;
  busy?: boolean;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ onConfirm, onSkip, busy }) => {
  const { theme } = useTheme();
  const hoy = useMemo(hoyUTC, []);
  const [mesVisible, setMesVisible] = useState(() => dia(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const [salida, setSalida] = useState<Date | null>(null);
  const [regreso, setRegreso] = useState<Date | null>(null);

  const anio = mesVisible.getUTCFullYear();
  const mes = mesVisible.getUTCMonth();

  // Los huecos de delante: el mes empieza en lunes, no en domingo.
  const celdas = useMemo(() => {
    const primero = dia(anio, mes, 1);
    const huecos = (primero.getUTCDay() + 6) % 7;
    const cuantos = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
    return [...Array(huecos).fill(null), ...Array.from({ length: cuantos }, (_, i) => dia(anio, mes, i + 1))];
  }, [anio, mes]);

  const puedeRetroceder = anio > hoy.getUTCFullYear() || (anio === hoy.getUTCFullYear() && mes > hoy.getUTCMonth());

  const tocar = (fecha: Date) => {
    if (busy) return;
    // Sin salida, o con el viaje ya cerrado: este toque abre uno nuevo.
    if (!salida || regreso) {
      setSalida(fecha);
      setRegreso(null);
      return;
    }
    // Un día anterior a la salida no es un regreso: es una salida mejor.
    if (fecha.getTime() < salida.getTime()) {
      setSalida(fecha);
      return;
    }
    setRegreso(fecha);
  };

  const estado = (fecha: Date) => {
    const t = fecha.getTime();
    const esSalida = !!salida && t === salida.getTime();
    const esRegreso = !!regreso && t === regreso.getTime();
    const enMedio = !!salida && !!regreso && t > salida.getTime() && t < regreso.getTime();
    return { esSalida, esRegreso, enMedio, pasado: t < hoy.getTime() };
  };

  const ayuda = !salida
    ? 'Toca el día que sales.'
    : !regreso
      ? 'Ahora toca el día que vuelves.'
      : `${frasedeFechas(salida, regreso)} · ${duracionEscrita(salida, regreso)}`;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.cabecera}>
        <TouchableOpacity
          onPress={() => setMesVisible(dia(anio, mes - 1, 1))}
          disabled={!puedeRetroceder}
          style={[styles.flecha, { opacity: puedeRetroceder ? 1 : 0.3 }]}
          accessibilityLabel="Mes anterior"
        >
          <Ionicons name="chevron-back" size={scale(20)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.mes, { color: theme.colors.text }]}>{`${MESES[mes]} ${anio}`}</Text>
        <TouchableOpacity onPress={() => setMesVisible(dia(anio, mes + 1, 1))} style={styles.flecha} accessibilityLabel="Mes siguiente">
          <Ionicons name="chevron-forward" size={scale(20)} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.semana}>
        {DIAS.map((d, i) => (
          <Text key={`${d}-${i}`} style={[styles.diaSemana, { color: theme.colors.textSecondary }]}>{d}</Text>
        ))}
      </View>

      <View style={styles.rejilla}>
        {celdas.map((fecha, indice) => {
          if (!fecha) return <View key={`hueco-${indice}`} style={styles.celda} />;
          const { esSalida, esRegreso, enMedio, pasado } = estado(fecha);
          const extremo = esSalida || esRegreso;
          return (
            <View key={fecha.toISOString()} style={[styles.celda, enMedio && { backgroundColor: theme.colors.accent + '26' }]}>
              <TouchableOpacity
                onPress={() => tocar(fecha)}
                disabled={pasado || busy}
                activeOpacity={0.7}
                style={[
                  styles.dia,
                  extremo && { backgroundColor: theme.colors.accent },
                  pasado && styles.pasado,
                ]}
                accessibilityLabel={escrito(fecha)}
                accessibilityState={{ selected: extremo }}
              >
                <Text
                  style={[
                    styles.numero,
                    { color: extremo ? '#1F2937' : pasado ? theme.colors.textSecondary : theme.colors.text },
                    extremo && styles.numeroElegido,
                  ]}
                >
                  {fecha.getUTCDate()}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <Text style={[styles.ayuda, { color: regreso ? theme.colors.text : theme.colors.textSecondary }, regreso && styles.ayudaHecha]}>
        {ayuda}
      </Text>

      <View style={styles.acciones}>
        <TouchableOpacity onPress={onSkip} disabled={busy} style={styles.saltar} activeOpacity={0.7} accessibilityLabel="Todavía no lo sé">
          <Text style={[styles.saltarTexto, { color: theme.colors.textSecondary }]}>🤷 Todavía no lo sé</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => salida && onConfirm(frasedeFechas(salida, regreso || salida))}
          disabled={!salida || busy}
          activeOpacity={0.85}
          style={[styles.confirmar, { backgroundColor: salida ? theme.colors.accent : theme.colors.border }]}
          accessibilityLabel="Confirmar las fechas"
        >
          <Text style={[styles.confirmarTexto, { color: salida ? '#1F2937' : theme.colors.textSecondary }]}>Listo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    /*
     * En escritorio la conversacion es ancha, y un calendario estirado a 650 px
     * deja celdas rectangulares y kilometros de nada entre los numeros. Un mes
     * cabe en 380: mas ancho no ayuda a nadie. En movil manda el 100%.
     */
    width: '100%',
    maxWidth: scale(380),
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flecha: {
    // 44 px de verdad, sin escalar: es lo mínimo para acertar con el pulgar.
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mes: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'capitalize',
  },
  semana: {
    flexDirection: 'row',
  },
  diaSemana: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
  },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  celda: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: scale(48),
  },
  dia: {
    width: '86%',
    height: '86%',
    minWidth: 34,
    minHeight: 34,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasado: {
    opacity: 0.35,
  },
  numero: {
    fontSize: FONT_SIZE.sm,
  },
  numeroElegido: {
    fontWeight: FONT_WEIGHT.bold,
  },
  ayuda: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    minHeight: scale(20),
  },
  ayudaHecha: {
    fontWeight: FONT_WEIGHT.bold,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  saltar: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  saltarTexto: {
    fontSize: FONT_SIZE.sm,
  },
  confirmar: {
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmarTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default DateRangePicker;
