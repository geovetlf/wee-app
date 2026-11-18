import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useT } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import { AccionD1 } from '../../../constants/filmmakerCamara';
import { ejemploTraducido } from '../../../constants/filmmakerTandas';
import {
  OBJETIVO_POR_TANDA, TandasDelTaller, anadirCuadro, anadirEjemplos, anadirTanda, aprobarTanda, cargarEjemploEnTanda, cambiarObjetivo, dividirPorDuracion, duplicarCuadro, editarCuadro, guardarEnAlmacen, cambiarVozDeTanda,
  hayEjemplos, moverCuadro, moverTanda, partirTanda, puedePartir, puedeUnirConSiguiente, quitarCuadro, quitarEjemplos, quitarTanda, renombrarTanda, tandasVacias, tiemposDe, unirConSiguiente,
} from '../../../utils/tandasDeFilmmaker';
import { ListaDeTandas } from './ListaDeTandas';
import { HojaDeTanda } from './HojaDeTanda';
import { StoryboardDeTanda } from '../storyboard/StoryboardDeTanda';
import { FichaDelCuadro, PersonajeDeCuadro } from '../storyboard/FichaDelCuadro';
import { idDeEscena, idDePlano } from '../../../utils/filmmakerOrquestacion';

export interface TandasYStoryboardProps {
  /** Ancho disponible. Desde 900 dp la lista y el storyboard van lado a lado; por debajo, una sola columna con «volver». */
  ancho: number;
  compacto?: boolean;
  /** Los personajes del Universo (id, nombre y su voz por defecto), para elegir quién habla en un cuadro. */
  personajes?: readonly PersonajeDeCuadro[];
  /** Duración total de la obra en segundos (de la idea): «Weë lo hace por mí» la reparte en capítulos de ≈ 3:00. Sin ella, un solo capítulo. */
  duracionTotalSeg?: number;
  /** Estado controlado (para que sobreviva al cambiar de etapa). Sin él, el componente guarda el suyo. */
  valor?: TandasDelTaller;
  onCambio?: (v: TandasDelTaller) => void;
  /** Aviso de la pantalla anfitriona. Sin él, el aviso se pinta aquí mismo. */
  onAviso?: (mensaje: string) => void;
  /** Receptor de D1 (solo se usa con `D1_ABIERTO`). */
  onAccionD1?: (accion: AccionD1, cuadroId: string) => void;
  /** Pasa a la etapa de Producción (el botón «Producir» del storyboard con el capítulo ya guardado en el almacén). */
  onProducir?: () => void;
  /** «Pídele un cambio a Weë» en la ficha del cuadro: la pantalla anfitriona pone a Weë Brain; aquí solo se le da la selección (escena y plano del servidor). */
  /** Avisa a la pantalla de si hay un capítulo abierto a pantalla completa (móvil): dentro, la cabecera del capítulo es la única (sin la fila de etapas). */
  onCapitulo?: (abierto: boolean) => void;
  pedirCambio?: { enviar: (texto: string, seleccion: { sceneId: string; shotId?: string }) => void; contenido: React.ReactNode; version: number };
}

/**
 * EL ENGANCHE DE LA ETAPA «TANDAS Y STORYBOARD» (ola 3). La pantalla anfitriona monta este único componente cuando la barra de etapas está en «Tandas»:
 *
 *     <TandasYStoryboard ancho={ancho} compacto={compacto} personajes={…} duracionTotalSeg={…} valor={tandas} onCambio={setTandas} onAviso={…} />
 *
 * Dentro: la lista de capítulos, el storyboard de cada uno (rejilla de cuadros), la ficha del cuadro y las opciones de la tanda. Todo es estado de
 * interfaz: el contrato no persiste tandas ni storyboards todavía, y la pantalla lo dice. La generación de imágenes del storyboard y la Producción
 * salen cerradas con su motivo.
 */
export const TandasYStoryboard: React.FC<TandasYStoryboardProps> = ({ ancho, compacto = false, personajes = [], duracionTotalSeg, valor, onCambio, onAviso, onAccionD1, onProducir, pedirCambio, onCapitulo }) => {
  const t = useT();
  const dir = useDireccion();
  const [propio, setPropio] = useState<TandasDelTaller>(() => tandasVacias());
  const estado = valor ?? propio;
  const poner = (f: (s: TandasDelTaller) => TandasDelTaller) => { const nuevo = f(estado); if (valor === undefined) setPropio(nuevo); onCambio?.(nuevo); };
  const [abierta, setAbierta] = useState<string | null>(null);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [opcionesId, setOpcionesId] = useState<string | null>(null);
  const [avisoLocal, setAvisoLocal] = useState<string | null>(null);
  const aviso = (m: string) => (onAviso ? onAviso(m) : setAvisoLocal(m));

  const dosZonas = ancho >= 900;
  useEffect(() => { onCapitulo?.(!dosZonas && !!abierta && estado.tandas.some((x) => x.id === abierta)); }, [dosZonas, abierta, estado.tandas, onCapitulo]);
  useEffect(() => () => onCapitulo?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps
  const actual = estado.tandas.find((x) => x.id === abierta) ?? (dosZonas ? estado.tandas[0] ?? null : null);
  const posicionDe = (id: string) => estado.tandas.findIndex((x) => x.id === id) + 1;
  const enFicha = actual?.cuadros.find((c) => c.id === fichaId) ?? null;
  const indiceFicha = actual && enFicha ? actual.cuadros.findIndex((c) => c.id === enFicha.id) : -1;
  const tiempos = actual ? tiemposDe(actual) : [];
  const enOpciones = estado.tandas.find((x) => x.id === opcionesId) ?? null;

  const abrirTanda = (id: string) => { setAbierta(id); setAvisoLocal(null); };
  const anadirTandaNueva = () => poner((s) => anadirTanda(s));
  const automatico = () => poner((s) => dividirPorDuracion(s, duracionTotalSeg && duracionTotalSeg > 0 ? duracionTotalSeg : OBJETIVO_POR_TANDA));
  const cargarEjemplo = () => poner((s) => anadirEjemplos(s, ejemploTraducido(t)));
  /* Desde una tanda vacía el ejemplo se carga en ELLA (el primer capítulo de ejemplo), sin crear otra. */
  const ejemploEnTanda = () => { if (actual) poner((s) => cargarEjemploEnTanda(s, actual.id, ejemploTraducido(t)[0])); };

  const anadirCuadroYAbrir = () => {
    if (!actual) return;
    const r = anadirCuadro(estado, actual.id);
    if (!r.cuadroId) { aviso(t('filmmakerTandas.frameLimit')); return; }
    if (valor === undefined) setPropio(r.estado);
    onCambio?.(r.estado);
    setFichaId(r.cuadroId);
  };

  const storyboard = actual ? (
    <StoryboardDeTanda
      tanda={actual} posicion={posicionDe(actual.id)} ancho={dosZonas ? ancho - 380 : ancho} compacto={compacto}
      onVolver={dosZonas ? undefined : () => setAbierta(null)} onEditar={() => setOpcionesId(actual.id)}
      onAbrirCuadro={setFichaId} onAnadir={anadirCuadroYAbrir}
      onAprobar={() => poner((s) => aprobarTanda(s, actual.id))} onGuardarEnAlmacen={() => poner((s) => guardarEnAlmacen(s, actual.id))}
      onProducir={onProducir} onEjemplo={ejemploEnTanda} onQuitarEjemplo={() => poner(quitarEjemplos)} hayEjemplos={hayEjemplos(estado)} onAviso={aviso}
    />
  ) : null;

  const lista = (
    <ListaDeTandas
      estado={estado} ancho={dosZonas ? 380 : ancho} compacto={compacto} seleccionada={dosZonas ? actual?.id ?? null : null}
      onAbrir={abrirTanda} onAnadir={anadirTandaNueva} onAutomatico={automatico}
      onEjemplo={cargarEjemplo} onQuitarEjemplo={() => poner(quitarEjemplos)} hayEjemplos={hayEjemplos(estado)} onAviso={aviso} onProducir={onProducir}
    />
  );

  return (
    <View style={[styles.raiz, dir.contenedor, dosZonas && styles.dos]}>
      {dosZonas ? (
        <>
          <View style={styles.izquierda}>{lista}</View>
          <View style={{ flex: 1 }}>{storyboard ?? <View style={styles.sinTanda}><Text style={[textoPortada(15, '500'), { color: P.tintaSecundaria, textAlign: 'center' }]}>{t('filmmakerTandas.pickChapter')}</Text></View>}</View>
        </>
      ) : (actual ? storyboard : lista)}
      {avisoLocal ? <Text style={[textoPortada(12, '500'), dir.texto, styles.avisoLocal, { color: P.tinta }]} accessibilityLiveRegion="polite">{avisoLocal}</Text> : null}

      <FichaDelCuadro
        cuadro={enFicha} numero={indiceFicha + 1} inicio={tiempos[indiceFicha]?.inicio ?? 0} fin={tiempos[indiceFicha]?.fin ?? 0}
        esPrimero={indiceFicha <= 0} esUltimo={!actual || indiceFicha >= actual.cuadros.length - 1}
        puedePartir={!!actual && indiceFicha > 0 && puedePartir(estado, actual.id)} personajes={personajes}
        onClose={() => setFichaId(null)}
        onGuardar={(id, c) => actual && poner((s) => editarCuadro(s, actual.id, id, c))}
        onMover={(id, d) => actual && poner((s) => moverCuadro(s, actual.id, id, d))}
        onDuplicar={(id) => actual && poner((s) => duplicarCuadro(s, actual.id, id))}
        onQuitar={(id) => actual && poner((s) => quitarCuadro(s, actual.id, id))}
        onPartirAqui={(id) => { if (!actual) return; const i = actual.cuadros.findIndex((c) => c.id === id); poner((s) => partirTanda(s, actual.id, i)); }}
        vozDeTanda={actual?.voz ?? null} onAccionD1={onAccionD1}
        pedirCambio={pedirCambio && actual && enFicha ? { version: pedirCambio.version, contenido: pedirCambio.contenido, enviar: (texto) => pedirCambio.enviar(texto, { sceneId: idDeEscena(actual.id), shotId: idDePlano(enFicha.id) }) } : undefined}
      />

      <HojaDeTanda
        tanda={enOpciones} posicion={enOpciones ? posicionDe(enOpciones.id) : 0} total={estado.tandas.length}
        puedePartir={!!enOpciones && puedePartir(estado, enOpciones.id)} puedeUnir={!!enOpciones && puedeUnirConSiguiente(estado, enOpciones.id)}
        onClose={() => setOpcionesId(null)}
        onGuardar={(id, c) => poner((s) => cambiarObjetivo(renombrarTanda(s, id, c.titulo), id, c.objetivo))}
        onVoz={(id, v) => poner((s) => cambiarVozDeTanda(s, id, v))}
        onMover={(id, d) => poner((s) => moverTanda(s, id, d))}
        onPartir={(id) => poner((s) => partirTanda(s, id))}
        onUnir={(id) => poner((s) => unirConSiguiente(s, id))}
        onQuitar={(id) => { poner((s) => quitarTanda(s, id)); if (abierta === id) setAbierta(null); }}
        pedirCambio={pedirCambio && enOpciones ? { version: pedirCambio.version, contenido: pedirCambio.contenido, enviar: (texto) => pedirCambio.enviar(texto, { sceneId: idDeEscena(enOpciones.id) }) } : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  dos: { flexDirection: 'row' },
  izquierda: { width: 380, borderEndWidth: 1, borderEndColor: P.borde },
  sinTanda: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  avisoLocal: { position: 'absolute', start: 16, end: 16, top: 4, padding: 8, borderRadius: 12, backgroundColor: P.superficieAlta, borderWidth: 1, borderColor: P.bordeLuz },
});
