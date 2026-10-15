# Algorithm Engine — plan de integración (2026-10-15)

Reglas del plan: reutilizar el motor existente; sin segundo motor/planner/router; sin tercera puerta del Core
Runtime sin autorización (CLAUDE.md § 10); sin dar autoridad al motor; adaptadores finos; respetar créditos,
idempotencia y aislamiento. Cada paso nombra quién tiene que decidir.

## Hecho en esta ronda (local, sin autoridad)

| # | Qué | Dónde |
|---|---|---|
| 0 | Suite de regresión de cobertura: fija topología (un importador, un llamante, después de guardar) y alcance por experiencia medido con plantillas reales; falla si el motor se conecta a otra ruta o si se retira la conexión de `creatorChat` | `functions/test/algoritmo-cobertura.test.mjs` (+ `package.json`) |
| 0 | Cuatro documentos de auditoría | `docs/ALGORITHM-ENGINE-{AUDIT,COVERAGE,INTEGRATION-PLAN,VALIDATION}.md` |

No se hizo ninguna conexión nueva de código: no hay ninguna que sea a la vez de bajo riesgo y compatible con «sin
autoridad». Cualquier conexión adicional con efecto (Router, Orchestrator, Job, Credits) entregaría autoridad o abriría
una puerta, y eso lo decide el dueño.

## Pendiente, en orden

| Prioridad | Conexión | Qué falta | Quién decide | Riesgo |
|---|---|---|---|---|
| P1 | Alinear versiones: desplegar 1.12 (o 1.13) y que producción y main coincidan | contrato 1.13, revisión de seguridad del paquete, despliegue de `creatorChat` | dueño (DD-26 punto 4) | bajo si la puerta sigue cerrada |
| P2 | Cobertura de las 4 experiencias sin plan del Core (photo, beauty/Fashion, home, music) | el puente `creator/necesidades.ts` debe expresar pasos con fotos (refs de Storage) y `music.generate` habilitada en el catálogo del Core | dueño (toca zona roja `creator/`; Weë Music «no se conecta») | medio: el Planner del Core ya rechaza lo que no entiende (`needs_clarification`/`unsupported`) y es correcto |
| P3 | Más canaries de la sombra (otras experiencias, p. ej. design/writer), por cuentas | un documento `aiSettings/sombra` con `experiencias` y monitor `scripts/canary-sombra.mjs`; sin tocar código | dueño | bajo (solo observación) |
| P4 | Señales reales: sin evidencia medida el motor elige «en fila» con confianza 0 | A7/A8 persistidos, almacén transaccional exactamente-una-vez | dueño | medio |
| P5 | Cierre del ciclo (A6/A6r/A7) conectado | productor de observaciones, evaluadores (Quality), código de error del Core | dueño | medio |
| P6 | `paraRouter` → Router | decidir QUÉ router (prod o Core), unificar escala de calidad, un dueño de Credits, presupuesto de plan frente a paso | dueño (DD-02) | alto |
| P7 | Autoridad (PREPARED → ACTIVE) | las 14 condiciones de `ALGORITHM-ENGINE.md` § 21 | dueño, una a una | alto |

El motor no debe ser punto único de fallo: la sombra no lanza nunca y espera dentro de un `try`; cualquier conexión
futura con autoridad mantendrá la ruta Legacy como respaldo.
