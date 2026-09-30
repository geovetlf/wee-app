# I18N-JAPONES — el japonés de Weë (`ja` / `ja-JP`)

> Guía de estilo y glosario para quien escriba, revise o amplíe el japonés de Weë: hoy y cuando lleguen módulos nuevos
> (Filmmaker, 3D, Weë Music, Weë Travel…). La arquitectura común está en [`I18N.md`](I18N.md); aquí solo lo que es del
> japonés. Las decisiones se tomaron con fuentes (lista al final) y, donde las fuentes no coinciden, dicen qué se eligió,
> qué se descartó y por qué.
>
> Lo que esta guía pide lo comprueba `functions/test/i18n-japones.test.mjs`. Lo que no se puede comprobar con una
> prueba —naturalidad, tono, contexto— es trabajo de quien escribe y de quien revisa.

## 0. Lo esencial

1. **No se traduce del español palabra a palabra, ni pasando por el inglés.** Se entiende qué hace la cadena —un botón,
   un error, una etiqueta para el lector de pantalla, un estado vacío— y se escribe lo que escribiría una app japonesa.
2. **Frases en です・ます; botones, pestañas y títulos en forma nominal corta**, sin する y sin 。.
3. **Las marcas de Weë van en alfabeto latino, intactas.** Nunca en katakana: `Weë`, no ウィー; `Credits`, no クレジット.
4. **Sin espacios entre japonés y latino o cifras** (`Weë Studioで作成`, `3件`), y nunca entre palabras japonesas.
5. **Puntuación japonesa de ancho completo** (、。「」（）！？), letras y cifras latinas de ancho medio.
6. **Sin plural:** `_one` y `_other` llevan el mismo texto.
7. **Consistencia:** un concepto, una palabra, la del glosario (§ 10). Las excepciones están escritas.

## 1. Idioma, locale y lo que ya resuelve la arquitectura

| | |
|---|---|
| Idioma | `ja`, diccionario en `i18n/textos/ja/` |
| Locale principal | `ja-JP` (en `LOCALES_CONTEMPLADOS`) |
| Variantes | Ninguna: el japonés se escribe de una sola manera |
| Respaldo | `ja-JP` → `ja` → `en`, clave a clave |
| Plural | `Intl.PluralRules('ja')` solo tiene `other` |
| Formatos | `Intl` con el locale: `2026年9月30日`, `15:05`, `1,234,567.89`, `￥1,500`, `60%`, `3 日前`, `A、B、C` |
| Web | `<html lang="ja">`, lo escribe `IdiomaContext` |
| Pantalla de error | Su fila `ja` en `components/ErrorBoundary.tsx` |

**Los formatos no se escriben a mano.** Fechas, horas, números, monedas, porcentajes, listas, tiempo relativo y
distancias salen de `i18n/formato.ts` (o de `useIdioma().formato`). Si `Intl` pone un espacio en `3 日前` o en `5 km`,
ese espacio es de CLDR y se respeta: no es una cadena nuestra.

## 2. Tono

- **Profesional, cercano y claro.** Ni la frialdad de un manual (～することが可能です) ni la complicidad de un
  amigo (～だよ、～してね). Weë habla como una buena app japonesa de consumo. [MS §4.2] [SHR-ui] [MERC]
- **です・ます en toda frase**: mensajes, descripciones, explicaciones, errores, ayuda. [JTF §1.1.1] [MS §4.2]
- **Cortesía moderada.** Sí: ～してください、もう一度お試しください、ご確認ください (fórmulas corrientes).
  No: させていただきます、ございます、～してもよろしいでしょうか、お客様. [MS pp.44-46] [SHR-style] [KOYO Ⅱ-6ウ]
- **Directo:** ～できます (no ～することができます), ～する (no ～を行う), 確認してください (no 確認をお願いいたします).
  [SHR-style] [KOYO Ⅱ-5ウ] [MS §2.1.2]
- **Palabras de todos los días:** もう一度 (no 再度), 詳しい (no 詳細な), 選ぶ en una frase (選択 en un botón). [MS §2.1.3]
- **Animar sin empujar.** En la bienvenida y en los estados vacíos, ～しましょう con medida; nunca imperativos secos.
  [MS §2.2.1] [MERC]
- **Sin pronombres.** El japonés no los necesita: «Tu perfil» es 「プロフィール」, «tus creaciones» 「作品」. あなた solo
  cuando sin él la frase no se entiende —p. ej. en una notificación cuyo objeto es la propia persona—.
- **Sin honoríficos de más.** Nada de 様 en la interfaz. En las frases que CUENTAN lo que hizo otra persona
  (notificaciones, solicitudes, actividad) el nombre va solo: 「{{nombre}}があなたをフォローしました」, como en la
  notificación de muestra oficial de LINE y en Bluesky; en Weë, además, ese nombre puede ser el alias de un Perfil Weë.
  Solo cuando Weë se DIRIGE a la persona por su nombre (el saludo) va さん: 「こんにちは、{{nombre}}さん」. Nunca さん
  detrás de un hueco que no sea una persona (una comunidad, un proyecto, una marca). [LINE] [SHR-crew]

## 3. Escritura

### 3.1 Kanji o kana

Se escriben **en kana**: ください、できる、こと、とき (sustantivo formal)、ため、ところ、もの (formal)、など、および、または、
さらに、ただし、ほしい (auxiliar)、いたします (auxiliar)、～とおり、すべて、わかる、さまざま、たとえば、ほう (en
comparaciones: 「こちらのほうが」). [JTF §2.2.1] [SHR-ichiran] [KOYO Ⅰ-1(3)]

Se escriben **en kanji**: 一切、必ず、何らかの、行う (no 行なう)、表す、現れる、終わる (okurigana del 本則). Los verbos
compuestos llevan su okurigana entera (申し込む); los sustantivos pueden acortarla (申込). [JTF §2.1.3-2.1.4] [SHR-hiragana]

Cifras en kanji solo en expresiones fijas: 一時的、一部、もう一度、一つひとつ. Para contar, cifras árabes: 1つ、3件.
[JTF §2.2.2] [MS p.22]

### 3.2 Katakana

- **Ancho completo siempre.** Nunca katakana de ancho medio (ｱｲｳ).
- **Vocal larga final (ー) en las palabras en -er, -or, -ar:** ユーザー、クリエイター、フィルター、エディター、
  ビューアー、スライダー、カラー、パラメーター. Es la regla del gabinete de 1991, la de JTF y la de Microsoft desde 2008.
  [GAIRAI] [JTF §2.1.6] [MS pp.35-39] **Excepciones de uso** (se escriben sin ー porque así las escribe la interfaz
  japonesa de consumo): ブラウザ、フォルダ. [SHR-katakana] (Google, Apple)
- **Palabras en -y:** van como las escribe el uso de consumo y el glosario las fija una a una:
  コミュニティ、カテゴリ、セキュリティ、アクセシビリティ、ライブラリ, pero ギャラリー、ストーリー、プライバシー、
  バッテリー、メモリー (esta, solo si alguna vez hace falta). [SHR-katakana] (YouTube, Apple)
- **Compuestos en katakana, juntos:** メールアドレス、プロフィール写真、アカウント設定、ビデオ通話. Sin espacio y sin
  ・ en medio. (Apple; JTF admite cualquiera si se es constante.) [JTF §2.1.7]
- **No todo se pasa a katakana.** Si existe una palabra japonesa corriente, se usa: 画像 para una imagen (イメージ
  solo cuando es «lo que uno imagina» y en イメージチェンジ)、動画 (ビデオ solo en compuestos fijos: ビデオ通話、
  ミュージックビデオ)、設定 (no セッティング)、保存 (no セーブ)、削除 (no デリート)、検索 (no サーチ).

### 3.3 Alfabeto latino

- **Ancho medio siempre** (AI、URL、PDF、4K、1080p、JPG). Nunca ＡＩ ni ４Ｋ. [JTF §2.1.8] [MS §4.1.7]
- **Las marcas** (§ 9) y los nombres de otras empresas (Google、Instagram、TikTok) van tal cual, sin katakana.
- **Siglas técnicas corrientes** en latino: AI、URL、PDF、GB、MB、HD、4K、GLB. `IA` del español es `AI` en japonés.

## 4. Espacios

**No se escribe espacio entre japonés y latino ni entre japonés y cifras.**

| Bien | Mal |
|---|---|
| Weë Studioで作成 | Weë Studio で作成 |
| Creditsが不足しています | Credits が不足しています |
| Googleで続ける | Google で続ける |
| 3件のコメント | 3 件のコメント |
| 生成AI | 生成 AI |

**Sí se conserva el espacio DENTRO de lo latino**, porque es parte del nombre o de la frase latina: `Weë Studio`,
`Weë AI`, `250 Credits`, `4K Ultra HD`.

**Nunca espacios entre palabras japonesas** (設定 を 保存 está mal). El japonés no separa palabras.

**El separador de las líneas de datos** (`12 Credits · 3分`) conserva sus espacios alrededor del punto medio: es un
elemento de diseño de Weë, igual en todos los idiomas, no un espacio entre palabras.

Por qué así. Las fuentes están divididas en dos bandos estables:

- Sin espacio: JTF (el estándar japonés de traducción), SmartHR, Apple, Instagram y los sitios del gobierno. El W3C
  recomienda no escribir el espacio a mano y dejar que la maquetación ponga la separación (`text-autospace`).
- Con espacio de medio ancho: Microsoft, Google y WordPress.

Weë es una red social de consumo. Sus referencias más cercanas (Instagram, Apple, las apps sociales japonesas) no lo
escriben. El estándar nacional de traducción tampoco. Y la regla del encargo es «no introducir espacios artificiales».
[JTF §2.3.1.1] [SHR-symbol] [W3C-SP] [MS §4.1.11]

## 5. Puntuación

| Signo | Uso en Weë |
|---|---|
| 、。 | De ancho completo. 。 cierra la frase donde el español la cierra con punto (mensajes, descripciones, ayuda); una línea de estado o un aviso breve que en español va sin punto, en japonés va sin 。 (es la práctica de Ubie para frases sueltas y mantiene el mismo ritmo que el resto de idiomas de Weë). Nunca en botones, pestañas, títulos, encabezados ni elementos de lista que no sean frases. [JTF §1.1.2-1.1.4] [MS §4.1.9] [UBIE] |
| ！？ | De ancho completo y con mesura. ？ en las preguntas al usuario (「削除しますか？」). ！ solo donde el español celebra de verdad. Si sigue otra frase, un espacio de ancho completo detrás. [JTF §3.2.1-3.2.2] [KOYO Ⅰ-5(2)] [SHR-symbol] |
| … | Un solo carácter (U+2026), como en el español: 「読み込み中…」. [SHR-symbol] [KOYO] |
| （） | De ancho completo y sin espacios alrededor: 「画像（最大10MB）」. [JTF §3.3.1] [SHR-symbol] |
| ： | De ancho completo para «etiqueta: valor»: 「例：」「名前：{{nombre}}」. [JTF §3.2.7] [SHR-symbol] |
| 「」 | Para citar texto de la interfaz (botones, opciones, pestañas) y lo que la persona escribe o ve en pantalla: 「保存」をタップしてください。Es la costumbre de la interfaz japonesa de consumo (Apple). [JTF §3.3.3] |
| 『』 | Títulos de obras y comillas dentro de comillas. [JTF §3.3.4] |
| ・ | Solo para enumerar cosas intercambiables y en nombres extranjeros compuestos. No para unir compuestos de katakana. [JTF §3.2.4] [SHR-symbol] |
| ～ | Rangos: 「3～5日」. [JTF §3.2.5] |
| · | El punto medio del español (U+00B7) que separa datos en una línea («12 Credits · 3 min») se conserva como separador visual cuando la cadena es una línea de datos, no una frase. |

**No se usan:** las comillas españolas «» ni las inglesas “”, la coma y el punto de ancho completo ，．, el punto y la
coma latinos detrás de un kanji o un kana.

**Emojis, flechas y símbolos** del español (🎨, →, ✓, ·) se copian tal cual, en el mismo sitio.

## 6. Números, fechas, horas, dinero y unidades

- **Todo lo que `Intl` sabe hacer lo hace `Intl`:** fecha (2026年9月30日), hora (15:05, 24 horas), número con coma de
  miles (1,234,567), moneda (￥1,500 — el yen no lleva decimales), porcentaje (60%), tiempo relativo (3 日前、昨日),
  listas (A、B、C) y distancias (5 km). Nada de esto se escribe a mano en un diccionario. [FASE 11 del encargo]
- **Cifras árabes de ancho medio** para contar; coma cada tres cifras; no se mezclan 万/億 con cifras largas.
  [JTF §2.1.10] [KOYO Ⅰ-4]
- **Contadores**, pegados a la cifra: 件 (publicaciones, comentarios, resultados, notificaciones, solicitudes)、人
  (personas, seguidores, miembros)、枚 (imágenes, fotos)、本 (vídeos)、回 (veces)、票 (votos)、文字 (caracteres)、語
  (palabras)、つ (cosas en general, hasta 9)、個 (objetos)、秒・分・時間・日・か月・年 (tiempo). [MS p.18] [KOYO]
- **Meses con か**: 3か月. Nunca ヶ ni カ. [KOYO] [MS p.18]
- **Credits no lleva contador**: `250 Credits`, `残り250 Credits` (el espacio va solo dentro de lo latino, § 4).
- **Duración:** 15秒、2分30秒. Las marcas de tiempo tipo «0:12» se copian.
- **Las piezas de una fecha ya traen su carácter.** Con `ja-JP`, `Intl` escribe el día solo como «8日», el mes como
  «10月» y el año como «2026年»: una plantilla que las junta NO añade 日・月・年 (`{{mesYAnio}}{{dia}}～{{diaFinal}}` →
  2026年10月8日～18日). Un mes con su año sale entero de `Intl` (2026年10月), sin plantilla.
- **Rangos de fechas con ～** (2026年10月8日～18日), y **la duración de un viaje se dice «10泊11日»**: noches primero y
  el día sin 間, que sí lleva la duración de una encuesta (3日間).
- **El orden de una fecha que se elige por piezas es 年・月・日.** Lo da `ordenDeLaFecha(locale)` en
  `i18n/formato.ts` con `Intl`; ninguna pantalla lo escribe a mano.

## 7. Patrones de interfaz

| Qué | Cómo | Ejemplo |
|---|---|---|
| Botón, CTA | Sustantivo o raíz verbal, sin する ni 。. Si el español dice objeto y acción, se conserva: 「画像を生成」 | 保存、削除、次へ、作成、共有、プロンプトをコピー |
| Pestaña, menú, navegación | Sustantivo corto | ホーム、検索、通知、設定、ヘルプ |
| Título, encabezado | Frase nominal, sin 。 | プロフィールの編集、アカウント設定 |
| Descripción, ayuda | です・ます, con 。 | 投稿はすべて公開されます。 |
| Placeholder | Corto, sin 。; con … si el español lo lleva. Las instrucciones van en el texto de ayuda, no aquí. [SHR-input] | コメントを書く… |
| Carga | ～中…| 読み込み中…、生成中…、送信中… |
| Éxito | ～しました。| 保存しました。 |
| Estado vacío | 〈objeto〉はありません。+ una sugerencia | 投稿はまだありません。最初の投稿を作成しましょう。 |
| Sin resultados | 該当する〈objeto〉はありません。| 該当するコミュニティはありません。 |
| Error | Qué pasó + qué hacer. Sin culpar. ～できませんでした。+ ～してください／もう一度お試しください。 [MS §5.4.2] [SHR-error] [WR] | 画像をアップロードできませんでした。接続を確認して、もう一度お試しください。 |
| Advertencia | La consecuencia, clara y sin alarmismo | この操作は取り消せません。 |
| Confirmación | ～しますか？ (no ～してもよろしいですか) [MS p.46] | ログアウトしますか？ |
| Acción destructiva | Título 〈objeto〉の削除; pregunta ～を削除しますか？; aviso 「この操作は取り消せません。」; botones 削除 y キャンセル [SHR-delete] | 投稿の削除 / この投稿を削除しますか？ |
| Formulario | Etiquetas en sustantivo; obligatorio: 必須; opcional: 任意 | メールアドレス（必須） |
| Bienvenida | です・ます, ánimo con medida | Weëへようこそ。まずはプロフィールを作成しましょう。 |
| Disculpa | Solo ante un fallo serio (la pantalla de error): 申し訳ありません. Nunca ございます. [MS] [KOYO] | |

**Accesibilidad.** Las etiquetas para el lector de pantalla (`accessibilityLabel`) dicen qué hace el control o qué es,
en japonés natural: 「メニューを開く」「戻る」「投稿を削除」. No añaden ボタン (el rol ya lo anuncia). Los símbolos que se
leerían mal se dicen con palabras: アンド, プラス, 約 (no &, +, ~). Las marcas no necesitan etiqueta de idioma: WCAG
exime los nombres propios. [MS §3.2] [WCAG 3.1.2]

## 8. Personas, contenido y huecos

- **Lo que escribe una persona no se traduce**: publicaciones, comentarios, nombres de comunidades y proyectos, prompts.
- **Los huecos** (`{{nombre}}`, `{{contador}}`…) se copian con su nombre exacto. Las partículas japonesas no cambian con
  lo que las precede (al contrario que en coreano), así que pueden ir pegadas al hueco: 「{{nombre}}がフォローしました」.
- **El nombre de otra persona va solo** en lo que se cuenta de ella (「{{nombre}}がコメントしました」); さん solo al
  dirigirse a quien usa Weë por su nombre (「こんにちは、{{nombre}}さん」). Nunca さん detrás de un hueco que no sea una
  persona.
- **Las claves con cantidad** (`_one`/`_other`) dicen lo mismo, con `{{contador}}` y su contador: 「{{contador}}件のコメント」.

## 9. Las marcas

**Intactas, en latino, con sus mayúsculas y sus diacríticos**:

`WEE` · `Weë` · `WEË AI` · `Weë AI` · `WeëAI` · `Weë Studio` · `Weë Design` · `Weë Photo` · `Weë Writer` · `Weë Music` ·
`Weë Beauty` · `Weë Chef` · `Weë Home` · `Weë Business` · `Weë Travel` · `Weë Brain` · `Weë Inspira` · `Weë Credits` ·
`Credits` · `Weëls` · `Wäll` · `WeeTalk` · `ËContact` · `ẄContact`

- **Nunca en katakana:** ウィー、ウェー、ウィースタジオ、ウィールズ、ウォール、ウィートーク、クレジット.
- **Nunca traducidas:** Wäll no es フィード ni タイムライン; Weëls no es リール ni ショート動画; Credits no es
  ポイント ni コイン.
- **La gramática va alrededor:** 「Weëへようこそ」「Creditsが不足しています」「Weëlsを見る」「Wällに投稿」.
- **Sin plural ni declinación**, y con la ë de un solo carácter (NFC): la prueba 24d lo vigila. Dos formas que YA existen
  en la app se quedan como están, porque son nombres: **Weëls** (invariable también donde el español dice «un Weël»,
  § 10.7) y **ËContacts / ẄContacts**, el nombre en plural de la agenda que monta el código y que se ve en el perfil.
- **Lo descriptivo sí se traduce.** «la comunidad de Weë» es 「Weëのコミュニティ」; «tus Weëls» es 「Weëls」.
- **Otras marcas** (Google, Instagram, TikTok, YouTube, WhatsApp Business) también van en latino.
- **Los nombres de las funciones y los módulos de Weë Business** —Business Plan, Business Coach, Pricing Assistant,
  Brand Kit, Customer Insights, Business Ideas, Business Profile; y My Business, Products & Catalog, Create, Social,
  Analyze, Grow, Promote— son nombres de producto y se escriben igual en todos los idiomas, como Weë Studio (decisión
  del usuario, 2026-09-16). Lo que hace cada uno sí se traduce, en su pista. «SWOT» se queda como sigla: 「SWOT分析」.
- **La firma de marca del Home**, «Imagina · Crea · Conecta» (`LEMA_DE_MARCA` en `components/Header.tsx`), va debajo
  del logo y no se traduce en ningún idioma: es firma, como el logo. (El lema de Weë Brain, `brain.slogan`, sí se
  traduce: es texto de la pantalla.)

## 10. Glosario

Un concepto, una palabra. Donde el contexto de la interfaz pide otra, la excepción está en la columna de notas.

### 10.1 Crear con IA

| Español | Japonés | Notas |
|---|---|---|
| IA | AI | Siempre en latino. «con IA» → AIで |
| IA generativa | 生成AI | |
| crear (botón, menú) | 作成 | 「新規作成」cuando es «nuevo» |
| crear (en una frase, en conversación) | 作る | 「何を作りますか？」: palabra de todos los días en lo que Weë pregunta |
| creación (acción) | 作成 | |
| creación (resultado), obra | 作品 | «Mis creaciones» → マイ作品 |
| generar | 生成 | 「画像を生成」「動画を生成」 |
| generar con IA | AIで生成 | |
| prompt | プロンプト | |
| modelo (de IA) | モデル | La interfaz no los muestra; sí el panel de administración |
| imagen | 画像 | «foto» → 写真 |
| vídeo | 動画 | ビデオ solo en ビデオ通話 |
| audio | 音声 | «pista de audio» (edición) → オーディオトラック |
| voz (lo generado) | 音声 | «voz de un personaje» (el timbre) → 声; «narración» → ナレーション |
| música | 音楽 | Weë Music es marca |
| documento | ドキュメント | |
| texto (tipo de creación) | テキスト | «el texto que escribes» (prosa) → 文章 |
| diseño | デザイン | |
| proyecto | プロジェクト | «Mis proyectos» → マイプロジェクト |
| referencia (imagen) | 参考画像 | «de referencia» → 参考 |
| estilo | スタイル | |
| plantilla | テンプレート | |
| resultado | 結果 | |
| plan (lo que propone Weë Brain) | プラン | |
| paso | ステップ | |
| material, recurso (asset) | 素材 | アセット solo en administración |
| flujo de trabajo | ワークフロー | |
| renderizar, render | レンダリング | |
| subir | アップロード | |
| descargar | ダウンロード | |
| importar | 読み込み (読み込む) | Como en las herramientas creativas (Adobe, Apple). No インポート |
| exportar | 書き出し (書き出す) | Ídem. No エクスポート |
| nube | クラウド | |
| modo demo / de prueba | デモモード / テスト用 | |

### 10.2 Vídeo, cine, imagen y 3D (también para módulos futuros)

| Español | Japonés | Notas |
|---|---|---|
| producción (el proyecto de película) | プロダクション | La actividad: 制作 (動画制作) |
| escena | シーン | |
| toma, plano | ショット | «corte» → カット |
| personaje | キャラクター | |
| guion | 脚本 | |
| storyboard | 絵コンテ | |
| cámara | カメラ | Los movimientos de cámara se dicen como en el cine japonés: ズームイン、パン、ドリー |
| duración | 長さ | «15 s» → 15秒 |
| relación de aspecto, formato | アスペクト比 | «9:16» se copia |
| resolución | 解像度 | «1080p», «4K» se copian |
| calidad | 画質 (imagen y vídeo) / 品質 (en general) | |
| subtítulos | 字幕 | |
| transición | トランジション | |
| efecto | エフェクト | |
| filtro | フィルター | |
| fondo | 背景 | |
| retrato | ポートレート | |
| iluminación, luz | ライティング / 光 | |
| modelo 3D | 3Dモデル | |
| generación 3D | 3D生成 | |
| visor 3D | 3Dビューアー | |

### 10.3 Lo social

| Español | Japonés | Notas |
|---|---|---|
| Inicio (Home) | ホーム | |
| Buscar | 検索 | |
| Crear (el +) | 作成 | |
| Explora | 発見 | Como Instagram. En una frase: 探す、見つける |
| Comunidad, comunidades | コミュニティ | |
| publicación | 投稿 | Verbo «publicar» en el muro: 投稿する |
| publicar (hacer público) | 公開 | Visibilidad, no el muro |
| comentario | コメント | |
| responder, respuesta | 返信 | |
| me gusta | いいね | Sin ！ |
| seguir / siguiendo / seguidores | フォロー / フォロー中 / フォロワー | |
| compartir | 共有 | Como la hoja de compartir del sistema, Google y YouTube |
| guardar / Guardados | 保存 / 保存済み | |
| denunciar, reporte | 報告 | |
| bloquear / silenciar | ブロック / ミュート | |
| mencionar | メンション | |
| encuesta / votar / voto | アンケート / 投票 / 票 | |
| borrador | 下書き | |
| tendencias | トレンド | |
| «Cómo lo hice» | 作り方 | |
| copiar prompt | プロンプトをコピー | |
| etiqueta (tag) | タグ | |
| miembro | メンバー | |
| unirse / salir (comunidad) | 参加 / 退会 | |
| usuario | ユーザー | |
| mensaje, chat | メッセージ | WeeTalk es marca |
| notificación | 通知 | |
| en vivo, en directo | ライブ | |

### 10.4 Cuenta, perfil y ajustes

| Español | Japonés | Notas |
|---|---|---|
| cuenta | アカウント | |
| perfil | プロフィール | |
| Perfil Real | リアルプロフィール | La cara de la vida real. «リアル» es como se dice en japonés la vida fuera de la red |
| Perfil Weë | Weëプロフィール | |
| configuración, ajustes | 設定 | |
| privacidad | プライバシー | |
| seguridad | セキュリティ | |
| idioma | 言語 | |
| ayuda | ヘルプ | |
| iniciar sesión / cerrar sesión | ログイン / ログアウト | |
| registrarse / crear cuenta | 新規登録 / アカウントを作成 | |
| contraseña | パスワード | |
| correo electrónico | メールアドレス | |
| invitado | ゲスト | |
| nombre de usuario | ユーザー名 | |
| foto de perfil | プロフィール写真 | |
| ubicación | 位置情報 (el del aparato) / 場所 (un lugar) | |
| términos / política de privacidad | 利用規約 / プライバシーポリシー | |

### 10.5 Credits y dinero

| Español | Japonés | Notas |
|---|---|---|
| Credits | Credits | Marca. Nunca クレジット, ポイント ni コイン |
| saldo | 残高 | 「Credits残高」 |
| recargar, recarga | チャージ | 「テストチャージ」 para la de prueba |
| coste, cuesta | 消費 / 必要なCredits | «Cuesta 3 Credits» → 「3 Credits消費」o「3 Credits必要です」 según el sitio |
| estimado | 目安 / 約 | Un aviso previo nunca usa el verbo del cargo ya hecho (消費しました) |
| reembolso | 返還 | |
| gratis | 無料 | |
| comprar | 購入 | |

### 10.6 Estados, acciones y avisos

| Español | Japonés | Notas |
|---|---|---|
| guardar | 保存 | |
| editar | 編集 | |
| eliminar, borrar | 削除 | |
| cancelar | キャンセル | |
| aceptar (el OK de un diálogo) | OK | |
| confirmar (dejar hecho) | 確定 | 「購入を確定」 |
| confirmar (comprobar) | 確認 | 「パスワード（確認用）」 |
| cerrar | 閉じる | |
| volver | 戻る | |
| siguiente / anterior | 次へ / 前へ | |
| listo (terminar) | 完了 | |
| reintentar | 再試行 / もう一度試す | Botón: 再試行; en una frase: もう一度お試しください |
| ver todo | すべて表示 | |
| más | もっと見る | |
| error | エラー | |
| advertencia | 注意 | 警告 solo para lo grave |
| cargando | 読み込み中… | |
| completado | 完了 | |
| pendiente (una solicitud) | 承認待ち | |
| pendiente (un trabajo en cola) | 処理待ち | |
| pendiente (lo que Weë aún no puede hacer) | 準備中 | |
| disponible / no disponible | 利用可能 / 利用できません | En una etiqueta corta: 利用不可 |
| próximamente (función) | 近日公開 | |
| próximamente (un idioma) | 近日対応 | |
| «No sé» (la opción 🤷) | わからない | Es la respuesta de la persona: forma llana |
| sí / no | はい / いいえ | |

### 10.7 Términos que fijó la primera traducción completa

Salieron al traducir los módulos y ya están en uso: quien añada una cadena los reutiliza.

| Área | Español → japonés |
|---|---|
| ËContact | conexión → つながり · solicitud → リクエスト · aceptar / rechazar / retirar → 承認 / 拒否 / 取り消す · recibidas / enviadas → 届いたリクエスト / 送ったリクエスト · agenda → 連絡先リスト |
| WeeTalk | conversación → 会話 · modo efímero → 消えるメッセージ · foto única → 1回限りの写真 · ver una sola vez → 1回だけ表示 · abierta → 開封済み · nota de voz → ボイスメッセージ · «Tú: …» → 「あなた：…」 |
| Wäll y social | repost → リポスト (deshacer: リポストを取り消す) · destacado → 注目の〈objeto〉 · tema del día → 今日の話題 · «¿Qué quieres compartir?» (invitación a publicar) → 何を投稿しますか？ · destino de la publicación → 投稿先 · visibilidad → 公開範囲 · galería del teléfono → 写真ライブラリ |
| Weëls | Japonés no tiene número: el nombre invariable es **Weëls**, también donde el español dice «un Weël» |
| Perfil | portada → カバー画像 · biografía → 自己紹介 · nombre visible → 表示名 · «Perfil X activo» → Xを使用中 · alter ego → もう一人の自分 / 分身 · pestaña Media → メディア |
| Weë AI | especialista → スペシャリスト · Mis documentos → マイドキュメント · Hogar & Diseño → 住まい＆デザイン · «Todavía no lo sé» → まだわからない · ordenar / recientes / antiguas → 並べ替え / 新しい順 / 古い順 · cargar más → もっと見る |
| Credits | Mi billetera → マイウォレット · obtenidos / usados → 獲得 / 使用 · movimientos → 取引履歴 · coste → 必要なCredits · cargo hecho → 消費しました · «no se te cobró» → Creditsは消費されていません |
| Weë Business | negocio → ビジネス · cliente → 顧客 · redes sociales → SNS (siempre con japonés al lado: SNS投稿) · conectar → 連携 · producto → 商品 (contador 点) · reseña → レビュー · programar → 予約 · alcance → リーチした人数 · interacciones → エンゲージメント · margen → 利益率 |
| Weë Chef | menú → 献立 · ingredientes → 食材 · por ración → 1食あたり · N personas → N人分 · dificultad → かんたん / ふつう / プロ級 |
| Weë Design | materiales → 素材 · iluminación → ライティング (自然光 / 暖かい光 / スタジオ照明) · recorrido → ウォークスルー動画 · antes y después → ビフォーアフター · remodelar → リフォーム |
| Weë Studio | ajustes: アスペクト比 (正方形 / 縦長 / 横長) · トーン · 長さ (短め / 標準 / 長め) · 品質 · cámara: 固定 · ズームイン / ズームアウト · 並走 (tracking) · 周りを回る · 追いかける · 左右にパン · 上下にティルト · planos: 全景 · ロングショット · ミディアムショット · クローズアップ · lentes: 広角 / 標準 / 望遠 / マクロ / 魚眼 |
| Ajustes y permisos | permisos → アクセス許可 · permitir → 許可 · preferencias → 環境設定 · país → 国・地域 · oficial → 公式 |
| Administración (panel del motor) | proveedor → プロバイダー · cadena de respaldo → フォールバックチェーン · política → ポリシー · estado de salud → ヘルス状態 · prioridad → 優先度 · visión → 画像認識 |
| Diálogos | el botón único de un aviso → **OK** (en latino, como iOS y Android) · «Entendido» → わかりました · «Más tarde» → 後で |

**Excepciones escritas.** 「ありがとうございます」 es la fórmula de agradecimiento y no el ございます servil que la guía descarta. 「すべて既読にする」 conserva する porque 既読 solo no se lee como acción (así lo escriben Gmail, Outlook y Slack).

## 11. Lo que no se traduce

- Claves, identificadores, `optionId`, rutas, parámetros técnicos, nombres de variables de los huecos.
- Emojis, flechas y separadores del español: se copian en el mismo sitio.
- Relaciones de aspecto (9:16), resoluciones (1080p, 4K), duraciones tipo «0:12», nombres de formatos (GLB, JPG, PDF).
- Nombres de otras marcas y de redes (Google, Instagram, TikTok, YouTube, WhatsApp Business).

## 12. Decisiones donde las fuentes no coinciden

| Tema | Opciones | Elegido | Por qué |
|---|---|---|---|
| Espacio japonés–latino | Sin espacio (JTF, SmartHR, Apple, Instagram, gobierno; W3C: nunca a mano) / con espacio (Microsoft, Google, WordPress) | Sin espacio | Red social de consumo; estándar nacional; regla del encargo contra los espacios artificiales |
| ！？ | Ancho completo (JTF, SmartHR, KOYO) / medio (MS) / evitarlos (Ubie) | Ancho completo y con mesura | Coherente con 、。 de ancho completo |
| Puntos suspensivos | … (SmartHR, KOYO) / ... (MS) | … | Es el carácter que ya usa el español de Weë |
| （）： | Ancho completo (JTF, SmartHR) / medio (MS) | Ancho completo | Coherencia tipográfica |
| Nombrar un botón en una frase | 「」 (Apple) / ［］ (JTF, SmartHR) / [ ] (MS, Google) | 「」 | Interfaz de consumo; es también la cita japonesa corriente |
| Palabras en -y | カテゴリー (KOYO, JTF) / カテゴリ (SmartHR, YouTube, Apple) | Palabra a palabra, en el glosario | El uso de consumo no es uniforme; se fija cada una |
| ブラウザ / フォルダ | Con ー (MS) / sin ー (SmartHR, Google, Apple) | Sin ー | Uso de consumo; son las dos excepciones escritas en § 3.2 |
| compartir | 共有 (Google, MS, YouTube, sistema) / シェア (Instagram) | 共有 | Es lo que dice la hoja de compartir del teléfono |
| me gusta | いいね！ (Instagram) / いいね (X) / 高評価 (YouTube) | いいね | Sin la exclamación, que es de la marca de Meta |
| Guardados | 保存済み (Instagram) / ブックマーク (X, sin verificar) | 保存済み | Fuente verificada |
| Explora | 発見 (Instagram) / 探索 (YouTube) | 発見 | Red social visual, como Instagram |
| Importar / exportar | インポート/エクスポート (MS) / 読み込み/書き出し (Adobe) / 取り込む/書き出す (SmartHR) | 読み込み / 書き出し | Weë es una herramienta creativa, como Adobe y Apple |
| さん tras el nombre de otra persona | Con さん dentro de una frase (SmartHR, Mastodon) / sin さん (LINE, muestra oficial; Bluesky) | Sin さん al contar lo que hizo; con さん solo al dirigirse a la persona | La regla del encargo contra los honoríficos innecesarios; el nombre puede ser un alias |
| Instrucciones | ご確認ください (MS) / 確認してください (SmartHR) | Las dos, según el peso: ～してください por defecto; お試しください／ご確認ください en las fórmulas fijas | Uso corriente de las apps japonesas |

## 13. Cómo se revisa

1. Leer la cadena **en su pantalla** (el contexto está en el uso del código, no en la clave).
2. ¿Suena a app japonesa o a traducción? ¿Diría esto una app japonesa en ese botón, en ese error?
3. ¿Usa las palabras del glosario? ¿Las marcas siguen en latino?
4. ¿Cabe? El japonés suele ser más corto que el español; si algo no cabe, primero se reescribe la cadena, y solo si no
   hay manera se toca el diseño, lo mínimo.
5. `node functions/test/i18n-japones.test.mjs` y `node functions/test/i18n-nombres-propios.test.mjs`.

## Fuentes

- **[JTF]** JTF日本語標準スタイルガイド（翻訳用）第4.0版 (2026-07-25), CC BY 4.0 — https://www.jtf.jp/pdf/jtf_style_guide.pdf
- **[MS]** Microsoft Japanese Localization Style Guide — https://aka.ms/japanese-styleguide
- **[SHR-*]** SmartHR Design System — https://smarthr.design/products/contents/ (idiomatic-usage, ui-text, writing-style, error-messages) y https://smarthr.design/products/design-patterns/delete-dialog/
- **[UBIE]** Ubie Vitals UXライティング — https://vitals.ubie.life/ux-writing/
- **[MERC]** Entrevista a la redactora de UX de Mercari (2025-01-22) — https://www.unprinted.design/articles/mercari-ux-writing-for-brand-experience-clarity/
- **[WR]** wordrabbit, mensajes de error — https://wordrabbit.jp/writing_uxes/uxw4081889724
- **[LINE]** Guía oficial de notificaciones de LINE — https://guide.line.me/ja/features-and-columns/linetips-notification.html
- **[SHR-crew]** SmartHR, nombres de personas en la interfaz — https://smarthr.design/products/contents/ui-text/crew-account/
- **[WP]** WordPress 日本語翻訳スタイルガイド — https://ja.wordpress.org/team/handbook/translation/translation-style-guide/
- **[GAIRAI]** 内閣告示「外来語の表記」(1991) — https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/gairai/pdf/94380801_03.pdf
- **[KOYO]** 「公用文作成の考え方」(2022) — https://www.bunka.go.jp/seisaku/bunkashingikai/kokugo/hokoku/pdf/93651301_01.pdf
- **[JLREQ]** W3C Requirements for Japanese Text Layout — https://www.w3.org/TR/jlreq/
- **[W3C-SP]** W3C, inline spacing — https://www.w3.org/International/articles/styling/inline-space
- **[W3C-WHY] / [W3C-TAG]** Por qué declarar el idioma; cómo elegir la etiqueta — https://www.w3.org/International/questions/qa-lang-why · https://www.w3.org/International/questions/qa-choosing-language-tags
- **[WCAG]** 3.1.1 y 3.1.2 — https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html
- Práctica observada (2026-09-30): Apple (https://www.apple.com/jp/apple-intelligence/), Instagram (https://about.instagram.com/ja-jp/features), Google (https://support.google.com/accounts/answer/27441?hl=ja), YouTube (https://support.google.com/youtube/answer/57741?hl=ja), Adobe Firefly (https://www.adobe.com/jp/products/firefly.html), Microsoft (https://www.microsoft.com/ja-jp/microsoft-copilot/for-individuals).
