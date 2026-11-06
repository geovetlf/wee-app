/*
 * FINÉS — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`notifications.ts`).
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Uusi tykkäys',
  likeCuerpo: '{{nombre}} tykkäsi julkaisustasi',
  comentarioTitulo: 'Uusi kommentti',
  comentarioCuerpo: '{{nombre}} kommentoi julkaisuasi',
  seguidorTitulo: 'Uusi seuraaja',
  seguidorCuerpo: '{{nombre}} alkoi seurata sinua',
  solicitudTitulo: 'Uusi ËContact-pyyntö',
  solicitudCuerpo: '{{nombre}} haluaa lisätä sinut ËContact-yhteyksiinsä',
  aceptadaTitulo: 'Uusi ËContact-yhteys',
  aceptadaCuerpo: '{{nombre}} hyväksyi ËContact-pyyntösi',
  mencionTitulo: 'Sinut mainittiin',
  mencionCuerpo: '{{nombre}} mainitsi sinut julkaisussa',
  repostTitulo: 'Uusi uudelleenjako',
  repostCuerpo: '{{nombre}} jakoi julkaisusi',
  respuestaTitulo: 'Uusi vastaus',
  respuestaCuerpo: '{{nombre}} vastasi kommenttiisi',
  mensajeTitulo: 'Uusi viesti',
  mensajeCuerpo: '{{nombre}} lähetti sinulle viestin',
  alguien: 'Joku',
  teEnvioUnMensaje: 'Lähetti sinulle viestin',
  fotoUnica: 'Kertakatselukuva',
  imagen: '📷 Kuva',
  audio: '🎤 Ääni',
};
