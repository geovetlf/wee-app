/*
 * ÍSLENSKA (is) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «persóna» con «hún», «gervigreind» en prosa, «myndgervingur» para el avatar (glosario § 4), «aðgangur» para la cuenta; confirmWord «EYÐA» = common.delete.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Eyða aðgangi',
  sectionDanger: 'Hættusvæði',
  title: 'Eyða aðgangi',
  goesFaces: 'Allir prófílarnir þínir: raunprófíllinn þinn og hliðarsjálfin þín',
  goesCharacter: 'Persónan þín og myndgervingur hennar',
  goesPosts: 'Færslurnar þínar, athugasemdir og viðbrögð',
  goesMessages: 'Skilaboðin þín í WeeTalk: þau eru tæmd og samtal hins aðilans stendur eftir án þeirra',
  goesCreations: 'Sköpunarverkin þín, verkefni og samtöl í Weë AI',
  goesContacts: 'Tengiliðirnir þínir, samfélög og það sem þú vistaðir',
  goesCredits: 'Þau Credits sem þú átt eftir: þau tapast og eru ekki endurgreidd',
  whatStaysTitle: 'Þetta er geymt',
  staysRecords: 'Bókhaldsfærslur um Credits og greiðslur. Þær eru geymdar án nafnsins þíns og prófílupplýsinganna þinna, því þær eru hluti af bókhaldi Weë.',
  confirmLabel: 'Til að staðfesta skaltu skrifa „{{palabra}}“',
  confirmWord: 'EYÐA',
  confirmPlaceholder: 'Skrifaðu orðið hér',
  dialogTitle: 'Eyða aðganginum þínum?',
  dialogConfirm: 'Eyða',
  doneTitle: 'Aðganginum þínum var eytt',
  doneBody: 'Takk fyrir að hafa verið hluti af Weë.',
  reauthTitle: 'Skráðu þig inn aftur',
  reauthBody: 'Af öryggisástæðum þarftu að hafa skráð þig inn nýlega til að eyða aðganginum. Skráðu þig út, skráðu þig aftur inn og endurtaktu þessi skref.',
  reauthButton: 'Skrá út til að skrá inn aftur',
  errorTitle: 'Ekki tókst að ljúka þessu',
  errorBody: 'Eitthvað fór úrskeiðis á miðri leið. Reyndu aftur: haldið verður áfram þar sem frá var horfið.',
  retry: 'Reyna aftur',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Hann er gerður óvirkur og eftir 30 daga er öllu eytt',
  introDesactivar: 'Aðgangurinn þinn er gerður óvirkur núna og ef þú kemur ekki aftur innan 30 daga verður öllu eytt fyrir fullt og allt.',
  nowTitle: 'Þetta gerist núna',
  nowHidden: 'Aðgangurinn þinn hættir að sjást: enginn sér prófílana þína né færslurnar þínar',
  nowCharacterOff: 'Slökkt er á sjálfstæði persónunnar þinnar og hún hættir að kosta',
  nowComeBack_one: 'Þú hefur {{contador}} dag til að koma aftur: skráðu þig inn aftur og veldu „Virkja aðgang“',
  nowComeBack_other: 'Þú hefur {{contador}} daga til að koma aftur: skráðu þig inn aftur og veldu „Virkja aðgang“',
  whatGoesLaterTitle: 'Þessu verður eytt ef þú kemur ekki aftur',
  deactivateButton: 'Eyða aðganginum mínum',
  dialogBodyDesactivar: 'Aðgangurinn þinn hættir að sjást. Ef þú kemur ekki aftur innan 30 daga verður öllu eytt og þú getur ekki endurheimt það.',
  deactivating: 'Gerir aðganginn þinn óvirkan…',
  deactivatedTitle: 'Aðgangurinn þinn er óvirkur',
  deactivatedBody: 'Þú hefur frest til {{fecha}} til að koma aftur. Eftir það verður öllu eytt fyrir fullt og allt.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Aðgangurinn þinn er óvirkur',
  activarBody: 'Þú baðst um að aðganginum þínum yrði eytt. Á meðan hann er óvirkur sér enginn prófílana þína né færslurnar þínar.',
  activarDaysLeft_one: '{{contador}} dagur er eftir þar til öllu verður eytt endanlega',
  activarDaysLeft_other: '{{contador}} dagar eru eftir þar til öllu verður eytt endanlega',
  activarDate: 'Ef þú virkjar hann ekki verður honum eytt fyrir fullt og allt {{fecha}}.',
  activarCharacterNote: 'Áfram verður slökkt á sjálfstæði persónunnar þinnar; þú getur tímasett það aftur hvenær sem þú vilt.',
  activarButton: 'Virkja aðgang',
  activating: 'Virkjar aðganginn þinn…',
  activatedTitle: 'Aðgangurinn þinn er virkur á ný',
  activarExpiredTitle: 'Fresturinn til að koma aftur er liðinn',
  activarExpiredBody: 'Aðganginum þínum verður eytt að fullu á næstu klukkustundum.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Þau {{creditos}} Credits sem þú átt eftir: þau tapast og eru ekki endurgreidd',
};
