# Weë Design — el Composer (referencia funcional)

**Qué es.** Cómo se dice, en Weë Design, qué se quiere: **crear, transformar o editar**. Nunca «usar Tripo», nunca «usar Meshy»,
nunca un modelo. El AI ROUTER elige el proveedor y la persona no lo ve.

## 1. Las reglas que mandan (y no se tocan)

| Regla | De dónde | Cómo se cumple aquí |
|---|---|---|
| «El usuario elige el resultado. Weë elige la IA.» | CLAUDE.md, [CREATOR.md](CREATOR.md) §1 | La caja pide un resultado («¿Qué quieres diseñar?»); ningún control nombra proveedor, modelo ni API |
| Prompts, modelos, parámetros y APIs nunca a la vista por defecto | [CREATOR.md](CREATOR.md) §6 | No hay campo de «prompt negativo», semilla, modelo ni calidad técnica; los ajustes hablan en palabras («Estilo», «Materiales», «Luz») |
| Siempre «🤷 No sé» en las preguntas | CLAUDE.md, CREATOR.md §7 | La intención por defecto es «Crear» sin respuesta previa: Weë Brain pregunta lo que falta con sus opciones. ⚠ Seis preguntas de la plantilla `design` no lo llevan hoy (H-2, [auditoría](WEE-DESIGN-UIUX-AUDIT.md) §4) |
| **§9 · las cajas crecen solas y nunca pierden sus botones** | CLAUDE.md §9 | La caja es `CajaDePrompt` (que usa `useCajaQueCrece`) dentro de `CajaAnclada` con el alto que le deja el lienzo; `functions/test/cajas-weeai.test.mjs` la vigila |
| **§10 · todas las cajas son el mismo Weë Brain** | CLAUDE.md §10 | Se reutiliza `CajaDePrompt`; no hay otro sistema conversacional, ni router, ni motor de contexto; el contexto viaja por parámetros (`ContextoDeExperiencia`) a `CreatorFlow` |

## 2. Anatomía

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Crear] [Transformar] [Editar]          ← la intención (una a la vez) │
│ (ficha: Inspiración · salon.jpg ✕) (ficha: Estilo · Moderno ✕)       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ¿Qué quieres diseñar?                                            │ │  ← CajaDePrompt (crece)
│ │                                                                  │ │
│ │ (+) (⚙)                                                     (↑)  │ │  ← adjuntar · ajustes · crear
│ └─────────────────────────────────────────────────────────────────┘ │
│ Verás el precio antes de crear.                                       │
└─────────────────────────────────────────────────────────────────────┘
```

- **La intención** no es un modo técnico: es el verbo. Cada una lleva su lista de lo que se puede pedir (la matriz), y lo
  apagado se ve apagado con su motivo.
- **Botones de la caja:** adjuntar (el selector de fotos de siempre, `expo-image-picker`, que guarda un `Adjunto` con su
  **clase**) y ajustes (la hoja común `AjustesContextuales` con el catálogo de Weë Design). **Sin micrófono**: en Weë Design no
  hay dictado conectado (en `DesignScreen` el botón añade una referencia falsa, H-1) y un botón que no hace lo que dice no se pone.
- **El botón amarillo** solo crea; con la caja vacía se apaga (lo hace `CajaDePrompt`).

## 3. Las tres intenciones

| Intención | Qué se puede pedir hoy (conectado) | Qué se ve apagado (con motivo) | A dónde va al crear |
|---|---|---|---|
| **Crear** | Un concepto con propuestas (C01): logo, afiche, producto, vehículo o máquina, lugar, personaje, o «🤷 No sé» | Vistas (C02), modelo 3D (C03), render (C04), entorno (C05), inspiración (C06) | `CreatorFlow` con `experienceId: 'design'`, `workspace: 'design'` y, si se eligió qué, `presets: [{ questionId: 'what', optionId }]` |
| **Transformar** | Rediseñar mi espacio desde su foto (C07) | De una imagen a 3D (C08), de varias vistas a 3D (C09), presentar en vídeo (C10) | `CreatorFlow` con `experienceId: 'home'`; la foto viaja por el camino de siempre (`imageUri` → `creatorUploads`) |
| **Editar** | Cambiar con palabras un trabajo elegido (C11, **parcial**: recrea con el cambio, como las ediciones rápidas de `ResultCard`, sin linaje hasta D3/P2) · abrir su trabajo, donde está «Crear otra versión» (C12) | Quitar fondo (C13), más resolución (C14), cambiar el modelo (C15), materiales (C16), partes (C18), tamaño (C19) | Necesita un trabajo elegido; va a `CreatorFlow` con la experiencia del trabajo y el objetivo `weeai.goalWithChange` |

El destino lo decide `destinoDeIntencion` (`utils/destinoDeIntencion.ts`) con la experiencia que **declara** la intención y
`dentroDe: 'design'`: no es un router nuevo, es el mismo que usa Weë Studio.

## 4. Lo que viaja (el contexto)

```ts
// utils/designReferencia.ts → contextoDeDesign(...)  (puro; sin traducir nada)
{
  experienceId: 'design' | 'home',            // lo dice la intención (puerta), no las palabras
  workspace: 'design',
  goal: '<intención>: <lo que escribió la persona> · <ajustes en palabras>',
  presets: [{ questionId: 'what', optionId: 'logo' }],   // si se eligió qué
  adjuntos: [{ clase: 'referencia' | 'fotoDeUnEspacio', uri, nombre }],
  imageUri: '<primera foto>',                 // el único adjunto que hoy llega al servidor
}
```

- **Lo que la persona escribe no se toca**: se le pone delante la intención y detrás los ajustes en palabras, como hace Weë Studio
  (`StudioScreen.tsx:236-252`), porque el plan todavía no lee los ajustes como estructura (H-5).
- **Nada se cobra por llegar.** `CreatorFlow` pregunta y planifica sin mover dinero; el precio se ve antes de crear
  (`creatorQuote`, `PlanCard`) y el Credit Engine reserva, cobra o reembolsa.
- **La dirección no lleva** ni el texto ni las fotos (la configuración de enlaces ya los excluye: `App.tsx`, `CreatorFlow`).

## 5. Validación (antes de mandar nada)

| Caso | Qué pasa |
|---|---|
| Caja vacía | El botón amarillo apagado (`CajaDePrompt`) |
| Intención con todo apagado | No se puede elegir una capacidad apagada; la intención sigue mandando a lo que sí existe |
| «Transformar mi espacio» sin foto | Se puede mandar: `CreatorFlow` pide la foto antes de crear el trabajo (fase «esperando foto») |
| «Editar» sin un trabajo elegido | La intención dice «Elige un trabajo para cambiarlo» y la caja no manda |
| Sin sesión | Lleva a iniciar sesión, como hacen las demás puertas de Weë AI |
| Puerta cerrada | La pantalla no existe para nadie (sin enlace) y, si se llegara, no lee ni manda nada |

## 5b. Lo que se toma de las dos referencias (y lo que no)

- **La acción anclada al pie**, siempre a la vista: aquí lo da la caja común (CLAUDE.md §9).
- **El coste en el botón**: en las dos referencias se recalcula en vivo con cada opción. En Weë el precio sale del Credit
  Engine cuando Weë Brain ya tiene el plan, y **no se inventa** antes: el pie dice «verás el precio antes de crear». Llevarlo al
  botón es una capacidad nueva (cotizar sin trabajo, [matriz](WEE-DESIGN-CAPABILITY-MATRIX.md) §3.13).
- **La familia de motor por resultado**: aquí no hay motores a la vista; la persona dice **para qué** lo quiere y Weë elige.
- **Ni desplegable de versión ni modelos con nombre**: tampoco el chip «Auto» de uno de ellos, que solo existe como puerta de
  gobierno cerrada (DEC-15a).
- **Puentes entre intenciones**, como sus puentes entre módulos: una capacidad de «Transformar» que necesita una imagen ofrece
  «crea primero un concepto», que cambia la intención a «Crear» sin perder lo escrito.

## 6. Lo que queda pendiente en el Composer

- **Dictado por voz**: sin backend en Weë Design (H-1). No se enseña.
- **Vistas con papel** (frente, lado, espalda) para C09: el `Adjunto` necesitaría un papel de vista (Línea B).
- **Que los ajustes y los adjuntos viajen como estructura** (H-5): servidor.
- **Modo avanzado** (parámetros técnicos): solo si el dueño lo decide (DEC-08), oculto por defecto.
- **Selector de proveedor**: **no** (DEC-07).
