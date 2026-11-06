# Neerlandés (nl-NL) en Weë — método, guía de estilo y glosario

Rama `i18n/nl-nl` (worktree `wee-trabajo/wt-i18n-nl`), desde `fashion/renombre-visible` `644d147e` (= `origin/main` `5efbc0a7` + el renombre visible a Weë Fashion), la misma base que el griego (`i18n/el-gr`). Preparado el 2026-10-30. **Traducción hecha por agentes; sin revisión humana nativa.** Nada de esto es validación lingüística profesional.

## 1. Método (el mismo de los demás idiomas; ver `docs/I18N.md` § 5 y `docs/I18N-GRIEGO.md` § 1)

Catálogo `i18n/idiomas.ts` (`nl`, `listo: true`, `nl-NL` en `LOCALES_CONTEMPLADOS`) → diccionario `i18n/textos/nl/` (37 módulos tipados contra el español + `index.ts`) → `i18n/diccionarios.ts` → permisos de iOS (`locales/nl.json` + `app.json`) → fila de `components/ErrorBoundary.tsx` → suite `functions/test/i18n-neerlandes.test.mjs` → huella `i18n/huella.json` → CSV de revisión con `scripts/i18n-revision.mjs exportar nl`. Sin sección `servidor/` (como los otros 13 idiomas: esos textos salen en inglés). La preferencia se guarda en el aparato y en la cuenta (`components/SincronizarIdioma.tsx` → `users.language`) sin cambios.

## 2. Lo propio del neerlandés (comprobado con Node 24/ICU, 2026-10-30)

1. **Plural**: `one` y `other`; el **cero es `other`** («0 reacties»). Ninguna `_one` escribe «1» a mano: `{{contador}}`.
2. **Formatos** (de `Intl` con `nl-NL`, nunca a mano): `€ 1.234,50`, `12.345,6`, `29-10-2026`, «29 oktober 2026 om 14:30» (24 horas), listas «a, b en c».
3. **El dígrafo «ij»**: a principio de frase se escriben las DOS en mayúscula («IJsje», «IJsland»). `conMayusculaInicial` lo hace en el sistema común (`i18n/caja.ts`); en mayúsculas sostenidas `toLocaleUpperCase` ya da «IJS».
4. **Compuestos juntos**: una palabra compuesta se escribe junta («profielfoto», «wachtwoord», «zoekbalk»). Con una marca, con guion: «Weë-profiel», «Weë-account». Un compuesto partido («profiel foto») es el error más visible.
5. **Apóstrofo de plural**: «foto's», «video's», «menu's», «emoji's» (palabras acabadas en vocal larga). En el archivo `.ts` se escribe `\'` dentro de las comillas simples.
6. **Diéresis y tildes del neerlandés** se conservan: «ideeën», «financiële», «creëren», «café», «één» (solo cuando «één» = el número uno y hay ambigüedad).
7. **LTR**, una sola escritura: nada de RTL.

## 3. Guía de estilo

- **Tratamiento**: «je/jij» (informal), como Instagram, WhatsApp o TikTok en los Países Bajos. Posesivo «je» (átono) o «jouw» (énfasis). Nunca «u».
- **Botones y acciones**: el INFINITIVO, que es la convención de las interfaces neerlandesas: «Opslaan», «Annuleren», «Verwijderen», «Versturen», «Bewerken», «Delen», «Volgen». En frases e instrucciones, imperativo con «je» implícito: «Tik op…», «Kies…», «Probeer het opnieuw».
- **Marcas** intocables (alfabeto latino, sin traducir ni declinar): Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact, Credits, Weë AI / WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo, Weë Beauty, Weë Home, y Weë Business solo donde el español lo nombra como PRODUCTO (`weebiz`). «Credits» nunca «credits» ni «tegoed»: es la marca (se puede decir «je Credits-saldo»). «Weëls» nunca «Reels».
- **Identificadores**, `{{huecos}}`, emojis, rutas, ids, nombres de modelos y de API: byte a byte. Si en/de/fr/it dejaron una palabra en inglés («Fashion», «Beauty», «3D World», funciones de Weë Business en inglés), el neerlandés también.
- **Lo que escribe una persona** no se traduce (publicaciones, comentarios, nombres de comunidades, prompts).
- **Espacios de borde** (sobre todo `auth`, `onboarding`): exactamente los del español.
- **Comillas**: “…” para citar un botón o un nombre en una frase («Tik op “Opslaan”»).
- **Longitud**: el neerlandés sale algo más largo que el inglés; en pestañas y chips, la forma corta natural.

## 4. Glosario

| Español | Neerlandés | Nota |
|---|---|---|
| Inicio / el Home | Home | pestaña; «Start» no |
| Buscar | Zoeken | |
| Crear (+) | Maken | |
| Explorar | Ontdekken | |
| Publicación | bericht (mv. berichten) | «post» se entiende pero «bericht» es lo de Instagram NL |
| Publicar | Plaatsen | |
| Comentario · Responder | reactie · Reageren | |
| Me gusta | Vind ik leuk | contador: «{{contador}} vind-ik-leuks» |
| Compartir | Delen | |
| Seguir / Siguiendo / Seguidores | Volgen / Volgend / volgers | |
| Guardar / Guardados | Opslaan / Opgeslagen | |
| Cancelar · Eliminar · Editar · Enviar | Annuleren · Verwijderen · Bewerken · Versturen | |
| Siguiente · Atrás · Cerrar · Continuar | Volgende · Terug · Sluiten · Doorgaan | |
| Reintentar | Opnieuw proberen | |
| Cargando… | Laden… | |
| Algo salió mal | Er ging iets mis | |
| No sé (🤷) | Weet ik niet | |
| Perfil · Perfil Real · Perfil Weë | Profiel · Echt profiel · Weë-profiel | |
| Comunidad(es) | community (mv. community's) | uso actual en NL |
| Notificaciones · Configuración · Ayuda | Meldingen · Instellingen · Help | |
| Iniciar / cerrar sesión | Inloggen / Uitloggen | |
| Crear cuenta · Registrarse | Account maken · Registreren | |
| Contraseña · Correo | wachtwoord · e-mail | |
| Mensaje · conversación | bericht · gesprek | en WeeTalk |
| Proyecto · Mis proyectos | project · Mijn projecten | |
| Mis creaciones · creación | Mijn creaties · creatie | |
| Prompt · Copiar prompt | prompt · Prompt kopiëren | |
| Imagen · Video · Foto · Texto | afbeelding · video · foto · tekst | |
| Pregunta · Tutorial | vraag · tutorial | |
| Denunciar | Melden | |
| Subir · Descargar | Uploaden · Downloaden | |
| Saldo | saldo | «Saldo: {{n}} Credits» |
| Cómo lo hice | Zo heb ik het gemaakt | |
| Plantilla · borrador · resultado | sjabloon · concept · resultaat | |
| Plano (cine) · toma | shot · take | uso de la industria en NL |
| IA | AI | «Weë AI»; en prosa «AI» |

## 5. Lo que NO cubre este trabajo

- Sección `servidor/` en neerlandés (los textos del servidor salen en inglés, como en los otros 13).
- Palabras clave del buscador de Weë AI (`PALABRAS_POR_IDIOMA`) y nombres de ciudades: el neerlandés usa la lista inglesa.
- Revisión humana nativa y validación visual: pendientes.
