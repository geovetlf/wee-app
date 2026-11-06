/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — las notificaciones push (ver `../../es/servidor/avisos.ts`).
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés. El hueco `{{nombre}}` es una persona que hace algo a otra cosa: por la regla de la guía
 * (§2.3) va en absolutivo como sujeto de un verbo en ANTIPASIVA, con el objeto en instrumental o alativo
 * («{{nombre}} oqaaseqaatinnut akivoq» respondió a tu comentario); nunca con sufijo. Donde no cabe, el hueco va
 * tras raya. Títulos: sustantivo + «nutaaq» (nuevo). «ËContact» sin sufijo. Emojis como el español.
 * Casi todo «pendiente de confirmación nativa», sobre todo las antipasivas de like/seguir/mencionar.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Nuannarisaq nutaaq',
  likeCuerpo: '{{nombre}} saqqummiussannik nuannarinnippoq',
  comentarioTitulo: 'Oqaaseqaat nutaaq',
  comentarioCuerpo: '{{nombre}} saqqummiussannut oqaaseqarpoq',
  seguidorTitulo: 'Malinnaasoq nutaaq',
  seguidorCuerpo: '{{nombre}} malinnaasunnut ilanngussimavoq',
  solicitudTitulo: 'Qinnut nutaaq: ËContact',
  solicitudCuerpo: '{{nombre}} ilinnut attaveqalerusuppoq · ËContact',
  aceptadaTitulo: 'ËContact nutaaq',
  aceptadaCuerpo: '{{nombre}} qinnutinnut akuersivoq · ËContact',
  mencionTitulo: 'Taaneqarputit',
  mencionCuerpo: 'Saqqummiussami taaneqarputit: {{nombre}}',
  repostTitulo: 'Saqqummiuteqqineq nutaaq',
  repostCuerpo: '{{nombre}} saqqummiussannik saqqummiuteqqiivoq',
  respuestaTitulo: 'Akissut nutaaq',
  respuestaCuerpo: '{{nombre}} oqaaseqaatinnut akivoq',
  mensajeTitulo: 'Oqariartuut nutaaq',
  mensajeCuerpo: '{{nombre}} ilinnut oqariartuummik nassiussivoq',
  alguien: 'Arlaat',
  teEnvioUnMensaje: 'Ilinnut oqariartuummik nassiussivoq',
  fotoUnica: 'Ataasiarlugu takuneqarsinnaasoq',
  imagen: '📷 Assi',
  audio: '🎤 Nipi',
};
