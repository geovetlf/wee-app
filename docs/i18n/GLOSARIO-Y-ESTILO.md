# Glosario y guía lingüística de Weë

Reglas comunes a los 40 idiomas. El detalle de cada idioma vive en `docs/I18N-<IDIOMA>.md`, y su glosario de auditoría en `i18n/revision/<código>/`. Esta guía no sustituye a esos documentos: fija lo que tiene que coincidir entre todos.

## 1. Lo que nunca se traduce

| Tipo | Valores |
|---|---|
| Marcas | Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact, Credits, Weë AI, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Brain, Weë Photo, Weë Beauty, Weë Home |
| Técnico | claves, `optionId`, `questionId`, rutas, iconos, emojis, nombres de modelos, contratos de API |
| Contenido de personas | publicaciones, comentarios, comunidades, proyectos, prompts |

La marca tampoco se declina por dentro. Si el idioma necesita un sufijo, va con guion y sigue su guía (`Weë-д`, `Weë-n`, `Credits-ийг`).

## 2. Cómo se comporta una frase

- **Huecos.** `{{nombre}}` y los demás se conservan igual que en español. Lo que entra por un hueco no se puede declinar, así que los idiomas con casos lo colocan tras dos puntos o entre paréntesis.
- **Plurales.** `{ contador }` con las formas `_zero/_one/_two/_few/_many/_other` que pida `Intl.PluralRules`. Una forma que cubre un solo número puede omitir la cifra.
- **Formatos.** Fechas, números, monedas y listas salen de `i18n/formato.ts`, nunca a mano.
- **Dirección.** El árabe, el hebreo y el persa no invierten cadenas ni añaden marcas de dirección a mano. Hoy el sentido de la página lo pone `contexts/IdiomaContext.tsx` (`<html dir>` en web) y los iconos y flechas que señalan, `components/IconoDireccional.tsx` + `hooks/useDireccion.ts` (única utilidad RTL activa). `components/SentidoDeLaPagina.tsx` queda preservado como infraestructura pendiente de integración, no activa (`View dir` en la raíz web y `forceRTL` nativo, fase posterior).
- **Idioma y país.** La elección manual manda. El GPS, la IP o el país no cambian nunca el idioma.

## 3. Variantes regionales

| Variante | Regla |
|---|---|
| `pt` | Es brasileño, decisión de producto del 2026-09-16: «você», «arquivo», «tela», «celular» |
| `pt-PT` | Diccionario aparte, con norma europea: «ficheiro», «ecrã», «telemóvel» |
| `zh` / `zh-TW` | Simplificado y tradicional, con léxico propio. No es una conversión de caracteres |
| `de` / `de-CH` | La variante suiza usa «ss» y léxico propio |
| `sr` / `sr-Latn` | Se traduce en cirílico. El latino se GENERA con `scripts/i18n-sr-latn.mjs` y no se edita a mano |
| `hr`, `bs`, `cnr`, `sr` | Normas distintas de una lengua común: una frase puede coincidir sin ser un error |
| `fil` | `tl` es alias de `fil` |

## 4. Decisiones que afectan a varias experiencias

- **Pantalla y push dicen lo mismo.** Quien recibe un aviso y abre la app tiene que leer la misma frase.
- **Plan y progreso.** Los pasos del progreso van como sustantivo o forma nominal, porque sirven de título.
- **Weë no marca género** cuando el idioma permite evitarlo. Donde no, sigue la guía del idioma.

## 5. Decisiones abiertas

Requieren al dueño o a un hablante nativo. Están con su clave en `REVISION-NATIVA-PENDIENTE.md`.

- **«Prompt»:** préstamo o término propio, en varios idiomas.
- **Repost:** la pantalla y el push no siempre usan el mismo verbo (`notifications.repost` frente a `wall.repostedBy`). Pasa en pt, fr, ca, ga, id, ms y hu.
- **Género y cortesía:** griego, serbio, hindi y bares en persa y malayo.
- **«Credits» desde 20 en rumano** exige plurales en las claves del español.
- **Nombre de Weë Fashion** en los idiomas donde se decidió traducir su descripción.
