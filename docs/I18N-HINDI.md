# I18N-HINDI — el hindi de Weë (`hi` / `hi-IN`)

> Guía de estilo y glosario para quien escriba, revise o amplíe el hindi de Weë: hoy y cuando lleguen módulos nuevos
> (Filmmaker, 3D, Weë Music, Weë Travel, Weë Inspira…). La arquitectura común está en [`I18N.md`](I18N.md); aquí solo
> lo que es del hindi. Las decisiones se tomaron con fuentes (lista al final) y, donde las fuentes no coinciden, dicen
> qué se eligió, qué se descartó y por qué.
>
> Lo que esta guía pide y se puede comprobar lo comprueba `functions/test/i18n-hindi.test.mjs`. Lo que no se puede
> comprobar con una prueba —naturalidad, tono, contexto— es trabajo de quien escribe y de quien revisa, y en hindi pide
> además **un revisor nativo** antes de abrirlo a gente (§ 15).

## 0. Lo esencial

1. **No se traduce del español palabra a palabra.** Se entiende qué hace la cadena y se escribe lo que escribiría un
   equipo de producto indio: frases cortas, palabras de todos los días, nada de hindi de oficina. [MS-hi § 2.1]
2. **«आप», siempre.** El «tú» del español **no** es «तुम». Botones en imperativo de cortesía: `सेव करें`,
   `रद्द करें`, `शेयर करें`. Nunca `करो`, `तुम`, `तू`, ni el ceremonioso `कीजिए` en un botón. [MOZ] [MS-hi] [AOSP]
3. **Ni libresco ni hinglish improvisado.** Palabra hindi corriente cuando es la que usan Android y las redes
   (`खोजें`, `भेजें`, `रद्द करें`); préstamo en devanagari cuando es lo que usan (`फ़ोटो`, `प्रोफ़ाइल`); verbo inglés +
   `करें` cuando es lo que usan (`शेयर करें`, `सेव करें`); alfabeto latino **solo** para marcas y siglas (`Weë`,
   `AI`, `MB`). § 3.
4. **Punto «.» al final de la frase**, no «।». Es lo que hacen Android, WhatsApp, Instagram y Microsoft, lo que la
   gente lee cada día. Nunca se mezclan. § 7.
5. **Nukta en फ़ y ज़** (`फ़ोटो`, `ज़रूरी`), **nunca en क ख ग**; **chandrabindu** donde la norma lo pide (`हाँ`,
   `जाएँ`, `टिप्पणियाँ`) y anusvara cuando una matra ya ocupa la parte de arriba (`में`, `नहीं`, `करें`). Todo en
   NFC: la nukta se escribe letra base + U+093C, jamás con los caracteres precompuestos U+0958–U+095F. § 4.
6. **El hindi tiene género y Weë no sabe el de nadie.** Ni el de quien usa la app ni el de `{{nombre}}`: imperativo,
   ergativo con `ने`, pasiva o «क्या आपको … है?». Nunca `सकता/सकती`. § 5.
7. **Las marcas de Weë, intactas y en latino**, con la posposición separada: `Weë पर`, `WeeTalk में`,
   `Weë की शर्तें`. Nunca transliteradas (`वी`, `क्रेडिट्स`). § 6.
8. **Cifras latinas y formatos de `Intl`** (`12,34,567`, `₹1,500.00`, `2:05 pm`). El plural `_one` sirve para el 0 y
   el 1: lleva `{{contador}}`, nunca «1» ni «एक». § 8.
9. **Consistencia:** un concepto, una palabra, la del glosario (§ 11).

## 1. Idioma, locale y lo que ya resuelve la arquitectura

| | |
|---|---|
| Idioma | `hi`, diccionario en `i18n/textos/hi/` |
| Locale principal | `hi-IN` (en `LOCALES_CONTEMPLADOS`) |
| Nombre en el selector | **`हिन्दी`** — el que da CLDR (`Intl.DisplayNames('hi').of('hi')`) y el que enseñan todos los selectores de idioma consultados (Meta, Microsoft, Canva). En el texto corrido, `हिंदी` (§ 4.3) [CLDR] [WA] [IG] [FB] [MS-ACC] [CANVA] |
| Variantes | Ninguna. Un aparato en `hi-Latn` (hindi escrito en latino, que ICU 78 ya conoce) recibe el hindi en devanagari: la persona eligió hindi, y Weë no tiene un diccionario en latino (§ 15) |
| Respaldo | `hi-IN` → `hi` → `en`, clave a clave |
| Plural | `Intl.PluralRules('hi')`: `one` (**0 y 1**, y decimales menores que 1) y `other` [CLDR] [Node] |
| Formatos | `Intl` con el locale: `30 सितंबर 2026`, `30/9/26`, `2:05 pm`, `12,34,567.89`, `₹1,500.00`, `60%`, `3 दिन पहले`, `कल`, `A, B, और C`, `1.3 लाख` [Node] |
| Web | `<html lang="hi">`, lo escribe `IdiomaContext` |
| Pantalla de error | Su fila `hi` en `components/ErrorBoundary.tsx` |
| Fuente | Inter no tiene devanagari: el hindi sale en la fuente del sistema (§ 9) [GFONTS] |

**Los formatos no se escriben a mano**: salen de `i18n/formato.ts`. El signo menos es el guion normal (`-5`, U+002D) y
CLDR usa el **signo de abreviatura devanagari «॰» (U+0970)** en `सित॰`, `कि॰मी॰`, `क॰`: no es un punto y no se
«corrige». [Node]

## 2. Tono y registro

**«आप» en toda la interfaz**, también en errores y avisos. Lo hacen Google (todo Android), Meta, Apple, Microsoft y
Spotify; Mozilla lo pide y considera groseros los imperativos en -ओ (`फिर ढूँढो` está mal, `फिर ढूँढें` bien).
`तुम` solo aparece en lemas publicitarios y en los prompts de ejemplo de Gemini (el usuario hablándole a la IA); `तू`,
en ninguna parte. [MOZ] [MS-hi § 2.2] [AOSP] [APPLE] [IG] [SPOT] [G-GEM]

| Tipo de cadena | Forma | Ejemplo |
|---|---|---|
| Botón, acción de menú | Imperativo de आप (-एँ / -ें), sin punto | `सेव करें`, `रद्द करें`, `पोस्ट करें`, `लिंक कॉपी करें` |
| Título de pantalla o sección | Sustantivo o sintagma, sin punto | `सेटिंग`, `सूचनाएँ`, `ब्लॉक किए गए लोग` |
| Instrucción | «Para X, Y»: `…ने के लिए,` + imperativo | `फ़ोटो बदलने के लिए, “प्रोफ़ाइल एडिट करें” पर टैप करें.` |
| Mensaje informativo | Frase corta con punto | `बदलाव सेव हो गए.` |
| Error | Qué pasó (pasiva o impersonal) + qué hacer; sin culpar y sin que «hable» el sistema | `फ़ाइल अपलोड नहीं की जा सकी. फिर से कोशिश करें.` |
| Confirmación | «क्या आपको … है?» y, si no se puede deshacer, lo dice | `क्या आपको यह पोस्ट मिटानी है? इसे वापस नहीं लाया जा सकेगा.` |
| Estado vacío | «अभी तक कोई … नहीं है.» + una invitación | `अभी तक कोई पोस्ट नहीं है.` · `अपनी पहली पोस्ट शेयर करें.` |
| Éxito | Corto, participio | `कॉपी किया गया`, `सेव हो गया` |
| Etiqueta del lector de pantalla | Qué es o qué hace, sin `बटन` detrás | `मेन्यू खोलें` |
| Weë Brain, conversación | Cercano y breve, आप; preguntas neutras en género | `आपको कहाँ घूमने जाना है?` |

- **Palabras de todos los días, no de oficina** [MS-hi § 2.1.1]: `चुनें` (no `चयन करें`), `बदलें` (no
  `परिवर्तित करें`), `देखें` (no `संदर्भ लें`), `इसलिए` (no `अतः`), `साथ ही` (no `इसके अतिरिक्त`),
  `फिर से कोशिश करें` (no `पुनः प्रयास करें`). En la misma línea, Weë dice `मदद` y no `सहायता` (§ 11) y prefiere
  `इस्तेमाल` a `उपयोग` (Android usa las dos, `इस्तेमाल` más del triple) [AOSP].
- **Reflexivo con आप** [MS-hi § 4.1.11]: `अपना पासवर्ड डालें`, `अपनी पहली पोस्ट`, nunca «आप आपका…».
- **`कृपया` solo cuando se pide algo que molesta** (esperar, repetir tras un fallo nuestro): Android lo usa en 24 de
  9 370 cadenas. [AOSP]
- **Sin disculpas de relleno.** Un error dice qué pasó y qué hacer. [MS-hi § 5.4.2] [AOSP]
- **Presente, no futuro**, salvo lo que de verdad va a pasar. [MS-hi § 4.1.14]
- **Weë Brain habla en primera persona** (es la voz de la marca, como en español), pero con construcciones sin género:
  `मैंने आपसे…`, `आपके Credits नहीं काटे गए.` Los errores del sistema, en pasiva. § 5.

## 3. Hindi, inglés o las dos: cuatro categorías

Cada fila del glosario lleva su categoría:

| Cat. | Qué es | Ejemplos |
|---|---|---|
| **(a)** | Palabra hindi (también las persas o árabes ya asimiladas) | `रद्द करें`, `खोजें`, `भेजें`, `मिटाएँ`, `सूचनाएँ`, `खाता`, `भाषा`, `निजता`, `मदद`, `टिप्पणी`, `झलक`, `नतीजा` |
| **(b)** | Préstamo inglés escrito en devanagari | `प्रोफ़ाइल`, `फ़ाइल`, `फ़ोटो`, `वीडियो`, `इमेज`, `पासवर्ड`, `ईमेल`, `सेटिंग`, `पोस्ट`, `चैट`, `लिंक`, `टेंप्लेट`, `प्रॉम्प्ट` |
| **(c)** | Inglés en alfabeto latino | Solo marcas y siglas: `Weë`, `Credits`, `WeeTalk`, `AI`, `MB`, `GB`, `PDF`, `JPG`, `PNG`, `WEBP` |
| **(d)** | Híbrido: palabra inglesa + verbo ligero hindi | `शेयर करें`, `सेव करें`, `कॉपी करें`, `एडिट करें`, `डाउनलोड करें`, `अपलोड करें`, `साइन इन करें`, `रिपोर्ट करें`, `ब्लॉक करें`, `फ़ॉलो करें`, `जनरेट करें` |

**Cómo se decide un término nuevo** (el mismo razonamiento que dio el glosario):

1. ¿Qué dice **Android en hindi** (AOSP)? Si es una palabra corriente, esa. Android es la interfaz que todo usuario
   de hindi ve todos los días. [AOSP]
2. Si el concepto es de **red social o de creación** y Android no lo tiene, lo que dicen Meta (Instagram, WhatsApp,
   Facebook), YouTube o las herramientas creativas (Gemini, Canva). [IG] [WA] [G-YT] [G-GEM] [CANVA]
3. **Descartado siempre**: el hindi libresco o sánscrito (`अवरुद्ध करें`, `अधिसूचनाएँ`, `पुनः प्रयास करें`,
   `छवि`, que usa el catálogo comunitario de Bluesky) y el hinglish improvisado (inglés en latino dentro de la frase,
   plural inglés en -्स —`वीडियोस`, `फ़ॉलोअर्स`—, préstamos sin nukta —`फेवरेट`—, como en fichas de ShareChat o
   Mastodon). [BSKY] [MASTO] [PLAY-IN]
4. El plural lo pone la gramática hindi, no el inglés: `सेटिंग`, `फ़ॉलोअर`, `फ़ाइलें`, `टिप्पणियाँ`. [AOSP] [SPOT]

## 4. Escritura

### 4.1 Unicode: NFC y nukta

- **La nukta se escribe letra base + U+093C** (`फ़` = फ + ़, `ज़` = ज + ़, `ड़` = ड + ़). Los caracteres
  precompuestos U+0958–U+095F (क़ ख़ ग़ ज़ ड़ ढ़ फ़ य़) son **exclusiones de composición**: NFC los deshace en base +
  U+093C, así que un texto que los lleve **no está en NFC** y la prueba `24d` (`i18n.test.mjs`) lo rechaza. Es al
  revés que en latino, donde NFC compone la «ë». [UCD-CE] [Node]
- Android no lleva ni uno precompuesto; `Intl` tampoco (`फ़रवरी`, `हज़ार`, `करोड़` salen descompuestos). [AOSP]
  [Node]
- **Nunca ZWJ (U+200D) ni ZWNJ (U+200C) en el texto.** Sirven para forzar medias formas tipográficas; en una
  interfaz solo estorban: Android escribe `उपलब्ध` 11 veces con un ZWJ tras el virama y 141 sin él, y con ZWJ un
  `includes()` no encuentra la palabra. (Aquí no se copia el ejemplo con ZWJ a propósito: se vería igual.) La única
  excepción no es texto: un **emoji compuesto** («👨‍🍳» son tres caracteres unidos por un ZWJ) se copia tal cual del
  español, y la prueba exige los mismos emojis. [UNI-ch12] [AOSP] [Node]
- **Matras bien codificadas**: `ो` es U+094B, no `ा` + `े` (U+093E U+0947), aunque se vean iguales. Android escribe
  así, mal, `कोई` y `प्रोफ़ाइल` en algunas cadenas, y ni NFC ni la comparación del buscador lo arreglan. Igual `ौ`
  (U+094C), no `ा` + `ै`. Ante la duda, se escribe la palabra con el teclado, no se copia de una web. [AOSP] [Node]

### 4.2 Nukta: फ़ y ज़ sí, क़ ख़ ग़ no

| Caso | Regla | Ejemplos |
|---|---|---|
| /f/ y /z/ de préstamos (inglés, persa, árabe) | **Siempre con nukta** | `फ़ोटो`, `फ़ाइल`, `प्रोफ़ाइल`, `ड्राफ़्ट`, `फ़िल्टर`, `फ़ॉलो`, `मुफ़्त`, `ज़रूरी`, `ज़्यादा`, `इंतज़ार`, `आवाज़`, `मंज़िल`, `दस्तावेज़`, `बिज़नेस`, `डिज़ाइन`, `ब्राउज़र` |
| फ y ज propias del hindi (/pʰ/, /dʒ/) | **Sin nukta** | `फिर से`, `फल`, `जगह`, `जानकारी`, `जोड़ें`, `जारी रखें` |
| क़ ख़ ग़ | **Nunca**: se escriben sin punto | `खास`, `खबर`, `गलत`, `तरीका`, `कलम` |
| ड़ ढ़ | **Siempre**: son letras del hindi, no préstamos | `पढ़ें`, `बढ़ें`, `जोड़ें`, `छोड़ें`, `गड़बड़ी`, `बड़ा`, `थोड़ा` |
| य़ ऩ ऱ ऴ | Nunca en hindi | — |

**Por qué.** Google (Android: 481 फ़ y 218 ज़ en el núcleo, 0 क़ ख़ ग़), Meta, Apple y Spotify escriben así; la salida
de `Intl` lleva nukta (`फ़रवरी`, `हज़ार`, `अंग्रेज़ी`), y un `फरवरी` a mano junto a un `फ़रवरी` de `Intl` en la misma
pantalla sería incoherente; Microsoft pide no ponerla en क ख ग; el CHD no la exige en las palabras del urdu ya
asimiladas. [AOSP] [IG] [APPLE] [SPOT] [Node] [MS-hi § 4.1.12] [CHD § 3.15.1]

### 4.3 Anusvara (ं) y chandrabindu (ँ): la norma del CHD

| Caso | Se escribe | Ejemplos |
|---|---|---|
| Nasal (ङ ञ ण न म) + consonante **de su misma serie** | **ं** | `संपर्क`, `हिंदी`, `कंप्यूटर`, `टेंप्लेट`, `अंक`, `संबंध`, `सितंबर` (así lo escribe `Intl`) |
| Nasal + consonante de otra serie, o nasal doble | La media nasal | `अन्य`, `जन्म`, `कम्यूनिटी`, `सम्मान` |
| Vocal nasal sin matra por encima de la línea | **ँ** | `हाँ`, `यहाँ`, `वहाँ`, `कहाँ`, `हूँ`, `पहुँचें`, `जाएँ`, `बनाएँ`, `दिखाएँ`, `मिटाएँ`, `हटाएँ`, `चिपकाएँ`, `सुविधाएँ`, `भाषाएँ`, `सूचनाएँ`, `टिप्पणियाँ` |
| Vocal nasal **con matra por encima** (ि ी े ै ो ौ) | **ं** (no cabe el ँ) | `में`, `नहीं`, `हैं`, `मैं`, `करें`, `चुनें`, `खोजें`, `फ़ाइलें`, `क्यों` |

- Es la norma del Directorio Central de Hindi (edición 2024), que declara el chandrabindu obligatorio donde
  corresponde y llama confusión a escribir anusvara en su lugar; la aplican Microsoft (que lo pide con `जाएँ` y
  `दिखाएँ` de ejemplo), Meta (`बनाएँ`, `ढूँढें`, `दिखाएँ`, `पाएँ`), Apple (`सूचनाएँ`, `जाँच`), Spotify y Gemini.
  Android y la mayoría de la ayuda de Google escriben solo anusvara (`जाएं`, `हां`); Weë sigue la norma. [CHD § 3.6.2,
  § 3.7] [MS-hi § 4.1.12] [IG] [FB] [APPLE] [SPOT] [G-GEM] [AOSP]
- **Excepción única: el nombre del idioma en el selector**, `हिन्दी`, porque es el nombre que da CLDR y el que la
  persona ve en todos los selectores de idioma. En cualquier frase, `हिंदी`. [CLDR] [WA] [IG] [FB]

### 4.4 Préstamos: ऑ, ऐ, vocales de transición y conjuntos

- **ऑ / ॉ para la /ɔ/ inglesa** [CHD § 3.15.2]: `ऑडियो`, `ऑनलाइन`, `ऑफ़लाइन`, `कॉपी`, `ब्लॉक`, `प्रॉम्प्ट`, `मॉडल`,
  `कॉल`. **ऐ / ै para la /æ/**: `ऐप`, `कैमरा`, `बैलेंस`, `गैलरी`, `चैट`, `टैप`. Pero **la grafía asentada gana**:
  `प्रोफ़ाइल`, `फ़ोटो`, `पोस्ट`, `प्रोजेक्ट`, `प्रोडक्ट`, `लोगो`, `होम` se escriben como en el glosario, sin
  reinterpretar la fonética.
- **Formas verbales con vocal** [CHD § 3.14.1] [MS-hi § 2.1.1]: `किए`, `गए`, `गई`, `लिए`, `नई`, `दिए`; no `किये`,
  `गये`, `गयी`, `लिये`, `नयी`, `दिये`.
- **Conjuntos normales, sin trucos**: `प्रोजेक्ट`, `स्क्रीन`, `ड्राफ़्ट`, `प्रॉम्प्ट`, `टेक्स्ट` se escriben con el
  virama (U+094D) y la fuente los compone. Halant visible solo en palabras que lo piden (no aparecen en la interfaz).
  [CHD § 3.1.2]
- **Sin caja.** El devanagari no tiene mayúsculas: `toLocaleUpperCase('hi')` solo cambia el latino (`WEË AI
  प्रोफ़ाइल`). Los rótulos de sección que el español escribe en mayúsculas (`PERFIL`, `EXPLORA`) se escriben
  normales: `प्रोफ़ाइल`, `एक्सप्लोर`. El énfasis lo da el diseño (peso, color), no la caja. [Node] [MD]

## 5. Género y concordancia

El hindi concuerda en género los verbos en pasado y en progresivo, los participios y los adjetivos en -ा. Weë no
sabe el género de quien usa la app ni el de `{{nombre}}` (y aunque el alta pregunta el género, la interfaz no debe
depender de él).

### 5.1 La persona que usa la app (आप)

| Construcción | Por qué funciona | Ejemplo |
|---|---|---|
| Imperativo de आप | No lleva género | `अपना पासवर्ड डालें` |
| Ergativo: `आपने` + verbo transitivo en pasado | El verbo concuerda con el objeto, no con la persona | `आपने वोट दिया` · `आपने {{credits}} Credits इस्तेमाल किए` · `आपने सभी सूचनाएँ पढ़ ली हैं` |
| Dativo + infinitivo: «क्या आपको … है?» | Sin verbo concordado con la persona; es el patrón de Android | `क्या आपको यह पोस्ट मिटानी है?` · `क्या आपको यकीन है?` |
| Pasiva: «… किया जा सकता है» | Concuerda con la cosa; la usa mucho Google | `प्रोफ़ाइल फ़ोटो बाद में बदली जा सकती है.` |
| Sustantivo o adjetivo invariable con `है/हैं` | La cópula no tiene género | `Weë में आपका स्वागत है` · `अब आप {{comunidad}} के सदस्य हैं` |
| `आप … सकते हैं` | Masculino plural como genérico: lo usan Microsoft, Google, WhatsApp y Spotify. **Se admite** cuando reescribir alarga la frase | `आप बाद में बदल सकते हैं.` |

- **Nunca barras**: `सकता/सकती`, `गया/गई` (así titula su ayuda PhonePe). Android no lo hace ni una vez en 9 370
  cadenas. [PHONEPE] [AOSP]
- **Evitar el pasado intransitivo con आप como sujeto**, que obliga a elegir: «आप शामिल हुए/हुईं». Se reescribe:
  `अब आप {{comunidad}} के सदस्य हैं`.
- Microsoft admite el plural `वे / उनका / उन्हें` para una persona genérica y pide no usar «वह पुरुष/वह महिला».
  [MS-hi § 3.1]

### 5.2 Una tercera persona desconocida: `{{nombre}}`

Con `ने` y un verbo transitivo, el verbo concuerda con el objeto (o va en masculino singular si el objeto lleva `को`),
así que la frase vale para cualquier persona:

| Español | Hindi |
|---|---|
| A {{nombre}} le gustó tu publicación | `{{nombre}} ने आपकी पोस्ट पसंद की` |
| {{nombre}} comentó en tu publicación | `{{nombre}} ने आपकी पोस्ट पर टिप्पणी की` |
| {{nombre}} comenzó a seguirte | `{{nombre}} ने आपको फ़ॉलो करना शुरू किया` |
| {{nombre}} respondió a tu comentario | `{{nombre}} ने आपकी टिप्पणी का जवाब दिया` |
| {{nombre}} te mencionó | `{{nombre}} ने आपको मेंशन किया` |
| {{nombre}} quiere agregarte a ËContact | `{{nombre}} ने आपको ËContact में जोड़ने का अनुरोध भेजा है` |
| {{nombre}} aceptó tu solicitud de ËContact | `{{nombre}} ने आपका ËContact अनुरोध स्वीकार किया` |
| {{nombre}} publicó en {{comunidad}} | `{{nombre}} ने {{comunidad}} में पोस्ट किया` |
| {{nombre}} reposteó | `{{nombre}} ने रीपोस्ट किया` |
| Se unió en {{fecha}} | `जुड़ने की तारीख: {{fecha}}` |

**Se evita** lo que obliga a elegir: pasados intransitivos («{{nombre}} शामिल हुए/हुईं», «आया/आई») y progresivos
(«टाइप कर रहा/रही है»). Si no hay verbo transitivo a mano, una etiqueta o un sustantivo:
`{{nombre}} की ओर से नया अनुरोध`.

### 5.3 Las marcas, cuando concuerdan

- **Weë y todos sus productos van en masculino singular**, como Android, WhatsApp y Spotify tratan a una app
  (`WhatsApp … इस्तेमाल करता है`, `Spotify … भेज सकता है`): `नतीजा आप चुनें. AI Weë चुनेगा.`,
  `Weë Brain सोच रहा है…`. **Credits**, masculino plural (`{{cantidad}} Credits जोड़े गए`); **Weëls**, masculino
  plural; un **Weël**, masculino singular. [WA] [SPOT] [AOSP]
- Mejor aún, construcciones sin concordancia: `Weë पर`, `Weë का वर्शन`, `Credits बैलेंस`.
- **Weë Brain en primera persona**: primero, las formas que no tienen género —el ergativo (`मैंने आपकी यात्रा का
  प्लान बनाया`), el subjuntivo (`मैं आपकी क्या मदद करूँ?`) o una frase sin verbo personal—; si no hay más remedio que
  un presente, un futuro o un progresivo, masculino (`मैं सोच रहा हूँ`), porque Weë Brain es un producto de Weë y
  Weë va en masculino. Decidido así; si la marca quisiera otra voz, se cambia en bloque.

### 5.4 Género de los préstamos de la interfaz

| Palabra | Género | Evidencia |
|---|---|---|
| `पोस्ट` | f | YouTube `पोस्ट बनानी हैं`; Instagram `अपनी पोस्ट` [G-YT] [IG] |
| `फ़ोटो` | f | Google Fotos `मिटाई गई फ़ोटो`; Instagram, Spotify [G-PH] [IG] [SPOT] |
| `वीडियो` | m | YouTube `कोई वीडियो`, `…वीडियो शेयर किया जा सकता है` [G-YT] |
| `इमेज` | f | Android `इमेज भेजी गई`; Gemini `नई इमेज` [AOSP] [G-GEM] |
| `फ़ाइल` | f | Android `फ़ाइल मिटाई गई` [AOSP] |
| `प्रोफ़ाइल` | f | Android `प्रोफ़ाइल मिटाई गई` [AOSP] |
| `प्रोजेक्ट` | m | Google for Developers `प्रोजेक्ट का नाम` [G-DEV] |
| `कम्यूनिटी` | f | YouTube `अपनी कम्यूनिटी बनाना` [G-YT] |
| `ऐप` | m | Android (`<APP_NAME> चल रहा है`), WhatsApp. Paytm lo usa en femenino: se evita concordar [AOSP] [WA] [PLAY-IN] |
| `खाता` | m | Android `खाता जोड़ा जा सकता` [AOSP] |
| `सेटिंग` | f | Android `सेटिंग नहीं बदली जा सकती`; YouTube `आपकी सेटिंग` [AOSP] [G-YT] |
| `मैसेज` / `संदेश` | m | Android `मैसेज भेजा जा सकता` [AOSP] |
| `चैट` | f | Gemini `नई चैट`, `आपकी चैट` [G-GEM] |
| `टिप्पणी` | f | YouTube `पब्लिश की गई टिप्पणियां` [G-YT] |
| `मॉडल` | m | Gemini `यह मॉडल … सकता है` [G-GEM] |
| `प्रॉम्प्ट` | m | Gemini `अपना प्रॉम्प्ट` [G-GEM] |
| `लिंक` | m | Android `लिंक ढूंढे जा रहे` (Canva lo usa en femenino) [AOSP] [CANVA] |
| `पासवर्ड` | m | Android `पासवर्ड डाला गया` [AOSP] |
| `ईमेल` | m | Gmail `आपका ईमेल` [G-GM] |
| `सूचना` | f | Android `सूचना पहुंच गई` [AOSP] |
| `नोटिफ़िकेशन` (no se usa: § 11) | m | Spotify `…पुश नोटिफ़िकेशन भेजे जाएँ` [SPOT] |
| `लाइक` (no se usa: § 11) | m | **Sin fuente directa**; tendencia general |
| `स्टाइल` | f | Instagram `आपकी स्टाइल` (el uso vacila: se evita concordar) [IG] |
| `बैलेंस` | m | PhonePe `वॉलेट बैलेंस का` [PHONEPE] |
| `यात्रा` | f | Palabra hindi femenina |
| `टेंप्लेट`, `ड्राफ़्ट`, `डिज़ाइन`, `ब्रांड`, `लोगो`, `वोट`, `पोल`, `बजट` | m | **Sin fuente directa**; tendencia general de los préstamos acabados en consonante. Validar |
| `रेसिपी`, `क्वालिटी`, `गैलरी` | f | **Sin fuente directa**; tendencia de los préstamos en -ी. Validar |

## 6. Las marcas

`Weë` · `Weë AI` · `Weë Studio` · `Weë Design` · `Weë Photo` · `Weë Writer` · `Weë Music` · `Weë Beauty` · `Weë Chef` ·
`Weë Home` · `Weë Business` · `Weë Travel` · `Weë Brain` · `Weë Inspira` · `Weë Credits` · `Credits` · `Weëls` (una:
`Weël`) · `Wäll` · `WeeTalk` · `ËContact` · `ẄContact`

- **Ni se traducen, ni se transliteran, ni cambian de forma**, y van **en latino dentro de la frase hindi**, como
  hacen Google, Meta y Spotify con las suyas (`Google खाता`, `YouTube वीडियो`, `Instagram पर शेयर करें`, `Reels` en
  latino dentro del hindi de Instagram). [G-ACC] [G-YT] [IG] [MOZ] [MS-hi § 5.3]
- **La posposición va detrás, separada por un espacio**, y no toca la marca: el genitivo hindi es una palabra
  (`का/के/की`), no un sufijo. [MS-hi § 4.1.7]

| Uso | Posposición | Ejemplo |
|---|---|---|
| Estar o publicar **en** la plataforma | `पर` | `Weë पर पोस्ट करें`, `Weë पर शेयर किया गया`, `Weë पर {{fecha}} से` |
| **Dentro** de una herramienta o sección; bienvenida | `में` | `Weë AI में`, `WeeTalk में`, `Weë में आपका स्वागत है` |
| De (genitivo), concuerda con lo que sigue | `का / के / की` | `Weë का वर्शन`, `Weë के बारे में`, `Weë की शर्तें` |
| Desde, con | `से` / `के साथ` | `Weë से साइन आउट करें`, `Google के साथ जारी रखें` |
| A (destinatario) | `को` | `Weë को बताएँ` |

- **Marca + sustantivo hindi, uno detrás de otro**, sin guion (como `Google खाता`): `Weë प्रोफ़ाइल`,
  `Credits बैलेंस`, `WeeTalk चैट`, `ËContact अनुरोध`, `Weë AI प्रोजेक्ट`. [G-ACC]
- **Weëls**: la sección es `Weëls`; una sola, `Weël` (`Weël बनाएँ`); varias, `Weëls`. Como `Reels` en Instagram. [IG]
- **Los nombres de las funciones y los módulos de Weë Business** —Business Plan, Business Coach, Pricing Assistant,
  Brand Kit, Customer Insights, Business Ideas, Business Profile; y My Business, Products & Catalog, Create, Social,
  Analyze, Grow, Promote— se escriben igual en todos los idiomas (decisión del usuario, 2026-09-16). Lo que hace cada
  uno sí se traduce. «SWOT» se queda como sigla: `SWOT विश्लेषण`.
- **Deformaciones que la prueba de marcas debe rechazar en hindi** (propuesta para
  `i18n-nombres-propios.test.mjs`): `वी` y `वीई` como palabra suelta (cuidado: `वीडियो` empieza igual), `वीटॉक` /
  `वी टॉक`, `वील` / `वील्स`, `क्रेडिट` / `क्रेडिट्स` (salvo `क्रेडिट कार्ड`), `वी एआई`; y las experiencias traducidas
  o transliteradas: `Weë संगीत` / `Weë म्यूज़िक`, `Weë यात्रा` / `Weë ट्रैवल`, `Weë शेफ़`, `Weë व्यापार` /
  `Weë व्यवसाय` / `Weë बिज़नेस`, `Weë फ़ोटो`, `Weë लेखक` / `Weë राइटर`, `Weë सौंदर्य` / `Weë ब्यूटी`, `Weë घर` /
  `Weë होम`, `Weë दिमाग` / `Weë ब्रेन`, `Weë स्टूडियो`, `Weë डिज़ाइन`. Ojo: `Weë` seguido de un sustantivo corriente
  puede ser legítimo (`Weë प्रोफ़ाइल`, § 6); la prueba debe apuntar a los nombres de las experiencias, no a cualquier
  `Weë` + palabra.

## 7. Puntuación

- **Fin de frase: el punto «.»**, no la danda «।». Lo hacen Google (0 dandas en 2 402 cadenas del núcleo de Android;
  su ayuda y sus políticas), Meta (Instagram, WhatsApp, Facebook) y Spotify, y es la regla explícita de Microsoft; el
  estándar Unicode describe el punto y la coma latinos como de uso libre en el hindi moderno. El CHD, Mozilla, Apple
  y varias apps indias usan «।»: es correcto, pero no es lo que Weë elige (§ 13). **Nunca se mezclan**, y nunca «|»
  (barra) en lugar de danda. La prueba rechaza cualquier «।» o «॥»: si algún día se prefiere la danda, se cambia todo
  el diccionario de una vez y se invierte la regla. [AOSP] [G-POL] [IG] [WA] [SPOT] [MS-hi § 4.1.12] [UNI-ch12]
- **`?` y `!` como en inglés**, pegados a la palabra. Pocas exclamaciones: una bienvenida sí, un error no.
- **`…`, un solo carácter** (U+2026), sin espacio delante: `लोड हो रहा है…`. Microsoft conserva los puntos
  suspensivos de los procesos en curso; Android mezcla `…` y `...`; Weë, siempre `…`. [MS-hi § 4.1.12] [AOSP]
- **Comillas “…”** (U+201C / U+201D) para citar lo que escribió la persona o el nombre de un botón:
  `“{{busqueda}}” के लिए कोई नतीजा नहीं मिला`, `“प्रोफ़ाइल एडिट करें” पर टैप करें`. [APPLE]
- **Coma tras la oración con «के लिए»**, como escribe Google: `फ़ोटो बदलने के लिए, … पर टैप करें.` [G-YT] [G-GEM]
- **Enumeraciones escritas a mano, sin coma antes de `और` / `या`**: `फ़ोटो, वीडियो और टेक्स्ट`, como escriben
  WhatsApp, Microsoft y Gemini. Las listas que arma `Intl` llevan la coma de CLDR (`A, B, और C`) y no se tocan (§ 13).
  [WA] [MS-hi § 4.1.12] [G-GEM] [CLDR]
- **Dos puntos** sin espacio delante: `जगह: {{lugar}}`, `सलाह:`. [G-GEM]
- **Sin raya larga**: coma, paréntesis o frase nueva. El guion corto de intervalo (`12–18`) lo pone `Intl`.
  [MS-hi § 4.1.12]
- **`%` pegado a la cifra** (`60%`); **espacio entre cifra y unidad** (`10 MB`); **sin espacios dentro de un
  paréntesis**; **`&` se escribe `और`**. [MS-hi § 4.1.12, § 4.1.15] [CLDR]

## 8. Números, fechas, horas, dinero y plural

- **Todo lo que `Intl` sabe hacer lo hace `Intl`**: `12,34,567.89` (agrupación india), `₹1,500.00`, `60%`,
  `30 सितंबर 2026`, `30/9/26`, `2:05 pm`, `3 दिन पहले`, `कल`, `परसों`, `A, B, और C`, `5 कि॰मी॰`. [Node]
- **Cifras latinas (0–9), nunca devanagari (०–९)**: es lo que da `Intl` por defecto, lo que dice la Constitución
  (art. 343.1, recogido por el CHD), lo que pide Mozilla y lo que usan Google, Meta y Apple. Las cifras que escribe
  quien traduce, también: `13 साल`, no `तेरह साल`. [Node] [CHD § 2.2] [MOZ]
- **Compacto**: `1.5 हज़ार`, `1.3 लाख`, `10 लाख`; desde el crore el estilo corto abrevia (`2.5 क॰`, `1 अ॰`) y el
  largo escribe `2.5 करोड़`, `1 अरब`. Lo decide quien pinta el contador, no el diccionario. [Node]
- **La hora es de 12 horas** con `am`/`pm` en latino y minúscula: `2:05 pm`. Nunca `अपराह्न` a mano. [Node] [CLDR]
- **El tiempo relativo de CLDR es algo formal** (`माह`, `वर्ष`, `सप्ताह`); las cadenas escritas a mano usan las
  palabras de todos los días: `महीना`, `साल`, `हफ़्ता` (`पिछला महीना`, `अगला महीना`). `कल` vale para ayer y para
  mañana: lo decide el contexto, y lo da `Intl`. [Node]
- **La semana empieza en domingo** en `hi-IN` (CLDR). Nota técnica, no de traducción (§ 15). [Node]
- **Un intervalo de fechas lo escribe `Intl`** (`12–18 अक्टूबर 2026`); si hace falta una plantilla, sin
  preposiciones: `{{dia}}–{{diaFinal}} {{mesYAnio}}`. [Node]
- **Plural**: `_one` para **0 y 1** (y decimales menores que 1), `_other` para el resto. Por eso **`_one` lleva
  siempre `{{contador}}` y nunca «1» ni «एक»**; y el vacío («Sin votos todavía») va en su propia clave:
  `अभी तक कोई वोट नहीं`. [CLDR] [Node]

| Concepto | `_one` (0 y 1) | `_other` | Nota |
|---|---|---|---|
| comentario | `{{contador}} टिप्पणी` | `{{contador}} टिप्पणियाँ` | f en -ी → -इयाँ |
| archivo | `{{contador}} फ़ाइल` | `{{contador}} फ़ाइलें` | f en consonante → -एँ (Android `फ़ाइलें`) |
| noche | `{{contador}} रात` | `{{contador}} रातें` | f |
| hora | `{{contador}} घंटा` | `{{contador}} घंटे` | m en -ा → -े; delante de una posposición, `घंटे` también en singular (`1 घंटे पहले`, lo da `Intl`) |
| publicación | `{{contador}} पोस्ट` | `{{contador}} पोस्ट` | f, invariable |
| foto / imagen | `{{contador}} फ़ोटो` / `{{contador}} इमेज` | igual | f, invariables |
| vídeo | `{{contador}} वीडियो` | igual | m, invariable |
| proyecto / mensaje | `{{contador}} प्रोजेक्ट` / `{{contador}} मैसेज` | igual | m, invariables |
| miembro / voto | `{{contador}} सदस्य` / `{{contador}} वोट` | igual | m, invariables |
| día / minuto / segundo | `{{contador}} दिन` / `मिनट` / `सेकंड` | igual | invariables |
| Credits | `{{contador}} Credits` | igual | marca |
| comunidad | `{{contador}} कम्यूनिटी` | igual | f; plural con cifra sin fuente: invariable, a validar |

- **Oblicuo plural de los préstamos**: los que la tabla da como invariables tampoco toman `-ों` delante de una
  posposición (`इन फ़िल्टर के साथ`, `दोनों फ़ील्ड में`, `कई इमेज से`, `जिन कम्यूनिटी के`), como escribe Android
  (`दूसरे ऐप्लिकेशन के ऊपर`); los que el hindi ya pluraliza sí (`फ़ाइलें` → `फ़ाइलों में`, `टिप्पणियाँ` →
  `टिप्पणियों पर`). Una forma por palabra en todo el diccionario. [AOSP]
- **Ordinales**: se evitan. `प्रस्ताव {{numero}}` (el número detrás del sustantivo), no «{{numero}}वाँ प्रस्ताव».
  CLDR tiene cinco categorías ordinales en hindi (1 पहला; 2 y 3 दूसरा, तीसरा; 4 चौथा; 6 छठा). [CLDR]
- **Orden alfabético**: `Intl.Collator('hi')` ordena como el alfabeto devanagari (vocales, luego क ख ग…; `क़` detrás
  de `क`, `क्ष` detrás de `क`, `ज्ञ` detrás de `ज`). No se ordena a mano. [Node]
- **Búsqueda**: la gente escribe a menudo sin nukta (`फोटो`) o con anusvara donde va chandrabindu (`हां`).
  `paraBuscar` (`i18n/caja.ts`), la función con la que Weë compara lo que se busca, ya las iguala: quita la nukta —la
  suelta y la de las letras precompuestas—, lee la chandrabindu como anusvara y no cuenta ZWJ ni ZWNJ. Solo toca
  devanagari: el latín, la «å» sueca y las íes turcas siguen igual. Todas las búsquedas de Weë comparan en memoria, a
  los dos lados con la misma función, así que no hay datos guardados que migrar. [Node]

## 9. Longitud y tipografía

**Longitud.** Medido sobre las cadenas de Android: frente al español, el hindi ocupa **0,88 veces su ancho** en
conjunto (mediana 0,85), pero **una de cada diez cadenas cortas pasa de 1,4 veces**; frente al inglés, 1,16 en
conjunto y 1,78 en el percentil 90. Lo que alarga son los verbos compuestos: «Share» (40 px) → `शेयर करें` (56 px).
[AOSP] [Medición]

- Botones, pestañas y chips: la forma más corta natural (`सेव करें`, no `सेव कर दें`; sin `कृपया`).
- Sin abreviar a mano: ni `कि॰`, ni cortar palabras. Las abreviaturas con «॰» solo las pone `Intl`.
- El hindi no se parte con guion: el salto de línea va en los espacios (`Intl.Segmenter` separa bien las palabras).
- Los contadores de caracteres cuentan unidades UTF-16: `राम` son 3 unidades y 2 letras visibles. Un «mínimo 2
  letras» cuenta distinto en hindi (§ 15).

**Tipografía** (no la decide quien traduce, pero quien revisa las capturas debe buscarlo):

- **Inter, la fuente de Weë, no tiene devanagari**: el hindi sale en la del sistema —Noto Sans Devanagari en
  Android; en iOS, las que trae el sistema (Kohinoor Devanagari Light, Regular y Semibold, y Devanagari Sangam MN:
  la Bold y la Medium de Kohinoor no vienen instaladas); Nirmala UI en Windows—, y una frase con una marca mezcla
  dos fuentes. Qué fuente de reserva elige cada plataforma no se ha comprobado en un aparato. [GFONTS] [AOSP-fonts]
  [APPLE-FONTS] [MS-FONT]
- **El devanagari necesita más interlineado**: Material lo clasifica entre las escrituras altas y le da 0,1 em más;
  medido en Nirmala UI, `प्रूफ़ र्दृ हूँ` ocupa un 14 % más de alto de tinta que `Agjpy ÉË` y rebasa el interlineado
  por defecto de la fuente. Weë tiene `lineHeight` fijos en 18 sitios: revisar recortes de matras arriba (ि ी े ै ँ
  र्) y abajo (ु ू ृ ्). [MD] [Medición]
- **Sin espaciado entre letras**: en devanagari rompe la línea superior de la palabra (la शिरोरेखा), y así salía en
  las primeras capturas. Resuelto en el código, no en la traducción: `sinEspaciadoSiSeUne` (`i18n/caja.ts`) quita el
  `letterSpacing` cuando el texto está en una escritura que se une (árabe, devanagari y los demás bloques índicos) y
  lo deja igual en las latinas. Lo usan los rótulos espaciados de `TextoEnMayusculas`, `DrawerMenu` (`sectionLabel`),
  `Sidebar` (`grupo`), `HowIMadeIt` y el rótulo de destinos de `CreateScreen`. Un rótulo espaciado nuevo tiene que
  pasar por el mismo sitio. Comprobado en captura, también a 11 px. [W3C-ilreq]
- **Sin mayúsculas**: en los idiomas sin caja, el énfasis va con color o peso. [MD]

## 10. Patrones de interfaz

| Situación | Patrón |
|---|---|
| Cargando | `लोड हो रहा है…` · `सेव हो रहा है…` · `पोस्ट हो रही है…` (f, la पोस्ट) · `बन रहा है…` |
| Hecho | `सेव हो गया` · `कॉपी किया गया` · `हो गया` |
| Falló | `… नहीं किया जा सका. फिर से कोशिश करें.` (el participio concuerda: `पोस्ट मिटाई नहीं जा सकी.`) · `कोई गड़बड़ी हुई. फिर से कोशिश करें.` (así, exacto, en Android) |
| Sin conexión | `इंटरनेट कनेक्शन नहीं है. अपना कनेक्शन जाँचें और फिर से कोशिश करें.` |
| Confirmar borrado | `क्या आपको … मिटाना है?` (`मिटानी` si lo que se borra es femenino) + `मिटाएँ` / `रद्द करें` |
| Sin resultados | `कोई नतीजा नहीं मिला` · `“{{busqueda}}” के लिए कोई नतीजा नहीं मिला` |
| Estado vacío | `अभी तक कोई … नहीं है.` + una invitación con आप |
| Buscar (placeholder) | `… खोजें` (`लोग खोजें`, `कम्यूनिटी खोजें…`) |
| Contador | `{{contador}} टिप्पणियाँ`, `{{contador}} सदस्य` |
| Bienvenida | `Weë में आपका स्वागत है` |
| Permiso | `कैमरा इस्तेमाल करने के लिए अनुमति दें.` |
| Denuncia recibida | `आपकी रिपोर्ट मिल गई है.` (dice que se recibió, nada más) |

## 11. Glosario

Columnas: la forma elegida; la categoría (§ 3); lo descartado; la razón con su fuente; y dónde se usa. **Una forma
por concepto.** «Validar» = sin fuente de producto de primera línea: decide el revisor nativo.

### 11.1 Las palabras del encargo

| Español | Hindi | Cat. | Descartado | Razón | Contexto |
|---|---|---|---|---|---|
| crear | **बनाएँ** | a | `क्रिएट करें`, `सृजन करें` | Android y YouTube `बनाएं`; Meta `बनाएँ` [AOSP] [G-YT] [FB] | `पोस्ट बनाएँ`, `खाता बनाएँ`; «¿Qué quieres crear hoy?» `आज क्या बनाना है?` |
| generar (IA) | **जनरेट करें**; en la llamada principal, **बनाएँ** | d | `उत्पन्न करें` (formal) | Gemini `इमेज जनरेट … करना`, `फिर से जनरेट करें` [G-GEM] [G-YT] | `फिर से जनरेट करें`; «Crear otra versión» `दूसरा वर्शन बनाएँ` |
| editar | **एडिट करें** | d | `बदलाव करें` (Android: queda para «cambiar»), `संपादित करें` (Apple, Microsoft: formal) | Herramientas de creación: Gemini, Canva, Spotify [G-GEM] [CANVA] [SPOT] | `प्रोफ़ाइल एडिट करें`, `इमेज एडिट करें`; «Cambiar» `बदलें`, «cambio» `बदलाव` |
| guardar | **सेव करें** | d | `सहेजें` (Apple, Microsoft) | Android; Google Fotos `सेव की गई फ़ोटो` [AOSP] [G-PH] | `सेव हो गया`; «Guardar en un proyecto» `प्रोजेक्ट में सेव करें` |
| compartir | **शेयर करें** | d | `साझा करें` (Microsoft, Bluesky: formal) | Android, YouTube, Instagram, WhatsApp [AOSP] [G-YT] [IG] [WA] | `लिंक शेयर करें` |
| eliminar / borrar | **मिटाएँ** (borrar); **हटाएँ** (quitar de una lista, un adjunto, un filtro) | a | `डिलीट करें` | Android `मिटाएं` / `हटाएं`; Google Fotos `हमेशा के लिए मिटाएं` [AOSP] [G-PH] | `पोस्ट मिटाएँ`; `फ़ोटो हटाएँ`; `सेव की गई पोस्ट से हटाएँ` |
| cancelar | **रद्द करें** | a | `कैंसिल करें`, `रहने दें` | Android, Apple, Microsoft [AOSP] [APPLE] [MS-hi] | Botón de diálogo |
| continuar | **जारी रखें** | a | `आगे बढ़ें` (es «Siguiente») | Android, Apple [AOSP] [APPLE] | `Google के साथ जारी रखें` |
| volver | **वापस जाएँ** | a | `पीछे जाएँ` | Android `वापस जाएं`; Apple `वापस` [AOSP] [APPLE] | `साइन इन पर वापस जाएँ` |
| configuración | **सेटिंग** (f) | b | `सेटिंग्स` (WhatsApp, Microsoft), `कॉन्फ़िगरेशन` | Android: 0 `सेटिंग्स` en tres archivos [AOSP] | Título `सेटिंग`; `सेटिंग में जाएँ` |
| cuenta | **खाता** (m) | a | `अकाउंट` (Meta, Spotify) | Android, Gmail, Microsoft [AOSP] [G-GM] [MS-hi] | `खाता बनाएँ`, `आपका खाता` |
| perfil | **प्रोफ़ाइल** (f) | b | `प्रोफाइल` (sin nukta) | Android, Apple, Meta, Spotify [AOSP] [APPLE] [IG] [SPOT] | Perfil Real `असली प्रोफ़ाइल`; Perfil Weë `Weë प्रोफ़ाइल` |
| proyecto | **प्रोजेक्ट** (m) | b | `परियोजना` (formal), `प्रॉजेक्ट` | Google for Developers, Apple [G-DEV] [APPLE] | «Mis proyectos» `मेरे प्रोजेक्ट`; `नया प्रोजेक्ट` |
| archivo | **फ़ाइल** (f); pl. **फ़ाइलें** | b | `फाइल` (Microsoft) | Android 60 frente a 2 [AOSP] | `फ़ाइल अपलोड नहीं की जा सकी.` |
| imagen | **इमेज** (f, invariable) | b | `छवि` (Microsoft, Bluesky), `तस्वीर` (Apple) | Android, Gemini [AOSP] [G-GEM] | Lo generado o genérico: `इमेज बनाएँ`; `2 इमेज` |
| vídeo | **वीडियो** (m, invariable) | b | — | Android, YouTube [AOSP] [G-YT] | `3 वीडियो` |
| audio | **ऑडियो** (m) | b | — | Android [AOSP] | `ऑडियो रिकॉर्ड करें` |
| documento | **दस्तावेज़** (m) | a | `डॉक्यूमेंट` (WhatsApp) | Android [AOSP] | `मेरे दस्तावेज़` |
| modelo (de IA) | **मॉडल** (m) | b | — | Gemini [G-GEM] | Solo en la administración: la persona no ve modelos |
| IA | **AI** (latino) | c | `एआई` (ayuda de Google, ficha de Canva), `कृत्रिम बुद्धिमत्ता`, `आर्टिफ़िशियल इंटेलिजेंस` | Microsoft: las siglas no se localizan; Canva web (20 a 0), Spotify, `Meta AI`; y `Weë AI` va en latino en la misma pantalla [MS-hi § 4.1.2] [CANVA] [SPOT] | `AI से बनाएँ`, `AI अवतार`; se lee «ए-आई»; sin concordancia (§ 5) |
| créditos | **Credits** (marca) | c | `क्रेडिट`, `क्रेडिट्स` | Marca de Weë (CLAUDE.md § 8) | `250 Credits`, `Credits बैलेंस` |
| comunidad | **कम्यूनिटी** (f) | b | `समुदाय` (formal), `कम्युनिटी` (Canva) | YouTube, Android [G-YT] [AOSP] | `कम्यूनिटी बनाएँ`, `कम्यूनिटी खोजें` |
| contacto | **संपर्क** (m) | a | `कॉन्टैक्ट` (WhatsApp) | Android [AOSP] | La agenda es `ËContact`; «Contáctanos» `हमसे संपर्क करें` |
| publicación | **पोस्ट** (f, invariable) | b | `प्रकाशन` | YouTube, Instagram [G-YT] [IG] | `नई पोस्ट`; publicar = `पोस्ट करें` |
| borrador | **ड्राफ़्ट** (m) | b | `मसौदा` (formal) | Gemini `ड्राफ़्ट दिखाएँ` [G-GEM] | `ड्राफ़्ट सेव किया गया` |
| plantilla | **टेंप्लेट** (m) | b | `टेम्प्लेट` (Canva), `टेम्पलेट`, `साँचा` | Gemini, Instagram, Android; regla de la nasal [G-GEM] [IG] [AOSP] [CHD] | `कोई टेंप्लेट चुनें` |
| espacio de trabajo | **वर्कस्पेस** (m) | b | `कार्यक्षेत्र` (formal) | Validar: por analogía con los sustantivos técnicos de Google y Meta | Weë Studio |
| diseño | **डिज़ाइन** (m) | b | `रूपरेखा` | Canva `डिज़ाइन करें` [CANVA] | `नया डिज़ाइन`; la marca `Weë Design` no cambia |
| viaje | **यात्रा** (f) | a | `ट्रिप` (Instagram) | Google Maps [G-MAPS] | `आपकी यात्रा`; la marca `Weë Travel` no cambia |
| música | **संगीत** (m) | a | `म्यूज़िक` (Instagram, Spotify) | Android; YouTube `संगीत बनाएं`, su música con IA [AOSP] [G-YT] | `बैकग्राउंड संगीत`; la marca `Weë Music` no cambia |
| cocina (cocinar) | **खाना बनाना**; verbo `पकाएँ` | a | `कुकिंग` | Validar: palabra corriente sin fuente de producto | «No sé qué cocinar hoy» `पता नहीं आज क्या पकाएँ` |
| cocina (la habitación) | **किचन** (m) | b | `रसोई` (más tradicional) | Validar | Weë Home |
| negocio | **बिज़नेस** (m) | b | `व्यवसाय` (formal), `कारोबार` (Gmail) | WhatsApp, Instagram, Canva [WA] [IG] [CANVA] | `मेरा बिज़नेस`; la marca `Weë Business` no cambia |

### 11.2 Lo social

| Español | Hindi | Cat. | Descartado | Razón | Contexto |
|---|---|---|---|---|---|
| Inicio | **होम** | b | `मुखपृष्ठ` | Android, Spotify [AOSP] [SPOT] | Barra inferior y menú |
| Buscar | **खोजें** | a | `सर्च करें`, `ढूँढें` | Android, Apple [AOSP] [APPLE] | `लोग खोजें`, `कम्यूनिटी खोजें…` |
| Explorar | **एक्सप्लोर करें**; la sección, **एक्सप्लोर** | d | — | Android, Instagram [AOSP] [IG] | Menú |
| Notificaciones | **सूचनाएँ** (f pl) | a | `नोटिफ़िकेशन` (Spotify), `अधिसूचनाएँ` (Bluesky) | Android, Apple, YouTube [AOSP] [APPLE] [G-YT] | «Notificaciones push» `पुश सूचनाएँ` |
| Mensaje | **मैसेज** (m, invariable) | b | `संदेश` (formal) | Android 64 a 9, WhatsApp, Gmail [AOSP] [WA] [G-GM] | `मैसेज लिखें…`, `मैसेज भेजें` |
| Chat / conversación | **चैट** (f) / **बातचीत** (f) | b / a | — | Gemini `नई चैट`; WhatsApp `ग्रुप चैट` [G-GEM] [WA] | «Nueva conversación» `नई चैट` |
| Me gusta | **पसंद करें**; la pestaña del perfil, **पसंद** (la forma larga, `पसंद की गई पोस्ट`, no cabe en una fila de cuatro pestañas) | a | `लाइक करें` (Meta, sin verificar) | YouTube `पसंद करें`, `पसंद किए गए वीडियो` [G-YT] | `{{nombre}} ने आपकी पोस्ट पसंद की` |
| Comentario / comentar | **टिप्पणी** (f; pl. `टिप्पणियाँ`) / **टिप्पणी करें** | a | `कमेंट` | YouTube, Microsoft [G-YT] [MS-hi] | `टिप्पणी लिखें…` |
| Responder / respuesta | **जवाब दें** / **जवाब** (m) | a | `उत्तर दें` | Android, YouTube [AOSP] [G-YT] | |
| Republicar | **रीपोस्ट करें** | d | `फिर से पोस्ट करें` | Bluesky; Meta sin verificar [BSKY] | `{{nombre}} ने रीपोस्ट किया` |
| Seguir / siguiendo / seguidores | **फ़ॉलो करें** / **फ़ॉलोइंग** / **फ़ॉलोअर** (m, invariable) | d / b / b | `अनुसरण करें`, `फ़ॉलोअर्स` | Spotify `फ़ॉलो करें`, `फ़ॉलोअर`; Google News; Bluesky [SPOT] [G-NEWS] [BSKY] | «Dejar de seguir» `अनफ़ॉलो करें` |
| Mencionar / mención | **मेंशन करें** / **मेंशन** (m) | d / b | `उल्लेख` (formal), `ज़िक्र` | Validar | `{{nombre}} ने आपको मेंशन किया` |
| Guardados | **सेव की गई पोस्ट** | d | `बुकमार्क`, `सहेजे गए` | Android `सेव किए गए डिवाइस`; Google Fotos `सेव की गई फ़ोटो` [AOSP] [G-PH] | «Quitar de Guardados» `सेव की गई पोस्ट से हटाएँ` |
| Denunciar | **रिपोर्ट करें** | d | `शिकायत करें` (YouTube, Bluesky) | Android, WhatsApp [AOSP] [WA] | `पोस्ट रिपोर्ट करें` |
| Bloquear | **ब्लॉक करें** | d | `अवरुद्ध करें` (Bluesky) | Spotify, Android, WhatsApp [SPOT] [AOSP] [WA] | `अनब्लॉक करें` |
| Silenciar | **म्यूट करें** | d | `शांत करें` | Android, WhatsApp [AOSP] [WA] | |
| Encuesta | **पोल** (m) | b | `सर्वे`, `मतदान` | YouTube [G-YT] | `पोल बनाएँ` |
| Votar / voto | **वोट करें** / **वोट** (m, invariable) | d / b | `मत दें` | Uso general [MASTO] | `आपने वोट दिया` |
| Miembro / unirse / salir | **सदस्य** (m) / **शामिल हों** / **छोड़ें** | a | `मेंबर`, `जॉइन करें` | YouTube `चैनल के सदस्यों`; Google Groups `…उसमें शामिल होना` [G-YT] [G-GROUPS] | `कम्यूनिटी में शामिल हों`, `कम्यूनिटी छोड़ें`; estado «Unido» `सदस्य` |
| Tendencias | **ट्रेंडिंग** | b | `रुझान` (Bluesky) | Validar (ShareChat) [PLAY-IN] | |
| Temas populares | **लोकप्रिय विषय** | a | — | Instagram `लोकप्रिय` [IG] | |
| Personas (pestaña) | **लोग** | a | `यूज़र` | YouTube, Gemini [G-YT] [G-GEM] | |
| Oficial | **आधिकारिक** (invariable) | a | `ऑफ़िशियल` | YouTube `आधिकारिक YouTube ऐप्लिकेशन` [PLAY-IN] | Insignia |
| Copiar enlace | **लिंक कॉपी करें** | d | — | YouTube [G-YT] | Hecho: `लिंक कॉपी किया गया` |

### 11.3 Cuenta y acceso

| Español | Hindi | Cat. | Descartado | Razón | Contexto |
|---|---|---|---|---|---|
| Iniciar sesión | **साइन इन करें** | d | `लॉग इन करें` (Meta, Spotify, Canva) | Android 24 a 1, Apple; el inglés de Weë dice «Sign in» [AOSP] [APPLE] | `साइन इन करके जारी रखें` |
| Cerrar sesión | **साइन आउट करें** | d | `लॉग आउट करें` | Gmail, Apple, Bluesky [G-GM] [APPLE] [BSKY] | `क्या आपको Weë से साइन आउट करना है?` |
| Registrarse | **साइन अप करें** | d | `रजिस्टर करें` | Facebook, Spotify, Canva, Bluesky [FB] [SPOT] [CANVA] [BSKY] | El botón «Crear cuenta» es `खाता बनाएँ` |
| Contraseña | **पासवर्ड** (m) | b | — | Android, Meta [AOSP] [IG] | «¿Olvidaste tu contraseña?» `पासवर्ड याद नहीं है?` (neutro; Meta escribe `पासवर्ड भूल गए?`, masculino plural) |
| Correo electrónico | **ईमेल** (m); la dirección, `ईमेल पता` | b | `ई-मेल`, `मेल` | Android, Gmail, Spotify [AOSP] [G-GM] [SPOT] | |
| Nombre de usuario | **यूज़रनेम** | b | `उपयोगकर्ता नाम` (Android) | Instagram, WhatsApp, Spotify [IG] [WA] [SPOT] | Nombre visible `डिस्प्ले नाम` (Spotify) |
| Usuario | **यूज़र** (m) | b | `उपयोगकर्ता` (Google, Microsoft; más formal) | WhatsApp, Spotify [WA] [SPOT] | «Usuario anónimo» `गुमनाम यूज़र` |
| Invitado | **मेहमान** (m) | a | `गेस्ट`, `अतिथि` | Android [AOSP] | `मेहमान के रूप में जारी रखें` |
| Bienvenida | **स्वागत** | a | — | Android, Swiggy, JioHotstar [AOSP] [PLAY-IN] | `Weë में आपका स्वागत है` |
| Idioma | **भाषा** (f) | a | — | Android, Apple [AOSP] [APPLE] | |
| Privacidad | **निजता** (f); la política, `निजता नीति` | a | `प्राइवेसी` (Meta, Spotify), `गोपनीयता` (Apple, Microsoft) | Android, políticas de Google, Gemini [AOSP] [G-POL] [G-GEM] | |
| Términos | **शर्तें** (f pl); `सेवा की शर्तें` | a | — | Google, Instagram, Facebook [G-POL] [IG] [FB] | |
| Ayuda | **मदद** (f) | a | `सहायता` (Android Settings, Apple) | Así se llaman los centros de ayuda de Google, Instagram, WhatsApp y Spotify [G-YT] [IG] [WA] [SPOT] | |
| Ubicación | **जगह** (f); el ajuste o permiso, `जगह की जानकारी` | a | `लोकेशन` (WhatsApp), `स्थान` | Android, Google Maps [AOSP] [G-MAPS] | `जगह जोड़ें`, `आपकी जगह` |
| Permitir | **अनुमति दें** | a | — | Android, Apple [AOSP] [APPLE] | |

### 11.4 Crear con IA

| Español | Hindi | Cat. | Descartado | Razón | Contexto |
|---|---|---|---|---|---|
| Instrucción (prompt) | **प्रॉम्प्ट** (m) | b | `निर्देश` | Gemini `अपना प्रॉम्प्ट डालें` [G-GEM] | «Copiar prompt» `प्रॉम्प्ट कॉपी करें` |
| Resultado | **नतीजा** (m; pl. `नतीजे`) | a | `परिणाम` (formal), `रिज़ल्ट` | Gemini `भरोसेमंद नतीजे` [G-GEM] | «Sin resultados» `कोई नतीजा नहीं मिला` |
| Calidad | **क्वालिटी** (f) | b | `गुणवत्ता` (formal), `क्वॉलिटी` (WhatsApp) | Gemini `बेहतरीन क्वालिटी` [G-GEM] | |
| Estilo | **स्टाइल** (f) | b | `शैली` | Gemini, Instagram [G-GEM] [IG] | |
| Duración | **अवधि** (f) | a | — | Android, YouTube [AOSP] [G-YT] | |
| Voz | **आवाज़** (f); nota de voz `वॉइस मैसेज` (m) | a / b | — | Android `आवाज़`; WhatsApp `वॉइस मैसेज` [AOSP] [WA] | «Voz de Weë» `Weë की आवाज़` |
| Vista previa | **झलक** (f) | a | `प्रीव्यू` (Apple) | Android, Gemini `इमेज की झलक` [AOSP] [G-GEM] | `झलक · डेमो` |
| Subir / descargar | **अपलोड करें** / **डाउनलोड करें** | d | — | Gemini, WhatsApp, Maps [G-GEM] [WA] [G-MAPS] | `अपलोड हो रहा है…` |
| Cámara / galería / foto | **कैमरा** (m) / **गैलरी** (f) / **फ़ोटो** (f) | b | `तस्वीर` (Apple) | Android; Google Docs `टेंप्लेट गैलरी`; Google Fotos [AOSP] [G-DOCS] [G-PH] | `गैलरी से चुनें`, `फ़ोटो लें` |
| Cómo lo hice | **मैंने इसे कैसे बनाया** | — | — | Ergativo: no depende de quién habla (§ 5) | Rótulo de la publicación |
| Modo demo | **डेमो मोड** | b | — | | |

### 11.5 Estados, avisos y navegación

| Español | Hindi | Cat. | Descartado | Razón | Contexto |
|---|---|---|---|---|---|
| Cargando… | **लोड हो रहा है…** | d | `लोड किया जा रहा है…` (Apple), `लोड हो रहे हैं...` | Android SystemUI, Canva [AOSP] [CANVA] | `कम्यूनिटी लोड हो रही हैं…` si hay sujeto; si no, la forma fija |
| Error | **गड़बड़ी** (f) | a | `त्रुटि`, `एरर` | Android [AOSP] | Título de un aviso |
| Algo salió mal | **कोई गड़बड़ी हुई** | a | `कुछ गलत हुआ` | Android, exacto [AOSP] | `कोई गड़बड़ी हुई. फिर से कोशिश करें.` |
| Inténtalo de nuevo / reintentar | **फिर से कोशिश करें** | a | `पुनः प्रयास करें`, `फिर प्रयास करें` | Android; Microsoft desaconseja `पुनः प्रयास करें` [AOSP] [MS-hi § 2.1.1] | Botón y final de un error |
| Sin conexión | **इंटरनेट कनेक्शन नहीं है**; el estado, `ऑफ़लाइन` | d / b | — | Android [AOSP] | Aviso de red |
| Actualizar | **अपडेट करें** | d | `अद्यतन करें` | Android, Maps [AOSP] [G-MAPS] | `प्रोफ़ाइल अपडेट नहीं की जा सकी.` |
| No disponible | **उपलब्ध नहीं है** | a | `अनुपलब्ध` | Android, Microsoft [AOSP] [MS-hi] | Estado; en una etiqueta corta, `उपलब्ध नहीं` |
| Próximamente | **जल्द ही** | a | `जल्द आ रहा है` (masculino) | Neutro en género | Insignia |
| Aceptar (aviso) | **ठीक है** | a | `ओके` | Android [AOSP] | Botón único de un aviso |
| Aceptar / rechazar (solicitud) | **स्वीकार करें** / **अस्वीकार करें** | a | — | Android, Apple [AOSP] [APPLE] | Solicitudes de ËContact |
| Solicitud | **अनुरोध** (m) | a | `रिक्वेस्ट` | Gemini, políticas de Google [G-GEM] [G-POL] | `ËContact अनुरोध` |
| Enviar | **भेजें** | a | — | Android [AOSP] | `मैसेज भेजें`, `टिप्पणी भेजें` |
| Hecho / listo (botón) | **हो गया**; «lista» (una creación), `तैयार` | a | `पूरा हुआ` | Android [AOSP] | Botón que cierra un paso |
| Siguiente / anterior | **आगे बढ़ें** / **पिछला** | a | — | Android [AOSP] | Botones; en rótulos, `अगला महीना` / `पिछला महीना` |
| Omitir | **अभी नहीं** | a | `स्किप करें` (Apple), `छोड़ें` | Android (`skip_label`) [AOSP] | Saltar un paso del alta |
| Confirmar | **पुष्टि करें** | a | `कन्फ़र्म करें` | Android, Apple [AOSP] [APPLE] | `तारीखों की पुष्टि करें` |
| Cerrar / abrir | **बंद करें** / **खोलें** | a | — | Android, Apple [AOSP] [APPLE] | `टिप्पणियाँ बंद करें` |
| Ver todo / más / menos | **सभी देखें** / **ज़्यादा देखें** / **कम देखें** | a | `अधिक` (Apple, Canva) | Android [AOSP] | `सभी देखें →` |
| Enlace | **लिंक** (m) | b | — | Android, Apple [AOSP] [APPLE] | `लिंक कॉपी करें` |
| Copiar / pegar | **कॉपी करें** / **चिपकाएँ** | d / a | `पेस्ट करें` | Android [AOSP] | Hecho: `कॉपी किया गया` |
| Deshacer | **पहले जैसा करें** | a | — | Android y Apple coinciden [AOSP] [APPLE] | Tras borrar o mover algo |
| Empezar | **शुरू करें** | a | — | Android [AOSP] | `{{nombre}} के साथ शुरू करें` |

### 11.6 Credits, dinero, viajes, cocina y negocio

| Español | Hindi | Cat. | Descartado | Razón | Contexto |
|---|---|---|---|---|---|
| Saldo | **बैलेंस** (m) | b | `शेष राशि` (bancario) | PhonePe `वॉलेट बैलेंस` [PHONEPE] | `आपका Credits बैलेंस` |
| Precio | **कीमत** (f) | a | `मूल्य`, `प्राइस` | Spotify, Canva [SPOT] [CANVA] | «precio de prueba»: validar (`टेस्ट कीमत`) |
| Gratis | **मुफ़्त** (invariable) | a | `फ़्री` (WhatsApp) | Spotify, Canva [SPOT] [CANVA] | Insignia y precio |
| Comprar | **खरीदें** | a | — | Instagram `प्रोडक्ट खरीदें` [IG] | `Credits खरीदें →` |
| Reembolso | **रिफ़ंड** (m) | b | `धनवापसी` | Spotify `रिफ़ंड पॉलिसी` [SPOT] | Historial de Credits |
| Billetera | **वॉलेट** (m) | b | `बटुआ` | PhonePe [PHONEPE] | `मेरा वॉलेट` |
| Itinerario | **यात्रा प्लान** (m) | a+b | `यात्रा कार्यक्रम` (formal), `आइटिनरेरी` | Validar; Gemini usa `प्लान` [G-GEM] | Weë Travel |
| Destino | **मंज़िल** (f) | a | `गंतव्य` (formal), `डेस्टिनेशन` | Google Maps [G-MAPS] | Weë Travel |
| Presupuesto | **बजट** (m) | b | `अनुमानित खर्च` | Validar | Weë Travel, Weë Business |
| Receta | **रेसिपी** (f) | b | `विधि` | Validar | Weë Chef |
| Ingredientes | **सामग्री** (f, colectivo) | a | `इंग्रीडिएंट्स` | Validar (es la palabra de las recetas en hindi) | Weë Chef |
| Marca (de un negocio) | **ब्रांड** (m) | b | — | Instagram, Canva `ब्रांड किट` [IG] [CANVA] | Weë Business, Weë Design |
| Logo | **लोगो** (m) | b | — | Canva `AI लोगो जनरेटर` [CANVA] | `मेरे बिज़नेस के लिए एक लोगो` |
| Producto | **प्रोडक्ट** (m) | b | `उत्पाद` (formal), `प्रॉडक्ट` (Google Docs) | Instagram, Canva [IG] [CANVA] | Catálogo de Weë Business |
| Cliente | **ग्राहक** (m) | a | `क्लाइंट` | Microsoft `ग्राहक सहायता` [MS-hi] | `ग्राहक के लिए एक ईमेल` |

### 11.7 Propuestas de Weë que valida el revisor

| Español | Propuesta | Alternativa |
|---|---|---|
| Mis creaciones | `मेरी रचनाएँ` | `लाइब्रेरी` (así llama Gemini a lo generado) [G-GEM] |
| Especialistas (Weë AI) | `एक्सपर्ट` (m) | `विशेषज्ञ` (Microsoft; más formal) [MS-hi § 3] |
| Recargar (Credits) | `Credits जोड़ें` | `रिचार्ज करें` (en India es la recarga del móvil) |
| Tú eliges el resultado. Weë elige la IA. | `नतीजा आप चुनें. AI Weë चुनेगा.` | — |
| Cuéntale a Weë lo que quieres. Weë se encarga de la IA. | `Weë को बताएँ कि आपको क्या चाहिए. AI का काम Weë संभालेगा.` | — |
| No me salió bien. No te cobré. | `यह ठीक से नहीं बना. आपके Credits नहीं काटे गए.` | — |

## 12. Lo que no se traduce

Las marcas (§ 6); lo que escribe una persona —publicaciones, comentarios, nombres de comunidades y proyectos,
prompts—; identificadores, rutas, emojis y los valores que viajan al servidor.

## 13. Decisiones donde las fuentes no coinciden

| Tema | Opciones | Elegido | Por qué |
|---|---|---|---|
| Fin de frase | «.» (Google, Meta, Microsoft, Spotify, Paytm, Flipkart; Unicode lo da por normal) / «।» (CHD, Mozilla, Apple, PhonePe, Swiggy, Zomato, JioHotstar, ShareChat) | **«.»** | Es la convención de las plataformas y las redes que la gente usa a diario y la regla explícita de Microsoft. Mezclar es lo único que está mal: si el dueño prefiere «।», se cambia de una vez y la prueba lo vigila |
| Chandrabindu | ँ donde toca (CHD, Microsoft, Meta, Apple, Spotify) / solo ं (Android, ayuda de Google, apps indias) | **La norma del CHD** | Es la norma, la usan Meta, Apple y Microsoft, y distingue palabras; el buscador las iguala (§ 8) |
| Nukta | फ़ ज़ siempre (Google, Meta, Apple, CLDR) / irregular (Microsoft, apps indias) / también en क़ ख़ ग़ (Gemini) | **फ़ ज़ sí; क़ ख़ ग़ no** | Coherencia con `Intl` y con Android; Microsoft y el CHD desaconsejan क़ ख़ ग़ |
| IA | AI / एआई | **AI** | Siglas sin localizar (Microsoft); la marca `Weë AI` está al lado; Canva web, Spotify, Meta |
| Iniciar sesión | साइन इन करें / लॉग इन करें | **साइन इन करें** | Android y Apple; el inglés de Weë dice «Sign in» |
| Guardar | सेव करें / सहेजें | **सेव करें** | Android y Google Fotos; `सहेजें` es la voz de Windows y de Apple |
| Editar | एडिट करें / बदलाव करें / संपादित करें | **एडिट करें** | Las herramientas de creación (Gemini, Canva, Spotify); `बदलाव` queda libre para «cambio»; `संपादित` es formal |
| Privacidad | निजता / प्राइवेसी / गोपनीयता | **निजता** | Android y Google; palabra hindi corriente |
| Cuenta | खाता / अकाउंट | **खाता** | Android, Google y Microsoft |
| Configuración | सेटिंग / सेटिंग्स | **सेटिंग** | Android; el hindi no pluraliza en -s |
| Notificaciones | सूचनाएँ / नोटिफ़िकेशन / अधिसूचनाएँ | **सूचनाएँ** | Android y Apple |
| Denunciar | रिपोर्ट करें / शिकायत करें | **रिपोर्ट करें** | Android y WhatsApp |
| Música | संगीत / म्यूज़िक | **संगीत** | Android y la música con IA de YouTube |
| Imagen | इमेज / छवि / तस्वीर | **इमेज** | Google (Android, Gemini), para lo generado |
| Mensaje | मैसेज / संदेश | **मैसेज** | Android, WhatsApp, Gmail |
| Me gusta | पसंद करें / लाइक करें | **पसंद करें** | YouTube; lo de Meta no se pudo ver |
| Seguidores | फ़ॉलोअर / फ़ॉलोअर्स | **फ़ॉलोअर** | Spotify; el plural lo pone el hindi |
| Ayuda | मदद / सहायता | **मदद** | El nombre de los centros de ayuda de Google, Instagram, WhatsApp y Spotify |
| Omitir | अभी नहीं / स्किप करें | **अभी नहीं** | Android |
| Plantilla | टेंप्लेट / टेम्प्लेट | **टेंप्लेट** | Google e Instagram; regla de la nasal del CHD |
| Comunidad | कम्यूनिटी / कम्युनिटी / समुदाय | **कम्यूनिटी** | YouTube y Android |
| Nombre del idioma | हिन्दी / हिंदी | **हिन्दी en el selector; हिंदी en el texto** | El selector enseña lo que la persona ve en todos los selectores (CLDR); el texto sigue la norma |
| Lista de `Intl` | `A, B, और C` (CLDR largo) / `A, B और C` (WhatsApp, Microsoft, Gemini) | **Lo que dé `Intl`**; a mano, sin coma (§ 7) | Es un dato de CLDR y la arquitectura no arma listas a mano; si la coma molesta, se discute con CLDR, no se parchea |

## 14. Cómo se revisa

1. **Durante la traducción**, un validador de trabajo por módulo: huecos, marcas, NFC, `तुम`/`तू` e imperativos en
   -ओ, préstamos sin nukta, `ड़`/`ढ़` sin punto, nukta en क ख ग, chandrabindu, cifras devanagari, «।», ZWJ, matras mal
   codificadas, barras de género, `%`, `…` y la regla del `_one`.
2. **Dos revisiones independientes** del diccionario entero: una de **exactitud** (sentido frente al español,
   gramática, concordancia de género, ortografía) y otra de **naturalidad** (¿lo escribiría así un equipo de producto
   indio?, ¿cabe?, ¿usa el glosario?).
3. **`functions/test/i18n-hindi.test.mjs`**: lo comprobable de esta guía contra el diccionario entero, en la cadena de
   `npm test`.
4. **`functions/test/i18n-nombres-propios.test.mjs`**: las deformaciones hindi de las marcas (§ 6).
5. **Capturas** en la web con `hi-IN` (recortes, fuentes de reserva, pesos, `letterSpacing`); en un teléfono Android y
   un iPhone antes de abrirlo a gente.

## 15. Pendiente de decidir o de verificar

Decidido en esta primera versión (se puede cambiar en bloque, y la prueba vigila que no se mezcle):

- **Fin de frase «.»** (§ 7, § 13).
- **Weë Brain**: formas sin género primero; masculino si no hay otra (§ 5.3).
- **`hi-Latn` recibe devanagari** (§ 1). Si algún día se prefiere inglés para ese aparato, es una regla del resolutor,
  no del diccionario.
- **Búsqueda**: `paraBuscar` iguala nukta, chandrabindu y ZWJ (§ 8).
- **Rótulos espaciados**: `sinEspaciadoSiSeUne` quita el `letterSpacing` en las escrituras que se unen (§ 9).
- **Pestaña «Me gusta» del perfil**: `पसंद`, porque la forma larga no cabe en cuatro pestañas (§ 11).

Pendiente, fuera de lo que decide quien traduce:

1. **Fuente**: Inter no tiene devanagari. Hoy el hindi sale en la fuente del sistema. Empaquetar Noto Sans Devanagari
   (sobre todo en la web) sería una decisión de producto por su peso; las capturas dicen si hace falta.
2. **Calendario**: `hi-IN` empieza la semana en domingo; `DateRangePicker` la empieza en lunes. Pasa lo mismo con
   `en-US`, `ja-JP` o `pt-BR`: es de la capa común, no del hindi.
3. **Contadores de caracteres**: cuentan unidades UTF-16, no letras visibles (`राम` son 3 unidades): el límite de un
   nombre deja algo menos de letras en hindi que en español.
4. **Revisión nativa** antes de abrir el hindi a gente: las filas «validar», `मेरी रचनाएँ`, `एक्सपर्ट`,
   `Credits जोड़ें`, si «0 टिप्पणी» suena bien y el plural de `कम्यूनिटी` con cifra.

## Fuentes

Consultadas el 2026-09-30.

- **[MS-hi]** Microsoft Hindi Localization Style Guide (PDF de 2024-09-05), desde
  https://learn.microsoft.com/en-us/globalization/reference/microsoft-style-guides —
  https://download.microsoft.com/download/2/b/5/2b543b85-0ed4-49a7-8b3a-98ffa7addcfb/hin-ind-StyleGuide.pdf
  (§§ 2.1, 2.1.1, 2.2, 3.1, 4.1.2, 4.1.7, 4.1.11, 4.1.12, 4.1.14, 4.1.15, 5.3, 5.4.2)
- **[CHD]** केंद्रीय हिंदी निदेशालय, *देवनागरी लिपि एवं हिंदी वर्तनी का मानकीकरण*, edición 2024 —
  https://www.chd.education.gov.in/sites/default/files/devanagari-lipi.pdf (§§ 2.2, 3.1.2, 3.6.2, 3.7, 3.14.1,
  3.15.1, 3.15.2, 3.16.2)
- **[MS-ACC]** Cuenta Microsoft en hindi — https://account.microsoft.com/about?lang=hi-IN
- **[MOZ]** Mozilla, Hindi (hi-IN) style guide — https://mozilla-l10n.github.io/styleguides/hi-IN/
- **[UNI-ch12]** The Unicode Standard 18.0, cap. 12 (§ 12.1 Devanagari) —
  https://www.unicode.org/versions/Unicode18.0.0/core-spec/chapter-12/
- **[UCD-CE]** CompositionExclusions-18.0.0.txt — https://www.unicode.org/Public/UCD/latest/ucd/CompositionExclusions.txt
- **[CLDR]** CLDR 48 `hi.xml` — https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/main/hi.xml ;
  plurales y ordinales — https://raw.githubusercontent.com/unicode-org/cldr/main/common/supplemental/plurals.xml ,
  https://raw.githubusercontent.com/unicode-org/cldr/main/common/supplemental/ordinals.xml
- **[Node]** Node v24.19.0, ICU 78.3, CLDR 48.0, Unicode 17.0 (ejecución local)
- **[AOSP]** Android, `values-hi/strings.xml` de la rama `main`: núcleo
  https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/core/res/res/values-hi/strings.xml ,
  SystemUI https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/packages/SystemUI/res/values-hi/strings.xml ,
  Settings https://android.googlesource.com/platform/packages/apps/Settings/+/refs/heads/main/res/values-hi/strings.xml ,
  DocumentsUI https://android.googlesource.com/platform/packages/apps/DocumentsUI/+/refs/heads/main/res/values-hi/strings.xml
- **[AOSP-fonts]** https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/data/fonts/fonts.xml
- **[G-YT]** Ayuda de YouTube en hindi — https://support.google.com/youtube/answer/57741?hl=hi ,
  https://support.google.com/youtube/answer/9482367?hl=hi ,
  https://support.google.com/youtube/answer/6083270?hl=hi&co=GENIE.Platform%3DAndroid ,
  https://support.google.com/youtube/answer/7124474?hl=hi&co=GENIE.Platform%3DAndroid ,
  https://support.google.com/youtube/answer/15739414?hl=hi
- **[G-PH]** Google Fotos — https://support.google.com/photos/answer/6128858?hl=hi ,
  https://support.google.com/photos/answer/7378858?hl=hi
- **[G-GM]** Gmail — https://support.google.com/mail/answer/8154?hl=hi , https://support.google.com/mail/answer/2819488?hl=hi ,
  https://support.google.com/mail/answer/6584?hl=hi · **[G-ACC]** https://support.google.com/accounts/answer/27441?hl=hi
- **[G-GEM]** Gemini — https://support.google.com/gemini/answer/13275745?hl=hi ,
  https://support.google.com/gemini/answer/14286560?hl=hi
- **[G-MAPS]** https://support.google.com/maps/answer/144339?hl=hi , https://support.google.com/maps/answer/6291838?hl=hi ·
  **[G-NEWS]** https://support.google.com/googlenews/answer/9005749?hl=hi · **[G-GROUPS]**
  https://support.google.com/groups/answer/1067205?hl=hi (título visto en el buscador) · **[G-DOCS]**
  https://support.google.com/docs/answer/148505?hl=hi · **[G-DEV]** https://developers.google.com/workspace/guides/create-project?hl=hi
- **[G-POL]** https://policies.google.com/privacy?hl=hi , https://policies.google.com/terms?hl=hi
- **[WA]** https://www.whatsapp.com/?lang=hi , https://www.whatsapp.com/privacy?lang=hi ,
  https://play.google.com/store/apps/details?id=com.whatsapp&hl=hi
- **[IG]** https://www.instagram.com/accounts/login/?hl=hi , https://play.google.com/store/apps/details?id=com.instagram.android&hl=hi
- **[FB]** https://hi-in.facebook.com/
- **[APPLE]** Cadenas hindi de iOS 26, índice https://applelocalization.com/
- **[SPOT]** https://support.spotify.com/in-hi/ , https://support.spotify.com/in-hi/article/follow-friends-manage-followers/ ,
  https://support.spotify.com/in-hi/article/notification-settings/
- **[CANVA]** https://www.canva.com/hi_in/
- **[PLAY-IN]** Fichas de Google Play en hindi (`&hl=hi`) de Paytm, PhonePe, Flipkart, Swiggy, Zomato, JioHotstar,
  ShareChat, Moj, Spotify, Canva y YouTube — `https://play.google.com/store/apps/details?id=<id>&hl=hi` con
  `net.one97.paytm`, `com.phonepe.app`, `com.flipkart.android`, `in.swiggy.android`, `com.application.zomato`,
  `in.startv.hotstar`, `in.mohalla.sharechat`, `in.mohalla.video`, `com.spotify.music`, `com.canva.editor`,
  `com.google.android.youtube`
- **[PHONEPE]** Ayuda de PhonePe en hindi, títulos vistos en el buscador — https://cms.phonepe.com/hi/myhelp/
- **[BSKY]** Catálogo hindi de Bluesky — https://raw.githubusercontent.com/bluesky-social/social-app/main/src/locale/locales/hi/messages.po ;
  **[MASTO]** Mastodon — https://raw.githubusercontent.com/mastodon/mastodon/main/app/javascript/mastodon/locales/hi.json
- **[MD]** Material Design, tipografía — https://m1.material.io/style/typography.html
- **[APPLE-FONTS]** https://developer.apple.com/fonts/system-fonts/ · **[MS-FONT]**
  https://learn.microsoft.com/en-us/typography/font-list/nirmala-ui · **[GFONTS]**
  https://fonts.googleapis.com/css2?family=Inter:wght@400;700 , https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700
- **[W3C-ilreq]** Indic Layout Requirements — https://www.w3.org/TR/ilreq/
- **[Medición]** Anchos y alto de tinta con WPF `FormattedText` en Windows 11 (Segoe UI / Nirmala UI), ejecución local
