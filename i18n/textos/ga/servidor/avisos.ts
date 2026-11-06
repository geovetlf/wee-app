/*
 * IRLANDÉS — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos son las mismas frases que la pantalla de Notificaciones (`../notifications.ts`): el nombre no muta y el
 * verbo va delante. `fotoUnica` y `audio` son los de WeeTalk.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Togha nua',
  likeCuerpo: 'Thaitin do phostáil le {{nombre}}',
  comentarioTitulo: 'Trácht nua',
  comentarioCuerpo: 'Rinne {{nombre}} trácht ar do phostáil',
  seguidorTitulo: 'Leantóir nua',
  seguidorCuerpo: 'Thosaigh {{nombre}} do do leanúint',
  solicitudTitulo: 'Iarratas ËContact nua',
  solicitudCuerpo: 'Ba mhaith le {{nombre}} tú a chur isteach in ËContact',
  aceptadaTitulo: 'ËContact nua',
  aceptadaCuerpo: 'Ghlac {{nombre}} le d\'iarratas ËContact',
  mencionTitulo: 'Luadh thú',
  mencionCuerpo: 'Luaigh {{nombre}} tú i bpostáil',
  repostTitulo: 'Athphostáil nua',
  repostCuerpo: 'Roinn {{nombre}} do phostáil',
  respuestaTitulo: 'Freagra nua',
  respuestaCuerpo: 'D\'fhreagair {{nombre}} do thrácht',
  mensajeTitulo: 'Teachtaireacht nua',
  mensajeCuerpo: 'Sheol {{nombre}} teachtaireacht chugat',
  alguien: 'Duine éigin',
  teEnvioUnMensaje: 'Sheol teachtaireacht chugat',
  fotoUnica: 'Grianghraf aonuaire',
  imagen: '📷 Íomhá',
  audio: '🎤 Fuaim',
};
