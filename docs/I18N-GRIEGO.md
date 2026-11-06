# Griego (el-GR) en Weë — auditoría, método, guía de estilo y glosario

Rama `i18n/el-gr` (worktree `wee-trabajo/wt-i18n-el`), desde `fashion/renombre-visible` `644d147e` (= `origin/main` `5efbc0a7` + el renombre visible de Business a Weë Fashion). Preparado el 2026-10-29. **Traducción hecha por agentes; sin revisión humana nativa.** Nada de esto es validación lingüística profesional.

## 1. Auditoría: cómo funciona hoy la internacionalización (verificado en el código, no en informes)

| Pieza | Dónde | Qué hace |
|---|---|---|
| Catálogo | `i18n/idiomas.ts` | `CodigoDeIdioma`, `IDIOMAS` (nombre nativo, dirección, `listo`, `variantes`), `LOCALES_CONTEMPLADOS`, `IDIOMA_DE_RESERVA = 'en'`. No importa nada. |
| Diccionarios | `i18n/diccionarios.ts` | `DICCIONARIOS` = código o locale → objeto. Los alias de variante (zh-Hant-TW, pt-AO…) son datos. `es`/`en`/`da` llevan además la sección `servidor/`. |
| Textos | `i18n/textos/<idioma>/<módulo>.ts` + `index.ts` | 37 módulos. El español es el MOLDE: `typeof import('../es/<módulo>')` y `FormaDelDiccionario` hacen que una clave que falte o sobre no compile. |
| Resolutor | `i18n/resolver.ts` | `elegirIdioma(elegido, aparato, disponibles)`: elegido > aparato > reserva. `cadenaDeRespaldo('el-GR') = ['el-GR','el','en']`. La ubicación no interviene jamás. |
| Traductor | `i18n/traducir.ts` | Busca clave a clave por la cadena; plurales con `Intl.PluralRules(locale)` → `clave_<categoría>`, `clave_other`, `clave`; interpola `{{hueco}}` y formatea los números con el locale. Sin clave: en desarrollo la clave, en producción un texto de emergencia. |
| Contexto | `contexts/IdiomaContext.tsx` | `useT()`, `useIdioma()` (idioma, locale, dirección, `formato.*`), `cambiarIdioma`, `<html lang>` en web. |
| Preferencia | `i18n/preferencia.ts` + `components/SincronizarIdioma.tsx` | La elección manual se guarda en el aparato (`AsyncStorage` `wee.idioma.preferencia`) **y en la cuenta**: `SincronizarIdioma`, montado en `App.tsx`, escribe `users.language` cuando la persona ELIGE un idioma (nunca lo deducido del aparato) y lo adopta al cargar su perfil en otro aparato. Además el servidor recibe el locale en cada llamada (`creatorChat`/`creatorRun`, `pushTokens.locale`). Corregido el 2026-10-29: la primera versión de esta guía decía, por error, que no se sincronizaba. |
| Formatos | `i18n/formato.ts` | Número, moneda, porcentaje, fecha, hora, tiempo relativo, lista, distancia: todo `Intl` con el locale activo. |
| Caja y búsqueda | `i18n/caja.ts`, `components/TextoEnMayusculas.tsx` | `conMayusculaInicial`, `paraBuscar` (turco, hindi), `sinEspaciadoSiSeUne`. |
| Servidor | `i18n/servidor.ts` + `textos/<es|en|da>/servidor/`, `functions/src/shared/textosDelServidor.ts`, `functions/src/creator/prompts.ts` (`instruccionDeSalida`) | Flujo guiado, errores del motor, push y página pública. Solo es/en/da tienen sección de servidor; **los otros 13 idiomas ven esos textos en inglés** (decisión pendiente del dueño, desde el danés). Weë Brain responde en el idioma del locale que manda la app. |
| Permisos iOS | `app.json` → `expo.locales` + `locales/<idioma>.json` | Textos de cámara, fotos, micrófono… por idioma. |
| Pantalla de error | `components/ErrorBoundary.tsx` | Tabla propia por idioma (es una clase y no puede usar hooks). |
| Detector de idioma (servidor) | `functions/src/shared/idiomaDelTexto.ts` | Observa en qué idioma salió la IA; solo registra, no decide. |
| Pruebas | `functions/test/i18n*.test.mjs` y afines | Calculan los idiomas del REGISTRO: un idioma nuevo queda vigilado sin tocarlas (paridad, NFC, huecos, emojis, bordes, permisos iOS, pantalla de error, nombres propios…). |

**Cómo entraron los idiomas anteriores** (commits `bc61ad8` ja, `eb2dad6` tr, `31d51f4` sv, `d731b6d` hi, `79cf145` da): guía `docs/I18N-<IDIOMA>.md` → traducción de los 37 módulos por grupos en paralelo con un validador → registro (`idiomas.ts`, `diccionarios.ts`, `LOCALES_CONTEMPLADOS`, permisos iOS, pantalla de error) → suite propia `i18n-<idioma>.test.mjs` → pruebas → commit propio. Lo que cada idioma necesitó de más se resolvió en el sistema común, nunca en paralelo: `ConPlurales` (ruso), `paraBuscar`/`TextoEnMayusculas` (turco), `sinEspaciadoSiSeUne` (hindi), variantes (chino, portugués).

**Japonés y chino**: no distinguen número (`_one` = `_other`), puntuación de ancho completo, sin espacios de borde, variantes de escritura (zh). **Nada de eso se aplica al griego**: el griego separa palabras, tiene `one`/`other` y una sola escritura.

## 2. Lo propio del griego (comprobado con Node 24/ICU, 2026-10-29)

1. **Plural**: `Intl.PluralRules('el')` → `one` y `other`; el **cero es `other`** (como en español). Ninguna forma `_one` escribe un «1» a mano: lleva `{{contador}}`.
2. **Mayúsculas SIN tilde**: en griego, al pasar a mayúsculas se quita el tono y, si la vocal acentuada iba antes de ι/υ, la otra recibe diéresis: «Μάιος» → «ΜΑΪΟΣ», «Ρυθμίσεις» → «ΡΥΘΜΙΣΕΙΣ». V8 lo hace con `toLocaleUpperCase('el')`; `toUpperCase()` sin locale deja «ΡΥΘΜΊΣΕΙΣ», que está mal, y Hermes en nativo no garantiza la regla. Por eso la regla vive en el sistema común (`i18n/caja.ts` → `enMayusculas`) y la usa `TextoEnMayusculas`. En los diccionarios no se escribe nada en mayúsculas sostenidas salvo lo que el español ya escribe así (siglas, «CV»), y entonces sin tildes.
3. **Búsqueda**: la gente escribe sin tilde («μουσικη»). `paraBuscar` iguala, SOLO en letras griegas, el tono, la diéresis y la sigma final (ς → σ). El resto de escrituras no cambia.
4. **Puntuación**: comillas « », signo de interrogación «;» (el U+037E se convierte en «;» con NFC, así que se escribe directamente «;»), punto alto «·» (U+00B7, el U+0387 también se normaliza), puntos suspensivos «…».
5. **Formatos** (de `Intl` con `el-GR`, nunca a mano): `1.234,50 €`, `29/10/2026`, «29 Οκτωβρίου 2026», listas «α, β και γ», «χθες». La hora sale en 12 horas («2:30 μ.μ.») porque es lo que da CLDR para `el`: no se cambia con un `if`; queda anotado para la revisión nativa.
6. **Fuente**: Inter (`@expo-google-fonts/inter`, 400/500/600/700) cubre el griego completo, con tonos, diéresis, ς, «;», «·», « » y €: comprobado leyendo la tabla `cmap` de los cuatro TTF.
7. **Dirección**: LTR. Ningún cambio RTL.

## 3. Guía de estilo

- **Tratamiento**: segunda persona del SINGULAR (εσύ), tono cercano, como las redes sociales en griego («Τι σκέφτεσαι;»). Decisión de agente, pendiente de confirmar por el dueño: si prefiere el plural de cortesía (εσείς), se cambia en una pasada.
- **Botones y acciones**: SUSTANTIVO de acción («Αποθήκευση», «Ακύρωση», «Διαγραφή», «Αποστολή», «Επεξεργασία», «Δημιουργία»), que es la convención de las interfaces en griego. En frases e instrucciones, imperativo singular («Πάτησε», «Γράψε», «Δοκίμασε ξανά»).
- **Marcas** (intocables, en alfabeto latino, sin transliterar ni declinar): Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact, Credits, Weë AI / WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo, Weë Beauty, Weë Home (y Weë Business donde el español lo nombra como PRODUCTO, `weebiz`; nunca como sección). Se usan con artículo griego NEUTRO cuando la frase lo pide: «στο Weë», «το Weë Studio», «τα Credits», «στο WeeTalk», «στο Wäll σου». Nunca «Κρέντιτς», «Γουί», «Weë Μουσική».
- **Identificadores técnicos**, `{{huecos}}`, emojis, rutas, ids, nombres de modelos y de API: byte a byte. Si en/de/fr/it dejaron una palabra igual (p. ej. «Fashion», «Beauty», «3D World», nombres de funciones de Weë Business en inglés), el griego también.
- **Lo que escribe una persona** (publicaciones, comentarios, nombres de comunidades, prompts) no se traduce: es contenido.
- **Espacios de borde** (sobre todo en `auth` y `onboarding`, que se concatenan): exactamente los del español.
- **Longitud**: el griego sale ~20-30 % más largo que el inglés. En pestañas, chips y botones, la forma más corta natural («Αρχική», «Ρυθμίσεις», «Προφίλ»).

## 4. Glosario

| Español | Griego | Nota |
|---|---|---|
| Inicio / el Home | Αρχική | pestaña y destino |
| Buscar | Αναζήτηση | |
| Crear (+) | Δημιουργία | |
| Explorar | Εξερεύνηση | |
| Publicación | ανάρτηση (pl. αναρτήσεις) | |
| Publicar | Δημοσίευση (botón) / δημοσίευσε | |
| Comentario | σχόλιο | |
| Responder | Απάντηση | |
| Me gusta | Μου αρέσει | «{{contador}} μου αρέσει» |
| Compartir | Κοινοποίηση | |
| Seguir / Siguiendo / Seguidores | Ακολούθηση / Ακολουθείς / ακόλουθοι | |
| Guardar / Guardados | Αποθήκευση / Αποθηκευμένα | |
| Cancelar · Eliminar · Editar · Enviar | Ακύρωση · Διαγραφή · Επεξεργασία · Αποστολή | |
| Siguiente · Atrás · Cerrar · Continuar | Επόμενο · Πίσω · Κλείσιμο · Συνέχεια | |
| Reintentar | Δοκίμασε ξανά | |
| Cargando… | Φόρτωση… | |
| Algo salió mal | Κάτι πήγε στραβά | |
| No sé (🤷) | Δεν ξέρω | |
| Perfil · Perfil Real · Perfil Weë | Προφίλ · Πραγματικό προφίλ · Προφίλ Weë | |
| Comunidad(es) | κοινότητα (κοινότητες) | |
| Notificaciones · Configuración · Ayuda | Ειδοποιήσεις · Ρυθμίσεις · Βοήθεια | |
| Iniciar / cerrar sesión | Σύνδεση / Αποσύνδεση | |
| Crear cuenta · Registrarse | Δημιουργία λογαριασμού · Εγγραφή | |
| Contraseña · Correo | κωδικός πρόσβασης · email | |
| Mensaje · conversación | μήνυμα · συνομιλία | |
| Proyecto · Mis proyectos | έργο · Τα έργα μου | |
| Mis creaciones · creación | Οι δημιουργίες μου · δημιουργία | |
| Prompt · Copiar prompt | prompt (το, τα prompts) · Αντιγραφή prompt | término de creadores, en latino |
| Imagen · Video · Foto · Texto | εικόνα · βίντεο · φωτογραφία · κείμενο | |
| Pregunta · Tutorial | ερώτηση · οδηγός (οδηγοί) | |
| Denunciar | Αναφορά | |
| Subir · Descargar | Μεταφόρτωση · Λήψη | |
| Saldo | υπόλοιπο | «Υπόλοιπο: {{n}} Credits» |
| Cómo lo hice | Πώς το έφτιαξα | |
| Plantilla · borrador · resultado | πρότυπο · πρόχειρο · αποτέλεσμα | |
| Plano (cine) · toma | πλάνο · λήψη | |

## 5. Lo que NO cubre este trabajo (y por qué)

- Sección `servidor/` en griego: ningún idioma salvo es/en/da la tiene; el griego ve esos textos en inglés, igual que los otros 13, hasta que el dueño decida.
- Buscador de experiencias de Weë AI por palabras (`constants/weeExperiences.ts` `PALABRAS_POR_IDIOMA`) y nombres de ciudades (`data/ciudadesPorIdioma.ts`): solo da/en; el griego cae en la lista inglesa, como los otros 13.
- Revisión humana nativa: pendiente.
