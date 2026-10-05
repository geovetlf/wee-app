# Weë Hillclimb (F6)

Optimiza **cualquier componente de WEE** con evidencia, no con intuición:

> BASELINE → EXPERIMENTO → MEDICIÓN → COMPARACIÓN → DECISIÓN → CONSERVAR / RECHAZAR

No es un segundo motor de evaluaciones. Es un bucle sobre el [Eval Engine](EVALS.md):
- **mide** con su corredor común (`ejecutarDataset`);
- **compara** con su `comparar`;
- **protege** el holdout con sus permisos (`cargarHoldout`).

Lo único propio de Hillclimb es el bucle de experimentos y su registro. Vive en `ops/hillclimb/`: es una herramienta de ingeniería y producción no la carga nunca.

## Reglas

1. **Transversal.** Hay **un** Hillclimb, no uno por componente ni por experiencia. Un dominio entra declarando qué se puede cambiar (su **superficie**) dentro del contrato de dominio del motor, y el bucle no se toca.
2. **$0.** Solo mide dominios que deciden sin ejecutar adaptadores. Si una medición ejecuta alguno, se invalida. Optimizar con el proveedor real exigiría pasar por `evalRun` y su presupuesto; eso es otra fase y necesita autorización.
3. **Reversible.** Nada se aplica: no escribe en Firestore, no cambia `aiSettings` ni `aiRouting`, no hace commit, push, merge ni despliegue. «Conservar» genera una **propuesta** con su evidencia, y la adopta una persona por PR.
4. **Reproducible.** Sin reloj ni azar: las mismas entradas (dominio, dataset, superficie, configuración y código) dan el mismo registro, byte a byte.
5. **Explicable.** Cada decisión lleva:
   - los motivos de `comparar`;
   - los deltas por dimensión;
   - los casos que cambian de decisión, y cuáles pasan a fallar o a aprobar.
6. **Honesto.** Si un parámetro no cambia ninguna decisión, es **inerte** y se dice así. No se inventa una mejora ni un empeoramiento.

## La superficie de un dominio

Son dos campos opcionales del contrato de dominio del motor (`functions/src/evals/motor/dominios.ts`), y van juntos:

```js
superficie: {
  version: 'router-superficie@1',
  parametros: {
    defaultPolicy: { tipo: 'enum', valores: ['balanced', 'quality-first', 'cost-first'], baseline: 'balanced' },
  },
},
aplicarCandidato: (caso, candidato) => caso',   // pura: superpone el candidato a un caso
```

**El motor valida la superficie** (`validarSuperficie`):
- tiene una versión;
- cada parámetro es `enum`, con al menos dos valores simples y sin repetir;
- el `baseline` es el valor de producción y está entre los permitidos;
- no lleva nada más.

Una superficie inválida no entra en el registro. Un dominio sin superficie se sigue evaluando, pero no se optimiza.

## El bucle

1. **BASELINE.** Se mide el candidato de producción (todos los `baseline`). Tiene que reproducir la baseline comprometida del dominio (`ops/evals/baseline/<dominio>.json`). Si no la reproduce, la baseline está desfasada y no se arranca.
2. **EXPERIMENTO.** Se prueban los vecinos del candidato vigente: cambiar un parámetro a otro valor permitido.
   - El orden es determinista: parámetros por nombre, valores por su orden declarado.
   - Hay un tope de experimentos (12 por defecto).
3. **MEDICIÓN.** Se pasa el dataset con el candidato superpuesto por el corredor común. `aplicarCandidato` tiene que ser pura: si tocara el caso original, la medición se para.
4. **COMPARACIÓN.** `comparar(vigente, vecino)`, con los umbrales de `ops/evals/config.json`.
5. **DECISIÓN.** Para que un vecino se pueda conservar tiene que mejorar de verdad (`ACCEPT`) y cambiar alguna decisión.
   - Un vecino que no cambia ninguna decisión se rechaza por ser **inerte**.
   - REJECT, NO_CHANGE y REVIEW_REQUIRED se rechazan.
   - Al final de cada ronda se sube al mejor conservable; en un empate gana el primero. Si no hay ninguno, es un óptimo local y se para.
6. **CONSERVAR / RECHAZAR.** Si el candidato final no es el de producción, queda `PENDIENTE_DE_HOLDOUT`. Para ser **PROPUESTA** no puede empeorar en el **holdout** sellado (veredicto ACCEPT o NO_CHANGE).
   - El acceso al holdout es el del Eval Engine: rol `eval-holdout`, un motivo y **una sola vez por candidato**. La huella del candidato es su «versión de candidato».
   - Si empeora en el holdout: `RECHAZADA_EN_HOLDOUT`.

## El primer dominio: el Router

- **La superficie v1 es deliberadamente pequeña:** `defaultPolicy`, la política del router cuando la cadena de una capacidad no fija la suya. Usa los valores de `RoutingPolicy` (`engine/types.ts`) y el de producción, `balanced`.
- **Resultado medido hoy: `defaultPolicy` es inerte en el dataset del Router.** Sus 18 casos (13 de desarrollo y 5 de holdout) fijan la política de su propia cadena, así que ningún caso cambia de decisión: 2 experimentos, `SIN_MEJORA`. Esta respuesta es válida: la palanca no actúa sobre lo que el dataset mide.
- **Optimizar de verdad la política del Router** exige un dataset con objetivos que no dependan de la configuración, por ejemplo «el proveedor más barato con calidad ≥ 4». Qué es «mejor» (calidad, coste o latencia) es una **decisión de producto**, no del motor.

## Cómo se ejecuta

```bash
node ops/hillclimb/cli.mjs --dominio router
```

**Opciones:**
- `--max N`: tope de experimentos.
- `--json`: imprime el registro canónico en vez del Markdown.
- `--escribir`: guarda `hillclimb.json` y `hillclimb.md` por la puerta de F3, como la extensión `hillclimb`, en `ops/harness/.cache/hillclimb/`. No escribe nada más.
- `--holdout --rol eval-holdout --motivo "…"`: confirma la propuesta en el holdout sellado. **Exige `--escribir`**, porque un uso del holdout siempre queda registrado (`holdout-usos.json`).

**Salidas:** 0 si termina, con o sin propuesta; 2 si hay un error, también una baseline desfasada.

**En el Harness:**
- la extensión `ops/harness/extensiones/hillclimb.json` registra sus tres informes, con el permiso mínimo (`escribir-cache`). No es una puerta: su suite va en la cadena, y el cierre de misión (F4) no exige evidencia de ella;
- el cierre de misión (F4) puede tomar su registro como evidencia.

## Pruebas

`functions/test/hillclimb.test.mjs`, en la cadena:
- **El bucle:** un dominio de prueba con óptimo conocido, que el bucle encuentra y donde para; rondas, empates y tope.
- **Inercia y baseline:** lo inerte se dice, y una baseline desfasada no arranca.
- **Lo que el motor controla:**
  - el coste de $0;
  - la pureza de `aplicarCandidato`;
  - la superficie, validada de 9 formas;
  - los dominios sin superficie o sin registrar.
- **El holdout:**
  - rol y motivo;
  - una vez por candidato;
  - rechazo si empeora;
  - sin propuesta no se toca.
- **El Router real:** su baseline, la inercia de `defaultPolicy` y que sus valores son los de `RoutingPolicy`.
- **La línea de órdenes y F3.**
- **Un solo motor y sin poderes.**

