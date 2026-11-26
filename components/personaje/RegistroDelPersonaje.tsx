import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIdioma } from '../../contexts/IdiomaContext';
import { formatearNumero, formatearTiempoRelativo } from '../../i18n/formato';
import { EntradaDelRegistro } from '../../services/autonomyService';
import { COLOR, ESPACIO, LINEA, RADIO, TIPO } from './estilo';
import Icono, { NombreDeIcono } from './Iconos';
import { Boton } from './Piezas';

/*
 * LO QUE HIZO EL PERSONAJE (docs/AUTONOMIA.md): las últimas acciones de su
 * autonomía con IA, escritas por el servidor en `users/{perfil}/characterLog`.
 * Solo las ve su dueño, que puede vaciar el registro cuando quiera (lo borra el
 * servidor). No enseña lo que dijo la gente —eso vive en WeeTalk y en los
 * comentarios—: solo QUÉ hizo y cuándo.
 *
 * Va DEBAJO de la bandeja y en corto (las 5 últimas, «Ver todo» despliega): la
 * bandeja es lo que pide una decisión; el registro solo informa.
 */

export const VISIBLES_DE_ENTRADA = 5;

/** Qué texto e icono corresponde a cada entrada (claves, no frases). */
export function claveDeEntrada(e: EntradaDelRegistro): { clave: string; icono: NombreDeIcono } {
  if (e.revision || e.modo === 'detenida') return { clave: 'character.logStopped', icono: 'delicado' };
  if (e.accion === 'encargo') {
    if (e.resultado === 'sinMedio') return { clave: 'character.logEncargoNoMedia', icono: 'publicar' };
    if (e.tipo === 'video') return { clave: 'character.logEncargoVideo', icono: 'video' };
    if (e.tipo === 'busqueda') return { clave: 'character.logEncargoSearch', icono: 'buscar' };
    return { clave: 'character.logEncargoImage', icono: 'imagen' };
  }
  if (e.accion === 'publicar' && e.modo === 'encargo') return { clave: 'character.logPostedWithMedia', icono: 'publicar' };
  switch (e.accion) {
    case 'wtResponder': return { clave: 'character.logReplyChat', icono: 'voz' };
    case 'responderEnComunidad': return { clave: 'character.logReplyComment', icono: 'voz' };
    case 'publicar': return e.modo === 'borrador' ? { clave: 'character.logDraft', icono: 'bandeja' } : { clave: 'character.logPosted', icono: 'publicar' };
    case 'comentar': return { clave: 'character.logCommented', icono: 'voz' };
    case 'wtNuevaConversacion': return e.modo === 'propuesto' ? { clave: 'character.logWriteFirstProposed', icono: 'bandeja' } : { clave: 'character.logWriteFirstSent', icono: 'voz' };
    default: return { clave: 'character.logOther', icono: 'acciones' };
  }
}

interface Props {
  entradas: EntradaDelRegistro[];
  ahora: number;
  onBorrar: () => void;
  borrando: boolean;
}

const RegistroDelPersonaje: React.FC<Props> = ({ entradas, ahora, onBorrar, borrando }) => {
  const { t, locale } = useIdioma();
  const [todo, setTodo] = useState(false);
  const visibles = todo ? entradas : entradas.slice(0, VISIBLES_DE_ENTRADA);
  return (
    <View style={s.caja}>
      <View style={s.cabeza}>
        <Icono nombre="acciones" tamano={18} color={COLOR.texto} />
        <Text style={s.titulo} accessibilityRole="header">{t('character.logTitle')}</Text>
      </View>
      <Text style={s.nota}>{t('character.logHint')}</Text>
      {entradas.length === 0 ? (
        <View style={s.vacio}>
          <Icono nombre="acciones" tamano={22} color={COLOR.textoTenue} />
          <Text style={s.vacioTexto}>{t('character.logEmpty')}</Text>
        </View>
      ) : (
        <>
          <View style={s.lista}>
            {visibles.map((e, i) => {
              const { clave, icono } = claveDeEntrada(e);
              return (
                <View key={e.id} style={[s.fila, i === visibles.length - 1 && s.filaUltima]}>
                  <Icono nombre={icono} tamano={16} color={COLOR.textoSecundario} />
                  <Text style={s.texto}>{t(clave)}</Text>
                  {typeof e.en === 'number' ? <Text style={s.cuando}>{formatearTiempoRelativo(e.en, locale, ahora)}</Text> : null}
                </View>
              );
            })}
          </View>
          <View style={s.pie}>
            {entradas.length > VISIBLES_DE_ENTRADA ? (
              <Boton
                texto={todo ? t('character.logShowLess') : t('character.logShowAll', { total: formatearNumero(entradas.length, locale) })}
                variante="fantasma"
                onPress={() => setTodo((v) => !v)}
              />
            ) : null}
            <Boton texto={t('character.logClear')} icono="quitar" variante="fantasma" onPress={onBorrar} cargando={borrando} />
          </View>
        </>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  caja: { gap: ESPACIO.md },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.sm },
  titulo: { ...TIPO.seccion, color: COLOR.texto, flexShrink: 1 },
  nota: { ...TIPO.pequeno, color: COLOR.textoSecundario },
  vacio: { alignItems: 'center', gap: ESPACIO.sm, paddingVertical: ESPACIO.lg, borderRadius: RADIO.lg, borderWidth: LINEA, borderColor: COLOR.linea, borderStyle: 'dashed' },
  vacioTexto: { ...TIPO.pequeno, color: COLOR.textoTenue, textAlign: 'center' },
  lista: { borderRadius: RADIO.lg, borderWidth: LINEA, borderColor: COLOR.linea, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md, paddingVertical: ESPACIO.md, paddingHorizontal: ESPACIO.lg, borderBottomWidth: LINEA, borderBottomColor: COLOR.linea, backgroundColor: COLOR.carbon },
  texto: { ...TIPO.pequeno, color: COLOR.texto, flex: 1, minWidth: 0 },
  filaUltima: { borderBottomWidth: 0 },
  pie: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: ESPACIO.sm },
  cuando: { ...TIPO.pequeno, color: COLOR.textoTenue, flexShrink: 0 },
});

export default RegistroDelPersonaje;
