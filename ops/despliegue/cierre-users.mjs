/*
 * EL CIERRE DE `users` VA EN FASE 2, Y SOLO CUANDO SE PUEDE (seguridad de `users`, 2026-10-07).
 *
 * `firestore.rules` (fase 1) deja la lectura de `users` como está en producción y añade `publicProfiles`,
 * la fecha 18+ fija de `private/account` y el país fijo. El cierre —solo su dueño lee `users`— vive aparte, en
 * `ops/despliegue/reglas/users-cierre.fase2.rules`, y sustituye el bloque marcado `<fase-1:lectura-de-users>`.
 *
 * Publicarlo antes de tiempo deja el muro, los perfiles ajenos y el buscador vacíos para todos (y rompe las
 * apps nativas instaladas que leen `users` ajeno). Por eso esto no es un texto: `ops/permitido.mjs` llama a
 * `motivosContraElCierreDeUsers` siempre que el objetivo es `firestore:rules`, con las reglas DEL COMMIT
 * candidato, y bloquea si cierran `users` y `ops/produccion.json` → `cierreDeUsers` no demuestra:
 *
 *   1. el espejo desplegado: `espejoDelPerfilPublico` está en `funciones` del mapa (revisión viva);
 *   2. el relleno verificado: `cierreDeUsers.relleno` = { verificado: true, fecha, users, publicProfiles } con
 *      `publicProfiles === users > 0` (perfiles con uid), escrito por quien lo comprobó;
 *   3. el cliente nuevo: `cierreDeUsers.cliente` = { web: <commit del hosting:wee-app que lee publicProfiles>,
 *      nativoMinimo: 'x.y.z' (versión mínima obligatoria de las apps nativas, ya publicada) }.
 *
 * Puro: sin red, sin git. Lo prueban functions/test/users-fases.test.mjs.
 */

export const MARCA_INICIO = '// <fase-1:lectura-de-users>';
export const MARCA_FIN = '// </fase-1:lectura-de-users>';
export const RUTA_FASE_2 = 'ops/despliegue/reglas/users-cierre.fase2.rules';

/*
 * Las reglas SIN COMENTARIOS (lo comentado no autoriza nada), con un tokenizador sencillo: recorre el texto carácter
 * a carácter distinguiendo código, cadenas (comilla simple o doble, con escapes), comentarios de línea y comentarios
 * de bloque. Una secuencia de comentario DENTRO de una cadena es parte de la cadena. Los comentarios se sustituyen
 * por espacios (se conservan los saltos de línea). Lo que no se sabe leer sin ambigüedad NO se adivina: comentario
 * de bloque sin cerrar, apertura de bloque anidada, cierre de bloque suelto, cadena sin cerrar o llaves
 * desequilibradas → { ok: false, motivo }.
 */
export const normalizarReglas = (texto) => {
  if (typeof texto !== 'string') return { ok: false, motivo: 'las reglas no son texto' };
  let fuera = '';
  let llaves = 0;
  let i = 0;
  const n = texto.length;
  const blanco = (s) => s.replace(/[^\r\n]/g, ' ');
  while (i < n) {
    const c = texto[i];
    const d = texto[i + 1];
    if (c === '/' && d === '/') {
      let fin = texto.indexOf('\n', i);
      if (fin < 0) fin = n;
      fuera += blanco(texto.slice(i, fin));
      i = fin;
      continue;
    }
    if (c === '/' && d === '*') {
      const cierre = texto.indexOf('*/', i + 2);
      if (cierre < 0) return { ok: false, motivo: 'comentario de bloque sin cerrar' };
      if (texto.slice(i + 2, cierre).includes('/*')) return { ok: false, motivo: 'comentario de bloque anidado (ambiguo)' };
      fuera += blanco(texto.slice(i, cierre + 2));
      i = cierre + 2;
      continue;
    }
    if (c === '*' && d === '/') return { ok: false, motivo: 'cierre de comentario de bloque sin apertura' };
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && texto[j] !== c && texto[j] !== '\n') j += texto[j] === '\\' ? 2 : 1;
      if (j >= n || texto[j] !== c) return { ok: false, motivo: 'cadena sin cerrar' };
      fuera += texto.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '{') llaves++;
    if (c === '}' && --llaves < 0) return { ok: false, motivo: 'llaves desequilibradas' };
    fuera += c;
    i++;
  }
  if (llaves !== 0) return { ok: false, motivo: 'llaves desequilibradas' };
  return { ok: true, texto: fuera };
};

const BLOQUE_USERS = /match\s+\/users\/\{userId\}\s*\{/g;

/*
 * Los `match` que ENCIERRAN la posición `pos` del texto normalizado (sin comentarios), del más externo al más
 * interno. Recorre las llaves saltando cadenas; cada `{` se etiqueta con la ruta del `match` que la abre (o null si
 * no la abre un match: `service cloud.firestore`, una función…). El `users` de primer nivel solo puede estar dentro
 * del envoltorio estándar `match /databases/{database}/documents` (o sin envoltorio): cualquier otro match que lo
 * encierre lo convierte en una subcolección (p. ej. `groups/{g}/users`), que NO es `users/{id}`.
 */
const ENVOLTORIO = '/databases/{database}/documents';
const matchesQueEncierran = (texto, pos) => {
  const pila = [];
  let ultimo = 0;
  for (let i = 0; i < pos; i++) {
    const c = texto[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < pos && texto[j] !== c) j += texto[j] === '\\' ? 2 : 1;
      i = j;
      ultimo = j + 1;
      continue;
    }
    if (c === '{' && texto[i - 1] === '/') {
      /* Comodín de ruta (`/{g}`, `/{doc=**}`): es parte del nombre del match, no un bloque. */
      const cierre = texto.indexOf('}', i);
      i = cierre < 0 ? pos : cierre;
      continue;
    }
    if (c === '{') {
      const h = /\bmatch\s+(\S+)\s*$/.exec(texto.slice(ultimo, i));
      pila.push(h ? h[1] : null);
      ultimo = i + 1;
    } else if (c === '}') {
      pila.pop();
      ultimo = i + 1;
    } else if (c === ';') ultimo = i + 1;
  }
  return pila.filter((x) => x !== null);
};

/**
 * La lectura de `users/{userId}`: 'abierta' (cualquiera la lee), 'cerrada' o 'malformada'. Se analiza el contenido
 * NORMALIZADO (sin comentarios de ningún tipo) y solo el tramo del `match /users/{userId}` anterior a su primera
 * subcolección. Sin ese bloque → 'cerrada' (falla cerrada: hacen falta las condiciones); más de un bloque, un bloque
 * anidado dentro de otro match que no sea el envoltorio `/databases/{database}/documents`, o reglas que no se saben
 * leer → 'malformada' (se bloquea siempre).
 */
export const estadoDeLecturaDeUsers = (reglas) => {
  const norm = normalizarReglas(reglas);
  if (!norm.ok) return { estado: 'malformada', motivo: norm.motivo };
  const bloques = [...norm.texto.matchAll(BLOQUE_USERS)];
  if (bloques.length === 0) return { estado: 'cerrada' };
  if (bloques.length > 1) return { estado: 'malformada', motivo: 'más de un bloque match /users/{userId} (ambiguo)' };
  const encierran = matchesQueEncierran(norm.texto, bloques[0].index);
  if (!(encierran.length === 0 || (encierran.length === 1 && encierran[0] === ENVOLTORIO))) {
    return { estado: 'malformada', motivo: `match /users/{userId} anidado dentro de ${encierran.join(' → ')} (no es users de primer nivel)` };
  }
  const resto = norm.texto.slice(bloques[0].index + bloques[0][0].length);
  const sub = resto.search(/\bmatch\s+\//);
  const tramo = sub >= 0 ? resto.slice(0, sub) : resto;
  const abiertos = new Set();
  for (const m of tramo.matchAll(/allow\s+([a-z\s,]+?)\s*:\s*if\s+true\s*;/g)) for (const x of m[1].split(',')) abiertos.add(x.trim());
  return { estado: abiertos.has('read') || (abiertos.has('get') && abiertos.has('list')) ? 'abierta' : 'cerrada' };
};

/** ¿Las reglas dejan leer `users/{userId}` a cualquiera? Solo 'abierta' es sí; cerrada o malformada, no (falla cerrada). */
export const lecturaDeUsersAbierta = (reglas) => estadoDeLecturaDeUsers(reglas).estado === 'abierta';

/** Las reglas de fase 2: las de fase 1 con el bloque marcado sustituido por el cierre. Lanza si falta una marca. */
export const componerFase2 = (reglasFase1, cierre) => {
  const s = String(reglasFase1);
  const a = s.indexOf(MARCA_INICIO);
  const b = s.indexOf(MARCA_FIN);
  if (a < 0 || b < a || s.indexOf(MARCA_INICIO, a + 1) >= 0) throw new Error('firestore.rules no trae UNA vez el bloque <fase-1:lectura-de-users>');
  const ini = s.lastIndexOf('\n', a) + 1;
  const fin = s.indexOf('\n', b);
  const eol = s.includes('\r\n') ? '\r\n' : '\n';
  const cuerpo = String(cierre).replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n').join(eol);
  return s.slice(0, ini) + cuerpo + (fin < 0 ? '' : s.slice(fin));
};

const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA = /^[0-9a-f]{40}$/;

/**
 * Por qué NO se pueden publicar estas reglas. Vacío = se puede. Si las reglas no cierran `users`, nada que decir.
 * `contiene(a, b)` (opcional) dice si el commit b contiene al a: con él se exige que el hosting web vivo
 * contenga el commit del cliente nuevo declarado.
 */
export const motivosContraElCierreDeUsers = ({ reglas, manifiesto, contiene } = {}) => {
  if (typeof reglas !== 'string') return ['no se pudieron leer las reglas del commit candidato: no se sabe si cierran users'];
  const lectura = estadoDeLecturaDeUsers(reglas);
  /* Lo que no se sabe interpretar se bloquea SIEMPRE, aunque el mapa diga que las tres condiciones se cumplen. */
  if (lectura.estado === 'malformada') return [`no se pueden interpretar las reglas del commit candidato (${lectura.motivo}): no se sabe si cierran users`];
  if (lectura.estado === 'abierta') return [];
  const m = manifiesto && typeof manifiesto === 'object' ? manifiesto : {};
  const c = m.cierreDeUsers && typeof m.cierreDeUsers === 'object' ? m.cierreDeUsers : {};
  const motivos = [];
  const pre = 'las reglas cierran la lectura de users (fase 2) y';
  if (!(m.funciones || []).some((f) => f.funcion === 'espejoDelPerfilPublico' && f.revision)) {
    motivos.push(`${pre} espejoDelPerfilPublico no está desplegada según ops/produccion.json`);
  }
  const r = c.relleno || {};
  if (r.verificado !== true || !r.fecha || !Number.isInteger(r.users) || r.users <= 0 || r.publicProfiles !== r.users) {
    motivos.push(`${pre} no consta un relleno verificado de publicProfiles (cierreDeUsers.relleno: verificado, fecha, users == publicProfiles > 0)`);
  }
  const cli = c.cliente || {};
  if (!SHA.test(String(cli.web || '')) || !SEMVER.test(String(cli.nativoMinimo || ''))) {
    motivos.push(`${pre} no consta el cliente nuevo (cierreDeUsers.cliente: web = commit completo, nativoMinimo = x.y.z)`);
  } else if (typeof contiene === 'function') {
    const web = (m.otros || []).find((o) => o.desplegable === 'hosting:wee-app');
    const si = web ? contiene(cli.web, web.commit) : false;
    if (si !== true) motivos.push(`${pre} el hosting:wee-app vivo no contiene el cliente nuevo ${cli.web.slice(0, 7)}`);
  }
  return motivos;
};
