import { aSec, duracionDeUnidadMs, unidades } from '../services/filmmaker/dominio';
import type { AudioCue, FilmmakerProduction, Timeline, Unidad } from '../services/filmmaker/dominio';

/**
 * WEË FILMMAKER · LA LÍNEA DE TIEMPO POR PISTAS, COMO DATOS.
 *
 * Lo que pinta el montaje del workspace —vídeo, personajes, ambiente, efectos,
 * sonido, música, voz y texto— sale de la producción tal cual está guardada:
 * cada plano ocupa lo que dura, cada escena agrupa los suyos, y lo que suena o se
 * dice cae donde su objetivo dice (la producción, unas escenas, un plano). Aquí
 * no se inventa nada ni se decide nada: es puro, se calcula de nuevo en cada
 * cambio y no puede desfasarse.
 *
 * Si a algún plano le falta la duración, F1-A no da línea de tiempo exacta; el
 * tramo se sigue viendo —más fino, y marcado como sin duración— para no esconder
 * que existe.
 */

export interface Tramo {
  readonly id: string;
  readonly inicio: number;
  readonly fin: number;
  /** Texto que se lee en el tramo: un nombre, una línea, una descripción. */
  readonly texto?: string;
  /** El plano o la escena a la que pertenece, para elegirla al tocar. */
  readonly unitId?: string;
  readonly sceneId?: string;
  readonly shotId?: string;
  /** Sin duración conocida: el ancho es de relleno, no una medida. */
  readonly sinDuracion?: boolean;
}

/** Lo que mide un tramo sin duración, para que se vea sin fingir una medida. */
const RELLENO_SEC = 1.5;

export interface Montaje {
  readonly total: number;
  /** ¿Es exacta? Solo si todos los planos tienen duración. */
  readonly exacto: boolean;
  readonly video: readonly Tramo[];
  readonly escenas: readonly Tramo[];
  readonly personajes: readonly Tramo[];
  readonly ambiente: readonly Tramo[];
  readonly efectos: readonly Tramo[];
  readonly sonido: readonly Tramo[];
  readonly musica: readonly Tramo[];
  readonly voz: readonly Tramo[];
  readonly texto: readonly Tramo[];
}

/** Los climas que se VEN como efecto en la imagen. Despejado o nublado no son un efecto. */
const CLIMAS_CON_EFECTO: ReadonlySet<string> = new Set(['rain', 'storm', 'snow', 'fog', 'wind']);

/**
 * El montaje de una producción. `linea` es la de F1-A (`lineaDeTiempo`): si
 * existe, manda; si no —falta alguna duración—, se reparte igual con relleno.
 * `nombres` traduce lo que se lee (clima, momento) sin que este archivo sepa de
 * idiomas.
 */
export const montajeDe = (
  prod: FilmmakerProduction,
  linea: Timeline | undefined,
  nombres: { clima: (w: string) => string; momento: (m: string) => string },
): Montaje => {
  const lista: readonly Unidad[] = unidades(prod);
  const video: Tramo[] = [];
  let t = 0;
  for (const u of lista) {
    const exacto = linea?.segments.find((s) => s.unitId === u.unitId);
    const ms = duracionDeUnidadMs(u);
    const inicio = exacto ? exacto.startSec : t;
    const fin = exacto ? exacto.endSec : inicio + (ms !== undefined ? aSec(ms) : RELLENO_SEC);
    video.push({
      id: u.unitId, inicio, fin, unitId: u.unitId, sceneId: u.scene.id, shotId: u.shot?.id,
      texto: u.shot?.description ?? u.scene.title, sinDuracion: ms === undefined,
    });
    t = fin;
  }
  const total = linea?.totalSec ?? t;

  /* Cada escena, de su primer tramo a su último. */
  const escenas: Tramo[] = prod.scenes.map((s) => {
    const suyos = video.filter((v) => v.sceneId === s.id);
    return { id: s.id, inicio: suyos[0]?.inicio ?? 0, fin: suyos[suyos.length - 1]?.fin ?? 0, sceneId: s.id, texto: s.title };
  });
  const rangoDeEscena = (sceneId: string) => escenas.find((e) => e.sceneId === sceneId);
  const rangoDePlano = (shotId: string) => video.find((v) => v.shotId === shotId);

  /* Quién sale: por plano, sus personajes (los del plano, o su sujeto). */
  const personajes: Tramo[] = [];
  for (const v of video) {
    const escena = prod.scenes.find((s) => s.id === v.sceneId);
    const plano = escena?.shots.find((p) => p.id === v.shotId);
    const ids = new Set([...(plano?.characterIds ?? []), ...(plano?.subject?.characterId ? [plano.subject.characterId] : []), ...(!plano ? escena?.characterIds ?? [] : [])]);
    const quien = [...ids].map((id) => prod.characters.find((c) => c.id === id)?.name).filter((x): x is string => !!x);
    if (quien.length) personajes.push({ id: `p-${v.id}`, inicio: v.inicio, fin: v.fin, texto: quien.join(', '), unitId: v.unitId, sceneId: v.sceneId, shotId: v.shotId });
  }

  /* Dónde y cuándo: el lugar y el momento del día de cada escena. */
  const ambiente: Tramo[] = [];
  const efectos: Tramo[] = [];
  for (const s of prod.scenes) {
    const r = rangoDeEscena(s.id);
    if (!r || r.fin <= r.inicio) continue;
    const lugar = s.locationId ? prod.locations.find((l) => l.id === s.locationId)?.name : undefined;
    const partes = [lugar, s.timeOfDay ? nombres.momento(s.timeOfDay) : undefined].filter((x): x is string => !!x);
    if (partes.length) ambiente.push({ id: `a-${s.id}`, inicio: r.inicio, fin: r.fin, texto: partes.join(' · '), sceneId: s.id });
    if (s.weather && CLIMAS_CON_EFECTO.has(s.weather)) {
      efectos.push({ id: `e-${s.id}`, inicio: r.inicio, fin: r.fin, texto: nombres.clima(s.weather), sceneId: s.id });
    }
  }

  /* Lo que suena: cada sonido donde dice su objetivo. */
  const deSonido = (kind: AudioCue['kind']): Tramo[] => prod.audio.cues
    .filter((c) => c.kind === kind)
    .flatMap((c): Tramo[] => {
      if (c.target.scope === 'production') return [{ id: c.id, inicio: 0, fin: total, texto: c.description }];
      if (c.target.scope === 'shot') {
        const r = rangoDePlano(c.target.shotId);
        return r ? [{ id: c.id, inicio: r.inicio, fin: r.fin, texto: c.description, shotId: r.shotId, unitId: r.unitId, sceneId: r.sceneId }] : [];
      }
      return c.target.sceneIds
        .map((id) => rangoDeEscena(id))
        .filter((r): r is Tramo => !!r && r.fin > r.inicio)
        .map((r) => ({ id: `${c.id}-${r.id}`, inicio: r.inicio, fin: r.fin, texto: c.description, sceneId: r.sceneId }));
    });

  /* Lo que se dice: las líneas de cada plano, repartidas en su tramo. Voz en off y narración, en «Voz»; el diálogo, en «Texto». */
  const voz: Tramo[] = [];
  const texto: Tramo[] = [];
  for (const v of video) {
    const escena = prod.scenes.find((s) => s.id === v.sceneId);
    const plano = escena?.shots.find((p) => p.id === v.shotId);
    const lineas = plano ? plano.dialogue ?? [] : escena?.dialogue ?? [];
    if (!lineas.length) continue;
    const paso = (v.fin - v.inicio) / lineas.length;
    lineas.forEach((l, i) => {
      const tramo: Tramo = { id: l.id, inicio: v.inicio + paso * i, fin: v.inicio + paso * (i + 1), texto: l.text, unitId: v.unitId, sceneId: v.sceneId, shotId: v.shotId };
      (l.kind === 'dialogue' ? texto : voz).push(tramo);
    });
  }

  return {
    total, exacto: !!linea, video, escenas, personajes, ambiente, efectos,
    sonido: deSonido('ambience'), musica: deSonido('music'), voz, texto,
  };
};

/** El tramo de vídeo que está bajo un segundo dado. */
export const tramoEn = (tramos: readonly Tramo[], segundo: number): Tramo | undefined =>
  tramos.find((t) => segundo >= t.inicio && segundo < t.fin) ?? (tramos.length && segundo >= tramos[tramos.length - 1].fin ? tramos[tramos.length - 1] : undefined);

/** Las marcas de la regla: cada 1, 5 o 10 segundos según cuánto dure, para que no se amontonen. */
export const marcasDeLaRegla = (total: number, pxPorSegundo: number): readonly number[] => {
  const paso = pxPorSegundo >= 60 ? 1 : pxPorSegundo >= 24 ? 5 : 10;
  const salida: number[] = [];
  for (let s = 0; s <= Math.max(total, paso); s += paso) salida.push(s);
  return salida;
};
