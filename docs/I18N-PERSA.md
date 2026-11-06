# Persa (fa-IR) en Weë — método, guía de estilo, glosario y RTL

Rama `i18n/fa-ir` (worktree `wee-trabajo/wt-i18n-fa`), desde `644d147e`, la misma base que los demás idiomas en curso. Preparado el 2026-10-30. **Traducción hecha por agentes; sin revisión humana nativa.** El persa comparte con el árabe (`i18n/ar-eg`) el frente RTL: **la dirección es un dato del catálogo (`direccion: 'rtl'`) y la activación es UNA sola para los dos idiomas**, descrita en `docs/I18N-ARABE.md` § 0–1. Aquí no se duplica nada de eso; se traduce y se documenta lo propio del persa.

## 1. Método: el de siempre (`docs/I18N.md` § 5): catálogo `fa` (`direccion: 'rtl'`, `listo: true`) + `fa-IR` → `i18n/textos/fa/` (37 módulos + `index.ts`) → `diccionarios.ts` → `locales/fa.json` + `app.json` → `ErrorBoundary.tsx` → suite `functions/test/i18n-persa.test.mjs` → huella → CSV de revisión. Sin sección `servidor/`.

## 2. Lo propio del persa (comprobado con Node 24/ICU, 2026-10-30)

1. **Letras persas, no árabes**: **ی** (U+06CC, nunca ي U+064A) y **ک** (U+06A9, nunca ك U+0643), más پ چ ژ گ. Es el error más frecuente al mezclar teclados; el validador lo rechaza.
2. **Plural**: `one` y `other`, y **el cero es `one`**. El sustantivo no cambia tras un número («۳ نظر»): `_one` y `_other` suelen coincidir, y ninguna `_one` escribe «1» a mano porque con 0 mentiría.
3. **Dígitos y calendario**: `Intl.NumberFormat('fa-IR')` escribe dígitos persas (۱۲٬۳۴۵٫۶) y **`Intl.DateTimeFormat('fa-IR')` usa el calendario persa (solar hiyrí)**: «۷ آبان ۱۴۰۵» para el 29-10-2026. Es lo que espera un usuario en Irán y es lo que ya hace `formato.ts` con el locale; no se fuerza nada. **No se escriben dígitos persas a mano** en los textos: los números los pone `Intl`. Si producto quisiera gregoriano o dígitos latinos, sería `-u-ca-gregory` / `-u-nu-latn` en `formato.ts` (decisión pendiente, no tomada).
4. **Puntuación**: «؟» «،» «؛»; comillas «…»; el **zero-width non-joiner (U+200C)** es parte legítima de la ortografía («می‌خواهم», «خانه‌ها») y se admite; los controles bidi LRM/RLM/embeddings no.
5. **Fuente**: Inter no tiene glifos árabes ni persas (comprobado): misma limitación y misma propuesta que el árabe (fuente empaquetada = dependencia nueva, requiere autorización). Hasta entonces, fuente del sistema.
6. **RTL**: todo lo de `docs/I18N-ARABE.md` § 0–1 (hook `useDireccion` solo usado por `ReportSheet`, 244 apariciones de márgenes físicos, `document.documentElement.dir`, `I18nManager`): el persa no añade trabajo RTL distinto del árabe, pero sí exige que las pruebas visuales se hagan con los dos.

## 3. Guía de estilo

- **Tratamiento**: «شما» (formal-neutro) es la convención de las apps en Irán; verbos en 2.ª plural de cortesía («وارد شوید», «انتخاب کنید»). Posesivo «شما» o sufijo «-تان».
- **Botones**: sustantivo de acción o infinitivo corto, como Google/Instagram en persa: «ذخیره», «لغو», «حذف», «ارسال», «ویرایش», «اشتراک‌گذاری», «دنبال کردن», «ادامه», «بستن».
- **Ezafe y huecos**: el persa enlaza con la ezafe («پروفایلِ …»), que no se escribe pero obliga a que el hueco siga al sustantivo: «پروفایل {{nombre}}» vale; nunca un sufijo pegado al hueco («{{nombre}}ها» no).
- **Marcas** intocables en latino (Weë, Wäll, Weëls —nunca «Reels»/«ریلز»—, WeeTalk, ËContact, ẄContact, Credits —nunca «اعتبار»—, Weë AI, WEË AI, Weë Brain/Studio/Design/Writer/Music/Chef/Fashion/Travel/Photo/Beauty/Home, Weë Business solo donde el español lo nombra). La marca va suelta con espacio: «در WeeTalk», «موجودی Credits».
- **Identificadores**, `{{huecos}}`, emojis, rutas, modelos y API: byte a byte. Lo que es y en dejan en inglés se deja.
- **Espacios de borde** exactamente como en el español.

## 4. Glosario

| Español | Persa | Nota |
|---|---|---|
| Inicio / el Home | خانه | |
| Buscar | جستجو | |
| Crear (+) | ایجاد | |
| Explorar | کاوش | |
| Publicación · Publicar | پست · انتشار | |
| Comentario · Responder | نظر · پاسخ | |
| Me gusta | پسندیدن | contador «{{contador}} پسند» |
| Compartir | اشتراک‌گذاری | |
| Seguir / Siguiendo / Seguidores | دنبال کردن / دنبال می‌کنید / دنبال‌کنندگان | |
| Guardar / Guardados | ذخیره / ذخیره‌شده‌ها | |
| Cancelar · Eliminar · Editar · Enviar | لغو · حذف · ویرایش · ارسال | |
| Siguiente · Atrás · Cerrar · Continuar | بعدی · بازگشت · بستن · ادامه | |
| Reintentar | تلاش دوباره | |
| Cargando… | در حال بارگذاری… | |
| Algo salió mal | مشکلی پیش آمد | |
| No sé (🤷) | نمی‌دانم | |
| Perfil · Perfil Real · Perfil Weë | پروفایل · پروفایل واقعی · پروفایل Weë | |
| Comunidad(es) | انجمن(ها) | |
| Notificaciones · Configuración · Ayuda | اعلان‌ها · تنظیمات · راهنما | |
| Iniciar / cerrar sesión | ورود / خروج | |
| Crear cuenta · Registrarse | ایجاد حساب · ثبت‌نام | |
| Contraseña · Correo | رمز عبور · ایمیل | |
| Mensaje · conversación | پیام · گفتگو | |
| Proyecto · Mis proyectos | پروژه · پروژه‌های من | |
| Mis creaciones · creación | آثار من · اثر | |
| Prompt · Copiar prompt | پرامپت · کپی پرامپت | |
| Imagen · Video · Foto · Texto | تصویر · ویدیو · عکس · متن | |
| Pregunta · Tutorial | پرسش · آموزش | |
| Denunciar | گزارش | |
| Subir · Descargar | بارگذاری · دانلود | |
| Saldo | موجودی | |
| Cómo lo hice | چطور ساختمش | |
| IA | هوش مصنوعی (AI) | «Weë AI»; en prosa «هوش مصنوعی» |

## 5. Lo que NO cubre: sección `servidor/`, buscador, detector (escritura árabe → hoy nada; el persa se distingue del árabe por پ چ ژ گ ی ک y por palabras funcionales «است», «را», «که», «این», «می‌», «های»; propuesta para la integración junto al árabe), fuente, RTL (frente común con el árabe), revisión nativa y visual.
