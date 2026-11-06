# Rumano (ro-RO) en Weë — método, guía de estilo y glosario

Rama `i18n/ro-ro` (worktree `wee-trabajo/wt-i18n-ro`), desde `644d147e`, la misma base que los demás idiomas en curso. Preparado el 2026-10-30. **Traducción hecha por agentes; sin revisión humana nativa.**

## 1. Método: el de siempre (`docs/I18N.md` § 5): catálogo `ro` + `ro-RO` → `i18n/textos/ro/` (37 módulos + `index.ts`) → `diccionarios.ts` → `locales/ro.json` + `app.json` → `ErrorBoundary.tsx` → suite `functions/test/i18n-rumano.test.mjs` → huella → CSV de revisión. Sin sección `servidor/`.

## 2. Lo propio del rumano (comprobado con Node 24/ICU, 2026-10-30)

1. **Tres plurales**: `Intl.PluralRules('ro')` → `one` (1), `few` (0, 2–19, y los que acaban en 01–19 por encima de 100: 101, 119, 2–19…), `other` (20–100, 120, 1 000…). El `few` se declara con **`_few`** usando el tipo `ConPlurales` (`i18n/textos/ru/plurales.ts` ya lo admite). El `other` lleva «de»: «20 de comentarii». Ninguna `_one` escribe «1» a mano.
2. **Diacríticos con coma**: **ș** (U+0219) y **ț** (U+021B), nunca con cedilla (ş U+015F, ţ U+0163). También ă, â, î. Inter los cubre. Texto en NFC. La ortografía oficial actual usa «â» en interior («când») e «î» inicial/final («început»), y «sunt», no «sînt».
3. **Formatos** (de `Intl` con `ro-RO`): `12.345,6`, `1.234,50 RON`, `29.10.2026`, «29 octombrie 2026 la 14:30», listas «a, b și c». Comillas «„…”».
4. LTR.

## 3. Guía de estilo

- **Tratamiento**: «tu» informal, convención de las apps sociales en Rumanía (Instagram, TikTok). Posesivo «tău/ta/tăi/tale», pronombre «te/îți».
- **Botones**: infinitivo corto sin «a», como las interfaces rumanas de Google/Apple: «Salvează» (imperativo) se usa también mucho; **se elige el imperativo de 2.ª singular** por coherencia con las apps sociales: «Salvează», «Anulează», «Șterge», «Trimite», «Editează», «Distribuie», «Urmărește», «Continuă», «Închide».
- **Artículo enclítico y hueco**: el rumano pone el artículo al final de la palabra («profilul lui {{nombre}}»); como no se sabe el género de lo que entra por el hueco, nunca se declina el hueco y se evita el genitivo («Profil: {{nombre}}» o «profilul utilizatorului {{nombre}}»).
- **Marcas** intocables en latino (Weë, Wäll, Weëls —nunca «Reels»—, WeeTalk, ËContact, ẄContact, Credits —nunca «credite»—, Weë AI, WEË AI, Weë Brain/Studio/Design/Writer/Music/Chef/Fashion/Travel/Photo/Beauty/Home, Weë Business solo donde el español lo nombra). Sin artículo enclítico pegado a la marca: «aplicația Weë», «contul tău Weë», «soldul de Credits».
- **Identificadores**, `{{huecos}}`, emojis, rutas, modelos y API: byte a byte. Lo que es y en dejan en inglés se deja.
- **Espacios de borde** exactamente como en el español.

## 4. Glosario

| Español | Rumano | Nota |
|---|---|---|
| Inicio / el Home | Acasă | |
| Buscar | Caută | |
| Crear (+) | Creează | |
| Explorar | Explorează | |
| Publicación · Publicar | postare · Publică | |
| Comentario · Responder | comentariu · Răspunde | «{{contador}} comentariu / comentarii / de comentarii» |
| Me gusta | Îmi place | contador «aprecieri» |
| Compartir | Distribuie | |
| Seguir / Siguiendo / Seguidores | Urmărește / Urmărești / urmăritori | |
| Guardar / Guardados | Salvează / Salvate | |
| Cancelar · Eliminar · Editar · Enviar | Anulează · Șterge · Editează · Trimite | |
| Siguiente · Atrás · Cerrar · Continuar | Următorul · Înapoi · Închide · Continuă | |
| Reintentar | Încearcă din nou | |
| Cargando… | Se încarcă… | |
| Algo salió mal | Ceva nu a mers bine | |
| No sé (🤷) | Nu știu | |
| Perfil · Perfil Real · Perfil Weë | Profil · Profil real · Profil Weë | |
| Comunidad(es) | comunitate (comunități) | |
| Notificaciones · Configuración · Ayuda | Notificări · Setări · Ajutor | |
| Iniciar / cerrar sesión | Conectează-te / Deconectează-te | |
| Crear cuenta · Registrarse | Creează cont · Înregistrează-te | |
| Contraseña · Correo | parolă · e-mail | |
| Mensaje · conversación | mesaj · conversație | |
| Proyecto · Mis proyectos | proiect · Proiectele mele | |
| Mis creaciones · creación | Creațiile mele · creație | |
| Prompt · Copiar prompt | prompt · Copiază promptul | |
| Imagen · Video · Foto · Texto | imagine · video · fotografie · text | |
| Pregunta · Tutorial | întrebare · tutorial | |
| Denunciar | Raportează | |
| Subir · Descargar | Încarcă · Descarcă | |
| Saldo | sold | |
| Cómo lo hice | Cum am făcut | |
| IA | IA / AI | «Weë AI»; en prosa «IA» (inteligență artificială) |

## 5. Lo que NO cubre: sección `servidor/`, palabras clave del buscador, detector (alfabeto latino: palabras funcionales «și», «este», «sunt», «pentru», «care», «nu», «cu», «din», «la», «să», «mai»; propuesta para la integración), revisión nativa y visual.
