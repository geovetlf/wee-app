# Observabilidad de Weë — pocas alertas, que se puedan actuar

Weë Agent Harness, FASE 14.

La auditoría H0 (2026-09-30) encontró **cero alertas**. Producción estuvo caída
por facturación de 12:33Z a 17:53Z y nadie se enteró. El único aviso era un
presupuesto de 100 PEN por correo.

La regla: solo se alerta de lo que el dueño tiene que mirar, y cada alerta dice
qué mirar.

## Las alertas

| Alerta | Cuándo salta | Qué hacer |
|---|---|---|
| **Dinero sin cerrar** | Un reembolso o una liquidación de Credits falló. Salta en el primer caso, como mucho una vez cada 30 min | Buscar el trabajo (`creatorJobs` con `liquidacionPendiente`) o la operación (`creditTransactions`) y cerrarla. El Credit Engine es idempotente |
| **IA no disponible** | Más de 5 peticiones de IA en 10 min sin proveedor | Un proveedor caído, una clave mal rotada ([SECURITY.md](SECURITY.md) §4), el interruptor `iaDetenida` encendido o el tope de gasto diario alcanzado ([AI-ENGINE.md](AI-ENGINE.md) § Límites) |
| **Tope de gasto diario alcanzado** | La IA se paró sin cobrar por el `maxUsdPerDay` global o el de un proveedor (en cuanto pasa) | Decidir si el gasto es legítimo (subir el tope con `engineAdmin`) o un abuso (`aiGenerations` de hoy). No vuelve sola hasta medianoche UTC ([COSTES.md](COSTES.md)) |
| **Uso de IA anómalo** | Más de 300 generaciones en 15 min (`UMBRAL_DE_USO_ANOMALO`, ajustable con datos reales) | Abuso o éxito: `aiGenerations` por persona y proveedor. Si es abuso, `iaDetenida` lo para todo sin cobrar |
| **El barrido no termina** | Dos o más pasadas de la reconciliación seguidas sin terminar | El dinero de tareas ya lanzadas no se está cerrando ([RUNTIME.md](RUNTIME.md)) |
| **Errores 5xx** | Más de 10 respuestas 5xx en 10 min en las Functions | Logs del servicio. Si vino de un despliegue, marcha atrás ([DEPLOYMENT.md](DEPLOYMENT.md) §5) |
| **Weë caído** | La comprobación externa (cada 5 min, desde varias regiones) falla | Primero, la cuenta de facturación (así fue la caída de H0). Después, los logs |

Más el presupuesto: al aviso de 100 PEN se le añaden umbrales al 50 %, 90 % y 100 %.

**Lo que pidió el dueño (2026-10-01), y dónde está cada cosa:**

| Pidió | Lo cubre |
|---|---|
| 5xx | Errores 5xx |
| Errores de funciones | Errores 5xx también cuenta las llamadas de Eventarc y de Cloud Scheduler a las funciones de eventos y programadas, porque llegan a Cloud Run por HTTP. Además, «El barrido no termina» |
| Gasto anómalo de IA | Uso de IA anómalo (dentro de Weë) y el presupuesto de facturación (Gemini cobra a la cuenta de facturación). El gasto de una clave robada FUERA de Weë solo lo ve el proveedor: avisos de gasto en las consolas de BytePlus, BFL y DeepSeek (gratis, los configura el dueño) |
| Límite diario | Tope de gasto diario alcanzado |
| Agotamiento de proveedor | IA no disponible |
| Fallos de despliegue | GitHub avisa por correo de cada run fallido del workflow (gratis, por defecto). El workflow además sale en rojo si el humo, los hashes o la observación fallan |
| Anomalías críticas | Dinero sin cerrar y Weë caído |

**Sin logging de más.** Las siete alertas se apoyan en líneas que el código ya
escribe; no se añade ni un log.

**Después de cada despliegue** hay además una ventana de observación propia,
que no es una alerta: el workflow cuenta durante 10 minutos los 5xx de las
funciones que acaba de desplegar y, si suben más de 5 sobre los de antes,
devuelve el tráfico solo ([DEPLOYMENT.md](DEPLOYMENT.md) §6). La alerta de
5xx sigue vigilando a todas las funciones, siempre.

## Cómo está hecho

**Una sola fuente.** Todo está en `ops/observabilidad/alertas.mjs`: los
mensajes de log, las métricas, las políticas y la comprobación de salud.

**Las alertas no se quedan ciegas.** Se apoyan en mensajes que el código ya
escribe (`console.error`/`console.warn`).
- `functions/test/observabilidad.test.mjs` comprueba que cada mensaje sigue en
  el archivo que lo escribe.
- Si alguien cambia el texto, la prueba falla antes de que la alerta deje de
  saltar.

**La comprobación de salud** pide `https://get-wee.web.app/post/salud-del-sistema`.
- Hosting manda `/post/**` a `publicPostPage`, que contesta **404** a un post
  que no existe.
- Un 404 significa que las Functions responden. Un 5xx, o no responder,
  significa que están caídas.
- Son unas pocas miles de invocaciones y lecturas al mes, dentro de la capa
  gratuita.

**Coste.** Son 4 métricas basadas en logs (contadores de poca cardinalidad), 7
políticas y 1 comprobación de salud.
- Las métricas de Cloud Run (5xx) y de las comprobaciones son gratuitas.
- Si Cloud Monitoring cobra por condición de alerta, son 7 condiciones. El
  precio vigente hay que confirmarlo en la consola antes de activarlas.

## Cómo se activa (lo hace el dueño)

```
node ops/observabilidad/alertas.mjs --json alertas-wee
```

El comando:
- escribe las 7 políticas en `alertas-wee/`;
- imprime los comandos para crear el canal de correo (con tu correo, que queda
  en tu proyecto y no en el repositorio), las métricas, la comprobación y las
  políticas.

Claude no los ejecuta: Cloud Monitoring y el correo son del dueño.
