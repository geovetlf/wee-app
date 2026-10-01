# I18N-QUALITY-REVIEWER — qué debe comprobar el revisor de calidad del Harness en cada cambio

Estado: **diseño, sin instalar.** Thermos no está instalado y el Harness no se ha tocado para esto (decisión del dueño,
2026-10-01). Este documento deja escrito qué tendrá que comprobar el futuro *Quality Reviewer* para que ningún cambio
rompa un idioma sin que nadie se entere, y con qué herramienta del repositorio lo hace hoy cada punto.

La regla de fondo: **lo que se puede comprobar con una prueba ya está en la cadena** (`functions/test/_cadena.mjs`);
el revisor la ejecuta y además mira lo que una prueba no ve —la pantalla— con capturas medidas.

## 1. Lo que ya cubre la cadena (el revisor solo tiene que ejecutarla y leer el resultado)

| Qué | Prueba | Para todos los idiomas |
|---|---|---|
| Cobertura: ninguna clave de menos ni de más, en la app y en la sección del servidor | `i18n.test.mjs` (24), `i18n-auditoria.test.mjs` (A) | sí |
| Huecos `{{…}}` y plurales que pide `Intl.PluralRules` | `i18n-auditoria.test.mjs` (B), `i18n-cobertura.test.mjs` | sí |
| Textos escritos a mano en pantallas, componentes y navegación | `i18n-textos-a-mano.test.mjs` | — (es código) |
| Frases nuevas del servidor sin catálogo (errores, progreso, conceptos de Credits) | `i18n-servidor-fuentes.test.mjs` (A) | sí |
| Ningún `error.message` del servidor pintado tal cual | `i18n-servidor-fuentes.test.mjs` (B) | sí |
| El idioma viaja a Weë AI, Weë Brain, el push y la página pública | `i18n-servidor-fuentes.test.mjs` (B, C) | sí |
| Respaldo accidental al español | `i18n-servidor-fuentes.test.mjs` (D) | sí |
| Idioma incorrecto dentro de un diccionario | `i18n-idioma-de-salida.test.mjs` (C), suites de cada idioma | sí |
| Proveedores o modelos nombrados en un texto | `i18n-auditoria.test.mjs` (C) | sí |
| Catálogos cambiados sin que nadie lo mire | `i18n-huella.test.mjs` | sí |
| Todo lo que puede decir el servidor en el flujo guiado (1.403 planes) | `i18n-servidor.test.mjs` | es / en / da (los que declaran la sección) |
| Revisión humana: quién, qué, cuándo; agente ≠ humana | `i18n-revision.test.mjs` | sí |

Cuando el revisor encuentre algo que se repite, la respuesta correcta es una prueba nueva en la cadena, no una nota.

## 2. Lo que necesita la pantalla (capturas medidas)

Ninguna prueba de Node ve un botón cortado. El revisor lo mide en un navegador sin ventana contra la demo local
(emuladores `demo-*`, nunca producción), con el método de las campañas de capturas (`docs/I18N-DANES.md` § 12):
Chrome por CDP, `Emulation.setLocaleOverride` al idioma, `__FIREBASE_DEFAULTS__` hacia los emuladores, 390 × 844 y
1440 × 900, y el aviso del emulador oculto.

### 2.1 Desbordes y recortes (overflow)

En cada pantalla, ejecutar en la página y recoger los elementos de texto que no caben:

```js
[...document.querySelectorAll('body *')].filter((el) => {
  if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
  const s = getComputedStyle(el);
  const recortaAncho = el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(s.overflowX + s.overflow);
  const recortaAlto = el.scrollHeight > el.clientHeight + 1 && (s.webkitLineClamp !== 'none' || /hidden|clip/.test(s.overflowY + s.overflow));
  const fuera = el.getBoundingClientRect().right > innerWidth + 1;
  return recortaAncho || recortaAlto || fuera;
}).map((el) => ({ texto: el.textContent.trim().slice(0, 60), ancho: el.clientWidth, necesita: el.scrollWidth }));
```

`numberOfLines` de React Native se traduce en web a `-webkit-line-clamp` + `overflow: hidden`, así que el recorte con
puntos suspensivos también sale. Un elemento en esa lista es un fallo **solo si en español no está**: se compara la
misma pantalla en `es-ES` y en el idioma revisado.

**Lo que no vale como arreglo** (decisión del dueño): bajar el tamaño de letra, ocultar información o quitar el
texto. Se acorta la frase en el diccionario —con su porqué en la guía del idioma— o se corrige la maqueta para todos.

### 2.2 Problemas de longitud entre idiomas

Antes de mirar pantallas, el revisor puede priorizar con los textos: para cada clave, la razón
`longitud(idioma) / longitud(es)`. Las claves que se usan en botones, pestañas, chips o títulos (el `contexto` del
CSV de `scripts/i18n-revision.mjs exportar` dice dónde) con razón > 1,4 son las primeras que hay que ver en pantalla.

### 2.3 Inconsistencias entre idiomas

- La misma frase española traducida de dos maneras dentro de un idioma: hoy lo hace la prueba 57 de cada suite de
  idioma (`i18n-danes`, `i18n-sueco`…). Para un idioma sin suite propia, el revisor la ejecuta con el mismo método.
- Un idioma que dice algo que los demás no (un número, una promesa, un nombre de proveedor): `i18n-auditoria` (C) y
  la comparación de huecos (B) lo cazan cuando cambia un dato; el sentido lo mira la revisión humana.

### 2.4 Textos del servidor en pantalla

Además de la prueba de fuentes, el revisor recorre una vez por idioma el flujo guiado de una experiencia (pregunta →
plan → progreso → resultado), el historial de Credits y un error controlado, y comprueba que **nada sale en español**
cuando el idioma no es español. Un texto del servidor en otro idioma es un fallo de catálogo
(`i18n/textos/es/servidor/`), no de la pantalla.

### 2.5 La IA en otro idioma

`JobResult.idiomaDeSalida` aparece en los resultados cuyo texto salió, con seguridad, en otro idioma
(`functions/src/creator/idiomaDeSalida.ts`). El revisor cuenta cuántos hay por idioma y por experiencia en
`creatorJobs` (solo lectura) y en los registros (`WEË AI: la respuesta no salió en el idioma pedido`). Una tasa que
sube es señal de que la instrucción de idioma necesita refuerzo para ese idioma o ese modelo. El detector no da
falsos positivos con nombres propios ni términos técnicos, pero **no puede medir** textos cortos ni listas: lo que no
mide no lo cuenta como bueno ni como malo.

## 3. Lo que el revisor no decide

- Si una traducción es natural: eso es la revisión humana nativa (`docs/I18N-REVISION.md`). El revisor puede
  señalar candidatos, pero no marca nada como «revisión humana».
- Cambios de producto (qué texto dice qué): se proponen al dueño.
- Nada de despliegues, secretos, IAM ni facturación.
