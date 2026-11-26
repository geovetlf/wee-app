import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { StyleSheet, Text, View } from 'react-native';
import { useIdioma } from '../../contexts/IdiomaContext';
import { formatearDuracion, formatearNumero, formatearTiempoRelativo } from '../../i18n/formato';
import { AvisoDelPersonaje } from '../../services/autonomyService';
import { HORAS_DE_CADUCIDAD_DE_APROBACION } from '../../utils/personajeFicha';
import { COLOR, ESPACIO, LINEA, RADIO, TIPO } from './estilo';
import Icono from './Iconos';
import { Boton, Rotulo } from './Piezas';

/*
 * LA BANDEJA DE APROBACIONES DEL PERSONAJE.
 *
 * Una bandeja que se revisa EN LOTE, no un aviso a cada rato: lo pendiente va
 * arriba, ordenado por lo que caduca antes, y caduca a las 24 horas (lo que
 * caduca no se hace). Dos clases de aviso, escritos por el servidor:
 *
 *   · `aprobacion`: el personaje quiere hacer algo (hoy, publicar) y enseña su
 *     borrador. Aprobar / Rechazar llaman al servidor; la app no publica nada.
 *   · `delicado`: informativo. Le hablaron de dinero, salud, datos tuyos…
 *   · `revision`: informativo. Lo que iba a decir traía contacto, un enlace o
 *     dinero, y NO salió (lo detuvo la revisión sin coste del servidor).
 *
 * Lo resuelto o caducado se ve atenuado con su estado. Un aviso «pendiente»
 * cuya hora de caducar ya pasó se pinta como caducado aunque el servidor aún no
 * lo haya marcado: así nadie pulsa «Aprobar» sobre algo que ya no se hará.
 */

type EstadoVisible = 'pendiente' | 'aprobado' | 'rechazado' | 'caducado';

const CLAVE_DE_ESTADO: Record<Exclude<EstadoVisible, 'pendiente'>, string> = {
  aprobado: 'character.stateApproved',
  rechazado: 'character.stateRejected',
  caducado: 'character.stateExpired',
};

const CLAVE_DE_ACCION: Record<string, string> = {
  publicar: 'character.approvalPublish',
  escribir: 'character.approvalWriteFirst',
};

const CLAVE_DE_REVISION: Record<string, string> = {
  contacto: 'character.reviewContact',
  enlace: 'character.reviewLink',
  dinero: 'character.reviewMoney',
};

/** El nombre público de un perfil (los perfiles se leen libremente). Vacío mientras carga o si no hay. */
function useNombreDe(perfilId?: string): string {
  const [nombre, setNombre] = useState('');
  useEffect(() => {
    let vivo = true;
    if (!perfilId) { setNombre(''); return; }
    getDoc(doc(db, 'users', perfilId)).then((s) => { if (vivo) setNombre(String(s.data()?.displayName || s.data()?.username || '')); }).catch(() => undefined);
    return () => { vivo = false; };
  }, [perfilId]);
  return nombre;
}

const ParaQuien: React.FC<{ perfilId?: string }> = ({ perfilId }) => {
  const { t } = useIdioma();
  const nombre = useNombreDe(perfilId);
  return nombre ? <Text style={s.pieTexto}>{t('character.approvalWriteFirstTo', { nombre })}</Text> : null;
};

export const estadoVisible = (a: AvisoDelPersonaje, ahora: number): EstadoVisible => {
  if (a.estado === 'aprobado' || a.estado === 'rechazado' || a.estado === 'caducado') return a.estado;
  if (typeof a.caducaEn === 'number' && a.caducaEn <= ahora) return 'caducado';
  return 'pendiente';
};

interface Props {
  avisos: AvisoDelPersonaje[];
  ahora: number;
  /** El texto ya traducido de un caso delicado. */
  textoDelCaso: (caso?: string) => string;
  onAprobar: (avisoId: string) => void;
  onRechazar: (avisoId: string) => void;
  /** El aviso que se está resolviendo ahora mismo (sus botones esperan). */
  resolviendo: string | null;
}

const BandejaDeAprobaciones: React.FC<Props> = ({ avisos, ahora, textoDelCaso, onAprobar, onRechazar, resolviendo }) => {
  const { t, locale } = useIdioma();

  const ordenados = useMemo(() => {
    const conEstado = avisos.map((a) => ({ a, estado: estadoVisible(a, ahora) }));
    const porRevisar = conEstado
      .filter((x) => x.a.tipo === 'aprobacion' && x.estado === 'pendiente')
      .sort((x, y) => (x.a.caducaEn ?? Infinity) - (y.a.caducaEn ?? Infinity));
    const resto = conEstado.filter((x) => !porRevisar.includes(x)).sort((x, y) => y.a.creadoEn - x.a.creadoEn);
    return { porRevisar, resto };
  }, [avisos, ahora]);

  const pendientes = ordenados.porRevisar.length;

  return (
    <View style={s.bandeja}>
      <View style={s.cabeza}>
        <Icono nombre="bandeja" tamano={18} color={COLOR.texto} />
        <Text style={s.titulo} accessibilityRole="header">{t('character.inboxTitle')}</Text>
        {pendientes > 0 ? <Rotulo relleno texto={t('character.inboxPending', { n: formatearNumero(pendientes, locale) })} /> : null}
      </View>
      <Text style={s.nota}>{t('character.inboxHint', { horas: formatearNumero(HORAS_DE_CADUCIDAD_DE_APROBACION, locale) })}</Text>

      {avisos.length === 0 ? (
        <View style={s.vacio}>
          <Icono nombre="bandeja" tamano={22} color={COLOR.textoTenue} />
          <Text style={s.vacioTexto}>{t('character.inboxEmpty')}</Text>
        </View>
      ) : (
        <View style={s.lista}>
          {[...ordenados.porRevisar, ...ordenados.resto].map(({ a, estado }) => {
            const esAprobacion = a.tipo === 'aprobacion';
            const esRevision = a.tipo === 'revision';
            const resuelto = estado !== 'pendiente';
            const titulo = esAprobacion
              ? t(CLAVE_DE_ACCION[a.accion || ''] || 'character.approvalGeneric')
              : esRevision ? t(CLAVE_DE_REVISION[a.motivo || ''] || 'character.reviewContact') : textoDelCaso(a.caso);
            const cuando = typeof a.creadoEn === 'number' ? formatearTiempoRelativo(a.creadoEn, locale, ahora) : '';
            const ocupado = resolviendo === a.id;
            /* Lo que pasa al aprobar depende de lo que pide: un saludo se ENVÍA; con imagen o vídeo se ENCARGA (cuesta Credits). */
            const esSaludo = esAprobacion && a.accion === 'escribir';
            const pistaDeAprobar = esSaludo ? 'character.approveHintGreeting' : a.borrador?.medio ? 'character.approveHintMedia' : 'character.approveHint';
            const pistaDeRechazar = esSaludo ? 'character.rejectHintGreeting' : 'character.rejectHint';
            return (
              <View key={a.id} style={[s.aviso, esAprobacion && !resuelto && s.avisoAbierto, resuelto && s.avisoResuelto]}>
                <View style={s.avisoCabeza}>
                  <Icono nombre={esAprobacion ? 'publicar' : 'delicado'} tamano={18} color={resuelto ? COLOR.textoTenue : COLOR.texto} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.avisoTipo}>{esAprobacion ? t('character.approvalLabel') : esRevision ? t('character.reviewLabel') : t('character.noticeLabel')}</Text>
                    <Text style={[s.avisoTitulo, resuelto && s.textoResuelto]}>{titulo}</Text>
                  </View>
                  {resuelto ? <Rotulo texto={t(CLAVE_DE_ESTADO[estado as Exclude<EstadoVisible, 'pendiente'>])} /> : null}
                </View>

                {esAprobacion && a.accion === 'escribir' ? <ParaQuien perfilId={a.destinatario} /> : null}

                {esAprobacion && a.borrador?.medio ? (
                  <View style={s.medio}>
                    <Icono nombre={a.borrador.medio.tipo === 'video' ? 'video' : 'imagen'} tamano={16} color={COLOR.textoSecundario} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.pieTexto}>{t(a.borrador.medio.tipo === 'video' ? 'character.draftWithVideo' : 'character.draftWithImage', { descripcion: a.borrador.medio.descripcion })}</Text>
                      {!resuelto ? <Text style={s.pieTexto}>{t('character.draftMediaNote')}</Text> : null}
                    </View>
                  </View>
                ) : null}

                {esAprobacion && a.borrador?.texto ? (
                  <View style={s.borrador} accessible accessibilityLabel={t('character.draftA11y', { texto: a.borrador.texto })}>
                    <Text style={[s.borradorTexto, resuelto && s.textoResuelto]} numberOfLines={resuelto ? 2 : 12}>{a.borrador.texto}</Text>
                  </View>
                ) : null}

                {esRevision && a.texto ? (
                  <View style={s.borrador} accessible accessibilityLabel={t('character.draftA11y', { texto: a.texto })}>
                    <Text style={[s.borradorTexto, s.textoResuelto]} numberOfLines={6}>{a.texto}</Text>
                    <Text style={s.pieTexto}>{t('character.reviewNote')}</Text>
                  </View>
                ) : null}

                <View style={s.pie}>
                  {cuando ? <Text style={s.pieTexto}>{cuando}</Text> : null}
                  {esAprobacion && !resuelto && typeof a.caducaEn === 'number' ? (
                    <View style={s.caduca}>
                      <Icono nombre="reloj" tamano={14} color={COLOR.textoSecundario} />
                      <Text style={s.pieTexto}>{t('character.expiresIn', { tiempo: formatearDuracion(a.caducaEn - ahora, locale) })}</Text>
                    </View>
                  ) : null}
                </View>

                {esAprobacion && !resuelto ? (
                  <View style={s.botones}>
                    <Boton
                      texto={t('character.approve')}
                      icono="aprobar"
                      pista={t(pistaDeAprobar)}
                      onPress={() => onAprobar(a.id)}
                      cargando={ocupado}
                      disabled={!!resolviendo && !ocupado}
                      style={s.boton}
                    />
                    <Boton
                      texto={t('character.reject')}
                      icono="rechazar"
                      variante="secundario"
                      pista={t(pistaDeRechazar)}
                      onPress={() => onRechazar(a.id)}
                      disabled={!!resolviendo}
                      style={s.boton}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  bandeja: { gap: ESPACIO.md },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.sm, flexWrap: 'wrap' },
  titulo: { ...TIPO.seccion, color: COLOR.texto, flexShrink: 1 },
  nota: { ...TIPO.pequeno, color: COLOR.textoSecundario },
  vacio: { alignItems: 'center', gap: ESPACIO.sm, paddingVertical: ESPACIO.xl, borderRadius: RADIO.lg, borderWidth: LINEA, borderColor: COLOR.linea, borderStyle: 'dashed' },
  vacioTexto: { ...TIPO.pequeno, color: COLOR.textoTenue },
  lista: { gap: ESPACIO.md, marginTop: ESPACIO.xs },
  aviso: { padding: ESPACIO.lg, borderRadius: RADIO.lg, borderWidth: LINEA, borderColor: COLOR.linea, backgroundColor: COLOR.carbon, gap: ESPACIO.md },
  avisoAbierto: { borderColor: COLOR.lineaFuerte, backgroundColor: COLOR.superficie },
  avisoResuelto: { opacity: 0.6 },
  avisoCabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: ESPACIO.md },
  avisoTipo: { ...TIPO.rotulo, color: COLOR.textoTenue },
  avisoTitulo: { ...TIPO.cuerpoFuerte, color: COLOR.texto, marginTop: ESPACIO.xxs },
  textoResuelto: { color: COLOR.textoSecundario },
  medio: { flexDirection: 'row', alignItems: 'flex-start', gap: ESPACIO.sm },
  borrador: { borderStartWidth: 2, borderStartColor: COLOR.blanco, paddingStart: ESPACIO.md, paddingVertical: ESPACIO.xs },
  borradorTexto: { ...TIPO.cuerpo, color: COLOR.texto },
  pie: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: ESPACIO.lg, rowGap: ESPACIO.xs },
  caduca: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.xs },
  pieTexto: { ...TIPO.pequeno, color: COLOR.textoSecundario },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.sm, marginTop: ESPACIO.xs },
  boton: { flexGrow: 1, flexBasis: 140 },
});

export default BandejaDeAprobaciones;
