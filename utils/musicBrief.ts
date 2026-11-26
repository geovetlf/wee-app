/**
 * WEË MUSIC — EL BRIEF PARA «NO SÉ, AYÚDAME A ELEGIR» Y EL BORRADOR LOCAL.
 *
 * El brief es el mensaje que se manda a Weë Brain (mismo flujo compartido que Fashion: `useBrainChat`): arma una
 * petición de ORIENTACIÓN con lo que la persona ya eligió y conserva su descripción original tal cual, al final y
 * entre comillas. No genera música ni llama a ningún motor musical. Las frases son claves de i18n con huecos
 * (`music.brief*`): lo dinámico entra por interpolación. Las claves de las opciones se traducen al idioma activo.
 *
 * El borrador guarda SOLO texto y elecciones (nunca audio, nunca rutas de archivo): el audio vive en la pantalla.
 */
import { GRUPOS_DE_MUSIC, SeleccionDeMusic, PuntoDePartidaId, puntoDePartida } from '../constants/musicComposer';

interface Ctx {
  t: (clave: string, valores?: Record<string, string | number>) => string;
  lista: (xs: readonly string[]) => string;
}

export const armarBriefMusic = (ctx: Ctx, punto: PuntoDePartidaId, s: SeleccionDeMusic, descripcion: string, letra: string): string => {
  const { t, lista } = ctx;
  const partes: string[] = [t('music.briefIntro', { punto: t(`music.${puntoDePartida(punto)?.claveTitulo ?? 'startIdea'}`) })];
  for (const g of GRUPOS_DE_MUSIC) {
    const ids = s.elegidas[g.id] ?? [];
    const textos = ids.map((id) => g.opciones.find((x) => x.id === id)).filter(Boolean).map((x) => t(`music.${x!.clave}`));
    if (textos.length) partes.push(t('music.briefLine', { grupo: t(`music.${g.claveTitulo}`), valor: lista(textos) }));
  }
  if (s.idk) partes.push(t('music.briefIdk'));
  if (letra.trim()) partes.push(t('music.briefLyrics'));
  if (descripcion.trim()) partes.push(t('music.briefOriginal', { texto: descripcion.trim() }));
  partes.push(t('music.briefAsk'));
  return partes.join('\n');
};

export const CLAVE_DE_BORRADOR_MUSIC = 'wee.music.borrador';

export interface BorradorDeMusic { punto: PuntoDePartidaId; descripcion: string; letra: string; sel: SeleccionDeMusic }

/** Lo que se guarda: recortado y sin nada que no sea texto o elección. */
export const serializarBorrador = (b: BorradorDeMusic): string =>
  JSON.stringify({
    punto: b.punto,
    descripcion: b.descripcion.slice(0, 500),
    letra: b.letra.slice(0, 3000),
    sel: { elegidas: b.sel.elegidas, idk: b.sel.idk, idioma: b.sel.idioma, intencion: b.sel.intencion },
  });

/** Lee un borrador con tolerancia: cualquier cosa rara se descarta. */
export const leerBorrador = (raw: string | null): BorradorDeMusic | null => {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    const punto = puntoDePartida(d.punto)?.id;
    if (!punto) return null;
    const elegidas: Record<string, string[]> = {};
    if (d.sel?.elegidas && typeof d.sel.elegidas === 'object') {
      for (const [k, v] of Object.entries(d.sel.elegidas)) if (Array.isArray(v)) elegidas[k] = v.filter((x) => typeof x === 'string');
    }
    return {
      punto,
      descripcion: typeof d.descripcion === 'string' ? d.descripcion.slice(0, 500) : '',
      letra: typeof d.letra === 'string' ? d.letra.slice(0, 3000) : '',
      sel: { elegidas, idk: !!d.sel?.idk, idioma: typeof d.sel?.idioma === 'string' ? d.sel.idioma : undefined, intencion: d.sel?.intencion },
    };
  } catch {
    return null;
  }
};
