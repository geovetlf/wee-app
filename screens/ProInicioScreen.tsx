import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import useWallet from '../hooks/useWallet';
import { textoDeObjetivo } from '../i18n/servidor';
import { projectsService, WeeProject } from '../services/projectsService';
import { AssetDoc, assetsService } from '../services/assetsService';
import { creatorService, CreatorJob, claveDelEstado } from '../services/creatorService';
import { RejillaDeCreaciones } from '../components/creator/RejillaDeCreaciones';
import { RADIO_DE_CREATOR, RejillaDeCreator, TituloDeCreator, useColumnaDeCreator } from '../components/creator/PiezasDeCreator';
import { EstadoDeMotor, HERRAMIENTAS_PROFESIONALES, MOTORES_PROFESIONALES } from '../constants/espacioProfesional';
import { WEE_EXPERIENCES } from '../constants/weeExperiences';

const RECIENTES = 4;
const TRABAJOS_RECIENTES = 3;

const CLAVE_DE_ESTADO_DE_MOTOR: Record<EstadoDeMotor, string> = {
  conectado: 'business.connected',
  pendiente: 'music.statePending',
  cerrado: 'profesional.engineClosed',
};

/**
 * EL INICIO DE WEË VERSIÓN CREATOR: DONDE SE EMPIEZA A TRABAJAR.
 *
 * Las secciones de Weë AI, lo último de la cuenta, sus Credits y lo que el código
 * sabe de cada motor. Lo social es de la versión
 * app: aquí no hay muro, ni Weëls, ni tendencias. Los proyectos y las creaciones
 * salen de los mismos servicios que en la versión app, por la misma cuenta, así
 * que son los mismos. Lo que no se ha podido leer no se enseña como si estuviera
 * vacío.
 */
const ProInicioScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const { account } = useWallet();
  const { width } = useResponsive();
  const navigation = useNavigation<any>();
  const columna = useColumnaDeCreator();
  const [proyectos, setProyectos] = useState<WeeProject[] | null>(null);
  const [creaciones, setCreaciones] = useState<AssetDoc[] | null>(null);
  const [trabajos, setTrabajos] = useState<CreatorJob[] | null>(null);
  const uid = user?.uid;

  /* Al volver de crear algo, lo nuevo ya tiene que estar aquí. */
  useFocusEffect(useCallback(() => {
    if (!uid) {
      setProyectos(null);
      setCreaciones(null);
      setTrabajos(null);
      return undefined;
    }
    let cancelado = false;
    projectsService
      .list(uid)
      .then((lista) => { if (!cancelado) setProyectos(lista.slice(0, RECIENTES)); })
      .catch((error: unknown) => console.warn('No se pudieron leer los proyectos:', error));
    assetsService
      .listar(uid)
      .then((pagina) => { if (!cancelado) setCreaciones(pagina.items.slice(0, RECIENTES)); })
      .catch((error: unknown) => console.warn('No se pudieron leer las creaciones:', error));
    creatorService
      .getMyJobs(uid, TRABAJOS_RECIENTES)
      .then((lista) => { if (!cancelado) setTrabajos(lista); })
      .catch((error: unknown) => console.warn('No se pudieron leer los trabajos:', error));
    return () => { cancelado = true; };
  }, [uid]));

  /* Lo mismo que hace Mis creaciones al abrir un material que salió de un trabajo. */
  const abrirCreacion = (asset: AssetDoc) => {
    const experienceId = typeof asset.metadata?.experienceId === 'string' ? asset.metadata.experienceId : '';
    if (asset.provenance.jobId && experienceId) {
      navigation.navigate('CreatorFlow', { experienceId, jobId: asset.provenance.jobId });
      return;
    }
    navigation.navigate('MisCreaciones');
  };

  const herramientas = HERRAMIENTAS_PROFESIONALES.map((h) => {
    const experiencia = WEE_EXPERIENCES.find((e) => e.id === h.id);
    return {
      id: h.id,
      icono: h.icono,
      titulo: h.nombre,
      pista: experiencia ? t(experiencia.claveDescripcion) : undefined,
      onPress: () => navigation.navigate('Specialist', { id: h.id }),
    };
  });

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.pagina}>
      <View style={columna}>
        <View style={[styles.entrada, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text accessibilityRole="header" style={[styles.pregunta, { color: theme.colors.text }]}>{t('nav.weeAiQuestion')}</Text>
          <Pressable
            onPress={() => navigation.navigate('Specialist', { id: 'brain' })}
            accessibilityRole="button"
            style={[styles.crear, { backgroundColor: theme.colors.accent }]}
          >
            <Ionicons name="sparkles-outline" size={15} color="#1F2937" />
            <Text style={styles.crearTexto}>{t('profesional.createWithAi')}</Text>
          </Pressable>
        </View>

        <View style={styles.bloque}>
          <TituloDeCreator titulo="Weë AI" />
          <RejillaDeCreator puertas={herramientas} />
        </View>

        {!!user && (
          <View style={styles.bloque}>
            <TituloDeCreator titulo={t('credits.myWallet')} accion={t('credits.history')} onAccion={() => navigation.navigate('Wallet')} />
            <View style={[styles.tarjeta, styles.cifras, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.cifra}>
                <Text style={[styles.cifraValor, { color: theme.colors.text }]}>{account ? formato.numero(account.balance) : '—'}</Text>
                <Text style={[styles.detalle, { color: theme.colors.textSecondary }]}>{t('credits.currentBalance')}</Text>
              </View>
              <View style={styles.cifra}>
                <Text style={[styles.cifraValor, { color: theme.colors.text }]}>{account ? formato.numero(account.lifetimeSpent ?? 0) : '—'}</Text>
                <Text style={[styles.detalle, { color: theme.colors.textSecondary }]}>{t('credits.spent')}</Text>
              </View>
            </View>
          </View>
        )}

        {!!trabajos && trabajos.length > 0 && (
          <View style={styles.bloque}>
            <TituloDeCreator titulo={t('profesional.continueWorking')} />
            {trabajos.map((job) => (
              <Pressable
                key={job.id}
                onPress={() => navigation.navigate('CreatorFlow', { experienceId: job.experienceId, jobId: job.id })}
                accessibilityRole="button"
                style={(e: any) => [styles.tarjeta, styles.trabajo, { backgroundColor: e.hovered ? theme.colors.surface : theme.colors.card, borderColor: theme.colors.border }] as any}
              >
                <View style={styles.trabajoTextos}>
                  <Text style={[styles.trabajoTitulo, { color: theme.colors.text }]} numberOfLines={1}>{textoDeObjetivo(t, job.experienceId, job.goal)}</Text>
                  <Text style={[styles.detalle, { color: theme.colors.textSecondary }]}>
                    {t(claveDelEstado[job.status]) ?? job.status}{job.demo ? ` · ${t('weeai.demo')}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        )}

        {!!proyectos && (
          <View style={styles.bloque}>
            <TituloDeCreator titulo={t('weeai.myProjects')} accion={t('weeai.seeAllCreations')} onAccion={() => navigation.navigate('Projects')} />
            {proyectos.length > 0 ? (
              <RejillaDeCreator
                puertas={proyectos.map((p) => ({
                  id: p.id,
                  icono: 'folder-open-outline',
                  titulo: p.name,
                  onPress: () => navigation.navigate('Project', { id: p.id }),
                }))}
              />
            ) : (
              <Text style={[styles.vacio, { color: theme.colors.textSecondary }]}>{t('projects.emptyTitle')}</Text>
            )}
          </View>
        )}

        {!!creaciones && (
          <View style={styles.bloque}>
            <TituloDeCreator titulo={t('weeai.myCreations')} accion={t('weeai.seeAllCreations')} onAccion={() => navigation.navigate('MisCreaciones')} />
            {creaciones.length > 0 ? (
              <RejillaDeCreaciones items={creaciones} columnas={width < 560 ? 2 : RECIENTES} onOpen={abrirCreacion} />
            ) : (
              <Text style={[styles.vacio, { color: theme.colors.textSecondary }]}>{t('projects.noCreations')}</Text>
            )}
          </View>
        )}

        <View style={styles.bloque}>
          <TituloDeCreator titulo={t('profesional.engineStatus')} />
          <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {MOTORES_PROFESIONALES.map((m, i) => (
              <View key={m.id} style={[styles.motor, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                <Text style={[styles.trabajoTitulo, styles.motorNombre, { color: theme.colors.text }]}>{m.nombre}</Text>
                <View style={styles.motorEstado}>
                  <View style={[styles.punto, { backgroundColor: m.estado === 'conectado' ? theme.colors.success : theme.colors.textSecondary }]} />
                  <Text style={[styles.detalle, { color: theme.colors.textSecondary }]}>{t(CLAVE_DE_ESTADO_DE_MOTOR[m.estado])}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={[styles.detalle, { color: theme.colors.textSecondary }]}>{t('profesional.engineNote')}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pagina: { flexGrow: 1, paddingBottom: 40 },
  entrada: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: 20,
    borderRadius: RADIO_DE_CREATOR, borderWidth: StyleSheet.hairlineWidth,
  },
  pregunta: { flexShrink: 1, fontSize: 22, fontWeight: '600', lineHeight: 28 },
  crear: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 16, borderRadius: 999 },
  crearTexto: { color: '#1F2937', fontSize: 14, fontWeight: '600' },
  bloque: { gap: 10 },
  vacio: { fontSize: 14, lineHeight: 20 },
  tarjeta: { borderRadius: RADIO_DE_CREATOR, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, padding: 16 },
  cifra: { minWidth: 110, gap: 2 },
  cifraValor: { fontSize: 22, fontWeight: '600', lineHeight: 28, fontVariant: ['tabular-nums'] },
  detalle: { fontSize: 13, lineHeight: 18 },
  trabajo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10 },
  trabajoTextos: { flex: 1, minWidth: 0, gap: 2 },
  trabajoTitulo: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  motor: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, paddingHorizontal: 14, paddingVertical: 8 },
  motorNombre: { flexShrink: 1 },
  motorEstado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 8, height: 8, borderRadius: 4 },
});

export default ProInicioScreen;
