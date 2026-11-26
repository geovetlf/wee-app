/*
 * ALTER EGOS EN LA APP (F6 del plan de alter egos, 2026-11-23). Sin emuladores ni red.
 *
 * Fija lo que el cliente NO puede hacer y lo que tiene que hacer con varias caras:
 *
 *   · A — crear y borrar un alter ego lo hace el SERVIDOR (callables `crearAlterEgo` / `retirarAlterEgo`); la app no
 *         crea documentos de `users` para un Perfil Weë;
 *   · B — la ficha del personaje es la del alter ego PUESTO de la sesión, nunca uno que llegue por la ruta;
 *   · C — la campanita está suscrita a los avisos `personaje_<id>` de TODAS las caras, y el punto rojo va por cara;
 *   · D — las subidas van a la carpeta de la cara que publica o envía, no a la de la cuenta;
 *   · E — los textos nuevos son claves del módulo `alterEgo`, presentes en los 42 diccionarios; ninguno escrito a mano;
 *   · F — el modelo: `ent_` es una forma válida, `misma-persona` bloquea Real ↔ Weë y no Weë ↔ Weë, MyWeës por cara.
 *
 * Prueba el código de verdad donde es puro (modelo, MyWeës, registro de caras) y la forma del código donde es React.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

const ARCHIVOS_DE_ALTER_EGOS = [
  'contexts/UserProfileContext.tsx', 'services/alterEgosService.ts', 'components/HojaDeAlterEgos.tsx',
  'screens/WeeProfileCreationScreen.tsx', 'screens/RetirarAlterEgoScreen.tsx', 'hooks/useCampanita.ts', 'utils/misCaras.ts',
];

console.log('\n── A · Crear y borrar es del servidor ──');
{
  const crear = sinComentarios(leer('screens/WeeProfileCreationScreen.tsx'));
  const servicio = sinComentarios(leer('services/alterEgosService.ts'));
  const contexto = sinComentarios(leer('contexts/UserProfileContext.tsx'));
  check('1) crear un alter ego llama a la callable `crearAlterEgo`', /alterEgosService\.crear\(/.test(crear) && /httpsCallable<[^>]*>\(functions, 'crearAlterEgo'/.test(servicio.replace(/\s+/g, ' ')));
  check('2) la pantalla de crear ya no crea la cara escribiendo users (ni ensureWeeProfile ni setDoc/addDoc)',
    !/ensureWeeProfile|setDoc\(|addDoc\(|usersService\.create\(/.test(crear));
  check('3) ni el servicio, ni el contexto, ni la hoja crean documentos de users',
    ARCHIVOS_DE_ALTER_EGOS.every((f) => !/setDoc\(|addDoc\(|ensureWeeProfile|usersService\.create\(/.test(sinComentarios(leer(f)))));
  check('4) la clave de idempotencia es una por intento (dos toques crean uno)', /useRef\(nuevaClaveDeAlterEgo\(\)\)/.test(crear) && /clave: claveDelIntento\.current/.test(crear));
  check('5) los alter egos se LEEN de las entidades de la cuenta, con la heredada de respaldo',
    /where\('ownerAccountId', '==', cuenta\)/.test(servicio) && /where\('entityType', '==', 'WEE_PROFILE'\)/.test(servicio) && /where\('status', '==', 'ACTIVE'\)/.test(servicio) && /identidadWeeDe\(cuenta\)/.test(servicio));
  check('6) el contexto pide la lista al servicio, no la compone', /alterEgosService\.listar\(user\.uid\)/.test(contexto));
  const retirar = sinComentarios(leer('screens/RetirarAlterEgoScreen.tsx'));
  check('7) borrar llama a `retirarAlterEgo` con la confirmación constante del servidor',
    /'retirarAlterEgo'/.test(servicio) && /CONFIRMACION_DE_RETIRADA = 'RETIRAR_ALTER_EGO'/.test(servicio)
    && /export const CONFIRMACION_DE_RETIRADA = 'RETIRAR_ALTER_EGO'/.test(leer('functions/src/identity/alterEgos.ts')) && /alterEgosService\.retirar\(/.test(retirar));
  check('8) borrar pide escribir el nombre y confirmar un diálogo, y maneja `reautenticar` como eliminar la cuenta',
    /palabraComparable\(nombreEscrito\) === palabraComparable\(nombre\)/.test(retirar) && /confirmAction\(/.test(retirar)
    && /motivo === 'reautenticar' \|\| motivo === 'sinSesion' \? 'reautenticar'/.test(retirar) && /logout\(\)/.test(retirar));
  check('9) solo se borra un alter ego de la lista de la cuenta (el servidor lo vuelve a comprobar)', /alterEgos\.find\(\(a\) => a\.uid === perfilId\)/.test(retirar));
  check('10) la ruta existe en la pila principal', /<Stack\.Screen name="RetirarAlterEgo" component=\{RetirarAlterEgoScreen\}/.test(leer('navigation/MainStackNavigator.tsx')));
}

console.log('\n── B · La ficha es la del alter ego puesto ──');
{
  const ficha = sinComentarios(leer('screens/CharacterSheetScreen.tsx'));
  const contexto = sinComentarios(leer('contexts/UserProfileContext.tsx'));
  check('11) la ficha usa `weeProfile` del contexto y nunca un parámetro de ruta', /const perfilId = weeProfile\?\.id;/.test(ficha) && !/route\.params|useRoute/.test(ficha));
  check('12) y `weeProfile` es el alter ego PUESTO (o, con el Real, el último usado)', /const weeProfile = alterEgoActivo\s*\?\?/.test(contexto));
  check('13) tocar el aviso de un personaje cambia antes a su cara', /switchIdentity\(personajeQueAvisa\)/.test(sinComentarios(leer('screens/NotificationsScreen.tsx'))));
  check('14) switchIdentity sin argumento sigue alternando con el último alter ego (los gestos de hoy)', /if \(id === undefined\) \{/.test(contexto) && /ponerAlterEgo\(weeProfile\.uid\)/.test(contexto));
  check('15) el último alter ego se recuerda por cuenta en el aparato, dentro de try/catch',
    /wee\.alterEgo\.ultimo\.v1\.\$\{cuenta\}/.test(contexto) && (contexto.match(/try \{/g) || []).length >= 2);
}

console.log('\n── C · La campanita escucha a todas las caras ──');
{
  const campana = sinComentarios(leer('hooks/useCampanita.ts'));
  check('16) una suscripción `personaje_<id>` por CADA alter ego', /alterEgos\.map\(\(a\) => a\.uid\)/.test(campana) && /\.map\(\(perfilWee\) =>\s*notificationService\.subscribeToCharacterNotice\(perfilWee/.test(campana));
  check('17) y se dan de baja todas al cambiar', /bajas\.forEach\(\(baja\) => baja\(\)\)/.test(campana));
  check('18) el punto rojo de la hoja va por cara', /avisos\[id\]/.test(sinComentarios(leer('components/HojaDeAlterEgos.tsx'))) && /avisoSinLeer/.test(sinComentarios(leer('components/HojaDeAlterEgos.tsx'))));
}

console.log('\n── D · Las subidas van a la carpeta de la cara ──');
{
  const conversacion = sinComentarios(leer('screens/ConversationScreen.tsx'));
  check('19) la foto única de WeeTalk sube a `users/<cara que envía>/weetalk`', (conversacion.match(/uploadViewOncePhoto\(uri, myUid, convId\)/g) || []).length === 2 && !/uploadViewOncePhoto\(uri, user\.uid/.test(conversacion));
  check('20) la foto de una publicación del compositor, a la carpeta de la cara que publica', /uploadPostImage\(blob, userProfile\?\.uid \|\| user\.uid\)/.test(sinComentarios(leer('screens/CreateScreen.tsx'))));
  const crear = sinComentarios(leer('screens/WeeProfileCreationScreen.tsx'));
  check('21) la foto propia del alter ego nuevo, a SU carpeta y después a su perfil', /uploadProfileImageFromUri\(customAvatarUri, uid\)/.test(crear) && /usersService\.update\(uid, \{ avatarType: 'custom'/.test(crear));
  const reglas = leer('storage.rules');
  check('22) y las reglas de Storage aceptan esas carpetas para las caras de la sesión', /match \/users\/\{userId\}\/weetalk\/\{conversationId\}\/\{fileName\}[\s\S]{0,200}esCaraDeLaSesion\(userId\)/.test(reglas) && /match \/images\/profile\/\{userId\}\/\{fileName\}[\s\S]{0,200}esCaraDeLaSesion\(userId\)/.test(reglas));
}

console.log('\n── E · Textos: claves en los 42 diccionarios, nada escrito a mano ──');
{
  const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
  const idiomas = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((d) => d !== 'servidor' && fs.statSync(path.join(RAIZ, 'i18n/textos', d)).isDirectory());
  const conModulo = idiomas.filter((l) => fs.existsSync(path.join(RAIZ, 'i18n/textos', l, 'alterEgo.ts')) && /import \{ alterEgo \} from '\.\/alterEgo';/.test(fs.readFileSync(path.join(RAIZ, 'i18n/textos', l, 'index.ts'), 'utf8')));
  check('23) el módulo `alterEgo` está y está registrado en los 42 diccionarios', idiomas.length === 42 && conModulo.length === 42, `${conModulo.length}/${idiomas.length}`);
  const usadas = new Set();
  for (const f of [...ARCHIVOS_DE_ALTER_EGOS, 'components/DrawerMenu.tsx', 'components/Sidebar.tsx', 'components/Header.tsx']) {
    for (const m of sinComentarios(leer(f)).matchAll(/'(alterEgo\.[a-zA-Z]+)'/g)) usadas.add(m[1].slice('alterEgo.'.length));
  }
  const es = leer('i18n/textos/es/alterEgo.ts');
  const faltan = [...usadas].filter((c) => !new RegExp(`^  ${c}(_one|_other)?: `, 'm').test(es));
  check('24) toda clave `alterEgo.*` que se usa existe en español', usadas.size > 20 && faltan.length === 0, faltan.join(' '));
  const pt = leer('i18n/textos/pt/alterEgo.ts');
  check('25) el portugués es el brasileño (você, excluir) y el europeo va aparte (tu, eliminar)', /você/.test(pt) && /Excluir/.test(pt) && !/\btens\b|\bteu\b/i.test(pt) && /Eliminar/.test(leer('i18n/textos/pt-PT/alterEgo.ts')));
  const marcas = ['Weë', 'Weëls', 'WeeTalk', 'ẄContact', 'WeëAI', 'Credits'];
  const sinMarca = idiomas.filter((l) => { const t = fs.readFileSync(path.join(RAIZ, 'i18n/textos', l, 'alterEgo.ts'), 'utf8'); return !marcas.every((m) => t.includes(m)); });
  check('26) las marcas no se traducen en ningún idioma', sinMarca.length === 0, sinMarca.join(' '));
  /* Nada de texto visible a mano en las piezas nuevas: ni `<Text>Algo</Text>` ni etiquetas accesibles literales. */
  const aMano = ['components/HojaDeAlterEgos.tsx', 'screens/RetirarAlterEgoScreen.tsx'].filter((f) => {
    const c = sinComentarios(leer(f));
    return />\s*[A-Za-zÁÉÍÓÚáéíóúÑñ¿¡][^<{}]*<\/Text>/.test(c) || /accessibilityLabel="[^"]+"/.test(c) || /placeholder="[^"]+"/.test(c);
  });
  check('27) ningún texto de interfaz escrito a mano en la hoja ni en la pantalla de borrar', aMano.length === 0, aMano.join(' '));
}

console.log('\n── F · El modelo con varias caras ──');
{
  const cargar = crearCargador({ dobles: { '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } } } });
  const M = await cargar('utils/econtactModel.ts');
  check('28) `ent_` es una identidad válida y de tipo Weë, como en el servidor', M.esIdentidadValida('ent_01hx3abc') && M.tipoDeIdentidad('ent_01hx3abc') === 'wee' && !M.esIdentidadValida('ent_a_b'));
  check('29) misma-persona: Real ↔ Weë bloqueado; Weë ↔ Weë permitido', M.bloqueaMismaPersona('cuentaA', 'ent_jay') && M.bloqueaMismaPersona('hidi_cuentaA', 'cuentaA') && !M.bloqueaMismaPersona('ent_jay', 'ent_lina') && !M.bloqueaMismaPersona('hidi_cuentaA', 'ent_lina'));
  const W = await cargar('utils/myWees.ts');
  check('30) MyWeës: una clave por cara; la heredada conserva la `.hidi` de siempre',
    W.claveDeMyWees('cuentaA', W.perfilDeMyWees('cuentaA', 'hidi', 'hidi_cuentaA')) === 'wee.mywees.v1.cuentaA.hidi'
    && W.claveDeMyWees('cuentaA', W.perfilDeMyWees('cuentaA', 'hidi', 'ent_lina01')) === 'wee.mywees.v1.cuentaA.ent_lina01'
    && W.claveDeMyWees('cuentaA', W.perfilDeMyWees('cuentaA', 'real', 'cuentaA')) === 'wee.mywees.v1.cuentaA.real'
    && W.claveDeMyWees('cuentaA', 'biz') === 'wee.mywees.v1.cuentaA.real');
  const C = await cargar('utils/misCaras.ts');
  C.apuntarMisCaras('cuentaA', ['hidi_cuentaA', 'ent_jay', 'ent_lina']);
  check('31) el registro de caras: las de la sesión son suyas, las de otra cuenta no', C.esCaraMia('ent_lina', 'cuentaA') && C.esCaraMia('cuentaA', 'cuentaA') && !C.esCaraMia('ent_lina', 'cuentaB') && !C.esCaraMia('ent_otro', 'cuentaA'));
  const tarjeta = sinComentarios(leer('components/PostCard.tsx'));
  check('32) denunciar excluye TODAS las caras propias', /!alterEgos\.some\(\(a\) => a\.uid === displayPost\.userId\)/.test(tarjeta));
  const publicar = sinComentarios(leer('hooks/useCrearPublicacion.ts'));
  check('33) se publica con el Real o con CUALQUIER alter ego', /for \(const a of alterEgos\) if \(a\.uid\) lista\.push\(\{ id: a\.uid, tipo: 'wee'/.test(publicar));
  const contexto = sinComentarios(leer('contexts/UserProfileContext.tsx'));
  check('34) dos tipos de cara y solo dos; con un alter ego, hasWeeProfile como siempre', /type ProfileType = 'real' \| 'hidi';/.test(contexto) && /hasWeeProfile: alterEgos\.length > 0/.test(contexto));
}

if (fallos > 0) { console.error(`\n✘ ${fallos} fallo(s)`); process.exit(1); }
console.log('\n✔ alter egos en la app: todo en orden');
