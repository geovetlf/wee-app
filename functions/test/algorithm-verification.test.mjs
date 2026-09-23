/*
 * A6 — VERIFICACIÓN Y RECUPERACIÓN.
 *
 *   NO SABER NO ES APROBAR.
 *   UN REQUISITO DURO NO SE COMPENSA CON CALIDAD.
 *   A6 PROPONE. NO EJECUTA NADA DE LO QUE PROPONE.
 *
 *  A. Quiénes son.
 *  B. Estructura: lo único que A6 sabe mirar solo.
 *  C. Duro y blando.
 *  D. Los seis estados, y cómo se funden.
 *  E. Evaluadores: el puerto.
 *  F. Evidencia, procedencia y confianza.
 *  G. Restricciones.
 *  H. Clasificación del fallo.
 *  I. Recuperación: qué se propone y qué no.
 *  J. Bucles, política y presupuesto.
 *  K. Determinismo y las dieciséis propiedades.
 *  L. Agnosticismo, capacidades y evaluadores futuros.
 *  M. Los sabotajes.
 *  N. Rendimiento.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require_(path.resolve(here, '../lib/' + p));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const A = lib('core/algorithm/index.js');
const { ALGORITHM_CONTRACT_VERSION } = lib('core/contracts.js');
const a6 = A.crearMotorDeVerificacion();
const rec = A.crearMotorDeRecuperacion();

const sal = (kind, ref, fields) => ({ kind, ref, ...(fields ? { fields } : {}) });
const res = (id, extra = {}) => ({ id, status: 'succeeded', outputs: [], ...extra });
const sig = (k, s, v, src = 'measured', extra = {}) => ({ key: k, subject: s, value: v, source: src, ...extra });
const ev = (s, supports = true) => ({ claim: s.key, signal: s, supports });
const verificar = (req) => a6.verificar(req);
const BIEN = { expected: [{ kind: 'salida' }], actual: res('r', { outputs: [sal('salida', 'ref://1')] }) };

console.log('\n─── A. Quiénes son ───');

check('1 · los dos descriptores valen, y son de sus familias',
  A.algoritmoValido(A.DESCRIPTOR_DE_VERIFICACION) && A.DESCRIPTOR_DE_VERIFICACION.category === 'verification' &&
  A.algoritmoValido(A.DESCRIPTOR_DE_RECUPERACION) && A.DESCRIPTOR_DE_RECUPERACION.category === 'recovery',
  JSON.stringify([A.validarAlgoritmo(A.DESCRIPTOR_DE_VERIFICACION), A.validarAlgoritmo(A.DESCRIPTOR_DE_RECUPERACION)]));
check('2 · los dos son puros y EXPERIMENTALES: nadie los elige solo',
  [A.DESCRIPTOR_DE_VERIFICACION, A.DESCRIPTOR_DE_RECUPERACION].every((d) => d.purity === 'pure') &&
  A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DE_VERIFICACION, A.DESCRIPTOR_DE_RECUPERACION])
    .registro.seleccionable(A.VERIFICATION_ENGINE_ID) === false);
check('3 · y son DOS motores, no uno con dos funciones mezcladas',
  typeof a6.verificar === 'function' && a6.analizar === undefined &&
  typeof rec.analizar === 'function' && rec.verificar === undefined);
check('4 · el contrato subió a 1.5, y el motivo está escrito donde se decidió',
  ALGORITHM_CONTRACT_VERSION === '1.5' &&
  /1\.5 \(A6\)/.test(leer('functions/src/core/contracts.ts')), ALGORITHM_CONTRACT_VERSION);

console.log('\n─── B. Estructura: lo único que A6 sabe mirar solo ───');

check('5 · una salida que está, está', verificar(BIEN).status === 'pass');
check('6 · una que falta, falta',
  verificar({ expected: [{ kind: 'salida' }], actual: res('r') }).status === 'fail');
check('7 · una que vino SIN referencia a nada no cuenta como venida',
  verificar({ expected: [{ kind: 'salida' }], actual: res('r', { outputs: [{ kind: 'salida' }] }) }).status === 'fail');
check('8 · una opcional que no vino no es un fallo',
  verificar({ expected: [{ kind: 'extra', required: false }], actual: res('r') }).status === 'pass');
check('9 · faltan campos declarados',
  verificar({ expected: [{ kind: 'doc', requiredFields: ['titulo', 'cuerpo'] }],
    actual: res('r', { outputs: [sal('doc', 'x', ['titulo'])] }) }).failures[0].because.includes('cuerpo'));
check('10 · pero si la salida NO DECLARA sus campos, no se sabe: no es un fallo ni un aprobado',
  verificar({ expected: [{ kind: 'doc', requiredFields: ['titulo'] }],
    actual: res('r', { outputs: [sal('doc', 'x')] }) }).status === 'unknown');
check('11 · vinieron menos de los pedidos → PARCIAL, no un suspenso entero',
  verificar({ expected: [{ kind: 'p', count: 5 }],
    actual: res('r', { outputs: [sal('p', 'a'), sal('p', 'b'), sal('p', 'c')] }) }).status === 'partial');
check('12 · ninguno de los pedidos → eso sí es un fallo',
  verificar({ expected: [{ kind: 'p', count: 5 }], actual: res('r') }).status === 'fail');
check('13 · y sobrar también se dice, que no es lo mismo que faltar',
  verificar({ expected: [{ kind: 'p', count: 1 }], actual: res('r', { outputs: [sal('p', 'a'), sal('p', 'b')] }) })
    .failures[0].because.includes('vinieron 2'));
check('14 · un estado de otro vocabulario NO se interpreta',
  verificar({ expected: [{ kind: 'salida' }], actual: res('r', { status: 'algo_que_a6_no_conoce', outputs: [sal('salida', 'x')] }) })
    .warnings.some((f) => f.type === 'structural.status'));
check('15 · un paso del que dependía que no llegó',
  verificar({ expected: [{ kind: 'salida' }], actual: res('r', { outputs: [sal('salida', 'x')], failedSteps: ['b'] }) })
    .failures.some((f) => f.type === 'structural.dependency'));
check('16 · y A6 no distingue una imagen de un vídeo: no abre nada',
  verificar({ expected: [{ kind: 'video' }], actual: res('r', { outputs: [sal('video', 'x')] }) }).status ===
  verificar({ expected: [{ kind: 'malla3d' }], actual: res('r', { outputs: [sal('malla3d', 'x')] }) }).status);

console.log('\n─── C. Duro y blando ───');

check('17 · una salida es dura por defecto: lo blando se dice, no se supone',
  A.esDuro({ kind: 'x' }) === true && A.esDuro({ kind: 'x', required: false }) === false);
check('18 · un objetivo de calidad NO es duro…',
  A.esDuro({ kind: 'x' }, { minScore: 0.9 }) === false);
check('19 · …salvo cuando el propio contrato dice `onBelow: fail`',
  A.esDuro({ kind: 'x' }, { minScore: 0.9, onBelow: 'fail' }) === true);
check('20 · P3 · un duro incumplido NUNCA produce `passed`',
  verificar({ expected: [{ kind: 'salida' }], actual: res('r') }).passed === false);
check('21 · y no hay calidad que lo compense',
  A.crearMotorDeVerificacion({ evaluadores: [{ id: 'e', supports: () => true, evaluate: () => ({ status: 'pass', value: 1 }) }] })
    .verificar({ expected: [{ kind: 'salida', quality: { minScore: 0.1 } }], actual: res('r') }).status === 'fail');

console.log('\n─── D. Los seis estados ───');

check('22 · son seis y ni uno más', A.ESTADOS.length === 6, A.ESTADOS.join(' '));
check('23 · `unknown` (no se miró) e `inconclusive` (se miró y no alcanzó) son distintos',
  A.esSinSaber('unknown') && A.esSinSaber('inconclusive') &&
  !A.dejaSeguir('unknown') && !A.dejaSeguir('inconclusive') &&
  !A.afirmaFallo('unknown') && !A.afirmaFallo('inconclusive'));
const f = (status, hard = false, type = 'x') => ({ checkId: 'c' + status + hard, type, status, hard, severity: 'medio', because: '', by: 't' });
check('24 · sin una sola comprobación → `unknown`. NUNCA `pass`', A.fusionarEstados([]) === 'unknown');
check('25 · un duro en `fail` manda sobre todo lo demás',
  A.fusionarEstados([f('pass'), f('pass'), f('fail', true)]) === 'fail');
check('26 · un duro en `partial` es PARCIAL: tres de cinco no es ninguna',
  A.fusionarEstados([f('pass'), f('partial', true)]) === 'partial');
check('27 · fallos y aciertos a la vez → parcial', A.fusionarEstados([f('pass'), f('fail')]) === 'partial');
check('28 · todo lo que se miró pasa, pero algo NO SE MIRÓ → no es `pass`',
  A.fusionarEstados([f('pass'), f('unknown')]) === 'pass_with_uncertainty');
check('29 · y si lo que no se miró era DURO, ni eso: `unknown`',
  A.fusionarEstados([f('pass'), f('unknown', true)]) === 'unknown');
check('30 · nada concluyó y se había mirado → `inconclusive`',
  A.fusionarEstados([f('inconclusive'), f('unknown')]) === 'inconclusive');
check('31 · nada concluyó y no se miró → `unknown`', A.fusionarEstados([f('unknown'), f('unknown')]) === 'unknown');
check('32 · todo pasa y todo se miró → `pass`', A.fusionarEstados([f('pass'), f('pass')]) === 'pass');

console.log('\n─── E. Evaluadores: el puerto ───');

const evaluador = (id, status, value, extra = {}) => ({
  id, supports: (c) => c.type === 'quality.requirement',
  evaluate: () => ({ status, ...(value !== undefined ? { value } : {}), because: `${id} dice ${status}`, ...extra }),
});
const conEval = (e) => A.crearMotorDeVerificacion({ evaluadores: Array.isArray(e) ? e : [e] });
const PIDE_CALIDAD = { expected: [{ kind: 'salida', quality: { minScore: 0.9 } }], actual: res('r', { outputs: [sal('salida', 'x')] }) };

check('33 · P15 · sin evaluador, la comprobación NO se da por buena: queda sin hacer',
  verificar(PIDE_CALIDAD).warnings.some((w) => w.type === 'quality.requirement' && w.status === 'unknown'));
check('34 · y eso NO es `pass`: es `pass_with_uncertainty`', verificar(PIDE_CALIDAD).status === 'pass_with_uncertainty');
check('35 · con evaluador, su veredicto entra tal cual',
  conEval(evaluador('e1', 'fail', 0.4)).verificar(PIDE_CALIDAD).status === 'partial');
check('36 · y se dice QUIÉN lo dijo',
  conEval(evaluador('e1', 'fail', 0.4)).verificar(PIDE_CALIDAD).failures[0].by === 'e1');
check('37 · P8 · un evaluador que REVIENTA deja la comprobación sin hacer, no aprobada',
  conEval({ id: 'roto', supports: () => true, evaluate: () => { throw new Error('boom'); } })
    .verificar(PIDE_CALIDAD).warnings.some((w) => w.status === 'unknown' && /no devolvió un veredicto/.test(w.because)));
check('38 · uno que contesta cualquier cosa, igual',
  conEval({ id: 'raro', supports: () => true, evaluate: () => ({ nada: true }) })
    .verificar(PIDE_CALIDAD).metricas.evaluadoresFallidos === 1);
check('39 · uno cuyo `supports` revienta simplemente no soporta nada',
  conEval({ id: 'x', supports: () => { throw new Error('boom'); }, evaluate: () => ({ status: 'pass' }) })
    .verificar(PIDE_CALIDAD).metricas.sinEvaluador === 1);
check('40 · una comprobación puede EXIGIR un evaluador concreto',
  conEval([evaluador('a', 'pass'), evaluador('b', 'fail')]).verificar({
    ...PIDE_CALIDAD, checks: [{ id: 'q', type: 'quality.requirement', evaluator: 'b', hard: false }],
  }).findings.filter((x) => x.checkId === 'q')[0].by === 'b');
check('41 · con dos capaces gana siempre el mismo: orden canónico por id',
  conEval([evaluador('zeta', 'fail'), evaluador('alfa', 'pass')]).verificar(PIDE_CALIDAD).findings
    .find((x) => x.type === 'quality.requirement').by === 'alfa');
check('42 · P16 · un evaluador que no soporta nada no cambia el resultado',
  igual(verificar(BIEN).status,
        conEval({ id: 'inutil', supports: () => false, evaluate: () => ({ status: 'fail' }) }).verificar(BIEN).status));
check('43 · A6 no importa ningún evaluador: el puerto es el único camino',
  ['verification.ts', 'verification-engine.ts'].every((x) => {
    const t = new Set((sinComentarios(leer(`functions/src/core/algorithm/${x}`)).toLowerCase().match(/[a-z0-9_]+/g) ?? []));
    return !['lipsync', 'face', 'facequality', 'motion', 'identity', 'vision', 'audio'].some((p) => t.has(p));
  }));

console.log('\n─── F. Evidencia, procedencia y confianza ───');

const conMedida = conEval(evaluador('m', 'pass', 0.95, {
  evidence: [ev(sig('quality.lo.que.sea', 'salida', 0.95, 'measured', { sampleSize: 40 }))],
})).verificar(PIDE_CALIDAD);
check('44 · la evidencia del evaluador llega al resultado sin tocarse',
  conMedida.evidence.some((e) => e.signal.source === 'measured' && e.signal.sampleSize === 40));
check('45 · P2 · sin evidencia, la confianza es 0 y lo dice — no un número por defecto',
  verificar(BIEN).confidence.value === 0 && /sin evidencia/.test(verificar(BIEN).confidence.because),
  verificar(BIEN).confidence.because);
check('46 · la confianza del veredicto mide FUERZA, no dirección: un fallo MEDIDO se cree',
  conEval(evaluador('m', 'fail', 0.1, { evidence: [ev(sig('quality.medida', 's', 0.1, 'measured', { sampleSize: 40 }), false)] }))
    .verificar(PIDE_CALIDAD).confidence.value > 0.8,
  String(conEval(evaluador('m', 'fail', 0.1, { evidence: [ev(sig('quality.medida', 's', 0.1, 'measured', { sampleSize: 40 }), false)] }))
    .verificar(PIDE_CALIDAD).confidence.value));
check('47 · una fuente débil NO se convierte en medición',
  conEval(evaluador('m', 'pass', 1, { evidence: [ev(sig('quality.medida', 's', 1, 'default'))] })).verificar(PIDE_CALIDAD)
    .confidence.value < conMedida.confidence.value);
check('48 · y lo que no se pudo concluir TIRA LA CONFIANZA HACIA ABAJO',
  conEval([{ id: 'solo-uno', supports: (c) => c.subject === 'a', evaluate: () => ({ status: 'pass', evidence: [ev(sig('quality.medida', 'a', 1, 'measured', { sampleSize: 40 }))] }) }])
    .verificar({
      expected: [{ kind: 'a', quality: { minScore: 0.5 } }, { kind: 'b', quality: { minScore: 0.5 } }],
      actual: res('r', { outputs: [sal('a', 'x'), sal('b', 'y')] }),
    }).confidence.value < 1);
const conBase = { kind: 'algorithm', value: 0.9, basis: [ev(sig('quality.medida', 's', 1, 'measured'))] };
check('49 · la incertidumbre sale de la confianza, con la escala que ya existe',
  A.incertidumbreDelVeredicto(conBase) === 'known' &&
  A.incertidumbreDelVeredicto({ ...conBase, value: 0.3 }) === 'uncertain');
check('49b · y una confianza ALTA sin nada que la sostenga sigue siendo desconocida',
  A.incertidumbreDelVeredicto({ kind: 'algorithm', value: 0.99, basis: [] }) === 'unknown');
check('50 · A6 publica señales sobre SÍ MISMO, genéricas y sin capacidad dentro',
  verificar(BIEN).signals.some((s) => s.key === 'verification.pass' && s.source === 'derived') &&
  verificar(BIEN).signals.some((s) => s.key === 'verification.coverage'));

console.log('\n─── G. Restricciones ───');

const conTope = (c, senales = []) => verificar({ ...BIEN, constraints: c, evidence: senales.map((s) => ev(s)) });
check('51 · un tope con medida se comprueba',
  conTope({ budget: { maxUsd: 1 } }, [sig('result.costUsd', 'r', 5)]).status === 'fail');
check('52 · y si cabe, pasa', conTope({ budget: { maxUsd: 10 } }, [sig('result.costUsd', 'r', 5)]).status === 'pass');
check('53 · un tope SIN medida no es ni aprobado ni suspenso: es que no se midió',
  conTope({ budget: { maxUsd: 1 } }).warnings.some((w) => /no se midió/.test(w.because)));
check('54 · y como el tope es DURO, el veredicto entero se queda sin saber',
  conTope({ budget: { maxUsd: 1 } }).status === 'unknown',
  conTope({ budget: { maxUsd: 1 } }).status);
check('54b · mientras que lo BLANDO sin medir solo deja reservas',
  verificar(PIDE_CALIDAD).status === 'pass_with_uncertainty');

console.log('\n─── H. Clasificación del fallo ───');

check('55 · los códigos del Core se clasifican con una tabla, y están TODOS',
  Object.keys(A.CLASE_DE_CODIGO).length === 15, String(Object.keys(A.CLASE_DE_CODIGO).length));
check('56 · un código que no está en la tabla es `unknown`, no el que más se le parezca',
  A.claseDeFallo({ code: 'CODIGO_QUE_NO_EXISTE' }) === 'unknown');
check('57 · la reintentabilidad se PREGUNTA al Core, no se rehace',
  A.sePuedeReintentar('provider_failure', 'PROVIDER_ERROR') === true &&
  A.sePuedeReintentar('transient', 'RATE_LIMIT') === true &&
  A.sePuedeReintentar('invalid_input', 'CONTENT_POLICY') === false &&
  A.sePuedeReintentar('resource', 'INSUFFICIENT_CREDITS') === false);
check('58 · y lo que no se sabe devuelve `undefined`: «no se sabe» no es «no»',
  A.sePuedeReintentar('quality_failure') === undefined && A.sePuedeReintentar('malformed_result') === undefined);
check('59 · sin código, la clase sale del TIPO de la comprobación, no de su texto',
  A.claseDeFallo(undefined, [{ type: 'structural.missing', status: 'fail' }]) === 'unmet_requirement' &&
  A.claseDeFallo(undefined, [{ type: 'quality.requirement', status: 'fail' }]) === 'quality_failure' &&
  A.claseDeFallo(undefined, [{ type: 'consistency.identidad', status: 'fail' }]) === 'consistency_failure' &&
  A.claseDeFallo(undefined, [{ type: 'authority.implementation', status: 'fail' }]) === 'authority_failure');
check('60 · sin nada que clasificar, `unknown`', A.claseDeFallo(undefined, []) === 'unknown');
check('61 · la clase es una unión ABIERTA: una familia futura pasa como dato',
  A.claseDeFallo(undefined, [{ type: 'familia.del.futuro', status: 'fail' }]) === 'unknown');

console.log('\n─── I. Recuperación: qué se propone y qué no ───');

const analizarDe = (req, ctx = {}) => {
  const v = verificar(req);
  const codigo = req.actual?.error?.code;
  return rec.analizar(v, { ...ctx, ...(codigo ? { metadata: { errorCode: codigo } } : {}) });
};
const FALTA = { expected: [{ kind: 'salida' }], actual: res('r') };
const conError = (code) => ({ expected: [{ kind: 'salida' }], actual: res('r', { status: 'failed', error: { code } }) });

check('62 · un veredicto que no afirma fallo no se recupera',
  analizarDe(BIEN).stoppedBecause === 'nothing_to_recover');
check('63 · un fallo de proveedor se reintenta',
  analizarDe(conError('PROVIDER_ERROR')).proposals[0].kind === 'retry');
check('64 · uno de la persona NO se reintenta: repetirlo gasta su dinero dos veces',
  !analizarDe(conError('CONTENT_POLICY')).proposals.some((p) => p.kind === 'retry'),
  analizarDe(conError('CONTENT_POLICY')).proposals.map((p) => p.kind).join(','));
check('65 · el saldo agotado propone pedir menos, no repetir',
  analizarDe(conError('INSUFFICIENT_CREDITS')).proposals.map((p) => p.kind).join(',') === 'reduce_scope,abort');
check('66 · una salida que falta se REPLANIFICA: no es cosa del intento',
  analizarDe(FALTA).proposals.some((p) => p.kind === 'replan'));
check('67 · un resultado parcial propone quedarse con lo que salió',
  analizarDe({ expected: [{ kind: 'p', count: 5 }], actual: res('r', { outputs: [sal('p', 'a')] }) })
    .proposals[0].kind === 'partial');
check('68 · la calidad que no llega se REGENERA, que no es reintentar: no hubo error',
  rec.analizar(conEval(evaluador('m', 'fail', 0.4)).verificar(PIDE_CALIDAD)).proposals[0].kind === 'regenerate');
check('69 · y lo que no se pudo MIRAR propone volver a mirarlo',
  analizarDe(PIDE_CALIDAD).proposals[0].kind === 'verify_again',
  analizarDe(PIDE_CALIDAD).proposals.map((p) => p.kind).join(','));
check('70 · un respaldo declarado se propone; sin declararlo, no se inventa',
  analizarDe(conError('PROVIDER_ERROR'), { hasFallback: true }).proposals.some((p) => p.kind === 'fallback') &&
  !analizarDe(conError('PROVIDER_ERROR')).proposals.some((p) => p.kind === 'fallback'));
check('71 · una alternativa declarada se nombra, y la elegida es reproducible',
  analizarDe(conError('PROVIDER_ERROR'), { alternatives: ['zeta', 'alfa'] })
    .proposals.find((p) => p.kind === 'alternative_strategy').strategyId === 'alfa');
check('72 · `abort` se propone SIEMPRE, y SIEMPRE la última: parar no es la primera idea',
  [FALTA, conError('PROVIDER_ERROR'), conError('AUTH_ERROR')].every((r) => {
    const p = analizarDe(r).proposals; return p[p.length - 1].kind === 'abort';
  }));
check('73 · las propuestas salen de menos a más riesgo',
  analizarDe(conError('PROVIDER_ERROR'), { hasFallback: true, alternatives: ['a'] }).proposals
    .filter((p) => p.kind !== 'abort').every((p, i, arr) => i === 0 ||
      ({ bajo: 0, medio: 1, alto: 2 })[arr[i - 1].risk] <= ({ bajo: 0, medio: 1, alto: 2 })[p.risk]));
check('74 · cada propuesta lleva clase, riesgo, confianza e incertidumbre',
  analizarDe(FALTA).proposals.every((p) => p.failureClass && p.risk && p.confidence && p.uncertainty));
check('75 · y acota los pasos cuando puede: repetirlo todo cuesta más',
  analizarDe({ expected: [{ kind: 'p', count: 5 }], actual: res('r', { outputs: [sal('p', 'a')] }) })
    .proposals[0].affectedSteps.join(',') === 'p');
check('76 · NO se inventa un efecto esperado sin evidencia',
  analizarDe(FALTA).proposals.every((p) => p.expectedEffect === undefined));
check('77 · la confianza de la propuesta es la DEL VEREDICTO, no una nueva más alta',
  analizarDe(FALTA).proposals.every((p) => p.confidence.value === verificar(FALTA).confidence.value));

console.log('\n─── J. Bucles, política y presupuesto ───');

check('78 · P10 · lo que ya se intentó contra el mismo fallo no se vuelve a proponer',
  analizarDe(conError('PROVIDER_ERROR'), { previous: [{ kind: 'retry', failureClass: 'provider_failure' }] })
    .proposals.every((p) => p.kind !== 'retry'));
check('79 · y se dice que fue por eso',
  analizarDe(conError('PROVIDER_ERROR'), { previous: [{ kind: 'retry', failureClass: 'provider_failure' }] })
    .discarded.some((d) => /ya se intentó/.test(d.because)));
check('80 · la huella es por lo que el intento ES, nunca por un id',
  A.huellaDeIntento({ kind: 'retry', failureClass: 'x', affectedSteps: ['b', 'a'] }) ===
  A.huellaDeIntento({ kind: 'retry', failureClass: 'x', affectedSteps: ['a', 'b'] }));
check('81 · un intento que SÍ funcionó no bloquea volver a hacerlo',
  analizarDe(conError('PROVIDER_ERROR'), { previous: [{ kind: 'retry', failureClass: 'provider_failure', succeeded: true }] })
    .proposals.some((p) => p.kind === 'retry'));
check('82 · la política de reintentos del Core manda, y se LEE',
  analizarDe(conError('PROVIDER_ERROR'), { retry: { maxAttempts: 2 }, previous: [{ kind: 'retry' }, { kind: 'retry' }] })
    .stoppedBecause === 'attempts_exhausted');
check('83 · P9 · el presupuesto acota los candidatos',
  rec.analizar(verificar(FALTA), { budget: { maxCandidates: 2 } }).metricas.candidatos <= 2);
check('84 · si todo lo proponible ya se intentó, se dice: bucle',
  rec.analizar(verificar(FALTA), {
    previous: A.RECUPERACIONES.map((k) => ({ kind: k, failureClass: 'unmet_requirement' })),
  }).stoppedBecause === 'loop_detected');
check('85 · el tope de comprobaciones corta y lo dice',
  verificar({ expected: Array.from({ length: 200 }, (_, i) => ({ kind: `k${i}` })), actual: res('r'), budget: { maxChecks: 10 } })
    .metricas.budgetExhausted === true);
check('86 · y el de evaluadores también',
  conEval(evaluador('e', 'pass')).verificar({
    expected: Array.from({ length: 20 }, (_, i) => ({ kind: `k${i}`, quality: { minScore: 0.5 } })),
    actual: res('r', { outputs: Array.from({ length: 20 }, (_, i) => sal(`k${i}`, 'x')) }),
    budget: { maxEvaluators: 3 },
  }).metricas.budgetExhausted === true);
check('87 · los contadores nuevos son los del contrato, no un sistema aparte',
  A.CONTADORES.includes('checks') && A.CONTADORES.includes('evaluators') &&
  A.TOPES_MAXIMOS.maxChecks > 0 && A.TOPES_MAXIMOS.maxEvaluators > 0);

console.log('\n─── K. Determinismo y las dieciséis propiedades ───');

const REPETIBLE = {
  expected: [{ kind: 'b' }, { kind: 'a', count: 2 }],
  actual: res('r', { outputs: [sal('a', 'x'), sal('b', 'y')] }),
  evidence: [ev(sig('result.costUsd', 'r', 1))],
  constraints: { budget: { maxUsd: 10 } },
};
const doce = Array.from({ length: 12 }, () => JSON.stringify(verificar(REPETIBLE)));
check('88 · P6 · doce corridas idénticas, campo por campo', doce.every((x) => x === doce[0]));
check('89 · P6 · barajar las comprobaciones no cambia el veredicto',
  igual(verificar({ ...REPETIBLE, expected: [...REPETIBLE.expected].reverse() }).status,
        verificar(REPETIBLE).status));
check('90 · P7 · barajar la evidencia tampoco',
  igual(JSON.stringify(verificar({ ...REPETIBLE, evidence: [...REPETIBLE.evidence].reverse() }).confidence),
        JSON.stringify(verificar(REPETIBLE).confidence)));
check('91 · P4 · metadata irrelevante no cambia nada',
  igual(verificar(REPETIBLE).status,
        verificar({ ...REPETIBLE, metadata: { loQueSea: [1, 2, 3] } }).status));
check('92 · P5 · renombrar la capacidad no cambia la lógica',
  igual(JSON.stringify(verificar({ expected: [{ kind: 'alfa' }], actual: res('r') })).split('alfa').join('K'),
        JSON.stringify(verificar({ expected: [{ kind: 'beta' }], actual: res('r') })).split('beta').join('K')));
check('93 · P1 · `unknown` NO se convierte en `pass` por mucho que se insista',
  [1, 2, 3].every(() => verificar(PIDE_CALIDAD).status !== 'pass') &&
  verificar({ expected: [], actual: res('r') }).findings.every((x) => x.status !== 'pass' || x.type === 'structural.status'));
check('94 · P11 · A6 no ejecuta recuperación: no hay verbo que lo permita',
  ['recovery.ts', 'recovery-engine.ts'].every((x) =>
    !/ejecutar|execute|dispatch|enqueue|await |Promise\./.test(sinComentarios(leer(`functions/src/core/algorithm/${x}`)))));
for (const [p, palabras] of [
  ['P12 · no elige proveedor', ['crearRouter', 'RoutingDecision', 'providerId =', 'selectedProvider', 'adapters']],
  ['P13 · no crea trabajos', ['crearJob', 'JobStore', 'jobId =', 'creatorJobs']],
]) {
  const donde = ['verification.ts', 'verification-engine.ts', 'recovery.ts', 'recovery-engine.ts']
    .filter((x) => palabras.some((w) => sinComentarios(leer(`functions/src/core/algorithm/${x}`)).includes(w)));
  check(`95 · ${p}`, donde.length === 0, donde.join(',') || 'ninguno');
}

console.log('\n─── L. Agnosticismo, capacidades y evaluadores futuros ───');

const FUTURAS = ['lipsync', 'face_swap', 'talking_avatar', 'motion_transfer',
  'video_translation', '3d_generation', 'music_generation', 'document_analysis'];
const inventada = ['future', 'capability', 'x' + (7 * 6)].join('.');
/* Evaluadores SINTÉTICOS: no miden nada real y no tienen por qué. */
const sintetico = (id, valor) => ({
  id, supports: (c) => c.type.startsWith('quality.') || c.type.startsWith('consistency.'),
  evaluate: (c) => ({
    status: valor >= (c.requirement?.minScore ?? 0) ? 'pass' : 'fail', value: valor,
    because: `${id} mide ${valor}`,
    evidence: [ev(sig(`quality.${id}.score`, c.subject, valor, 'measured', { sampleSize: 12 }), valor >= 0.5)],
  }),
});

let completas = 0; const fallos = [];
for (const cap of [...FUTURAS, inventada]) {
  const motor = A.crearMotorDeVerificacion({ evaluadores: [sintetico('evaluator.a', 0.42), sintetico('evaluator.b', 0.9)] });
  const v = motor.verificar({
    expected: [{ kind: cap, quality: { minScore: 0.9 } }],
    actual: res(`r_${cap}`, { outputs: [sal(cap, `ref://${cap}`)] }),
    checks: [{ id: `cons:${cap}`, type: 'consistency.temporal', subject: cap, hard: false, severity: 'medio' }],
  });
  const r = rec.analizar(v, {});
  const ok = v.findings.length >= 3 && v.signals.length > 0 && v.evidence.length > 0 &&
    typeof r.failureClass === 'string' && r.proposals.length > 0;
  if (ok) completas++; else fallos.push(`${cap}:${v.status}/${r.stoppedBecause}`);
}
check('96 · las ocho capacidades futuras y una inventada: verifican, señalan y proponen recuperación',
  completas === 9, fallos.join(', ') || 'las nueve');
check('97 · y NINGUNA aparece en el núcleo de A6',
  ['verification.ts', 'verification-engine.ts', 'recovery.ts', 'recovery-engine.ts'].every((x) => {
    const t = new Set((sinComentarios(leer(`functions/src/core/algorithm/${x}`)).toLowerCase().match(/[a-z0-9_]+/g) ?? []));
    return ![...FUTURAS, 'gemini', 'elevenlabs', 'seedance', 'minimax', 'openai', 'deepseek'].some((p) => t.has(p.toLowerCase()));
  }));
check('98 · un tipo de comprobación que nadie ha inventado se admite como dato',
  verificar({ ...BIEN, checks: [{ id: 'z', type: 'lo.que.venga.en.2030', hard: false }] })
    .warnings.some((w) => w.type === 'lo.que.venga.en.2030'));
check('99 · un evaluador futuro entra sin tocar A6, y su señal viaja entera',
  conEval({ id: 'future.evaluator.x', supports: (c) => c.type === 'lo.que.venga.en.2030',
    evaluate: () => ({ status: 'pass', value: 1, evidence: [ev(sig('quality.future.evaluator.score', 'x', 1, 'measured', { sampleSize: 5 }))] }) })
    .verificar({ ...BIEN, checks: [{ id: 'z', type: 'lo.que.venga.en.2030', hard: false }] })
    .evidence.some((e) => e.signal.key === 'quality.future.evaluator.score'));
check('100 · y A5 alimenta a A6 sin traducir nada: la cadena entera',
  (() => {
    const a4 = A.crearMotorDeParalelizacion(), a3 = A.crearMotorDeEstrategias();
    const paso = (id, dep) => ({ id, capability: inventada, purpose: 'p', produces: 'text', ...(dep ? { dependsOn: dep } : {}) });
    const tarea = { id: 'T', steps: [paso('a'), paso('b', ['a']), paso('c', ['a'])] };
    const senales = tarea.steps.map((s) => sig('step.latencyMs', s.id, 500));
    const est = a3.proponer(a4.variantes(tarea, senales).variantes, senales).estrategias;
    const opt = A.crearMotorDeOptimizacion().optimizar({ candidates: est, objective: { weights: { latency: 1 } } });
    const elegida = opt.pareto[0];
    const v = verificar({
      expected: [{ kind: inventada }],
      actual: { id: elegida, status: 'succeeded', outputs: [sal(inventada, 'ref://x')] },
    });
    return v.status === 'pass' && v.passed === true;
  })());

console.log('\n─── M. Los sabotajes ───');

const SABOTAJES = [
  ['un resultado que no es un resultado', () => verificar({ expected: [{ kind: 'a' }], actual: undefined })],
  ['un resultado sin id', () => verificar({ expected: [{ kind: 'a' }], actual: { status: 'succeeded' } })],
  ['una petición vacía', () => verificar({})],
  ['una petición que no es una petición', () => verificar(undefined)],
  ['salidas malformadas', () => verificar({ expected: [{ kind: 'a' }], actual: res('r', { outputs: [null, 'no soy una salida', 42] }) })],
  ['una expectativa sin kind', () => verificar({ expected: [{ required: true }], actual: res('r') })],
  ['un NaN en la medida', () => verificar({ ...BIEN, constraints: { budget: { maxUsd: NaN } }, evidence: [ev(sig('result.costUsd', 'r', NaN))] })],
  ['un Infinity', () => verificar({ ...BIEN, constraints: { budget: { maxUsd: Infinity } }, evidence: [ev(sig('result.costUsd', 'r', Infinity))] })],
  ['una calidad negativa', () => conEval(evaluador('m', 'pass', -5)).verificar(PIDE_CALIDAD)],
  ['una confianza imposible', () => conEval(evaluador('m', 'pass', 1, { confidence: { kind: 'algorithm', value: 99, basis: [] } })).verificar(PIDE_CALIDAD)],
  ['un requisito imposible', () => verificar({ expected: [{ kind: 'a', count: -1 }], actual: res('r') })],
  ['un evaluador que devuelve un estado inventado', () => conEval(evaluador('m', 'aprobadisimo')).verificar(PIDE_CALIDAD)],
  ['un evaluador que tarda para siempre (simulado con excepción)', () => conEval({ id: 't', supports: () => true, evaluate: () => { throw new Error('timeout'); } }).verificar(PIDE_CALIDAD)],
  ['evidencia que se contradice', () => verificar({ ...BIEN, evidence: [ev(sig('quality.medida', 'r', 1, 'measured'), true), ev(sig('quality.medida', 'r', 0, 'measured'), false)] })],
  ['un veredicto que no es un veredicto', () => rec.analizar({ status: 'pass' })],
  ['un veredicto nulo', () => rec.analizar(undefined)],
  ['un contexto que no es un contexto', () => rec.analizar(verificar(FALTA), 'no soy un contexto')],
  ['intentos previos malformados', () => rec.analizar(verificar(FALTA), { previous: [null, 'x', {}] })],
  ['una clase de fallo inventada', () => A.sePuedeReintentar('clase.que.no.existe')],
  ['un candidato que revienta', () => A.crearMotorDeRecuperacion({ candidatos: [{ kind: 'retry', risk: 'bajo', aplicable: () => { throw new Error('boom'); }, porque: () => 'x' }] }).analizar(verificar(FALTA))],
  ['un candidato mudo', () => A.crearMotorDeRecuperacion({ candidatos: [{ kind: 'retry', risk: 'bajo', aplicable: () => true, porque: () => '' }] }).analizar(verificar(FALTA))],
  ['200 000 comprobaciones', () => verificar({ expected: Array.from({ length: 5000 }, (_, i) => ({ kind: `k${i}` })), actual: res('r') })],
];
for (const [que, correr] of SABOTAJES) {
  let ok = false; let detalle = '';
  try { const r = correr(); ok = r !== null && r !== undefined || r === undefined; detalle = typeof r === 'object' && r ? (r.status ?? r.stoppedBecause ?? 'ok') : String(r); }
  catch (e) { ok = false; detalle = 'LANZÓ: ' + String(e.message).slice(0, 60); }
  check(`101 · SABOTAJE ${que} → se maneja, no revienta`, ok, detalle);
}
const inventadoV = conEval(evaluador('m', 'aprobadisimo')).verificar(PIDE_CALIDAD);
check('102 · SABOTAJE · un estado inventado NO se convierte en un aprobado',
  A.dejaSeguir('aprobadisimo') === false &&
  inventadoV.findings.find((x) => x.type === 'quality.requirement').status === 'unknown' &&
  inventadoV.metricas.evaluadoresFallidos === 1,
  inventadoV.findings.find((x) => x.type === 'quality.requirement').status);
check('102b · queda como comprobación SIN HACER, y el veredicto lo arrastra',
  inventadoV.status === 'pass_with_uncertainty' && inventadoV.warnings.length === 1,
  inventadoV.status);
check('102c · y si esa comprobación era DURA, el veredicto entero se queda sin saber',
  conEval(evaluador('m', 'aprobadisimo')).verificar({
    expected: [{ kind: 'salida', quality: { minScore: 0.9, onBelow: 'fail' } }],
    actual: res('r', { outputs: [sal('salida', 'x')] }),
  }).passed === false);
check('103 · SABOTAJE · efectos externos → no hay ninguno posible',
  ['verification.ts', 'verification-engine.ts', 'recovery.ts', 'recovery-engine.ts'].every((x) =>
    !/fetch\(|firebase|process\.env|Math\.random|Date\.now|require\(/.test(sinComentarios(leer(`functions/src/core/algorithm/${x}`)))));
check('104 · SABOTAJE · tocar Credits, Assets o Firestore → el verbo no existe',
  ['verification.ts', 'verification-engine.ts', 'recovery.ts', 'recovery-engine.ts'].every((x) =>
    !/spendCredits|creditsBalance|createAsset|collection\(|firestore/i.test(sinComentarios(leer(`functions/src/core/algorithm/${x}`)))));
check('105 · SABOTAJE · importar de fuera del Core → no se importa nada',
  ['verification.ts', 'verification-engine.ts', 'recovery.ts', 'recovery-engine.ts'].every((x) =>
    [...sinComentarios(leer(`functions/src/core/algorithm/${x}`)).matchAll(/from '([^']+)'/g)]
      .map((mm) => mm[1]).every((r) => r.startsWith('.'))));
check('106 · nadie ha conectado A6 a producción', (() => {
  const recorrer = (dir, out = []) => {
    for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
      const hijo = dir + '/' + e.name;
      if (e.isDirectory()) recorrer(hijo, out); else if (/\.ts$/.test(e.name)) out.push(hijo);
    }
    return out;
  };
  const DELATOR = /verification-engine|recovery-engine|crearMotorDeVerificacion|crearMotorDeRecuperacion/;
  const prod = ['creator', 'runtime', 'engine', 'gateway', 'credits', 'content', 'job']
    .flatMap((d) => recorrer('functions/src/' + d));
  const conectados = prod.filter((x) => DELATOR.test(leer(x)));
  return prod.length > 50 && conectados.length === 0;
})());


console.log('\n─── O. Lo que los sabotajes demostraron que faltaba ───');

/* T05 · El motor valida el estado del evaluador ANTES de fusionar, así que la
 * regla de la fusión nunca se ejercitaba desde fuera. Se prueba directamente:
 * las dos defensas tienen que sostenerse solas. */
check('109 · T05 · un estado inventado que llegara a la fusión cuenta como SIN SABER',
  A.fusionarEstados([f('pass'), f('aprobadisimo')]) === 'pass_with_uncertainty',
  A.fusionarEstados([f('pass'), f('aprobadisimo')]));
check('109b · y si TODO son estados inventados, `unknown`. Nunca `pass`',
  A.fusionarEstados([f('estupendo'), f('genial')]) === 'unknown');
check('109c · la otra defensa, la de la puerta, también sola',
  conEval(evaluador('m', 'inventadisimo')).verificar(PIDE_CALIDAD)
    .findings.find((x) => x.type === 'quality.requirement').status === 'unknown');

/* T17 · Sin una sola comprobación, la confianza es CERO. Se probaba siempre con
 * comprobaciones dentro, así que el caso vacío no lo miraba nadie. */
check('110 · T17 · sin comprobaciones, la confianza del veredicto es 0',
  A.confianzaDelVeredicto([], []).value === 0 &&
  /ninguna comprobación/.test(A.confianzaDelVeredicto([], []).because),
  A.confianzaDelVeredicto([], []).because);
check('110b · y con comprobaciones pero sin evidencia, también',
  A.confianzaDelVeredicto([f('pass')], []).value === 0);
check('110c · la evidencia sube la confianza, y su procedencia decide cuánto',
  A.confianzaDelVeredicto([f('pass')], [ev(sig('quality.medida', 'x', 1, 'measured', { sampleSize: 40 }))]).value >
  A.confianzaDelVeredicto([f('pass')], [ev(sig('quality.medida', 'x', 1, 'default'))]).value);

/* T19 · LA AUTORIDAD. No había ni una comprobación de esto en toda la batería,
 * y es la frontera que separa «verificar» de «decidir la implementación». */
const conImplementacion = (dentro) => verificar({
  expected: [{ kind: 'salida' }],
  actual: { id: 'r', status: 'succeeded', outputs: [{ kind: 'salida', ref: 'x' }], ...dentro },
});
check('111 · T19 · un resultado que nombra proveedor se rechaza, y es DURO',
  conImplementacion({ metadata: { providerId: 'x' } }).status === 'fail' &&
  conImplementacion({ metadata: { providerId: 'x' } }).failures.some((x) => x.type === 'authority.implementation' && x.hard));
for (const clave of ['allowedProviders', 'modelId', 'adapter', 'excludeProviders']) {
  check(`111b · T19 · «${clave}» dentro del resultado tampoco cuela`,
    conImplementacion({ metadata: { [clave]: 'x' } }).failures.some((x) => x.type === 'authority.implementation'));
}
check('111c · viene del MISMO `claveDeImplementacion` del Planner, no de una lista nueva',
  /violacionesEn/.test(leer('functions/src/core/algorithm/verification-engine.ts')) &&
  !/allowedProviders|providerId/.test(sinComentarios(leer('functions/src/core/algorithm/verification-engine.ts'))));
check('111d · CONTROL · y un resultado limpio NO se marca',
  conImplementacion({ metadata: { loQueSea: 'x' } }).failures.every((x) => x.type !== 'authority.implementation'));
check('111e · una violación de autoridad se clasifica como tal, y solo cabe parar',
  rec.analizar(conImplementacion({ metadata: { providerId: 'x' } }), {}).failureClass === 'authority_failure' &&
  rec.analizar(conImplementacion({ metadata: { providerId: 'x' } }), {}).proposals.map((x) => x.kind).join(',') === 'abort');

console.log('\n─── N. Rendimiento ───');

const medir = (cuantos) => {
  const req = {
    expected: Array.from({ length: cuantos }, (_, i) => ({ kind: `k${String(i).padStart(5, '0')}` })),
    actual: res('r', { outputs: Array.from({ length: cuantos }, (_, i) => sal(`k${String(i).padStart(5, '0')}`, 'x')) }),
    budget: { maxChecks: 2048 },
  };
  verificar(req);
  const ini = process.hrtime.bigint();
  for (let i = 0; i < 5; i++) verificar(req);
  return [cuantos, Number(process.hrtime.bigint() - ini) / 5 / 1e6];
};
const tiempos = [10, 100, 1000].map(medir);
for (const [c, ms] of tiempos) console.log(`   ${String(c).padStart(4)} comprobaciones → ${ms.toFixed(2)} ms`);
check('107 · 1 000 comprobaciones en menos de 500 ms', tiempos[2][1] < 500, `${tiempos[2][1].toFixed(2)} ms`);
check('108 · y el conjunto de evaluadores está acotado por presupuesto, no por suerte',
  conEval(evaluador('e', 'pass')).verificar({
    expected: Array.from({ length: 500 }, (_, i) => ({ kind: `k${i}`, quality: { minScore: 0.5 } })),
    actual: res('r', { outputs: Array.from({ length: 500 }, (_, i) => sal(`k${i}`, 'x')) }),
  }).metricas.porEvaluador <= A.TOPES_MAXIMOS.maxEvaluators);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA6: verifica lo que puede, dice lo que no sabe, y propone sin ejecutar');
process.exit(failures ? 1 : 0);
