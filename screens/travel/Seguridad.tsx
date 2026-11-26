import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { AvisoDemo, Boton, Fila, TituloDeSeccion } from '../../components/travel/Piezas';
import { AlertaViaje, TarjetaLugar } from '../../components/travel/Tarjetas';
import { DialogoConfirmacionIA } from '../../components/travel/Brain';
import { TRAVEL } from '../../components/travel/tema';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { AYUDA, CONSEJOS_DE_SEGURIDAD, LUGARES } from '../../constants/travelDemo';
import { useTravelNav } from './rutas';

/*
 * 4 · EXPLORAR — Travel Safe y el modo emergencia.
 *
 * TODO ES DEMO Y LO DICE EN GRANDE: los teléfonos son marcadores («000»), los sitios son de ejemplo y ningún botón
 * llama a nadie. Nunca se presenta como información de emergencia real; el aviso rojo va siempre arriba.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];

const AvisoNoReal: React.FC = () => {
  const { t } = useTextosDeTravel();
  return <AvisoDemo fuerte texto={t('travel.notRealEmergency')} />;
};

export const SeguridadScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const [llamar, setLlamar] = useState<string | null>(null);
  const ayuda = AYUDA.find((a) => a.id === llamar);
  return (
    <MarcoDeTravel titulo={x.t('travel.travelSafe')} subtitulo={x.t('travel.travelSafeSub')} icono="shield-checkmark-outline" demo contextoBrain={x.t('travel.brainCtxSafety')}>
      <AvisoNoReal />
      <Boton texto={x.t('travel.emergencyMode')} icono="alert-circle" variante="peligro" onPress={() => ir('emergencia')} />
      <View style={s.bloque}>
        <TituloDeSeccion titulo={x.t('travel.emergencyNumbers')} />
        {AYUDA.map((a) => <Fila key={a.id} icono={a.icono} tono={a.tipo === 'emergencias' ? TRAVEL.peligro : undefined} titulo={x.t(a.titulo)} subtitulo={a.metros ? x.distancia(a.metros) : x.t('travel.demoNumber')} derecha={a.telefono} onPress={() => setLlamar(a.id)} />)}
      </View>
      <View style={s.bloque}>
        <TituloDeSeccion titulo={x.t('travel.weatherAlerts')} />
        <AlertaViaje icono="rainy-outline" tono="aviso" titulo={x.t('travel.alertRainTitle')} texto={x.t('travel.alertRainText')} />
        <AlertaViaje icono="thermometer-outline" titulo={x.t('travel.alertHeatTitle')} texto={x.t('travel.alertHeatText')} />
      </View>
      <View style={s.bloque}>
        <TituloDeSeccion titulo={x.t('travel.safetyInfo')} />
        {CONSEJOS_DE_SEGURIDAD.map((c, i) => <Fila key={c} icono={(['eye-outline', 'card-outline', 'call-outline', 'document-lock-outline'] as Icono[])[i]} titulo={x.t(c)} />)}
      </View>
      <View style={s.bloque}>
        <TituloDeSeccion titulo={x.t('travel.localHelp')} />
        {LUGARES.filter((l) => l.categoria === 'salud' || l.categoria === 'servicios').map((l) => <TarjetaLugar key={l.id} lugar={l} onPress={() => ir('lugar', l.id)} />)}
      </View>
      <DialogoConfirmacionIA
        visible={!!ayuda}
        titulo={ayuda ? x.t(ayuda.titulo) : ''}
        texto={x.t('travel.demoCallText')}
        confirmar={x.t('travel.understood')}
        onConfirmar={() => setLlamar(null)}
        onCancelar={() => setLlamar(null)}
      />
    </MarcoDeTravel>
  );
};

export const EmergenciaScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const [aviso, setAviso] = useState<string | null>(null);
  const botones: { id: string; icono: Icono; titulo: string }[] = [
    { id: 'emergencias', icono: 'alert-circle', titulo: 'travel.safeEmergency' },
    { id: 'policia', icono: 'shield', titulo: 'travel.safePolice' },
    { id: 'hospital', icono: 'medkit', titulo: 'travel.safeHospital' },
    { id: 'embajada', icono: 'flag', titulo: 'travel.safeEmbassy' },
  ];
  return (
    <MarcoDeTravel titulo={x.t('travel.emergencyMode')} subtitulo={x.t('travel.emergencySub')} icono="alert-circle-outline" demo sinBrain>
      <AvisoNoReal />
      <View style={s.rejilla}>
        {botones.map((b) => (
          <TouchableOpacity key={b.id} style={s.boton} onPress={() => setAviso(b.id)} accessibilityRole="button" activeOpacity={0.85}>
            <Ionicons name={b.icono} size={34} color="#FFFFFF" />
            <Text style={s.botonTexto} numberOfLines={2}>{x.t(b.titulo)}</Text>
            <Text style={s.botonSub}>{AYUDA.find((a) => a.id === b.id)?.telefono}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Fila icono="location-outline" titulo={x.t('travel.shareLocation')} subtitulo={x.t('travel.shareLocationDemo')} onPress={() => setAviso('ubicacion')} />
      <Fila icono="medkit-outline" titulo={x.t('travel.nearestHospital')} subtitulo={x.distancia(AYUDA.find((a) => a.id === 'hospital')?.metros ?? 0)} onPress={() => ir('seguridad')} />
      <DialogoConfirmacionIA visible={!!aviso} titulo={x.t('travel.demo')} texto={x.t('travel.demoCallText')} confirmar={x.t('travel.understood')} onConfirmar={() => setAviso(null)} onCancelar={() => setAviso(null)} />
    </MarcoDeTravel>
  );
};

const s = StyleSheet.create({
  bloque: { gap: 10 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  boton: { width: '47%', flexGrow: 1, minHeight: 130, borderRadius: 22, backgroundColor: TRAVEL.peligro, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  botonTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  botonSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
});
