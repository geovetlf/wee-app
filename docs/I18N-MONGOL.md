# Mongol (mn-MN) en Weë — método, guía de estilo y glosario

Rama `i18n/mn-mn` (worktree `wee-trabajo/wt-i18n-mn`), desde `fashion/renombre-visible` `644d147e`, la misma base que los demás idiomas en curso. Preparado el 2026-10-30. **Traducción hecha por agentes; sin revisión humana nativa.**

## 1. Método (el mismo de los demás idiomas; ver `docs/I18N.md` § 5)

Catálogo `i18n/idiomas.ts` (`mn`, `listo: true`, `mn-MN` en `LOCALES_CONTEMPLADOS`) → diccionario `i18n/textos/mn/` (37 módulos + `index.ts`) → `i18n/diccionarios.ts` → `locales/mn.json` + `app.json` → fila de `ErrorBoundary.tsx` → suite `functions/test/i18n-mongol.test.mjs` → huella → CSV de revisión con `scripts/i18n-revision.mjs exportar mn`. Sin sección `servidor/`.

## 2. Lo propio del mongol (comprobado con Node 24/ICU, 2026-10-30)

1. **Escritura**: cirílico mongol moderno (el de Mongolia), con las dos letras propias **Ө/ө** (U+04E8/U+04E9) y **Ү/ү** (U+04AE/U+04AF). Nunca «Ө» escrita como «Ө» latina ni «Y»/«у» en su lugar. La escritura vertical tradicional queda FUERA. Inter cubre el cirílico mongol completo (comprobado en `cmap`). LTR.
2. **Plural**: `one` y `other`; el cero es `other`. Tras un número el sustantivo NO cambia («3 сэтгэгдэл»), así que `_one` y `_other` suelen decir lo mismo con `{{contador}}`; nada de «1» a mano.
3. **SUFIJOS Y ARMONÍA VOCÁLICA**: el mongol marca el caso con sufijos cuya vocal depende de la palabra («-д/-т», «-ийн/-ын», «-аас/-ээс/-оос/-өөс», «-тай/-тэй/-той»). **Nunca se pega un sufijo a un `{{hueco}}`**: se reescribe («Нэр: {{nombre}}», o hueco como sujeto). Sobre una marca, el sufijo va **con guion**: «Weë-д», «WeeTalk-аар», «Credits-ийн үлдэгдэл». Mejor evitarlo con un sustantivo puente: «Weë апп дотор», «WeeTalk чатаар».
4. **Formatos** (de `Intl` con `mn-MN`): `12,345.6`, `₮ 1,234.50`, `2026.10.29`, «2026 оны аравдугаар сарын 29 14:30», listas «а, б, в». Hora de 24 h.
5. **Puntuación**: «?» y «!» normales; comillas «…» o “…”.

## 3. Guía de estilo

- **Tratamiento**: «та» (formal-cortés) es la norma en apps en Mongolia incluso con tuteo implícito; posesivo «таны». Imperativos de cortesía en «-на уу / -нэ үү / -но уу / -нө үү» en instrucciones («Нэрээ оруулна уу»).
- **Botones**: verbo en forma nominal corta o imperativo breve, convención de Google/Facebook en mongol: «Хадгалах», «Болих», «Устгах», «Илгээх», «Засах», «Хуваалцах», «Дагах», «Үргэлжлүүлэх», «Хаах».
- **Marcas** intocables en latino (Weë, Wäll, Weëls —nunca «Reels»—, WeeTalk, ËContact, ẄContact, Credits —nunca «кредит»—, Weë AI, WEË AI, Weë Brain/Studio/Design/Writer/Music/Chef/Fashion/Travel/Photo/Beauty/Home, Weë Business solo donde el español lo nombra).
- **Identificadores**, `{{huecos}}`, emojis, rutas, modelos y API: byte a byte. Lo que es y en dejan en inglés (Fashion, Beauty, 3D World, funciones de Weë Business) se deja.
- **Espacios de borde** exactamente como en el español.

## 4. Glosario

| Español | Mongol | Nota |
|---|---|---|
| Inicio / el Home | Нүүр | |
| Buscar | Хайх | |
| Crear (+) | Үүсгэх | |
| Explorar | Нээх | |
| Publicación · Publicar | нийтлэл · Нийтлэх | |
| Comentario · Responder | сэтгэгдэл · Хариулах | |
| Me gusta | Таалагдлаа | contador «{{contador}} лайк» |
| Compartir | Хуваалцах | |
| Seguir / Siguiendo / Seguidores | Дагах / Дагаж байна / дагагчид | |
| Guardar / Guardados | Хадгалах / Хадгалсан | |
| Cancelar · Eliminar · Editar · Enviar | Болих · Устгах · Засах · Илгээх | |
| Siguiente · Atrás · Cerrar · Continuar | Дараах · Буцах · Хаах · Үргэлжлүүлэх | |
| Reintentar | Дахин оролдох | |
| Cargando… | Ачаалж байна… | |
| Algo salió mal | Алдаа гарлаа | |
| No sé (🤷) | Мэдэхгүй | |
| Perfil · Perfil Real · Perfil Weë | Профайл · Бодит профайл · Weë профайл | |
| Comunidad(es) | нийгэмлэг | |
| Notificaciones · Configuración · Ayuda | Мэдэгдэл · Тохиргоо · Тусламж | |
| Iniciar / cerrar sesión | Нэвтрэх / Гарах | |
| Crear cuenta · Registrarse | Бүртгэл үүсгэх · Бүртгүүлэх | |
| Contraseña · Correo | нууц үг · имэйл | |
| Mensaje · conversación | мессеж · яриа | |
| Proyecto · Mis proyectos | төсөл · Миний төслүүд | |
| Mis creaciones · creación | Миний бүтээлүүд · бүтээл | |
| Prompt · Copiar prompt | промпт · Промпт хуулах | |
| Imagen · Video · Foto · Texto | зураг · видео · гэрэл зураг · текст | |
| Pregunta · Tutorial | асуулт · заавар | |
| Denunciar | Мэдээлэх | |
| Subir · Descargar | Байршуулах · Татах | |
| Saldo | үлдэгдэл | |
| Cómo lo hice | Би яаж хийсэн бэ | |
| IA | хиймэл оюун (AI) | «Weë AI»; en prosa «хиймэл оюун» |

## 5. Lo que NO cubre: sección `servidor/`, palabras clave del buscador, detector (cirílico → hoy devuelve `ru`; el mongol se distingue por Ө/Ү y palabras funcionales «байна», «болно», «юм», «нь», «бол»: propuesta en § 6 de la integración), revisión nativa y visual.
