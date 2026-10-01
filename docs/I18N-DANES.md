# I18N-DANES — el danés de Weë (`da` / `da-DK`)

> Guía de estilo y glosario canónico para quien escriba, revise o amplíe el danés de Weë: hoy y cuando lleguen módulos
> nuevos (3D, Weë Music, Weë Travel, Weë Inspira…). La arquitectura común está en [`I18N.md`](I18N.md); aquí solo lo que
> es del danés. Las decisiones salen de fuentes (lista al final) y, donde las fuentes no coinciden, la tabla del § 11
> dice qué se eligió, qué se descartó y por qué.
>
> Lo que esta guía pide y se puede comprobar lo comprueba `functions/test/i18n-danes.test.mjs`. Lo que no —naturalidad,
> tono, contexto— es trabajo de quien escribe y de quien revisa.

## 0. Lo esencial

1. **No se traduce del español palabra a palabra.** Se entiende qué hace la cadena y se escribe lo que escribiría un
   equipo de producto danés: frases cortas, hechos, nada de retórica ni de entusiasmo inflado. [MS §2] [BDK 3.1]
2. **«Du», siempre**; «vi» cuando Weë habla de lo que hace por la persona. Nunca «De» de cortesía. Sin «venligst».
3. **Mayúscula solo al principio** (`Rediger profil`) y en los nombres propios. Días, meses e idiomas en minúscula.
4. **Las palabras compuestas se escriben juntas**: `profilbillede`, `brugernavn`, `adgangskode`. Partirlas
   (*særskrivning*) es el error más visible del danés escrito. [DSN] [MS 4.1.7]
5. **æ ø å siempre**, nunca ä ö (sueco) ni palabras noruegas (§ 3).
6. **Las marcas de Weë, intactas y sin declinar**: ni `Weës` ni `WeeTalken`. Con preposición (`på Weë`, `i WeeTalk`) o
   en un compuesto con guion (`Weë-profil`, `Weë Studio-projekt`).
7. **El plural sí cambia** (`1 kommentar` / `3 kommentarer`), y **el `one` danés no es solo el 1**: 0,5 y 1,5 también
   son `one`. Ningún `_one` escribe un «1» a mano: usa `{{contador}}`.
8. **Consistencia:** un concepto, una palabra: la del glosario (§ 9).

## 1. Idioma, locale y lo que ya resuelve la arquitectura

| | |
|---|---|
| Idioma | `da`, diccionario en `i18n/textos/da/` |
| Locale principal | `da-DK` (en `LOCALES_CONTEMPLADOS`) |
| Variantes | Ninguna |
| Respaldo | `da-DK` → `da` → `en`, clave a clave |
| Plural | `Intl.PluralRules('da')`: `one` (1, y también 0,5 o 1,5) y `other` (0, 2, 2,5…) |
| Formatos | `Intl` con el locale: `1. oktober 2026`, `01.10.2026`, `14.30`, `1.234.567,89`, `1.234,50 kr.`, `60 %`, `for 3 dage siden`, `i går`, `A, B og C` |
| Web | `<html lang="da">`, lo escribe `IdiomaContext` |
| Pantalla de error | Su fila `da` en `components/ErrorBoundary.tsx` |

**Los formatos no se escriben a mano**: salen de `i18n/formato.ts`. El separador de miles es el punto y el decimal la
coma; el espacio antes de `%` y de `kr.` es fijo (U+00A0). [CLDR 48]

## 2. Tono y registro

| Tipo de cadena | Forma | Ejemplo |
|---|---|---|
| Botón, acción de menú | Imperativo, mayúscula de frase, sin punto, 1–3 palabras | `Gem`, `Annuller`, `Rediger profil`, `Kopiér link` |
| Título de pantalla o de ayuda | Sustantivo, sin punto | `Indstillinger`, `Blokerede konti` |
| Instrucción | «Hvis du vil X, skal du …» o «Vælg Y for at X»; con «du» | `Tryk på Rediger profil for at skifte billede.` |
| Mensaje informativo | Frase corta con punto, en presente | `Ændringerne er gemt.` |
| Error | Frase completa, con artículo, punto final y el paso siguiente; sin culpar | `Filen kunne ikke uploades. Prøv igen.` |
| Confirmación | «Vil du …?»; «Er du sikker på, at du vil …?» solo si se pierde algo para siempre | `Vil du slette opslaget? Det kan ikke fortrydes.` |
| Estado vacío | «Ingen … endnu» o una frase que invita | `Ingen opslag endnu` |
| Éxito | Corto; un «!» de vez en cuando | `Kopieret!` |
| Etiqueta del lector de pantalla | Qué hace, en imperativo o sustantivo corto, sin «knap» detrás | `Åbn menuen`, `Synes godt om` |
| Pista del lector (hint) | Tercera persona, presente | `Åbner indstillingerne` |
| Weë Brain, conversación | Cercano y breve, «du» | `Hvor vil du hen?` |

- **Palabras de todos los días** [MS] [BDK]: `bruge` (no `benytte`), `få` (no `opnå`), `hvis` (no `såfremt`), `og` (no
  `samt`), `vores` (no `vort`), `mere`/`flere` (no `yderligere`), `hvordan` (no `hvorledes`).
- **Sin calcos del inglés**: `Læs mere` (no `Lær mere`), `Med Weë kan du …` (no `Weë tillader dig at …`),
  `kommentere` (no `kommentere på`).
- **Presente, no futuro**: `Beskeden sendes`, no `vil blive sendt`.
- **Género**: dos géneros, *en* y *et*, y concuerdan posesivo y adjetivo (`din video` / `dit billede` / `dine billeder`;
  `en ny video` / `et nyt billede`). **Nunca** se pega un sustantivo de tipo desconocido detrás de un posesivo o un
  adjetivo: o la frase se reescribe sin ellos, o cada sustantivo tiene su clave.

## 3. Escritura

- **Mayúscula de frase** en todo: botones, títulos, pestañas, menús. Los rótulos que el DISEÑO pinta en mayúsculas los
  pone el código (`TextoEnMayusculas`); los que el español ya escribe en mayúsculas en el diccionario (las secciones del
  menú) se escriben igual en danés, con su `Æ Ø Å`: es diseño, no ortografía.
- **Compuestos juntos**: `brugernavn`, `profilbillede`, `adgangskode`, `e-mailadresse`, `notifikationsindstillinger`,
  `privatlivspolitik`. Uno de más de unas 20 letras que tenga que caber en un botón se deshace con preposición:
  `Indstillinger for notifikationer`.
- **Guion obligatorio** con siglas, cifras y marcas: `AI-billede`, `AI-genereret`, `pdf-fil`, `4K-video`, `18-årig`,
  `Weë-profil`. Con una marca de varias palabras, el guion va solo antes del último elemento: `Weë Studio-projekt`.
- **`AI`** en mayúsculas. Siglas comunes en minúscula: `pdf`, `sms`, `pc`, `tv`, `it`.
- **Préstamos admitidos por la Retskrivningsordbogen**: `app`, `chat`, `feed`, `like`, `hashtag`, `design`,
  `storyboard`, `uploade`, `downloade`, `streame`, `prompt`. Se flexionan como daneses (`appen`, `chatten`, `prompten`),
  salvo las marcas.
- **Imperativos en -ér**: acento solo donde sin él se leería otra palabra (regla de Microsoft, la que sigue Google):
  `Generér`, `Kopiér`, `Rapportér`, `Markér`, `Sortér`, `Arkivér`, `Kontrollér`, `Notér`, `Importér`, `Eksportér`,
  `Publicér`*. El resto, sin acento: `Rediger`, `Annuller`, `Bloker`, `Aktiver`, `Installer`, `Reducer`. (*`Publicér`
  solo si aparece; la acción social es `Slå op`.)
- **Imperativos que acaban en grupo consonántico** se evitan: `Ændr` → `Skift` o `Rediger`.
- **Interferencias que hay que cazar**: noruego `innstillinger`, `passord`, `logg inn`, `lukk`, `søk`, `hjelp`, `tilbake`,
  `neste`, `ferdig`, `slett`, `bruker`, `avbryt`, `kanskje`; sueco `ä`, `ö`, `och`, `inte`, `inställningar`. En danés:
  `indstillinger`, `adgangskode`, `log ind`, `luk`, `søg`, `hjælp`, `tilbage`, `næste`, `færdig`, `slet`, `bruger`,
  `annuller`, `måske`, `og`, `ikke`.

## 4. Las marcas

`Weë` · `Weë AI` · `Weë Studio` · `Weë Design` · `Weë Photo` · `Weë Writer` · `Weë Music` · `Weë Beauty` · `Weë Chef` ·
`Weë Home` · `Weë Business` · `Weë Travel` · `Weë Brain` · `Weë Inspira` · `Credits` · `Weëls` (una: `en Weël`) ·
`Wäll` · `WeeTalk` · `ËContact` · `ẄContact`

- **Ni se traducen, ni se adaptan, ni se declinan, ni llevan artículo pegado.** `kreditter`, `Weë Musik`, `Weë Rejser`,
  `Weë Kok` están mal; también `WeeTalken` (forma definida) o `Weës` (genitivo). Microsoft trata los nombres de producto
  igual: sin artículo y sin flexión, y el genitivo de una marca se reformula. [MS 4.1.5, 4.1.10]
  - Preposición: `på Weë` (la plataforma), `i Weë Studio` (dentro de una sección), `med Weë AI`, `fra Weë`.
  - Compuesto con guion: `Weë-profil`, `Weë-konto`, `Weë-avatar`, `ËContact-liste`, `Weë Studio-projekt`.
- **Credits** no cambia con la cifra: `1 Credits`, `250 Credits`; lo que haya que declinar lo lleva otra palabra
  (`køb af Credits`, `brug af Credits`).
- **Los nombres de las funciones y los módulos de Weë Business** —Business Plan, Business Coach, Pricing Assistant,
  Brand Kit, Customer Insights, Business Ideas, Business Profile; y My Business, Products & Catalog, Create, Social,
  Analyze, Grow, Promote— son nombres de producto y se escriben igual en todos los idiomas (decisión del usuario,
  2026-09-16). Lo que hace cada uno sí se traduce. «SWOT» se queda como sigla: `SWOT-analyse`.

## 5. Puntuación

- **Comillas ”…”** (U+201D a los dos lados), como la guía digital del Estado danés de 2026; dentro, `’…’`. Nunca «…»
  (en danés apuntarían al revés) ni „…“. [BDK 3.15] [DSN §58]
- **`…`**, un solo carácter, sin espacio delante en la interfaz: `Indlæser…`.
- **Raya media** (U+2013) con espacios para un inciso (`Prøv igen – det plejer at virke.`) y **guion sin espacios** en
  un intervalo (`8.00-14.00`, `2015-2020`). No se usa la raya larga.
- **Coma gramatical** (con *startkomma* antes de la subordinada), como Microsoft y borger.dk; **nunca** coma antes de
  `og` en una enumeración.
- **Dos puntos**: mayúscula detrás si sigue una frase completa; minúscula si sigue una lista o un fragmento.
- **Espacio fijo** entre la cifra y la unidad: `250 Credits`, `40 %`, `1.500 kr.`.
- **Pocos signos de exclamación**; nunca `¡` ni `¿`.
- **Abreviaturas**: `fx` (no `f.eks.`), `kl.`, `kr.`, `ca.`, `osv.`, `inkl.`. [BDK 3.11]

## 6. Números, fechas, horas y plural

- **Todo lo que `Intl` sabe hacer lo hace `Intl`**: `1.234.567,89`, `−5`, `60 %`, `1.234,50 kr.`, `1. oktober 2026`,
  `01.10.2026`, `for 3 dage siden`, `i går`, `om 2 timer`, `A, B og C`. Compacto: `1,5 t`, `1,2 mio.`. [CLDR 48]
- **La hora, con punto**: `14.30`, `i dag kl. 14.30`. Es lo que da `Intl`, la tradición de Dansk Sprognævn y lo que usa
  borger.dk. Microsoft usa dos puntos; no se corrige a mano. [CLDR 48] [BDK 3.12] [DSN]
- **En una frase**, la fecha lleva «den»: `den 1. oktober 2026`.
- **El porcentaje con espacio fijo**: `{{descuento}} %` (U+00A0), nunca `{{descuento}}%`.
- **Plural**: `_one` y `_other` (las dos únicas categorías del danés). `_one` vale para 1 y también para 0,5 o 1,5, así
  que lleva `{{contador}}` y nunca un «1» escrito. El cero es `other`; un estado vacío natural (`Ingen kommentarer
  endnu`) es su propia clave, que ya existe en el español donde hace falta. Sustantivos:
  - `1 kommentar` / `3 kommentarer`, `1 billede` / `3 billeder`, `1 video` / `3 videoer`, `1 fællesskab` /
    `3 fællesskaber`, `1 følger` / `3 følgere`, `1 besked` / `3 beskeder`, `1 projekt` / `3 projekter`;
  - invariables: `1 opslag` / `3 opslag`, `1 år` / `3 år`, `1 klip` / `3 klip`, y `Credits`.
- **Orden alfabético**: æ, ø, å van detrás de la z; `Intl.Collator('da')` lo hace solo.

## 7. Longitud

El danés ocupa, de media, lo mismo o algo menos que el inglés y bastante menos que el español (el artículo va pegado al
final: `billedet`, `videoen`). El riesgo son los **compuestos largos**, que no se parten (`Notifikationsindstillinger`,
26 letras; `Fællesskabsretningslinjer`, 25). En un botón, una pestaña o un chip se deshacen con preposición antes de
tocar el diseño; y si el diseño tiene que cambiar, se deja crecer o partir la línea, **nunca se encoge la letra**. En la
web, el guionado automático funciona con `lang="da"`, que ya se escribe. [W3C] [DS-knapper]

## 8. Patrones de interfaz

| Situación | Patrón |
|---|---|
| Cargando | `Indlæser…`, `Gemmer…`, `Opretter…`, `Genererer…` |
| Hecho | `Gemt`, `Kopieret!`, `Færdig` |
| Falló | `… kunne ikke …. Prøv igen.` / `Noget gik galt. Prøv igen.` |
| Sin conexión | `Der er ingen internetforbindelse. Tjek forbindelsen, og prøv igen.` |
| Confirmar borrado | `Vil du slette …? Det kan ikke fortrydes.` + `Slet` / `Annuller` |
| Sin resultados | `Ingen resultater` / `Ingen resultater for ”{{busqueda}}”` |
| Estado vacío | `Ingen … endnu` + una invitación con «du» |
| Buscar (placeholder) | `Søg …` (`Søg efter personer`, `Søg i fællesskaber`); el buscador grande, que enumera tres cosas, `Find fællesskaber, personer og opslag` para caber en una línea a 390 px |
| Lo que se le pide a Weë Brain | imperativo y primera persona; «Analizar» es `Lav en analyse af …` (en un título de tarjeta, `Analysér`) |
| No hay suficientes Credits | `Du har ikke nok Credits.` |

## 9. Glosario canónico

### 9.1 Las palabras del encargo

| Concepto (español) | Danés | Nota / alternativa descartada |
|---|---|---|
| Weë, Weë Studio, Weë Music, Weë Design, Weë Travel, Weë Business, Weë Chef, Weë Inspira, Weë Photo, Weë Writer, Weë Beauty, Weë Home, Weë Brain, Weë AI | **igual** | Marca (§ 4) |
| Weëls | **Weëls**; una, **en Weël** | Marca |
| Wall / muro | **Wäll** | Marca, con diéresis |
| ËContact / ẄContact | **igual** | Marca |
| WeeTalk | **WeeTalk** | Marca |
| Credits | **Credits**, invariable | `kreditter` es error |
| Perfil Weë (WEE Profile) | **Weë-profil** | |
| Perfil Real (Real Profile) | **Ægte profil** (`din ægte profil`) | `Rigtig profil` se lee también «perfil correcto» |
| creador (persona) | **skaber**, pl. `skabere`; creadores de contenido, `indholdsskabere` | `creator` solo en nombres de comunidad que lo citen |
| experiencia (de Weë AI) | **oplevelse**, pl. `oplevelser` | |
| proyecto | **projekt**, pl. `projekter`; «Mis proyectos» = `Mine projekter` | |
| recurso / material (asset) | **materiale**, pl. `materialer`; un archivo concreto, `fil` | `asset` no se usa en danés corriente |
| creación | **kreation**, pl. `kreationer`; «Mis creaciones» = `Mine kreationer` | `skabelse` suena a génesis |
| prompt | **prompt** (`en prompt`, `prompten`, pl. `prompts`); `Kopiér prompt` | Lex.dk da `prompter`; se sigue a Google y Microsoft |
| generar | **Generér** (con acento); en la llamada principal, `Lav` | Sin acento, `generer` es «molestar» |
| crear | **Opret** para objetos (cuenta, comunidad, proyecto); **Lav** / **Skab** para obras (`Lav en video`) | |
| subir | **Upload** (botón); verbo `uploade` | Si se puede, la tarea: `Tilføj billede` |
| descargar | **Download** (botón); verbo `downloade` | Apple dice `Hent`; se elige la pareja de `Upload` |
| compartir | **Del** | |
| publicar | **Slå op** (una publicación); **Udgiv** (una obra o un proyecto) | |
| guardar | **Gem**; guardado, `gemt` | |
| eliminar / borrar | **Slet** | |
| cancelar | **Annuller** | `Fortryd` es «deshacer» |
| deshacer | **Fortryd** | |
| continuar | **Fortsæt** | |
| atrás / volver | **Tilbage** | |
| siguiente | **Næste** | |
| listo (botón) | **Færdig** | `Udført` descartado |
| cerrar | **Luk** | |
| configuración | **Indstillinger** | |
| cuenta | **konto**, pl. `konti` | |
| perfil | **profil**, pl. `profiler` | |
| notificaciones | **Notifikationer** | Windows dice `Meddelelser`; las apps sociales, `Notifikationer` |
| ayuda | **Hjælp** | |
| IA | **AI**; compuestos con guion (`AI-billede`) | `KI` es rara; `kunstig intelligens` solo en textos legales |
| agente | **agent** | |
| imagen | **billede**, pl. `billeder`; foto, `foto` | |
| vídeo | **video**, pl. `videoer` | |
| voz | **stemme**, pl. `stemmer` | |
| texto | **tekst** | |
| documentos | **dokumenter** | |
| arquitectura | **arkitektur** | |
| viajes | **rejser** | |
| negocio | **virksomhed** (la empresa); los negocios, `forretning` | |
| diseño | **design**, pl. `designs` | |
| música | **musik** | |
| comida / cocina | **mad** / **madlavning**; receta, `opskrift` | |
| modelo (de IA) | **model** / **AI-model** | |
| archivo | **fil** | |
| borrador | **kladde** | |
| plantilla | **skabelon** | |
| resultado | **resultat** | |
| versión | **version** | |
| estilo | **stil** | |

### 9.2 Lo social

| Español | Danés | Nota |
|---|---|---|
| Inicio | **Hjem** | |
| Buscar | **Søg** | |
| Explorar | **Udforsk** | |
| Comunidad | **fællesskab**, pl. `fællesskaber`; crear, `Opret fællesskab` | |
| Publicación | **opslag** (invariable) | |
| Mensajes / chat | **Beskeder** / **chat** | |
| Me gusta | acción **Synes godt om**; el número, **likes** | |
| Comentario / comentar | **kommentar** / **Kommenter** | |
| Responder | **Svar** | |
| Repost | **Del igen**, `delt igen` | `Slå op igen` (LinkedIn) suena a publicar lo propio otra vez |
| Seguir / siguiendo / seguidores | **Følg** / **Følger** / **følgere**; dejar de seguir, `Stop med at følge` | |
| Guardados | **Gemte** | |
| Denunciar | **Anmeld**, `anmeldelse` | Meta y la DSA danesa; `Rapportér` (Google) descartado |
| Bloquear | **Bloker**; desbloquear, `Fjern blokering` | |
| Silenciar | **Slå lyden fra** (sonido); una conversación, `Slå notifikationer fra` | Para una persona no hay término estable: se dice lo que pasa |
| Mención | **omtale**; mencionar, `nævne` | |
| Hashtag | **hashtag**, pl. `hashtags` | |
| Tendencias | **Populært** | |
| Copiar enlace | **Kopiér link** | |
| Encuesta | **afstemning**; voto `stemme`; opción `valgmulighed` | |

### 9.3 Cuenta y acceso

| Español | Danés |
|---|---|
| Iniciar sesión | **Log ind** (nunca mezclar con `Log på`/`Log af`) |
| Cerrar sesión | **Log ud** |
| Registrarse / crear cuenta | **Opret konto** |
| Contraseña | **adgangskode**; ¿la olvidaste? `Har du glemt din adgangskode?` |
| Correo | **e-mail**, `e-mailadresse` |
| Verificar | **Bekræft**, `bekræftelse` |
| Invitado | **gæst** |
| Nombre de usuario | **brugernavn** |

### 9.4 Crear con IA

| Español | Danés |
|---|---|
| Cómo lo hice | **Sådan lavede jeg det** |
| especialista | **specialist** (los de Weë AI: `Weë-specialister`) |
| marca de agua | **vandmærke** (`Weë-vandmærke`) |
| relación de aspecto | **Billedforhold**; formato de destino, `Format` |
| resolución | **opløsning** |
| recortar | **Beskær** |
| línea de tiempo | **tidslinje** |
| dictar | **Diktér** |

### 9.5 Estados y avisos

| Español | Danés |
|---|---|
| Algo salió mal | **Noget gik galt.** |
| Inténtalo de nuevo | **Prøv igen** |
| Cargando… | **Indlæser…** |
| Sin resultados | **Ingen resultater** |
| Error | **Fejl** |
| Aceptar (aviso) | **OK** |
| Próximamente | **Kommer snart** |
| Ups | **Hovsa** (título de un fallo, sin exclamación) |

### 9.6 Ámbitos

| Ámbito | Español → danés |
|---|---|
| Credits y dinero | saldo `saldo` · no tienes suficientes `Du har ikke nok Credits` · recargar `Tank op` / `optankning` · coste `pris` · de prueba `test-` (`testpris`, `testoptankning`) · recibidos / usados `Modtaget` / `Brugt` · cobrar `trække` (`Der er ikke trukket nogen Credits`) · devolver `få tilbage` / `refundering` |
| Publicar y social | visibilidad pública `Offentlig` · vistas `visninger` · destacado `fremhævet` · unirse / miembro / salir `Bliv medlem` / `Medlem` / `Forlad` · oficial `Officiel` |
| Perfil y cuenta | nombre visible `Visningsnavn` · biografía `Bio` · portada `coverbillede` · alias del Perfil Weë `alias` · opcional `valgfrit` · ej. `fx` · condiciones `Vilkår` · privacidad `Privatliv` / `Privatlivspolitik` · permisos `Tilladelser` · ubicación `placering` |
| ËContact y WeeTalk | solicitud `anmodning` · aceptar / rechazar / retirar `Accepter` / `Afvis` / `Træk tilbage` · mensajes efímeros `Forsvindende beskeder` · ver una vez `Vis én gang` · adjuntar `Vedhæft` · nota de voz `talebesked` · tema del chat `Farvetema` · nuevo chat `Ny chat` · notificaciones push `Push-notifikationer` |
| Weë Studio (cámara) | encuadre `Billedudsnit` · ángulo `Vinkel` · objetivo `Objektiv` · plano de situación / abierto / medio / corto `Oversigtsbillede` / `Total` / `Halvnær` / `Nærbillede` (la escala de Filmcentralen: total, halvtotal —de las rodillas arriba—, halvnær —de la cintura—, nær, ultranær) · a ojo de pájaro `Fugleperspektiv` · dron `Drone` · hora dorada `Den gyldne time` · regla de tercios `Tredjedelsreglen` · travelling `Kør ind` / `Kør ud` · órbita `Kør rundt om motivet` · paneo `Panorér` · voz en off `Speak` · narración `Fortællerstemme` · subtítulos `Undertekster` · vertical / horizontal `Stående` / `Liggende` |
| Weë Filmmaker («Varias escenas») | escena `scene`, pl. `scener` · **plano `klip`** (invariable: `1 klip`, `3 klip`) · **toma `version`** (cada vídeo que Weë genera para un plano) · storyboard `Storyboard` · panel Director `Instruktion`; dirigir `instruere` · personajes `Karakterer` · vestuario `påklædning` · línea de diálogo `replik` · duración `Varighed` |
| Negocio, cocina y hogar | negocio `virksomhed` · directorio `virksomhedskatalog` · reseña `anmeldelse` · valoración `bedømmelse` · llamada a la acción `opfordring til handling` · envío `levering` · ingrediente `ingrediens` · información nutricional `næringsindhold` · lista de la compra `indkøbsliste` · sin X `X-fri` · dificultad `Let` / `Mellem` / `Svær` · cocinero `kok` (la marca Weë Chef no cambia) · interiores `indretning` |
| Administración (motor) | proveedor `udbyder` · política `politik` · estado `status` · modo de prueba / real `testtilstand` / `live-tilstand` |

## 10. Lo que no se traduce

Las marcas (§ 4); lo que escribe una persona —publicaciones, comentarios, nombres de comunidades y proyectos,
prompts—; identificadores, rutas, emojis y los valores que viajan al servidor.

## 11. Decisiones donde las fuentes no coinciden

| Tema | Opciones | Elegido | Por qué |
|---|---|---|---|
| Hora | 14.30 (CLDR, DSN, borger.dk) / 14:30 (Microsoft) | **14.30** | Es lo que da `Intl` y lo que usa el Estado danés |
| Acento en imperativos | siempre (borger.dk) / nunca (Apple) / solo si hay ambigüedad (Microsoft, Google) | **Solo si hay ambigüedad**, lista cerrada del § 3 | Evita las lecturas falsas (`generer`, `kopier`) sin acentuar todo |
| Iniciar sesión | Log ind / Log på | **Log ind** + **Log ud** | Apple y las apps de consumo; nunca se mezclan |
| Descargar | Download / Hent | **Download** | Pareja de `Upload`; Microsoft y Google |
| Plural de prompt | prompts / prompter | **prompts** | Google Gemini y Microsoft (préstamos en -s) |
| Comillas | ”…” / »…« / "…" | **”…”** | borger.dk 2026; DSN admite cualquiera con coherencia |
| Denunciar | Anmeld / Rapportér | **Anmeld** | Meta y el texto danés de la DSA |
| Notificaciones | Notifikationer / Meddelelser | **Notifikationer** | Apple y las redes sociales |
| Plano (cine) | indstilling / klip | **klip** | `indstilling` choca con `Indstillinger` (Configuración) |
| Perfil Real | Ægte profil / Rigtig profil | **Ægte profil** | `rigtig` también significa «correcto» |
| Abreviatura de «por ejemplo» | fx / f.eks. | **fx** | borger.dk 2026 |
| Rótulos del menú en mayúsculas | Mayúsculas del diseño / nunca mayúsculas | **Las del diseño** | Es estilo visual de Weë en todos los idiomas; en las frases, nunca |
| Currículum | cv / CV | **CV** | Den Danske Ordbog admite las dos; en un título o un chip suelto «cv» parece un error, y la app ya decía «CV» en la mayoría de los sitios |
| Pasos de un plan | imperativo / infinitivo | **Infinitivo sin «at»** («Forbedre fotoet») | Son lo que Weë VA a hacer, no una orden a la persona; los botones y los objetivos de la app siguen en imperativo («Optimer fotoet») |
| La IA de Weë en una frase | Weës AI / Weë’s AI / Weë AI | **Weë AI** | Es la marca: no se declina (§ 4) |
| Ciudades | el nombre del catálogo / el danés | **El danés** («København», «München», «Rom») | `data/ciudadesPorIdioma.ts`; los países los nombra `Intl.DisplayNames` («Tyskland») |

## 11b. Lo que escribe el servidor, en danés

Desde la segunda integración (2026-10-01) el danés declara la sección entera de textos del servidor
(`i18n/textos/da/servidor/`, ver `docs/I18N.md` § 9b): las 43 preguntas, las 233 opciones y los 11 objetivos del flujo
guiado de Weë AI, las explicaciones y los pasos del plan (con sus piezas), el progreso, los errores del motor, los
conceptos del historial de Credits, lo que contestan ËContact y las encuestas, los push y la página pública. Todas las
reglas de esta guía valen para ellos: `i18n-danes.test.mjs` los recorre con las del diccionario de la app.

Lo propio de esta sección:

- **Las piezas se componen.** Una explicación del plan recibe otras piezas en sus huecos (`{{como}}`, `{{decision}}`) o
  la etiqueta de una opción sin su emoji y en minúscula. Se escriben para que la frase entera sea danesa: la pieza que
  va tras una coma o un «så» respeta el orden V2, y las etiquetas de opción que hablan en primera persona de la persona
  («👤 Kun til mig») tienen su pieza propia cuando Weë las repite con su voz («kun til dig»).
- **Las opciones son lo que la persona elige**, en su voz; las preguntas, lo que Weë le pregunta, con «du».
- **Iguales al español a propósito**: «Pop», «Rock», «Elegant», «Standard», «Budget», «Scene {{numero}}» y
  «Weë Studio · video» son palabras danesas; están con su porqué en la prueba 20.
- **Las marcas de los resultados** (`DÍA 1 ·`, `Escena 1`, `PRESUPUESTO:`) llegan en español porque son el contrato
  con el servidor; la app las escribe «Dag 1 ·», «Scene 1» y «Budget:». Las líneas internas (`IMAGEN:`, `PROBAR:`,
  `NARRACIÓN:`) no se enseñan.
- **El push** se escribe en el idioma guardado en la cuenta de quien lo recibe; **la página pública**, en el del enlace
  (`?hl=da`, que pone la app al compartir) o en el del navegador.
- **Lo que se escribe en danés también se entiende**: «opskrift» lleva a Weë Chef, «rejse» a Weë Travel, «en video på
  10 sekunder» deja la duración en 10 s, y «København» encuentra Copenhague (`PALABRAS_POR_IDIOMA`,
  `utils/contextoDeCreacion.ts`, `data/places.ts`).

## 12. Cómo se revisa

1. Durante la traducción, el validador de módulo (huecos, marcas y sus deformaciones, espacios de borde, emojis, «1» a
   mano en un `_one`, frases iguales al español o al inglés).
2. `functions/test/i18n-danes.test.mjs`: todo lo comprobable de esta guía, contra el diccionario entero.
3. `functions/test/i18n-nombres-propios.test.mjs`: marcas y sus deformaciones danesas.
4. `functions/test/i18n-cobertura.test.mjs`: huecos, vacíos, bordes y emojis de TODOS los idiomas.
5. Revisión humana de lo que no se prueba —naturalidad, tono, contexto— en una segunda pasada independiente, y capturas
   de las pantallas en escritorio y móvil.

La segunda integración (2026-10-01, textos del servidor y experiencia de punta a punta) añadió
`functions/test/i18n-servidor.test.mjs` (los 1.403 planes posibles, armados con el servidor de verdad, sin un texto
español en danés) y `functions/test/i18n-auditoria.test.mjs` (todos los idiomas: completos, huecos, plurales, ni
proveedores ni otro idioma colado, push, página pública, búsqueda, lugares).

La primera integración (2026-10-01) se revisó así: cinco revisores nativos independientes por áreas (0 CRÍTICO; todos
los ALTO corregidos) y una campaña de capturas sobre la demo local con emuladores, en `da-DK`, `es-ES` y `en-US` lado a
lado, a 390 × 844 y 1440 × 900: Home, menú, Configuración, Idioma, Ayuda, inicio de sesión y su error, alta en dos pasos,
WeeTalk, Notificaciones, perfil, Weë AI, Studio (Billeder, Videoer), Brain, Design, Music, Chef, Business, Travel, Mis
proyectos, Credits, Comunidades, Buscar, el compositor, una publicación propia y la hoja de denuncia con su error. Lo
que solo se cortaba en danés se acortó en el texto (Buscar, la descripción de Weë Chef, la tarjeta Voz del Studio), sin
tocar el tamaño de letra.

## Fuentes

- **[MS]** Microsoft Danish Localization Style Guide — aka.ms/danish-styleguide (§§ 2, 3.1, 3.2, 4.1.1, 4.1.5–4.1.7, 4.1.10, 4.1.13, 4.1.17, 4.1.22, 5.6.1)
- **[BDK]** Digitaliseringsstyrelsen, *Skrivevejledning for borger.dk og lifeindenmark.dk*, versión 5, agosto de 2026 (§§ 3.1–3.19)
- **[DSN]** Dansk Sprognævn: Retskrivningsordbogen 5 (2024; 5.1 de 2025), sproget.dk (bindestreger, et eller flere ord, genitiv, accenttegn, komma, klokkeslæt), § 58 anførselstegn
- **[DS-knapper]** Det Fælles Designsystem (designsystem.dk): knapper, fejlmeddelelser
- **[CLDR 48]** Salida de ICU 78.3 / CLDR 48 en Node 24 para `da-DK`; reglas de plural de CLDR (`one: n = 1 or t != 0 and i = 0,1`)
- **[W3C]** «Text size in translation»; MDN `hyphens` y `lang`
- **Términos de producto en danés**: Apple (support.apple.com/da-dk), Microsoft (support.microsoft.com/da-dk), Google (Gemini, YouTube, Play), Facebook, Instagram, LinkedIn — solo palabras sueltas, como desempate
- **Diccionarios**: Lex.dk (AI, prompt), Den Danske Ordbog (speak, voiceover, streame), Filmcentralen (filmsprog)
