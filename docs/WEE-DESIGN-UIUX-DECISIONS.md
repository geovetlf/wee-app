# Weë Design — decisiones de UI/UX (referencia funcional)

Qué se decidió en esta misión (y por qué), qué **espera al dueño**, y qué no empieza ahora. Las decisiones de producto de
[DESIGN.md](DESIGN.md) (**D1–D9**) siguen siendo del dueño: aquí no se toma ninguna, se enlazan.

## 1. Tomadas en esta misión (y reversibles)

| Id | Decisión | Por qué | Cómo se revierte |
|---|---|---|---|
| DEC-03 | La caja de la referencia **va a `CreatorFlow`** (es la F2 de DESIGN.md), solo con la puerta abierta | Es el único camino real de Weë Design; inventar otro sería un segundo camino de generación. Detrás de la puerta no cambia nada para nadie | Cerrar la puerta (ya lo está) |
| DEC-04 | **Marco = `CreatorShell`**, como la producción de Filmmaker | Da la barra lateral de Weë AI y el saldo por la vía que la regla permite (`credits-weeai` 11–13), y la caja anclada del teléfono | Cambiar el marco en una pantalla |
| DEC-04b | **Composer anclado bajo el lienzo** (`CajaAnclada`), con la intención encima | El lienzo es lo que se mira; la caja es lo que se hace; las dos a la vista. Cumple CLAUDE.md §9 | Mover la caja a la biblioteca |
| DEC-06a | **Exportar por destino** (juego, animación, impresión, web y AR, render, edición profesional, 🤷 No sé) en vez de por formato | CREATOR.md §14: sin lenguaje técnico | La lista de destinos la confirma el dueño (DEC-06) |
| DEC-13a | Disposición **por ancho útil medido** (tres columnas ≥ 1000, dos ≥ 720, una superficie por debajo) | La barra lateral de Weë AI se come 232 en escritorio | Cambiar dos números en `utils/designReferencia.ts` |
| DEC-14a | **Sin micrófono** en la caja de la referencia | No hay dictado conectado en Weë Design (H-1): un botón que no hace lo que dice no se pone | Añadirlo cuando haya dictado |
| DEC-15a | El selector de proveedor existe **solo como puerta de gobierno cerrada** (`ELEGIR_QUIEN_LO_HACE_EN_LA_APP = false`): cerrada, no se pinta nada; abierta, el detalle de una capacidad enseña «Automático: Weë elige» elegido y **apagado**, y «Elegir otro» apagado con «pendiente de decisión del dueño». **Nunca un nombre de proveedor** | CLAUDE.md: la persona no ve proveedores por defecto; MAPA 2: la opción B (elige la persona) es REVIEW_REQUIRED en los dos candidatos; haría falta contrato, marca y decisión (DEC-07) | Borrar la puerta y su pieza |
| DEC-16a | **Las pruebas nuevas van dentro de suites que ya están en la cadena** (`foundation-de-experiencias`, `cajas-weeai`, `navegacion-enlaces`, `credits-weeai`) con un módulo auxiliar (`functions/test/design-referencia.mjs`) | `ci-workflow` 13 exige que toda `*.test.mjs` esté en `functions/package.json`, que es de la Línea A y no se toca en esta misión | Al fusionar con la Línea A: convertir el auxiliar en `design-referencia.test.mjs` y añadirlo a la cadena (DEC-17) |

## 2. Del dueño (pendientes; cada una con la recomendación de esta misión, NO aplicada)

| Id | Pregunta | Opciones | Recomendado |
|---|---|---|---|
| **DEC-01** | ¿La referencia funcional sustituye algún día a `DesignScreen`? (CLAUDE.md §5: las interfaces de Weë AI no se rediseñan sin el dueño) | A) Nunca: conviven · B) Sí, después de la misión de identidad · C) Sí, ya | **B** |
| **DEC-02** | Con la puerta abierta, ¿por dónde se entra? | A) Solo por dirección (`/design/referencia`, hoy) · B) Un acceso discreto en `DesignScreen` · C) Una entrada en el ☰ y la barra lateral | **B** (sin tocar el menú) |
| **DEC-05** | ¿Se oculta la barra global inferior dentro del workspace en el teléfono? | A) No (hoy) · B) Sí (`SIN_BARRA`) | **A** mientras la referencia no sea la pantalla de Design |
| **DEC-06** | Los destinos de exportación | La lista de DEC-06a, otra, o formatos visibles | La lista de DEC-06a; los formatos solo en un modo avanzado oculto |
| **DEC-07** | ¿Selector de proveedor (AUTO · uno · otro)? MAPA 2: que lo elija la persona es REVIEW_REQUIRED en los dos candidatos (marca, «dar acceso» al servicio) | A) No, nunca por defecto · B) Solo en un modo avanzado de gobierno, apagado, con contrato | **A**. Hoy solo existe la puerta de gobierno cerrada de DEC-15a; abrirla —y más aún nombrar a alguien— exige contrato, revisión de marca y decisión explícita |
| **DEC-08** | ¿Modo avanzado (parámetros técnicos)? | A) No · B) Oculto por defecto (CREATOR.md §6 lo permite) | **A** hasta que haya capacidades 3D reales |
| **DEC-09** | ¿Qué visor 3D? | A) El preparado en `filmmaker/core` (`VisorDeModelo3d`, web sobre `<model-viewer>`/three.js) para TODO Weë · B) Otro | **A**: uno solo, nunca uno de Design |
| **DEC-10** | Precio y cupo diario de los modelos 3D | Medir `providerCost` primero | Ninguno hasta medir (CLAUDE.md §7) |
| **DEC-11** | ¿Dónde se guardan las escenas de diseño? (también [3D-EXPERIENCIA.md](3D-EXPERIENCIA.md) §19 #8) | Colección propia (no `scenes`), por proyecto | Colección propia por proyecto (P7 de [3D-ASSET-LIFECYCLE.md](3D-ASSET-LIFECYCLE.md)) |
| **DEC-12** | ¿Weë Design lleva a Weë Studio para presentar un diseño en vídeo? | A) Sí, con contexto · B) No | **A** |
| **DEC-13** | ¿Productos físicos a medida (figuras, llaveros…)? | Fuera del alcance de hoy | No ahora |
| **DEC-14** | ¿Estilizar modelos (bloques, voxel…)? | Sin caso de uso | No ahora |
| **DEC-17** | Al fusionar con la Línea A: la suite propia en la cadena | — | Sí (ver DEC-16a) |
| **D1–D9** | Las de [DESIGN.md](DESIGN.md) §4: qué es Weë Design, entregables, editar, texto en imagen, formatos, referencias, puertas sin capacidad, memoria de marca, uso comercial | — | Las recomendaciones de DESIGN.md, sin cambios |

## 3. Dependencias con las otras líneas

| Con | Qué | Marca |
|---|---|---|
| **Línea B** | Contrato canónico 3D, Provider Registry, huecos del Router, ids propuestos (`3d.segment`, `3d.animate`, variantes `resize`/`motion`/`stylize`, `image.multiview`) | DEPENDENCY / FUTURE INTEGRATION |
| **Línea B · MAPA 2** | `elegibilidad-comercial.md` (2026-10-07): ninguna capacidad de Tripo ni de Meshy APPROVED; Tripo REQUIRES WRITTEN AUTHORIZATION; Meshy REQUIRES ENTERPRISE; vídeo, escenas y agente 3D de un candidato solo en su web (NOT_ALLOWED). La referencia lo copia como **dato** (`elegibilidad` en `constants/designReferencia.ts`) sin nombrar a nadie; cuando el Provider Registry de la Línea B lo exponga como código, ese campo se **deriva** de él en vez de escribirse a mano | DEPENDENCY / FUTURE INTEGRATION |
| **Línea A** | Planes de varios pasos (imprimir, de imagen a 3D a textura), `functions/package.json` (la cadena de pruebas) | DEPENDENCY / FUTURE INTEGRATION |
| **Filmmaker** (`filmmaker/core`) | El visor 3D | DEPENDENCY (DEC-09) |

## 4. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| La referencia se confunde con el diseño final | UX | Sello «Referencia funcional», estética neutra, misión de identidad aparte |
| Una capacidad apagada parece rota | UX | Detalle con motivo, requisitos y decisiones en cada una |
| El registro dice «disponible» algo que el Core no enruta | Arquitectura | Disponibilidad calculada con el catálogo del Core; prueba que lo fija |
| Duplicar visor, Composer, router o Credits | Arquitectura | Prohibido por diseño y vigilado por pruebas |
| Una cuenta ve proveedores o modelos | Producto / legal | Ningún nombre de proveedor en la app (pruebas de `mundo3d-app` H2 y de la referencia) |
| El workspace en tableta pequeña queda apretado | UX | Dos columnas por ancho medido; el lienzo nunca baja de 400 en columnas |

## 5. Deuda que deja esta misión

- La suite propia fuera de la cadena hasta fusionar con la Línea A (DEC-16a/DEC-17).
- Las traducciones de los textos nuevos en los catorce idiomas que no son español ni inglés están hechas en esta misión y **no
  tienen revisión nativa** (solo el danés tiene registro de revisión: [I18N-REVISION.md](I18N-REVISION.md)).
- La verificación visual depende de poder arrancar la web con los emuladores de demostración (ver el informe de la misión).

## 6. La segunda misión (NO empieza ahora)

**«TRANSFORMAR WEE DESIGN FUNCTIONAL REFERENCE EN WEE DESIGN IDENTITY»**: lenguaje visual, Composer, navegación, iconografía,
color, tipografía, movimiento, interacción, sistema de paneles, responsive, accesibilidad y marca. Parte de esta referencia (todas
las funciones descubiertas, colocadas y conectadas) y no redescubre ninguna.

## 7. Informes de UX oficial de Tripo y Meshy

Los investigadores de UX de la Línea C escriben `tripo-ux.md` y `meshy-ux.md`. Lo que esos informes digan de la interfaz pública
se resume en el §7 de cada referencia ([Tripo](WEE-DESIGN-TRIPO-REFERENCE.md), [Meshy](WEE-DESIGN-MESHY-REFERENCE.md)); si allí
no consta, el informe no estaba disponible y lo dicho de su interfaz queda **REVIEW_REQUIRED**. Nada de esto cambia el MAPA 1,
que se hizo desde la API oficial y desde Weë.
