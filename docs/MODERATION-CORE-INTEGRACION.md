# MODERATION CORE — integración futura

> Documento breve para quien integre la rama `moderation/core`. **Nada de esto se ha hecho:** ni fusión, ni push (lo hace
> el coordinador tras verificar), ni despliegue. El diseño está en [`MODERATION-CORE.md`](MODERATION-CORE.md).

## 1. Base y commits

- **Rama:** `moderation/core`, nacida en `d9abcf0c` (es también su base común con W0).
- **Base W0:** la cabeza que valide el dueño. Hoy `803b6bdc` (`candidato/desplegable`, **en validación**), que es
  `d9abcf0c` + `78dad404` (re-anclaje autorizado de la huella de `security`) + `803b6bdc` (H3 de `music.test.mjs`).
- **Commits propios**, en orden, sin squash ni rebase:

| Commit | Qué trae |
|---|---|
| `e02dbc9b` | Catálogo único de motivos (la lista del dueño) en el servidor, la hoja y los 42 diccionarios |
| `323d3c6c` | El Moderation Core: casos, acciones, custodia, sanciones, apelaciones, auditoría, avisos sin enviar, contratos de la Consola |
| (commit de las decisiones del 2026-11-07) | Autolesiones recuperada como opción propia y señal de riesgo; marca de «mismo revisor»; decisiones aprobadas, WeeTalk fuera, diseño de sanciones, roles propuestos y este documento |

## 2. Archivos compartidos con W0 y conflictos posibles

W0 (`d9abcf0c` → `803b6bdc`) cambia solo `functions/test/music.test.mjs` y `ops/guardian/huellas.json`. La rama no toca
ninguno de los dos: **hoy no hay ningún archivo compartido con `803b6bdc`**. Si la cabeza de W0 avanza, se recalcula así:

```bash
git diff --name-only d9abcf0c <cabeza W0>  # lo que cambió W0
git diff --name-only d9abcf0c moderation/core  # lo que cambió la rama; la intersección es lo que puede chocar
```

Puntos calientes de la rama (chocan con facilidad con OTRAS ramas, no con W0):

| Archivo | Por qué |
|---|---|
| `functions/src/index.ts` | Exporta las 20 funciones nuevas |
| `functions/package.json` | Añade `moderation-core.test.mjs` a la cadena de `npm test` |
| `ops/despliegue/grupos.json` | Las 20 funciones nuevas en `no_se_despliegan` |
| `ops/guardian/dominios.json` | La suite nueva, en su dominio (`social-y-feed`), como exige `guardian-dominios` |
| `functions/src/core/backup.ts` | Clasificación de las colecciones nuevas |
| `functions/test/runtime-map.test.mjs`, `productions-runtime.test.mjs` | El recuento de funciones exportadas (71) |
| `functions/src/moderation/index.ts` | La rama de la Consola (`admin/integracion-consola`) también lo toca |
| `i18n/textos/*/moderation.ts` (42), `i18n/huella.json` | Cualquier otra rama de textos. La huella se REGENERA tras fusionar (`node scripts/i18n-huella.mjs`), no se fusiona a mano |

## 3. Lo intocable sin autorización

- **`firestore.rules`, `firestore.indexes.json` y `storage.rules`:** la rama no los toca. Las colecciones nuevas ya están
  cerradas por la denegación por defecto; los bloques explícitos de `MODERATION-CORE.md` § 11 son una propuesta. Ninguna
  consulta nueva necesita un índice compuesto (la cola usa la clave ordenable `cola` y un solo campo).
- **`ops/guardian/huellas.json` e `invariantes.json`:** no se tocan desde esta rama.
- **Despliegue:** las 20 funciones nuevas están en `no_se_despliegan`. Sacar cualquiera de ahí exige autorización.
- **WeeTalk:** fuera del Moderation Core por decisión definitiva; el bloqueo de contactos es una tarea aparte
  (`MODERATION-CORE.md` § 12) y su cambio de reglas exige autorización.

## 4. Huellas del Guardian

- **`moderation` — RE-ANCLAJE PENDIENTE DEL DUEÑO.** Recuperar autolesiones como opción del catálogo único (decisión del
  dueño del 2026-11-07) cambia por fuerza tres comprobaciones congeladas de `functions/test/moderation.test.mjs`: la 1
  («once motivos», `=== 11`), la 126 (título) y la 137 («veinticinco claves», `=== 25`). Hasta `323d3c6c` estaban intactas.
  `node ops/guardian/huellas.mjs --verificar` lo marca (3 títulos y 3 aserciones) hasta que el dueño, en la base definitiva
  y tras revisarlo, ejecute `node ops/guardian/huellas.mjs --registrar --autoriza "<motivo>"`.
- **`security`:** en `d9abcf0c` su huella ya no coincidía (heredado, no de esta rama); `78dad404` la re-ancló. **Se
  re-verifica en la base definitiva**, sin tocar huellas desde aquí.
- **Simulado el 2026-11-07** (copia en el scratchpad, sin tocar el repositorio): el árbol de la rama contra el
  `huellas.json` de `803b6bdc` solo marca `moderation`; contra el de `d9abcf0c`, `moderation` y `security`.
- **`guardian-dominios`:** en `d9abcf0c` se detiene en la 27 por esa misma huella de `security` (heredado). **Se re-verifica
  en la base definitiva**, sabiendo que allí también se detendrá en la 27 por la huella de `moderation` hasta que el dueño la
  re-ancle: registrar sin `--autoriza` no admite comprobaciones perdidas (`construirHuellas`). La 82 solo falla en copias
  exportadas sin `.git` (igual en `78dad404`).

## 5. Suites que hay que repetir en la base definitiva

Con el candado y en puertos propios, nunca la cadena completa si hay otra en marcha:

- `npm run build` (Functions) y la comprobación de tipos de la App (0 errores);
- `moderation-core`, `moderation`, `despliegue-workflow`, `security`, `capacidades-conservadas`, `runtime-map`,
  `productions-runtime`, `cierre-servidor`;
- i18n: `i18n`, `i18n-huella`, `i18n-revision`, `i18n-cobertura`, `i18n-serbio`, `i18n-servidor-fuentes` y las de cada
  idioma;
- `guardian-dominios` y `node ops/guardian/huellas.mjs --verificar` (esperado: solo `moderation`, hasta su re-anclaje);
- emuladores: `moderation-core.emulator.mjs` y `moderation.emulator.mjs` contra el `firestore.rules` de la base.

## 6. Dependencias

- **App.** La hoja de denunciar ya pinta el catálogo desde `services/moderationService.ts`; las once opciones llegan a la
  gente cuando se publique la App. No hay todavía pantalla para `getMyModeration` ni para `submitModerationAppeal` (con
  sus textos en i18n). **Orden: Functions antes que la App** —una App que ofrezca `INTELLECTUAL_PROPERTY` contra un
  servidor sin el catálogo nuevo vería rechazado ese motivo—. Las apps antiguas siguen funcionando: todo lo que mandaban
  se sigue admitiendo.
- **Consola.** Permisos en `admin/permisos.ts`, la matriz de roles (propuesta en `MODERATION-CORE.md` § 10) y la envoltura
  de las callables; se integra después de Functions.
- **Avisos.** Textos e integración con `notifications`/push: después.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Guardian en rojo por la huella de `moderation` | Re-anclaje del dueño (§ 4), nunca desde la rama |
| Al desplegar, `moderationSweep` da caso a los reportes que no lo tienen | Va por lotes acotados e idempotentes; saberlo antes de desplegar |
| `moderationAdmin.review` contesta `managed_by_case` para un reporte que ya está en un caso | Es a propósito: el caso manda. La Consola debe usar el Core |
| Una sanción registrada se toma por efectiva | No lo es (§ 13 de `MODERATION-CORE.md`): no presentarla como aplicada hasta que exista el servicio de evaluación |
| Puente `WEE_ADMIN_SIN_ROL`: administración sin rol recibe todos los permisos de moderación | Cerrarlo (`WEE_ADMIN_SIN_ROL=cerrado`) en cuanto haya roles |
| Traducciones de agente sin revisión nativa | Informe del otro revisor (`REVISION-TRADUCCIONES-MODERACION.md`) y decisión del dueño |

## 8. Condiciones de aceptación

1. La base W0 está validada por el dueño y la rama se fusiona sin conflictos (o con conflictos resueltos y revisados).
2. Todas las suites de § 5 en verde en la base definitiva, con cifras reales; `security` y `guardian-dominios`
   re-verificadas allí.
3. La huella de `moderation` re-anclada por el dueño (sin eso, `guardian-dominios` no pasa de la 27), o su decisión expresa de
   no hacerlo todavía.
4. Functions y App con 0 errores de tipos.
5. `firestore.rules`, índices y `storage.rules` sin cambios salvo autorización; las 20 funciones siguen en
   `no_se_despliegan` hasta que se autorice su despliegue.
6. Nada automático encendido: ocultación preventiva apagada, ninguna sanción aplicada, ningún aviso enviado.
7. Las decisiones pendientes de `MODERATION-CORE.md` § 16 siguen pendientes hasta que el dueño las tome.
