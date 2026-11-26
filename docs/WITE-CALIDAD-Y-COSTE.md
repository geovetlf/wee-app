# WITE · Calidad social adaptativa y coste mínimo (2026-11-26)

Evaluación de la directiva «Adaptive Social Quality & Low-Cost Processing». Es complemento de [`WITE.md`](WITE.md) y de
[`WITE-INVENTARIO.md`](WITE-INVENTARIO.md). No hay commit ni despliegue, no se llamó a ningún proveedor y no se gastó nada.

Marcas: **[medido]** = ejecutado aquí · **[fórmula]** = tarifa oficial con la fórmula del motor, sin tarea real · **[estimado]** = cifra publicada por terceros o suposición, por verificar.

## 1. Qué quedó implementado (sin activar)

- **Controlador de calidad** (`functions/src/wite/calidad.ts`). Decide **una** resolución antes del render.
  - Parte de 360p. Sube a 480p si el protagonista es pequeño, hay 3 personas o más, hay mucho movimiento, o si no hay detección del protagonista (sin detección no se arriesga la identidad).
  - Nunca sube por encima del original. Se ajusta a lo que ofrece el modelo.
  - Ofrece «la siguiente» solo hasta 480p. Nunca HD.
- **Con Seedance siempre sale 480p**, con el motivo `minimo_del_proveedor`: Seedance no ofrece 360p. La regla usará 360p sola el día que haya un proveedor que la tenga.
- **Análisis real del original** con el FFmpeg de Weë (`functions/src/wite/medios.ts`, reutiliza `renderizador.ts`): duración, tamaño, códec, fps, sonido y movimiento (filtro `scene`). Se lee por URL, sin bajar el archivo entero. La duración que vale es la medida, ya no la que manda la app.
- **Un render y vista previa real.** Seedance edita sin generar audio (`generate_audio: false`). FFmpeg le pega la pista del original, sin reencodar la imagen si ya es H.264 (si no, la pasa a H.264).
  - Ese archivo es la vista previa **y** lo que se publica.
  - Queda como material aparte (`asset_wite_out_…`) con `sourceAssetIds = [original]`.
  - El intermedio mudo se retira.
  - Si FFmpeg falla, se entrega el intermedio con el aviso «no se pudo conservar el audio original».
- **Otra resolución.** La persona puede pedir la siguiente, si existe; se cotiza y se cobra como un trabajo nuevo, con el precio visible antes. Hoy no hay ninguna siguiente.
- **Modelo de edición elegido en Firestore** (`aiSettings/identityTransform.modelo`). Por defecto el más barato, `SEEDANCE_2_0_MINI`. Que mini edite bien **no está verificado**; lo decide el canario.
- **Consumo real** (`creator/video.ts`, solo cuando llama WITE):
  - Al cerrar se cobra `min(reservado, Credits de usage.completion_tokens)` con el `finalAmount` del Credit Engine, que devuelve la diferencia como «Ajuste: costó menos de lo reservado».
  - El Credit Engine no se tocó: se reutiliza la fórmula única (`creditosDeUnCoste` = `creditsOf`).
  - La app no puede pedir esta opción: solo existe en la llamada interna.
- **En la app:** «Hasta X Credits» antes, «Se cobraron X Credits» y «Calidad 480p» en la revisión, y el aviso de audio. Son 5 claves nuevas en los 42 idiomas.
- **Pruebas:** `functions/test/wite.test.mjs` pasa entera (84 comprobaciones), con 20 nuevas para el controlador, FFmpeg y el consumo real. Chequeo de tipos de la app y de las Functions: 0 errores.

## 2. Evaluación reproducible

`FFMPEG=<ruta> node scripts/wite-evaluacion.mjs [carpeta]`. Escribe `informe.json`.

### A. FFmpeg de WITE sobre clips sintéticos [medido]

Clips verticales a 24 fps; FFmpeg 9.0.2 local (en las Functions el binario es el de `ffmpeg-static`). La CPU es de este PC,
no la de una Function, así que los tiempos son orientativos.

| Perfil | Duración | Sonda | Movimiento | Remux (audio original) | Resultado |
|---|---|---|---|---|---|
| 360p | 5 s | 126 ms | 146 ms | 247 ms | 1,1 MB · H.264 · con audio |
| 360p | 10 s | 93 ms | 165 ms | 384 ms | 2,5 MB · H.264 · con audio |
| 360p | 15 s | 86 ms | 183 ms | 515 ms | 3,7 MB · H.264 · con audio |
| 480p | 5 s | 99 ms | 149 ms | 226 ms | 1,8 MB · H.264 · con audio |
| 480p | 10 s | 96 ms | 180 ms | 369 ms | 3,9 MB · H.264 · con audio |
| 480p | 15 s | 110 ms | 257 ms | 549 ms | 6,0 MB · H.264 · con audio |

Conclusiones:
- La preparación y la composición cuestan menos de un segundo de CPU por clip: céntimos de céntimo.
- El almacenamiento es de 1–6 MB por resultado.
- El controlador decidió 480p en los 6 casos. Motivos: sin detección del protagonista y mínimo del proveedor.

### B. Coste del proveedor por clip a 480p [fórmula]

Fórmula: (s de entrada + s de salida) × píxeles × 24 / 1024 × tarifa oficial con vídeo de entrada.

| Modelo | 5 s | 10 s | 15 s | Reserva hoy (techo R22) |
|---|---|---|---|---|
| Seedance 2.0 mini | **0,27 USD** | 0,53 | 0,79 | 80 Credits |
| Seedance 2.0 fast | 0,42 | 0,83 | 1,25 | 125 Credits |
| Seedance 2.0 | 0,54 | 1,08 | 1,63 | 200 Credits |
| Seedance 2.5 | 0,81 | 1,61 | 2,42 | 484 Credits |

- **Objetivo ≤ 0,25 USD:** ningún modelo de Seedance lo alcanza.
- **Objetivo ≤ 0,40 USD:** solo 2.0 mini con 5 s.
- El mínimo de tokens con vídeo de entrada (no publicado en la página) puede subir los clips cortos.

**Lo que se cobraría con consumo real.** En el modo de precios actual (`pricingMode` de prueba) manda el suelo del
catálogo: por ejemplo, 2.0 mini cobraría 75 Credits a los 5 s frente a 80 reservados, así que el ahorro es pequeño. El
consumo real ahorra de verdad cuando el modo es `real` y en los clips cortos. Lo detalla `informe.json`.

## 3. GPU propia con Wan-Animate 14B [estimado; no medido]

No hay pruebas publicadas de Wan **Animate**. La referencia más fiable es la cifra oficial del modelo base Wan 2.2 de
14B (texto a vídeo), en una sola GPU:
- **H100:** unos 5,4 min por clip de 5 s a 480p.
- **A100:** unos 13,1 min.
- **Memoria máxima:** 41,3 GB a 480p y 59,8 GB a 720p.

Animate añade el condicionamiento por pose y cara, así que no será más barato.

| GPU | ¿Cabe a 480p? | Coste por hora (mercado, por verificar) | 5 s a 480p | Nota |
|---|---|---|---|---|
| H100 80 GB | Sí | ≈ 2–3 USD | ≈ 0,18–0,27 USD de inferencia | La más rápida; más el arranque |
| A100 80 GB | Sí | ≈ 1,2–1,9 USD | ≈ 0,26–0,41 USD | 2,4 veces más lenta que H100 |
| L40S / RTX 6000 Ada 48 GB | Justo (41 GB) | ≈ 0,8–1,2 USD | sin dato | Habría que medirla |
| 24 GB (4090) | Solo con FP8 o descarga a CPU (no oficial) | ≈ 0,4–0,7 USD | sin dato, lenta | Riesgo de calidad y de memoria |
| 12–16 GB | Solo con GGUF Q4 (no oficial) | — | — | No recomendable para producción |

- **360p** son ~0,56 veces los píxeles de 480p, así que ≈ 0,6 veces el tiempo [estimado].
- **15 s** son ~3 veces el coste de 5 s.
- **El arranque en frío** carga ~30 GB de pesos en 1–3 min, lo que añade 0,04–0,15 USD por trabajo si no hay GPU caliente o tandas.
- **Bajar fps:** Wan ya trabaja a 16 fps (Seedance cotiza a 24).

**Lectura:** con Wan, ≤ 0,25 USD es *plausible* para clips de 5 s a 360p en H100 con la GPU ya caliente. No lo es para
10–15 s. **Nada de esto está medido.** Medirlo exige tu excepción a «solo Seedance», alquilar GPU por horas (gasto
autorizado) y descargar los pesos oficiales.

## 4. Recomendación: configuración mínima viable

1. **Proveedor:** Seedance (lo que ya hay), edición a **480p**, modelo elegido en Firestore. Probar en canario de más barato a más caro (mini → fast → 2.0) y quedarse con el más barato que pase los criterios de calidad en el teléfono.
2. **Duración:** con Seedance, el coste por debajo de 0,40 USD solo se cumple con unos 5 s. Si el objetivo de coste manda, conviene una sugerencia de recorte en la app (5–8 s), sin quitar el máximo de 15 s. Es decisión de producto.
3. **Audio:** el original restaurado con FFmpeg (hecho). **Vista previa:** el mismo archivo que se publica (hecho).
4. **Credits:** reserva del techo, cobro del consumo real (hecho para WITE). Pasar a `pricingMode: real` es decisión tuya y afecta a todo Weë.
5. **Wan-Animate:** solo como experimento medido si (a) BytePlus no habilita activos de persona real para usuarios, o (b) el canario demuestra que Seedance no sirve para esto.

## 5. Lo que sigue bloqueando el lanzamiento

- La regla de ModelArk sobre caras reales en el vídeo original. Sin los activos de persona real autorizados, ninguna transformación real.
- El canario con gasto autorizado: qué modelo edita, si conserva a los demás, el coste real y la tasa de fallos.
- La detección del protagonista con Gemini sobre un fotograma: hasta tenerla, el controlador no puede elegir 360p.
- La verificación de identidad, la etiqueta sintética obligatoria y la procedencia, antes de ofrecerlo al público.
