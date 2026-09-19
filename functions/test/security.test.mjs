import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const read = (p) => {
  try {
    return fs.readFileSync(path.resolve(root, p), 'utf8');
  } catch {
    return '';
  }
};
const readDir = (dir, exts = ['.ts', '.tsx']) => {
  const out = [];
  const walk = (d) => {
    let entries = [];
    try {
      entries = fs.readdirSync(path.resolve(root, d), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'lib') continue;
        walk(rel);
      } else if (exts.some((x) => e.name.endsWith(x))) {
        out.push({ file: rel, text: read(rel) });
      }
    }
  };
  walk(dir);
  return out;
};

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

console.log('── Seguridad: ningún secreto sale de las Functions ──');

// 1) Ninguna clave de proveedor en el código que se compila en la app
const PROVIDER_KEYS = ['GEMINI_API_KEY', 'ARK_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'BFL_API_KEY', 'ELEVENLABS_API_KEY', 'MINIMAX_API_KEY', 'SEEDANCE_CALLBACK_TOKEN'];
const clientDirs = ['services', 'screens', 'components', 'hooks', 'constants', 'utils', 'config', 'navigation', 'contexts'];
const clientFiles = clientDirs.flatMap((d) => readDir(d));
const leaked = clientFiles.filter((f) => PROVIDER_KEYS.some((k) => f.text.includes(k)));
check('ninguna clave de proveedor aparece en el código del cliente', leaked.length === 0, leaked.map((f) => f.file).join(', '));
/*
 * La lista blanca de lo que el cliente puede leer del entorno. Todo lo que entra
 * aquí viaja dentro del paquete de la app y lo puede leer cualquiera, así que
 * solo caben identificadores públicos e interruptores de desarrollo.
 *
 * WALL_PREVIEW es un interruptor: enciende el muro de mentira que sirve para
 * juzgar el diseño (utils/previewWall.ts). No es una credencial, no abre nada y
 * apagado no hace absolutamente nada (fase 2E-73).
 */
check('el cliente solo usa identificadores públicos (Firebase, emuladores, client id de Google, interruptores de preview)', clientFiles.every((f) => (f.text.match(/EXPO_PUBLIC_[A-Z_]+/g) || []).every((v) => /FIREBASE|EMULATOR|GOOGLE_CLIENT_ID|WALL_PREVIEW/.test(v))));

// 2) Nada de claves con valor en el código fuente
const serverFiles = readDir('functions/src');
const HARDCODED = [/\bsk-[A-Za-z0-9]{20,}/, /\bAIza[A-Za-z0-9_-]{25,}/, /\bsk-ant-[A-Za-z0-9]{20,}/];
const hardcoded = [...serverFiles, ...clientFiles].filter((f) => HARDCODED.some((re) => re.test(f.text)));
check('ninguna clave está escrita a mano en el código', hardcoded.length === 0, hardcoded.map((f) => f.file).join(', '));

// 3) Los secretos de producción usan Cloud Secret Manager
const secretsSrc = read('functions/src/secrets.ts');
check('existe el módulo de secretos con defineSecret de firebase-functions/params', /defineSecret/.test(secretsSrc) && /firebase-functions\/params/.test(secretsSrc));
check('las ocho credenciales están declaradas como secretos', PROVIDER_KEYS.every((k) => secretsSrc.includes(`'${k}'`)), PROVIDER_KEYS.filter((k) => !secretsSrc.includes(`'${k}'`)).join(', '));
const bound = serverFiles.filter((f) => /secrets: (AI_SECRETS|CALLBACK_SECRETS)/.test(f.text));
check('las funciones que llaman a un proveedor declaran sus secretos', bound.length >= 6, bound.map((f) => f.file.split('/').pop()).join(', '));
const engineCallers = ['functions/src/creator/brain.ts', 'functions/src/creator/index.ts', 'functions/src/creator/video.ts', 'functions/src/generateAvatar.ts'];
check('brain, creator, video y avatar están entre ellas', engineCallers.every((f) => /secrets: AI_SECRETS/.test(read(f))));
// Se busca la llamada real, no la mención en un comentario
const codeLines = (text) => text.split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l));
check('functions.config(), obsoleto desde la versión 6, no se usa en ningún sitio', !serverFiles.some((f) => codeLines(f.text).some((l) => /functions\.config\(/.test(l))));

// 4) Sanitización de registros
const { sanitizeForLog, safeUrl, providerLog, REDACTED } = lib('engine/sanitize.js');
check('Authorization nunca sobrevive a la sanitización', !sanitizeForLog('{"authorization":"Bearer abc123def456ghi789"}').includes('abc123def456'), sanitizeForLog('{"authorization":"Bearer abc123def456ghi789"}'));
check('un Bearer suelto se censura', !sanitizeForLog('fallo: Bearer eyJhbGciOiJIUzI1NiJ9xxxxxxxx').includes('eyJhbGciOiJIUzI1NiJ9'));
check('las cabeceras de clave de cada proveedor se censuran', ['x-api-key', 'xi-api-key', 'x-key', 'api_key', 'apikey'].every((h) => !sanitizeForLog(`${h}: abcd1234efgh5678ijkl`).includes('abcd1234efgh5678')));
check('las cookies se censuran', !sanitizeForLog('set-cookie: session=abcdef123456; Path=/').includes('abcdef123456'));
check('las formas conocidas de clave se censuran', !sanitizeForLog('key sk-abcdefghijklmnopqrstuvwx').includes('sk-abcdefghijkl') && !sanitizeForLog('AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz01234').includes('AIzaSyAbCdEfGhIjKl'));
check('una clave en la cadena de consulta se censura', !sanitizeForLog('https://api.x/v1?api_key=abcdef123456789').includes('abcdef123456789'));
check('el mensaje se recorta y no crece sin control', sanitizeForLog('x'.repeat(5000)).length <= 201);
check('queda información útil para depurar', sanitizeForLog('{"error":{"code":"InvalidParameter","message":"duration must be 4-15"}}').includes('InvalidParameter'));
check('safeUrl quita usuario, contraseña y consulta', safeUrl('https://user:pass@api.x/v1/tasks?token=abc') === 'https://api.x/v1/tasks');
const log = providerLog({ provider: 'seedance', model: 'dreamina-seedance-2-0-fast-260128', endpoint: 'https://ark.x/api/v3/tasks?token=secreto', status: 400, requestId: 'req_1', code: 'InvalidParameter', message: 'authorization: Bearer abcdefghijklmno' });
check('el registro de un fallo lleva proveedor, modelo, endpoint sin secretos, estado y código', /proveedor=seedance/.test(log) && /modelo=dreamina/.test(log) && /http=400/.test(log) && /requestId=req_1/.test(log) && /codigo=InvalidParameter/.test(log) && !log.includes('secreto') && !log.includes('abcdefghijklmno'), log);

// 5) Los errores de proveedor nacen ya sanitizados
const httpSrc = read('functions/src/engine/http.ts');
check('http.ts no construye ningún mensaje con el cuerpo crudo del proveedor', !httpSrc.includes('text.slice(0, 300)') && (httpSrc.match(/sanitizeForLog\(/g) || []).length >= 3);
check('el registro del servidor sanitiza antes de imprimir', /console\.error\([^)]*sanitizeForLog/.test(read('functions/src/engine/errors.ts')));
check('el libro de generaciones guarda el error sanitizado', /error: sanitizeForLog\(/.test(read('functions/src/engine/router.ts')));

// 6) Firestore: las colecciones del motor están cerradas de forma explícita
const rules = read('firestore.rules');
const closed = (name) => new RegExp(`match /${name}/\\{[a-zA-Z]+\\} \\{\\s*allow read, write: if false;`).test(rules);
check('aiProviderCallbacks tiene regla explícita y cerrada', closed('aiProviderCallbacks'));
check('aiProviderVerification tiene regla explícita y cerrada', closed('aiProviderVerification'));
check('las demás colecciones del motor siguen cerradas', ['aiProviders', 'aiRouting', 'aiSettings', 'aiUsage', 'aiRateLimits'].every(closed));
check('el libro de generaciones sigue siendo de solo lectura para su dueño', /match \/aiGenerations\/\{generationId\} \{[\s\S]*?allow read: if isAuthenticated\(\) && resource\.data\.userId == request\.auth\.uid;[\s\S]*?allow write: if false;/.test(rules));
check('no hay ninguna regla comodín que abra colecciones sin declarar', !/match \/\{document=\*\*\}/.test(rules));

// 7) Git nunca ve un secreto
const gitignore = read('.gitignore');
check('.env y .env*.local están excluidos de Git', /^\.env$/m.test(gitignore) && /\.env\*\.local/.test(gitignore));
check('los archivos de entorno de producción están excluidos', /functions\/\.env\.get-wee/.test(gitignore) && /functions\/\.env\.prod/.test(gitignore));
const example = read('functions/.env.example');
check('el ejemplo de entorno no trae ningún valor de clave', PROVIDER_KEYS.every((k) => !new RegExp(`^${k}=.+`, 'm').test(example)));
check('el ejemplo explica que los secretos de producción van por Secret Manager', /Secret Manager/i.test(example));

/*
 * ── FRONTERAS DE AUTORIZACIÓN (fase 10) ────────────────────────────────────
 *
 * Cuatro agujeros que la revisión encontró y cerró. Lo de verdad —intentar la
 * escritura y ver si pasa— se ejecuta contra el emulador en
 * `fronteras-rules.emulator.mjs`, que no cabe en esta suite porque necesita
 * Java. Aquí queda la guarda de texto, que es lo que impide que alguien
 * deshaga la corrección sin enterarse.
 */
console.log('\n── Fronteras de autorización ──');
{
  const reglas = read('firestore.rules');

  check('una notificación no se puede firmar con la identidad de otra persona',
    /allow create: if isAuthenticated\(\) &&\s*\n\s*\(request\.resource\.data\.senderId == request\.auth\.uid/.test(reglas),
    'dispara un push de verdad con `senderName` tal cual');

  check('los contadores solo se mueven de uno en uno',
    /function contadorSano\(campo\)/.test(reglas)
    && /\) in \[1, -1\]/.test(reglas)
    && (reglas.match(/contadorSano\('/g) || []).length >= 10);

  check('el perfil de otra persona ya no admite que le muevan los seguidores',
    !/hasOnly\(\['followers', 'following'\]\)/.test(reglas),
    'la rama era para follows, que es código muerto');

  check('un voto nuevo es de la CUENTA: una persona, un voto',
    /match \/votes\/\{voteId\} \{[\s\S]{0,300}?allow create: if isAuthenticated\(\) &&\s*\n\s*request\.resource\.data\.userId == request\.auth\.uid;/.test(reglas)
    && /match \/commentVotes\/\{voteId\} \{[\s\S]{0,300}?allow create: if isAuthenticated\(\) &&\s*\n\s*request\.resource\.data\.userId == request\.auth\.uid;/.test(reglas));
  check('y los votos antiguos con la cara Weë todavía se pueden retirar',
    /allow delete: if isAuthenticated\(\) &&\s*\n\s*\(resource\.data\.userId == request\.auth\.uid \|\|\s*\n\s*resource\.data\.userId == \("hidi_" \+ request\.auth\.uid\)\);/.test(reglas),
    'en producción hay ocho: no se estranda a nadie');

  check('un negocio y una comunidad se crean con la CUENTA, no con una cara',
    /ownerId: user\?\.uid|const activeUid = user\?\.uid;/.test(read('screens/WeeBizRegisterScreen.tsx'))
    && /createdBy: user\.uid,/.test(read('screens/CommunitiesManagementScreen.tsx')));
  check('y el muro vota con la cuenta, como el detalle y las encuestas',
    /userId: user\?\.uid,/.test(read('components/PostCard.tsx'))
    && !/userId: activeProfile\?\.uid/.test(read('components/PostCard.tsx'))
    && !/userId: activeProfile\?\.uid/.test(read('screens/ReelsScreen.tsx')));

  check('avatarReplacement ya no descarga cualquier URL que le manden',
    /assertInputImageUrl\(request\.data\?\.selfieUrl, request\.auth\.uid\)/.test(read('functions/src/generateAvatar.ts'))
    && /assertInputImageUrl\(request\.data\?\.avatarUrl, request\.auth\.uid\)/.test(read('functions/src/generateAvatar.ts')),
    'el resultado acaba en una ruta de lectura pública');

  check('las subidas tienen un tope, y está dicho que no es una frontera',
    /const MAXIMO_DE_IMAGEN/.test(read('services/cloudinaryService.ts'))
    && /NO es una frontera de seguridad/.test(read('services/cloudinaryService.ts')));

  check('el subárbol privado de una cuenta existe y solo lo lee su dueño',
    /match \/private\/\{documento\} \{[\s\S]{0,200}?allow read: if isAuthenticated\(\) && request\.auth\.uid == userId;[\s\S]{0,80}?allow write: if false;/.test(reglas));

  check('el callable que autoriza Credits sin liquidarlos está marcado como no habilitado',
    /NO HABILITADO COMO RUTA DE PRODUCTO/.test(read('functions/src/credits/index.ts')));
}

console.log(failures ? `\n${failures} comprobación(es) de seguridad fallaron` : '\nSeguridad: ningún secreto sale de las Functions');
process.exit(failures ? 1 : 0);
