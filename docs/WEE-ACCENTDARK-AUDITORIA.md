# `accentDark` como color de texto — auditoría de los usos y arreglo localizado (F-12)

**Qué es.** La auditoría de cada aparición de `accentDark` (`#E5A020`, el «dorado oscuro») en la app, la medida del contraste real de los usos que
son TEXTO en los dos temas, el arreglo localizado de los que fallan AA en Weë AI sin perder significado, y el candado que impide que vuelvan.
Es la tarea CON de la ronda R8 (2026-10-12), sobre `c3f7f9a7` (rama `r8/contraste`). Cierra el hallazgo **F-12** de `docs/WEE-DESIGN-CIERRE.md` §6 en lo que
se puede hacer sin decidir de diseño; **el arreglo de fondo —un color de texto dorado que sí pase— sigue pendiente de quien decide el diseño (§8).**

**Cómo se lee la evidencia.** Igual que en `WEE-DESIGN-CIERRE.md`: **E** ejecutado (lo corrí y dio eso), **L** leído (código leído, sin ejecutar), **M** medido
(una cifra calculada), **I** inferido (razonado o deducido por un script, sin leerlo a mano). Los `archivo:línea` son de `c3f7f9a7`, la base. La rama cambia una sola
línea en cada uno de los doce archivos corregidos (PlanCard, dos), así que ahí no se mueve ningún número; la excepción es `ProductionPiezas.tsx`, que gana además un comentario de cuatro líneas antes del `return`
de `Chip`: sus líneas 40 en adelante se corren cuatro en la rama (el `:43` de este documento es el `:47` allí).

## 1. Resumen

| | |
|---|---|
| Apariciones de `accentDark` | **85** en 44 archivos = 3 definiciones del tema (`ThemeContext.tsx`) + **82 líneas de uso en 43 archivos** (E: análisis con el compilador de TypeScript) |
| Puntos de uso reales | **87**: 31 son TEXTO · 51 son iconos · 5 son bordes · ninguno es fondo, sombra ni relleno de SVG. Dos líneas alimentan varios puntos por una variable (`Sidebar.tsx:82` → 4, `ProductionPiezas.tsx:35` → 3) |
| Texto: cuántos son de Weë AI | **16** de Weë AI y 15 fuera (Home, Create, Perfil, comentarios, ubicaciones, administración, menú de escritorio) |
| Contraste en el tema claro (M) | **los 31 fallan AA** (4,5:1): de 1,91:1 (sobre una insignia teñida) a 2,24:1 (sobre blanco). Ninguno es «texto grande»: el mayor mide 15 px |
| Contraste en el tema oscuro (M) | pasan 29 de 31; los dos que no (4,29:1) son de Weë AI, donde el oscuro **no se ve nunca** (§2) |
| Arreglado | **13 textos de Weë AI** pasan al color del texto (`theme.colors.text`: 12,50–14,68:1), una línea cada uno |
| Se deja | **3 textos de Weë AI**: el dorado es la única señal de que son una acción (§5). **PENDIENTE DE DECISIÓN** (§8) |
| Fuera de Weë AI | **15 textos**: solo se listan, con su contraste (§4, §7). No se tocan |
| Candado | `functions/test/accentdark-contraste.test.mjs` (paso de `functions/package.json`): falla si aparece un texto dorado nuevo en Weë AI o vuelve uno corregido |

## 2. Cómo se midió

- **Fórmula y colores.** La de C: `functions/test/_contraste-wcag.mjs` (WCAG 2.x 1.4.3, luminancia relativa), que **lee los dos temas de
  `contexts/ThemeContext.tsx`** en el momento de ejecutar; no hay ningún color copiado (E). `accentDark` es `#E5A020` en los dos temas.
- **Superficies teñidas.** Varias etiquetas van sobre un chip teñido. Se compone el color con su alfa sobre la superficie opaca que tiene detrás, canal a
  canal en sRGB, que es lo que hace el renderizado: `accent + '1A'` = 10 %, `'14'` = 8 %, `'33'` = 20 %, `'3D'` = 24 % de `#F5B731`, y `glow` =
  `rgba(245, 183, 49, 0.15)` en el claro (0,25 en el oscuro). Es lo único que se añadió a la fórmula de C.
- **La superficie de cada texto se leyó a mano** en el JSX y en los estilos del contenedor (L), no se supuso. Lo que no va dentro de una tarjeta se mide sobre
  **las dos páginas de Weë AI**: en el móvil, `background` (`#FFFFFF`; `CreatorShell.tsx:190`) y en escritorio, `surface` (`#F8F9FA`; `CreatorShell.tsx:276`
  pinta el fondo y `MarcoDeSeccion.tsx` no pinta ninguno). La peor de las dos manda.
- **Tamaño y peso** de cada texto: del compilador de TypeScript sobre los `StyleSheet.create` (E). `scale(n)` vale `n` en nativo y `0,9·n` en web. «Texto grande»
  según WCAG es ≥ 24 px, o ≥ 18,66 px en negrita (≥ 700): **ninguno de los 31 lo es**, así que el umbral es 4,5:1 en todos.
- **Qué tema se ve de verdad.** `enTemaClaro` (`contexts/ThemeContext.tsx:239`) envuelve la exportación de **15 pantallas** del taller —las ocho que nombra el encargo
  (CreatorFlow, Chef, Business, BrainChat, WeeCreator, Studio, Project, Specialist) y Design, DesignReferencia, MisCreaciones, Mundo3D, Production, Projects,
  WriterEditor— y todo componente de `components/creator|business|studio|…` que lleva un texto dorado solo lo importan esas pantallas (L: `git grep`). Dentro del
  taller **el tema oscuro no se ve nunca**: por eso el 8,44:1 que pasa en el oscuro no cuenta para Weë AI, y lo que decide es el contraste del claro. (La suite lo vigila:
  B3.) En Home, Perfil, Create, comentarios y menú sí se ve el oscuro cuando el Perfil Weë está activo.
- **Lo que es inferido (I).** La superficie de los iconos y los bordes (§6) se dedujo con un script desde el ancestro más cercano con `backgroundColor` del mismo
  archivo; no se leyó a mano: son adornos que no se tocan y su cifra es solo informativa (WCAG 1.4.11 pediría 3:1 si el icono fuera la única señal).

## 3. Cómo cuadra con el «22 sitios, 13 de Weë AI» de C

C contó con `grep` de la cadena literal `color: theme.colors.accentDark` en `screens/` y `components/` (M: `git grep -n "color: theme.colors.accentDark" -- screens components`
da **22 líneas en 16 archivos**, y 13 de ellas son de Weë AI). Esa regla se deja fuera dos formas de pintar el mismo dorado:

| | usos | de ellos, Weë AI |
|---|---|---|
| Líneas con `color: theme.colors.accentDark` literal (la cuenta de C) | 22 | 13 |
| **Ternarios** `color: cond ? theme.colors.accentDark : …` | 5 (`CommentCard.tsx:112`, `Poll.tsx:158`, `WeelsRow.tsx:103`, `BusinessPanel.tsx:146`, `AjustesContextuales.tsx:154`) | 2 |
| **Por una variable** que guarda el color: el nombre de la fila activa y las marcas «ẄAI» y «ẄC» (`Sidebar.tsx:82` → `:109`, `:115`, `:128`), y el texto del chip (`ProductionPiezas.tsx:35` → `:43`) | 4 | 1 |
| **Total** | **31** | **16** |

Las marcas «ẄAI» y «ẄC» (`MarcaDeWeeAi.tsx`, `CreditsPill.tsx`) son `<Text>` en negrita que toman el color por prop: cuentan como texto. Ningún uso de `accentDark` está en
`DesignScreen.tsx` ni en `FilaDeCreaciones.tsx` (los archivos de la tarea PAN): no hay nada que describir allí.

## 4. Los 31 usos de texto, uno por fila

Contraste del `accentDark` de hoy sobre la superficie real, en el tema claro (el que se ve en Weë AI) y en el oscuro. «AA» es el veredicto en el claro. En la columna
de acción, el contraste que da `text` en el peor de los casos de esa fila.

| # | uso | ámbito | elemento | tamaño / peso | papel | contraste CLARO · superficie (se ve así en Weë AI) | oscuro | AA (4,5:1) en claro | acción |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `screens/CreatorFlowScreen.tsx:572` | Weë AI | Text | 13 px bold | enlace de texto solo («Prefiero contarlo con palabras») | 2,24 · background<br>2,12 · surface | 8,84 / 7,60 | **FALLA** | **SE DEJA** · enlace de texto solo: el dorado es la única señal de que se puede tocar |
| 2 | `screens/CreatorFlowScreen.tsx:597` | Weë AI | Text | 13 px bold | acción «Cambiar» junto a «Quitar» (título del espacio con la misma tipografía) | 2,24 · card | 8,44 | **FALLA** | **SE DEJA** · su vecino, el título «Tu espacio», tiene la misma tipografía (negrita 13 px): sin el dorado no se distinguen |
| 3 | `screens/CreatorFlowScreen.tsx:613` | Weë AI | Text | 13 px bold | acción «Cambiar» tras el texto de estado «Foto lista» | 2,24 · card | 8,44 | **FALLA** | **CORREGIDO** → `text` 14,68:1 · junto al texto gris «Foto lista» se distingue por color y peso |
| 4 | `screens/WeeCreatorScreen.tsx:239` | Weë AI | Text | 12 px bold | enlace secundario junto al botón principal «Empezar» | 2,11 · accent 10 % sobre background<br>2,01 · accent 10 % sobre surface | 7,56 / 6,18 | **FALLA** | **CORREGIDO** → `text` 13,17:1 · va junto al botón principal «Empezar»: se lee como acción secundaria |
| 5 | `components/creator/CreatorShell.tsx:198` | Weë AI | Text | 10 px bold | sobretítulo «🤖 Weë AI» de la cabecera móvil | 2,24 · background | 8,84 | **FALLA** | **CORREGIDO** → `text` 14,68:1 · sobretítulo: la jerarquía la dan el tamaño (10 px frente a 18 px del título) y su sitio |
| 6 | `components/creator/JobProgress.tsx:40` | Weë AI | TextoEnMayusculas (mayúsculas) | 11 px bold | etiqueta «está trabajando» (mayúsculas) | 2,24 · card | 8,44 | **FALLA** | **CORREGIDO** → `text` 14,68:1 · etiqueta en mayúsculas sobre el título: no distingue ningún estado |
| 7 | `components/creator/PlanCard.tsx:81` | Weë AI | TextoEnMayusculas (mayúsculas) | 11 px bold | nombre de la experiencia, sobre la tarjeta del plan (mayúsculas) | 2,11 · accent 10 % sobre background<br>2,01 · accent 10 % sobre surface | 7,56 / 6,18 | **FALLA** | **CORREGIDO** → `text` 13,17:1 · etiqueta en mayúsculas sobre la tarjeta del plan; la tarjeta conserva su fondo y borde dorados |
| 8 | `components/creator/PlanCard.tsx:142` | Weë AI | Text | 13 px bold | enlace secundario «Cambiar algo» junto al botón principal | 2,11 · accent 10 % sobre background<br>2,01 · accent 10 % sobre surface | 7,56 / 6,18 | **FALLA** | **CORREGIDO** → `text` 13,17:1 · va junto al botón principal «Crear»: se lee como acción secundaria |
| 9 | `components/creator/ResultCard.tsx:404` | Weë AI | Text | 12 px bold | acción «Cambiar»/«Elegir» al final de la fila del proyecto (la frase vecina es semibold del color del texto) | 2,24 · card | 8,44 | **FALLA** | **SE DEJA** · la frase vecina va en semibold del color del texto y la acción en bold de 12 px: sin el dorado solo las separaría un escalón de peso |
| 10 | `components/creator/ResultCard.tsx:440` | Weë AI | Text | 11 px bold | etiqueta «demo» (insignia) | 2,00 · accent 20 % sobre background<br>1,91 · accent 20 % sobre surface | 6,02 / 4,89 | **FALLA** | **CORREGIDO** → `text` 12,50:1 · insignia «demo»: la insignia conserva su fondo teñido |
| 11 | `components/creator/AjustesContextuales.tsx:154` | Weë AI | Text | 13 px (600) | opción puesta de la hoja de ajustes (con fondo teñido, borde dorado y semibold) | 2,05 · glow sobre card | 4,86 | **FALLA** | **CORREGIDO** → `text` 13,44:1 · estado «puesta»: quedan el fondo teñido, el borde dorado, el semibold y `accessibilityState.selected` |
| 12 | `components/business/BusinessPanel.tsx:146` | Weë AI | Text | 13 px (600) | píldora puesta de Business (con fondo teñido, borde dorado, icono dorado y semibold) | 2,05 · glow sobre background<br>1,96 · glow sobre surface | 5,29 / 4,29 ✘ | **FALLA** | **CORREGIDO** → `text` 12,84:1 · estado «puesta»: quedan el fondo teñido, el borde dorado, el icono dorado y el semibold |
| 13 | `screens/BusinessScreen.tsx:413` | Weë AI | Text | 12 px | ficha del producto elegido (con fondo teñido, borde y iconos dorados) | 2,05 · glow sobre background<br>1,96 · glow sobre surface | 5,29 / 4,29 ✘ | **FALLA** | **CORREGIDO** → `text` 12,84:1 · ficha del producto: quedan el fondo teñido, el borde y los dos iconos dorados |
| 14 | `screens/ChefScreen.tsx:328` | Weë AI | Text | 12 px (600) | ficha de ajuste puesto (con fondo teñido, borde e icono dorados, semibold) | 2,05 · glow sobre background | 5,29 | **FALLA** | **CORREGIDO** → `text` 13,44:1 · ajuste puesto: quedan el fondo teñido, el borde, el icono y el semibold («marcados en amarillo») |
| 15 | `components/studio/produccion/ProductionPiezas.tsx:43` | Weë AI | Text | 12 px (600) | texto del chip de tono «acento» (el único uso: «Borrador»; borde e icono dorados) | 2,12 · surface | 7,60 | **FALLA** | **CORREGIDO** → `text` 13,93:1 · chip «acento» (hoy solo «Borrador»): quedan el borde y el icono dorados |
| 16 | `components/studio/produccion/ProductionSceneCard.tsx:62` | Weë AI | TextoEnMayusculas (mayúsculas) | 12 px bold | número de escena (mayúsculas), sobre la tarjeta de la escena | 2,12 · surface | 7,60 | **FALLA** | **CORREGIDO** → `text` 13,93:1 · etiqueta «ESCENA n» en mayúsculas sobre el título de la escena |
| 17 | `screens/AgregarUbicacionScreen.tsx:285` | fuera | Text | 12 px (600) | distancia de un lugar | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 18 | `screens/AgregarUbicacionScreen.tsx:303` | fuera | Text | 12 px (600) | acción del rótulo de sección | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 19 | `screens/CreateScreen.tsx:1170` | fuera | Text | 12 px | enlace «quitar menciones» | 2,24 · card | 8,44 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 20 | `screens/EngineAdminScreen.tsx:203` | fuera | Text | 12 px bold | chip de la política del motor (administración) | 2,11 · accent 10 % sobre card | 7,06 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 21 | `screens/PostDetailScreen.tsx:1083` | fuera | Text | 14 px bold | enlace «Volver» (publicación no encontrada) | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 22 | `screens/ProfileScreen.tsx:833` | fuera | Text | 12 px | nombre de los contactos bajo la cifra del perfil | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 23 | `components/CommentCard.tsx:112` | fuera | Text | 12 px (500) | cuenta de votos propios en un comentario | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 24 | `components/HowIMadeIt.tsx:70` | fuera | Text | 11 px bold | título «Cómo lo hice» | 2,13 · accent 8 % sobre card<br>2,13 · accent 8 % sobre background | 7,40 / 7,91 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 25 | `components/HowIMadeIt.tsx:87` | fuera | Text | 12 px bold | enlace «Ver prompt» / «Ocultar prompt» | 2,13 · accent 8 % sobre card<br>2,13 · accent 8 % sobre background | 7,40 / 7,91 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 26 | `components/Poll.tsx:158` | fuera | Text | 13 px (600) | porcentaje de la opción votada (sobre la barra de resultados si la cubre) | 2,24 · background<br>1,95 · accent 24 % sobre background | 8,84 / 5,47 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 27 | `components/Sidebar.tsx:128` | fuera | Text | 15 px | nombre de la fila ACTIVA del menú de escritorio (vía colorDeLaFila, Sidebar.tsx:82) | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone · fila ACTIVA del menú de escritorio: el color es la señal de «dónde estás» (el comentario del archivo lo dice) |
| 28 | `components/Sidebar.tsx:109` | fuera | MarcaDeWeeAi | 13 px bold | marca «ẄAI» (texto en negrita) de la fila activa — vía colorDeLaFila | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone · marca de la fila activa (misma variable que el nombre) |
| 29 | `components/Sidebar.tsx:115` | fuera | MarcaDeCredits | 13 px bold | marca «ẄC» (texto en negrita) de la fila activa — vía colorDeLaFila | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone · marca de la fila activa (misma variable que el nombre) |
| 30 | `components/Sidebar.tsx:329` | fuera | Text | 13 px (500) | botón «Iniciar sesión» del pie de la barra lateral | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone |
| 31 | `components/WeelsRow.tsx:103` | fuera | Text | 12 px (500) | «Ver todos» de la fila de Weëls (la versión compacta ya usa text) | 2,24 · background | 8,84 | **FALLA** | FUERA DE WEË AI: se lista y se propone · el propietario ya lo resolvió en la versión compacta (`text`: «se sigue leyendo como enlace por la flecha y el peso»); la completa sigue dorada |

## 5. La regla de decisión y lo que sale en Weë AI

**Regla** (la del encargo, aplicada fila a fila). Se corrige solo si se cumplen las cuatro: (a) es texto, (b) falla AA medido en el tema claro, (c) está en Weë AI y
(d) se resuelve con un token que ya existe sin perder significado. **Se considera que se pierde significado cuando el dorado era la ÚNICA señal de que un texto es
una acción, o lo único que lo separa de una frase vecina con la misma tipografía.** Si queda otra señal en el mismo elemento —fondo teñido, borde o icono dorados, peso,
un texto gris al lado, un botón principal al lado— se corrige.

**Por qué `text` y no `textSecondary`.** Sobre las superficies de los textos corregidos, `textSecondary` falla en **11 de las 19** combinaciones de texto y superficie (M): sobre las teñidas da 4,12–4,56:1 y solo llega en las tarjetas blancas. `text` pasa en todas las superficies con margen (12,50:1 el peor) y es el que ya usó C en `AvisoDeCreacion.tsx`.

**Corregidos (13).** Una sola línea cada uno (`theme.colors.accentDark` → `theme.colors.text`; en los dos ternarios, el ternario sobraba y se quita):

| Estado que se conserva | Textos |
|---|---|
| Sobretítulos y etiquetas en mayúsculas (no distinguen ningún estado) | `CreatorShell.tsx:198`, `JobProgress.tsx:40`, `PlanCard.tsx:81`, `ProductionSceneCard.tsx:62` |
| Selección «puesta» con fondo teñido y borde dorado (el estado sigue marcado; en `AjustesContextuales` y `BusinessPanel` además `accessibilityState.selected`; en `BusinessPanel`, `BusinessScreen` y `ChefScreen` también el icono dorado) | `AjustesContextuales.tsx:154`, `BusinessPanel.tsx:146`, `BusinessScreen.tsx:413`, `ChefScreen.tsx:328` |
| Chip de estado «acento» (hoy solo «Borrador»): conserva el borde y el icono dorados | `ProductionPiezas.tsx:43` (la guarda del color del texto incluye ahora el tono «acento», que ya iba en `text` en el neutro) |
| Insignia con su fondo teñido | `ResultCard.tsx:440` |
| Acción secundaria junto a un botón principal amarillo, o tras un texto gris de estado | `PlanCard.tsx:142`, `WeeCreatorScreen.tsx:239`, `CreatorFlowScreen.tsx:613` |

El dorado de los iconos, los bordes y los fondos de esos mismos elementos **no se toca**. Es el mismo criterio que ya aplicó el propietario en `WeelsRow.tsx:95-101`
(«Compacta lo escribe en el color del texto, no en dorado… el dorado sobre blanco da 2,3 a 1 de contraste… en Weë el amarillo significa crear o elegir, no navegar»).

**Se dejan (3), PENDIENTE DE DECISIÓN:**

| Uso | Por qué no se cambia | Qué lo desbloquea |
|---|---|---|
| `CreatorFlowScreen.tsx:572` «Prefiero contarlo con palabras» | Es un enlace de texto SOLO, centrado bajo la caja de la foto. El dorado es la única señal de que se puede tocar; en el color del texto parecería una frase más y la salida para quien no tiene foto dejaría de verse | el token de «texto sobre dorado» (§8), o decidir que los enlaces solos se subrayan |
| `CreatorFlowScreen.tsx:597` «Cambiar» (foto del espacio) | Va en la misma barra que el título «Tu espacio» y tiene su misma tipografía (negrita 13 px): sin el dorado nada las distingue (el «Quitar» gris distingue a la otra acción, no a esta) | ídem |
| `ResultCard.tsx:404` «Cambiar»/«Elegir» (fila del proyecto) | La frase de al lado va en semibold del color del texto y la acción en bold de 12 px: sin el dorado solo las separaría un punto de tamaño y un escalón de peso | ídem |

Los tres siguen fallando AA (2,12–2,24:1) y la suite los lista con su motivo.

**Cómo comprobarlo a mano** (NO VERIFICADO visualmente: no se levantó web ni emulador, que es trabajo PESADO fuera de este encargo; lo verificado es lo que cada `<Text>` pinta y su
contraste calculado). Dónde se ve cada cambio:

| Qué | Dónde |
|---|---|
| Sobretítulo «🤖 Weë AI» (`CreatorShell:198`) | cabecera móvil de cualquier sección de Weë AI (en escritorio no se pinta) |
| «Weë X está trabajando» (`JobProgress:40`) | mientras se crea algo |
| Nombre de la experiencia y «Cambiar algo» (`PlanCard:81,142`) | el plan, antes de pulsar «Crear» |
| Insignia «demo» (`ResultCard:440`) | el resultado de un trabajo en modo demostración |
| Opción puesta (`AjustesContextuales:154`) | la hoja de ajustes de Studio, Chef, Design o Brain |
| Pastilla puesta (`BusinessPanel:146`) | cualquier módulo de Weë Business |
| Ficha del producto (`BusinessScreen:413`) | Business → Create, entrando desde la ficha de un producto |
| Ajuste puesto (`ChefScreen:328`) | Chef, tras elegir un ajuste en la hoja |
| «Borrador» y «ESCENA n» (`ProductionPiezas:43`, `ProductionSceneCard:62`) | la producción de Weë Studio |
| «Avísame cuando sea real» (`WeeCreatorScreen:239`) | Weë AI → elegir una experiencia que aún no es real |
| «Cambiar» (`CreatorFlowScreen:613`) | CreatorFlow con una foto adjunta que no es de un espacio |

## 6. Lo que no es texto: 51 iconos y 5 bordes (no se tocan)

El dorado es la identidad y los adornos se quedan (encargo). Superficie **inferida** por un script (I); en los bordes no se mide contraste (son el marco de su elemento).
Los 3 usos de `accentDark` en `ThemeContext.tsx:23,45,67` son la definición del token.

| # | uso | tipo | elemento y tamaño | superficie INFERIDA (ancestro más cercano con fondo en el mismo archivo) | claro | oscuro | acción |
|---|---|---|---|---|---|---|---|
| 1 | `screens/AgregarUbicacionScreen.tsx:268` | icono | Ionicons 16 px | accent 10 % sobre background | 2,11 | 7,56 | se queda |
| 2 | `screens/AgregarUbicacionScreen.tsx:388` | icono | Ionicons 16 px | accent 10 % sobre background | 2,11 | 7,56 | se queda |
| 3 | `screens/BrainChatScreen.tsx:294` | icono | Ionicons 12 px | card | 2,24 | 8,44 | se queda |
| 4 | `screens/BrainChatScreen.tsx:311` | icono | Ionicons 15 px | background (sin fondo propio en el archivo) | 2,24 | 8,84 | se queda |
| 5 | `screens/BrainChatScreen.tsx:498` | icono | Ionicons 17 px | card | 2,24 | 8,44 | se queda |
| 6 | `screens/BusinessScreen.tsx:412` | icono | Ionicons 14 px | glow sobre background | 2,05 | 5,29 | se queda |
| 7 | `screens/BusinessScreen.tsx:414` | icono | Ionicons 14 px | glow sobre background | 2,05 | 5,29 | se queda |
| 8 | `screens/ChefScreen.tsx:333` | icono | Ionicons 14 px | glow sobre background | 2,05 | 5,29 | se queda |
| 9 | `screens/CreateScreen.tsx:961` | icono | Ionicons 22 px | accent 18 % sobre background ∣ surface | 2,01 / 2,12 | 6,38 / 7,60 | se queda |
| 10 | `screens/CreateScreen.tsx:1086` | icono | Ionicons 20 px | accent 8 % sobre background ∣ card | 2,13 / 2,24 | 7,91 / 8,44 | se queda |
| 11 | `screens/CreateScreen.tsx:1198` | icono | Ionicons 15 px | accent 12 % sobre background | 2,08 | 7,28 | se queda |
| 12 | `screens/CreateScreen.tsx:1218` | icono | Ionicons 14 px | accent 12 % sobre background | 2,08 | 7,28 | se queda |
| 13 | `screens/CreateScreen.tsx:1309` | icono | Ionicons 20 px | accent 14 % sobre background | 2,07 | 7,01 | se queda |
| 14 | `screens/ProjectScreen.tsx:162` | icono | Ionicons 18 px | accent 15 % sobre background | 2,05 | 6,84 | se queda |
| 15 | `components/CommentCard.tsx:109` | icono | Ionicons «ICON_SIZE.xs» px | background (sin fondo propio en el archivo) | 2,24 | 8,84 | se queda |
| 16 | `components/CommunitiesEntry.tsx:49` | icono | Ionicons 18 px | card | 2,24 | 8,44 | se queda |
| 17 | `components/HojaDeComentarios.tsx:226` | icono | Ionicons «ICON_SIZE.md» px | surface | 2,12 | 7,60 | se queda |
| 18 | `components/HowIMadeIt.tsx:90` | icono | Ionicons 16 px | accent 8 % sobre background | 2,13 | 7,91 | se queda |
| 19 | `components/Sidebar.tsx:122` | icono (IconoWee) | IconoWee (vía `colorDeLaFila`) | background (sin fondo propio en el archivo) | 2,24 | 8,84 | se queda |
| 20 | `components/business/BusinessPanel.tsx:144` | icono | Ionicons 15 px | glow sobre background ∣ card | 2,05 / 2,24 | 5,29 / 8,44 | se queda |
| 21 | `components/creator/ActionGrid.tsx:83` | icono | Ionicons 22 px | accent 15 % sobre background | 2,05 | 6,84 | se queda |
| 22 | `components/creator/ActionGrid.tsx:102` | icono | Ionicons 18 px | accent 15 % sobre background | 2,05 | 6,84 | se queda |
| 23 | `components/creator/ActionGrid.tsx:118` | icono | Ionicons 22 px | accent 15 % sobre background | 2,05 | 6,84 | se queda |
| 24 | `components/creator/ActionGrid.tsx:138` | icono | Ionicons 18 px | accent 15 % sobre background | 2,05 | 6,84 | se queda |
| 25 | `components/creator/ActionGrid.tsx:152` | icono | Ionicons 15 px | card | 2,24 | 8,44 | se queda |
| 26 | `components/creator/AjustesContextuales.tsx:108` | icono | Ionicons 15 px | surface | 2,12 | 7,60 | se queda |
| 27 | `components/creator/AvisoDeCreacion.tsx:67` | icono | Ionicons 18 px | card | 2,24 | 8,44 | se queda |
| 28 | `components/creator/ComposerEntry.tsx:243` | icono | Ionicons 20 px | card | 2,24 | 8,44 | se queda |
| 29 | `components/creator/ComposerEntry.tsx:256` | icono | Ionicons 21 px | card | 2,24 | 8,44 | se queda |
| 30 | `components/creator/ComposerEntry.tsx:279` | icono | Ionicons 21 px | surface | 2,12 | 7,60 | se queda |
| 31 | `components/creator/ComposerEntry.tsx:324` | icono | Ionicons 15 px | accent 14 % sobre background ∣ surface | 2,07 / 2,12 | 7,01 / 7,60 | se queda |
| 32 | `components/creator/CreatorSidebar.tsx:61` | icono | Ionicons «scale(nested ? 17 : 20)» px | accent 20 % sobre background | 2,00 | 6,02 | se queda |
| 33 | `components/creator/JobProgress.tsx:51` | icono | Ionicons 20 px | card | 2,24 | 8,44 | se queda |
| 34 | `components/creator/PlanCard.tsx:124` | borde | TouchableOpacity | marco de su propio elemento (estado/selección) | — | — | se queda |
| 35 | `components/creator/ResultCard.tsx:400` | icono | Ionicons 18 px | card | 2,24 | 8,44 | se queda |
| 36 | `components/creator/ResultCard.tsx:423` | icono | Ionicons 12 px | card | 2,24 | 8,44 | se queda |
| 37 | `components/creator/ResultCard.tsx:722` | icono | Ionicons 16 px | card | 2,24 | 8,44 | se queda |
| 38 | `components/creator/ResultCard.tsx:744` | icono | Ionicons 18 px | card | 2,24 | 8,44 | se queda |
| 39 | `components/creator/TravelLauncher.tsx:97` | icono | Ionicons 20 px | card | 2,24 | 8,44 | se queda |
| 40 | `components/creator/TravelLauncher.tsx:157` | icono | Ionicons 19 px | accent 14 % sobre background | 2,07 | 7,01 | se queda |
| 41 | `components/creator/TravelMark.tsx:47` | icono | Ionicons «lado * 0.58» px | accent 18 % sobre background | 2,01 | 6,38 | se queda |
| 42 | `components/creator/ui.tsx:47` | icono | Ionicons 13 px | #F5B731 ∣ card | 1,25 / 2,24 | 1,25 / 8,44 | se queda |
| 43 | `components/creator/ui.tsx:120` | icono | Ionicons 20 px | card | 2,24 | 8,44 | se queda |
| 44 | `components/creator/ui.tsx:189` | icono | Ionicons 17 px | accent 20 % sobre background | 2,00 | 6,02 | se queda |
| 45 | `components/creator/UploadBox.tsx:58` | icono | Ionicons 26 px | accent 15 % sobre background | 2,05 | 6,84 | se queda |
| 46 | `components/creator/WriterDocuments.tsx:49` | icono | Ionicons 18 px | accent 20 % sobre background | 2,00 | 6,02 | se queda |
| 47 | `components/studio/StudioControles.tsx:70` | borde | TouchableOpacity | marco de su propio elemento (estado/selección) | — | — | se queda |
| 48 | `components/studio/produccion/ProductionDirectorPanel.tsx:80` | icono | Ionicons 18 px | background (sin fondo propio en el archivo) | 2,24 | 8,84 | se queda |
| 49 | `components/studio/produccion/ProductionEmptyState.tsx:25` | icono | Ionicons 26 px | card | 2,24 | 8,44 | se queda |
| 50 | `components/studio/produccion/ProductionFormatSelector.tsx:77` | borde | TouchableOpacity | marco de su propio elemento (estado/selección) | — | — | se queda |
| 51 | `components/studio/produccion/ProductionList.tsx:80` | icono | Ionicons 20 px | surface | 2,12 | 7,60 | se queda |
| 52 | `components/studio/produccion/ProductionPiezas.tsx:41` | borde | View (vía `color`) | marco de su propio elemento (estado/selección) | — | — | se queda |
| 53 | `components/studio/produccion/ProductionPiezas.tsx:42` | icono | Ionicons 13 px (vía `color`) | surface | 2,12 | 7,60 | se queda |
| 54 | `components/studio/produccion/ProductionRecommendations.tsx:46` | icono | Ionicons 18 px | card | 2,24 | 8,44 | se queda |
| 55 | `components/studio/produccion/ProductionShotGeneration.tsx:69` | icono | Ionicons 16 px | surface | 2,12 | 7,60 | se queda |
| 56 | `components/studio/produccion/ProductionTimelinePreview.tsx:72` | borde | TouchableOpacity | marco de su propio elemento (estado/selección) | — | — | se queda |

## 7. Fuera de Weë AI: 15 textos que solo se listan

Están en la tabla de §4 con su contraste (todos 1,95–2,24:1 en el claro; todos pasan en el oscuro, 5,47–8,84:1 en esas superficies). No se tocan: Home, Create, Perfil, PostDetail,
comentarios, ubicaciones, administración y el menú de escritorio quedan **fuera del alcance de Design**. Un detalle de producto para quien los decida: en la fila activa de
`Sidebar.tsx:82` el comentario del archivo dice que el color del texto es lo que dice «dónde estás» (el menú no tiene fondo amarillo), así que ahí el dorado es una señal de estado, y
en `WeelsRow.tsx:103` el propietario ya dejó la versión compacta en `text`.

## 8. Propuesta de sistema (NO aplicada)

Corregir el color del texto en cada sitio es un parche: el arreglo de fondo es un **token de texto sobre dorado** que pase AA. El tema no lo tiene y añadirlo es del dueño del diseño;
aquí solo se mide para decidir con datos.

**Qué se midió** (M): cada candidato sobre las 10 superficies distintas del tema claro donde hoy se pinta texto dorado (de `#FFFFFF` a la insignia teñida sobre el escritorio):

| candidato | valor | sobre blanco | sobre `#F8F9FA` | el peor caso (superficie compuesta) | usos de texto que pasan AA |
|---|---|---|---|---|---|
| accentDark actual | `#E5A020` | 2,24 | 2,12 | **1,91** sobre `#F7ECD2` | 0 de 31 |
| C: #A16A00 | `#A16A00` | 4,59 | 4,35 | **3,91** sobre `#F7ECD2` | 16 de 31 |
| C: #9A6700 | `#9A6700` | 4,87 | 4,62 | **4,15** sobre `#F7ECD2` | 22 de 31 |
| C: #8A5A00 | `#8A5A00` | 5,93 | 5,62 | **5,05** sobre `#F7ECD2` | 31 de 31 |
| mismo tono, el más claro que llega a 4,50:1 en todas | `#8E6314` | 5,32 | 5,05 | **4,53** sobre `#F7ECD2` | 31 de 31 |
| mismo tono, el más claro que llega a 4,73:1 en todas | `#8A6013` | 5,58 | 5,29 | **4,75** sobre `#F7ECD2` | 31 de 31 |

**Lo que enseña la tabla.**
1. **`#9A6700` —el candidato que midió C sobre blanco, 4,87:1— no basta.** Sobre las superficies teñidas baja a 4,15:1 y deja 9 de los 31 usos sin pasar. C lo midió sobre blanco y sobre `#F8F9FA`, no sobre las insignias teñidas.
2. **`#8A5A00` pasa los 31** con 5,05:1 en el peor caso; el mismo tono que `accentDark` pero más oscuro y llegando justo (`#8E6314`, 4,53:1) no deja margen. Es un marrón dorado: se ve distinto del dorado de la marca, y eso es una decisión de diseño.
3. En el tema oscuro `accentDark` ya sirve (8,44:1 sobre la tarjeta); el token tendría un valor por tema (claro oscurecido, oscuro = el actual).

**A qué sitios cambiaría.** Un token nuevo —llámese `accentText`; el nombre es solo ilustrativo— sustituiría a `accentDark` **solo donde pinta texto**:
- los 15 textos de fuera de Weë AI y los 3 que se dejan, con lo que los 3 pendientes de §5 se resuelven sin perder la señal del dorado;
- **y, si el diseño prefiere el dorado al color del texto, desharía los 13 arreglos de esta tarea** (13 líneas, todas `theme.colors.text` → el token): los textos volverían a ser dorados, ahora legibles. En ese caso la suite pasa a vigilar
  que ningún texto de Weë AI use `accentDark` a secas (la lista de pendientes desaparece y `CORREGIDOS` cambia el token esperado).
- **No** conviene cambiar el valor de `accentDark` mismo: lo usan 51 iconos y 5 bordes, que perderían el dorado de marca, y `weeai-cliente-cierre` C0 fija que `accentDark` NO pasa en el claro.

**Alternativas** (cada una es una decisión, no una recomendación): (A) el token de arriba; (B) dejar `text` donde ya está y subrayar los enlaces que van solos —el repositorio ya subraya dos
(`RightSidebar.tsx:214`, `AiAvatarScreen.tsx:1185`)—, lo que añade una señal que hoy no existe; (C) dejar los tres pendientes como están y convivir con 2,12–2,24:1 en tres acciones secundarias.

## 9. El candado

`functions/test/accentdark-contraste.test.mjs` (80 comprobaciones; paso de la cadena `npm test`). Lee el código con el compilador de TypeScript, no con expresiones regulares, y vigila seis cosas:

| Grupo | Qué vigila |
|---|---|
| A | **el detector**, contra fragmentos conocidos: texto, ternario, mayúsculas, icono, borde, fondo, variable (también `{ color }` abreviado), marcas ẄAI/ẄC y un componente desconocido (que cuenta como «otro» y hace fallar) |
| B | **ningún texto dorado nuevo**: todo `accentDark` que pinta texto en una pieza de Weë AI está en la lista de pendientes o es el falso positivo vigilado; un uso sin clasificar también falla. Alcance: las carpetas `components/creator|studio|business|design|designReferencia|chef|brain` y toda pantalla montada sobre `CreatorShell` o exportada con `enTemaClaro` (93 piezas en esta rama) |
| C | **sin fantasmas**: lo pendiente tiene que seguir existiendo; si se corrige, se quita de la lista (la lista no se queda vieja) |
| D | **lo corregido sigue corregido y pasa AA** sobre su superficie, calculado con la fórmula de C sobre `ThemeContext.tsx`, y lo pendiente sigue siendo un fallo medido (si el token pasara AA, el candado avisa de que ya no hace falta) |
| E | **sabotaje**: devolver el dorado, en memoria, a cada uno de los textos corregidos —y añadir uno nuevo— hace caer B |
| F | **lo que se dibuja de verdad** (comportamiento en proceso, con los colores del tema claro): los dos componentes cuya LÓGICA cambió —`Chip` de la producción en sus cinco tonos y `Pastilla` de Business puesta y sin poner— pintan el texto en `text` y **todo lo demás igual** (los tonos aviso/error/ok, el borde, el icono, el fondo teñido y el semibold), y su texto pasa AA sobre el fondo con que se pintan |

Cada uso se identifica por una **huella que no depende del número de línea** (`archivo · etiqueta · hoja de estilo · lo que pinta`), para que otras tareas puedan editar esos archivos sin romperla. Un falso positivo
vigilado: el chip de `ProductionPiezas.tsx` guarda en `color` el tono del borde y del icono (dorado en «acento») y lo usa en el texto de los tonos aviso/error/ok; en «acento» el texto va en `text` y una expresión
vigilada lo demuestra (el detector sigue la variable sin evaluar la condición).

**Evidencia** (E, rama `r8/contraste`): contra las fuentes de `c3f7f9a7` la suite da **34 comprobaciones en rojo y 46 en verde** (los 13 sitios aún con el dorado: B5 y D1, más el fantasma de «Cambiar», los sabotajes que no encuentran el color corregido y el dibujado de `Chip` «acento» y `Pastilla` puesta, que pintan `#E5A020` en el texto);
con los 13 cambios, **80 de 80 en verde**, en unos dos segundos. **Sabotaje real, fuera de la suite:** se devolvió `accentDark` a `JobProgress.tsx:40` en el árbol (sobre `c89c6704`) y la suite cayó en B5 —nombrando el uso exacto—, D1, E1 y E2 (4 comprobaciones); `git checkout -- components/creator/JobProgress.tsx` lo restauró, el árbol quedó limpio y volvió a verde.

**Regresión** (E, `node test/<suite>` desde `functions/`, de una en una, sin emuladores): 48 suites y scripts que leen los archivos tocados o vigilan la seguridad —las que nombra el encargo (`cajas-weeai`, `ajustes-weeai`, `credits-weeai`, `aceptacion-pantallas`, `navegacion-enlaces`, `foundation-de-experiencias`, `design-cierre`, `weeai-cliente-cierre`, `chef-weeai`, `chef-caracterizacion`, `puente-pre-f1d`), todas las que mencionan un archivo corregido (`grep -l`), `ci-workflow` y `scripts/escaneo-secretos.mjs`— terminan con **0 fallos** (48 en verde, 4489 comprobaciones ✔). El corredor `node functions/test/_design-cierre.mjs` sale con código 1 porque Weë Design no está terminado, y da **exactamente las cifras de la línea base** (11 · 5 · 9 · 3: cumplidos · abiertos · esperan una decisión · manuales); CL-24 sigue CUMPLIDO. Ningún pin de estilo de una suite existente fijaba un color corregido, así que no hubo que tocar ninguna. `tsc --noEmit` y la cadena entera (`_cadena.mjs`, la lanza el coordinador) no se corrieron todavía.

## 10. Hallazgos adyacentes (fuera del encargo, NO tocados)

| Hallazgo | Medida | Dónde |
|---|---|---|
| `theme.colors.accent`/`primary` (`#F5B731`) también se usa como color de texto, peor que `accentDark` | 1,79:1 sobre blanco; 31 líneas `color: theme.colors.accent\|primary` en 18 archivos de `screens/` y `components/` (M: `git grep -n -E "color: theme\.colors\.(accent\|primary)\b" -- screens components`). En Weë AI solo tres, todos la palabra resaltada de un título: `CabeceraDeSeccion.tsx:216`, `SpecialistHero.tsx:46`, `CabeceraDeWeeBrain.tsx:83` (posible excepción de logotipo) | `WeeBiz*`, `AiAvatarScreen`, `SearchScreen`, `PostCard`… |
| Los demás tonos del chip de producción usan como texto colores de estado claros sobre `surface` | `warning` 2,04:1, `success` 2,16:1, `error` 3,57:1 (`ProductionPiezas.tsx:35-39`; mismo problema, otros colores) | `ProductionStatus`, `ProductionShotCard`, `ProductionSceneCard` |
| El mismo dorado como literal, sin pasar por el token | `HomeScreen.tsx:236` (`color: '#E5A020'`), `WeelsRow.tsx:131`, `AvatarSVGs.tsx:71,121` | Home |
| `#1F2937` escrito a mano donde existe `text` | `PlanCard.tsx` (texto sobre el acento), `StudioControles.tsx` | Weë AI |
| En el oscuro, `BusinessPanel.tsx:146` y `BusinessScreen.tsx:413` bajan a 4,29:1 sobre `glow` | solo se vería si el taller dejara de ser siempre claro (§2) | Weë AI |

**Para el coordinador (regla 11, `WEE-DESIGN-CIERRE.md`).** Esta tarea no convierte ningún criterio CL-xx en cumplido (F-12 es una mejora opcional), así que no se toca ese archivo. Su fila F-12 y el último
inciso de R10 («otros 22 sitios… 13 de Weë AI») quedan desfasados al integrar; la cifra al día es: **31 usos de texto (16 de Weë AI); 13 de Weë AI corregidos; 3 pendientes de decisión; 15 fuera de Weë AI**.

## 11. Estado

**CORREGIDO EN RAMA AISLADA** (`r8/contraste`, desde `c3f7f9a7`): los 13 cambios de color, la suite y este documento. **NO integrado**; las tres acciones que se dejan y el token de §8 están **PENDIENTES DE DECISIÓN** del dueño del diseño.
No se tocó `functions/src`, ni el tema (`ThemeContext.tsx`), ni se añadió ningún token o color, ni se cambió ningún icono, borde, fondo o sombra.
