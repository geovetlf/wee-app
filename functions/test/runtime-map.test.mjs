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
import { fileURLToPath } from 'node:url';

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
 * EL MAPA. Es la única parte de este archivo que se edita a mano.
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
    'ALGORITHM_CONTRACT_VERSION'],
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
  'core/media/objeto.js': ['PIEZA_ORIGINAL', 'RAIZ_DE_CUENTAS', 'claveDelObjeto', 'claveEsDeLaCuenta', 'objetoEsDeLaCuenta', 'objetoValido', 'prefijoDeCuenta', 'referenciaDelObjeto'],
  'core/media/puerto.js': ['CAPACIDADES_DE_MC1', 'falloDeAlmacen'],
  'core/media/registro.js': ['crearRegistroDeMedios'],
  'core/media/subida.js': ['decidirSubida', 'identidadDeIntento', 'tamanoAprobado', 'tipoDeContenidoAceptable', 'topeDeSubida', 'vigenciaDeSubidaAprobada'],
  'core/media/proceso.js': ['CAPACIDADES_DE_MC4', 'LIMITES_DE_TRANSFORMACION', 'decidirProceso', 'leerPaqueteDeProceso', 'transformacionValida', 'varianteDeResultado'],
  /* MC-7 · los mide MC-4, que SÍ se despliega por el canary. Medir sigue apagado: nadie pasa medidor. */
  'core/media/uso.js': ['usoDeEscritura', 'usoDeLectura', 'usoDeOperacion'],
  'core/media/procesador.js': ['falloDeProceso'],
  'core/media/entrega.js': ['decidirEntrega', 'huellaDeEntrega'],
};

/* Las Functions que producción expone, y de qué módulo sale cada una. */
const FUNCTIONS = {
  './generateAvatar': ['generateAvatarWithGemini', 'avatarReplacement'],
  './creator': ['creatorChat', 'creatorQuote', 'creatorRun'],
  './creator/brain': ['brainChat', 'brainQuote'],
  './creator/video': ['generateVideo'],
  './engine/webhooks': ['seedanceCallback'],
  './public/postPage': ['publicPostPage'],
  './engine/admin': ['engineAdmin'],
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
  check('5) y son treinta y cinco: las treinta y dos de antes, Elements (S5), Scenes/Shots (C3) y Productions (F1-B)', reales.length === 35, `${reales.length}`);
  /*
   * ── LA PRUEBA DE QUE ESTA GUARDA SIGUE MORDIENDO (S5) ────────────────────
   *
   * S5, C3 y F1-B tuvieron que tocar este mapa: cada una añadió una Function
   * —`elements`, `shots` y `productions`—. Actualizar una guarda es la forma más
   * fácil de desactivarla sin querer, así que aquí se demuestra que sigue
   * haciendo su trabajo: se le presenta una Function que NADIE declaró y se
   * comprueba que la detectaría.
   */
  const inventada = [...reales, 'functionQueNadieDeclaro'];
  check('5b) y la guarda SIGUE PROTEGIENDO: una Function sin clasificar se detecta',
    inventada.filter((f) => !declaradas.includes(f)).join(',') === 'functionQueNadieDeclaro'
    && inventada.length !== 35);

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
  const soloDeProductions = [...quienNombra].filter(([, quien]) => [...quien].every(deFilmmaker)).map(([s]) => s);
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
   */
  const embudo = donde(/\bengine\.generate\(/, (r) => !r.startsWith('core/'));
  check('102) todo lo que pide IA entra por un único embudo: `engine.generate`',
    igual(embudo, ['creator/brain.ts', 'creator/index.ts', 'engine/video.ts', 'gateway/index.ts']), embudo.join(', '));
  check('103) y a `runCapability` solo lo llama Weë Creator', igual(donde(/\brunCapability\(/, (r) => r !== 'gateway/index.ts'), ['creator/index.ts', 'creator/planner.ts']));
  /*
   * LA ÚNICA DUPLICACIÓN DE RUNTIME QUE EXISTE HOY, y está a la vista a propósito:
   * el avatar del Perfil Weë habla con el proveedor por su cuenta, sin router,
   * sin límites y sin dejar fila en `aiGenerations`. Cobra bien (Credit Engine),
   * pero es un segundo camino hacia un proveedor. Esta comprobación no lo
   * bendice: lo acota. Un tercero la hace fallar.
   */
  const fueraDelMotor = donde(/generativelanguage\.googleapis|GoogleGenAI|@google\/genai|api\.elevenlabs|api\.deepseek|api\.openai|bytepluses|volces/i,
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
  check('112) y su fábrica la invocan DOS módulos vivos: los dos canaries declarados (Brain texto, Studio vídeo)', igual(fabrica, ['creator/brain.js', 'creator/video.js', 'runtime/index.js']), fabrica.join(', '));
  const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const fuentes = andar(SRC, '.ts').map((abs) => ({ r: path.relative(SRC, abs).split(path.sep).join('/'), src: sinComentarios(fs.readFileSync(abs, 'utf8')) }));
  const conductores = fuentes.filter((f) => /export const crearConductor\b/.test(f.src)).map((f) => f.r);
  check('113) hay UN conductor. Un segundo sería el segundo runtime que esta fase existe para impedir', igual(conductores, ['runtime/conductor.ts']), conductores.join(', '));
  const puertas = fuentes.filter((f) => /decidirRuntime\(/.test(f.src) && !f.r.startsWith('runtime/')).map((f) => f.r);
  check('114) la puerta CORE/LEGACY la consultan EXACTAMENTE dos callables: `brainChat` y `generateVideo`', igual(puertas, ['creator/brain.ts', 'creator/video.ts']), puertas.join(', '));
  const pensadores = fuentes.filter((f) => /pensadorSobreConductor\(/.test(f.src) && !f.r.startsWith('runtime/')).map((f) => f.r);
  check('116) Weë Brain puede pensar por el conductor, y el camino de siempre sigue entero al lado', igual(pensadores, ['creator/brain.ts']) && /engine\.generate\(/.test(leer('functions/src/creator/brain.ts')), pensadores.join(', '));
  /* UNA capacidad, escrita en el código: la configuración de la puerta puede cerrar el canary, nunca ampliarlo. */
  const brainVivo = sinComentarios(leer('functions/src/creator/brain.ts'));
  check("117) y solo `text.generate` puede cruzarla: la capacidad del canary está en el código, no en la configuración",
    /CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate'/.test(brainVivo) && /porElCore = puerta\.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY/.test(brainVivo));
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
  };
  let n = 120;
  for (const [fn, servicio] of Object.entries(ESPERADO)) check(`${n++}) \`${fn}\` la invoca ${servicio}, y nadie más`, igual(quienNombraLaCallable(fn), [servicio]), quienNombraLaCallable(fn).join(', '));
  check(`${n++}) el flujo guiado y el chat de Weë Brain tienen pantallas detrás`, importadores('creatorService').includes('screens/CreatorFlowScreen.tsx') && importadores('brainService').includes('hooks/useBrainChat.ts'));
  /* Desplegada, protegida por pruebas y sin nadie que la llame: el vídeo real entra por `creatorRun`. No se borra: se sabe. */
  check(`${n++}) \`generateVideo\` está desplegada pero ninguna pantalla importa su servicio`, importadores('videoService').length === 0, importadores('videoService').join(', '));
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

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
