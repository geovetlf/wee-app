# Rumano (ro) — fin de la auditoría lingüística, 2026-10-30

**Es una revisión de IA, no una revisión nativa.** Ningún texto de este idioma ha sido validado por un hablante nativo. No se hizo inspección visual: las longitudes están sin medir.

## Alcance

- Filas revisadas: **1869 de 1869 pendientes** en `_calidad-2026-10-30/ro/correcciones.csv` (columna `revisada` distinta de `sí`). Con las 1205 de la pasada anterior, el idioma queda cotejado en sus 3074 claves.
- Módulos: aiAvatar, avatar, business, catalogo, chef, creator, design, engine, filmmaker, studio, weebiz, writer. Cada fila se leyó junto al español y al inglés actuales del diccionario.
- Sin tocar: `i18n/textos/ro/servidor/`, `i18n/huella.json`, `i18n/revision/ro/registro.json`.
- Las 36 claves `_few` no existen en el español actual (es plural propio del rumano); se cotejaron contra el texto español del CSV.

## Problemas

42 correcciones: 36 en filas pendientes y 6 propuestas del `informe.md` §7 en filas ya revisadas. Las más serias:

- **Cambio de sentido:** «Persoane atinse» (personas tocadas), «animă… conținut», «Animație» en eventos, «machetă» por modelo 3D.
- **Cobro:** `filmmaker.takeChooseQuality` hablaba de cobro desde el lado del vendedor.
- **Concordancia:** `business.reviewsGoal` mezclaba yo y tú; `writer.resultHint`.
- **Permisos o administración:** «Doar administrare» no decía quién puede entrar.
- **Calcos:** «piesă» por pieza, «nu iese», «lucrează pe», «ar lăsa… stricată», «tăceri».
- **Verbo «a proiecta»** aplicado a logos, anuncios y personajes.
- **Glosario:** «video» en prosa, «Outfit» frente a «ținută».

No se encontraron errores en acciones destructivas ni restos en otro idioma en estas filas.

## Corregidos

| Clave | Antes | Después | Motivo |
|---|---|---|---|
| `weebiz.specialityHintEvents` | DJ, Spectacole, Animație... | DJ, Spectacole, Divertisment... | «Animație» se lee como dibujos animados; aquí es animación de fiestas (en: Entertainment). |
| `aiAvatar.eyeHazel` | Alună | Căprui deschis | Propuesta del informe: «Alună» suelto no concuerda con Căprui/Albaștri/Verzi y es raro como color de ojos. |
| `engine.adminOnly` | Doar administrare | Doar pentru administratori | «Doar administrare» es literal y ambiguo; en: Administrators only. |
| `engine.rowSubtitle` | Furnizori, lanțuri de fallback și setări (doar administrare) | Furnizori, lanțuri de fallback și setări (doar pentru administratori) | Mismo literal que engine.adminOnly. |
| `creator.studioEx1` | Un video pentru a-mi promova restaurantul | Un videoclip pentru a-mi promova restaurantul | Glosario: «videoclip» en prosa. |
| `creator.studioEx2` | Să-mi transform fotografia într-un video | Să-mi transform fotografia într-un videoclip | Glosario: «videoclip» en prosa. |
| `writer.resultHint` | Weë lucrează pe ce ai scris și îți aduce rezultatul aici, gata să continui editarea. | Weë lucrează la ce ai scris și îți aduce rezultatul aici, ca să poți continua editarea. | «lucrează pe» calca «trabaja sobre»; «rezultatul… gata să continui» no concuerda. |
| `business.simulatedConnection` | Conexiune simulată: Weë încă nu publică și nu răspunde în locul tău. Pregătește fiecare piesă ca tu să o revizuiești și să o publici. | Conexiune simulată: Weë încă nu publică și nu răspunde în locul tău. Pregătește fiecare material ca tu să îl revizuiești și să îl publici. | «piesă» calca «pieza»: en rumano es pieza física o musical (mismo criterio que studio.pendMusic). |
| `business.typeCampaignHint` | Mai multe piese deodată | Mai multe materiale deodată | Mismo calco de «piezas». |
| `business.statReach` | Persoane atinse | Persoane la care ai ajuns | «Persoane atinse» significa personas tocadas. Propuesta abierta del informe; ver dudas. |
| `catalogo.businessEj2Subtitle` | Persoane atinse | Persoane la care ai ajuns | Mismo error que business.statReach. |
| `business.overviewEmptyHint` | Descrie-o pentru Weë cu cuvintele tale — „vând deserturi de acasă” — și te ajut să-i dai formă. | Spune-i lui Weë cu cuvintele tale — „vând deserturi de acasă” — și te ajut să-i dai formă. | «Descrie-o pentru Weë» es forzado; patrón «Spune-i lui Weë» del resto del diccionario. |
| `business.pricingHint` | Pune cât te costă și Weë îți dă un preț de referință. | Notează cât te costă și Weë îți dă un preț de referință. | Propuesta del informe: «Pune» calca «Pon». |
| `business.businessIdeasGoal` | Să-mi dai idei pentru afacerea mea și ca să mă diferențiez | Să-mi dai idei pentru afacerea mea și să mă ajuți să mă diferențiez | Propuesta del informe: la coordinación «și ca să» cojea. |
| `business.reviewsGoal` | Să analizez recenziile afacerii mele și să-mi spui ce să îmbunătățesc | Să analizezi recenziile afacerii mele și să-mi spui ce să îmbunătățesc | Concordancia: mezclaba yo («analizez») y tú («spui»); se le pide a Weë, como expensesAskGoal. |
| `business.promoteHint` | Conținutul tău e arătat mai multor oameni în Weë. Înainte să cheltuiești ceva, vezi cât costă. | Conținutul tău e arătat mai multor oameni în Weë. Înainte să cheltuiești ceva, vei vedea cât costă. | «vezi» se lee como imperativo; es una garantía de futuro (verás / you will see). |
| `business.reviewsRespondGoal` | Să scriu un răspuns profesionist la o recenzie a afacerii mele | Să scriu un răspuns profesional la o recenzie a afacerii mele | «profesionist» se dice de personas; de un texto, «profesional». |
| `design.reModel` | O machetă 3D | Un model 3D | «machetă» es maqueta física; en: 3D model. |
| `chef.valMany` | Pentru mulți | Pentru mulți oameni | «Pentru mulți» queda incompleto en rumano. |
| `catalogo.brainChip6` | Leagă toți Weë | Îi conectează pe toți Weë | «Leagă toți Weë» falta el «pe» del objeto directo, tratado como personas en brainIntro («ceilalți Weë»). |
| `catalogo.brainAcIdkTitle` | Nu știu cum să fac | Nu știu cum să o fac | Falta el clítico: mismo error que «Cum am făcut» corregido en la primera tanda. |
| `catalogo.designAcBrandGoal` | Să proiectez un logo și identitatea brandului meu | Să creez un logo și identitatea brandului meu | «a proiecta» es de ingeniería y arquitectura; un logo se crea. |
| `catalogo.designAcSocialGoal` | Să proiectez ceva pentru rețele sau publicitate | Să creez ceva pentru rețele sau publicitate | Ídem: un anuncio no se «proiectează». |
| `catalogo.designAcCharacterGoal` | Să proiectez un personaj | Să creez un personaj | Ídem: un personaje no se «proiectează». |
| `catalogo.studioAcVideosSubtitle` | Creează videoclipuri, animă fotografii și conținut pentru rețele. | Creează videoclipuri și conținut pentru rețele, animă fotografii. | La frase decía «animar… contenido»: cambio de sentido respecto al inglés. |
| `catalogo.homeIdeaChip3` | O bucătărie mică bine folosită | O bucătărie mică bine organizată | Propuesta del informe. |
| `catalogo.beautyAcFaceGoal` | Să găsesc stilul care mi se potrivește cel mai bine la față | Să găsesc stilul care se potrivește cel mai bine feței mele | «mi se potrivește la față» es coloquial y literal. |
| `catalogo.travelAcDoingSubtitle` | Ce merită, cu sursa lui | Ce merită încercat, cu surse | «Ce merită, cu sursa lui» queda sin sentido en rumano. |
| `studio.editorCharacters` | {{contador}} caractere | Caractere: {{contador}} | Propuesta del informe: sin plural, desde 20 faltaría «de». |
| `studio.xpOutfit` | Outfit | Ținută | Glosario de uso: «ținută» en creator.beauty, catalogo y business. |
| `studio.tlVidSilences` | Elimină tăcerile | Elimină pauzele | «tăceri» es silencio humano, no huecos de audio. |
| `studio.worldDailyLimit` | Ai folosit deja lumile 3D de azi. Dacă vreuna nu iese, o recuperezi, iar ele se reînnoiesc în fiecare zi. | Ai folosit deja lumile 3D de azi. Dacă vreuna nu reușește, o recuperezi, iar ele se reînnoiesc în fiecare zi. | «nu iese» calca «no sale» (mismo criterio que weeai.jobFailed). |
| `filmmaker.recDialogueExceedsDuration` | Dialogul are nevoie de vreo {{estimatedSec}} s și sunt doar {{availableSec}} s. | Dialogul are nevoie de aproximativ {{estimatedSec}} s și sunt doar {{availableSec}} s. | «vreo» es coloquial; mismo criterio que weeai.approxUsd. |
| `filmmaker.recShotTooShortForActions` | Acest cadru are {{actions}} acțiuni în {{availableSec}} s; ar avea nevoie de vreo {{neededSec}} s. | Acest cadru are {{actions}} acțiuni în {{availableSec}} s; ar avea nevoie de aproximativ {{neededSec}} s. | Ídem. |
| `filmmaker.opOperationWouldBreakIntegrity` | Acea modificare ar lăsa producția stricată. | Acea modificare ar strica producția. | «ar lăsa… stricată» calca «dejaría… rota». |
| `filmmaker.takeChooseQuality` | Alege o calitate ca să vezi prețul. Nu se generează și nu se încasează nimic până nu confirmi. | Alege o calitate ca să vezi prețul. Nu se generează și nu se taxează nimic până nu confirmi. | Seguridad de cobro: «încasează» es del lado del vendedor; el diccionario dice «taxa» (weeai.itDidNotWork). |
| `language.comingSoonTitle` | Pe drum | În pregătire | Propuesta del informe: «Pe drum» es literal. |
| `weeai.approxUsd` | vreo {{usd}} USD | aproximativ {{usd}} USD | Propuesta del informe: registro. |
| `home.wallFilteredTitle` | Nimic pe aici cu această selecție | Nimic pentru această selecție | Propuesta del informe: «pe aici» es literal. |
| `help.a8` | Este chatul din Weë: conversații private cu alte persoane din comunitate, cu text, fotografii și note vocale. | Este chatul din Weë: conversații private cu alte persoane din comunitate, cu text, fotografii și mesaje vocale. | Propuesta del informe: «note vocale» no es la forma habitual; sin fuente abierta, ver dudas. |
| `weetalk.viewOnceOn` | Vezi o singură dată | Afișare unică | Propuesta del informe: coherente con weetalk.photoOnce. |
| `credits.topUpFailedTitle` | Hopa | Ups | Propuesta del informe; es el mismo «Ups» del español. |

## Propuestas del informe §7

**Aplicadas:** language.comingSoonTitle, weeai.approxUsd, business.pricingHint, home.wallFilteredTitle, business.businessIdeasGoal, help.a8, aiAvatar.eyeHazel, catalogo.homeIdeaChip3, weetalk.viewOnceOn, credits.topUpFailedTitle, studio.editorCharacters, business.statReach.

**Descartadas, con motivo:**

- `auth.forgotPassword`: las dos formas son correctas; el propio informe aconseja no cambiarla.
- `weeai.itDidNotWork`, `errTimeout`, `errGeneric` («Nu te-am taxat»): es natural y «taxa» es ahora el verbo común del diccionario.

**Sin aplicar, necesitan decisión o medición:**

1. `communities.officialName*`: mayúsculas de los nombres de comunidades oficiales (Microsoft las desaconseja, pero son nombres propios citados en help.a7). Decisión del dueño.
2. `auth.termsOfService` («Termenii serviciului» o «Termeni și condiții»): decisión legal.
3. `wall.repost` y familia («Redistribuie» o «Repostează»): hay que ver Instagram y X en rumano en un dispositivo.
4. «N Credits» desde 20 debería ser «240 de Credits» (credits.youHaveLabel, testTopUpDone, topUpButton; weeai.youSpent, sendForCredits, youHaveCredits; aiAvatar.generateForCredits, generateButton; studio.worldCreateFor; filmmaker.takePrice). Exige plurales en claves del español, que son compartidas. El mismo límite afecta a `aiAvatar.limitBody` y a `filmmaker.recTooManyScenesForDuration`, `recShotTooShortForActions`.
5. `weeai.sidebarTagline` («Un tu mai bun» → «O versiune mai bună a ta»): calco claro, pero la línea crece y hay que medir la barra lateral.

## Dudas para un revisor humano

- `business.statReach` y `catalogo.businessEj2Subtitle`: «Persoane la care ai ajuns» es transparente, pero larga para una tarjeta de cifras. El término de marketing sería «Acoperire»; no se pudo ver Meta Business en rumano.
- `aiAvatar.eyeHazel`: «Căprui deschis» es una aproximación de miel/hazel.
- `help.a8`: «mesaje vocale» sin fuente abierta (Google Messages dio 404).
- **Verbo de Weë Design:** se dejó «proiectează» en lo genérico, productos, vehículos y espacios (`design.slogan`, `catalogo.designHeadline`…). ¿Debería ser «creează» en toda la sección?
- `catalogo.brainChip6`: «Îi conectează pe toți Weë» trata a Weë como personas, igual que brainIntro.
- `engine.resetHealth`, `engine.modalityVision` («Resetează starea de sănătate», «viziune»): literales aceptables en un panel de administración.
- `filmmaker.aspectRatio` («Proporție»): el término técnico sería «Raport de aspect»; se sigue al español.
- **Fuera de las filas pendientes, sin cambiar:** quedan «un video» en prosa en composer.pollWithVideo, noVideoWithMedia, noImagesWithVideo, videoTooLong y projects.whatIsMissingNote, contra el glosario.
- **Rótulos en inglés:** Business Plan, Business Coach, Pricing Assistant, Brand Kit, Customer Insights, Business Ideas y Business Profile siguen en inglés, igual que en el español. ¿Son nombres de producto o deberían traducirse?
- **Guía:** las correcciones a `docs/I18N-RUMANO.md` que pide el informe siguen pendientes, porque esta pasada solo puede editar los textos.
- **Registro:** las claves ya revisadas que cambian aquí figurarán como «cambió desde la revisión» en `i18n/revision/ro/registro.json` hasta que se reimporten.

## A medir en pantalla (puerta visual pendiente)

`business.statReach`, `catalogo.businessEj2Subtitle`, `engine.adminOnly`, `engine.rowSubtitle`, `chef.valMany`, `language.comingSoonTitle`.

## Validación

Desde `functions/test`, después de aplicar los cambios: `i18n-cobertura.test.mjs` exit 0, `i18n-revision.test.mjs` exit 0, `i18n-rumano.test.mjs` exit 0 con 0 fallos. Las tres también estaban verdes antes de los cambios. `i18n/huella.json` no se regeneró, así que la huella de `ro` queda desfasada hasta que se regenere.
