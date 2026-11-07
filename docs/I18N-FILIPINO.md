# I18N-FILIPINO — el filipino de Weë (`fil` / `fil-PH`)

> Guía de estilo y glosario para quien traduzca, revise o amplíe el filipino de Weë: el diccionario de hoy y los
> módulos que vengan (Filmmaker, 3D, Weë Music, Weë Travel…). La arquitectura común está en [`I18N.md`](I18N.md); aquí
> solo lo que es del filipino. Cada decisión sale de una fuente (lista al final) y, donde las fuentes no coinciden, el
> § 14 dice qué se eligió, qué se descartó y por qué.
>
> Lo que esta guía pide y se puede comprobar lo comprobará `functions/test/i18n-filipino.test.mjs` (§ 15). Lo que no
> —naturalidad, tono, contexto— es trabajo de quien escribe y de quien revisa, y en filipino pide **revisión nativa**
> antes de abrirlo a gente (§ 16).

## Índice

0. [Lo esencial](#0-lo-esencial)
1. [Idioma, locale y lo que ya resuelve la arquitectura](#1-idioma-locale-y-lo-que-ya-resuelve-la-arquitectura)
2. [Registro y tratamiento](#2-registro-y-tratamiento)
3. [Los verbos: botones, títulos, estados y mensajes](#3-los-verbos-botones-títulos-estados-y-mensajes)
4. [Inglés o filipino: la política de préstamos](#4-inglés-o-filipino-la-política-de-préstamos)
5. [Escritura: guion, ortografía, ng/nang, din/rin, mayúsculas](#5-escritura-guion-ortografía-ngnang-dinrin-mayúsculas)
6. [Las marcas y los conceptos de Weë](#6-las-marcas-y-los-conceptos-de-weë)
7. [Puntuación](#7-puntuación)
8. [Números, fechas, horas, dinero y plural](#8-números-fechas-horas-dinero-y-plural)
9. [Longitud](#9-longitud)
10. [Patrones de interfaz](#10-patrones-de-interfaz)
11. [Glosario](#11-glosario)
12. [Casos difíciles](#12-casos-difíciles)
13. [Lo que no se traduce](#13-lo-que-no-se-traduce)
14. [Decisiones donde las fuentes no coinciden](#14-decisiones-donde-las-fuentes-no-coinciden)
15. [Lo que vigila la suite](#15-lo-que-vigila-la-suite)
16. [Cómo se revisa y lo pendiente](#16-cómo-se-revisa-y-lo-pendiente)
- [Fuentes](#fuentes)

## 0. Lo esencial

1. **No se traduce del español palabra a palabra.** Se entiende qué hace la cadena y se escribe lo que escribiría un
   equipo de producto filipino: frases cortas, palabras de todos los días, el orden natural del filipino (el verbo
   primero) y nada del filipino de oficina (`upang`, `subalit`, `sapagkat`, `maaari`). [MS 3.1, 3.1.3, 4.1.7]
2. **«Ka / mo / ikaw / iyo», siempre.** Nunca «kayo / ninyo» para la persona que usa la app, y **nunca «po» ni
   «opo»**: es lo que hacen Android, Facebook, YouTube y Shopee, y lo que pide Microsoft. [MS 3.1.2, 5.3] [AOSP] [FB]
3. **Ni Taglish improvisado ni filipino artificial.** Una forma por concepto, la que un filipino ve hoy en Android,
   Facebook o YouTube: `Ibahagi`, `Kanselahin`, `Maghanap`, `komento`, `larawan`, pero `I-save`, `I-delete`, `I-like`,
   `post`, `profile`, `app`, `video`. § 4.
4. **Guion entre el afijo filipino y la palabra inglesa**: `I-save`, `mag-upload`, `Na-save`, `Ina-upload…`,
   `Nagda-download`. Un botón lleva mayúscula solo en la `I`: `I-save`, nunca `I-Save` ni `i-save` (dentro de una
   frase, minúscula: `I-tap para i-save`). [KWF-MMP 11.3]
   [MS 4.1.5, 4.1.16]
5. **Mayúscula de frase** en botones, títulos y menús: `Mga setting`, `Gumawa ng account`. Meses, días e idiomas sí
   van con mayúscula (`Oktubre`, `Huwebes`, `Filipino`).
6. **Las marcas de Weë, intactas, sin afijos y con marcador de cosa**: `sa Weë`, `ng Weë Studio`, `ang Weë AI`,
   `gamit ang Weë Studio`. Ni `i-Weë`, ni `Weëng`, ni `si Weë Brain`. § 6.
7. **El plural del filipino no está en el sustantivo, está en el enlace del número**: `3 komento` pero `4 na komento`.
   `_one` y `_other` se diferencian solo en ese `na`; ningún `_one` escribe «1» ni «isang», y nunca `mga` detrás de
   una cifra. § 8.
8. **`ng` / `nang` y `din` / `rin` según la norma de la KWF** (§ 5.3, § 5.4): `Pindutin nang matagal`, `Puwede ka
   ring…`, `Ngayon din`.
9. **Todo número, fecha, hora y moneda los escribe `Intl`** (`Oktubre 1, 2026`, `2:30 PM`, `₱1,234.50`, `60%`).
10. **Consistencia:** un concepto, una palabra: la del glosario (§ 11).

## 1. Idioma, locale y lo que ya resuelve la arquitectura

| | |
|---|---|
| Idioma | `fil`, diccionario en `i18n/textos/fil/` |
| Locale principal | `fil-PH` (en `LOCALES_CONTEMPLADOS`) |
| Nombre en el selector | **`Filipino`** — el que da CLDR (`Intl.DisplayNames('fil').of('fil')`) y el que enseña el selector de Facebook. Nunca «Tagalog»: el idioma que se ofrece es el filipino estándar [Node] [FB] |
| Alias que conviene registrar | `tl` y `tl-PH`: ICU los canoniza a `fil` (`new Intl.PluralRules('tl').resolvedOptions().locale` es `fil`; `tl-PH` → `fil-PH`) y Android guarda el filipino en `values-tl`. El resolutor de Weë normaliza pero no traduce códigos: sin el alias, un aparato que diga `tl-PH` caería al inglés. Lo decide quien integre (§ 16) [Node] [AOSP] |
| Variantes | Ninguna |
| Respaldo | `fil-PH` → `fil` → `en`, clave a clave |
| Plural | `Intl.PluralRules('fil')`: `one` y `other`, pero **no significan «uno» y «varios»** (§ 8.3) [CLDR] [Node] |
| Formatos | `Intl` con el locale: `Oktubre 1, 2026`, `10/1/26`, `2:30 PM`, `1,234,567.89`, `₱1,234.50`, `60%`, `3 araw ang nakalipas`, `kahapon`, `A, B, at C` [Node] |
| Web | `<html lang="fil">`, lo escribe `IdiomaContext` |
| Pantalla de error | Su fila `fil` en `components/ErrorBoundary.tsx` |
| Permisos de iOS | `locales/fil.json` y su línea en `app.json` → `expo.locales` (`I18N.md` § 5.7) |
| Fuente | Alfabeto latino: Inter cubre todo lo que el filipino usa (ñ incluida). Sin trabajo tipográfico |

**Los formatos no se escriben a mano**: salen de `i18n/formato.ts`. El separador de miles es la coma y el decimal el
punto (como en inglés de EE. UU.), el peso va pegado (`₱`, U+20B1) y el `%` también. La semana empieza en domingo
(`weekInfo.firstDay = 7`). [Node] [MS 4.1.13, 4.1.17]

## 2. Registro y tratamiento

**Tú cercano: «ikaw / ka / mo / iyo / iyong».** Microsoft lo escribe en su tabla de palabras («you → ka, iyo; do not
use formal kayo or inyo») y en las instrucciones de los prompts de Copilot pide expresamente **no usar «po» ni
«opo»** porque suenan demasiado formales. Lo confirman los productos que la gente usa a diario: en 9.325 cadenas de
Android en filipino no hay ni un «po», hay «mo» en 347 e «iyong» en 744, y «kayo» en ninguna; la ayuda de Facebook,
la de YouTube y la de Shopee hablan igual («Maaari mong baguhin…», «iyong account»). La guía de Mozilla pide un
registro formal, pero ninguna de las apps y redes consultadas lo sigue. [MS 3.1.2, 5.3] [AOSP] [FB]
[YT] [SHOPEE] [MOZ]

| Tipo de cadena | Forma | Ejemplo |
|---|---|---|
| Botón, acción de menú | Imperativo sin pronombre, mayúscula de frase, sin punto, 1–3 palabras | `I-save`, `Kanselahin`, `Ibahagi`, `Kopyahin ang link` |
| Título de pantalla o sección | Sustantivo, sin punto | `Mga setting`, `Mga proyekto ko`, `Tulong` |
| Instrucción | `I-tap ang X para …`; el verbo delante | `I-tap ang I-edit para palitan ang larawan.` |
| Mensaje informativo | Frase corta, verbo delante, punto | `Na-save ang mga pagbabago.` |
| Error | Qué pasó + qué hacer; sin culpar | `Hindi ma-upload ang larawan. Subukan ulit.` |
| Confirmación | `Gusto mo bang …?`; si se pierde algo, lo dice | `Gusto mo bang i-delete ang post na ito? Hindi na ito maibabalik.` |
| Estado vacío | `Wala pang …` + una invitación | `Wala pang komento.` · `Maging unang magkomento.` |
| Éxito | Corto | `Na-save`, `Nakopya!` |
| Etiqueta del lector de pantalla | Qué hace, sin «button» detrás | `Buksan ang menu` |
| Weë Brain, conversación | Cercano, primera persona, «ka/mo/kita» | `Saan mo gustong pumunta?` · `Dadalhin kita doon.` |

- **Palabras de todos los días** [MS 3.1.3, 4.1.7]: `pero` (no `ngunit`, `subalit`, `datapwat`), `para` (no
  `upang`), `dahil` (no `sapagkat`), `ayon sa` (no `alinsunod sa`), `puwede` (no `maaari`), `baka` o `posibleng` (no
  `maaaring`), `nagkakaproblema` (no `nakararanas ng mga problema`). Android usa `para` en 913 cadenas y `upang` en
  102; `puwede` en 184 y `maaari` en 107. [AOSP]
- **Sin «paki-» en los botones.** En un mensaje se admite cuando se pide un favor de verdad (esperar, revisar algo);
  lo normal es el imperativo a secas. [MS 3.2.1]
- **«Kami» y «tayo» no son lo mismo.** Cuando Weë (el equipo, la app) habla de sí mismo, primera persona
  **exclusiva**: `kami`, `namin`, `amin` — `Hindi namin ibinebenta ang impormasyon mo.` `Tayo` / `natin` incluye a
  la persona y solo vale para invitarla a hacer algo juntos: `Tara, simulan natin.` [MS 4.1.15]
- **Sin género, gratis.** El filipino no tiene género gramatical (`siya` es él y ella): los «Bienvenido/a»,
  «seguro/a» del español desaparecen solos. Nunca se inventa una barra (`siya/sila`, `ni/ng`). [MS 4.1.8]
- **Presente y orden natural.** La frase empieza por el predicado (`Na-save ang post`); la inversión con `ay`
  (`Ang post ay na-save`) suena a texto escrito y se reserva para cuando de verdad aclara. [MS 4.1.15]

## 3. Los verbos: botones, títulos, estados y mensajes

### 3.1 Botones: el infinitivo-imperativo

El imperativo filipino es la forma infinitiva del verbo, sin pronombre. [MS 4.1.20]

- **Con objeto sobreentendido, foco en el objeto** (`i-`, `-in`, `-an`): `I-save`, `I-delete`, `I-edit`, `I-post`,
  `Ibahagi`, `Kopyahin`, `Kanselahin`, `Piliin`, `Alisin`, `Isara`, `Buksan`, `Tanggapin`, `Tanggihan`, `Payagan`.
- **Sin objeto o con objeto indefinido, foco en quien actúa** (`mag-`, `-um-`, `ma-`): `Magpatuloy`, `Maghanap`,
  `Mag-sign in`, `Magsimula`, `Gumawa`, `Sumali`, `Bumalik`, `Magkomento`, `Bumoto`; con objeto indefinido detrás,
  `ng`: `Gumawa ng proyekto`, `Bumili ng Credits`, `Magdagdag ng opsyon`.
- **Nunca** `I-save mo`, `Pakisave`, `Mag-save ka`: un botón no lleva pronombre ni «paki-».

### 3.2 Títulos

Sustantivo o sintagma nominal: `Mga setting`, `Paghahanap` (como sección), `Mga madalas itanong`, `Tungkol sa Weë`.
Cuando el español titula con un verbo («Iniciar sesión», «Crear cuenta»), el filipino también (`Mag-sign in`,
`Gumawa ng account`), como Android.

### 3.3 Estados: el aspecto verbal

El filipino marca si la acción **terminó** (completado), **está en curso** (progresivo) o **va a pasar**
(contemplativo). Cada estado de la interfaz tiene su forma, y es una lista cerrada (§ 11.4): no se inventan otras.

| Estado | Forma | Ejemplos |
|---|---|---|
| En curso (`Guardando…`) | Progresivo; foco en el objeto si lo hay, `nag-` si es intransitivo | `Naglo-load…` · `Sine-save…` · `Ina-upload…` · `Dina-download…` · `Pino-post…` · `Ipinapadala…` · `Ginagawa…` · `Pinoproseso…` · `Nire-record…` · `Naghahanap…` · `Nag-iisip ang Weë Brain…` |
| Terminado (`Guardado`) | Completado con `na-` (préstamo) o la forma nativa | `Na-save` · `Na-upload` · `Na-post` · `Na-delete` · `Nakopya` · `Naipadala` · `Natanggap` · `Tapos na` · `Handa na` |
| Futuro (`Se guardará…`) | Contemplativo | `Ise-save ito sa proyekto mo.` · `Hihingi ng pahintulot ang Weë kapag kailangan.` |
| Fallo | `Hindi ma-…` (no se pudo) | `Hindi ma-save ang draft.` · `Hindi maipadala ang komento.` |

**Cómo se reduplica un préstamo** (progresivo y contemplativo): se repite la primera sílaba **como suena**, escrita a
la filipina y pegada al afijo; luego guion y la palabra inglesa intacta: `nagda-download` (Microsoft), `naglo-load`
(Android), `sine-save` (Android), `ia-upload` (Microsoft), `ie-edit` (Gemini), `pino-post` (YouTube), `nire-record`
(Android). Nunca se toca la palabra inglesa: ni `nagdadownload`, ni `dinownload`, ni `sinave`. Si una forma no está
en la lista y suena forzada, se busca el verbo nativo (`Ginagawa…` en vez de una reduplicación de *generate*).
[MS 4.1.4, 4.1.20] [AOSP] [GEM] [YT]

### 3.4 Mensajes

- **Errores con `Hindi ma-…` / `Hindi maka-…`**, como Microsoft y Android (162 cadenas `Hindi ma…`): `Hindi
  makakonekta sa Weë.` · `Hindi mahanap ang post na ito.` `Nabigong…` (Microsoft) se evita: suena a sistema.
  [MS 5.5.2] [AOSP]
- **«Algo salió mal» es `Nagkaproblema.`** y «Inténtalo de nuevo», **`Subukan ulit.`** — literal de Android
  (`Nagkaproblema. Subukan ulit.`). [AOSP]
- **Confirmaciones con `Gusto mo bang …?`** (Android, 12 a 1 frente a `Sigurado ka bang`). `Sigurado ka bang …?` solo
  si se pierde algo para siempre y el español lo pregunta así. [AOSP]

## 4. Inglés o filipino: la política de préstamos

El filipino digital es bilingüe: Microsoft lo describe como «bilingüismo masivo inglés-filipino» y pide usar los
términos ingleses bien asentados que la gente usa, con gramática filipina. La KWF anima a adaptar préstamos pero
**no** cuando la forma original es más popular o la adaptada se lee peor, y pide no avergonzarse del término inglés si
es el conocido. Weë toma el punto medio de Android y YouTube: ni el Taglish de Facebook en todo (`comment`,
`message`), ni el filipino de diccionario de la traducción comunitaria de Mastodon (`Hadlangan` por «Block», `Mga
tagasunod` por «Followers», `Mga abiso` por «Notifications»). [MS 4.1.4, 5.3] [KWF-MMP 4.7, 4.9] [AOSP] [YT] [FB]
[MASTO]

**Cómo se decide un término nuevo:**

1. ¿Qué dice **Android en filipino**? Si es una palabra filipina corriente (`Kanselahin`, `Ibahagi`, `Isara`,
   `Laktawan`, `Tapos na`, `Payagan`, `Wika`, `Lokasyon`), esa. Si es un préstamo (`app`, `account`, `password`,
   `Mga setting`, `Mga notification`, `I-delete`, `I-save`), ese.
2. Si es un concepto **social o creativo** que Android no tiene, lo que dicen YouTube, Gemini y Facebook en filipino
   (`komento`, `I-like`, `I-follow`, `I-block`, `I-report`, `Mag-generate`, `prompt`).
3. **Descartado siempre**: el filipino de diccionario que nadie ve en una app (`Hadlangan` por «Block», `Sundan` por
   «Follow», `Mga tagasunod`, `Mga abiso`, como en Mastodon), el inglés con plural inglés (`Mga settings`,
   `Mga videos`, `followers`) y el respelling que nadie usa (`bidyo`, `imeyl`, `pasword`, `aplikasyon` por app).
4. **El plural lo pone `mga`, no la `-s`**: `Mga setting`, `mga app`, `mga file`, `mga follower`, `mga larawan`.
   [MS 4.1.12] [AOSP]
5. **Ortografía del préstamo**: en inglés si se usa en inglés (`video`, `email`, `link`, `post`, `profile`,
   `account`); adaptada si ya está adaptada en el uso general (`komento`, `mensahe`, `larawan`, `proyekto`,
   `bersyon`, `koneksyon`, `lokasyon`, `kalidad`, `istilo`, `miyembro`). Nunca las dos para lo mismo. [KWF-MMP 4.4,
   4.6, 4.7] [MOZ]

**Lo que se queda en inglés** (con afijo filipino y guion cuando es verbo): app · account · password · email · link ·
post · repost · profile · profile picture · cover photo · bio · username · video · audio · text · file · content ·
user · device · screen · camera · gallery · browser · Home · History · setting (`Mga setting`) · notification
(`Mga notification`) · push notification · privacy · chat · voice message · AI · prompt · creator · template · draft ·
format · filter · preview · tool · feed · hashtag · trending · like · follow / unfollow · follower · block / unblock ·
report · mute · mention · tag · upload · download · save · delete · edit · generate · clear · top-up · refund ·
wallet · request · feedback · demo · OK · online / offline · available.

**Lo que se dice en filipino**: Ibahagi · Kanselahin · Kopyahin · Isara · Buksan · Bumalik · Susunod · Laktawan ·
Tapos na · Magpatuloy · Ipadala · Maghanap · Piliin · Alisin · Baguhin · Palitan · Payagan · Tanggapin · Tanggihan ·
Tulong · Wika · Lokasyon · larawan · mensahe · komento · komunidad · miyembro · proyekto · likha · resulta · tanong ·
sagot · opsyon · hakbang · bersyon · balanse · presyo · halaga · pagbili · Libre · pahintulot · pribado ·
pampubliko · boses · musika · kalidad · istilo.

## 5. Escritura: guion, ortografía, ng/nang, din/rin, mayúsculas

### 5.1 El guion

- **Afijo filipino + palabra en su ortografía extranjera, con guion**: `I-save`, `mag-upload`, `Na-download`,
  `naka-on`, `pag-sign in`, `I-report`, `mag-email`. La KWF lo pone con ejemplos (`pa-cute` pero `pakyut`,
  `maki-computer` pero `makikompiyuter`) y Microsoft lo lista (`i-download / mag-download`, `i-save / mag-save`).
  Sin guion la palabra es ilegible (`isave`, `nadownload`) o es otra (`iban`, Microsoft). [KWF-MMP 11.3] [MS 4.1.16]
- **Afijo + palabra ya adaptada, sin guion**: `Magkomento`, `Kopyahin`, `Ilarawan`, `ikonekta`. Por eso
  `Magkomento` y nunca `Mag-comment` (la palabra de Weë es `komento`).
- **Prefijo acabado en consonante + raíz que empieza por vocal, con guion**: `mag-aral`, `pag-uusap`,
  `nag-iisip`, `mag-ingat`, `pag-asa`. [KWF-MMP 11.3] [MS 4.1.16]
- **Reduplicaciones y compuestos nuevos, con guion**: `isa-isa`, `dahan-dahan`, `kapansin-pansin`. [KWF-MMP 11.1,
  11.5]
- **`ika-` + cifra, con guion**: `ika-2`. En la interfaz se evitan los ordinales: `Hakbang 2 sa 5`. [KWF-MMP 11.8]

### 5.2 Ortografía de la casa

| Se escribe | No | Por qué |
|---|---|---|
| `puwede` | `pwede` | Android 184 a 1; es la forma que escribe la KWF |
| `koneksyon`, `bersyon`, `opsyon`, `seksyon`, `aksyon`, `transaksyon`, `impormasyon`, `lokasyon` | `koneksiyon`, `bersiyon`, `opsiyon` | Lo que la gente lee en Android (0 casos de `-siyon`) y Facebook; la KWF prefiere `-siyon` tras grupo consonántico (§ 14) |
| `kumpirmahin`, `awtomatiko`, `kalidad`, `istilo`, `miyembro`, `mikropono`, `dokumento`, `espesyalista` | `kompirmahin`, `automatiko`, `kwalidad`, `estilo`, `myembro` | Android y diccionario KWF |
| `video`, `email`, `app`, `link`, `file` | `bidyo`, `imeyl`, `aplikasyon`, `lingk`, `payl` | KWF 4.7: no se respella lo que es más popular en su forma original |
| `Mga setting`, `mga notification`, `mga file` | `Mga settings`, `notifications`, `files` | El plural lo da `mga` |
| `Subukan ulit` | `Subukang muli`, `Muling subukan` | Android 44 a 14; una sola forma |
| `iba’t iba`, `isa’t isa` | `iba’t-iba`, `iba't iba` | Contracciones fijas («iba at iba»): sin guion, porque no son palabras repetidas, y con `’` (§ 7). Las demás (`ako’y`, `siya’y`) se escriben enteras [MS 4.1.1] [KWF-MMP 11.1] |
| `dito`, `diyan`, `doon` | `rito`, `riyan`, `roon` | Android usa `dito` 3 a 1; una sola forma en todo Weë |

### 5.3 `ng` y `nang`

La KWF da **cinco usos de `nang`**; todo lo demás es `ng`. [KWF-MMP 9.1, 9.2]

| `nang` | Ejemplo de Weë |
|---|---|
| 1. «cuando» (= `noong`) | `Nang i-post mo ito…` |
| 2. «para que» (= `para`) — Weë prefiere `para` | `I-save ito nang hindi mawala.` → mejor `I-save ito para hindi mawala.` |
| 3. `na` + `ng` | `Masyado nang mahaba ang tanong.` |
| 4. Modo o medida (adverbio) | `Pindutin nang matagal`, `Hindi ko ito nagawa nang maayos`, `nang libre`, `nang sabay` |
| 5. Entre un verbo repetido | `I-tap nang i-tap` |

`ng` es el marcador: complemento (`Gumawa ng proyekto`), poseedor (`ang profile ng komunidad`), agente (`Ibinahagi ng
Weë`), y delante de un adjetivo que modifica a un sustantivo: `Kailangan ng mabilis na koneksyon` (aquí `ng` +
«conexión rápida»), frente a `Kumokonekta nang mabilis` (adverbio). `Na’ng` (contracción de `na ang`) se escribe con
apóstrofo y se evita.

### 5.4 `din` / `rin`, `daw` / `raw`

Regla de la Balarila que recoge la KWF: **`rin` / `raw` detrás de vocal o de `w` / `y`; `din` / `daw` detrás de
consonante**; y `din` / `daw` también detrás de palabras que acaban en **-ri, -ra, -raw, -ray**. La KWF añade que no
debe tratarse como error; Weë la adopta como norma de la casa porque Android la cumple en 46 de 47 casos (la
excepción, `Maa-activate din`, es correcta: *activate* acaba en /t/). [KWF-MMP 8.1, 8.2] [AOSP]

- `Puwede rin` · `Ikaw raw` · `Okey raw` · `Ngayon din` · `Lang din` · **`Araw daw`** · y el ejemplo de la KWF
  **`Maaari din`** (Weë escribe `puwede`, § 2).
- **Con préstamos manda el sonido, no la letra**: `I-save din` (/v/), `I-delete din`, `profile din`, `Like din`;
  `video rin`, `Weë rin` (/i/), `Weë AI rin`, `Weë Beauty rin`; `WeeTalk din`, `Credits din`, `Weë Design din`.
- **Con enlazador**: `ring` / `ding` siguen la misma regla (`Puwede ka ring mag-upload`).
- **Nunca `din` / `rin` justo detrás de un `{{hueco}}`**: no se sabe cómo acaba lo que entra. Se reescribe la frase.

### 5.5 Mayúsculas

- **Mayúscula de frase** en todo: botones, títulos, pestañas, menús (`Gumawa ng account`, `Mga setting`, `Mga
  proyekto ko`). Facebook escribe en filipino con mayúscula de título (`Mga Post sa Iyong Timeline`) y Microsoft la
  admite cuando el original inglés la lleva; Weë escribe en mayúscula de frase en todos los idiomas y Android también.
  [MS 4.1.5] [AOSP] [FB]
- **La `I-` de un préstamo**: en un compuesto con guion, solo el primer elemento lleva mayúscula: `I-save`, `I-on`,
  `Mag-sign in` (regla 4 de Microsoft; Android: `I-delete`, `I-mute`). Mozilla escribe `i-Bookmark`; Weë no. Dentro
  de una frase, minúscula: `I-tap para i-save.` [MS 4.1.5] [AOSP] [MOZ]
- **Sí llevan mayúscula** los nombres propios, los meses y los días (`Oktubre`, `Lunes`), los idiomas (`Filipino`,
  `Ingles`) y las marcas. Las siglas, en mayúsculas (`AI`, `PDF`, `MB`).
- **Rótulos del diseño**: los que el español escribe EN MAYÚSCULAS en el diccionario (las secciones del menú,
  `CÓMO LO HICE`) se escriben igual en filipino: `PROFILE`, `EXPLORE`, `PAANO KO GINAWA`, `I-POST SA`. Es diseño, no
  ortografía.

## 6. Las marcas y los conceptos de Weë

`Weë` · `Wäll` · `Weëls` (una: `Weël`) · `WeeTalk` · `ËContact` · `ẄContact` · `Credits` · `Weë AI` · `Weë Brain` ·
`Weë Studio` · `Weë Design` · `Weë Photo` · `Weë Writer` · `Weë Music` · `Weë Beauty` · `Weë Chef` · `Weë Home` ·
`Weë Business` · `Weë Travel` · `Weë Filmmaker` · `Weë Creator` y `Weë Biz` donde el español los nombre · `Weë AI
Engine` · `World Encode Entity` · los nombres de comunidad (`Weë Filmmakers`, `Weë Designers`…), que son contenido.

- **Ni se traducen, ni se adaptan, ni se les pega nada.** Mal: `Weë Musika`, `Weë Paglalakbay`, `Weë Negosyo`,
  `Weë Kusina`, `Weë Disenyo`, `Mga Kredito`, `Kredits`; y también `i-Weë`, `mag-WeeTalk`, `nag-ËContact`, `Weëng`,
  `Weë-ng`, `WeeTalk’y`. Microsoft lo dice igual para sus productos: nombres propios, sin genitivo pegado («Server
  ng Windows»). [MS 4.1.4, 4.1.9, 5.4]
- **Marcadores de cosa, nunca de persona**: `ang` / `ng` / `sa` (y `mga` nunca delante de `Weëls` ni de `Credits`).
  Ni `si Weë Brain`, ni `ni Weë`, ni `kay Weë AI`:

| Uso | Forma | Ejemplo |
|---|---|---|
| En la plataforma o dentro de una sección | `sa` | `Na-post sa Weë` · `Tingnan sa Weëls` · `Ipadala sa WeeTalk` |
| Sujeto | `ang` | `Ang Weë na ang bahala sa AI.` · `Nag-iisip ang Weë Brain…` |
| De (poseedor) o agente | `ng` | `ang komunidad ng Weë` · `Mga tuntunin ng Weë` · `Ginawa ng Weë Studio` |
| Con / usando | `gamit ang` | `Gumawa gamit ang Weë Studio` · `Ginawa gamit ang AI` |
| Acerca de | `tungkol sa` | `Tungkol sa Weë` |

- **Marca + sustantivo, uno detrás de otro, sin enlazador**, como escribe Facebook en filipino («I-block ang
  Facebook profile»): `Weë profile`, `ËContact request`, `WeeTalk chat`. O con `ng` / `sa` detrás del sustantivo:
  `request sa ËContact`, `mga espesyalista ng Weë`. Nunca `Weëng profile` ni `Weë na profile`. [FB]
- **`Weëls`** es el nombre de la sección y del formato: `Tingnan sa Weëls`, `Ano ang Weëls?`; un vídeo, `isang
  Weël`. **`Credits`** no cambia con la cifra (`1 Credits`, `250 Credits`): es marca.
- **Los nombres de las funciones y los módulos de Weë Business** —Business Plan, Business Coach, Pricing Assistant,
  Brand Kit, Customer Insights, Business Ideas, Business Profile; y My Business, Products & Catalog, Create, Social,
  Analyze, Grow, Promote— se escriben igual en todos los idiomas (decisión del usuario, 2026-09-16). Lo que hace cada
  uno sí se traduce. «SWOT», sigla: `SWOT analysis`.
- **Weë Brain habla en primera persona**: `Kumusta! Ako ang Weë Brain.` (con `ang`, como producto; ver § 16).

**Los conceptos de Weë que SÍ son interfaz** (en `de`, `da`, `sv` y `hi` se tradujeron como descripción, no como
marca):

| Español | Filipino | Por qué |
|---|---|---|
| Perfil Real | **Tunay na profile** (`ang Tunay na profile mo`) | `tunay` = auténtico, real; `totoo` tira a «verdadero/falso». Con mayúscula, como nombre de una de las dos caras (en `Real profile`, `Ægte profil`) |
| Perfil Weë | **Weë profile** | Marca + sustantivo, como `Facebook profile` [FB] |
| Mis proyectos | **Mga proyekto ko** | Posesivo pospuesto, el natural en un menú |
| Mis creaciones | **Mga likha ko** | `likha` = obra creada; `gawa` es demasiado general |
| Comunidades | **Mga komunidad** | |
| Guardados | **Mga naka-save** | Android: `Mga naka-save na device` [AOSP] |
| Cómo lo hice | **Paano ko ginawa** | |
| especialista (de Weë AI) | **espesyalista** | Préstamo adaptado, palabra corriente |
| creador (persona) | **creator** | `content creator` es la palabra en Filipinas |

## 7. Puntuación

El filipino sigue la puntuación inglesa. [MS 4.1.16]

- **Comillas “…”** (U+201C / U+201D) para citar lo que escribió la persona o el nombre de un botón; dentro, `‘…’`.
  Nunca «…» ni „…“: `Walang resulta para sa “{{busqueda}}”`.
- **Apóstrofo `’`** (U+2019) en las contracciones fijas (`iba’t iba`): nunca el recto, que además obliga a escapar la
  cadena.
- **`…`**, un carácter, sin espacio delante: `Naglo-load…`. Android usa `…` en 111 cadenas y `...` en 21; Weë
  siempre `…`. [AOSP]
- **Sin raya larga**: Microsoft recomienda coma, punto o paréntesis en su lugar. El guion de intervalo lo pone
  `Intl` (`Oktubre 12–18, 2026`). [MS 4.1.16]
- **`?` y `!` pegados**; nunca `¿` ni `¡`. Pocas exclamaciones: una bienvenida sí, un error no.
- **`%` pegado a la cifra** (`60%`), como da `Intl` y pide Microsoft. **Sin coma de Oxford** en una lista escrita a
  mano (`larawan, video at text`); la de `Intl` (`A, B, at C`) no se toca. [MS 4.1.17] [Node]
- **Dos puntos** sin espacio delante: `Halaga: {{coste}}`.

## 8. Números, fechas, horas, dinero y plural

### 8.1 Lo que hace `Intl`

| Qué | `fil-PH` |
|---|---|
| Número | `1,234,567.89` · negativo `-5` |
| Compacto | `1.5K`, `1.2M` (corto) · `1.5 libo`, `4 na libo`, `1.2 milyon` (largo) |
| Moneda | `₱1,234.50` · `-₱1,500.00` · `$1,234.50` |
| Porcentaje | `60%` |
| Fecha | `Oktubre 1, 2026` (larga) · `Okt 1, 2026` (media) · `10/1/26` (corta) · `Huwebes, Oktubre 1, 2026` |
| Mes y año | `Oktubre 2026` |
| Hora | `2:30 PM` (12 h, espacio normal antes de `AM`/`PM`) |
| Tiempo relativo | `ngayon` · `kahapon` · `bukas` · `3 araw ang nakalipas` · `5 minuto ang nakalipas` · `sa 2 oras` |
| Lista | `A, B, at C` · `A o B` |
| Unidades | `5 km` · `15 seg.` · `5 kilometro` / `4 na kilometro` (larga) |

- **Nada se escribe a mano**: ni `₱` delante de un hueco, ni `AM`/`PM`, ni las abreviaturas de Microsoft (`n.u.`,
  `n.h.`), ni la fecha formal `ika-1 ng Oktubre`. [Node]
- **Fechas en una frase**: pasado con `noong` (`Sumali noong {{fecha}}`), futuro o agenda con `sa`
  (`Ipo-post sa {{fecha}}`).
- **El enlace en lo que escribe `Intl`**: el tiempo relativo no lo pone (`4 araw ang nakalipas`) y las unidades largas
  y el compacto largo sí (`4 na araw`, `4 na libo`). Es dato de CLDR y no se corrige a mano; lo que escribe Weë sigue
  el § 8.3.
- **«Linggo»** es domingo y también «semana» (`nakalipas na linggo`): donde pueda confundirse, la fecha completa.
- **Orden alfabético**: `Intl.Collator('fil')` (ñ detrás de n). No se ordena a mano.

### 8.2 Cifras en el texto

Las cifras van en número (`13 taong gulang`, `15 segundo`), nunca en palabras, salvo que el español las escriba así.
Una cifra escrita a mano al principio de un mensaje se evita reescribiendo. [MS 4.1.13]

### 8.3 Plural: el enlace `na`

`Intl.PluralRules('fil')` (ICU 78.3 / CLDR 48) da, para 0–25:

| `one` | 0, 1, 2, 3, 5, 7, 8, 10, 11, 12, 13, 15, 17, 18, 20, 21, 22, 23, 25 · 100 · 1000 · 1.5 · 0.5 |
|---|---|
| **`other`** | **4, 6, 9, 14, 16, 19, 24 · 104 · 1004 · 1.4 · 0.4 · 0.6** |

La regla de CLDR es `one: v = 0 and i = 1,2,3 or v = 0 and i % 10 != 4,6,9 or v != 0 and f % 10 != 4,6,9`. No
separa «uno» de «varios»: separa los números cuyo nombre acaba en **vocal** (isa, dalawa, tatlo, lima, pito, walo,
sampu, isang daan…) de los que acaban en **consonante** (apat, anim, siyam). Es la regla del enlazador: tras vocal
el enlace es `-ng`, que con cifras desaparece (`3 komento`, se lee *tatlong komento*); tras consonante es `na`, que se
escribe (`4 na komento`, *apat na komento*). El propio cuadro de CLDR pone `3 mansanas` / `4 na mansanas`, Android lo
hace así en todos sus plurales (`# minuto ang nakalipas` / `# na minuto ang nakalipas`, `# araw` / `# na araw`) y
Microsoft lo escribe en su ejemplo («2 pares na sapatos, 4 na pantalon at 5 korto»). [CLDR] [AOSP] [MS 4.1.13] [Node]

Como el sustantivo filipino **no cambia** con el número (`1 komento`, `25 komento`; `mga` solo sin cifra), las reglas
de Weë son:

1. **Si `{{contador}}` va justo delante del sustantivo**: `_one` sin enlace, `_other` con `na`. Nada más cambia.
   - `pollVotes_one: '{{contador}} boto'` · `pollVotes_other: '{{contador}} na boto'`
   - `pollDaysLeft_one: '{{contador}} natitirang araw'` · `_other: '{{contador}} na natitirang araw'` (el patrón
     exacto de Android)
   - `count_one: '{{contador}} {{lista}}'` · `count_other: '{{contador}} na {{lista}}'`
2. **Si no** —la cifra va detrás (`Komento: {{contador}}`), entre paréntesis, ante una partícula (`at {{contador}}
   pa`), ante un símbolo o abreviatura (`{{contador}} seg.`, `{{contador}} MB`, `%`), o la cifra que se enseña es
   otro hueco (`{{cantidad}}` ya formateado y compacto)—: **`_one` y `_other` idénticos**, sin enlace. Con un número
   compacto el `contador` no garantiza que lo que se ve acabe en 4, 6 o 9.
3. **Ningún `_one` escribe «1», «isa» ni «isang»**: `_one` sale también para 0, 2, 3, 5, 7, 8… (el español
   `econtact.count_one: '1 {{lista}}'` pasa a `{{contador}} {{lista}}`).
4. **Nunca `mga` detrás de una cifra** (`4 na mga komento` está mal) **ni `(na)`**, el recurso de Android para
   números sin plural.
5. **Lo que el español distingue en singular y plural sin enseñar cifra** («Quitar la mención» / «Quitar las
   menciones») no se puede distinguir en filipino con estas categorías: las dos formas dicen lo mismo, con una frase
   que valga para uno y para varios (`Huwag nang i-mention`).
6. **El cero es `one`**: `0 komento` se lee bien, pero el estado vacío natural es su propia clave (`Wala pang
   komento`).
7. **Un número en una clave sin plural** (`{{maximo}} character`, `{{credits}} Credits`): sin enlace, o mejor la
   cifra detrás si la frase lo permite (`Halaga: {{credits}} Credits`). Nunca `na`, que estaría mal en la mayoría de
   los números.

## 9. Longitud

Medido sobre 6.886 cadenas de Android con sus tres idiomas: el filipino ocupa **lo mismo que el español** (1,00) y un
**28 % más que el inglés**. En las cadenas cortas (botones, hasta 20 caracteres en inglés) la mediana es igual al
español, pero **una de cada diez pasa de 1,43 veces**: lo que alarga son los verbos con afijo y guion (`I-download`),
el `Mga` de los plurales y las reduplicaciones (`makakapag-upload`). [AOSP] [Medición]

- Botones, pestañas y chips: la forma más corta natural (`I-save`, no `I-save ang mga pagbabago`; `Maghanap`, no
  `Maghanap sa Weë` en una pestaña).
- No se abrevia a mano ni se parte una palabra. No se cuente con el guionado automático del navegador.
- Si algo no cabe, se acorta el texto; **nunca se encoge la letra**.

## 10. Patrones de interfaz

| Situación | Patrón |
|---|---|
| Cargando | `Naglo-load…` · `Sine-save…` · `Ina-upload…` · `Pino-post…` · `Ginagawa…` |
| Hecho | `Na-save` · `Nakopya!` · `Tapos na` |
| Falló | `Hindi ma-… ang …. Subukan ulit.` · `Nagkaproblema. Subukan ulit.` |
| Sin conexión | `Walang koneksyon sa internet. Tingnan ang koneksyon mo at subukan ulit.` |
| Confirmar borrado | `Gusto mo bang i-delete ang …? Hindi na ito maibabalik.` + `I-delete` / `Kanselahin` |
| Sin resultados | `Walang resulta` · `Walang resulta para sa “{{busqueda}}”` |
| Estado vacío | `Wala pang …` + una invitación |
| Buscar (placeholder) | `Maghanap…` · `Maghanap ng tao` · `Maghanap ng komunidad` |
| Bienvenida | `Welcome sa Weë` (Microsoft: «Welcome sa…»; Android: «Welcome ulit») |
| Pedir permiso | `Payagan ang Weë na gamitin ang camera.` |
| No hay Credits | `Kulang ang Credits mo.` |
| Denuncia recibida | `Natanggap ang report mo.` (dice que se recibió, nada más) |
| La opción «No sé» | `🤷 Hindi ko alam` — igual en todas las preguntas de Weë AI |

## 11. Glosario

**Una forma por concepto.** Columnas: el concepto (español · clave típica o inglés), la forma filipina y la nota de
uso. «Validar» = sin fuente de producto de primera línea: decide el revisor nativo.

### 11.1 Navegación y menú

| Concepto | Filipino | Nota |
|---|---|---|
| Inicio · Home | **Home** | Android, YouTube; nunca `Tahanan` |
| Buscar (pestaña, acción) | **Maghanap** | Sección o sustantivo: `Paghahanap` [AOSP] |
| Buscar en Weë… | **Maghanap sa Weë…** | |
| Crear (pestaña +) | **Gumawa** | `Lumikha` suena literario |
| Perfil | **profile** | `profile ko`, `profile mo` |
| Perfil Real | **Tunay na profile** | § 6 |
| Perfil Weë | **Weë profile** | § 6 |
| Crear mi perfil Weë | **Gumawa ng Weë profile ko** | |
| Explora (rótulo) | **EXPLORE** | Acción: `I-explore` [AOSP] [FB] |
| Comunidades | **Mga komunidad** | |
| Mis comunidades | **Mga komunidad ko** | |
| Notificaciones | **Mga notification** | `Mga abiso` descartado (Mastodon) |
| Guardados | **Mga naka-save** | |
| Configuración · Ajustes | **Mga setting** | |
| Ayuda | **Tulong** | |
| Preguntas frecuentes | **Mga madalas itanong** | |
| Contacto | **Makipag-ugnayan** | [MS 3.1.2] |
| Mis proyectos | **Mga proyekto ko** | |
| Mis creaciones | **Mga likha ko** | |
| Términos | **Mga tuntunin** | [FB] |
| Privacidad | **Privacy** | Sustantivo; adjetivo `pribado` [FB] [AOSP] |
| Política de privacidad | **Patakaran sa privacy** | [FB] |
| Acerca de Weë | **Tungkol sa Weë** | |
| Ir a {{nombre}} | **Pumunta sa {{nombre}}** | |
| Ir al inicio | **Bumalik sa Home** | |
| Ver todos → | **Tingnan lahat →** | [AOSP] |
| Más (menú ⋯) | **Higit pa** | [YT] |
| Menú | **menu** | `Buksan ang menu` |
| Sección actual | **kasalukuyang seksyon** | |
| Barra de navegación de Weë | **Navigation ng Weë** | Validar |

### 11.2 Acciones (botones)

| Concepto | Filipino | Nota |
|---|---|---|
| Guardar | **I-save** | [AOSP] |
| Cancelar | **Kanselahin** | Android 36 de 36; nunca `I-cancel` |
| Eliminar (destruir) | **I-delete** | Android, YouTube, Facebook; `Burahin` y `Tanggalin` descartados |
| Quitar (de una lista, un adjunto) | **Alisin** | [AOSP] |
| Borrar (un campo de texto) | **I-clear** | [AOSP] |
| Editar | **I-edit** | |
| Cambiar (sustituir) | **Palitan** | `Palitan ang larawan` |
| Cambiar (modificar) | **Baguhin** | `Baguhin ang setting` |
| Compartir | **Ibahagi** | Android, Facebook; nunca `I-share` |
| Copiar | **Kopyahin** | |
| Copiar enlace | **Kopyahin ang link** | |
| Pegar | **I-paste** | |
| Publicar | **I-post** | |
| Enviar | **Ipadala** | |
| Adjuntar | **I-attach** | `Ilakip` suena formal [FB] |
| Grabar | **I-record** | |
| Dictar | **Magsalita** | Botón del micrófono. Validar |
| Reproducir · Pausar · Detener | **I-play** · **I-pause** · **Ihinto** | [AOSP] |
| Subir | **I-upload** | |
| Descargar | **I-download** | |
| Generar | **I-generate** | En la llamada principal, `Gumawa` [GEM] |
| Regenerar | **I-generate ulit** | |
| Crear | **Gumawa** | `Gumawa ng proyekto` |
| Elegir · Seleccionar | **Piliin** (con objeto) · **Pumili ng …** | |
| Aceptar (aviso) | **OK** | [AOSP] |
| Aceptar (solicitud) | **Tanggapin** | |
| Rechazar | **Tanggihan** | |
| Retirar (una solicitud) | **Bawiin** | |
| Confirmar | **Kumpirmahin** | |
| Continuar | **Magpatuloy** | |
| Seguir aquí (no cambiar) | **Dito na lang** | |
| Volver · Atrás | **Bumalik** | |
| Siguiente · Anterior | **Susunod** · **Nakaraan** | |
| Omitir | **Laktawan** | |
| Listo · Hecho | **Tapos na** | |
| Cerrar · Abrir | **Isara** · **Buksan** | |
| Reintentar · Inténtalo de nuevo · Probar otra vez | **Subukan ulit** | |
| Empezar | **Magsimula** | |
| Completar | **Kumpletuhin** | |
| Ver | **Tingnan** | |
| Ver más | **Tingnan pa** | |
| Cargar más | **Mag-load pa** | `Mag-load pa ng mga post` |
| Mostrar · Ocultar | **Ipakita** · **Itago** | |
| Activar · Desactivar | **I-on** · **I-off** | Estado: `Naka-on` / `Naka-off` |
| Permitir · No permitir | **Payagan** · **Huwag payagan** | |
| Agregar · Añadir | **Idagdag** · **Magdagdag ng …** | |
| Unirse | **Sumali** | |
| Salir (de una comunidad) | **Umalis** | |
| Salir (de la app) | **Lumabas** | Cerrar sesión es `Mag-sign out` |
| Cambiar al {{perfil}} | **Lumipat sa {{perfil}}** | |
| Tocar | **I-tap** | Android 114 cadenas |
| Mantener presionado | **Pindutin nang matagal** | `nang` (§ 5.3) |
| Deslizar | **Mag-swipe** | |
| Escribir (placeholder) | **Magsulat ng …** | `Magsulat ng komento…` |
| Describir | **Ilarawan** | |
| Preguntar | **Magtanong** | |
| Responder | **Sumagot** | |
| Comentar | **Magkomento** | Sin guion: `komento` está adaptada |
| Me gusta | **I-like** | |
| Seguir · Dejar de seguir | **I-follow** · **I-unfollow** | [FB] |
| Denunciar | **I-report** | [FB] |
| Bloquear · Desbloquear | **I-block** · **I-unblock** | |
| Silenciar | **I-mute** | |
| Mencionar | **I-mention** | |
| Republicar · Quitar republicación | **I-repost** · **Alisin ang repost** | |
| Votar | **Bumoto** | |
| Recargar (Credits) | **Mag-top up** | |
| Comprar | **Bumili** | `Bumili ng Credits` |
| Avísame | **Abisuhan ako** | |
| Actualizar (refrescar) · Restablecer | **I-refresh** · **I-reset** | |
| Tomar una foto | **Kumuha ng larawan** | [AOSP] |
| Elegir de mis fotos | **Pumili mula sa mga larawan ko** | |
| Recortar | **I-crop** | |
| Traducir | **Isalin** | |

### 11.3 Objetos

| Concepto | Filipino | Nota |
|---|---|---|
| publicación · post | **post** | |
| comentario | **komento** | YouTube; Facebook dice `comment` |
| respuesta (a un comentario o pregunta) | **sagot** | |
| comunidad | **komunidad** | |
| miembro | **miyembro** | |
| mensaje | **mensahe** | |
| conversación · chat | **chat** | `Bagong chat`, `Mga chat` |
| nota de voz | **voice message** | |
| foto · imagen | **larawan** | Android 79, Gemini; `litrato` (Facebook) solo si una pantalla tiene que distinguir la foto de cámara de la imagen generada |
| vídeo | **video** | Nunca `bidyo` |
| voz | **boses** | |
| audio · música | **audio** · **musika** | |
| texto | **text** | Android 51 a 4 frente a `teksto` |
| documento · archivo | **dokumento** · **file** | |
| enlace | **link** | |
| proyecto | **proyekto** | |
| creación | **likha** | |
| prompt | **prompt** | `Kopyahin ang prompt` |
| resultado | **resulta** | |
| plan | **plano** | Salvo el módulo `Business Plan` |
| paso | **hakbang** | `Hakbang {{paso}} sa {{total}}` |
| pregunta | **tanong** | |
| opción | **opsyon** | `Opsyon {{numero}}` |
| ajuste | **setting** | |
| idioma | **wika** | |
| ubicación | **lokasyon** | |
| cuenta | **account** | |
| contraseña | **password** | |
| correo | **email** | |
| nombre | **pangalan** | |
| nombre de usuario | **username** | |
| foto de perfil · portada | **profile picture** · **cover photo** | [FB] |
| biografía · descripción | **bio** · **paglalarawan** | |
| avatar | **avatar** | |
| herramienta | **tool** | `Kailangan mo ba ng AI tool?` |
| especialista | **espesyalista** | |
| experiencia (de Weë AI) | **karanasan** | En la interfaz casi siempre se dice `espesyalista`. Validar |
| plantilla · borrador | **template** · **draft** | |
| versión · estilo · formato | **bersyon** · **istilo** · **format** | |
| calidad | **kalidad** | |
| encuesta · voto | **poll** · **boto** | |
| hashtag · mención | **hashtag** · **mention** | |
| tendencias | **Trending** | |
| seguidor · siguiendo | **follower** · **Naka-follow** | Contador de perfil: `Fina-follow`. Validar |
| vistas · me gusta (número) | **view** · **like** | |
| dispositivo · pantalla | **device** · **screen** | |
| cámara · micrófono · galería | **camera** · **mikropono** · **gallery** | |
| navegador | **browser** | |
| notificación push | **push notification** | |
| historial | **History** | `Tingnan ang history` en una frase |
| datos · información | **data** · **impormasyon** | |
| contenido | **content** | Android 54 a 5 frente a `nilalaman` |
| usuario | **user** | |
| solicitud | **request** | |
| conexión (entre personas) · contactos | **koneksyon** · **mga contact** | |

### 11.4 Estados

| Concepto | Filipino | Nota |
|---|---|---|
| Cargando… | **Naglo-load…** | [AOSP] |
| Guardando… · Guardado | **Sine-save…** · **Na-save** | [AOSP] |
| Subiendo… · Subido | **Ina-upload…** · **Na-upload** | |
| Subiendo {{n}} de {{total}}… | **Ina-upload ang {{n}} sa {{total}}…** | |
| Descargando… · Descargado | **Dina-download…** · **Na-download** | |
| Enviando… · Enviado | **Ipinapadala…** · **Naipadala** | |
| Publicando… · Publicado | **Pino-post…** · **Na-post** | [YT] |
| Creando… | **Ginagawa…** | |
| Procesando… · En proceso | **Pinoproseso…** · **Pinoproseso pa** | [AOSP] |
| Grabando… | **Nire-record…** | [AOSP] |
| Buscando… | **Naghahanap…** | |
| Weë Brain está pensando… | **Nag-iisip ang Weë Brain…** | |
| Calculando el coste… | **Kinakalkula ang halaga…** | |
| Preparando imagen… | **Inihahanda ang larawan…** | |
| Iniciando sesión… | **Nagsa-sign in…** | |
| Listo (estado) · Lista para crear | **Handa na** · **Handa nang gawin** | |
| Faltan respuestas | **Kulang pa ang sagot** | |
| No salió · Falló | **Hindi natuloy** | |
| Cancelada | **Kinansela** | |
| Pendiente | **Nakabinbin** | [AOSP] |
| Reembolsado | **Na-refund** | |
| Copiado | **Nakopya** | [AOSP] |
| Activo | **Aktibo** | `Aktibo ang Weë profile` |
| Nuevo · Próximamente | **Bago** · **Malapit na** | |
| Disponible · No disponible | **Available** · **Hindi available** | Android 54 cadenas |
| Leídas · No leídas | **Nabasa na** · **Hindi pa nabasa** | |
| Sin conexión | **Offline** | |

### 11.5 Errores y confirmaciones

| Concepto | Filipino |
|---|---|
| Error | **Error** |
| Algo salió mal | **Nagkaproblema.** |
| Inténtalo más tarde | **Subukan ulit mamaya.** |
| No se pudo + verbo | **Hindi ma-… ang ….** (`Hindi ma-delete ang post.`) |
| No se pudo conectar con Weë | **Hindi makakonekta sa Weë.** |
| No encontramos esta publicación | **Hindi mahanap ang post na ito.** |
| Ups (título) | **Naku** |
| ¿Quieres …? / ¿Estás seguro? | **Gusto mo bang …?** / **Sigurado ka bang …?** (solo si es irreversible) |
| No se puede deshacer | **Hindi na ito maibabalik.** |
| Campo obligatorio | **Kailangan ito** |
| Inválido | **Hindi wasto** (`Hindi wasto ang email`) |
| Contraseña incorrecta | **Mali ang password** |
| Demasiados intentos | **Masyadong maraming pagsubok** [AOSP] |
| Ya existe | **Mayroon na** (`Mayroon nang account sa email na ito`) |
| No tienes suficientes Credits | **Kulang ang Credits mo** |
| Sin permiso | **Walang pahintulot** |
| Este contenido ya no está disponible | **Hindi na available ang content na ito.** |
| Has enviado muchos reportes | **Masyadong maraming report ang naipadala mo. Subukan ulit mamaya.** |

### 11.6 Social

| Concepto | Filipino | Nota |
|---|---|---|
| {{nombre}} le gustó tu publicación | **Nagustuhan ni {{nombre}} ang post mo** | § 12 |
| {{nombre}} comentó | **Nagkomento si {{nombre}} sa post mo** | |
| {{nombre}} comenzó a seguirte | **Nag-follow sa iyo si {{nombre}}** | |
| {{nombre}} compartió tu publicación | **Ibinahagi ni {{nombre}} ang post mo** | |
| {{nombre}} te mencionó | **Na-mention ka ni {{nombre}}** | |
| {{nombre}} reposteó | **Nag-repost si {{nombre}}** | |
| Público · Privado | **Pampubliko** · **Pribado** | [YT] |
| Destacado · Oficial | **Featured** · **Opisyal** | |
| Visibilidad | **Visibility** | Validar |
| Motivo de denuncia | **dahilan** | `Pumili ng dahilan` |
| Spam | **Spam** | |
| Acoso o intimidación | **Pangha-harass o pambu-bully** | Validar |
| Odio o discriminación | **Poot o diskriminasyon** | |
| Contenido sexual | **Sekswal na content** | |
| Violencia | **Karahasan** | |
| Estafa o fraude | **Scam o panloloko** | |
| Suplantación de identidad | **Pagpapanggap bilang ibang tao** | |
| Contenido ilegal | **Ilegal na content** | |
| Autolesiones o suicidio | **Pananakit sa sarili o pagpapakamatay** | |
| Otro motivo | **Iba pang dahilan** | |
| Reporte recibido | **Natanggap ang report** | |
| Gracias por ayudarnos a mantener Weë seguro | **Salamat sa pagtulong na panatilihing ligtas ang Weë.** | Sin «po» |
| Sé el primero en comentar | **Maging unang magkomento** | |
| Sin votos todavía · Votaste · Encuesta finalizada | **Wala pang boto** · **Bumoto ka** · **Tapos na ang poll** | |

### 11.7 Cuenta, acceso y onboarding

| Concepto | Filipino | Nota |
|---|---|---|
| Iniciar sesión · Cerrar sesión | **Mag-sign in** · **Mag-sign out** | Google; nunca mezclar con `Mag-log in` |
| Toca para iniciar sesión | **I-tap para mag-sign in** | |
| Registrarse | **Mag-sign up** | [FB] |
| Crear cuenta | **Gumawa ng account** | [FB] |
| ¿Olvidaste tu contraseña? | **Nakalimutan ang password?** | [FB] [AOSP] |
| Restablecer la contraseña | **I-reset ang password** | |
| Invitado · Entrar como invitado | **Bisita** · **Pumasok bilang bisita** | [AOSP] |
| Continuar con Google | **Magpatuloy gamit ang Google** | |
| Bienvenido a Weë | **Welcome sa Weë** | [MS 4.1.14] |
| Únete a la comunidad Weë | **Sumali sa komunidad ng Weë** | |
| Fecha de nacimiento · Día · Mes · Año | **Kaarawan** · **Araw** · **Buwan** · **Taon** | |
| Género · Hombre · Mujer · Otro | **Kasarian** · **Lalaki** · **Babae** · **Iba pa** | |
| País | **Bansa** | |
| Opcional | **opsyonal** | `Bio (opsyonal)` |
| Paso {{paso}} de {{total}} | **Hakbang {{paso}} sa {{total}}** | |
| Verificar | **I-verify** | [AOSP] |
| Debes tener al menos 13 años | **Dapat ay hindi bababa sa 13 taong gulang ka para magamit ang Weë.** | La cifra no lleva enlace: `taong` es `taon` + `-ng` ante `gulang` |
| Usuario anónimo · Usuario | **Anonymous na user** · **User** | |

### 11.8 Privacidad y permisos

| Concepto | Filipino |
|---|---|
| permiso | **pahintulot** (Android 82 cadenas) |
| acceso a la cámara | **access sa camera** |
| ubicación aproximada · exacta | **tinatayang lokasyon** · **eksaktong lokasyon** |
| ajustes del dispositivo | **mga setting ng device** |
| Tu ubicación exacta nunca se muestra públicamente | **Hindi kailanman ipinapakita sa publiko ang eksaktong lokasyon mo.** |
| Weë te pedirá permiso cuando lo necesite | **Hihingi ng pahintulot ang Weë kapag kailangan.** |
| Tus datos son tuyos | **Sa iyo ang data mo.** |
| No vendemos tu información | **Hindi namin ibinebenta ang impormasyon mo.** |
| Visible para la comunidad | **Nakikita ng komunidad** |
| Privado hasta que decidas publicarlo | **Pribado hanggang magpasya kang i-post ito** |

### 11.9 Credits

| Concepto | Filipino |
|---|---|
| saldo · Tu saldo · Saldo actual | **balanse** · **Balanse mo** · **Kasalukuyang balanse** |
| Credits disponibles | **Available na Credits** |
| Tienes {{saldo}} Credits | **May {{saldo}} Credits ka** |
| recargar · recarga | **Mag-top up** · **top-up** |
| de prueba | **pansubok** (`Pansubok na top-up`, `pansubok na presyo`) |
| comprar · compra | **Bumili** · **pagbili** (`Pagbili ng Credits`) |
| gratis · sin costo | **Libre** · **Walang bayad** |
| coste · precio | **halaga** (`Halaga: {{coste}}`) · **presyo** |
| historial · Mi billetera | **History** · **Wallet ko** |
| obtenidos · usados | **Natanggap** · **Nagamit** |
| reembolso · reembolsado | **refund** · **Na-refund** |
| Básico · Popular · Mejor valor | **Basic** · **Popular** · **Pinakasulit** |
| Usaste {{credits}} Credits | **Gumamit ka ng {{credits}} Credits** |
| No gastaste Credits | **Wala kang nagastos na Credits** |

### 11.10 Weë AI y creación

| Concepto | Filipino |
|---|---|
| Crear con IA | **Gumawa gamit ang AI** |
| IA | **AI** (nunca `IA`; el nombre entero, `Artificial Intelligence`) |
| ¿Qué quieres crear hoy? | **Ano ang gusto mong likhain ngayon?** |
| Describe tu idea | **Ilarawan ang ideya mo** |
| Cuéntale a Weë lo que quieres. Weë se encarga de la IA. | **Sabihin sa Weë ang gusto mo. Ang Weë na ang bahala sa AI.** |
| Tú eliges el resultado. Weë elige la IA. | **Ikaw ang pipili ng resulta. Ang Weë ang pipili ng AI.** |
| 🤷 No sé · Todavía no lo sé | **🤷 Hindi ko alam** · **Hindi ko pa alam** |
| 🤷 Sorpréndeme | **🤷 Ikaw na ang bahala** |
| Sigue contándome… | **Kuwentuhan mo pa ako…** |
| Buscar en internet | **Maghanap sa internet** |
| Vista previa · demo | **Preview** · **demo** |
| Modo demo: nada que pagar | **Demo mode: walang babayaran.** |
| Se descuentan al terminar. Si algo falla, se devuelven. | **Ibabawas ang Credits pagkatapos. Kung may pumalya, ibabalik ang mga ito.** |
| No me salió bien. No te cobré. | **Hindi ko ito nagawa nang maayos. Hindi kita siningil.** |
| Guardar en un proyecto · Nuevo proyecto · Nombre del proyecto | **I-save sa isang proyekto** · **Bagong proyekto** · **Pangalan ng proyekto** |
| Guardado en {{proyecto}} | **Na-save sa {{proyecto}}** |
| Hazlo más realista · Más llamativo · Más simple | **Gawing mas makatotohanan** · **Mas kapansin-pansin** · **Mas simple** |
| Antes · Después (comparación) | **Dati** · **Pagkatapos** (`Bago` es también «nuevo») |
| Referencia · imagen de referencia | **reference** · **reference na larawan** |
| Ajustes de la creación | **Mga setting ng likha** |
| Herramientas usadas · Proceso | **Mga tool na ginamit** · **Proseso** |
| Creado con | **Ginawa gamit ang** |
| Ver · Ocultar · Copiar prompt | **Tingnan** · **Itago** · **Kopyahin ang prompt** |
| Mantén presionado el texto para copiarlo | **Pindutin nang matagal ang text para kopyahin ito** |
| Los especialistas de Weë | **Mga espesyalista ng Weë** |
| Ir a {{especialista}} | **Pumunta sa {{especialista}}** |
| Marca de agua | **watermark** (`maliit na watermark ng Weë`) |
| Weël de hasta 15 s | **Weël na hanggang 15 segundo** |

### 11.11 Ámbitos

| Ámbito | Español → filipino |
|---|---|
| Weë Studio (ajustes) | formato `Format` · calidad `Kalidad` · resolución `Resolution` · estilo `Istilo` · variaciones `Mga variation` · duración `Tagal` · movimiento `Galaw` · longitud `Haba` · tono `Tono` · tamaño `Laki` · automático `Awtomatiko` · cuadrado `Parisukat` · vertical `Patayo` · horizontal `Pahiga` (Microsoft: «Nakapahiga») · estándar `Standard` · alta `Mataas` · realista `Makatotohanan` · ilustración `Ilustrasyon` · minimalista `Minimalist` · suave `Banayad` · con movimiento `May galaw` · corto / medio / largo `Maikli` / `Katamtaman` / `Mahaba` · neutro `Neutral` · cercano `Magiliw` · profesional `Propesyonal` |
| Weë Studio (cámara) | los nombres de plano del oficio se quedan en inglés, como en la industria filipina: `close-up`, `medium shot`, `wide shot`, `drone shot`, `golden hour`, `rule of thirds`; acercarse / alejarse `Lumapit` / `Lumayo`; voz en off `voice-over`; narración `Narasyon`; subtítulos `Subtitle`. Validar |
| Weë Filmmaker | escena `eksena` · plano `shot` · toma `take` · storyboard `storyboard` · personajes `mga karakter` · vestuario `kasuotan` · línea de diálogo `linya` · dirigir `idirek` |
| Negocio | negocio `negosyo` (la marca Weë Business no cambia) · producto `produkto` · catálogo `katalogo` · cliente `customer` · reseña `review` · valoración `rating` · envío `delivery` · marca `brand` · logo `logo` · llamada a la acción `call to action` |
| Cocina | receta `recipe` · ingrediente `sangkap` · lista de la compra `listahan ng bibilhin` · información nutricional `nutrition facts` · fácil / media / difícil `Madali` / `Katamtaman` / `Mahirap` · cocinero `kusinero` (la marca Weë Chef no cambia). Validar `recipe` frente a `resipe` |
| Viajes y hogar | viaje `biyahe` · itinerario `itinerary` · destino `destinasyon` · presupuesto `budget` · día / noche `araw` / `gabi` (plural con enlace) · vuelo `flight` · habitación `kuwarto` · interiores `interior` |
| Administración (motor) | proveedor `provider` · política `patakaran` · estado `status` · modo de prueba / real `test mode` / `live mode` · sembrar valores por defecto `I-seed ang mga default na value`. Validar |

## 12. Casos difíciles

El orden de la frase cambia: el filipino empieza por el verbo, así que el hueco del nombre casi nunca va al principio.

| Clave (español) | Filipino | Lo que enseña |
|---|---|---|
| `notifications.like` · `{{nombre}} le gustó tu publicación` | `Nagustuhan ni {{nombre}} ang post mo` | Verbo delante; el agente con `ni` (persona) |
| `notifications.follow` · `{{nombre}} comenzó a seguirte` | `Nag-follow sa iyo si {{nombre}}` | Foco en quien actúa: `si` |
| `notifications.econtactRequest` · `{{nombre}} quiere agregarte a ËContact` | `Gusto kang idagdag ni {{nombre}} sa ËContact` | `ka` + enlace = `kang`; la marca con `sa` |
| `notifications.communityPost` · `{{nombre}} publicó en {{comunidad}}` | `Nag-post si {{nombre}} sa {{comunidad}}` | Persona con `si`, comunidad con `sa` |
| `wall.repostedBy` · `{{nombre}} reposteó` | `Nag-repost si {{nombre}}` | Sin objeto: `nag-` |
| `econtact.openProfile` · `Abrir el {{etiqueta}} de {{nombre}}` | `Buksan ang {{etiqueta}} ni {{nombre}}` | Posesivo de persona: `ni {{nombre}}`; de cosa o grupo: `ng {{comunidad}}`. Nunca `ni/ng` |
| `econtact.withdrawConfirm` · `¿Retirar tu solicitud a {{nombre}}?` | `Bawiin ang request mo kay {{nombre}}?` | «A una persona» = `kay` |
| `econtact.removeConfirm` · `¿Eliminar a {{nombre}} de tus {{lista}}?` | `Alisin si {{nombre}} sa {{lista}} mo?` | |
| `econtact.count_one` · `1 {{lista}}` | `_one: {{contador}} {{lista}}` · `_other: {{contador}} na {{lista}}` | § 8.3: el «1» del español no se copia |
| `settings.communitiesJoined_*` | `{{contador}} komunidad na sinalihan` · `{{contador}} na komunidad na sinalihan` | El enlace va tras la cifra, aunque luego haya otro `na` |
| `help.a3_*` · `… Weë AI tiene {{contador}} especialistas: {{lista}}.` | `… May {{contador}} espesyalista ang Weë AI: {{lista}}.` / `… May {{contador}} na espesyalista …` | Con 11 sale `one` (*labing-isang*): bien |
| `common.postsCount_*` · `{{cantidad}} publicación` | `{{cantidad}} post` en las dos | Lo que se ve es `{{cantidad}}` (compacto): sin enlace, iguales |
| `composer.removeMentions_*` | `Huwag nang i-mention` en las dos | La diferencia del español es semántica, no de cifra |
| `weeai.youSpent` · `' Usaste {{credits}} Credits{{nota}}.'` | `' Gumamit ka ng {{credits}} Credits{{nota}}.'` | El espacio del borde se conserva: es una pieza que se pega |
| `menu.switchToProfile` · `Cambiar al {{perfil}}` | `Lumipat sa {{perfil}}` | |
| `wall.deletePostConfirm` · `¿Estás seguro de que quieres eliminar este post?` | `Gusto mo bang i-delete ang post na ito? Hindi na ito maibabalik.` | Confirmación + lo irreversible |
| `settings.locationPermissionDenied` · `Le dijiste que no al sistema. Toca aquí…` | `Tumanggi ka sa system. I-tap dito para baguhin ito sa mga setting ng device mo.` | Error largo: dos frases cortas, verbo delante |
| `weeai.brainBetterFit` · `Para esto te puede ayudar mejor {{emoji}} {{especialista}}…` | `Mas makakatulong sa iyo dito ang {{emoji}} {{especialista}}. Dadalhin kita doon kasama ang mga nasabi mo na, o dito na lang tayo.` | La marca con `ang`; `dito` / `doon`, nunca `rito` / `roon` |
| `notifications.now` · `ahora` | `ngayon` | Lo demás del tiempo relativo lo escribe `Intl` (`3 araw ang nakalipas`, `kahapon`): no se escribe «ang nakalipas» a mano |
| `auth.welcome` · `Bienvenido a Weë` | `Welcome sa Weë` | Sin género |

**El actor sin nombre.** En filipino un nombre lleva `si` / `ni`, que no admiten un sustantivo común (`ni isang tao`
es agramatical; lo correcto es `May nag-like sa post mo`). No se arregla traduciendo «alguien»: la pantalla de
Notificaciones, el push, el reposteo (en la app y en la página pública) y las confirmaciones de ËContact tienen una
frase propia para el actor desconocido (§ 16, decisión 6). Los respaldos quedan para lo que se pinta SOLO, nunca
detrás de `si`/`ni`/`kay`: `common.user` = `User` (la cabecera de un chat, el autor de un comentario; glosario
«Usuario» → «User»), `common.someone` y `publica.alguien` = `Isang user` (el autor sin nombre de la página pública:
«Isang user sa Weë»), y `econtact.somePerson` = `taong ito` («esta persona»), que en filipino solo aparece dentro de
sus frases sin nombre, con el marcador de los sustantivos comunes: `ng taong ito`, `sa taong ito`, `ang taong ito`.

## 13. Lo que no se traduce

Las marcas (§ 6); lo que escribe una persona —publicaciones, comentarios, nombres de comunidades y proyectos,
prompts—; identificadores, rutas, emojis y los valores que viajan al servidor.

## 14. Decisiones donde las fuentes no coinciden

| Tema | Opciones | Elegido | Por qué |
|---|---|---|---|
| Tratamiento | `ka/mo` (Microsoft, Android, Facebook, YouTube, Shopee) / formal (Mozilla) | **`ka / mo / ikaw / iyo`** | Es la voz de todas las apps que la gente usa; Microsoft prohíbe `kayo/inyo` |
| «Po» / «opo» | Sí (cortesía tradicional) / no (Microsoft 5.3, Android 0 de 9.325, Facebook, Shopee) | **No, nunca** | Una red social habla de tú a tú; Microsoft lo descarta por demasiado formal |
| Nivel de Taglish | Facebook (`comment`, `message`) / Android–YouTube / Mastodon (`Hadlangan`, `Mga tagasunod`) | **Android–YouTube** | Lo que un filipino espera ver; ni todo inglés ni filipino de diccionario |
| Plural | Enlace `na` en `other` (CLDR, Android, Microsoft) / `_one` = `_other` sin enlace (tiempo relativo de `Intl`, uso informal) | **Enlace en `_other`** solo cuando `{{contador}}` precede al sustantivo (§ 8.3) | Es gramatical, es lo que hace Google en todos sus plurales y para eso existen las dos categorías; donde la cifra no garantiza la categoría, iguales |
| Número sin plural | `(na)` (Android) / sin enlace / reescribir | **Sin enlace o reescrito** | `(na)` es correcto pero burocrático |
| Mayúscula del préstamo | `I-save` (Microsoft 4.1.5, Android) / `i-Save` (Mozilla) | **`I-save`** | Solo el primer elemento del compuesto |
| Mayúsculas | De frase (Android, Weë) / de título (Facebook, Microsoft si el inglés la lleva) | **De frase** | Weë escribe así en todos los idiomas |
| `-syon` / `-siyon` | `koneksyon`, `bersyon` (Android, Facebook) / `koneksiyon`, `bersiyon` (KWF 5.2, Microsoft «Bersiyong») | **`-syon`** | Es lo que la gente lee a diario; la regla KWF es pedagógica. A confirmar (§ 16) |
| Borrar | `I-delete` (Android 55, YouTube, Facebook) / `Burahin` (24) / `Tanggalin` (Mastodon) | **`I-delete`**; `Alisin` para quitar | Una forma por acción |
| Notificaciones | `Mga notification` (Android, Facebook) / `Mga abiso` | **`Mga notification`** | |
| Foto | `larawan` (Android, Gemini) / `litrato` (Facebook) | **`larawan`** | |
| Comentario | `komento` (YouTube) / `comment` (Facebook) | **`komento`** | Préstamo ya adaptado y entendido por todos |
| Seguir | `I-follow` (Facebook) / `Sundan` (Android en otro sentido, Mastodon) | **`I-follow`** | `sundan` es «seguir un camino» |
| Compartir | `Ibahagi` / `I-share` | **`Ibahagi`** | Android 8 a 1 |
| Iniciar sesión | `Mag-sign in` (Google) / `Mag-log in` (Facebook) | **`Mag-sign in`** + `Mag-sign out` | Pareja del inglés de Weë; nunca se mezclan |
| Reintentar | `Subukan ulit` (Android 44) / `Subukang muli` (14, Microsoft) | **`Subukan ulit`** | Más corriente |
| `din/rin` | Obligatorio (Balarila, Android 46 de 47) / opcional (KWF 8.2) | **Obligatorio** | Coherencia; se puede comprobar |
| `dito` / `rito` | Variante tras vocal (KWF, Microsoft) / `dito` siempre (Android 3 a 1) | **`dito`, `diyan`, `doon` siempre** | Una sola forma |
| Raya larga | Sí / no (Microsoft) | **No** | Coma, punto o paréntesis |
| Comillas | `“…”` / `"…"` | **`“…”`** | Tipográficas, como el resto de guías de Weë |
| Explorar | `I-explore` / `Tuklasin` | **`EXPLORE` / `I-explore`** | Android y Facebook |
| Inicio | `Home` / `Tahanan` | **`Home`** | Android, YouTube |
| «Ups» | `Oops` (Microsoft) / `Naku` | **`Naku`** | Interjección filipina natural |
| Weë Brain | `ang Weë Brain` / `si Weë Brain` | **`ang`** | Es un producto, como `ang Google Assistant`. A confirmar (§ 16) |
| Perfil Real | `Tunay na profile` / `Totoong profile` / `Real profile` | **`Tunay na profile`** | `totoo` es «verdadero» frente a «falso» |

## 15. Lo que vigila la suite

Propuesta para `functions/test/i18n-filipino.test.mjs` (y las deformaciones en `i18n-nombres-propios.test.mjs`). Cada
regla es comprobable por programa sobre el diccionario entero, con su lista cerrada de excepciones y su porqué.

**Catálogo y formatos**

1. `fil` está en `IDIOMAS` con `nombreNativo: 'Filipino'`, de izquierda a derecha, sin variantes; `fil-PH` en
   `LOCALES_CONTEMPLADOS`; el registro lo sirve con su diccionario (y, si se adopta, `tl` y `tl-PH` caen en él).
2. `Intl` con `fil-PH`: `Oktubre 1, 2026` · `1,234,567.89` · `₱1,234.50` · `60%` · `2:30 PM` (12 h) ·
   `3 araw ang nakalipas` · `kahapon` · `A, B, at C`.
3. `Intl.PluralRules('fil')` declara solo `one` y `other`; 0, 1, 2, 3, 5, 15 y 1.5 son `one`; 4, 6, 9, 14, 104 y 1.4
   son `other`.

**Integridad**

4. Mismas claves que el español; ninguna vacía; texto en NFC.
5. Los mismos `{{huecos}}` que el español, con los mismos nombres; ninguno roto; mismos espacios de borde; mismos
   emojis.
6. Ninguna cadena igual a la española ni a la inglesa, salvo la lista de préstamos y marcas que se escriben igual
   (`Home`, `Credits`, `OK`, `Error`, `Email`, `Password`, `Privacy`, `Video`, `Preview`, `Feedback`, `Trending`,
   `Popular`, `Spam`, `Demo`, `Bio`, `Avatar`, `Format`, `Template`, `Draft`, `History`, `Standard`, `Basic`,
   `Minimalist`, `EXPLORE`, `PROFILE`, nombres de módulo…), cada una con su porqué; y la lista no nombra claves que no
   existen.

**Marcas**

7. Cada marca del español sigue, intacta, en su clave filipina (lista oficial leída de `CLAUDE.md` y
   `constants/weeExperiences.ts`).
8. Ninguna marca con afijo o sufijo: falla `\p{L}+-(Weë|Wäll|WeeTalk|ËContact|ẄContact|Credits|Weëls?)` y
   `(Weë|…)(-?ng|’y|’t)\b` (`i-Weë`, `mag-WeeTalk`, `Weëng`, `Weë-ng`).
9. Ningún marcador de persona ante una marca (`(si|ni|kay|sina|nina|kina) (Weë|WeeTalk|…)`) y nunca `mga Weëls` ni
   `mga Credits`.
10. Ninguna experiencia ni moneda traducida: `Weë Musika`, `Weë Paglalakbay`, `Weë Biyahe`, `Weë Negosyo`,
    `Weë Kusina`, `Weë Disenyo`, `Weë Larawan`, `Weë Litrato`, `Weë Manunulat`, `Weë Kagandahan`, `Weë Tahanan`,
    `Weë Utak`, `Weë Studyo`, `Kredito`, `Kredits`, `Credit` sin `s`, y `Wee` sin diéresis como palabra suelta
    (`\bWee\b`; `WeeTalk` es la marca).

**Idioma**

11. Nada de español: ni `[áéíóúÁÉÍÓÚ¿¡]`, ni palabras funcionales españolas sueltas (`el`, `los`, `las`, `del`,
    `que`, `con`, `por`, `está`, `tú`, `usted`, `también`, `puedes`, `quieres`, `tus`, `aquí`, `ahora`, `de`, `en`,
    `es`, `y`, `un`, `muy`). No cuentan `para`, `pero`, `una`, `mas`, `o`, `todo`, que son filipinas.
12. Nada de inglés funcional suelto (`the`, `and`, `of`, `your`, `you`, `with`, `for`, `to`, `is`, `are`, `this`,
    `that`, `please`, `not`, `from`, `will`, `can`, `has`, `have`, `our`, `my`, `it`, `be`, `an`, `by`, `as`, `if`,
    `we`, `all`, `more`, `now`, `here`, `yes`, `new`), salvo dentro de marcas, nombres de módulo y los términos fijos
    del glosario (`My Business`, `World Encode Entity`, `call to action`, `rule of thirds`). No cuentan `in`, `out`,
    `up`, `on`, `off`, que forman `Mag-sign in`, `Mag-top up`, `I-on`.
13. Ningún plural inglés tras `mga` ni suelto en la lista de préstamos: `Mga settings`, `notifications`, `videos`,
    `files`, `apps`, `posts`, `followers`, `users`, `links`.
14. Sin «po»: falla `\b(po|opo|ho|oho)\b`; sin tratamiento de usted: `\b(kayo|ninyo|inyo|inyong|niyo|nyo)\b`
    (excepciones con su porqué si alguna vez se habla a un grupo).
15. Sin el registro de oficina de la lista: `upang`, `ngunit`, `subalit`, `datapwat`, `sapagkat`, `alinsunod`,
    `maaari`, `maaaring`, `pwede`; y los botones (cadena corta sin punto final) no empiezan por `Paki`.

**Gramática comprobable**

16. Guion con préstamos: ninguna raíz inglesa de la lista (`save`, `upload`, `download`, `delete`, `edit`, `post`,
    `share`, `like`, `follow`, `block`, `report`, `mute`, `mention`, `chat`, `attach`, `record`, `generate`, `sign`,
    `tap`, `click`, `swipe`, `paste`, `preview`, `clear`, `update`, `refresh`, `reset`, `load`, `crop`, `play`,
    `pause`, `verify`, `explore`, `email`), entera y acabada en límite de palabra, aparece con una letra pegada
    delante dentro de la misma palabra (`isave`, `nagdownload`, `naupload`, `nagdadownload`), salvo las palabras
    inglesas enteras de la lista (`upload`, `download`, `reload`, `repost`, `unblock`, `unfollow`, `unlike`,
    `unmute`, `regenerate`, `design` —por `Weë Design`—, `display`, `replay`). `log` no entra: lo llevan `blog` y
    `Products & Catalog`.
17. Mayúscula del préstamo: falla `\bI-[A-Z]` (`I-Save`) salvo en los rótulos que van enteros en mayúsculas
    (`I-POST SA`), y ningún botón ni título empieza por `i-` minúscula.
18. `din/rin`, `daw/raw` (y `ding/ring`) según el sonido anterior: vocal o `w`/`y` → `r`; consonante → `d`; palabras
    acabadas en `ri`, `ra`, `raw`, `ray` → `d`; préstamos ingleses con `-e` muda de la lista (`save`, `delete`,
    `profile`, `like`, `file`, `update`, `share`, `type`, `code`, `page`, `online`) cuentan como consonante. Ninguno
    justo detrás de un `{{hueco}}`.
19. `dito`, `diyan`, `doon`: falla `\b(rito|riyan|roon)\b`.
20. `ng` / `nang`: (a) un verbo repetido lleva `nang` (`(\p{L}+) ng \1` falla); (b) `ng` ante un adverbio de modo de
    la lista (`maayos`, `mabilis`, `mabagal`, `tama`, `malinaw`, `libre`, `sabay`, `ligtas`, `matagal`, `madali`,
    `husto`, `todo`) falla si no lo sigue `na` (adjetivo de un sustantivo); (c) `nang` ante `ang`, `ng`, `sa` o `mga`
    falla, salvo la locución `nang sa gayon` (que Weë, de todos modos, escribe `para`).
21. Sin alternativas con barra o paréntesis: `ni/ng`, `siya/sila`, `(mga)`, `(na)`.

**Plural**

22. Solo `_one` y `_other`, los dos presentes; ninguno escribe `1`, `isa` ni `isang` a mano; ninguno lleva `mga`
    detrás de una cifra (`\{\{\w+\}\}\s+(na\s+)?mga\b`).
23. Regla del enlace: si en `_one` `{{contador}}` va seguido de una palabra o de un `{{hueco}}` que no es partícula
    (`pa`, `na`, `lang`,
    `lamang`, `sa`, `ng`, `ang`, `o`, `at`, `ay`), símbolo ni abreviatura (`s`, `seg.`, `min.`, `MB`, `GB`, `km`,
    `%`), `_other` es exactamente `_one` con `na ` insertado tras `{{contador}}`; en cualquier otro caso, `_one` ===
    `_other`.
24. En las claves sin plural, ningún `{{hueco}} na <palabra>` cuando el hueco es un número.

**Puntuación y formato**

25. `…` y no `...`; comillas `“…”` / `‘…’`, nunca `«»`, `„“` ni la recta `"` dentro del texto; apóstrofo `’`, nunca
    `'`; sin raya larga `—`; `%` pegado (`{{x}} %` falla); ni `¿` ni `¡`.
26. Contracciones con apóstrofo solo en la lista cerrada (`iba’t iba`, `isa’t isa`): `’y` y `’t` fuera de ella fallan.
27. Mayúscula de frase: en una cadena sin puntuación de frase, ninguna palabra después de la primera empieza en
    mayúscula salvo marcas, siglas, nombres propios de la lista (`Google`, `Filipino`, meses y días), `Tunay` en
    `Tunay na profile`, y las que el español también escribe con mayúscula en esa clave (nombres de sección como
    `Mga naka-save`). `Mga Setting` falla.
28. Nada de formatos a mano: ni `₱{{` ni `PHP {{`, ni `AM`/`PM`, `n.u.`, `n.h.`, ni nombres de mes donde el español
    no los tiene.

**Coherencia del glosario**

29. Las claves comunes dicen lo que dice el glosario: `common.cancel` = `Kanselahin`, `common.save` = `I-save`,
    `common.delete` = `I-delete`, `common.share` = `Ibahagi`, `common.retry` = `Subukan ulit`, `common.loading` =
    `Naglo-load…`, `common.somethingWentWrong` = `Nagkaproblema`, `menu.settings` = `Mga setting`, `menu.signIn` =
    `Mag-sign in`, `menu.signOut` = `Mag-sign out`; y no aparecen sus alternativas descartadas (`I-cancel`, `Burahin`,
    `Tanggalin` como borrar, `I-share`, `Subukang muli`, `Mag-log in`, `Mag-login`, `Mga abiso`, `IA`).
30. Cada `🤷 No sé` del español es `🤷 Hindi ko alam`; cada `🤷 Sorpréndeme`, `🤷 Ikaw na ang bahala`.

## 16. Cómo se revisa y lo pendiente

1. **Durante la traducción**, un validador de trabajo por módulo con las reglas del § 15 que ya se puedan aplicar
   (huecos, marcas, «po», guion, `din/rin`, plural, puntuación).
2. **Dos revisiones independientes** del diccionario entero: **exactitud** (sentido frente al español, gramática,
   foco verbal, aspecto, `ng/nang`) y **naturalidad** (¿lo escribiría así un equipo de producto filipino?, ¿usa el
   glosario?, ¿cabe?).
3. `functions/test/i18n-filipino.test.mjs` y las deformaciones en `i18n-nombres-propios.test.mjs`, en la cadena de
   `npm test`.
4. **Capturas** en `fil-PH`, `es-ES` y `en-US` lado a lado, a 390 × 844 y 1440 × 900.
5. **Revisión humana nativa** antes de abrirlo a gente, con el procedimiento de [`I18N-REVISION.md`](I18N-REVISION.md);
   la de un agente de IA nunca cuenta como humana.

**Decisiones cerradas para la implementación (2026-10-02).** Se aplican en todo el diccionario y la suite vigila que
no se mezclen. Ninguna es una decisión de marca nueva: cada una sale de la evidencia de esta guía o de lo que el
repositorio ya hace en los demás idiomas; cualquiera se puede cambiar en bloque si el dueño lo pide.

1. **Enlace `na` en `_other`** cuando `{{contador}}` va delante del sustantivo (§ 8.3): es la gramática que codifican
   las dos categorías de CLDR, y lo hacen Android y Microsoft.
2. **Nivel de Taglish del § 4**: `komento`, `mensahe`, `larawan`, `Ibahagi` en filipino; `I-like`, `I-follow`,
   `I-block`, `I-report`, `I-save`, `I-delete` con préstamo y guion.
3. **`-syon`** (`bersyon`, `opsyon`, `lokasyon`): lo que la gente lee a diario en Android y Facebook.
4. **Weë Brain con `ang`**, nunca `si`/`ni`: es la regla general de las marcas de Weë en esta guía (§ 6), que son
   productos, no personas.
5. **`Tunay na profile`**: el repositorio ya traduce «Perfil Real» en los demás idiomas (en «Real profile», da «Ægte
   profil»); `Weë profile` conserva la marca.
6. **El actor sin nombre**: `notifications.<clave>SinNombre` (`likeSinNombre`, `commentSinNombre`…), una frase propia para cuando no se sabe quién hizo algo
   (`May nag-like sa post mo.`). En los demás idiomas es la MISMA frase que ya se ve hoy (con su `{{nombre}}` y el
   «Alguien» de siempre), así que allí no cambia nada; en filipino evita `si`/`ni` delante de un sustantivo común.
   El push hace lo mismo con `avisos.<clave>SinNombre` (servidor): «May nag-like sa post mo», y el de un mensaje de
   WeeTalk sin nombre lleva «Bagong mensahe» de título y, si no trae palabras, «May nagpadala sa iyo ng mensahe». Lo
   vigila `functions/test/push-sin-nombre.test.mjs`. Y el reposteo sin nombre —`wall.repostedBySinNombre` en la app,
   `publica.reposteoSinNombre` en la página pública— es «May nag-repost»; las confirmaciones de ËContact sin nombre
   (`econtact.rejectConfirmSinNombre`, `withdrawConfirmSinNombre`, `removeConfirmSinNombre`) usan «taong ito» con
   `ng`/`sa`/`ang`, igual que las etiquetas del lector de pantalla de la agenda (`econtact.acceptSinNombre`,
   `rejectSinNombre`, `withdrawSinNombre`, `removeFromSinNombre`, `openProfileSinNombre`), que sin nombre acababan en
   «…ni », y compartir el perfil de alguien sin nombre (`profile.shareOtherMessageSinNombre`: «Tingnan ang profile na
   ito sa Weë!»). Lo vigila `functions/test/respaldo-sin-nombre.test.mjs`.
7. **Alias `tl` / `tl-PH` → `fil`** en la resolución del idioma del teléfono (CLDR los trata como el mismo idioma):
   sin ellos, un teléfono que dice `tl-PH` caería en inglés.
8. **`Mag-sign in` / `Mag-sign out`**: la pareja del inglés de Weë («Sign in»/«Sign out»).

Sigue pendiente, como en todos los idiomas de Weë, la **revisión humana nativa** antes de abrirlo a gente (punto 5 de
arriba): la de un agente nunca cuenta como humana.

### 16.1 Lo que fijó la revisión nativa (2026-10-03)

Cinco revisores independientes (agentes de IA; **no** cuenta como revisión humana) leyeron el diccionario entero con
dos lentes —exactitud frente al español y naturalidad para Filipinas— y fijaron, por coherencia:

- **Segundos y minutos tras una cifra**: «seg.» y «min.», la forma corta que escribe `Intl` en filipino, en todas
  partes («5 seg.», «Pahabain nang 2 seg.»). La palabra entera solo donde el español también la escribe entera.
- **Contadores en fila**: etiqueta y cifra, «Mga post: {{cantidad}}», «Mga miyembro: {{cantidad}}» (una fila, un molde).
- **Rótulos de sección**: palabra filipina donde el glosario la da («MGA KAGUSTUHAN», «MGA NOTIFICATION»,
  «IMPORMASYON») y préstamo donde el glosario lo fija («CONTENT», «PRIVACY», «ACCOUNT»), como Android en filipino.
- **«black and white»** para las fotos en blanco y negro (término fijo; nunca «itim at puti»).
- **Estados**: trabajo terminado «Tapos na»; recurso listo «Handa na»; «muy pronto» «Malapit na».
- **Vocabulario de cine y foto en inglés y uniforme** en Weë Studio y Weë Filmmaker (shot, take, storyboard, timeline,
  aspect ratio, wide shot, close-up, pan, tilt…); en filipino: eksena, produksyon, karakter, kasuotan, diyalogo, tunog.
- **Las palabras que se escriben igual que en inglés o en español** —cada una con su motivo (marca, término del sector o
  préstamo asentado)— están en la regla 6 de `functions/test/i18n-filipino.test.mjs`: es la lista decidida.
- Lo que solo puede resolver una persona nativa quedó apuntado por los revisores (p. ej. «Welcome sa Weë», «maaliwalas»
  por «acogedor», «Kaloriya»/«Calories», «Itinatampok»/«Featured»): entra en la revisión humana de
  [`I18N-REVISION.md`](I18N-REVISION.md), junto con el registro `i18n/revision/fil/registro.json` (3 749 textos
  marcados como revisión de agente).

## Fuentes

Consultadas el 2026-10-01. Las URL de KWF en `kwf.gov.ph` (`Ortograpiyang_Pambansa_1.pdf`, `MMP_Full.pdf`), la ayuda
de GCash (`help.gcash.com`) y Canva en filipino (`canva.com/fil_ph`) respondieron 403 y **no se pudieron leer**; la
Ortograpiyang Pambansa 2013 se cita a través del Manual de la KWF de 2014, que la desarrolla. Instagram, TikTok y
Lazada en filipino no se consultaron.

- **[MS]** Microsoft, *Filipino Localization Style Guide* (PDF del 2025-04-11), enlazada desde
  https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides (https://aka.ms/filipino-styleguide)
  — https://download.microsoft.com/download/25b05cb0-c8ad-41f0-be2e-30335c6ceb6a/fil-fil-StyleGuide.pdf
  (§§ 3.1, 3.1.2, 3.1.3, 3.2.1, 4.1.1, 4.1.4, 4.1.5, 4.1.6, 4.1.7, 4.1.8, 4.1.9, 4.1.12, 4.1.13, 4.1.14, 4.1.15,
  4.1.16, 4.1.17, 4.1.20, 5.3, 5.4, 5.5.2)
- **[KWF-MMP]** Komisyon sa Wikang Filipino, *KWF Manwal sa Masinop na Pagsulat* (2014), texto completo en Internet
  Archive — https://archive.org/details/mmp-full (https://archive.org/download/mmp-full/MMP_Full_djvu.txt)
  (§§ 4.4, 4.6, 4.7, 4.9, 5.2, 8.1, 8.2, 9.1, 9.2, 11.1, 11.3, 11.5, 11.8)
- **[MOZ]** Mozilla, Tagalog (tl) style guide — https://mozilla-l10n.github.io/styleguides/tl/
- **[AOSP]** Android, `values-tl/strings.xml` de la rama `main`, emparejado clave a clave con `values/` y
  `values-es/` (9.325 cadenas): núcleo
  https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/core/res/res/values-tl/strings.xml ,
  Settings https://android.googlesource.com/platform/packages/apps/Settings/+/refs/heads/main/res/values-tl/strings.xml ,
  SystemUI https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/packages/SystemUI/res/values-tl/strings.xml ,
  DocumentsUI https://android.googlesource.com/platform/packages/apps/DocumentsUI/+/refs/heads/main/res/values-tl/strings.xml
- **[CLDR]** CLDR 48, reglas de plural —
  https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/supplemental/plurals.xml ; cuadro con ejemplos
  (`3 mansanas` / `4 na mansanas`) — https://www.unicode.org/cldr/charts/48/supplemental/language_plural_rules.html
- **[Node]** Node v24.19.0, ICU 78.3, CLDR 48.0, Unicode 17.0 (ejecución local de `Intl` con `fil-PH`)
- **[FB]** Facebook en filipino — https://tl-ph.facebook.com/ ; ayuda: https://tl-ph.facebook.com/help/168009843260943 ,
  https://tl-ph.facebook.com/help/1380418588640631
- **[YT]** Ayuda de YouTube en filipino — https://support.google.com/youtube/answer/6000976?hl=fil
- **[GEM]** Ayuda de Gemini en filipino — https://support.google.com/gemini/answer/14286560?hl=fil
- **[G-ACC]** Ayuda de Google en filipino — https://support.google.com/accounts/answer/32050?hl=fil
- **[SHOPEE]** Ayuda de Shopee Filipinas, artículo en tagalo —
  https://help.shopee.ph/4/article/135970-[New-to-Shopee]-How-do-I-change-the-language-settings-in-the-Shopee-App-(TAG)
- **[MASTO]** Catálogo comunitario de Mastodon en filipino (382 de 1.593 claves; ejemplo del filipino purista que se
  descarta) — https://raw.githubusercontent.com/mastodon/mastodon/main/app/javascript/mastodon/locales/fil.json
- **[Medición]** Longitudes de las cadenas de Android en inglés, español y filipino (núcleo y Settings, 6.886 pares),
  ejecución local
- Bluesky no tiene catálogo en filipino (lista de `src/locale/locales` en su repositorio).
