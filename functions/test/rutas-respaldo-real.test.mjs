/*
 * FRENTE E · ¿EXISTE DE VERDAD EL CAMBIO AUTOMÁTICO DE PROVEEDOR? (adaptadores REALES, red cortada)
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Las suites del router usan proveedores inventados. Aquí se usan los ADAPTADORES
 * REALES de `ADAPTERS`, las cadenas por defecto (`DEFAULT_ROUTING`), los ajustes
 * por defecto y la elegibilidad real de cada modelo; las claves son textos falsos
 * puestos solo en este proceso y la red está cortada (fetch y sockets rechazan y
 * apuntan a qué host se intentó salir). Así se ve, capacidad por capacidad:
 *
 *   1. qué proveedores PUEDEN atender (candidatos reales) y si hay respaldo;
 *   2. que, al caerse la red, el router los recorre EN ORDEN (los hosts que se
 *      intentan son la prueba), con una fila FAILED por intento y sin demo;
 *   3. las reglas de la casa: vídeo solo Seedance, Weë Brain solo DeepSeek, y
 *      DeepSeek nunca como respaldo de nadie;
 *   4. el cortacircuitos con adaptadores reales: tras 3 caídas, «no disponible»
 *      sin pasar al demo;
 *   5. sin claves: el demo entra solo con `allowMockFallback`, y lo que cobra.
 *
 * DEFECTOS CONOCIDOS (se informan, no paran la cadena; avisan si cambian):
 *   R1 respaldos DECLARADOS que no existen: `doc.read` → claude y `image.try_on` →
 *      gemini aparecen en la cadena (registry.ts) pero el adaptador no atiende esa
 *      capacidad: si el primero cae, no hay respaldo.
 *   R2 (B4-03) sin proveedor real, el demo de música se cotiza con Credits > 0 en
 *      modo `simulated` (el modo por defecto).
 *
 * No hace ni una petición real: cualquier salida se rechaza antes de abrir conexión.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/engine/', p));

/* ── Red cortada ───────────────────────────────────────────────────────── */
const hosts = [];
let sockets = 0;
globalThis.fetch = async (url) => { hosts.push(new URL(String(url)).host); throw new TypeError('fetch failed: RED CORTADA en la prueba'); };
net.Socket.prototype.connect = function () { sockets++; throw new Error('RED CORTADA en la prueba (socket)'); };

const CLAVES = ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'ELEVENLABS_API_KEY', 'MINIMAX_API_KEY'];
const conClaves = () => { for (const k of CLAVES) process.env[k] = `falsa-de-prueba-${k}`; };
const sinClaves = () => { for (const k of CLAVES) delete process.env[k]; };
conClaves();

const { ADAPTERS, DEFAULT_ROUTING, DEFAULT_PROVIDERS, DEFAULT_SETTINGS } = lib('registry.js');
const { createRouter, memoryHealth } = lib('router.js');
const { memoryLedger } = lib('ledger.js');

let failures = 0;
const conocidos = [];
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const conocido = (id, name, reproduce, extra = '') => {
  console.log((reproduce ? '✘ (conocido ' + id + ') ' : '✔ (¿corregido? ' + id + ') ') + name + (extra ? ' — ' + extra : ''));
  conocidos.push({ id, reproduce });
};

const config = (settings = {}) => ({ providers: DEFAULT_PROVIDERS, routing: DEFAULT_ROUTING, settings: { ...DEFAULT_SETTINGS, ...settings }, source: 'prueba' });
const montar = (settings, health = memoryHealth()) => {
  const ledger = memoryLedger();
  return { ledger, health, router: createRouter({ adapters: ADAPTERS, loadConfig: async () => config(settings), ledger, health }) };
};
const pedir = (capability, extra = {}) => ({ capability, input: { prompt: 'un gato en un tejado', text: 'hola' }, userId: 'frente-e', jobId: 'j', stepId: 's', ...extra });
const HOST = {
  gemini: 'generativelanguage.googleapis.com', claude: 'api.anthropic.com', openai: 'api.openai.com', deepseek: 'api.deepseek.com',
  seedance: 'ark.ap-southeast.bytepluses.com', seedream: 'ark.ap-southeast.bytepluses.com', flux: 'api.bfl.ai', elevenlabs: 'api.elevenlabs.io', minimax: 'api.minimax.io',
};

/* ── 1. Mapa de candidatos reales por capacidad ─────────────────────────── */
const mapa = {};
{
  const { router } = montar();
  for (const cap of Object.keys(DEFAULT_ROUTING)) {
    const d = await router.route(pedir(cap));
    mapa[cap] = { proveedores: [...new Set(d.candidates.map((c) => c.provider))], skipped: d.skipped };
  }
  console.log('\nMapa (capacidad → candidatos con claves y elegibilidad reales):');
  for (const [cap, m] of Object.entries(mapa)) console.log(`   ${cap.padEnd(24)} ${m.proveedores.join(' > ') || '(ninguno)'}`);
  const conRespaldo = Object.entries(mapa).filter(([, m]) => m.proveedores.filter((p) => p !== 'mock').length >= 2).map(([c]) => c);
  console.log(`   con respaldo real: ${conRespaldo.length} → ${conRespaldo.join(', ')}\n`);
  check('1a) el texto general tiene respaldo real entre proveedores distintos', mapa['text.generate'].proveedores.length >= 2 && !mapa['text.generate'].proveedores.includes('mock'));
  check('1b) la imagen tiene respaldo real', mapa['image.generate'].proveedores.length >= 2 && !mapa['image.generate'].proveedores.includes('mock'));
  check('1c) la voz tiene respaldo real (elevenlabs > minimax)', mapa['voice.tts'].proveedores.join('>') === 'elevenlabs>minimax');
  check('1d) el vídeo SOLO Seedance: ninguna capacidad de vídeo real tiene otro proveedor',
    ['video.generate', 'video.image_to_video', 'video.reference'].every((c) => mapa[c].proveedores.join() === 'seedance'),
    ['video.generate', 'video.image_to_video', 'video.reference'].map((c) => mapa[c].proveedores.join('|')).join(' · '));
  check('1e) DeepSeek no es respaldo de ninguna capacidad (solo llega quien lo pide por su nombre)', Object.values(mapa).every((m) => !m.proveedores.includes('deepseek')));
  check('1f) world.generate: nadie (fal desactivado por administración), ni siquiera el demo', mapa['world.generate'].proveedores.length === 0);
  const muertos = [];
  for (const [cap, r] of Object.entries(DEFAULT_ROUTING)) {
    for (const link of r.chain) {
      const a = ADAPTERS[link.provider];
      if (a && DEFAULT_PROVIDERS[link.provider]?.enabled !== false && !a.supports(cap)) muertos.push(`${cap}→${link.provider}`);
    }
  }
  conocido('R1', 'respaldos declarados en DEFAULT_ROUTING que el adaptador no atiende (registry.ts:93 doc.read→claude; :104 image.try_on→gemini): no hay respaldo real',
    muertos.length > 0, muertos.join(', ') || 'ninguno');
  check('1g) la lista de respaldos fantasma no crece sin que alguien lo vea', muertos.every((m) => ['doc.read→claude', 'image.try_on→gemini'].includes(m)), muertos.join(', '));
}

/* ── 2. Con la red caída, el router recorre la cadena en orden ──────────── */
const mensajes = [];
for (const cap of ['text.generate', 'text.structure', 'image.generate', 'image.identity_edit', 'voice.tts', 'video.generate']) {
  hosts.length = 0;
  const { router, ledger } = montar();
  const decision = await router.route(pedir(cap));
  const esperado = decision.candidates.map((c) => HOST[c.provider]);
  let error = null;
  try { await router.execute(pedir(cap)); } catch (e) { error = e; mensajes.push(String(e?.message)); }
  const filas = Object.values(ledger.records);
  check(`2) ${cap}: intenta ${decision.candidates.map((c) => c.provider).join(' > ')} en ese orden y falla controlado`,
    error?.code === 'PROVIDER_ERROR' && hosts.join('>') === esperado.join('>') && filas.length === esperado.length && filas.every((r) => r.status === 'FAILED' && r.creditsEstimated === 0),
    `hosts=${hosts.join('>')} filas=${filas.map((r) => r.provider + ':' + r.status).join(',')} código=${error?.code}`);
}
check('2z) el mensaje para la persona no nombra proveedores ni hosts', mensajes.length === 6 && mensajes.every((m) => !/gemini|claude|openai|anthropic|flux|bfl|seedream|seedance|elevenlabs|minimax|googleapis|RED CORTADA/i.test(m)), mensajes[0]);

/* ── 3. Weë Brain: DeepSeek por su nombre, sin respaldo ─────────────────── */
{
  hosts.length = 0;
  const { router, ledger } = montar();
  const brain = pedir('text.generate', { prefs: { allowedProviders: ['deepseek'] } });
  const d = await router.route(brain);
  let error = null;
  try { await router.execute(brain); } catch (e) { error = e; }
  check('3a) la petición de Brain solo tiene un candidato: deepseek', d.candidates.map((c) => c.provider).join() === 'deepseek', d.candidates.map((c) => c.provider).join());
  check('3b) caída de DeepSeek: NO se salta a Gemini/Claude/OpenAI (ni al demo); un solo host intentado', error && hosts.join() === HOST.deepseek && Object.keys(ledger.records).length === 1, hosts.join('>'));
}

/* ── 4. Cortacircuitos con adaptadores reales ───────────────────────────── */
{
  const health = memoryHealth();
  for (let i = 0; i < 3; i++) { const { router } = montar({}, health); await router.execute(pedir('voice.tts')).catch(() => {}); }
  hosts.length = 0;
  const { router, ledger } = montar({}, health);
  let error = null;
  try { await router.execute(pedir('voice.tts')); } catch (e) { error = e; }
  check('4a) tras 3 caídas seguidas, los dos proveedores de voz quedan en pausa: «no disponible» sin intentar salir', error?.code === 'NOT_AVAILABLE' && hosts.length === 0 && Object.keys(ledger.records).length === 0, `${error?.code} hosts=${hosts.join(',')}`);
  check('4b) …y la pausa NO degrada al demo (había proveedores reales configurados)', !Object.values(ledger.records).some((r) => r.provider === 'mock'));
  check('4c) el motivo es pasajero («ahora no»), no «no existe»', error?.details?.reason === 'ahora_no', JSON.stringify(error?.details));
  health.reset();
  hosts.length = 0;
  await montar({}, health).router.execute(pedir('voice.tts')).catch(() => {});
  check('4d) al reiniciar la salud (engineAdmin → resetHealth) se vuelve a intentar', hosts.length === 2, hosts.join('>'));
}

/* ── 5. Sin claves: el demo y lo que cuesta ─────────────────────────────── */
sinClaves();
{
  const { router } = montar();
  const d = await router.route(pedir('text.generate'));
  check('5a) sin ninguna clave, el texto cae al demo (allowMockFallback=true por defecto)', d.candidates.map((c) => c.provider).join() === 'mock' && d.realProviderAvailable === false);
  const off = montar({ allowMockFallback: false });
  let error = null;
  try { await off.router.execute(pedir('text.generate')); } catch (e) { error = e; }
  check('5b) con allowMockFallback=false: «no disponible», sin demo ni fila en el libro', error?.code === 'NOT_AVAILABLE' && Object.keys(off.ledger.records).length === 0, String(error?.code));
  const det = montar({ iaDetenida: true });
  let e2 = null;
  try { await det.router.execute(pedir('music.generate')); } catch (e) { e2 = e; }
  check('5c) iaDetenida también corta el demo de música', e2?.code === 'NOT_AVAILABLE' && Object.keys(det.ledger.records).length === 0);
  const musica = await router.route(pedir('music.generate'));
  const credits = musica.candidates[0]?.estimatedCredits ?? 0;
  conocido('R2', 'B4-03: sin proveedor real, la música la atiende el demo y se cotiza con Credits en modo simulated (pricing.ts: «se cobra el precio de muestra, también con el proveedor demo»)',
    musica.candidates[0]?.provider === 'mock' && credits > 0 && DEFAULT_SETTINGS.pricingMode === 'simulated', `${musica.candidates[0]?.provider} ${credits} Credits, modo ${DEFAULT_SETTINGS.pricingMode}`);
}
conClaves();
{
  const { router } = montar();
  const d = await router.route(pedir('music.generate'));
  check('5d) con claves de todo lo demás, la música sigue siendo demo (no hay proveedor de música real)', d.candidates.map((c) => c.provider).join() === 'mock');
}

check('R) ninguna conexión de socket se llegó a abrir', sockets === 0, String(sockets));
sinClaves();

const vivos = conocidos.filter((k) => k.reproduce).map((k) => k.id);
const corregidos = conocidos.filter((k) => !k.reproduce).map((k) => k.id);
if (corregidos.length) console.log(`\nℹ defectos conocidos que YA NO se reproducen: ${corregidos.join(', ')} — actualiza esta suite y el registro del Frente E`);
console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ todo bien (defectos conocidos vigentes: ${vivos.join(', ') || 'ninguno'})`);
process.exit(failures ? 1 : 0);
