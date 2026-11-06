# Húngaro (hu-HU) en Weë — método, guía de estilo y glosario

Rama `i18n/hu-hu` (worktree `wee-trabajo/wt-i18n-hu`), desde `fashion/renombre-visible` `644d147e`, la misma base que el griego, el neerlandés y el vietnamita. Preparado el 2026-10-30. **Traducción hecha por agentes; sin revisión humana nativa.** Nada de esto es validación lingüística profesional.

## 1. Método (el mismo de los demás idiomas; ver `docs/I18N.md` § 5)

Catálogo `i18n/idiomas.ts` (`hu`, `listo: true`, `hu-HU` en `LOCALES_CONTEMPLADOS`) → diccionario `i18n/textos/hu/` (37 módulos tipados contra el español + `index.ts`) → `i18n/diccionarios.ts` → permisos de iOS (`locales/hu.json` + `app.json`) → fila de `components/ErrorBoundary.tsx` → suite `functions/test/i18n-hungaro.test.mjs` → huella → CSV de revisión con `scripts/i18n-revision.mjs exportar hu`. Sin sección `servidor/` (como los otros 13). La preferencia se guarda en el aparato y en la cuenta (`components/SincronizarIdioma.tsx` → `users.language`) sin cambios.

## 2. Lo propio del húngaro (comprobado con Node 24/ICU, 2026-10-30)

1. **Plural**: `Intl.PluralRules('hu')` tiene `one` y `other` y el cero es `other`. Pero tras un número el sustantivo va en SINGULAR («3 hozzászólás», nunca «3 hozzászólások»), así que `_one` y `_other` suelen decir lo mismo con `{{contador}}`; ninguna `_one` escribe «1» a mano.
2. **SUFIJOS Y ARMONÍA VOCÁLICA — la regla más importante**: el húngaro marca el caso con sufijos cuya vocal depende de la palabra anterior (-ban/-ben, -nak/-nek, -hoz/-hez/-höz, -val/-vel con asimilación). **Nunca se pega un sufijo a un `{{hueco}}`**: lo que entra por el hueco no se conoce. Se reescribe la frase (patrón etiqueta «Név: {{nombre}}», o el hueco como sujeto en nominativo). Igual que en turco y coreano.
3. **Marcas con sufijo**: la marca no cambia; el sufijo va con guion y en su forma de vocal ANTERIOR, la de «Weë» pronunciado [wiː]: «a Weë-ben», «a Weë-hez», «a Weë-n», «a WeeTalk-ban»… cuando no se pueda evitar. Se prefiere evitar el sufijo: «a Credits-egyenleged», «a Weë AI segítségével».
4. **Doble acento**: «ő» y «ű» (U+0151, U+0171) son letras propias; nunca «õ»/«û» (tilde o circunflejo, error típico de fuentes antiguas) ni «ö»/«ü» en su lugar. Texto en NFC.
5. **Formatos** (de `Intl` con `hu-HU`, nunca a mano): `1235 Ft`, `12 345,6` (los miles se agrupan desde 5 cifras), `2026. 10. 29.`, «2026. október 29. 14:30», listas «a, b és c». Comillas «„…”».
6. **LTR**, una sola escritura; Inter cubre ő/ű y „”.

## 3. Guía de estilo

- **Tratamiento**: «te» informal, como las redes sociales en húngaro («Mi jár a fejedben?»). Nunca «Ön/Önök».
- **Botones**: sustantivo de acción en -ás/-és, la convención de las interfaces húngaras: «Mentés», «Mégse», «Törlés», «Küldés», «Szerkesztés», «Megosztás», «Követés», «Folytatás», «Bezárás». En frases, imperativo con «te»: «Koppints…», «Válaszd ki…», «Próbáld újra».
- **Marcas** intocables, en latino sin traducir ni declinar dentro de la palabra: Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact, Credits, Weë AI / WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo, Weë Beauty, Weë Home, y Weë Business solo donde el español lo nombra como PRODUCTO. «Credits» nunca «kreditek»; «Weëls» nunca «Reels».
- **Identificadores**, `{{huecos}}`, emojis, rutas, ids, modelos y API: byte a byte. Si en/de/fr/it dejaron una palabra en inglés (Fashion, Beauty, 3D World, funciones de Weë Business), el húngaro también.
- **Lo que escribe una persona** no se traduce.
- **Espacios de borde** exactamente como en el español (`auth`, `onboarding` concatenan piezas: el orden de las palabras húngaro puede exigir mirar la pantalla que las junta).

## 4. Glosario

| Español | Húngaro | Nota |
|---|---|---|
| Inicio / el Home | Főoldal | |
| Buscar | Keresés | |
| Crear (+) | Létrehozás | |
| Explorar | Felfedezés | |
| Publicación · Publicar | bejegyzés · Közzététel | |
| Comentario · Responder | hozzászólás · Válasz | |
| Me gusta | Tetszik | contador: «{{contador}} kedvelés» |
| Compartir | Megosztás | |
| Seguir / Siguiendo / Seguidores | Követés / Követed / követők | |
| Guardar / Guardados | Mentés / Mentett elemek | |
| Cancelar · Eliminar · Editar · Enviar | Mégse · Törlés · Szerkesztés · Küldés | |
| Siguiente · Atrás · Cerrar · Continuar | Tovább · Vissza · Bezárás · Folytatás | |
| Reintentar | Újrapróbálás | |
| Cargando… | Betöltés… | |
| Algo salió mal | Hiba történt | |
| No sé (🤷) | Nem tudom | |
| Perfil · Perfil Real · Perfil Weë | Profil · Valódi profil · Weë-profil | |
| Comunidad(es) | közösség(ek) | |
| Notificaciones · Configuración · Ayuda | Értesítések · Beállítások · Súgó | |
| Iniciar / cerrar sesión | Bejelentkezés / Kijelentkezés | |
| Crear cuenta · Registrarse | Fiók létrehozása · Regisztráció | |
| Contraseña · Correo | jelszó · e-mail | |
| Mensaje · conversación | üzenet · beszélgetés | |
| Proyecto · Mis proyectos | projekt · Projektjeim | |
| Mis creaciones · creación | Alkotásaim · alkotás | |
| Prompt · Copiar prompt | prompt · Prompt másolása | |
| Imagen · Video · Foto · Texto | kép · videó · fotó · szöveg | |
| Pregunta · Tutorial | kérdés · útmutató | |
| Denunciar | Jelentés | |
| Subir · Descargar | Feltöltés · Letöltés | |
| Saldo | egyenleg | «Egyenleg: {{n}} Credits» |
| Cómo lo hice | Így készítettem | |
| Plantilla · borrador · resultado | sablon · piszkozat · eredmény | |
| IA | AI / MI | «Weë AI»; en prosa «AI» |

## 5. Lo que NO cubre este trabajo

- Sección `servidor/` en húngaro (esos textos salen en inglés, como en los otros 13).
- Palabras clave del buscador de Weë AI y nombres de ciudades: usa la lista inglesa.
- Detector de idioma: el húngaro usa alfabeto latino y necesita palabras funcionales («a», «az», «és», «hogy», «nem», «egy», «van», «meg», «is»…). El cambio de `functions/src/shared/idiomaDelTexto.ts` se prepara en este worktree, coordinado con el neerlandés y el vietnamita, que tocan el mismo archivo.
- Revisión humana nativa y validación visual: pendientes.
