/*
 * GAEILGE (ga) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «carachtar» con «sé», «IS» para la IA, «abhatár» para el avatar, «postáil»; confirmWord «SCRIOS» = common.delete.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
import { ConPlurales } from './plurales';

export const cuenta: ConPlurales<typeof import('../es/cuenta').cuenta> = {
  settingsRow: 'Scrios an cuntas',
  sectionDanger: 'Limistéar contúirte',
  title: 'Scrios an cuntas',
  goesFaces: 'Do phróifílí go léir: d\'fhíorphróifíl agus do chuid alter ego',
  goesCharacter: 'Do charachtar agus a abhatár',
  goesPosts: 'Do phostálacha, do thráchtanna agus d\'imoibrithe',
  goesMessages: 'Do theachtaireachtaí WeeTalk: folmhaítear iad, agus fanann comhrá an duine eile gan iad',
  goesCreations: 'Do chruthuithe, do thionscadail agus do chomhráite i Weë AI',
  goesContacts: 'Do theagmhálaithe, do phobail agus a bhfuil sábháilte agat',
  goesCredits: 'Na Credits atá fágtha agat: caillfear iad agus ní aisíocfar iad',
  whatStaysTitle: 'Cad a choinneofar',
  staysRecords: 'Taifid chuntasaíochta Credits agus íocaíochtaí. Coinnítear iad gan d\'ainm ná sonraí do phróifíle, mar gur cuid de chuntasaíocht Weë iad.',
  confirmLabel: 'Le deimhniú, clóscríobh “{{palabra}}”',
  confirmWord: 'SCRIOS',
  confirmPlaceholder: 'Clóscríobh an focal anseo',
  dialogTitle: 'Do chuntas a scriosadh?',
  dialogConfirm: 'Scrios',
  doneTitle: 'Scriosadh do chuntas',
  doneBody: 'Go raibh maith agat as a bheith mar chuid de Weë.',
  reauthTitle: 'Logáil isteach arís',
  reauthBody: 'Ar mhaithe le slándáil, caithfidh tú logáil isteach le déanaí chun do chuntas a scriosadh. Logáil amach, logáil isteach arís agus déan na céimeanna seo arís.',
  reauthButton: 'Logáil amach le logáil isteach arís',
  errorTitle: 'Níorbh fhéidir é a chríochnú',
  errorBody: 'Theip ar rud éigin i lár an bhealaigh. Bain triail eile as: leanfar ar aghaidh ón áit ar stop sé.',
  retry: 'Bain triail eile as',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Díghníomhachtaítear é agus, tar éis 30 lá, scriostar gach rud',
  introDesactivar: 'Díghníomhachtaítear do chuntas anois agus, mura bhfillfidh tú laistigh de 30 lá, scriosfar gach rud go deo.',
  nowTitle: 'Cad a tharlóidh anois',
  nowHidden: 'Ní bheidh do chuntas le feiceáil a thuilleadh: ní fheicfidh aon duine do phróifílí ná do phostálacha',
  nowCharacterOff: 'Múchtar neamhspleáchas do charachtair agus ní ghearrtar aon rud air a thuilleadh',
  nowComeBack_one: 'Tá {{contador}} lá agat le filleadh: logáil isteach arís agus roghnaigh “Gníomhachtaigh an cuntas”',
  nowComeBack_two: 'Tá {{contador}} lá agat le filleadh: logáil isteach arís agus roghnaigh “Gníomhachtaigh an cuntas”',
  nowComeBack_few: 'Tá {{contador}} lá agat le filleadh: logáil isteach arís agus roghnaigh “Gníomhachtaigh an cuntas”',
  nowComeBack_many: 'Tá {{contador}} lá agat le filleadh: logáil isteach arís agus roghnaigh “Gníomhachtaigh an cuntas”',
  nowComeBack_other: 'Tá {{contador}} lá agat le filleadh: logáil isteach arís agus roghnaigh “Gníomhachtaigh an cuntas”',
  whatGoesLaterTitle: 'Cad a scriosfar mura bhfillfidh tú',
  deactivateButton: 'Scrios mo chuntas',
  dialogBodyDesactivar: 'Ní bheidh do chuntas le feiceáil a thuilleadh. Mura bhfillfidh tú laistigh de 30 lá, scriosfar gach rud agus ní bheidh tú in ann é a fháil ar ais.',
  deactivating: 'Do chuntas á dhíghníomhachtú…',
  deactivatedTitle: 'Tá do chuntas díghníomhachtaithe',
  deactivatedBody: 'Tá go dtí {{fecha}} agat le filleadh. Ina dhiaidh sin, scriosfar gach rud go deo.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Tá do chuntas díghníomhachtaithe',
  activarBody: 'D\'iarr tú do chuntas a scriosadh. Fad atá sé díghníomhachtaithe, ní fheiceann aon duine do phróifílí ná do phostálacha.',
  activarDaysLeft_one: 'Tá {{contador}} lá fágtha go dtí an scriosadh deiridh',
  activarDaysLeft_two: 'Tá {{contador}} lá fágtha go dtí an scriosadh deiridh',
  activarDaysLeft_few: 'Tá {{contador}} lá fágtha go dtí an scriosadh deiridh',
  activarDaysLeft_many: 'Tá {{contador}} lá fágtha go dtí an scriosadh deiridh',
  activarDaysLeft_other: 'Tá {{contador}} lá fágtha go dtí an scriosadh deiridh',
  activarDate: 'Mura ngníomhachtaíonn tú é, scriosfar go deo é ar {{fecha}}.',
  activarCharacterNote: 'Fanfaidh neamhspleáchas do charachtair múchta; is féidir leat é a sceidealú arís am ar bith.',
  activarButton: 'Gníomhachtaigh an cuntas',
  activating: 'Do chuntas á ghníomhachtú…',
  activatedTitle: 'Tá do chuntas gníomhach arís',
  activarExpiredTitle: 'Tá an tréimhse le filleadh thart',
  activarExpiredBody: 'Scriosfar do chuntas go hiomlán sna huaireanta atá romhainn.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Na {{creditos}} Credits atá fágtha agat: caillfear iad agus ní aisíocfar iad',
};
