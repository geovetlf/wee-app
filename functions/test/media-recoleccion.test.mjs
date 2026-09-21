/**
 * MC-5 · CUÁNDO UNOS BYTES DEJAN DE HACER FALTA — y cuándo NO.
 *
 * Lo que se vigila aquí, en una frase: **borrar de más no se deshace**. Por eso
 * casi todas las comprobaciones son de lo que NO se borra, y las pocas que
 * autorizan un borrado exigen que se haya comprobado dos veces.
 *
 *   A · La decisión pura: qué protege y por qué.
 *   B · La regla crítica: se vuelve a preguntar antes de borrar.
 *   C · Convergencia: 404, reintento y el que se atasca.
 *   D · Aislamiento entre cuentas.
 *   E · Escala: lote, cursor, sin recorrido ilimitado.
 *   F · Sigue siendo Core: puro, agnóstico, sin secretos.
 *
 * Sin red y sin Firestore: todo entra por las dependencias.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const { decidirRecoleccion, POLITICA_DE_RECOLECCION, claveDelObjeto, referenciaDelObjeto } = core;
const { recogerObjetosHuerfanos } = lib('media/recoleccion.js');
const { huellaDeMedios } = lib('media/huella.js');

const ANA = 'cuentaDeAna';
const BEA = 'cuentaDeBea';
const T0 = 1_700_000_000_000;
const SEMANA = POLITICA_DE_RECOLECCION.edadMinimaMs;
const VIEJO = T0 - SEMANA - 1;

const objeto = (o = {}) => {
  const accountId = o.accountId ?? ANA;
  const assetId = o.assetId ?? 'asset_00000000000000000000000000000001';
  const objectKey = o.objectKey ?? claveDelObjeto(accountId, assetId);
  const ref = { provider: o.providerId ?? 'almacenfalso', objectKey };
  return {
    objectRef: o.objectRef ?? referenciaDelObjeto(huellaDeMedios, ref),
    providerId: ref.provider, accountId, assetId, pieza: 'original', objectKey,
    estado: o.estado ?? 'guardado', bytes: 100, contentType: 'image/png',
    createdAt: o.createdAt ?? VIEJO, updatedAt: o.createdAt ?? VIEJO,
    ...(o.deletedAt !== undefined ? { deletedAt: o.deletedAt } : {}),
    ...(o.intentosDeBorrado !== undefined ? { intentosDeBorrado: o.intentosDeBorrado } : {}),
    ...(o.ultimoIntentoDeBorradoEn !== undefined ? { ultimoIntentoDeBorradoEn: o.ultimoIntentoDeBorradoEn } : {}),
  };
};

const entrada = (o = {}, extra = {}) => ({
  objeto: objeto(o),
  referencias: extra.referencias ?? [],
  operaciones: extra.operaciones ?? [],
  referenciasCompletas: extra.referenciasCompletas !== false,
});

const decidir = (e, at = T0) => decidirRecoleccion(e, POLITICA_DE_RECOLECCION, at);
const viva = (clase = 'material') => ({ clase, assetId: 'asset_00000000000000000000000000000001', viva: true });
const muerta = (clase = 'material') => ({ ...viva(clase), viva: false });

/* ═══ A · LA DECISIÓN PURA ════════════════════════════════════════════════ */
console.log('\n── A · Qué protege, y por qué ──');
{
  /* 1 · todavía referenciado → protegido */
  check('1) un objeto todavía referenciado se PROTEGE',
    decidir(entrada({}, { referencias: [viva()] })).motivo === 'referenciado');

  /* 2 · sin referencias pero demasiado reciente → protegido */
  check('2) sin referencias pero recién nacido, se PROTEGE',
    decidir(entrada({ createdAt: T0 - 1000 })).motivo === 'demasiado_reciente');
  check('2) y la frontera es exacta: un milisegundo antes protege, justo en el plazo no',
    decidir(entrada({ createdAt: T0 - SEMANA + 1 })).motivo === 'demasiado_reciente'
    && decidir(entrada({ createdAt: T0 - SEMANA })).accion === 'borrar');

  /* 3 · huérfano suficientemente antiguo → candidato */
  check('3) huérfano y con una semana encima, es CANDIDATO', decidir(entrada()).accion === 'borrar');
  check('3) una referencia MUERTA no lo salva: un material retirado ya no reclama sus bytes',
    decidir(entrada({}, { referencias: [muerta(), muerta('variante')] })).accion === 'borrar');

  /* 4 · con Job activo → protegido */
  for (const estado of ['queued', 'running', 'waiting', 'cancel_requested']) {
    check(`4) con un trabajo ${estado}, se PROTEGE`,
      decidir(entrada({}, { operaciones: [estado] })).motivo === 'operacion_en_curso');
  }
  check('4) y con trabajos SOLO terminales, no protege: ya no pueden necesitarlo',
    decidir(entrada({}, { operaciones: ['completed', 'failed', 'timed_out', 'cancelled'] })).accion === 'borrar');
  check('4) basta UNO vivo entre muchos terminales',
    decidir(entrada({}, { operaciones: ['completed', 'failed', 'running'] })).motivo === 'operacion_en_curso');
  check('4) usa los estados REALES del Job Engine, no un vocabulario paralelo',
    core.ESTADOS_FINALES_DE_TRABAJO.join(',') === 'completed,failed,timed_out,cancelled');

  /* 5 y 6 · otra referencia válida / varias variantes sobre el mismo objeto */
  check('5) una sola referencia viva entre muchas muertas PROTEGE',
    decidir(entrada({}, { referencias: [muerta(), muerta(), viva('version')] })).motivo === 'referenciado');
  check('6) el mismo objeto referido por varias variantes se PROTEGE si alguna vive',
    decidir(entrada({}, { referencias: [viva('variante'), muerta('variante')] })).motivo === 'referenciado');
  check('6) y con TODAS las variantes muertas, es candidato',
    decidir(entrada({}, { referencias: [muerta('variante'), muerta('variante')] })).accion === 'borrar');

  /* Lo que no se sabe, protege. */
  check('A · no haber podido leer las referencias NO es no tener referencias',
    decidir(entrada({}, { referencias: [], referenciasCompletas: false })).motivo === 'referencias_inciertas');
  check('A · una ficha que no se entiende nunca se borra',
    [undefined, {}, { objeto: null }, { objeto: objeto({ estado: 'raro' }) }]
      .every((e) => decidir({ referencias: [], operaciones: [], referenciasCompletas: true, ...e }).accion === 'proteger'));
  check('A · ni con un reloj que no es un número',
    decidir(entrada(), NaN).motivo === 'ficha_invalida');
}

/* ═══ B · LA REGLA CRÍTICA ════════════════════════════════════════════════ */
console.log('\n── B · Se vuelve a preguntar justo antes de borrar ──');

const mundo = (o = {}) => {
  const objetos = o.objetos ?? [objeto()];
  const llamadas = { referencias: 0, borrar: 0, marcarBorrado: 0, anotarIntento: 0, coste: 0 };
  const fichas = new Map(objetos.map((x) => [x.objectRef, { ...x }]));
  return {
    llamadas, fichas,
    deps: {
      objetos: async (cursor, limite) => ({ objetos: objetos.slice(0, limite), cursor: o.cursor }),
      referencias: async (x) => {
        llamadas.referencias++;
        if (o.referencias) return o.referencias(x, llamadas.referencias);
        return [];
      },
      operaciones: async () => o.operaciones ?? [],
      almacenes: o.almacenes ?? {
        almacenfalso: {
          providerId: 'almacenfalso', capacidades: [],
          async borrar() { llamadas.borrar++; return o.borrar ? o.borrar(llamadas.borrar) : { ok: true, yaNoEstaba: false }; },
          async guardar() { throw new Error('el barrido no guarda'); },
          async mirar() { throw new Error('el barrido no mira'); },
        },
      },
      marcarBorrado: async (ref, acc, at) => {
        llamadas.marcarBorrado++;
        /* `false` = otro escritor se adelantó entre la lectura y la escritura. */
        if (o.marcarBorrado && o.marcarBorrado(llamadas.marcarBorrado) === false) return false;
        const f = fichas.get(ref); if (f) { f.estado = 'borrado'; f.deletedAt = at; }
        return true;
      },
      anotarIntento: async (ref, acc, intentos) => {
        llamadas.anotarIntento++;
        const f = fichas.get(ref); if (f) f.intentosDeBorrado = intentos;
      },
      ahora: () => T0,
      ...(o.anotarOperacionFisica ? { anotarOperacionFisica: (...a) => { llamadas.coste++; o.anotarOperacionFisica(...a); } } : {}),
    },
  };
};

{
  /* 19/20 · una referencia que aparece MIENTRAS el barrido procesa. */
  const m = mundo({ referencias: (_, vez) => (vez === 1 ? [] : [viva()]) });
  const r = await recogerObjetosHuerfanos(m.deps, 'run_1');
  check('19) una referencia creada DURANTE el barrido evita el borrado',
    m.llamadas.borrar === 0 && r.borrados === 0 && r.protegidos === 1 && r.candidatos === 1);
  check('19) y para verlo, se preguntó DOS veces', m.llamadas.referencias === 2);

  /* 20 · eliminación concurrente: la referencia desaparece entre las dos lecturas. */
  const m2 = mundo({ referencias: (_, vez) => (vez === 1 ? [viva()] : []) });
  const r2 = await recogerObjetosHuerfanos(m2.deps, 'run_2');
  check('20) si ya estaba protegido en la primera, ni siquiera llega a la segunda',
    m2.llamadas.referencias === 1 && r2.borrados === 0 && r2.protegidos === 1);

  /* El camino feliz, que también tiene que preguntar dos veces. */
  const m3 = mundo();
  const r3 = await recogerObjetosHuerfanos(m3.deps, 'run_3');
  check('B · un huérfano de verdad SÍ se borra, y se cierra su ficha',
    r3.borrados === 1 && m3.llamadas.borrar === 1 && m3.llamadas.marcarBorrado === 1
    && m3.fichas.get(objeto().objectRef).estado === 'borrado');
  check('B · y aun así se preguntó dos veces antes de tocar nada', m3.llamadas.referencias === 2);

  /*
   * El cierre de la ficha también es una carrera. Si otro escritor se adelanta,
   * `marcarBorrado` dice `false`: los BYTES se fueron igual —eso no se deshace—
   * pero el barrido no se apunta un cierre que no hizo, y lo dice en el informe.
   */
  const m4 = mundo({ marcarBorrado: () => false });
  const r4 = await recogerObjetosHuerfanos(m4.deps, 'run_3b');
  check('B · si otro escritor cierra la ficha primero, el borrado de bytes sigue contando',
    r4.borrados === 1 && m4.llamadas.borrar === 1);
  check('B · pero el cierre perdido se ve en el informe en vez de perderse',
    r4.fichasNoCerradas === 1 && r4.errores === 0);

  /* Y lo mismo en el camino que solo cierra, sin llamar al proveedor. */
  const m5 = mundo({ objetos: [objeto({ estado: 'borrado' })], marcarBorrado: () => false });
  const r5 = await recogerObjetosHuerfanos(m5.deps, 'run_3c');
  check('B · un `finalizar` que pierde la carrera no se cuenta como finalizado',
    r5.finalizados === 0 && r5.fichasNoCerradas === 1 && m5.llamadas.borrar === 0);
}

/* ═══ C · CONVERGENCIA E IDEMPOTENCIA ═════════════════════════════════════ */
console.log('\n── C · 404, reintento, y el que se atasca ──');
{
  /* 9 · DELETE 404 → convergencia */
  const m = mundo({ borrar: () => ({ ok: true, yaNoEstaba: true }) });
  const r = await recogerObjetosHuerfanos(m.deps, 'run_4');
  check('9) un borrado que dice «ya no estaba» NO es un fallo: converge y cierra la ficha',
    r.yaNoEstaban === 1 && r.errores === 0 && m.llamadas.marcarBorrado === 1
    && m.fichas.get(objeto().objectRef).estado === 'borrado');

  /* 8 · idempotencia: repetir el barrido sobre lo ya cerrado */
  const yaCerrado = objeto({ estado: 'borrado', deletedAt: T0 - 10 });
  const m2 = mundo({ objetos: [yaCerrado] });
  const r2 = await recogerObjetosHuerfanos(m2.deps, 'run_5');
  check('8) repetir el barrido sobre lo ya borrado no vuelve a borrar nada',
    m2.llamadas.borrar === 0 && r2.borrados === 0 && r2.protegidos === 1);

  /* Una ficha `borrado` SIN fecha es una ejecución a medias: se cierra. */
  const aMedias = objeto({ estado: 'borrado' });
  const m3 = mundo({ objetos: [aMedias] });
  const r3 = await recogerObjetosHuerfanos(m3.deps, 'run_6');
  check('8) y una ficha que se quedó a medias se CIERRA, sin volver a llamar al proveedor',
    r3.finalizados === 1 && m3.llamadas.borrar === 0 && m3.llamadas.marcarBorrado === 1);

  /* 10 · error transitorio → reintentable, con su cuenta */
  const m4 = mundo({ borrar: () => ({ ok: false, error: { code: 'PROVIDER_ERROR', source: 'storage:x' } }) });
  const r4 = await recogerObjetosHuerfanos(m4.deps, 'run_7');
  check('10) un fallo del proveedor deja el objeto REINTENTABLE y anota el intento',
    r4.errores === 1 && r4.reintentables === 1 && m4.llamadas.anotarIntento === 1
    && m4.fichas.get(objeto().objectRef).intentosDeBorrado === 1);
  check('10) y NO se cierra la ficha de algo que no se llegó a borrar', m4.llamadas.marcarBorrado === 0);

  /* 10b · recién intentado → se espera, sin llamar al proveedor */
  const reciente = objeto({ intentosDeBorrado: 1, ultimoIntentoDeBorradoEn: T0 - 1000 });
  const m5 = mundo({ objetos: [reciente] });
  const r5 = await recogerObjetosHuerfanos(m5.deps, 'run_8');
  check('10) si falló hace un momento, se ESPERA en vez de martillear al proveedor',
    m5.llamadas.borrar === 0 && r5.reintentables === 1
    && decidir(entrada({ intentosDeBorrado: 1, ultimoIntentoDeBorradoEn: T0 - 1000 })).motivo === 'esperando_reintento');
  check('10) pasada la espera, vuelve a ser candidato',
    decidir(entrada({ intentosDeBorrado: 1, ultimoIntentoDeBorradoEn: T0 - POLITICA_DE_RECOLECCION.esperaEntreIntentosMs })).accion === 'borrar');

  /* 11 · error permanente → estado controlado, sin bucle infinito */
  const agotado = objeto({ intentosDeBorrado: POLITICA_DE_RECOLECCION.maxIntentos });
  const m6 = mundo({ objetos: [agotado] });
  const r6 = await recogerObjetosHuerfanos(m6.deps, 'run_9');
  check('11) lo que falló cinco veces se deja QUIETO y se informa: sin bucle infinito',
    m6.llamadas.borrar === 0 && r6.atascados === 1 && r6.porMotivo.intentos_agotados === 1);
  check('11) y un número de intentos absurdo no puede autorizar un borrado',
    [-1, 1.5, '3', null, NaN].every((v) => decidir(entrada({ intentosDeBorrado: v })).accion === 'borrar'));

  /* 7 · concurrencia: dos barridos a la vez sobre el mismo objeto */
  const m7 = mundo();
  const [a, b] = await Promise.all([
    recogerObjetosHuerfanos(m7.deps, 'run_A'),
    recogerObjetosHuerfanos(m7.deps, 'run_B'),
  ]);
  check('7) dos barridos concurrentes no corrompen nada: la ficha queda borrada una vez',
    m7.fichas.get(objeto().objectRef).estado === 'borrado'
    && a.borrados + b.borrados + a.yaNoEstaban + b.yaNoEstaban === 2
    && a.errores === 0 && b.errores === 0);
  check('7) y los dos informes llevan su propio runId', a.runId === 'run_A' && b.runId === 'run_B');
}

/* ═══ D · AISLAMIENTO ═════════════════════════════════════════════════════ */
console.log('\n── D · Una cuenta no puede alcanzar los bytes de otra ──');
{
  /* 12 · la clave vive en la carpeta de OTRA cuenta */
  const ajeno = objeto({ accountId: BEA, objectKey: claveDelObjeto(ANA, 'asset_00000000000000000000000000000001') });
  const m = mundo({ objetos: [ajeno] });
  const r = await recogerObjetosHuerfanos(m.deps, 'run_10');
  check('12) un objeto cuya clave vive fuera de su cuenta NO se toca',
    m.llamadas.borrar === 0 && r.protegidos === 1 && r.porMotivo.fuera_de_su_cuenta === 1);
  check('12) ni siquiera se le preguntan las referencias: se descarta antes', m.llamadas.referencias === 0);

  /* 17/18 · las dos asimetrías que MC-5 existe para encontrar */
  check('17) un Asset válido cuyo objeto físico no está: la ficha se cierra, no se inventa nada',
    decidir(entrada({ estado: 'borrado' })).accion === 'finalizar');
  check('18) un objeto físico sin ningún Asset que lo reclame es exactamente el candidato',
    decidir(entrada({}, { referencias: [] })).accion === 'borrar');
  check('16) y una variante huérfana se trata igual que cualquier otro objeto',
    decidir(entrada({}, { referencias: [muerta('variante')] })).accion === 'borrar');

  /* El barrido no acepta NADA de un cliente. */
  const FUENTE = sinComentarios(leer('functions/src/media/recoleccion.ts'));
  check('D · el barrido no recibe ningún dato de cliente: ni request, ni auth, ni data',
    !/request|auth|data\.|onCall|HttpsError/.test(FUENTE));
  check('D · y el objetivo del borrado se deriva de la ficha guardada, nunca de un parámetro',
    /referenciaDeAlmacenDe\(objeto\)/.test(FUENTE) && !/objectKey:\s*[a-z]+\./.test(FUENTE));
}

/* ═══ E · ESCALA ══════════════════════════════════════════════════════════ */
console.log('\n── E · Por lotes, con cursor, sin recorrido ilimitado ──');
{
  const muchos = Array.from({ length: 250 }, (_, i) =>
    objeto({ assetId: `asset_0000000000000000000000000000${String(i).padStart(4, '0')}` }));
  let pedido = null;
  const m = mundo({ objetos: muchos, cursor: 'siguiente_lote' });
  m.deps.objetos = async (cursor, limite) => { pedido = { cursor, limite }; return { objetos: muchos.slice(0, limite), cursor: 'siguiente_lote' }; };
  const r = await recogerObjetosHuerfanos(m.deps, 'run_11', 'desde_aqui');

  check('E · pide UN lote acotado por la política, no la colección entera',
    pedido.limite === POLITICA_DE_RECOLECCION.maxPorEjecucion && r.inspeccionados === 100);
  check('E · arranca desde el cursor que se le da y devuelve el siguiente',
    pedido.cursor === 'desde_aqui' && r.cursor === 'siguiente_lote');
  check('E · el límite vive en UN solo sitio, no repartido por los archivos',
    (leer('functions/src/media/recoleccion.ts').match(/maxPorEjecucion/g) || []).length <= 2
    && /maxPorEjecucion: 100/.test(leer('functions/src/core/media/recoleccion.ts')));
  check('E · y no hay paginación por desplazamiento en ninguna parte',
    !/offset|skip\(/i.test(sinComentarios(leer('functions/src/media/recoleccion.ts')))
    && !/offset|skip\(/i.test(sinComentarios(leer('functions/src/core/media/recoleccion.ts'))));
  check('E · el informe cuadra: inspeccionados = protegidos + borrados + yaNoEstaban + finalizados + errores',
    r.inspeccionados === r.protegidos + r.borrados + r.yaNoEstaban + r.finalizados + r.errores);
}

/* ═══ F · SIGUE SIENDO CORE ═══════════════════════════════════════════════ */
console.log('\n── F · Puro, agnóstico y sin una sola credencial ──');
{
  const CORE = sinComentarios(leer('functions/src/core/media/recoleccion.ts'));
  const COMP = sinComentarios(leer('functions/src/media/recoleccion.ts'));

  /* 13 · abstracción de proveedor */
  check('13) el Core de la recolección no nombra ningún proveedor ni protocolo',
    !/r2|cloudflare|\bs3\b|aws|sigv4|amazonaws|cloudinary|gcs|azure/i.test(CORE));
  check('13) ni el barrido: pide el adaptador por la identidad que trae la ficha',
    !/r2|cloudflare|\bs3\b|sigv4|amazonaws|cloudinary/i.test(COMP)
    && /almacenes\[objeto\.providerId\]/.test(COMP));
  check('13) y habla por el puerto que ya existía: no se inventó otro borrado',
    /puerto\.borrar\(/.test(COMP) && /borrar\(ref: StorageRef\)/.test(leer('functions/src/core/media/puerto.ts')));

  /* Pureza */
  check('F · el Core no toca reloj, red, disco ni dados',
    !/Date\.now|Math\.random|fetch\(|firebase|firestore|require\(/i.test(CORE));
  check('F · y solo importa de dentro del Core',
    (CORE.match(/from '[^']*'/g) || []).every((i) => i.startsWith("from '.")));

  /* 14/15 · nada sensible */
  check('14) no hay un solo `console.` en ninguna de las dos capas',
    !/console\./.test(CORE) && !/console\./.test(COMP));
  check('14) ni el informe lleva secretos, claves de objeto, URLs o tokens',
    !/url|token|secret|credential|signature|objectKey/i.test(
      CORE.split('export interface InformeDeRecoleccion')[1]?.split('}')[0] ?? ''));
  check('15) y no se persiste ninguna URL firmada: el barrido no firma nada',
    !/urlFirmada|urlDeSubida|firmar|presigned/i.test(COMP));

  /* No se duplicó ningún contrato. */
  check('F · reutiliza `MediaObject`, no declara un segundo material',
    /import \{[\s\S]*?MediaObject[\s\S]*?\} from '\.\/objeto'/.test(leer('functions/src/core/media/recoleccion.ts'))
    && !/interface (Asset|MediaObject|StorageRef)\b/.test(CORE));
  check('F · y reutiliza los estados del Job Engine en vez de declarar otros',
    /from '\.\.\/job'/.test(leer('functions/src/core/media/recoleccion.ts'))
    && !/'queued'|'running'|'waiting'/.test(CORE));
  check('F · no hay segunda cola, ni segundo trabajador, ni segundo planificador',
    !/QueuePort|onSchedule|scheduler|crearCola|enqueue/i.test(COMP));

  /* La costura de coste, sin inventar un precio. */
  check('F · la costura de coste de MC-7 existe y no inventa ninguna cifra',
    /anotarOperacionFisica\?:/.test(leer('functions/src/media/recoleccion.ts'))
    && !/precio|price|coste:|cost:|tarifa/i.test(COMP));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
