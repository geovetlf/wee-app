/**
 * F12-A · BLOQUE A — EL MAPA DEL RUNTIME, COMPROBADO CONTRA LO QUE SE DESPLIEGA.
 *
 * En Weë conviven dos arquitecturas: el Core (`functions/src/core` + sus
 * composiciones) y lo que atiende a la gente hoy (`creator/`, `engine/`,
 * `gateway/`, `credits/`). Que convivan no es el problema. El problema es no
 * saber, en cada momento, cuál de las dos ejecuta cada cosa — y que eso cambie
 * sin que nadie lo decida.
 *
 * Esta suite no opina: MIDE. Lee `functions/lib` —el JavaScript que de verdad
 * se sube— y comprueba que el mapa declarado aquí y en `docs/RUNTIME.md` es
 * exactamente lo que el código hace.
 *
 * ── Por qué sobre `lib` y no sobre las fuentes ──────────────────────────────
 *
 * En las fuentes, `import { Tipo } from '../core'` y `import { funcion } from
 * '../core'` se escriben igual. En el compilado no: tsc borra los imports de
 * solo-tipo, así que un `require` que sobrevive es un módulo que producción
 * carga, y un `x_1.simbolo` es un símbolo que producción nombra.
 *
 * ── Cargado no es ejecutado ─────────────────────────────────────────────────
 *
 * `core/index.ts` es un barril: en cuanto un módulo vivo lo importa, TODO el
 * Core queda cargado. Por eso la alcanzabilidad de `core/*.js` no dice nada, y
 * lo que se mide es (a) si la COMPOSICIÓN de cada motor se alcanza, (b) si su
 * FÁBRICA se invoca desde código vivo y (c) qué símbolos del Core nombra el
 * código vivo, uno por uno.
 *
 * ── Si esta suite falla ─────────────────────────────────────────────────────
 *
 * Casi nunca es un error de la suite: es que el runtime cambió. Conectar una
 * pieza del Core a producción es una decisión, no un efecto secundario: se
 * actualiza el MAPA de aquí, `docs/RUNTIME.md`, y las comprobaciones de las
 * fases cerradas que fijaban lo contrario (sección F), con aprobación.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { hostsDeProveedores, patronDeHosts } from '../../ops/revision/hosts-de-proveedores.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const LIB = path.resolve(RAIZ, 'functions/lib');
const SRC = path.resolve(RAIZ, 'functions/src');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const diferencia = (esperado, real) => {
  const e = new Set(esperado), r = new Set(real);
  const sobra = [...r].filter((x) => !e.has(x)), falta = [...e].filter((x) => !r.has(x));
  return [sobra.length ? `sobra: ${sobra.join(', ')}` : '', falta.length ? `falta: ${falta.join(', ')}` : ''].filter(Boolean).join(' · ');
};

/*
 * F1-B · LO QUE LA CONEXIÓN DE `productions` PONE EN PRODUCCIÓN, Y NADA MÁS.
 *
 * Exportar la puerta de las producciones vuelve vivo el dominio de Filmmaker de
 * F1-A —`modelo`, `validacion` y `operaciones`—, y ese dominio habla el
 * vocabulario del Core: comprueba cada nodo con la regla de claves prohibidas,
 * valida intención creativa y continuidad con los validadores de siempre, respeta
 * los límites de un `ShotNode` para que un plano quepa en uno y resuelve la
 * intención creativa EFECTIVA de cada plano para calcular, en memoria, lo que
 * quedaría pendiente de rehacer. Nada de eso genera, cobra, encola ni llama a un
 * motor: son vocabularios, límites y validadores puros.
 *
 * Son estos veinte, autorizados uno por uno. Las cinco listas de abajo los añaden
 * a las que ya había SIN tocarlas, y la sección C comprueba que son exactamente
 * los que solo nombra este código: uno más, o uno menos, falla por su nombre.
 */
const DE_PRODUCTIONS = {
  'core/content/asset.js': ['TIPOS_DE_MATERIAL'],
  'core/creative.js': ['completarCreativos', 'validarCreativos', 'versionCreativaActual', 'PROPORCIONES', 'RUTAS_CREATIVAS', 'valorCreativo'],
  'core/shot.js': ['claveProhibidaDeNodo', 'FORMA_DE_ID_DE_PLANO', 'MAX_NOMBRE_DE_ESCENA', 'MAX_NARRATIVA', 'MAX_ELEMENTOS_POR_NODO', 'MAX_DEPENDENCIAS_DE_PLANO'],
  'core/continuity.js': ['validarContinuidad', 'ASPECTOS_DE_CONTINUIDAD', 'FUERZAS_DE_CONTINUIDAD', 'RELACIONES_ESPACIALES', 'MAX_ANCLAJES', 'MAX_RELACIONES_ESPACIALES'],
  'core/language.js': ['normalizarEtiqueta'],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * EL MAPA. Es la única parte de este archivo que se edita a mano (junto con la lista
 * HUERFANOS_ADMITIDOS de la sección H, que es de otra medida: el alcance de las FUENTES).
 *
 *   canonico     módulos del Core que definen la pieza
 *   composicion  quien le enchufa el mundo (Firestore, reloj, registro…)
 *   fabrica      la función que, invocada, pone ese motor a funcionar
 *   enUso        lo que atiende a producción HOY
 *   motor        CONNECTED si la fábrica se invoca desde código vivo
 *   simbolos     símbolos de `canonico` que el código vivo nombra (fuera del Core)
 * ═══════════════════════════════════════════════════════════════════════════ */
const MAPA = [
  /*
   * `creator/sombra.js` también construye el Brain: la sombra le pide un
   * ENTENDIMIENTO por el motor de siempre, con `creditsEstimated: 0` y sin
   * transacción de Credits. Mismo motor, mismo libro, cero cobro — y detrás de
   * un interruptor cerrado por defecto.
   */
  { id: 'brain', canonico: ['core/brain.js'], composicion: 'brain/index.js', fabrica: 'crearBrainDeWee', enUso: ['creator/brain.js', 'creator/sombra.js'], cargada: true,
    motor: 'CONNECTED', simbolos: ['LIMITES_DE_CONTEXTO', 'crearBrain', 'interpretarMarca'] },
  /*
   * EL PLANNER YA ESTÁ CONECTADO, y conviene leer bien qué significa: la sombra
   * de `creator/sombra.js` invoca la fábrica y calcula un plan del Core EN
   * PARALELO al de Legacy, para compararlos y guardarlos en la subcolección
   * privada del trabajo. No ejecuta ese plan —no llega al Workflow, ni al
   * Orchestrator, ni al Router, ni al Job, ni al Gateway— y está detrás de un
   * interruptor cerrado por defecto y abierto solo para cuentas nombradas.
   *
   * Legacy sigue siendo la AUTORIDAD DE EJECUCIÓN. Esto es observación. Pero el
   * motor se invoca desde código vivo, así que aquí pone CONNECTED: el mapa
   * dice lo que hay, no lo que se ejecuta.
   */
  { id: 'planner', canonico: ['core/planner.js'], composicion: 'planner/index.js', fabrica: 'crearPlannerDeWee', enUso: ['creator/planner.js', 'creator/sombra.js'], cargada: true,
    motor: 'CONNECTED', simbolos: ['crearPlanner'] },
  /* El conductor usa DOS piezas sueltas del Workflow del Core (`prepararWorkflow`, `esEstadoFinal`), no su composición. */
  { id: 'workflow', canonico: ['core/workflow.js'], composicion: 'workflow/index.js', fabrica: 'crearWorkflowEngineDeWee', enUso: ['creator/index.js'], cargada: false,
    motor: 'NOT CONNECTED', simbolos: ['esEstadoFinal', 'prepararWorkflow'] },
  /* F12-D · CANARY: el conductor construye el Orchestrator del Core. Sigue habiendo UNO. */
  { id: 'orchestrator', canonico: ['core/orchestrator.js'], composicion: 'orchestrator/index.js', fabrica: 'orquestadorDeWee', enUso: ['creator/index.js', 'runtime/conductor.js'], cargada: true,
    motor: 'CONNECTED', simbolos: ['claveDePaso', 'crearOrchestrator'] },
  /*
   * El Router del Core entra por el canary, pero NO por `router/index.ts`: el
   * conductor construye `crearRouter` con el registro de la configuración viva,
   * para que Router y Gateway miren la misma foto (`runtime/index.ts`). Por eso
   * la fábrica de la composición sigue sin invocarse y su módulo sin cargarse.
   */
  { id: 'router', canonico: ['core/router.js'], composicion: 'router/index.js', fabrica: 'crearRouterDeWee', enUso: ['engine/router.js', 'engine/index.js'], cargada: false,
    motor: 'NOT CONNECTED', simbolos: ['crearRouter'] },
  /* Igual el Gateway: el canary usa `crearGatewayDelMotor` (que envuelve `crearGateway` del Core), no `gatewayDeWee`. */
  { id: 'gateway', canonico: ['core/gateway.js'], composicion: 'engine/gateway.js', fabrica: 'gatewayDeWee', enUso: ['gateway/index.js', 'engine/index.js'], cargada: true,
    motor: 'NOT CONNECTED', simbolos: ['FORMA_DE_ETIQUETA_DE_TRAZA', 'FORMA_DE_ID', 'crearGateway', 'esObjetoPlano', 'esTexto', 'normalizarUso', 'puedeEjecutarse', 'sanearMeta'] },
  /* F12-D · CANARY: el conductor construye el Job Engine del Core. `creatorJobs` sigue intacto y sin tocar. */
  { id: 'job', canonico: ['core/job.js'], composicion: 'job/index.js', fabrica: 'crearMotorDeTrabajosDeWee', enUso: ['creator/index.js', 'creator/video.js', 'runtime/index.js'], cargada: true,
    motor: 'CONNECTED', simbolos: ['POLITICA_DE_TRABAJO', 'alcanceDeIdempotencia', 'claveDeIdempotencia', 'crearJobEngine', 'esTareaGeneral', 'esTrabajoTerminal', 'operacionAbandonada', 'presupuestoDeIntento'] },
  { id: 'project', canonico: ['core/project.js'], composicion: null, fabrica: null, enUso: [],
    motor: 'NOT CONNECTED', simbolos: [] },
  { id: 'content', canonico: ['core/content/content.js'], composicion: null, fabrica: null, enUso: [],
    motor: 'NOT CONNECTED', simbolos: [] },
  /* F1-B: la validación de Filmmaker nombra el vocabulario de clases de material para comprobar cada referencia. Vocabulario, no motor. */
  { id: 'asset', canonico: ['core/content/asset.js'], composicion: 'content/index.js', fabrica: 'crearMaterialDesdeUrl', enUso: ['content/index.js'], cargada: true,
    motor: 'CONNECTED', simbolos: ['FORMA_DE_ID_DE_MATERIAL', 'esStorageRef', 'materialEsDeLaCuenta', 'materialValido', 'puedePasarA', 'retirar', ...DE_PRODUCTIONS['core/content/asset.js']] },
  { id: 'publication', canonico: ['core/content/publication.js'], composicion: null, fabrica: null, enUso: [],
    motor: 'NOT CONNECTED', simbolos: [] },
  /* Los otros singulares. No son de este bloque, pero «un solo motor por pieza» los incluye. */
  { id: 'financial', canonico: ['core/financial/account.js', 'core/financial/commerce.js', 'core/financial/ledger.js', 'core/financial/money.js', 'core/financial/payment.js'],
    composicion: 'financial/index.js', fabrica: null, enUso: ['credits/creditEngine.js'], cargada: false, motor: 'NOT CONNECTED', simbolos: [] },
  { id: 'identity', canonico: ['core/account-identity.js', 'core/identity.js'], composicion: 'identity/cuentas.js', fabrica: 'nacerLoQueTocaDeUnPerfilNuevo', enUso: ['identity/nacimiento.js'], cargada: true,
    motor: 'CONNECTED', simbolos: ['asegurarCuenta', 'asegurarEntidadDeCaraWee', 'crearPagina', 'cuentaWeeValida', 'entidadDeCuentaValida', 'esIdDeCuenta', 'esIdDePrincipal', 'normalizarNumeroDeCuenta', 'resolverCuentaDelPrincipal'] },
  { id: 'registry', canonico: ['core/registry/capabilities.js', 'core/registry/registry.js', 'core/registry/validate.js'], composicion: 'registry/index.js', fabrica: 'registroDeWee', enUso: ['planner/index.js'], cargada: true,
    motor: 'CONNECTED', simbolos: ['CAPABILITY_CATALOG', 'crearRegistro', 'validarRegistro'] },
  /* Fase 12-A/B. Nació conectada: no hay una moderación «de antes» con la que convivir (docs/MODERATION.md). */
  { id: 'moderation', canonico: ['core/moderation.js'], composicion: 'moderation/index.js', fabrica: 'crearModeracion', enUso: ['moderation/index.js'], cargada: true,
    motor: 'CONNECTED', simbolos: ['EVALUADOR_DE_REGLAS', 'ESTADOS_DE_REPORTE', 'FORMA_DE_ID_DE_REPORTE', 'POLITICA_DE_REPORTES', 'decisionValida', 'entradaDeCreacion', 'esContenidoPropio',
      'esEstadoDeReporte', 'evaluarLimite', 'idDeEntrada', 'idDeReporte', 'nuevoReporte', 'transicionarReporte', 'validarPeticionDeReporte', 'vistaParaQuienDenuncia'] },
];

/* Módulos del Core que no son ningún singular y que el código vivo también nombra. */
const OTROS_DEL_CORE = {
  /* Las cuatro versiones nuevas entran con el canary: el conductor habla con Workflow, Orchestrator, Router y Job Engine. */
  'core/contracts.js': ['BRAIN_CONTRACT_VERSION', 'CONTENT_CORE_CONTRACT_VERSION', 'ELEMENT_CONTRACT_VERSION', 'GATEWAY_CONTRACT_VERSION', 'PLANNER_CONTRACT_VERSION',
    'JOB_ENGINE_CONTRACT_VERSION', 'ORCHESTRATOR_CONTRACT_VERSION', 'PROVIDER_CONTRACT_VERSION', 'SHOT_CONTRACT_VERSION', 'ROUTER_CONTRACT_VERSION', 'WORKFLOW_CONTRACT_VERSION', 'MAX_PROPUESTAS_POR_PASO',
    /* S1: la versión con la que la sombra le pide la decisión al Algorithm Engine. */
    'ALGORITHM_CONTRACT_VERSION',
    /* Misión mundo3d (FASE 5): la versión del contrato de world.generate con la que contesta la puerta del mundo. */
    'MUNDO3D_CONTRACT_VERSION'],
  /*
   * S1 · EL ALGORITHM ENGINE, EN SOMBRA. La sombra del plan estrena la capa por
   * su puerta y nombra exactamente tres cosas de ella: el CICLO que decide, la
   * GUARDA que dice si algo de lo decidido nombra una implementación y los TOPES
   * por defecto. Y de la observabilidad, el comprobador de claves prohibidas.
   *
   * Esto es SOMBRA, no runtime de producción: el ciclo decide sobre el plan del
   * puente, la decisión se compara y se tira, y todo está detrás de
   * `aiSettings/sombra`, cerrada por defecto. Lo que NO aparece es lo que dice
   * de verdad hasta dónde llega: ni `cerrar`, ni A7, ni A8, ni `paraRouter`.
   */
  'core/algorithm/integration-cycle.js': ['crearCicloAlgoritmico'],
  'core/algorithm/authority.js': ['violacionesEn'],
  'core/algorithm/types.js': ['TOPES_POR_DEFECTO'],
  'core/observability.js': ['trazaLimpia'],
  /*
   * Misión «cerrar los gaps de world.generate» (2026-10-05): el contrato canónico del mundo. El adaptador de fal lee
   * la entrada de Weë con el lector del propio contrato (por `engine/mundo.ts`, sin escribir `core/`), así que el
   * contrato está en producción por lo que LEE, no por ninguna puerta abierta: `world.generate` sigue sin modelo
   * elegible y sin puerta abierta.
   */
  /*
   * + FASE 5: la puerta del mundo (`creator/mundo.ts`) LEE la petición con el contrato, construye la entrada del
   * motor, cuenta el estado de un trabajo y dice si se puede parar; los relojes del runtime nombran la capacidad.
   * Y al contar un mundo terminado le da a la app solo sus derechos VISIBLES (`derechosVisibles`): sin las licencias,
   * cuyo nombre y dirección nombran al modelo. Y lee la ruta de una foto con el lector del contrato
   * (`rutaEnElStorageDeWee`) para exigir el cubo propio (revisión de seguridad, 2026-10-06).
   */
  'core/mundo3d.js': ['leerEntradaDeMundo3D', 'leerPeticionDeMundo3D', 'entradaDeMundo3D', 'estadoDeMundoDelTrabajo', 'VARIANTE_DE_LA_VISTA_PREVIA',
    /* + la clase del material del mundo (literal del contrato) para no contar como mundo otro material (revisión, 2026-10-06). */
    'sePuedeCancelarElMundo', 'CAPACIDAD_DE_MUNDO', 'derechosVisibles', 'rutaEnElStorageDeWee', 'TIPO_DE_MATERIAL_DEL_MUNDO'],
  /*
   * S5: exportar la puerta de Elements pone en producción los dos contratos de
   * S3. Es lo esperado y es lo que estas listas existen para enseñar: qué usa
   * de verdad y qué no. Fíjate en lo que NO aparece —`archivar`,
   * `clasesDeMaterial`, `componerCreativos`—: sigue habiendo Core construido
   * que producción no toca, y este mapa es donde se ve.
   */
  'core/element.js': ['archivar', 'elementoValido', 'esTipoDeElemento', 'puedeReferenciar', 'validarElemento'],
  'core/visual-context.js': ['MAX_ELEMENTOS_EN_RESULTADO', 'MAX_REFERENCIAS', 'materialesDelContexto', 'necesidadValida', 'resolverContexto', 'trazaDeContexto'],
  /*
   * B3.7.1: la sombra pasa a construir TAMBIÉN el plan que sale del puente de
   * Legacy, y el puente pregunta si unos creativos son válidos antes de
   * llevarlos. Eso puso `core/creative.js` en producción por una sola función:
   * la que VALIDA. Llega por la sombra, que está detrás de una puerta cerrada y
   * no ejecuta nada.
   *
   * F1-B: conectar `productions` añade el vocabulario creativo que usa el dominio
   * de Filmmaker, y lo usa de forma PURAMENTE FUNCIONAL: valida la intención de
   * cada nivel (`validarCreativos`), resuelve la EFECTIVA de cada plano
   * completando lo del plano con lo de su escena y su producción
   * (`completarCreativos`, `versionCreativaActual`) y recorre sus rutas
   * (`RUTAS_CREATIVAS`, `valorCreativo`, `PROPORCIONES`) para validar y para
   * calcular, en memoria, lo que queda pendiente de rehacer. Eso no genera ni
   * ejecuta nada. Lo que sigue sin aparecer —`componerCreativos`,
   * `conflictosCreativos`, `compatibilidadCreativa`— dice dónde está el borde:
   * producción no compone intenciones que chocan ni decide entre ellas.
   */
  'core/creative.js': ['creativosValidos', ...DE_PRODUCTIONS['core/creative.js']],
  /*
   * C3: exportar la puerta de escenas y planos pone en producción los dos
   * contratos de C1/C2. Otra vez lo esperado, y otra vez esto es donde se ve:
   * de continuidad producción usa el VALIDADOR y los punteros, y no usa todavía
   * `revisarAntesAntesDeEjecutar` ni `resumirVeredicto` —esos los estrenará
   * quien enrute y quien valide, que son fases posteriores—.
   *
   * F1-B: las producciones de Filmmaker traen la regla de claves prohibidas
   * (`claveProhibidaDeNodo`, aplicada a cada nodo de una producción), la forma de
   * id de los planos y los límites de un `ShotNode` —para que un plano del
   * storyboard quepa en uno sin renombrar nada—, y de continuidad su VALIDADOR y
   * su vocabulario. Siguen sin aparecer `revisarAntesAntesDeEjecutar` y
   * `resumirVeredicto`: validar un plan no es ejecutarlo.
   */
  'core/shot.js': ['esEstadoDePlano', 'escenaValida', 'planoValido', 'puedePasarDePlano', 'referenciasDelPlano', 'validarEscena', 'validarPlano', ...DE_PRODUCTIONS['core/shot.js']],
  'core/continuity.js': ['anclajeValido', 'continuidadValida', ...DE_PRODUCTIONS['core/continuity.js']],
  /*
   * C4: la comprobación ESTRUCTURAL. Producción usa el comprobador y nada más
   * —ni `revisarCambioDePlano`, ni `aspectosSinEvidencia`, ni la tabla de
   * evidencia—, y eso es lo que estas listas existen para enseñar: qué se usa
   * de verdad y qué sigue siendo Core construido que nadie toca todavía.
   */
  'core/continuity-check.js': ['revisarEstructura'],
  /*
   * C10: la frontera de la planificación —`planner/index.ts`— estrena las dos
   * piezas que convierten «conserva a Luna» en `elementId@version`. Es el
   * cambio que esta fase existe para hacer, y aquí es donde se ve: de C5
   * producción usa el PUENTE y la proyección de candidatos, y sigue sin usar
   * `resolverIntencionDeContinuidad` suelta ni `sujetosSinResolver` —eso lo
   * estrenará quien pregunte por una ambigüedad en pantalla—.
   */
  'core/continuity-intent.js': ['candidatosDesdeElementos', 'conContinuidadResuelta'],
  /* F1-B: la validación de Filmmaker normaliza las etiquetas de una producción con la misma regla que el resto del Core. */
  'core/language.js': ['contextoDeIdioma', ...DE_PRODUCTIONS['core/language.js']],
  /* La regla «¿puede esta cuenta actuar con esta cara?». La estrenó la moderación (Fase 12-A/B). */
  'core/social-identity.js': ['actorDeLaCuenta'],
  /* Los tres que estrena el canary de F12-D. */
  'core/capability.js': ['modalidadDe'],
  'core/errors.js': ['DESDE_ENGINE', 'errorDelCore'],
  'core/job-queue.js': ['leerMensajeDeCola', 'mensajeDeCola', 'workerValido'],
  /* MC-3: la Fase 11 aprende a crear un material para una subida, y comprueba que su clave vive en la carpeta de su cuenta. */
  /*
   * MC-4.5: exportar la puerta del canary pone en producción el Core de medios
   * ENTERO — almacenamiento, subida, entrega y proceso. Es lo esperado: una sola
   * Function de administración enciende la cadena que MC-1..MC-4 construyeron,
   * y estas listas son la prueba de qué usa de verdad y qué no.
   */
  /*
   * H5/H2 · EL ÍNDICE DE REFERENCIAS (línea trk-s, 2026-10-10, autorizado por el dueño). `deleteAsset` vive en
   * `content/index.js`, que ahora carga `content/indice.js` —y este reexporta `indice-almacen.js` e
   * `indice-reconciliacion.js`—. Por ESOS tres módulos, y solo por ellos, producción nombra lo que se añade aquí:
   * `referenciaDeAlmacenDe` (objeto), `esPrecondicionFallida` y `sabeBorrarConGeneracion` (puerto), el modelo puro
   * del índice entero (`core/media/indice.js`), la política de recolección (solo su edad mínima, para la
   * reconciliación) y `reconciliarIndiceDeCuenta`. Que se NOMBREN no es que se EJECUTEN: con `aiSettings/almacenActivos`
   * CERRADA —su estado por defecto y ante cualquier campo mal formado— la retirada sigue por el camino de siempre y
   * nada del índice corre; abierta para una cuenta, consumidores sin integrar ⇒ el objeto se conserva (D-G). El barrido
   * del índice (`media/barrido.js`) y la recolección MC-5 (`media/recoleccion.js`) NO son alcanzables: ninguna
   * Function los exporta, y por eso `decidirRecoleccion` y compañía no aparecen.
   *
   * Cómo se generó: con estas tres claves vacías y las dos de arriba sin tocar, la propia sección C de esta suite
   * lista lo que «sobra» por módulo; esas listas se copiaron tal cual y se cotejaron con una réplica de solo lectura
   * de esta medida que además dice QUIÉN nombra cada símbolo (docs/ACTIVOS-CERCAS.md § runtime-map).
   */
  'core/media/objeto.js': ['PIEZA_ORIGINAL', 'RAIZ_DE_CUENTAS', 'claveDelObjeto', 'claveEsDeLaCuenta', 'objetoEsDeLaCuenta', 'objetoValido', 'prefijoDeCuenta', 'referenciaDelObjeto',
    /* + H5/H2: la referencia de almacén de un registro, para volver a mirar y borrar el objeto (content/indice*). */
    'referenciaDeAlmacenDe'],
  'core/media/puerto.js': ['CAPACIDADES_DE_MC1', 'falloDeAlmacen',
    /* + H5/H2: ¿sabe el adaptador borrar con generación?, y ¿este fallo es un 412? (content/indice.js). */
    'esPrecondicionFallida', 'sabeBorrarConGeneracion'],
  'core/media/registro.js': ['crearRegistroDeMedios'],
  /*
   * + MEDIA CLOUD · R9 (2026-10-12, autorización del dueño): el cableado de la subida (media/subida.ts) nombra
   * `tipoAdmitidoParaLaClase` para rechazar antes de escribir un tipo que no es de la familia de su clase o es contenido
   * activo. La regla vive en el Core y `decidirSubida` la vuelve a aplicar contra el material ya guardado.
   * TIPOS_ACTIVOS y TIPOS_POR_CLASE se exportan pero el código vivo no los nombra: no están aquí, y si alguien los
   * nombra, esto falla.
   */
  'core/media/subida.js': ['decidirSubida', 'identidadDeIntento', 'tamanoAprobado', 'tipoAdmitidoParaLaClase', 'tipoDeContenidoAceptable', 'topeDeSubida', 'vigenciaDeSubidaAprobada'],
  'core/media/proceso.js': ['CAPACIDADES_DE_MC4', 'LIMITES_DE_TRANSFORMACION', 'decidirProceso', 'leerPaqueteDeProceso', 'transformacionValida', 'varianteDeResultado'],
  /* MC-7 · los mide MC-4, que SÍ se despliega por el canary. Medir sigue apagado: nadie pasa medidor. */
  'core/media/uso.js': ['usoDeEscritura', 'usoDeLectura', 'usoDeOperacion'],
  'core/media/procesador.js': ['falloDeProceso'],
  'core/media/entrega.js': ['decidirEntrega', 'huellaDeEntrega'],
  /* H5/H2 (ver arriba): el modelo puro del índice, por content/indice*.js. */
  'core/media/indice.js': ['POLITICA_DEL_BORRADO_INMEDIATO', 'REGISTRO_DE_CONSUMIDORES', 'cerrar', 'coberturaVigente', 'comoCrearFilaViva', 'decidirBorradoFisico', 'devolver',
    'filasEsperadasDeLaFicha', 'flagAbiertaPara', 'leerFlagDelAlmacenDeActivos', 'marcaDeCobertura', 'naceCubierto', 'pasarACandidato', 'reclamar', 'registroDelIndiceValido',
    'registroEsDeLaCuenta', 'rescatar', 'resumirConsumidores', 'versionDe'],
  /* H5/H2: de MC-5, solo su edad mínima (la reconciliación no concluye huérfano lo que es más joven). La decisión de MC-5 sigue sin alcanzarse. */
  'core/media/recoleccion.js': ['POLITICA_DE_RECOLECCION'],
  /* H5/H2: el cruce puro de la reconciliación del índice (content/indice-reconciliacion.js). */
  'core/media/reconciliacion.js': ['reconciliarIndiceDeCuenta'],
};

/* Las Functions que producción expone, y de qué módulo sale cada una. */
const FUNCTIONS = {
  './generateAvatar': ['generateAvatarWithGemini', 'avatarReplacement'],
  './creator': ['creatorChat', 'creatorQuote', 'creatorRun'],
  './creator/brain': ['brainChat', 'brainQuote'],
  './creator/video': ['generateVideo'],
  /*
   * Misión mundo3d (FASE 5, 2026-10-05): «Crear mundo 3D», la TERCERA puerta del conductor —autorizada por la misión
   * del dueño—, cerrada por `aiSettings/runtime` y sin montar la clave de ningún proveedor. NO está desplegada
   * (ops/despliegue/grupos.json → no_se_despliegan): está en el mapa porque el código la exporta.
   */
  './creator/mundo': ['generateWorld'],
  './engine/webhooks': ['seedanceCallback'],
  './public/postPage': ['publicPostPage'],
  './engine/admin': ['engineAdmin'],
  /* DEC-06, disponibilidad de capacidades: sin desplegar (ops/despliegue/grupos.json → no_se_despliegan). Monta MODEL_SECRETS (rotacion-secretos). */
  './engine/disponibilidad': ['disponibilidadDeCapacidades'],
  /*
   * F2-C1: el camino real del Eval Engine (corre el corredor COMÚN de functions/src/evals/motor). Callable de
   * ADMINISTRACIÓN que reutiliza el motor vivo (`engine.generate` desde su dominio real, embudo 102) con identidad y
   * presupuesto propios; no cobra Credits del usuario. No está
   * desplegada (ops/despliegue/grupos.json → no_se_despliegan): está en el mapa porque el código la exporta.
   */
  './evals': ['evalRun'],
  './content': ['deleteAsset'],
  './social/polls': ['votePoll'],
  './social/weetalk': ['burnViewOnce'],
  './social/econtact': ['requestEContact', 'acceptEContact'],
  './identity/nacimiento': ['nacimientoDeCuenta'],
  './moderation': ['reportContent', 'moderationAdmin'],
  /*
   * S5: la puerta de las cosas de una cuenta. Crea, lee, cambia, archiva y
   * resuelve contexto — y todo lo hace delegando en el runtime de S4, que
   * comprueba la propiedad material a material. Aquí solo se resuelve de qué
   * cuenta puede actuar quien llama.
   */
  './elements/puerta': ['elements'],
  /*
   * C3: la puerta de escenas y planos. Guarda y devuelve ESTADO CREATIVO —qué
   * tiene que representar cada plano y qué material lo representa hoy— y no
   * genera nada: producirlo sigue siendo del conductor, del Job y del Gateway.
   * Delega entera en el runtime de C3, que comprueba la propiedad una por una.
   */
  './shots/puerta': ['shots'],
  /*
   * F1-B: la puerta de las producciones de Filmmaker —el storyboard guardado—.
   * Crea, lee, lista, aplica lotes de operaciones con CAS, archiva y duplica, y
   * lo hace delegando en `productions/index.ts`, que comprueba la propiedad y
   * escribe en transacciones. No genera, no cobra y no llama a ningún proveedor.
   * Conectada para que F1-C pueda usarla; desplegarla es otro paso.
   */
  './productions/puerta': ['productions'],
  /* Paso I: la red de seguridad del dinero. Una tarea programada, no una puerta de usuario. */
  './settlement/programado': ['barridoDeLiquidacion'],
  /* MC-4.5: la ÚNICA puerta de Media Cloud. De administración, y no es una API. */
  './media/canary': ['mediaCanary'],
  './credits': ['getCreditsBalance', 'getCreditHistory', 'getCreditCost', 'spendCredits', 'grantCredits', 'refundCredits', 'validatePurchase', 'restorePurchase', 'creditsAdmin'],
  '(index)': ['sendPushNotification', 'sendMessagePushNotification'],
};

/* ── El grafo de `require` del compilado ──────────────────────────────────── */

const rel = (p) => path.relative(LIB, p).split(path.sep).join('/');
const resolver = (desde, spec) => {
  const base = path.resolve(path.dirname(desde), spec);
  for (const c of [base + '.js', path.join(base, 'index.js')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
};
const andar = (dir, ext, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) andar(p, ext, out);
    else if (e.name.endsWith(ext) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
};
const codigoDe = new Map();
const codigo = (abs) => { if (!codigoDe.has(abs)) codigoDe.set(abs, fs.readFileSync(abs, 'utf8')); return codigoDe.get(abs); };
const REQUIRE = /(?:const|var|let) (\w+) = require\("(\.{1,2}\/[^"]+)"\)/g;
const hijosDe = (abs) => [...codigo(abs).matchAll(/require\("(\.{1,2}\/[^"]+)"\)/g)].map((m) => resolver(abs, m[1])).filter(Boolean);

const INDEX = path.join(LIB, 'index.js');
const vivos = new Set([INDEX]);
{
  const cola = [INDEX];
  while (cola.length) for (const h of hijosDe(cola.shift())) if (!vivos.has(h)) { vivos.add(h); cola.push(h); }
}
const VIVOS = new Set([...vivos].map(rel));
const vivosFueraDelCore = [...VIVOS].filter((r) => !r.startsWith('core/'));

console.log('\n── A · Se mide lo que se despliega ──');
{
  check('1) `functions/lib/index.js` existe: la suite mide el compilado, no las fuentes', fs.existsSync(INDEX), 'ejecuta `npm run build` en functions/');
  /* Un `lib` viejo mediría el runtime de ayer. Cada fuente tiene que tener su compilado, y no ser más nueva que él. */
  const viejos = [];
  for (const ts of andar(SRC, '.ts')) {
    const js = path.join(LIB, path.relative(SRC, ts)).replace(/\.ts$/, '.js');
    if (!fs.existsSync(js) || fs.statSync(js).mtimeMs + 2000 < fs.statSync(ts).mtimeMs) viejos.push(path.relative(SRC, ts).split(path.sep).join('/'));
  }
  check('2) el compilado está al día con las fuentes', viejos.length === 0, viejos.length ? `desfasado: ${viejos.slice(0, 6).join(', ')}${viejos.length > 6 ? '…' : ''} → ejecuta \`npm run build\` antes de \`npm test\`` : '');
  check('3) el grafo se pudo recorrer: hay más de cincuenta módulos vivos', VIVOS.size > 50, `${VIVOS.size}`);
}

console.log('\n── B · Las Functions que producción expone ──');
{
  const idx = codigo(INDEX);
  const porModulo = {};
  for (const m of idx.matchAll(/Object\.defineProperty\(exports, "(\w+)", \{ enumerable: true, get: function \(\) \{ return (\w+)\.\w+; \} \}\);/g)) {
    const req = idx.match(new RegExp(`(?:const|var) ${m[2]} = require\\("([^"]+)"\\)`));
    if (req) (porModulo[req[1]] ||= []).push(m[1]);
  }
  porModulo['(index)'] = [...idx.matchAll(/^exports\.(\w+) = \(0, \w+\.on\w+\)\(/gm)].map((m) => m[1]);
  const declaradas = Object.values(FUNCTIONS).flat();
  const reales = Object.values(porModulo).flat();
  check('4) son exactamente las declaradas en el mapa: ninguna Function nace sin clasificar', igual(declaradas, reales), diferencia(declaradas, reales));
  check('5) y son treinta y ocho: las treinta y cinco de antes (hasta Productions, F1-B), evalRun (F2-C1, de administración, sin desplegar), generateWorld (misión mundo3d, sin desplegar) y disponibilidadDeCapacidades (DEC-06, sin desplegar)', reales.length === 38, `${reales.length}`);
  /*
   * ── LA PRUEBA DE QUE ESTA GUARDA SIGUE MORDIENDO (S5) ────────────────────
   *
   * S5, C3, F1-B y F2-C1 tuvieron que tocar este mapa: cada una añadió una Function
   * —`elements`, `shots`, `productions` y `evalRun`—. Actualizar una guarda es la forma más
   * fácil de desactivarla sin querer, así que aquí se demuestra que sigue
   * haciendo su trabajo: se le presenta una Function que NADIE declaró y se
   * comprueba que la detectaría.
   */
  const inventada = [...reales, 'functionQueNadieDeclaro'];
  check('5b) y la guarda SIGUE PROTEGIENDO: una Function sin clasificar se detecta',
    inventada.filter((f) => !declaradas.includes(f)).join(',') === 'functionQueNadieDeclaro'
    && inventada.length !== 38);

  const malUbicadas = Object.entries(FUNCTIONS).filter(([mod, fns]) => !igual(fns, porModulo[mod] || []));
  check('6) cada una sale del módulo que el mapa dice', malUbicadas.length === 0, malUbicadas.map(([m]) => m).join(', '));
  check('7) ninguna Function sale de una composición del Core que no esté conectada',
    MAPA.filter((c) => c.motor === 'NOT CONNECTED' && c.composicion).every((c) => !Object.keys(porModulo).some((m) => resolver(INDEX, m) && rel(resolver(INDEX, m)) === c.composicion)));
}

/* ── Símbolos del Core que nombra el código vivo ──────────────────────────── */

const definidoEn = new Map();
for (const abs of andar(path.join(LIB, 'core'), '.js')) {
  if (abs.endsWith(`${path.sep}index.js`)) continue;
  for (const m of codigo(abs).matchAll(/^exports\.(\w+) = (?!void 0|exports\.)/gm)) if (!definidoEn.has(m[1])) definidoEn.set(m[1], rel(abs));
  for (const m of codigo(abs).matchAll(/^function (\w+)\(/gm)) if (new RegExp(`^exports\\.${m[1]} = ${m[1]};`, 'm').test(codigo(abs)) && !definidoEn.has(m[1])) definidoEn.set(m[1], rel(abs));
}
const nombrados = new Map(); /* módulo del Core → Set(símbolo) */
const quienNombra = new Map(); /* símbolo → Set(módulo vivo) */
for (const r of vivosFueraDelCore) {
  const abs = path.join(LIB, r);
  for (const m of codigo(abs).matchAll(REQUIRE)) {
    const destino = resolver(abs, m[2]);
    if (!destino || !rel(destino).startsWith('core/')) continue;
    for (const u of codigo(abs).matchAll(new RegExp(`\\b${m[1]}\\.(\\w+)`, 'g'))) {
      const origen = definidoEn.get(u[1]);
      if (!origen) continue;
      if (!nombrados.has(origen)) nombrados.set(origen, new Set());
      nombrados.get(origen).add(u[1]);
      if (!quienNombra.has(u[1])) quienNombra.set(u[1], new Set());
      quienNombra.get(u[1]).add(r);
    }
  }
}
/** ¿Se INVOCA `nombre` desde algún módulo vivo que no sea del Core? `function nombre(` es su definición, no una llamada. */
const invocadaDesde = (nombre) => vivosFueraDelCore.filter((r) => new RegExp(`(?<!function )\\b${nombre}\\)?\\(`).test(codigo(path.join(LIB, r))));

console.log('\n── C · Motor por motor: qué está conectado y qué no ──');
{
  let n = 8;
  for (const c of MAPA) {
    const simbolos = c.canonico.flatMap((m) => [...(nombrados.get(m) || [])]);
    /* Casi siempre quien atiende es otro archivo que la composición. En moderación son el mismo: las callables viven en ella. */
    const llamadores = c.fabrica ? invocadaDesde(c.fabrica).filter((r) => r !== c.composicion || c.enUso.includes(c.composicion)) : [];
    const alcanzable = c.composicion ? VIVOS.has(c.composicion) : false;
    const motor = c.fabrica && llamadores.length ? 'CONNECTED' : 'NOT CONNECTED';
    check(`${n++}) ${c.id}: el motor del Core está ${c.motor}`, motor === c.motor,
      `medido=${motor} · fábrica=${c.fabrica ?? '—'} · la invocan: ${llamadores.join(', ') || 'nadie'} · composición ${c.composicion ?? '—'} ${alcanzable ? 'alcanzable' : 'no alcanzable'}`);
    check(`${n++}) ${c.id}: el código vivo nombra exactamente estos símbolos suyos: [${c.simbolos.join(', ')}]`, igual(c.simbolos, simbolos), diferencia(c.simbolos, simbolos));
    /*
     * QUÉ COMPOSICIONES CARGA PRODUCCIÓN, declaradas una a una. Antes esto solo
     * miraba las piezas NOT CONNECTED; ahora se declara para TODAS, porque el
     * canary de F12-D hizo alcanzables varias a la vez y «no está conectado» ya
     * no implica «no se carga». Una composición que empiece a cargarse sin que
     * nadie lo declare aquí hace fallar esto.
     */
    if (c.composicion) {
      check(`${n++}) ${c.id}: producción ${c.cargada ? 'SÍ' : 'no'} carga su composición (${c.composicion})`, alcanzable === (c.cargada === true));
    }
    for (const vivo of c.enUso) check(`${n++}) ${c.id}: lo que atiende hoy (${vivo}) sí se despliega`, VIVOS.has(vivo));
  }
  /*
   * El Planner dejó de ser el caso raro. Su composición se cargaba SOLO por el
   * puerto de disponibilidad —`disponibilidadDeWee`, que usa el planificador
   * vivo para elegir entre plantilla y LLM— y nadie invocaba la fábrica. Ahora
   * la invoca la sombra, y solo la sombra: si apareciera un segundo sitio, esto
   * lo diría por su nombre.
   */
  check(`${n++}) planner: el puerto de disponibilidad sigue siendo lo que usa el planificador vivo`,
    VIVOS.has('planner/index.js') && /disponibilidadDeWee/.test(codigo(path.join(LIB, 'creator/planner.js'))));
  check(`${n++}) planner: la fábrica la invoca la SOMBRA, y nadie más`,
    igual(['creator/sombra.js'], invocadaDesde('crearPlannerDeWee')), invocadaDesde('crearPlannerDeWee').join(', ') || 'nadie');
  /*
   * S1 · EL ALGORITHM ENGINE ESTÁ EN SOMBRA. No es una pieza de la sección de
   * arriba —no tiene composición ni atiende a nadie— y su estado no es ni
   * CONNECTED ni NOT CONNECTED: es SOMBRA. El ciclo lo crea la sombra y solo la
   * sombra; lo que decide no llega a ningún ejecutor. Un segundo sitio que lo
   * creara haría fallar esto con su nombre.
   */
  check(`${n++}) algorithm: SOMBRA — la fábrica del ciclo la invoca la sombra del plan, y nadie más`,
    igual(['creator/sombra.js'], invocadaDesde('crearCicloAlgoritmico')), invocadaDesde('crearCicloAlgoritmico').join(', ') || 'nadie');
  check(`${n++}) algorithm: y lo que decide no lo consume nadie: ni \`paraRouter\`, ni el cierre del ciclo, en ningún módulo vivo`,
    invocadaDesde('paraRouter').length === 0 && vivosFueraDelCore.every((r) => !/\.cerrar\(\{|\bparaRouter\b/.test(codigo(path.join(LIB, r)))),
    [...invocadaDesde('paraRouter')].join(', ') || 'nadie');
  const otros = Object.entries(OTROS_DEL_CORE);
  for (const [mod, simbolos] of otros) check(`${n++}) ${mod}: símbolos nombrados [${simbolos.join(', ')}]`, igual(simbolos, [...(nombrados.get(mod) || [])]), diferencia(simbolos, [...(nombrados.get(mod) || [])]));
  /*
   * F1-B · LA CONEXIÓN DE `productions`, MEDIDA. Los símbolos del Core que SOLO
   * nombran `productions/` y `filmmaker/` son exactamente los veinte autorizados,
   * cada uno definido donde se declara; y lo que la conexión carga son cinco
   * módulos: la puerta, el almacén y tres del dominio de F1-A —ni `requisitos`
   * ni `recomendaciones`, que siguen sin estar en la ruta—.
   */
  const deFilmmaker = (r) => r.startsWith('productions/') || r.startsWith('filmmaker/');
  /*
   * Uno de los veinte lo nombra ya, a propósito, un módulo más: `normalizarEtiqueta`, que desde la revisión
   * post-auditoría (2026-10-01, server/sistemas-paralelos-idioma) es también la forma de la etiqueta de idioma del
   * servidor de la app (`shared/idiomaDelServidor`), para que haya UNA regla y no tres. Se declara por nombre: otro
   * módulo cualquiera que nombre uno de los veinte sigue haciendo fallar esto.
   */
  const COMPARTIDOS_FUERA = { normalizarEtiqueta: ['shared/idiomaDelServidor.js'] };
  const soloDeProductions = [...quienNombra].filter(([s, quien]) => [...quien].every((r) => deFilmmaker(r) || (COMPARTIDOS_FUERA[s] ?? []).includes(r))).map(([s]) => s);
  const autorizados = Object.values(DE_PRODUCTIONS).flat();
  check(`${n - 1}b) productions: la conexión pone en producción EXACTAMENTE los veinte símbolos autorizados, y ninguno más`,
    autorizados.length === 20 && new Set(autorizados).size === 20 && igual(soloDeProductions, autorizados), diferencia(autorizados, soloDeProductions));
  check(`${n - 1}c) productions: cada uno de los veinte es del módulo del Core en el que está autorizado`,
    Object.entries(DE_PRODUCTIONS).every(([modulo, simbolos]) => simbolos.every((s) => definidoEn.get(s) === modulo)),
    Object.entries(DE_PRODUCTIONS).flatMap(([modulo, simbolos]) => simbolos.filter((s) => definidoEn.get(s) !== modulo).map((s) => `${s} → ${definidoEn.get(s)}`)).join(', '));
  check(`${n - 1}d) productions: y lo que carga son cinco módulos —la puerta, el almacén y \`modelo\`, \`validacion\` y \`operaciones\` de F1-A—`,
    igual([...VIVOS].filter(deFilmmaker), ['filmmaker/modelo.js', 'filmmaker/operaciones.js', 'filmmaker/validacion.js', 'productions/index.js', 'productions/puerta.js']),
    [...VIVOS].filter(deFilmmaker).join(', '));
  const declarados = new Set([...MAPA.flatMap((c) => c.canonico), ...Object.keys(OTROS_DEL_CORE)]);
  const sinDeclarar = [...nombrados.keys()].filter((m) => !declarados.has(m));
  check(`${n++}) ningún otro módulo del Core está siendo usado por producción sin figurar en el mapa`, sinDeclarar.length === 0, sinDeclarar.join(', '));
}

console.log('\n── D · Un solo motor EN USO por pieza ──');
{
  /* Sin comentarios: una cabecera que DOCUMENTA `engine.generate()` no es una llamada. */
  const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const fuentes = andar(SRC, '.ts').map((abs) => ({ r: path.relative(SRC, abs).split(path.sep).join('/'), src: sinComentarios(fs.readFileSync(abs, 'utf8')) }));
  const donde = (re, filtro = () => true) => fuentes.filter((f) => filtro(f.r) && re.test(f.src)).map((f) => f.r);
  check('100) el router vivo se instancia UNA vez, en `engine/index.ts`', igual(donde(/\bcreateRouter\(\{/), ['engine/index.ts']), donde(/\bcreateRouter\(\{/).join(', '));
  check('101) hay UN bucle de ejecución de pasos, y está en `creatorRun`', igual(donde(/while \(done\.size < steps\.length\)/), ['creator/index.ts']));
  /*
   * Todo lo que llega a un proveedor entra por `engine.generate`. Estos son
   * TODOS los que lo llaman.
   *
   * `creator/index.ts` entra con la SOMBRA: le pasa el motor a
   * `entendimientoRealDelBrain` para que el Core pueda pensar un plan en
   * paralelo. Es una llamada más por el mismo embudo —Router y libro incluidos,
   * que es justo por lo que se eligió este camino— con `creditsEstimated: 0` y
   * sin transacción de Credits, y detrás de un interruptor cerrado por defecto.
   * Que aparezca aquí es la prueba de que NO se abrió un camino paralelo.
   *
   * `evals/dominios/router.ts` entra con F2-C1: el dominio real del Router en el Eval
   * Engine ejecuta una generación REAL por el MISMO embudo —Router y libro incluidos—, con
   * `attribution: 'eval'` para que el gasto se mida aparte y sin tocar los Credits
   * del usuario. Que aparezca aquí prueba que las evals NO rodean el motor.
   */
  const embudo = donde(/\bengine\.generate\(/, (r) => !r.startsWith('core/'));
  check('102) todo lo que pide IA entra por un único embudo: `engine.generate`',
    igual(embudo, ['creator/brain.ts', 'creator/index.ts', 'engine/video.ts', 'evals/dominios/router.ts', 'gateway/index.ts']), embudo.join(', '));
  check('103) y a `runCapability` solo lo llama Weë Creator', igual(donde(/\brunCapability\(/, (r) => r !== 'gateway/index.ts'), ['creator/index.ts', 'creator/planner.ts']));
  /*
   * LA ÚNICA DUPLICACIÓN DE RUNTIME QUE EXISTE HOY, y está a la vista a propósito:
   * el avatar del Perfil Weë habla con el proveedor por su cuenta, sin router,
   * sin límites y sin dejar fila en `aiGenerations`. Cobra bien (Credit Engine),
   * pero es un segundo camino hacia un proveedor. Esta comprobación no lo
   * bendice: lo acota. Un tercero la hace fallar.
   */
  /* Los hosts salen de los adaptadores (`ops/revision/hosts-de-proveedores.mjs`), no de una lista a mano: así entran BFL, MiniMax y Anthropic. */
  const fueraDelMotor = donde(new RegExp(`${patronDeHosts(hostsDeProveedores(RAIZ)).source}|GoogleGenAI|@google\\/genai|volces`, 'i'),
    (r) => !r.startsWith('engine/providers/') && !r.startsWith('core/'));
  check('104) fuera de los adaptadores, solo `vertexAI.ts` (avatar) habla con un proveedor — y está registrado como deuda',
    igual(fueraDelMotor.filter((r) => !['engine/registry.ts', 'engine/verification.ts'].includes(r)), ['vertexAI.ts']), fueraDelMotor.join(', '));
  check('105) y a `vertexAI.ts` solo lo usa el avatar', igual(donde(/from '\.\/vertexAI'/), ['generateAvatar.ts']));
  check('106) el código ya dice cuál es el canónico y cuál está en uso, y que no cabe un tercero',
    /CANÓNICO {3}`core\/job\.ts`/.test(leer('functions/src/creator/types.ts')) && /NO PUEDE HABER UN TERCERO/.test(leer('functions/src/creator/types.ts')));
}

console.log('\n── D2 · El conductor (F12-D): existe, es UNO, y entra por UNA puerta ──');
{
  /*
   * La Fase 12-D construyó la pieza que faltaba —quien une Orchestrator → Router →
   * Job Engine → cola → trabajador → Gateway— y el canary la conectó: `brainChat`
   * puede pasar por ella, con `text.generate` y detrás de una puerta cerrada por
   * defecto. Eso es lo que hace que varios motores de la sección C hayan cambiado
   * a CONNECTED a la vez: no es que se hayan conectado por su cuenta, es que el
   * conductor los construye y ahora el conductor está en la ruta.
   *
   * ESTADO EXACTO: BRAIN TEXT = CANARY. Todo lo demás = LEGACY. La puerta,
   * mientras esté cerrada —y lo está salvo que alguien la abra en `aiSettings/
   * runtime`—, deja el comportamiento como estaba.
   *
   * Lo que estas comprobaciones vigilan ya no es «que nadie entre», sino que la
   * entrada siga siendo UNA, por la puerta, y con una sola capacidad.
   */
  const DEL_CONDUCTOR = ['runtime/almacen.js', 'runtime/cola.js', 'runtime/conductor.js', 'runtime/configuracion.js', 'runtime/contexto.js', 'runtime/conversaciones.js',
    'runtime/ejecutor.js', 'runtime/index.js', 'runtime/pensador.js', 'runtime/politica.js', 'runtime/puerta.js', 'runtime/resolucion.js'];
  check('110) el conductor está compilado: sus doce módulos existen', DEL_CONDUCTOR.every((m) => fs.existsSync(path.join(LIB, m))), DEL_CONDUCTOR.filter((m) => !fs.existsSync(path.join(LIB, m))).join(', '));
  check('111) y producción los carga TODOS: el canary los puso en la ruta, no a medias', DEL_CONDUCTOR.every((m) => VIVOS.has(m)), DEL_CONDUCTOR.filter((m) => !VIVOS.has(m)).join(', '));
  const fabrica = [...invocadaDesde('conductorDeWee'), ...invocadaDesde('crearConductor')];
  /* Misión mundo3d (FASE 5): una tercera puerta declarada, la del mundo. Una cuarta hace fallar esto. */
  check('112) y su fábrica la invocan TRES módulos vivos: los tres canaries declarados (Brain texto, Studio vídeo, Studio mundo 3D)', igual(fabrica, ['creator/brain.js', 'creator/mundo.js', 'creator/video.js', 'runtime/index.js']), fabrica.join(', '));
  const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const fuentes = andar(SRC, '.ts').map((abs) => ({ r: path.relative(SRC, abs).split(path.sep).join('/'), src: sinComentarios(fs.readFileSync(abs, 'utf8')) }));
  const conductores = fuentes.filter((f) => /export const crearConductor\b/.test(f.src)).map((f) => f.r);
  check('113) hay UN conductor. Un segundo sería el segundo runtime que esta fase existe para impedir', igual(conductores, ['runtime/conductor.ts']), conductores.join(', '));
  const puertas = fuentes.filter((f) => /decidirRuntime\(/.test(f.src) && !f.r.startsWith('runtime/')).map((f) => f.r);
  check('114) la puerta CORE/LEGACY la consultan EXACTAMENTE tres callables: `brainChat`, `generateVideo` y `generateWorld`', igual(puertas, ['creator/brain.ts', 'creator/mundo.ts', 'creator/video.ts']), puertas.join(', '));
  const pensadores = fuentes.filter((f) => /pensadorSobreConductor\(/.test(f.src) && !f.r.startsWith('runtime/')).map((f) => f.r);
  check('116) Weë Brain puede pensar por el conductor, y el camino de siempre sigue entero al lado', igual(pensadores, ['creator/brain.ts']) && /engine\.generate\(/.test(leer('functions/src/creator/brain.ts')), pensadores.join(', '));
  /* UNA capacidad, escrita en el código: la configuración de la puerta puede cerrar el canary, nunca ampliarlo. */
  const brainVivo = sinComentarios(leer('functions/src/creator/brain.ts'));
  check("117) y solo `text.generate` puede cruzarla: la capacidad del canary está en el código, no en la configuración",
    /CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate'/.test(brainVivo) && /porElCore = puerta\.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY/.test(brainVivo));
  /* Y la tercera, con su propio candado: ni la configuración la amplía ni las otras dos la abren. */
  const mundoVivo = sinComentarios(leer('functions/src/creator/mundo.ts'));
  check("117b) por la tercera solo cruza `world.generate`, escrita en el código, y sin la puerta abierta no hay mundo (no hay camino síncrono)",
    /CAPACIDAD_DEL_CANARY: CapabilityId = 'world\.generate'/.test(mundoVivo) && /if \(puerta\.runtime !== 'core'\) throw noDisponible\('no_disponible'\)/.test(mundoVivo));
  check('118) y la puerta se guarda donde solo la lee el servidor: `aiSettings`, cerrada a los clientes', /COLECCION_DE_LA_PUERTA = 'aiSettings'/.test(leer('functions/src/runtime/configuracion.ts')) && /match \/aiSettings\/\{settingId\} \{\s*allow read, write: if false;/.test(leer('firestore.rules')));
}

console.log('\n── E · Quién llama desde la app ──');
{
  const CLIENTE = ['services', 'hooks', 'screens', 'components', 'navigation', 'contexts', 'utils'];
  const archivos = CLIENTE.flatMap((d) => (existe(d) ? [...andar(path.resolve(RAIZ, d), '.ts'), ...andar(path.resolve(RAIZ, d), '.tsx')] : []))
    .map((abs) => ({ r: path.relative(RAIZ, abs).split(path.sep).join('/'), src: fs.readFileSync(abs, 'utf8') }));
  const quienNombraLaCallable = (fn) => archivos.filter((a) => new RegExp(`['"]${fn}['"]`).test(a.src)).map((a) => a.r);
  const importadores = (servicio) => archivos.filter((a) => a.r !== `services/${servicio}.ts` && new RegExp(`/${servicio}['"]`).test(a.src)).map((a) => a.r);

  const ESPERADO = {
    creatorChat: 'services/creatorService.ts', creatorQuote: 'services/creatorService.ts', creatorRun: 'services/creatorService.ts',
    brainChat: 'services/brainService.ts', brainQuote: 'services/brainService.ts',
    generateVideo: 'services/videoService.ts', deleteAsset: 'services/assetsService.ts',
    /* + misión mundo3d: la tercera puerta del conductor tiene UN servicio en la app (sin desplegar, y su pantalla tras su puerta). */
    generateWorld: 'services/mundoService.ts',
  };
  let n = 120;
  for (const [fn, servicio] of Object.entries(ESPERADO)) check(`${n++}) \`${fn}\` la invoca ${servicio}, y nadie más`, igual(quienNombraLaCallable(fn), [servicio]), quienNombraLaCallable(fn).join(', '));
  check(`${n++}) el flujo guiado y el chat de Weë Brain tienen pantallas detrás`, importadores('creatorService').includes('screens/CreatorFlowScreen.tsx') && importadores('brainService').includes('hooks/useBrainChat.ts'));
  /*
   * Desplegada y protegida por pruebas; el vídeo de Weë Studio entra por `creatorRun`. Desde F1-D la usa
   * UN consumidor nominal: la toma de un plano de Weë Filmmaker (`hooks/useTomaDePlano.ts`), que le manda
   * el plano y nunca un texto. Ninguna pantalla ni componente la importa directamente.
   */
  check(`${n++}) \`generateVideo\` tiene UN consumidor nominal, la toma de un plano: ninguna pantalla importa su servicio`, igual(importadores('videoService'), ['hooks/useTomaDePlano.ts']), importadores('videoService').join(', '));
  check(`${n++}) \`generateWorld\` tiene UN consumidor nominal, la pantalla «Crear mundo 3D»: ninguna otra importa su servicio`, igual(importadores('mundoService'), ['screens/Mundo3DScreen.tsx']), importadores('mundoService').join(', '));
  check(`${n++}) los proyectos los escribe el cliente directamente: no hay callable de Project`, /collection\(db, 'creatorProjects'\)|doc\(db, 'creatorProjects'/.test(leer('services/projectsService.ts')) && !Object.values(FUNCTIONS).flat().some((f) => /project/i.test(f)));
  check(`${n++}) y las publicaciones también: \`posts\` no pasa por el modelo de Publication del Core`, /'posts'/.test(leer('services/firestoreService.ts')) && (nombrados.get('core/content/publication.js') || new Set()).size === 0);
}

console.log('\n── F · Los contratos de fases cerradas que protegen esta separación ──');
{
  /*
   * Cada uno de estos dice «ninguna ruta de producción pasa por aquí TODAVÍA».
   * Migrar un consumidor es poner fin a ese «todavía», y eso se hace de frente:
   * cambiando la comprobación en su suite, con aprobación. Si alguien la quita o
   * la ablanda sin actualizar este inventario, falla aquí.
   */
  const PINS = [
    ['F2', 'core-gateway.test.mjs', '11) la carpeta legada functions/src/gateway/ sigue intacta y Creator sigue entrando por ella'],
    ['F2', 'core-gateway.test.mjs', '12) ninguna ruta de producción pasa todavía por el Gateway nuevo'],
    ['F3', 'core-brain.test.mjs', '105) el planificador de CreatorFlow sigue como estaba, sin tocar'],
    ['F3', 'core-brain.test.mjs', '106) y CreatorFlow sigue entrando por donde entraba'],
    ['F4', 'core-planner.test.mjs', '75) CreatorFlow sigue entrando por donde entraba'],
    ['F4', 'core-planner.test.mjs', '76) los dos planificadores de plantilla siguen existiendo, intactos'],
    ['F5', 'core-workflow.test.mjs', '159) el `while` de Weë Creator sigue donde estaba: el motor no sustituye ninguna ruta de producción'],
    ['F6', 'core-orchestrator.test.mjs', '140) el `while` de Weë Creator sigue donde estaba: ninguna ruta de producción pasa por aquí'],
    ['F7', 'core-router.test.mjs', '114) el `while` de Weë Creator sigue donde estaba: ninguna ruta de producción pasa por aquí todavía'],
    ['F7', 'core-router.test.mjs', '115) y la carpeta legada del gateway sigue intacta'],
    ['F8', 'plazos-y-liquidacion.test.mjs', '40) hay UN motor de trabajos canónico, y solo uno'],
    ['F8', 'plazos-y-liquidacion.test.mjs', '41) y exactamente DOS routers: el contrato y el que atiende hoy'],
    ['F8', 'plazos-y-liquidacion.test.mjs', '42) y DOS gateways, por el mismo motivo'],
    ['F8', 'plazos-y-liquidacion.test.mjs', '43) cuál manda y cuál está en uso está escrito donde se lee'],
  ];
  let n = 140;
  for (const [fase, suite, etiqueta] of PINS) check(`${n++}) [${fase}] ${suite} · «${etiqueta.slice(0, 70)}${etiqueta.length > 70 ? '…' : ''}»`, leer(`functions/test/${suite}`).includes(`check('${etiqueta}'`));
  check(`${n++}) son catorce, y todos están en la cadena de \`npm test\``, PINS.length === 14 && [...new Set(PINS.map((p) => p[1]))].every((s) => leer('functions/package.json').includes(`node test/${s}`)));
}

console.log('\n── G · El mapa escrito dice lo mismo que el medido ──');
{
  const doc = existe('docs/RUNTIME.md') ? leer('docs/RUNTIME.md') : '';
  check('170) `docs/RUNTIME.md` existe', doc.length > 0);
  const NOMBRE = { brain: 'Brain', planner: 'Planner', workflow: 'Workflow', orchestrator: 'Orchestrator', router: 'Router', gateway: 'Gateway', job: 'Job Engine', project: 'Project', content: 'Content', asset: 'Asset', publication: 'Publication' };
  let n = 171;
  for (const [id, nombre] of Object.entries(NOMBRE)) {
    const c = MAPA.find((x) => x.id === id);
    /* Una fila de la tabla de estado: | **Nombre** | … | CONNECTED / NOT CONNECTED | */
    const fila = doc.split('\n').find((l) => l.startsWith(`| **${nombre}** |`)) || '';
    const dice = /\bNOT CONNECTED\b/.test(fila) ? 'NOT CONNECTED' : /\bCONNECTED\b/.test(fila) ? 'CONNECTED' : '(sin fila)';
    check(`${n++}) ${nombre}: el documento dice ${c.motor}`, dice === c.motor, `dice ${dice}`);
  }
  /*
   * El conductor no es una pieza del Core sino quien las une; su fila va aparte, y
   * dice lo mismo que se mide en D2: conectado SOLO para el canary de texto de
   * Brain. Ni «no conectado» (ya lo está) ni «conectado» a secas (sería mentir
   * sobre el alcance).
   */
  const filaDelConductor = doc.split('\n').find((l) => l.startsWith('| **Conductor** |')) || '';
  check(`${n++}) Conductor: el documento dice CANARY — CONNECTED FOR BRAIN TEXT ONLY, que es lo que se mide`,
    /CANARY — CONNECTED FOR BRAIN TEXT ONLY/.test(filaDelConductor) && /text\.generate/.test(filaDelConductor), filaDelConductor ? 'la fila no lo dice' : '(sin fila)');
  /* S1: el Algorithm Engine tiene su fila, y dice SOMBRA —lo que se mide en C—, no CONNECTED ni NOT CONNECTED. */
  const filaDelAlgoritmo = doc.split('\n').find((l) => l.startsWith('| **Algorithm Engine** |')) || '';
  check(`${n++}) Algorithm Engine: el documento dice SOMBRA, con su puerta, y no se atribuye autoridad de producción`,
    /\bSOMBRA\b/.test(filaDelAlgoritmo) && !/\bCONNECTED\b/.test(filaDelAlgoritmo) && /aiSettings\/sombra/.test(filaDelAlgoritmo)
    && /creator\/sombra\.ts/.test(filaDelAlgoritmo),
    filaDelAlgoritmo ? 'la fila no lo dice' : '(sin fila)');
  check(`${n++}) esta suite está en la cadena de \`npm test\``, leer('functions/package.json').includes('node test/runtime-map.test.mjs'));
}

/* ═══════════════════════════════════════════════════════════════════════════
 * H · EL ALCANCE DE TODO `functions/src`: NINGÚN ARCHIVO HUÉRFANO (M-03, ronda R7, 2026-10-11)
 *
 * Las secciones de arriba miden lo que producción CARGA y qué símbolos del Core nombra. Ninguna
 * miraba lo contrario: un archivo que nadie importa. Hoy hay 23 (auditoría de integración de R6,
 * hallazgo 8) y todos son deliberados o tienen dueño, pero nada impedía el 24.º, ni que borrar un
 * `import` dejara huérfano a un archivo que estaba conectado. Lo que había alrededor no lo cubre:
 *   · la cerca F1 de `puente-pre-f1d` vigila QUÉ ARCHIVOS SE TOCAN (por nombre, contra su ancla), no
 *     si lo nuevo está conectado, y se reancla con autorización;
 *   · `muerto/modulo-sin-importador` (`ops/revision`) sí los ve, pero es de severidad BAJA y la
 *     puerta G3 solo bloquea NUEVO alto o bloqueante (docs/REVISION.md): pasa con huérfanos nuevos.
 *
 * LO QUE EXIGE. Todo `.ts` de `functions/src` se alcanza desde `index.ts` siguiendo imports, o figura
 * en HUERFANOS_ADMITIDOS con su clase, su motivo y su respaldo. La lista es EXACTA en los dos sentidos:
 * un huérfano sin entrada falla, y una entrada que ya se alcanza, o cuyo archivo ya no existe, también
 * —la lista no se pudre—. Entra `core/`: el barril `core/index.ts` lo hace TODO alcanzable (por eso la
 * alcanzabilidad no dice si producción USA algo del Core: eso lo miden los símbolos de la sección C),
 * pero un archivo del Core que ni el barril exporta ni nadie importa sí es un huérfano, y la sección C
 * no lo ve. Hoy son 0 de 97.
 *
 * POR QUÉ SOBRE LAS FUENTES Y NO SOBRE `lib` (medido en d867774):
 *   · `tsc` borra los imports que solo se usan como tipo, y emite `require('./x')` con comillas SIMPLES
 *     para un `import('./x')`, que el `require\("…"\)` del grafo de `lib` (VIVOS) no reconoce. Sobre
 *     `lib` saldrían tres falsos huérfanos: `creator/types.ts` y `gateway/types.ts` (solo se importan
 *     como tipo) y `engine/referencias-de-wee.ts` (la carga `engine/gateway.ts` con `import()`). El
 *     alcance lo decide quien escribió el `import`, no lo que `tsc` emita.
 *   · el huérfano sale por su NOMBRE aunque el compilado esté desfasado o sin compilar ese archivo (2).
 *   · no depende de la versión ni del estilo de emisión de `tsc`.
 *  Lo que se pierde: no distingue «importado solo por tipos» (cuenta como conectado). Se compensa con la
 *  comprobación cruzada 197: todo lo que `lib` carga lo alcanzan también las fuentes; si no, al
 *  extractor se le escapó una forma de import. (Esto no hace la suite independiente de `lib`: el
 *  resto del archivo la exige. Lo que no depende de `lib` es la medida y el nombre del huérfano.)
 *
 * QUÉ CUENTA COMO CONEXIÓN: cualquier especificador RELATIVO que escribe el código —`import … from`,
 * `export … from`, `export * from`, `import './x'`, `import x = require()`, `require()` e `import()` con
 * cadena literal, y `import('./x').T` dentro de un tipo—, también los de solo tipo. Se lee con el parser
 * de TypeScript, no con expresiones regulares: un `import` dentro de un comentario o de una cadena no
 * conecta nada. Un `import()` o `require()` con una expresión no se puede seguir, y se cuenta aparte.
 *
 * LO QUE NO PRUEBA: que el archivo se EJECUTE (eso lo miden B–D sobre `lib`), ni que lo conectado tenga
 * un llamador: una función muerta dentro de un archivo conectado no se ve desde aquí (`gatewayDeWee`
 * carga `engine/referencias-de-wee.ts` y nadie llama a `gatewayDeWee`).
 *
 * SI ESTA SECCIÓN FALLA: huérfano nuevo → conéctalo (que lo importe un módulo que llegue a `index.ts`) o
 * añade su entrada con clase, motivo y respaldo, y la decisión que la sostiene; entrada obsoleta →
 * quítala. No se reancla ninguna cerca por esto: si conectar mueve F1, H2 o H3, es otro paso con su
 * autorización.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Las cuatro clases de huérfano admitido. Cada una trae su propio respaldo (ver `problemasDeRespaldo`):
 *   HUERFANO_REAL               nadie lo usa; solo una prueba comprueba que existe. Candidato a retirar, con aprobación.
 *   CONSUMIDOR_FUERA_DEL_GRAFO  lo consume algo que el despliegue no recorre (un script generador y la copia que usa la app).
 *   SOLO_PRUEBAS                preparado y probado; producción aún no lo carga. Lo ejercita al menos una suite de la cadena.
 *   PLANEADO_CERRADO            preparado para conectarse, a la espera de una decisión del dueño o de una puerta cerrada.
 */
const CLASES_DE_HUERFANO = ['HUERFANO_REAL', 'CONSUMIDOR_FUERA_DEL_GRAFO', 'SOLO_PRUEBAS', 'PLANEADO_CERRADO'];

/**
 * LA LISTA. Es la otra parte de este archivo que se edita a mano, y es EXACTA: ni un archivo inalcanzable
 * sin entrada, ni una entrada de algo que ya se alcanza o que ya no existe.
 *
 *   ruta        relativa a `functions/src`
 *   clase       una de CLASES_DE_HUERFANO
 *   motivo      por qué está así y de dónde sale la decisión (docs/DECISIONES-DELIBERADAS.md DD-03, RUNTIME.md…)
 *   suites      suites de la cadena de `npm test` que cargan o leen el archivo (SOLO_PRUEBAS y PLANEADO_CERRADO: al menos una)
 *   fijadoPor   (HUERFANO_REAL) la prueba que solo comprueba que existe; nadie más puede usarlo
 *   consumidor  (CONSUMIDOR_FUERA_DEL_GRAFO) el script que lo lee, y `copia`: lo que genera para la app
 *
 * Añadir una entrada no es el camino fácil: pide clase, motivo y una comprobación que se mantenga cierta. Lo normal
 * es conectar el archivo, no listarlo.
 */
const HUERFANOS_ADMITIDOS = [
  /* ── Un residuo: nadie lo usa ─────────────────────────────────────────────── */
  { ruta: 'engine/pipelines/drama.ts', clase: 'HUERFANO_REAL', fijadoPor: ['brain-canary.test.mjs'],
    motivo: 'Blueprint de AI Drama sin interfaz: no lo importa ningún módulo ni lo ejercita ninguna prueba (solo brain-canary comprueba que existe). Candidato a retirada con aprobación (docs/RUNTIME.md § 9); no es una decisión deliberada (docs/DECISIONES-DELIBERADAS.md, «No son decisiones deliberadas»).' },

  /* ── Lo consume algo que el despliegue no recorre ────────────────────────── */
  { ruta: 'filmmaker/recomendaciones.ts', clase: 'CONSUMIDOR_FUERA_DEL_GRAFO', suites: ['filmmaker-modelo.test.mjs'],
    consumidor: 'scripts/espejo-filmmaker.mjs', copia: 'services/filmmaker/espejo/filmmaker/recomendaciones.ts',
    motivo: 'Las recomendaciones de Weë Filmmaker las usa la app por su copia generada (services/filmmaker/espejo/), que sale de este archivo con scripts/espejo-filmmaker.mjs; el servidor aún no las pide.' },
  { ruta: 'filmmaker/requisitos.ts', clase: 'CONSUMIDOR_FUERA_DEL_GRAFO', suites: ['filmmaker-modelo.test.mjs'],
    consumidor: 'scripts/espejo-filmmaker.mjs', copia: 'services/filmmaker/espejo/filmmaker/requisitos.ts',
    motivo: 'Los requisitos de una producción de Weë Filmmaker los usa la app por su copia generada (services/filmmaker/espejo/), que sale de este archivo con scripts/espejo-filmmaker.mjs; el servidor aún no los pide.' },

  /* ── Preparado, probado y sin conectar: el Core y Media Cloud (DD-03) ─────── */
  { ruta: 'financial/index.ts', clase: 'SOLO_PRUEBAS', suites: ['core-financial.test.mjs'],
    motivo: 'Composición del Financial Core: preparada y NO conectada (DD-03; RUNTIME § 3, «Financial NOT CONNECTED»). El motor de Credits en uso es credits/creditEngine.ts; el MAPA de arriba (financial, cargada: false) vigila que producción no la cargue.' },
  { ruta: 'media/cloudinary.ts', clase: 'SOLO_PRUEBAS', suites: ['media-migracion.test.mjs'],
    motivo: 'MC-6: la fuente histórica del traslado de medios; el traslado no se conecta (DD-03, functions/src/media/ preparada, sin Function ni programador).' },
  { ruta: 'media/falso.ts', clase: 'SOLO_PRUEBAS', suites: ['media-core.test.mjs'],
    motivo: 'Doble de prueba (almacén en memoria) que vive en src a propósito para que las suites lo carguen desde lib (DD-03); no se compone en producción.' },
  { ruta: 'media/fuente-falsa.ts', clase: 'SOLO_PRUEBAS', suites: ['media-migracion.test.mjs'],
    motivo: 'Doble de prueba (fuente histórica de mentira) que vive en src a propósito (DD-03); no se compone en producción.' },
  { ruta: 'media/index.ts', clase: 'SOLO_PRUEBAS', suites: ['media-core.test.mjs'],
    motivo: 'Composición de Media Cloud (MC-1): «nada de producción pasa por aquí todavía» (cabecera del archivo; DD-03). Lo que sí llega a producción es media/canary.ts, que compone las piezas por su cuenta.' },
  { ruta: 'media/migracion.ts', clase: 'SOLO_PRUEBAS', suites: ['media-migracion.test.mjs'],
    motivo: 'MC-6: el traslado de la fuente histórica al almacén de Weë, sin Function ni programador (DD-03).' },
  { ruta: 'media/procesador-falso.ts', clase: 'SOLO_PRUEBAS', suites: ['media-proceso-core.test.mjs'],
    motivo: 'Doble de prueba (procesador de mentira) que vive en src a propósito (DD-03); «no se compone en producción».' },
  { ruta: 'media/recoleccion.ts', clase: 'SOLO_PRUEBAS', suites: ['media-recoleccion.test.mjs'],
    motivo: 'MC-5: la recolección de objetos huérfanos de Media Cloud, sin programador: «el GC no corre» (DD-03). Solo la importa media/barrido.ts, también sin conectar.' },
  { ruta: 'media/reconciliacion.ts', clase: 'SOLO_PRUEBAS', suites: ['media-reconciliacion.test.mjs'],
    motivo: 'MC-9: la reconciliación del índice de referencias de Media Cloud, ejecutable y sin programador (DD-03).' },
  { ruta: 'media/uso.ts', clase: 'SOLO_PRUEBAS', suites: ['media-uso.test.mjs'],
    motivo: 'MC-7: dónde se apunta lo medido de Media Cloud y cómo se suma. Nadie pasa un medidor en producción («medir sigue apagado»; ver OTROS_DEL_CORE de arriba) y media/ está preparada sin conectar (DD-03).' },
  { ruta: 'router/index.ts', clase: 'SOLO_PRUEBAS', suites: ['runtime-paridad.test.mjs', 'core-router.test.mjs'],
    motivo: 'Composición del Router del Core: preparada y NO conectada (DD-03). Producción decide con engine/router.ts; el conductor construye crearRouter por su cuenta (MAPA, router, cargada: false). La ejercita runtime-paridad (resolverConContexto, el ensayo de paridad con el router vivo) y core-router la lee.' },
  { ruta: 'router/politica.ts', clase: 'SOLO_PRUEBAS', suites: ['router-politica.test.mjs'],
    motivo: 'Frontera de política del Router del Core (S6-C): DEUDA DECLARADA frente a runtime/resolucion.ts, que es la que usa el conductor; antes de conectar router/ se elige UNA (docs/RUNTIME.md § 11.11; docs/DECISIONES-DELIBERADAS.md).' },
  { ruta: 'runtime/cola-durable.ts', clase: 'SOLO_PRUEBAS', suites: ['cola-durable.test.mjs'],
    motivo: 'La cola durable del Job Engine: preparada, con reglas e índice y sin importador (DD-03: runtime/cola*.ts). El conductor usa runtime/cola.ts.' },
  { ruta: 'skills/index.ts', clase: 'SOLO_PRUEBAS', suites: ['skills.test.mjs'],
    motivo: 'Composición de Skills: el mecanismo está listo y el catálogo vacío a propósito (DD-03; docs/CAPABILITY-MAP.md § A).' },
  { ruta: 'workflow/index.ts', clase: 'SOLO_PRUEBAS', suites: ['core-workflow.test.mjs'],
    motivo: 'Composición del Workflow Engine del Core: preparada y NO conectada (DD-03). El conductor usa dos piezas sueltas del Core, no esta composición (MAPA, workflow, cargada: false).' },

  /* ── Planeado: a la espera de una decisión del dueño o de una puerta cerrada ─ */
  { ruta: 'content/versiones.ts', clase: 'PLANEADO_CERRADO', suites: ['version-de-material.test.mjs'],
    motivo: 'La callable guardarComoVersion (DEC-03), preparada y probada y sin exportar desde index.ts: «el export llega con la pantalla y el cupo» (decisión de superficie pendiente del dueño; cabecera del archivo).' },
  { ruta: 'media/barrido.ts', clase: 'PLANEADO_CERRADO', suites: ['activos-barrido.test.mjs'],
    motivo: 'La tarea programada del barrido del índice de referencias (H5/H2): preparada y sin exportar desde index.ts; A-11 es una autorización pendiente y el índice vive tras aiSettings/almacenActivos, cerrada por defecto (docs/ACTIVOS-CERCAS.md).' },
  { ruta: 'media/optimizador/coste.ts', clase: 'PLANEADO_CERRADO', suites: ['medios-optimizador-coste.test.mjs'],
    motivo: 'Optimizador de medios (línea M): estimación de coste SIN tarifas aprobadas. Implementado y probado; integrarlo está BLOQUEADO por las cercas, y reanclarlas es autorización del dueño (docs/MEDIOS-OPTIMIZADOR.md § 1 y § 10).' },
  { ruta: 'media/optimizador/plan.ts', clase: 'PLANEADO_CERRADO', suites: ['medios-optimizador-plan.test.mjs'],
    motivo: 'Optimizador de medios (línea M): el plan de variantes de imagen, puro. Implementado y probado; integrarlo está BLOQUEADO por la cerca F1 (docs/MEDIOS-OPTIMIZADOR.md § 1 y § 10; scripts/benchmark-optimizador.mjs).' },
  { ruta: 'media/optimizador/transcodificacion.ts', clase: 'PLANEADO_CERRADO', suites: ['medios-optimizador-transcodificacion.test.mjs'],
    motivo: 'Optimizador de medios (línea M): la costura del procesador de vídeo y audio, sin dependencia; FFmpeg espera autorización (docs/MEDIOS-OPTIMIZADOR.md § 8).' },
];

console.log('\n── H · El alcance de todo functions/src: ningún archivo huérfano (M-03) ──');
{
  const ts = createRequire(import.meta.url)('typescript');
  const RAIZ_DEL_ALCANCE = 'index.ts';

  /* ── PURAS: sin disco, sin estado; reciben el mapa y devuelven lo medido ──────────────────────────────────────── */

  /**
   * Los especificadores de módulo que un texto TypeScript nombra, en cualquier forma, y cuántos `import()` o
   * `require()` hay con una expresión en vez de una cadena (no se pueden seguir). Con el parser, no con regex.
   */
  const importsDeTexto = (nombre, texto) => {
    const sf = ts.createSourceFile(nombre, texto, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const literal = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);
    const especificadores = [];
    let noLiterales = 0;
    const anotar = (s) => { if (s === null) noLiterales++; else especificadores.push(s); };
    const visitar = (n) => {
      if (ts.isImportDeclaration(n) || (ts.isExportDeclaration(n) && n.moduleSpecifier)) anotar(literal(n.moduleSpecifier));
      else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) anotar(literal(n.moduleReference.expression));
      else if (ts.isCallExpression(n) && n.arguments.length > 0
        && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) anotar(literal(n.arguments[0]));
      else if (ts.isImportTypeNode(n)) anotar(ts.isLiteralTypeNode(n.argument) ? literal(n.argument.literal) : null);
      ts.forEachChild(n, visitar);
    };
    visitar(sf);
    return { especificadores, noLiterales };
  };

  const esRelativo = (spec) => spec === '.' || spec === '..' || spec.startsWith('./') || spec.startsWith('../');

  /** Como TypeScript con `module: commonjs`: `./x` es `x.ts`; si no existe, el directorio `x/index.ts`. Nada más: un destino que no encaja se informa. */
  const resolverEnSrc = (desde, spec, existeEnSrc) => {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(desde), spec)).replace(/\/$/, '');
    for (const candidato of [`${base}.ts`, `${base}/index.ts`]) if (existeEnSrc(candidato)) return candidato;
    return null;
  };

  /**
   * EL ALCANCE. Recibe archivo → especificadores tal como se escriben, y devuelve:
   *   alcanzados   los archivos a los que se llega desde `raiz` siguiendo cualquier import (no basta con «tiene importador»:
   *                dos huérfanos que se importan entre sí no se alcanzan);
   *   huerfanos    el resto, ordenados;
   *   sinResolver  los especificadores relativos que no apuntan a ningún archivo del mapa («desde → spec»): una arista perdida.
   */
  const alcanceDe = (importsPorArchivo, raiz) => {
    const existeEnSrc = (r) => importsPorArchivo.has(r);
    const aristas = new Map();
    const sinResolver = [];
    for (const [desde, specs] of importsPorArchivo) {
      const destinos = new Set();
      for (const spec of specs) {
        if (!esRelativo(spec)) continue; /* un paquete (`sharp`, `firebase-admin`…): no es de este repositorio */
        const destino = resolverEnSrc(desde, spec, existeEnSrc);
        if (destino) destinos.add(destino); else sinResolver.push(`${desde} → ${spec}`);
      }
      aristas.set(desde, destinos);
    }
    const alcanzados = new Set(existeEnSrc(raiz) ? [raiz] : []);
    const cola = [...alcanzados];
    while (cola.length) for (const h of aristas.get(cola.shift())) if (!alcanzados.has(h)) { alcanzados.add(h); cola.push(h); }
    return { aristas, alcanzados, huerfanos: [...importsPorArchivo.keys()].filter((r) => !alcanzados.has(r)).sort(), sinResolver };
  };

  /** Lo mismo sin los imports que llevan a `destino` (borrar la arista, o las aristas, que lo conectaban). */
  const sinAristasHacia = (importsPorArchivo, destino) => {
    const existeEnSrc = (r) => importsPorArchivo.has(r);
    return new Map([...importsPorArchivo].map(([desde, specs]) => [desde,
      specs.filter((spec) => !(esRelativo(spec) && resolverEnSrc(desde, spec, existeEnSrc) === destino))]));
  };

  /** La lista contra lo medido. Tres fallos posibles, cada uno con su nombre. */
  const conciliar = (huerfanos, admitidos, existentes) => {
    const enLista = new Set(admitidos.map((a) => a.ruta));
    const inalcanzables = new Set(huerfanos);
    return {
      sinMotivo: huerfanos.filter((r) => !enLista.has(r)),
      yaAlcanzable: [...enLista].filter((r) => existentes.has(r) && !inalcanzables.has(r)).sort(),
      inexistente: [...enLista].filter((r) => !existentes.has(r)).sort(),
    };
  };

  /** ¿Está bien formada la lista? Clases conocidas, un motivo por archivo, rutas canónicas, sin repetidos. */
  const problemasDeLaLista = (lista) => {
    const problemas = [];
    const vistas = new Set();
    for (const e of lista) {
      const quien = e && typeof e.ruta === 'string' ? e.ruta : JSON.stringify(e);
      if (!e || typeof e.ruta !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*\.ts$/.test(e.ruta) || e.ruta.startsWith('functions/')) problemas.push(`${quien}: ruta no canónica (relativa a functions/src y acabada en .ts)`);
      else if (vistas.has(e.ruta)) problemas.push(`${quien}: repetida`);
      else vistas.add(e.ruta);
      if (!e || !CLASES_DE_HUERFANO.includes(e.clase)) problemas.push(`${quien}: clase desconocida «${e && e.clase}»`);
      if (!e || typeof e.motivo !== 'string' || e.motivo.trim().length < 40) problemas.push(`${quien}: sin motivo (una frase que diga por qué y de dónde sale la decisión)`);
    }
    return problemas;
  };

  /** El código de un archivo sin sus líneas de comentario entero (`//`, `/*`, ` * `): una cabecera que NOMBRA un archivo no lo carga. */
  const sinLineasDeComentario = (texto) => texto.split('\n').filter((l) => !/^\s*(?:\/\/|\/\*|\*)/.test(l)).join('\n');

  /** Cómo se nombra un archivo cuando un código lo CARGA o lo LEE: `lib('x/y.js')`, `../lib/x/y.js`, `functions/src/x/y.ts`, `x/index` también como directorio. */
  const patronDeCarga = (ruta) => {
    const sin = ruta.replace(/\.ts$/, '');
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const completo = `(?:lib/|src/|['"\`])${esc(sin)}(?:\\.(?:js|ts))?(?=['"\`])`;
    const directorio = sin.endsWith('/index') ? `|(?:lib/|src/)${esc(sin.slice(0, -'/index'.length))}(?=['"\`])` : '';
    return new RegExp(completo + directorio);
  };

  /**
   * El respaldo de una entrada: lo que la hace verdad y se mantiene verdad. Devuelve los problemas (vacío = en orden).
   * `repo` es la vista del repositorio: { texto(ruta del repo) → string|null, enCadena(suite) → bool, codigoFueraDeSrc() → [{ r, texto }] }.
   */
  const problemasDeRespaldo = (e, repo, importadoresEnSrc) => {
    const problemas = [];
    const carga = patronDeCarga(e.ruta);
    const suite = (nombre, como) => {
      const texto = repo.texto(`functions/test/${nombre}`);
      if (texto === null) problemas.push(`${como} ${nombre}: no existe`);
      else {
        if (!repo.enCadena(nombre)) problemas.push(`${como} ${nombre}: no está en la cadena de \`npm test\``);
        if (!carga.test(sinLineasDeComentario(texto))) problemas.push(`${como} ${nombre}: ya no nombra ${e.ruta}`);
      }
    };
    for (const s of e.suites || []) suite(s, 'suite');
    if ((e.clase === 'SOLO_PRUEBAS' || e.clase === 'PLANEADO_CERRADO') && !(e.suites || []).length) problemas.push('ninguna suite de la cadena lo ejercita');
    if (e.clase === 'CONSUMIDOR_FUERA_DEL_GRAFO') {
      const texto = e.consumidor ? repo.texto(e.consumidor) : null;
      if (texto === null) problemas.push(`consumidor ${e.consumidor || '(ninguno)'}: no existe`);
      else if (!sinLineasDeComentario(texto).includes(e.ruta)) problemas.push(`consumidor ${e.consumidor}: ya no nombra ${e.ruta}`);
      if (!e.copia || repo.texto(e.copia) === null) problemas.push(`copia ${e.copia || '(ninguna)'}: no existe`);
    }
    if (e.clase === 'HUERFANO_REAL') {
      const pines = e.fijadoPor || [];
      if (!pines.length) problemas.push('ninguna prueba fija que existe');
      for (const s of pines) suite(s, 'fijado por');
      const otros = repo.codigoFueraDeSrc().filter((f) => !pines.some((s) => f.r === `functions/test/${s}`) && carga.test(sinLineasDeComentario(f.texto))).map((f) => f.r);
      if (otros.length) problemas.push(`lo usa algo más (${otros.join(', ')}): ¿sigue siendo un residuo?`);
      if (importadoresEnSrc.length) problemas.push(`lo importa ${importadoresEnSrc.join(', ')}: ¿sigue siendo un residuo?`);
    }
    return problemas;
  };

  /* ── El árbol real, leído una vez ──────────────────────────────────────────────────────────────────────────────── */

  const relSrc = (abs) => path.relative(SRC, abs).split(path.sep).join('/');
  /* TODO lo que hay, también un `.d.ts` (que `andar` aparta): lo que el guardián no sabe leer tiene que verse, no callarse. */
  const listarTodo = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) listarTodo(p, out); else out.push(p); }
    return out;
  };
  const todosLosArchivos = listarTodo(SRC).sort();
  const esFuente = (a) => a.endsWith('.ts') && !a.endsWith('.d.ts');
  const fuentes = new Map(todosLosArchivos.filter(esFuente).map((a) => [relSrc(a), fs.readFileSync(a, 'utf8')]));
  const extraidos = new Map([...fuentes].map(([r, t]) => [r, importsDeTexto(r, t)]));
  const importsDeSrc = new Map([...extraidos].map(([r, e]) => [r, e.especificadores]));
  const existentes = new Set(importsDeSrc.keys());
  const alcance = alcanceDe(importsDeSrc, RAIZ_DEL_ALCANCE);
  const importadoresDe = (ruta) => [...alcance.aristas].filter(([, destinos]) => destinos.has(ruta)).map(([desde]) => desde).sort();

  const suitesDeLaCadena = new Set(JSON.parse(leer('functions/package.json')).scripts.test.split('&&').map((p) => p.trim())
    .filter((p) => /^node test\/\S+$/.test(p)).map((p) => p.slice('node test/'.length)));
  let codigoDeFuera = null;
  const repoReal = {
    texto: (r) => (existe(r) ? leer(r) : null),
    enCadena: (s) => suitesDeLaCadena.has(s),
    /* Lo que podría usar un archivo de src sin pasar por el grafo: las suites, los scripts y las operaciones. Sin esta suite: nombra todos los de la lista. */
    codigoFueraDeSrc: () => (codigoDeFuera ||= ['functions/test', 'scripts', 'ops'].flatMap((d) => andar(path.resolve(RAIZ, d), '.mjs'))
      .filter((abs) => abs !== fileURLToPath(import.meta.url))
      .map((abs) => ({ r: path.relative(RAIZ, abs).split(path.sep).join('/'), texto: fs.readFileSync(abs, 'utf8') }))),
  };
  const conciliacion = conciliar(alcance.huerfanos, HUERFANOS_ADMITIDOS, existentes);

  /* ── Lo medido sobre el árbol real ─────────────────────────────────────────────────────────────────────────────── */

  const noTs = todosLosArchivos.filter((a) => !esFuente(a)).map(relSrc);
  check(`190) el guardián mira todo lo que hay en functions/src: ${todosLosArchivos.length} archivos y todos son .ts (ningún .js, .tsx, .d.ts o .json se queda sin mirar)`,
    todosLosArchivos.length > 0 && noTs.length === 0, noTs.join(', '));
  check('191) el grafo se recorre: el índice existe y se alcanzan más de doscientos archivos',
    existentes.has(RAIZ_DEL_ALCANCE) && alcance.alcanzados.size > 200,
    `${alcance.alcanzados.size} alcanzados de ${existentes.size} · ${alcance.huerfanos.length} huérfanos · ${[...existentes].filter((r) => r.startsWith('core/')).length} del Core, todos alcanzados: ${[...existentes].filter((r) => r.startsWith('core/')).every((r) => alcance.alcanzados.has(r))}`);
  const dinamicos = [...extraidos].filter(([, e]) => e.noLiterales > 0).map(([r, e]) => `${r} (${e.noLiterales})`);
  check('192) toda arista se resuelve: ningún import relativo apunta a un archivo que no está en src, y ningún import()/require() lleva una expresión en vez de una cadena',
    alcance.sinResolver.length === 0 && dinamicos.length === 0, [...alcance.sinResolver, ...dinamicos].join(', '));
  check('193) los archivos que nadie alcanza desde index.ts están TODOS en la lista: ningún huérfano sin motivo',
    conciliacion.sinMotivo.length === 0,
    conciliacion.sinMotivo.length ? `huérfano nuevo: ${conciliacion.sinMotivo.join(', ')} → conéctalo (que lo importe un módulo que llegue a index.ts) o añade su entrada a HUERFANOS_ADMITIDOS` : '');
  check('194) y la lista no se pudre: ninguna entrada es ya alcanzable ni de un archivo que ya no existe',
    conciliacion.yaAlcanzable.length === 0 && conciliacion.inexistente.length === 0,
    [conciliacion.yaAlcanzable.length ? `ya se alcanza: ${conciliacion.yaAlcanzable.join(', ')} → quita su entrada` : '',
      conciliacion.inexistente.length ? `ya no existe: ${conciliacion.inexistente.join(', ')} → quita su entrada` : ''].filter(Boolean).join(' · '));
  const deLaLista = problemasDeLaLista(HUERFANOS_ADMITIDOS);
  const porClase = CLASES_DE_HUERFANO.map((c) => `${HUERFANOS_ADMITIDOS.filter((e) => e.clase === c).length} ${c}`).join(' · ');
  check(`195) la lista está bien formada: ${HUERFANOS_ADMITIDOS.length} entradas (${porClase}), con motivo, rutas canónicas y sin repetidos`, deLaLista.length === 0, deLaLista.join(' · '));
  const sinRespaldo = HUERFANOS_ADMITIDOS.flatMap((e) => problemasDeRespaldo(e, repoReal, importadoresDe(e.ruta)).map((p) => `${e.ruta}: ${p}`));
  check('196) cada motivo está respaldado: las suites que lo ejercitan existen, están en la cadena y lo nombran; el consumidor de fuera del grafo existe y lo nombra; el residuo no lo usa nadie',
    sinRespaldo.length === 0, sinRespaldo.join(' · '));
  const cargadosPorLib = [...VIVOS].filter((r) => r.endsWith('.js')).map((r) => r.replace(/\.js$/, '.ts')).filter((r) => existentes.has(r));
  const seEscaparon = cargadosPorLib.filter((r) => !alcance.alcanzados.has(r));
  check(`197) el extractor no se deja ninguna arista: lo que carga el compilado (${cargadosPorLib.length} módulos) lo alcanzan también las fuentes`, seEscaparon.length === 0,
    seEscaparon.length ? `cargados por lib y sin alcanzar en src: ${seEscaparon.join(', ')} → el extractor no reconoce alguna forma de import` : '');

  /* ── Las dos pruebas del control, sobre grafos de mentira ──────────────────────────────────────────────────────── */

  const delTexto = (arbol) => new Map([...arbol].map(([r, t]) => [r, importsDeTexto(r, t).especificadores]));
  const huerfanosDe = (arbol) => alcanceDe(delTexto(arbol), 'index.ts').huerfanos;
  const nada = '';

  /* (a) un archivo conectado de CUALQUIERA de las formas no se rechaza */
  const FORMAS = [
    ['import … from', `import { x } from './destino';`, ['destino.ts']],
    ['import por defecto y espacio de nombres', `import d from './destino';\nimport * as ns from './destino';`, ['destino.ts']],
    ['export * from', `export * from './destino';`, ['destino.ts']],
    ['export { … } from', `export { x } from './destino';`, ['destino.ts']],
    ['export * as ns from', `export * as ns from './destino';`, ['destino.ts']],
    ['import() con cadena literal', `export const carga = async () => (await import('./destino')).x;`, ['destino.ts']],
    ['import() con plantilla sin sustituciones', 'export const carga = () => import(`./destino`);', ['destino.ts']],
    ['import de efecto', `import './destino';`, ['destino.ts']],
    ['import type', `import type { T } from './destino';`, ['destino.ts']],
    ['import con especificador de tipo', `import { type T } from './destino';`, ['destino.ts']],
    ['export type … from', `export type { T } from './destino';`, ['destino.ts']],
    ['import x = require()', `import destino = require('./destino');`, ['destino.ts']],
    ['require() con cadena literal', `const destino = require('./destino');`, ['destino.ts']],
    ['import() dentro de un tipo', `export type T = import('./destino').Tipo;`, ['destino.ts']],
    ['extensión implícita (x → x.ts)', `import './subcarpeta/pieza';`, ['subcarpeta/pieza.ts']],
    ['index.ts de directorio', `import './subcarpeta';`, ['subcarpeta/index.ts']],
    ['index.ts de directorio con barra final', `import './subcarpeta/';`, ['subcarpeta/index.ts']],
    ['hacia arriba (../)', `import './intermedio/puente';`, ['intermedio/puente.ts', 'destino.ts'], { 'intermedio/puente.ts': `import '../destino';` }],
    ['encadenado (a → b → c)', `import './a';`, ['a.ts', 'b.ts', 'c.ts'], { 'a.ts': `import './b';`, 'b.ts': `export * from './c';` }],
  ];
  const formasQueFallan = FORMAS.filter(([, texto, archivos, textos]) => {
    const arbol = new Map([['index.ts', texto], ...archivos.map((a) => [a, (textos && textos[a]) || nada])]);
    return huerfanosDe(arbol).length !== 0;
  }).map(([nombre]) => nombre);
  check(`198) un archivo conectado de cualquiera de las ${FORMAS.length} formas soportadas NO se rechaza (grafo de mentira)`, formasQueFallan.length === 0, formasQueFallan.join(', '));

  const sinConectar = [
    ['un archivo que nadie importa', new Map([['index.ts', nada], ['suelto.ts', nada]]), ['suelto.ts']],
    ['dos huérfanos que se importan entre sí: tener importador no es estar alcanzado', new Map([['index.ts', nada], ['a.ts', `import './b';`], ['b.ts', `import './a';`]]), ['a.ts', 'b.ts']],
    ['un huérfano que importa algo conectado no se conecta por ello (las aristas tienen sentido)', new Map([['index.ts', `import './real';`], ['real.ts', nada], ['suelto.ts', `import './real';`]]), ['suelto.ts']],
    ['lo que solo menciona un comentario o una cadena', new Map([['index.ts', `// import './fantasma';\n/* import './fantasma'; */\nexport const t = "import './fantasma'";`], ['fantasma.ts', nada]]), ['fantasma.ts']],
    ['un paquete con el mismo nombre que un archivo', new Map([['index.ts', `import 'sharp';`], ['sharp.ts', nada]]), ['sharp.ts']],
    ['solo lo importa algo de fuera de src (una suite, un script): no es una arista', new Map([['index.ts', nada], ['solo-pruebas.ts', nada]]), ['solo-pruebas.ts']],
    ['un archivo con el nombre del directorio pero sin ser su index', new Map([['index.ts', `import './x';`], ['x/index.ts', nada], ['x/otro.ts', nada]]), ['x/otro.ts']],
  ];
  const sinConectarMal = sinConectar.filter(([, arbol, esperados]) => !igual(huerfanosDe(arbol), esperados)).map(([nombre]) => nombre);
  check(`199) y un huérfano SÍ se detecta, también cuando tiene importador o un comentario lo nombra (${sinConectar.length} casos de mentira)`, sinConectarMal.length === 0, sinConectarMal.join(' · '));
  const sinResolverDeMentira = alcanceDe(delTexto(new Map([['index.ts', `import './no-existe';\nimport './existe';`], ['existe.ts', nada]])), 'index.ts').sinResolver;
  check('199b) una arista perdida (un import relativo que no apunta a nada) se informa, no se calla', igual(sinResolverDeMentira, ['index.ts → ./no-existe']), sinResolverDeMentira.join(', '));

  /* ── Sabotajes: el control FALLA cuando debe. Sobre el árbol real, en memoria (no se toca el disco) ───────────── */

  /* Cada sabotaje se juzga por lo que AÑADE a los fallos del árbol real: así un árbol ya roto ni disfraza ni duplica el sabotaje. */
  const fallosNuevos = (c) => ({
    sinMotivo: c.sinMotivo.filter((r) => !conciliacion.sinMotivo.includes(r)),
    yaAlcanzable: c.yaAlcanzable.filter((r) => !conciliacion.yaAlcanzable.includes(r)),
    inexistente: c.inexistente.filter((r) => !conciliacion.inexistente.includes(r)),
  });
  const sabotajes = [];
  /* i) añadir un huérfano */
  {
    const m = new Map(importsDeSrc).set('zz-huerfano-de-prueba.ts', ['./index']);
    const nuevos = fallosNuevos(conciliar(alcanceDe(m, RAIZ_DEL_ALCANCE).huerfanos, HUERFANOS_ADMITIDOS, new Set(m.keys())));
    sabotajes.push(['(i) añadir un huérfano de prueba', igual(nuevos.sinMotivo, ['zz-huerfano-de-prueba.ts']) && nuevos.yaAlcanzable.length === 0 && nuevos.inexistente.length === 0]);
  }
  /* ii) dejar en la lista un archivo ya alcanzable: una entrada de un archivo conectado, y conectar uno de los listados sin quitar su entrada */
  {
    const nuevos = fallosNuevos(conciliar(alcance.huerfanos, [...HUERFANOS_ADMITIDOS, { ruta: 'creator/index.ts', clase: 'SOLO_PRUEBAS', motivo: nada }], existentes));
    sabotajes.push(['(ii) una entrada de un archivo ya conectado (creator/index.ts)', igual(nuevos.yaAlcanzable, ['creator/index.ts']) && nuevos.sinMotivo.length === 0]);
  }
  {
    const elegido = HUERFANOS_ADMITIDOS.find((e) => e.clase === 'SOLO_PRUEBAS').ruta;
    const m = new Map(importsDeSrc).set(RAIZ_DEL_ALCANCE, [...importsDeSrc.get(RAIZ_DEL_ALCANCE), `./${elegido.replace(/\.ts$/, '')}`]);
    const nuevos = fallosNuevos(conciliar(alcanceDe(m, RAIZ_DEL_ALCANCE).huerfanos, HUERFANOS_ADMITIDOS, existentes));
    sabotajes.push([`(ii) conectar un archivo de la lista (${elegido}) sin quitar su entrada`, nuevos.yaAlcanzable.includes(elegido) && nuevos.sinMotivo.length === 0]);
  }
  {
    const nuevos = fallosNuevos(conciliar(alcance.huerfanos, [...HUERFANOS_ADMITIDOS, { ruta: 'ya-no-existe.ts', clase: 'SOLO_PRUEBAS', motivo: nada }], existentes));
    sabotajes.push(['(ii) una entrada de un archivo que ya no existe', igual(nuevos.inexistente, ['ya-no-existe.ts']) && nuevos.sinMotivo.length === 0]);
  }
  /* iii) borrar el import que conectaba un archivo: uno alcanzado con un único importador (el primero por nombre) */
  const conectadoPorUno = [...alcance.alcanzados].sort().find((r) => r !== RAIZ_DEL_ALCANCE && importadoresDe(r).length === 1 && alcance.alcanzados.has(importadoresDe(r)[0]));
  {
    const nuevos = fallosNuevos(conciliar(alcanceDe(sinAristasHacia(importsDeSrc, conectadoPorUno), RAIZ_DEL_ALCANCE).huerfanos, HUERFANOS_ADMITIDOS, existentes));
    sabotajes.push([`(iii) borrar el import que conectaba ${conectadoPorUno} (lo importaba solo ${importadoresDe(conectadoPorUno)[0]})`, nuevos.sinMotivo.includes(conectadoPorUno)]);
  }
  /* y las que miden la lista y el respaldo */
  sabotajes.push(['(iv) una entrada sin motivo, con clase inventada o repetida', problemasDeLaLista([{ ruta: 'a.ts', clase: 'SOLO_PRUEBAS', motivo: 'corto' }]).length === 1
    && problemasDeLaLista([{ ruta: 'a.ts', clase: 'INVENTADA', motivo: 'x'.repeat(50) }]).length === 1
    && problemasDeLaLista([{ ruta: 'a.ts', clase: 'SOLO_PRUEBAS', motivo: 'x'.repeat(50) }, { ruta: 'a.ts', clase: 'SOLO_PRUEBAS', motivo: 'x'.repeat(50) }]).length === 1
    && problemasDeLaLista([{ ruta: 'functions/src/a.ts', clase: 'SOLO_PRUEBAS', motivo: 'x'.repeat(50) }]).length === 1]);
  {
    const falso = (textos, cadena, fuera = []) => ({ texto: (r) => (r in textos ? textos[r] : null), enCadena: (s) => cadena.includes(s), codigoFueraDeSrc: () => fuera });
    const solo = { ruta: 'x/y.ts', clase: 'SOLO_PRUEBAS', suites: ['y.test.mjs'] };
    const bien = falso({ 'functions/test/y.test.mjs': `const y = lib('x/y.js');` }, ['y.test.mjs']);
    const respaldo = [
      problemasDeRespaldo(solo, bien, []).length === 0,
      problemasDeRespaldo(solo, falso({}, ['y.test.mjs']), []).length === 1, /* la suite desapareció */
      problemasDeRespaldo(solo, falso({ 'functions/test/y.test.mjs': `const y = lib('x/y.js');` }, []), []).length === 1, /* ya no está en la cadena */
      problemasDeRespaldo(solo, falso({ 'functions/test/y.test.mjs': `const z = lib('core/x/y.js');` }, ['y.test.mjs']), []).length === 1, /* nombra OTRO x/y */
      problemasDeRespaldo(solo, falso({ 'functions/test/y.test.mjs': `// const y = lib('x/y.js');\n/**\n * ver lib('x/y.js')\n */` }, ['y.test.mjs']), []).length === 1, /* solo un comentario lo nombra */
      problemasDeRespaldo({ ruta: 'x/y.ts', clase: 'PLANEADO_CERRADO', suites: [] }, bien, []).length === 1, /* sin ninguna suite */
      problemasDeRespaldo({ ruta: 'f/g.ts', clase: 'CONSUMIDOR_FUERA_DEL_GRAFO', consumidor: 'scripts/gen.mjs', copia: 'app/f/g.ts' }, falso({ 'scripts/gen.mjs': `['f/g.ts']`, 'app/f/g.ts': nada }, []), []).length === 0,
      problemasDeRespaldo({ ruta: 'f/g.ts', clase: 'CONSUMIDOR_FUERA_DEL_GRAFO', consumidor: 'scripts/gen.mjs', copia: 'app/f/g.ts' }, falso({ 'scripts/gen.mjs': `['otro.ts']`, 'app/f/g.ts': nada }, []), []).length === 1, /* el script ya no lo nombra */
      problemasDeRespaldo({ ruta: 'f/g.ts', clase: 'CONSUMIDOR_FUERA_DEL_GRAFO', consumidor: 'scripts/gen.mjs', copia: 'app/f/g.ts' }, falso({ 'scripts/gen.mjs': `['f/g.ts']` }, []), []).length === 1, /* la copia no existe */
    ];
    sabotajes.push(['(v) el respaldo de una entrada se cae si la suite desaparece, sale de la cadena, deja de nombrarlo (o solo lo nombra un comentario) o el script ya no lo lee', respaldo.every(Boolean)]);
    const residuo = { ruta: 'r/z.ts', clase: 'HUERFANO_REAL', fijadoPor: ['pin.test.mjs'] };
    const pin = falso({ 'functions/test/pin.test.mjs': `fs.existsSync('functions/src/r/z.ts')` }, ['pin.test.mjs']);
    const conOtro = falso({ 'functions/test/pin.test.mjs': `fs.existsSync('functions/src/r/z.ts')` }, ['pin.test.mjs'], [{ r: 'functions/test/otra.test.mjs', texto: `lib('r/z.js')` }]);
    sabotajes.push(['(vi) un residuo deja de serlo si otra suite lo carga o un módulo lo importa',
      problemasDeRespaldo(residuo, pin, []).length === 0 && problemasDeRespaldo(residuo, conOtro, []).length === 1 && problemasDeRespaldo(residuo, pin, ['a.ts']).length === 1]);
  }
  sabotajes.forEach(([nombre, muerde], i) => check(`${200 + i}) sabotaje ${nombre}: el control falla y nombra lo que corresponde`, muerde));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
