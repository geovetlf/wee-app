# Auditoría lingüística: alemán de Suiza (de-CH)

Revisión de IA del 2026-10-30, no revisión nativa. Terminada sobre las 51 filas de `correcciones.csv` sin marcar como revisadas (de 3038). Cada una se comparó con español e inglés, con `informe.md` y `glosario.csv` a la vista. El registro `i18n/revision/` y `i18n/huella.json` no se tocaron.

## Resultado
51 filas revisadas, 51 con propuesta contrastada, **1 corregida y 50 sin aplicar**. Las 50 siguen en el texto, y entre ellas hay errores reales, como «weiter kommen», «Wir helfen dir zum perfekten Song» o «Zum Reales Profil wechseln».

**Motivo del bloqueo.** La prueba D2 de `i18n-aleman-suizo.test.mjs` solo admite que de-CH se separe de `de` por ss, comillas o un término de su lista LEXICO. Simulada sobre las propuestas, 49 de las 51 la incumplen. Las otras dos son `help.a2`, aplicada, y `composer.signInToMention`, que prohíbe `i18n-nombres-propios`. Este encargo no permite editar `i18n/textos/de/` ni las pruebas. No se metieron palabras de LEXICO en las frases para pasar la prueba.

`help.a2` pasa D2 solo porque la frase contiene «Weë», no porque el cambio sea suizo. El mismo fallo sigue en `de` y hay que corregirlo también allí.

## Corregidos
| clave | antes | después | motivo |
|---|---|---|---|
| help.a2 | Dein Reales Profil ist deine gewohnte Identität, und die App ist weiss. Dein Weë Profil ist deine Identität zum Erschaffen mit KI: ein eigener Avatar und ein eigener Name für deine Kreationen, und damit wird die App dunkel, damit du immer weisst, als wer du gerade unterwegs bist. Du wechselst zwischen beiden über das Menü ☰ oder den Knopf in der Kopfzeile. | Dein Reales Profil ist deine gewohnte Identität, und die App ist weiss. Dein Weë Profil ist deine Identität zum Erschaffen mit KI: ein eigener Avatar und ein eigener Name für deine Kreationen, und dabei wird die App dunkel, damit du immer weisst, als wer du gerade unterwegs bist. Du wechselst zwischen beiden über das Menü ☰ oder den Knopf in der Kopfzeile. | «und damit … damit» repetía la palabra con dos sentidos. El mismo fallo sigue en `de`. |

## Decisión del dueño
### A. Corregir a la vez en `de` y `de-CH` (34)
El fallo es del alemán general. Al quedar iguales, D2 pasa sin cambiarla. Hace falta autorizar la edición de `i18n/textos/de/`.

| clave | actual | propuesta | motivo | confianza |
|---|---|---|---|---|
| catalogo.businessNote | Auch dein Geschäft kann weiter kommen | Auch dein Geschäft kann weiterkommen | Error ortográfico: «weiterkommen» va junto. | alta |
| catalogo.musicAcLyricsSubtitle | Wir helfen dir zum perfekten Song | Wir helfen dir, den perfekten Song zu schreiben | «helfen … zum perfekten Song» no es gramatical; el español dice «a escribir». | alta |
| menu.switchToProfile | Zum {{perfil}} wechseln | Wechseln zu: {{perfil}} | Con {{perfil}} = «Reales Profil» sale «Zum Reales Profil wechseln» (Header.tsx, etiqueta de lector de pantalla). El hueco no se declina. | alta |
| profile.emptyPostsHint | Teil deinen ersten Beitrag! | Teile deinen ersten Beitrag! | «Teil» se lee como el sustantivo. | alta |
| profile.emptyRepostsHint | Teil, was andere machen | Teile, was andere machen | «Teil» se lee como el sustantivo. | alta |
| onboarding.weeCreated | Deine anonyme Identität ist bereit. Du kannst im Header zwischen den Profilen wechseln. | Deine anonyme Identität ist bereit. Du kannst in der Kopfzeile zwischen den Profilen wechseln. | Jerga técnica «Header»; help.a2 dice «Kopfzeile». | alta |
| weeai.errTimeout | Es hat zu lange gedauert, also habe ich es gestoppt. Dir wurde nichts berechnet: versuch es noch einmal. | Es hat zu lange gedauert, also habe ich es gestoppt. Dir wurde nichts berechnet: Versuch es noch einmal. | Mayúscula tras dos puntos si sigue oración completa. | alta |
| home.communityDescTechAi | News, Modelle, Tools und Diskussionen rund um Künstliche Intelligenz. | News, Modelle, Tools und Diskussionen rund um künstliche Intelligenz. | Minúscula, como Duden y catalogo.ts. | alta |
| composer.uploadingFiles | Datei {{n}} von {{total}} wird hochgeladen … | Datei {{n}} von {{total}} wird hochgeladen… | Espacio ante «…», único caso frente a «Wird gepostet…». | alta |
| business.goalWithProduct | {{idea}} — Produkt: {{producto}} | {{idea}} – Produkt: {{producto}} | El Gedankenstrich es semirraya, no raya. | alta |
| business.formatStory | Instagram Story | Instagram-Story | Compuesto con nombre propio; business.formatReel ya dice «Instagram-Video». | alta |
| business.formatFacebookStory | Facebook Story | Facebook-Story | Compuesto con nombre propio. | alta |
| business.formatPost | Instagram Post | Instagram-Post | Compuesto con nombre propio. | alta |
| business.businessPlan | Business Plan | Businessplan | Duden: una sola palabra. | alta |
| business.businessPlanGoal | Den Business Plan schreiben, um mein Business einem Investor zu präsentieren | Den Businessplan schreiben, um mein Business einem Investor zu präsentieren | Igual que business.businessPlan. | alta |
| studio.voxNarration | Voiceover | Voice-over | Dos grafías: studio.xpVoiceOver y catalogo escriben «Voice-over». | alta |
| studio.sampleNarration | Voiceover auf Deutsch | Voice-over auf Deutsch | Igual que studio.voxNarration. | alta |
| studio.imgCharacter | Charakter beibehalten | Figur beibehalten | En todo Studio «personaje» es «Figur» (charactersTitle, xpCharacter). | alta |
| business.replyTo | An {{nombre}} antworten | {{nombre}} antworten | «antworten» rige dativo; business.replyGoal ya dice «{{nombre}} … antworten». «An {{nombre}} antworten» calca el español. | media |
| business.repliedTo | An {{nombre}} geantwortet | {{nombre}} geantwortet | Igual que business.replyTo. | media |
| chef.shAisles | Nach Gängen sortiert | Nach Abteilungen sortiert | En una app de cocina «Gänge» se entiende como los platos de un menú. Era la lista de la compra por pasillos. | media |
| studio.xpKeepIdentity | Soll gleich bleiben | Figur bleibt gleich | «Soll gleich bleiben» no dice qué debe seguir igual. | media |
| composer.pollErrManyOptions | Eine Umfrage nimmt höchstens {{maximo}} Optionen. | Eine Umfrage kann höchstens {{maximo}} Optionen haben. | «nimmt … Optionen» calca «admite». | media |
| settings.signOutHint | Dein Konto verlassen | Von deinem Konto abmelden | «Dein Konto verlassen» calca «salir de tu cuenta»; el resto usa «abmelden». | media |
| settings.locationPermissionDenied | Du hast dem System Nein gesagt. Tippe hier, um das in den Einstellungen deines Geräts zu ändern. | Der Zugriff ist in den Geräteeinstellungen abgelehnt. Tippe hier, um das zu ändern. | «Du hast dem System Nein gesagt» calca el español. | media |
| notifications.repost | {{nombre}} hat deinen Beitrag geteilt | {{nombre}} hat deinen Beitrag repostet | wall.repostedBy dice «hat repostet» y X usa «Reposten». «geteilt» se confunde con compartir fuera de Weë. | media |
| help.a9 | Beim Veröffentlichen kannst du erzählen, welche Werkzeuge du benutzt hast, den Prompt und den Ablauf. So lernen andere von dir und du von ihnen, mit einem einzigen Tippen auf «Prompt kopieren». | Beim Veröffentlichen kannst du zeigen, welche Werkzeuge du benutzt hast, wie dein Prompt lautet und wie du vorgegangen bist. So lernen andere von dir und du von ihnen, mit einem einzigen Tippen auf «Prompt kopieren». | Zeugma: «erzählen, welche Werkzeuge …, den Prompt und den Ablauf». | media |
| catalogo.designAcHomeTitle | Zuhause & Design | Wohnen & Design | El mismo español «Hogar & Diseño» sale como «Zuhause & Design» aquí y «Wohnen & Design» en creator.areaHomeName y areaDesignHome. | media |
| aiAvatar.uploadFailed | Das Foto konnte nicht hochgeladen werden. Versuch es noch mal. | Das Foto konnte nicht hochgeladen werden. Versuch es noch einmal. | «noch mal» solo en este módulo; el resto escribe «noch einmal». | media |
| aiAvatar.saveFailed | Konnte nicht gespeichert werden. Versuch es noch mal. | Konnte nicht gespeichert werden. Versuch es noch einmal. | Igual. | media |
| aiAvatar.generateFailed | Der Avatar konnte nicht erstellt werden. Versuch es noch mal. | Der Avatar konnte nicht erstellt werden. Versuch es noch einmal. | Igual. | media |
| aiAvatar.regenerateFailed | Der Avatar konnte nicht neu erstellt werden. Versuch es noch mal. | Der Avatar konnte nicht neu erstellt werden. Versuch es noch einmal. | Igual. | media |
| aiAvatar.replaceFailed | Der Avatar konnte nicht ersetzt werden. Versuch es noch mal. | Der Avatar konnte nicht ersetzt werden. Versuch es noch einmal. | Igual. | media |
| engine.statusFailed | Ich konnte den Status des Engines nicht lesen. Läuft der Server? | Ich konnte den Status der Engine nicht lesen. Läuft der Server? | «die Engine» es femenino en alemán. Solo administración. | media |

### B. Ampliar LEXICO: adaptación suiza real (6)
Exige cambiar la prueba, por ejemplo con `(Das|Ein) E-Mail|helikopter|Lehrperson`.

| clave | actual | propuesta | motivo | confianza |
|---|---|---|---|---|
| auth.resetFailed | Die E-Mail zum Zurücksetzen konnte nicht gesendet werden. Versuch es noch einmal. | Das E-Mail zum Zurücksetzen konnte nicht gesendet werden. Versuch es noch einmal. | En Suiza es usual «das E-Mail». | alta |
| creator.writerEx2 | Eine E-Mail an einen Kunden | Ein E-Mail an einen Kunden | Igual. | alta |
| catalogo.writerIdeaChip2 | Eine E-Mail an einen Kunden | Ein E-Mail an einen Kunden | Igual. | alta |
| catalogo.writerAcEmailGoal | Eine E-Mail oder einen Brief schreiben | Ein E-Mail oder einen Brief schreiben | Igual. | alta |
| catalogo.designIdeaChip2 | Ein Rettungshubschrauber | Ein Rettungshelikopter | En Suiza es usual «Helikopter»; Rega escribe «Rettungshelikopter». | alta |
| home.communityDescEducationLearning | Studierende, Lehrkräfte und Forschende, die KI zum Lernen und Lehren nutzen. | Studierende, Lehrpersonen und Forschende, die KI zum Lernen und Lehren nutzen. | «Lehrpersonen» se usa mucho en Suiza, aunque «Lehrkräfte» también. | media |

### C. Reglas que chocan entre sí (2)
- **composer.signInToMention:** `hooks/useEContact.ts` muestra «ËContacts» en plural, pero `i18n-nombres-propios` prohíbe esa forma en el diccionario.
- **econtact.rejectRequestLabel:** «Anfrage von {{lista}}» sugiere que la solicitud la envía ËContact; el validador rechaza la forma de `de`, «{{lista}}-Anfrage», y D2 rechaza «Anfrage für {{lista}}».

| clave | actual | propuesta | motivo | confianza |
|---|---|---|---|---|
| econtact.rejectRequestLabel | Anfrage von {{lista}} ablehnen | Anfrage für {{lista}} ablehnen | «Anfrage von ËContact» sugiere que la solicitud la envía ËContact. La forma de `de`, «{{lista}}-Anfrage», la rechaza el validador, así que se revirtió. | media |
| composer.signInToMention | Melde dich bei Weë an, um deine ËContact zu erwähnen. | Melde dich bei Weë an, um deine ËContacts zu erwähnen. | La app muestra «ËContacts» en plural (hooks/useEContact.ts, nombrePlural), pero i18n-nombres-propios prohíbe esa forma en el diccionario. Se revirtió; hay que decidir la regla. | media |

## Dudas para un revisor humano
Confianza baja. Además de D2, necesitan criterio nativo o del oficio.

| clave | actual | propuesta | motivo | confianza |
|---|---|---|---|---|
| catalogo.brainChip1 | Löst | Löst Probleme | «Löst» suelto queda incompleto; hay que medir el ancho del chip. | baja |
| creator.musicEx3 | Meinen Text in eine Stimme verwandeln | Meinen Text vorlesen lassen | «in eine Stimme verwandeln» es literal. | baja |
| chef.swapSubtitle | Tausch, was dir fehlt oder nicht geht | Tausch, was dir fehlt oder du nicht essen kannst | «nicht geht» es vago. | baja |
| studio.shtMedium | Halbtotale | Halbnah | «Plano medio» se acerca más a «Halbnah» que a «Halbtotale». Necesita a alguien del oficio. | baja |
| studio.shtEstablishing | Etablierende Einstellung | Establishing Shot | «Etablierende Einstellung» calca el inglés. Necesita a alguien del oficio. | baja |
| aiAvatar.genderOther | Divers | Anderes | «Divers» nace de la ley alemana; el español dice «Otro». No se verificó el uso suizo. | baja |
| onboarding.genderOther | Divers | Anderes | Igual que aiAvatar.genderOther. | baja |
| design.sampleArmchair | Sessel aus Holz | Fauteuil aus Holz | «Fauteuil» es variante suiza conocida; no se verificó en lo leído. | baja |

También quedan abiertos, ya fuera de estas filas: «...» frente a «…» en 56 filas, «40%» frente a «40 %» en 4 chips, «Weë Profil» frente a «Weë-Profil», y el «Sie…» de `filmmaker.takeReason*`.
