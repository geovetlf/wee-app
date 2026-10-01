# Weë Agent Harness — el mapa

Qué es cada pieza, qué toca y quién la ejecuta. El Harness es una capa ligera
de reglas, seguridad, trazabilidad y automatización sobre lo que Weë ya tiene
(GitHub, firebase-tools, Google Cloud). **No es otro motor ni otro servicio**, y
las personas que usan Weë no lo ven nunca: no tiene interfaz.

**Las reglas** están en [DEPLOYMENT.md](DEPLOYMENT.md) (cómo llega algo a
producción), [SECURITY.md](SECURITY.md) (secretos, identidades, App Check),
[OBSERVABILITY.md](OBSERVABILITY.md) (alertas), [COSTES.md](COSTES.md) (topes y
coste del Harness) y [DECISIONES-PENDIENTES.md](DECISIONES-PENDIENTES.md) (lo que
espera al dueño).

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
