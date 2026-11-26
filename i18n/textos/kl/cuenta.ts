/*
 * KALAALLISUT (kl) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Confianza BAJA, revisión nativa prioritaria. «inuttaasoq» para el personaje, «inuusaq» para el avatar, Weë sin sufijo (con «atorlugu»); confirmWord «PEERUK» = common.delete.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Kontu peeruk',
  sectionDanger: 'Navianartorsiorfik',
  title: 'Kontu peeruk',
  goesFaces: 'Profiilitit tamarmik: Profili piviusoq aamma alter ego-tit',
  goesCharacter: 'Inuttaasutit inuusaalu',
  goesPosts: 'Saqqummiussatit, oqaaseqaatitit qisuariaatitillu',
  goesMessages: 'WeeTalk atorlugu allakkatit: imaarneqassapput, inuullu allap oqaloqatigiinnera taakku peqanngitsoq qimanneqassalluni',
  goesCreations: 'Weë AI atorlugu pilersitatit, suliniutitit oqaloqatigiinnitillu',
  goesContacts: 'Attaveqaatitit, peqatigiiffiit toqqorsimasatillu',
  goesCredits: 'Credits sinneruttut: annaaneqassapput utertinneqarnavianngillallu',
  whatStaysTitle: 'Toqqorneqartussat',
  staysRecords: 'Credits akiliutillu pillugit naatsorsuutit. Aqqit profiilillu paasissutissai ilanngunngitsumik toqqorneqassapput, Weë naatsorsuutaammata.',
  confirmLabel: 'Uppernarsaaniarlutit «{{palabra}}» allaguk',
  confirmWord: 'PEERUK',
  confirmPlaceholder: 'Oqaaseq maani allaguk',
  dialogTitle: 'Kontut peerniarpiuk?',
  dialogConfirm: 'Peeruk',
  doneTitle: 'Kontut peerneqarpoq',
  doneBody: 'Qujanaq Weë atorlugu peqataasimagavit.',
  reauthTitle: 'Iseqqigit',
  reauthBody: 'Illersorneqarnerit pillugu kontu peerniarlugu qanittukkut isersimasariaqarputit. Anigit, iseqqigit taavalu periaatsit uku ingerlateqqikkit.',
  reauthButton: 'Anigit iseqqikkumallutit',
  errorTitle: 'Naammassineqarsinnaanngilaq',
  errorBody: 'Ingerlanerani ajutoortoqarpoq. Misileqqiguk: unikkaffianiit ingerlaqqissaaq.',
  retry: 'Misileqqiguk',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Atorunnaarsinneqassaaq, ullullu 30-it qaangiuppata tamarmi peerneqassaaq',
  introDesactivar: 'Kontut maannakkut atorunnaarsinneqassaaq, ullullu 30-it iluanni uteqqinngikkuit tamarmi ataavartumik peerneqassaaq.',
  nowTitle: 'Maanna qanoq pisoqassava',
  nowHidden: 'Kontut takuneqarsinnaajunnaassaaq: kialuunniit profiilitit saqqummiussatilluunniit takusinnaanngilai',
  nowCharacterOff: 'Inuttaasutit nammineersinnaassusaa qamitinneqassaaq akiliisitsisarnerlu unissalluni',
  nowComeBack_one: 'Ulloq {{contador}} uteqqinnissannut sivisussuseqarputit: iseqqigit «Kontu ikiguk» toqqarlugu',
  nowComeBack_other: 'Ullut {{contador}} uteqqinnissannut sivisussuseqarputit: iseqqigit «Kontu ikiguk» toqqarlugu',
  whatGoesLaterTitle: 'Uteqqinngikkuit peerneqartussat',
  deactivateButton: 'Kontora peeruk',
  dialogBodyDesactivar: 'Kontut takuneqarsinnaajunnaassaaq. Ullut 30-it iluanni uteqqinngikkuit tamarmi peerneqassaaq, utertissinnaanavianngilatillu.',
  deactivating: 'Kontut atorunnaarsinneqalerpoq…',
  deactivatedTitle: 'Kontut atorunnaarsinneqarsimavoq',
  deactivatedBody: '{{fecha}} tikillugu uteqqissinnaavutit. Tamatuma kingorna tamarmi ataavartumik peerneqassaaq.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Kontut atorunnaarsinneqarsimavoq',
  activarBody: 'Kontut peerneqarnissaa noqqaassutigaat. Atorunnaarsinneqarsimatillugu kialuunniit profiilitit saqqummiussatilluunniit takusinnaanngilai.',
  activarDaysLeft_one: 'Ulloq {{contador}} sinnerpoq ataavartumik peerneqarnissaata tungaanut',
  activarDaysLeft_other: 'Ullut {{contador}} sinnerput ataavartumik peerneqarnissaata tungaanut',
  activarDate: 'Ikinngikkukku {{fecha}} ataavartumik peerneqassaaq.',
  activarCharacterNote: 'Inuttaasutit nammineersinnaassusaa qamitinneqarsimassaaq; piumaguit pilersaarusiorteqqissinnaavat.',
  activarButton: 'Kontu ikiguk',
  activating: 'Kontut ikineqarpoq…',
  activatedTitle: 'Kontut atorneqaqqilerpoq',
  activarExpiredTitle: 'Uteqqinnissamut killigititaq qaangiuppoq',
  activarExpiredBody: 'Kontut nalunaaquttap akunnerini tulliuttuni tamakkiisumik peerneqassaaq.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Credits sinneruttut ({{creditos}}): annaaneqassapput utertinneqarnavianngillallu',
};
