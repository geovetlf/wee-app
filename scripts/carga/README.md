# scripts/carga — MEDICIÓN de carga de Weë en el emulador (Frente I)

> **Esto es MEDICIÓN, no una prueba.** Nada de este directorio dice «PASA» o «FALLA» por un tiempo, ni lo lee la CI.
> Sus números salen de un emulador en un ordenador compartido: sirven para comparar dos ejecuciones de la misma máquina
> y para encontrar documentos calientes, **no para afirmar nada sobre producción**. La corrección del dinero bajo
> concurrencia (0 doble cobro, saldo coherente) es otra cosa y vive en una **prueba funcional**:
> `functions/test/rafaga-dinero.emulator.mjs` (nivel 2 de la CI, la lanza `functions/test/_emuladores.mjs`; sin
> percentiles, sin tiempos, sin umbrales). Antes las dos cosas compartían un script y un número de latencia podía
> confundirse con una prueba de corrección: ya no.

Mide **contención y lógica** de los callables críticos (Credits, cupos, libro de generaciones, Weë Brain, Weë AI) con
el código **compilado** (`functions/lib`) contra un emulador de Firestore propio, con la red cortada y el proveedor
`mock`. **No** mide la latencia real de Firestore ni de Cloud Run, ni arranques en frío, ni el límite sostenido de
escrituras por documento de Firestore real (el emulador no lo aplica). Ningún número de aquí es «capacidad en usuarios
reales». Cada informe JSON lo dice de sí mismo: `tipo: "medicion"` y `concluyente: false`.

## Requisitos

- `functions/lib` compilado (`npm --prefix functions run build`).
- Java 21 (`JAVA21_HOME` o el portable de `%LOCALAPPDATA%/wee-tools`) y el jar del emulador en
  `~/.cache/firebase/emulators/cloud-firestore-emulator-v*.jar` (lo baja `firebase-tools` la primera vez).
- Puertos 18100/18101 libres (`CARGA_PUERTO` para cambiarlos). `tanda.mjs` se niega a arrancar si están ocupados.

## Uso

```bash
# Medición por escalones (cada tanda ≤ 5 min; tanda.mjs la corta a los 300 s)
node scripts/carga/tanda.mjs carga.mjs --escenarios dinero,dinero-ab --escalones 1,10,25,50,100 --salida /ruta/r.json
node scripts/carga/tanda.mjs carga.mjs --escenarios callables,cupo,libro
node scripts/carga/tanda.mjs carga.mjs --escenarios brain
node scripts/carga/tanda.mjs carga.mjs --escenarios creator --escalones 1,10,25

# Lo que antes era el criterio de latencia L1 de la ráfaga (p95 de spend+complete con 25 cuentas a la vez) es ahora
# solo esto: una medición más, con su informe, que no decide nada.
node scripts/carga/tanda.mjs carga.mjs --escenarios dinero --escalones 25
```

La prueba de que **no hay doble cobro bajo ráfaga** no está aquí: se lanza como cualquier suite de emulador.

```bash
node functions/test/_emuladores.mjs --solo rafaga-dinero
```

Variables: `CARGA_MUESTRAS` (muestras por escalón, 60), `CARGA_DEMORA_MS` (latencia simulada del proveedor, 25),
`CARGA_TANDA_MAX_S` (300), `CARGA_LIMITE_MS` (presupuesto de una ejecución de `carga.mjs`, 270000: los escalones que
no caben se omiten y se dice), `CARGA_VARIANTES` (expresión regular sobre `escenario/variante` para medir solo parte).

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
invariantes de dinero/cupo comprobados contra lo guardado. **La salida del proceso depende solo de esos invariantes y
de la red cortada, nunca de un tiempo**: si un invariante de dinero falla, la medición se descarta (no mide nada
fiable); si una latencia es alta, se anota.

## Archivos

| Archivo | Qué es |
|---|---|
| `_entorno.mjs` | Aislamiento (demo-*, red cortada, sin claves), carga del compilado, mock con latencia, instrumentos del SDK. Lo importan `carga.mjs` y la suite funcional `functions/test/rafaga-dinero.emulator.mjs` |
| `tanda.mjs` | Arranca el emulador propio (jar), lanza el script de medición y lo apaga por su PID |
| `carga.mjs` | Escenarios por escalones (dinero, dinero-ab, callables, cupo, libro, brain, creator, sonda): medición |
