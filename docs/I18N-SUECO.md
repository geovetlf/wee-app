# I18N-SUECO — el sueco de Weë (`sv` / `sv-SE`)

> Guía de estilo y glosario para quien escriba, revise o amplíe el sueco de Weë: hoy y cuando lleguen módulos nuevos
> (Filmmaker, 3D, Weë Music, Weë Travel, Weë Inspira…). La arquitectura común está en [`I18N.md`](I18N.md); aquí solo
> lo que es del sueco. Las decisiones se tomaron con fuentes (lista al final) y, donde las fuentes no coinciden, dicen
> qué se eligió, qué se descartó y por qué.
>
> Lo que esta guía pide lo comprueba `functions/test/i18n-sueco.test.mjs`. Lo que no se puede comprobar con una
> prueba —naturalidad, tono, contexto— es trabajo de quien escribe y de quien revisa.

## 0. Lo esencial

1. **No se traduce del español palabra a palabra.** Se entiende qué hace la cadena y se escribe lo que escribiría un
   equipo de producto sueco: frases cortas, hechos, nada de retórica. [MS §2]
2. **«Du», siempre.** Nunca «ni» de cortesía. [MSR 8.2.1] [FL-du]
3. **Mayúscula solo al principio** (`Redigera profil`), y en los nombres propios. Días, meses e idiomas en minúscula.
4. **Las palabras compuestas se escriben juntas**: `profilbild`, `användarnamn`, `lösenord`. Partirlas (särskrivning)
   es el error más grave del sueco escrito. [MS 4.1.6] [MSR 10.1]
5. **å ä ö siempre.** Sin ellas son otras palabras.
6. **Las marcas de Weë, intactas y sin declinar**: ni `WeeTalken` ni `Weës`. Con preposición (`på Weë`) o en un
   compuesto con guion (`Weë-profil`).
7. **El plural sí cambia**: `1 kommentar` / `3 kommentarer`.
8. **Consistencia:** un concepto, una palabra, la del glosario (§ 9).

## 1. Idioma, locale y lo que ya resuelve la arquitectura

| | |
|---|---|
| Idioma | `sv`, diccionario en `i18n/textos/sv/` |
| Locale principal | `sv-SE` (en `LOCALES_CONTEMPLADOS`); un aparato en `sv-FI` también recibe sueco |
| Variantes | Ninguna |
| Respaldo | `sv-SE` → `sv` → `en`, clave a clave |
| Plural | `Intl.PluralRules('sv')`: `one` (solo el 1 entero) y `other` (0, 2, 1,5…) |
| Formatos | `Intl` con el locale: `30 september 2026`, `2026-09-30`, `14:05`, `1 234 567,89`, `1 500,00 kr`, `40 %`, `för 3 dagar sedan`, `A, B och C` |
| Web | `<html lang="sv">`, lo escribe `IdiomaContext` |
| Pantalla de error | Su fila `sv` en `components/ErrorBoundary.tsx` |

**Los formatos no se escriben a mano**: salen de `i18n/formato.ts`. El separador de miles es un espacio fijo (U+00A0) y
el signo menos, `−` (U+2212): las pruebas y quien compare cifras deben esperarlo. [CLDR 48]

## 2. Tono y registro

**«Du» con minúscula**, como dicen Språkrådet y Microsoft y como escriben Apple, Instagram, Klarna, Spotify y X en sueco.
«Ni» solo para grupos o empresas, nunca como cortesía. [MSR 8.2.1] [FL-du] [FL-dureform]

| Tipo de cadena | Forma | Ejemplo |
|---|---|---|
| Botón, acción de menú | Imperativo, mayúscula de frase, sin punto | `Spara`, `Avbryt`, `Redigera profil`, `Kopiera länk` |
| Título de pantalla o de ayuda | Sustantivo o infinitivo sin «att», sin punto ni dos puntos | `Inställningar`, `Blockera personer` |
| Instrucción | «Om du vill X väljer du Y»; nunca «För att X, välj Y» | `Tryck på Redigera profil om du vill byta bild.` |
| Mensaje informativo | Frase corta con punto, en presente | `Ändringarna har sparats.` |
| Error | «Det gick inte att …» / «Det går inte att …»; sin personificar; con el paso siguiente | `Det gick inte att ladda upp filen. Försök igen.` |
| Confirmación | Pregunta completa; dice si no se puede deshacer | `Vill du ta bort inlägget? Det går inte att ångra.` |
| Estado vacío | «Inga … ännu» o una frase que guía | `Inga inlägg ännu` |
| Éxito | Corto; un «!» de vez en cuando | `Kopierat!` |
| Etiqueta del lector de pantalla | Qué es o qué hace, sin «knapp» detrás | `Öppna menyn` |
| Weë Brain, conversación | Cercano y breve, «du» | `Vart vill du resa?` |

- **Sin rodeos de oficina** [MS §2]: `få` (no `erhålla`), `kan` (no `ha möjlighet att`), `Med X kan du…` (no `X gör det
  möjligt att…`), `men` (no `dock`), `till exempel` (no `exempelvis`), `ge` (no `tillhandahålla`).
- **Presente, no futuro**: `Meddelandet skickas`, no `kommer att skickas`.
- **Poco «vi»** y poco «din/ditt/dina»: al lector sueco no le gusta sentirse vigilado. [MS]
- **Lenguaje neutro**: `du`, plurales o el sustantivo del papel. Si un adjetivo acompaña a un hueco de género
  desconocido, en neutro (`nytt`). [MS 3.1]

## 3. Escritura

- **Mayúscula de frase** en todo: botones, títulos, pestañas, menús. `Redigera profil`, nunca `Redigera Profil`. [MS
  4.1.5] [FL-title] Los rótulos que el DISEÑO pinta en mayúsculas los pone el código (`TextoEnMayusculas`); los que el
  español ya escribe en mayúsculas en el diccionario (las secciones del menú) se escriben igual en sueco, con su `Ö`:
  es diseño, no ortografía. En una frase, nunca TODO EN MAYÚSCULAS.
- **Compuestos juntos** (särskrivning prohibida): `användarnamn`, `profilbild`, `lösenord`, `e-postadress`,
  `aviseringsinställningar`, `integritetspolicy`. Un compuesto de más de cuatro o cinco piezas se deshace con
  preposición: `Inställningar för aviseringar`. [MS 4.1.6] [MSR 10.1]
- **Abreviatura + palabra, con guion**: `AI-bild`, `AI-verktyg`, `e-post`. Una abreviatura se declina con dos puntos
  (`AI:n`), pero en la interfaz se evita. [MSR 11.11–11.12] [FL-AI]
- **`AI`** en mayúsculas. [ISOF-AI23]
- **Préstamos**: se declinan como suecos (`prompten`, `communityn`, `hashtaggar`), salvo las marcas.

## 4. Las marcas

`Weë` · `Weë AI` · `Weë Studio` · `Weë Design` · `Weë Photo` · `Weë Writer` · `Weë Music` · `Weë Beauty` · `Weë Chef` ·
`Weë Home` · `Weë Business` · `Weë Travel` · `Weë Brain` · `Weë Inspira` · `Weë Credits` · `Credits` · `Weëls` (una: `Weël`) ·
`Wäll` · `WeeTalk` · `ËContact` · `ẄContact`

- **Ni se traducen, ni se adaptan, ni se declinan.** `krediter`, `Weë Musik`, `Weë Resor` están mal; también `WeeTalken`
  (forma definida) o `Weës` (genitivo). El sueco admite el genitivo en `-s` para las marcas (`Googles`, `Spotifys`),
  pero cambia cómo se escribe la marca; Microsoft recomienda reformular, y Weë lo hace siempre:
  `villkoren för Weë`, `i WeeTalk`, `på Weë`. [MS 4.1.9] [FL-gen]
- **Marca + sustantivo sueco, con guion**, como hacen Instagram, Spotify, Klarna o Apple con los suyos: `Weë-profil`,
  `Weë-konto`; con una marca de dos palabras, el espacio se queda y el guion va delante del sustantivo:
  `Weë AI-projekt`, `Weë Studio-video`. Isof prefiere escribirlo junto (`Facebooksida`), pero `Weë` es un nombre nuevo
  que acaba en ë y el guion lo deja legible. [MS 4.1.16] [FL-hyphen] [MSR 10.4]
- **Weëls**: la sección es `Weëls`; una sola, `en Weël`; varias, `Weëls`. Como Instagram con `Reels` / `en reel`.
- **Los nombres de las funciones y los módulos de Weë Business** —Business Plan, Business Coach, Pricing Assistant,
  Brand Kit, Customer Insights, Business Ideas, Business Profile; y My Business, Products & Catalog, Create, Social,
  Analyze, Grow, Promote— son nombres de producto y se escriben igual en todos los idiomas, como Weë Studio (decisión
  del usuario, 2026-09-16). Lo que hace cada uno sí se traduce, en su pista. «SWOT» se queda como sigla: `SWOT-analys`.

## 5. Puntuación

- **Comillas ”…”**, el mismo carácter (U+201D) a los dos lados; dentro, `’…’`. Nunca “…” ni «…». [MSR 13.11] [MS]
- **`…`**, un solo carácter y sin espacio delante en la interfaz: `Laddar…`. [MS 4.1.16]
- **Raya**: el sueco usa la media (U+2013) con espacios para un inciso (`Försök igen – det brukar gå.`) y sin espacios en
  un intervalo (`2015–2020`). No existe la raya larga. [MSR 13.8]
- **Dos puntos**: minúscula detrás si sigue una lista o una explicación; mayúscula si sigue una frase completa.
- **Sin coma de Oxford** (`A, B och C`), `&` se escribe `och`, y **espacio fijo** entre la cifra y la unidad:
  `250 Credits`, `40 %`, `1 500 kr`. [MS 4.1.18] [FL-%]
- **Pocos signos de exclamación.** [MSR 13.3]

## 6. Números, fechas, horas y plural

- **Todo lo que `Intl` sabe hacer lo hace `Intl`**: `1 234 567,89`, `−5`, `40 %`, `1 500,00 kr`, `30 september 2026`,
  `2026-09-30`, `för 3 dagar sedan`, `i går`, `A, B och C`. Compacto: `1,2 tn`, `2,5 mn`. [CLDR 48]
- **La hora, la de `Intl`**: `14:05`. Språkrådet prefiere `14.05` pero admite los dos puntos, y es lo que el teléfono
  enseña. [FL-klock] [MSR 12.2.1]
- **El porcentaje con espacio fijo**: `{{descuento}} %` (U+00A0), nunca `{{descuento}}%`. [FL-%]
- **Plural**: `_one` para 1 y `_other` para todo lo demás, 0 incluido. El sustantivo cambia: `1 kommentar` /
  `3 kommentarer`, `1 video` / `3 videor`, `1 gillamarkering` / `3 gillamarkeringar`; algunos no: `1 inlägg` / `3 inlägg`,
  `1 följare` / `3 följare`, `1 svar` / `3 svar`. [CLDR-pl] [BSKY]
- **Ordinales**: `1:a`, `2:a`, `3:e`, `4:e` (evitar en la interfaz). [MSR 12.1.6]
- **Orden alfabético**: å, ä, ö van detrás de la z; `Intl.Collator('sv')` lo hace solo.

## 7. Longitud

Medido sobre los catálogos de Bluesky: el sueco ocupa **un 9 % menos que el español** en total, pero sus compuestos
largos no se parten (`Tillgänglighetsinställningar`, 28 letras). El riesgo es una palabra larga en un botón o una
pestaña: se deshace con preposición (`Inställningar för tillgänglighet`) antes de tocar el diseño. En la web, el
guionado automático solo funciona con `lang="sv"`, que ya se escribe; en iOS no hay guionado. [BSKY] [MDN] [RN]

## 8. Patrones de interfaz

| Situación | Patrón |
|---|---|
| Cargando | `Laddar…`, `Sparar…`, `Skapar…` |
| Hecho | `Sparat`, `Kopierat!`, `Klart` |
| Falló | `Det gick inte att …. Försök igen.` / `Något gick fel. Försök igen.` |
| Sin conexión | `Ingen internetanslutning. Kontrollera anslutningen och försök igen.` |
| Confirmar borrado | `Vill du ta bort …?` + `Ta bort` / `Avbryt` |
| Sin resultados | `Inga resultat` / `Inga resultat för ”{{busqueda}}”` |
| Estado vacío | `Inga … ännu` + una invitación con «du» |
| Buscar (placeholder) | `Sök …` (`Sök personer`, `Sök communities`) |

## 9. Glosario

### 9.1 Las palabras del encargo

| Español | Sueco | Alternativa descartada y por qué |
|---|---|---|
| crear | **Skapa** | — |
| generar (IA) | **Generera**; en la llamada principal, **Skapa** | Canva y Microsoft usan `generera` |
| editar | **Redigera** | `Ändra` para cambiar un ajuste |
| guardar | **Spara** | — |
| compartir | **Dela** | — |
| eliminar / borrar | **Ta bort**; **Radera** si destruye para siempre (la cuenta, un archivo) | Apple y Bluesky distinguen igual |
| cancelar | **Avbryt** | — |
| continuar | **Fortsätt** | — |
| volver | **Tillbaka** | — |
| listo (botón) | **Klar** | — |
| configuración | **Inställningar** | — |
| cuenta | **Konto** | — |
| perfil | **Profil**; Perfil Real = `Riktig profil`, Perfil Weë = `Weë-profil` | — |
| proyecto | **Projekt** (pl. projekt); «Mis proyectos» = `Mina projekt` | — |
| archivo | **Fil** | — |
| imagen | **Bild**; foto = **Foto** | — |
| vídeo | **Video**, pl. **videor** | `videoklipp` (Facebook), más largo |
| audio | **Ljud**; voz = `röst` | — |
| documento | **Dokument** | — |
| modelo (de IA) | **Modell** / **AI-modell** | — |
| IA | **AI** | `ai` en minúscula, admitido pero menos común |
| créditos | **Credits** (marca, sin traducir): `250 Credits` | Google y Adobe traducen `krediter`; en Weë es marca |
| comunidad | **community** (pl. `communities`; definida `communityn`) | `gemenskap` (Isof) suena ajena en una red social; YouTube, Meta, TikTok y Microsoft dicen `community` |
| contacto | **Kontakt**, pl. `kontakter` | La agenda es `ËContact` |
| publicación | **Inlägg** (pl. inlägg) | — |
| publicar | **Publicera**; compartir fuera, **Dela** | — |
| borrador | **Utkast** | — |
| plantilla | **Mall** | — |
| espacio de trabajo | **Arbetsyta** | — |

### 9.2 Lo social

| Español | Sueco | Nota |
|---|---|---|
| Inicio | **Hem** | YouTube, Bluesky |
| Buscar | **Sök** | |
| Explorar | **Utforska** | Instagram, TikTok |
| Notificaciones | **Aviseringar** | Android, YouTube, Meta, LinkedIn; `Notiser` (Apple) descartado |
| Mensajes / chat | **Meddelanden** / **Chatt** | |
| Me gusta | **Gilla**; el número, **gillamarkeringar** | |
| Comentario / comentar | **Kommentar** / **Kommentera** | |
| Responder | **Svara**, `svar` | |
| Repost | **Återpublicera**, `återpublicering` | Bluesky |
| Seguir / siguiendo / seguidores | **Följ** / **Följer** / **Följare**; dejar de seguir `Sluta följa` | |
| Guardados | **Sparat** | Instagram |
| Denunciar | **Anmäl**, `anmälan` | Meta, TikTok, Bluesky; `Rapportera` (YouTube) descartado |
| Bloquear | **Blockera** | |
| Silenciar | **Ignorera** (una persona), **Stäng av ljudet** (el sonido) | |
| Mención | **omnämnande**, verbo `nämna` | |
| Hashtag | **hashtagg** | Isof |
| Tendencias | **Populärt** / `Trendar` | |
| Copiar enlace | **Kopiera länk** | |

### 9.3 Cuenta y acceso

| Español | Sueco |
|---|---|
| Iniciar sesión | **Logga in** |
| Registrarse | **Registrera dig** / **Skapa konto** |
| Cerrar sesión | **Logga ut** |
| Contraseña | **Lösenord**; ¿la olvidaste? `Har du glömt lösenordet?` |
| Correo | **e-post**, `e-postadress` |
| Invitado | **gäst** |

### 9.4 Crear con IA

| Español | Sueco |
|---|---|
| prompt | **prompt** (`prompten`, `promptar`); «Copiar prompt» = `Kopiera prompt` |
| Cómo lo hice | **Så gjorde jag** |
| subir / descargar | **Ladda upp** / **Ladda ner** (Isof: la forma más común; `ladda ned` también es correcta) |
| especialista | **expert** (los de Weë AI: `Weë-experter`) |
| resultado | **resultat** |
| versión | **version** |
| estilo | **stil** |

### 9.5 Estados y avisos

| Español | Sueco |
|---|---|
| Algo salió mal | **Något gick fel** |
| Inténtalo de nuevo | **Försök igen** |
| Cargando… | **Laddar…** (Bluesky, Mastodon; `Läser in…` de Android y Microsoft descartado por formal) |
| Sin resultados | **Inga resultat** |
| Error | **Fel** |
| Aceptar (aviso) | **OK** |
| Próximamente | **Kommer snart** |

### 9.6 Términos que fijó la primera traducción completa

Se decidieron al traducir Weë entero y son ya el uso de la casa: un módulo nuevo los reutiliza.

| Ámbito | Español → sueco |
|---|---|
| Credits y dinero | saldo `saldo` · no tienes suficientes `Du har inte tillräckligt med Credits` · recargar `Fyll på` / `påfyllning` · coste `kostnad` · de prueba `test-` (`testpris`, `testpåfyllning`) · recibidos / usados `Mottagna` / `Använda` · lo que más rinde `Mest för pengarna` · Ups `Hoppsan` |
| Crear y guardar | creación `skapelse` («Mis creaciones» = `Mina skapelser`) · logo `logga` (`logotyp` en Weë Business) · marca de agua `vattenstämpel` · cambiar la cara `byta ansikte` · marcador `bokmärke` · tutoriales `guider` · editor `redigeraren` / `textredigerare` · proceso `Arbetsgång` · dictar `Diktera` |
| Publicar y social | encuesta `omröstning` (voto `röst`, opción `alternativ`) · visibilidad pública `Offentligt` · vistas `visningar` · destacado `utvald` · Me gusta (pestaña) `Gillat` · Reposts (pestaña) `Återpublicerat` · Tendencias `Trendar` · la pestaña «Usuarios» `Personer` · unirse / miembro / salir `Gå med` / `Medlem` / `Lämna` · oficial `Officiell` |
| Perfil y cuenta | nombre visible `Visningsnamn` · biografía `Presentation` (como Instagram; «bio» es el cine) · portada `omslagsbild` · alias del Perfil Weë `alias` · opcional `valfritt` · ej. `T.ex.` · condiciones `Användarvillkor` · privacidad `Integritet` / `Integritetspolicy` · permisos `Behörigheter` · ubicación `plats` / `Platstjänster` |
| ËContact y WeeTalk | solicitud `förfrågan` · aceptar / rechazar / retirar `Acceptera` / `Avböj` / `Dra tillbaka` · modo efímero `Försvinnande meddelanden` · foto única `Engångsfoto` · ver una vez `Visa en gång` · adjuntar `Bifoga` · nota de voz `röstmeddelande` · tema del chat `Färgtema` · nuevo chat `Ny chatt` · notificaciones push `Pushaviseringar` |
| Weë Studio (cámara) | encuadre `Bildutsnitt` · ángulo `Perspektiv` · objetivo `Objektiv` · plano general / medio / corto `Översiktsbild` / `Halvbild` / `Närbild` · a ojo de pájaro `Fågelperspektiv` · dron `Drönare` · hora dorada `Gyllene timmen` · regla de tercios `Tredjedelsregeln` · travelling `Åk in` / `Åk ut` · paneo `Panorera` · voz en off `Speakerröst` · narración `Berättarröst` · pies de foto `Bildtexter` · formato vertical / horizontal `Stående` / `Liggande` |
| Negocio, cocina y hogar | negocio `företag` · directorio `företagskatalog` · reseña `recension` · valoración `betyg` · llamada a la acción `uppmaning till handling` · envío `frakt` · ingrediente `ingrediens` · información nutricional `näringsvärden` · lista de la compra `inköpslista` · sin X `X-fri` · dificultad `Enkel` / `Medelsvår` / `Avancerad` · el cocinero `kock` («chef» en sueco es «jefe»; la marca Weë Chef no cambia) · el espacio de Weë Home `rum` · interiores `inredning` |
| Administración (motor) | proveedor `leverantör` · política `policy` · estado `hälsostatus` · modo de prueba / real `testläge` / `skarpt läge` · cadenas de fallback `Fallback-kedjor` |
| Palabras compuestas con marca | `Weë-profil`, `Weë-konto`, `Weë-experter`, `Weë-avatar`, `Weë-vattenstämpel`, `ËContact-lista`, `ËContact-förfrågan`, `Weë AI-projekt` |

## 10. Lo que no se traduce

Las marcas (§ 4); lo que escribe una persona —publicaciones, comentarios, nombres de comunidades y proyectos,
prompts—; identificadores, rutas, emojis y los valores que viajan al servidor.

## 11. Decisiones donde las fuentes no coinciden

| Tema | Opciones | Elegido | Por qué |
|---|---|---|---|
| Marca + sustantivo | Junto (Isof, MSR: `Facebooksida`) / con guion (Microsoft; Instagram, Spotify, Klarna, Apple con sus propias marcas) | **Con guion** | Es como las marcas escriben sus compuestos, y `Weë` es nuevo y acaba en ë |
| Genitivo de la marca | `Weës` (correcto en sueco, lo hacen Google y Spotify) / reformular (Microsoft) | **Reformular** | La marca no cambia su forma escrita |
| Notificaciones | Aviseringar (Android, YouTube, Meta) / Notiser (Apple, Bluesky) | **Aviseringar** | Lo que dicen las redes sociales y Android |
| Denunciar | Anmäl (Meta, TikTok, Bluesky) / Rapportera (YouTube, Android) | **Anmäl** | Las redes sociales |
| Comunidad | community (YouTube, Meta, TikTok, Microsoft) / gemenskap (Isof) | **community** | Es la palabra de las plataformas |
| Borrar | Ta bort / Radera | **Ta bort**; **Radera** si es para siempre | Apple y Bluesky distinguen igual |
| Descargar | ladda ner / ladda ned | **ladda ner** | Isof: más común y menos formal |
| Cargando | Laddar… / Läser in… | **Laddar…** | Tono de red social |
| Hora | 14.05 (Språkrådet, preferida) / 14:05 (CLDR) | **14:05** | La da `Intl`; Språkrådet la admite |
| Rótulos del menú en mayúsculas | Mayúsculas del diseño / nunca mayúsculas (Microsoft) | **Las del diseño** | Es estilo visual de Weë en todos los idiomas; en las frases, nunca |

## 12. Cómo se revisa

1. `node <scratch>/validar-sv.cjs <worktree> <módulo>` durante la traducción (huecos, marcas, % con espacio, å ä ö,
   särskrivning, «ni»).
2. `functions/test/i18n-sueco.test.mjs`: todo lo comprobable de esta guía, contra el diccionario entero.
3. `functions/test/i18n-nombres-propios.test.mjs`: marcas y sus deformaciones suecas.
4. Revisión humana de lo que no se prueba: naturalidad, tono, contexto.

## Fuentes

- **[MS]** Microsoft Swedish Localization Style Guide — aka.ms/swedish-styleguide (§§ 2, 3.1, 4.1.1, 4.1.5, 4.1.6, 4.1.9, 4.1.16–18, 5.5–5.6)
- **[MSR]** Språkrådet, *Myndigheternas skrivregler*, 8.ª ed. (2014), enlazada desde isof.se (§§ 2.3, 3.5.2, 6.3, 8.2.1, 10.1–10.5, 11.8–11.12, 12.1–12.5, 13.3–13.15)
- **[FL-…]** Isof, Frågelådan: du/ni, reforma del du, AI, hora, porcentaje, genitivo, guion, mayúsculas, puntos suspensivos, comillas, community, hashtagg, e-post, ladda ner/ned, videor — frageladan.isof.se
- **[ISOF-AI23]** Isof, «Hur skriver man AI-orden?» (2023)
- **[SAOL]** Svenska Akademiens ordlista (community, prompt, hashtag, trenda)
- **[CLDR 48]** Salida de ICU 78.3 / CLDR 48 en Node 24 para `sv-SE`; reglas de plural de CLDR
- **[BSKY]** Catálogo sueco de Bluesky (social-app, `sv/messages.po`), 3 254 cadenas; **[MASTO]** catálogo sueco de Mastodon
- **Interfaces y centros de ayuda en sueco**: Instagram, Facebook, TikTok, YouTube, X (condiciones), Apple, Android (AOSP), Spotify, Klarna, Microsoft, Google, Canva, Adobe
- **[MDN]** `hyphens` y `lang`; **[RN]** `android_hyphenationFrequency`
