# scripts/carga — carga controlada de Weë en el emulador (Frente I)

Mide **contención y lógica** de los callables críticos (Credits, cupos, libro de generaciones, Weë Brain, Weë AI) con
el código **compilado** (`functions/lib`) contra un emulador de Firestore propio, con la red cortada y el proveedor
`mock`. **No** mide la latencia real de Firestore ni de Cloud Run, ni arranques en frío, ni el límite sostenido de
escrituras por documento de Firestore real (el emulador no lo aplica). Ningún número de aquí es «capacidad en usuarios
reales».

## Requisitos

- `functions/lib` compilado (`npm --prefix functions run build`).
- Java 21 (`JAVA21_HOME` o el portable de `%LOCALAPPDATA%/wee-tools`) y el jar del emulador en
  `~/.cache/firebase/emulators/cloud-firestore-emulator-v*.jar` (lo baja `firebase-tools` la primera vez).
- Puertos 18100/18101 libres (`CARGA_PUERTO` para cambiarlos). `tanda.mjs` se niega a arrancar si están ocupados.

## Uso

```bash
# Prueba corta reproducible (N=25: ≈60-90 s): 0 doble cobro y saldo coherente bajo ráfaga. Sale con 0 si todo cuadra.
node scripts/carga/tanda.mjs rafaga-dinero.mjs

# Medición por escalones (cada tanda ≤ 5 min; tanda.mjs la corta a los 300 s)
node scripts/carga/tanda.mjs carga.mjs --escenarios dinero,dinero-ab --escalones 1,10,25,50,100 --salida /ruta/r.json
node scripts/carga/tanda.mjs carga.mjs --escenarios callables,cupo,libro
node scripts/carga/tanda.mjs carga.mjs --escenarios brain
node scripts/carga/tanda.mjs carga.mjs --escenarios creator --escalones 1,10,25
```

Variables: `CARGA_MUESTRAS` (muestras por escalón, 60), `CARGA_DEMORA_MS` (latencia simulada del proveedor, 25),
`CARGA_RAFAGA_N` (tamaño de la ráfaga, 25), `CARGA_P95_MS` (criterio informativo de latencia, 1500),
`CARGA_ESTRICTO=1` (el criterio de latencia también decide la salida), `CARGA_TANDA_MAX_S` (300),
`CARGA_LIMITE_MS` (presupuesto de una ejecución de `carga.mjs`, 270000: los escalones que no caben se omiten y se
dice), `CARGA_VARIANTES` (expresión regular sobre `escenario/variante` para medir solo parte).

Ojo con dos cosas al leer números: (1) el proveedor `mock` de Weë ya duerme 600-1100 ms por llamada de texto
(`gateway/providers/mock.ts`), y `CARGA_DEMORA_MS` se suma; (2) en el emulador una CONSULTA dentro de una transacción
que luego escribe choca con las de otras cuentas (escenario `sonda`): es probable que sea un bloqueo más grueso que el
de Firestore real, así que la contención entre cuentas distintas del Credit Engine hay que confirmarla fuera del
emulador antes de tratarla como defecto de producción.

En la máquina compartida de la ronda, cada tanda va dentro del candado de operaciones pesadas
(`pesado.mjs acquire FRENTE-I` … `release FRENTE-I`) y con ≥ 90 s libres entre tandas.

## Qué sale de cada escalón

Latencia p50/p95/p99/máx por operación; errores por código; transacciones de Firestore, cuántas se **reintentaron**
(contención) y el máximo de intentos (el SDK corta en 5 → ABORTED); los documentos más escritos (rutas normalizadas:
`{cuenta}`, `{dia}`, `{auto}`); llamadas al proveedor simulado; pico de RSS/heap y CPU/pared del proceso; y los
invariantes de dinero/cupo comprobados contra lo guardado.

## Archivos

| Archivo | Qué es |
|---|---|
| `_entorno.mjs` | Aislamiento (demo-*, red cortada, sin claves), carga del compilado, mock con latencia, instrumentos del SDK |
| `tanda.mjs` | Arranca el emulador propio (jar), lanza el script y lo apaga por su PID |
| `carga.mjs` | Escenarios por escalones (dinero, dinero-ab, callables, cupo, libro, brain, creator, sonda) |
| `rafaga-dinero.mjs` | Prueba corta R1–R6: 0 doble cobro, sin sobregiro, un solo desenlace por operación, 1 bienvenida; informa además las llamadas al modelo por envíos idénticos (R5-coste) y el criterio L1 de latencia |
