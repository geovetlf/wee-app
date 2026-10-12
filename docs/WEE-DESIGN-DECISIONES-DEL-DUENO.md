# Weë Design — las decisiones del dueño para cerrarlo (versión 2)

> **Estado: PREPARADO para que lo responda el dueño; las dieciséis decisiones y las diez autorizaciones están PENDIENTES DE DECISIÓN. Este documento no toma ninguna decisión ni registra ninguna.**
> Ronda R8 (2026-10-12), tarea DEC, sobre `c3f7f9a7` (rama `r8/decisiones`). Sustituye a la versión 1 (R7-Design, `737cd64`,
> sobre `a64ff24`). Lo único que escribe esta tarea es este archivo: no toca `DESIGN.md`, `WEE-DESIGN-UIUX-DECISIONS.md`,
> `WEE-CHEF-ESPECIFICACION.md`, ninguna fila de decisión, ningún código ni ninguna prueba.

> **Lo esencial, en seis líneas.**
> 1. **Qué se contesta:** dieciséis preguntas en cuatro bloques (§A.2; D8 y D9 solo se registran) y diez autorizaciones de sí · no · después (§F). Con letras; el resto del documento es para quien quiera ver el porqué.
> 2. **Tus letras de partida coinciden una a una con lo que cada documento recomienda y con mi análisis** (§C). Tres traen un modificador que no es una opción de ninguna tabla (D3 «en dos escalones», D6 «con C como condición de parada», D7 «condicionada») y la de DEC-06 («a») se contesta **1**. **Ninguna deja un criterio imposible**; dos quedan condicionados: CL-13 y CL-16 (§D.1).
> 3. **Hay tres aclaraciones de una palabra que solo tú puedes dar** (en la hoja, bloque 2): si CL-13 se cierra con o sin linaje (D3), si mi lectura de la «parada en C» es la tuya (D6) y DEC-12 (D7).
> 4. **Si registras las trece que lee CL-23**, el corredor pasa de 11 · 5 · 9 · 3 a **13 · 12 · 0 · 3**: se cierran CL-05 y CL-23 y siete criterios dejan de esperarte y pasan a ser trabajo (§D.2).
> 5. **Chef:** D-1 = A desbloquea CHEF-02 y CHEF-03b (no el lote entero, pese a lo que dice la especificación); D-3 = A **con una condición**: no prometer «alérgenos» sin una estimación que lo sostenga (§B.4).
> 6. **Nada de esto se construye ni se integra con este documento:** el puente, «Mis creaciones» y las demás correcciones siguen en ramas aisladas (§E.2).

**Qué es.** La tabla de respuestas que desbloquea el cierre de Weë Design y el arranque de Weë Chef, pensada para contestarse con
letras **en una sola sesión**: catorce decisiones —D1 a D7 de [DESIGN.md](DESIGN.md) §4; DEC-01, DEC-02, DEC-05 y DEC-06 de
[WEE-DESIGN-UIUX-DECISIONS.md](WEE-DESIGN-UIUX-DECISIONS.md) §2; la estructura visual de Weë Design; y D-1 y D-3 de Weë Chef
([WEE-CHEF-ESPECIFICACION.md](WEE-CHEF-ESPECIFICACION.md) §8.2)—, más D8 y D9 (solo registro, necesarias para CL-23) y las acciones y
autorizaciones del dueño que no son decisiones de Design (§F). Cada una tiene su ficha de doce campos (§B), el contraste con las letras
de partida del dueño (§C), la separación entre lo obligatorio y lo opcional con la simulación del registro recalculada (§D), la
estructura visual (§E) y las autorizaciones (§F).

**Qué no es.** No es una auditoría nueva: usa el estado real de [WEE-DESIGN-CIERRE.md](WEE-DESIGN-CIERRE.md) y su corredor
(`node functions/test/_design-cierre.mjs`). No introduce ninguna estructura visual: «hero + herramientas plegadas + muro» **no
existe hoy** en Design ni en Chef (§E). Las **recomendaciones** son opiniones razonadas y rotuladas **[O]**: se pueden ignorar, y
ninguna está registrada.

**Marcas de evidencia.** Cada afirmación sobre el código lleva `archivo:línea` **de esta rama** y una marca: **[L]** leído, sin
ejecutar · **[E]** ejecutado por mí en esta rama el 2026-10-12 (logs en §G) · **[I]** inferido o estimado (se dice cómo) · **[O]** opinión.
Una afirmación sobre el código sin marca es **[L]**. Todas las citas `archivo:línea` y los textos literales de las tablas fuente se
resuelven contra el árbol de esta rama al ensamblar el documento (§G): ninguna se escribió a mano.

**Escala de coste** (la de la v1): **S** = hasta un día de una persona con sus pruebas · **M** = de dos a cuatro días · **L** = una
semana o más, o necesita autorización (una cerca de integridad) o verificación con un proveedor. Es una estimación mía **[I]**; la
única cifra que trae el repositorio es la de P1 («1–2 días con su suite», `docs/WEE-DESIGN-CIERRE.md:167`). **Ningún precio de Credits aparece
aquí**: los calcula `creatorQuote` (CLAUDE.md §7).

**Qué cambió respecto de la versión 1** (para quien la leyó):

1. **La base es otra.** `c3f7f9a7` integra todo R7-Design: el corredor da hoy **11 cumplidos · 5 abiertos · 9 esperan una decisión · 3
   manuales** [E] (la v1: 4 · 11 · 9 · 4). Ya están hechos CL-10, CL-11, CL-12, CL-17, CL-20 (en el cliente), CL-24, CL-27 y CL-28.
2. **Todas las cifras de la simulación del registro se recalcularon** (§D): con las trece decisiones que lee CL-23 registradas, el
   corredor daría **13 cumplidos · 12 abiertos · 0 esperan · 3 manuales** [E] (la v1: 6 · 18 · 0 · 4).
3. **La pregunta de seis opciones ya no carece de «🤷 No sé».** Desde CL-10 la plantilla `design` ofrece siete botones, el último
   «🤷 No sé» (`functions/src/creator/templates.ts:361-369`): la v1 decía «seis opciones sin “No sé”», y eso ya no es verdad.
4. **Los números de línea de `templates.ts` y de `CreatorFlowScreen.tsx` cambiaron** (los tocaron CL-10, CL-11, CL-12 y CL-20): el
   paso de imagen de `design` está ahora en `functions/src/creator/templates.ts:612` (la v1 decía `:582`) y `CONSERVA_EL_CONTEXTO` en
   `screens/CreatorFlowScreen.tsx:368` (la v1: `:335`).
5. **Nuevo:** D8 y D9 con ficha; la estructura visual de Design como decisión con su ficha; Chef D-1 y D-3; el contraste con las
   letras de partida del dueño; una hoja de respuesta de una sola sesión; las acciones y autorizaciones del dueño (§F); y una lectura más
   estricta de lo que **no** cierra una respuesta (§D).
6. **DEC-06 cambia de etiquetas** (§B, ficha de DEC-06): la v1 le puso `a`, `b`, `c`; la «a» se confunde con la decisión **DEC-06a**, que es
   otra cosa. Aquí son **1, 2 y 3**.

---

## A. Hoja de respuesta de una sola sesión

### A.1 Cómo contestar (un minuto)

1. **Contesta con la letra de cada fila.** Un hueco sin rellenar quiere decir «todavía no contesto» y no cuenta. Una respuesta que sea «no
   ahora» también cuenta (qué respuestas lo son, en §D.3).
2. **Las letras son las de los documentos fuente.** Dos decisiones no las traen y aquí llevan una etiqueta propia: **DEC-06** (1 · 2 · 3) y
   la **estructura de Weë Design** (A a E: la formuló la v1; §E). Si en DEC-06 escribes «a», «b» o «c» se lee 1, 2 o 3: la «a» es la
   primera alternativa, **no** la decisión DEC-06a.
3. **Las que no tienen una sola letra:** D8 y D9 traen una recomendación compuesta («A ahora, B después» y «A + C»); aquí se contestan con
   una letra y, si procede, se dice qué se añade (ver sus fichas).
4. **Di siempre «Design D3» o «Chef D-1»**: los nombres chocan (D1–D9 de Design ≠ D-1…D-12 de Chef ≠ «cobro proporcional (D9)» del Algorithm
   Engine; Anexo D).
5. **Registrar es otra cosa que contestar.** Este documento no escribe ninguna respuesta en las filas de las tablas: lo hace el dueño o quien
   coordina, con el formato del Anexo D.

**El orden en que conviene contestar** (el de la hoja de abajo) sale de las dependencias, no del gusto:

```
BLOQUE 1 · COMPUERTAS   DEC-01 ─► ESTRUCTURA (E = DEC-01 C) · D1          dicen a qué pantalla se refiere todo lo demás
BLOQUE 2 · CAPACIDADES  D2 ─► D7 (+ DEC-12) · D6 (+ DEC-24) · D4 ◄─► D5 · D3 (con D6, comparte «material como entrada»)
BLOQUE 3 · SOLO REGISTRO  DEC-02 ─► DEC-05 · DEC-06 (+ DEC-20/21) · D8 · D9   (CL-23 pide trece de trece; no construyen nada hoy)
BLOQUE 4 · CHEF         D-1 (misma pregunta que la ESTRUCTURA) · D-3 (─► D-4 si hay «Alérgenos»)
BLOQUE 5 · AUTORIZACIONES  AUT-1 … AUT-10 (§F): sí · no · después
```

### A.2 La hoja (copia el bloque y rellena)

```
BLOQUE 1 · COMPUERTAS
  DEC-01 = _        ESTRUCTURA de Weë Design (A–E, §E) = _        D1 = _

BLOQUE 2 · CAPACIDADES
  D2 = _      D7 = _      D6 = _      D4 = _      D5 = _      D3 = _
  Aclaraciones de una palabra:   D3 → ¿CL-13 se cierra con linaje? = _ (sí · no, solo con las respuestas)
                                 D6 → ¿mi lectura de «C como parada» (ficha de D6) es la tuya? = _ (sí · no)
                                 D7 → DEC-12 = _ (A sí · B no; condiciona «Un recorrido»)
  (vecinas opcionales: DEC-24 = _ si D6 = A · DEC-18 = _ si D3 ≠ A)

BLOQUE 3 · SOLO REGISTRO (hacen falta las trece con D1–D7 para CL-23)
  DEC-02 = _      DEC-05 = _      DEC-06 = _ (1 · 2 · 3)      D8 = _      D9 = _

BLOQUE 4 · WEË CHEF
  Chef D-1 = _      Chef D-3 = _

BLOQUE 5 · AUTORIZACIONES Y ACCIONES (sí · no · después; qué es cada «sí», en §F)
  AUT-1 M-01 del Router = _ (solo M-01 · con PR1–PR3 · no)      AUT-2 CL-19 cancelar = _      AUT-3 B-12 projectId ajeno = _
  AUT-4 F-12 dorado como texto = _      AUT-5 CL-21 reservas colgadas = _      AUT-6 CL-22 canario = _
  AUT-7 danés (13 cadenas) = _      AUT-8 SpecialistHero = _ (mantener · borrar)      AUT-9 texto de CLAUDE.md §5 = _
  AUT-10 H-EMU-1 cupo diario en fallos = _
```

Si prefieres contestar «las del punto de partida» o «las que recomienda este análisis», aquí están las dos, **como recomendaciones, no como
respuestas** (ninguna está registrada). Las del dueño son las que trajo el encargo como punto de partida; la columna R8 es la de este análisis
**[O]** y cada discrepancia o matiz está explicado en §C:

**La hoja rellena con las letras de partida del dueño** (D8, D9 y Chef no traen letra de partida: quedan en blanco):

```
BLOQUE 1 · DEC-01 = B     ESTRUCTURA = A     D1 = A
BLOQUE 2 · D2 = B     D7 = A (condicionada)     D6 = A (C como parada)     D4 = A     D5 = A     D3 = C (dos escalones)
BLOQUE 3 · DEC-02 = B     DEC-05 = A     DEC-06 = 1 («a»)     D8 = _     D9 = _
BLOQUE 4 · Chef D-1 = _     Chef D-3 = _
```

**La hoja rellena con lo que recomienda R8 [O]** (cada matiz, explicado en §C; D8, D9 y Chef, en sus fichas):

```
BLOQUE 1 · DEC-01 = B     ESTRUCTURA = A     D1 = A
BLOQUE 2 · D2 = B     D7 = A (condicionada)     D6 = A (C como parada)     D4 = A     D5 = A     D3 = C (dos escalones)
BLOQUE 3 · DEC-02 = B (registro sin obra)     DEC-05 = A     DEC-06 = 1     D8 = A     D9 = A (+ C solo si quieres la obra)
BLOQUE 4 · Chef D-1 = A     Chef D-3 = A (con la condición de «Alérgenos»)
```

Para contestar «las de R8» basta decirlo; para cambiar una, escribe solo esa.

### A.3 Tabla-índice (una pantalla)

«Doc.» es lo que la tabla fuente marca como «Recomendado» (no se ha aplicado). «Dueño» es la letra de partida. Coste y criterios, en la escala de
arriba y con el estado de hoy de §D.

| # | Id | Pregunta (resumida) | Doc. | Dueño | **R8** [O] | Coste [I] | Qué criterios mueve | Depende de |
|---|---|---|---|---|---|---|---|---|
| 1 | **DEC-01** | ¿La referencia funcional sustituye algún día a `DesignScreen`? | B | B | **B** | 0 ahora | CL-23 (con C re-basa CL-01–05, 09, 24, 26) | compuerta |
| 2 | **ESTRUCTURA** | ¿Qué ve la persona al entrar en Weë Design? (A a E) | — (la formuló la v1) | A | **A** | 0 (B: S) | ninguno con A; con C o E re-basa CL-01–05, 09, 24, 26 | DEC-01 (E = DEC-01 C); ≈ Chef D-1 |
| 3 | **D1** | ¿Qué es Weë Design? | A | A | **A** | M | CL-01, CL-05 (y P1/F2) | DEC-01 |
| 4 | **D2** | Entregables de la primera versión | B | B | **B** | S sobre P1 | CL-02, CL-01 | D1 |
| 5 | **D7** | Puertas sin capacidad detrás | A | A cond. | **A cond.** | M | CL-05, CL-01 | D1, D2 (+ DEC-12) |
| 6 | **D6** | Referencias que sube la persona | A | A (C parada) | **A (C parada)** | M–L (C: S–M) | CL-09, CL-16 | D1, D2 (+ DEC-24) |
| 7 | **D4** | Texto dentro de la imagen y nivel de los logos | A | A | **A** | S–M | CL-15 | D1, D5 |
| 8 | **D5** | Formatos | A | A | **A** | M | CL-14 | D4 |
| 9 | **D3** | Editar después de generar | C | C (2 esc.) | **C (2 esc.)** | M (esc. 1) · L (linaje) | CL-13 | comparte con D6 (+ DEC-18) |
| 10 | **DEC-02** | Con la puerta abierta, ¿por dónde se entra? | B | B | **B** | 0 ahora · S–M al abrir | CL-23 | DEC-01 |
| 11 | **DEC-05** | ¿Se oculta la barra global en el teléfono? | A | A | **A** | 0 | CL-23 | DEC-01, DEC-02 |
| 12 | **DEC-06** | Los destinos de exportación | 1 (la lista) | «a» → 1 | **1** | 0 | CL-23 | DEC-01 (+ DEC-20/21) |
| 13 | **D8** | Memoria de marca o brand kit | «A ahora, B después» | — | **A** | 0 | CL-23 | — |
| 14 | **D9** | Uso comercial y moderación propia | «A + C» | — | **A** (+ C si quieres la obra) | 0 · C: M | CL-23 | D4 (logos con texto) |
| 15 | **Chef D-1** | Estructura visual de Chef | A | — | **A** | 0 (lote 1) | desbloquea CHEF-02 y CHEF-03b; AC-27 | — |
| 16 | **Chef D-3** | Información nutricional | «A ahora, B después» | — | **A con condición** | S (dentro de CHEF-03a) | desbloquea la opción `nutrition` de CHEF-03a y la tarjeta de CHEF-03b | Chef D-4 si hay «Alérgenos» |

Los números de las columnas «Doc.» y «Criterios» salen de `docs/DESIGN.md:63-71`, `docs/WEE-DESIGN-UIUX-DECISIONS.md:26-29`,
`docs/WEE-CHEF-ESPECIFICACION.md:533-535` y del «Mapa de decisiones» de `docs/WEE-DESIGN-CIERRE.md:317-320` **[L]**.

### A.4 Lo que conviene saber antes de contestar

1. **Registrar las trece (D1–D7, D8, D9, DEC-01, DEC-02, DEC-05 y DEC-06) cierra por registro solo dos criterios: CL-05 y CL-23.** Los otros
   siete que hoy esperan al dueño (CL-01, 02, 09, 13, 14, 15 y 16) pasan de «espera una decisión» a «abierto»: dejan de esperarte y pasan a ser
   trabajo. El corredor daría **13 cumplidos · 12 abiertos · 0 esperan · 3 manuales** (hoy 11 · 5 · 9 · 3). **[E: simulación en memoria, §D.2]**
2. **Sin D8 y D9, CL-23 no se cumple** aunque contestes las once: pide trece de trece (`functions/test/_design-cierre.mjs:291-296`
   y `docs/WEE-DESIGN-CIERRE.md:306`). **[E]**
3. **Con las letras de partida del dueño ningún criterio queda imposible de cumplir tal como está escrito** (§D.1). Dos quedan condicionados:
   CL-13 (la sonda se cierra con la mitad del trabajo de D3, pero su texto exige también linaje) y CL-16 (se cierra solo con D6 = A; con la
   parada en C queda abierto, no imposible). **[E/L]**
4. **D4 y D5 están acopladas por el motor:** solo dos modelos de imagen de Weë escriben texto (los dos de Gemini) y su política de resolución
   solo declara medidas verificadas para 1:1 (`functions/src/engine/resolutionPolicy.ts:108-120`). **[E]** (§B, fichas de D4 y D5)
5. **Qué archivo toca qué cerca de integridad está medido** (Anexo A): las plantillas, los prompts y las entradas del servidor de Design no mueven
   ninguna; `creator/index.ts` mueve F4; el motor de imagen mueve E4 y F1; los precios, F2; el contenido, F3. **De los doce archivos de servidor que midió la v1, once no
   han cambiado desde entonces** (`git diff a64ff24 c3f7f9a7` solo toca `templates.ts` entre ellos) **[E]**, así que la medición sigue vigente; `templates.ts`
   cambió y `puente-pre-f1d` sigue en 42/42 **[E]**.
6. **Hogar & Diseño no tiene hoy ninguna puerta visible en toda la aplicación**, aunque `CLAUDE.md` ya lo coloca dentro de Weë Design: «Home desde Weë Design (Hogar &
   Diseño)» (`CLAUDE.md:18`). **[E: búsqueda en `screens/`, `components/`, `utils/` y `navigation/`]**
7. **De las 35 formas de empezar que enseña la pantalla, el servidor entiende «qué es» sin preguntar 13 en español y 3 en inglés** [E], igual que la
   v1. Las otras 22 acaban ahora en «Cuéntame qué necesitas y te propongo por dónde empezar», con siete botones y «🤷 No sé» (CL-10 hecho) **[E]**.
8. **Hay trabajo ya preparado en ramas aisladas que presupone respuestas:** el puente «Crear» → `CreatorFlow` (`r7d/puente`, `e1381734`; la tarea PAN
   lo pone al día en `r8/puente`) presupone D1, D2 y D7 y **no está integrado**; «Mis creaciones» de verdad (CL-04, `r8/pantalla`) no presupone ninguna. Qué
   hay en cada rama y qué es base, en §E.2.
9. **Las respuestas dicen qué código escribir; no cierran criterios de código.** El corredor da «cumplido» a un criterio de código cuando su
   comprobación de máquina pasa, haya o no una decisión escrita (`functions/test/_design-cierre.mjs:355-368`). Solo CL-05 y CL-23
   leen el registro. Por el proceso de la ronda, **no se integra código que presuponga una decisión sin registrar**.

### A.5 Las decisiones vecinas que condicionan alguna respuesta (opcionales)

No hacen falta para CL-23 y no tienen ficha aquí; se contestan en la misma sesión si quieres que la respuesta principal no quede a medias.

| Vecina | Qué pregunta (resumen; texto en `docs/WEE-DESIGN-UIUX-DECISIONS.md:35` y siguientes) | Doc. recomienda | Condiciona |
|---|---|---|---|
| **DEC-12** | ¿Weë Design lleva a Weë Studio para presentar un diseño en vídeo? (A sí, con contexto · B no) | A | **D7-A** («Un recorrido» llevaría a Studio): si DEC-12 = B, esos puntos se retiran (D7-B para ellos) |
| **DEC-24** | ¿Se manda a un candidato 3D el vídeo o la foto de una persona real? (A no, sin revisión legal · B sí, con consentimiento) | A | **D6-A**: una referencia puede llevar un rostro; es lo que dispara la «parada en C» (ficha de D6) |
| **DEC-18** | ¿Reintentos gratis tras un resultado? (A no: «otra versión» se cotiza y se cobra, hoy · B N gratis) | A (hasta medir el coste real) | **D3**: editar cuesta una edición; con DEC-18 = B habría que medir antes |
| **DEC-20 / DEC-21** | ¿Quién convierte de formato y aplica ajustes de entrega? · ¿complementos para programas 3D y laminadores? | A · A, luego B | **DEC-06**: la lista de destinos no tiene efecto visible hasta que exista el conversor de Weë |

---

## B. Las fichas

Cada ficha trae los **doce campos** de la petición: **1** texto literal de la pregunta · **2** alternativas literales · **3** qué marca el documento
fuente como «Recomendado» y cuál equivale a «mantener lo de hoy» · **4** recomendación previa de Claude (la v1) · **5** efecto funcional,
**6** efecto visual y **7** archivos o contratos (cerca de integridad incluida), estos tres **por alternativa** · **8** criterios afectados
con su estado de hoy · **9** riesgos y dependencias · **10** qué sucede si no se decide · **11** si alguna alternativa vuelve imposible un criterio ·
**12** recomendación final (R8). Las cercas de integridad se nombran como en el Anexo A (`puente-pre-f1d`: F1–F4 y E4). Las fichas siguen el orden de la hoja
de respuesta. «`hoy`» es `c3f7f9a7`.

### B.1 Bloque 1 — compuertas

---

### DEC-01 — ¿La referencia funcional sustituye algún día a `DesignScreen`?

**1 · Texto literal de la pregunta.**

> «¿La referencia funcional sustituye algún día a `DesignScreen`? (CLAUDE.md §5: las interfaces de Weë AI no se rediseñan sin el dueño)» — `docs/WEE-DESIGN-UIUX-DECISIONS.md:26`

**2 · Alternativas literales.**

> **A)** Nunca: conviven
>
> **B)** Sí, después de la misión de identidad
>
> **C)** Sí, ya
>
> — `docs/WEE-DESIGN-UIUX-DECISIONS.md:26`

**3 · Qué marca el documento.** «Recomendado»: «B». Equivale a **mantener lo de hoy: A** («Nunca: conviven»): hoy conviven, con la puerta
de la referencia cerrada (`constants/designReferencia.ts:40`). **4 · Previa de Claude (v1):** **B**.

**Contexto [L].** La «referencia funcional» (`screens/DesignReferenciaScreen.tsx`, `components/designReferencia/*`) es un **espacio de trabajo**: barra de
comandos de ocho verbos (Crear, Transformar, Editar, Materiales, Animar, Escena, Imprimir, Entregar), biblioteca, lienzo, inspector, franja de trabajos y la caja
anclada con la intención Crear, Transformar o Editar (`docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md:35-46`); en el teléfono, cuatro superficies
(`docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md:297`). Está **detrás de una puerta cerrada**: sin enlace (`App.tsx:239`), sin entrada en
ningún menú, y `DesignScreen` ni la nombra (`functions/test/design-referencia.mjs:312-313`). Conecta de verdad «Crear» y «Transformar» con
`CreatorFlow` (`screens/DesignReferenciaScreen.tsx:268-269`). **[E]** Su registro tiene **107** capacidades: 94 son de Weë Design y 13 están
marcadas «fuera»; de las 94, **12 funcionan, 7 son parciales y 75 se ven apagadas con su motivo** (11 piden servidor, 21 proveedor, 23 son candidatas nuevas, 10 están
en revisión, 10 planeadas): el 80 % está apagado. Es «funcional y provisional» (sello «Referencia funcional», estética neutra); la identidad visual es otra misión que «NO empieza
ahora» (`docs/WEE-DESIGN-UIUX-DECISIONS.md:78-82`), y `docs/WEE-DESIGN-CIERRE.md:340` deja «abrir la puerta de la referencia o sustituir la pantalla (DEC-01)» fuera de «terminado».

**5 · Efecto funcional, por alternativa.**
- **A — Nunca: conviven.** Nada cambia, ni ahora ni después: la pantalla de siempre; la referencia sigue cerrada o sirve de espacio aparte (según DEC-02). Se renuncia a un
  único espacio de trabajo; se puede reabrir cambiando la respuesta.
- **B — Sí, después de la misión de identidad.** Nada cambia ahora. Queda escrito que el espacio de trabajo sustituirá a la pantalla cuando exista la identidad visual: compromete a hacer
  esa segunda misión.
- **C — Sí, ya.** La pantalla de Design deja de ser cabecera + caja + seis puertas + muestras y pasa a ser el espacio de trabajo; en el teléfono, cuatro superficies; el 80 % de
  lo que enseña está apagado con su motivo.

**6 · Efecto visual, por alternativa.** **A y B:** nada: se ve lo de hoy. **C:** otra pantalla, con el sello «Referencia funcional», estética neutra (no la identidad), el marco `CreatorShell`
(en escritorio, con la barra lateral de Weë AI y el saldo; `DesignScreen` hoy no lo monta, §E.2) y la caja anclada abajo.

**7 · Archivos o contratos, por alternativa.** **A, B:** ninguno ahora; **B después:** lo de C más la identidad (lenguaje visual, paneles, iconografía, responsive, accesibilidad) y la revisión nativa
de los textos de la referencia en los 14 idiomas que hoy no la tienen (`docs/WEE-DESIGN-UIUX-DECISIONS.md:71`). **C:**
`constants/designReferencia.ts` (la puerta), `App.tsx` (el enlace), `navigation/MainStackNavigator.tsx` (`:372-373`) y
`screens/SpecialistScreen.tsx` (`:117`: montar la referencia en lugar de `DesignScreen`). Pruebas que existen **para que esto no pase** y habría que invertir: I17
(`functions/test/design-referencia.mjs`) y `navegacion-enlaces` 31–34; y reapuntar `design-cierre`, `cajas-weeai`, `credits-weeai` y `aceptacion-pantallas`. i18n: `designRef.ts` (388 claves) ×16, sin revisión nativa.
**Cercas `puente-pre-f1d`: ninguna** (todo cliente) **[L]**; ningún contrato compartido.

**8 · Criterios afectados (hoy).**

| Criterio | Hoy | Efecto de la respuesta |
|---|---|---|
| CL-23 (registro) | espera una decisión | DEC-01 sola no cambia ningún estado [E]; cuenta una de las trece |
| CL-01, 02, 03, 04, 05, 09, 24, 26 | espera una decisión · espera una decisión · abierto · abierto · espera una decisión · espera una decisión · cumplido · manual | Con **C** se re-basan: describen `DesignScreen`, que dejaría de montarse |
| Propuestas P1–P11, fases F0–F5 | — | Ninguna depende de DEC-01 («DEC-01, 02, 05 y 06 → solo si se promueve la referencia a pantalla montada», `docs/WEE-DESIGN-CIERRE.md:317`) |

**9 · Riesgos y dependencias.** Es **la compuerta de las demás**: con A o B, D1–D7 hablan de `DesignScreen`; con C, hay que re-basarlas. Con C choca con «las interfaces de Weë AI … no se rediseñan, no se
simplifican ni se reemplazan» (`CLAUDE.md:78`) y con «No agregar funciones, menús ni secciones solo porque sean posibles» (`CLAUDE.md:9`). **[I]** La referencia parece cubrir por sí sola CL-01, 02, 03, 04 y 09, pero **no lo verifiqué
ejecutándola** (puerta cerrada, sin web: CL-26).

**10 · Si no se decide.** CL-23 queda en «espera una decisión» y, por la definición de «terminado» (`docs/WEE-DESIGN-CIERRE.md:329`), Design no puede llegar a «terminado» aunque todo lo demás se haga. De hecho
se trabaja como si fuera A (conviven, puerta cerrada). **Ningún riesgo de producción:** la puerta es una constante cerrada en el código.

**11 · ¿Vuelve imposible un criterio?** Ninguna alternativa. **C re-basa** CL-01, 02, 03, 04, 05, 09, 24 y 26 (habría que reescribirlos sobre el espacio de trabajo).

**12 · Recomendación final (R8) [O]: B**, como el documento y como la v1 — **la confirmo**. La referencia ya hace lo que `DesignScreen` no hace (crear de verdad), pero el 80 % apagado choca con «una experiencia simple por delante» y la identidad
visual todavía no existe; B anota la dirección sin comprometer trabajo ni tocar una pantalla que hoy es la referencia visual definitiva. **Qué me haría cambiar:** que no vaya a haber misión de identidad (A); o que haya que cerrar CL-01 a CL-05 por el camino más corto y se acepte la estética neutra (C, con su coste en pruebas).

---

### ESTRUCTURA — ¿qué ve la persona al entrar en Weë Design? (A a E)

**1 · Texto literal de la pregunta.** **No es una fila de ninguna tabla fuente**: la formuló la v1 a partir del encargo del dueño —«hero como entrada, herramientas en secciones desplegables cerradas por defecto y el muro social como superficie principal»,
citado en `docs/WEE-DESIGN-CIERRE.md:81`— y se reproduce **tal cual está en §E.4**:

> «¿Qué ve la persona al entrar en Weë Design?» — §E.4 de este documento

**2 · Alternativas literales.** Las de §E.4 (se copian allí con sus efectos, no aquí): **A** lo de hoy · **B** lo de hoy con «Explora» plegada al entrar · **C** un hero propio arriba y las puertas en secciones desplegables cerradas · **D** A o B, más una franja
«De la comunidad» de solo lectura (o el muro de sección de vuelta) · **E** el espacio de trabajo de la referencia en lugar de esta pantalla (es DEC-01 = C).

**3 · Qué marca el documento.** Ningún documento fuente marca un «Recomendado» para esta pregunta; lo más cercano es la lista de cierre, que contesta fila por fila qué se hizo: con el hero, «Nada: ya cumple»; con las herramientas plegadas, «Nada: no se pliega Explora (sería rediseñar)», con la nota «Para decidir: si
Explora debe empezar plegada, son unas 25 líneas»; con el muro, «Nada: no se añade muro» (`docs/WEE-DESIGN-CIERRE.md:86-88`). Eso equivale a **A = mantener lo de hoy**. **4 · Previa de Claude (v1): A**, y lo plegable, si se quiere, por **B** más adelante.

**5 · Efecto funcional, por alternativa.** **A:** nada. **B:** las seis puertas dejan de estar a la vista y se abren con un toque; al volver a entrar están cerradas (como las herramientas de Weë Travel). **C:** un hero arriba y todo plegado debajo. **D:** una franja de publicaciones recientes
hechas con Weë Design (solo lectura) o un muro completo. **E:** otro espacio de trabajo (DEC-01 = C).

**6 · Efecto visual, por alternativa.** Detallado en §E.3 (con la pantalla de hoy bloque a bloque en §E.2): A nada · B desaparece la rejilla de puertas bajo la caja · C hero con imagen que **nadie ha entregado** (no hay ningún activo de imagen de Design) y secciones plegables ·
D una franja o un muro dentro de una pantalla de creación · E la referencia funcional.

**7 · Archivos o contratos, por alternativa.** **A:** ninguno. **B:** `components/design/DesignExplore.tsx` y `screens/DesignScreen.tsx` (un estado y el atrás de Android que pliega primero, como `screens/SpecialistScreen.tsx:89`). **C:** el cuerpo de `DesignScreen.tsx`, un componente nuevo, `DesignExplore`
a secciones, textos nuevos ×16; **no** `CabeceraDeSeccion` (la usan todas las secciones). **D:** `DesignScreen.tsx` y un componente de franja; reutiliza `paginaDeLaSeccion` (`utils/sectionFeed.ts:358`) y el filtro del Wäll (`utils/feedFilters.ts:93`). **E:** los de DEC-01 = C.
**Cercas `puente-pre-f1d`: ninguna en ninguna** (todo cliente).

**8 · Criterios afectados (hoy).**

| Criterio / suite | Hoy | Efecto |
|---|---|---|
| CL-25 (sin restos de lo que ya no existe) | abierto | Su tercer resto, `SpecialistHero.tsx` sin importadores, depende de esta respuesta (AUT-8): con **C** no conviene borrarlo, y dos pruebas ya fijan que se queda «por decisión» |
| CL-26 (verificación visual, manual) | manual | Se hace sobre la pantalla que se decida; con A, sobre la de hoy |
| CL-01 a 05, 09, 24 | espera una decisión · espera una decisión · abierto · abierto · espera una decisión · espera una decisión · cumplido | Con **C** o **E** se re-basan |
| `design-cierre` A1 y B5, `cajas-weeai` 21, `aceptacion-pantallas` ACE-D-01, ACE-D-20, ACE-D-24 | verdes [E] | Con **B** pocas, con **C** varias, con **D** pocas, con **E** muchas: fijan el orden y la forma de hoy |

**9 · Riesgos y dependencias.** B pierde descubrimiento (las puertas ayudan a quien no sabe qué diseñar) y roza «no se simplifican» (`CLAUDE.md:78`); C choca con la decisión del usuario del 2026-09-15 «arriba de una sección no va nada más que esto»
(`components/creator/CabeceraDeSeccion.tsx:51`), con el cambio `f28cee9` y con CL-25, y es la forma de la **D-1 B de Chef**; D reabre «un solo muro» (`4ff271e`); E es DEC-01 = C. **Depende de DEC-01** (E = DEC-01 C) y es **la misma pregunta que Chef D-1** (§B.4).

**10 · Si no se decide.** Se trabaja con **A** (la estructura de hoy), CL-26 se hace sobre la pantalla actual y `SpecialistHero.tsx` no se borra (CL-25 queda abierto por ese resto). Nada se bloquea: es la única decisión del bloque 1 cuyo «no contesto» no frena ningún criterio.

**11 · ¿Vuelve imposible un criterio?** Ninguna. **C** y **E** re-basan CL-01 a CL-05, CL-09, CL-24 y CL-26.

**12 · Recomendación final (R8) [O]: A** — **confirma la v1.** La estructura de hoy ya cumple lo que el cierre exige (`docs/WEE-DESIGN-CIERRE.md:79-92`); la estructura de «hero + herramientas plegadas + muro» que menciona el encargo **no existe hoy en Design** (§E.1). **Qué me haría cambiar:** que el dueño entregue las imágenes de un hero de Design y quiera revisar su decisión
del 2026-09-15 (C), o que una medición de uso muestre que las puertas no se tocan (B).

---

### D1 — ¿Qué es Weë Design?

**1 · Texto literal de la pregunta.**

> «¿Qué es Weë Design? Hoy se contradicen el menú (gráfico), la referencia visual (todo), la pantalla (físico) y la plantilla (gráfico + concepto).» — `docs/DESIGN.md:63`

**2 · Alternativas literales.**

> **A)** Todo «lo que imagines»
>
> **B)** Solo lo físico y los espacios
>
> **C)** Solo diseño gráfico
>
> — `docs/DESIGN.md:63`

**3 · Qué marca el documento.** «Recomendado»: «A, con cada puerta llevada a una intención de la plantilla». **Mantener lo de hoy:** ninguna: hoy conviven las tres —de ahí la contradicción— (la pantalla se parece a B, el menú a C). **4 · Previa de Claude (v1): A**, sin añadir puertas gráficas en la primera versión.

**Contexto [L].** Lo que dice hoy cada sitio: el **menú de Weë AI** (gráfico) — «Logos, posters, ilustraciones y material para tus redes» (`constants/weeExperiences.ts:76`; igual en `i18n/textos/es/creator.ts:8`, con los ejemplos «Un logo para mi negocio», «Un post para Instagram» y «La portada de mi libro»); la **referencia visual y el prompt maestro**
(todo) — «Diseña lo que imagines.» … «Desde un logo hasta un auto, un producto o un mundo completo.» (`i18n/textos/es/catalogo.ts:73-74`), catorce categorías con foto en `design/references/wee-design.jpg` y `docs/CREATOR-BUILD.md:27`; la **pantalla montada** (físico) — «Diseña sin límites.» «Espacios, productos, objetos y mucho más.»
(`i18n/textos/es/design.ts:14-15`) y siete puertas físicas: Interiores, Arquitectura, Producto, Mobiliario, Vehículos, Renders y 3D, Espacios (`constants/designTools.ts:43-72`), que «son puertas, no límites» (`constants/designTools.ts:8`); la **plantilla del servidor** (mixto) — seis intenciones: logo, afiche, producto, vehículo o máquina,
lugar y personaje (`functions/src/creator/templates.ts:361-369`), más la plantilla `home` (Hogar & Diseño), que `constants/weeWorkspaces.ts:77-78` ya coloca en el lugar de trabajo `design`. Reglas que mandan: «Muchas posibilidades por detrás. Una experiencia simple por delante.» y las interfaces de Weë AI «no se rediseñan, no se simplifican ni se reemplazan» sin el dueño (`CLAUDE.md:78`).

**5 · Efecto funcional, por alternativa.**
- **A — Todo «lo que imagines».** Las mismas siete puertas, pero cada punto de partida lleva a una intención de la plantilla en vez de limitarse a escribir una frase en la caja. Hoy el servidor solo deduce «qué es» de **13 de las 35** frases de partida en español y de **3 en inglés** **[E]**; el resto cae en «Cuéntame qué necesitas…»
  (siete botones, con «🤷 No sé»). Los puntos de «Interiores» y «Renders y 3D» no deducen ninguna intención (0 de 5 cada una) **[E]**. El mapa puerta → intención **no existe** y hay que construirlo (`docs/WEE-DESIGN-CIERRE.md:130`). Queda una pregunta dentro de A: ¿se añaden puertas gráficas (la referencia visual trae «Logos e identidad», «Afiches y publicidad», «Personajes y criaturas»)? Añadirlas rompe `design-cierre` A1 (`functions/test/design-cierre.test.mjs:50`).
- **B — Solo lo físico y los espacios.** Es lo que enseña la pantalla hoy. Los tres tipos gráficos dejan de ser lo que la pantalla ofrece, pero la plantilla los sigue sirviendo si se escriben o llegan desde Weë AI o Weë Brain. La contradicción del menú sigue en pie salvo que se cambien sus textos.
- **C — Solo diseño gráfico.** Las siete puertas físicas se sustituyen por puertas gráficas; un yate, una silla o una casa dejan de tener puerta (siguen sirviéndose si se escriben).

**6 · Efecto visual, por alternativa.** **A:** la pantalla se ve igual (cabecera «Diseña sin límites.», caja, puertas, muestras); con el puente (P1, no integrado) desaparece el aviso «Esto es una demostración». **B:** igual; el menú de Weë AI sigue prometiendo «Logos, posters…» salvo que se cambie. **C:** cambia la cabecera y la rejilla de puertas.

**7 · Archivos o contratos, por alternativa.** **A:** `constants/designTools.ts` (cada punto gana su intención), `screens/DesignScreen.tsx` (P1), `utils/contextoDeDesign.ts` (existe solo en la rama del puente: sale de `utils/designReferencia.ts`), `i18n/textos/*/design.ts` ×16 solo si cambian textos; servidor: nada (la plantilla ya tiene las seis). **Cercas: ninguna** [E]. **B:** para la pantalla, ninguno; para ser coherente, `i18n/textos/*/creator.ts` ×16 y quizá `constants/weeExperiences.ts`. **C:** todo el catálogo `designTools.ts` y sus 49 claves de puertas y puntos (`design.ts`, 79 claves en total) ×16; reescribir `design-cierre` A1–A5, `aceptacion-pantallas` ACE-D-03/20/24 y `aceptacion-conversacion` (las 35 puertas). Ninguna toca cercas.

**8 · Criterios afectados (hoy).**

| Criterio / propuesta | Hoy | Cómo se mueve |
|---|---|---|
| CL-01 «Crear» llega a `CreatorFlow` | espera una decisión | Con D1 + D2 + D7 registradas pasa a «abierto» [E]: lo cierra el código de P1 |
| CL-05 las puertas prometen lo que el motor hace | espera una decisión | Con D1 + D7 registradas pasa a «cumplido» [E] (su sonda solo lee el registro) |
| CL-03 lo elegido viaja con la petición | abierto | Lo cierra P1 |
| P1 (puente «Crear» → `CreatorFlow`) · fase F2 | preparado en `r7d/puente`, **no integrado** | Presupone D1, D2 y D7; la respuesta **no cambia su código**, cambia lo que promete cada puerta |
| ACE-D-06 (Crear envía la solicitud) · ACE-D-03 (puertas) | HUECO («BLOCKED — HUMAN DECISION») · PARCIAL (13/35 es, 3/35 en) | `docs/WEE-ACEPTACION.md` |

**9 · Riesgos y dependencias.** Depende de DEC-01 solo en cuanto a «qué pantalla»; se contesta junto con D2 y D7 y antes que D4–D6. P1 con D1 = A: falta el mapa puerta → intención y que la pantalla recuerde la puerta (hoy `camino` la olvida al elegir un punto). Un punto de «Renders y 3D» enviado como texto a `design` se cotiza y cobra como tres imágenes (riesgo R4 del puente).

**10 · Si no se decide.** «Crear» de Weë Design **sigue siendo una demostración**: un temporizador de 1,6 s (`screens/DesignScreen.tsx:113`) y un aviso «Esto es una demostración» sin trabajo, sin Credits y sin nada detrás; el puente no se integra; CL-01 y CL-05 siguen esperando; ACE-D-06 queda como hueco. El motor real sigue llegando solo por la búsqueda de Weë AI y Weë Brain.

**11 · ¿Vuelve imposible un criterio?** Ninguna. B y C hacen que el texto de CL-05 («las puertas prometen lo que el motor hace hoy») solo se cumpla si además se resuelve D7.

**12 · Recomendación final (R8) [O]: A** — **confirma la v1.** Es la única coherente con el prompt maestro y con la referencia visual del propio dueño; el servidor ya sirve las seis intenciones con un solo motor de imagen, así que A no pide trabajo de servidor; y las puertas ya son «puertas, no límites». Matiz: dentro de A, **no** añadir puertas gráficas en la primera versión («seis puertas, no un catálogo»).
**Qué me haría cambiar:** que logos y afiches vayan a vivir en Weë Business (B más un traslado), o que el uso real muestre que casi nadie pide lo físico (se mediría con `creatorJobs` por `answers.what`; no lo medí).

### B.2 Bloque 2 — capacidades

---

### D2 — Entregables de la primera versión

**1 · Texto literal de la pregunta.**

> «Entregables de la primera versión» — `docs/DESIGN.md:64`

**2 · Alternativas literales.**

> **A)** Las 6 intenciones de la plantilla
>
> **B)** A + Hogar & Diseño con puerta propia
>
> **C)** Solo logo, post y concepto
>
> — `docs/DESIGN.md:64`

**3 · Qué marca el documento.** «Recomendado»: «B». **Mantener lo de hoy:** ninguna equivale (hoy la pantalla no crea); la más cercana es **A** (las seis intenciones, sin puerta a Hogar & Diseño, que hoy tampoco la tiene). **4 · Previa de Claude (v1): B.**

**Contexto [L/E].** Hogar & Diseño (`home`) rediseña la foto de un espacio conservando paredes y ventanas (`image.space_restyle`), propone ideas, distribución y lista de compras (`functions/src/creator/templates.ts:1392`). **No tiene hoy ninguna puerta visible en toda la aplicación [E]:** el menú la oculta (`constants/weeExperiences.ts:199`), su fila de
`constants/specialists.ts` (`:279`) no se pinta porque `screens/SpecialistScreen.tsx:117` devuelve `DesignScreen` antes, y se declaró «dentro de Weë Design» (`constants/weeExperiences.ts:393`). `CLAUDE.md` ya lo coloca ahí:
«Home desde Weë Design (Hogar & Diseño)» (`CLAUDE.md:18`). Lo único que navega a `experienceId: 'home'` es la referencia cerrada (`utils/designReferencia.ts:533`); solo se llega describiéndolo en Weë AI o en Weë Brain. Weë Studio es el único lugar de trabajo que solo encamina
(`constants/weeWorkspaces.ts:112`); Design crea él mismo y `home` ya está dentro de su lugar de trabajo (`constants/weeWorkspaces.ts:78`).

**5 · Efecto funcional, por alternativa.**
- **A — las seis intenciones de la plantilla.** «Crear» abre el flujo de Design con las seis intenciones; nadie puede transformar la foto de su espacio desde Design.
- **B — A + Hogar & Diseño con puerta propia.** Un renglón nuevo bajo las puertas, con el título «Hogar & Diseño» y el subtítulo «Transforma y rediseña tu hogar o espacio a partir de una foto.» (`i18n/textos/es/catalogo.ts:96-97`), que abre `CreatorFlow` con `experienceId: 'home'`; `CreatorFlow` ya espera la foto antes de crear
  (`screens/CreatorFlowScreen.tsx:316`; `screens/CreatorFlowScreen.tsx:559`).
- **C — solo logo, post y concepto.** Tres cosas en la primera versión; las siete puertas físicas quedarían casi todas sin destino, así que C solo es coherente con D1-C. («concepto» no está definido en el documento; lo leo como la intención genérica de «No sé qué diseñar» **[I]**.)

**6 · Efecto visual, por alternativa.** **A:** nada. **B:** un renglón nuevo bajo las puertas (la propuesta P2: `docs/WEE-DESIGN-CIERRE.md:169`: «un renglón bajo las puertas, como la entrada secundaria de 2E-56», que lee su título y subtítulo del catálogo que ya existe: **sin claves nuevas**). **C:** el catálogo entero cambia (como D1-C).

**7 · Archivos o contratos, por alternativa.** **A:** los de P1 (D1); ninguna cerca. **B:** `components/design/DesignHogar.tsx` (nuevo, un renglón; `useEspecialista('design')`, acción `home`) y `screens/DesignScreen.tsx`; **ninguna cerca**. **C:** el catálogo entero (como D1-C); ninguna cerca.

**8 · Criterios afectados (hoy).**

| Criterio / propuesta | Hoy | Cómo se mueve |
|---|---|---|
| CL-02 hay una puerta desde Design a Hogar & Diseño | espera una decisión | La sonda busca el texto `'home'` en `DesignScreen`, `designTools` o `components/design/*` (`functions/test/_design-cierre.mjs:86-93`): con D2 registrada pasa a «abierto» (D2 sola basta) [E]; **solo B la cumple** |
| CL-01 «Crear» llega a `CreatorFlow` | espera una decisión | Con D1, D2 y D7 registradas pasa a «abierto» [E] |
| P2 (puerta a Hogar & Diseño) · fase F2 · ACE-D-06 | no construida · — · HUECO | P2 es el trabajo de B |

**9 · Riesgos y dependencias.** `DesignScreen.tsx` es de otra tarea de la ronda (PAN); `design-cierre` A1 cuenta las puertas del catálogo y este renglón no lo es. Dependencias: D1 (qué pantalla) y D7-A (su «antes y después» necesita esta puerta); la foto del espacio la pide `CreatorFlow`, no la pantalla.

**10 · Si no se decide.** **CL-02 queda esperando** y Hogar & Diseño sigue sin puerta en toda la app (solo se llega escribiéndolo en Weë AI o en Weë Brain), aunque `CLAUDE.md` lo coloca dentro de Weë Design; P2 no se construye y el «antes y después» de D7-A no tiene destino.

**11 · ¿Vuelve imposible un criterio?** **A y C dejan CL-02 imposible tal como está escrito** («hay una puerta desde Design a Hogar & Diseño»): habría que reescribirlo o retirarlo. Única excepción: que D7-A lleve «Un antes y después» a `home` (la sonda solo busca el texto `'home'`), pero eso contradice D2-A, que deja Hogar & Diseño fuera.

**12 · Recomendación final (R8) [O]: B** — **confirma la v1.** Hogar & Diseño no tiene puerta en ninguna parte [E]; el registro de lugares de trabajo y `CLAUDE.md` ya lo ponen dentro de Design; P2 es un componente pequeño sin claves nuevas y sin cercas. **Qué me haría cambiar:** que el dueño quiera que transformar la foto de un espacio viva en otra parte (Weë Studio, por ejemplo): entonces A y CL-02 se retira.

---

### D7 — Puertas sin capacidad detrás

**1 · Texto literal de la pregunta.**

> «Puertas sin capacidad detrás (maqueta 3D, recorrido, antes/después)» — `docs/DESIGN.md:69`

**2 · Alternativas literales.**

> **A)** Llevarlas a lo que existe (Studio, Hogar & Diseño, imagen)
>
> **B)** Retirarlas
>
> **C)** Esperar a un proveedor 3D
>
> — `docs/DESIGN.md:69`

**3 · Qué marca el documento.** «Recomendado»: «A». **Mantener lo de hoy: C** («Esperar a un proveedor 3D»): hoy las puertas siguen ahí sin nada detrás. **4 · Previa de Claude (v1): A, condicionada.**

**Contexto [L/E].** La puerta «Renders y 3D» («Visualiza tus ideas en alto realismo.», `i18n/textos/es/design.ts`, `rendersHint`) trae cinco puntos: «Un render realista», «Una maqueta 3D», «Una vista aérea», «Un recorrido» y «Un antes y después» (`constants/designTools.ts:65-67`); elegir uno solo escribe una frase en la caja (`screens/DesignScreen.tsx:116-120`). Detrás hay solo imagen: el catálogo del Core declara `3d.*` y `render.*` sin cadena, sin adaptador y sin precio (`docs/WEE-DESIGN-UIUX-AUDIT.md:126`; `docs/WEE-DESIGN-UIUX-AUDIT.md:128`). «Una maqueta 3D» y «Un recorrido» prometen lo que nadie sirve; «Un render realista» y «Una vista aérea»
salen como imágenes; «Un antes y después» solo existe dentro de Hogar & Diseño (necesita la foto del espacio). **[E]** Ninguno de los cinco puntos deduce hoy una intención en `design` (0 de 5). Weë Studio no genera, encamina: ir de Design a Studio para un vídeo es **DEC-12** (vecina, A.5).

**5 · Efecto funcional, por alternativa.**
- **A — llevarlas a lo que existe.** «Un antes y después» lleva a Hogar & Diseño (pide la foto de su espacio); «Un recorrido» lleva a Weë Studio con lo escrito (si DEC-12 = A); «Una maqueta 3D» se dice como lo que es (una imagen) o se renombra; «Un render realista» y «Una vista aérea» siguen escribiéndose y salen como imagen.
- **B — retirarlas.** Desaparecen los puntos sin capacidad. `design-cierre` A1 exige entre tres y seis puntos por puerta y siete puertas con seis en portada (`functions/test/design-cierre.test.mjs:50`): quitar tres de los cinco puntos deja dos, así que habría que quitar la puerta entera (seis puertas, cinco en portada) y cambiar A1. Se pierden «Un render realista» y «Una vista aérea», que sí funcionan como imagen.
- **C — esperar a un proveedor 3D.** Nada cambia: «Una maqueta 3D» sigue en pantalla y, si se escribe, el servidor la trata como texto sin intención (la pregunta «Cuéntame qué necesitas…», ahora con «🤷 No sé»).

**6 · Efecto visual, por alternativa.** **A:** la rejilla de «Renders y 3D» se ve igual, con etiquetas que pueden cambiar (`reModel`, `rendersTitle`, `reWalkthrough`…); un punto que **navega** es comportamiento nuevo. **B:** la puerta «Renders y 3D» se reduce o desaparece de la portada. **C:** igual que hoy.

**7 · Archivos o contratos, por alternativa.** **A:** `constants/designTools.ts` (cada punto con su destino), `components/design/DesignPanel.tsx` y `screens/DesignScreen.tsx` (hoy elegir un punto solo escribe texto: un punto que navega es nuevo), `i18n/textos/*/design.ts` ×16; sin cercas. **B:** `designTools.ts`, `design-cierre` A1, `aceptacion-*`; sin cercas. **C:** ninguno.

**8 · Criterios afectados (hoy).**

| Criterio / propuesta | Hoy | Cómo se mueve |
|---|---|---|
| CL-05 las puertas prometen lo que el motor hace hoy | espera una decisión | **Un criterio, dos lecturas.** Su sonda solo lee que D1 y D7 estén registradas (`functions/test/_design-cierre.mjs:112-115`): cualquier respuesta lo cierra. Su título solo es verdad con A o B |
| CL-01 «Crear» llega a `CreatorFlow` | espera una decisión | Con D1, D2 y D7 registradas pasa a «abierto» [E] |
| P1 · fase F2 · `design-cierre` A1/A2 · `aceptacion-pantallas` ACE-D-03 · `aceptacion-conversacion` | preparada, no integrada · — · verdes | A y B tocan las pruebas de las puertas |

**9 · Riesgos y dependencias.** A depende de D2-B (Hogar & Diseño) y de DEC-12 (Studio). Con el puente (P1) integrado, esas tres frases («Una maqueta 3D», «Un recorrido», «Un antes y después») acabarían en la plantilla gráfica y se cotizarían y cobrarían como tres imágenes (riesgo R4 del puente, `r7d/puente`): el puente pone el hueco D1/D7 delante de la gente.

**10 · Si no se decide.** Las puertas siguen prometiendo una maqueta 3D, un recorrido y un antes y después que nadie sirve; CL-05 sigue esperando; el puente (P1) no se integra (o, si se integrara, esas frases se cobrarían como imágenes).

**11 · ¿Vuelve imposible un criterio?** **C deja el texto de CL-05 falso mientras su sonda daría «cumplido»**: si eliges C hay que reescribir CL-05 o aceptar que se cierra por registro con la promesa sin cumplir (la mínima honesta es B). Ningún criterio queda estrictamente imposible.

**12 · Recomendación final (R8) [O]: A, condicionada** — **confirma la v1.** Las condiciones, explícitas: (1) «Un antes y después» a Hogar & Diseño **solo si D2 = B**; (2) «Un recorrido» a Studio **solo si DEC-12 = A**; si no, B para esos dos puntos; (3) «Una maqueta 3D» se renombra o se retira **en cualquier caso** mientras no haya 3D. **Qué me haría cambiar:** la aparición de un proveedor 3D elegible (hoy ninguna capacidad 3D está aprobada, `docs/WEE-DESIGN-UIUX-DECISIONS.md:52`).

---

### D6 — Referencias que sube la persona

**1 · Texto literal de la pregunta.**

> «Referencias que sube la persona» — `docs/DESIGN.md:68`

**2 · Alternativas literales.**

> **A)** Inspiración de estilo (`image.reference`)
>
> **B)** Una base que se transforma
>
> **C)** Ocultar el botón hasta decidir
>
> — `docs/DESIGN.md:68`

**3 · Qué marca el documento.** «Recomendado»: «A». **Mantener lo de hoy:** ninguna (hoy las referencias son de mentira); **C** es la más cercana a «dejar de fingir». **4 · Previa de Claude (v1): A**, con C como parada.

**Contexto [L/E].** Los botones «Añadir» y «Añadir una imagen de referencia» llaman a la **misma** función (`components/studio/StudioPromptComposer.tsx:56-57`), que añade un nombre de muestra `referencia-N.png` sin selector de archivos (`screens/DesignScreen.tsx:122-131`). La ficha se puede quitar (CL-08, hecho), pero **nada viaja**: lo adjuntado no sale de la pantalla
(`screens/DesignScreen.tsx:86`). Aunque viajara una foto, el servidor la ignoraría: `IMAGE_INPUT_CAPS` no incluye `image.generate` ni `image.reference` **[E]** (`functions/src/creator/inputs.ts:14-23`), y `CreatorFlow` enseñaría «Foto lista» igualmente (F-07, `docs/WEE-DESIGN-CIERRE.md:134`). `image.reference` existe y es enrutable
(gemini → flux → seedream, `functions/src/engine/registry.ts:96`; los tres adaptadores leen la foto de entrada, p. ej. `functions/src/engine/providers/gemini.ts:216`) y se cobra por la familia de imagen (`functions/src/credits/creditCosts.ts:190`). Weë Studio ya tiene el selector real: guarda un `Adjunto { clase: 'referencia' }`
(`screens/StudioScreen.tsx:340-350`). Un trabajo cuyo plan tenga un paso que trabaje sobre foto no arranca sin ella (`functions/src/creator/index.ts:119`): el plan solo puede llevar un paso `image.reference` si hay referencia, y hoy `buildPlan(goal, answers)` no ve la foto.

**5 · Efecto funcional, por alternativa.**
- **A — inspiración de estilo (`image.reference`).** «Añadir» abre la galería; la foto aparece como ficha con aspa y el diseño se **inspira** en ella (estilo, no se copia); `CreatorFlow` cotiza con la referencia puesta. Hace falta: el selector real en `DesignScreen`, `image.reference` en `IMAGE_INPUT_CAPS`, que el plan sepa que hay referencia y el precio por el Credit Engine. **[E]** Ninguna plantilla ni pipeline actual usa `image.reference`.
- **B — una base que se transforma.** La foto o el boceto es la base y se transforma (es «Transformar», no «inspirar»); para un espacio ya existe Hogar & Diseño. Una rama nueva en `templates.ts` con `image.edit` (que ya recibe foto) y el mismo «material como entrada» que D3.
- **C — ocultar el botón hasta decidir.** Desaparecen «Añadir» y «Añadir una imagen de referencia» de la caja (quedan «Ajustes» y «Dictar»): ya no hay referencia de mentira.

**6 · Efecto visual, por alternativa.** **A:** el selector del sistema (permiso de fotos) y la ficha con aspa, como en Weë Studio. **B:** igual, con intención «transformar». **C:** la caja con dos botones menos.

**7 · Archivos o contratos, por alternativa.** **A:** cliente: `DesignScreen.tsx` (el selector de Studio, `adjuntos` e `imageUri`); servidor: `functions/src/creator/inputs.ts` (`IMAGE_INPUT_CAPS` gana `image.reference`; `stepInputFor` solo inyecta la foto en los pasos cuya capacidad está en esa lista, `functions/src/creator/inputs.ts:113`) y `templates.ts` (un paso
`image.reference` solo si hay referencia). **Cercas: ninguna** [E] en `inputs.ts` y `templates.ts`; si el precio exigiera tocar `aiPricing.ts` o `creditCosts.ts` se movería **F2**. **B:** `templates.ts` (`image.edit`), sin cercas. **C:** `components/studio/StudioPromptComposer.tsx` (props opcionales; **componente compartido con Studio**) y `DesignScreen.tsx`; sin cercas.

**8 · Criterios afectados (hoy).**

| Criterio / propuesta | Hoy | Cómo se mueve |
|---|---|---|
| CL-09 las referencias son reales o el botón no está | espera una decisión | Pasa cuando desaparece de la pantalla el nombre de muestra `` `referencia-${ `` (`functions/test/_design-cierre.mjs:146-152`): **con cualquiera de las tres** |
| CL-16 una referencia de estilo se USA | espera una decisión | Pasa solo si `IMAGE_INPUT_CAPS` incluye `image.reference` o `image.generate`: **solo con A** |
| P4 (A) y su variante C · fase F4 · ACE-D-05 | no construida · — · HUECO | Con D6 registrada, CL-09 y CL-16 pasan a «abierto» [E] |

**9 · Riesgos y dependencias.** Una referencia puede contener rostros (vecina **DEC-24**, A.5). **UNKNOWN:** la instrucción interna de `image.reference` del adaptador de Gemini dice, en inglés, «Create a consistent reference image to reuse in other scenes (same character, same style).» (`functions/src/engine/providers/gemini.ts:243`): crear una imagen de referencia coherente para reutilizar en otras escenas, no inspirarse en una foto. Puede hacer falta una frase propia en `creator/prompts.ts` (sin cerca) y
comprobar cómo responde el modelo (no se llamó a ningún proveedor). Dependencias: D1 y D2 (qué intenciones aceptan referencia; `home` ya recibe foto); **comparte maquinaria con D3** («material como entrada»).

**Qué es «C como condición de parada» y cuándo se activa (mi lectura [O]; confírmala o dame la tuya).** El destino registrado es **A**. **C** es el **estado seguro en el que se detiene el trabajo** si, a mitad de camino, falla una de estas tres condiciones:
1. **La referencia no llega o no se nota:** se demuestra en proceso (un doble del proveedor recibe la foto de la persona en un paso `image.reference` y el plan se cotiza con ella) y, antes de ofrecerla a personas, con el canario gobernado de CL-22 (cómo «se inspira» cada modelo es UNKNOWN: ningún proveedor se llamó).
2. **El precio exige tocar una cerca:** si cotizar la imagen de entrada obliga a tocar `aiPricing.ts` o `creditCosts.ts` (F2), sin tu autorización el trabajo se queda en C.
3. **Rostros sin resolver:** mientras una referencia pueda llevar el rostro de una persona real y DEC-24 no esté contestada, el botón se oculta.
Se activa **en cuanto una de las tres falla** o si quieres cerrar CL-09 antes de que A esté lista. C es un paso hacia A (el cambio de `StudioPromptComposer` con props opcionales se reutiliza en A) y deja **CL-09 cumplido y CL-16 abierto**, no imposible.

**10 · Si no se decide.** Las referencias de mentira siguen (la persona ve una ficha `referencia-1.png` que no usa nadie); CL-09 y CL-16 esperan; ACE-D-05 sigue como hueco; y si el puente se integrara sin decidir D6, la persona vería su ficha de referencia y la creación no la usaría (riesgo R5 del puente).

**11 · ¿Vuelve imposible un criterio?** **B y C dejan CL-16 imposible tal como está escrito** (B: la sonda no reconoce `image.edit`; la única forma de que pasara sería añadir `image.generate` a `IMAGE_INPUT_CAPS`, y entonces **todo plan de Design exigiría una foto** para arrancar: no lo recomiendo). Con «A, parada en C» CL-16 queda **abierto**, no imposible.

**12 · Recomendación final (R8) [O]: A, con C como parada** — **confirma la v1.** `image.reference` ya existe y no pide ninguna cerca; el trabajo es cliente y plan. C cierra una mentira visible ya, con un cambio pequeño. **Qué me haría cambiar:** no querer imágenes de personas en el flujo hasta resolver DEC-24 (C), o que el «Transformar» de Design sea la prioridad (B).

---

### D4 — Texto dentro de la imagen, y el nivel de los logos

**1 · Texto literal de la pregunta.**

> «Texto dentro de la imagen, y el nivel de los logos» — `docs/DESIGN.md:66`

**2 · Alternativas literales.**

> **A)** Solo logos y afiches, con un modelo que escriba texto (el afiche se cotiza más caro)
>
> **B)** Nunca
>
> **C)** Siempre que se escriba
>
> — `docs/DESIGN.md:66`

**3 · Qué marca el documento.** «Recomendado»: «A, logos en el nivel alto». **Mantener lo de hoy:** «hoy» es **A sin la parte de los afiches**: los logos escriben texto, los afiches no. **4 · Previa de Claude (v1): A** (con un matiz sobre el precio del afiche).

**Contexto [L/E].** Los **logos ya piden texto legible:** su paso de imagen lleva `kind: 'logo'` (`functions/src/creator/templates.ts:612`), que está en `TEXT_KINDS` (`functions/src/engine/imageModels.ts:208`): modelo que escribe texto y nivel «alto» [E]; «logos en el nivel alto» **ya es lo de hoy**. Los **afiches no:** su paso lleva `kind: 'design'`, que no escribe texto y va al nivel «estándar» [E]; y sin embargo el prompt interno le dice «No text or watermarks unless the design itself is a logo or poster with the requested words»
(`functions/src/creator/prompts.ts:699`): el modelo y la instrucción no se corresponden. Solo **dos** modelos de Weë escriben texto, los dos de Gemini (`gemini-3.1-flash-image` y `gemini-3-pro-image`); FLUX y Seedream no (`rendersText: false`) [E]. Vecina: D9 pide «revisión legal antes de anunciar logos».

**5 · Efecto funcional, por alternativa.**
- **A — solo logos y afiches, con un modelo que escriba texto.** El afiche sale con el texto escrito con mucha más probabilidad; antes de crear, el plan enseña un total **más alto** (el paso de imagen pasa del nivel «estándar» al «alto» [E]); los logos no cambian. El importe lo calcula `creatorQuote` con la tarifa oficial del modelo elegido: no se copia aquí (CLAUDE.md §7).
- **B — nunca.** Ningún texto dentro de la imagen, tampoco en los logos: dejarían de escribir el nombre de la marca que la propia plantilla pregunta (`functions/src/creator/templates.ts:372`). Es un **retroceso** respecto de hoy.
- **C — siempre que se escriba.** Cualquier pieza en la que la persona pida un texto lo lleva (un cartel de producto, una portada de personaje…): más piezas en el nivel alto, más caras y con un precio menos predecible.

**6 · Efecto visual, por alternativa.** **A:** el afiche puede traer su texto dentro de la imagen y la tarjeta del plan muestra otro total. **B:** ninguna imagen trae texto. **C:** más imágenes con texto y totales más variables.

**7 · Archivos o contratos, por alternativa.** **A:** `functions/src/creator/templates.ts` (el `kind` del afiche pasa a `poster`, que ya está en `TEXT_KINDS`), `functions/src/creator/prompts.ts` (`IMAGE_TASK_EN` no trae `poster`: `functions/src/creator/prompts.ts:553`; una línea opcional) y `creator.test.mjs` (los `kind` del plan). **Cercas: ninguna** [E]; no hace falta tocar `engine/imageModels.ts` (movería E4 y F1) ni los precios (F2): el precio sale de
la tarifa del modelo elegido. **B:** sacar `logo` de `TEXT_KINDS` (`imageModels.ts`: **mueve E4 y F1** [E]) y quitar la pregunta `name`. **C:** detectar «hay texto pedido» en la plantilla o en el planificador (`creator/planner.ts` **mueve F1** [E]); posiblemente `creator/index.ts` (**F4**) si el `kind` se decide al ejecutar.

**8 · Criterios afectados (hoy).**

| Criterio / propuesta | Hoy | Cómo se mueve |
|---|---|---|
| CL-15 afiches y logos escriben su texto con un modelo que sabe | espera una decisión | La sonda construye un afiche (qué=afiche, mensaje=promoción, dónde=feed) y exige `imageRequirements(...).text === true`; hoy da `false` [E] (`functions/test/_design-cierre.mjs:210-220`). **Pasa con A o con C; con B no puede pasar.** Con D4 registrada pasa a «abierto» [E] |
| P8 · fase F3 · ACE-D-06b es de D5 | no construida · — | P8: `docs/WEE-DESIGN-CIERRE.md:232` |

**9 · Riesgos y dependencias.** **Acoplada a D5:** un afiche con texto en vertical o en horizontal depende de Gemini, y la política de resolución solo declara medidas verificadas para 1:1 (ficha de D5). El afiche cuesta más (decisión de producto, ya anunciada en el texto de la opción). Depende de D1 (con D1-B los afiches pierden peso); D9 (legal de los logos) es independiente.

**10 · Si no se decide.** El afiche sigue yendo al nivel estándar, donde ningún modelo escribe texto, aunque el prompt interno le pide texto; CL-15 sigue esperando; y el dominio `design` del Eval Engine conserva sus casos conocidos de D4, D5 y D6 en rojo a propósito (`functions/test/evals-design.test.mjs:17`).

**11 · ¿Vuelve imposible un criterio?** **B deja CL-15 imposible tal como está escrito** (el afiche no podría cumplir `text === true`) y contradice la plantilla, que pregunta el nombre de la marca.

**12 · Recomendación final (R8) [O]: A** — **confirma la v1.** Es el único cambio pequeño que cierra CL-15, no toca ninguna cerca y alinea el modelo con lo que el prompt ya pide. **Matiz importante:** si no quieres que el afiche suba de precio, la respuesta honesta es «A solo para logos» (que es lo de hoy); no es ninguna de las tres letras y CL-15 tendría que reescribirse. **Qué me haría cambiar:** medir con `creatorQuote` (modo real) que el afiche en nivel alto resulta inaceptable, o que D5 obligue a verificar Gemini antes de prometer texto en formatos no cuadrados.

---

### D5 — Formatos

**1 · Texto literal de la pregunta.**

> «Formatos» — `docs/DESIGN.md:67`

**2 · Alternativas literales.**

> **A)** 1:1, 4:5, 9:16 y 16:9
>
> **B)** A + impresión
>
> **C)** Solo 1:1 y 9:16
>
> — `docs/DESIGN.md:67`

**3 · Qué marca el documento.** «Recomendado»: «A». **Mantener lo de hoy:** ninguna equivale (hoy toda imagen sale 1:1). **4 · Previa de Claude (v1): A**, entrando por tres de las cuatro proporciones (1:1, 9:16 y 16:9).

**Contexto [L/E].** La hoja de ajustes de Design ya tiene un grupo «Formato»: Automático · Cuadrado · Vertical · Horizontal (`constants/designTools.ts:109-111`; textos en `i18n/textos/es/studio.ts`), pero **lo elegido no viaja a ninguna parte** (el estado `ajustes` de la pantalla no lo lee nadie). La pregunta del afiche, «¿Dónde vas a publicarlo?» (Instagram o Facebook · Una historia · WhatsApp · Para imprimir · No sé, `functions/src/creator/templates.ts:390`), solo añade una frase al encargo —«en vertical, para una historia», «en formato A4, listo para imprimir»— (`functions/src/creator/templates.ts:297-302`).
**[E]** Ningún paso de imagen lleva `aspectRatio` (las ocho ramas: log de §G), aunque `creatorRun` ya lo lee (`functions/src/creator/index.ts:721`) y el precio lo recibe (`functions/src/credits/aiPricing.ts:371`). La política de resolución nombra siete proporciones —1:1, 16:9, 9:16, 4:3, 3:4, 2:3, 3:2—: **no 4:5** (`functions/src/engine/resolutionPolicy.ts:132-140`); «A4» no es una proporción que entienda.
**[E]** FLUX y Seedream resuelven medidas para 1:1, 4:5, 9:16, 16:9 y 3:4. Los dos modelos de Gemini, **que son los únicos que escriben texto**, solo declaran medidas para 1:1 y la política contesta «no puedo» (`null`) a cualquier otra: «Sus otras proporciones existen, pero sus píxeles exactos NO están verificados» (`functions/src/engine/resolutionPolicy.ts:108-120`).
El adaptador de Gemini **sí envía `aspectRatio` si llega** (`functions/src/engine/providers/gemini.ts:374`). **UNKNOWN:** si Gemini devuelve exactamente la proporción pedida (no se llamó a ningún proveedor). Hallazgo F-06: al ofrecer proporciones hay que pasar las medidas reales al precio para los modelos que cobran por megapíxel (FLUX); Gemini cobra por imagen y tamaño (`functions/src/engine/imageModels.ts:346`).

**5 · Efecto funcional, por alternativa.**
- **A — 1:1, 4:5, 9:16 y 16:9.** Elige «Cuadrado», «Vertical» u «Horizontal» en los ajustes (o contesta la pregunta del afiche) y las tres propuestas salen en esa proporción en vez de siempre cuadradas. «4:5» no tiene palabra en la hoja: «Vertical» tendría que decir 4:5 o 9:16, o ganar una palabra nueva ×16.
- **B — A + impresión.** «Para imprimir» da un formato de papel. Hoy no hay proporción de A4 ni resolución de impresión: el objetivo «alta» son 3 MP (`functions/src/engine/resolutionPolicy.ts:39`) y un A4 a 300 ppp son unos 8,3 MP **[I: 2480×3508 px, cálculo mío]**.
- **C — solo 1:1 y 9:16.** Cuadrado y vertical de historia (lo que el afiche ya nombra como «Instagram o Facebook» e «Una historia»). «Horizontal» de la hoja seguiría sin llegar al motor salvo que se quite del catálogo.

**6 · Efecto visual, por alternativa.** **A:** el grupo «Formato» de la hoja de ajustes pasa a tener efecto; una palabra nueva ×16 si se ofrece 4:5. **B:** además, una opción de papel. **C:** dos formatos; «Horizontal» desaparece o sigue sin efecto.

**7 · Archivos o contratos, por alternativa.** **A:** `functions/src/creator/templates.ts` (cada rama devuelve `aspectRatio`), `screens/DesignScreen.tsx` (los ajustes viajan), `i18n` si hay palabra nueva; declarar la etiqueta `4:5` o las medidas verificadas de Gemini exigiría tocar `engine/resolutionPolicy.ts`: **mueve E4 y F1** [E]. **B:** los de A más la política de resolución (**E4 y F1**) y, si cambia el servicio de precio, `aiPricing.ts` (**F2**). **C:** `templates.ts`; ninguna etiqueta nueva (1:1 y 9:16 ya están en `ASPECT_LABELS`); **ninguna cerca** [L].

**8 · Criterios afectados (hoy).**

| Criterio / propuesta | Hoy | Cómo se mueve |
|---|---|---|
| CL-14 el formato elegido llega como `aspectRatio` | espera una decisión | La sonda solo mira que el paso de «historia» lleve un `aspectRatio` en texto (`functions/test/_design-cierre.mjs:200-208`): **las tres opciones la cumplen**. Con D5 registrada pasa a «abierto» [E] |
| P7 · fases F1/F5 · ACE-D-06b | no construida · — · HUECO | `DESIGN.md` §5 pone el 9:16 de «historia» en F1 (columna «Necesita»: «nada de alcance») y D5 en F5 (`docs/DESIGN.md:78`); el corredor liga CL-14 entera a D5. Como la sonda pasa con cualquiera y el corredor da «cumplido» cuando pasa aunque D5 no esté registrada, **F1 puede hacerse antes de contestar** |

**9 · Riesgos y dependencias.** Depende de D4 (se contestan juntas) y de D1. Si se toca la política de resolución hace falta autorización para las cercas E4 y F1.

**10 · Si no se decide.** Toda imagen sigue saliendo cuadrada (1:1): «Formato» es solo una palabra de la hoja de ajustes y un afiche «para una historia» no sale vertical (ACE-D-06b); CL-14 espera.

**11 · ¿Vuelve imposible un criterio?** Ninguna.

**12 · Recomendación final (R8) [O]: A** — **confirma la v1**, **entrando por tres de las cuatro** (1:1, 9:16 y 16:9, que son justo lo que la hoja ya llama Cuadrado, Vertical y Horizontal y están en `ASPECT_LABELS`); 4:5 es la única que pide palabra y proporción nuevas. Con D4-A, antes de prometer texto en vertical u horizontal hay que **verificar con el proveedor** (con su documentación oficial, sin llamar a nadie) las proporciones de Gemini. **Qué me haría cambiar:** que el proveedor no confirme proporciones distintas de 1:1 para el modelo que escribe texto (entonces C solo para piezas sin texto), o que el dueño quiera impresión ya (B, con su política de resolución).

---

### D3 — Editar después de generar

**1 · Texto literal de la pregunta.**

> «Editar después de generar» — `docs/DESIGN.md:65`

**2 · Alternativas literales.**

> **A)** Recrear desde cero
>
> **B)** Editar la propuesta elegida (`image.edit`, con linaje)
>
> **C)** Las frases rápidas editan y «Otra versión» recrea
>
> — `docs/DESIGN.md:65`

**3 · Qué marca el documento.** «Recomendado»: «C». **Mantener lo de hoy: A** («Recrear desde cero»). El documento no dice si C lleva linaje ni si «Otra versión» conserva las respuestas; CL-13 pide las dos cosas. **4 · Previa de Claude (v1): C, en dos escalones.**

**Contexto [L].** Tras un resultado, `ResultCard` ofrece cuatro frases rápidas —«Hazlo más realista», «Cámbiale el color», «Más llamativo», «Más simple» (`components/creator/ResultCard.tsx:282`)— y «Crear otra versión» (`components/creator/ResultCard.tsx:681`). Las dos abren un **trabajo nuevo** con el objetivo (más «· Cambio: …»), sin la propuesta elegida y sin las respuestas, salvo en Weë Travel
(`screens/CreatorFlowScreen.tsx:351`; `screens/CreatorFlowScreen.tsx:368-379`). La tarjeta lo dice: «Cada cambio vuelve a crear ≈ N Credits. Se descuentan al terminar.» (`i18n/textos/es/weeai.ts:200`), y ese N es el **total del plan entero** (`screens/CreatorFlowScreen.tsx:676`). La **propuesta elegida existe** como estado de la tarjeta (`components/creator/ResultCard.tsx:235`), pero `onEdit` y `onAnotherVersion`
no la reciben (`components/creator/ResultCard.tsx:172-173`). La caja para escribir el cambio a mano **se retiró por decisión del usuario el 2026-09-15** (`components/creator/ResultCard.tsx:662`). Un material nuevo no apunta a ninguno anterior: `previousVersionId` y `sourceAssetIds` no los escribe ningún camino (`docs/WEE-DESIGN-UIUX-AUDIT.md:179`); las funciones de linaje (`core/content/linaje.ts`) no tienen llamadores y «Guardar como versión» (`content/versiones.ts`) no se exporta.
`image.edit` ya recibe la foto de la persona y el servidor acepta cualquier foto de la carpeta de la cuenta (`functions/src/creator/inputs.ts:42`); el cliente deja pasar una URL del Storage sin volver a subirla (`services/creatorUploads.ts:15`); **[I]** que la dirección de un resultado real tenga esa forma (no lo ejecuté con uno real). Precedente: «No sé qué hacer» ya viaja con la misma foto y las respuestas a un trabajo nuevo (`screens/CreatorFlowScreen.tsx:397-408`).

**5 · Efecto funcional, por alternativa.**
- **A — recrear desde cero.** Igual que hoy: cada cambio abre un trabajo, vuelve a crear las tres propuestas y se paga de nuevo, con el precio a la vista.
- **B — editar la propuesta elegida, con linaje.** Eliges una propuesta y pides un cambio: Weë edita **esa** imagen (una, no tres) y la nueva queda como versión de la elegida; el precio es el de una edición; «Otra versión» también parte de la elegida.
- **C — las frases rápidas editan; «Otra versión» recrea.** **Escalón 1:** las cuatro frases cambian la propuesta elegida con una edición (una imagen) y **conservando las respuestas**, en vez de rehacer las tres; «Crear otra versión» sigue recreando. **Escalón 2:** el linaje (vuelve a ser F4 o F3).

**6 · Efecto visual, por alternativa.** **A:** igual. **B y C:** la tarjeta sigue con sus cuatro frases y «Crear otra versión»; pero **el aviso «Cada cambio vuelve a crear ≈ N Credits» dejaría de ser verdad** para una edición (su N es el total del plan entero): hay que cambiar el texto (×16 idiomas) o quitar la cifra **[I]**. La franja «Versiones» de la referencia sigue apagada: nadie lee el linaje.

**7 · Archivos o contratos, por alternativa.** **A:** ninguno. **B:** cliente: `components/creator/ResultCard.tsx` y `screens/CreatorFlowScreen.tsx` (**compartidas con las demás secciones**: «la decide el dueño de `CreatorFlow`»); servidor: una rama de edición en `functions/src/creator/templates.ts` y `inputs.ts` (sin cerca) y el **linaje**, que obliga a tocar `functions/src/creator/index.ts` (**cerca F4**) o `functions/src/content/*` (**cerca F3**); `core/content/linaje.ts` también es F3 **[E]**.
**C:** escalón 1: `ResultCard.tsx` (que `onEdit` reciba la elegida), `CreatorFlowScreen.tsx` y la plantilla/entradas del servidor: **ninguna cerca**; escalón 2: F4 o F3.

**8 · Criterios afectados (hoy).**

| Criterio / propuesta | Hoy | Cómo se mueve |
|---|---|---|
| CL-13 editar o pedir otra versión conserva las respuestas y deja linaje | espera una decisión | **La sonda es más débil que su título:** pasa en cuanto deja de estar escrito `CONSERVA_EL_CONTEXTO = experience.id === 'travel'` (`functions/test/_design-cierre.mjs:193`); no mide edición ni linaje. Con D3 registrada pasa a «abierto» [E] |
| Propuestas P1–P11 · fase F4 · DEC-18 | ninguna cubre CL-13 · — · A | `docs/DESIGN.md` §5 F4 |
| ACE-D-16 (ver y usar el resultado) · Chef: D-CHEF-6, CHEF-05, AC-14 | PASA por estructura · mismas líneas | CHEF-05 «espera a la decisión D3 de Design» (`docs/WEE-CHEF-TAREAS-LOTE-1.md:382`) |

**9 · Riesgos y dependencias.** Pantalla compartida (Chef, Business, Travel…). **Comparte maquinaria con D6** («material como entrada»: D6-B es D3-B). Vecina **DEC-18**: editar se cobra (con DEC-18 = A, «otra versión» se cotiza y se cobra). El escalón 2 necesita tu autorización de F4 o F3. El linaje no tendría quién lo lea.

**10 · Si no se decide.** Cada «cambio» o «otra versión» **sigue abriendo un trabajo nuevo desde cero, sin las respuestas y cobrando el plan entero otra vez** (en Design y también en Chef: D-CHEF-6, R-1); CL-13 espera; CHEF-05 queda sin empezar; el aviso «Cada cambio vuelve a crear» sigue siendo verdad.

**11 · ¿Vuelve imposible un criterio?** **A deja CL-13 imposible tal como está escrito.** Y hay un **falso cerrado** que decidir: **C escalón 1 cierra la sonda pero no el texto del criterio** («…y deja linaje»): el corredor daría «cumplido» con la mitad del trabajo. Hay que decir si CL-13 se cierra con el escalón 1 (se reescribe su texto: «conserva las respuestas») o solo con el 2 (se refuerza la sonda para medir linaje).

**12 · Recomendación final (R8) [O]: C, en dos escalones** — **confirma la v1.** Primero la edición con las frases y las respuestas conservadas (sin cercas); después el linaje con tu autorización de F4. **La pregunta que solo tú puedes contestar dentro de la respuesta:** *¿CL-13 se cierra con linaje (hay que autorizar la cerca) o sin él (se reescribe su texto)?* **Qué me haría cambiar:** no querer pagar ediciones (DEC-18 sigue en A: cada cambio se cobra) o preferir no tocar `CreatorFlow` (pantalla compartida): entonces A y reescribir CL-13.

### B.3 Bloque 3 — solo registro (no obligan a escribir código hoy; CL-23 pide las trece)

---

### DEC-02 — Con la puerta abierta, ¿por dónde se entra?

**1 · Texto literal de la pregunta.**

> «Con la puerta abierta, ¿por dónde se entra?» — `docs/WEE-DESIGN-UIUX-DECISIONS.md:27`

**2 · Alternativas literales.**

> **A)** Solo por dirección (`/design/referencia`, hoy)
>
> **B)** Un acceso discreto en `DesignScreen`
>
> **C)** Una entrada en el ☰ y la barra lateral
>
> — `docs/WEE-DESIGN-UIUX-DECISIONS.md:27`

**3 · Qué marca el documento.** «Recomendado»: «B (sin tocar el menú)». **Mantener lo de hoy: A** («Solo por dirección», hoy). **4 · Previa de Claude (v1): B, si DEC-01 no es A.**

**Contexto [L/E].** Hoy **no se entra por ninguna parte**: con la puerta cerrada la ruta existe en la pila (`navigation/MainStackNavigator.tsx:373`) pero el enlace `design/referencia/:grupo?` no se registra (`App.tsx:239`). El guardián I17 exige que la puerta sea una constante cerrada, que ningún botón de la app lleve a la referencia y que la pantalla de siempre de Weë Design «no sabe que la referencia existe»
(`functions/test/design-referencia.mjs:302-313`); F-08 recuerda que reutilizar `contextoDeDesign` desde la pantalla obliga a extraerlo o a aflojar esa guarda (`docs/WEE-DESIGN-CIERRE.md:135`; según su documento, en la rama del puente se extrae y I17 sigue en verde). Las entradas del menú ☰ y de las barras laterales recorren el registro de experiencias y van a `Specialist { id }`
(`components/DrawerMenu.tsx:239`; `components/Sidebar.tsx:296`; `components/creator/CreatorSidebar.tsx:48`). El menú es «un solo menú ☰» (`CLAUDE.md:19`).

**5 · Efecto funcional, por alternativa.** **A:** nada: entra quien conozca la dirección (y solo si alguien abre la puerta). **B:** un acceso pequeño dentro de la pantalla de Design; quien lo vea puede probar el espacio de trabajo. **C:** un destino más en el ☰ y en la barra lateral de escritorio.

**6 · Efecto visual, por alternativa.** **A:** nada. **B:** un elemento nuevo en `DesignScreen` cuyo **sitio y forma no están definidos en ningún documento**: sería estructura visual nueva y habría que decidirla (no la invento aquí). **C:** una fila más en el menú único.

**7 · Archivos o contratos, por alternativa.** **A:** ninguno. **B:** `screens/DesignScreen.tsx` pasa a nombrar la referencia, lo que **rompe I17** y hay que aflojarlo a propósito; `navegacion-enlaces` 31–34; una etiqueta nueva ×16 en `i18n/textos/*/design.ts`. **C:** `components/DrawerMenu.tsx`, `components/Sidebar.tsx`, `components/creator/CreatorSidebar.tsx`, `constants/weeMenu.ts`; invierte I17 («ningún botón de la app lleva a la referencia»). **Cercas `puente-pre-f1d`: ninguna** (todo cliente).

**8 · Criterios afectados (hoy).** Solo **CL-23** (espera una decisión); ninguna propuesta P ni fase de §5. Con la respuesta registrada, CL-23 sigue esperando hasta que estén las trece [E].

**9 · Riesgos y dependencias.** Solo tiene sentido **si la puerta se abre**, y **registrar B no abre la puerta**: abrirla es otra decisión, que no está en esta tabla (la constante `DESIGN_REFERENCIA_EN_LA_APP`). Con **DEC-01 = B** la referencia sustituirá a la pantalla *después de la identidad*, así que DEC-02 solo se ejecutaría si se abre la referencia **antes**, como espacio aparte; con DEC-01 = A la pregunta es permanente. B enseña a las personas un espacio marcado «Referencia funcional» y provisional. Depende de DEC-01; antecede a DEC-05.

**10 · Si no se decide.** CL-23 queda esperando; nada cambia: la puerta sigue cerrada y no hay acceso. No bloquea ningún otro criterio.

**11 · ¿Vuelve imposible un criterio?** Ninguna.

**12 · Recomendación final (R8) [O]: B, como registro sin obra** — **confirma la v1.** Evita tocar el menú, que es la parte más protegida de la app; y mientras la puerta esté cerrada registrarla cuesta 0. **No se construye nada hasta que abras la puerta.** **Qué me haría cambiar:** DEC-01 = A (si conviven para siempre y la puerta no va a abrirse, A: «solo por dirección» y no se toca `DesignScreen`).

---

### DEC-05 — ¿Se oculta la barra global inferior dentro del workspace en el teléfono?

**1 · Texto literal de la pregunta.**

> «¿Se oculta la barra global inferior dentro del workspace en el teléfono?» — `docs/WEE-DESIGN-UIUX-DECISIONS.md:28`

**2 · Alternativas literales.**

> **A)** No (hoy)
>
> **B)** Sí (`SIN_BARRA`)
>
> — `docs/WEE-DESIGN-UIUX-DECISIONS.md:28`

**3 · Qué marca el documento.** «Recomendado»: «A mientras la referencia no sea la pantalla de Design». **Mantener lo de hoy: A** («No (hoy)»). **4 · Previa de Claude (v1): A.**

**Contexto [L].** La barra global (Inicio, Buscar, +, WeeTalk, Perfil) se oculta en escritorio, en `Login`, `Register`, `Create`, `Reels`, `Settings`, `WeeProfileCreation`, `AiAvatar` y en una conversación abierta (`navigation/NavegacionGlobal.tsx:29-37`). **Ni `Design` ni `DesignReferencia` están en la lista:** en el teléfono la barra está puesta, y la pantalla de Design le reserva sitio (`screens/DesignScreen.tsx:30`). En la referencia, en tableta y teléfono, la caja va anclada como `pie` del marco y la barra global «sigue»
(`docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md:35`). **Solo afecta a la referencia** (puerta cerrada).

**5 · Efecto funcional, por alternativa.** **A:** la barra sigue visible en el teléfono dentro del espacio de trabajo: cinco destinos a un toque, a costa de alto para el lienzo y la caja. **B:** el espacio de trabajo ocupa toda la pantalla del teléfono; para salir, el volver.

**6 · Efecto visual, por alternativa.** **A:** igual que hoy. **B:** sin la barra inferior en esa pantalla (más alto útil).

**7 · Archivos o contratos, por alternativa.** **A:** ninguno. **B:** `navigation/NavegacionGlobal.tsx` (añadir `'DesignReferencia'` a `SIN_BARRA`); `functions/test/home.test.mjs` fija el comienzo de ese conjunto con una expresión (`functions/test/home.test.mjs:1732`) que no se rompe al añadir una entrada al final **[I]**. **Cercas: ninguna.**

**8 · Criterios afectados (hoy).** Solo **CL-23** (espera una decisión); ninguna P ni fase de §5. CL-26 (verificación visual, manual) es la comprobación manual que lo mediría en un teléfono.

**9 · Riesgos y dependencias.** Sin la barra, salir a otra sección es solo el volver. Depende de DEC-01 y DEC-02; es la última de las tres de la referencia.

**10 · Si no se decide.** CL-23 queda esperando; la barra sigue puesta (A de facto).

**11 · ¿Vuelve imposible un criterio?** Ninguna.

**12 · Recomendación final (R8) [O]: A** — **confirma la v1**: cuesta 0, es lo de hoy y solo importa si la referencia llega a abrirse en el teléfono. **Qué me haría cambiar:** una prueba en un teléfono real en la que la barra robe espacio a la caja anclada.

---

### DEC-06 — Los destinos de exportación

**1 · Texto literal de la pregunta.**

> «Los destinos de exportación» — `docs/WEE-DESIGN-UIUX-DECISIONS.md:29`

Y la decisión **DEC-06a**, que es **otra cosa** (una de las de la sección «Tomadas en esta misión (y reversibles)», no una alternativa de DEC-06):

> «**Exportar por destino** (juego, animación, impresión, web y AR, render, edición profesional, 🤷 No sé) en vez de por formato» — por «CREATOR.md §14: sin lenguaje técnico» — `docs/WEE-DESIGN-UIUX-DECISIONS.md:13`

**2 · Alternativas literales.** El documento **no les pone letra**: la celda es una sola frase.

> La lista de DEC-06a, otra, o formatos visibles
>
> — `docs/WEE-DESIGN-UIUX-DECISIONS.md:29`

**Cómo las etiqueto yo:** **1** = «La lista de DEC-06a» · **2** = «otra» · **3** = «formatos visibles». La v1 usó `a`, `b` y `c`; **la «a» se confunde con DEC-06a** (la decisión ya tomada cuya lista es la alternativa 1), así que aquí son números, sin pisar las letras mayúsculas de las tablas D. Si contestas «a», «b» o «c» se lee 1, 2 o 3.

**3 · Qué marca el documento.** «Recomendado»: «La lista de DEC-06a; los formatos solo en un modo avanzado oculto» (alternativa **1**). **Mantener lo de hoy: 1:** la lista ya está en el código. **4 · Previa de Claude (v1): «a» = 1.**

**Contexto [L/E].** **La lista ya está en el código:** `DESTINOS_DE_ENTREGA` (`constants/designReferencia.ts:842-850`) con «Un juego», «Animación», «Imprimirlo», «Web o realidad aumentada», «Una imagen de presentación», «Un programa profesional» y «🤷 No sé» (`i18n/textos/es/designRef.ts:237-242`). **Hoy no tiene efecto visible [E]:** «Exportar para un programa» (C31) está `BACKEND_REQUIRED` (necesita `3d.convert` y `3d.export`, que son `DECLARED`, y el conversor de Weë de DEC-20) y «A tu programa 3D» (C70) está `REVIEW_REQUIRED`
(DEC-21); solo vive en la referencia: la pantalla montada no exporta nada. Regla: «No mostrar por defecto: prompt, negative prompt, seed, parámetros técnicos, modelo…»; un modo avanzado «oculto por defecto» (`docs/CREATOR.md:102-104`); y DEC-08, «¿Modo avanzado?», recomienda «No» hasta que haya capacidades 3D reales (`docs/WEE-DESIGN-UIUX-DECISIONS.md:31`).

**5 · Efecto funcional, por alternativa.** **1:** cuando exista el conversor, «¿Para qué lo quieres?» con siete respuestas y sin extensiones. **2:** la lista que diga el dueño. **3:** GLB, FBX, OBJ, USDZ, STL y 3MF a la vista (`docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md:262`).

**6 · Efecto visual, por alternativa.** **1:** «¿Para qué lo quieres?» con los siete destinos. **2:** otros destinos. **3:** extensiones de archivo a la vista (lenguaje técnico).

**7 · Archivos o contratos, por alternativa.** **1:** ninguno (ya está). **2:** `DESTINOS_DE_ENTREGA` y los textos ×16 (`designRef.ts`); si una clave es nueva, también `i18n/huella.json`; I11 (`functions/test/design-referencia.mjs:225`) exige que cada destino lleve a una capacidad que existe. **3:** los de 2 más los ajustes de entrega (`constants/designCadena.ts`, `AJUSTES_DE_ENTREGA`). **Cercas: ninguna.**

**8 · Criterios afectados (hoy).** Solo **CL-23** (espera una decisión); ninguna P ni fase de §5.

**9 · Riesgos y dependencias.** Depende de DEC-01 (la referencia) y, **para tener efecto, de DEC-20 y DEC-21** (vecinas, A.5). La alternativa 3 contradice la regla de CREATOR.md y el fundamento de DEC-06a.

**10 · Si no se decide.** CL-23 queda esperando; la lista sigue en el código sin efecto visible.

**11 · ¿Vuelve imposible un criterio?** Ninguna.

**12 · Recomendación final (R8) [O]: 1** (la «a» del punto de partida) — **confirma la v1**: ya está hecha y no hay nada que construir mientras no exista el conversor. **Qué me haría cambiar:** una lista de destinos distinta que traiga el dueño (2) tras ver cómo los entienden las personas.

---

### D8 — Memoria de marca o brand kit

**1 · Texto literal de la pregunta.**

> «Memoria de marca o brand kit» — `docs/DESIGN.md:70`

**2 · Alternativas literales.**

> **A)** Nada en la primera versión
>
> **B)** Memoria de proyecto compartida con Weë Business
>
> **C)** Solo en Weë Business
>
> — `docs/DESIGN.md:70`

**3 · Qué marca el documento.** «Recomendado»: «A ahora, B después» (dos letras en una respuesta: ahora A; B queda para después). **Mantener lo de hoy: A** («Nada en la primera versión»). **4 · Previa de Claude (v1):** sin ficha (solo registro, §3.4 de la v1); la tabla de su §3.2 daba como opción mínima **D8 = A**; el documento recomienda «A ahora, B después».

**Contexto [L].** «Memoria de proyecto» existe a medias: `creatorProjects` agrupa **trabajos**, no materiales; `ProjectItem` (la fila material ↔ proyecto) es un contrato del Core y una regla de Firestore **sin escritor** (`functions/src/core/project.ts:69`; `firestore.rules:1287`: `allow create, update, delete: if false`). `DESIGN.md` lo dice así: «Nuevo pequeño, solo si se decide: logo y paleta en el proyecto, con un solo dueño para Design y Business» (`docs/DESIGN.md:43`). Weë Chef tiene la misma pregunta: su memoria persistente (preferencias, despensa, restricciones) «Es el equivalente de la “memoria de marca” de Design (D8): una sola decisión para las dos.»
(`docs/WEE-CHEF-ESPECIFICACION.md:90`).

**5 · Efecto funcional, por alternativa.** **A:** nada: cada petición empieza de cero; el logo y la paleta no se reutilizan. **B:** un proyecto recuerda el logo y la paleta y Design y Business los comparten, con un solo dueño del dato. **C:** solo en Weë Business (que es el **producto** `businesses/{businessId}`, no una identidad, según `CLAUDE.md`): Design no recuerda nada.

**6 · Efecto visual, por alternativa.** **A:** nada. **B y C:** algo nuevo en Proyectos y/o Business cuya forma **no está definida** en ningún documento: no la invento.

**7 · Archivos o contratos, por alternativa.** **A:** ninguno. **B:** un escritor de `ProjectItem` (hoy la regla lo cierra: `firestore.rules`), cliente de proyectos y textos ×16. **Cercas — D8-B no es «pequeño»:** cualquier cambio en `functions/src/core` o en `functions/src/content` **mueve F3** y un archivo nuevo en `functions/src` **rompe F1** (`functions/test/puente-pre-f1d.test.mjs:764`; Anexo A). **C:** en Weë Business; sin cercas conocidas **[I]**.

**8 · Criterios afectados (hoy).** Solo **CL-23** (espera una decisión); «D8 y D9 → nada que construir hoy» (`docs/WEE-DESIGN-CIERRE.md:317`); fase F5 (`docs/DESIGN.md:82`).

**9 · Riesgos y dependencias.** Toca a D6 (referencias) y a Chef D-6/CHEF-17 (misma memoria). Un solo dueño del dato entre Design y Business.

**10 · Si no se decide.** CL-23 queda esperando (sin D8 y D9 no se cumple aunque las once estén). Nada más se bloquea.

**11 · ¿Vuelve imposible un criterio?** Ninguna.

**12 · Recomendación final (R8) [O]: A** (registrarla como «A ahora»; B se revisa cuando exista el cierre de Design). **Qué me haría cambiar:** querer que el logo y la paleta se reutilicen entre Design y Business en la primera versión (B, con su autorización de F3 y F1).

---

### D9 — Uso comercial y moderación propia

**1 · Texto literal de la pregunta.**

> «Uso comercial y moderación propia» — `docs/DESIGN.md:71`

**2 · Alternativas literales.**

> **A)** No prometer exclusividad, cláusula en los términos y revisión legal antes de anunciar logos
>
> **B)** Etiquetar los logos como «propuesta»
>
> **C)** Una regla que rechace imitar marcas o personas reales
>
> — `docs/DESIGN.md:71`

**3 · Qué marca el documento.** «Recomendado»: «A + C». **Mantener lo de hoy:** ninguna (hoy no hay cláusula ni regla). **4 · Previa de Claude (v1):** sin ficha (solo registro); la tabla de su §3.2 daba como opción mínima **D9 = A**; el documento recomienda «A + C». **Aviso de nombres:** este D9 es el de uso comercial, **no** el «cobro proporcional (D9)» del Algorithm Engine (`docs/DECISIONES-PENDIENTES.md:17`).

**Contexto [L/E].** Hoy **no existe** en el servidor ninguna regla contra imitar marcas o personas reales **[E: búsqueda en `functions/src`; solo aparece la capacidad `keepsIdentity` del motor de imagen]**; los términos públicos (`public/terms.html`) no dicen nada de la propiedad ni de la exclusividad de lo generado, y la propia app avisa de que «los términos completos … se publicarán en wee.zone antes del lanzamiento» (`i18n/textos/es/help.ts:20`).
El rechazo del proveedor se reembolsa y hay denuncias (`docs/DESIGN.md:45`). Los logos **ya escriben texto** hoy (D4).

**5 · Efecto funcional, por alternativa.** **A:** no prometer exclusividad, una cláusula en los términos y revisión legal antes de anunciar logos: **tarea legal y de texto, fuera del código**. **B:** etiquetar los logos como «propuesta» (una etiqueta en el resultado). **C:** una regla que rechace imitar marcas o personas reales: hay que **definirla y construirla** (qué cuenta como imitar, dónde se comprueba, qué se le dice a la persona); es el que más obra pide (A es legal y de texto; B, una etiqueta) y se cruza con DEC-24 (personas reales y proveedores).

**6 · Efecto visual, por alternativa.** **A:** nada en la app (cambia `public/terms.html`). **B:** una etiqueta nueva en la tarjeta del resultado (texto ×16). **C:** un mensaje de rechazo nuevo (texto ×16).

**7 · Archivos o contratos, por alternativa.** **A:** `public/terms.html` y, si se quiere en la app, `i18n/textos/*/help.ts`. **B:** `components/creator/ResultCard.tsx` (compartido) y `i18n/textos/*/weeai.ts`. **C:** `functions/src/creator/prompts.ts` o un control previo (`functions/src/moderation` o el planificador): **sin cerca si vive en `prompts.ts`/`templates.ts`** [E: v1]; si exige un archivo nuevo en `functions/src`, F1; si pasa por el planificador, F1.

**8 · Criterios afectados (hoy).** Solo **CL-23** (espera una decisión); fase F5; «D9 → nada que construir hoy». **Registrar «A + C» no es de puro registro: C compromete trabajo.**

**9 · Riesgos y dependencias.** D9-A depende de un revisor legal ajeno al código. D9-C depende de DEC-24 y de definir la política. Toca a D4 (logos con texto).

**10 · Si no se decide.** CL-23 queda esperando; los logos con texto siguen saliendo sin cláusula ni revisión legal.

**11 · ¿Vuelve imposible un criterio?** Ninguna.

**12 · Recomendación final (R8) [O]: A** para registrar sin obra; y **C como decisión de trabajo aparte** si quieres construirla (el documento recomienda «A + C»: es válido, pero entonces registras también el compromiso de definir y construir la regla). **Qué me haría cambiar:** que la revisión legal pida una etiqueta visible (B), o que haya un caso real de imitación que obligue a C ya.

### B.4 Bloque 4 — Weë Chef (D-1 y D-3)

> **Nota de nombres.** Estas dos son las **D-1 y D-3 de Weë Chef** ([WEE-CHEF-ESPECIFICACION.md](WEE-CHEF-ESPECIFICACION.md) §8.2), **no** las D1 y D3 de Weë Design. Di «Chef D-1» y «Chef D-3».
> Dos incoherencias de la propia especificación, para que no sorprendan (se explican en cada ficha): `:533` dice que D-1 bloquea «CHEF-07/08/10 (no el lote 1)», pero `:546` la incluye en el «mínimo para arrancar el lote 1»; y el título
> «Lote 1 — sin decisiones que bloqueen» (`:454`) no es cierto de D-3 (`:462`, `:535`).

---

### Chef D-1 — Estructura visual de Chef

**1 · Texto literal de la pregunta.**

> «Estructura visual de Chef» — `docs/WEE-CHEF-ESPECIFICACION.md:533`

**2 · Alternativas literales.**

> **A)** mantener el lugar de trabajo del 2026-09-15 y añadir lo nuevo plegado
>
> **B)** volver a hero + muro de sección (reescribe `ChefScreen` y 47 comprobaciones; contradice «un solo muro»)
>
> — `docs/WEE-CHEF-ESPECIFICACION.md:533`

**3 · Qué marca el documento.** «Recomendado»: «A; y corregir el texto de `CLAUDE.md` §5». **Mantener lo de hoy: A** («mantener el lugar de trabajo del 2026-09-15»), con la salvedad de que «añadir lo nuevo plegado» es **futuro** (lote 2: CHEF-07, 08 y 10). **4 · Previa de Claude:** la v1 no trae ficha de Chef (solo dice que Chef D-1 y D-2 «preguntan lo mismo» que la estructura de Design); la recomendación previa es la de la especificación (tarea G, R7): **A**; las fichas de R7-Design ([WEE-CHEF-TAREAS-LOTE-1.md](WEE-CHEF-TAREAS-LOTE-1.md) §1) la dejan sin aprobar.

**Contexto [L/E].** Hoy `ChefScreen` es un **lugar de trabajo**: cabecera → caja → fichas de lo que viaja → ocho tarjetas → «Mis proyectos» (`screens/ChefScreen.tsx:257-345`), desde el 2026-09-15 (`f28cee9`), sin hero, sin muro y sin fotos de comida; un panel (nutrición, sustituir, compras) **se come la pantalla** sin navegar y el atrás de Android lo cierra antes de salir (`screens/ChefScreen.tsx:218`). Lo vigilan **47 comprobaciones** (`chef-weeai` 47/47 [E]; AC-27, `docs/WEE-CHEF-ESPECIFICACION.md:437`).
Los encargos de R7 describían una estructura que Chef **ya no tiene** (hero + herramientas plegadas + muro de sección): el muro de sección se retiró el 2026-09-13 (`4ff271e`) y el «plegado» solo existe hoy en Weë Travel (`docs/WEE-CHEF-ESPECIFICACION.md:40-42`). La imagen `design/references/wee-chef.jpg` (2026-09-05) sí muestra aquella estructura (hero con una foto de pasta, seis tarjetas, chat, «Recetas populares» con fotos y un banner de foto) y `CLAUDE.md` §5 sigue llamando «definitiva» a esa referencia (`CLAUDE.md:78`): una tensión documental que esta decisión resuelve.

**5 · Efecto funcional, por alternativa.**
- **A — mantener el lugar de trabajo y añadir lo nuevo plegado.** Hoy no cambia nada. En el lote 2, lo nuevo («Mi cocina», «Mis recetas» y, solo si se pide, «De la comunidad») entra **plegado por defecto** con el patrón que ya existe (`herramientasAbiertas` y `TravelLauncher`: `screens/SpecialistScreen.tsx:58`; `screens/SpecialistScreen.tsx:200`); la superficie principal es la caja y la receta, y el muro social es el Wäll (`docs/WEE-CHEF-ESPECIFICACION.md:354`).
- **B — volver a hero + muro de sección.** Reescribe `ChefScreen` y sus 47 comprobaciones; contradice «un solo muro».

**6 · Efecto visual, por alternativa.** **A:** la pantalla de hoy (sin emojis ni fotos de stock; solo la foto del plato de la persona); en el lote 2, secciones plegadas bajo las tarjetas. **B:** un hero con foto de comida, el muro de sección y «Recetas populares» como en la imagen de referencia: **no hay ninguna foto de comida entregada** y el muro se retiró.

**7 · Archivos o contratos, por alternativa.** **A:** ninguno ahora; lote 2: `components/chef/` (nuevos) y `ChefScreen.tsx`. **B:** reescribir `screens/ChefScreen.tsx` y `components/chef/*`, `chef-weeai` (47) y `aceptacion-pantallas` A–D; **CHEF-02 y CHEF-03b se tiran o se rehacen** (editan `ChefScreen.tsx`); **CHEF-01, 03a y 04 no se ven afectadas** (servidor y funciones puras). **Cercas `puente-pre-f1d`: ninguna** (todo cliente) [L].

**8 · Criterios afectados (hoy).**

| Criterio / tarea | Hoy | Cómo se mueve |
|---|---|---|
| AC-27 (orden cabecera → caja → funciones → recetas) | VERDE (`chef-weeai` 47/47 [E]) | «debe seguir (o cambiarse con D-1)» |
| CHEF-02 (AC-11, 12, 13) y CHEF-03b (AC-04, 06) | ROJO | **Las desbloquea D-1 = A** (editan `ChefScreen.tsx`); ver el lote 1 en `docs/WEE-CHEF-TAREAS-LOTE-1.md:73` |
| CHEF-01, CHEF-03a, CHEF-04 | ROJO / ROJO / N/A | **No dependen de D-1** |
| CHEF-07, 08, 10 (lote 2) | no empezadas | Las bloquea D-1 (`docs/WEE-CHEF-ESPECIFICACION.md:533`) |
| ACE-C-01…04 · ACE-C-19 («Muro social dentro de Chef») | PASA · NO EXISTE por decisión | `docs/WEE-ACEPTACION.md` |

**9 · Riesgos y dependencias.** **La incoherencia de la especificación:** la fila de D-1 dice que bloquea «CHEF-07/08/10 (no el lote 1)» (`:533`), pero `:546` la incluye en el «mínimo para arrancar el lote 1» (`docs/WEE-CHEF-ESPECIFICACION.md:546`). Por lectura del código de las fichas, **D-1 solo frena de verdad a CHEF-02 y CHEF-03b**; las otras tres pueden empezar sin ella
(`docs/WEE-CHEF-TAREAS-LOTE-1.md:76`). Es **la misma pregunta que la ESTRUCTURA de Weë Design** (Chef D-1 A ≈ Design A; Chef D-1 B ≈ Design C y D) y D-2 (muro y compartir: la especificación recomienda A, «sin muro propio») es su vecina; las dos respuestas son independientes: lo que contestes en Chef no obliga a Design ni al revés.

**10 · Si no se decide.** **CHEF-02 y CHEF-03b no pueden empezar**, así que siguen en pie sus defectos: los ajustes viajan solo como texto (D-CHEF-4), una idea larga pierde la dieta sin aviso (D-CHEF-5) y «Sustituir ingredientes» pide una foto sin motivo (D-CHEF-2). CHEF-01, 03a y 04 pueden empezar. `chef-weeai` sigue fijando el orden de hoy (A de facto) y `CLAUDE.md` §5 sigue llamando «definitiva» a una imagen que ya no es la pantalla.

**11 · ¿Vuelve imposible un criterio?** Ninguno (Chef no tiene lista de cierre propia). **B tira trabajo:** CHEF-02 y CHEF-03b.

**12 · Recomendación final (R8) [O]: A** — **confirma la de la especificación y la de las fichas**, y la apoyo en el código: el lugar de trabajo del 2026-09-15 es lo que existe y se prueba (47/47), lo plegado ya tiene precedente en Travel y B reescribe una pantalla para volver a una estructura sin foto de comida ni muro. **«Y corregir el texto de `CLAUDE.md` §5» es una acción tuya** (AUT-9, §F): es un archivo del dueño y esta tarea no lo toca. **Qué me haría cambiar:** querer ver en Chef aquella pantalla con foto de comida y recetas populares (B).

---

### Chef D-3 — Información nutricional

**1 · Texto literal de la pregunta.**

> «Información nutricional» — `docs/WEE-CHEF-ESPECIFICACION.md:535`

**2 · Alternativas literales.**

> **A)** estimación rotulada, sin fuentes (lote 1)
>
> **B)** con búsqueda con fuentes (exige variante nueva: CHEF-16)
>
> **C)** no ofrecerla
>
> — `docs/WEE-CHEF-ESPECIFICACION.md:535`

**3 · Qué marca el documento.** «Recomendado»: «A ahora, B después». **Mantener lo de hoy:** ninguna equivale: hoy «Información nutricional» es solo un panel de nueve entradas que deja una frase empezada y **acaba en el plan «receta + foto del plato»** (D-CHEF-1: se paga una foto que no se pidió). **4 · Previa de Claude:** la de la especificación y la de las fichas: **A**; las fichas señalan lo de «Alérgenos» sin decidir (`docs/WEE-CHEF-TAREAS-LOTE-1.md:56`).

**Contexto [L/E].** El panel de nutrición tiene nueve entradas, una de ellas **«Alérgenos»** (`constants/chefTools.ts:120-128`), y su **subtítulo dice «Calorías, macros y alérgenos»** (`i18n/textos/es/chef.ts:41`); el panel de sustituir ofrece «Sin lactosa», «Sin gluten», «Sin huevo» y «Sin frutos secos» (`constants/chefTools.ts:134-137`). **El hallazgo de R7:** con la opción **A** (una **estimación rotulada, sin fuentes**) esa promesa de «alérgenos» es **más fuerte** que lo que una estimación sin fuentes puede sostener:
una caloría o un macro admiten «aproximado»; **un alérgeno no es una cifra, es una afirmación de seguridad**. Es el riesgo R-10 (seguridad alimentaria y salud: «una alergia no declarada o mal respetada … pueden hacer daño», `docs/WEE-CHEF-ESPECIFICACION.md:511`) y depende de **D-4** (alergias y dietas), sin decidir (`docs/WEE-CHEF-ESPECIFICACION.md:536`). La instrucción de `swap` **no debe afirmar que algo es seguro para una alergia** (`docs/WEE-CHEF-TAREAS-LOTE-1.md:411`). La calidad real de lo que escriba un modelo es UNKNOWN hasta un canario autorizado (CHEF-18, AC-21).

**5 · Efecto funcional, por alternativa.**
- **A — estimación rotulada, sin fuentes (lote 1).** `nutrition` pasa a ser un plan de **un paso** `text.generate`/`answer`: estimación **por porción**, rotulada como aproximada, sin cifras inventadas ni consejo médico y **sin foto del plato** (CHEF-03a): un resultado de texto, más corto y barato que «receta + foto».
- **B — con búsqueda con fuentes.** `nutrition` pasa a `text.search` (búsqueda con fuentes: una forma nueva, `ai_search`, R-6) y exige la **variante nueva** de CHEF-16 en `core/registry/capabilities.ts` (+~12 líneas), que **mueve F3** y los pines de variantes (`variantes-con-significado`, `core-registry`): **requiere autorización y reanclaje de F3**. CHEF-03a se parte: `swap` y `shopping` ahora, `nutrition` después.
- **C — no ofrecerla.** CHEF-03a entrega solo `swap` y `shopping`; la tarjeta y el panel de nutrición se quitan de la pantalla («ocho funciones» pasa a siete: cambian `chef-weeai` #1, #2, #5, #18 y #19 y `aceptacion-pantallas` ACE-C-01/03).

**6 · Efecto visual, por alternativa.** **A:** el panel igual (nueve entradas) y un resultado de texto rotulado como estimación; **el subtítulo «Calorías, macros y alérgenos» y la entrada «Alérgenos» prometen más que A**. **B:** el resultado enseña fuentes (como los precios del menú). **C:** desaparece una tarjeta de las ocho.

**7 · Archivos o contratos, por alternativa.** **A:** servidor: `functions/src/creator/templates.ts`, `prompts.ts` y `i18n/textos/{es,en,da}/servidor/*` (CHEF-03a: se mueven **ocho suites** de pines, una sola persona, un solo commit); **cercas: ninguna**. Para sostener la condición de más abajo: `constants/chefTools.ts` e `i18n/textos/*/chef.ts` ×16 (el subtítulo y/o la entrada). **B:** `core/registry/capabilities.ts` (**F3**) y los pines de variantes. **C:** `constants/chefTools.ts` (tarjetas), `i18n/textos/*/chef.ts` y las pruebas citadas.

**8 · Criterios afectados (hoy).**

| Criterio / tarea | Hoy | Cómo se mueve |
|---|---|---|
| AC-05 (nutrición → plan sin foto del plato) y AC-20 (toda cifra nutricional sale rotulada como estimación) | ROJO · ROJO | **CHEF-03a (texto)** y CHEF-07 (la tarjeta) con **A** (`docs/WEE-CHEF-ESPECIFICACION.md:415`; `docs/WEE-CHEF-ESPECIFICACION.md:430`) |
| ACE-C-13 (información nutricional como resultado propio y rotulado) | HUECO / requisito sin definir | Se cierra con CHEF-03a + 03b |
| AC-21 (con la alergia «frutos secos», la receta real no contiene frutos secos) | UNKNOWN | Solo lo mide un canario con proveedor (CHEF-18, D-12): **A no lo resuelve** |
| CHEF-03a (la opción `nutrition`) y CHEF-03b (la tarjeta) | no empezadas | **Las desbloquea D-3**; `swap` y `shopping` **no dependen** de D-3 (*inferido* en la ficha) |

**9 · Riesgos y dependencias.** R-10 y **Chef D-4** (alergias): D-3 = A no decide las alergias; solo decide cómo se dice la nutrición. R-6: B añade búsqueda con fuentes en cada petición. Y la contradicción de la especificación: «Lote 1 — sin decisiones que bloqueen» (`docs/WEE-CHEF-ESPECIFICACION.md:454`) frente a «decisión D-3A» en CHEF-03a (`docs/WEE-CHEF-ESPECIFICACION.md:462`) y a la columna «Bloquea» de la propia D-3, que dice «CHEF-03».

**10 · Si no se decide.** **CHEF-03a no puede entregar la opción `nutrition`** (puede entregar `swap` y `shopping`) y CHEF-03b no puede añadir su tarjeta; el panel sigue acabando en «receta + foto del plato» (se paga una foto que no se pidió, D-CHEF-1) y sigue prometiendo «alérgenos»; AC-05, AC-20 y ACE-C-13 siguen en rojo o en hueco.

**11 · ¿Vuelve imposible un criterio?** Ninguno. C quita una de las ocho funciones; B exige tocar F3.

**12 · Recomendación final (R8) [O]: A, con una condición — «Alérgenos» no se promete como estimación.** Confirma la de la especificación (A ahora, B después) y **añade** lo que R7 encontró: A sostiene «calorías y macros» como aproximación rotulada; **no** sostiene «alérgenos» mientras no se decida D-4. Dos formas de cumplirlo (elige): (1) **retirar la promesa** —la entrada «Alérgenos» y la palabra «alérgenos» del subtítulo— de la primera versión, que es la única que no depende de cómo se porte un modelo (cambio pequeño, pero
en constantes y en 16 diccionarios); o (2) dejarla y que el texto del modelo **solo avise** («revisa la etiqueta») y **nunca asegure** que algo no contiene un alérgeno. Yo elegiría la (1). **B después** (fuentes) si lo quieres, con tu autorización de F3. **Qué me haría cambiar:** que prefieras ofrecer alérgenos con un aviso legal ya revisado (D-4), o que el canario (CHEF-18) mida que el modelo respeta las restricciones.

---

## C. Contraste de las letras de partida del dueño

El dueño trajo estas letras **como punto de partida (no son decisiones)**: DEC-01 B · DEC-02 B · DEC-05 A · DEC-06 «a» · D1 A · D2 B · D3 C «en dos escalones» · D4 A · D5 A · D6 A «con C como condición de parada» · D7 A «condicionada» · estructura visual A «(mantener)». Esta tabla pone cada letra frente a **la opción que es hoy**, con su
texto literal tomado de la tabla fuente (no se tradujo ni se resumió), y dice si coincide con lo que el documento fuente marca como «Recomendado» y con la recomendación previa (v1) y si la confirmo. **Donde la letra trae un modificador que no es una opción de la tabla, no la traslado mecánicamente: lo explico debajo.**

| Id | Letra de partida | La opción que es en la versión ACTUAL (texto literal) | ¿Coincide con «Recomendado» del documento? | ¿Con la previa de Claude (v1)? | ¿La confirmo (R8)? |
|---|---|---|---|---|---|
| DEC-01 | B | **B)** «Sí, después de la misión de identidad» | sí (B) | sí (B) | **Sí** |
| DEC-02 | B | **B)** «Un acceso discreto en `DesignScreen`» | sí (B, «sin tocar el menú») | sí (B, si DEC-01 no es A) | **Sí**, como registro sin obra (nota 5) |
| DEC-05 | A | **A)** «No (hoy)» | sí (A) | sí (A) | **Sí** |
| DEC-06 | «a» | alternativa **1** = «La lista de DEC-06a» (la celda no tiene letras: la «a» la puso la v1) | sí («La lista de DEC-06a») | sí («a») | **Sí**, y se contesta «1» (nota 1) |
| D1 | A | **A)** “Todo «lo que imagines»” | sí (A, «con cada puerta llevada a una intención de la plantilla») | sí (A) | **Sí** |
| D2 | B | **B)** «A + Hogar & Diseño con puerta propia» | sí (B) | sí (B) | **Sí** |
| D3 | C «en dos escalones» | **C)** “Las frases rápidas editan y «Otra versión» recrea” | sí (C) | sí (C, en dos escalones) | **Sí** (nota 2) |
| D4 | A | **A)** «Solo logos y afiches, con un modelo que escriba texto (el afiche se cotiza más caro)» | sí (A, «logos en el nivel alto») | sí (A) | **Sí** (nota 7) |
| D5 | A | **A)** «1:1, 4:5, 9:16 y 16:9» | sí (A) | sí (A, entrando por tres de las cuatro) | **Sí** (nota 6) |
| D6 | A «con C como condición de parada» | **A)** «Inspiración de estilo (`image.reference`)» y, como parada, **C)** «Ocultar el botón hasta decidir» | sí (A) | sí (A, con C como parada) | **Sí** (nota 3) |
| D7 | A «condicionada» | **A)** «Llevarlas a lo que existe (Studio, Hogar & Diseño, imagen)» | sí (A) | sí (A, condicionada) | **Sí** (nota 4) |
| ESTRUCTURA | A «(mantener)» | **A)** «Lo de hoy: cabecera, caja, “Explora” con seis puertas, “Mis creaciones”.» (§E.4: no es una fila de ninguna tabla fuente) | — (ninguna tabla la recomienda; la lista de cierre dice «Nada: ya cumple») | sí (A) | **Sí** (nota 8) |
| D8 | — (sin letra) | recomendado: «A ahora, B después» | — | — (sin ficha en la v1) | propongo **A** (nota 9) |
| D9 | — (sin letra) | recomendado: «A + C» | — | — (sin ficha en la v1) | propongo **A** (+ C si quieres la obra) (nota 9) |
| Chef D-1 | — (sin letra) | **A)** «mantener el lugar de trabajo del 2026-09-15 y añadir lo nuevo plegado» | sí (A, «y corregir el texto de `CLAUDE.md` §5») | — (la v1 no tiene ficha de Chef) | propongo **A** (§B.4) |
| Chef D-3 | — (sin letra) | **A)** «estimación rotulada, sin fuentes (lote 1)» | sí («A ahora, B después») | — | propongo **A con una condición** (§B.4) |

**Lo primero que se ve:** **las letras de partida coinciden una a una con lo que cada documento fuente marca como «Recomendado»** y con la recomendación de la v1; lo que añaden son **tres modificadores** (D3 «en dos escalones», D6 «con C como condición de parada», D7 «condicionada») que **no son opciones de ninguna tabla**, y una letra de DEC-06 que **no existe en su tabla**. Dicho de otro modo: aceptar el punto de partida es aceptar las recomendaciones de `DESIGN.md` y de `WEE-DESIGN-UIUX-DECISIONS.md`
más tres matices; mi análisis de R8 no encuentra, en ninguna, una razón para cambiar la letra, pero sí nueve notas que el dueño debe leer antes de contestar:

**Discrepancias y matices (lo que no se traslada mecánicamente).**

1. **DEC-06 «a».** La tabla fuente da la celda «La lista de DEC-06a, otra, o formatos visibles» sin letras; la v1 les puso `a`, `b` y `c`. **«a» no es «DEC-06a»**: DEC-06a es una decisión ya tomada en la misión de la referencia (la lista de destinos, reversible) y «la lista de DEC-06a» es la **alternativa 1** de DEC-06. Para que no se lea de otra forma, aquí se contesta **1, 2 o 3** (§B, ficha de DEC-06). Tu «a» se lee como **1**.
2. **D3 «C en dos escalones».** La tabla solo dice «C) Las frases rápidas editan y “Otra versión” recrea». Los **dos escalones son la lectura de la v1**: (1) las frases editan la propuesta elegida y conservan las respuestas (sin cercas); (2) el linaje (F4 o F3, con tu autorización). Lo que se registra es **C**; los escalones son el plan. **Ojo:** el corredor daría CL-13 «cumplido» al terminar el escalón 1 (su sonda no mide linaje) aunque el texto del criterio pide «y deja linaje»: hay que decir si CL-13 se cierra con el escalón 1 (se reescribe su texto) o con el 2 (se refuerza la sonda).
3. **D6 «A con C como condición de parada».** La tabla no tiene tal cosa. **Mi lectura [O]** (la ficha de D6 la detalla): el destino registrado es **A**; **C** («ocultar el botón hasta decidir») es el estado seguro donde el trabajo **se detiene** si una de tres condiciones falla —la referencia no llega o no se nota, el precio exige tocar una cerca (F2), o los rostros (DEC-24) no están resueltos—; se activa en cuanto una falla o si quieres cerrar CL-09 antes de que A esté lista. Con la parada en C: **CL-09 cumplido, CL-16 abierto** (no imposible). **Confirma o corrige esta lectura:** es la única donde «parada» no tiene definición escrita.
4. **D7 «A condicionada».** Tampoco es una opción de la tabla. Las condiciones, según la v1 y la ficha de D7: «Un antes y después» a Hogar & Diseño **solo si D2 = B**; «Un recorrido» a Studio **solo si DEC-12 = A**; si no, B (retirarlos) para esos dos puntos; «Una maqueta 3D» se renombra o se retira **en cualquier caso** mientras no haya 3D. **DEC-12 no está entre las catorce**: por eso va en la hoja como vecina opcional (A.5).
5. **DEC-02 B con DEC-01 B.** DEC-02 pregunta «con la puerta abierta, ¿por dónde se entra?»; **registrar B no abre la puerta** (esa constante sigue cerrada) y, con DEC-01 = B, la referencia sustituirá a la pantalla *después de la identidad*, así que el acceso solo se construiría si abres la referencia **antes**, como espacio aparte. Es un registro sin obra.
6. **D5 «A» incluye 4:5.** De las cuatro proporciones, 1:1, 9:16 y 16:9 ya están en `ASPECT_LABELS` y FLUX y Seedream las resuelven; **4:5 no está** y declarar medidas verificadas de Gemini toca `resolutionPolicy.ts` (E4 y F1). Se puede registrar A y construir **en ese orden** (tres primero, 4:5 después y con autorización).
7. **D4 «A» y el precio del afiche.** La opción dice «(el afiche se cotiza más caro)»; si no quieres esa subida, la respuesta honesta es «A solo para logos» (que es lo de hoy) y **no es ninguna de las tres letras**: CL-15 tendría que reescribirse (§B, ficha de D4). D4 y D5 se contestan juntas: los dos únicos modelos que escriben texto no tienen medidas verificadas más que para 1:1.
8. **ESTRUCTURA «A (mantener)».** No es una fila de ninguna tabla: la pregunta y las letras A a E las formuló la v1 (§E.4) a partir del encargo del dueño. «A (mantener)» es «lo de hoy». Es la misma pregunta que **Chef D-1**.
9. **D8 y D9 no traen letra de partida.** El documento recomienda «A ahora, B después» (D8) y «A + C» (D9): son respuestas compuestas. Propongo registrar **A** en las dos; la **C de D9 compromete trabajo** (definir y construir una regla), así que solo si quieres esa obra.

**Chef D-1 y D-3 (el dueño no trajo letra; lo formulo yo [O]).** La especificación dice **A** en las dos («A ahora, B después» en D-3). **D-1 = A:** mantener el lugar de trabajo del 2026-09-15; desbloquea CHEF-02 y CHEF-03b (D-1 **no** bloquea el lote entero, pese a lo que dice `:546`; incoherencia explicada en la ficha). **D-3 = A con una condición:** la estimación rotulada sostiene calorías y macros, **no** «alérgenos»: o se retira esa promesa (la entrada y la palabra del subtítulo) en la primera versión, o el texto del modelo solo avisa y nunca asegura; la
decisión sobre alergias y dietas es **Chef D-4**, que sigue sin responderse y no está entre las catorce.

---

## D. Qué hay que decidir para cerrar, qué es opcional y qué es solo registro

«Cerrar» es lo que define `docs/WEE-DESIGN-CIERRE.md` §9: los 28 criterios en «cumplido», ninguno esperando una decisión (`docs/WEE-DESIGN-CIERRE.md:329`). Las cifras de aquí son las **de hoy** (`c3f7f9a7`) y las **de la simulación recalculada**; sustituyen a todas las de la v1.

### D.1 Qué hay que decidir para poder cerrar, y con qué respuesta

Un criterio de código se evalúa **mirando primero la comprobación**: si el código ya cumple, queda «cumplido» aunque su decisión no esté registrada; si no cumple y falta una decisión, «espera una decisión»; si no cumple y ya están todas, «abierto» (`functions/test/_design-cierre.mjs:355-368`). **Las decisiones no cierran criterios de código: dicen qué código hay que escribir** (y, por el proceso de la ronda, no se integra código que presuponga una decisión sin registrar). Solo **CL-05 y CL-23** leen el registro como comprobación.

| Decisión | Criterio que depende de ella (hoy) | ¿Una respuesta cualquiera lo cierra? | Respuestas con las que el criterio, tal como está escrito, **no puede cumplirse** | Opción que menos construye | Lo que cuesta la recomendada [I] |
|---|---|---|---|---|---|
| **D1** | CL-05 (espera una decisión); CL-01 (espera una decisión) | CL-05: **sí, cualquiera** (la sonda solo lee el registro). CL-01: ninguna lo cierra sola; lo cierra el código de P1, igual con A, B o C | ninguna | **B** (la pantalla de hoy) o A sin añadir puertas | M (A) |
| **D2** | CL-02 (espera una decisión); CL-01 | CL-02: **solo B**. CL-01: cualquiera, con P1 | **A y C** dejan CL-02 imposible (salvo que D7-A lleve «Un antes y después» a `home`, lo que contradice A) | A, y reescribir CL-02; la única que cierra CL-02 es **B** y es pequeña (P2) | S sobre P1 (B) |
| **D3** | CL-13 (espera una decisión) | **Solo B o C** (la sonda); su **texto** exige además linaje | **A** | un cambio solo de cliente que conserve las respuestas (S, sin linaje) cierra la sonda | M–L (C); L con linaje |
| **D4** | CL-15 (espera una decisión) | **Solo A o C** | **B** | **A** (el afiche pasa a `kind: 'poster'`; cuesta más) | S–M (A) |
| **D5** | CL-14 (espera una decisión) | Cualquiera de A, B o C, **con código** | ninguna | **C** (1:1 y 9:16, que ya están en la política) | M (A) |
| **D6** | CL-09 (espera una decisión); CL-16 (espera una decisión) | CL-09: cualquiera. CL-16: **solo A** | **B y C** dejan CL-16 imposible | **C** (ocultar «Añadir») cierra CL-09; CL-16 no | M–L (A); C: S–M |
| **D7** | CL-05; CL-01 | CL-05: cualquiera (la sonda); su **texto** solo lo cumplen A y B | **C** deja el texto de CL-05 falso | **C** (= hoy) registra sin tocar nada pero deja la promesa; la mínima honesta es **B** | M (A) |
| **DEC-01, 02, 05, 06** | CL-23 (espera una decisión) | **Sí, cualquiera** | — (DEC-01 = C re-basa CL-01 a 05, 09, 24 y 26) | A, A, A y 1: lo de hoy | 0 (DEC-01 B, DEC-05 A, DEC-06 1); S–M (DEC-02 B, al abrir la puerta) |
| **D8, D9** | CL-23 | **Sí, cualquiera** | — | D8 = A; D9 = A | 0 (D9-C: M) |
| **ESTRUCTURA** | ninguno (CL-26, CL-25 y los re-basados con C/E) | — | — | A | 0 (B: S) |
| **Chef D-1, D-3** | ninguno de Design; AC-27, CHEF-02, 03a, 03b | — | — | A y A | 0 · S |

**Qué habría que reescribir o retirar si se eligiera una de esas respuestas** (lo decide el dueño; aquí solo se dice qué): **CL-02 con D2 = A o C** → retirarlo (por decisión, Hogar & Diseño no tiene puerta en Design) · **CL-13 con D3 = A** → retirarlo o reescribirlo como «cada cambio abre un trabajo nuevo con el precio a la vista» · **CL-15 con D4 = B** → reescribirlo como «ningún afiche ni logo lleva texto dentro de la imagen» (y quitar la pregunta del nombre de la marca) · **CL-16 con D6 = B** → reescribirlo sobre `image.edit` («una foto base que sube la persona se USA») · **CL-16 con D6 = C** → retirarlo hasta que se decida A · **CL-05 con D7 = C** → reescribir su título (las puertas siguen prometiendo lo que aún no existe) o aceptar que se cierra por registro con la promesa sin cumplir.

**Con las letras de partida del dueño (§C) ningún criterio queda imposible de cumplir tal como está escrito [E/L]:** D2 = B cumple CL-02; D3 = C cumple la sonda de CL-13 (con la salvedad de su texto); D4 = A cumple CL-15; D5 = A cumple CL-14; D6 = A cumple CL-09 y CL-16; D7 = A cumple el texto de CL-05. Los dos que quedan **condicionados**: **CL-13** (la sonda se cierra con el escalón 1, su texto pide linaje: hay que decidir si se reescribe o se refuerza) y **CL-16** (con la parada en C queda abierto hasta que A se construya).

**Cómo leer «no puede cumplirse tal como está escrito».** La lista de cierre y el corredor son del dueño y de quien coordina; **esta tarea no los edita**. Si eliges una de esas respuestas, el criterio afectado hay que reescribirlo o retirarlo para que Design pueda llegar a 28 de 28: el corredor solo tiene cuatro estados —cumplido, abierto, espera una decisión y manual— y **ninguno es «retirado»** (`functions/test/_design-cierre.mjs:9-13`).

### D.2 Qué diría el corredor si se registrara cada decisión (recalculado, en memoria)

Hoy (`c3f7f9a7`, sin registrar nada): **11 cumplidos · 5 abiertos · 9 esperan una decisión · 3 manuales** [E]: cumplidos CL-06, 07, 08, 10, 11, 12, 17, 20, 24, 27 y 28; abiertos CL-03, 04, 18, 19 y 25; esperan CL-01, 02, 05, 09, 13, 14, 15, 16 y 23; manuales CL-21, 22 y 26. **[E: simulación en memoria con `simular-registro.mjs` de R7-Design, que parchea `fs.readFileSync` para añadir una marca a las filas elegidas; el disco no cambia; `git status` quedó vacío.]**

| Se registra | CL-01 | CL-02 | CL-05 | CL-09 | CL-13 | CL-14 | CL-15 | CL-16 | CL-23 | Cumplidos · abiertos · esperan · manuales |
|---|---|---|---|---|---|---|---|---|---|---|
| Nada (hoy) | espera | espera | espera | espera | espera | espera | espera | espera | espera | 11 · 5 · 9 · 3 |
| Solo D1 | espera | espera | espera | espera | espera | espera | espera | espera | espera | 11 · 5 · 9 · 3 |
| Solo D2 | espera | **abierto** | espera | espera | espera | espera | espera | espera | espera | 11 · 6 · 8 · 3 |
| Solo D7 | espera | espera | espera | espera | espera | espera | espera | espera | espera | 11 · 5 · 9 · 3 |
| D1 + D7 | espera | espera | **cumplido** | espera | espera | espera | espera | espera | espera | 12 · 5 · 8 · 3 |
| D1 + D2 | espera | **abierto** | espera | espera | espera | espera | espera | espera | espera | 11 · 6 · 8 · 3 |
| D1 + D2 + D7 | **abierto** | **abierto** | **cumplido** | espera | espera | espera | espera | espera | espera | 12 · 7 · 6 · 3 |
| Solo D3 | espera | espera | espera | espera | **abierto** | espera | espera | espera | espera | 11 · 6 · 8 · 3 |
| Solo D4 | espera | espera | espera | espera | espera | espera | **abierto** | espera | espera | 11 · 6 · 8 · 3 |
| Solo D5 | espera | espera | espera | espera | espera | **abierto** | espera | espera | espera | 11 · 6 · 8 · 3 |
| Solo D6 | espera | espera | espera | **abierto** | espera | espera | espera | **abierto** | espera | 11 · 7 · 7 · 3 |
| Solo D8 | espera | espera | espera | espera | espera | espera | espera | espera | espera | 11 · 5 · 9 · 3 |
| Solo D9 | espera | espera | espera | espera | espera | espera | espera | espera | espera | 11 · 5 · 9 · 3 |
| Solo DEC-01 | espera | espera | espera | espera | espera | espera | espera | espera | espera | 11 · 5 · 9 · 3 |
| Solo DEC-02, 05 y 06 | espera | espera | espera | espera | espera | espera | espera | espera | espera | 11 · 5 · 9 · 3 |
| Las cuatro DEC (01, 02, 05, 06) | espera | espera | espera | espera | espera | espera | espera | espera | espera | 11 · 5 · 9 · 3 |
| D1 a D7 (sin DEC, sin D8 ni D9) | **abierto** | **abierto** | **cumplido** | **abierto** | **abierto** | **abierto** | **abierto** | **abierto** | espera | 12 · 12 · 1 · 3 |
| Las once (D1–D7 + DEC-01, 02, 05, 06) | **abierto** | **abierto** | **cumplido** | **abierto** | **abierto** | **abierto** | **abierto** | **abierto** | espera | 12 · 12 · 1 · 3 |
| Las doce (once + D8) | **abierto** | **abierto** | **cumplido** | **abierto** | **abierto** | **abierto** | **abierto** | **abierto** | espera | 12 · 12 · 1 · 3 |
| Las trece (todas las que lee CL-23) | **abierto** | **abierto** | **cumplido** | **abierto** | **abierto** | **abierto** | **abierto** | **abierto** | **cumplido** | 13 · 12 · 0 · 3 |
| Las trece menos D9 | **abierto** | **abierto** | **cumplido** | **abierto** | **abierto** | **abierto** | **abierto** | **abierto** | espera | 12 · 12 · 1 · 3 |

Lo que esto dice, y que la v1 no podía decir (su base era otra):
- **Registrar las trece cierra por registro solo CL-05 y CL-23** (de 11 a 13 cumplidos) y **convierte siete criterios en trabajo**: CL-01, 02, 09, 13, 14, 15 y 16 pasan de «esperan» a «abierto». Quedan **12 abiertos** y 0 esperando: CL-01, 02, 03, 04, 09, 13, 14, 15, 16, 18, 19 y 25. De ellos, **cuatro no esperan a ninguna decisión de Design**: CL-04 (P3, «Mis creaciones»), CL-18 (la suite de emulador), CL-25 (limpieza de restos y `SpecialistHero`, AUT-8) y CL-19 (cancelar, AUT-2).
- **D1 sola no cambia nada;** CL-05 necesita D1 **y** D7; CL-02 se abre con D2 sola; CL-01 necesita D1, D2 **y** D7.
- **Las once (D1–D7 + DEC) no bastan:** CL-23 sigue esperando hasta que están **D8 y D9** (trece de trece).
- El corredor **no sabe qué letra** se registró, solo **si** la fila lleva la marca de registro: por eso una respuesta que deje un criterio imposible (D.1) **no lo avisa** y puede dar «cumplido» con la promesa sin cumplir (CL-05 con D7 = C; CL-13 tras el escalón 1).

### D.3 CL-23 es un criterio de registro: qué respuestas son solo «no ahora»

CL-23 pide **trece de trece** registradas (`functions/test/_design-cierre.mjs:291-296`) y no construye nada. Hay respuestas de puro registro, porque **no obligan a escribir código** ni cambian la pantalla:

| Decisión | Respuesta de puro registro («no ahora») | Respuestas que sí comprometen trabajo |
|---|---|---|
| DEC-01 | A (nunca) o B (después de la identidad) | C |
| DEC-02 | A (solo por dirección) · **B si la puerta sigue cerrada** (registro sin obra) | B al abrir la puerta, C |
| DEC-05 | A (no) | B |
| DEC-06 | 1 (la lista, ya hecha) | 2, 3 |
| D8 | A (nada en la primera versión) | B, C |
| D9 | A (no prometer exclusividad, cláusula en los términos y revisión legal: tarea legal fuera del código) | B (etiqueta en los logos), **C (una regla: obra)** |
| D3, D6, D7 | A (recrear), C (ocultar) y C (esperar) son «no ahora» válidas para el registro, **pero** dejan CL-13, CL-16 y el texto de CL-05 sin poder cumplirse (D.1) | el resto |

Si no se contestan D8 y D9, CL-23 queda «espera» y Design no llega a «terminado» según §9.1, aunque lo demás esté hecho [E].

### D.4 Mejoras opcionales (pueden venir después sin impedir «terminado»)

Una mejora es opcional si el cierre, **tal como está escrito**, no la exige. Las dos primeras filas (†) lo son **solo si se reescribe un criterio**.

| Mejora | Decisión que la habilita | Qué gana la persona | Por qué puede esperar |
|---|---|---|---|
| † Referencias de estilo reales | D6-A (en lugar de ocultar con D6-C) | Que el diseño se inspire en su foto | CL-09 se cierra con C; **solo si CL-16 se reescribe** (hoy exige A) |
| † Editar la propuesta elegida, con versiones | D3-B o C | Cambiar una imagen sin rehacer las tres ni pagarlas de nuevo; historia de versiones | Conservar las respuestas (cliente) cierra la sonda de CL-13; **solo si se reescribe su texto**, que exige además linaje |
| Formato vertical de feed (4:5) e impresión | D5-A (4:5) y D5-B | Piezas listas para cada sitio | CL-14 se cierra con 1:1 y 9:16 (C) |
| Texto escrito en cualquier pieza | D4-C | Carteles y portadas con su texto | CL-15 se cierra con A (logos y afiches) |
| Puertas que llevan a Studio y a Hogar & Diseño | D7-A (con DEC-12 y D2-B) | «Un recorrido» y «Un antes y después» que de verdad llevan a algo | CL-05 se cumple retirándolas (B) |
| Memoria de marca compartida con Weë Business | D8-B o C | Que el logo y la paleta se reutilicen | «Nada que construir hoy» y exige autorizar F1/F3 (ficha de D8) |
| Regla propia contra imitar marcas o personas | D9-C | Menos riesgo legal | Ídem |
| El espacio de trabajo como pantalla de Design | DEC-01-B o C, DEC-02-B o C, DEC-05-B | Crear, transformar y editar en un solo espacio | «Quedan fuera de “terminado”» (`docs/WEE-DESIGN-CIERRE.md:340`) |
| Una estructura distinta de la pantalla (hero, plegables, franja de comunidad) | Las alternativas B a E de §E | Según la alternativa | Hoy la estructura cumple lo que el cierre pide |

### D.5 Secuencia de decisión y de construcción [O]

**Para contestar** (la de la hoja): compuertas (DEC-01, ESTRUCTURA, D1) → capacidades (**D2 → D7**, D6, **D4 y D5 juntas**, D3) → solo registro (DEC-02, DEC-05, DEC-06, D8, D9) → Chef (D-1, D-3) → autorizaciones. Las razones: DEC-01 dice a qué pantalla se refieren todas las demás; D1 → D2 → D7 desbloquean CL-01, CL-02 y CL-05 (tres de los cinco bloqueadores), P1 y P2 y el hueco ACE-D-06; D6 es independiente y cierra una mentira visible; D4 y D5
están acopladas por el motor; D3 es la más grande y va después de que el flujo de «Crear» sea real.

**Para construir**, con las respuestas ya registradas, el cierre propone (`docs/WEE-DESIGN-CIERRE.md:322`): F0 y CL-20 no esperan a nadie → CL-01 + CL-02 + CL-03 (P1, P2) con CL-18 (P10) → CL-04 (P3) → CL-14 y CL-15 (P7, P8) → CL-09, CL-13 y CL-16 (P4) → resto. **Nota de estado:** CL-04, CL-18 y el puente ya tienen trabajo en ramas aisladas de esta ronda (§E.2); nada de eso está integrado.

```
DEC-01 ── compuerta ───────────────────────────────────────────────────────────────┐
  │  (A o B: todo lo demás habla de DesignScreen)                                  │  (C: re-basar CL-01…05, 09, 24 y 26)
  ▼
 ESTRUCTURA (A–E; E = DEC-01 C) ≈ Chef D-1
 D1 ──► D2 ──► D7 ─────────► CL-01 · CL-02 · CL-05 ──► P1 · P2           (D7-A pide además DEC-12)
  │      │      └─ vecina: DEC-12 («Un recorrido» → Weë Studio)
  │      └────► D6 ◄──────► D3          (comparten «material como entrada»: D6-B es D3-B; D6-A pide DEC-24)
  ▼
 D4 ◄──────────► D5                      (los modelos que escriben texto solo tienen medida verificada en 1:1)

DEC-01 ──► DEC-02 ──► DEC-05              (solo si la puerta de la referencia llega a abrirse)
DEC-01 ──► DEC-06 ◄── DEC-20 · DEC-21     (los destinos solo tienen efecto con el conversor de Weë)

D8, D9: no dependen de las once (D9 toca a D4: logos con texto; D8 a D6 y a Chef D-6/CHEF-17).
Chef D-1 ──► CHEF-02 · CHEF-03b          Chef D-3 ──► CHEF-03a (nutrition) · CHEF-03b (la tarjeta)   (D-3 ─► D-4 si hay «Alérgenos»)
```

### D.6 Las propuestas P1–P11 y las fases F0–F5: dónde están hoy

Cada ficha dice qué propuesta y qué fase mueve su decisión; esta tabla dice **en qué estado está cada una en `c3f7f9a7`** y si hay trabajo ya hecho en una rama aislada. Las propuestas están en `docs/WEE-DESIGN-CIERRE.md:148-262` y las fases en `docs/DESIGN.md:77-82`.

| Propuesta / fase | Qué es | Hoy (`c3f7f9a7`) | Trabajo en ramas aisladas (no integrado) | Decisión que la desbloquea |
|---|---|---|---|---|
| **P1** / F2 | «Crear» llega a `CreatorFlow` (CL-01, CL-03) | no integrada | puente: `r7d/puente` (HEAD `e1381734`, 2 commit(s) sobre la base) | D1, D2, D7 |
| **P2** / F2 | Puerta a Hogar & Diseño (CL-02) | no construida | — | D2 (B) |
| **P3** | «Mis creaciones» de verdad (CL-04) | no integrada | `r8/pantalla` (HEAD `f15aa2cf`, 3 commit(s) sobre la base) | ninguna (no es de producto) |
| **P4** / F4 | Referencias reales o botón oculto (CL-09, CL-16) | no construida | — | D6 |
| **P5** | Quitar el micrófono de verdad (complementa CL-07) | no construida; CL-07 ya está cumplido con el aviso «Próximamente» | — | (la comparte D6-C: props opcionales de la caja) |
| **P6** | Reintentar tras un fallo de cotización (CL-12) | **hecha** (R7-Design) | — | — |
| **P7** / F1, F5 | `aspectRatio` según el destino (CL-14) | no construida | — | D5 |
| **P8** / F3 | Texto dentro de la imagen para afiches (CL-15) | no construida | — | D4 |
| **P9** / F0 | Dominio `design` del Eval Engine (CL-17) | **hecha** (R7-Design) | — | — |
| **P10** | Suite de emulador `design-recorrido` (CL-18) | no integrada | `r8/emulador` (HEAD `1ef17fd9`, 1 commit(s) sobre la base) | ninguna (infraestructura) |
| **P11** | Proyecto en «Añadir» y «Crear algo nuevo» (CL-20 completo) | no integrada (CL-20 está cumplido en el cliente) | `r8/navegacion` (HEAD `605e1c0e`, 5 commit(s) sobre la base) | ninguna |
| F4 (D3) | Editar la propuesta elegida con linaje | no construida (ninguna P la cubre) | — | D3 |
| F5 (D8, D9) | Memoria de marca y política propia | no construida | — | D8, D9 |

Los huecos de aceptación que estas respuestas cierran, **hoy**: `ACE-D-06` (Crear envía la solicitud: HUECO, «BLOCKED — HUMAN DECISION»), `ACE-D-06b` (un afiche «para una historia» sale vertical: HUECO), `ACE-D-05` (referencias reales: HUECO), `ACE-D-13` (cancelar: NO SOPORTADO) y `ACE-D-03` (puertas: PARCIAL, 13/35 en español y 3/35 en inglés) (`docs/WEE-ACEPTACION.md:110-114`).

---

## E. La estructura visual: estado actual, alternativas y la pregunta exacta

El encargo del dueño menciona **«hero como entrada, herramientas en secciones desplegables cerradas por defecto y el muro social como superficie principal»** (`docs/WEE-DESIGN-CIERRE.md:81`). Esta sección **no lo introduce**: dice qué hay, qué alternativas contempla el repositorio y qué implicaría cada una, y formula la pregunta que falta. **No inventa ninguna estructura visual nueva.**

### E.1 Qué existe y qué no, con su evidencia

- **«Hero como entrada» es del Home, no de Design.** Es el carrusel de cuatro banners entregados por diseño (`docs/UX.md:124`; `components/HeroCarousel.tsx`), que **ningún archivo importa hoy** **[E: búsqueda en `screens/`, `components/`, `navigation/`, `hooks/`, `utils/`, `constants/` y `App.tsx`: solo el propio archivo lo nombra]**; y la definición del Home «está pendiente del dueño» (`docs/UX.md:147`; `CLAUDE.md:21`). En Design, lo más parecido es la cabecera (`StudioHeader` → `CabeceraDeSeccion`: la W, el nombre, el lema y la descripción), que la lista de cierre da por cumplida
  (`docs/WEE-DESIGN-CIERRE.md:86`).
- **«Herramientas plegadas» solo existe en Weë Travel:** el estado `herramientasAbiertas`, que se cierra al entrar y al que el atrás de Android pliega primero (`screens/SpecialistScreen.tsx:58`; `screens/SpecialistScreen.tsx:89`), y su `TravelLauncher` (`screens/SpecialistScreen.tsx:200`). Era el patrón de las secciones «con muro» (fase 2E-41: `screens/SpecialistScreen.tsx:53`). Design no lo usa.
- **«Muro como superficie principal» se retiró el 2026-09-13** (`4ff271e`, «un solo muro»): «ya no hay muros de sección: Weë tiene uno solo, el Wäll» (`services/firestoreService.ts:606`), que ya se filtra por «Weë Design» (`utils/feedFilters.ts:93`). Una prueba lo fija: «Design ya no tiene muro propio» (`functions/test/creator.test.mjs:852`). Quedan comentarios que aún lo describen (`constants/specialists.ts:286`; CL-25, abierto).
- **Design y Chef son un lugar de trabajo propio:** desde `f28cee9` (2026-09-15; `screens/DesignScreen.tsx` nace en ese commit **[E: `git log --follow`]**) la cabecera común dice: «arriba de una sección no va nada más que esto» (`components/creator/CabeceraDeSeccion.tsx:51`) y «Sin adornos» (`components/creator/CabeceraDeSeccion.tsx:209`). Para Chef, la especificación registra lo mismo (`docs/WEE-CHEF-ESPECIFICACION.md:41`).
- **La referencia visual de Design** (`design/references/wee-design.jpg`, 2026-09-05) **no es un espacio de trabajo, es una portada** **[E: vista]**: un banner con foto, «¿Qué quieres diseñar hoy?» con catorce categorías con foto, «Ejemplos de diseños creados con WEE» y una caja abajo. La pantalla de hoy es otra cosa a propósito (seis puertas sin fotos, «seis puertas, no un catálogo», `components/design/DesignExplore.tsx:19`); y `CLAUDE.md` §5 sigue llamando «definitiva» a esas referencias.
- **No hay ningún activo de imagen de Design [E]:** `assets/images/` solo trae `hero/` (los cuatro banners del Home), `hero-couple.png`, `brain/` y los logos; el coche de `wee-design.jpg` es una maqueta, no un activo. El único componente de hero de sección, `components/creator/SpecialistHero.tsx`, es una tarjeta con emoji y está **huérfano** (sin importadores [E]; CL-25 lo cuenta como resto, pero la comprobación 4 de `cierre-cliente` fija que se queda «por decisión»: AUT-8).

### E.2 La pantalla de hoy, de arriba abajo — qué es base y qué es rama aislada

`screens/DesignScreen.tsx` **no ha cambiado desde `a64ff24`** (ni en R7-Design) **[E: `git diff a64ff24 c3f7f9a7 -- screens/DesignScreen.tsx` vacío]**. «Real» = hace lo que dice; «demostración» = no hay nada detrás. La última columna dice qué cambia en las ramas aisladas **de esta ronda**, que **no están integradas**: el puente `r7d/puente` presupone D1, D2 y D7 (su documento: `docs/WEE-DESIGN-PUENTE.md`, que está solo en las ramas del puente y no en esta base); «Mis creaciones» de verdad es una corrección sin decisión de producto (CL-04) que hace la tarea PAN.

| # | Bloque (lo que ve la persona) | Componente y archivo | Líneas (base) | Real o demostración (base) | En las ramas aisladas (según el encargo de cada tarea y los mensajes de sus commits; para el puente, además, su documento; no revisé su código) |
|---|---|---|---|---|---|
| 0 | Marco y desplazamiento; la caja crece sin perder sus botones (CLAUDE.md §9). En escritorio, columna centrada de 720 y **sin** barra lateral de Weë AI (no monta `CreatorShell`) | `SafeAreaView`, `EspacioDeEscritura`, `PaginaDeCajas` | `screens/DesignScreen.tsx:99-100` y `screens/DesignScreen.tsx:176-177` | Real | Igual |
| 1 | **Cabecera:** volver, la W, «WeëDesign», el saldo; lema «Diseña sin límites.»; descripción «Espacios, productos, objetos y mucho más. Dale forma a tus ideas.» | `StudioHeader` → `CabeceraDeSeccion` (+ `CreditsPill`) | `screens/DesignScreen.tsx:184` | Real (el saldo, con sesión) | Igual |
| 2 | **La caja** «¿Qué quieres diseñar hoy?» con cuatro botones grises (Añadir, Añadir una imagen de referencia, Ajustes, Dictar) y el amarillo | `StudioPromptComposer` → `CajaDePrompt` | `screens/DesignScreen.tsx:201-214` | Caja real. **«Crear» es un temporizador** (`screens/DesignScreen.tsx:102-114`); «Añadir» y la imagen de referencia añaden un **nombre de muestra**; «Dictar» dice «Próximamente»; «Ajustes» abre la hoja, pero lo elegido **no viaja** | **Puente (`r7d/puente`):** «Crear» navega a `CreatorFlow` con `{ experienceId: 'design', workspace: 'design', goal: lo escrito · ajustes en palabras }`, o a `Login` sin sesión; se van el temporizador, el aviso y el `ocupado` de la caja |
| 3 | **Fichas** de lo adjuntado, con aspa | `FichaDeContexto` | `screens/DesignScreen.tsx:220-232` | Demostración (nombres de muestra) | Igual (D6) |
| 4 | **«Explora»** + «Ver todas →» y **seis puertas** (Interiores, Arquitectura, Producto, Mobiliario, Vehículos, Renders y 3D), a dos por fila en el teléfono y tres en el resto | `DesignExplore` | `screens/DesignScreen.tsx:234` | Navegación real; la puerta solo abre una lista | Igual |
| 5 | **Puntos de partida:** dentro de una puerta, «Empieza por» con cinco filas; «Ver todas» enseña las siete puertas. Pantalla completa; el atrás de Android deshace un paso | `DesignPanel` | `screens/DesignScreen.tsx:158-171` | Navegación real; elegir un punto **solo escribe una frase** en la caja | Igual |
| 6 | **«Mis creaciones»** + «Ver todas →» | `FilaDeCreaciones` con `CREACIONES_DE_DESIGN` | `screens/DesignScreen.tsx:245-250` | **Demostración:** cuatro muestras («Salón luminoso», «Casa entre pinos», «Yate de 15 metros», «Butaca de madera», `constants/designTools.ts:137-142`); «Ver todas →» va a Mis proyectos | **`r8/pantalla` (CL-04, P3):** lo creado en Design y en Hogar & Diseño, con cargando, vacío y error; las muestras solo sin sesión o sin creaciones y **rotuladas como ejemplos** (clave nueva ×16) |
| 7 | **Aviso flotante** «Creando…» y «Creación lista», con «Esto es una demostración: todavía no hay nada generado de verdad.» | `AvisoDeCreacion` (compartido con Studio) | `screens/DesignScreen.tsx:256-260` | Demostración | **Puente:** desaparece |
| 8 | **Hoja de ajustes:** Estilo, Materiales, Iluminación, Formato, Calidad, todos con «Automático» primero | `AjustesContextuales` + `AJUSTES_DE_DESIGN` | `screens/DesignScreen.tsx:271-280` | Hoja real; sin efecto en el motor | **Puente:** los ajustes viajan **dichos en palabras** en el `goal` |

**No hay:** un hero propio, secciones plegables, un muro, la lista de trabajos en curso, una puerta a Hogar & Diseño ni barra lateral de Weë AI en escritorio. **Lo real de verdad está en el servidor** (`TEMPLATES.design` y `TEMPLATES.home`, con precio, reserva, cobro o reembolso y materiales) y se llega hoy por la búsqueda de Weë AI, Weë Brain y «Mis creaciones» (`docs/WEE-DESIGN-CIERRE.md:17-24`).

Estado de las ramas aisladas **a la hora de ensamblar este documento**: el puente, `r7d/puente` (HEAD `e1381734`, 2 commit(s) sobre la base); su puesta al día de la ronda, `r8/puente` (HEAD `867c9e0b`, 9 commit(s) sobre la base); «Mis creaciones», `r8/pantalla` (HEAD `f15aa2cf`, 3 commit(s) sobre la base); limpieza de CL-25 y diff de `SpecialistHero`, `r8/navegacion` (HEAD `605e1c0e`, 5 commit(s) sobre la base); suite de emulador, `r8/emulador` (HEAD `1ef17fd9`, 1 commit(s) sobre la base). **Nada de esto está en la base de este documento** y nada se integra sin su respuesta (el puente) o su revisión (el resto).

### E.3 Las alternativas

Cada una dice qué cambia para la persona, qué archivos, pruebas e i18n toca, con qué decisiones ya tomadas choca, el riesgo y el esfuerzo **[I]**. **B y D se pueden combinar; C y E excluyen al resto.** Una misma respuesta puede servir a Weë Chef (§E.5).

**A — Mantener** la estructura de hoy.
- *Cambia:* nada. Es lo que respeta la lista de cierre: para el hero «Nada: ya cumple», para el muro «Nada: no se añade muro», y fija que Design no sea un catálogo (`design-cierre` A1).
- *Archivos y pruebas:* ninguno. Las de hoy siguen en verde **[E]**: `design-cierre` 37/37, `cajas-weeai` 52/52, `ajustes-weeai` 50/50, `credits-weeai` 37/37, `navegacion-enlaces` 46/46, `aceptacion-pantallas` 67 y 1 hueco, `aceptacion-conversacion` 31 y 4 huecos.
- *Choca con:* nada. *Riesgo:* ninguno. *Esfuerzo:* 0.

**B — «Explora» plegada al entrar** (la lista de cierre la estimó en «unas 25 líneas», `docs/WEE-DESIGN-CIERRE.md:87`).
- *Cambia:* la persona ve cabecera, caja, «Explora ▸» **cerrada** y «Mis creaciones»; al tocar «Explora» se abren las seis puertas, y al volver a entrar están cerradas otra vez (como las herramientas de Weë Travel). Ya no hay una rejilla de puertas bajo la caja.
- *Archivos, pruebas, i18n:* `components/design/DesignExplore.tsx` (el plegado) y `screens/DesignScreen.tsx` (un estado, y el atrás de Android pliega antes de deshacer el camino). Pruebas que lo fijan hoy: `design-cierre` A1 y B5 (no se rompen), `cajas-weeai` 21 (el atrás de Design), `aceptacion-pantallas` ACE-D-01, ACE-D-20 y ACE-D-24 (esperan `DesignExplore` con `porFila: 2`). i18n: 0 claves si el plegado se dice con `accessibilityState` **[I]**; con texto nuevo, ×16.
- *Choca con:* `CLAUDE.md` §5 («no se simplifican»): el plegado oculta lo que la referencia visual enseña abierto; y con la intención de `DesignExplore` (las puertas, bajo la caja y a la vista). No choca con «un solo muro».
- *Riesgo:* se pierde descubrimiento (las puertas ayudan a quien no sabe qué diseñar). *Esfuerzo:* **S**.

**C — Hero propio + secciones plegables.**
- *Cambia:* arriba un hero (imagen y lema) y debajo las puertas y el resto en secciones desplegables cerradas.
- *Lo que hay para hacerlo:* **ningún activo de imagen de Design [E]**; el único componente de hero de sección (`SpecialistHero.tsx`) es una tarjeta con emoji, huérfana; los textos del hero antiguo siguen en `i18n/textos/es/catalogo.ts` (`:73-78`).
- *Archivos, pruebas, i18n:* reescribir el cuerpo de `DesignScreen.tsx`; un componente nuevo; `DesignExplore` pasa a secciones; **no** tocar `CabeceraDeSeccion` (la usan todas las secciones). Pruebas: `design-cierre` A1 y B5, `cajas-weeai` (orden de la pantalla), `aceptacion-pantallas` ACE-D-01; si se hace igual en Chef, `chef-weeai` (47). i18n: textos nuevos ×16.
- *Choca con:* `CLAUDE.md` §5; la decisión del usuario del 2026-09-15 «arriba de una sección no va nada más que esto» y «Sin adornos»; el cambio de `f28cee9`; y CL-25. Es la forma de la **D-1 B de Chef** («volver a hero + muro de sección»).
- *Riesgo:* alto en producto (se pierde la familia visual con Studio y Chef) y depende de imágenes que nadie ha entregado. *Esfuerzo:* **L**.

**D — Muro de sección de vuelta, o franja «De la comunidad» de solo lectura** (D-2 de Chef, opción B).
- *Cambia:* bajo «Mis creaciones», una franja de publicaciones recientes hechas con Weë Design (solo lectura: tocar abre la publicación), o un muro completo.
- *Lo que hay:* el filtro del Wäll por «Weë Design» (`utils/feedFilters.ts`), `paginaDeLaSeccion` (`utils/sectionFeed.ts`) y `PostCard`, que la especificación de Chef da por reutilizables.
- *Archivos, pruebas, i18n:* `DesignScreen.tsx` y un componente nuevo de franja; «De la comunidad» ×16. `design-cierre` B2 (`functions/test/design-cierre.test.mjs:114`) vigila que la pantalla no llame por su cuenta a Firebase, a un servicio ni a los Credits: los datos de la franja tendrían que pedirse dentro del componente nuevo y no en `DesignScreen.tsx` **[I]**.
- *Choca con:* «un solo muro» (`4ff271e`); «Comunidades, no secciones» (`CLAUDE.md:20`); Chef D-2 recomienda A, «sin muro propio». Una franja de lectura no es un muro de sección, pero duplica el filtro del Wäll.
- *Riesgo:* moderación (contenido de terceros dentro de una pantalla de creación), estado vacío y consulta por sección. *Esfuerzo:* **M** (franja), **L** (muro).

**E — Sustituir la pantalla por la referencia funcional** (es DEC-01 = C; ver su ficha).
- *Cambia:* el espacio de trabajo (barra de comandos, biblioteca, lienzo, inspector, trabajos, caja anclada) en lugar de esta pantalla; **12 capacidades funcionan, 7 son parciales y 75 se ven apagadas** [E].
- *Archivos, pruebas, i18n:* los de DEC-01 = C; `designRef.ts` ×16 sin revisión nativa.
- *Choca con:* `CLAUDE.md` §5 y la regla de simplicidad. *Riesgo:* alto. *Esfuerzo:* **L**.

| | A mantener | B Explora plegada | C hero + plegables | D franja o muro | E la referencia |
|---|---|---|---|---|---|
| Qué cambia para la persona | nada | las puertas se abren con un toque | hero arriba, todo plegado | una franja de comunidad | otro espacio de trabajo |
| Esfuerzo [I] | 0 | S | L | M (franja), L (muro) | L |
| Toca cercas `puente-pre-f1d` | no | no | no | no | no |
| Choca con decisiones tomadas | — | `CLAUDE.md` §5 | `CLAUDE.md` §5, 2026-09-15, `f28cee9`, CL-25 | `4ff271e`, «Comunidades, no secciones» | `CLAUDE.md` §5 y la regla de simplicidad |
| Reescribe pruebas | no | pocas | varias | pocas | muchas |
| Criterios de cierre que se re-basan | — | — | CL-01 a 05, 09, 24, 26 | — | CL-01 a 05, 09, 24, 26 |

### E.4 La decisión que se necesita para elegir

La pregunta exacta, con las alternativas (la respuesta es una letra, o dos si son B y D):

> **¿Qué ve la persona al entrar en Weë Design?**
> **A)** Lo de hoy: cabecera, caja, «Explora» con seis puertas, «Mis creaciones».
> **B)** Lo de hoy con «Explora» plegada al entrar.
> **C)** Un hero propio arriba y las puertas en secciones desplegables cerradas.
> **D)** A o B, más una franja «De la comunidad» de solo lectura (o el muro de sección de vuelta).
> **E)** El espacio de trabajo de la referencia funcional en lugar de esta pantalla (es DEC-01 = C).

**Recomendación [O]: A**, y que lo plegable, si se quiere, entre por **B** y más adelante. Razones: la estructura de hoy ya cumple lo que el cierre exige; C choca con tres decisiones escritas y no tiene imágenes; D reabre lo que el dueño cerró con «un solo muro»; E es DEC-01 = C y no tiene identidad visual. B es la única que se puede probar en un día.

**Qué NO se hará hasta que responda:**
- No se añade ningún hero, ninguna sección plegable, ninguna franja ni ningún muro, y no se monta la referencia.
- No se toca `components/design/DesignExplore.tsx` ni el orden de la pantalla (cabecera, caja, fichas, «Explora», «Mis creaciones»).
- El cierre sigue su curso con A: CL-26, la verificación visual, se hará sobre la pantalla de hoy.
- Con C o E, la lista de cierre se re-basa (CL-01 a CL-05, CL-09, CL-24 y CL-26).
- **No se borra `components/creator/SpecialistHero.tsx`** (CL-25, AUT-8) mientras C siga sobre la mesa: es lo único del repositorio que se parece a un hero de sección, y dos pruebas ya fijan que se queda «por decisión». La tarea NAV tiene el encargo de dejar el diff que lo borra en `docs/propuestas/cl25-borrar-specialisthero.diff` de su rama, **sin aplicarlo**; a la hora de ensamblar este documento: `r8/navegacion` (HEAD `605e1c0e`, 5 commit(s) sobre la base; `docs/propuestas/cl25-borrar-specialisthero.diff` ya existe en esa rama y se aplica en seco sobre esa rama, pero no sobre la base (presupone sus commits) (`git apply --check`); toca 5 archivo(s): `components/creator/SpecialistHero.tsx`, `docs/WEE-DESIGN-CIERRE.md`, `functions/test/_design-cierre.mjs`, `functions/test/catalogo-i18n.test.mjs`, `functions/test/cierre-cliente.test.mjs`).

### E.5 El enlace con Weë Chef (D-1 y D-2)

La especificación de Chef plantea **la misma pregunta** con dos opciones (`docs/WEE-CHEF-ESPECIFICACION.md:533-534`). Comparten cabecera y caja desde `f28cee9`. La correspondencia, sin que una respuesta obligue a la otra:

| Chef | Equivale en Design a | Qué recomiendan los documentos |
|---|---|---|
| **D-1 A** — mantener el lugar de trabajo y añadir lo nuevo plegado | **A** (mantener) y, para lo nuevo, **B/plegable** | A (especificación) |
| **D-1 B** — volver a hero + muro de sección | **C** (hero + plegables) y **D** (muro) | — (la especificación lo desaconseja) |
| **D-2 A** — sin muro propio; se publica en el Wäll (hoy) | no hacer **D** | A |
| **D-2 B** — franja «De la comunidad» de solo lectura | **D** (franja) | — |
| **D-2 C** — un tipo de publicación «receta» | sin equivalente en Design | — |

Si eliges **A en las dos**, el resultado es coherente: Weë AI conserva su lugar de trabajo común, sin hero ni muro por sección, y el Wäll sigue siendo el único muro.

---

## F. Otras autorizaciones y acciones del dueño que no son decisiones de Design

Lo que sigue **no** es una decisión de producto de Weë Design (no tiene ficha de doce campos), pero **bloquea o condiciona** el cierre o la integración, y solo el dueño puede darlo: un parche de dinero, la regla de cancelar, un diff de servidor y reglas, un color, una acción sobre datos reales, un canario, una revisión de idioma, un archivo que
decide la estructura y el texto de `CLAUDE.md` §5. Cada fila dice **qué se pide exactamente** y qué es un «sí». **Ninguna se ha pedido ni tomado** y nada de esto se aplica, se despliega ni se ejecuta sin su respuesta.

| Id | Qué se pide al dueño, exactamente | Qué desbloquea (estado hoy) | Riesgo y cercas | Detalle |
|---|---|---|---|---|
| **AUT-1** M-01 del Router | **Elegir una:** (a) **solo M-01** —aplicar `docs/propuestas/router-contabilidad.diff` (`functions/src/engine/router.ts`, +31 −4) y reanclar **E4 y H2** con `reanclaje-borrador-D.diff`—; (b) **M-01 con PR1–PR3** (los tres parches de rendimiento; los cuatro diffs y `reanclaje-borrador-D+I.diff`); (c) **no ahora**; (d) otra forma de arreglarlo. Si (a) o (b): registrar la prueba que reproduce el defecto como suite de la cadena | Que un fallo de Firestore **después** de que el proveedor devolvió (y cobró) un resultado deje de **descartarlo** (con un proveedor) o de **pagar dos veces** (con dos). Reproducido en R7-Design (55 ✘ de 86; no lo repetí); la tarea RTR de esta ronda tiene el encargo de verificarlo de forma independiente y su informe, cuando exista, dirá si lo confirma | Ruta feliz idéntica; **mueve exactamente E4 y H2** (`126\t25 → 157\t29`) y, con PR1–PR3, F4 y la comprobación 98 de `f1d-generacion`; **no cambia importes, reglas de Credits, contratos, proveedores ni modelos**. Lo que **no** arregla: la fila `aiGenerations` queda sin cerrar y el aviso no dispara alerta (RS1–RS10). No se despliega: desplegar es otra autorización | `docs/ROUTER-PARCHE-PARA-AUTORIZAR.md:15`, §2, §4 y §7.2; el informe corto que la tarea RTR tiene el encargo de dejar en `docs/ROUTER-M01-DECISION-BREVE.md` de su rama; a la hora de ensamblar este documento: `r8/router` (HEAD `c3f7f9a7`, sin commits sobre la base; `docs/ROUTER-M01-DECISION-BREVE.md` **todavía no existe en esa rama**) |
| **AUT-2** CL-19: cancelar | **Tres cosas, separables:** (i) ¿autorizas preparar, **adaptador a adaptador y con tu sí en cada uno**, que una cancelación o un tiempo agotado **pare de verdad al proveedor** (H0 #6)?; (ii) **la regla del dinero** al cancelar: reembolso total o cobrar lo entregado (el «cobro proporcional», H0 #7 y #8: «Es D9 (la política de Credits)»); (iii) ¿autorizas **reanclar F4** si el callable de cancelar vive en `creator/index.ts`? | CL-19 (abierto: hoy ni método del cliente ni callable del servidor) y ACE-D-13 («cancelar una creación en marcha»: NO SOPORTADO) | «Cambia los diez adaptadores; la orden fue no reescribir los Provider Adapters» (`docs/DECISIONES-PENDIENTES.md:59`); reglas de dinero (`docs/DECISIONES-PENDIENTES.md:66`); **mueve F4** (`157\t23`, `functions/test/puente-pre-f1d.test.mjs:787`) | `docs/DECISIONES-PENDIENTES.md` (§ «Cancelación, idempotencia y reconciliación…»), `docs/WEE-DESIGN-FLOWS.md` §4, `docs/WEE-DESIGN-CIERRE.md` (CL-19) |
| **AUT-3** B-12: `projectId` ajeno | **Autorizar el diff propuesto (no aplicado)** en `functions/src/creator/index.ts` (que `creatorChat` solo guarde el `projectId` si el proyecto es de quien lo manda) y en `firestore.rules` (que mover un trabajo a un proyecto exija que sea suyo); **y**, aparte, su despliegue | Hoy el servidor guarda cualquier `projectId` que le llegue (`functions/src/creator/index.ts:329`) y la regla de `creatorJobs` deja a su dueña poner cualquiera (`firestore.rules:1061-1066`). **[heredado de R7-Design: `weeai-cliente-cierre` B10; no lo repetí]**: el trabajo sigue siendo de quien lo crea y la lista de un proyecto filtra por dueño, así que **no entra en el proyecto de otra persona**; queda un trabajo con un proyecto que su dueña no puede leer, y la pantalla ya no se rompe con él. No es criterio de cierre | **Mueve F4** (`157\t23` → ~`163/23`); una lectura más por creación con proyecto; exige **desplegar reglas y Functions (producción)**; hace falta prueba de emulador dirigida de `creatorJobs` (ACE-D-17) | el diff y su impacto están en el informe de la tarea C de R7-Design (`RD7\C-cliente\informe.md` §6.2: la carpeta de coordinación de esa ronda, fuera del repositorio); `docs/WEE-DESIGN-CIERRE.md:137` |
| **AUT-4** F-12: el dorado como texto | **Decidir** si el sistema de diseño gana **un token de «texto sobre dorado»** (y su valor) o si bastan arreglos locales con los tokens que ya existen (`text`, `textSecondary`) donde el dorado no distingue nada. Medidos **como opciones, no como propuesta** **[E: cálculo mío con la fórmula de contraste de WCAG 2.x]**: `#9A6700` 4,87:1 sobre blanco y 4,62:1 sobre `#F8F9FA`; `#8A5A00` 5,93:1 y 5,62:1; `#A16A00` 4,59:1 y 4,35:1 (esta última **no** pasa sobre el gris) | `accentDark` (`#E5A020`) da **2,24:1 sobre blanco** (no pasa AA) y sigue siendo color de texto en decenas de sitios de la app; la cuenta exacta, uso a uso, la hace la tarea CON de esta ronda en `docs/WEE-ACCENTDARK-AUDITORIA.md` (**no está en esta base**); a la hora de ensamblar este documento: `r8/contraste` (HEAD `f9089d50`, 4 commit(s) sobre la base; `docs/WEE-ACCENTDARK-AUDITORIA.md` ya existe en esa rama). Según ese documento (en su rama, sin integrar; **no lo verifiqué**): 13 textos de Weë AI pasan al color del texto, 3 se dejan **PENDIENTES DE DECISIÓN** porque el dorado es su única señal de acción, y entre las opciones medidas la que pasa en los 31 usos es `#8A5A00`; elegirla sigue siendo tuyo. **No es criterio de cierre** (F-12 es una mejora opcional de accesibilidad) | Es **identidad visual** (el dorado #F5B731 es el color principal): cualquier valor nuevo se decide con diseño; tocar el tema (`ThemeContext.tsx`) afecta a toda la app. En el tema oscuro `accentDark` ya pasa (de 7,60:1 a 8,84:1 según el fondo **[E: cálculo mío con los colores de `contexts/ThemeContext.tsx`]**) | `docs/WEE-DESIGN-CIERRE.md:139` |
| **AUT-5** CL-21: reservas colgadas | **Ejecutar tú** `node ops/reconciliacion/reservas-colgadas.mjs [--horas 2] [--limite 500] [--project get-wee]` (**solo lectura, pero lee datos reales de producción** con tus credenciales; no devuelve nada, no escribe y no llama a ninguna IA) y **anotar el resultado** en `docs/WEE-DESIGN-CIERRE.md` §10 (fila de CL-21: «REGISTRADO» y la ruta del log). Esperado: 0 reservas colgadas; si hay, devolverlas es **otra** decisión (por `refundCredits`, idempotente) | CL-21 (manual); H0 #15b | Ninguno de escritura. El barrido solo cierra los trabajos del Core: los de los caminos legacy (`creatorRun`) solo se cierran si se repite la llamada (`ops/reconciliacion/reservas-colgadas.mjs:7`) | `ops/reconciliacion/reservas-colgadas.mjs` y `docs/DECISIONES-PENDIENTES.md` (H0 #15b) |
| **AUT-6** CL-22: el canario | **Autorizar un canario gobernado** del recorrido de imágenes en `get-wee` (lo ejecuta infraestructura con el runbook) **y fijar las tres cifras** que condicionan lanzar algo de imágenes: los Credits de bienvenida de las cuentas anónimas (con App Check apagado), el tope de gasto diario y el cupo del planificador (`docs/DESIGN.md:89-92`) | CL-22 (manual) y **la única prueba real** de D4, D5 y D6 (calidad del texto en la imagen, proporciones y referencias: UNKNOWN hasta entonces: ningún proveedor se llamó) | Producción y gasto real. «`main` no es producción»: `creatorRun` y `creatorChat` desplegados son anteriores a los arreglos de la auditoría H0; **este camino nunca ha corrido en producción** (`docs/DESIGN.md:84`) | `docs/DESIGN.md` §5 «Antes de lanzar», `ops/produccion.json` |
| **D8 y D9** (solo registro) | Una letra cada una (**A** y **A**, §B.3); la **C de D9 compromete trabajo** | CL-23 (espera una decisión) | Ninguno; D9-C: definir y construir una regla | Fichas de D8 y D9 (§B.3) |
| **AUT-7** danés | **Encargar la revisión nativa de las 13 cadenas danesas nuevas** de CL-10 (seis botones «🤷 Ved ikke» y siete piezas del plan; mirar en particular «vælger jeg selv, hvad vi skal designe» y «det, du har beskrevet») | Nada del cierre. El registro del danés dice **0 revisiones humanas vigentes** de 4245 textos (informe de la tarea S, R7-Design) | Bajo (el idioma, no el dinero) | `i18n/textos/da/servidor/plan/visual.ts:93` y `docs/I18N-REVISION.md` |
| **AUT-8** `SpecialistHero.tsx` | **Elegir qué se hace** con `components/creator/SpecialistHero.tsx`, lo único del repositorio que se parece a un hero de sección y que **no importa nadie [E]**: **(a) mantenerlo** y quitar ese resto del detector de CL-25 (la lista de cierre es tuya); **(b) borrarlo**; **(c) mantenerlo y dejar CL-25 abierto**. **Depende de la ESTRUCTURA** (§E): con C no conviene borrarlo. **Ojo: ya hay una decisión escrita en el otro sentido.** La comprobación 4 de `cierre-cliente` fija «se quedan, por decisión: HeroCarousel y SpecialistHero» (`functions/test/cierre-cliente.test.mjs:136`), con el comentario «Si se borran, que sea por decisión y no por arrastre.» (`functions/test/cierre-cliente.test.mjs:135`); y `catalogo-i18n` 38 y 39 leen el archivo (`functions/test/catalogo-i18n.test.mjs:335`; `functions/test/catalogo-i18n.test.mjs:342`) **[L]** | El tercer resto de CL-25 (abierto) | **(b) deshace esa decisión:** hay que cambiar además `cierre-cliente` 4 y `catalogo-i18n` 38 y 39, que fallarían o se caerían sin el archivo **[L: no lo ejecuté]**. La tarea NAV tiene el encargo de dejar el diff que lo borra en `docs/propuestas/cl25-borrar-specialisthero.diff`, comprobado con `git apply --check` y **sin aplicar**; a la hora de ensamblar este documento: `r8/navegacion` (HEAD `605e1c0e`, 5 commit(s) sobre la base; `docs/propuestas/cl25-borrar-specialisthero.diff` ya existe en esa rama y se aplica en seco sobre esa rama, pero no sobre la base (presupone sus commits) (`git apply --check`); toca 5 archivo(s): `components/creator/SpecialistHero.tsx`, `docs/WEE-DESIGN-CIERRE.md`, `functions/test/_design-cierre.mjs`, `functions/test/catalogo-i18n.test.mjs`, `functions/test/cierre-cliente.test.mjs`) | §E.4 |
| **AUT-9** texto de `CLAUDE.md` §5 | **Corregir tú el texto de `CLAUDE.md` §5** —«esas interfaces son la referencia visual definitiva»— para que no llame «definitiva» a `wee-chef.jpg` (ni a `wee-design.jpg`, que es una portada), como propone la recomendación de Chef D-1 | Coherencia documental; no desbloquea código | `CLAUDE.md` es un archivo del dueño: **esta tarea no lo toca** (ni `.claude/`, hooks o permisos) | `docs/WEE-CHEF-ESPECIFICACION.md:42` y Chef D-1 (§B.4) |
| **AUT-10** H-EMU-1: el cupo del día en un fallo | **Decidir si un «Crear» rechazado (saldo corto) o un trabajo que falla y se reembolsa debe devolver el hueco del cupo diario** y, si sí, **autorizar el diff propuesto (no aplicado)** en `functions/src/creator/index.ts`: reservar el cupo con el `jobId` como operación y liberarlo en el `catch` del plan y cuando falle `holdCredits` (como ya hace el mundo 3D, `functions/src/creator/mundo.ts:352`) | Nada del cierre. Hoy `creatorRun` reserva el cupo antes de reservar los Credits (`functions/src/creator/index.ts:612`) y ninguna rama de error lo devuelve. Reproducido por la tarea EMU de esta ronda en emulador (H-EMU-1, `RD8\EMU-emulador\informe.md` §9) **[heredado de EMU; no lo repetí]** | **Mueve F4** (`creatorRun`, `functions/test/puente-pre-f1d.test.mjs:787`); cambia la semántica de la doble pulsación en el cupo (pasaría a contarse por operación); no toca Credits ni precios | `RD8\EMU-emulador\informe.md` §9 (fuera del repositorio) |

**Qué es un «sí» en cada una.** **AUT-1:** «solo M-01», «con PR1–PR3» o «no»: la elección decide qué reanclaje se usa (los de D y D+I **no se apilan**). **AUT-2:** tres respuestas independientes; sin (ii) nada se programa, porque cambiar qué se cobra al cancelar es el protocolo financiero. **AUT-3:** el diff y, por separado, su despliegue. **AUT-4:** «token nuevo con este valor», «arreglos locales con lo que hay» o «no ahora». **AUT-5:** ejecutarlo y anotar el log. **AUT-6:** el canario y las tres cifras (puedes contestar solo las cifras).
**AUT-7:** encargarlo o no. **AUT-8:** «mantener» (a o c; lo natural con C) o «borrar» (b; con A, B, D o E, y cambiando también las dos suites que lo fijan). **AUT-9:** corregirlo tú o decir que no. **AUT-10:** «sí, que un fallo devuelva el hueco» (y el diff, con su reanclaje de F4), «no» o «después».

---

## Anexo A — Qué cerca de integridad mueve cada archivo

**Medido el 2026-10-11 en R7-Design [E]** en un worktree limpio: se añadió **una línea de comentario** al final de cada archivo, se ejecutó `node functions/test/puente-pre-f1d.test.mjs` y se restauró con `git checkout -- <archivo>`; `git status` quedó vacío tras cada prueba. Línea base: **42 de 42**. **Sigue vigente [E hoy]:** de los doce archivos medidos, **solo `templates.ts` cambió desde entonces** (`git diff a64ff24 c3f7f9a7` solo toca ese entre ellos) y `puente-pre-f1d` da **42/42** con el cambio. Esta tarea **no repitió las mutaciones** (no cambia código ni siquiera de forma temporal). **No se reancla ninguna:** si una opción exige tocar uno de estos archivos, se entrega el diff y decide el dueño.

| Archivo | Cerca de `puente-pre-f1d` que se mueve | Qué fija esa cerca |
|---|---|---|
| `functions/src/creator/templates.ts` | **ninguna** | está nombrado en F1 (`functions/test/puente-pre-f1d.test.mjs:596`) pero ninguna cerca fija su tamaño |
| `functions/src/creator/inputs.ts`, `prompts.ts`, `types.ts` | **ninguna** | igual |
| `functions/src/creator/planner.ts` | F1 | el conjunto de archivos de `functions/src` tocados desde `b023f24`, por nombre (`functions/test/puente-pre-f1d.test.mjs:715`) |
| `functions/src/creator/index.ts` | **F4** | tamaño exacto de `creatorRun` y de `creator/credits.ts` (`functions/test/puente-pre-f1d.test.mjs:778`) |
| `functions/src/engine/imageModels.ts`, `engine/resolutionPolicy.ts` | **E4 y F1** | tamaño exacto de cada archivo de `engine/` y el conjunto de nombres (`functions/test/puente-pre-f1d.test.mjs:524`) |
| `functions/src/engine/router.ts` | **E4 y H2** | M-01: `126\t25 → 157\t29` (AUT-1); H2 en `functions/test/video-asincrono.test.mjs` |
| `functions/src/credits/aiPricing.ts` | F1 y **F2** | el Credit Engine, el Router y `creditCosts`, sin tocar (`functions/test/puente-pre-f1d.test.mjs:739`) |
| `functions/src/credits/creditCosts.ts` | **F2** | igual |
| `functions/src/content/versiones.ts`, `functions/src/core/content/linaje.ts` | **F3** | tamaño exacto de `content/` y del núcleo (`functions/test/puente-pre-f1d.test.mjs:764`) |
| **cualquier archivo de `functions/src/core/`** (p. ej. `core/project.ts`, `core/registry/capabilities.ts`) | **F3** **[L]** | `git diff --numstat -- functions/src/core` debe ser exactamente la lista autorizada: **D8-B** y **Chef D-3 B** tocan este grupo |
| **un archivo nuevo en `functions/src`** | **F1** **[L]** | lista exacta por nombre: «nada nuevo en el servidor sin reanclar» (`WEE-CHEF-ESPECIFICACION.md` §4.2) |

Lo que esto significa para las opciones: **D4-A, D6-A y D3 (sin linaje) no mueven ninguna cerca**; **D5** y **D4-B/C** (si tocan la política de resolución o `TEXT_KINDS`) mueven **E4 y F1**; **D3 con linaje** mueve **F4 o F3**; un cambio de precios movería **F2**; **D8-B** mueve **F3 y F1**; **Chef D-3 B** mueve **F3**. Las suites de cliente tienen sus propias comprobaciones de estructura (Anexo B7), pero no son cercas de integridad.

## Anexo B — Evidencia ejecutada

Todo lo de este anexo se ejecutó **en esta rama, el 2026-10-12, sin tocar el repositorio** (`git status` vacío antes y después). Los guiones están en la carpeta de la ronda (`RD8\DEC-decisiones\herramientas\`, fuera del repositorio) y solo leen; los logs, en `RD8\DEC-decisiones\logs\`.

### B1 · El corredor, sin tocar nada (`node functions/test/_design-cierre.mjs`)

**11 cumplidos** (CL-06, 07, 08, 10, 11, 12, 17, 20, 24, 27, 28) · **5 abiertos** (CL-03, 04, 18, 19, 25) · **9 esperan una decisión** (CL-01, 02, 05, 09, 13, 14, 15, 16, 23) · **3 manuales** (CL-21, 22, 26). Coincide con `docs/WEE-DESIGN-CIERRE.md:15`. Sale con 1, como siempre (no está en la cadena).

### B2 · La simulación del registro

Es la tabla de §D.2: `simular-registro.mjs` (R7-Design) parchea `fs.readFileSync` en memoria para que el corredor lea `DESIGN.md` y `WEE-DESIGN-UIUX-DECISIONS.md` con la marca añadida a las filas elegidas; el disco no cambia. La orquesta `simular-matriz.mjs` (21 escenarios, un proceso por escenario).

### B3 · Las puertas frente a la plantilla (`sondeo-puertas-vs-plantilla.mjs`)

Qué intención de `TEMPLATES.design` (deductor de palabras clave **sin** planificador de IA) saca el servidor de la frase que escribe la pantalla al elegir cada punto de partida.

| Puerta | Frases de partida (es) | Deducidas | Sin deducir |
|---|---|---|---|
| Interiores | Un salón · Una cocina · Un dormitorio · Un baño · Remodelar un espacio | **0 de 5** | las cinco (cocina, dormitorio, baño y «remodelar» sí dan señal a Hogar & Diseño) |
| Arquitectura | Una casa moderna · Una fachada · Un edificio · Una cabaña · Una ampliación | 3 de 5 (lugar) | Una cabaña · Una ampliación |
| Producto | Un objeto cotidiano · Un envase · Un accesorio · Un aparato · Una joya | 1 de 5 (producto) | Un objeto cotidiano · Un accesorio · Un aparato · Una joya |
| Mobiliario | Una silla · Un sofá · Una mesa · Una estantería · Una lámpara | 3 de 5 (producto) | Un sofá · Una estantería |
| Vehículos | Un auto · Una moto · Un barco o un yate · Un avión · Un dron | 4 de 5 (vehículo o máquina) | Un barco o un yate |
| Renders y 3D | Un render realista · Una maqueta 3D · Una vista aérea · Un recorrido · Un antes y después | **0 de 5** | las cinco |
| Espacios (solo en «Ver todas») | Un jardín · Una terraza · Un local comercial · Un restaurante · Un espacio público | 2 de 5 (lugar) | Un local comercial · Un restaurante · Un espacio público |
| **Total** | 35 | **13** (es) · **3** (en: «Packaging», «A motorbike», «A drone») | 22 (es) · 32 (en) |

Coincide con `docs/WEE-ACEPTACION.md` (`:76`) y **no cambió con CL-10 ni CL-11**: lo que sí cambió es lo que pasa con las 22 que no se deducen —ahora caen en «Cuéntame qué necesitas…» con **siete** botones y «🤷 No sé»—. **UNKNOWN:** con el planificador de IA (`llmPlanner`) el servidor podría deducir más; no se midió (sin proveedores).

### B4 · Lo que el plan de `design` arma hoy (`sondeo-d4-niveles.mjs`)

| Rama | Capacidad del paso de imagen | `kind` | `aspectRatio` |
|---|---|---|---|
| Logo | `image.generate` | `logo` | ninguno |
| Afiche (feed, historia, imprimir) | `image.generate` | `design` | **ninguno** |
| Producto, vehículo, lugar, personaje | `image.generate` | `design` | ninguno |

| `kind` | ¿Pide un modelo que escriba texto? | Nivel |
|---|---|---|
| `design` | no | estándar |
| `logo` | sí | alto |
| `poster` | sí | alto |
| `cover` | sí | alto |

Con `kind: 'logo'` el motor elige `gemini-3.1-flash-image` (nivel alto); con `kind: 'poster'` también; con `kind: 'design'`, `flux-2-klein-9b` (estándar). Y `IMAGE_INPUT_CAPS` = vision.describe, image.edit, image.background_remove, image.object_remove, image.identity_edit, image.space_restyle, image.upscale, video.image_to_video: **ni `image.reference` ni `image.generate`**.

### B5 · Modelos de imagen y proporciones verificadas (`sondeo-d5-proporciones.mjs`)

| Modelo | Nivel | ¿Escribe texto? | Rejilla | 1:1 | 4:5 | 9:16 | 16:9 | 3:4 |
|---|---|---|---|---|---|---|---|---|
| `flux-2-klein-9b` | estándar | no | continua | 1024×1024 | 912×1136 | 768×1360 | 1360×768 | 880×1168 |
| `gemini-3.1-flash-lite-image` | estándar | no | discreta, solo cuadrada | 1024×1024 | **no puedo** | **no puedo** | **no puedo** | **no puedo** |
| `seedream-4-0-250828` | estándar | no | continua | 1024×1024 | 912×1136 | 768×1360 | 1360×768 | 880×1168 |
| `seedream-5-0-lite-260128` | estándar | no | continua | 1920×1920 | 1728×2160 | 1440×2560 | 2560×1440 | 1664×2224 |
| `gemini-3.1-flash-image` | alto | **sí** | discreta, solo cuadrada | 2048×2048 | **no puedo** | **no puedo** | **no puedo** | **no puedo** |
| `flux-2-pro` | alto | no | continua | 1776×1776 | 1584×1984 | 1328×2368 | 2368×1328 | 1536×2048 |
| `gemini-3-pro-image` | máximo | **sí** | discreta, solo cuadrada | 4096×4096 | **no puedo** | **no puedo** | **no puedo** | **no puedo** |

(«no puedo» = `resolveForModel` devuelve `null`: «Sus otras proporciones existen, pero sus píxeles exactos NO están verificados», `engine/resolutionPolicy.ts`.) Las proporciones con nombre son siete y no incluyen 4:5.

### B6 · Qué hay dentro de la referencia funcional (`sondeo-referencia-conteos.mjs`)

Registro `CAPACIDADES_DE_DESIGN`: **107** capacidades; **94** de Weë Design y 13 «fuera». De las 94: **12 existen** (C07 rediseñar un espacio, C29 antes y después, C30 descargar, C33 publicar, C55 sugerencias, C56 descubrir capacidades, C57 confirmar el coste, C58 explorar materiales, C63 filtrar, C64 crear proyecto, C65 cambiar de proyecto, C66 historial), **7 son parciales** (C01 concepto, C10 vídeo de presentación, C11 cambiar con palabras, C12 otra versión, C34 guardar en proyecto, C54 agente, C59 linaje) y **75 están apagadas** (11 piden servidor, 21 proveedor, 23 candidatas nuevas, 10 en revisión, 10 planeadas).
Las dos puertas están cerradas: `DESIGN_REFERENCIA_EN_LA_APP = false` y `ELEGIR_QUIEN_LO_HACE_EN_LA_APP = false`. Destinos de entrega: siete, que remiten a `exportFor` (`BACKEND_REQUIRED`), `print3d` y `photoRender` (`PROVIDER_REQUIRED`) y `externalTools` (`REVIEW_REQUIRED`): **ninguno se sirve hoy**.

### B7 · Líneas base de las suites de cliente [E hoy]

| Suite | Resultado | Duración |
|---|---|---|
| `design-cierre` | 37/37 | 1,8 s |
| `cajas-weeai` | 52/52 | 0,1 s |
| `ajustes-weeai` | 50/50 | 0,4 s |
| `credits-weeai` | 37/37 | 0,1 s |
| `navegacion-enlaces` | 46/46 | 0,7 s |
| `aceptacion-pantallas` | 67 y 1 hueco conocido (ACE-D-06) | 3,8 s |
| `aceptacion-conversacion` | 31 y 4 huecos conocidos | 2,1 s |
| `puente-pre-f1d` | 42/42 | 3,4 s |
| `chef-weeai` | 47/47 | 1,1 s |
| `chef-caracterizacion` | 42/42 | 1,4 s |

### B8 · Hogar & Diseño no tiene puerta visible, y lo que ningún archivo importa

Búsqueda de `experienceId: 'home'`, `opens: 'home'` y `'home'` como destino en `screens/`, `components/`, `utils/` y `navigation/`: solo `utils/designReferencia.ts` (`:533`: la referencia cerrada) y el propio `CreatorFlowScreen`. El menú la oculta (`constants/weeExperiences.ts:199`) y su fila de `specialists.ts` no se pinta (`screens/SpecialistScreen.tsx:117`). **Ningún archivo importa `components/HeroCarousel.tsx` ni `components/creator/SpecialistHero.tsx`** (cada uno solo se nombra a sí mismo).

## Anexo C — Lo que las decisiones NO cierran

| Criterio | Quién lo cierra | Qué necesita del dueño |
|---|---|---|
| CL-03 (abierto) | el puente P1 (rama aislada, no integrada) | presupone D1, D2 y D7 |
| CL-04 (abierto) | «Mis creaciones» de verdad (tarea PAN, rama aislada) | nada de producto; el destino de «Ver todas →» (F-01) es una decisión de producto compartida con Studio que **no está entre las catorce** |
| CL-18 (abierto) | la suite de emulador `design-recorrido` (tarea EMU, rama aislada) | nada de producto (infraestructura: emuladores, candado pesado) |
| **CL-19** (abierto) | servidor + dueño | **AUT-2** |
| **CL-21** (manual) | el dueño | **AUT-5** |
| **CL-22** (manual) | dueño + infraestructura | **AUT-6** |
| CL-25 (abierto) | limpieza de restos (tarea NAV, rama aislada) | **AUT-8** (`SpecialistHero.tsx`, depende de la ESTRUCTURA) |
| CL-26 (manual) | quien tenga la web con emuladores | nada; manual |
| CL-27, CL-28 (cumplido, cumplido) | registrados sobre `78fd958` (la integración de R7-Design); se repiten sobre la rama que se integre | nada |
| Vecinas fuera de las catorce | — | **DEC-12** (Design → Studio, necesaria para D7-A «Un recorrido»), **DEC-18** (reintentos gratis, toca a D3), **DEC-20** y **DEC-21** (conversor y complementos, tocan a DEC-06), **DEC-24** (fotos de personas, toca a D6), Chef **D-2, D-4…D-12** |

## Anexo D — Cómo se registra una respuesta, y nombres que chocan

**Cómo se registra.** Lo dice el propio repositorio (`docs/DESIGN.md:10` y `docs/WEE-DESIGN-CIERRE.md:317-320`); lo escribe quien coordina o el dueño, **no** esta tarea:

> Para registrar una decisión de §4, escribe `**DECIDIDA (fecha): opción**` en su fila: el corredor la lee.

La fila es la de la tabla de `docs/DESIGN.md` §4 (D1–D9) o la de `docs/WEE-DESIGN-UIUX-DECISIONS.md` §2 (DEC-xx). Una suite vigila que cada fila exista con su nombre (`functions/test/design-cierre.test.mjs:225`): **no se renombran las filas**. Las decisiones de **Chef** no las lee ningún corredor: su fila está en `docs/WEE-CHEF-ESPECIFICACION.md` §8.2 y la convención de registro de esas es de quien las lleve. La **estructura visual** de Design y las **autorizaciones** de §F **no tienen fila** donde registrarse: la respuesta queda en la conversación, o se anota en `docs/WEE-DESIGN-CIERRE.md`.

**Nombres que chocan** (para contestar sin ambigüedad, di siempre «Design D3», «Chef D-1»…):

- **D1–D9** de Weë Design (`DESIGN.md` §4) ≠ el «cobro proporcional (D9)» del Algorithm Engine (`docs/DECISIONES-PENDIENTES.md:17`) ≠ el **D1** de la matriz de coordinación de R7 (autorizar y reanclar E4 y H2) ≠ **D-1…D-12** de Weë Chef (`WEE-CHEF-ESPECIFICACION.md` §8.2) ≠ **M-01·D1…D4** del Router (`ROUTER-PARCHE-PARA-AUTORIZAR.md` §7.2).
- **DEC-06** (los destinos de exportación; alternativas **1·2·3**) ≠ **DEC-06a** (la decisión ya tomada: la lista de destinos, `WEE-DESIGN-UIUX-DECISIONS.md` §1).
- **DEC-03** de Weë Design (la caja de la referencia va a `CreatorFlow`) ≠ **DEC-03** del Content Core («Guardar como versión», `functions/src/content/versiones.ts`).
- **Hogar & Diseño** es la experiencia `home`; «Weë Home» ya no se lee en pantalla (`constants/weeExperiences.ts:393`).

## Anexo E — Lo que no pude verificar

- **El aspecto en pantalla:** no se arrancó la web (pesada, y esta tarea no lleva el candado de los emuladores): CL-26 sigue manual. No describo colores, tamaños ni espacios: describo estructura y textos.
- **El comportamiento de Gemini** en proporciones distintas de 1:1, y el de `image.reference` con una foto de estilo: no se llamó a ningún proveedor.
- **Cuántas frases de partida deduce el planificador con IA** (solo se midió el de plantillas).
- **El precio en Credits** de un afiche en nivel alto o de una edición: lo calcula `creatorQuote`; no se copia ninguna cifra.
- **Si la referencia funcional cubre CL-01, 02, 03, 04 y 09 ejecutándola con la puerta abierta:** lo leí, no lo ejecuté.
- **Si la dirección de entrega de un resultado real** (para editar la propuesta elegida, D3) **tiene la forma que acepta el cliente sin volver a subirla:** leído en el código, no ejecutado con un resultado real.
- **El estado de las ramas aisladas de esta ronda** (puente, «Mis creaciones», navegación, emulador, router, contraste, Chef): se lee de `git` a la hora de ensamblar el documento; **no he revisado su contenido** más allá de sus encargos y, para el puente, del documento `WEE-DESIGN-PUENTE.md` de `r7d/puente`.
- **El coste S, M y L** es mi estimación, no una medida.

---

## G. Cómo se verificó este documento

**Mecánico (las citas y los literales no se escribieron a mano).** El documento se **ensambla** con un guion (`ensamblar.mjs`, fuera del repositorio) a partir de 9 partes de texto. Cada cita `archivo:línea` es una marca que se **resuelve contra el árbol de esta rama** al ensamblar (una expresión que busca la línea; **si no la encuentra, el ensamblado falla**), y la pregunta, las alternativas y la columna «Recomendado» de cada decisión se **extraen de las tablas fuente** con otro guion (`extraer-literales.mjs`: `docs/DESIGN.md` §4, `docs/WEE-DESIGN-UIUX-DECISIONS.md` §2 y §1 para DEC-06a, y `docs/WEE-CHEF-ESPECIFICACION.md` §8.2). Los estados de «hoy» de cada criterio salen de evaluar el corredor **sin parchearlo** (`estado-criterios.mjs`), y la simulación del registro, de `simular-registro.mjs` de R7-Design (en memoria).
Esta ejecución resolvió **280 citas y literales**. **Control negativo [E]:** un marcador con una expresión que no existe hace que el ensamblado termine con error y no escriba el documento (`logs/control-ensamblado/`).

**Comprobaciones sobre el documento ya ensamblado** (todas ligeras, todas contra esta rama; salidas en `RD8\DEC-decisiones\logs\`):

| Comprobación | Resultado |
|---|---|
| `citas-verificar.mjs` (el de R7-Design: existe el archivo y la línea está en rango) | **275 citas, 275 válidas, 0 de archivo inexistente, 0 fuera de rango** |
| Que cada cita literal de pregunta (16) y cada bloque de alternativas (14) **esté de verdad** en su línea de origen (`verificar-doc.mjs`) | todas |
| La marca de registro que lee el corredor (en cualquiera de sus formas) solo aparece en la cita literal del formato de registro (Anexo D); **ninguna decisión está registrada ni inferida** | una sola línea |
| Tablas con las mismas columnas que su cabecera; bloques de código balanceados; sin retornos de carro; sin marcas sin resolver; enlaces relativos existentes | todo en orden |
| Ninguna cifra de Credits escrita como precio (CLAUDE.md §7) | ninguna |
| Las dieciséis decisiones tienen su ficha con los **doce campos** | sí |
| `node functions/test/_design-cierre.mjs` antes y después de añadir el documento | **11 cumplidos · 5 abiertos · 9 esperan una decisión · 3 manuales**, idéntico |
| `design-cierre`, `cajas-weeai`, `ajustes-weeai`, `credits-weeai`, `navegacion-enlaces`, `aceptacion-pantallas`, `aceptacion-conversacion`, `puente-pre-f1d`, `chef-weeai`, `chef-caracterizacion` | en verde (§B7 del Anexo B) |
| `node scripts/escaneo-secretos.mjs` · `node functions/test/ci-workflow.test.mjs` antes del commit | ningún secreto en 2069 archivos versionados (6 admitidos con su porqué) · salida 0, 41 de 41 |

**No ejecutado, y por qué.** La cadena entera (`_cadena.mjs`) y `tsc --noEmit`: son pesadas y **esta tarea no cambia ningún código ni ninguna prueba** (solo este documento). Ningún emulador, ninguna web, ningún proveedor, ninguna lectura de producción. Las mutaciones de cercas (Anexo A) no se repitieron: se **heredan** de R7-Design con la prueba de que los archivos medidos no cambiaron.

**Lo que esta verificación no puede garantizar:** que una afirmación **de producto** sea la que el dueño quiere (eso es lo que se le pregunta), que el coste S, M o L sea el real (es una estimación), ni que una rama aislada que no he leído a fondo haga lo que su encargo dice (Anexo E).
