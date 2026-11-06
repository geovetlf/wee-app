# El eslogan de Weë, por idioma

**Decisión del dueño, 2026-11-04 (DEFINITIVA):** el eslogan de Weë **se localiza** según el idioma elegido en la app.
Sustituye a la decisión del 2026-11-03, que lo dejaba igual («Imagine · Create · Connect») en todos los idiomas.

## Reglas

1. **«Weë» no se traduce nunca** y no va dentro del eslogan: el título lo pone delante (`Weë - <eslogan>`).
2. Tres conceptos — **IMAGINAR · CREAR · CONECTAR** — traducidos de forma natural e idiomática, no palabra por palabra,
   con el mismo registro de marca (imperativo o la forma que cada idioma usa en sus lemas) en las tres partes.
3. Tres partes separadas por **« · »**: espacio normal, punto medio U+00B7, espacio normal. Sin punto final.
4. Fijados por el dueño: en «Imagine · Create · Connect», es «Imagina · Crea · Conecta», fr «Imaginez · Créez ·
   Connectez», it «Immagina · Crea · Connetti».
5. La frase de Weë Brain (`brain.slogan`, «Imagina · Consulta · Crea · Conecta») es **otra cosa** y no cambia.

## Arquitectura

- **Una sola clave:** `nav.brandSlogan`, en `i18n/textos/<idioma>/nav.ts`. Está en `nav` porque es donde vive
  `nav.documentTitle`, la otra superficie de marca de toda la app, y así las dos viajan juntas.
- **Firma del Home:** `components/Header.tsx` pinta `{t('nav.brandSlogan')}` (antes, la constante `LEMA_DE_MARCA`
  escrita a mano en español).
- **Título de la pestaña (web):** `nav.documentTitle` es `'Weë - {{eslogan}}'` (raya media «–» en bs, da, de-CH, is, pl y sv, como
  ya tenían) y `App.tsx` lo resuelve con `t('nav.documentTitle', { eslogan: t('nav.brandSlogan') })`: interpolación,
  nunca concatenación.
- **Cambio de idioma:** React Navigation solo reescribe `document.title` al navegar o cuando cambian las opciones de
  la pantalla. `TituloAlCambiarDeIdioma` (en `App.tsx`, dentro del `NavigationContainer`) escucha al traductor y, al
  cambiar, vuelve a pasar el título actual por el mismo formateador. Sin él, la pestaña seguía en la lengua anterior
  hasta la siguiente navegación.
- **Superficies estáticas (un solo idioma):**
  - `app.json` → `expo.web.name` (nombre del manifiesto web/PWA): un manifiesto estático tiene un único idioma. Va en
    **español**, «Weë - Imagina · Crea · Conecta», porque es la lengua molde del producto (los diccionarios se tipan
    contra `es`) y la misma en la que ya está la `description` de ese manifiesto. Limitación: quien instale la PWA con
    la app en otro idioma verá el nombre en español; la pestaña, en cambio, sí sigue su idioma.
  - `public/landing.html` → `<title>`, `og:title`, `twitter:title` y `<h1>`: la página entera está en español
    (`lang="es"`) y se sirve como archivo estático desde Firebase Hosting (`firebase.json` reescribe «/» a ella) y
    desde la web de Expo; no hay servidor que la entregue según `Accept-Language` ni parámetro `?hl=`. Se deja en
    **español**, coherente con el resto de la página. No se inventa infraestructura: localizarla exigiría una página
    por idioma o un servidor, y es una decisión aparte.

Lo vigila `functions/test/eslogan-localizado.test.mjs` (los 42 idiomas).

## Implementado en código: los 42 diccionarios de la app (2026-11-05)

Integrado en `ui/migracion-demo` sobre los 42 idiomas de la oleada global (A: 40, B: is + kl).

> **Ninguna traducción tiene revisión nativa**, salvo las cuatro que fijó el dueño (decisión de producto). Las demás
> son redacción de agentes de IA con criterio de marca. En el registro de revisión (`i18n/revision/<idioma>/registro.json`)
> `nav.brandSlogan` no tiene entrada, así que cuenta como **sin revisar**; y `nav.documentTitle`, que en 22 idiomas
> tenía una revisión de agente, cambió de texto y el mecanismo lo marca solo como **«cambió»** (pendiente de nuevo).
> Origen: **F** fijado por el dueño · **R-código** ya estaba en el código de `branding/eslogan-localizado` ·
> **R-prop** propuesta de esta misma tabla reutilizada · **ADAPT** propuesta ajustada al registro o al léxico del
> diccionario de destino (su `brain.slogan` y su trato).

| # | Código | Idioma | Eslogan | Título | Origen | Nota |
|---|---|---|---|---|---|---|
| 1 | es | Español | Imagina · Crea · Conecta | Weë - | F | |
| 2 | en | Inglés | Imagine · Create · Connect | Weë - | F | |
| 3 | fr | Francés | Imaginez · Créez · Connectez | Weë - | F | |
| 4 | it | Italiano | Immagina · Crea · Connetti | Weë - | F | |
| 5 | de | Alemán | Träumen · Erschaffen · Verbinden | Weë - | R-código | |
| 6 | de-CH | Alemán de Suiza | Träumen · Erschaffen · Verbinden | Weë – | R-prop | igual que `de` a propósito |
| 7 | pt | Portugués de Brasil (oficial) | Imagine · Crie · Conecte | Weë - | R-código | você |
| 8 | pt-PT | Portugués europeo | Imagina · Cria · Conecta | Weë - | R-código | |
| 9 | da | Danés | Drøm · Skab · Forbind | Weë – | R-código | |
| 10 | sv | Sueco | Dröm · Skapa · Koppla ihop | Weë – | R-código | |
| 11 | nb | Noruego bokmål | Drøm · Skap · Koble sammen | Weë - | R-prop | |
| 12 | is | Islandés | Ímyndaðu þér · Skapaðu · Tengstu | Weë – | R-prop | mismo léxico que su `brain.slogan` |
| 13 | kl | Groenlandés (kalaallisut) | Takorluuigit · Pilersitsigit · Attaveqarit | Weë - | ADAPT | **Kalaallisut, nunca danés.** La propuesta decía «Eqqarsaarit» (‘piensa’); va «Takorluuigit» (‘imagina’), el verbo de su `brain.slogan`, y «Pilersitsigit» es su `nav.create`. Confianza muy baja: revisión nativa obligatoria |
| 14 | tr | Turco | Hayal et · Yarat · Bağlan | Weë - | R-código | |
| 15 | ru | Ruso | Воображать · Создавать · Объединяться | Weë - | R-código | infinitivo (la app trata de вы) |
| 16 | hi | Hindi | कल्पना करें · बनाएँ · जुड़ें | Weë - | R-código | |
| 17 | ja | Japonés | 想像する · 創る · つながる | Weë - | R-código | |
| 18 | ko | Coreano | 상상 · 창작 · 연결 | Weë - | R-código | |
| 19 | zh | Chino simplificado | 想象 · 创作 · 连接 | Weë - | R-código | |
| 20 | zh-TW | Chino tradicional | 想像 · 創作 · 連結 | Weë - | R-código | |
| 21 | ar | Árabe | تخيّل · أبدع · تواصل | Weë - | R-prop | RTL |
| 22 | he | Hebreo | לדמיין · ליצור · להתחבר | Weë - | ADAPT | RTL. Infinitivo en vez del imperativo plural propuesto: el diccionario hebreo evita el imperativo (forma neutra) y su `brain.slogan` usa infinitivos |
| 23 | fa | Persa | تصور کنید · بسازید · ارتباط بگیرید | Weë - | ADAPT | RTL. Trato de شما, como todo su diccionario y su `brain.slogan` (la propuesta tuteaba) |
| 24 | id | Indonesio | Bayangkan · Ciptakan · Terhubung | Weë - | R-prop | |
| 25 | ms | Malayo | Bayangkan · Cipta · Berhubung | Weë - | R-prop | |
| 26 | hr | Croata | Zamisli · Stvori · Poveži se | Weë - | R-prop | = bs = sr-Latn = cnr a propósito |
| 27 | bs | Bosnio | Zamisli · Stvori · Poveži se | Weë – | R-prop | |
| 28 | sr | Serbio (cirílico) | Замисли · Створи · Повежи се | Weë - | R-prop | |
| 29 | sr-Latn | Serbio (latino) | Zamisli · Stvori · Poveži se | Weë - | R-prop | |
| 30 | cnr | Montenegrino | Zamisli · Stvori · Poveži se | Weë - | R-prop | |
| 31 | pl | Polaco | Wyobraź sobie · Twórz · Łącz się | Weë – | R-prop | |
| 32 | ca | Catalán | Imagina · Crea · Connecta | Weë - | R-prop | |
| 33 | el | Griego | Φαντάσου · Δημιούργησε · Συνδέσου | Weë - | R-prop | |
| 34 | nl | Neerlandés | Verbeeld · Creëer · Verbind | Weë - | R-prop | |
| 35 | vi | Vietnamita | Tưởng tượng · Sáng tạo · Kết nối | Weë - | R-prop | |
| 36 | hu | Húngaro | Képzeld el · Alkoss · Kapcsolódj | Weë - | R-prop | |
| 37 | fi | Finés | Kuvittele · Luo · Yhdistä | Weë - | R-prop | |
| 38 | mn | Mongol | Төсөөл · Бүтээ · Холбогд | Weë - | R-prop | |
| 39 | fil | Filipino | Mangarap · Lumikha · Kumonekta | Weë - | R-prop | |
| 40 | ga | Irlandés | Samhlaigh · Cruthaigh · Nasc | Weë - | ADAPT | «Nasc» (conectar), el verbo de su `brain.slogan`, en vez de «Ceangail» (‘atar’) |
| 41 | km | Jemer | ស្រមៃ · បង្កើត · តភ្ជាប់ | Weë - | ADAPT | «តភ្ជាប់» (conectar), como su `brain.slogan`, en vez de «ភ្ជាប់» (adjuntar) |
| 42 | ro | Rumano | Imaginează · Creează · Conectează | Weë - | R-prop | |

Recuento: 4 F · 12 R-código · 21 R-prop · 5 ADAPT. Ninguno es igual al español ni al inglés salvo los suyos, y ninguno
pisa la frase de Weë Brain (tres partes frente a cuatro).

### Coincidencias entre idiomas que son reales

hr = bs = sr-Latn = cnr (mismas palabras en las normas serbocroatas en alfabeto latino) y de = de-CH (el alemán
escrito suizo no difiere en estas tres palabras). Están declaradas, como grupos exactos, en `IGUALES_A_PROPOSITO`.

### Idiomas de derecha a izquierda (ar, he, fa)

- El orden lógico es el de los demás idiomas (imaginar → crear → conectar); el navegador lo dibuja de derecha a
  izquierda y la primera palabra queda a la derecha. El punto medio U+00B7 es neutro en bidi.
- El título conserva «Weë - {{eslogan}}», como ya lo tenían esos diccionarios: «Weë» es el primer carácter fuerte
  (LTR) y el eslogan se dibuja RTL dentro. No se meten aislantes bidi (U+2068…U+2069) en `document.title` porque
  algunos navegadores los pintan como cajas.

### Lo que no se localiza (límites de lo estático)

- `app.json` → `expo.web.name` (manifiesto PWA): un solo idioma, español. La pestaña sí sigue el idioma.
- `public/landing.html` (`<title>`, `og:title`, `twitter:title`, `<h1>`): página estática en español, sin servidor
  por idioma. Las vistas previas de redes sociales leen ese HTML, así que salen en español.
- Los nombres de la app en iOS/Android (`locales/*.json`) no llevan eslogan.
- Localizar cualquiera de ellos exige una página por idioma o un servidor: es una decisión aparte del dueño.
