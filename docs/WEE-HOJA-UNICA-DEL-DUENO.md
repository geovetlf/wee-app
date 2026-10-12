# Weë — la hoja única del dueño (R9)

> **Estado: PREPARADO para que lo responda el dueño. Todas las preguntas de esta hoja están PENDIENTES DE DECISIÓN; ninguna está aprobada ni registrada, y
> esta hoja no registra nada.** Ronda R9 (2026-10-12), tarea DEC3, rama `r9/decisiones` desde `9365153a`. Solo escribe en `docs/`.

**Qué es.** Una sola hoja para contestar **en una sesión** todo lo que hoy espera al dueño en cinco frentes: (1) producto de Weë Design, (2) lo visual,
(3) Weë Chef, (4) las autorizaciones técnicas que mueven cercas de integridad y (5) la recuperación tras la limpieza de temporales de Windows. Al final, (6) las
otras autorizaciones de la v2 que siguen abiertas. Parte de [WEE-DESIGN-DECISIONES-DEL-DUENO.md](WEE-DESIGN-DECISIONES-DEL-DUENO.md) (la «v2» de R8), que se
**verificó contra esta base** y se corrigió donde estaba desfasada (nota R9 al principio de la v2; §8 de esta hoja). Para el porqué largo de una decisión de Design,
la ficha de la v2 sigue valiendo: aquí está lo necesario para contestar.

**Cómo se lee.** Cada ficha tiene diez campos: **identificador · problema · opciones literales** (copiadas del documento fuente, con `archivo:línea`; si la fuente no
trae letras, se dice y no se inventan) **· consecuencias funcionales · consecuencias técnicas · riesgos y costes · dependencias · recomendación técnica · si se
aplaza · respuesta del dueño**. Marcas: **[L]** leído · **[E]** ejecutado en esta rama hoy · **[I]** inferido · **[O]** opinión (las recomendaciones lo son
todas). **Coste** en la escala de la v2: **S** ≤ 1 día · **M** 2–4 días · **L** una semana o más, o necesita autorización de una cerca o un proveedor
(estimación [I]). **Ningún precio en Credits**: los calcula `creatorQuote` (CLAUDE.md §7).

**Nombres que chocan** (di siempre el prefijo): Design **D1–D9** ≠ Chef **D-1…D-12** ≠ Router **M-01·D1…D4** ≠ el «cobro proporcional (D9)» del Algorithm Engine
(`docs/DECISIONES-PENDIENTES.md:17`). **DEC-06** (destinos de exportación) ≠ **DEC-06a** (una decisión ya tomada).

---

## 0. El estado de hoy en una pantalla (`9365153a`)

| Qué | Hoy | Fuente |
|---|---|---|
| Corredor de cierre de Design | **14 cumplidos · 3 abiertos · 9 esperan al dueño · 2 manuales** [E] | `node functions/test/_design-cierre.mjs` |
| Esperan al dueño | CL-01, 02, 05, 09, 13, 14, 15, 16, 23 | ídem |
| Abiertos | CL-03 (lo cierra el puente), CL-19 (cancelar: §4 T-3), CL-25 (`SpecialistHero.tsx`: §2 V-4) | ídem |
| Manuales | CL-21 (reservas colgadas: §6), CL-22 (canario: §6) | ídem |
| Si se registran las trece decisiones de Design (§1) | **16 · 10 · 0 · 2**: se cierran CL-05 y CL-23; CL-01, 02, 09, 13, 14, 15 y 16 pasan de «esperan» a «abierto» (trabajo) [E] | `simular-registro.mjs` (R7-Design), en memoria; el disco no cambia |
| Si se registran las once sin D8 ni D9 | 15 · 10 · 1 · 2: CL-23 sigue esperando (pide trece de trece) [E] | ídem |
| Integrado en la base desde la v2 | «Mis creaciones» real (CL-04), la suite de emulador (CL-18), la verificación visual (CL-26), el proyecto en las entradas (CL-20), la limpieza de CL-25 salvo `SpecialistHero`, los 13 arreglos de contraste, CHEF-01, CHEF-04 y la parte pura de CHEF-02 [E: `git diff --stat c3f7f9a7 9365153a`] | — |
| **No** integrado | el puente «Crear» → `CreatorFlow`: «Crear» sigue siendo un temporizador (`screens/DesignScreen.tsx:129`) [E] | — |

---

## 1. Tabla-índice

| # | Id | Sección | Pregunta (resumida) | Opciones | Recomendación [O] | Coste [I] | Desbloquea o mueve |
|---|---|---|---|---|---|---|---|
| 1 | **DEC-01** | 1 Design | ¿La referencia funcional sustituye algún día a `DesignScreen`? | A · B · C | **B** | 0 ahora | CL-23; con C re-basa 8 criterios |
| 2 | **D1** | 1 Design | ¿Qué es Weë Design? | A · B · C | **A** (sin puertas gráficas nuevas) | M | CL-05 (con D7), CL-01 (con D2 y D7) |
| 3 | **D2** | 1 Design | Entregables de la primera versión | A · B · C | **B** | S sobre el puente | CL-02 (solo B lo cumple), CL-01 |
| 4 | **D7** | 1 Design | Puertas sin capacidad detrás | A · B · C | **A condicionada** | M | CL-05, CL-01 |
| 5 | **D6** | 1 Design | Referencias que sube la persona | A · B · C | **A, con C como parada** | M–L (C: S–M) | CL-09, CL-16 |
| 6 | **D4** | 1 Design | Texto dentro de la imagen y nivel de los logos | A · B · C | **A** | S–M | CL-15 |
| 7 | **D5** | 1 Design | Formatos | A · B · C | **A**, empezando por 1:1, 9:16 y 16:9 | M | CL-14 |
| 8 | **D3** | 1 Design | Editar después de generar | A · B · C | **C en dos escalones** | M (esc. 1) · L (linaje) | CL-13 |
| 9 | **DEC-02** | 1 Design | Con la puerta abierta, ¿por dónde se entra? | A · B · C | **B**, como registro sin obra | 0 ahora | CL-23 |
| 10 | **DEC-05** | 1 Design | ¿Se oculta la barra global en el teléfono dentro del workspace? | A · B | **A** | 0 | CL-23 |
| 11 | **DEC-06** | 1 Design | Los destinos de exportación | 1 · 2 · 3 (la fuente no trae letras) | **1** | 0 | CL-23 |
| 12 | **D8** | 1 Design | Memoria de marca o brand kit | A · B · C | **A** | 0 | CL-23 |
| 13 | **D9** | 1 Design | Uso comercial y moderación propia | A · B · C | **A** (+ C solo si se quiere la obra) | 0 (C: M) | CL-23 |
| 13a–e | aclaraciones | 1 Design | D3 linaje · D6 parada · DEC-12 · DEC-24 · DEC-18 | sí/no · A/B | ver fichas | — | condicionan D3, D6 y D7 |
| 14 | **V-1** ESTRUCTURA | 2 Visual | ¿Qué ve la persona al entrar en Weë Design? | A · B · C · D · E | **A** | 0 (B: S) | CL-25 (vía V-4); con C/E re-basa criterios |
| 15 | **V-2** token | 2 Visual | ¿Token de «texto sobre dorado», y con qué valor? | A · B · C | **A**, valor `#8A6013` o `#8A5A00` | S | F-12 (no es criterio de cierre) |
| 16 | **V-3** tres textos | 2 Visual | Los 3 textos dorados que no pasan AA | token · subrayar · dejarlos | lo que diga V-2 | S | — |
| 17 | **V-4** `SpecialistHero` | 2 Visual | ¿Se mantiene o se borra `SpecialistHero.tsx`? | (a) · (b) · (c) | **(b) borrar** si V-1 = A | S | CL-25 |
| 18 | **Chef D-1** | 3 Chef | Estructura visual de Chef | A · B | **A** | 0 | CHEF-02 (pantalla) y CHEF-03b |
| 19 | **Chef D-3** | 3 Chef | Información nutricional | A · B · C | **A con condición** (retirar «alérgenos») | S | `nutrition` de CHEF-03a, tarjeta de CHEF-03b |
| 20 | **C-3** CHEF-01 | 3 Chef | Revisar el texto de la instrucción de la lista de la compra | aprobar · cambiar (la fuente no trae letras) | aprobarlo como provisional | 0 | cierra la revisión pendiente de CHEF-01 |
| 21 | **C-4** caja de 300 | 3 Chef | Qué hacer con el recorte a 300 caracteres | 3 salidas literales | **que la caja avise** | S | la caja de CHEF-02 |
| 22 | **C-5** «Para la semana» | 3 Chef | ¿«Para la semana» y «De un menú» pasan a lista o siguen en menú? | 2 salidas literales | **siguen en menú** | 0 | CHEF-03a/03b |
| 23 | **T-1** Router M-01 | 4 Cercas | ¿Se aplica el parche de contabilidad del Router? | A · B · C | **A** + la alerta (M-01·D2 d) | S | mueve E4 y H2 |
| 24 | **T-2** H-EMU-1 | 4 Cercas | ¿Un intento fallido devuelve el cupo diario? | sí · no · después | **después**, con el diff completado | S | mueve F4 |
| 25 | **T-3** CL-19 | 4 Cercas | Cancelar: parar al proveedor, regla del dinero, F4 | (i) · (ii) · (iii) | (i) sí · (ii) reembolso total · (iii) sí | L | CL-19; mueve F4 y los adaptadores |
| 26 | **S-1** contención | 5 Sistema | Contener la limpieza de temporales de Windows | (a) · (b) · (c) | **(a) y (b) ya**; (c) completarla | 0 (lo hace el dueño) | protege lo no commiteado |
| 27 | **S-2** `scratchpad\fil` | 5 Sistema | Recuperar el worktree del filipino | pasos 1–5 | **1 y 2 ya**; 3–5 con las opciones de INC2 | M–L | el trabajo filipino perdido |
| 28 | **S-3** otros worktrees | 5 Sistema | Los otros 15 worktrees con borrados | restaurar · eliminar y recrear | según uso | S | limpieza |
| 29 | **O-1…O-5** | 6 Otras | B-12, CL-21, CL-22, danés, `CLAUDE.md` §5 | sí · no · después | ver §6 | — | — |

---

## 2. La hoja de respuestas en bloque (copia, rellena y devuelve)

Un hueco en blanco = «todavía no contesto». «Después» es una respuesta válida. Para aceptar la recomendación de una fila basta escribir **R**.

```
SECCIÓN 1 · PRODUCTO DESIGN
  DEC-01 = __   D1 = __   D2 = __   D7 = __   D6 = __   D4 = __   D5 = __   D3 = __
  DEC-02 = __   DEC-05 = __   DEC-06 = __ (1 · 2 · 3)   D8 = __   D9 = __
  Aclaraciones: D3 → ¿CL-13 se cierra con linaje? = __ (sí · no)
                D6 → ¿«C como parada» se lee como en la ficha? = __ (sí · no)
                DEC-12 = __ (A · B)   DEC-24 = __ (A · B)   DEC-18 = __ (A · B)

SECCIÓN 2 · VISUAL
  V-1 ESTRUCTURA = __ (A–E; B y D combinables)
  V-2 token = __ (A · B · C)   si A, valor = __ (#8A6013 · #8A5A00 · otro)
  V-3 los tres textos = __ (como V-2 · subrayar · dejarlos)   V-3b ¿devolver al dorado los 3 corregidos discutibles? = __ (sí · no)
  V-4 SpecialistHero = __ ((a) mantener y sacarlo de CL-25 · (b) borrar · (c) mantener y CL-25 abierto)

SECCIÓN 3 · WEË CHEF
  Chef D-1 = __ (A · B)   Chef D-3 = __ (A · B · C)   si A: condición = __ ((1) retirar «alérgenos» · (2) solo avisar)
  C-3 texto de CHEF-01 = __ (aprobado · aprobado provisional · lo cambio: ______)   salida = __ ((A) hoy · (B))
  C-4 caja de 300 = __ (la caja avisa · subir el tope (F4) · la restricción fuera del texto)
  C-5 «Para la semana» / «De un menú» = __ (pasan a lista · siguen en menú)

SECCIÓN 4 · AUTORIZACIONES QUE MUEVEN CERCAS
  T-1 Router M-01 = __ (A · B · C · otra)   M-01·D2 alerta = __ (sí · no)
  T-2 H-EMU-1 = __ (sí · no · después)   si sí: alcance = __ (solo antes de arrancar · también el fallo con reembolso)
  T-3 CL-19:  (i) parar al proveedor = __ (sí · no)   (ii) dinero al cancelar = __ (reembolso total · cobrar lo entregado)   (iii) reanclar F4 = __ (sí · no)

SECCIÓN 5 · RECUPERACIÓN Y SISTEMA
  S-1 (a) Sensor de almacenamiento = __ (lo desactivo · excluyo la carpeta · no)   (b) copiar fuera de %TEMP% = __ (sí · no)   (c) mover lo que queda = __ (sí · no)
  S-2 scratchpad\fil: pasos 1–2 = __ (sí · no)   paso 3 = __   paso 4 = __ (reconstruir · volver a traducir · no)   paso 5 = __
  S-3 otros 15 worktrees = __ (restaurar · eliminar y recrear · revisar uno a uno)

SECCIÓN 6 · OTRAS ABIERTAS DE LA V2
  O-1 B-12 = __   O-2 CL-21 = __   O-3 CL-22 = __   O-4 danés = __   O-5 CLAUDE.md §5 = __
```

**La hoja rellena con las recomendaciones de esta tarea [O]** (no son respuestas; para aceptarlas basta decir «las de la hoja»):

```
S1 · DEC-01 B · D1 A · D2 B · D7 A cond. · D6 A (C parada) · D4 A · D5 A · D3 C (2 esc.) · DEC-02 B · DEC-05 A · DEC-06 1 · D8 A · D9 A
     linaje: sí (escalón 2) · parada: sí · DEC-12 A · DEC-24 A · DEC-18 A
S2 · V-1 A · V-2 A (#8A6013) · V-3 como V-2 · V-3b no · V-4 (b)
S3 · Chef D-1 A · Chef D-3 A (1) · C-3 aprobado provisional, salida (A) · C-4 la caja avisa · C-5 siguen en menú
S4 · T-1 A + alerta · T-2 después (con el diff completado) · T-3 (i) sí (ii) reembolso total (iii) sí
S5 · S-1 (a) excluir o desactivar (b) sí (c) sí · S-2 pasos 1–2 sí, 3–5 tras INC2 · S-3 restaurar los que se usen, recrear el resto
```

---

## 3. Sección 1 — Producto Weë Design

Las trece que lee CL-23 (`functions/test/_design-cierre.mjs:298-303`). Fuentes de las opciones: `docs/DESIGN.md` §4 (D1–D9) y
`docs/WEE-DESIGN-UIUX-DECISIONS.md` §2 (DEC-xx). La ficha larga de cada una está en la v2, §B. **Registrar** es otra cosa que contestar (§9).

### DEC-01 — ¿La referencia funcional sustituye algún día a `DesignScreen`?

- **Problema.** Hay dos pantallas de Design: la montada (`DesignScreen`) y la «referencia funcional», un espacio de trabajo cerrado tras una constante
  (`constants/designReferencia.ts:40`) con 94 capacidades de Design de las que 75 están apagadas (v2 §B). Hay que decir si una sustituye a la otra.
- **Opciones literales.**
  > A) Nunca: conviven · B) Sí, después de la misión de identidad · C) Sí, ya
  > — `docs/WEE-DESIGN-UIUX-DECISIONS.md:26`
- **Consecuencias funcionales.** A y B: nada cambia hoy. C: la pantalla de Design pasa a ser el espacio de trabajo, con el 80 % de lo que enseña apagado.
- **Consecuencias técnicas.** A/B: ninguna. C: `constants/designReferencia.ts`, `App.tsx`, `navigation/MainStackNavigator.tsx`, `screens/SpecialistScreen.tsx`;
  invertir I17 (`functions/test/design-referencia.mjs`) y reescribir CL-01–05, 09, 24 y 26. Ninguna cerca de integridad.
- **Riesgos y costes.** C choca con «no se rediseñan, no se simplifican ni se reemplazan» (CLAUDE.md §5) y con la regla de simplicidad; coste L. A/B: 0.
- **Dependencias.** Es la compuerta: con A o B todas las demás hablan de `DesignScreen`; V-1 = E es DEC-01 = C.
- **Recomendación técnica [O]: B.** Anota la dirección sin tocar la pantalla que hoy es la referencia visual definitiva; la identidad visual aún no existe.
- **Si se aplaza.** CL-23 sigue esperando y Design no puede llegar a «terminado»; de hecho se trabaja como A. Ningún riesgo de producción.
- **Respuesta del dueño: ____**

### D1 — ¿Qué es Weë Design?

- **Problema.** El menú dice gráfico, la referencia visual dice «todo», la pantalla dice físico y la plantilla del servidor mezcla los dos.
- **Opciones literales.**
  > A) Todo «lo que imagines» · B) Solo lo físico y los espacios · C) Solo diseño gráfico
  > — `docs/DESIGN.md:63`
- **Consecuencias funcionales.** A: las siete puertas siguen, cada punto de partida lleva a una intención de la plantilla. B: lo de hoy en pantalla; el menú
  sigue prometiendo logos. C: las puertas físicas se sustituyen por gráficas.
- **Consecuencias técnicas.** A: `constants/designTools.ts` (cada punto con su intención) y el puente (P1); servidor: nada. C: el catálogo entero ×16 idiomas y las
  pruebas de puertas. Ninguna toca cercas.
- **Riesgos y costes.** A: M. Hoy el servidor deduce la intención en 13 de 35 frases de partida en español y 3 en inglés (v2 Anexo B3).
- **Dependencias.** DEC-01 (qué pantalla); se contesta con D2 y D7.
- **Recomendación técnica [O]: A**, sin añadir puertas gráficas en la primera versión.
- **Si se aplaza.** «Crear» sigue siendo una demostración de 1,6 s (`screens/DesignScreen.tsx:129`); el puente no se integra; CL-01 y CL-05 siguen esperando.
- **Respuesta del dueño: A** (2026-10-12).

### D2 — Entregables de la primera versión

- **Problema.** Hogar & Diseño (transformar la foto de un espacio) no tiene ninguna puerta visible en la app, aunque CLAUDE.md lo coloca dentro de Weë Design.
- **Opciones literales.**
  > A) Las 6 intenciones de la plantilla · B) A + Hogar & Diseño con puerta propia · C) Solo logo, post y concepto
  > — `docs/DESIGN.md:64`
- **Consecuencias funcionales.** A: «Crear» abre las seis intenciones; nadie transforma su espacio desde Design. B: además, un renglón «Hogar & Diseño» que pide la
  foto. C: tres entregables; casi todas las puertas físicas quedan sin destino.
- **Consecuencias técnicas.** B: un componente pequeño (`components/design/DesignHogar.tsx`, propuesta P2) que reutiliza textos que ya existen; sin cercas.
- **Riesgos y costes.** B: S sobre el puente. **A y C dejan CL-02 imposible tal como está escrito** (habría que retirarlo).
- **Dependencias.** D1; D7-A necesita esta puerta para «Un antes y después».
- **Recomendación técnica [O]: B.**
- **Si se aplaza.** CL-02 sigue esperando; Hogar & Diseño solo se alcanza escribiéndolo en Weë AI o Weë Brain.
- **Respuesta del dueño: B** (2026-10-12).

### D7 — Puertas sin capacidad detrás

- **Problema.** La puerta «Renders y 3D» promete «Una maqueta 3D», «Un recorrido» y «Un antes y después», que nadie sirve (`constants/designTools.ts:66`).
- **Opciones literales.**
  > A) Llevarlas a lo que existe (Studio, Hogar & Diseño, imagen) · B) Retirarlas · C) Esperar a un proveedor 3D
  > — `docs/DESIGN.md:69`
- **Consecuencias funcionales.** A: «antes y después» lleva a Hogar & Diseño, «recorrido» a Weë Studio, «maqueta 3D» se dice como imagen o se renombra.
  B: los puntos desaparecen (y con ellos la puerta, por la prueba A1). C: nada cambia.
- **Consecuencias técnicas.** A: `designTools.ts`, `DesignPanel.tsx`, `DesignScreen.tsx` (un punto que navega es nuevo), textos ×16; sin cercas.
- **Riesgos y costes.** M. Con el puente integrado y sin decidir, esas frases se cotizarían y cobrarían como imágenes (riesgo R4 del puente). **C deja el texto
  de CL-05 falso aunque su sonda dé «cumplido».**
- **Dependencias.** D2 = B (antes y después) y DEC-12 = A (recorrido).
- **Recomendación técnica [O]: A condicionada**: (1) «antes y después» a Hogar & Diseño solo si D2 = B; (2) «recorrido» a Studio solo si DEC-12 = A; si no, B
  para esos dos; (3) «maqueta 3D» se renombra o se retira mientras no haya 3D.
- **Si se aplaza.** Las puertas siguen prometiendo lo que no existe; CL-05 sigue esperando; el puente no puede integrarse con honestidad.
- **Respuesta del dueño: A**, con sus condiciones (2026-10-12): «antes y después» solo con D2 = B; «recorrido» solo con DEC-12 = A; «maqueta 3D» se dice «imagen conceptual» mientras no haya 3D real.

### D6 — Referencias que sube la persona

- **Problema.** «Añadir una imagen de referencia» añade un nombre de muestra (`screens/DesignScreen.tsx:145`) y nada viaja; aunque viajara, el servidor la
  ignoraría (`IMAGE_INPUT_CAPS` no incluye `image.reference`, `functions/src/creator/inputs.ts:14-23`) [E].
- **Opciones literales.**
  > A) Inspiración de estilo (`image.reference`) · B) Una base que se transforma · C) Ocultar el botón hasta decidir
  > — `docs/DESIGN.md:68`
- **Consecuencias funcionales.** A: la galería de verdad y el diseño se inspira en la foto. B: la foto es la base y se transforma. C: desaparecen los dos botones.
- **Consecuencias técnicas.** A: selector real en `DesignScreen`, `image.reference` en `IMAGE_INPUT_CAPS`, el plan sabe que hay referencia; sin cercas salvo si el
  precio exige tocar `aiPricing.ts`/`creditCosts.ts` (F2). C: props opcionales en `StudioPromptComposer` (compartido con Studio).
- **Riesgos y costes.** A: M–L; cómo «se inspira» cada modelo es desconocido (ningún proveedor llamado). **B y C dejan CL-16 imposible tal como está escrito.**
  Una referencia puede llevar un rostro (DEC-24).
- **Dependencias.** D1, D2; comparte «material como entrada» con D3; DEC-24.
- **Recomendación técnica [O]: A, con C como parada** (aclaración 13b).
- **Si se aplaza.** La ficha `referencia-1.png` de mentira sigue a la vista; CL-09 y CL-16 esperan.
- **Respuesta del dueño: ____**

### D4 — Texto dentro de la imagen, y el nivel de los logos

- **Problema.** Los logos ya van a un modelo que escribe texto; los afiches no, aunque su instrucción interna pide el texto
  (`functions/src/creator/prompts.ts:719`).
- **Opciones literales.**
  > A) Solo logos y afiches, con un modelo que escriba texto (el afiche se cotiza más caro) · B) Nunca · C) Siempre que se escriba
  > — `docs/DESIGN.md:66`
- **Consecuencias funcionales.** A: el afiche sale con su texto y el plan enseña un total más alto. B: ni los logos llevan nombre (retroceso). C: cualquier pieza
  con texto pedido sube de nivel.
- **Consecuencias técnicas.** A: el `kind` del afiche pasa a `poster` en `templates.ts`; **sin cercas**. B: sacar `logo` de `TEXT_KINDS` (**E4 y F1**). C: el
  planificador (**F1**) y quizá `creator/index.ts` (**F4**).
- **Riesgos y costes.** A: S–M; el importe lo da `creatorQuote`. **B deja CL-15 imposible.** Acoplada a D5: los dos únicos modelos que escriben texto solo
  tienen medidas verificadas en 1:1.
- **Dependencias.** D5 (se contestan juntas), D1; D9 (logos y lo legal).
- **Recomendación técnica [O]: A.** Si no se quiere que el afiche suba de precio, la respuesta honesta es «solo logos» (lo de hoy), que no es ninguna letra y
  obliga a reescribir CL-15.
- **Si se aplaza.** El afiche sigue en un modelo que no escribe texto; CL-15 espera.
- **Respuesta del dueño: ____**

### D5 — Formatos

- **Problema.** Toda imagen de Design sale 1:1; el grupo «Formato» de los ajustes no viaja a ninguna parte.
- **Opciones literales.**
  > A) 1:1, 4:5, 9:16 y 16:9 · B) A + impresión · C) Solo 1:1 y 9:16
  > — `docs/DESIGN.md:67`
- **Consecuencias funcionales.** A: Cuadrado, Vertical y Horizontal tienen efecto (4:5 pide una palabra nueva). B: además papel. C: dos formatos.
- **Consecuencias técnicas.** A: `templates.ts` devuelve `aspectRatio`; 4:5 o las medidas de Gemini exigen tocar `engine/resolutionPolicy.ts` (**E4 y F1**).
  B: además resolución de impresión (E4, F1; quizá F2). C: sin cercas.
- **Riesgos y costes.** M. Si Gemini respeta proporciones distintas de 1:1 es desconocido.
- **Dependencias.** D4.
- **Recomendación técnica [O]: A**, construida en orden: 1:1, 9:16 y 16:9 primero (sin cercas); 4:5 después y con autorización de E4/F1.
- **Si se aplaza.** Un afiche «para una historia» sigue saliendo cuadrado; CL-14 espera (su sonda pasa con cualquier respuesta y código).
- **Respuesta del dueño: ____**

### D3 — Editar después de generar

- **Problema.** Cada «cambio» o «otra versión» abre un trabajo nuevo, sin las respuestas, y cobra el plan entero otra vez (salvo en Weë Travel:
  `screens/CreatorFlowScreen.tsx:368`) [E: corredor].
- **Opciones literales.**
  > A) Recrear desde cero · B) Editar la propuesta elegida (`image.edit`, con linaje) · C) Las frases rápidas editan y «Otra versión» recrea
  > — `docs/DESIGN.md:65`
- **Consecuencias funcionales.** A: igual que hoy. B: se edita la imagen elegida (una, no tres) y queda como versión. C: las cuatro frases editan la elegida;
  «Crear otra versión» recrea.
- **Consecuencias técnicas.** C escalón 1: `ResultCard.tsx`, `CreatorFlowScreen.tsx` (compartidas con todas las secciones) y la plantilla; **sin cercas**.
  Escalón 2 (linaje): `creator/index.ts` (**F4**) o `content/*` (**F3**). El aviso «Cada cambio vuelve a crear ≈ N Credits» dejaría de ser verdad (×16).
- **Riesgos y costes.** C: M (escalón 1) · L (linaje). **A deja CL-13 imposible.** La sonda de CL-13 se cumple con el escalón 1 aunque su texto pide linaje.
- **Dependencias.** D6 (misma maquinaria); DEC-18; Chef CHEF-05 espera a esta respuesta.
- **Recomendación técnica [O]: C en dos escalones.**
- **Si se aplaza.** Se sigue cobrando el plan entero por cada cambio, también en Chef; CL-13 espera; CHEF-05 no empieza.
- **Respuesta del dueño: ____**

### DEC-02 — Con la puerta abierta, ¿por dónde se entra?

- **Problema.** Solo importa si la referencia funcional llega a abrirse; hoy no se entra por ninguna parte.
- **Opciones literales.**
  > A) Solo por dirección (`/design/referencia`, hoy) · B) Un acceso discreto en `DesignScreen` · C) Una entrada en el ☰ y la barra lateral
  > — `docs/WEE-DESIGN-UIUX-DECISIONS.md:27`
- **Consecuencias funcionales.** A: nada. B: un acceso pequeño en la pantalla de Design. C: una fila más en el menú único.
- **Consecuencias técnicas.** B: `DesignScreen.tsx` nombra la referencia (rompe I17 a propósito) y una etiqueta ×16; C: el menú y las barras laterales. Sin cercas.
- **Riesgos y costes.** 0 mientras la puerta siga cerrada; S–M al abrirla. **Registrar B no abre la puerta.**
- **Dependencias.** DEC-01; antecede a DEC-05.
- **Recomendación técnica [O]: B, como registro sin obra.**
- **Si se aplaza.** Solo CL-23 espera.
- **Respuesta del dueño: ____**

### DEC-05 — ¿Se oculta la barra global inferior dentro del workspace en el teléfono?

- **Problema.** Solo afecta a la referencia funcional (cerrada).
- **Opciones literales.**
  > A) No (hoy) · B) Sí (`SIN_BARRA`)
  > — `docs/WEE-DESIGN-UIUX-DECISIONS.md:28`
- **Consecuencias funcionales.** A: la barra sigue (cinco destinos a un toque, menos alto útil). B: pantalla completa; para salir, el volver.
- **Consecuencias técnicas.** B: añadir `'DesignReferencia'` a `SIN_BARRA` en `navigation/NavegacionGlobal.tsx`. Sin cercas.
- **Riesgos y costes.** 0.
- **Dependencias.** DEC-01, DEC-02.
- **Recomendación técnica [O]: A.**
- **Si se aplaza.** Solo CL-23 espera.
- **Respuesta del dueño: ____**

### DEC-06 — Los destinos de exportación

- **Problema.** La lista de destinos ya está en el código pero no tiene efecto visible (no existe el conversor de Weë).
- **Opciones literales.** La celda **no tiene letras**; es una frase:
  > La lista de DEC-06a, otra, o formatos visibles
  > — `docs/WEE-DESIGN-UIUX-DECISIONS.md:29`

  Para contestar sin confundir con DEC-06a se numeran **en el orden de la frase**: **1** = «La lista de DEC-06a» · **2** = «otra» · **3** = «formatos visibles»
  (la misma numeración que la v2; una «a» de una respuesta anterior se lee 1).
- **Consecuencias funcionales.** 1: «¿Para qué lo quieres?» con siete destinos, sin extensiones, cuando exista el conversor. 2: la lista que diga el dueño.
  3: extensiones de archivo a la vista.
- **Consecuencias técnicas.** 1: ninguna (ya está). 2 y 3: `DESTINOS_DE_ENTREGA` y textos ×16. Sin cercas.
- **Riesgos y costes.** 0 (1). La 3 contradice «sin lenguaje técnico» (CREATOR.md §14).
- **Dependencias.** DEC-01; para tener efecto, DEC-20 y DEC-21.
- **Recomendación técnica [O]: 1.**
- **Si se aplaza.** Solo CL-23 espera.
- **Respuesta del dueño: ____**

### D8 — Memoria de marca o brand kit

- **Problema.** Nada recuerda el logo o la paleta entre peticiones; Chef tiene la misma pregunta (su «memoria persistente»).
- **Opciones literales.**
  > A) Nada en la primera versión · B) Memoria de proyecto compartida con Weë Business · C) Solo en Weë Business
  > — `docs/DESIGN.md:70`
- **Consecuencias funcionales.** A: cada petición empieza de cero. B: un proyecto recuerda logo y paleta, compartido con Business. C: solo en Business.
- **Consecuencias técnicas.** B: un escritor de `ProjectItem` (hoy cerrado en `firestore.rules`) y algo en `functions/src/core` (**F3**) o un archivo nuevo en
  `functions/src` (**F1**). C: en Weë Business.
- **Riesgos y costes.** A: 0. B: no es «pequeño» (F3 y F1).
- **Dependencias.** D6; Chef D-6/CHEF-17.
- **Recomendación técnica [O]: A** (el documento dice «A ahora, B después»: se registra A).
- **Si se aplaza.** CL-23 espera (pide trece de trece).
- **Respuesta del dueño: ____**

### D9 — Uso comercial y moderación propia

- **Problema.** Los logos ya escriben texto y no hay cláusula, revisión legal ni regla contra imitar marcas o personas reales.
- **Opciones literales.**
  > A) No prometer exclusividad, cláusula en los términos y revisión legal antes de anunciar logos · B) Etiquetar los logos como «propuesta» · C) Una regla que rechace imitar marcas o personas reales
  > — `docs/DESIGN.md:71`
- **Consecuencias funcionales.** A: legal y de texto, fuera de la app. B: una etiqueta en el resultado. C: un mensaje de rechazo nuevo.
- **Consecuencias técnicas.** A: `public/terms.html`. B: `ResultCard.tsx` (compartido) y textos ×16. C: `creator/prompts.ts` (sin cerca) o un control previo
  (planificador: **F1**).
- **Riesgos y costes.** A: 0 en código, depende de un revisor legal. C: M y hay que definir qué es «imitar».
- **Dependencias.** D4; C depende de DEC-24.
- **Recomendación técnica [O]: A** para registrar; C como trabajo aparte si se quiere (el documento dice «A + C»; registrar C compromete obra).
- **Si se aplaza.** CL-23 espera; los logos con texto siguen sin cláusula.
- **Respuesta del dueño: ____**

### 13a–13e — Aclaraciones de una palabra (opcionales, pero dejan las respuestas completas)

| Id | Pregunta | Opciones literales | Recomendación [O] | Respuesta del dueño |
|---|---|---|---|---|
| **13a** D3 · linaje | ¿CL-13 se cierra con linaje (escalón 2, autorizando F4 o F3) o sin él (se reescribe su texto)? | sí · no (v2, ficha de D3) | **sí**, en el escalón 2: el texto de CL-13 lo pide | ____ |
| **13b** D6 · parada | ¿«C como parada» significa que el trabajo se detiene en C si la referencia no llega o no se nota, si el precio exige tocar F2, o si DEC-24 no está contestada? | sí · no (la lectura está en `docs/WEE-DESIGN-DECISIONES-DEL-DUENO.md:541`) | **sí** | ____ |
| **13c** DEC-12 | ¿Weë Design lleva a Weë Studio para presentar un diseño en vídeo? | «A) Sí, con contexto · B) No» (`docs/WEE-DESIGN-UIUX-DECISIONS.md:35`) | **A** (condiciona «Un recorrido» de D7) | **A** (2026-10-12) |
| **13d** DEC-24 | ¿Se manda a un candidato el vídeo o la foto de una persona real? | «A) No sin revisión legal (biometría, transferencia internacional) · B) Sí con consentimiento» (`docs/WEE-DESIGN-UIUX-DECISIONS.md:44`) | **A** (dispara la parada de D6) | ____ |
| **13e** DEC-18 | ¿Reintentos gratis tras un resultado? | «A) No: «otra versión» se cotiza y se cobra (hoy) · B) N gratis por resultado, a cargo de Weë» (`docs/WEE-DESIGN-UIUX-DECISIONS.md:39`) | **A** hasta medir el coste real | ____ |

---

## 4. Sección 2 — Lo visual

### V-1 — ESTRUCTURA: ¿qué ve la persona al entrar en Weë Design?

- **Problema.** El encargo del dueño mencionó «hero + herramientas plegadas + muro»; esa estructura **no existe** hoy en Design ni en Chef: el hero es del Home,
  lo plegado solo existe en Weë Travel y los muros de sección se retiraron el 2026-09-13 (`4ff271e`). Hay que decir si se mantiene lo de hoy.
- **Opciones literales.** **No es una fila de ninguna tabla fuente**: la pregunta y las letras las formuló la v1 y están, tal cual, en la v2 §E.4:
  > **A)** Lo de hoy: cabecera, caja, «Explora» con seis puertas, «Mis creaciones».
  > **B)** Lo de hoy con «Explora» plegada al entrar.
  > **C)** Un hero propio arriba y las puertas en secciones desplegables cerradas.
  > **D)** A o B, más una franja «De la comunidad» de solo lectura (o el muro de sección de vuelta).
  > **E)** El espacio de trabajo de la referencia funcional en lugar de esta pantalla (es DEC-01 = C).
  > — `docs/WEE-DESIGN-DECISIONES-DEL-DUENO.md:1274-1278`
- **Consecuencias funcionales.** A: nada (y «Mis creaciones» ya enseña lo creado de verdad: CL-04 cumplido). B: las seis puertas se abren con un toque. C: hero
  y todo plegado. D: una franja de publicaciones de terceros en una pantalla de creación. E: otra pantalla.
- **Consecuencias técnicas.** A: ninguna. B: `DesignExplore.tsx` y `DesignScreen.tsx` (~25 líneas según el cierre). C: reescribir el cuerpo de
  `DesignScreen.tsx` + componente nuevo + textos ×16. D: componente de franja + textos ×16. E: lo de DEC-01 = C. Ninguna toca cercas.
- **Riesgos y costes.** A 0 · B S · C L (no hay **ningún** activo de imagen de Design para un hero) · D M (franja) / L (muro) · E L. C choca con la decisión
  del 2026-09-15 («arriba de una sección no va nada más que esto», `components/creator/CabeceraDeSeccion.tsx:51`); D con «un solo muro»; C y E re-basan
  CL-01–05, 09, 24 y 26 (CL-26 ya se registró sobre la pantalla de hoy).
- **Dependencias.** DEC-01 (E = DEC-01 C); es la misma pregunta que **Chef D-1** (respuestas independientes); decide V-4.
- **Recomendación técnica [O]: A**; lo plegable, si se quiere, por B más adelante.
- **Si se aplaza.** Se trabaja con A; nada se bloquea salvo V-4 (`SpecialistHero` no se borra mientras C siga sobre la mesa).
- **Respuesta del dueño: ____**

### V-2 — Token de color para texto sobre dorado

- **Problema.** `accentDark` (`#E5A020`) da 2,24:1 sobre blanco (AA pide 4,5:1) y se usaba como color de texto en 31 sitios. La tarea CON (R8, **ya en la base**)
  pasó 13 textos de Weë AI al color del texto, dejó 3 pendientes (V-3) y no tocó 15 de fuera de Weë AI. El arreglo de fondo es un token que pase AA, y eso es
  identidad visual (`docs/WEE-ACCENTDARK-AUDITORIA.md` §8).
- **Opciones literales.**
  > **Alternativas** (cada una es una decisión, no una recomendación): (A) el token de arriba; (B) dejar `text` donde ya está y subrayar los enlaces que van solos —el repositorio ya subraya dos
  > — `docs/WEE-ACCENTDARK-AUDITORIA.md:255`

  y su continuación: «lo que añade una señal que hoy no existe; (C) dejar los tres pendientes como están y convivir con 2,12–2,24:1 en tres acciones
  secundarias.» (`docs/WEE-ACCENTDARK-AUDITORIA.md:256`). **Valores medidos para A** (filas literales de la tabla, `docs/WEE-ACCENTDARK-AUDITORIA.md:237-242`;
  recalculados hoy con la fórmula WCAG 2.x [E], idénticos):

  | Valor | sobre blanco | sobre `#F8F9FA` | peor caso (`#F7ECD2`) | usos de texto que pasan AA |
  |---|---|---|---|---|
  | `#E5A020` (hoy) | 2,24 | 2,12 | 1,91 | 0 de 31 |
  | `#9A6700` | 4,87 | 4,62 | 4,15 | 22 de 31 |
  | `#8A5A00` | 5,93 | 5,62 | 5,05 | 31 de 31 |
  | `#8E6314` (mismo tono) | 5,32 | 5,05 | 4,53 | 31 de 31 |
  | `#8A6013` (mismo tono) | 5,58 | 5,29 | 4,75 | 31 de 31 |

- **Consecuencias funcionales.** A: los textos dorados vuelven a verse dorados y legibles (más oscuros que la marca); B: los enlaces solos se subrayan;
  C: tres acciones siguen por debajo de AA.
- **Consecuencias técnicas.** A: un token por tema en `contexts/ThemeContext.tsx` (claro oscurecido, oscuro = el actual) y sustituirlo solo donde pinta texto
  (los 3 pendientes y los 15 de fuera; y, si se prefiere el dorado, deshacer los 13 arreglos); **no** cambiar `accentDark` (51 iconos y 5 bordes lo usan y
  `weeai-cliente-cierre` C0 fija que no pasa en el claro). La suite `accentdark-contraste` cambia de token esperado. B: tres líneas y un estilo. Sin cercas.
- **Riesgos y costes.** S. A toca el tema de toda la app (identidad: el dorado #F5B731 es el color principal); el marrón dorado «se ve distinto del dorado de la
  marca». No es criterio de cierre (F-12 es mejora opcional).
- **Dependencias.** V-3 depende de esta respuesta.
- **Recomendación técnica [O]: A con `#8A6013`**: es el mismo tono que `accentDark`, pasa los 31 usos con margen (4,75:1 en el peor caso) y no obliga a cambiar
  iconos ni bordes; `#8A5A00` si se quiere más margen (5,05:1); `#9A6700` **no basta**. Elegir el color es del dueño del diseño.
- **Si se aplaza.** Siguen 3 textos de Weë AI y 15 de fuera por debajo de AA; nada más se bloquea.
- **Respuesta del dueño: ____** (letra y, si A, valor)

### V-3 — Los tres textos dorados que quedan

- **Problema.** Tres acciones de Weë AI siguen en `accentDark` porque el dorado es su única señal de acción (2,12–2,24:1) [E: líneas leídas hoy]:
  «Prefiero contarlo con palabras» (`screens/CreatorFlowScreen.tsx:572`), «Cambiar» de la foto del espacio (`screens/CreatorFlowScreen.tsx:597`) y
  «Cambiar»/«Elegir» del proyecto (`components/creator/ResultCard.tsx:404`).
- **Opciones literales.** Lo que los desbloquea, según la fuente:
  > | `CreatorFlowScreen.tsx:572` «Prefiero contarlo con palabras» | Es un enlace de texto SOLO, centrado bajo la caja de la foto. El dorado es la única señal de que se puede tocar; en el color del texto parecería una frase más y la salida para quien no tiene foto dejaría de verse | el token de «texto sobre dorado» (§8), o decidir que los enlaces solos se subrayan |
  > — `docs/WEE-ACCENTDARK-AUDITORIA.md:130`

  (las otras dos filas dicen «ídem», `docs/WEE-ACCENTDARK-AUDITORIA.md:131-132`), más la (C) de V-2: dejarlos. Y una sub-pregunta **V-3b**, literal:
  «Si se prefieren dorados, basta revertir su línea (`text` → `accentDark`) y mover su huella de `CORREGIDOS` a `PENDIENTES` en la suite»
  (`docs/WEE-ACCENTDARK-AUDITORIA.md:137-138`) para los tres corregidos más discutibles (`components/creator/PlanCard.tsx:142`, `screens/WeeCreatorScreen.tsx:241` —`:239` en la auditoría, escrita sobre `c3f7f9a7`— y `screens/CreatorFlowScreen.tsx:613`).
- **Consecuencias funcionales.** Token: siguen dorados y legibles. Subrayar: pasan a `text` con subrayado. Dejarlos: igual que hoy.
- **Consecuencias técnicas.** Tres líneas; la suite `accentdark-contraste` mueve sus huellas de `PENDIENTES`. Sin cercas.
- **Riesgos y costes.** S; ninguno de dinero.
- **Dependencias.** V-2.
- **Recomendación técnica [O]: lo que diga V-2** (con A, el token); **V-3b: no** (sin el dorado conservan posición, peso y vecino).
- **Si se aplaza.** Tres acciones siguen por debajo de AA.
- **Respuesta del dueño: ____** (V-3) · **____** (V-3b)

### V-4 — `SpecialistHero.tsx`

- **Problema.** `components/creator/SpecialistHero.tsx` no lo importa nadie [E]; CL-25 lo cuenta como resto, pero la comprobación 4 de `cierre-cliente` lo
  conserva **«por decisión»**:
  > check('4) se quedan, por decisión: HeroCarousel y SpecialistHero', existe('components/HeroCarousel.tsx') && existe('components/creator/SpecialistHero.tsx'));
  > — `functions/test/cierre-cliente.test.mjs:136`

  con el comentario «Si se borran, que sea por decisión y no por arrastre.» (`functions/test/cierre-cliente.test.mjs:135`). CL-25 lo describe como «una decisión de
  estructura visual del dueño» (`docs/WEE-DESIGN-CIERRE.md:308`).
- **Opciones literales.**
  > **(a) mantenerlo** y quitar ese resto del detector de CL-25 (la lista de cierre es tuya); **(b) borrarlo**; **(c) mantenerlo y dejar CL-25 abierto**
  > — `docs/WEE-DESIGN-DECISIONES-DEL-DUENO.md:1320`
- **Consecuencias funcionales.** Ninguna para la persona en ninguna opción (nadie lo pinta).
- **Consecuencias técnicas.** (b): aplicar `docs/propuestas/cl25-borrar-specialisthero.diff` (5 archivos: el componente, `WEE-DESIGN-CIERRE.md`, `_design-cierre.mjs`,
  `catalogo-i18n.test.mjs`, `cierre-cliente.test.mjs`); **hoy se aplica en seco sobre la base salvo su trozo de `docs/WEE-DESIGN-CIERRE.md`**, que habría que
  rehacer [E: `git apply --check`]. (a): cambiar el detector de CL-25. (c): nada.
- **Riesgos y costes.** S; (b) deshace una decisión escrita en una prueba (por eso necesita el sí del dueño).
- **Dependencias.** V-1: con C no conviene borrarlo (es lo único parecido a un hero de sección).
- **Recomendación técnica [O]: (b) borrar, si V-1 = A** (cierra CL-25 y elimina código muerto); (c) si V-1 queda abierta.
- **Si se aplaza.** CL-25 sigue abierto; Design no llega a «terminado».
- **Respuesta del dueño: ____**

---

## 5. Sección 3 — Weë Chef

Lo que ya está en la base: CHEF-01 (la instrucción de la lista, `functions/src/creator/prompts.ts:498`), CHEF-04 (funciones puras de receta) y la parte pura de
CHEF-02 (`utils/contextoDeChef.ts`). **Lo que bloquea el resto del lote 1:** Chef D-1 (pantalla de CHEF-02 y CHEF-03b), Chef D-3 (`nutrition` de CHEF-03a y
la tarjeta de CHEF-03b), la caja de 300 (C-4) y «Para la semana» (C-5); el texto de CHEF-01 (C-3) está pendiente de revisión de producto
(`docs/WEE-CHEF-TAREAS-LOTE-1.md:3`).

### Chef D-1 — Estructura visual de Chef

- **Problema.** `ChefScreen` es un lugar de trabajo desde el 2026-09-15 (sin hero ni muro); la imagen de referencia de 2026-09-05 enseña hero, fotos y muro, y
  CLAUDE.md §5 sigue llamándola «definitiva».
- **Opciones literales.**
  > A) mantener el lugar de trabajo del 2026-09-15 y añadir lo nuevo plegado · B) volver a hero + muro de sección (reescribe `ChefScreen` y 47 comprobaciones; contradice «un solo muro»)
  > — `docs/WEE-CHEF-ESPECIFICACION.md:533`
- **Consecuencias funcionales.** A: hoy nada; en el lote 2 lo nuevo entra plegado (patrón de Travel). B: hero con foto de comida y muro de sección.
- **Consecuencias técnicas.** A: ninguna ahora. B: reescribir `ChefScreen.tsx`, `components/chef/*`, `chef-weeai` (47) y las de aceptación; **CHEF-02 y
  CHEF-03b se tiran o se rehacen**. Sin cercas.
- **Riesgos y costes.** A: 0. B: L, sin ninguna foto de comida entregada y contra «un solo muro».
- **Dependencias.** La especificación se contradice: dice que no bloquea el lote 1 (`:533`) y la pone en el «mínimo para arrancar» (`docs/WEE-CHEF-ESPECIFICACION.md:546`);
  por el código, **solo frena CHEF-02 (pantalla) y CHEF-03b**. Misma pregunta que V-1 (independiente). La recomendación de la fuente añade «corregir el texto
  de `CLAUDE.md` §5» (O-5).
- **Recomendación técnica [O]: A.**
- **Si se aplaza.** CHEF-02 (pantalla y caja) y CHEF-03b no empiezan: los ajustes siguen viajando solo como texto y una idea larga pierde la dieta sin aviso.
- **Respuesta del dueño: ____**

### Chef D-3 — Información nutricional

- **Problema.** «Información nutricional» acaba hoy en «receta + foto del plato» (se paga una foto no pedida) y su subtítulo promete
  «Calorías, macros y alérgenos» (`i18n/textos/es/chef.ts:41`), con una entrada «Alérgenos» (`constants/chefTools.ts:128`).
- **Opciones literales.**
  > A) estimación rotulada, sin fuentes (lote 1) · B) con búsqueda con fuentes (exige variante nueva: CHEF-16) · C) no ofrecerla
  > — `docs/WEE-CHEF-ESPECIFICACION.md:535`
- **Consecuencias funcionales.** A: un resultado de texto por porción, rotulado «aproximado», sin foto. B: con fuentes. C: desaparece una de las ocho tarjetas.
- **Consecuencias técnicas.** A: `templates.ts`, `prompts.ts` y textos de servidor (ocho suites de pines); sin cercas. B: `core/registry/capabilities.ts` (**F3**).
  C: `chefTools.ts`, textos ×16 y pruebas de pantalla.
- **Riesgos y costes.** A: S. **Un alérgeno no es una cifra, es una afirmación de seguridad** (riesgo R-10, `docs/WEE-CHEF-ESPECIFICACION.md:511`): una estimación
  sin fuentes no sostiene «alérgenos». La calidad real es desconocida hasta un canario (CHEF-18).
- **Dependencias.** Chef D-4 (alergias y dietas), sin decidir (`docs/WEE-CHEF-ESPECIFICACION.md:536`).
- **Recomendación técnica [O]: A con una condición**, de las dos que propone la v2 (`docs/WEE-DESIGN-DECISIONES-DEL-DUENO.md:1000`): **(1) retirar la promesa**
  («Alérgenos» y la palabra del subtítulo) en la primera versión, o (2) dejarla y que el texto solo avise y nunca asegure. Recomiendo **(1)**: no depende de
  cómo se porte un modelo.
- **Si se aplaza.** CHEF-03a no entrega `nutrition` (sí `swap` y `shopping`); el panel sigue pagando una foto y prometiendo alérgenos.
- **Respuesta del dueño: ____** (letra y, si A, condición (1) o (2))

### C-3 — El texto de la instrucción de CHEF-01

- **Problema.** La lista de la compra de Chef usaba la instrucción de Weë Home («zona del espacio», «6–8 elementos»). CHEF-01, ya integrada, le da una propia,
  que **también** recibe el paso de precios del menú (salida A). Su texto está marcado «PENDIENTE de revisión de producto: no es copy final».
- **El texto literal que hay hoy en el código:**
  > 'Escribe la lista de la compra del menú agrupada por secciones del supermercado (frutas y verduras, carnes y pescados, lácteos y huevos, panadería, despensa, congelados, otros), con una línea "SECCIÓN: <nombre>" delante de cada grupo. Junta en una sola línea el mismo ingrediente aunque salga en varias recetas y suma sus cantidades con su unidad. Sin tope de elementos: que no falte nada de lo que hay que comprar. Si la tarea es mirar precios, pon junto a cada línea el precio que encuentres con su fuente y, si no lo encuentras, dilo: nunca inventes un precio.',
  > — `functions/src/creator/prompts.ts:498`
- **Opciones.** La fuente **no trae letras**: pide «la revisión de producto del texto» (`docs/WEE-CHEF-TAREAS-LOTE-1.md:149`). Aquí: aprobarlo · aprobarlo como
  provisional hasta el canario · cambiarlo (escribiendo el texto). Sub-pregunta técnica, literal:
  > Dos salidas, **a decidir antes de empezar**: **(A)** una sola instrucción de Chef para `shopping` que valga para la lista y para los precios (lo que midió G y mi prototipo); **(B)** indexar la tabla por `(experiencia, capacidad, kind)` y que `inputs.ts` pase la capacidad (un archivo más y una firma, y una segunda frase para los precios).
  > — `docs/WEE-CHEF-TAREAS-LOTE-1.md:118`

  La implementada es la (A).
- **Consecuencias funcionales.** La lista sale por secciones, con cantidades juntas y sin tope; el paso de precios pone fuente o dice que no la encontró.
- **Consecuencias técnicas.** Cambiar el texto toca solo `prompts.ts:498` y la comprobación de `chef-caracterizacion`; ninguna cerca. (B) toca `inputs.ts` y una firma.
- **Riesgos y costes.** 0. La marca «SECCIÓN:» puede traducirse en otros idiomas (riesgo residual anotado en la ficha); la calidad real es desconocida sin canario.
- **Dependencias.** CHEF-03a usa el mismo mecanismo; la lista la lee `leerLista` (CHEF-04).
- **Recomendación técnica [O]: aprobarlo como provisional y mantener (A)** hasta que el canario (CHEF-18) mida la salida.
- **Si se aplaza.** El texto sigue en el código (no desplegado) marcado como no definitivo; nada se bloquea.
- **Respuesta del dueño: ____** (texto) · **____** (salida)

### C-4 — La caja de 300 caracteres

- **Problema.** El servidor corta el objetivo a 300 caracteres (`functions/src/creator/index.ts:310`): con una idea larga, una restricción como «sin gluten» se
  pierde sin aviso (ACE-C-09, «BLOCKED — HUMAN DECISION»).
- **Opciones literales.**
  > new RegExp(sinGluten, 'i').test(guardada), `se mandaron ${enviada.length} caracteres y se guardaron ${guardada.length}; opciones de H: que la caja avise, o subir el tope del servidor (mueve la cerca F4 de puente-pre-f1d), o que la restricción viaje fuera del texto`);
  > — `functions/test/aceptacion-recorrido-servidor.test.mjs:372`
- **Consecuencias funcionales.** Que la caja avise: un contador `n/300` en la caja de Chef. Subir el tope: cabe más texto. Fuera del texto: la restricción viaja
  como respuesta y no se puede cortar.
- **Consecuencias técnicas.** Avisar: prop opcional `maximo` en `CajaDePrompt.tsx` (compartida) y `ChefScreen.tsx`; no cierra el hueco del servidor. Subir el tope:
  `creator/index.ts` (**F4**). Fuera del texto: la dieta como pregunta de la plantilla (CHEF-06, que depende de Chef D-4).
- **Riesgos y costes.** S / S + reanclaje F4 / M. Hay además una regla técnica sin decidir (bloquear o dejar enviar al pasarse; `docs/WEE-CHEF-TAREAS-LOTE-1.md:216`).
- **Dependencias.** Chef D-1 = A (la caja está en `ChefScreen`); la tercera, Chef D-4.
- **Recomendación técnica [O]: que la caja avise** ahora (sin cercas) y que la restricción viaje fuera del texto cuando exista CHEF-06.
- **Si se aplaza.** La pantalla y la caja de CHEF-02 no se cablean; la dieta se sigue perdiendo sin aviso.
- **Respuesta del dueño: ____**

### C-5 — «Para la semana» y «De un menú»

- **Problema.** Con CHEF-03a, el panel de compras deja de pasar por el plan de menú (menú, precios y lista) y va a un plan de un solo paso; esas dos entradas
  cambiarían de resultado.
- **Opciones literales.**
  > 4. **La entrada «Para la semana» (y «De un menú») del panel de compras** hoy llega al plan de menú —menú, precios y lista— por las palabras «semana» y «menú» (`templates.ts:1241`); con `shopping` pasaría al plan de un solo paso. Si no se quiere ese cambio, el panel manda `what: menu` para esas entradas (03b admite un mapa por entrada). **Pregunta abierta.**
  > — `docs/WEE-CHEF-TAREAS-LOTE-1.md:314`
- **Consecuencias funcionales.** Pasan a lista: solo la lista, más corta. Siguen en menú: un menú de la semana con precios y su lista.
- **Consecuencias técnicas.** Siguen en menú: un mapa por entrada en CHEF-03b (`{ shopping: { week: 'menu', menu: 'menu' } }`, propuesto). Pasan a lista: cambia
  el pin de `chef-caracterizacion` de «Para la semana». Sin cercas.
- **Riesgos y costes.** 0. El plan de menú incluye una búsqueda de precios (coste de proveedor mayor; sin cifra).
- **Dependencias.** CHEF-03a y 03b.
- **Recomendación técnica [O]: siguen en menú**: «para la semana» pide planificar, no solo comprar.
- **Si se aplaza.** CHEF-03b no puede cerrar su mapa de entradas.
- **Respuesta del dueño: ____**

---

## 6. Sección 4 — Autorizaciones técnicas que mueven cercas

Lo que sigue **no se aplica sin un sí escrito**: el diff está preparado, con su prueba y su marcha atrás, y **ninguno está aplicado ni desplegado**.

### T-1 — Router M-01 (contabilidad tras un resultado ya pagado)

- **Problema.** Si Firestore falla **después** de que el proveedor devolvió y cobró, el Router lo trata como fallo del proveedor: con un proveedor se descarta lo
  pagado; con varios se paga dos veces. Reproducido: `router-contabilidad.repro.mjs` 55 ✘ / 31 ✔ (`docs/ROUTER-M01-DECISION-BREVE.md:13`).
- **Opciones literales.**
  > | | A · solo M-01 | B · M-01 + PR1–PR3 | C · no aplicar ahora |
  > — `docs/ROUTER-M01-DECISION-BREVE.md:22`

  Y la forma larga del mismo documento: «(a) solo M-01 · (b) con PR1–PR3 · (c) no ahora · (d) otra forma» (`docs/ROUTER-M01-DECISION-BREVE.md:32`).
  Sub-pregunta **M-01·D2** (cómo se repara la fila sin cerrar), con sus opciones (a)–(e) en `docs/ROUTER-M01-DECISION-BREVE.md:33`; la que se recomienda es la
  (d): el aviso a la alerta «Weë · dinero sin cerrar».
- **Consecuencias funcionales.** A: la persona recibe el resultado aunque falle la contabilidad, sin pagar dos veces. B: además, menos latencia. C: el defecto sigue.
- **Consecuencias técnicas.** A: `functions/src/engine/router.ts` +31 −4; **mueve E4 y H2** (`126/25 → 157/29`) con `docs/propuestas/reanclaje-borrador-D.diff`.
  B: además `ledger.ts`, `verification.ts`, `creator/credits.ts`; mueve también **F4** y `f1d-generacion` #98 (reanclaje D+I, no apilable con D). Hoy los
  diffs `router-contabilidad`, `reanclaje-borrador-D` y `reanclaje-borrador-D+I` se aplican en seco sobre la base [E: `git apply --check`].
- **Riesgos y costes.** A: S, ruta feliz idéntica, se deshace con dos `git revert`; deja la fila `aiGenerations` sin cerrar y silenciosa (por eso la alerta).
  La frecuencia en producción **no está verificada**. Nada se despliega con este sí.
- **Dependencias.** Zona roja del Harness (revisión obligatoria). M-01·D3/D4 quedan abiertas.
- **Recomendación técnica [O]: A, con la alerta M-01·D2 (d)** (la del documento: `docs/ROUTER-M01-DECISION-BREVE.md:54`).
- **Si se aplaza.** Cada incidencia sigue siendo una generación pagada y descartada (o pagada dos veces).
- **Respuesta del dueño: ____** (A · B · C · otra) · **alerta: ____**

### T-2 — H-EMU-1: el cupo diario en un intento fallido

- **Problema.** `creatorRun` reserva el cupo del día antes de reservar los Credits (`functions/src/creator/index.ts:612`) y ninguna rama de error lo devuelve: un
  «Crear» rechazado por saldo corto, o un trabajo que falla y se reembolsa, gastan cupo (reproducido por EMU en R8, `informe.md` §9 de esa tarea, fuera del repositorio).
- **Opciones literales.** La fuente no trae letras; la v2 lo dejó así:
  > «sí, que un fallo devuelva el hueco» (y el diff, con su reanclaje de F4), «no» o «después»
  > — `docs/WEE-DESIGN-DECISIONES-DEL-DUENO.md:1325`
- **Consecuencias funcionales.** Sí: un intento que no llega a ejecutar no gasta cupo. No/después: sigue gastándolo (80 imágenes y 400 textos por persona y día con
  los límites por defecto, según EMU).
- **Consecuencias técnicas.** `docs/propuestas/h-emu-1-cupo.diff` (+6 −2 en `creator/index.ts`, se aplica en seco [E]) reserva el cupo con nombre de operación
  (`creatorRun:<jobId>:<runId>`) y lo libera en el `catch` que envuelve reserva, `holdCredits` y `arrancarTrabajo`. **Hallazgo de esta tarea [L]: ese diff solo
  cubre el intento que no arranca** (saldo corto, duplicado, foto que falta); **no** cubre el trabajo que arranca y falla después con reembolso, que es el segundo
  caso de H-EMU-1. **Mueve F4** (tamaño de `creatorRun`). Cambia la semántica de la doble pulsación (el cupo pasa a contarse por operación).
- **Riesgos y costes.** S + reanclaje de F4; no toca Credits ni precios.
- **Dependencias.** Otras cosas que mueven F4: T-3 (iii), B-12 (O-1), la opción B de T-1, C-4 (subir el tope). Conviene **un solo reanclaje**.
- **Recomendación técnica [O]: «después»**: completar antes el diff para el caso del fallo con reembolso y aplicarlo junto con el siguiente reanclaje de F4.
  Si se prefiere «sí» ya, especificar el alcance (solo antes de arrancar, que es el diff de hoy).
- **Si se aplaza.** Una caída del proveedor o un saldo corto siguen gastando cupo a una persona a la que se le devuelven los Credits; impacto bajo.
- **Respuesta del dueño: ____** (y, si sí, alcance: ____)

### T-3 — CL-19: cancelar un trabajo

- **Problema.** Hoy no se puede cancelar (`'cancelled'` «no lo escribe nadie»); CL-19 está abierto y ACE-D-13 «no soportado».
- **Opciones literales.**
  > **Tres cosas, separables:** (i) ¿autorizas preparar, **adaptador a adaptador y con tu sí en cada uno**, que una cancelación o un tiempo agotado **pare de verdad al proveedor** (H0 #6)?; (ii) **la regla del dinero** al cancelar: reembolso total o cobrar lo entregado (el «cobro proporcional», H0 #7 y #8: «Es D9 (la política de Credits)»); (iii) ¿autorizas **reanclar F4** si el callable de cancelar vive en `creator/index.ts`?
  > — `docs/WEE-DESIGN-DECISIONES-DEL-DUENO.md:1313`

  Las fuentes primarias: H0 #6 «Cambia los diez adaptadores; la orden fue no reescribir los Provider Adapters. Preparable con su sí, adaptador a adaptador»
  (`docs/DECISIONES-PENDIENTES.md:59`) y H0 #7/#8 «Cobrar solo lo entregado cuando un plan falla a medias | Es D9 (la política de Credits)»
  (`docs/DECISIONES-PENDIENTES.md:66`). Las dos salidas de (ii) las formuló la v2; la fuente solo nombra «cobrar solo lo entregado».
- **Consecuencias funcionales.** Un botón de cancelar con una regla clara para el dinero; con (i), el proveedor deja de trabajar (y de cobrar) de verdad.
- **Consecuencias técnicas.** (i): los diez adaptadores, uno a uno. (iii): un callable en `creator/index.ts` (**F4**) y un método en `services/creatorService.ts`.
  (ii) con «cobrar lo entregado» toca el protocolo financiero (D9 del Algorithm Engine, aplazada).
- **Riesgos y costes.** L. Con «reembolso total», Weë asume el coste de proveedor de lo que ya se generó al cancelar (frecuencia desconocida).
- **Dependencias.** Sin (ii) no se programa nada; el «cobro proporcional» del Algorithm Engine; F4 compartida con T-2.
- **Recomendación técnica [O]: (i) sí, empezando por los adaptadores de imagen · (ii) reembolso total** (es lo que ya hace un fallo hoy: no crea una regla de dinero
  nueva; el cobro proporcional queda para cuando se decida D9) **· (iii) sí**, en el mismo reanclaje de F4 que T-2.
- **Si se aplaza.** CL-19 sigue abierto y Design no llega a «terminado»; un trabajo largo no se puede parar.
- **Respuesta del dueño: (i) ____ · (ii) ____ · (iii) ____**

---

## 7. Sección 5 — Recuperación y sistema

**Lo que ya se sabe** (informe INC de R8: `C:\Users\Geovet\AppData\Local\Temp\bloque\integracion\cierre\ronda-r8\INC-incidente\informe.md`, §0–§7; investigación de
solo lectura): faltan **1 408 archivos** seguidos por git en el worktree `scratchpad\fil` (rama `harness/cierre-2a-ronda`, HEAD `964451aa`); otros **15 worktrees** de
`scratchpad\` perdieron entre 1 015 y 1 392 archivos el 8, 9 y 11 de octubre. **Se perdió trabajo sin commit**: los **55 archivos nuevos del filipino** (no están en ningún
commit ni objeto de git) y modificaciones sin commit en archivos versionados. Causa más probable (**hipótesis fuerte, no demostrada**): la limpieza automática de
temporales de Windows (Sensor de almacenamiento activado; tarea `SilentCleanup`), porque todas las pérdidas coinciden al minuto con ventanas de mantenimiento y todo vive
en `%LOCALAPPDATA%\Temp`; ninguna orden de un agente toca `fil` en esas horas. `main` y las ramas `r8/*` están intactos. Hoy `fil` sigue con 1 408 ` D`, 63 ` M` y 32 ` A`
[E: `ronda-r9\INC\fil-status-ahora.txt`, captura de INC2].

**Las opciones exactas las prepara la tarea INC2 de esta ronda** en `C:\Users\Geovet\wee-trabajo\ronda-r9\INC\`. **A la hora de cerrar esta hoja, su informe todavía no
existe** (la carpeta solo tiene datos de trabajo: estado de los worktrees, listas de borrados, `causa\`, `reconstruccion\`); cuando exista, **sus opciones mandan sobre
las de esta sección**, que son las del plan de recuperación de R8 (§7 del informe INC), redactadas como preguntas. **Nada de esto se ha ejecutado**: cada paso requiere el sí
del dueño, y cambiar la configuración de Windows solo lo puede hacer el dueño.

### S-1 — Contener la limpieza de temporales de Windows

- **Problema.** Mientras la limpieza siga activa, todo lo que viva en `%TEMP%` puede volver a perderse: los worktrees de `scratchpad\`, los `node_modules` de los
  worktrees de R9 (uniones a `…\Temp\…\scratchpad\wt-recuperacion\`, según el BRIEF-R9) y **las carpetas de evidencia de las rondas R7 y R8**, incluido el propio
  informe INC, que están en `%TEMP%\bloque\`.
- **Opciones literales** (informe INC, §7, «Paso 0, urgente: contener»):
  > (a) Desactivar «eliminar archivos temporales» del Sensor de almacenamiento, o excluir la carpeta. Es un ajuste del sistema y **lo debe hacer el dueño**.
  > (b) Copiar FUERA de `%TEMP%` (copia, no movimiento) lo que sobrevive sin commit: los 63 ` M` y los 32 ` A` de `fil`, `scratchpad/mision-post/`, `fil-tools/`, `fil-research/` y los commits locales de los worktrees R7/R8 que no estén en ninguna rama remota.
  > (c) Plantearse mover los worktrees de trabajo a una ruta que no sea temporal.
- **Consecuencias funcionales.** Ninguna para la app. Para el trabajo: deja de haber riesgo de nuevas pérdidas.
- **Consecuencias técnicas.** (a) es un ajuste de Windows (no de Weë). (b) una copia, sin tocar git. (c) **ya está hecho para R9** (los worktrees `wt-r9-*` viven en
  `C:\Users\Geovet\wee-trabajo\`), pero no para `scratchpad\*`, los `node_modules` enlazados ni las carpetas de evidencia de `%TEMP%\bloque\`.
- **Riesgos y costes.** Desactivar la limpieza deja crecer `%TEMP%` (espacio en disco); excluir solo la carpeta lo evita. Coste: minutos del dueño.
- **Dependencias.** S-2 y S-3 tienen sentido después de (a) y (b).
- **Recomendación técnica [O]: (a) ya** (excluir la carpeta si se prefiere no desactivar todo), **(b) ya**, añadiendo `%TEMP%\bloque\` (evidencia de R7/R8) y el
  destino de las uniones de `node_modules`, **y (c)** para lo que siga en uso.
- **Si se aplaza.** La próxima ventana de mantenimiento puede borrar los 63 ` M` y 32 ` A` que sobreviven en `fil`, la evidencia de R7/R8 y los `node_modules` de R9.
- **Respuesta del dueño: (a) ____ · (b) ____ · (c) ____**

### S-2 — Recuperar `scratchpad\fil`

- **Problema.** El worktree del filipino (rama `harness/cierre-2a-ronda`; fase técnicamente cerrada el 2026-10-03, pendiente de revisión nativa) perdió 1 408 archivos; 1 353 están en
  `HEAD 964451a` y 55 no están en ningún sitio de git.
- **Opciones literales** (informe INC, §7, pasos 1 a 5; cada uno «requiere autorización del dueño»):
  > **Paso 1: guardar la evidencia.** Copiar `git -C fil status --porcelain` y `git -C fil diff` (diff de los 63 M) a un archivo fuera de `%TEMP%`.
  > **Paso 2: versionados sin trabajo propio (la mayoría de los 1 353).**
  > **Paso 3: candidatos con trabajo filipino perdido**
  > **Paso 4: los 55 archivos del filipino.**
  > **Paso 5.** `npm ci` en `fil` y en `functions/`.

  El paso 2 restaura solo las rutas que están en HEAD con `git restore --source=964451a --worktree`, nunca sobre rutas ` M` o ` A`; el 3 reaplica el trabajo con los
  scripts supervivientes de `scratchpad/mision-post/` y las ediciones de las transcripciones; el 4 reconstruye los 55 archivos desde las transcripciones de los 12
  subagentes traductores «Si no sale fiel, volver a traducir siguiendo `docs/I18N-FILIPINO.md`».
- **Consecuencias funcionales.** Ninguna para la app hasta que el filipino se integre (no está en `main`).
- **Consecuencias técnicas.** Escribir en un worktree ajeno (`fil`): **prohibido sin este sí**. 1–2 son mecánicos y verificables por hash; 3–4 son reconstrucción y
  pueden no ser fieles (la lista exacta de lo modificado antes del incidente **no se puede reconstruir**, informe INC §3).
- **Riesgos y costes.** 1–2: S, bajo riesgo. 3–4: M–L; el resultado se valida con `tsc`, `i18n-filipino`, `catalogo-i18n`, `i18n-cobertura` y la revisión nativa
  que ya estaba pendiente.
- **Dependencias.** S-1 (a) y (b) antes; las opciones exactas de INC2.
- **Recomendación técnica [O]: pasos 1 y 2 ya; 3, 4 y 5 cuando INC2 entregue sus opciones** (para el 4, reconstruir y, si no es fiel, volver a traducir).
- **Si se aplaza.** El trabajo superviviente sigue en riesgo (S-1) y el filipino no puede retomarse.
- **Respuesta del dueño: pasos 1–2 ____ · paso 3 ____ · paso 4 ____ · paso 5 ____**

### S-3 — Los otros 15 worktrees con borrados

- **Problema.** `da`, `ensayo-integracion`, `fase2`, `fm/*`, `freno-vercel`, `harness`, `hi`, `ja`, `sv`, `tr`… perdieron archivos; casi ninguno tenía trabajo sin commit
  (según el informe, un `??` en hi/ja/sv/tr y dos en fm/wt, que hay que revisar).
- **Opciones literales** (informe INC, §7, paso 6):
  > Restaurar desde su HEAD con `git restore --worktree`, o eliminarlos y recrearlos si ya no se usan.
- **Consecuencias funcionales / técnicas.** Ninguna para la app; ordena el disco y la lista de worktrees.
- **Riesgos y costes.** S. Eliminar un worktree con un `??` sin revisar lo perdería.
- **Dependencias.** S-1.
- **Recomendación técnica [O]: restaurar los que se usen y eliminar y recrear el resto**, después de revisar los `??`.
- **Si se aplaza.** Ninguno; siguen rotos.
- **Respuesta del dueño: ____**

---

## 8. Sección 6 — Otras autorizaciones de la v2 que siguen abiertas

Detalle completo en la v2, §F (filas AUT-3, AUT-5, AUT-6, AUT-7 y AUT-9). **AUT-1** es T-1, **AUT-2** es T-3, **AUT-4** son V-2 y V-3, **AUT-8** es V-4 y
**AUT-10** es T-2.

| Id | Qué se pide (resumen de la v2) | Opciones | Recomendación [O] | Respuesta del dueño |
|---|---|---|---|---|
| **O-1** (AUT-3) B-12 | Autorizar el diff (no aplicado) para que un trabajo no pueda guardarse en un proyecto ajeno; y, aparte, su despliegue. Mueve **F4** | sí · no · después; despliegue aparte | **sí al diff, en el mismo reanclaje de F4**; despliegue después | ____ |
| **O-2** (AUT-5) CL-21 | Ejecutar tú `node ops/reconciliacion/reservas-colgadas.mjs` (solo lectura de producción) y anotar el resultado | ejecutarlo · no | **ejecutarlo** (no escribe nada) | ____ |
| **O-3** (AUT-6) CL-22 | Autorizar el canario gobernado en `get-wee` y fijar tres cifras: bienvenida de cuentas anónimas, tope de gasto diario, cupo del planificador | sí (con cifras) · no · después | **después**, cuando el puente y D4–D6 estén construidos | ____ |
| **O-4** (AUT-7) danés | Encargar la revisión nativa de 13 cadenas danesas nuevas | sí · no | **sí** | ____ |
| **O-5** (AUT-9) `CLAUDE.md` §5 | Corregir tú el texto «referencia visual definitiva» para que no lo diga de `wee-chef.jpg` ni de `wee-design.jpg` | lo corrijo · no | **corregirlo** si Chef D-1 = A | ____ |

---

## 9. Cómo se registra una respuesta

Contestar aquí **no registra nada**. El repositorio fija el formato, y lo escribe el dueño o quien coordina en la fila de la tabla fuente:

> una decisión de §4, escribe `**DECIDIDA (fecha): opción**` en su fila: el corredor la lee.
> — `docs/DESIGN.md:10`

Las filas son las de `docs/DESIGN.md` §4 (D1–D9) y `docs/WEE-DESIGN-UIUX-DECISIONS.md` §2 (DEC-xx); las de Chef, en `docs/WEE-CHEF-ESPECIFICACION.md` §8.2. V-1…V-4,
C-3…C-5, T-1…T-3, S-1…S-3 y O-1…O-5 **no tienen fila**: la respuesta queda en la conversación o en el documento de cada una.

---

## 10. Cómo se verificó esta hoja (y qué se corrigió en la v2)

| Comprobación | Resultado |
|---|---|
| La v2 contra la base: citas de la v2 en archivos que cambiaron entre `c3f7f9a7` y `9365153a` (`deriva.mjs`, comparando el texto citado en las dos bases) | 96 citas en archivos cambiados; **43 con deriva** [E] |
| Reanclaje de la v2 con el mapa exacto de `git diff -U0` (`reanclar-citas.mjs`) | **40 reancladas**; **3** cuyo contenido había cambiado, corregidas a mano (CHEF-05, el comentario del muro ya retirado, la línea de estado del cierre) [E]; nota R9 al principio de la v2 con lo que ya no es verdad y la corrección de AUT-10 |
| `citas-verificar.mjs` (R7-Design) sobre la v2 y sobre esta hoja | ver el informe de la tarea (`ronda-r9\DEC\informe.md`) |
| Cada opción literal de esta hoja está, tal cual, en la línea que cita (`literales.mjs`) | ver el informe de la tarea |
| Corredor hoy y simulación del registro (`simular-registro.mjs`, en memoria) | 14 · 3 · 9 · 2 hoy; 16 · 10 · 0 · 2 con las trece [E] |
| `git apply --check` de los diffs propuestos sobre la base | `router-contabilidad`, `reanclaje-borrador-D`, `reanclaje-borrador-D+I`, `rendimiento-PR1`, `h-emu-1-cupo`: se aplican; `cl25-borrar-specialisthero`: **solo sin su trozo de `docs/WEE-DESIGN-CIERRE.md`** [E] |
| Contrastes de V-2 recalculados con la fórmula WCAG 2.x | idénticos a los de la auditoría [E] |
| La marca de registro del corredor solo aparece en la cita literal del formato (§9) | sí |

**No verificado:** el aspecto en pantalla (sin web ni emuladores), cualquier comportamiento de un proveedor, el contenido de las ramas no integradas (el puente), la
causa de las pérdidas más allá de lo que dice el informe INC, y las opciones de INC2 (su informe aún no existía).
