# Weë Design — el puente «Crear» → `CreatorFlow` (PREPARADO, no integrado)

**Estado.** Rama `r7d/puente`, desde `a64ff24` (ronda R7-Design, 2026-10-11, tarea P). Está **preparado, probado y listo para un solo `git merge`**,
y **no se integra** hasta que el dueño responda D1, D2 y D7 de [DESIGN.md](DESIGN.md) §4. No toma ninguna de esas decisiones, no escribe en ninguna de sus
filas y no deja el puente activado en ninguna otra rama: lo que hace es **presuponer** una respuesta y decir cuál (§3) y qué cambiaría con otra.

**Marcas** (las de [WEE-DESIGN-CIERRE.md](WEE-DESIGN-CIERRE.md)): **E** ejecutado (lo corrí y dio eso) · **L** leído (código leído, sin ejecutar) · **I** inferido.

## 1. Qué hace

Hasta ahora «Crear» en la pantalla montada de Weë Design (`screens/DesignScreen.tsx`) era un temporizador de 1,6 s y un aviso que decía «esto es una
demostración» (E: `aceptacion-pantallas` E, antes de este cambio). Con el puente, «Crear» **lleva a `CreatorFlow`** —que es donde ya están las preguntas, el plan
con su precio, la reserva, el progreso y el resultado— con **solo lo escrito y los ajustes elegidos dichos en palabras**:

```
navigation.navigate('CreatorFlow', { experienceId: 'design', workspace: 'design', goal: '<lo escrito> · <ajustes en palabras>' })
```

| Archivo | Qué cambia |
|---|---|
| `screens/DesignScreen.tsx` | `alCrear` arma el contexto con `contextoDeDesign` y navega (o va a `Login` sin sesión). Se van el temporizador, `AvisoDeCreacion`, su estado, el `ocupado` de la caja y el teclado que subía el aviso. Entra `useAuth`. Sigue con **un** `any` (el `useNavigation<any>()`: la línea base de `ops/revision/baseline.json`) |
| `utils/contextoDeDesign.ts` (nuevo) | `contextoDeDesign` —**sale** de `utils/designReferencia.ts`— y `palabrasDeLosAjustes`. Módulo neutro: no importa nada de la referencia (así `DesignScreen` sigue sin «saber» que existe: I17) |
| `utils/designReferencia.ts` | Re-exporta `contextoDeDesign` con su catálogo `QUE_SE_DISENA` (`idsDeQue`). La referencia da **lo mismo que antes** (E: `puente-design` B6, contra el cuerpo de antes de extraer) |
| `functions/test/puente-design.test.mjs` (nueva, en la cadena) | La prueba de comportamiento del puente: 68 comprobaciones en cuatro grupos, con su CONTROL cada detector |
| Pruebas y documentos que describían la demostración | `cajas-weeai` 23, `design-referencia` I18, `aceptacion-pantallas` E, `WEE-DESIGN-CIERRE` (veredicto y dos filas), `WEE-ACEPTACION` (ACE-D-04 y ACE-D-06), `functions/package.json` (un paso). Cada uno con su motivo en §7 |

**No toca** `functions/src`, `components/studio/StudioPromptComposer.tsx`, `CreatorFlowScreen.tsx`, Credits, precios ni ninguna cerca. No añade claves de i18n (no hay texto nuevo),
ni dependencias, ni estructura visual: la pantalla se ve igual salvo que ya no sale el aviso de demostración.

## 2. Lo que viaja y lo que NO

| Viaja | Cómo |
|---|---|
| `experienceId: 'design'` | Lo declara la puerta de Design a través de `destinoDeIntencion` (el de Weë Studio): no hay un router nuevo |
| `workspace: 'design'` | Transporte: nadie lo lee hoy (L: `grep` de `.workspace` en `screens/ components/ utils/ hooks/ services/ navigation/`: ningún lector). En la web, la navegación lo escribe como parámetro de la dirección (`App.tsx` lo valida como identificador) |
| `goal` | Lo escrito, recortado solo en los extremos, y detrás ` · ` y los ajustes en palabras. **Nunca sale en la dirección web** (L: `App.tsx`, `goal: nuncaEnLaUrl`). El servidor lo corta a **300** caracteres (L: `functions/src/creator/index.ts:310`): lo que va al final —los ajustes— se pierde primero |

| NO viaja (a propósito) | Por qué |
|---|---|
| Un preset de la puerta por la que se pasó | Llevar cada puerta a una intención de la plantilla es D1 y D7: del dueño. `contextoDeDesign` ya acepta `que` **más** `idsDeQue`; sin el catálogo no sale ningún preset (E: B4, A10) |
| Una foto al crear, ni las referencias de la caja | La plantilla `design` la ignora (L: `inputs.ts:14-23`) y `CreatorFlow` enseñaría «Foto lista» para una foto que no se usa (F-07). Las referencias de la caja son además nombres de muestra (CL-09, D6) (E: A13) |
| Formato y calidad como estructura | El plan solo los lee como palabras del objetivo: no cambian el `aspectRatio` (CL-14, D5) ni el nivel que se cotiza (eso se elige en la tarjeta del plan, en `CreatorFlow`) |
| Credits | La pantalla no los toca y llegar no cuesta ninguno: `creatorChat` crea el trabajo con `creditsEstimated: 0, creditsCharged: 0` y solo `creatorRun` reserva (L: `creator/index.ts:325-326, 613`). Esto es lo que la pantalla de Design **no** hace (E: A14, C5) |
| `projectId` | Crear desde un proyecto es CL-20 (otra tarea); el trabajo entra en un proyecto con `assignJob` al terminar |

## 3. Qué presupone — decisión por decisión

| | Qué presupone el puente | Con otra respuesta, qué cambia | Dónde se enchufa |
|---|---|---|---|
| **D1** ¿qué es Weë Design? | Que mandar el texto libre a la plantilla `design` es aceptable. Esa plantilla es de **diseño gráfico y concepto** (logo, redes, producto, vehículo o máquina, lugar, personaje: L `templates.ts:331-587`); las puertas de la pantalla son más **físicas** (Interiores, Arquitectura, Espacios, Mobiliario, Vehículos…) | **A** (todo; la recomendación): falta el mapa puerta → intención de la plantilla, que **no existe** (F-03) y que hay que decidir y construir: una tabla en `constants/designTools.ts`, y que la pantalla recuerde la puerta (`camino` la olvida al elegir un punto). Se enchufa en `contextoDeDesign({ que, idsDeQue })`, que ya lo admite. **B** (solo lo físico): Interiores/Arquitectura/Espacios/Mobiliario deberían ir a Hogar & Diseño (`home`), que trabaja sobre la foto de un espacio: `contextoDeDesign({ intencion: 'transformar', adjuntos })` ya lo hace, pero la pantalla no tiene selector de foto (CL-09). **C** (solo gráfico): se retiran las puertas físicas; es `designTools.ts`, no el puente | `utils/contextoDeDesign.ts` y `constants/designTools.ts` |
| **D2** entregables | Solo la experiencia `design`. Hogar & Diseño **no** tiene puerta (CL-02 sigue abierto) | **B** (la recomendación): hace falta la puerta a `home` (P2 de [WEE-DESIGN-CIERRE.md](WEE-DESIGN-CIERRE.md) §7; el módulo neutro ya sabe `transformar`). **A** o **C**: nada que añadir al puente; **C** retira puertas | `components/design/` (P2) |
| **D7** puertas sin capacidad | Que lo que escribe quien toca «Maqueta 3D», «Recorrido» o «Antes y después» (Renders) se manda como texto a `design`. **La plantilla hará tres imágenes, no una maqueta, un vídeo ni un antes y después**, y se cotizará y cobrará como imágenes (E: `infer` de esos tres textos no fija «qué», así que `CreatorFlow` preguntará «Cuéntame qué necesitas…»; ver §6, R4) | **A** (llevarlas a lo que existe): cada punto con su destino (Studio, Hogar & Diseño, imagen) en vez de todos a `design`; **B** (retirarlas): se borran de `designTools.ts` (ojo: `design-cierre` A1 exige 3 a 6 puntos por puerta); **C** (esperar a un proveedor 3D): se quedan como están y el riesgo R4 sigue | `constants/designTools.ts` y `alElegirPunto` |
| **D6** referencias (no es de las tres, pero se ve) | Nada: las fichas de referencia **siguen siendo nombres de muestra** y no viajan (A13) | **A** (`image.reference`): el selector real y `adjuntos` en el contexto; **C** (ocultar el botón): requiere que `StudioPromptComposer` acepte `onReferencia` opcional (P5, componente compartido) | P4 / P5 |
| **D3, D4, D5, D8, D9** | No los toca: «Editar» sigue abriendo un trabajo nuevo, el afiche sigue sin texto dentro de la imagen y «Formato» sigue siendo una palabra | Son del servidor y de `CreatorFlow` | — |

**Si el dueño acepta las recomendaciones de DESIGN.md (A, B, A)** el puente se aplica tal cual **y** quedan por hacer —no por decidir— la puerta a Hogar & Diseño (P2) y el mapa puerta → intención: el puente
no los estorba, los espera.

## 4. Casos de borde, con el criterio que menos asume

| Caso | Qué hace | Por qué | Prueba |
|---|---|---|---|
| Caja vacía + «Crear» | **Nada.** El botón ya está apagado (la caja lo apaga sin texto: `CajaDePrompt.puedeEnviar`); aunque se llame a la fuerza, no navega ni va a Login | Ninguna otra caja de Weë AI inventa un objetivo. Navegar con el de la plantilla (`Diseñar algo que imagino`, L `templates.ts:334`) crearía un trabajo vacío por cada toque y sería otra decisión de producto | A9, C8 |
| Un punto de partida sin más texto | `alElegirPunto` deja la idea empezada en la caja («Un salón ») y «Crear» manda **esa** idea, sin el espacio que sobra. Con algo ya escrito, el punto no lo pisa (F-02, existente) | Es lo que ya hacía la pantalla; el puente no lo cambia | A10 |
| Doble toque | Dos órdenes `navigate` iguales; la pila de verdad (`@react-navigation/routers` 7.6.4, ejecutada) las convierte en **una** `CreatorFlow`. Con `push` serían dos creaciones: por eso es `navigate` | `StackRouter` reutiliza la pantalla que ya está arriba y le cambia los parámetros; el trabajo se crea al montar, no al navegar | A11 (con su CONTROL: con `push` la misma pila apila dos) |
| Volver atrás desde `CreatorFlow` | La caja **conserva** lo escrito, los ajustes y las referencias: la pantalla queda debajo en la pila y no se vacía nada al crear (igual que Weë Studio; `cajas-weeai` 21 prohíbe `setPrompt('')`) | Lo contrario perdería la idea de quien vuelve a ajustarla | A12 |
| Sin sesión | A `Login`, como el resto de pantallas de Weë AI. `CreatorFlow` también lo comprueba (L: `CreatorFlowScreen.tsx:196-199`) | — | A8 |
| Ajustes | «Automático» no dice nada; lo elegido sale en palabras **en el idioma de la persona**, en el orden del primer toque a cada grupo (como en la referencia) | El plan no los lee como estructura | A4–A6, B7 |
| Texto largo | Sale entero; el servidor corta a 300 y los ajustes —al final— se pierden primero (R6) | Cortar es del servidor; cambiar el orden es la decisión `B-03 (i)` de la ronda anterior | A7 |

## 5. Cómo aplicarlo, probarlo y revertirlo

```
git merge --no-ff r7d/puente          # sobre la rama de integración, con el árbol limpio
```

- **Conflictos esperables** (medidos, E: `git merge-tree --write-tree` de esta rama contra `r7d/cliente`, `r7d/evals` y `r7d/servidor`, que ya traían commits el 2026-10-12: chocan **solo** `docs/WEE-DESIGN-CIERRE.md` y `functions/package.json`, y ningún archivo de código; con `r7d/decisiones` no hay ninguno. Son textuales y los resuelve quien integra): `functions/package.json` (el script `test` es **una línea**; el paso nuevo va al final: ` && node test/puente-design.test.mjs`; la herramienta de integración de la ronda,
  `resolver-package.mjs`, lo une), la línea del veredicto de `docs/WEE-DESIGN-CIERRE.md` y la fila de ACE-D-06 de `docs/WEE-ACEPTACION.md`. **El veredicto** (`De los 28 criterios de cierre, **N se cumplen…**`) lo editan todas las ramas que cierran un `CL-xx`: `design-cierre` C3 exige que cuente lo mismo que
  el corredor, así que tras fusionar varias hay que recalcularlo con `node functions/test/_design-cierre.mjs | tail -3`.
- **Es un merge, no un cherry-pick:** los ajustes a pruebas existentes (§7) son parte del puente; sin ellos la cadena falla (`cajas-weeai` 23, `aceptacion-pantallas`, `design-cierre` C3, `foundation-de-experiencias` I18, `ci-workflow` 13).
- **Revertir** (ya fusionado): `git revert -m 1 <merge>`. Los archivos de código vuelven a como estaban; la demostración vuelve con su aviso. No hay migración, ni dato, ni configuración que deshacer: el puente es solo cliente (`functions/src` no cambia, y por eso `functions/lib` tampoco).
- **Qué pasos exige el dueño antes de fusionarlo** (no los hace esta rama): responder D1, D2 y D7; y, **antes de desplegar**, el canario y la suite de emulador (§6, R2).

## 6. Riesgos

| | Riesgo | Marca |
|---|---|---|
| R1 | **Cuesta Credits.** Quien pulse «Crear» en el plan de `CreatorFlow` reserva y cobra: de **prueba** mientras `CREATOR_PRICING_MODE=simulated` (el valor por defecto) y **reales** el día que el dueño active precios y proveedores reales. En precios de prueba el resultado de muestra se cobra a propósito (`DESIGN.md` §5). Desplegar el cliente con el puente es entregar ese camino a cualquiera que abra Weë Design | L |
| R2 | **Este camino «nunca ha corrido en producción»** (`DESIGN.md` §5): ninguna de las 40 suites de emulador recorre `creatorRun` de `design` (CL-18) y no hay canario (CL-22). `main` no es producción: `creatorChat` y `creatorRun` desplegados son anteriores a los arreglos de la auditoría H0 | L, E (CL-18) |
| R3 | **Llegar a `CreatorFlow` no cuesta Credits, pero sí puede costar una consulta al planificador**: con un proveedor de texto disponible (`text.structure`: `planner.ts:276`) Weë Brain consulta un modelo para entender lo escrito, y sin él usa la plantilla, que no cuesta nada. Es gasto de proveedor, no de la persona, y su cupo es una decisión del dueño (`DESIGN.md` §5). Es el único gasto de proveedor que el puente provoca antes de que alguien confirme | L |
| R4 | **Las puertas prometen más de lo que el motor hace** (CL-05, D7): «Una maqueta 3D», «Un recorrido», «Un antes y después», «Un render realista» y «Una vista aérea» acaban en la plantilla gráfica, que siempre propone **un concepto y tres imágenes** (L: `buildPlan`, `templates.ts:577-585`). Además, de los 35 puntos de partida solo **13** (es) / **3** (en) fijan «qué» sin repreguntar (E: `TEMPLATES.design.infer` sobre cada texto, el mismo 13/35 y 3/35 de `ACE-D-03`): los demás llegan a la primera pregunta de la plantilla. Es el hueco D1/D7, no un defecto del puente, pero el puente lo pone delante de la gente | E, L |
| R5 | **Las referencias de la caja no hacen nada** (D6, CL-09): la persona ve su ficha, con su aspa, y la creación no la usa. Antes el aviso decía «demostración»; ahora no hay nada que lo diga | E (A13) |
| R6 | **El recorte a 300 y la posición de los ajustes** (`B-03 (i)`): con una idea de más de ~240 caracteres los ajustes se pierden. «Alta» y «Estándar» tampoco dicen de qué grupo son («Calidad») cuando van en la frase | L |
| R7 | **`CreatorFlow` tiene defectos conocidos que el puente expone a más gente**: sin «No sé» en seis preguntas de `design` (CL-10), «Un post para mi marca» sale logo (CL-11), el reintento tras un fallo de cotización crea en vez de cotizar (CL-12), «Editar» abre un trabajo nuevo desde cero (CL-13), no se puede cancelar (CL-19). Otras tareas de la ronda cierran algunos; ninguno es del puente | L (CL del corredor) |
| R8 | **El estado «CUMPLIDO» de CL-01 y CL-03 es de máquina, no de producto**: el corredor mide que el código navega, no que D1, D2 y D7 estén respondidas (CL-05 y CL-23 siguen en DECISION) | E |

## 7. Pruebas y documentos que cambian, y por qué

| Archivo | Cambio | Motivo |
|---|---|---|
| `functions/test/cajas-weeai.test.mjs` (23) | Studio sigue igual; Design pasa de «sube el aviso con el teclado» a «ya no monta aviso, ni teclado, ni temporizador, y navega con `contexto`» | El aviso de demostración ya no existe en Design. Es el ajuste que ya preveía P1 de [WEE-DESIGN-CIERRE.md](WEE-DESIGN-CIERRE.md) §7 |
| `functions/test/design-referencia.mjs` (I18) | Busca `destinoDeIntencion(` también en `utils/contextoDeDesign.ts` | `contextoDeDesign` se extrajo allí. P1 hablaba de I17 («si se extrae el módulo»): **I17 sigue verde sin tocar** (la pantalla no menciona la referencia); la que lee el archivo movido es I18 |
| `functions/test/aceptacion-pantallas.test.mjs` (E) | Sin aviso ni «ocupada»; «Crear» con idea abre `CreatorFlow`; **el hueco `ACE-D-06` se convierte en una comprobación normal** | El procedimiento de `_aceptacion.mjs`: un hueco que se cierra hace fallar la suite a propósito hasta que se convierte. P1 no lo preveía: la suite llegó después, con la integración `a64ff24` |
| `docs/WEE-DESIGN-CIERRE.md` | El veredicto (4 → 6 cumplen; 11 → 10 abiertos; 9 → 8 en decisión) y las filas de CL-01 y CL-03 | `design-cierre` C3 exige que el veredicto cuente lo mismo que el corredor |
| `docs/WEE-ACEPTACION.md` | ACE-D-04 y ACE-D-06 pasan a PASA; «hoy son dos» comprobaciones con marca de decisión | Coherencia con la suite anterior |
| `functions/package.json` | Un paso al final de `test` | `ci-workflow` 13 |

**Siguen describiendo la demostración y NO se han tocado** (no son del puente; se actualizan cuando el dueño responda): `docs/DESIGN.md` §1 y §5 (F2), `docs/INTEGRACION-FLUJO-E2E.md` (la fila F2, el veredicto del flujo de Design y B-01), `docs/WEE-DESIGN-UIUX-AUDIT.md` (el resumen y la tabla de botones), y las partes históricas de
`docs/WEE-DESIGN-CIERRE.md` (§1, §3 y §5, que hablan de `d867774`). Tampoco se ha tocado `design-cierre.test.mjs`: B1 es verdad antes y después («si queda un temporizador, el aviso se queda»).

## 8. Criterios del corredor

| CL | Antes | Con el puente | Por qué |
|---|---|---|---|
| **CL-01** «Crear» llega a `CreatorFlow` | DECISIÓN | **CUMPLIDO** | La pantalla navega a `CreatorFlow` y no tiene el temporizador |
| **CL-03** lo elegido viaja | ABIERTO | **CUMPLIDO** | La pantalla arma el contexto de Design con los ajustes en palabras |
| CL-02 puerta a Hogar & Diseño | DECISIÓN | DECISIÓN | Es P2 y D2 (B); el puente no pone la puerta |
| CL-04 «Mis creaciones» | ABIERTO | ABIERTO | P3 |
| CL-05 las puertas prometen lo que el motor hace | DECISIÓN | DECISIÓN | D1 y D7 (R4) |
| CL-09 referencias reales | DECISIÓN | DECISIÓN | D6 (R5) |
| CL-23 D1–D9 y DEC-xx registradas | DECISIÓN | DECISIÓN | Del dueño |

El corredor pasa de **4 cumplidos · 11 abiertos · 9 en decisión · 4 manuales** a **6 · 10 · 8 · 4**. (Detalle: `node functions/test/_design-cierre.mjs --solo CL-01,CL-03` da CUMPLIDO para los dos. El corredor solo lee la primera aparición de `--solo`: con dos —`--solo CL-01 --solo CL-03`— ejecuta solo CL-01 y lo dice con «Ejecución parcial (1 de 28)»; la forma documentada es con coma.)

## 9. Pruebas que deben pasar tras aplicarlo

```
node functions/test/puente-design.test.mjs                  # el puente: 68, con su CONTROL cada detector
node functions/test/cajas-weeai.test.mjs                    # 23 adaptado; 11, 20 y 21 siguen
node functions/test/ajustes-weeai.test.mjs                  # 24: la hoja común, con su catálogo
node functions/test/credits-weeai.test.mjs                  # la pantalla no toca el saldo
node functions/test/design-cierre.test.mjs                  # A, B (B2: ningún servicio) y C3 (el veredicto)
node functions/test/aceptacion-pantallas.test.mjs           # E y F
node functions/test/foundation-de-experiencias.test.mjs     # I17 intacto, I18 adaptado, la referencia como antes
node functions/test/puente-studio.test.mjs                  # el contrato del contexto es UNO
node functions/test/navegacion-enlaces.test.mjs             # el objetivo no sale en la dirección
node functions/test/i18n-textos-a-mano.test.mjs             # ningún texto nuevo escrito a mano
node functions/test/puente-pre-f1d.test.mjs                 # las cercas: no se mueve ninguna (functions/src no cambia)
node functions/test/ci-workflow.test.mjs                    # 13: toda suite está en la cadena
node scripts/escaneo-secretos.mjs
node functions/test/_design-cierre.mjs --solo CL-01,CL-03   # CUMPLIDO los dos
NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit     # 0 errores (PESADO)
node functions/test/_cadena.mjs                             # 312 pasos (PESADO): quien integra
```

## 10. Lo ejecutado frente a lo inferido

| Ejecutado (E) | Leído (L) o inferido (I) |
|---|---|
| La pantalla de verdad, tocada con `_pantallas.mjs`: contexto exacto, Login, «Automático», ajustes en español e inglés, caja vacía, punto de partida, doble toque, volver, sin servicios ni temporizadores | **L** `workspace` sin lectores; el objetivo fuera de la dirección web; `creatorChat` sin reserva; el recorte a 300 |
| La pila de verdad (`StackRouter` 7.6.4): `navigate` ×2 → una `CreatorFlow`; `push` ×2 → dos | **I** que en el dispositivo la pantalla queda montada debajo y conserva su estado (es lo que hace la pila; no se probó en un teléfono ni en la web) |
| La extracción: la referencia da lo mismo que antes en 15 entradas | **I** que nadie más llama a `contextoDeDesign` fuera de `DesignReferenciaScreen` (`grep`: no hay otro) |
| 16 sabotajes sobre la rama (informe) | **No ejecutado:** el aspecto en web/móvil (CL-26), la suite de emulador (CL-18), el canario (CL-22), la cadena entera (CL-28) |
