# Weë Quality Reviewer — la revisión de fase

Cómo se revisa una fase antes de cerrarla: qué miran las máquinas, qué mira la IA, qué decide una persona y
cuánto cuesta. Es una pieza del [Harness](HARNESS.md): local, sin credenciales, sin red, **sin IA dentro de los
scripts**. La IA solo entra en la capa 5, como revisores de solo lectura que nunca pueden bloquear una fase sin
verificación.

El procedimiento ejecutable es [`/revision-de-fase`](../.claude/commands/revision-de-fase.md). La metodología se
inspira en el plugin Thermos de Cursor (ver [ATRIBUCION](../ops/revision/rubricas/ATRIBUCION.md)); Weë no lo
instala ni lo ejecuta, y todo el texto y el código son propios.

## Las capas

| Capa | Qué es | Dónde | IA |
|---|---|---|---|
| 0 | La guardia y los permisos: lo que Claude no ejecuta nunca | `.claude/settings.json`, `.claude/hooks/guardia.mjs` | No |
| 1 | Build y pruebas: tipos, build de Functions, suites, emuladores `demo-*` | `npx tsc`, `functions/test/` | No |
| 2 | Detectores deterministas: un catálogo de reglas sobre el AST de TypeScript | `ops/revision/reglas.mjs`, `detectores.mjs`, `grafo.mjs`, `frontera.mjs` | No |
| 3 | Baseline y puerta: qué es nuevo y qué se conocía, y si la fase pasa | `ops/revision/baseline.mjs`, `clasificacion.mjs`, `baseline.json` | No |
| 4 | Selector: qué revisar con IA, con qué contexto, cuánto cuesta, qué ya está en caché | `ops/revision/selector.mjs`, `contexto/paquetes.json` | No |
| 5 | Revisores IA de solo lectura, con rúbrica propia | `.claude/agents/revisor-{codigo,seguridad,arquitectura}.md`, `ops/revision/rubricas/` | Sí |
| 6 | Verificación y decisión humana: nada de IA bloquea sin verificar; la baseline solo cambia con permiso | `/revision-de-fase` (G6, G7) | Asiste |

## Las reglas deterministas

El catálogo vive en `ops/revision/reglas.mjs` (id, versión, fecha `desde`, severidad, zona). Las de hoy entran
el 2026-10-01.

| Regla | Severidad | Qué detecta | Límites conocidos |
|---|---|---|---|
| `tamano/archivo-mil-lineas` | baja | Código de más de 1000 líneas | Inventario: no dice si el tamaño está justificado |
| `tamano/cruza-mil-lineas` | media | ≤1000 en la base (o nuevo) y >1000 ahora (con `--base`) | — |
| `tipos/any` | media | Cuenta de `any` por archivo; con baseline solo es NUEVO si SUBE | No distingue un `any` justificado de uno perezoso |
| `web/alert-con-botones` | alta | `Alert.alert` con 3 argumentos fuera de `.native/.ios/.android` | Reconoce `Platform.OS` y `isWeb`/`esWeb` (ramas, `&&`, salida temprana); otras guardas dan falso positivo |
| `ia/host-fuera-de-adaptador` | alta | Host de proveedor (leído de los adaptadores) o SDK de IA fuera de `engine/providers` | Solo cadenas literales; un host armado por partes no se ve |
| `higiene/import-sin-seguimiento` | bloqueante | `import`/`require`/`import()` literal relativo a un archivo no seguido por git o inexistente | Respeta `createRequire(new URL(…))`; lo que sale del build (`functions/lib`) no se exige |
| `muerto/modulo-sin-importador` | baja | Módulo de la app o de Functions al que no llega nadie desde `App.tsx`, `index.ts` o `functions/src/index.ts` | Lo cargado por configuración (plugins de `app.json`) o solo por scripts aparece como muerto |
| `ciclos/import-ciclico` | media | Componentes fuertemente conexos de imports de VALOR | `import type`, nombres usados solo como tipo y reexports de solo tipos no cuentan (el comprobador de TypeScript decide lo dudoso); `import()` no cuenta (es perezoso) |
| `errores/catch-traga` | media (servidor) / baja (cliente) | `catch {}` y `.catch(() => {})` (o que devuelve `undefined`, `null`, `void 0`) | Un catch vacío con comentario sigue contando (lo dice el mensaje) |
| `escala/consulta-sin-limite` | media | `getDocs(collection(…))` o `getDocs(query(…))` sin `limit()`; `.collection(…)…get()` sin `.limit()` en el servidor | No sigue variables (`getDocs(q)`), ni transacciones; una colección pequeña por contrato da falso positivo |
| `react/intervalo-sin-limpieza` | media | `setInterval` cuyo identificador no llega a `clearInterval` en la limpieza de un `useEffect` | Se compara por efecto y sigue funciones auxiliares hasta dos saltos; un intervalo creado fuera de un efecto vale con la limpieza de cualquiera; guardarlo en un array o un objeto da falso positivo |
| `i18n/texto-a-mano-fuera-de-pantallas` | media (baja en `throw`) | Frases (≥2 palabras) en setters, `Alert.alert`, `notify` o `throw new Error` en `hooks/`, `contexts/`, `services/`, `utils/` | Un mensaje interno de desarrollador en un `throw` también cuenta |
| `tests/suite-huerfana` | media | `functions/test/*.test.mjs` fuera de `scripts.test` | — |
| `tests/aserto-siempre-verdadero` | media | `check(x, true)` fuera de try, if-else, `?:`, noLanza o acepta; un `true` en una cadena de «o» dentro de un check | Solo la función `check` |
| `reglas/cambio-peligroso` | bloqueante / alta | Con `--base`: `allow write… if true` o sin condición añadido (bloqueante); `request.auth` retirado que no vuelve en el bloque ni en la función que lo sustituye (alta) | Condiciones partidas en varias líneas |
| `frontera/cambio` | disparador | Carpeta nueva en `functions/src`, arista nueva entre carpetas, exports de `functions/src/index.ts`, zonas rojas, dependencias | No es un hallazgo: decide qué revisor entra |

**Ids estables.** `<dominio>/<regla>/<ruta>#<ancla>`. El ancla es un símbolo (función, método, clase, export;
el `match` en las reglas de Firebase; `(archivo)` o `(ciclo)`), nunca una línea: insertar líneas o mover la
función no cambia el id. Varios en la misma ancla llevan `@<huella corta>` y, solo si son idénticos, `~2`.
La **huella** es el sha256 del fragmento sin comentarios ni espacios.

**Salidas:** JSON propio y SARIF 2.1.0 (`partialFingerprints` con la huella y el id; `baselineState` new /
unchanged / updated / absent cuando hay baseline).

## La baseline y sus estados

`ops/revision/baseline.json`: `{ version, corte, generado, reglas: {id: version}, entradas: [...] }` (esquema
completo en la cabecera de `ops/revision/clasificacion.mjs`). El `corte` es el commit desde el que se cuenta; la
primera baseline se corta en `5be63ff`.

| Estado | Significa | Bloquea |
|---|---|---|
| PREEXISTENTE | Ya estaba en el corte | No |
| NUEVO | No estaba y su archivo cambió desde el corte (o una cuenta de `any` subió) | Si es alto o bloqueante |
| NUEVA REGLA | Lo ve una regla que entró después de la baseline, o código anterior al corte visto por primera vez | No |
| CORREGIDO | Estaba y ya no aparece (salvo lo de auditoría, que se cierra a mano) | No |
| REAPARECIDO | Estaba CORREGIDO y ha vuelto | Sí |
| ACEPTADO COMO DEUDA | Decisión: exige motivo, responsable, fecha, revisar_en y referencia | No |
| INCIERTO | Decisión pendiente: exige pregunta | No |
| FALSO POSITIVO | Decisión: exige motivo | No (tampoco en higiene) |

Cualquier `higiene/*` bloquea en cualquier estado salvo FALSO POSITIVO. Las entradas con `origen:
auditoria-2026-10-01` (hallazgos de la auditoría sin detector) **nunca pasan solas a CORREGIDO**.

`baseline.mjs --proponer <ruta>` escribe una baseline PROPUESTA en otra ruta (se niega a escribir sobre la
vigente y con alcance parcial): NUEVA REGLA y NUEVO bajo/medio → PREEXISTENTE; lo que ya no aparece → CORREGIDO;
NUEVO alto o bloqueante, REAPARECIDO, higiene y subidas de `any` → `pendientes`, fuera de las entradas, hasta
que alguien decida. `--inicial` (la primera, en el corte) lo pasa todo a PREEXISTENTE salvo la higiene.

## Las puertas del cierre de fase

| Puerta | Qué | Para la fase si… |
|---|---|---|
| G0 | Higiene: no seguidos, imports a archivos fuera de git, secretos | hay `higiene/*` o un secreto |
| G1 | Build: `tsc` de la app (0 errores) y de Functions | hay un error nuevo |
| G2 | Pruebas: la cadena de suites; emuladores `demo-*` si se tocaron reglas o Functions | una suite falla |
| G3 | Detectores + baseline | NUEVO alto/bloqueante, REAPARECIDO o higiene |
| G4 | Selector: zonas, revisores, presupuesto | (no para: informa de lo que queda fuera) |
| G5 | Revisores IA en las zonas disparadas, dentro del presupuesto | (no para por sí sola) |
| G6 | Verificación: todo candidato BLOQUEANTE se reproduce con una prueba o lo intenta refutar un segundo agente | un bloqueante VERIFICADO |
| G7 | Decisión del dueño sobre el informe y la baseline propuesta | lo que el dueño diga |

El informe queda en `ops/revision/informes/<fecha>-<fase>.{json,md}`; los intermedios en `ops/revision/tmp/`
(ignorada por git).

## Control de coste

- **Solo lo que cambió**, más sus importadores directos, y solo los revisores cuyas zonas se disparan. Los
  documentos, los generados y lo que `paquetes.json` aparta (`noRevisables`: catálogos de textos, bloqueos,
  binarios) no van a la IA, y el plan lo dice.
- **Paquetes de contexto por zona y por sección** (`contexto/paquetes.json`): `CORE.md`, `RUNTIME.md` y
  `ALGORITHM-ENGINE.md` entran por secciones, no enteros.
- **Presupuesto** (`--presupuesto`, 300 000 tokens por defecto, estimados como caracteres/4): primero rúbricas y
  lo de siempre; después, revisor a revisor, su paquete y sus archivos de zona roja; luego el resto y por último
  los importadores. Lo que no cabe se LISTA (`fueraDelPresupuesto` y el resumen): nunca hay recorte silencioso.
- **Caché** (`ops/revision/.cache/`, ignorada por git): clave = sha256(versión de las rúbricas y de las reglas +
  hash del archivo + hash del paquete de contexto + modelo). Cualquier cambio en uno de los cuatro invalida la
  entrada; `selector.mjs --registrar` guarda los hallazgos de una revisión hecha.
- **Revisión completa** (todas las zonas, sin caché, presupuesto ampliado con permiso): la baseline inicial, la
  integración de una rama a `main`, antes del primer release y en un barrido periódico de las zonas rojas
  (reglas, dinero, puertas, entrega).

## Cómo se ejecuta

```
node ops/revision/detectores.mjs [--base <commit>] [--json <f>|-] [--sarif <f>] [--solo reglas] [--archivos a,b] [--raiz <dir>]
node ops/revision/baseline.mjs   [--base <commit>] [--detectores <json>] [--json <f>] [--md <f>] [--sarif <f>]
node ops/revision/baseline.mjs   --validar
node ops/revision/baseline.mjs   --proponer <otra ruta> [--inicial] [--corte <commit>]
node ops/revision/selector.mjs   [--base <commit>] [--detectores <json>] [--plan <f>] [--presupuesto N] [--modelo id]
node ops/revision/selector.mjs   --registrar <plan.json> <resultados.json>
```

El repositorio entero (1 530 archivos) pasa por los detectores en unos 4 s en el portátil del equipo, 5–6 s con
`--base` (medido el 2026-10-01; hasta 12 s con otros procesos pesados a la vez), por debajo del objetivo de 60 s.

## Qué exige autorización

- Aplicar una baseline propuesta sobre `ops/revision/baseline.json`, o cambiar a mano una decisión
  (ACEPTADO COMO DEUDA, FALSO POSITIVO, cierre de un hallazgo de auditoría).
- Subir el presupuesto por encima del de por defecto o pedir una revisión completa.
- Cualquier commit, push, merge o despliegue: el revisor no los hace nunca.
- Cambiar `.claude/settings.json` o la guardia, o dar a un revisor una herramienta que escriba.
