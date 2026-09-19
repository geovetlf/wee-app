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

  /*
   * El dueño se reconoce por el campo `uid` del perfil, no por el id del
   * documento (los perfiles tienen id automático): antes la regla comparaba con
   * `userId` y no acertaba nunca. Escribe solo el dueño, solo `account` y solo
   * los campos de cuenta que recoge el registro; borrar, nadie desde el cliente.
   */
  check('el subárbol privado de una cuenta existe y solo lo lee y escribe su dueño',
    /match \/private\/\{documento\} \{[\s\S]{0,200}?allow read: if esDuenyoDelPerfil\(userId\);[\s\S]{0,300}?allow delete: if false;/.test(reglas)
    && /allow create, update: if esDuenyoDelPerfil\(userId\) && documento == 'account'/.test(reglas));

  check('el callable que autoriza Credits sin liquidarlos está marcado como no habilitado',
    /NO HABILITADO COMO RUTA DE PRODUCTO/.test(read('functions/src/credits/index.ts')));

  /* ── Fase 11: lo generado es de su dueño ──────────────────────────────── */
  const storage = read('storage.rules');
  check('lo que Weë genera lo lee solo su dueño, como lo que sube',
    /match \/users\/\{userId\}\/ai-generations\/\{fileName\} \{\s*\n\s*allow read: if request\.auth != null && request\.auth\.uid == userId;/.test(storage),
    'antes era `allow read: if true`: público para quien adivinara la ruta');
  check('la ficha de un material la lee su dueño y la escribe solo el servidor',
    /match \/assets\/\{assetId\} \{\s*\n\s*allow read: if isAuthenticated\(\) && resource\.data\.ownerAccountId == request\.auth\.uid;\s*\n\s*allow create, update, delete: if false;/.test(reglas));
  check('y existe la forma de borrarlo: el callable que comprueba que es tuyo antes de borrar el objeto',
    /export \{ deleteAsset \} from '\.\/content';/.test(read('functions/src/index.ts'))
    && /materialEsDeLaCuenta\(doc, accountId\)/.test(read('functions/src/content/index.ts')));
  check('un proyecto no se puede regalar: el dueño no cambia en un update',
    /request\.resource\.data\.userId == resource\.data\.userId;/.test(reglas));
  check('el servidor deriva el dueño del material de la SESIÓN, nunca del cliente',
    /ownerAccountId: uid,/.test(read('functions/src/creator/index.ts'))
    && /ownerAccountId: uid,/.test(read('functions/src/creator/video.ts'))
    && !/ownerAccountId: (data|request\.data)/.test(read('functions/src/creator/index.ts') + read('functions/src/creator/video.ts') + read('functions/src/content/index.ts')));
  /* C10: la segunda puerta a Cloudinary pasa por el mismo límite que la primera. */
  check('la subida de blobs en memoria pasa por el límite de tamaño y tipo',
    /blobSinMetadatos\(comprobarBlob\(blob, 'image'\)\)/.test(read('services/cloudinaryService.ts')));
  /* C11: ninguna barra de progreso inventada. */
  check('nadie fabrica porcentajes de subida: fetch no los da',
    !/onProgress\?\.\((5|90|100)\)/.test(read('services/cloudinaryService.ts'))
    && !/bytesTransferred: pct/.test(read('services/storageService.ts'))
    && !/uploadProgressFill/.test(read('screens/CreateScreen.tsx')));
  /* C3: la foto única de WeeTalk se puede borrar y la borra el servidor. */
  check('la foto única de WeeTalk vive en una ruta que solo leen los participantes',
    /match \/users\/\{userId\}\/weetalk\/\{conversationId\}\/\{fileName\} \{\s*\n\s*allow read: if request\.auth != null\s*\n\s*&& \(request\.auth\.uid == userId \|\| participaEn\(conversationId\)\);/.test(storage)
    && /let conversacion = \/databases\/\(default\)\/documents\/conversations\/\$\(conversationId\);/.test(storage)
    && /firestore\.exists\(conversacion\)\s*\n\s*&& \(request\.auth\.uid in firestore\.get\(conversacion\)\.data\.participants/.test(storage));
  check('y la quema el servidor comprobando la sesión: participante y no remitente',
    /export \{ burnViewOnce \} from '\.\/social\/weetalk';/.test(read('functions/src/index.ts'))
    && /quemar\(request\.auth\.uid, conversationId, messageId\)/.test(read('functions/src/social/weetalk.ts'))
    && /throw new FotoNoQuemable\('es_tuya'\)/.test(read('functions/src/social/weetalk.ts'))
    && /throw new FotoNoQuemable\('no_participas'\)/.test(read('functions/src/social/weetalk.ts')));
  /*
   * S1 (revisión de despliegue): la clave del objeto a borrar salía de la URL del
   * mensaje, que escribe el remitente. Ahora solo se borra dentro de
   * `users/<remitente>/weetalk/<conversación>/`, con el prefijo construido entero,
   * y una sola llamada al sink detrás de esa comprobación.
   */
  {
    const weetalk = read('functions/src/social/weetalk.ts');
    /*
     * El namespace es el de la CUENTA del remitente, no el de su cara: la foto sube
     * a `users/<cuenta>/weetalk/<conversación>/` (la regla del Storage compara la
     * ruta con `request.auth.uid`), y la cuenta se resuelve en el servidor con el
     * resolutor canónico (`cuentaDelRemitente` → `users.uid` → `linkedAccountId`),
     * nunca recortando el prefijo `hidi_` ni leyendo nada de la petición.
     */
    check('el borrado físico de la foto única solo ocurre dentro del namespace del remitente y la conversación',
      /const prefijo = `users\/\$\{senderId\}\/weetalk\/\$\{conversationId\}\/`;/.test(weetalk)
      && /objectKey\.startsWith\(prefijo\)/.test(weetalk)
      && /const cuenta = remitente \? await p\.cuentaDelRemitente\(remitente\) : null;/.test(weetalk)
      && /claveDeFotoUnica\(ref\.objectKey, cuenta, conversationId\)/.test(weetalk)
      && /ref\.bucket === p\.bucketDeWee\(\)/.test(weetalk)
      && (weetalk.match(/p\.borrarObjeto\(/g) || []).length === 1
      && /if \(enSuSitio\) \{\s*\n\s*try \{\s*\n\s*await p\.borrarObjeto\(ref\.objectKey\)/.test(weetalk));
    check('y la cuenta del remitente se resuelve con el resolutor canónico, sin recortar prefijos',
      /cuentaDeIdentidad\(senderId, d\.data\(\) as PerfilDeIdentidad\)/.test(weetalk)
      && !/replace\(\/\^hidi_|slice\(5\)|split\('hidi_'\)/.test(weetalk));
    check('y nunca con una comparación débil ni con una identidad que llegue en la petición',
      !/includes\(senderId\)|startsWith\(senderId\)|request\.data\.(senderId|uid|userId)/.test(weetalk)
      && /conversacion\.participants\.includes\(mensaje\.senderId\)/.test(weetalk));
  }
}

/*
 * LO DE LA CUENTA NO VA EN EL PERFIL PÚBLICO (cierre de F11).
 *
 * `users/{id}` lo lee cualquiera. Un token de push ahí es un altavoz público
 * hacia el teléfono de la persona; un email, un nombre real o una fecha de
 * nacimiento ahí son datos personales a la vista de todo el mundo. Tres cosas
 * se vigilan: que el token viva en `pushTokens/{uid}` y no lo lea el cliente,
 * que las reglas no dejen volver a escribir campos de cuenta en `users`, y que
 * el registro guarde lo privado en `users/{id}/private/account`.
 */
console.log('\n── Lo de la cuenta, fuera del perfil público ──');
{
  const reglas = read('firestore.rules');
  const push = read('services/pushNotificationService.ts');
  const indice = read('functions/src/index.ts');
  const contexto = read('contexts/UserProfileContext.tsx');
  const registro = read('screens/OnboardingScreen.tsx');
  const perfiles = read('services/firestoreService.ts');
  const limpieza = read('scripts/limpiar-cuenta-en-users.mjs');

  check('el token de push tiene su colección, y desde el cliente no la lee nadie',
    /match \/pushTokens\/\{uid\} \{\s*\n\s*allow read: if false;/.test(reglas)
    && /request\.auth\.uid == uid &&\s*\n\s*request\.resource\.data\.keys\(\)\.hasOnly\(\['token', 'platform', 'updatedAt'\]\)/.test(reglas));
  check('el cliente escribe el token en pushTokens/{cuenta} y nunca en el perfil',
    /doc\(db, 'pushTokens', accountUid\)/.test(push) && !/'users'/.test(push) && !/pushToken:/.test(push)
    /* El VALOR del token no se escribe en el registro (un aviso de estado sin el token sí puede). */
    && !/console\.(log|warn|error)\([^\n]*,\s*token\s*\)/.test(push.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('el servidor lo lee de pushTokens/{cuenta} resuelta con el resolutor canónico',
    /collection\('pushTokens'\)\.doc\(cuenta\)/.test(indice) && /cuentaDeIdentidad\(identidad as string, perfil\.data\(\) as PerfilDeIdentidad\)/.test(indice)
    && !/\.pushToken\b/.test(indice) && !/replace\(\/\^hidi_/.test(indice));
  check('las reglas no dejan escribir campos de cuenta en users, ni al crear ni al actualizar',
    /function accountFields\(\) \{\s*\n\s*return \['email', 'realName', 'birthDate', 'gender', 'pushToken', 'pushTokenUpdatedAt'\];/.test(reglas)
    && /allow create: if isAuthenticated\(\) && !createsCreditFields\(\) && !createsEcontactFields\(\) && !createsAccountFields\(\)/.test(reglas)
    && /allow update: if isAuthenticated\(\) && !touchesCreditFields\(\) && !touchesEcontactFields\(\) && !touchesAccountFields\(\)/.test(reglas));
  check('lo privado del dueño se reconoce por el campo uid del perfil, no por el id del documento',
    /get\(\/databases\/\$\(database\)\/documents\/users\/\$\(idDePerfil\)\)\.data\.uid == request\.auth\.uid/.test(reglas)
    && /allow create, update: if esDuenyoDelPerfil\(userId\) && documento == 'account' &&\s*\n\s*request\.resource\.data\.keys\(\)\.hasOnly\(camposPrivadosDeCuenta\(\)\)/.test(reglas));
  check('el perfil se crea sin email y el registro guarda lo privado aparte',
    !/email: user\.email/.test(contexto) && !/email: '',/.test(perfiles)
    && /guardarDatosPrivados\(userProfile\.id, \{\s*\n\s*realName: realName\.trim\(\),\s*\n\s*birthDate: getBirthDateISO\(\),\s*\n\s*gender,/.test(registro)
    && !/realName: realName\.trim\(\),\s*\n\s*displayName/.test(registro)
    && /setDoc\(doc\(db, 'users', profileId, 'private', 'account'\)/.test(perfiles));
  check('la limpieza de los perfiles antiguos está preparada, en dry-run, y solo toca lo suyo',
    /bandera\('--ejecutar'\) && bandera\('--confirmo-autorizacion'\)/.test(limpieza)
    && /const A_PRIVADO = \['realName', 'birthDate', 'gender'\];/.test(limpieza)
    && /const SOLO_BORRAR = \['email', 'pushToken', 'pushTokenUpdatedAt'\];/.test(limpieza)
    && !/collection\('(posts|conversations|assets|communities|businesses)'\)/.test(limpieza)
    && !/\.delete\(\)/.test(limpieza.replace(/FieldValue\.delete\(\)/g, '')));
}

console.log(failures ? `\n${failures} comprobación(es) de seguridad fallaron` : '\nSeguridad: ningún secreto sale de las Functions');
process.exit(failures ? 1 : 0);
