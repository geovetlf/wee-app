# Finés (fi-FI) en Weë — método, guía de estilo y glosario

Rama `i18n/fi-fi` (worktree `wee-trabajo/wt-i18n-fi`), desde `fashion/renombre-visible` `644d147e`, la misma base que el griego, el neerlandés, el vietnamita y el húngaro. Preparado el 2026-10-30. **Traducción hecha por agentes; sin revisión humana nativa.** Nada de esto es validación lingüística profesional.

## 1. Método (el mismo de los demás idiomas; ver `docs/I18N.md` § 5)

Catálogo `i18n/idiomas.ts` (`fi`, `listo: true`, `fi-FI` en `LOCALES_CONTEMPLADOS`) → diccionario `i18n/textos/fi/` (37 módulos tipados contra el español + `index.ts`) → `i18n/diccionarios.ts` → permisos de iOS (`locales/fi.json` + `app.json`) → fila de `components/ErrorBoundary.tsx` → suite `functions/test/i18n-fines.test.mjs` (como `i18n-sueco`, `i18n-danes`) → huella → CSV de revisión con `scripts/i18n-revision.mjs exportar fi`. Sin sección `servidor/` (como los otros 13). La preferencia se guarda en el aparato y en la cuenta (`components/SincronizarIdioma.tsx` → `users.language`) sin cambios.

## 2. Lo propio del finés (comprobado con Node 24/ICU, 2026-10-30)

1. **Plural**: `one` y `other`; el cero es `other`. Tras un número mayor que 1 el sustantivo va en PARTITIVO singular («3 kommenttia», no «3 kommentit»); con 1, nominativo («1 kommentti»). Así que `_one` y `_other` SÍ difieren, y ninguna `_one` escribe «1» a mano: `{{contador}} kommentti` / `{{contador}} kommenttia`.
2. **CASOS Y HUECOS — la regla más importante**: el finés marca el caso con terminaciones (-ssa/-ssä, -lle, -n, -a/-ä, -sta/-stä…) con armonía vocálica. **Nunca se pega una terminación a un `{{hueco}}`**: lo que entra no se conoce. Se reescribe la frase (etiqueta «Nimi: {{nombre}}», hueco como sujeto en nominativo, o «käyttäjältä {{nombre}}» con la preposición-caso en la palabra ANTERIOR).
3. **Marcas con caso**: la marca no cambia; si no se puede evitar, terminación con dos puntos: «Weë:ssä», «WeeTalk:iin», «Credits-saldo». Mejor evitarlo: «Weë-sovelluksessa», «Weë AI:n avulla» → «Weë AI -avustajalla».
4. **Compuestos con marca**: guion y espacio antes cuando la marca tiene varias palabras («Weë Studio -projekti»), guion pegado si es una sola («Weë-profiili»).
5. **Formatos** (de `Intl` con `fi-FI`, nunca a mano): `1 234,50 €` (espacio fino), `12 345,6`, `29.10.2026`, «29. lokakuuta 2026 klo 14.30» (la hora con PUNTO), listas «a, b ja c». Comillas «”…”» (la misma de cierre a los dos lados).
6. **Letras**: ä, ö, å (å solo en nombres suecos), š/ž en préstamos; Inter las cubre. NFC.
7. **LTR**, una sola escritura.

## 3. Guía de estilo

- **Tratamiento**: «sinä» informal (sinuttelu), que es la norma en apps y redes en Finlandia. El pronombre se omite casi siempre: «Tallenna», «Kirjoita jotain…».
- **Botones**: imperativo de 2.ª persona del singular, la convención de las interfaces finlandesas (Google, Apple): «Tallenna», «Peruuta», «Poista», «Lähetä», «Muokkaa», «Jaa», «Seuraa», «Jatka», «Sulje». Los títulos de sección, en sustantivo («Asetukset», «Ilmoitukset»).
- **Marcas** intocables, en latino sin traducir ni declinar dentro de la palabra: Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact, Credits, Weë AI / WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo, Weë Beauty, Weë Home, y Weë Business solo donde el español lo nombra como PRODUCTO. «Credits» nunca «krediitit»; «Weëls» nunca «Reels».
- **Identificadores**, `{{huecos}}`, emojis, rutas, ids, modelos y API: byte a byte. Si en/de/fr/it dejaron una palabra en inglés (Fashion, Beauty, 3D World, funciones de Weë Business), el finés también.
- **Lo que escribe una persona** no se traduce.
- **Espacios de borde** exactamente como en el español (`auth`, `onboarding` concatenan piezas).
- **Compuestos juntos**: «profiilikuva», «salasana», «käyttäjänimi»; un compuesto partido es el error más visible.

## 4. Glosario

| Español | Finés | Nota |
|---|---|---|
| Inicio / el Home | Koti | pestaña |
| Buscar | Hae | botón; «Haku» como título |
| Crear (+) | Luo | |
| Explorar | Tutki | |
| Publicación · Publicar | julkaisu · Julkaise | |
| Comentario · Responder | kommentti · Vastaa | |
| Me gusta | Tykkää | contador: «{{contador}} tykkäys» / «{{contador}} tykkäystä» |
| Compartir | Jaa | |
| Seguir / Siguiendo / Seguidores | Seuraa / Seurataan / seuraajat | |
| Guardar / Guardados | Tallenna / Tallennetut | |
| Cancelar · Eliminar · Editar · Enviar | Peruuta · Poista · Muokkaa · Lähetä | |
| Siguiente · Atrás · Cerrar · Continuar | Seuraava · Takaisin · Sulje · Jatka | |
| Reintentar | Yritä uudelleen | |
| Cargando… | Ladataan… | |
| Algo salió mal | Jokin meni pieleen | |
| No sé (🤷) | En tiedä | |
| Perfil · Perfil Real · Perfil Weë | Profiili · Oikea profiili · Weë-profiili | |
| Comunidad(es) | yhteisö(t) | |
| Notificaciones · Configuración · Ayuda | Ilmoitukset · Asetukset · Ohje | |
| Iniciar / cerrar sesión | Kirjaudu sisään / Kirjaudu ulos | |
| Crear cuenta · Registrarse | Luo tili · Rekisteröidy | |
| Contraseña · Correo | salasana · sähköposti | |
| Mensaje · conversación | viesti · keskustelu | |
| Proyecto · Mis proyectos | projekti · Omat projektit | |
| Mis creaciones · creación | Omat luomukset · luomus | |
| Prompt · Copiar prompt | kehote · Kopioi kehote | «prompt» se entiende; «kehote» es la forma establecida en finés |
| Imagen · Video · Foto · Texto | kuva · video · valokuva · teksti | |
| Pregunta · Tutorial | kysymys · opas | |
| Denunciar | Ilmianna | |
| Subir · Descargar | Lataa (palvelimelle) · Lataa | en botones cortos «Lataa» para ambos si el contexto lo deja claro; si no, «Lähetä kuva» / «Lataa laitteelle» |
| Saldo | saldo | «Saldo: {{n}} Credits» |
| Cómo lo hice | Näin tein sen | |
| Plantilla · borrador · resultado | malli · luonnos · tulos | |
| IA | tekoäly / AI | «Weë AI»; en prosa «tekoäly» |

## 5. Lo que NO cubre este trabajo

- Sección `servidor/` en finés (esos textos salen en inglés, como en los otros 13).
- Palabras clave del buscador de Weë AI y nombres de ciudades: usa la lista inglesa.
- Detector de idioma: alfabeto latino, necesita palabras funcionales («ja», «on», «ei», «että», «se», «joka», «tai», «myös», «kun», «sinun»…). El cambio de `functions/src/shared/idiomaDelTexto.ts` se prepara en este worktree, coordinado con los demás idiomas que tocan el mismo archivo.
- Revisión humana nativa y validación visual: pendientes.
