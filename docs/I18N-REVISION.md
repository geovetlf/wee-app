# I18N-REVISION — cómo revisa un idioma una persona nativa

Weë no espera a encontrar a una persona danesa (o japonesa, o turca) para seguir adelante: cada idioma queda listo
para que, el día que la haya, la revisión sea un trabajo de horas y no de semanas, sin romper nada y con constancia
de quién revisó qué.

**Una revisión hecha por un agente de IA no es una revisión humana**, y la herramienta no deja confundirlas: cada
entrada del registro dice su `tipo` (`humana` o `agente`) y solo las humanas cuentan como revisión humana.

## Estado de hoy

```bash
node scripts/i18n-revision.mjs estado da
```

El 2026-10-01 el danés tenía **0 textos con revisión humana**. Un agente de IA revisó 781 (la sección del servidor y
las claves nuevas de esa integración) y corrigió 28; eso queda apuntado como `agente` en
`i18n/revision/da/registro.json`.

## Los cuatro pasos

### 1 · Exportar

```bash
node scripts/i18n-revision.mjs exportar da --salida revision-da.csv
node scripts/i18n-revision.mjs exportar da --salida pendientes-da.csv --solo-pendientes
```

Sale un CSV (UTF-8 con BOM: lo abren Excel, Numbers y Google Sheets sin estropear æ, ø, å) con una fila por texto:

| columna | qué es |
|---|---|
| `clave` | el identificador (no se toca) |
| `seccion` | `app` (la interfaz) o `servidor` (lo que escribe el servidor: Weë AI, errores, Credits, avisos…) |
| `archivo` | dónde vive el texto |
| `contexto` | las pantallas que lo usan, o de qué parte del servidor es |
| `es`, `en` | el original español y el inglés, para entender el sentido |
| `actual` | el texto de hoy en ese idioma |
| `estado` | sin revisar · revisión de agente (no humana) · revisión humana (quién, cuándo) · cambió desde la revisión |
| `revisada` | **la persona escribe `sí`** cuando el texto está bien tal cual |
| `correccion` | **la persona escribe aquí el texto corregido**, entero |
| `nota` | por qué (opcional, ayuda a quien venga después) |

Guía para quien revisa: `docs/I18N-<IDIOMA>.md` (tono, glosario, decisiones). Lo que va entre `{{llaves}}` y los
nombres de Weë (Weë AI, Weë Studio, ËContact, Credits…) se dejan exactamente igual.

### 2 · Importar en seco

```bash
node scripts/i18n-revision.mjs importar da revision-da.csv --revisor "Mette Kjær"
```

No escribe nada: enseña cada corrección (antes → después), cuántos textos se marcaron como revisados y qué se
rechaza. Se rechaza una corrección que cambia o pierde un `{{hueco}}`, pierde una marca de Weë, cambia los saltos de
línea o los espacios del borde, o queda vacía. Esas se arreglan en el CSV.

### 3 · Aplicar

```bash
node scripts/i18n-revision.mjs importar da revision-da.csv --revisor "Mette Kjær" --aplicar
```

Escribe las correcciones en los diccionarios y añade al registro una entrada por texto: clave, antes, después,
revisor, `tipo: humana`, fecha, nota y la huella del texto revisado. (Una pasada de un agente se importa con
`--tipo agente`.) Una clave que ocupa varias líneas no se toca a ciegas: se pide corregirla a mano.

### 4 · Validar y dejar constancia

```bash
cd functions && node test/_cadena.mjs        # todas las pruebas, incluidas las del idioma
cd .. && node scripts/i18n-huella.mjs        # la huella de los catálogos, a propósito
node scripts/i18n-revision.mjs comparar da   # el antes y el después de todo lo corregido
```

Si una corrección rompe una regla del idioma (`i18n-<idioma>.test.mjs`), la prueba lo dice; se corrige y se vuelve a
importar. Las capturas de pantalla (390 px y 1440 px) se repiten para lo que cambió de longitud.

## Si un texto cambia después de revisado

La revisión guarda la huella del texto que vio la persona. Si alguien lo cambia después, `estado` lo cuenta como
«cambió desde la revisión» y el CSV lo vuelve a sacar como pendiente: ninguna revisión se queda colgada de un texto
que ya no es el que se revisó.

## Lo que comprueban las pruebas

- `functions/test/i18n-revision.test.mjs`: la exportación (todas las claves, ida y vuelta exacta del CSV), la
  validación de las correcciones, la escritura de una sola línea, la importación en seco, y que cada registro diga
  quién, de qué tipo y cuándo — y que lo de un agente nunca cuente como humano.
- `functions/test/i18n-huella.test.mjs`: ningún catálogo cambia sin actualizar `i18n/huella.json`.
