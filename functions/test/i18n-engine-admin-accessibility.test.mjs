/*
 * EL PANEL DEL MOTOR Y LAS ETIQUETAS DEL PERFIL AJENO (fase 5I).
 *
 * Dos sitios que se habían salvado por la misma razón que el resto: SOLO SE VEN
 * EN ESTADOS QUE LA CUENTA DE PRUEBAS NO ALCANZA. El panel del WEË AI ENGINE
 * pide permisos de administración; las etiquetas de ËContact del perfil ajeno
 * piden una relación con esa persona.
 *
 * LO QUE AQUÍ SE DEFIENDE Y NO ES OBVIO:
 *
 *   · LOS IDENTIFICADORES DEL MOTOR NO SE TRADUCEN. Los ids de proveedor y de
 *     modelo, los nombres de las capacidades (`text.generate`), las colecciones
 *     de Firestore, el callable `engineAdmin` y los nombres de los proveedores
 *     —Gemini, Seedance— viajan al servidor o son de quien los hizo: se copian;
 *
 *   · LOS DOS CATÁLOGOS DEL ARCHIVO GUARDAN CLAVES. `MODALITY_CLAVE` y
 *     `POLICY_CLAVE` se declaran fuera del componente, donde no hay traductor:
 *     traducirlos al construirlos congelaría el idioma del arranque;
 *
 *   · Y EL NOMBRE DE LA AGENDA —ËContact— entra por hueco en las etiquetas del
 *     perfil y sale sin tocar, sea cual sea el nombre que se le pase.
 *
 * Se usa el traductor de verdad de Weë, como en `i18n-polls.test.mjs`.
 */
import fs from 'node:fs';
import { textosDe, traductorDe } from './i18n-ayuda.mjs';

const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const ES = await traductorDe('es');
const EN = await traductorDe('en');
const esT = textosDe('es');
const enT = textosDe('en');

const MOTOR = soloCodigo(leer('screens/EngineAdminScreen.tsx'));
const PERFIL = soloCodigo(leer('screens/UserProfileScreen.tsx'));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El panel del motor, sin español escrito a mano ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 1 · Ninguna de las frases que tenía sigue en el archivo. */
  const FRASES = ['Solo administración', 'Este panel es para el equipo', 'Ajustes', 'Precios:',
    'Credits por USD', 'de prueba', 'reales', 'Configuración leída', 'los valores por defecto del código',
    'Sembrar valores por defecto', 'Reiniciar salud', 'Salud reiniciada', 'Valores por defecto guardados',
    'Proveedores', 'prioridad', 'Desactivar', 'Activar', 'con clave', 'sin clave', 'activo', 'inactivo',
    /* `calidad:` y `velocidad:` siguen ahí, pero como NOMBRES DE HUECO de la
       interpolación, no como texto: lo que se busca es la línea que se pintaba. */
    'en pausa por fallos', 'fallo(s) recientes', '· calidad ', '· velocidad ', 'pendiente de verificar',
    'Cadenas de fallback', 'Política de', 'solo modo demo', 'Para cambiar el orden',
    'No pude leer el estado', 'No se pudo aplicar el cambio', 'Actualizar', 'Volver',
    'Calidad primero', 'Equilibrado', 'Coste primero', 'texto', 'visión', 'imagen', 'música', 'documentos'];
  const quedan = FRASES.filter((f) => MOTOR.includes(f));
  check('1) ninguna de las 42 frases sigue en el panel', quedan.length === 0, quedan.join(' | '));

  /* 2 y 3 · El botón de sembrar: su texto y su etiqueta, de la clave de 5H. */
  check('2) el botón de sembrar usa settings.seedDefaults',
    /<Text style=\{styles\.buttonText\}>\{busy === 'seed' \? '…' : t\('settings\.seedDefaults'\)\}<\/Text>/.test(MOTOR));
  check('3) y su accessibilityLabel, la misma clave',
    /accessibilityLabel=\{t\('settings\.seedDefaults'\)\}/.test(MOTOR));

  /* 4, 5 y 6 · Las tres claves de 5H siguen donde estaban, sin duplicar. */
  for (const k of ['seedDefaults', 'seedDefaultsConfirm', 'seed']) {
    check(`${k === 'seedDefaults' ? '4' : k === 'seedDefaultsConfirm' ? '5' : '6'}) settings.${k} existe en ES y EN`,
      !!esT.settings?.[k] && !!enT.settings?.[k], ES(`settings.${k}`) + ' / ' + EN(`settings.${k}`));
  }
  check('6) y la confirmación sigue usando las tres de la fase 5H',
    /confirmAction\(t\('settings\.seedDefaults'\), t\('settings\.seedDefaultsConfirm'\), t\('settings\.seed'\), false, t\)/.test(MOTOR));

  /* 7 · Los textos administrativos. */
  check('7) los textos de administración salen de sus claves',
    /\{t\('engine\.adminOnly'\)\}/.test(MOTOR) && /\{t\('engine\.adminOnlyNote'\)\}/.test(MOTOR)
    && ES('engine.adminOnly') === 'Solo administración' && EN('engine.adminOnly') === 'Administrators only',
    ES('engine.adminOnly') + ' / ' + EN('engine.adminOnly'));

  /* Y los dos catálogos guardan claves, no frases. */
  check('7) los dos catálogos del archivo guardan claves',
    /const MODALITY_CLAVE: Record<string, string> = \{/.test(MOTOR)
    && /const POLICY_CLAVE: Record<string, string> = \{/.test(MOTOR)
    && /text: 'engine\.modalityText'/.test(MOTOR) && /'quality-first': 'engine\.policyQualityFirst'/.test(MOTOR)
    && !/MODALITY_LABEL|POLICY_LABEL/.test(MOTOR));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Lo técnico se copia, no se traduce ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 8 · Ids, colecciones y nombres de proveedor, intactos. */
  check('8) los identificadores del motor siguen escritos tal cual',
    /'quality-first'|'cost-first'/.test(MOTOR) && /\{r\.capability\}/.test(MOTOR)
    && /Firestore \(aiProviders · aiRouting · aiSettings\)/.test(MOTOR)
    && /\{p\.name\}/.test(MOTOR) && /\{p\.note\}/.test(MOTOR) && /\{error\}/.test(MOTOR));
  /*
   * Un nombre técnico SÍ puede aparecer dentro de una frase traducida —la nota
   * del final dice dónde tocar: `aiRouting`, `engineAdmin · setRouting`—. Lo que
   * no puede es CAMBIAR de un idioma a otro: si cambiara, la instrucción dejaría
   * de servir. Así que se comprueba que se escriben igual en los dos.
   */
  const TECNICOS = ['aiRouting', 'engineAdmin · setRouting', 'Firestore'];
  const traducidos = TECNICOS.filter((c) =>
    ES('engine.editNote', { capacidad: '{capacidad}' }).includes(c) !== EN('engine.editNote', { capacidad: '{capacidad}' }).includes(c));
  check('8) los nombres técnicos se escriben igual en los dos idiomas', traducidos.length === 0, traducidos.join(' | '));
  check('8) y ningún identificador del motor se convirtió en clave',
    !['text.generate', 'quality-first', 'cost-first', 'seedDefaults(']
      .some((c) => JSON.stringify(esT.engine).includes(c) || JSON.stringify(enT.engine).includes(c)));
  check('8) el id del modelo y su coste entran por hueco',
    /t\('engine\.modelLine', \{ id: m\.id, calidad: m\.quality, velocidad: m\.speed, coste: m\.cost \}\)/.test(MOTOR));
  check('8) y el nombre del proveedor, también',
    /t\(p\.enabled \? 'engine\.disable' : 'engine\.enable', \{ proveedor: p\.name \}\)/.test(MOTOR)
    && !/t\(p\.name\)/.test(MOTOR));

  /* "Weë AI Engine" es el nombre del motor: marca. */
  check('8) "Weë AI Engine" sigue escrito a mano porque es marca',
    /<Text style=\{\[styles\.headerTitle, \{ color: theme\.colors\.text \}\]\}>Weë AI Engine<\/Text>/.test(MOTOR));

  /* 9 y 10 · La operación y los callbacks, intactos. */
  check('9) la operación de sembrar no cambió',
    /await run\('seed', \(\) => aiEngineService\.seedDefaults\(false\), t\('engine\.seedDone'\)\)/.test(MOTOR)
    && /if \(!ok\) return;/.test(MOTOR));
  check('10) y ningún callback se movió',
    /onPress=\{seed\}/.test(MOTOR) && /onPress=\{load\}/.test(MOTOR)
    && /onValueChange=\{\(value\) => toggleProvider\(p\.id, value\)\}/.test(MOTOR)
    && /onPress=\{\(\) => cyclePolicy\(r\.capability, r\.policy\)\}/.test(MOTOR)
    && /aiEngineService\.resetHealth\(\)/.test(MOTOR));
  check('10) ni los permisos, ni la bandera de administración',
    /export const ENGINE_ADMIN_FLAG = 'wee\.engine\.admin';/.test(MOTOR)
    && /if \(isPermissionDenied\(e\)\) setDenied\(true\);/.test(MOTOR));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Las etiquetas del perfil ajeno ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 11 · Ninguna de las tres sigue escrita a mano. */
  const quedan = ['`Aceptar ${nombreLista}`', '`Rechazar solicitud de ${nombreLista}`', "'Solicitud enviada'"]
    .filter((f) => PERFIL.includes(f));
  check('11) ninguna de las tres sigue escrita a mano', quedan.length === 0, quedan.join(' | '));

  /* 12 · Y las tres salen de su clave. */
  check('12) las tres usan i18n',
    /accessibilityLabel=\{t\('econtact\.acceptLabel', \{ lista: nombreLista \}\)\}/.test(PERFIL)
    && /accessibilityLabel=\{t\('econtact\.rejectRequestLabel', \{ lista: nombreLista \}\)\}/.test(PERFIL)
    && /etiqueta: t\('econtact\.requestSent'\),/.test(PERFIL));

  /* 13 y 14 · Lo que oye un lector de pantalla, en cada idioma. */
  const fila = (t) => [t('econtact.acceptLabel', { lista: 'ËContact' }),
    t('econtact.rejectRequestLabel', { lista: 'ËContact' }), t('econtact.requestSent')].join(' · ');
  check('13) en español: ' + fila(ES),
    fila(ES) === 'Aceptar ËContact · Rechazar solicitud de ËContact · Solicitud enviada');
  check('14) en inglés: ' + fila(EN),
    fila(EN) === 'Accept ËContact · Decline ËContact request · Request sent');

  /*
   * 15 y 16 · EL NOMBRE DE LA AGENDA ENTRA POR HUECO Y SALE EXACTAMENTE COMO
   * ENTRÓ, en los dos idiomas. Hoy ese nombre es siempre ËContact, pero lo que
   * se prueba aquí es el hueco, así que la lista mete a propósito nombres que
   * el producto no usa —el retirado incluido— para ver que ninguno se traduce.
   */
  const LISTAS = ['ËContact', 'ẄContact', 'Jazmín', 'SombraOscura', '100%', 'Yes', 'Cancelar'];
  const rotos = LISTAS.filter((l) =>
    !ES('econtact.acceptLabel', { lista: l }).endsWith(l) || !EN('econtact.acceptLabel', { lista: l }).includes(l));
  check('15) la interpolación funciona con cualquier nombre', rotos.length === 0, rotos.join(' | '));
  check('16) y el nombre sale intacto: ' + EN('econtact.rejectRequestLabel', { lista: 'ẄContact' }),
    EN('econtact.rejectRequestLabel', { lista: 'ẄContact' }) === 'Decline ẄContact request');
  check('16) el perfil se lo pasa crudo, sin traducirlo',
    /nombreLista \} = econtact;/.test(PERFIL) && !/t\(nombreLista\)/.test(PERFIL));

  /* 17 y 18 · La acción y la navegación, donde estaban. */
  check('17) las acciones de los botones no cambiaron',
    /onPress=\{\(\) => intentar\(econtact\.aceptar\)\}/.test(PERFIL)
    && /econtact\.rechazar/.test(PERFIL) && /econtact\.cancelar/.test(PERFIL) && /econtact\.eliminar/.test(PERFIL)
    && /onPress=\{porEstado\.onPress\}/.test(PERFIL));
  check('18) y la navegación tampoco',
    /accessibilityRole="button"/.test(PERFIL) && /disabled=\{trabajando\}/.test(PERFIL));

  /* Lo que cerró la 5H sigue en pie. */
  check('18) y las confirmaciones de la fase 5H no se movieron',
    /confirmAction\(titulo, mensaje, t\('common\.yes'\), true, t\)/.test(PERFIL)
    && /t\('econtact\.rejectConfirm', \{ nombre: quien \}\)/.test(PERFIL));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Las claves: completas, sin duplicar, sin paralelos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const DEL_MOTOR = Object.keys(esT.engine || {});
  const NUEVAS_ECONTACT = ['acceptLabel', 'rejectRequestLabel', 'requestSent'];

  check('19) el módulo engine existe en los dos idiomas',
    DEL_MOTOR.length > 30 && Object.keys(enT.engine || {}).length === DEL_MOTOR.length, String(DEL_MOTOR.length));
  const faltan = DEL_MOTOR.filter((k) => !enT.engine[k]);
  check('19) ninguna clave del motor falta en inglés', faltan.length === 0, faltan.join(' '));
  const vacias = DEL_MOTOR.filter((k) => !String(enT.engine[k] ?? '').trim() || !String(esT.engine[k] ?? '').trim())
    .concat(NUEVAS_ECONTACT.filter((k) => !String(enT.econtact[k] ?? '').trim()));
  check('19) ninguna traducción está vacía', vacias.length === 0, vacias.join(' '));

  /* "video" y "no" son la misma palabra en los dos idiomas; el resto tiene que moverse. */
  const copiadas = DEL_MOTOR.filter((k) => esT.engine[k] === enT.engine[k] && !['modalityVideo', 'no'].includes(k));
  check('19) todas están traducidas de verdad, salvo "video" y "no"', copiadas.length === 0, copiadas.join(' '));

  const conAcento = DEL_MOTOR.filter((k) => /[áéíóúñ¿¡]/i.test(String(enT.engine[k]).replace(/Weë/g, '')));
  check('19) la inglesa está en inglés', conAcento.length === 0, conAcento.join(' '));

  /* Los plurales, por Intl y no por un "(s)" pegado. */
  check('19) los fallos recientes se cuentan con plurales de verdad',
    ES('engine.recentFailures', { contador: 1 }) === '1 fallo reciente'
    && ES('engine.recentFailures', { contador: 3 }) === '3 fallos recientes'
    && EN('engine.recentFailures', { contador: 1 }) === '1 recent failure'
    && EN('engine.recentFailures', { contador: 3 }) === '3 recent failures');

  /* 19 · Sin duplicar: se reutiliza lo que ya existía. */
  check('19) se reutiliza common.back en vez de crear otra',
    /accessibilityLabel=\{t\('common\.back'\)\}/.test(MOTOR) && !esT.engine.back);
  /*
   * Y desde la fase 5P la clave es UNA en toda la aplicación: `home.back`, que
   * decía lo mismo, se retiró. Esto caza el día que vuelva a aparecer un par.
   */
  check('19) y solo hay una clave de volver en todo el diccionario',
    !esT.home.back && !!esT.common.back
    && Object.entries(esT).filter(([, m]) => typeof m.back === 'string').length === 1);
  check('19) y no hay dos "Solo administración" en el diccionario',
    Object.values(esT).filter((m) => Object.values(m).includes('Solo administración')).length === 1
    && Object.values(esT).filter((m) => Object.values(m).includes('Solicitud enviada')).length === 1);

  /* 20 · Un solo sistema de traducción. */
  check('20) sin traductores propios ni ternarios de idioma',
    !/i18next|react-intl|idioma === 'en'|locale === 'en'/.test(MOTOR + PERFIL)
    && /import \{ useT \} from '\.\.\/contexts\/IdiomaContext';/.test(leer('screens/EngineAdminScreen.tsx'))
    && /import \{ useT \} from '\.\.\/contexts\/IdiomaContext';/.test(leer('screens/UserProfileScreen.tsx')));
  check('20) y el módulo está registrado en los dos índices',
    /import \{ engine \} from '\.\/engine';/.test(leer('i18n/textos/es/index.ts'))
    && /import \{ engine \} from '\.\/engine';/.test(leer('i18n/textos/en/index.ts'))
    && /^ {2}engine,$/m.test(leer('i18n/textos/es/index.ts')) && /^ {2}engine,$/m.test(leer('i18n/textos/en/index.ts')));

  /* Una muestra escrita del panel, en los dos idiomas. */
  const panel = (t) => [t('engine.providers'), t('engine.chains'), t('engine.withKey'), t('engine.active'),
    t('engine.policyBalanced'), t('engine.modalityVoice')].join(' · ');
  check('20) en español: ' + panel(ES), panel(ES) === 'Proveedores · Cadenas de fallback · con clave · activo · Equilibrado · voz');
  check('20) en inglés: ' + panel(EN), panel(EN) === 'Providers · Fallback chains · with key · active · Balanced · voice');
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
