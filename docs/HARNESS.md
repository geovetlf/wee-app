# Weë Agent Harness — el mapa

Qué es cada pieza, qué toca y quién la ejecuta. El Harness es una capa ligera
de reglas, seguridad, trazabilidad y automatización sobre lo que Weë ya tiene
(GitHub, firebase-tools, Google Cloud). **No es otro motor ni otro servicio**, y
las personas que usan Weë no lo ven nunca: no tiene interfaz.

**Las reglas** están en [DEPLOYMENT.md](DEPLOYMENT.md) (cómo llega algo a
producción), [SECURITY.md](SECURITY.md) (secretos, identidades, App Check),
[OBSERVABILITY.md](OBSERVABILITY.md) (alertas), [COSTES.md](COSTES.md) (topes y
coste del Harness) y [DECISIONES-PENDIENTES.md](DECISIONES-PENDIENTES.md) (lo que
espera al dueño). Qué frontera del código vive dónde y si está conectada: [MAPA-DE-FRONTERAS.md](MAPA-DE-FRONTERAS.md).

## Cómo leer la tabla

- **Local**: corre en el portátil o en la CI, sin credenciales y sin red de
  proveedores. Claude puede usarlo libremente.
- **Imprime**: no ejecuta nada. Escribe los comandos que el dueño ejecuta.
- **Lee producción**: solo lectura, con las credenciales del dueño. Si lee
  datos de personas, lo ejecuta el dueño.
- **Workflow**: solo corre dentro de `despliegue.yml`, aprobado por el dueño.

## Las piezas

| Pieza | Qué hace | Modo |
|---|---|---|
| `.github/workflows/ci.yml` | La CI en tres niveles (cuatro checks): TypeScript y build · suites y emuladores `demo-*` · seguridad y políticas | Local (GitHub) |
| `scripts/ci-local.mjs` | La MISMA CI, aquí: lee `ci.yml` y ejecuta sus pasos (`--plan`, `--nivel`) | Local |
| `scripts/ci-sin-secretos.mjs` | Para la CI si el entorno trae una clave, una credencial de Google o un proyecto real | Local |
| `scripts/escaneo-secretos.mjs` | Ningún secreto en los archivos versionados; nunca imprime un valor | Local |
| `functions/test/_emuladores.mjs` | Las suites de emulador, cada una en su sesión, solo con proyectos `demo-*` | Local |
| `.claude/settings.json` + `.claude/hooks/guardia.mjs` | La guardia de Claude: lo que Claude no ejecuta nunca (desplegar, leer secretos, IAM…) | Local |
| `ops/permitido.mjs` | No desplegar un commit que no contiene lo que está vivo (por ascendencia) | Local |
| `ops/produccion.json` + tags `prod/*` | Qué commit corre en cada función, reglas, índices y webs | Local |
| `ops/integracion/capacidades.mjs` | Producción actual → main propuesto: ninguna capacidad viva se pierde | Local |
| `.github/workflows/despliegue.yml` + `ops/despliegue/*` | El único camino a producción: verificar, aprobar, WIF, desplegar (máx. 6 funciones), humo, hashes, observar 10 min, registrar, tag, marcha atrás | Workflow |
| `scripts/solo-desde-el-workflow.mjs` | Primer `predeploy` de cada destino: fuera del workflow aprobado, `firebase deploy` se niega | Local |
| `ops/despliegue/grupos.json` | El orden de los despliegues por grupos, por riesgo medido | Local |
| `ops/iam/wif.mjs` | La identidad de despliegue sin claves (condición exacta, roles mínimos) | Imprime |
| `ops/iam/wif-verificar.mjs` | ¿Lo creado en Google Cloud es exactamente eso? | Lee producción |
| `ops/github/proteccion.mjs` (+ `*.json`) | La protección de `main` y del entorno `get-wee`; `verificar` dice qué falta | Imprime · `verificar` lee GitHub |
| `ops/secretos/rotacion.mjs` | La rotación de las claves expuestas, en orden y sin destruir la versión vieja | Imprime |
| `ops/observabilidad/alertas.mjs` | 7 alertas, 4 métricas, 2 comprobaciones de salud y el panel | Imprime |
| `ops/observabilidad/verificar.mjs` | ¿Existen y avisan a alguien? | Lee producción |
| `ops/reconciliacion/reservas-colgadas.mjs` | Reservas de Credits que llevan horas sin cerrarse | Lee producción (datos de personas: el dueño) |
| `docs/PRIMER-DESPLIEGUE.md` | El checklist del primer despliegue (`spendCredits`) | — |
| `ops/revision/detectores.mjs` (+ `reglas.mjs`, `grafo.mjs`, `frontera.mjs`) | El Quality Reviewer, capa 2: reglas deterministas sobre el AST (higiene de imports, ciclos de valor, `any`, `Alert` en la web, IA fuera de adaptador, reglas de Firebase…); JSON y SARIF ([REVISION.md](REVISION.md)) | Local |
| `ops/revision/baseline.mjs` (+ `clasificacion.mjs`, `baseline.json`) | Capa 3: qué es nuevo y qué se conocía desde el corte; la puerta G3; la baseline PROPUESTA (nunca se aplica sola) | Local |
| `ops/revision/selector.mjs` + `ops/revision/contexto/paquetes.json` | Capa 4: qué revisar con IA, con qué contexto, presupuesto de tokens y caché | Local |
| `.claude/agents/revisor-{codigo,seguridad,arquitectura}.md` + `ops/revision/rubricas/` | Capa 5: revisores de SOLO LECTURA (Read, Grep, Glob, Bash bajo la guardia), con rúbricas propias | Local (IA) |
| `.claude/commands/revision-de-fase.md` | El cierre de fase G0–G7: higiene, build, pruebas, detectores, selector, revisores, verificación, informe; sin commit ni deploy | Local |
| `ops/harness/extensiones.mjs` + `ops/harness/extensiones/` | Las extensiones del Harness (F3): manifiestos solo de datos, permisos de un catálogo cerrado y una puerta que pasa cada acción por la guardia; `listar`, `validar`, `ejecutar` | Local |
| `ops/harness/cierre.mjs` | El cierre de misión (F4): misión declarada + evidencias reales → JSON canónico y Markdown derivado; lo que no tiene evidencia es UNKNOWN | Local |

## Las extensiones (F3)

Una extensión es un manifiesto JSON en `ops/harness/extensiones/<id>.json`, **sin código**: el Harness nunca
importa ni evalúa nada de una extensión. Dice qué aporta (`comprobacion`, `contexto` o `informe`, puntos de
extensión del Harness, no capacidades del producto), qué permisos necesita (`leer-repositorio`, `leer-git`,
`ejecutar-pruebas`, `escribir-cache`, y ninguno más) y para qué versión del Harness es (`^1.0.0`).

- **La puerta** (`autorizar`) pide cuatro cosas: que la extensión esté activa, que la acción esté en su
  manifiesto, que la lista blanca del permiso la cubra y que la guardia de siempre no la pregunte ni la
  niegue. Lo que la guardia pregunta o niega es del dueño: una extensión no lo hace nunca.
- **Nunca se conceden**: aprobar despliegues, desplegar, merge, push, IAM, secretos, apagar la guardia o las
  puertas, ni saltarse la revisión. Pedirlo invalida el manifiesto.
- **Activar o desactivar** es cambiar `estado` en el manifiesto, por PR. `WEE_EXTENSIONES=off` las apaga todas.
- **La primera**, `revision-determinista`, registra la puerta G3 tal cual (`node ops/revision/baseline.mjs`).

## El cierre de misión (F4)

`ops/harness/cierre.mjs` no escribe un resumen: **junta resultados reales** y los convierte en un cierre
verificable (contrato `wee-cierre@1`).

- **La misión** la declara una persona en JSON: objetivo, alcance autorizado, tareas, decisiones, riesgos,
  pendientes, bloqueos y diferidos, cada cosa con su fuente, y lo que la misión `exige` para cerrarse.
- **Las evidencias** son salidas de herramientas que ya existen, cada una con su origen y su huella: git (solo
  lectura), la puerta G3 (`baseline.mjs --json`), la cadena (`_cadena.mjs`), una suite suelta, los check-runs de
  GitHub (`NIVELES_DE_CI`), `gh pr view --json`, `gh run list --json` de `despliegue.yml` y el tag `prod/*`.
- **Estados:** DONE (hecho según su fuente), VERIFIED (lo confirma una evidencia), PENDING, BLOCKED, DEFERRED
  (autorizado para otra fase) y UNKNOWN (no hay evidencia). El estado final sale siempre por las mismas reglas:
  un fallo bloquea; una contradicción deja UNKNOWN; lo abierto deja PENDING; lo exigido sin evidencia, UNKNOWN.
- **El JSON es la fuente**; el Markdown sale de él. La misma evidencia da el mismo cierre (sin hora de reloj).
  `--escribir` lo guarda por la puerta de F3, como la extensión `cierre-de-mision`, en `ops/harness/.cache/`.
- **Observa y cierra; no manda:** no aprueba, no despliega, no hace merge ni push, no escribe en git y no
  ejecuta más que lecturas de git. Las puertas que salen son las registradas en F3.

## Lo que el Harness añadió al código de Weë

Solo arreglos acotados de la auditoría H0, cada uno con su prueba y su
sabotaje, y fijados por nombre y tamaño en las cercas de F1-D:
- `spendCredits`, solo administración (#24);
- un trabajo de Weë AI empieza una vez (#9);
- el avatar no genera dos veces ni reembolsa reservas ajenas (#11);
- los cupos por persona se fusionan (#20);
- el interruptor de la IA, apagado por defecto (#19);
- el plazo del trabajo llega al router (#16);
- un sondeo fallido no mata una tarea viva (#3);
- una liquidación que falla se anota (#15a);
- techo de instancias para todas las funciones (§27);
- el webhook de Seedance solo anota que llegó un aviso (#21);
- topes de gasto diario, apagados (FASE 8);
- el barrido, una pasada a la vez (#18);
- el coste de lo que falla después de llegar al proveedor (#22);
- App Check, preparado y apagado (#1).

Ninguno cambia precios, la interfaz, los idiomas, el Brain, el Planner, el
Algorithm Engine ni el Credit Engine.
