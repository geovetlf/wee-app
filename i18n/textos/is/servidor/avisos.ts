/*
 * ISLANDÉS (is · is-IS) — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `{{nombre}}` siempre de sujeto en nominativo (guía § 2). «Like»: «líkar við» lleva sujeto en dativo, así que el
 * cuerpo usa «merkti … með „líkar við“», igual que `notifications.like` (glosario § 4). ËContact intacto, en compuesto con guion
 * («ËContact-beiðni», «ËContact-tengiliður»). «Post» y «publicación» son los dos «færsla».
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Nýtt „líkar við“',
  likeCuerpo: '{{nombre}} merkti færsluna þína með „líkar við“',
  comentarioTitulo: 'Ný athugasemd',
  comentarioCuerpo: '{{nombre}} skrifaði athugasemd við færsluna þína',
  seguidorTitulo: 'Nýr fylgjandi',
  seguidorCuerpo: '{{nombre}} byrjaði að fylgja þér',
  solicitudTitulo: 'Ný ËContact-beiðni',
  solicitudCuerpo: '{{nombre}} vill bæta þér við í ËContact',
  aceptadaTitulo: 'Nýr ËContact-tengiliður',
  aceptadaCuerpo: '{{nombre}} samþykkti ËContact-beiðnina þína',
  mencionTitulo: 'Minnst var á þig',
  mencionCuerpo: '{{nombre}} minntist á þig í færslu',
  repostTitulo: 'Ný endurbirting',
  repostCuerpo: '{{nombre}} endurbirti færsluna þína',
  respuestaTitulo: 'Nýtt svar',
  respuestaCuerpo: '{{nombre}} svaraði athugasemdinni þinni',
  mensajeTitulo: 'Ný skilaboð',
  mensajeCuerpo: '{{nombre}} sendi þér skilaboð',
  alguien: 'Einhver',
  teEnvioUnMensaje: 'Sendi þér skilaboð',
  fotoUnica: 'Mynd sem hverfur',
  imagen: '📷 Mynd',
  audio: '🎤 Hljóð',
};
