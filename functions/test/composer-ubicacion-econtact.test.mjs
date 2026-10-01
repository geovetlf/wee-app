/*
 * UBICACIÓN Y ËCONTACT, DENTRO DEL COMPOSITOR.
 *
 * Dos botones que estaban muertos y ahora hacen algo. Cada uno toca una cosa
 * delicada, y son delicadas por motivos distintos:
 *
 *  · la UBICACIÓN sale del GPS. Lo único que puede acabar en un documento
 *    público es la forma que devuelve `aPublica()` —zona, radio y precisión—, y
 *    eso no se vigila leyendo el compositor: se vigila ejecutando la función y
 *    mirando qué trae y qué NO trae lo que sale de ella;
 *  · ËCONTACT es una red de relaciones simétricas que vive en su colección y solo
 *    escriben sus callables. Mencionar a alguien en una publicación ETIQUETA, y
 *    no puede convertirse por la puerta de atrás en seguir, solicitar ni aceptar.
 *
 * La parte de dominio se EJECUTA de verdad —sin red, sin Firestore, sin permisos
 * del sistema y sin tocar un solo dato—; de la pantalla se lee el código, que es
 * lo único comprobable sin abrir la aplicación. Cada grupo lleva un control para
 * que un verde no pueda ser un verde vacío.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { comoSeLee } from './i18n-ayuda.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
/*
 * El fuente se lee ya RESUELTO: cada `t('modulo.clave')` sale como la frase que
 * le pone el diccionario español. Lo que se comprueba aquí sigue siendo lo que
 * se comprobaba —las palabras que ve la persona—, y de paso queda comprobado
 * que la clave existe y que dice lo que tiene que decir.
 */
const leer = (p) => comoSeLee(fs.readFileSync(path.resolve(here, '../../' + p), 'utf8'));
/* Para EJECUTAR se compila el fuente original: el traductor va dentro. */
const leerCrudo = (p) => (fs.readFileSync(path.resolve(here, '../../' + p), 'utf8'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const aModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const transpilar = (ruta) =>
  ts.transpileModule(leerCrudo(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;

const crear = leer('screens/CreateScreen.tsx');
const ubic = leer('screens/AgregarUbicacionScreen.tsx');
const selector = leer('components/SelectorDeEContacts.tsx');
/* Sin comentarios: una explicación escrita al lado no puede aprobar una prueba
   por su cuenta, ni suspenderla por nombrar aquello de lo que habla. */
const soloCodigo = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const selectorCodigo = soloCodigo(selector);

/*
 * El catálogo, ejecutable: se le meten dentro sus dos dependencias y se le da el
 * mundo ya cargado, que es lo mismo que hace la aplicación. Igual que en
 * `location.test.mjs`, para que las dos lo carguen de la misma manera.
 */
const cargarLugares = async () => {
  const fuente = leer('data/places.ts')
    .replace("import { COUNTRIES, Country } from './countries';", leer('data/countries.ts').replace(/export /g, ''))
    .replace("import { CITIES, City } from './cities';", leer('data/cities.ts').replace(/export /g, ''))
    .replace("import { CIUDADES_POR_IDIOMA } from './ciudadesPorIdioma';", leer('data/ciudadesPorIdioma.ts').replace(/export /g, ''))
    .replace("require('./citiesWorld') as { WORLD_PLACES: string }", '{ WORLD_PLACES: "" }');
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};
const lugares = await cargarLugares();

/* `locationPrivacy` solo importa un tipo; fuera, y el módulo queda autónomo. */
const privacidad = await import(aModulo(transpilar('utils/locationPrivacy.ts').replace(/^\s*import[^;]*;\s*$/gm, '')));
const modelo = await import(aModulo(transpilar('utils/econtactModel.ts')));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── A. Lo que sale del GPS no sale de aquí ───');

/* Una lectura como la que devuelve el aparato, con todos sus decimales. */
const lectura = { latitude: -12.046374, longitude: -77.042793, radioMetros: 65, precision: 'aproximada' };
const publica = privacidad.aPublica(lectura);

check(
  'la forma pública trae exactamente zona, radio y precisión',
  JSON.stringify(Object.keys(publica).sort()) === JSON.stringify(['precision', 'radioKm', 'zona']),
  Object.keys(publica).join(', ')
);

const serializada = JSON.stringify(publica);
check(
  'y no lleva latitud, longitud, radio en metros ni nada parecido',
  !/latitude|longitude|radioMetros|geohash|GeoPoint|accuracy/i.test(serializada),
  serializada
);
check(
  'ni la coordenada se cuela dentro de un valor',
  !serializada.includes('-12.046374') && !serializada.includes('-77.042793'),
  serializada
);

/* La celda redondea: dos sitios distintos del mismo barrio dan la misma zona. */
const vecina = privacidad.aPublica({ ...lectura, latitude: -12.0461, longitude: -77.0429 });
check('dos lecturas cercanas caen en la misma zona', publica.zona === vecina.zona, `${publica.zona} vs ${vecina.zona}`);
check('la zona abarca kilómetros, no metros', publica.radioKm >= 10, String(publica.radioKm));

/* CONTROL: si la conversión devolviera la lectura tal cual, esto lo caza. */
check(
  'CONTROL: la prueba distingue una lectura cruda de una forma pública',
  /latitude/.test(JSON.stringify(lectura)) && !/latitude/.test(serializada),
  'si no distinguiera, el grupo entero sería decorativo'
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── B. La ubicación: el compositor y su pantalla ───');

check('el botón Ubicación sigue existiendo', /texto="Ubicación"/.test(crear));
check(
  'y se enciende cuando ya hay lugar o zona',
  /activa=\{!!place \|\| !!ubicacion\}/.test(crear)
);
check('lleva a la pantalla de ubicación', /navigate\('AgregarUbicacion'/.test(crear));

/* ── La ubicación es contexto, no una tarea ── */
check(
  'NO hay ningún botón de "usar mi ubicación"',
  !/Usar mi ubicación/.test(ubic),
  'compartir dónde estás no debe ocupar media pantalla'
);
check('ni el texto "Solo la zona, nunca el punto exacto"', !/Solo la zona/.test(ubic));
check('ni el lema "Cuenta desde dónde…"', !/Cuenta desde dónde/.test(ubic));

check(
  'si Weë YA tiene permiso, se usa sin que nadie pulse nada',
  /disponible/.test(ubic) && /refrescar\(\)/.test(ubic) && /setUbicacion\(aPublica\(/.test(ubic)
);
check(
  'ABRIR la pantalla no pide permiso: eso sigue viviendo en Configuración',
  !/activar\(/.test(ubic) && /ubicacion\.activar\('aproximada'\)/.test(leer('screens/SettingsScreen.tsx')),
  'una pantalla que se abre no puede convertirse en una petición de permiso'
);
check(
  'la pantalla no habla con expo-location ni con el navegador por su cuenta',
  !/expo-location|navigator\.geolocation|requestForegroundPermissions/.test(ubic),
  'sería una segunda implementación de ubicación'
);
check(
  'nunca se pide precisión, en ningún sitio de este flujo',
  !/'precisa'/.test(ubic) && !/'precisa'/.test(crear)
);
check(
  'sin permiso la pantalla sigue entera: buscador y lugares del país',
  /buscarLugares\(/.test(ubic) && /lugaresDelPais\(/.test(ubic),
  'no se bloquea ni se queda en blanco'
);

check(
  'se puede quitar la zona, y el lugar, por separado',
  /Quitar mi ubicación/.test(crear) && /setUbicacion\(undefined\)/.test(crear) &&
  /Quitar el lugar/.test(crear) && /setPlace\(undefined\)/.test(crear)
);

check(
  'lo que viaja al documento es `ubicacion`, y solo si la hay',
  /\.\.\.\(ubicacion \? \{ ubicacion \} : \{\}\)/.test(crear)
);
check(
  'ninguna de las dos guarda una coordenada en su estado',
  !/setLatitud|setLongitud|latitude:|longitude:/.test(crear) && !/setLatitud|setLongitud|latitude:|longitude:/.test(ubic),
  'la lectura muere en aPublica()'
);

/* CONTROL: la publicación nunca depende de la ubicación. */
check(
  'CONTROL: publicar no exige ubicación',
  !/canPublish[^\n]*ubicacion/.test(crear),
  'si entrara en canPublish, denegar el permiso impediría publicar'
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── C. Identidades y contactos aceptados ───');

const REAL = 'abc123';
const WEE = 'hidi_abc123';
/* Un id que ya no designa ninguna identidad: el Perfil Biz se eliminó. */
const DESCONOCIDA = 'biz_tienda';
const OTRA = 'xyz789';

/*
 * Cada cara tiene su agenda y su NOMBRE (decisión del usuario, 2026-09-17). Son
 * dos nombres de producto distintos, no dos grafías del mismo, y esta prueba
 * afirmaba justo lo contrario hasta hoy: decía que la agenda se llamaba igual
 * en las dos. Se queda como está para que nadie vuelva a unificarlos sin verlo.
 */
check('el Perfil Real tiene ËContact', modelo.nombreDeLista(REAL) === 'ËContact');
check('y el Perfil Weë tiene ẄContact: son DOS nombres, no uno',
  modelo.nombreDeLista(WEE) === 'ẄContact');
check('y no se confunden: la Ë es del Real y la Ẅ es del Weë',
  modelo.nombreDeLista(REAL) !== modelo.nombreDeLista(WEE)
  && modelo.nombreDeLista(REAL).startsWith('Ë') && modelo.nombreDeLista(WEE).startsWith('Ẅ'));
/* Lo que no es ninguna de las dos caras cae en el nombre neutro, que es el del Real. */
check('un id que no es ninguna identidad cae en el nombre neutro',
  modelo.nombreDeLista(DESCONOCIDA) === 'ËContact');
/* Se llamaba BIZ y se renombró arriba al quitar el Perfil Biz; la línea se quedó apuntando al nombre viejo y tumbaba la cadena entera de pruebas (ReferenceError), dejando sin correr las 50 siguientes. */
check('un id biz_ que ya no designa a nadie no es una identidad de persona', !modelo.esIdentidadDePersona(DESCONOCIDA));
check('y las dos caras de una persona sí lo son', modelo.esIdentidadDePersona(REAL) && modelo.esIdentidadDePersona(WEE));

/* Una agenda de mentira, con lo aceptado y lo que solo está pedido. */
const docs = [
  { users: [OTRA, REAL], status: 'accepted', requestedBy: REAL, requestedTo: OTRA },
  { users: [REAL, 'pendiente1'], status: 'pending', requestedBy: REAL, requestedTo: 'pendiente1' },
  { users: ['pendiente2', REAL], status: 'pending', requestedBy: 'pendiente2', requestedTo: REAL },
];

const aceptados = modelo.contactosDe(docs, REAL);
check('solo cuenta lo aceptado', aceptados.length === 1, `${aceptados.length} de ${docs.length}`);
check('una solicitud enviada no es un contacto', modelo.solicitudesEnviadas(docs, REAL).length === 1);
check('una recibida tampoco', modelo.solicitudesRecibidas(docs, REAL).length === 1);
check(
  'CONTROL: por eso esto no son seguidores',
  modelo.contarContactos(docs, REAL) === 1 && docs.length === 3,
  'si contara las pendientes, sería un contador de seguidores'
);

/* La relación es simétrica: el id de la pareja no depende del orden. */
check(
  'la relación es simétrica',
  modelo.idDeContacto(REAL, OTRA) === modelo.idDeContacto(OTRA, REAL),
  modelo.idDeContacto(REAL, OTRA)
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── D. ËContact, en el compositor ───');

const bloque = crear.slice(crear.indexOf('texto="ËContact"'), crear.indexOf('texto="ËContact"') + 280);
check('el botón ya no está apagado', !/apagada/.test(bloque));
check('y abre la agenda', /setShowEContacts/.test(bloque));
check('el botón dice ËContact, el nombre universal', /texto="ËContact"/.test(crear) && !/texto="ẄContact"/.test(crear));

check('la lista sale del sistema que ya existe', /useMisEContacts\(\)/.test(selectorCodigo));
check(
  'y el selector no importa el servicio ni sus acciones',
  !/econtactService|enviarSolicitud|aceptarSolicitud|eliminarContacto/.test(selectorCodigo),
  'aquí no se solicita, ni se acepta, ni se elimina a nadie'
);
check(
  'solo se ofrecen contactos aceptados',
  /const \{ contactos/.test(selectorCodigo) && !/recibidas|enviadas/.test(selectorCodigo),
  'las solicitudes pendientes no se pueden mencionar'
);
check(
  'el nombre de la lista lo decide la identidad activa, no la pantalla',
  /nombreLista/.test(selectorCodigo) && !/'ẄContact'|"ẄContact"/.test(selectorCodigo),
  'debe venir del hook'
);

check(
  'se puede marcar y desmarcar',
  /elegidos\.includes\(identidad\)/.test(selectorCodigo) && /filter\(\(i\) => i !== identidad\)/.test(selectorCodigo)
);
check('y quitarlas todas antes de publicar', /setEContacts\(\[\]\)/.test(crear));

check(
  'sin contactos se explica, no se rompe',
  /contactos\.length === 0/.test(selectorCodigo) && /Todavía no tienes/.test(selectorCodigo),
  'el vacío es un estado, no un error'
);
check(
  /* El Perfil Biz ya no existe (decisión del 2026-09-19): el aviso habla de «este perfil», sin nombrar una cara que no hay. */
  'y un perfil sin agenda tiene su propia explicación',
  /hayAgenda/.test(selectorCodigo) && /Este perfil no tiene agenda de ËContact/.test(selector) && !/Perfil Biz/.test(selector)
);
/* El uid vale como clave de lista; lo que NO puede es acabar en pantalla. */
check(
  'nunca se enseña un uid: se enseña el nombre',
  !/<Text[^>]*>\s*\{persona\.identidad\}/.test(selectorCodigo) && /\{persona\.perfil\.displayName\}/.test(selectorCodigo)
);

check(
  'lo que viaja al documento son las identidades elegidas, y solo si hay',
  /\.\.\.\(econtacts\.length > 0 \? \{ econtacts \} : \{\}\)/.test(crear)
);
check(
  'el compositor no escribe en la colección econtacts',
  !/collection\(db, 'econtacts'\)|econtactService/.test(crear),
  'publicar no puede crear una relación'
);

/* CONTROL: el selector es la única fuente de identidades. */
check(
  'CONTROL: no hay forma de teclear una identidad a mano',
  !/setEContacts\(\[[^\]]*['"]/.test(crear),
  'si se pudiera escribir, se podría mencionar a alguien sin conexión'
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── E. Las combinaciones ───');

/*
 * El documento se arma con "…si existe". Se reproduce aquí el mismo patrón con
 * los mismos campos para comprobar que cada combinación sale entera y que las
 * ausentes no dejan un campo vacío detrás.
 */
const armar = ({ texto, ubicacion, econtacts = [], place, poll, destinos = ['general'] }) => ({
  content: texto,
  ...(place ? { place } : {}),
  ...(ubicacion ? { ubicacion } : {}),
  ...(econtacts.length > 0 ? { econtacts } : {}),
  ...(destinos.length > 0 ? { destinations: destinos } : {}),
  ...(poll ? { poll } : {}),
});

const soloTexto = armar({ texto: 'hola' });
check('texto solo: ni ubicación ni menciones', !('ubicacion' in soloTexto) && !('econtacts' in soloTexto));

const conUbicacion = armar({ texto: 'hola', ubicacion: publica });
check('ubicación + texto', conUbicacion.content === 'hola' && conUbicacion.ubicacion.zona === publica.zona);
check('y sigue sin coordenadas', !/latitude|longitude/.test(JSON.stringify(conUbicacion)));

const conContactos = armar({ texto: 'hola', econtacts: [OTRA] });
check('ËContact + texto', conContactos.content === 'hola' && conContactos.econtacts.length === 1);

const conTodo = armar({ texto: 'hola', ubicacion: publica, econtacts: [OTRA, WEE] });
check(
  'ubicación + ËContact + texto, los tres a la vez',
  conTodo.content === 'hola' && !!conTodo.ubicacion && conTodo.econtacts.length === 2
);

/* Lo que ya se podía combinar se sigue pudiendo. */
const comoAntes = armar({ texto: 'hola', place: { kind: 'custom', label: 'Lima' }, poll: { q: 1 }, destinos: ['general', 'travel'] });
check(
  'lugar + encuesta + destinos siguen conviviendo',
  !!comoAntes.place && !!comoAntes.poll && comoAntes.destinations.length === 2
);
const lugarYUbicacion = armar({ texto: 'x', place: { kind: 'custom', label: 'París' }, ubicacion: publica });
check(
  'el lugar del contenido y el del aparato pueden ir juntos',
  lugarYUbicacion.place.label === 'París' && lugarYUbicacion.ubicacion.zona === publica.zona,
  'son dos preguntas distintas'
);

/* CONTROL: el armador no inventa campos. */
check(
  'CONTROL: sin datos no aparece ningún campo de más',
  JSON.stringify(Object.keys(soloTexto).sort()) === JSON.stringify(['content', 'destinations']),
  Object.keys(soloTexto).join(', ')
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── F. La pantalla "Agregar ubicación" ───');

/* ── Estructura ── */
/*
 * Desde la fase 5P la etiqueta y el texto salen de `common.back`, la única de
 * toda la aplicación, y `comoSeLee` la resuelve a la palabra aprobada. Antes
 * esta pantalla decía "Back" en inglés dentro de la interfaz española.
 */
check('cabecera: el volver a la izquierda y el título centrado', /accessibilityLabel="Volver"[\s\S]{0,200}>Volver<\/Text>/.test(ubic) && /Agregar ubicación<\/Text>/.test(ubic) && !/Cancelar/.test(ubic));
check('el título va centrado de verdad, con un hueco igual a cada lado', /<View style={styles.cancelar} \/>/.test(ubic));
check('marca de Weë, y nada más debajo', /weelogo/.test(ubic) && !/styles\.lema/.test(ubic));
check('buscador redondeado con su texto de ayuda', /Buscar un lugar, ciudad o país/.test(ubic) && /borderRadius: BORDER_RADIUS\.full/.test(ubic));
check(
  'el buscador es lo primero después del logo',
  ubic.indexOf('styles.marca') < ubic.indexOf('styles.buscador'),
  'es el elemento principal de la pantalla'
);
check('y una sección de lugares con su "Ver más"', /Ver más/.test(ubic) && /Ver menos/.test(ubic));
/* Tocar un lugar ES elegirlo: no hay paso de confirmar ni banderas que estorben. */
check('sin botón "Listo": tocar un lugar vuelve al compositor', !/accessibilityLabel="Listo"/.test(ubic) && /const elegir = \(opcion: PlaceOption\) => volverCon\(/.test(ubic));
check('sin banderas en los resultados', !/opcion\.flag/.test(soloCodigo(ubic)));

/* ── Ni una imagen de lugar ── */
check(
  'no se descarga ninguna imagen: ni fotos, ni miniaturas, ni mapas',
  !/https?:\/\//.test(ubic) && !/uri:/.test(ubic),
  'un catálogo con foto sería una factura por cada apertura'
);
check(
  'ni se nombra a ningún proveedor de lugares o mapas',
  !/Google ?Places|Mapbox|Foursquare|googleapis|mapbox|openstreetmap/i.test(ubic)
);
check(
  'lo único que se dibuja es el logo, que ya viaja en la app',
  (ubic.match(/<Image/g) || []).length === 1 && /require\('\.\.\/assets\/images\/weelogo/.test(ubic)
);
check('cada lugar se distingue por un icono, no por una foto', /iconoCirculo/.test(ubic) && /Ionicons/.test(ubic));

/* ── Búsqueda: se ejecuta el catálogo de verdad ── */
check('buscar usa el catálogo que Weë ya tenía', /buscarLugares\(/.test(ubic));
check('"peru" encuentra Perú', lugares.buscarLugares('peru').some((o) => o.id === 'PE'));
check('y "lima" encuentra Lima', lugares.buscarLugares('lima').some((o) => o.label === 'Lima'));
check('una letra suelta no dispara nada', lugares.buscarLugares('l').length === 0);
check('la búsqueda no sale del teléfono', !/fetch\(|axios|XMLHttpRequest/.test(ubic));
check('y si el catálogo no lo tiene, valen las palabras de la persona', /lugarPropio\(texto\)/.test(ubic));

/* ── Lugares del país: datos reales, sin distancia inventada ── */
const dePeru = lugares.lugaresDelPais('PE', 6);
check('los lugares de un país salen del catálogo', dePeru.length > 0 && dePeru.every((o) => o.countryCode === 'PE'), `${dePeru.length} de PE`);
check('vienen listos para enseñar, con su país detrás', dePeru.every((o) => !!o.label && !!o.sublabel));
check('sin país no se inventa ninguno', lugares.lugaresDelPais(undefined).length === 0 && lugares.lugaresDelPais(null).length === 0);
check('se respeta el límite que se pide', lugares.lugaresDelPais('PE', 3).length <= 3);
check('un país sin ciudades en el catálogo no rompe', Array.isArray(lugares.lugaresDelPais('ZZ')));
/*
 * CONTROL: el catálogo NO tiene coordenadas, así que no se puede medir ninguna
 * distancia. Escribir "a 1,2 km" al lado de un lugar sería un número que nadie
 * ha medido, y por eso la pantalla no lo escribe.
 */
check(
  'CONTROL: ningún lugar del catálogo trae coordenadas',
  dePeru.every((o) => !('latitude' in o) && !('longitude' in o)),
  JSON.stringify(dePeru[0] || {})
);
check(
  'y por eso la pantalla no finge distancias',
  !/km de distancia|a \d+[.,]?\d* ?km/i.test(soloCodigo(ubic)),
  'no hay con qué calcularlas'
);
/* El país entra por interpolación: el hueco se ve resuelto y el valor, en crudo. */
check('lo que sí dice es de qué país son',
  /Lugares en \{\{pais\}\}/.test(ubic) && /countryName/.test(leerCrudo('screens/AgregarUbicacionScreen.tsx')));

/* ── Selección y vuelta al compositor ── */
check('elegir un lugar del catálogo lo convierte con el helper de siempre', /lugarDelCatalogo\(opcion\)/.test(ubic));
check('la vuelta usa merge, para no remontar el compositor', /merge: true/.test(ubic) && /name: 'Create'/.test(ubic));
check('y lleva un sello distinto en cada vuelta', /selloUbicacion/.test(ubic) && /selloUbicacion/.test(crear));
check(
  'el compositor aplica lo que vuelve: un valor pone, null quita',
  /setPlace\(esLugar\(lugar\) \? lugar : undefined\)/.test(crear) &&
    /setUbicacion\(esZona\(zona\) \? zona : undefined\)/.test(crear)
);
/*
 * En web los parámetros viajan también por la barra de direcciones, y ahí un
 * objeto se vuelve la cadena "[object Object]". Al recargar volvería eso.
 */
check(
  'y comprueba la forma antes de aceptarlo, por si vuelve de la URL',
  /typeof \(v as PostPlace\)\.label === 'string'/.test(crear) &&
    /typeof \(v as UbicacionPublica\)\.zona === 'string'/.test(crear),
  'una recarga no puede dejar un lugar roto pintado'
);
/* Lo que hubiera escrito sigue escrito: la vuelta solo toca lugar y zona. */
const efectoVuelta = crear.slice(crear.indexOf('if (!selloUbicacion) return;'), crear.indexOf('}, [selloUbicacion]);'));
check(
  'la vuelta no toca el texto ni los medios: solo lugar y zona',
  efectoVuelta.length > 0 &&
    !/setPostText|setAttachedMedia|setPoll|setEContacts/.test(efectoVuelta) &&
    /setPlace\(/.test(efectoVuelta) &&
    /setUbicacion\(/.test(efectoVuelta)
);
check('el compositor enseña el lugar elegido como un chip con su aspa', /etiquetaDeLugar\(\{ place \}, locale\)/.test(crear) && /accessibilityLabel="Quitar el lugar"/.test(crear) && !/>Cambiar</.test(crear));
check('el volver vuelve sin tocar nada', /onPress=\{\(\) => navigation\.goBack\(\)\}[\s\S]{0,200}accessibilityLabel="Volver"/.test(ubic));

/* ── Las dos capacidades siguen separadas ── */
check(
  'lugar y zona siguen separados: la pantalla los devuelve por separado',
  /lugarElegido:/.test(ubic) && /ubicacionElegida:/.test(ubic) && /const \[ubicacion, setUbicacion\]/.test(ubic)
);
check(
  'y no guarda el lugar para enseñarlo en una tarjeta: aquí se busca y se elige',
  !/const \[place, setPlace\]/.test(ubic) && !/Lugar de la publicación/.test(ubic)
);
/* Quitar cualquiera de las dos se hace en el compositor, cada una por su lado. */
check(
  'y se pueden quitar una sin la otra, desde el compositor',
  /Quitar el lugar/.test(crear) &&
    /setPlace\(undefined\)/.test(crear) &&
    /Quitar mi ubicación/.test(crear) &&
    /setUbicacion\(undefined\)/.test(crear)
);
check('el teclado del buscador se acomoda con la pieza común', /EspacioDeEscritura/.test(ubic));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── G. El orden del compositor no se movió ───');

const orden = [...crear.matchAll(/texto="([^"]+)"/g)].map((m) => m[1]);
check(
  'Cámara · Multimedia · ËContact · Ubicación · Encuesta · Mis proyectos',
  orden.join(' · ') === 'Cámara · Multimedia · ËContact · Ubicación · Encuesta · Mis proyectos',
  orden.join(' · ')
);
/* El lugar ya no es un panel entre los de abajo: es un chip bajo el texto. El
   panel de ËContact sigue detrás de las acciones, como su botón. */
check(
  'el chip de lugar va bajo el texto y el panel de ËContact tras las acciones',
  crear.indexOf('{renderTextInput()}') < crear.indexOf('{renderLugar()}') &&
    crear.indexOf('{renderLugar()}') < crear.indexOf('{renderAcciones()}') &&
    crear.indexOf('{renderAcciones()}') < crear.indexOf('{renderEContacts()}')
);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─── H. El lugar en el compositor: un chip, no una tarjeta ───');

const desdeChip = crear.indexOf('const renderLugar = () =>');
const chip = crear.slice(desdeChip, crear.indexOf(') : null;', desdeChip));
check('existe el chip', desdeChip > 0 && chip.length > 0);

/* Dónde va: bajo lo que escribes, antes de las acciones, en la publicación. */
check('el chip va justo debajo del campo de texto', crear.indexOf('{renderTextInput()}') < crear.indexOf('{renderLugar()}'));
check('y antes de los botones de acciones', crear.indexOf('{renderLugar()}') < crear.indexOf('{renderAcciones()}'));
check('y antes de la previsualización de medios, como parte del post', crear.indexOf('{renderLugar()}') < crear.indexOf('{renderMediaPreview()}'));

/* Lo que ya no existe. */
check('no existe la tarjeta antigua', !/placeChosen|renderPlace\b/.test(crear));
check('ni "Cambiar" dentro de una tarjeta', !/Cambiar la ubicación|>Cambiar</.test(crear));
check('ni el texto explicativo de privacidad', !/El lugar se verá en tu publicación|No pongas una dirección privada/.test(crear));
check(
  '"Quitar el lugar" es la etiqueta accesible del aspa, no un bloque de texto',
  /accessibilityLabel="Quitar el lugar"/.test(chip) && !/>\s*Quitar el lugar\s*</.test(crear)
);

/* Qué hace el aspa: quita SOLO el lugar; la zona tiene la suya. */
check('el aspa del lugar quita únicamente el lugar', /onPress=\{\(\) => setPlace\(undefined\)\}/.test(chip));
check('y la zona se quita por separado, con su propio aspa', /onPress=\{\(\) => setUbicacion\(undefined\)\}/.test(chip) && /accessibilityLabel="Quitar mi ubicación"/.test(chip));
check('cambiar de lugar es volver a tocar "Ubicación"', /texto="Ubicación"[\s\S]{0,120}onPress=\{abrirUbicacion\}/.test(crear));

/* Diseño: compacto, redondeado, amarillo suave, aguanta nombres largos. */
check('fondo suave del amarillo Weë', /accent \+ '1F'/.test(chip));
check('bordes redondeados', /chipLugar: \{[^}]*borderRadius: BORDER_RADIUS\.full/.test(crear));
check('icono de ubicación limpio, sin bandera ni emoji', /name="location"/.test(chip) && !/📍|🌍|\p{Regional_Indicator}/u.test(chip));
check(
  'un nombre largo se corta con puntos y no rompe la fila',
  /numberOfLines=\{1\}/.test(chip) && /chipLugarTexto: \{[^}]*flexShrink: 1/.test(crear) && /chipLugar: \{[^}]*maxWidth: '100%'/.test(crear)
);
check('la fila envuelve si hay dos chips', /lugarFila: \{[^}]*flexWrap: 'wrap'/.test(crear));

/* Sin lugar ni zona, no queda hueco. */
check('sin lugar no se pinta nada, ni el hueco', /const renderLugar = \(\) =>\s*\n?\s*place \|\| ubicacion \? \(/.test(crear) && (crear.match(/styles\.lugarFila/g) || []).length === 1);

/* Publicar no cambió: el mismo PostPlace de siempre. */
check('publicar sigue mandando el mismo `place`', /\.\.\.\(place \? \{ place \} : \{\}\)/.test(crear) && !/placeLabel:/.test(crear));
check('y la zona igual que antes', /\.\.\.\(ubicacion \? \{ ubicacion \} : \{\}\)/.test(crear));

console.log('\n' + (failures === 0 ? 'Todo en orden.' : `${failures} comprobacion(es) fallaron.`));
process.exit(failures === 0 ? 0 : 1);
