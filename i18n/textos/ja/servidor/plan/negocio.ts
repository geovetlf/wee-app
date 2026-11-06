/*
 * JAPONÉS — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plural: `_one` y `_other` dicen lo mismo. La duración de un viaje se dice «10泊11日», las noches primero (guía
 * § 6); `{{fechas}}` ya llega escrita para el japonés («2026年10月8日～18日») y va delante de の. `{{busca}}` y `{{tono}}`
 * van como etiqueta.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'ビジネスを理解して投稿を書き（トーン：{{tono}}）、添える画像を作成します。',
  businessExplicaCalendario: '今週の投稿カレンダーを、投稿ごとの曜日、時間、SNSつきで作ります。',
  businessExplicaPublicar: '投稿を準備してSNSごとに調整し、コピーして投稿するだけの状態にします。WeëはまだあなたのSNSと連携していないため、代わりに投稿することはありません。',
  businessExplicaRespuesta: '顧客への丁寧でわかりやすい返信を、そのまま送れる形で書きます。',
  businessExplicaResultados: '結果を確認して、うまくいったことと今週やるべきことをお伝えします。',
  businessExplicaCampana: 'ビジネスを理解してキャンペーンを設計し（トーン：{{tono}}）、メイン画像を作成します。',
  businessExplicaCv: 'あなたの経験を理解して、すぐに使える履歴書を作成します（トーン：{{tono}}）。',
  businessExplicaPresentacion: 'まずビジネスを理解してから、プレゼンテーションをスライドごとに書きます（トーン：{{tono}}）。',
  businessExplicaDocumento: 'まずビジネスを理解してから、ドキュメントを作成します（トーン：{{tono}}）。',
  businessExplicaIdeas: 'まずビジネスを理解してから、成長のための具体的なアイデアと戦略を提案します。',

  businessTonoProfesionalPeroCercano: 'プロフェッショナルで親しみやすい',

  businessDecisionTonoProfesionalPeroCercano: 'プロフェッショナルで親しみやすいトーンにします',
  businessDecisionTonoCercanoYProfesional: '親しみやすくプロフェッショナルなトーンにします',
  businessDecisionTonoProfesional: 'プロフェッショナルなトーンにします',
  businessDecisionIdeasConcretas: '具体的なアイデアから始めます',

  businessPasoEntender: 'ビジネスと目標を理解する',
  businessPasoImagenPublicacion: '投稿用の画像を作成する',
  businessPasoCalendario: '投稿カレンダーを作る',
  businessPasoPrepararPublicacion: '投稿を準備する',
  businessPasoAdaptarACadaRed: 'SNSごとに調整する',
  businessPasoRespuesta: '顧客への返信を書く',
  businessPasoResultados: '結果を確認して説明する',
  businessPasoCampana: 'キャンペーンを設計する',
  businessPasoImagenCampana: 'キャンペーンの画像を作成する',
  businessPasoPresentacion: 'プレゼンテーションを書く（スライドごと）',
  businessPasoMercado: '市場の現状を調べる',
  businessPasoIdeas: 'アイデアと戦略を提案する',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: '{{fechas}}の旅行先を3つ提案します（ご希望：{{busca}}）。選んでいただいた行き先で、旅行全体を準備します。',
  travelExplicaDestinosDias_one: '{{lasNoches}}{{contador}}日の旅行先を3つ提案します（ご希望：{{busca}}）。選んでいただいた行き先で、旅行全体を準備します。',
  travelExplicaDestinosDias_other: '{{lasNoches}}{{contador}}日の旅行先を3つ提案します（ご希望：{{busca}}）。選んでいただいた行き先で、旅行全体を準備します。',
  travelExplicaDestinosDiasAviso_one: '{{lasNoches}}{{contador}}日の旅行先を3つ提案します（ご希望：{{busca}}）。選んでいただいた行き先で、旅行全体を準備します。日程が決まったら教えてください。季節に合わせて調整します。',
  travelExplicaDestinosDiasAviso_other: '{{lasNoches}}{{contador}}日の旅行先を3つ提案します（ご希望：{{busca}}）。選んでいただいた行き先で、旅行全体を準備します。日程が決まったら教えてください。季節に合わせて調整します。',
  travelExplicaDestinosTuViaje: '旅行先を3つ提案します（ご希望：{{busca}}）。選んでいただいた行き先で、旅行全体を準備します。',
  travelExplicaDestinosTuViajeAviso: '旅行先を3つ提案します（ご希望：{{busca}}）。選んでいただいた行き先で、旅行全体を準備します。日程が決まったら教えてください。季節に合わせて調整します。',

  travelBuscaSorpresa: 'あっと驚くような体験',

  travelExplicaItinerarioFechas_one: '{{fechas}}（{{lasNoches}}{{contador}}日）の旅程表を、1日ごとに、おおよその予算つきで作ります。',
  travelExplicaItinerarioFechas_other: '{{fechas}}（{{lasNoches}}{{contador}}日）の旅程表を、1日ごとに、おおよその予算つきで作ります。',
  travelExplicaItinerarioDias_one: '{{lasNoches}}{{contador}}日の旅程表を、1日ごとに、おおよその予算つきで作ります。',
  travelExplicaItinerarioDias_other: '{{lasNoches}}{{contador}}日の旅程表を、1日ごとに、おおよその予算つきで作ります。',
  travelExplicaItinerarioDiasAviso_one: '{{lasNoches}}{{contador}}日の旅程表を、1日ごとに、おおよその予算つきで作ります。日程が決まったら教えてください。季節に合わせて調整します。',
  travelExplicaItinerarioDiasAviso_other: '{{lasNoches}}{{contador}}日の旅程表を、1日ごとに、おおよその予算つきで作ります。日程が決まったら教えてください。季節に合わせて調整します。',
  travelExplicaItinerarioTuViaje: '旅行の旅程表を、1日ごとに、おおよその予算つきで作ります。',
  travelExplicaItinerarioTuViajeAviso: '旅行の旅程表を、1日ごとに、おおよその予算つきで作ります。日程が決まったら教えてください。季節に合わせて調整します。',

  travelExplicaQueHacer: '見る価値のあるものと食事の場所を探し、確認できるようにそれぞれの出典も記載します。',
  travelExplicaMoverse: '移動手段を、おおよその所要時間と費用つきで探します。',

  travelLasNoches_one: '{{contador}}泊',
  travelLasNoches_other: '{{contador}}泊',

  travelDecisionTresViajes: 'それぞれタイプの違う3つの旅行を提案します',
  travelDecisionTresViajesAviso: 'それぞれタイプの違う3つの旅行を提案します。日程が決まったら教えてください。季節に合わせて調整します',
  travelDecisionReparto: 'それぞれのよいところを日ごとに振り分けます',
  travelDecisionRepartoAviso: 'それぞれのよいところを日ごとに振り分けます。日程が決まったら教えてください。季節に合わせて調整します',

  travelPasoDestinos: '合いそうな旅行先を3つ探す',
  travelPasoQueHacer: '見る価値のあるものと食事の場所を探す',
  travelPasoMoverse: '移動方法を探す',
  travelPasoItinerario_one: '{{contador}}日間の旅程表を作る',
  travelPasoItinerario_other: '{{contador}}日間の旅程表を作る',
  travelPasoItinerarioTuViaje: '旅行の旅程表を作る',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: '必要なことをしっかり理解して、次のステップつきのわかりやすい回答を用意します。',
  brainDecisionPuntoDePartida: '出発点を提案し、必要に応じてWeëの適切なスペシャリストにご案内します',
  brainPasoEntender: '必要なことをしっかり理解する',
  brainPasoRespuesta: '次のステップつきのわかりやすい回答を用意する',
};
