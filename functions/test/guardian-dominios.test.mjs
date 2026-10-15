/**
 * EL GUARDIAN POR DOMINIOS — `ops/guardian/dominios.json`, `invariantes.json`, `huellas.json`, `verificar.mjs`, `informe.mjs`
 * y `.github/workflows/guardian-dominios.yml`.
 *
 *   node test/guardian-dominios.test.mjs        (desde functions/; no usa el compilado, ni la red, ni procesos de suites)
 *
 *   A  el MAPA de dominios cuadra con la cadena de `npm test` (ninguna suite sin dominio, ninguna citada que no exista) y falla
 *      cerrado con un mapa roto.
 *   B  los INVARIANTES y su HUELLA: ninguna comprobación de las suites que los vigilan puede desaparecer, cambiar de título o encogerse.
 *   C  la VERIFICACIÓN: PASA / FALLA / INTERMITENTE / ENTORNO se distinguen y NINGUNA repetición convierte un fallo en un verde.
 *   D  el modo ESTABILIDAD para cazar una intermitencia sin taparla, y la evidencia sin secretos.
 *   E  el INFORME de autoverificación: las ocho preguntas.
 *   F  el WORKFLOW: solo lectura, sin secretos, sin push ni despliegue, sin filtros que dejen un check sin llegar, anti-bucle.
 *   G  la PROPUESTA de check requerido: preparada y NO aplicada.
 *   H  la integración con la CI y la cadena.
 *   I  SABOTAJES de cada cerrojo.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) fallos++;
};
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const imp = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const limpiezas = [];
process.on('exit', () => { for (const d of limpiezas) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ya no está */ } } });

const dom = await imp('ops/guardian/dominios.mjs');
const hue = await imp('ops/guardian/huellas.mjs');
const ver = await imp('ops/guardian/verificar.mjs');
const inf = await imp('ops/guardian/informe.mjs');
const { suitesDeLaCadena } = await import(pathToFileURL(path.join(aqui, '_cadena.mjs')).href);

const pkg = JSON.parse(leer('functions/package.json'));
const cadena = suitesDeLaCadena(pkg.scripts.test).map((s) => s.replace(/^test\//, '').replace(/\.test\.mjs$/, ''));
const existe = (rel) => { try { return fs.statSync(path.join(RAIZ, rel)).isFile(); } catch { return false; } };
const mapa = dom.leerMapa(RAIZ);

/* ── A · El mapa ──────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── A · El mapa de dominios cuadra con la cadena ──');
{
  const { problemas, cobertura } = dom.validarDominios({ mapa, cadena, existe });
  check('1) el mapa real no tiene ningún problema', problemas.length === 0, problemas.map((p) => p.id).slice(0, 5).join(', ') || `${mapa.dominios.length} dominios`);
  check('2) TODAS las suites de la cadena están en algún dominio (ninguna queda sin vigilar por su dominio)', cobertura.sinDominio.length === 0 && cobertura.total === cadena.length, `${cadena.length} suites`);
  const activos = mapa.dominios.filter((d) => d.estado === 'activo');
  check('3) los dominios críticos son los del dinero, la identidad, los trabajos asíncronos, los proveedores, los archivos, la seguridad y el propio Guardian — y todos están activos',
    ['creditos-y-cobro', 'identidad-y-autorizacion', 'trabajos-asincronos', 'router-gateway-proveedores', 'media-y-archivos', 'seguridad-y-despliegue', 'guardian-y-harness', 'contratos-core', 'tipos-y-build'].every((id) => mapa.dominios.find((d) => d.id === id)?.critico === true && mapa.dominios.find((d) => d.id === id)?.estado === 'activo'));
  check('4) las experiencias (Studio, Chef, Travel, Filmmaker, 3D) son dominios que usan la misma cadena, no un motor aparte', ['experiencia-studio', 'experiencia-chef', 'experiencia-travel', 'experiencia-filmmaker', 'experiencia-3d'].every((id) => activos.some((d) => d.id === id && d.ambito === 'experiencia')));
  const pend = mapa.dominios.filter((d) => d.estado === 'pendiente');
  check('5) Design, Music y Fashion figuran como PENDIENTES con su motivo (no hay nada que verificar todavía y no se inventa una prueba)', ['experiencia-design', 'experiencia-music', 'experiencia-fashion'].every((id) => pend.some((d) => d.id === id && d.suites.length === 0 && d.pendiente.length > 40 && d.cuandoExista)));
  check('6) cada dominio activo declara el check de la CI que lo cubre', activos.every((d) => Array.isArray(d.ci) && d.ci.length > 0));
  /* Mapas rotos, uno por cada cerrojo. */
  const con = (cambia) => { const m = structuredClone(mapa); cambia(m); return dom.validarDominios({ mapa: m, cadena, existe }).problemas.map((p) => p.id); };
  check('7) una suite citada que no existe en disco es un problema', con((m) => m.dominios[0].suites.push('suite-que-no-existe')).some((id) => /suite-inexistente:suite-que-no-existe|fuera-de-la-cadena:suite-que-no-existe/.test(id)));
  check('8) una suite citada que existe en disco pero no está en la cadena es un problema', dom.validarDominios({ mapa: (() => { const m = structuredClone(mapa); m.dominios[0].suites.push('fuera-de-cadena'); return m; })(), cadena, existe: () => true }).problemas.some((p) => p.id.endsWith(':fuera-de-la-cadena:fuera-de-cadena')));
  check('9) una suite de la cadena que ningún dominio vigila es un problema (cobertura)', con((m) => { m.dominios.find((d) => d.id === 'experiencia-chef').suites = []; m.dominios.find((d) => d.id === 'experiencia-chef').estado = 'pendiente'; m.dominios.find((d) => d.id === 'experiencia-chef').pendiente = 'x'; }).some((id) => id.startsWith('cobertura:sin-dominio:chef-')));
  check('10) un dominio activo sin suites es un problema', con((m) => { m.dominios[0].suites = []; }).includes(`dominio:${mapa.dominios[0].id}:sin-suites`));
  check('11) un dominio CRÍTICO que no está activo es un problema (los críticos fallan cerrado)', con((m) => { const d = m.dominios.find((x) => x.id === 'creditos-y-cobro'); d.estado = 'pendiente'; d.suites = []; d.pendiente = 'x'; }).includes('dominio:creditos-y-cobro:critico-pendiente'));
  check('12) un pendiente sin motivo, o con suites, o con id repetido o estado desconocido, es un problema',
    con((m) => { const d = m.dominios.find((x) => x.id === 'experiencia-music'); d.pendiente = ''; }).includes('dominio:experiencia-music:sin-motivo')
    && con((m) => { m.dominios.find((x) => x.id === 'experiencia-music').suites = ['credits']; }).includes('dominio:experiencia-music:pendiente-con-suites')
    && con((m) => { m.dominios.push({ ...m.dominios[0] }); }).some((id) => id.endsWith(':duplicado'))
    && con((m) => { m.dominios[0].estado = 'quizá'; }).some((id) => id.endsWith(':estado')));
  const sinContrato = dom.validarDominios({ mapa: { contrato: 'otro', dominios: [] }, cadena, existe });
  check('13) un mapa de otro contrato, o vacío, no se acepta y deja TODA la cadena sin dominio', sinContrato.problemas[0].id === 'mapa:contrato' && sinContrato.cobertura.sinDominio.length === cadena.length && dom.validarDominios({ mapa: { contrato: dom.CONTRATO_DOMINIOS, dominios: [] }, cadena, existe }).problemas[0].id === 'mapa:dominios');
  check('14) seleccionar: los críticos, un dominio por id, y un id desconocido LANZA (no se ignora en silencio)',
    dom.seleccionar(mapa, { criticos: true }).every((d) => d.critico) && dom.seleccionar(mapa, { dominios: ['creditos-y-cobro'] }).length === 1
    && (() => { try { dom.seleccionar(mapa, { dominios: ['no-existe'] }); return false; } catch (e) { return /desconocido/.test(e.message); } })());
}

/* ── B · Invariantes y huellas ────────────────────────────────────────────────────────────────────────────── */
console.log('\n── B · Los invariantes y su huella: una comprobación no desaparece ──');
const copiaDeInvariantes = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-h-'));
  limpiezas.push(d);
  const catalogo = JSON.parse(leer(hue.RUTA_INVARIANTES));
  const rels = ['ops/guardian/dominios.json', hue.RUTA_INVARIANTES, hue.RUTA_HUELLAS, ...hue.suitesDeInvariantes(catalogo).map((s) => dom.archivoDeSuite(s))];
  for (const rel of rels) { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.copyFileSync(path.join(RAIZ, rel), path.join(d, rel)); }
  return d;
};
{
  const catalogo = JSON.parse(leer(hue.RUTA_INVARIANTES));
  const real = hue.verificarHuellas({ raiz: RAIZ });
  check('15) las huellas guardadas son conformes con las suites reales', real.ok, real.problemas.map((p) => p.id).slice(0, 5).join(', '));
  check('16) el catálogo tiene los once invariantes críticos y cada uno cita suites que existen', catalogo.invariantes.length === 11 && hue.validarInvariantes({ catalogo, dominios: mapa, existe }).length === 0);
  check('17) cubre lo que pide el encargo: idempotencia, aislamiento entre cuentas, no duplicar cobros, cobro↔fallo↔reembolso, archivos, autorización, trabajos asíncronos, nada ficticio como real, controles de seguridad',
    catalogo.invariantes.every((i) => i.suites.length >= 2 || i.id === 'I-11') && catalogo.invariantes.some((i) => /una vez/.test(i.titulo)) && catalogo.invariantes.some((i) => /ficticio/.test(i.titulo)));
  /* El extractor. */
  const h1 = hue.huellaDeSuite("check('1) Hola   mundo', true);\ncheck(`2) coste ${x}`, true);\ncheck(nombre, true);");
  const h2 = hue.huellaDeSuite("check('7) Hola mundo', true);\ncheck(`9b) coste ${x}`, true);\ncheck(nombre, true);\ncheck('nueva', true);");
  check('18) la huella ignora el número del título y los espacios, cuenta TODAS las llamadas (incluida la de título no literal)', h1.llamadas === 3 && h2.llamadas === 4 && h1.titulos.every((t) => h2.titulos.includes(t)) && hue.normalizarTitulo('34) a   b') === 'a b' && hue.normalizarTitulo('12b) x') === 'x');
  check('19) una comprobación NUEVA no es un problema (la huella solo crece)…', hue.diferencias(h1, h2).length === 0);
  check('20) …pero una que desaparece, cambia de título o se encoge SÍ', hue.diferencias(h2, h1).some((d) => d.tipo === 'comprobaciones-perdidas') && hue.diferencias(h2, { llamadas: 1, titulos: h2.titulos }).some((d) => d.tipo === 'menos-llamadas') && hue.diferencias(h1, null)[0].tipo === 'suite-ausente');
  /* Sobre copias de las suites reales. */
  const d = copiaDeInvariantes();
  check('21) una copia intacta de las suites reales es conforme', hue.verificarHuellas({ raiz: d }).ok);
  const toca = (suite, f) => { const p = path.join(d, dom.archivoDeSuite(suite)); const t = fs.readFileSync(p, 'utf8'); fs.writeFileSync(p, f(t)); return () => fs.writeFileSync(p, t); };
  let restaura = toca('idempotencia-de-cobro', (t) => t.replace(/^check\(.*$/m, '// borrada'));
  let r = hue.verificarHuellas({ raiz: d });
  check('22) SI SE BORRA una comprobación de una suite de invariantes (aquí, la de idempotencia de cobro) las huellas caen: es lo que impide «arreglar» borrando la prueba', !r.ok && r.problemas.some((p) => p.id === 'huella:idempotencia-de-cobro:comprobaciones-perdidas'), r.problemas.map((p) => p.id).join());
  restaura();
  restaura = toca('credits-saldo-privado', (t) => t.replace(/check\('/, "check('[reescrito] "));
  r = hue.verificarHuellas({ raiz: d });
  check('23) y si se REESCRIBE el título de una comprobación, también (se reanda con --registrar, una decisión humana)', !r.ok && r.problemas.some((p) => p.id.startsWith('huella:credits-saldo-privado:')));
  restaura();
  restaura = toca('credits', (t) => t.replace(/^(\s*)check\(/gm, '$1// check('));
  r = hue.verificarHuellas({ raiz: d });
  check('24) y si se COMENTAN casi todas las llamadas, caen las huellas', !r.ok && r.problemas.some((p) => p.id.startsWith('huella:credits:')));
  restaura();
  fs.rmSync(path.join(d, dom.archivoDeSuite('core-financial')));
  r = hue.verificarHuellas({ raiz: d });
  check('25) si se BORRA la suite entera, caen el catálogo y la huella', !r.ok && r.problemas.some((p) => p.id === 'invariante:I-04:suite-inexistente:core-financial') && r.problemas.some((p) => p.id === 'huella:core-financial:suite-ausente'));
  fs.writeFileSync(path.join(d, hue.RUTA_HUELLAS), '{ no es json');
  check('26) y sin huella legible no hay verde: FALLA cerrado', hue.verificarHuellas({ raiz: d }).problemas[0].id === 'huellas:ilegible');
  /* Registrar. */
  const previa = JSON.parse(leer(hue.RUTA_HUELLAS));
  const textosReales = Object.fromEntries(hue.suitesDeInvariantes(catalogo).map((s) => [s, leer(dom.archivoDeSuite(s))]));
  const igual = hue.construirHuellas({ catalogo, textos: textosReales, previa });
  check('27) registrar sobre las suites de hoy da la misma huella (reproducible) y no inventa bajas', JSON.stringify(igual.suites) === JSON.stringify(previa.suites) && igual.bajas.length === previa.bajas.length);
  const menos = { ...textosReales, credits: (() => { const ls = textosReales.credits.split('\n'); ls.splice(ls.findIndex((l) => /^\s*check\(/.test(l)), 1); return ls.join('\n'); })() };
  let lanza = false;
  try { hue.construirHuellas({ catalogo, textos: menos, previa }); } catch (e) { lanza = /--autoriza/.test(e.message); }
  const conAut = hue.construirHuellas({ catalogo, textos: menos, previa, autorizacion: 'motivo de prueba' });
  check('28) registrar que QUITA comprobaciones exige --autoriza «motivo» y lo deja escrito en `bajas`', lanza && conAut.bajas.at(-1).motivo === 'motivo de prueba' && conAut.bajas.at(-1).quitado.length > 0);
}

/* ── C · La verificación ──────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── C · La verificación: nunca un verde por repetir ──');
{
  const e = await ver.verificar({ raiz: RAIZ });
  check('29) la verificación estática del repositorio real PASA, y dice que NO ejecutó suites', e.resultado === 'PASA' && e.codigo === 0 && e.ejecucion === 'no-ejecutada' && e.dominios.every((f) => f.suites.every((s) => s.estado === 'NO_EJECUTADA')) && /NO se ejecutaron/.test(ver.aMarkdown(e)));
  check('30) y lista los dominios pendientes (Design, Music, Fashion) en el informe, sin contarlos como verdes ocultos', e.pendientes.length === 3 && e.dominios.filter((f) => f.estado === 'PENDIENTE').length === 3);
  /* Un ejecutor falso por suite. */
  const guion = (reglas) => { const llamadas = {}; const f = async (suite) => { llamadas[suite] = (llamadas[suite] || 0) + 1; const x = reglas[suite]; const r = typeof x === 'function' ? x(llamadas[suite]) : x; return { ms: 5, ...r }; }; f.llamadas = llamadas; return f; };
  const OK = { ok: true, codigo: 0, salida: '✔ todo bien' };
  const MAL = (txt) => ({ ok: false, codigo: 1, salida: `✘ ${txt}` });
  const ejecutar = async (reglas, extra = {}) => { const f = guion(reglas); const r = await ver.verificar({ raiz: RAIZ, modo: 'ejecutar', dominios: ['experiencia-chef'], ejecutarSuite: f, comprobarEntorno: false, ...extra }); return { r, f }; };
  const suiteChef = mapa.dominios.find((d) => d.id === 'experiencia-chef').suites[0];
  {
    const { r, f } = await ejecutar({ [suiteChef]: OK });
    check('31) todo en verde: PASA (salida 0) y cada suite se ejecuta UNA vez', r.resultado === 'PASA' && r.codigo === 0 && f.llamadas[suiteChef] === 1 && r.ejecucion === 'ejecutada');
  }
  {
    const { r, f } = await ejecutar({ [suiteChef]: (n) => (n === 1 ? MAL('163) y en un tiempo razonable — 6366 ms') : OK) });
    check('32) FALLA y luego PASA al repetirla sola = INTERMITENTE (salida 4), NO un verde: la repetición solo sirve para clasificar', r.resultado === 'INTERMITENTE' && r.codigo === 4 && f.llamadas[suiteChef] === 2 && r.intermitentes.includes(suiteChef));
    const fila = r.dominios[0].suites.find((s) => s.suite === suiteChef);
    check('33) y conserva LAS DOS salidas como evidencia, con la causa (la primera firma)', fila.evidencia.primera.cola.includes('6366 ms') && fila.evidencia.repeticion.ok === true && /razonable/.test(fila.evidencia.primera.firma));
  }
  {
    const { r, f } = await ejecutar({ [suiteChef]: MAL('5) coste — 120 ms') });
    check('34) FALLA las dos veces con la misma firma (aunque cambie el tiempo medido) = FALLA reproducible (salida 1)', r.resultado === 'FALLA' && r.codigo === 1 && r.dominios[0].suites[0].clase === 'reproducible' && f.llamadas[suiteChef] === 2);
  }
  {
    const { r } = await ejecutar({ [suiteChef]: (n) => MAL(n === 1 ? 'a) uno' : 'b) otro') });
    check('35) falla las dos veces con firmas distintas = FALLA inestable (peor que reproducible, nunca verde)', r.resultado === 'FALLA' && r.dominios[0].suites[0].clase === 'inestable');
  }
  {
    const { r, f } = await ejecutar({ [suiteChef]: { ok: false, codigo: 1, salida: "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'typescript'" } });
    check('36) si el ENTORNO no deja ejecutar (módulo ausente) = ENTORNO (salida 5), no se repite y NO es verde ni «fallo del código»', r.resultado === 'ENTORNO' && r.codigo === 5 && f.llamadas[suiteChef] === 1 && r.entornoNoVerificable.includes(suiteChef));
    const x = await ejecutar({ [suiteChef]: { ok: false, codigo: null, salida: '', errorDeSpawn: 'spawn node ENOENT' } });
    check('37) y un proceso que ni arranca también es ENTORNO', x.r.resultado === 'ENTORNO');
  }
  {
    const { r } = await ejecutar({ [suiteChef]: (n) => (n === 1 ? { ok: false, codigo: 1, salida: '✘ x\n[guardian] más de 600 s: se corta' } : OK) });
    check('38) un tiempo agotado que luego pasa tampoco es verde: INTERMITENTE', r.resultado === 'INTERMITENTE');
  }
  {
    const otra = mapa.dominios.find((d) => d.id === 'experiencia-travel').suites[0];
    const m = await ejecutar({ [suiteChef]: (n) => (n === 1 ? MAL('z) i') : OK), [otra]: MAL('q) f') }, { dominios: ['experiencia-chef', 'experiencia-travel'] });
    check('39) con varias suites, manda lo PEOR: una intermitente y una que falla de verdad = FALLA (salida 1)', m.r.resultado === 'FALLA' && m.r.codigo === 1 && m.r.intermitentes.includes(suiteChef));
  }
  {
    /* Una suite en varios dominios se ejecuta UNA vez y cuenta en todos. */
    const compartida = mapa.dominios.flatMap((d) => d.suites.map((s) => [s, d.id])).reduce((m, [s, id]) => m.set(s, [...(m.get(s) || []), id]), new Map());
    const [suite, ids] = [...compartida].find(([, v]) => v.length > 1);
    const f = guion({ [suite]: OK });
    const r = await ver.verificar({ raiz: RAIZ, modo: 'ejecutar', dominios: ids, ejecutarSuite: f, comprobarEntorno: false });
    check('41) una suite que vigila varios dominios se ejecuta UNA vez y su resultado cuenta en todos', f.llamadas[suite] === 1 && r.dominios.filter((x) => x.suites.some((s) => s.suite === suite)).length === ids.length, `${suite} → ${ids.join(', ')}`);
  }
  {
    const f = guion({});
    const r = await ver.verificar({ raiz: RAIZ, modo: 'ejecutar', dominios: ['experiencia-chef'], ejecutarSuite: f, entorno: { GEMINI_API_KEY: 'una-clave-real', FIREBASE_TOKEN: 'x' } });
    check('42) con claves reales en el entorno NO se ejecuta nada: ENTORNO (falla cerrado), y dice cuáles por NOMBRE (nunca el valor)', r.resultado === 'ENTORNO' && Object.keys(f.llamadas).length === 0 && r.entorno.motivos.some((m) => /GEMINI_API_KEY/.test(m)) && !JSON.stringify(r).includes('una-clave-real'));
  }
  {
    let lanza = 0;
    for (const x of [{ modo: 'raro' }, { estabilidad: -1 }, { estabilidad: 51 }, { estabilidad: 1.5 }, { dominios: ['no-existe'] }]) { try { await ver.verificar({ raiz: RAIZ, comprobarEntorno: false, ...x }); } catch { lanza++; } }
    check('43) una entrada inválida (modo, estabilidad fuera de 0-50, dominio desconocido) LANZA: no se interpreta con generosidad', lanza === 5);
  }
}

/* ── D · Estabilidad y evidencia ──────────────────────────────────────────────────────────────────────────── */
console.log('\n── D · Estabilidad (cazar una intermitencia sin taparla) y evidencia sin secretos ──');
{
  const suite = mapa.dominios.find((d) => d.id === 'experiencia-travel').suites[0];
  const corre = (patron) => { let n = 0; return async () => { const ok = patron[n++ % patron.length]; return { ms: 1, ok, codigo: ok ? 0 : 1, salida: ok ? '✔' : '✘ 163) tiempo — 6366 ms' }; }; };
  const est = (patron, veces) => ver.medirEstabilidad(suite, { ejecutarSuite: corre(patron), limiteMs: 1, veces });
  const a = await est([true, true, true, true, true, true, true, true, true, false], 10);
  check('44) 1 fallo en 10 ejecuciones = INTERMITENTE con su tasa (1/10), con evidencia', a.estado === 'INTERMITENTE' && a.estabilidad.fallos === 1 && a.estabilidad.veces === 10 && a.evidencia.primera.cola.includes('6366'));
  check('45) 10 de 10 en verde = PASA; 10 de 10 en rojo = FALLA (no «intermitente»)', (await est([true], 10)).estado === 'PASA' && (await est([false], 10)).estado === 'FALLA');
  const dentro = await ver.verificar({ raiz: RAIZ, modo: 'ejecutar', dominios: ['experiencia-travel'], estabilidad: 4, comprobarEntorno: false, ejecutarSuite: corre([true, false]) });
  check('46) con --estabilidad el informe lo dice por suite, y un solo fallo ya NO es verde (salida 4)', dentro.resultado === 'INTERMITENTE' && dentro.codigo === 4 && dentro.dominios[0].suites[0].estabilidad.fallos === 2);
  const clave = `AIza${'x'.repeat(35)}`;
  const f = await ver.verificarSuite(suite, { limiteMs: 1, ejecutarSuite: async () => ({ ms: 1, ok: false, codigo: 1, salida: `✘ 1) mal\nBearer ${'a'.repeat(30)}\nGEMINI ${clave}\n-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\nsk-${'b'.repeat(30)}` }) });
  const texto = JSON.stringify(f);
  check('47) la evidencia que se conserva sale REDACTADA: ni claves de Google, ni Bearer, ni claves privadas, ni sk-…', !texto.includes(clave) && !texto.includes('BEGIN PRIVATE KEY-----\\nabc') && !/Bearer a{30}/.test(texto) && !/sk-b{30}/.test(texto) && /REDACTADO/.test(texto));
  check('48) la firma de un fallo ignora el tiempo medido pero no el resto', ver.firmaDeFallo('✘ x — 120 ms') === ver.firmaDeFallo('✘ x — 9000 ms') && ver.firmaDeFallo('✘ x — 120 ms') !== ver.firmaDeFallo('✘ y — 120 ms') && ver.firmaDeFallo('todo ✔') === '');
}

/* ── E · El informe ───────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── E · El informe de autoverificación: las ocho preguntas ──');
{
  const e = await ver.verificar({ raiz: RAIZ });
  const registro = [
    { clave: 'k1', corrector: 'json-con-bom', estado: 'EN_CURSO', archivos: ['config/a.json'], causa: 'BOM' },
    { clave: 'k1', corrector: 'json-con-bom', estado: 'ACEPTADA', archivos: ['config/a.json'], causa: 'BOM', rama: 'guardian/auto/abc', reversible: true, verificaciones: [{ nombre: 'alcance', ok: true }, { nombre: 'controles-intactos', ok: true }] },
    { clave: 'k2', corrector: 'json-con-bom', estado: 'REQUIERE_HUMANO', archivos: ['firestore.indexes.json'], causa: 'BOM', categorias: ['esquemas-y-migraciones'], requiereHumano: true, motivo: 'toca una categoría que decide una persona' },
    { clave: 'k3', corrector: 'lib-desfasado', estado: 'APLICADA', archivos: [], causa: 'lib', reversible: false, verificaciones: [{ nombre: 'lib-al-dia', ok: true }] },
  ];
  const i = inf.construirInforme({ verificacion: e, registro });
  check('49) el informe responde a las ocho preguntas', ['ejecutadas', 'fallidas', 'causas', 'correcciones', 'pruebasPosteriores', 'pendientes', 'reversibilidad', 'necesitaHumanos'].every((k) => k in i));
  check('50) distingue lo corregido por estado: una ACEPTADA (lista, sin aplicar), una que REQUIERE_HUMANO y una derivada NO reversible', i.correcciones.find((c) => c.clave === 'k1').estado === 'ACEPTADA' && i.correcciones.find((c) => c.clave === 'k2').requiereHumano === true && i.reversibilidad.find((r) => r.clave === 'k3').reversible === false && i.reversibilidad.find((r) => r.clave === 'k1').reversible === true);
  check('51) lo que necesita a una persona incluye lo escalado Y lo aceptado pero sin aplicar (aplicar es decisión humana)', i.necesitaHumanos.some((h) => /firestore\.indexes\.json/.test(h.que)) && i.necesitaHumanos.some((h) => /aplicarla/.test(h.porque)) && i.pendientes.some((p) => p.tipo === 'correccion-sin-aplicar'));
  check('52) con la verificación estática dice, entre los pendientes, que las suites NO se ejecutaron (no sustituye al Nivel 2)', i.pendientes.some((p) => p.tipo === 'suites-no-ejecutadas') && i.resultado === 'PASA_CON_PENDIENTES');
  const md = inf.aMarkdown(i);
  check('53) el Markdown trae las ocho secciones por su nombre', [1, 2, 3, 4, 5, 6, 7, 8].every((n) => new RegExp(`## ${n} · `).test(md)));
  const sinNada = inf.construirInforme({ verificacion: { ...e, ejecucion: 'ejecutada', pendientes: [] }, registro: [] });
  check('54) sin correcciones ni pendientes dice «nada», no inventa trabajo del Guardian', sinNada.correcciones.length === 0 && sinNada.necesitaHumanos.length === 0 && sinNada.resultado === 'SIN_PENDIENTES_HUMANOS');
  let lanza = false;
  try { inf.construirInforme({ verificacion: { contrato: 'otro' }, registro: [] }); } catch { lanza = true; }
  check('55) una verificación de otro contrato no se acepta', lanza);
  const caida = await ver.verificar({ raiz: RAIZ, modo: 'ejecutar', dominios: ['experiencia-chef'], comprobarEntorno: false, ejecutarSuite: async () => ({ ms: 1, ok: false, codigo: 1, salida: '✘ 1) roto' }) });
  const ic = inf.construirInforme({ verificacion: caida, registro: [] });
  check('56) un fallo real aparece en «qué falló», «causa» y «qué necesita a una persona»; el resultado del informe es el de la verificación', ic.resultado === 'FALLA' && ic.fallidas.length > 0 && ic.causas[0].causa.includes('roto') && ic.necesitaHumanos.some((h) => /FALLA/.test(h.que)));
}

/* ── F · El workflow ──────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── F · guardian-dominios.yml: solo lectura, sin secretos, sin push, anti-bucle ──');
const WF = '.github/workflows/guardian-dominios.yml';
const wf = leer(WF);
const sinComentarios = wf.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
{
  check('57) permisos mínimos: `contents: read` y nada más; ni `write`, ni `id-token`', /^permissions:\s*\n\s+contents: read\s*$/m.test(wf) && !/write|id-token/.test(sinComentarios.replace(/read\/write/g, '')));
  check('58) sin secretos ni credenciales: ni `secrets.`, ni `environment:`, ni auth de Google, y el primer paso exige un entorno sin claves', !/\bsecrets\.|environment:|google-github-actions|GOOGLE_|FIREBASE_TOKEN/.test(sinComentarios) && /ci-sin-secretos/.test(wf));
  check('59) sin `pull_request_target` (nada se ejecuta con el contexto de la base) y el checkout no deja credenciales', !/pull_request_target/.test(sinComentarios) && (sinComentarios.match(/persist-credentials: false/g) || []).length === (sinComentarios.match(/actions\/checkout@/g) || []).length);
  check('60) SIN push, ni auto-merge, ni despliegue, ni escritura en el repositorio', !/git push|git commit|gh pr (merge|create|edit|comment)|auto-merge|firebase deploy|gcloud|vercel|--admin|gh api|git add/.test(sinComentarios));
  const usos = [...sinComentarios.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  const ci = leer('.github/workflows/ci.yml');
  const deCI = new Set([...ci.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]));
  check('61) todas las acciones van fijadas por SHA completo y son de GitHub (actions/*); las de la CI, idénticas', usos.length >= 3 && usos.every((u) => /^actions\/[\w-]+@[0-9a-f]{40}$/.test(u)) && usos.filter((u) => /checkout|setup-node/.test(u)).every((u) => deCI.has(u)), usos.join(' '));
  const lineas = sinComentarios.split('\n');
  const interpoladaEnRun = lineas.some((l, k) => {
    if (!/^\s*(?:- )?run:/.test(l)) return false;
    if (/\$\{\{/.test(l)) return true;
    if (!/run:\s*[|>]/.test(l)) return false;
    const sangria = l.match(/^\s*/)[0].length;
    for (let j = k + 1; j < lineas.length && (lineas[j].trim() === '' || lineas[j].match(/^\s*/)[0].length > sangria); j++) if (/\$\{\{/.test(lineas[j])) return true;
    return false;
  });
  check('62) ninguna expresión `${{ }}` dentro de un `run:` (ni en su bloque): las entradas del dispatch llegan por `env:`', !interpoladaEnRun && /GUARDIAN_DOMINIOS: \$\{\{ inputs\.dominios \}\}/.test(wf));
  check('63) concurrency: un push nuevo cancela la ejecución vieja en un PR (y en main cada commit lleva su grupo)', /concurrency:\s*\n\s+group: guardian-dominios-\$\{\{ github\.ref == 'refs\/heads\/main' && github\.sha \|\| github\.ref \}\}\s*\n\s+cancel-in-progress: \$\{\{ github\.ref != 'refs\/heads\/main' \}\}/.test(wf));
  const jobs = wf.slice(wf.indexOf('\njobs:'));
  const bloqueEstatico = jobs.slice(jobs.indexOf('  dominios:'), jobs.indexOf('  ejecucion:'));
  check('64) el check que debe llegar siempre («Guardian de dominios (estático)») NO tiene `if:` que lo salte, ni `continue-on-error`, ni filtros de rama o ruta en el disparador',
    /name: Guardian de dominios \(estático\)/.test(bloqueEstatico) && !/^\s{4}if:/m.test(bloqueEstatico) && !/continue-on-error/.test(sinComentarios) && !/\bpaths(-ignore)?:|\bbranches-ignore:/.test(sinComentarios));
  check('65) la ejecución de suites va en otro trabajo, solo a mano (modo «ejecutar») o por la mañana del lunes, con tiempo máximo y sin ser un check requerido', /ejecucion:\s*\n\s+name: Guardian de dominios \(ejecución de suites\)\s*\n\s+if: github\.event_name == 'schedule' \|\| \(github\.event_name == 'workflow_dispatch' && inputs\.modo == 'ejecutar'\)/.test(jobs) && (sinComentarios.match(/timeout-minutes:/g) || []).length === 2);
  check('66) publica resultados comprensibles (resumen del job + artefactos con evidencia, con retención) y los publica AUNQUE falle', /GITHUB_STEP_SUMMARY/.test(wf) && (sinComentarios.match(/upload-artifact@/g) || []).length === 2 && (sinComentarios.match(/retention-days: 30/g) || []).length === 2 && (sinComentarios.match(/if: always\(\)/g) || []).length >= 4);
  check('67) los parámetros del dispatch los valida el script: estabilidad fuera de 0-50 o un dominio desconocido son FALLO (salida 3), no una ejecución distinta', (() => {
    const x = spawnSync(process.execPath, [path.join(RAIZ, 'ops/guardian/verificar.mjs'), '--modo', 'estatico'], { encoding: 'utf8', env: { ...process.env, GUARDIAN_ESTABILIDAD: '99' } });
    const y = spawnSync(process.execPath, [path.join(RAIZ, 'ops/guardian/verificar.mjs'), '--modo', 'estatico'], { encoding: 'utf8', env: { ...process.env, GUARDIAN_DOMINIOS: 'no-existe' } });
    return x.status === 3 && y.status === 3;
  })());
  const cli = spawnSync(process.execPath, [path.join(RAIZ, 'ops/guardian/verificar.mjs'), '--modo', 'estatico', '--json', path.join(os.tmpdir(), `guardian-cli-${process.pid}.json`)], { encoding: 'utf8' });
  const jsonCli = (() => { try { return JSON.parse(fs.readFileSync(path.join(os.tmpdir(), `guardian-cli-${process.pid}.json`), 'utf8')); } catch { return null; } })();
  limpiezas.push(path.join(os.tmpdir(), `guardian-cli-${process.pid}.json`));
  check('68) el CLI real: salida 0, JSON del contrato y el informe dice que no ejecutó suites', cli.status === 0 && jsonCli?.contrato === ver.CONTRATO && jsonCli.ejecucion === 'no-ejecutada', `salida ${cli.status}`);
  const sinSalida = spawnSync(process.execPath, [path.join(RAIZ, 'ops/guardian/verificar.mjs'), '--modo', 'estatico', '--json', path.join(os.tmpdir(), 'no-existe-guardian', 'x.json')], { encoding: 'utf8' });
  check('69) si no se puede escribir el informe (sin evidencia) es FALLO (salida 3), no verde', sinSalida.status === 3 && /no se pudo escribir el informe/.test(sinSalida.stderr));
}

/* ── G · La propuesta de check requerido ──────────────────────────────────────────────────────────────────── */
console.log('\n── G · La propuesta de check requerido: preparada y NO aplicada ──');
{
  const actual = JSON.parse(leer('ops/github/ruleset-main.json'));
  const propuesta = JSON.parse(leer('ops/github/propuesta-guardian-dominios-requerido.json'));
  const checksDe = (r) => r.rules.find((x) => x.type === 'required_status_checks').parameters.required_status_checks;
  const base = checksDe(actual).map((c) => c.context);
  const nueva = checksDe(propuesta);
  check('70) la propuesta es el ruleset de hoy MÁS los dos checks del Guardian (el de la base y el de dominios), con el nombre exacto del trabajo y emitidos por GitHub Actions',
    nueva.map((c) => c.context).join('|') === [...base, 'Guardian de la base (independiente)', 'Guardian de dominios (estático)'].join('|') && nueva.every((c) => c.integration_id === 15368));
  const sinChecks = (r) => JSON.stringify({ ...r, rules: r.rules.map((x) => (x.type === 'required_status_checks' ? { type: x.type } : x)) });
  check('71) y NO cambia nada más del ruleset (mismo nombre, mismas reglas, sin excepciones de bypass)', sinChecks(propuesta) === sinChecks(actual) && propuesta.bypass_actors.length === 0 && propuesta.enforcement === 'active');
  check('72) NO está aplicada: ruleset-main.json sigue exigiendo solo los cuatro de la CI', base.length === 4 && !base.includes('Guardian de dominios (estático)'));
  check('73) el nombre del check coincide con el del trabajo del workflow', new RegExp(`name: ${nueva.at(-1).context.replace(/[().]/g, '\\$&')}`).test(wf));
  check('74) el procedimiento administrativo queda escrito (docs/GUARDIAN-ESTADO.md): qué cambiar, cómo volver atrás y cuándo NO', existe('docs/GUARDIAN-ESTADO.md') && /propuesta-guardian-dominios-requerido\.json/.test(leer('docs/GUARDIAN-ESTADO.md')) && /volver atrás|marcha atrás/i.test(leer('docs/GUARDIAN-ESTADO.md')));
}

/* ── H · Integración ──────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── H · La integración con la CI y la cadena ──');
{
  const ci = leer('.github/workflows/ci.yml');
  check('75) las dos suites nuevas están en la cadena de `npm test` y en el bucle de políticas del Nivel 3', ['guardian-dominios', 'guardian-autocorreccion'].every((s) => cadena.includes(s) && new RegExp(`guardian-base-workflow guardian-dominios guardian-autocorreccion; do`).test(ci)));
  check('76) la autocorrección NO está en la CI ni en el workflow nuevo (ahí solo se detectaría; nada que se corrija allí persiste)', !/autocorreccion\.mjs/.test(ci.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n')) && !/autocorreccion\.mjs/.test(sinComentarios));
  check('77) ops/guardian/** está entre las protecciones propias del Guardian (un cambio ahí se dice como AUTOPROTECCIÓN) y entre las protegidas de la autocorrección', /'ops\/guardian\/\*\*'/.test(leer('ops/harness/guardian-ci.mjs')) && /'ops\/guardian\/\*\*'/.test(leer('ops/guardian/autocorreccion.mjs')));
  check('78) el estado de la autocorrección (ops/guardian/.estado) no se versiona', /^ops\/guardian\/\.estado\/$/m.test(leer('.gitignore')));
}

/* ── I · Sabotajes ────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── I · Sabotajes: quitar un cerrojo hace fallar la prueba que lo vigila ──');
{
  const fuente = leer('ops/guardian/verificar.mjs');
  const mutante = async (cambios) => {
    let t = fuente;
    for (const [a, b] of cambios) { if (!t.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 60)}`); t = t.replace(a, b); }
    const archivo = path.join(RAIZ, `ops/guardian/_sabotaje-verificar-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(archivo, t);
    try { return await import(`${pathToFileURL(archivo).href}?${Date.now()}`); } finally { fs.rmSync(archivo, { force: true }); }
  };
  const suite = mapa.dominios.find((d) => d.id === 'experiencia-chef').suites[0];
  const unaVez = (resultados) => { let n = 0; return async () => resultados[Math.min(n++, resultados.length - 1)]; };
  const MAL = { ms: 1, ok: false, codigo: 1, salida: '✘ 1) roto' };
  const OK = { ms: 1, ok: true, codigo: 0, salida: '' };
  const corre = (m, resultados) => m.verificar({ raiz: RAIZ, modo: 'ejecutar', dominios: ['experiencia-chef'], comprobarEntorno: false, ejecutarSuite: unaVez(resultados) });
  const m1 = await mutante([["if (primera.ok) return { estado: 'PASA', clase: 'pasa' };", "if (primera.ok || (segunda && segunda.ok)) return { estado: 'PASA', clase: 'pasa' };"]]);
  check('79) SABOTAJE «una repetición verde vale como pase»: la prueba 32 lo detecta (el fallo intermitente pasaría a PASA)', (await corre(m1, [MAL, OK])).resultado === 'PASA' && (await corre(ver, [MAL, OK])).resultado === 'INTERMITENTE');
  const m2 = await mutante([["if (problemas.length) global = 'FALLA';", "if (false) global = 'FALLA';"]]);
  const rotoMapa = (m) => m.verificar({ raiz: (() => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-s-')); limpiezas.push(d); fs.mkdirSync(path.join(d, 'functions'), { recursive: true }); fs.mkdirSync(path.join(d, 'ops/guardian'), { recursive: true }); fs.copyFileSync(path.join(RAIZ, 'functions/package.json'), path.join(d, 'functions/package.json')); fs.writeFileSync(path.join(d, 'ops/guardian/dominios.json'), JSON.stringify({ contrato: dom.CONTRATO_DOMINIOS, dominios: [{ id: 'solo-uno', nombre: 'x', critico: false, estado: 'activo', suites: ['credits'], ci: ['x'] }] })); return d; })(), modo: 'estatico' });
  check('80) SABOTAJE «un mapa roto no cuenta»: la prueba 13/29 lo detecta (una cadena casi sin dominio saldría PASA)', (await rotoMapa(m2)).resultado === 'PASA' && (await rotoMapa(ver)).resultado === 'FALLA');
  const m3 = await mutante([['|| PATRONES_DE_ENTORNO.some((re) => re.test(String(resultado?.salida || \'\')));', '|| false;']]);
  const entornoMalo = { ms: 1, ok: false, codigo: 1, salida: "Cannot find package 'typescript'" };
  check('81) SABOTAJE «el entorno no se reconoce»: la prueba 36 lo detecta (un módulo ausente pasaría por fallo del código)', (await corre(m3, [entornoMalo, entornoMalo])).resultado !== 'ENTORNO' && (await corre(ver, [entornoMalo, entornoMalo])).resultado === 'ENTORNO');
  const m4 = await mutante([['if (secretos.length) motivos.push(...motivosDeEntorno(entorno, secretos));', '']]);
  check('82) SABOTAJE «sin comprobar las claves del entorno»: la prueba 42 lo detecta (con claves reales ya no se pararía)', (await m4.verificar({ raiz: RAIZ, modo: 'ejecutar', dominios: ['experiencia-chef'], ejecutarSuite: unaVez([OK]), entorno: { GEMINI_API_KEY: 'x' } })).resultado !== 'ENTORNO' && (await ver.verificar({ raiz: RAIZ, modo: 'ejecutar', dominios: ['experiencia-chef'], ejecutarSuite: unaVez([OK]), entorno: { GEMINI_API_KEY: 'x' } })).resultado === 'ENTORNO');
  void suite;
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
