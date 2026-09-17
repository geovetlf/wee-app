/*
 * CHINO TRADICIONAL (TAIWÁN) — ËContact y ẄContact. Los dos nombres son marca
 * —cambian con el perfil activo— y entran como valor. No se traducen, no se
 * transliteran y no se cambian por la palabra común que significan: ËContact no
 * es 聯絡人.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── UNA SOLICITUD ENTRE PERSONAS, EN TAIWÁN, ES UNA 邀請 ────────────────────
 *
 * Igual que 好友邀請: una persona la manda y la otra la acepta. Y lo que se
 * crea entre las dos es un 連結, que es como se dice «建立連結» con alguien.
 * La agenda es el 通訊錄. Nada de esto sale de convertir trazos: son las
 * palabras que se usan en Taiwán.
 *
 * `{{lista}}` es el nombre de la agenda (siempre alfabeto latino), `{{nombre}}`
 * el de una persona y `{{etiqueta}}` el del perfil. Como los tres llegan en
 * latino, llevan UN espacio a cada lado dentro del hanzi, que es la norma.
 *
 * ── `count` NO TIENE PLURAL, PORQUE EL CHINO NO LO TIENE ────────────────────
 *
 * `Intl.PluralRules('zh')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. El español escribía «1 {{lista}}» con un
 * 1 fijo; aquí las dos formas dicen lo MISMO y las dos llevan el contador, con
 * 人, que es el que cuenta personas.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: '收到的邀請',
  requestsSent: '送出的邀請',
  yours: '你的 {{lista}}',
  yoursWhenYouSignIn: '登入後查看你的 {{lista}}',
  yoursWhenYouSignInSubtitle: '{{lista}} 存放著你在 Weë 建立的連結。登入就能看到。',
  noneYet: '你還沒有 {{lista}} 連結',
  noneYetSubtitle: '這裡會聚集你在 Weë 認識的人。連結要兩個人一起完成：一個人發起，另一個人接受。',
  noAgenda: '這個個人檔案沒有通訊錄',
  noAgendaSubtitle: '{{lista}} 裡放著你和別人的連結。切換到真實個人檔案或 Weë 個人檔案就能看到。',
  wantsToConnect: '{{lista}} · 想和你建立連結',
  accept: '接受 {{nombre}}',
  reject: '拒絕 {{nombre}}',
  withdraw: '撤回給 {{nombre}} 的邀請',
  removeFrom: '把 {{nombre}} 從你的 {{lista}} 中移除',
  openProfile: '開啟 {{nombre}} 的 {{etiqueta}}',
  rejectTitle: '拒絕邀請',
  rejectConfirm: '要拒絕 {{nombre}} 的邀請嗎？',
  withdrawTitle: '撤回邀請',
  withdrawConfirm: '要撤回給 {{nombre}} 的邀請嗎？',
  removeTitle: '移除 {{lista}}',
  removeConfirm: '要把 {{nombre}} 從你的 {{lista}} 中移除嗎？',
  failed: '無法完成這項操作',
  count_one: '{{lista}} {{contador}} 人',
  count_other: '{{lista}} {{contador}} 人',
  somePerson: '這個人',
  acceptLabel: '接受 {{lista}}',
  rejectRequestLabel: '拒絕 {{lista}} 邀請',
  requestSent: '邀請已送出',
};
