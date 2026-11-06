/*
 * SERBIO (ћирилица) — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Нови лајк',
  likeCuerpo: 'Корисник {{nombre}} је лајковао твоју објаву',
  comentarioTitulo: 'Нови коментар',
  comentarioCuerpo: 'Корисник {{nombre}} је коментарисао твоју објаву',
  seguidorTitulo: 'Нови пратилац',
  seguidorCuerpo: 'Корисник {{nombre}} је почео да те прати',
  solicitudTitulo: 'Нови захтев за ËContact',
  solicitudCuerpo: 'Корисник {{nombre}} жели да те дода у ËContact',
  aceptadaTitulo: 'Нови ËContact',
  aceptadaCuerpo: 'Корисник {{nombre}} је прихватио твој захтев за ËContact',
  mencionTitulo: 'Неко те је поменуо',
  mencionCuerpo: 'Корисник {{nombre}} те је поменуо у објави',
  repostTitulo: 'Твоја објава је подељена',
  repostCuerpo: 'Корисник {{nombre}} је поделио твоју објаву',
  respuestaTitulo: 'Нови одговор',
  respuestaCuerpo: 'Корисник {{nombre}} је одговорио на твој коментар',
  mensajeTitulo: 'Нова порука',
  mensajeCuerpo: 'Корисник {{nombre}} ти је послао поруку',
  alguien: 'Неко',
  teEnvioUnMensaje: 'Стигла ти је порука',
  fotoUnica: 'Једнократна фотографија',
  imagen: '📷 Слика',
  audio: '🎤 Аудио',
};
