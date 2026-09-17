/*
 * ËCONTACT — las conexiones de Weë entre personas.
 *
 * Lo que decide qué es una conexión válida vive en `utils/econtactModel.ts`, sin
 * React y sin Firebase, y aquí se EJECUTA: el id de una pareja, quién puede
 * aceptar qué y cómo se separan contactos de solicitudes son aritmética y
 * reglas, no pintura.
 *
 * Las reglas de Firestore no se pueden ejecutar en esta suite —el repositorio no
 * tiene emulador de reglas—, así que esa parte se comprueba sobre el texto de
 * `firestore.rules`, igual que hacen security.test.mjs y encuestas.test.mjs. Va
 * señalado para no confundir una lectura con una ejecución.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => {
  try {
    return fs.readFileSync(path.resolve(root, p), 'utf8');
  } catch {
    return '';
  }
};
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

// El modelo, transpilado y ejecutado.
const ts = require('typescript');
const fuenteModelo = read('utils/econtactModel.ts');
const jsModelo = ts.transpileModule(fuenteModelo, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const modelo = await import('data:text/javascript;base64,' + Buffer.from(jsModelo).toString('base64'));

const {
  idDeContacto,
  parejaOrdenada,
  esParejaValida,
  nuevaSolicitud,
  aceptada,
  estadoEntre,
  esContacto,
  elOtro,
  puedeAceptar,
  puedeCancelar,
  puedeRechazar,
  puedeEliminar,
  contactosDe,
  solicitudesRecibidas,
  solicitudesEnviadas,
  contarContactos,
  PREFIJO_PERFIL_WEE,
  PREFIJO_PERFIL_BIZ,
  esIdentidadValida,
  esIdentidadDePersona,
  tipoDeIdentidad,
  nombreDeLista,
  nombreDeIdentidad,
  identidadesDeCuenta,
  identidadEsDeLaCuenta,
  cuentaDeIdentidad,
} = modelo;

const ANA = 'uidAna';
const BETO = 'uidBeto';
const CARO = 'uidCaro';
const sello = () => 'T';

// ═════════════════════════════════════════════════════════════════════════════
console.log('── A) La pareja: un solo documento por relación ──');
// ═════════════════════════════════════════════════════════════════════════════

check('1) el id de una pareja es el mismo se pida desde donde se pida', idDeContacto(ANA, BETO) === idDeContacto(BETO, ANA));
check('2) y es la pareja ordenada, no el orden en que se pidió', idDeContacto(BETO, ANA) === `${ANA}_${BETO}`, idDeContacto(BETO, ANA));
check('3) parejas distintas, ids distintos', new Set([idDeContacto(ANA, BETO), idDeContacto(ANA, CARO), idDeContacto(BETO, CARO)]).size === 3);
/*
 * Que el id sea conmutativo es lo que hace imposible duplicar una conexión: si
 * Ana pide a Beto y Beto pide a Ana, los dos apuntan al mismo documento.
 */
check('4) los dos lados escriben en el mismo sitio, así que no puede duplicarse', parejaOrdenada(ANA, BETO).join() === parejaOrdenada(BETO, ANA).join());

check('5) nadie se conecta consigo mismo', esParejaValida(ANA, ANA) === false);
check('6) ni con un uid vacío', esParejaValida(ANA, '') === false && esParejaValida('', BETO) === false);
check('7) y pedirlo lanza error en vez de escribir algo raro', (() => { try { idDeContacto(ANA, ANA); return false; } catch { return true; } })());

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── B) Una solicitud NO es todavía un ËContact ──');
// ═════════════════════════════════════════════════════════════════════════════

const solicitud = nuevaSolicitud(ANA, BETO, sello);

check('8) una solicitud nace pendiente, nunca aceptada', solicitud.status === 'pending');
check('9) guarda quién la pidió', solicitud.requestedBy === ANA);
check('10) y a quién', solicitud.requestedTo === BETO);
check('11) con los dos uid, ordenados', solicitud.users.join() === `${ANA},${BETO}`);
check('12) y con su fecha', solicitud.createdAt === 'T');
/*
 * Esta es LA diferencia con un sistema de seguidores: pedir no conecta. Hasta
 * que la otra persona no dice que sí, no hay ËContact.
 */
check('13) una solicitud pendiente NO es un contacto', esContacto(solicitud) === false);
check('14) y no cuenta como contacto de nadie', contarContactos([solicitud], ANA) === 0 && contarContactos([solicitud], BETO) === 0);
check('15) el modelo no sabe fabricar una solicitud ya aceptada', !/status: 'accepted'/.test(sinComentarios(fuenteModelo).slice(sinComentarios(fuenteModelo).indexOf('nuevaSolicitud'), sinComentarios(fuenteModelo).indexOf('nuevaSolicitud') + 400)));

// Cómo la ve cada lado.
check('16) quien la pidió la ve como enviada', estadoEntre(solicitud, ANA) === 'pendiente-enviada');
check('17) quien la recibió, como recibida', estadoEntre(solicitud, BETO) === 'pendiente-recibida');
check('18) y quien no está en ella no ve nada', estadoEntre(solicitud, CARO) === 'ninguno');
check('19) tampoco existe relación donde no hay documento', estadoEntre(null, ANA) === 'ninguno');

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── C) Aceptar: quién puede y quién no ──');
// ═════════════════════════════════════════════════════════════════════════════

check('20) acepta quien la recibió', puedeAceptar(solicitud, BETO) === true);
check('21) NO puede aceptar quien la envió', puedeAceptar(solicitud, ANA) === false);
check('22) ni una persona ajena', puedeAceptar(solicitud, CARO) === false);
check('23) rechazar lo puede hacer exactamente quien podía aceptar', puedeRechazar(solicitud, BETO) === true && puedeRechazar(solicitud, ANA) === false);
check('24) cancelar es retirar la TUYA', puedeCancelar(solicitud, ANA) === true && puedeCancelar(solicitud, BETO) === false);
check('25) y no se elimina lo que todavía no es conexión', puedeEliminar(solicitud, ANA) === false && puedeEliminar(solicitud, BETO) === false);

const conexion = aceptada(solicitud, () => 'T2');

check('26) al aceptar, la relación pasa a aceptada', conexion.status === 'accepted');
check('27) y deja constancia de cuándo', conexion.respondedAt === 'T2');
/*
 * Aceptar mueve el estado y la fecha, nada más. Quién pidió a quién es historia
 * de la relación y no se reescribe; las reglas comprueban exactamente esto.
 */
check('28) la pareja no cambia al aceptar', conexion.users.join() === solicitud.users.join());
check('29) ni quién pidió', conexion.requestedBy === ANA && conexion.requestedTo === BETO);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── D) La conexión es MUTUA ──');
// ═════════════════════════════════════════════════════════════════════════════

check('30) aceptada, sí es contacto', esContacto(conexion) === true);
check('31) y lo es para los DOS lados', estadoEntre(conexion, ANA) === 'conectados' && estadoEntre(conexion, BETO) === 'conectados');
check('32) cada uno ve al otro', elOtro(conexion, ANA) === BETO && elOtro(conexion, BETO) === ANA);
check('33) una persona ajena no aparece en ella', elOtro(conexion, CARO) === null && estadoEntre(conexion, CARO) === 'ninguno');
check('34) cuenta para los dos, con un solo documento', contarContactos([conexion], ANA) === 1 && contarContactos([conexion], BETO) === 1);
check('35) y no cuenta para nadie más', contarContactos([conexion], CARO) === 0);
check('36) ya no se puede aceptar dos veces', puedeAceptar(conexion, BETO) === false);
check('37) deshacerla la pueden los dos', puedeEliminar(conexion, ANA) === true && puedeEliminar(conexion, BETO) === true);
check('38) pero no una persona ajena', puedeEliminar(conexion, CARO) === false);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── E) Listas y contador ──');
// ═════════════════════════════════════════════════════════════════════════════

{
  /*
   * Todo sale de UNA consulta —las relaciones donde participas— y se reparte
   * aquí. La misma estrategia que el muro con los destinos: sin índices nuevos.
   */
  const deAnaConBeto = aceptada(nuevaSolicitud(ANA, BETO, sello), sello); // aceptada
  const deCaroAAna = nuevaSolicitud(CARO, ANA, sello); // Caro le pidió a Ana
  const deAnaAOtra = nuevaSolicitud(ANA, 'uidDani', sello); // Ana pidió y espera
  const ajena = nuevaSolicitud(BETO, CARO, sello); // no va con Ana
  const todas = [deAnaConBeto, deCaroAAna, deAnaAOtra, ajena];

  check('39) los contactos son solo las aceptadas', contactosDe(todas, ANA).length === 1);
  check('40) las solicitudes recibidas son las que tú tienes que contestar', solicitudesRecibidas(todas, ANA).map((d) => d.requestedBy).join() === CARO);
  check('41) las enviadas, las que esperan respuesta ajena', solicitudesEnviadas(todas, ANA).map((d) => d.requestedTo).join() === 'uidDani');
  check('42) el contador cuenta conexiones, no solicitudes', contarContactos(todas, ANA) === 1, String(contarContactos(todas, ANA)));
  check('43) una relación ajena no entra en ninguna lista tuya', ![...contactosDe(todas, ANA), ...solicitudesRecibidas(todas, ANA), ...solicitudesEnviadas(todas, ANA)].includes(ajena));
  check('44) sin relaciones, todo a cero y sin reventar', contarContactos([], ANA) === 0 && contactosDe(undefined, ANA).length === 0);
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── F) El servicio: la identidad es el PERFIL, no la cuenta ──');
// ═════════════════════════════════════════════════════════════════════════════

const servicio = read('services/econtactService.ts');
const codigoServicio = sinComentarios(servicio);

check('45) el servicio existe', servicio.length > 0);
check('46) escribe en la colección econtacts', /const COLECCION = 'econtacts'/.test(codigoServicio));
/*
 * LA CORRECCIÓN DE ARQUITECTURA, AQUÍ.
 *
 * Antes el servicio no aceptaba identidad por parámetro: la sacaba de Firebase
 * Auth, y con eso las dos caras de una cuenta compartían agenda. Ahora cada
 * operación dice CON QUÉ PERFIL se hace, porque el Perfil Real y el Perfil Weë
 * llevan listas distintas.
 *
 * Pasar la identidad no la hace tuya: se comprueba aquí que sea de tu sesión, y
 * el servidor la vuelve a comprobar contra `users`. La segunda es la que manda.
 */
check('47) todas las operaciones reciben con qué perfil se actúa', (codigoServicio.match(/\(comoIdentidad: string/g) || []).length >= 9);
check('48) la sesión sigue saliendo de Firebase Auth, no de un parámetro', /const miCuenta = \(\): string \| null => auth\?\.currentUser\?\.uid/.test(codigoServicio));
check('49) y una identidad ajena no se puede usar', /identidadEsDeLaCuenta\(identidad, miCuenta\(\)\)/.test(codigoServicio) && /Ese perfil no es tuyo/.test(servicio));
check('49b) sin sesión no se escribe nada', /Inicia sesión para usar ËContact/.test(servicio));
check('50) el id del documento lo calcula el modelo, no el servicio', /idDeContacto\(a, b\)/.test(codigoServicio) && !/\$\{.*\}_\$\{/.test(codigoServicio));
/*
 * PEDIR YA NO LO ESCRIBE EL CLIENTE.
 *
 * Antes el cliente hacía `setDoc` de la solicitud. Ahora la abre el servidor,
 * que es el único que puede leer `users` para saber de quién es cada identidad
 * y si el perfil de destino existe siquiera.
 */
check('51) pedir conexión pasa por la callable del servidor', /llamar\('requestEContact', \{ fromIdentity: yo, toIdentity: otra \}\)/.test(codigoServicio));
check('51b) y el cliente ya no escribe la solicitud a mano', !/setDoc\(/.test(codigoServicio));
check('52) aceptar también, y con las dos identidades', /llamar\('acceptEContact', \{ asIdentity: yo, otherIdentity: otra \}\)/.test(codigoServicio));
check('53) el cliente NO escribe econtactsCount', !/econtactsCount/.test(codigoServicio));
check('54) el contador se cuenta de lo que hay, para ESA identidad', /contarContactos\(await relacionesDe\(comoIdentidad\), comoIdentidad\)/.test(codigoServicio));
/*
 * Dos `array-contains` en el fichero, y los dos por la IDENTIDAD activa: la
 * consulta de las relaciones. Es lo que separa la agenda del Perfil Real de la
 * del Perfil Weë. Consultar por cuenta las mezclaría.
 */
check('55) la consulta filtra por la identidad activa', /array-contains', identidad/.test(codigoServicio));
check('55b) y sigue siendo UNA sola consulta para las tres listas', (codigoServicio.match(/array-contains/g) || []).length === 1);
check('56) followsService sigue intacto y sin mezclarse', !/followsService|useFollow/.test(codigoServicio) && read('services/followsService.ts').length > 0);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── G) Reglas de Firestore (lectura del texto, no ejecución) ──');
// ═════════════════════════════════════════════════════════════════════════════

const reglas = read('firestore.rules');
const bloque = reglas.slice(reglas.indexOf('match /econtacts/{contactId}'), reglas.indexOf('// === FOLLOWS ==='));

check('57) existe el bloque de econtacts', bloque.length > 0);
check('58) la relación solo la leen sus dos partes', /allow read: if isAuthenticated\(\) && participo\(\);/.test(bloque));
/*
 * PARTICIPAR ES POR IDENTIDAD, Y SON DOS.
 *
 * Una regla no puede consultar `users`, así que aquí las identidades de la
 * sesión se derivan del uid de la cuenta —que es exactamente como se construyen
 * los perfiles—. `hasAny` cubre las dos caras: la relación puede ser de tu
 * Perfil Real o de tu Perfil Weë, y las dos son tuyas.
 */
check('58b) mis identidades son mi cuenta y mi Perfil Weë', /return \[request\.auth\.uid, 'hidi_' \+ request\.auth\.uid\];/.test(bloque));
check('58c) participo si alguna de las dos está en la relación', /resource\.data\.users\.hasAny\(misIdentidades\(\)\)/.test(bloque));

/*
 * PEDIR TAMBIÉN ES DEL SERVIDOR AHORA.
 *
 * Antes el `create` era del cliente con condiciones estructurales. No basta: de
 * quién es una identidad se lee de `users`, y una regla no puede consultar —los
 * documentos tienen id automático y se buscan por el campo `uid`—. Lo único
 * comprobable desde aquí sería el prefijo, o sea lo que afirma el cliente; y el
 * servidor además puede ver si el perfil de destino existe de verdad.
 *
 * Lo que aquellas condiciones garantizaban se comprueba ahora ejecutando el
 * servidor de verdad, en el bloque K.
 */
const crear = (bloque.match(/allow create:[\s\S]*?;/) || [''])[0];
check('59) el cliente no puede abrir una solicitud a mano', /allow create: if false;/.test(crear));
check('60) y por tanto no puede fabricar requestedBy ni requestedTo', !/requestedBy|requestedTo/.test(crear));
check('61) una relación nace SIEMPRE pendiente, y eso lo pone el servidor', /status: 'pending'/.test(read('functions/src/social/econtact.ts')));
check('62) así que no se puede fabricar una conexión aceptada de un tirón', !/status == 'accepted'/.test(crear));
check('63) el id canónico lo calcula el servidor, no llega de fuera', /const contactId = idDeContacto\(de\.identity, para\.identity\)/.test(sinComentarios(read('functions/src/social/econtact.ts'))));
check('64) la pareja son exactamente las dos identidades de la solicitud', /users,\s*\n\s*status: 'pending',\s*\n\s*requestedBy: de\.identity,\s*\n\s*requestedTo: para\.identity,/.test(read('functions/src/social/econtact.ts')));

/*
 * ACEPTAR YA NO ES UNA REGLA, ES UNA CALLABLE.
 *
 * Antes el `update` dejaba a quien recibió la solicitud pasarla a `accepted`
 * bajo un montón de condiciones. Ahora la puerta está cerrada entera y la
 * transición la hace `acceptEContact` con el Admin SDK, en una transacción: es
 * lo que pediste al decir que el cliente no debe poder fabricar `accepted`
 * "aunque las Rules lo intenten bloquear".
 *
 * Lo que aquellas condiciones garantizaban se comprueba ahora en el bloque K,
 * ejecutando el servidor de verdad.
 */
const actualizar = (bloque.match(/allow update:[\s\S]*?;/) || [''])[0];
check('65) el cliente no puede actualizar una relación, punto', /allow update: if false;/.test(actualizar));
check('66) no queda ningún camino de update condicionado', !/requestedTo|status ==/.test(actualizar));
check('67) y por tanto nadie fabrica accepted desde la app', !/accepted/.test(crear) && !/accepted/.test(actualizar));
const borrar = (bloque.match(/allow delete:[\s\S]*?;/) || [''])[0];
check('68) borrar solo lo puede quien participa', /participo\(\)/.test(borrar));
check('69) y solo sobre una relación que exista de verdad', /'pending'/.test(borrar) && /'accepted'/.test(borrar));
check('70) las tres salidas son ese mismo borrado', /cancelar/.test(bloque) && /rechazar/.test(bloque) && /eliminar/.test(bloque));
check('71) no hay estado rejected en ninguna parte', !/'rejected'/.test(reglas) && !/'rejected'/.test(sinComentarios(fuenteModelo)));

// El contador, protegido como el saldo de Credits.
check('72) econtactsCount no lo escribe el cliente', /function econtactFields\(\)[\s\S]{0,120}'econtactsCount'/.test(reglas));
check('73) ni al crear el perfil', /allow create: if isAuthenticated\(\) && !createsCreditFields\(\) && !createsEcontactFields\(\)/.test(reglas));
check('74) ni al actualizarlo', /allow update: if isAuthenticated\(\) && !touchesCreditFields\(\) && !touchesEcontactFields\(\)/.test(reglas));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── H) El menú: ËContact entre líneas ──');
// ═════════════════════════════════════════════════════════════════════════════

const fuenteMenu = read('constants/weeMenu.ts');
const jsMenu = ts.transpileModule(fuenteMenu, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const menu = await import('data:text/javascript;base64,' + Buffer.from(jsMenu).toString('base64'));

/*
 * En la fuente única está el nombre POR DEFECTO —el del Perfil Real, y el que se
 * ve sin sesión—. El que se pinta lo decide la identidad activa: ver más abajo.
 */
check('75) la agenda está en la fuente única del menú, con su nombre por defecto', menu.MENU_ITEM.econtact?.label === 'ËContact', menu.MENU_ITEM.econtact?.label);
/*
 * El sitio exacto: después de Credits —lo último de tu cuenta— y antes de
 * Comunidades —lo primero de los destinos—.
 */
const orden = menu.MENU_ORDER;
check('76) va justo después de Credits', orden[orden.indexOf('credits') + 1] === 'econtact', orden.join(','));
check('77) y antes de Comunidades', orden.indexOf('econtact') < orden.indexOf('communities'));
check('78) en su propio grupo, sin rótulo', menu.WEE_MENU.some((g) => g.items.join() === 'econtact' && !g.label));
check('79) y con una línea que lo separa de tu cuenta', menu.WEE_MENU.find((g) => g.items.join() === 'econtact')?.divisor === true);
check('80) los grupos con nombre siguen siendo PERFIL y EXPLORA', menu.WEE_MENU.map((g) => g.label).filter(Boolean).join() === 'PERFIL,EXPLORA');

const cajon = read('components/DrawerMenu.tsx');
const barra = read('components/Sidebar.tsx');
check('81) el cajón pinta la agenda con el nombre de la identidad activa', /fila\('econtact', goEContact, \{ label: nombreLista \}\)/.test(cajon));
check('82) y su línea', /renderDivisor\(\)/.test(cajon) && /divisor: \{/.test(cajon));
check('83) la barra de escritorio también', /<Opcion id="econtact" label=\{nombreLista\}/.test(barra) && /styles\.divisor/.test(barra));
check('84) ninguno escribe la etiqueta a mano', !/'ËContact'|"ËContact"/.test(sinComentarios(cajon) + sinComentarios(barra)));
check('85) los dos llevan a la misma pantalla', /navigateRoot\('EContact'\)/.test(cajon) && /navigate\('EContact'\)/.test(barra));
check('86) y sin sesión piden entrar', /goEContact = \(\) => \(user \?/.test(cajon) && /id="econtact"[\s\S]{0,160}user \?/.test(barra));

/*
 * EL NOMBRE DEL MENÚ SALE DE LA MISMA FUENTE QUE LA PANTALLA.
 *
 * Hubo un tiempo en que el menú lo llevaba escrito a mano y la pantalla lo
 * sacaba de la identidad, así que con el Perfil Weë puesto cada uno decía una
 * cosa. Ahora los dos beben de lo mismo, y lo que esa fuente dice es ËContact
 * —el nombre del producto— sea cual sea la cara que esté puesta.
 *
 * Lo que se ejecuta aquí es la función que da el nombre; que el menú use ESA y
 * no otra se comprueba leyendo la línea que lo pinta, justo arriba.
 */
{
  const menuDe = (identidad) => nombreDeLista(identidad);
  check('86b) Perfil Real activo → el menú dice ËContact', menuDe(ANA) === 'ËContact', menuDe(ANA));
  check('86c) Perfil Weë activo → el menú dice ẄContact', menuDe(`hidi_${ANA}`) === 'ẄContact', menuDe(`hidi_${ANA}`));
  /* Y el nombre retirado no puede volver por ninguna de las dos caras. */
  check('86d) en ningún estado reaparece el nombre antiguo',
    [ANA, `hidi_${ANA}`].every((i) => {
      const n = menuDe(i);
      /* Cada cara con SU nombre, y ninguno degradado a una W o una E sueltas. */
      return (i === ANA ? n === 'ËContact' : n === 'ẄContact') && /^[ËẄ]Contact$/.test(n);
    }));
  check('86e) y NO dicen lo mismo: son dos nombres distintos', menuDe(ANA) !== menuDe(`hidi_${ANA}`));
  /* Los dos menús lo piden a la misma fuente que la pantalla. */
  check('86f) el cajón lo toma de useIdentidadActiva', /const \{ nombreLista \} = useIdentidadActiva\(\);/.test(cajon) && /from '\.\.\/hooks\/useEContact'/.test(cajon));
  check('86g) y la barra de escritorio también', /const \{ nombreLista \} = useIdentidadActiva\(\);/.test(barra) && /from '\.\.\/hooks\/useEContact'/.test(barra));
  /*
   * Control: si alguien vuelve a escribir el nombre a mano en la parte dinámica,
   * la 84 lo caza. Aquí se comprueba que la 84 sabría cazarlo.
   */
  check('86h) CONTROL: la comprobación detectaría un nombre escrito a mano',
    /'ËContact'|"ËContact"/.test(sinComentarios(`const x = 'ËContact';`)));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── I) La pantalla ──');
// ═════════════════════════════════════════════════════════════════════════════

const pantalla = read('screens/EContactScreen.tsx');
const navegacion = read('navigation/MainStackNavigator.tsx');

check('87) existe screens/EContactScreen.tsx', pantalla.length > 0);
check('88) la ruta está registrada', /<Stack\.Screen name="EContact" component=\{EContactScreen\} \/>/.test(navegacion) && /EContact: undefined;/.test(navegacion));
/*
 * EL TÍTULO SALE DEL HUECO, no de un literal. Hoy las dos caras dicen lo mismo
 * —ËContact es el nombre del producto—, pero quien lo pinta sigue sin saberlo:
 * lo pide. Escribirlo a mano ataría la pantalla a un nombre y habría que
 * tocarla el día que el nombre cambie, que es justo lo que acaba de pasar.
 */
check('89) se titula con el nombre de la agenda activa', /🤝 \{nombreLista\}/.test(pantalla) && !/🤝 ËContact/.test(pantalla));
check('90) tiene vuelta atrás como el resto de Weë', /navigation\.goBack\(\)/.test(pantalla) && /accessibilityLabel=\{t\('common\.back'\)\}/.test(pantalla));
/* El cuerpo del vacío también salió al diccionario, así que se comprueba donde vive ahora: en los dos idiomas. */
check('91) enseña un estado vacío que explica qué irá aquí',
  /t\('econtact\.noneYet', \{ lista: nombrePlural \}\)/.test(pantalla)
  && /noneYet: 'Todavía no tienes \{\{lista\}\}'/.test(read('i18n/textos/es/econtact.ts'))
  && /t\('econtact\.noneYetSubtitle'\)/.test(pantalla)
  && /una persona la propone y la otra acepta/.test(read('i18n/textos/es/econtact.ts'))
  && /one person proposes it and the other accepts/.test(read('i18n/textos/en/econtact.ts')));
check('92) la lista lee del servicio, no de Firestore a mano', /useMisEContacts\(\)/.test(pantalla) && !/collection\(db/.test(pantalla));
check('93) separa conexiones de solicitudes, sin mezclarlas', /'recibidas'/.test(pantalla) && /'contactos'/.test(pantalla) && /'enviadas'/.test(pantalla));
/*
 * Cada sección ofrece justo lo suyo, y las cuatro acciones vienen del hook ya
 * atadas a la identidad activa: la pantalla no maneja ningún uid propio. Pedir
 * no está aquí —se pide desde el perfil de la otra persona—.
 */
check('94) y ofrece justo las acciones de cada una', /aceptar,/.test(pantalla) && /rechazar,/.test(pantalla) && /cancelar,/.test(pantalla) && /eliminar,/.test(pantalla) && !/solicitar|enviarSolicitud/.test(pantalla));
check('95) objetivo táctil sin scale() en las filas', /minHeight: 64,/.test(pantalla));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── J) Lo que este bloque NO ha tocado ──');
// ═════════════════════════════════════════════════════════════════════════════

check('96) followsService sigue en su sitio', read('services/followsService.ts').includes("collection(db, 'follows')"));
check('97) useFollow también', read('hooks/useFollow.ts').includes('followsService'));
check('98) el perfil ajeno ya usa ËContact, no el sistema antiguo', /useEContact/.test(read('screens/UserProfileScreen.tsx')) && !/useFollow/.test(sinComentarios(read('screens/UserProfileScreen.tsx'))));
check('99) businessFollows intacto', /match \/businessFollows\/\{followId\}/.test(reglas));
check('100) las reglas de follows no se han tocado', /match \/follows\/\{followId\}[\s\S]{0,400}followerId\.matches\('biz_\.\*'\)/.test(reglas));
/*
 * La píldora estuvo apagada mientras no hubo nada detrás. Ahora abre la agenda,
 * así que lo que se vigila es lo de siempre por el otro lado: que mencionar a
 * alguien al publicar NO escriba ninguna relación.
 */
check('101) la píldora ËContact del compositor ya está viva', /setShowEContacts/.test(read('screens/CreateScreen.tsx')));
check('101) y publicar no crea ninguna relación', !/econtactService|enviarSolicitud|aceptarSolicitud/.test(sinComentarios(read('screens/CreateScreen.tsx'))));
check('102) y ËContact no gasta Credits ni llama a ninguna IA', !/spendCredits|credits|gemini|provider/i.test(codigoServicio) && !/spendCredits|gemini/i.test(sinComentarios(fuenteModelo)));
check('103) sin índices nuevos', !/econtact/i.test(read('firestore.indexes.json')));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── K) Aceptar: lo hace el servidor, no el cliente ──');
// ═════════════════════════════════════════════════════════════════════════════

/*
 * El motor de la callable, compilado y ejecutado contra un Firestore de mentira
 * cuyas transacciones reintentan cuando dos escrituras se pisan. Igual que en el
 * Bloque A de encuestas.
 */
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const servidor = lib('social/econtact.js');
const { createEContactEngine, decidirAceptacion, idDeContacto: idServidor } = servidor;

/*
 * Cliente y servidor viven en proyectos de TypeScript distintos y no comparten
 * módulos, así que el id de una pareja está escrito dos veces. Que las dos den
 * lo mismo no se supone: se comprueba. Si discreparan, el servidor escribiría en
 * un documento distinto del que lee el cliente.
 */
{
  const parejas = [[ANA, BETO], [BETO, ANA], [ANA, CARO], ['zzz', 'aaa'], ['a1', 'a2']];
  const iguales = parejas.every(([a, b]) => idServidor(a, b) === idDeContacto(a, b));
  check('104) cliente y servidor calculan el MISMO id de pareja', iguales, parejas.map(([a, b]) => `${idServidor(a, b)}|${idDeContacto(a, b)}`).join(' '));
  check('105) y el del servidor también es simétrico', idServidor(ANA, BETO) === idServidor(BETO, ANA));
  check('106) el servidor no acepta una pareja imposible', (() => { try { idServidor(ANA, ANA); return false; } catch { return true; } })());
}

// La decisión, sin Firestore.
{
  const doc = { users: [ANA, BETO], status: 'pending', requestedBy: ANA, requestedTo: BETO };
  check('107) acepta quien la recibió', decidirAceptacion({ doc, yo: BETO, otro: ANA }).ok === true);
  check('108) quien la envió NO', decidirAceptacion({ doc, yo: ANA, otro: BETO }).motivo === 'no-la-recibiste');
  check('109) una persona ajena tampoco', decidirAceptacion({ doc, yo: CARO, otro: ANA }).motivo === 'relacion-invalida');
  check('110) sin relación no hay nada que aceptar', decidirAceptacion({ doc: null, yo: BETO, otro: ANA }).motivo === 'sin-relacion');
  check('111) una ya aceptada no se acepta otra vez', decidirAceptacion({ doc: { ...doc, status: 'accepted' }, yo: BETO, otro: ANA }).motivo === 'ya-sois-contactos');
  check('112) un estado inventado se rechaza', decidirAceptacion({ doc: { ...doc, status: 'rejected' }, yo: BETO, otro: ANA }).motivo === 'relacion-invalida');
  check('113) una pareja falsificada se rechaza', decidirAceptacion({ doc: { ...doc, users: [ANA, CARO] }, yo: BETO, otro: ANA }).motivo === 'relacion-invalida');
  check('114) y un requestedTo que no está en la pareja, también', decidirAceptacion({ doc: { ...doc, requestedTo: CARO }, yo: CARO, otro: ANA }).motivo === 'relacion-invalida');
}

// ─── Firestore de mentira con transacciones que reintentan ───
const clonar = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
class FakeRef {
  constructor(db, ruta) { this.db = db; this.path = ruta; this.id = ruta.split('/').pop(); }
}
/*
 * Una consulta por campo, que es como se busca un perfil: los documentos de
 * `users` tienen id automático y la identidad vive en el campo `uid`. Esto es
 * justo lo que las reglas NO pueden hacer, y por eso resolver identidades es del
 * servidor.
 */
class FakeQuery {
  constructor(db, ruta, campo, valor) { this.db = db; this.ruta = ruta; this.campo = campo; this.valor = valor; }
  limit() { return this; }
  async get() {
    await null;
    const docs = [...this.db.docs.entries()]
      .filter(([p]) => p.startsWith(`${this.ruta}/`))
      .map(([, d]) => d)
      .filter((d) => d && d[this.campo] === this.valor)
      .map((d) => ({ data: () => clonar(d) }));
    return { empty: docs.length === 0, docs };
  }
}
class FakeColl {
  constructor(db, ruta) { this.db = db; this.path = ruta; }
  doc(id) { return new FakeRef(this.db, `${this.path}/${id}`); }
  where(campo, _op, valor) { return new FakeQuery(this.db, this.path, campo, valor); }
}
class FakeTx {
  constructor(db) { this.db = db; this.leidos = []; this.escrituras = []; }
  async get(ref) {
    await null;
    this.leidos.push([ref.path, this.db.version(ref.path)]);
    const data = this.db.leer(ref.path);
    return { exists: data !== undefined, id: ref.id, ref, data: () => data };
  }
  update(ref, data) { this.escrituras.push({ path: ref.path, data }); }
  create(ref, data) { this.escrituras.push({ path: ref.path, data, crear: true }); }
}
class FakeDb {
  constructor() { this.docs = new Map(); this.versiones = new Map(); this.reintentos = 0; }
  collection(n) { return new FakeColl(this, n); }
  leer(r) { return this.docs.has(r) ? clonar(this.docs.get(r)) : undefined; }
  version(r) { return this.versiones.get(r) || 0; }
  sembrar(r, d) { this.docs.set(r, clonar(d)); this.versiones.set(r, this.version(r) + 1); }
  async runTransaction(fn) {
    for (let i = 0; i < 30; i++) {
      const tx = new FakeTx(this);
      const res = await fn(tx);
      if (tx.leidos.some(([r, v]) => this.version(r) !== v)) { this.reintentos++; continue; }
      // `create` sobre algo que ya existe falla, igual que en Firestore.
      const choca = tx.escrituras.find((w) => w.crear && this.docs.has(w.path));
      if (choca) throw new Error(`ya existe ${choca.path}`);
      for (const w of tx.escrituras) {
        this.docs.set(w.path, { ...(this.leer(w.path) || {}), ...clonar(w.data) });
        this.versiones.set(w.path, this.version(w.path) + 1);
      }
      return res;
    }
    throw new Error('demasiados reintentos');
  }
}

/*
 * LAS IDENTIDADES DE LAS PRUEBAS.
 *
 * Tres cuentas. Ana y Beto tienen las dos caras; Caro solo el Perfil Real —para
 * comprobar que pedirle conexión a un Perfil Weë que no existe se rechaza—.
 */
const WEE_ANA = `hidi_${ANA}`;
const WEE_BETO = `hidi_${BETO}`;

const PERFILES = [
  { uid: ANA, profileType: 'real' },
  { uid: WEE_ANA, profileType: 'hidi', linkedAccountId: ANA },
  { uid: BETO, profileType: 'real' },
  { uid: WEE_BETO, profileType: 'hidi', linkedAccountId: BETO },
  { uid: CARO, profileType: 'real' },
];

const montar = (relaciones = [], perfiles = PERFILES) => {
  const db = new FakeDb();
  perfiles.forEach((p, i) => db.sembrar(`users/doc${i}`, p));
  for (const [id, doc] of relaciones) db.sembrar(`econtacts/${id}`, doc);
  const engine = createEContactEngine({ db: () => db, ahora: () => 1000, sello: (ms) => ({ ms }) });
  return { db, engine };
};
const pendienteEntre = (de, para) => [
  idServidor(de, para),
  { users: de < para ? [de, para] : [para, de], status: 'pending', requestedBy: de, requestedTo: para },
];
const relacionesDe = (db) => [...db.docs.entries()].filter(([p]) => p.startsWith('econtacts/'));
const leerRelacion = (db, de, para) => db.leer(`econtacts/${idServidor(de, para)}`);
const rechaza = async (nombre, fn, motivo) => {
  try { await fn(); check(nombre, false, 'no lanzó error'); }
  catch (e) { check(nombre, e?.motivo === motivo, `motivo "${e?.motivo}" (esperado "${motivo}")`); }
};

{
  const { db, engine } = montar([pendienteEntre(ANA, BETO)]);
  const r = await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA });
  const doc = leerRelacion(db, ANA, BETO);
  check('115) al aceptar, la relación queda aceptada', doc.status === 'accepted');
  check('116) con su fecha de respuesta', !!doc.respondedAt);
  check('117) la pareja no se ha movido', doc.users.join() === [ANA, BETO].sort().join());
  check('118) ni quién pidió a quién', doc.requestedBy === ANA && doc.requestedTo === BETO);
  check('119) y el servidor devuelve el id de la pareja', r.contactId === idServidor(ANA, BETO) && r.status === 'accepted');
  check('120) sigue habiendo UN SOLO documento', relacionesDe(db).length === 1, String(relacionesDe(db).length));
}

{
  const { db, engine } = montar([pendienteEntre(ANA, BETO)]);
  await rechaza('121) quien la envió no puede aceptarla en el servidor', () => engine.accept({ cuentaDeLaSesion: ANA, comoIdentidad: ANA, otraIdentidad: BETO }), 'no-la-recibiste');
  check('122) y la relación sigue pendiente', leerRelacion(db, ANA, BETO).status === 'pending');
  await rechaza('123) una persona ajena tampoco', () => engine.accept({ cuentaDeLaSesion: CARO, comoIdentidad: CARO, otraIdentidad: ANA }), 'sin-relacion');
  check('124) sin tocar nada', leerRelacion(db, ANA, BETO).status === 'pending' && relacionesDe(db).length === 1);
}

{
  const { engine } = montar([]);
  await rechaza('125) aceptar lo que no existe se rechaza', () => engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA }), 'sin-relacion');
}

{
  /*
   * Dos aceptaciones a la vez. La transacción relee dentro, así que la segunda
   * ve la relación ya aceptada y se rechaza: no se puede aceptar dos veces ni
   * dejar el documento a medias.
   */
  const { db, engine } = montar([pendienteEntre(ANA, BETO)]);
  const intentos = await Promise.allSettled([
    engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA }),
    engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA }),
    engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA }),
  ]);
  const ok = intentos.filter((x) => x.status === 'fulfilled').length;
  check('126) tres aceptaciones simultáneas dejan una sola conexión', leerRelacion(db, ANA, BETO).status === 'accepted' && relacionesDe(db).length === 1);
  check('127) y solo una de ellas se acepta', ok === 1, `${ok} aceptadas`);
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── L) El reparto cliente / servidor ──');
// ═════════════════════════════════════════════════════════════════════════════

const funcion = read('functions/src/social/econtact.ts');
const codigoFuncion = sinComentarios(funcion);
const indice = read('functions/src/index.ts');

check('128) las DOS callables existen', /export const requestEContact = onCall/.test(codigoFuncion) && /export const acceptEContact = onCall/.test(codigoFuncion));
check('129) están exportadas desde index.ts', /export \{ requestEContact, acceptEContact \} from '\.\/social\/econtact';/.test(indice));
check('130) corren en us-central1, como el cliente espera', /region: 'us-central1'/.test(codigoFuncion));
/*
 * LA CUENTA SALE DE AUTH; LA IDENTIDAD LA DICE EL CLIENTE Y SE COMPRUEBA.
 *
 * Es la diferencia entre las dos cosas. Con qué CUENTA llamas no se negocia:
 * `request.auth.uid`. Con cuál de tus dos CARAS estás actuando sí lo dice el
 * cliente —no hay otra forma de saberlo—, y por eso `resolver(..., true)` va a
 * `users` a comprobar que ese perfil es de esa cuenta antes de nada.
 */
check('131) la cuenta sale de request.auth, no del cuerpo', /return request\.auth\.uid as string;/.test(codigoFuncion) && !/data\.(uid|accountUid|myUid)/.test(codigoFuncion));
check('131b) la identidad propia se comprueba contra users', /resolver\(desdeIdentidad, cuentaDeLaSesion, true\)/.test(codigoFuncion) && /resolver\(comoIdentidad, cuentaDeLaSesion, true\)/.test(codigoFuncion));
check('131c) y la ajena también tiene que existir', /resolver\(haciaIdentidad, cuentaDeLaSesion, false\)/.test(codigoFuncion) && /resolver\(otraIdentidad, cuentaDeLaSesion, false\)/.test(codigoFuncion));
check('131d) el perfil se busca por el campo uid, que es lo que las reglas no pueden', /collection\(PERFILES\)\.where\('uid', '==', identidad\)/.test(codigoFuncion));
check('132) el id del documento lo calcula el servidor', /idDeContacto\(de\.identity, para\.identity\)/.test(codigoFuncion) && !/data\.contactId/.test(codigoFuncion));
check('133) sin sesión no se hace nada', /if \(!request\.auth\) throw new HttpsError\('unauthenticated'/.test(codigoFuncion));
check('134) ni con otra cara de tu propia cuenta', /de\.accountUid === para\.accountUid/.test(codigoFuncion) && /yo\.accountUid === otro\.accountUid/.test(codigoFuncion));
check('135) todo dentro de una transacción', (codigoFuncion.match(/runTransaction/g) || []).length === 2);
check('136) aceptar solo mueve el estado y la fecha', /tx\.update\(ref, \{ status: 'accepted', respondedAt:/.test(codigoFuncion));
check('136b) y pedir crea, para que dos a la vez no dejen dos documentos', /tx\.create\(ref, \{/.test(codigoFuncion));
check('137) la función no gasta Credits ni llama a IA', !/credits|gemini|provider|spend/i.test((codigoFuncion.match(/^import .*$/gm) || []).join('\n')));

// El cliente ya no escribe ni la solicitud ni la aceptación.
check('138) el servicio pide las dos transiciones a las callables', /httpsCallable[\s\S]{0,200}nombre/.test(codigoServicio) && /'requestEContact' \| 'acceptEContact'/.test(codigoServicio));
check('139) y ya no hace updateDoc ni setDoc en ninguna parte', !/updateDoc/.test(codigoServicio) && !/setDoc/.test(codigoServicio));
check('140) borrar sigue siendo del cliente, y son las tres salidas', (codigoServicio.match(/deleteDoc\(refDe/g) || []).length === 3);
check('141) rechazar solo si la recibiste', /rechazarSolicitud[\s\S]{0,320}puedeAceptar\(actual, yo\)/.test(codigoServicio));
check('142) cancelar solo si la enviaste tú', /cancelarSolicitud[\s\S]{0,320}puedeCancelar\(actual, yo\)/.test(codigoServicio));
check('143) eliminar solo si ya estáis conectados', /eliminarContacto[\s\S]{0,320}puedeEliminar\(actual, yo\)/.test(codigoServicio));

// Y las reglas cierran la puerta del todo.
const bloqueRe = reglas.slice(reglas.indexOf('match /econtacts/{contactId}'), reglas.indexOf('// === FOLLOWS ==='));
check('144) las reglas prohíben CUALQUIER update del cliente', /allow update: if false;/.test(bloqueRe));
check('145) así que nadie puede fabricar una conexión aceptada', !/allow update: if [^f]/.test(bloqueRe));
check('146) borrar sigue siendo de quien participa, y solo en los dos estados', /allow delete: if isAuthenticated\(\) && participo\(\) &&[\s\S]{0,140}'pending' \|\| resource\.data\.status == 'accepted'/.test(bloqueRe));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── M) El contador: derivado, y a propósito ──');
// ═════════════════════════════════════════════════════════════════════════════

/*
 * DECISIÓN: el contador se DERIVA de las conexiones aceptadas, no se guarda.
 * Un contador denormalizado que nadie mantiene se desincroniza —le pasa hoy a
 * `followers`/`following`, a cero en los 14 perfiles pese a existir un follow—.
 * El campo `econtactsCount` queda reservado y cerrado al cliente para cuando el
 * servidor lo escriba.
 */
check('147) el contador sale de las conexiones aceptadas de ESA identidad', /contarContactos\(await relacionesDe\(comoIdentidad\), comoIdentidad\)/.test(codigoServicio));
check('148) nadie escribe econtactsCount desde el cliente', !/econtactsCount/.test(codigoServicio) && !/econtactsCount/.test(sinComentarios(fuenteModelo)));
check('149) ni desde la callable de este bloque', !/econtactsCount/.test(codigoFuncion));
check('150) y las reglas lo cierran igual que el saldo de Credits', /!createsEcontactFields\(\)/.test(reglas) && /!touchesEcontactFields\(\)/.test(reglas));
check('151) queda documentado que es derivado', /derivado|se cuenta de lo que hay|lo escribirá el servidor/i.test(servicio));

/*
 * Las reglas también se ejecutan, en `econtact-rules.emulator.mjs`. No está en
 * `npm test` porque necesita el emulador y Java; se lanza a mano y su cabecera
 * dice cómo. Aquí solo se vigila que siga existiendo y fuera del runner, para
 * que nadie lo borre pensando que sobra ni lo meta y rompa la suite.
 */
check('152) existe la prueba de reglas que se ejecuta en el emulador', read('functions/test/econtact-rules.emulator.mjs').includes('econtacts'));
check('153) y NO está en el runner, porque necesita emulador', !read('functions/package.json').includes('econtact-rules.emulator'));
check('154) su cabecera explica cómo lanzarla', /firebase emulators:exec/.test(read('functions/test/econtact-rules.emulator.mjs')));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── N) El perfil de otra persona ──');
// ═════════════════════════════════════════════════════════════════════════════

const perfilAjeno = read('screens/UserProfileScreen.tsx');
const codigoAjeno = sinComentarios(perfilAjeno);

check('155) usa el hook de ËContact, no el de seguir', /useEContact\(userId\)/.test(codigoAjeno) && !/useFollow/.test(codigoAjeno));
check('156) y no llama a followsService para personas', !/followsService|toggleFollow/.test(codigoAjeno));
/*
 * Los cuatro estados. No es un interruptor: pedir no conecta, hay que aceptar,
 * y por eso cada estado ofrece una acción distinta.
 */
/*
 * Y el nombre del botón es el de TU agenda, no un literal. La relación es entre
 * tu identidad activa y la del perfil que estás mirando; el nombre lo pide al
 * hook, así que cuando la agenda pasó a llamarse igual en las dos caras aquí no
 * hubo nada que tocar.
 */
check('157) sin relación se ofrece "+ " y el nombre de tu agenda', /etiqueta: `\+ \$\{nombreLista\}`/.test(perfilAjeno));
check('158) si la enviaste tú, "Solicitud enviada"',
  /etiqueta: t\('econtact\.requestSent'\),/.test(perfilAjeno)
  && /requestSent: 'Solicitud enviada'/.test(read('i18n/textos/es/econtact.ts'))
  && /requestSent: 'Request sent'/.test(read('i18n/textos/en/econtact.ts')));
check('159) si te la enviaron, se puede aceptar',
  /t\('econtact\.acceptLabel', \{ lista: nombreLista \}\)/.test(perfilAjeno)
  && /acceptLabel: 'Aceptar \{\{lista\}\}'/.test(read('i18n/textos/es/econtact.ts'))
  && /econtact\.aceptar/.test(codigoAjeno));
check('160) y también rechazar', /econtact\.rechazar/.test(codigoAjeno));
check('161) si ya estáis, el nombre con su ✓', /etiqueta: `\$\{nombreLista\} ✓`/.test(perfilAjeno));
check('162) y se puede eliminar, preguntando antes',
  /econtact\.eliminar/.test(codigoAjeno)
  && /preguntarYHacer\(t\('econtact\.removeTitle', \{ lista: nombreLista \}\)/.test(perfilAjeno)
  && /removeTitle: 'Eliminar \{\{lista\}\}'/.test(read('i18n/textos/es/econtact.ts')));
check('162b) el nombre sale del hook, no está escrito a mano', /nombreLista \} = econtact/.test(codigoAjeno) && !/'\+ ËContact'|'ËContact ✓'/.test(codigoAjeno));
check('163) los cuatro estados están cubiertos', ['ninguno', 'pendiente-enviada', 'pendiente-recibida', 'conectados'].every((e) => codigoAjeno.includes(e)));
check('164) ya no aparece "Seguir" ni "Siguiendo"', !/'Seguir'|"Seguir"|'Siguiendo'|"Siguiendo"/.test(codigoAjeno));
check('165) ni las cifras de seguidores del perfil ajeno', !/Seguidores|userProfile\.followers|userProfile\.following/.test(codigoAjeno));
check('166) las acciones pasan por el servicio de ËContact', /econtact\.(solicitar|aceptar|rechazar|cancelar|eliminar)/.test(codigoAjeno));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── O) Tu propio perfil ──');
// ═════════════════════════════════════════════════════════════════════════════

const perfilPropio = read('screens/ProfileScreen.tsx');
const codigoPropio = sinComentarios(perfilPropio);

check('167) no muestra Seguidores', !/>Seguidores<|Seguidores<\/Text>/.test(codigoPropio) && !/userProfile\.followers/.test(codigoPropio));
check('168) ni Siguiendo', !/Siguiendo/.test(codigoPropio) && !/userProfile\.following/.test(codigoPropio));
/*
 * La cifra del perfil propio lleva el nombre de la agenda ACTIVA —ËContacts— y
 * cuenta solo las de esa identidad, nunca la suma de las dos caras. Que el
 * nombre sea el mismo en las dos no junta las listas: son cifras distintas.
 */
check('169) muestra el nombre de la agenda activa, no un literal', /\{misEcontacts\.nombrePlural\}/.test(perfilPropio) && !/>ËContacts</.test(codigoPropio));
/*
 * Desde la fase 5M la etiqueta sale del diccionario, pero defiende lo mismo: el
 * nombre de la agenda activa entra por HUECO, así que sigue siendo el de la
 * identidad puesta y no una marca congelada en la frase. Se mira la llamada Y
 * la frase de los dos idiomas, que es donde podría colarse el literal.
 */
check('169b) y su etiqueta de accesibilidad también',
  /accessibilityLabel=\{t\('profile\.viewMyEcontacts', \{ nombre: misEcontacts\.nombrePlural, total: misEcontacts\.total \}\)\}/.test(perfilPropio)
  && ['es', 'en'].every((idioma) => {
    const frase = read(`i18n/textos/${idioma}/profile.ts`).match(/^ {2}viewMyEcontacts: '(.*)',$/m)?.[1];
    return !!frase && frase.includes('{{nombre}}') && !/[ËẄ]Contacts/.test(frase);
  }));
check('170) con el número de conexiones aceptadas', /misEcontacts\.total/.test(codigoPropio) && /useMisEContacts\(\)/.test(codigoPropio));
check('171) y es pulsable: abre ËContact', /onPress=\{irAEContact\}/.test(codigoPropio) && /navigate\('EContact'\)/.test(codigoPropio));
check('172) subiendo hasta el navegador que la tiene', /getParent\(\)[\s\S]{0,120}getParent\(\)[\s\S]{0,160}navigate\('EContact'\)/.test(codigoPropio));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── P) Buscar ──');
// ═════════════════════════════════════════════════════════════════════════════

const buscar = read('screens/SearchScreen.tsx');
const codigoBuscar = sinComentarios(buscar);

check('173) no muestra seguidores de una persona', !/seguidores/i.test(codigoBuscar) && !/user\.followers/.test(codigoBuscar));
check('174) ni siguiendo', !/user\.following/.test(codigoBuscar));
/*
 * Y no se cambia un número por otro: convertir "N seguidores" en "N ËContacts"
 * habría dado por buenos unos datos que son de otro sistema.
 */
check('175) ni convierte el contador histórico en ËContacts', !/ËContact/.test(codigoBuscar));
check('176) sigue mostrando lo que sí es suyo: sus publicaciones', /publicaciones/.test(buscar));
check('177) y la búsqueda ya no ordena a las personas por seguidores', !/\(b\.followers \|\| 0\) - \(a\.followers \|\| 0\)/.test(read('services/firestoreService.ts')));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Q) La pantalla de ËContact ──');
// ═════════════════════════════════════════════════════════════════════════════

const pantallaEC = read('screens/EContactScreen.tsx');
const codigoPantalla = sinComentarios(pantallaEC);

/*
 * Tres secciones. Las de solicitudes se llaman igual siempre; la de conexiones
 * lleva el nombre de la agenda activa, que entra por hueco —"Tus ËContacts"—.
 */
check('178) tiene las tres secciones',
  ["t('econtact.requestsReceived')", "t('econtact.yours', { lista: nombrePlural })", "t('econtact.requestsSent')"].every((x) => pantallaEC.includes(x))
  && /requestsReceived: 'Solicitudes recibidas'/.test(read('i18n/textos/es/econtact.ts')));
/*
 * Lo que pide algo de ti va primero. Las solicitudes recibidas esperan tu
 * respuesta; el resto solo informa.
 */
check('179) y lo que espera respuesta tuya va arriba', codigoPantalla.indexOf("'recibidas'") < codigoPantalla.indexOf("'contactos'"));
check('180) una sección vacía no se pinta', /filter\(\(s\) => s\.data\.length > 0\)/.test(codigoPantalla));
/*
 * LAS ACCIONES VIENEN ATADAS A LA IDENTIDAD ACTIVA.
 *
 * La pantalla no las llama con un uid propio: recibe del hook `aceptar`,
 * `rechazar`, `cancelar` y `eliminar` ya emparejadas con el perfil activo, y solo
 * dice a QUIÉN. Así no hay forma de que aceptar desde el Perfil Weë escriba como
 * el Perfil Real, porque la pantalla ni siquiera puede elegirlo.
 */
check('181) aceptar y rechazar en las recibidas', /onPress=\{\(\) => ejecutar\(identidad, \(\) => aceptar\(identidad\)\)\}/.test(codigoPantalla) && /rechazar\(identidad\)/.test(codigoPantalla));
check('182) cancelar en las enviadas', /cancelar\(identidad\)/.test(codigoPantalla));
check('183) eliminar en los contactos', /eliminar\(identidad\)/.test(codigoPantalla));
check('183b) las cuatro salen del hook, no del servicio a pelo', /aceptar,\s*\n\s*rechazar,\s*\n\s*cancelar,\s*\n\s*eliminar,/.test(codigoPantalla));
check('184) y la pantalla no toca ni el servicio ni Firestore', !/econtactService\./.test(codigoPantalla) && !/collection\(db/.test(codigoPantalla) && !/usersService/.test(codigoPantalla));
check('185) cada persona se identifica por su nombre y su avatar', /perfil\.displayName/.test(codigoPantalla) && /AvatarDisplay/.test(codigoPantalla));
check('186) y nunca se PINTA un uid', !/<Text[^>]*>\s*\{[^}]*\.uid[^}]*\}/.test(codigoPantalla) && !/\{identidad\}</.test(codigoPantalla));
check('187) borrar y rechazar preguntan antes', /confirmAction/.test(codigoPantalla));
check('188) un toque bloquea a esa persona hasta terminar', /ocupado === identidad/.test(codigoPantalla) && /if \(ocupado\) return;/.test(codigoPantalla));
check('189) objetivos táctiles sin scale()', /minHeight: 64,/.test(codigoPantalla) && /width: 44,/.test(codigoPantalla));
check('190) sin chat, grupos, recomendaciones ni contactos del teléfono', !/Conversation|messagesService|grupo|recomend|marketplace/i.test(codigoPantalla));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── R) Notificaciones ──');
// ═════════════════════════════════════════════════════════════════════════════

const notis = read('services/notificationService.ts');
const pantallaNotis = read('screens/NotificationsScreen.tsx');
const indiceFn = read('functions/src/index.ts');

check('191) hay tipos propios de ËContact', /'econtact_request'/.test(notis) && /'econtact_accepted'/.test(notis));
/*
 * No se reutiliza `follow`: si compartieran tipo, las notificaciones de
 * seguidores ya enviadas dirían de pronto algo que nunca pasó.
 */
check('192) sin mezclarse con el tipo histórico', /'follow'/.test(notis) && !/type: 'follow'[\s\S]{0,200}econtact/.test(notis));
check('193) el servicio de ËContact los usa', /createEContactRequestNotification/.test(codigoServicio) && /createEContactAcceptedNotification/.test(codigoServicio));
check('194) y no crea un sistema paralelo', /from '\.\/notificationService'/.test(codigoServicio) && !/collection\(db, 'econtactNotifications'\)/.test(codigoServicio));
check('195) un aviso que falle no deshace la conexión', /catch \(error\) \{[\s\S]{0,120}no se pudo avisar/i.test(servicio));
check('196) la pantalla los sabe decir',
  /notifications\.econtactRequest/.test(pantallaNotis) && /notifications\.econtactAccepted/.test(pantallaNotis)
  && /quiere agregarte a ËContact/.test(read('i18n/textos/es/notifications.ts')) && /aceptó tu solicitud de ËContact/.test(read('i18n/textos/es/notifications.ts')));
check('197) y las históricas se siguen mostrando',
  /notifications\.follow/.test(pantallaNotis) && /comenzó a seguirte/.test(read('i18n/textos/es/notifications.ts')));
check('198) el push del servidor también los conoce', /econtact_request:/.test(indiceFn) && /econtact_accepted:/.test(indiceFn));
check('199) sin borrar el mensaje histórico', /follow: \(senderName\)/.test(indiceFn));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── S) Lo antiguo sigue en pie, pero ya no alimenta nada ──');
// ═════════════════════════════════════════════════════════════════════════════

check('200) followsService sigue existiendo', read('services/followsService.ts').includes("collection(db, 'follows')"));
check('201) useFollow también', read('hooks/useFollow.ts').includes('followsService'));
/*
 * Y no lo usa nadie de la experiencia social de personas. Es la comprobación
 * que importa: no basta con que ËContact exista, tiene que ser el único.
 */
{
  const sociales = ['screens/UserProfileScreen.tsx', 'screens/ProfileScreen.tsx', 'screens/SearchScreen.tsx', 'screens/EContactScreen.tsx'];
  const culpables = sociales.filter((f) => /useFollow|followsService|toggleFollow/.test(sinComentarios(read(f))));
  check('202) ninguna pantalla social usa el sistema antiguo', culpables.length === 0, culpables.join(','));
}
check('203) las reglas de follows no se han tocado', /match \/follows\/\{followId\}[\s\S]{0,400}followerId\.matches\('biz_\.\*'\)/.test(reglas));
check('204) businessFollows intacto', /match \/businessFollows\/\{followId\}[\s\S]{0,200}request\.resource\.data\.userId == request\.auth\.uid/.test(reglas));
check('205) y el perfil de negocio sigue con su propio seguir', /isFollowing \? 'Siguiendo' : 'Seguir'/.test(read('screens/WeeBizProfileScreen.tsx')));
check('206) la píldora ËContact del compositor ya está viva, y sigue sin tocar relaciones', /setShowEContacts/.test(read('screens/CreateScreen.tsx')) && !/econtactService/.test(sinComentarios(read('screens/CreateScreen.tsx'))));
check('207) ËContact no gasta Credits ni llama a IA', !/spendCredits|gemini|provider/i.test(codigoPantalla + sinComentarios(read('hooks/useEContact.ts'))));
check('208) sin índices nuevos', !/econtact/i.test(read('firestore.indexes.json')));
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── T) Identidades de perfil: las dos agendas de una cuenta ──');
// ═════════════════════════════════════════════════════════════════════════════
/*
 * LA CORRECCIÓN DE ARQUITECTURA.
 *
 * Una cuenta tiene hasta dos caras de persona y CADA UNA lleva su propia agenda:
 * el Perfil Real ve la suya y el Perfil Weë la suya, las dos llamadas ËContact.
 * Lo que las separa no es el nombre —es el producto, y es uno— sino el contenido:
 * no son dos redes —hay una sola infraestructura y un solo documento por
 * relación—, son dos vistas.
 *
 * `hidi_` se queda como identificador técnico de los perfiles que ya existen. Lo
 * que no se queda es el vocabulario: en pantalla se dice Perfil Weë.
 */

// ─── Qué es una identidad ────────────────────────────────────────────────────

check('209) un uid con prefijo hidi_ es un Perfil Weë', tipoDeIdentidad(WEE_ANA) === 'wee');
check('210) uno con biz_ es un Perfil Biz', tipoDeIdentidad(`${PREFIJO_PERFIL_BIZ}n1`) === 'biz');
check('211) y un uid pelado es un Perfil Real', tipoDeIdentidad(ANA) === 'real');
check('212) el prefijo histórico sigue siendo exactamente hidi_', PREFIJO_PERFIL_WEE === 'hidi_');
check('213) ËContact es entre personas: un Biz no vale', esIdentidadDePersona(ANA) && esIdentidadDePersona(WEE_ANA) && !esIdentidadDePersona(`${PREFIJO_PERFIL_BIZ}n1`));
/*
 * Una identidad no puede llevar `_` propio. Es lo que hace que unir dos con `_`
 * no sea ambiguo, y por tanto que `real A ↔ Weë B` no pueda chocar con
 * `Weë A ↔ real B`.
 */
check('214) una identidad con guion bajo propio se rechaza', !esIdentidadValida('uid_raro') && !esIdentidadValida('hidi_a_b'));
check('215) y una vacía o con barra también', !esIdentidadValida('') && !esIdentidadValida('a/b') && !esIdentidadValida(null));

check('216) el Perfil Real ve ËContact', nombreDeLista(ANA) === 'ËContact');
check('217) y el Perfil Weë ve ẄContact', nombreDeLista(WEE_ANA) === 'ẄContact');
/* La diéresis se fija por punto de código: así se caza tanto una "E" pelada como la vuelta de la Ẅ. */
/* La Ë es U+00CB y la Ẅ es U+1E84. Confundirlas no rompe nada, y por eso se comprueban. */
check('218) cada cara con su letra: Ë para el Real, Ẅ para el Weë',
  nombreDeLista(ANA).charCodeAt(0) === 0x00cb && nombreDeLista(WEE_ANA).charCodeAt(0) === 0x1e84);

// ─── De quién es una identidad ───────────────────────────────────────────────

check('219) las identidades de una cuenta son su Perfil Real y su Perfil Weë', identidadesDeCuenta(ANA).join() === [ANA, WEE_ANA].join());
check('220) y una identidad ajena no es tuya', identidadEsDeLaCuenta(WEE_ANA, ANA) && identidadEsDeLaCuenta(ANA, ANA) && !identidadEsDeLaCuenta(WEE_BETO, ANA) && !identidadEsDeLaCuenta(BETO, ANA));

const perfilReal = (uid) => ({ uid, profileType: 'real' });
const perfilWee = (cuenta) => ({ uid: `hidi_${cuenta}`, profileType: 'hidi', linkedAccountId: cuenta });

check('221) un Perfil Real es de su propia cuenta', cuentaDeIdentidad(ANA, perfilReal(ANA)) === ANA);
check('222) un Perfil Weë es de la cuenta de su vínculo', cuentaDeIdentidad(WEE_ANA, perfilWee(ANA)) === ANA);
/*
 * LA FUENTE ES `users`, NO EL PREFIJO. Sin documento no hay dueño, aunque el uid
 * lo sugiera: es lo que impide que el cliente afirme de quién es una identidad.
 */
check('223) sin documento no se puede afirmar de quién es', cuentaDeIdentidad(WEE_ANA, null) === null && cuentaDeIdentidad(ANA, null) === null);
check('224) y no se deduce quitando el prefijo', cuentaDeIdentidad(WEE_ANA, null) !== ANA);
check('225) un documento que no es el de esa identidad no vale', cuentaDeIdentidad(WEE_ANA, perfilWee(BETO)) === null);
check('226) un Perfil Weë sin vínculo tampoco', cuentaDeIdentidad(WEE_ANA, { uid: WEE_ANA, profileType: 'hidi' }) === null);
/*
 * Y el uid y el vínculo tienen que contar la misma historia. Si un documento
 * dijera `uid: hidi_ANA` pero `linkedAccountId: BETO`, se contradice a sí mismo:
 * ni ANA ni BETO pueden usarlo. Las reglas solo pueden mirar el prefijo, así que
 * exigir que coincidan es lo que impide que las dos capas discrepen.
 */
check('227) un vínculo que contradice al prefijo invalida la identidad', cuentaDeIdentidad(WEE_ANA, { uid: WEE_ANA, profileType: 'hidi', linkedAccountId: BETO }) === null);
check('228) un Perfil Biz no lleva a ninguna persona', cuentaDeIdentidad(`${PREFIJO_PERFIL_BIZ}n1`, { uid: `${PREFIJO_PERFIL_BIZ}n1`, profileType: 'biz', linkedAccountId: ANA }) === null);
check('229) un perfil real que se declara Weë se rechaza', cuentaDeIdentidad(ANA, { uid: ANA, profileType: 'hidi' }) === null);
check('230) cliente y servidor deciden lo mismo sobre la propiedad', [
  [WEE_ANA, perfilWee(ANA)], [WEE_ANA, perfilWee(BETO)], [ANA, perfilReal(ANA)], [WEE_ANA, null],
  [WEE_ANA, { uid: WEE_ANA, profileType: 'hidi', linkedAccountId: BETO }],
].every(([id, p]) => cuentaDeIdentidad(id, p) === servidor.cuentaDeIdentidad(id, p)));

// ─── El id: simétrico, y distinto para cada pareja de identidades ────────────

check('231) el id es el mismo se pida como se pida', idDeContacto(WEE_ANA, BETO) === idDeContacto(BETO, WEE_ANA));
/*
 * LO QUE NO PUEDE COLISIONAR. `real A ↔ Weë B` y `Weë A ↔ real B` son dos
 * relaciones distintas entre cuatro identidades distintas, y tienen que caer en
 * dos documentos distintos.
 */
{
  const cruces = [
    ['real↔real', idDeContacto(ANA, BETO)],
    ['Weë A↔real B', idDeContacto(WEE_ANA, BETO)],
    ['real A↔Weë B', idDeContacto(ANA, WEE_BETO)],
    ['Weë↔Weë', idDeContacto(WEE_ANA, WEE_BETO)],
  ];
  const ids = cruces.map(([, id]) => id);
  check('232) los cuatro cruces dan cuatro ids distintos', new Set(ids).size === 4, cruces.map(([n, id]) => `${n}=${id}`).join(' · '));
  check('233) y el servidor calcula los mismos cuatro', cruces.every(([, id], i) => {
    const parejas = [[ANA, BETO], [WEE_ANA, BETO], [ANA, WEE_BETO], [WEE_ANA, WEE_BETO]];
    return idServidor(parejas[i][0], parejas[i][1]) === id;
  }));
}
check('234) una identidad no se agrega a sí misma', (() => { try { idDeContacto(WEE_ANA, WEE_ANA); return false; } catch { return true; } })());
check('235) ni un Perfil Real consigo mismo', (() => { try { idDeContacto(ANA, ANA); return false; } catch { return true; } })());
check('236) ni un Biz por ningún lado', (() => { try { idDeContacto(ANA, `${PREFIJO_PERFIL_BIZ}n1`); return false; } catch { return true; } })());
/*
 * COMPATIBILIDAD. Una relación entre dos Perfiles Reales se guarda EXACTAMENTE
 * igual que con el modelo anterior, porque el uid de un Perfil Real es el uid de
 * su cuenta. Por eso este cambio no necesita migración.
 */
check('237) real↔real da el mismo id que el modelo anterior por cuentas', idDeContacto(ANA, BETO) === [ANA, BETO].sort().join('_'));

// ─── Los cuatro cruces, ejecutando el servidor ───────────────────────────────

/*
 * Los cuatro casos obligatorios, de punta a punta: pedir, comprobar que pendiente
 * no cuenta, aceptar, comprobar que ya cuenta, y comprobar que hay UNA relación
 * y no dos.
 *
 * `listaDe` es exactamente lo que hace el servicio: consultar por la identidad y
 * repartir con el modelo. Que la agenda de cada cara salga bien se comprueba
 * ejecutándolo, no leyéndolo.
 */
const relacionesDeIdentidad = (db, identidad) =>
  relacionesDe(db).map(([, d]) => d).filter((d) => Array.isArray(d.users) && d.users.includes(identidad));

const listaDe = (db, identidad) => ({
  contactos: contactosDe(relacionesDeIdentidad(db, identidad), identidad).map((d) => elOtro(d, identidad)),
  recibidas: solicitudesRecibidas(relacionesDeIdentidad(db, identidad), identidad).map((d) => d.requestedBy),
  enviadas: solicitudesEnviadas(relacionesDeIdentidad(db, identidad), identidad).map((d) => d.requestedTo),
  total: contarContactos(relacionesDeIdentidad(db, identidad), identidad),
});

const CRUCES = [
  { n: 1, nombre: 'real A → real B', de: ANA, para: BETO, cuentaDe: ANA, cuentaPara: BETO },
  { n: 2, nombre: 'Weë A → real B', de: WEE_ANA, para: BETO, cuentaDe: ANA, cuentaPara: BETO },
  { n: 3, nombre: 'real A → Weë B', de: ANA, para: WEE_BETO, cuentaDe: ANA, cuentaPara: BETO },
  { n: 4, nombre: 'Weë A → Weë B', de: WEE_ANA, para: WEE_BETO, cuentaDe: ANA, cuentaPara: BETO },
];

for (const c of CRUCES) {
  const { db, engine } = montar([]);
  const otraCaraDeA = c.de === ANA ? WEE_ANA : ANA;
  const otraCaraDeB = c.para === BETO ? WEE_BETO : BETO;

  const pedido = await engine.request({ cuentaDeLaSesion: c.cuentaDe, desdeIdentidad: c.de, haciaIdentidad: c.para });
  check(`238·${c.n}) ${c.nombre}: la solicitud nace pendiente`, pedido.status === 'pending');
  check(`239·${c.n}) ${c.nombre}: y con las dos identidades, no con las cuentas`, pedido.users.includes(c.de) && pedido.users.includes(c.para));
  check(`240·${c.n}) ${c.nombre}: hay UN solo documento`, relacionesDe(db).length === 1);

  // Pendiente no cuenta para nadie.
  check(`241·${c.n}) ${c.nombre}: pendiente no suma en ninguna de las dos`, listaDe(db, c.de).total === 0 && listaDe(db, c.para).total === 0);
  check(`242·${c.n}) ${c.nombre}: quien pidió la ve en enviadas`, listaDe(db, c.de).enviadas.join() === c.para);
  check(`243·${c.n}) ${c.nombre}: quien la recibió, en recibidas`, listaDe(db, c.para).recibidas.join() === c.de);

  // La OTRA cara de cada cuenta no ve nada. Es lo que separa las dos agendas.
  check(`244·${c.n}) ${c.nombre}: la otra cara de A no ve nada`, JSON.stringify(listaDe(db, otraCaraDeA)) === JSON.stringify({ contactos: [], recibidas: [], enviadas: [], total: 0 }));
  check(`245·${c.n}) ${c.nombre}: la otra cara de B tampoco`, JSON.stringify(listaDe(db, otraCaraDeB)) === JSON.stringify({ contactos: [], recibidas: [], enviadas: [], total: 0 }));

  // Aceptar, desde la identidad que la recibió.
  const aceptado = await engine.accept({ cuentaDeLaSesion: c.cuentaPara, comoIdentidad: c.para, otraIdentidad: c.de });
  check(`246·${c.n}) ${c.nombre}: aceptada`, aceptado.status === 'accepted');
  check(`247·${c.n}) ${c.nombre}: mismo contactId desde los dos lados`, aceptado.contactId === pedido.contactId && aceptado.contactId === idServidor(c.para, c.de));
  check(`248·${c.n}) ${c.nombre}: SIGUE habiendo un solo documento`, relacionesDe(db).length === 1, String(relacionesDe(db).length));
  check(`249·${c.n}) ${c.nombre}: ahora sí cuenta, en las dos`, listaDe(db, c.de).total === 1 && listaDe(db, c.para).total === 1);
  check(`250·${c.n}) ${c.nombre}: y cada una ve a la OTRA identidad`, listaDe(db, c.de).contactos.join() === c.para && listaDe(db, c.para).contactos.join() === c.de);
  check(`251·${c.n}) ${c.nombre}: ya no hay nada pendiente`, listaDe(db, c.de).enviadas.length === 0 && listaDe(db, c.para).recibidas.length === 0);
  check(`252·${c.n}) ${c.nombre}: las otras caras siguen sin ver nada`, listaDe(db, otraCaraDeA).total === 0 && listaDe(db, otraCaraDeB).total === 0);

  // Y la agenda de cada lado se llama como su identidad.
  /* Cada lado ve SU agenda con el nombre de SU cara: la relación es una, los nombres dos. */
  check(`253·${c.n}) ${c.nombre}: cada lado ve la agenda de su propia cara`,
    nombreDeLista(c.de) === (c.de.startsWith('hidi_') ? 'ẄContact' : 'ËContact')
    && nombreDeLista(c.para) === (c.para.startsWith('hidi_') ? 'ẄContact' : 'ËContact'));

  // No se puede duplicar pidiéndola otra vez, ni desde el otro lado.
  await rechaza(`254·${c.n}) ${c.nombre}: no se puede repetir la solicitud`, () => engine.request({ cuentaDeLaSesion: c.cuentaDe, desdeIdentidad: c.de, haciaIdentidad: c.para }), 'ya-existe');
  await rechaza(`255·${c.n}) ${c.nombre}: ni al revés`, () => engine.request({ cuentaDeLaSesion: c.cuentaPara, desdeIdentidad: c.para, haciaIdentidad: c.de }), 'ya-existe');
  check(`256·${c.n}) ${c.nombre}: y sigue habiendo uno`, relacionesDe(db).length === 1);
}

// ─── Las dos agendas de una cuenta conviven sin mezclarse ────────────────────

/*
 * El caso que da sentido a todo: A tiene las dos caras, y cada una tiene su
 * propia relación con B. Dos relaciones, dos documentos, dos listas — y ninguna
 * asoma en la lista de la otra.
 */
{
  const { db, engine } = montar([]);
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: BETO });
  await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA });
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: WEE_ANA, haciaIdentidad: WEE_BETO });
  await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: WEE_BETO, otraIdentidad: WEE_ANA });

  check('257) dos relaciones distintas para la misma cuenta', relacionesDe(db).length === 2);
  check('258) el ËContact del Perfil Real ve solo al Perfil Real', listaDe(db, ANA).contactos.join() === BETO);
  check('259) el ẄContact del Perfil Weë ve solo al Perfil Weë', listaDe(db, WEE_ANA).contactos.join() === WEE_BETO);
  check('260) cada agenda cuenta 1, no 2', listaDe(db, ANA).total === 1 && listaDe(db, WEE_ANA).total === 1);
  /*
   * CAMBIAR DE PERFIL ACTIVO NO MUEVE NADA. Los documentos son los mismos antes y
   * después; lo único que cambia es con qué clave se consulta.
   */
  const antes = JSON.stringify(relacionesDe(db));
  const vistaReal = listaDe(db, ANA);
  const vistaWee = listaDe(db, WEE_ANA);
  check('261) cambiar de perfil no toca ningún documento', JSON.stringify(relacionesDe(db)) === antes);
  check('262) solo cambia la vista', JSON.stringify(vistaReal) !== JSON.stringify(vistaWee));
  check('263) y el nombre de la lista SÍ se mueve con el perfil', nombreDeLista(ANA) === 'ËContact' && nombreDeLista(WEE_ANA) === 'ẄContact');
}

// ─── Suplantación: qué NO se puede hacer ─────────────────────────────────────

{
  const { db, engine } = montar([]);
  await rechaza('264) no puedes pedir desde el Perfil Real de otra persona', () => engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: BETO, haciaIdentidad: CARO }), 'identidad-ajena');
  await rechaza('265) ni desde su Perfil Weë', () => engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: WEE_BETO, haciaIdentidad: CARO }), 'identidad-ajena');
  await rechaza('266) ni desde una identidad que no existe', () => engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: 'hidi_inventado', haciaIdentidad: BETO }), 'identidad-desconocida');
  await rechaza('267) ni hacia una que no existe', () => engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: 'hidi_inventado' }), 'identidad-desconocida');
  await rechaza('268) ni hacia el Perfil Weë de quien no tiene', () => engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: `hidi_${CARO}` }), 'identidad-desconocida');
  await rechaza('269) ni con una identidad de negocio', () => engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: `${PREFIJO_PERFIL_BIZ}n1` }), 'identidad-invalida');
  await rechaza('270) ni con una identidad malformada', () => engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: 'uid_raro' }), 'identidad-invalida');
  /*
   * Las dos caras de una misma cuenta son la misma persona: agregarse a uno mismo
   * no es una conexión. Solo el servidor puede verlo, porque hace falta saber de
   * qué cuenta es cada identidad.
   */
  await rechaza('271) tu Perfil Real no se agrega a tu Perfil Weë', () => engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: WEE_ANA }), 'misma-persona');
  await rechaza('272) ni al revés', () => engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: WEE_ANA, haciaIdentidad: ANA }), 'misma-persona');
  check('273) y no se ha escrito nada en ningún caso', relacionesDe(db).length === 0);
}

{
  /* Aceptar es de la identidad EXACTA que la recibió, no de la cuenta. */
  const { db, engine } = montar([]);
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: WEE_BETO });
  await rechaza('274) el Perfil Real de B no acepta lo que le llegó a su Perfil Weë', () => engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA }), 'sin-relacion');
  await rechaza('275) ni una cuenta ajena', () => engine.accept({ cuentaDeLaSesion: CARO, comoIdentidad: WEE_BETO, otraIdentidad: ANA }), 'identidad-ajena');
  check('276) la solicitud sigue pendiente y sin tocar', leerRelacion(db, ANA, WEE_BETO).status === 'pending' && relacionesDe(db).length === 1);
  const ok = await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: WEE_BETO, otraIdentidad: ANA });
  check('277) y el Perfil Weë de B sí puede', ok.status === 'accepted');
}

{
  /* requestedBy / requestedTo no se reescriben al aceptar. */
  const { db, engine } = montar([]);
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: WEE_ANA, haciaIdentidad: BETO });
  const antes = leerRelacion(db, WEE_ANA, BETO);
  await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: WEE_ANA });
  const despues = leerRelacion(db, WEE_ANA, BETO);
  check('278) quién pidió a quién no cambia al aceptar', despues.requestedBy === antes.requestedBy && despues.requestedTo === antes.requestedTo);
  check('279) la pareja tampoco', despues.users.join() === antes.users.join());
  check('280) y solo se han movido status y respondedAt', Object.keys(despues).sort().join() === [...new Set([...Object.keys(antes), 'respondedAt'])].sort().join() && despues.status === 'accepted');
}

{
  /* Dos solicitudes simultáneas no dejan dos documentos. */
  const { db, engine } = montar([]);
  const intentos = await Promise.allSettled([
    engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: WEE_ANA, haciaIdentidad: WEE_BETO }),
    engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: WEE_ANA, haciaIdentidad: WEE_BETO }),
    engine.request({ cuentaDeLaSesion: BETO, desdeIdentidad: WEE_BETO, haciaIdentidad: WEE_ANA }),
  ]);
  const ok = intentos.filter((x) => x.status === 'fulfilled').length;
  check('281) tres solicitudes simultáneas dejan UNA relación', relacionesDe(db).length === 1, String(relacionesDe(db).length));
  check('282) y solo una de ellas se abre', ok === 1, `${ok} abiertas`);
}

// ─── Rechazar, cancelar y eliminar siguen siendo borrados del cliente ────────

check('283) el servicio borra para las tres salidas', (codigoServicio.match(/deleteDoc\(refDe\(yo, otra\)\)/g) || []).length === 3);
check('284) y comprueba antes que puedes hacerlo', /puedeAceptar\(actual, yo\)/.test(codigoServicio) && /puedeCancelar\(actual, yo\)/.test(codigoServicio) && /puedeEliminar\(actual, yo\)/.test(codigoServicio));
check('285) las reglas dejan borrar solo a quien participa con UNA DE SUS identidades', /allow delete: if isAuthenticated\(\) && participo\(\)/.test(bloque) && /hasAny\(misIdentidades\(\)\)/.test(bloque));

// ─── En pantalla se dice Perfil Weë, nunca Hidi ──────────────────────────────

/*
 * Se miran TODAS las cadenas de texto de la pantalla, y se permiten exactamente
 * dos: `'hidi'`, que es el valor guardado del tipo de perfil, y cualquier cosa
 * que empiece por `hidi_`, que es el prefijo de un uid. Las dos son datos.
 * Cualquier OTRA cadena que diga Hidi o HideTok es vocabulario de producto.
 */
{
  const cadenas = (fuente) => [
    // Cadenas de código: 'así', "así", `así`.
    ...[...fuente.matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]),
    // Y el texto escrito directamente dentro de una etiqueta: <Text>así</Text>.
    ...[...fuente.matchAll(/>([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*)</g)].map((m) => m[1].trim()),
  ];

  const vocabularioViejo = (fuente) =>
    cadenas(fuente).filter(
      (t) => /hidi|hidetok|hidtok|\bhids\b/i.test(t) && t !== 'hidi' && !t.startsWith('hidi_')
    );

  /*
   * Control. Sin él esto no demuestra nada: una comprobación que no encuentra
   * nada porque no sabe mirar da exactamente el mismo verde que una que mira
   * bien. Los tres casos son los tres sitios donde se escribe algo visible.
   */
  check(
    '286) la comprobación detecta vocabulario viejo cuando lo hay',
    vocabularioViejo('<Text>Perfil Hidi</Text>; const a = "Crear tu Hidi"; const b = \'HideTok\';').length === 3
  );
  check(
    '287) y no confunde el identificador guardado con vocabulario',
    vocabularioViejo("profileType: 'hidi'; updateUserCache(`hidi_${uid}`)").length === 0
  );

  const pantallasIdentidad = [
    'screens/UserProfileScreen.tsx',
    'screens/ProfileScreen.tsx',
    'screens/SearchScreen.tsx',
    'screens/EContactScreen.tsx',
    'screens/WeeProfileCreationScreen.tsx',
    'screens/NotificationsScreen.tsx',
    'screens/CommunityScreen.tsx',
    'components/DrawerMenu.tsx',
    'components/Sidebar.tsx',
    'components/Header.tsx',
    'components/PostCard.tsx',
    'screens/PostDetailScreen.tsx',
  ];
  const conVocabularioViejo = pantallasIdentidad
    .map((f) => [f, vocabularioViejo(sinComentarios(read(f)))])
    .filter(([, malas]) => malas.length > 0);
  check(
    '288) ninguna pantalla de identidad dice Hidi ni HideTok',
    conVocabularioViejo.length === 0,
    conVocabularioViejo.map(([f, malas]) => `${f}: ${malas.join('|')}`).join(' · ')
  );
  check('289) el Perfil Weë se llama así en la barra lateral',
    /t\('menu\.activeWee'\)/.test(read('components/Sidebar.tsx'))
    && /activeWee: 'Perfil Weë activo'/.test(read('i18n/textos/es/menu.ts'))
    && /activeWee: 'Weë profile active'/.test(read('i18n/textos/en/menu.ts')));
  /*
   * El texto pasó por i18n, así que ya no está escrito en el cajón: está en el
   * diccionario. Se comprueban las dos mitades —que el cajón pide esa clave y
   * que en español dice lo que tiene que decir—, que es más fuerte que antes.
   */
  check('290) y crearlo también',
    /t\('menu\.createWeeProfile'\)/.test(read('components/DrawerMenu.tsx'))
    && /createWeeProfile: 'Crear mi perfil Weë'/.test(read('i18n/textos/es/menu.ts')));
  check('291) la pantalla de crearlo ya no se llama Hidi', read('screens/HidiCreationScreen.tsx') === '' && read('screens/WeeProfileCreationScreen.tsx').length > 0);
  check('292) ni su ruta', /WeeProfileCreation: undefined;/.test(navegacion) && !/HidiCreation/.test(navegacion));
  check('293) los videos de una comunidad se llaman Weëls', /Weëls/.test(read('screens/CommunityScreen.tsx')) && !/>\s*Hids\s*</.test(read('screens/CommunityScreen.tsx')));
}

// ─── Los identificadores históricos siguen funcionando ───────────────────────

check('294) las reglas siguen reconociendo hidi_ como identidad de la cuenta', (reglas.match(/"hidi_" \+ request\.auth\.uid/g) || []).length > 10);
check('295) un Perfil Weë se sigue guardando con profileType hidi', /profileType: 'hidi'/.test(read('services/firestoreService.ts')));
check('296) y su uid se sigue formando con el prefijo histórico', /`hidi_\$\{realUid\}`/.test(read('services/firestoreService.ts')));
check('297) el tipo de perfil guardado no se ha renombrado', /'real' \| 'hidi' \| 'biz'/.test(read('contexts/UserProfileContext.tsx')));
check('298) el vínculo se escribe al crear el Perfil Weë', /linkedAccountId: realUid/.test(read('services/firestoreService.ts')));
check('299) y en el perfil real, apuntando de vuelta', /linkedAccountId: weeProfileUid/.test(read('screens/WeeProfileCreationScreen.tsx')));
check('300) no hay ninguna migración en el código', !/migrat|migrar|backfill/i.test(codigoServicio + codigoFuncion));

// ─── Follows y businessFollows, intactos ─────────────────────────────────────

check('301) followsService sigue existiendo', read('services/followsService.ts').includes("collection(db, 'follows')"));
check('302) las reglas de follows siguen aceptando hidi_', /match \/follows\/\{followId\}[\s\S]{0,600}followerId == \("hidi_" \+ request\.auth\.uid\)/.test(reglas));
check('303) businessFollows no se ha tocado', /match \/businessFollows\/\{followId\}[\s\S]{0,200}request\.resource\.data\.userId == request\.auth\.uid/.test(reglas));
check('304) y ËContact no ha entrado en ninguno de los dos', !/econtact/i.test(read('services/followsService.ts')) && !/econtact/i.test(read('hooks/useFollow.ts')));
check('305) ningún negocio entra en econtacts', !/businessFollows/.test(codigoServicio + codigoFuncion));

// ─── Notificaciones: el modelo guarda la identidad, no solo la cuenta ────────

/*
 * La UI de notificaciones NO se toca en esta fase. Lo que sí queda listo es el
 * modelo: el aviso va dirigido a la IDENTIDAD que recibe —que es la clave por la
 * que `NotificationsScreen` ya consulta—, y guarda además la cuenta, que hace
 * falta para un push y no se puede deducir del uid de un perfil.
 */
{
  const avisos = read('services/notificationService.ts');
  check('306) el aviso va dirigido a la identidad, no a la cuenta', /Identidad de perfil que recibe/.test(avisos));
  check('307) y guarda la cuenta de quien recibe', /recipientAccountId\?: string;/.test(avisos));
  check('308) y con qué cara escribe quien lo genera', /senderProfileType\?: string;/.test(avisos));
  /*
   * Los dos tipos son propios. `follow` sigue existiendo para las notificaciones
   * de seguidores que ya se enviaron: si ËContact lo reutilizara, esas dirían de
   * pronto algo que nunca pasó.
   */
  const creadoresEContact = avisos.slice(avisos.indexOf('createEContactRequestNotification'));
  check('309) los dos tipos de ËContact son propios y no reutilizan follow', /'econtact_request'/.test(creadoresEContact) && /'econtact_accepted'/.test(creadoresEContact) && !/type: 'follow'/.test(creadoresEContact));
  check('309b) y el tipo follow histórico sigue en pie', /type: 'follow'/.test(avisos));
  check('310) el servicio los rellena con lo que devolvió el servidor', /recipientAccountId: paraCuenta/.test(codigoServicio) && /hecho\.to\.accountUid/.test(codigoServicio));
  check('311) y no se manda un aviso por cada cara: uno por transición', (codigoServicio.match(/await avisar\(/g) || []).length === 2);
}

// ─── ËContact sigue sin costar Credits ───────────────────────────────────────

check('312) ËContact no gasta Credits ni llama a IA', !/spendCredits|gemini|provider/i.test(codigoServicio + sinComentarios(read('hooks/useEContact.ts'))));
check('313) ni en el servidor', !/credits|gemini|provider|spend/i.test((codigoFuncion.match(/^import .*$/gm) || []).join('\n')));
check('314) sin índices nuevos', !/econtact/i.test(read('firestore.indexes.json')));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── U) La agenda en pantalla: una identidad, una lista ──');
// ═════════════════════════════════════════════════════════════════════════════
/*
 * BLOQUE 5A — la UI definitiva.
 *
 * Lo que se comprueba aquí no es que la pantalla "diga" las cosas: es que el
 * nombre, la lista y las acciones salgan TODOS de la identidad activa, y que
 * ninguna de las dos agendas de una cuenta pueda asomar en la otra.
 */

const gancho = read('hooks/useEContact.ts');
const codigoGancho = sinComentarios(gancho);

// ─── A y B · El título depende del perfil activo ─────────────────────────────

check('315) el Perfil Real ve ËContact', nombreDeLista(ANA) === 'ËContact');
check('316) el Perfil Weë ve ẄContact', nombreDeLista(WEE_ANA) === 'ẄContact');
check('317) y el plural se forma sobre el nombre de cada una', `${nombreDeLista(ANA)}s` === 'ËContacts' && `${nombreDeLista(WEE_ANA)}s` === 'ẄContacts');
check('318) la pantalla pinta ese nombre, no uno escrito a mano', /🤝 \{nombreLista\}/.test(pantallaEC));
check('319) el subtítulo también', /contador: total, lista: total === 1 \? nombreLista : nombrePlural/.test(pantallaEC));
check('320) la sección de conexiones también', /titulo: t\('econtact\.yours', \{ lista: nombrePlural \}\)/.test(pantallaEC));
check('321) y el confirmar de eliminar', /t\('econtact\.removeTitle', \{ lista: nombreLista \}\)/.test(pantallaEC));
/*
 * Y NUNCA se escribe "ËContact" a pelo donde tendría que salir del hueco. Hoy
 * el nombre es el mismo en las dos caras, así que un literal no se vería raro
 * —y por eso hay que seguir cazándolo—: el día que cambie, cambia en un sitio.
 *
 * Ya no hay excepción: la frase del perfil sin agenda era la última que lo
 * nombraba a pelo y desde que está en el diccionario también lo recibe.
 */
check('322) no queda ningún ËContact literal en los textos de la pantalla', !/ËContacts?['"`>]/.test(sinComentarios(pantallaEC)));
check('323) el nombre sale del hook', /nombreLista,\s*\n\s*nombrePlural,/.test(codigoPantalla));

// ─── C y D · El contador es el de la identidad activa ────────────────────────

/*
 * Se EJECUTA con dos agendas de la misma cuenta. Es el caso que importa: si el
 * total saliera de la cuenta y no de la identidad, aquí saldría 2 y 2 en vez de
 * 1 y 1.
 */
{
  const { db, engine } = montar([]);
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: BETO });
  await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA });
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: WEE_ANA, haciaIdentidad: CARO });
  await engine.accept({ cuentaDeLaSesion: CARO, comoIdentidad: CARO, otraIdentidad: WEE_ANA });

  check('324) el Perfil Real cuenta solo lo suyo', listaDe(db, ANA).total === 1 && listaDe(db, ANA).contactos.join() === BETO);
  check('325) el Perfil Weë cuenta solo lo suyo', listaDe(db, WEE_ANA).total === 1 && listaDe(db, WEE_ANA).contactos.join() === CARO);
  check('326) y ninguno ve al contacto del otro', !listaDe(db, ANA).contactos.includes(CARO) && !listaDe(db, WEE_ANA).contactos.includes(BETO));
  check('327) la cuenta NO tiene un total propio que los sume', listaDe(db, ANA).total + listaDe(db, WEE_ANA).total === 2 && listaDe(db, ANA).total === 1);
}
check('328) el contador de la pantalla es el de la identidad', /total: contactos\.length/.test(codigoGancho));
check('329) y el perfil propio pinta ese mismo', /\{misEcontacts\.nombrePlural\}/.test(read('screens/ProfileScreen.tsx')) && /misEcontacts\.total/.test(sinComentarios(read('screens/ProfileScreen.tsx'))));
check('330) sin usar followers ni following para las listas', !/followers|following/i.test(codigoGancho + codigoServicio));
check('331) ni un contador denormalizado nuevo', !/econtactsCount|contactsCount/.test(codigoGancho + codigoServicio + codigoPantalla));

// ─── E, F, G, H · Los cuatro cruces, vistos desde la pantalla ────────────────

/*
 * Lo mismo que en el bloque T, pero mirando lo que ACABA EN LA FILA: con quién
 * está conectada cada identidad y con qué etiqueta se pinta. Es lo que separa
 * "hay una relación" de "la pantalla la enseña bien".
 */
for (const c of CRUCES) {
  const { db, engine } = montar([]);
  await engine.request({ cuentaDeLaSesion: c.cuentaDe, desdeIdentidad: c.de, haciaIdentidad: c.para });
  await engine.accept({ cuentaDeLaSesion: c.cuentaPara, comoIdentidad: c.para, otraIdentidad: c.de });

  const vistaDe = listaDe(db, c.de);
  const vistaPara = listaDe(db, c.para);
  check(`332·${c.n}) ${c.nombre}: cada lado ve al otro en su lista`, vistaDe.contactos.join() === c.para && vistaPara.contactos.join() === c.de);
  check(`333·${c.n}) ${c.nombre}: con la etiqueta correcta de esa identidad`, nombreDeIdentidad(c.para) === (tipoDeIdentidad(c.para) === 'wee' ? 'Perfil Weë' : 'Perfil real'));
  check(`334·${c.n}) ${c.nombre}: y cada título es el de su cara`,
    nombreDeLista(c.de) === (c.de.startsWith('hidi_') ? 'ẄContact' : 'ËContact')
    && nombreDeLista(c.para) === (c.para.startsWith('hidi_') ? 'ẄContact' : 'ËContact'));
}

// ─── I · Cambiar de perfil no mezcla ─────────────────────────────────────────

{
  const { db, engine } = montar([]);
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: BETO });
  await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA });
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: WEE_ANA, haciaIdentidad: WEE_BETO });
  await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: WEE_BETO, otraIdentidad: WEE_ANA });

  const antes = JSON.stringify(relacionesDe(db));
  const conReal = listaDe(db, ANA);
  const conWee = listaDe(db, WEE_ANA);
  check('335) cambiar de perfil no toca ningún documento', JSON.stringify(relacionesDe(db)) === antes);
  check('336) el Perfil Real ve una lista', conReal.contactos.join() === BETO && conReal.total === 1);
  check('337) el Perfil Weë ve otra', conWee.contactos.join() === WEE_BETO && conWee.total === 1);
  check('338) y no comparten ni un elemento', conReal.contactos.every((x) => !conWee.contactos.includes(x)));
  /* El título ya no cambia; lo que cambia —y es lo que importaba— es la lista. */
  check('339) cambian las dos cosas: el título con el perfil y la lista con la identidad',
    nombreDeLista(ANA) !== nombreDeLista(WEE_ANA) && conReal.contactos.join() !== conWee.contactos.join());
}
/*
 * Y no hay ningún estado global de "mis contactos de la cuenta": la agenda se
 * pide SIEMPRE con la identidad activa, y esa es la única clave que existe.
 */
check('340) la agenda se pide con la identidad, nunca con la cuenta', /econtactService\.resumen\(identidad\)/.test(codigoGancho) && !/resumen\(user\.uid\)|resumen\(miCuenta/.test(codigoGancho));
check('341) y la identidad activa sale del perfil activo, en un solo sitio', (codigoGancho.match(/userProfile\?\.uid \|\| user\?\.uid/g) || []).length === 1);
check('342) las dos pantallas la piden al mismo hook', /useMisEContacts\(\)/.test(codigoPantalla) && /useMisEContacts\(\)/.test(sinComentarios(read('screens/ProfileScreen.tsx'))));

// ─── J · Eliminar afecta a UNA conexión, no a las de la cuenta ───────────────

/*
 * EL CASO QUE PIDIÓ EXPRESAMENTE.
 *
 * A tiene dos relaciones con B: una entre sus Perfiles Reales y otra desde su
 * Perfil Weë. Al deshacer la del Perfil Weë, la del Real tiene que seguir ahí.
 */
{
  const { db, engine } = montar([]);
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: ANA, haciaIdentidad: BETO });
  await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: ANA });
  await engine.request({ cuentaDeLaSesion: ANA, desdeIdentidad: WEE_ANA, haciaIdentidad: BETO });
  await engine.accept({ cuentaDeLaSesion: BETO, comoIdentidad: BETO, otraIdentidad: WEE_ANA });

  check('343) las dos relaciones existen a la vez', relacionesDe(db).length === 2);
  check('344) y B las ve las dos en su ËContact', listaDe(db, BETO).total === 2);

  // Eliminar es un borrado del cliente: se borra el documento de ESA pareja.
  const idWee = idServidor(WEE_ANA, BETO);
  const idReal = idServidor(ANA, BETO);
  db.docs.delete(`econtacts/${idWee}`);

  check('345) al eliminar desde el Perfil Weë, esa conexión desaparece', !db.docs.has(`econtacts/${idWee}`));
  check('346) y la del Perfil Real sigue INTACTA', db.docs.has(`econtacts/${idReal}`) && db.leer(`econtacts/${idReal}`).status === 'accepted');
  check('347) el Perfil Real de A sigue conectado con B', listaDe(db, ANA).contactos.join() === BETO);
  check('348) el Perfil Weë de A ya no', listaDe(db, WEE_ANA).total === 0);
  check('349) y B pasa de dos a una', listaDe(db, BETO).total === 1 && listaDe(db, BETO).contactos.join() === ANA);
}
check('350) el servicio borra la pareja de esas dos identidades', /deleteDoc\(refDe\(yo, otra\)\)/.test(codigoServicio));
check('351) y pregunta antes de eliminar', /preguntar\(\s*t\('econtact\.removeTitle', \{ lista: nombreLista \}\)/.test(codigoPantalla));

// ─── K y L · Las solicitudes dicen qué identidad las hizo ────────────────────

check('352) una fila enseña con qué cara está esa persona', /etiqueta: nombreDeIdentidad\(id\)/.test(codigoGancho));
check('353) y la pantalla la pinta', /\{detalle\}/.test(codigoPantalla) && /const detalle = seccion === 'recibidas'/.test(codigoPantalla));
check('354) en las recibidas, además, qué está pidiendo',
  /t\('econtact\.wantsToConnect', \{ lista: etiqueta \}\)/.test(pantallaEC)
  && /quiere conectar contigo/.test(read('i18n/textos/es/econtact.ts')));
check('355) la etiqueta es "Perfil real" o "Perfil Weë", nunca otra cosa', nombreDeIdentidad(ANA) === 'Perfil real' && nombreDeIdentidad(WEE_ANA) === 'Perfil Weë');
check('356) la identidad emisora de una recibida es quien la pidió', (() => {
  const doc = { users: [WEE_ANA, BETO].sort(), status: 'pending', requestedBy: WEE_ANA, requestedTo: BETO };
  return solicitudesRecibidas([doc], BETO).map((d) => d.requestedBy).join() === WEE_ANA;
})());
check('357) y la de una enviada, a quién se la pidió', (() => {
  const doc = { users: [WEE_ANA, BETO].sort(), status: 'pending', requestedBy: WEE_ANA, requestedTo: BETO };
  return solicitudesEnviadas([doc], WEE_ANA).map((d) => d.requestedTo).join() === BETO;
})());

// ─── M y N · Nunca se enseña un uid ──────────────────────────────────────────

/*
 * Ni el uid, ni el prefijo, ni nada que se parezca a un identificador. El uid
 * está en el código —es la clave de la fila y con lo que se abre el perfil—,
 * pero no se PINTA: lo que se ve es nombre, avatar y "Perfil real"/"Perfil Weë".
 */
{
  /* Sobre el código SIN comentarios: un comentario que nombre la identidad no se pinta. */
  const pintado = [
    ...[...codigoPantalla.matchAll(/>\s*\{([^}]+)\}\s*</g)].map((m) => m[1]),
    ...[...codigoPantalla.matchAll(/<Text[^>]*>([^<]*)</g)].map((m) => m[1]),
  ].join(' | ');
  /* Control: si se pintara `{identidad}` o `{persona.identidad}`, esto lo vería. */
  check('357b) la comprobación detecta un uid pintado si lo hubiera', /\buid\b|identidad/.test('<Text>{persona.identidad}</Text>'.match(/>\s*\{([^}]+)\}\s*</)[1]));
  check('358) no se pinta ningún uid ni identidad cruda', !/\buid\b|identidad/.test(pintado), pintado.slice(0, 200));
  check('359) ni aparece hidi_ en ningún texto de la pantalla', !/hidi_/.test(pantallaEC));
  check('360) ni HidetoK ni Hidi como vocabulario', !/hidetok/i.test(pantallaEC) && !/\bHidi\b/.test(pantallaEC));
  check('361) lo que se pinta es el nombre y la etiqueta', /\{nombre\}/.test(codigoPantalla) && /\{detalle\}/.test(codigoPantalla));
}

// ─── O · Biz no entra ────────────────────────────────────────────────────────

check('362) un Perfil Biz no es una identidad de agenda', !esIdentidadDePersona(`${PREFIJO_PERFIL_BIZ}n1`));
check('363) el hook lo detecta y lo dice', /perfil-sin-agenda/.test(codigoGancho) && /esIdentidadDePersona\(activo\)/.test(codigoGancho));
check('364) la pantalla enseña un estado propio para eso',
  /t\('econtact\.noAgenda'\)/.test(pantallaEC) && /noAgenda: 'Este perfil no tiene agenda'/.test(read('i18n/textos/es/econtact.ts')));
check('365) y no cae en la lista de la cuenta', /if \(!user\) return vacia\('sin-sesion'\);/.test(codigoGancho) && !/return user\.uid;/.test(codigoGancho.slice(codigoGancho.indexOf('perfil-sin-agenda'))));
check('366) businessFollows no se toca desde aquí', !/businessFollows/.test(codigoPantalla + codigoGancho + codigoServicio));
check('367) y el perfil de negocio sigue con su propio seguir', /isFollowing \? 'Siguiendo' : 'Seguir'/.test(read('screens/WeeBizProfileScreen.tsx')));

// ─── P · Nada de follows para estas listas ───────────────────────────────────

check('368) el hook no toca followsService ni useFollow', !/followsService|useFollow/.test(codigoGancho));
check('369) la pantalla tampoco', !/followsService|useFollow|toggleFollow/.test(codigoPantalla));
check('370) ni se leen followers/following para el contador', !/followersCount|followingCount/.test(codigoGancho + codigoPantalla + codigoServicio));
check('371) followsService sigue existiendo, intacto', read('services/followsService.ts').includes("collection(db, 'follows')"));
check('372) y useFollow también', read('hooks/useFollow.ts').includes('followsService'));

// ─── Q · Aceptar sigue siendo solo la callable ───────────────────────────────

check('373) aceptar pasa por acceptEContact y por nada más', /llamar\('acceptEContact', \{ asIdentity: yo, otherIdentity: otra \}\)/.test(codigoServicio));
check('374) hay UNA sola ruta de aceptación en el servicio', (codigoServicio.match(/acceptEContact/g) || []).length === 2);
check('375) la pantalla no la reimplementa', !/acceptEContact|httpsCallable/.test(codigoPantalla));
check('376) ni el hook', !/acceptEContact|httpsCallable/.test(codigoGancho));
check('377) y las reglas siguen prohibiendo cualquier update', /allow update: if false;/.test(bloque));

// ─── El hook centraliza la identidad, la pantalla no la maneja ───────────────

check('378) la pantalla no resuelve prefijos ni deduce cuentas', !/hidi_|linkedAccountId|accountUid|cuentaDeIdentidad/.test(codigoPantalla));
check('379) ni calcula el id de una pareja', !/idDeContacto|contactId/.test(codigoPantalla));
check('380) ni consulta Firestore por su cuenta', !/collection\(db|getDocs|getDoc\(/.test(codigoPantalla));
check('381) los perfiles los trae el hook, por tandas y no de uno en uno', /getManyByUids/.test(codigoGancho) && !/getByUid\(/.test(codigoGancho));
check('382) y esa consulta va por tandas de 30, sin índices nuevos', /i \+= 30/.test(sinComentarios(read('services/firestoreService.ts'))) && !/econtact/i.test(read('firestore.indexes.json')));

// ─── Diseño: lo táctil y lo que no debe estar ────────────────────────────────

check('383) objetivos táctiles sin scale()', /minHeight: 64,/.test(codigoPantalla) && /width: 44,/.test(codigoPantalla) && /height: 44,/.test(codigoPantalla));
check('384) sin barra lateral dentro de la pantalla', !/Sidebar|RightSidebar/.test(codigoPantalla));
check('385) sin chat, grupos, recomendaciones ni contactos del teléfono', !/Conversation|messagesService|grupo|recomend|marketplace|expo-contacts|Contacts\.get/i.test(codigoPantalla));
check('386) sin etiquetado de contactos en publicaciones', !/tag|etiquetar|mention/i.test(codigoPantalla));
check('387) el compositor menciona ËContacts sin convertirlos en seguidores', /setShowEContacts/.test(read('screens/CreateScreen.tsx')) && !/followsService|useFollow/.test(read('screens/CreateScreen.tsx')));


// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── V) "No hay relación" es una respuesta, no un error ──');
// ═════════════════════════════════════════════════════════════════════════════
/*
 * LO QUE DESTAPÓ EL E2E DE PRODUCCIÓN.
 *
 * La regla de lectura es `resource.data.users.hasAny(misIdentidades())`. Si el
 * documento NO existe, `resource` es null, la regla no se puede evaluar y
 * Firestore deniega. Es lo correcto —de algo que no existe no se puede demostrar
 * que sea tuyo— pero llega como `permission-denied`, y esa es la respuesta normal
 * a "¿estoy conectada con esta persona?" para casi todo el mundo.
 *
 * Antes, abrir el perfil de alguien con quien no tienes relación lanzaba una
 * excepción que la pantalla capturaba para enseñar lo correcto: funcionaba por el
 * `catch`, no por la respuesta. Ahora el servicio la traduce.
 *
 * ESTO NO SE LEE, SE EJECUTA. Se saca del fichero el texto REAL de las funciones
 * y se corre con dependencias de mentira. No es una reimplementación: si alguien
 * cambia el servicio, cambia lo que se ejecuta aquí.
 */
{
  const trozo = (patron) => {
    const m = servicio.match(patron);
    if (!m) throw new Error('no se pudo extraer del servicio: ' + patron);
    return m[0];
  };
  const fuenteLeerDoc = trozo(/const leerDoc = async \(a: string[\s\S]*?\n\};/);
  const fuenteEstadoCon = trozo(/ {2}estadoCon: async \([\s\S]*?\n {2}\},/);
  const fuenteRechazar = trozo(/ {2}rechazarSolicitud: async \([\s\S]*?\n {2}\},/);
  const fuenteCancelar = trozo(/ {2}cancelarSolicitud: async \([\s\S]*?\n {2}\},/);
  const fuenteEliminar = trozo(/ {2}eliminarContacto: async \([\s\S]*?\n {2}\},/);

  const moduloTs = `
export const fabricarLeerDoc = (getDoc, refDe) => {
${fuenteLeerDoc}
  return leerDoc;
};
export const fabricarAcciones = (d) => {
  const { esMia, esIdentidadDePersona, estadoEntre, leerDoc,
          exigirIdentidadPropia, exigirIdentidadAjena,
          puedeAceptar, puedeCancelar, puedeEliminar, deleteDoc, refDe } = d;
  const s = {
${fuenteEstadoCon}
${fuenteRechazar}
${fuenteCancelar}
${fuenteEliminar}
  };
  return s;
};
`;
  const js = ts.transpileModule(moduloTs, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const real = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  const denegado = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
  const caido = () => Object.assign(new Error('backend unavailable'), { code: 'unavailable' });
  const refFalsa = (a, b) => `econtacts/${idDeContacto(a, b)}`;
  const RELACION = { users: [ANA, BETO].sort(), status: 'pending', requestedBy: ANA, requestedTo: BETO };

  // ─── A · Relación inexistente → null ──────────────────────────────────────
  {
    /* Como lo devuelve Firestore de verdad cuando el documento no está. */
    const leerDoc = real.fabricarLeerDoc(async () => { throw denegado(); }, refFalsa);
    const r = await leerDoc(ANA, BETO);
    check('388) sin relación, leerDoc devuelve null en vez de lanzar', r === null, String(r));

    /*
     * CONTROL. Sin esto, la comprobación de arriba no demuestra nada: podría
     * estar pasando porque el `getDoc` de mentira no lanza de verdad. Aquí va la
     * versión ANTERIOR, sin traducir, con exactamente el mismo error.
     */
    const comoEraAntes = async (getDoc, refDe) => {
      const snap = await getDoc(refDe(ANA, BETO));
      return snap.exists() ? snap.data() : null;
    };
    let lanzoLaVieja = false;
    try { await comoEraAntes(async () => { throw denegado(); }, refFalsa); } catch (e) { lanzoLaVieja = e?.code === 'permission-denied'; }
    check('388b) CONTROL: la versión anterior sí lanzaba con ese mismo error', lanzoLaVieja);
  }
  {
    /* Y el caso trivial: el documento se leyó pero no existe. */
    const leerDoc = real.fabricarLeerDoc(async () => ({ exists: () => false }), refFalsa);
    check('389) y si simplemente no existe, también null', (await leerDoc(ANA, BETO)) === null);
  }

  // ─── B · Relación existente → la relación ─────────────────────────────────
  {
    const leerDoc = real.fabricarLeerDoc(async () => ({ exists: () => true, data: () => RELACION }), refFalsa);
    const r = await leerDoc(ANA, BETO);
    check('390) con relación, leerDoc la devuelve entera', JSON.stringify(r) === JSON.stringify(RELACION));
  }

  // ─── El `catch` no tapa nada más ──────────────────────────────────────────
  /*
   * Solo se traduce `permission-denied`, y solo puede significar "no está":
   * la ruta la calcula `idDeContacto` con una identidad tuya, así que si el
   * documento existiera, la regla lo dejaría leer. Cualquier otro error sube.
   */
  {
    const leerDoc = real.fabricarLeerDoc(async () => { throw caido(); }, refFalsa);
    let subio = false;
    try { await leerDoc(ANA, BETO); } catch (e) { subio = e?.code === 'unavailable'; }
    check('391) un error de verdad NO se traga: se relanza', subio);
  }
  check('392) el servicio solo traduce permission-denied', /=== 'permission-denied'\) return null;/.test(codigoServicio));
  check('393) y relanza lo demás', /throw error;/.test(codigoServicio));
  check('394) la ruta la calcula idDeContacto, siempre con una identidad tuya', /doc\(db, COLECCION, idDeContacto\(a, b\)\)/.test(codigoServicio));

  // ─── D y E · estadoCon responde sin excepción ─────────────────────────────
  const dependencias = (leerDoc) => ({
    esMia: (i) => i === ANA || i === WEE_ANA,
    esIdentidadDePersona,
    estadoEntre,
    leerDoc,
    exigirIdentidadPropia: (i) => { if (!(i === ANA || i === WEE_ANA)) throw new Error('Ese perfil no es tuyo.'); return i; },
    exigirIdentidadAjena: (i) => { if (!esIdentidadDePersona(i)) throw new Error('Ese perfil no puede tener ËContacts.'); return i; },
    puedeAceptar, puedeCancelar, puedeEliminar,
    deleteDoc: async () => { throw new Error('no debería llegar a borrar'); },
    refDe: refFalsa,
  });

  {
    const leerDoc = real.fabricarLeerDoc(async () => { throw denegado(); }, refFalsa);
    const s = real.fabricarAcciones(dependencias(leerDoc));
    let lanzo = false;
    let estado;
    try { estado = await s.estadoCon(ANA, BETO); } catch { lanzo = true; }
    check('395) estadoCon NO lanza cuando no hay relación', !lanzo);
    check('396) y responde "ninguno", que es la verdad', estado === 'ninguno', String(estado));
  }
  {
    const leerDoc = real.fabricarLeerDoc(async () => ({ exists: () => true, data: () => RELACION }), refFalsa);
    const s = real.fabricarAcciones(dependencias(leerDoc));
    check('397) y con relación sigue diciendo lo que hay', (await s.estadoCon(BETO, ANA)) === 'ninguno');
    const sMio = real.fabricarAcciones({ ...dependencias(leerDoc), esMia: (i) => i === BETO });
    check('398) desde el lado que la recibió, "pendiente-recibida"', (await sMio.estadoCon(BETO, ANA)) === 'pendiente-recibida');
  }
  /*
   * Y la pantalla ya no depende de capturar una excepción como flujo normal: el
   * `catch` del gancho sigue ahí como red de seguridad, pero el camino bueno
   * ahora devuelve, no lanza. Se comprueba que el gancho no lo NECESITA: lo que
   * decide qué se ve es `disponible` y el estado devuelto.
   */
  check('399) el gancho sigue teniendo su red, pero ya no es el mecanismo', /catch \{\s*setEstado\('ninguno'\);/.test(sinComentarios(read('hooks/useEContact.ts'))));

  // ─── F · Las tres salidas, sobre una relación que no existe ───────────────
  {
    const leerDoc = real.fabricarLeerDoc(async () => { throw denegado(); }, refFalsa);
    const s = real.fabricarAcciones(dependencias(leerDoc));
    const mensajeDe = async (fn) => {
      try { await fn(); return '(no lanzó)'; } catch (e) { return e?.message || ''; }
    };
    check('400) rechazar algo que no existe da un mensaje claro, no un error de permisos',
      (await mensajeDe(() => s.rechazarSolicitud(ANA, BETO))) === 'No hay ninguna solicitud tuya que rechazar.');
    check('401) cancelar, igual',
      (await mensajeDe(() => s.cancelarSolicitud(ANA, BETO))) === 'No tienes ninguna solicitud pendiente con este perfil.');
    check('402) eliminar, igual',
      (await mensajeDe(() => s.eliminarContacto(ANA, BETO))) === 'No estáis conectados.');
    check('403) y ninguna dice "permission" ni "insufficient"',
      ![
        await mensajeDe(() => s.rechazarSolicitud(ANA, BETO)),
        await mensajeDe(() => s.cancelarSolicitud(ANA, BETO)),
        await mensajeDe(() => s.eliminarContacto(ANA, BETO)),
      ].some((m) => /permission|insufficient/i.test(m)));
  }
  /* Y una identidad ajena sigue rechazándose antes de tocar nada. */
  {
    const leerDoc = real.fabricarLeerDoc(async () => { throw new Error('no debería leerse'); }, refFalsa);
    const s = real.fabricarAcciones(dependencias(leerDoc));
    let mensaje = '';
    try { await s.rechazarSolicitud(BETO, ANA); } catch (e) { mensaje = e.message; }
    check('404) con una identidad que no es tuya, se para antes de leer', mensaje === 'Ese perfil no es tuyo.', mensaje);
  }

  // ─── C y G · Las reglas no se han tocado ──────────────────────────────────
  /*
   * La corrección es del cliente. Si esto cambiara, se habría "arreglado" el
   * síntoma abriendo la lectura, que es justo lo que no se puede hacer.
   */
  check('405) la regla de lectura sigue siendo exactamente la misma',
    /allow read: if isAuthenticated\(\) && participo\(\);/.test(bloque));
  check('406) participo() sigue exigiendo que una identidad TUYA esté en la relación',
    /return resource\.data\.users\.hasAny\(misIdentidades\(\)\);/.test(bloque));
  check('407) no se ha añadido ninguna excepción para documentos inexistentes',
    !/resource == null|resource != null|resource\s*==\s*null/.test(bloque));
  check('408) crear y actualizar siguen cerrados al cliente',
    /allow create: if false;/.test(bloque) && /allow update: if false;/.test(bloque));
  check('409) y borrar sigue siendo solo de quien participa',
    /allow delete: if isAuthenticated\(\) && participo\(\)/.test(bloque));
  check('410) el servicio no toca las reglas ni las rodea', !/firestore\.rules/.test(codigoServicio));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log(failures === 0 ? '\n✅ ËContact — identidades de perfil: todo en orden' : `\n❌ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
