import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useIdioma, useT } from '../../contexts/IdiomaContext';
import { formatearNumero } from '../../i18n/formato';
import { confirmAction } from '../../utils/notify';
import { ArchivoDeMaterial, MAX_ARCHIVOS_DE_MATERIAL, MAX_BYTES_POR_ARCHIVO, MotivoDeMaterial } from '../../utils/personajeMaterial';
import { elegirArchivo, ErrorDeMaterial, materialService, MotivoDeSubida, puedeElegirArchivos, validarAntesDeSubir } from '../../services/materialService';
import { COLOR, ESPACIO, LINEA, RADIO, TACTIL, TIPO } from './estilo';
import Icono from './Iconos';
import { Barra, Boton, Rotulo, Seccion } from './Piezas';

/*
 * EL MATERIAL DEL PERSONAJE (docs/AUTONOMIA.md § 1b), dentro de la ficha.
 *
 * El dueño sube lo que da conocimiento a su personaje —su libro, su biografía,
 * cómo es su mundo—. Es GRATIS: no gasta Credits ni llama a ninguna IA. La app
 * solo sube el archivo; el servidor lo lee, lo indexa y escribe su estado, que
 * aquí se escucha. Borrar también lo hace el servidor.
 */

const MB = Math.round(MAX_BYTES_POR_ARCHIVO / (1024 * 1024));

const MENSAJE_DE_MOTIVO: Record<MotivoDeMaterial | MotivoDeSubida, string> = {
  demasiados: 'character.materialErrorTooMany',
  muyGrande: 'character.materialErrorTooBig',
  formatoNoAdmitido: 'character.materialErrorFormat',
  sinTexto: 'character.materialErrorNoText',
  ilegible: 'character.materialErrorUnreadable',
  fallo: 'character.materialErrorUpload',
};

const MaterialDelPersonaje: React.FC<{ perfilId: string; numero: string }> = ({ perfilId, numero }) => {
  const t = useT();
  const { locale } = useIdioma();
  const [archivos, setArchivos] = useState<ArchivoDeMaterial[]>([]);
  const [derechos, setDerechos] = useState(false);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);

  useEffect(() => materialService.escuchar(perfilId, setArchivos), [perfilId]);

  // Los que ocupan cupo: los que se están leyendo y los listos (un error no ocupa).
  const usados = useMemo(() => archivos.filter((a) => a.estado !== 'error').length, [archivos]);
  const lleno = usados >= MAX_ARCHIVOS_DE_MATERIAL;
  const n = (v: number) => formatearNumero(v, locale);
  const textoDeMotivo = (m: MotivoDeMaterial | MotivoDeSubida) => t(MENSAJE_DE_MOTIVO[m], { mb: n(MB), total: n(MAX_ARCHIVOS_DE_MATERIAL) });

  const subir = async () => {
    setError(null);
    // En el teléfono el selector puede fallar (o faltar, en un build anterior a este módulo).
    const elegido = await elegirArchivo().catch(() => { setError(textoDeMotivo('fallo')); return null; });
    if (!elegido) return;
    const motivo = validarAntesDeSubir(elegido, usados);
    if (motivo) { setError(textoDeMotivo(motivo)); return; }
    setProgreso(0);
    try {
      await materialService.subir(perfilId, elegido, usados, setProgreso);
    } catch (e) {
      setError(textoDeMotivo(e instanceof ErrorDeMaterial && e.motivo in MENSAJE_DE_MOTIVO ? (e.motivo as MotivoDeSubida) : 'fallo'));
    } finally {
      setProgreso(null);
    }
  };

  const quitar = async (a: ArchivoDeMaterial) => {
    const ok = await confirmAction(t('character.materialDeleteTitle'), t('character.materialDeleteBody'), t('character.materialDelete'), true, t);
    if (!ok) return;
    setError(null);
    setQuitando(a.id);
    try { await materialService.borrar(perfilId, a.id); } catch { setError(t('character.materialErrorDelete')); } finally { setQuitando(null); }
  };

  const subiendo = progreso !== null;

  return (
    <Seccion numero={numero} titulo={t('character.materialTitle')} icono="material" pista={t('character.materialHint')}>
      <View style={s.datos}>
        <Text style={s.pista}>{t('character.materialFormats', { mb: n(MB) })}</Text>
        <Text style={s.pista}>{t('character.materialCount', { usados: n(usados), total: n(MAX_ARCHIVOS_DE_MATERIAL) })}</Text>
      </View>

      {archivos.length === 0 ? (
        <View style={s.vacio}>
          <Icono nombre="material" tamano={22} color={COLOR.textoTenue} />
          <Text style={s.vacioTexto}>{t('character.materialEmpty')}</Text>
        </View>
      ) : (
        <View style={s.lista}>
          {archivos.map((a) => (
            <View key={a.id} style={s.fila}>
              <Icono nombre="archivo" tamano={20} color={a.estado === 'error' ? COLOR.textoTenue : COLOR.texto} />
              <View style={s.filaCuerpo}>
                <Text style={s.nombre} numberOfLines={2}>{a.nombre}</Text>
                <View style={s.filaMeta}>
                  <Rotulo
                    relleno={a.estado === 'listo'}
                    texto={t(a.estado === 'listo' ? 'character.materialReady' : a.estado === 'procesando' ? 'character.materialProcessing' : 'character.materialFailed')}
                  />
                  <Text style={s.formato}>{a.formato.toUpperCase()}</Text>
                </View>
                {a.estado === 'error' && a.motivo ? <Text style={s.pista}>{textoDeMotivo(a.motivo)}</Text> : null}
                {a.estado === 'listo' && a.recortado ? <Text style={s.pista}>{t('character.materialTrimmed')}</Text> : null}
              </View>
              {a.estado !== 'procesando' ? (
                <Boton
                  variante="fantasma"
                  icono="quitar"
                  texto={t('character.materialDelete')}
                  etiqueta={`${t('character.materialDelete')}: ${a.nombre}`}
                  onPress={() => quitar(a)}
                  cargando={quitando === a.id}
                  style={s.quitar}
                />
              ) : null}
            </View>
          ))}
        </View>
      )}

      {puedeElegirArchivos ? (
        <>
          <Pressable
            onPress={() => setDerechos((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: derechos }}
            accessibilityLabel={t('character.materialRights')}
            style={s.derechos}
          >
            <View style={[s.casilla, derechos && s.casillaMarcada]}>
              {derechos ? <Icono nombre="aprobar" tamano={14} color={COLOR.sobreBlanco} /> : null}
            </View>
            <Text style={s.derechosTexto}>{t('character.materialRights')}</Text>
          </Pressable>
          {subiendo ? (
            <View style={s.subida} accessibilityLiveRegion="polite">
              <Text style={s.pista}>{t('character.materialUploading')}</Text>
              <Barra valor={progreso ?? 0} etiqueta={t('character.materialUploading')} />
            </View>
          ) : null}
          <Boton
            variante="secundario"
            icono="subir"
            texto={t('character.materialUpload')}
            onPress={subir}
            disabled={!derechos || lleno || subiendo}
            cargando={subiendo}
            pista={!derechos ? t('character.materialRightsFirst') : undefined}
          />
          {/* Un botón apagado dice por qué: sin la casilla marcada no se sube. */}
          {!derechos && !lleno && !subiendo ? <Text style={s.pista}>{t('character.materialRightsFirst')}</Text> : null}
        </>
      ) : (
        <Text style={s.pista}>{t('character.materialWebOnly')}</Text>
      )}

      {error ? <Text style={s.error} accessibilityLiveRegion="assertive">{error}</Text> : null}
      <Text style={s.nota}>{t('character.materialOriginalNote')}</Text>
    </Seccion>
  );
};

const s = StyleSheet.create({
  datos: { gap: ESPACIO.xxs },
  pista: { ...TIPO.pequeno, color: COLOR.textoSecundario },
  vacio: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md, padding: ESPACIO.lg, borderRadius: RADIO.md, borderWidth: LINEA, borderColor: COLOR.linea, borderStyle: 'dashed' },
  vacioTexto: { ...TIPO.pequeno, color: COLOR.textoSecundario, flex: 1 },
  lista: { borderTopWidth: LINEA, borderTopColor: COLOR.linea },
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md, paddingVertical: ESPACIO.md, borderBottomWidth: LINEA, borderBottomColor: COLOR.linea, minHeight: TACTIL },
  filaCuerpo: { flex: 1, minWidth: 0, gap: ESPACIO.xs },
  nombre: { ...TIPO.cuerpoFuerte, color: COLOR.texto },
  filaMeta: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.sm, flexWrap: 'wrap' },
  formato: { ...TIPO.rotulo, color: COLOR.textoTenue },
  quitar: { alignSelf: 'center' },
  derechos: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md, minHeight: TACTIL },
  casilla: { width: 22, height: 22, borderRadius: RADIO.sm / 2, borderWidth: 1, borderColor: COLOR.lineaFuerte, alignItems: 'center', justifyContent: 'center' },
  casillaMarcada: { backgroundColor: COLOR.blanco, borderColor: COLOR.blanco },
  derechosTexto: { ...TIPO.cuerpo, color: COLOR.texto, flex: 1 },
  subida: { gap: ESPACIO.sm },
  error: { ...TIPO.pequenoFuerte, color: COLOR.texto },
  nota: { ...TIPO.pequeno, color: COLOR.textoTenue },
});

export default MaterialDelPersonaje;
