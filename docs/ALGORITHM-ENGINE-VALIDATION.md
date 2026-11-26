# Algorithm Engine — validación de la integración transversal (2026-10-15)

Rama `algoritmo/integracion-transversal`, desde `algoritmo/cierre-y-maduracion` (`b3b93661`). Todo local; sin push,
PR, despliegue ni toque a producción; sin proveedores, sin llamadas de pago, sin Credits reales.

## Comandos y resultados

| Comando (en el worktree) | Resultado |
|---|---|
| `cd functions && npm run build` | OK |
| `node test/algoritmo-cobertura.test.mjs` (nueva) | 33 comprobaciones, exit 0 |
| Sabotaje 1: añadir `import … '../core/algorithm'` a `src/engine/router.ts` | la suite FALLA (comprobaciones 1 y 6); revertido con `git checkout` |
| Sabotaje 2: desactivar la llamada a `sombraDelPlan` en `creatorChat` (`if (false && …)`) | la suite FALLA (comprobación 4); revertido con `git checkout` |
| `algoritmo-produccion`, `algorithm-context`, `algorithm-cycle`, `algorithm-cycle-cierre`, `algorithm-decision`, `sombra-creatorchat`, `sombra-experiencia`, `sombra-sin-texto`, `evals-algoritmo` | todas exit 0 |
| `node test/_cadena.mjs` (cadena completa, sin candado de tareas pesadas detectado) | **283/283 suites · 19 277 comprobaciones ✔ · 775 s** |
| `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` (app) | exit 0 |
| `cd functions && npx tsc --noEmit` | exit 0 |
| `node scripts/escaneo-secretos.mjs` | ningún secreto en 1842 archivos |

## No ejecutado o bloqueado

- `functions/test/sombra-creatorchat.emulator.mjs` y demás `*.emulator.mjs`: NO EJECUTADOS (requieren emuladores/Java 21; fuera de la cadena).
- Cualquier prueba con proveedores reales, Firestore real o Credits reales: NO EJECUTADA, por mandato.
- Candado de tareas pesadas: no se encontró ningún `PESADO.lock` ni `pesado.mjs` en los worktrees de Guardian/Fase 1/Music; la cadena se lanzó asumiendo que está libre. Si otro agente lo reclamó sin dejar fichero visible, la medición de tiempos pudo coincidir con su carga.
- Revisión de Guardian propia (`ops/guardian`) no lanzada aparte; la cadena incluye `harness-guardian` y `guardas-reales` en verde.

## Limitaciones de la evidencia

- La ejecución de punta a punta del motor se demuestra con dobles de Firestore y plantillas reales; la 1.12 nunca ha corrido en producción (corre 1.9).
- «Alcance por experiencia» mide el camino `algoritmo` de la sombra con la puerta abierta en un doble; no mide calidad de la decisión (siempre «en fila», confianza 0, sin historial, por diseño).
- No se afirma cobertura absoluta: 4 de 11 experiencias (photo, beauty/Fashion, home, music) no llegan hoy al motor (límite del puente), y el resto solo en sombra.

## Criterios de la fase 6

| Criterio | Estado |
|---|---|
| Se reutiliza el motor existente | SÍ (ningún código del motor tocado) |
| Cada experiencia tiene ruta hasta el motor o justificación | 7 con ruta (sombra); 4 con justificación técnica (puente sin fotos/música) |
| Responsabilidades separadas | SÍ (comprobaciones 1–9) |
| Créditos/costes/seguridad/idempotencia protegidos | SÍ: 0 Credits, 0 red, una sola escritura `private/sombra`, trabajo de Legacy intacto |
| Pruebas que detecten si desaparece una conexión crítica | SÍ (sabotaje 2) |
| Ningún proveedor activado ni producción cambiada | SÍ |
