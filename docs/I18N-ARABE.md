# Árabe en Weë — árabe estándar moderno (`ar`), variante egipcia y RTL

> **Actualización (2026-11-03, decisiones D1 y D2 del dueño):** `ar` sigue siendo la identidad y el único diccionario (árabe estándar). Cuando no hay región, los formatos son `ar-SA` (`localePorDefecto`). Elegir el árabe a mano sin región hereda la región árabe del aparato (`ar` + aparato `ar-EG` → `ar-EG`), igual que la elección automática; una región elegida explícitamente se respeta. Lo que dice abajo sobre `ar-EG` como locale inicial queda sustituido por esto. Pruebas: `i18n-l2-l3` 1–10.

Rama `i18n/ar-eg` (worktree `wee-trabajo/wt-i18n-ar`), desde `fashion/renombre-visible` `644d147e`, la misma base que el griego, el neerlandés, el vietnamita, el húngaro y el finés. Preparado el 2026-10-30. **Traducción hecha por agentes; sin revisión humana nativa.** Nada de esto es validación lingüística profesional. **La variante egipcia y el RTL se construyen aquí y se activan solo con la integración coordinada.**

## 0. Lo que ya existe en la base (auditado en `644d147e`, solo lectura)

| Pieza | Estado real |
|---|---|
| Catálogo | `{ codigo: 'ar', nombreNativo: 'العربية', direccion: 'rtl', listo: false }` ya declarado; `ar-SA` en `LOCALES_CONTEMPLADOS`. Falta `ar-EG`. |
| Dirección | `IdiomaContext` expone `direccion`; `hooks/useDireccion.ts` da `contenedor`, `texto` y `espejo`. **Solo lo usa `components/ReportSheet.tsx`.** Nadie llama a `I18nManager.forceRTL` ni escribe `document.documentElement.dir`. |
| Deuda RTL medida | 244 apariciones de `marginLeft/Right`, `paddingLeft/Right`, `textAlign: 'left'/'right'`, `left:`/`right:` en `components/`, `screens/` y `navigation/`. Las 10 peores: `SearchScreen` (20), `CreateScreen` (5), `ConversationScreen.styles` (5), `PostCard` (5), `CabeceraDeSeccion` (4), `ReelsScreen`, `LandingScreen`, `InboxScreen`, `BrainChatScreen`, `ResultCard` (3 cada una). |
| Fuente | `@expo-google-fonts/inter` (400/500/600/700) es la única empaquetada y **no tiene ni un glifo árabe** (comprobado en la tabla `cmap`): el árabe se dibujaría con la fuente del sistema (Segoe UI en Windows, San Francisco en iOS, Noto/Roboto en Android). `utils/aplicarInter.ts` fija `fontFamily` Inter en todo `Text`. |
| Plurales | `Intl.PluralRules('ar')` → `zero, one, two, few, many, other`. El tipo lo permite con `ConPlurales<T>` (`i18n/textos/ru/plurales.ts`, hoy solo `_few`/`_many`): hay que **ampliarlo** a `_zero`/`_two`. La prueba 24 de `i18n.test.mjs` ya acepta cualquier forma que el locale declare. |
| Dígitos | `Intl.NumberFormat('ar-EG')` escribe dígitos árabes orientales (`١٢٬٣٤٥٫٦`) y `ar` occidentales (`12,345.6`). Con `ar-EG-u-nu-latn` salen occidentales. |
| Detector | `functions/src/shared/idiomaDelTexto.ts` reconoce escrituras (`ESCRITURAS`: cirílico, hangul, devanagari…); el árabe entra como `['ar', /\p{Script=Arabic}/u]`. |
| Variantes | El traductor busca `locale` exacto → `idioma` → `en`; `pt-PT` y `zh-TW` son diccionarios COMPLETOS registrados como alias. No existe ningún mecanismo de «capa parcial» ni de «tono». |

## 1. Decisiones de arquitectura (propuesta; el dueño confirma en la integración)

1. **Árabe estándar moderno = `ar`**, diccionario completo (37 módulos), `listo: true`. Locale regional inicial `ar-EG` (se añade a `LOCALES_CONTEMPLADOS`; `ar-SA` se mantiene). Un aparato en `ar-EG`, `ar-SA`, `ar-MA`… recibe el estándar: **`ar-EG` por sí solo no activa el dialecto.**
2. **Variante egipcia: NO como `ar-EG-x-egy` ni como alias de locale.** `CodigoDeIdioma` es un código ISO de dos letras y la cadena de respaldo mira el locale del aparato: un alias `ar-EG` daría dialecto a todo Egipto sin pedirlo. Propuesta mínima compatible: una **capa parcial** `i18n/textos/ar-EG/` (solo las claves conversacionales: saludos, onboarding, estados vacíos amistosos, ayuda, Weë Brain) registrada bajo la clave interna **`ar-x-masri`** en `DICCIONARIOS`, y una **preferencia explícita** `wee.idioma.tono = 'egipcio'` que, cuando está activa y el idioma es `ar`, antepone `ar-x-masri` a la cadena de respaldo (`['ar-x-masri', 'ar', 'en']`). El traductor ya recorre la cadena clave a clave, así que una clave ausente en la capa cae al estándar sin cambiar `traducir.ts`. Lo único nuevo en el sistema común es: (a) que `cadenaDeRespaldo` acepte un escalón previo opcional y (b) una fila «العامية المصرية» en la pantalla de Idioma. **Se prepara aquí; no se integra sin confirmación.** Lo que NUNCA entra en la capa: configuración, navegación, términos técnicos, textos legales, seguridad, Credits/pagos, errores del motor.
3. **RTL**: activar de verdad exige (a) `document.documentElement.dir = 'rtl'` en web desde `IdiomaContext` cuando `direccion === 'rtl'`; (b) en nativo `I18nManager.forceRTL` + reinicio, que es una decisión de producto; (c) migrar las 244 apariciones a `Start/End` o a `useDireccion`. Es un frente aparte, por archivos, con su propia verificación visual (390 px y 1440 px). Aquí se entrega el **inventario y el plan**; se empieza por `IdiomaContext` (web) y por los 10 archivos con más deuda. No se refactoriza nada global.
4. **Fuente**: hace falta una fuente árabe empaquetada (candidatas: Noto Sans Arabic o Cairo, SIL OFL) y que `aplicarInter.ts` no imponga Inter sobre texto árabe. Introducir el paquete es una **dependencia nueva**: requiere autorización. Hasta entonces el árabe se verá con la fuente del sistema, legible pero no la de Weë.
5. **Dígitos**: los formatos salen de `Intl` con el locale del aparato, como en todos los idiomas: un egipcio verá `١٬٢٣٤٫٥٠ ج.م.` y un marroquí `1.234,50`. No se fuerza un sistema de dígitos; si producto quisiera occidentales siempre, sería `-u-nu-latn` en `formato.ts` para `ar` (decisión pendiente, no tomada).
6. **Bidi**: las marcas latinas dentro de una frase árabe se dejan como texto; el algoritmo bidi de la plataforma las coloca bien en la mayoría de casos. Solo donde un número o una marca quede al final de la frase y «salte» se usa aislamiento con `⁨…⁩` (FSI/PDI), y se anota en el archivo; **nunca** LRM/RLM a granel.

## 2. Lo propio del árabe estándar (comprobado con Node 24/ICU)

- **Seis plurales**: `_zero` (0), `_one` (1), `_two` (2), `_few` (3–10), `_many` (11–99), `_other` (100+…). El español solo declara `_one`/`_other`; el árabe añade `_zero`, `_two`, `_few`, `_many` donde el sustantivo cambia («تعليق واحد», «تعليقان», «{{contador}} تعليقات», «{{contador}} تعليقًا»). En `_one` y `_two` el número va en la palabra (dual) y **no** se escribe «1»/«2» a mano salvo que la forma gramatical lo exija sin cifra; entonces el `_other`/`_few`/`_many` llevan `{{contador}}`.
- **Formatos** (de `Intl`): `١٢٬٣٤٥٫٦`, `‏١٬٢٣٤٫٥٠ ج.م.‏`, `٢٩‏/١٠‏/٢٠٢٦`, «٢٩ أكتوبر ٢٠٢٦ في ٢:٣٠ م», listas «أ وب وج».
- **Puntuación**: coma árabe «،», punto y coma «؛», interrogación «؟»; comillas «…». Texto en NFC; la shadda y las vocales breves solo donde desambiguan.
- **Registro**: árabe estándar moderno (فصحى) contemporáneo, el de las apps internacionales en árabe (Google, Apple, Meta), sin arcaísmos. Segunda persona del singular **masculina genérica por defecto** solo donde no se puede evitar; se prefieren formas neutras: imperativo plural de cortesía NO (es formal); mejor **sustantivos de acción** en los botones («حفظ», «إلغاء», «حذف», «إرسال», «تعديل», «مشاركة», «متابعة») y frases impersonales («تمت الإضافة», «لا توجد نتائج»). Donde haga falta dirigirse a la persona, 2.ª persona masculina singular («اكتب», «اختر») es la convención de la industria; se anota para el revisor.
- **Marcas** en latino, sin transliterar («ويي» está mal) ni traducir; con artículo árabe separado por espacio cuando la frase lo pide («تطبيق Weë», «في WeeTalk», «رصيد Credits»). Nunca «Reels».

## 3. Variante egipcia (العامية المصرية) — qué entra en la capa `ar-x-masri`

Módulos y tipo de clave: `onboarding` (saludos y pasos), `home` (saludo, estado vacío del muro), `brain` y `weeai` (frases conversacionales del asistente, no los nombres de capacidades), `help` (preguntas frecuentes en tono cercano, no los términos citados de botones), `common` (solo «¡Listo!», «Algo salió mal», «Reintentar» → «جرّب تاني»), `wall` (estados vacíos amistosos), `notifications` (cuerpos de aviso de persona a persona). Fuera: `settings`, `credits`, `engine`, `moderation`, `auth` (legal), `econtact` (técnico), `business` (comercial), y cualquier texto que cite un botón del estándar.

Rasgos: «إنت/إنتي» evitados con formas neutras; «مش» por «ليس», «عايز» por «أريد», «دلوقتي» por «الآن», «إزيك» como saludo, «تمام» como confirmación; sin vocales breves; mismo glosario de marcas y términos técnicos que el estándar.

## 4. Glosario (estándar)

| Español | Árabe | Nota |
|---|---|---|
| Inicio / el Home | الرئيسية | |
| Buscar | بحث | |
| Crear (+) | إنشاء | |
| Explorar | استكشاف | |
| Publicación · Publicar | منشور · نشر | |
| Comentario · Responder | تعليق · رد | |
| Me gusta | إعجاب | contador «{{contador}} إعجابات» (few) / «{{contador}} إعجابًا» (many) |
| Compartir | مشاركة | |
| Seguir / Siguiendo / Seguidores | متابعة / تتابعه / المتابعون | |
| Guardar / Guardados | حفظ / المحفوظات | |
| Cancelar · Eliminar · Editar · Enviar | إلغاء · حذف · تعديل · إرسال | |
| Siguiente · Atrás · Cerrar · Continuar | التالي · رجوع · إغلاق · متابعة | «متابعة» también es Seguir: en botones de flujo usar «متابعة» y en social «متابعة الحساب» si hay ambigüedad |
| Reintentar | إعادة المحاولة | |
| Cargando… | جارٍ التحميل… | |
| Algo salió mal | حدث خطأ ما | |
| No sé (🤷) | لا أعرف | |
| Perfil · Perfil Real · Perfil Weë | الملف الشخصي · الملف الحقيقي · ملف Weë | |
| Comunidad(es) | مجتمع (مجتمعات) | |
| Notificaciones · Configuración · Ayuda | الإشعارات · الإعدادات · المساعدة | |
| Iniciar / cerrar sesión | تسجيل الدخول / تسجيل الخروج | |
| Crear cuenta · Registrarse | إنشاء حساب · التسجيل | |
| Contraseña · Correo | كلمة المرور · البريد الإلكتروني | |
| Mensaje · conversación | رسالة · محادثة | |
| Proyecto · Mis proyectos | مشروع · مشاريعي | |
| Mis creaciones · creación | إبداعاتي · إبداع | |
| Prompt · Copiar prompt | الموجّه (prompt) · نسخ الموجّه | «برومبت» se entiende; «الموجّه» es la forma establecida |
| Imagen · Video · Foto · Texto | صورة · فيديو · صورة فوتوغرافية · نص | |
| Pregunta · Tutorial | سؤال · شرح | |
| Denunciar | إبلاغ | |
| Subir · Descargar | رفع · تنزيل | |
| Saldo | الرصيد | «الرصيد: {{n}} Credits» |
| Cómo lo hice | كيف صنعته | |
| Plantilla · borrador · resultado | قالب · مسودة · نتيجة | |
| IA | الذكاء الاصطناعي / AI | «Weë AI»; en prosa «الذكاء الاصطناعي» |

## 5. Lo que NO cubre este trabajo (y queda documentado como pendiente)

- Activar RTL en nativo (`I18nManager.forceRTL` + reinicio) y migrar las 244 apariciones: frente aparte con plan en § 1.3.
- Fuente árabe empaquetada: dependencia nueva, requiere autorización.
- Sección `servidor/` en árabe (esos textos salen en inglés, como en los otros 13).
- Palabras clave del buscador y ciudades: lista inglesa.
- Revisión humana nativa (estándar y egipcio por separado) y validación visual RTL: pendientes.
