# Gran Motor — estado consolidado tras la primera ronda de cierre (2026-10-16)

Rama de trabajo: `gran-motor/cierre` (local, sin publicar). Cabeza al redactar: ver `git log -1`. Base: `5320cde9` (candidato de Guardian). Integra los paquetes A, B, C, D, E, F, G y H (merge o avance rápido; conflictos resueltos por unión, nunca pisando).
Este documento SUSTITUYE a la tabla heredada de «1. Estado inicial» de `GRAN-MOTOR-PROGRESO.md` con lo realmente medido. Cada afirmación remite a su documento de paquete.

## 0. Veredicto
**El Gran Motor NO está listo para producción ni validado en conjunto.** Lo que existe es un núcleo (Core + Runtime) bien probado de forma aislada, con dos puertas canary cerradas (hoy tres según el código, ver §3), un Algorithm Engine en sombra sin autoridad y un conjunto de defectos reales corregidos en la rama. Hay decisiones del propietario que bloquean el resto. Dos suites siguen en rojo a propósito.
- **No se ejecutó la cadena completa** sobre esta rama integrada (319 suites): lo impide la presión de memoria registrada (26,98 y 29,46 GB de 30,6 GB en las dos cadenas del candidato Guardian). Verificado: build + 19 suites de la misión y de las guardas + `huellas --verificar` (ver §6).
- Rojas a propósito: `f1d-generacion` (97, 98) e `integracion-preparada` (3c): exigen que el DUEÑO re-ancle una huella de Guardian (comando en `GRAN-MOTOR-H-GUARDAS.md`).

## 1. Inventario verificado
Escala: DISEÑADO · IMPLEMENTADO · INTEGRADO · PROBADO · VALIDADO EN FLUJO REAL · DESPLEGADO · PREPARADO PARA PRODUCCIÓN. «Probado» = suites ejecutadas hoy (memoria, dobles o emulador de Firestore/Storage del proyecto demo). Ningún componente está PREPARADO PARA PRODUCCIÓN.

| Componente | Estado | Evidencia (documento) | Qué falta |
|---|---|---|---|
| WeëBrain (Legacy `creator/brain.ts`) | DESPLEGADO, PROBADO | B | — |
| WeëBrain Core (`core/brain.ts`) | IMPLEMENTADO, INTEGRADO, PROBADO (solo canary cerrada). Corregidos B-1 (respuesta vacía entregada y cobrada) y B-2 | B | despliegue autorizado; D-B2 (reembolso con evidencia positiva) antes de migrar capacidades con cobro previo |
| Planner Legacy / Core | Legacy INTEGRADO, PROBADO, DESPLEGADO; Core IMPLEMENTADO, PROBADO (sombra). 827 combinaciones de las 11 plantillas: 0 diferencias estructurales | B | 5 extras de Legacy sin transporte en el Core (frase del paso, explicación, aristas de orden, voz, foco de Home) |
| Algorithm Engine A0–A9 | IMPLEMENTADO, PROBADO (sombra, PREPARED, sin autoridad). Un solo consumidor: `creator/sombra.ts` | B (+ `75672a3d`) | autoridad, contrato 1.13, 14 condiciones PREPARED→ACTIVE: decisiones del dueño |
| Workflow / Orchestrator | IMPLEMENTADO, INTEGRADO, PROBADO (2.400 caminos, 0 violaciones; D-C1 corregido) | D | espera humana sin plazo (D-W2), ejecuciones huérfanas sin barrido (D-W3) |
| Job Engine / Conductor / JobStore | IMPLEMENTADO, INTEGRADO, PROBADO (1.500 caminos, 0 violaciones); JobStore DESPLEGADO | D | **D-J1: `barrerRecuperables` no lo llama nadie** (un trabajo cuyo proceso murió no se evalúa); D-J2: 1.000 trabajos por pasada sin cursor; D-X1: cancelar no para Seedance |
| Router Legacy / Core + capa | Legacy DESPLEGADO; Core IMPLEMENTADO, PROBADO. 29 capacidades × 16 escenarios: 0 divergencias injustificadas | A | 5 diferencias latentes sin consumidor (D-A1..A5) |
| Gateway y adaptadores | PROBADO. Cadena autorizada respetada salvo un desvío documentado: avatar (`vertexAI.ts`, SDK de Gemini directo, sin Gateway ni libro) | A | D-A6 (A1 sanear logs / A2 encaminar el avatar) |
| Sanitización de logs (`engine/sanitize.ts`) | DESPLEGADO con 15 huecos conocidos (JSON escapado, URLs firmadas, tokens, PEM); parche preparado | A, F | D-A7: aplicar `GRAN-MOTOR-A-sanitize.patch` exige ampliar dos guardas de frontera |
| Credit Engine / Financial Core | IMPLEMENTADO, PROBADO (memoria + emulador; C-1, C-2 corregidos en la rama, NO desplegados). `holdCredits` y `spendCredits` = misma primitiva, diferencias justificadas | C | **D-1: reservas huérfanas de Brain/vídeo/mundo/avatar sin cierre automático; D-2: reembolso con vídeo ya guardado** |
| Asset / Content Core, materializador, Media Cloud | IMPLEMENTADO, INTEGRADO, PROBADO (emulador: ninguna cuenta accede a lo de otra). Corregidos E-1 (SSRF en el materializador), E-2, E-3, E-4 — NO desplegados | E | D-E1 (**la persona no puede borrar sus fotos subidas**), D-E2..E5 |
| Filmmaker Engine | Dominio y `productions` IMPLEMENTADO, PROBADO; **NO integrado con Brain, Algorithm, Planner ni Workflow** (0 conexiones). Una sola ruta de generación (toma de un plano → `generateVideo` → conductor → Seedance), con la puerta `video.generate` cerrada. Corregido G-1 (ediciones concurrentes de plano sin transacción) | G | D-G1..G7; cancelar y recuperar tomas existen solo en `filmmaker/core` |
| Motor Guardian | Candidato `5320cde9` con dos cadenas completas en verde (310/310). NO validado, NO activado | F + `_cmd-hang` | ver §2 |
| Experiencias | Studio/Design/Chef/Travel: flujo Legacy completo en demo (35 cadenas distintas, 1 falla por el mock de Studio); Music/Fashion: ramas locales no integradas, generación cerrada; Feed/Weëls: no usan el Gran Motor | G | G-6 (mock), G-7 (cancelar), integrar Fashion/Music |

## 2. Guardian (detalle en `GRAN-MOTOR-F-GUARDIAN.md`)
- Candidato `5320cde90db93b29587f599873c4f9ba51711b97`: dos cadenas completas en verde (972 s y 1.057 s) con margen de memoria estrecho; evidencia con hashes en `_cmd-hang\`. NO se asume validado para producción y NO se activa.
- **Clase de redirecciones exteriores a rutas protegidas que pasan sin pregunta** (preexistente, ALTA): `cmd /c`, `bash -c`, `sh -c`, `eval`, `env bash -c`, `powershell -c`, `wsl` seguidos de `> .git/…` o `> .firebaserc`. Corrección mínima propuesta (≈10 líneas), sin aplicar.
- 186 transiciones `sudo -u root git branch --list 'guardian/*'`: todas el mismo patrón de solo lectura; recomendación del agente F: aprobar con condiciones.
- `onFailure:"block"`: campo real (Claude Code ≥ 2.1.295) que el esquema de SchemaStore no reconoce; falta la prueba con sesión autenticada.
- Parche H7 sobre H4: no aplica limpio; integrar en orden lineal (cierre → H4 → H5 → H6 → H7 → límites).

## 3. Observaciones del código que contradicen la documentación
- `CLAUDE.md` §10 dice «dos canaries»; el código tiene TRES puertas (brain, mundo 3D, video) según el agente G. Actualizar el texto es decisión del dueño (CLAUDE.md es suyo).
- `docs/RUNTIME.md` dice «28 capacidades»; ya son 29 (`runtime-paridad` fija ese texto).

## 4. Decisiones del propietario (consolidadas, orden recomendado)
Detalle y recomendaciones en los documentos de cada paquete.
1. **Seguridad de Guardian:** (a) corregir la clase de redirecciones exteriores (F); (b) proveedor de compra «test» fail-closed (F-05); (c) las 186 transiciones `sudo -u root` (opción B) más H1 de R1; (d) `onFailure` tras la prueba autenticada.
2. **Re-anclaje de `f1d-generacion`** y puesta en verde de `integracion-preparada` (comando en `GRAN-MOTOR-H-GUARDAS.md`).
3. **Dinero:** D-1 (cierre de reservas huérfanas por puerta), D-2 (reembolso con vídeo guardado), D-J1 (quién evalúa y recupera trabajos abandonados), D-J2 (cursor), D-X1/X2 (cancelación de Seedance, failover entre proveedores).
4. **Privacidad y datos:** D-E1 (borrar fotos subidas), D-E2 (publicaciones con activo borrado), D-E3 (caducidad de entrega), D-E4 (objetos sin ficha), D-E5 (`fetchBytes`: redirecciones y tope de bytes).
5. **Logs:** D-A7 (parche de sanitize) y F-04 (146 de 174 `console.*` sin sanear).
6. **Router/Brain (latentes):** D-A1..A6, D-B1..B5 (incluido el contrato 1.13).
7. **Filmmaker:** D-G1..G7 (empezar por cancelar y recuperar tomas desde `filmmaker/core`).
8. **Despliegue de lo corregido en la rama:** C-1, C-2, B-1, B-2, D-C1, L-5, E-1..E-4, G-1 (cada uno con su prueba; ninguno desplegado).
9. **Más adelante:** App Check, revisión nativa de i18n (0 % humana), SVG en Storage, F-01 (vínculo Real↔Weë), activaciones de Guardian (hooks Post/Stop, CODEOWNERS, ruleset).

## 5. Paquetes y commits (ramas locales; integradas en `gran-motor/cierre`)
| Paquete | Rama | Commits principales |
|---|---|---|
| C Credits | `gran-motor/c-creditos` | `c8b5a621` fix, `15df2421` docs, `f101b22a` registro |
| A Router/proveedores | `gran-motor/a-router` | `609e4250`, `473ed011`, `0629a8be`, `6277efc0` |
| B Planner/Brain/Algoritmo | `gran-motor/b-planner` | `f8a377b6` fix, `03c1f37f`, `5fdc1df8`, `98c83d72` |
| D Workflow/Job | `gran-motor/d-workflow` | `e3b77353` (L-5), `171777a1` (D-C1), `f3264c58`, `1eedc27c`, `3e1abad7`, `dac0ec15` |
| H Guardas | `gran-motor/h-guardas`, `gran-motor/h2-guardas` | `6da6d9a9`, `33cd25a2` |
| E Activos | `gran-motor/e-assets` | `4e0cc1f1` fix, `d1d40372`, `1db5c770` |
| F Guardian/seguridad | `gran-motor/f-guardian` | `fa8d0873`, `9ed6c018` |
| G Filmmaker/experiencias | `gran-motor/g-filmmaker` | `231ba4bc` fix, `dfa7e572`, `8e026e52` |

## 6. Verificación de la rama integrada (sin cadena completa)
Ejecutado tras el último merge (exit 0 salvo lo indicado): `npm run build`; `gran-motor-c-creditos`, `-b-planner`, `-b-algoritmo`, `-d-workflow`, `-e-assets`, `-g-filmmaker`, `-g-experiencias`; `router-equivalencia`; `sanitize-huecos` (15/15 huecos conocidos); `planos-runtime`; `productions-runtime`; `video-asincrono`; `puente-pre-f1d`; `ci-workflow`; `guardian-dominios`; `guardian-aserciones`; `huellas --verificar`; escaneo de secretos. ROJAS a propósito: `f1d-generacion`, `integracion-preparada` (ver §0).
NO EJECUTADO: la cadena completa de 319 suites, `*.emulator.mjs` completos de cada paquete en conjunto sobre la rama integrada (cada agente los ejecutó en su rama), producción, proveedores reales, despliegue.

## 7. Próximos pasos seguros (sin autorización adicional) y con autorización
- Con autorización: re-anclar `f1d-generacion` → ejecutar UNA cadena completa con `--paralelo 2` (plan en `_cmd-hang\PLAN-CADENA-FINAL.md`) para obtener un verde de la rama integrada, con memoria controlada y sin trabajo concurrente.
- Sin autorización (pendientes de bajo riesgo, locales): arreglar el mock de Studio (G-6, una línea en `gateway/providers/mock.ts`), tests que fijen la clase de redirecciones tras la decisión del dueño, A1 de logs del avatar (bajo riesgo), documentar en `docs/` las observaciones de §3.
