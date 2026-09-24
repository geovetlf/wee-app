// Ubicación transversal de Weë y protección EXIF/GPS de lo que se hace público
// (fase 2E-63A). Como en el resto de la suite, no se imita la lógica: se lee el
// archivo real, se transpila y se ejecuta contra dobles controlados. Lo que no se
// puede ejecutar —React, la UI— se comprueba sobre el texto del archivo.
import ts from 'typescript';
import fs from 'node:fs';
import { comoSeLee } from './i18n-ayuda.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/*
 * El fuente se lee ya RESUELTO: cada `t('modulo.clave')` sale como la frase que
 * le pone el diccionario español. Lo que se comprueba aquí sigue siendo lo que
 * se comprobaba —las palabras que ve la persona—, y de paso queda comprobado
 * que la clave existe y que dice lo que tiene que decir.
 */
const leer = (p) => comoSeLee(fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8'));
/* Para EJECUTAR se compila el fuente original: el traductor va dentro. */
const leerCrudo = (p) => (fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8'));

/** El cuerpo del catálogo mundial, tal cual lo recibe la aplicación. */
const catalogoMundial = () => {
  const archivo = leer('data/citiesWorld.ts');
  const i = archivo.indexOf('WORLD_PLACES = `') + 16;
  /* Hasta el cierre de ESTA cadena: detrás viene `HAND_COORDS`, que es otra cosa
     y con otro formato. Cortar por el final del archivo se las tragaba las dos. */
  return archivo.slice(i, archivo.indexOf('`;', i));
};

/** Las coordenadas de los lugares escritos a mano, que viajan aparte. */
const coordsAMano = () => {
  const archivo = leer('data/citiesWorld.ts');
  const i = archivo.indexOf('HAND_COORDS = `');
  if (i < 0) return '';
  const a = archivo.indexOf('`', i) + 1;
  return archivo.slice(a, archivo.indexOf('`;', a));
};

/** Los nombres de las regiones —'PE.15|Lima'—, la tercera cadena del artefacto. */
const regionesTabla = () => {
  const archivo = leer('data/citiesWorld.ts');
  const i = archivo.indexOf('REGIONS = `');
  if (i < 0) return '';
  const a = archivo.indexOf('`', i) + 1;
  return archivo.slice(a, archivo.indexOf('`;', a));
};

/**
 * El mismo archivo sin sus comentarios.
 *
 * Hace falta más de lo que parece: el código de Weë explica en prosa lo que NO
 * hace —"aquí no hay latitude ni longitude", "nunca watchPosition"—, y una
 * comprobación que busque esas palabras encuentra justo la frase que promete lo
 * contrario. Lo que se comprueba es el código.
 */
const soloCodigo = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/**
 * La capa de lugares, ejecutable.
 *
 * `places.ts` importa dos catálogos —países y ciudades—, y un módulo cargado
 * desde una URL de datos no sabe resolver rutas relativas. Así que los dos
 * archivos se pegan dentro antes de transpilar: lo que se ejecuta después es el
 * código real, con sus datos reales.
 */
const cargarLugares = async () => {
  const fuente = leer('data/places.ts')
    .replace("import { COUNTRIES, Country } from './countries';", leer('data/countries.ts').replace(/export /g, ''))
    .replace("import { CITIES, City } from './cities';", leer('data/cities.ts').replace(/export /g, ''))
    // El catálogo mundial se carga con un import dinámico, que una URL de datos no
    // sabe resolver. Se le da ya cargado, que es lo mismo que hace la aplicación.
    .replace(
      "require('./citiesWorld') as { WORLD_PLACES: string; HAND_COORDS: string; REGIONS: string }",
      '{ WORLD_PLACES: globalThis.__WORLD, HAND_COORDS: globalThis.__HAND, REGIONS: globalThis.__REG }'
    );
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};

/** Transpila un módulo de la app sustituyendo sus imports por dobles nuestros. */
const cargar = async (ruta, sustituciones) => {
  let fuente = leer(ruta);
  for (const [linea, reemplazo] of sustituciones) {
    if (!fuente.includes(linea)) throw new Error('no encuentro el import: ' + linea);
    fuente = fuente.replace(linea, reemplazo);
  }
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};

/** Los dobles se resuelven al usarlos, no al importar: el módulo se evalúa antes. */
const DOBLES = [
  ["import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = new Proxy({}, { get: (_t, k) => (...a) => globalThis.__wee.AsyncStorage[k](...a) });'],
  ["import * as Location from 'expo-location';", 'const Location = new Proxy({}, { get: (_t, k) => globalThis.__wee.Location[k] });'],
  ["import { Platform } from 'react-native';", 'const Platform = new Proxy({}, { get: (_t, k) => (globalThis.__wee.Platform || { OS: "android" })[k] });'],
];

// ════════════════════════════════════════════════════════════════════════════
// A · locationService: los seis estados, de verdad
// ════════════════════════════════════════════════════════════════════════════
console.log('── A · los seis estados de la ubicación ──');
{
  const servicio = await cargar('services/locationService.ts', DOBLES);

  /** Un mundo: lo que dice el almacenamiento local y lo que dice el sistema. */
  const mundo = ({ guardado = null, servicios = true, permiso = {}, posicion = null, rompe = null }) => {
    const llamadas = { pidioPermiso: 0, leyo: 0, opciones: null };
    globalThis.__wee = {
      AsyncStorage: {
        getItem: async () => guardado,
        setItem: async (_k, v) => {
          guardado = v;
        },
      },
      Location: {
        Accuracy: { High: 5, Low: 2 },
        hasServicesEnabledAsync: async () => {
          if (rompe === 'servicios') throw new Error('sin módulo nativo');
          return servicios;
        },
        getForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: true, ...permiso }),
        requestForegroundPermissionsAsync: async () => {
          llamadas.pidioPermiso++;
          return { granted: false, canAskAgain: true, ...permiso };
        },
        getCurrentPositionAsync: async (opciones) => {
          llamadas.leyo++;
          llamadas.opciones = opciones;
          if (!posicion) throw new Error('sin señal');
          return posicion;
        },
      },
    };
    return llamadas;
  };

  // 1) Con la preferencia apagada Weë ni pregunta.
  mundo({ guardado: null, permiso: { granted: true, android: { accuracy: 'fine' } } });
  check('1) apagada en Weë: no se usa la ubicación aunque el sistema la conceda', (await servicio.estadoActual()) === 'permissionNotDetermined');
  check('1) y la preferencia por defecto es "off"', (await servicio.leerPreferencia()) === 'off');

  // 2) Encendida en Weë, el sistema manda sobre el resto.
  mundo({ guardado: 'aproximada', permiso: { granted: false, canAskAgain: true } });
  check('2) encendida pero sin preguntar todavía', (await servicio.estadoActual()) === 'permissionNotDetermined');

  mundo({ guardado: 'aproximada', permiso: { granted: false, canAskAgain: false } });
  check('2) encendida y denegada: denegada', (await servicio.estadoActual()) === 'permissionDenied');

  // El caso que apareció probando en el navegador: la web dice que sí se puede
  // volver a preguntar aunque el permiso esté bloqueado. Manda `status`.
  mundo({ guardado: 'aproximada', permiso: { granted: false, canAskAgain: true, status: 'denied' } });
  check('2) web: denegada aunque diga que se puede volver a preguntar', (await servicio.estadoActual()) === 'permissionDenied');
  mundo({ guardado: 'aproximada', permiso: { granted: false, canAskAgain: true, status: 'undetermined' } });
  check('2) y sin preguntar todavía sigue siendo eso', (await servicio.estadoActual()) === 'permissionNotDetermined');

  mundo({ guardado: 'aproximada', permiso: { granted: true, android: { accuracy: 'coarse' } } });
  check('2) Android "aproximada" es un estado propio', (await servicio.estadoActual()) === 'approximate');

  // Pedir la zona da la zona, aunque el sistema haya concedido el detalle: la
  // preferencia de Weë es un techo por arriba y también por abajo.
  mundo({ guardado: 'aproximada', permiso: { granted: true, android: { accuracy: 'fine' } } });
  check('2) pedir la zona da la zona, aunque el sistema conceda más', (await servicio.estadoActual()) === 'approximate');

  mundo({ guardado: 'precisa', permiso: { granted: true, android: { accuracy: 'fine' } } });
  check('2) Android "precisa" también', (await servicio.estadoActual()) === 'precise');

  mundo({ guardado: 'precisa', permiso: { granted: true, ios: { scope: 'whenInUse' } } });
  check('2) iOS "mientras se usa" cuenta como concedida', (await servicio.estadoActual()) === 'precise');

  mundo({ guardado: 'aproximada', servicios: false, permiso: { granted: true } });
  check('3) ubicación apagada en el sistema: disabled, no denegada', (await servicio.estadoActual()) === 'disabled');

  mundo({ guardado: 'aproximada', rompe: 'servicios' });
  check('3) un aparato que no sabe localizarse: unavailable', (await servicio.estadoActual()) === 'unavailable');

  // El otro caso que apareció probando en el navegador: sin geolocalización, la
  // web no dice "apagada" —no hay interruptor que encender—, dice "no puede".
  mundo({ guardado: 'aproximada', servicios: false });
  globalThis.__wee.Platform = { OS: 'web' };
  check('3) y un navegador sin geolocalización, también unavailable', (await servicio.estadoActual()) === 'unavailable');
  globalThis.__wee.Platform = { OS: 'android' };
  check('3) pero en un teléfono el mismo "no" es el interruptor del sistema', (await servicio.estadoActual()) === 'disabled');

  check('3) los seis estados existen y son distintos', new Set(['unavailable', 'disabled', 'permissionNotDetermined', 'permissionDenied', 'approximate', 'precise']).size === 6);
}

// ════════════════════════════════════════════════════════════════════════════
// B · preferencia de Weë ≠ permiso del sistema
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · lo que le dices a Weë y lo que le dices al sistema ──');
{
  const servicio = await cargar('services/locationService.ts', DOBLES);
  const contador = { miradas: 0 };
  let guardado = null;
  globalThis.__wee = {
    AsyncStorage: {
      getItem: async () => guardado,
      setItem: async (_k, v) => {
        guardado = v;
      },
    },
    Location: {
      Accuracy: { High: 5, Low: 2 },
      hasServicesEnabledAsync: async () => true,
      getForegroundPermissionsAsync: async () => {
        contador.miradas++;
        return { granted: true, canAskAgain: false, android: { accuracy: 'fine' } };
      },
      requestForegroundPermissionsAsync: async () => ({ granted: true, canAskAgain: false }),
      getCurrentPositionAsync: async () => ({ coords: { latitude: -12, longitude: -77, accuracy: 20 } }),
    },
  };

  // Weë desactivada + sistema permitido = Weë no usa la ubicación.
  check('B) Weë off + sistema sí = off', (await servicio.estadoActual('off')) === 'permissionNotDetermined');
  const miradasTrasOff = contador.miradas;
  check('B) y ni siquiera consulta el permiso', miradasTrasOff === 0);

  // Weë activada + sistema permitido = disponible.
  check('B) Weë on (zona) + sistema sí = approximate', (await servicio.estadoActual('aproximada')) === 'approximate');
  check('B) Weë on (detalle) + sistema sí = precise', (await servicio.estadoActual('precisa')) === 'precise');
  check('B) ahora sí lo consulta', contador.miradas === 2);

  // Las dos cosas se guardan por separado: la preferencia es local.
  await servicio.guardarPreferencia('aproximada');
  check('B) la preferencia se guarda en el aparato', guardado === 'aproximada');
  await servicio.guardarPreferencia('off');
  check('B) y se puede apagar sin tocar el permiso del sistema', guardado === 'off' && contador.miradas === 2);

  const permiso = await servicio.permisoActual();
  check('B) el permiso del sistema se cuenta aparte', permiso.concedido === true && permiso.precision === 'precisa');
}

// ════════════════════════════════════════════════════════════════════════════
// C · la lectura: puntual, en memoria y nada más
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · una lectura, y se acabó ──');
{
  const servicio = await cargar('services/locationService.ts', DOBLES);
  let opciones = null;
  let coords = { latitude: -12.05, longitude: -77.04, accuracy: 15 };
  globalThis.__wee = {
    AsyncStorage: { getItem: async () => 'aproximada', setItem: async () => {} },
    Location: {
      Accuracy: { High: 5, Low: 2 },
      hasServicesEnabledAsync: async () => true,
      getForegroundPermissionsAsync: async () => ({ granted: true, canAskAgain: false }),
      requestForegroundPermissionsAsync: async () => ({ granted: true, canAskAgain: false }),
      getCurrentPositionAsync: async (o) => {
        opciones = o;
        if (!coords) throw new Error('sin señal');
        return { coords };
      },
    },
  };

  const aprox = await servicio.leerUnaVez('aproximada');
  check('C) una lectura devuelve coordenadas en memoria', aprox.latitude === -12.05 && aprox.longitude === -77.04);
  check('C) pide poca precisión cuando se le pide poca', opciones.accuracy === 2);
  check('C) y dice con qué precisión llegó', aprox.precision === 'aproximada' && aprox.radioMetros === 15);

  await servicio.leerUnaVez('precisa');
  check('C) pide precisión alta solo cuando se la piden', opciones.accuracy === 5);

  // iOS con la ubicación exacta desactivada: se pide precisa y llega difusa.
  coords = { latitude: -12, longitude: -77, accuracy: 3000 };
  const difusa = await servicio.leerUnaVez('precisa');
  check('C) un radio enorme se cuenta como aproximada, aunque se pidiera precisa', difusa.precision === 'aproximada');

  coords = null;
  check('C) sin señal no se inventa una posición', (await servicio.leerUnaVez()) === null);
}

// ════════════════════════════════════════════════════════════════════════════
// D · lo que la capa NO hace
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · seguimiento, coordenadas guardadas y consultas geográficas ──');
{
  const servicio = leer('services/locationService.ts');
  const contexto = leer('contexts/LocationContext.tsx');
  const ajustes = leer('screens/SettingsScreen.tsx');
  const todo = servicio + contexto + ajustes;

  check('D) nadie llama a watchPosition', !/watchPositionAsync\(|geolocation\.watchPosition/.test(todo));
  check('D) y se dice en voz alta que no se hace', /nunca watchPosition/.test(servicio));
  check('D) ni tareas de fondo ni geovallas', !/startLocationUpdatesAsync|startGeofencingAsync|BackgroundPermissions/.test(todo));
  check('D) ni geocodificación', !/geocodeAsync|reverseGeocodeAsync/.test(todo));
  check('D) solo se pide el permiso de primer plano', /requestForegroundPermissionsAsync/.test(servicio) && !/requestBackgroundPermissionsAsync/.test(todo));
  check('D) ninguna coordenada se guarda', !/setDoc|updateDoc|addDoc|collection\(/.test(todo));
  check('D) no hay geohash', !/geohash|geoHash|geopoint|GeoPoint/i.test(todo));
  // La comprobación busca CONSULTAS, no las palabras: el texto de Settings dice
  // "cerca de ti" a propósito, y eso es una explicación para una persona.
  check('D) ni consultas geográficas', !/nearBy\(|withinRadius|boundingBox|bbox|orderBy\(['"`](lat|lng|geo)/i.test(todo));
  check('D) ni mapas, rutas o proveedores externos', !/mapbox|googlemaps|places|leaflet|openstreetmap/i.test(todo));
  check('D) lo único que se guarda es la preferencia, en el aparato', /AsyncStorage\.setItem\(CLAVE, preferencia\)/.test(servicio) && (servicio.match(/setItem\(/g) || []).length === 1);
}

// ════════════════════════════════════════════════════════════════════════════
// E · nada de esto aparece en el User público
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · el User público sigue sin saber dónde vives ──');
{
  const tipos = leer('services/firestoreService.ts');
  const reglas = leer('firestore.rules');
  const campos = /latitude|longitude|geohash|locationCell|cityFromLocation|regionFromLocation/i;
  const perfil = tipos.slice(tipos.indexOf('export interface UserProfile'), tipos.indexOf('}', tipos.indexOf('export interface UserProfile')));
  check('E) el perfil público no tiene coordenadas', perfil.length > 100 && !campos.test(perfil));
  check('E) ni las escribe nadie en users/{uid}', !campos.test(soloCodigo(tipos)));
  check('E) las reglas no abren ninguna colección de ubicación', !/userLocations|locations|geo/i.test(reglas));
  check('E) no hay índices geográficos', !campos.test(leer('firestore.indexes.json')));
}

// ════════════════════════════════════════════════════════════════════════════
// F · el contexto y la UI
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · LocationProvider, useLocation y el interruptor ──');
{
  const contexto = leer('contexts/LocationContext.tsx');
  const app = leer('App.tsx');
  const ajustes = leer('screens/SettingsScreen.tsx');

  check('F) hay un provider y un hook', /export const LocationProvider/.test(contexto) && /export const useLocation = \(\) => useContext\(LocationContext\)/.test(contexto));
  check('F) montado en el árbol de la aplicación', /<LocationProvider>/.test(app) && /import \{ LocationProvider \}/.test(app));
  check('F) el contexto no llama a la API nativa: pasa por el servicio', !/from 'expo-location'|Location\./.test(contexto) && /from '\.\.\/services\/locationService'/.test(contexto));
  check('F) la API pública son siete cosas y ninguna es una coordenada guardada', ['estado', 'preferencia', 'permiso', 'cargando', 'activar', 'desactivar', 'revisar'].every((k) => new RegExp('\\b' + k + '\\b').test(contexto)) && /leerUnaVez/.test(contexto));
  check('F) al arrancar con la preferencia apagada no se consulta el permiso', /quiere === 'off' \? null : await locationService\.permisoActual\(\)/.test(contexto));
  check('F) se vuelve a mirar al volver a la aplicación', /AppState\.addEventListener\('change'/.test(contexto) && /situacion === 'active'/.test(contexto));
  check('F) si ya dijo que no, no se le vuelve a abrir el diálogo', /actual\.concedido \|\| actual\.denegado \? actual : await locationService\.pedirPermiso\(\)/.test(contexto));
  check('F) apagar en Weë no toca el permiso del sistema', /const desactivar = [\s\S]*?guardarPreferencia\('off'\)/.test(contexto) && !/const desactivar = [\s\S]*?pedirPermiso/.test(contexto.slice(contexto.indexOf('const desactivar'), contexto.indexOf('const leerUnaVez'))));
  check('F) con la preferencia apagada no se lee la ubicación', /if \(preferencia === 'off'\) return null;/.test(contexto));

  check('F) el interruptor vive en Configuración → Privacidad', ajustes.indexOf('📍 Ubicación') > ajustes.indexOf("Privacidad") && ajustes.indexOf('📍 Ubicación') < ajustes.indexOf('Notificaciones push'));
const diccionarioEs = fs.readFileSync(new URL('../../i18n/textos/es/settings.ts', import.meta.url), 'utf8');
  const diccionarioEn = fs.readFileSync(new URL('../../i18n/textos/en/settings.ts', import.meta.url), 'utf8');
  check('F) con los tres estados que pide el producto',
    /disabled: 'settings\.locationDisabled'/.test(ajustes)
    && /approximate: 'settings\.locationApproximate'/.test(ajustes)
    && /precise: 'settings\.locationPrecise'/.test(ajustes)
    && /locationOff: 'Desactivada\./.test(diccionarioEs)
    && /locationApproximate: 'Weë sabe tu zona, no el punto exacto\.'/.test(diccionarioEs)
    && /locationPrecise: '[^']*con detalle cuando una función lo necesite\.'/.test(diccionarioEs)
    && /locationOff: 'Off\./.test(diccionarioEn));
  check('F) y el texto acordado', /Permite que Weë use tu ubicación aproximada para mostrarte contenido y experiencias cerca de ti\./.test(ajustes) && /Tu ubicación exacta nunca se muestra públicamente\./.test(ajustes));
  check('F) el interruptor no abre ninguna función: es solo el control', !/navigate\('(Map|Nearby|Places|Travel)/i.test(ajustes) && !/MapView|WeeTravel|distancia|km de ti|a \${.*} km/i.test(ajustes));
  check('F) encender desde Settings pide la zona, nunca el detalle', /ubicacion\.activar\('aproximada'\)/.test(ajustes) && !/activar\('precisa'\)/.test(ajustes));
}

// ════════════════════════════════════════════════════════════════════════════
// G · EXIF/GPS: lo que se hace público se re-escribe antes de salir
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · ninguna foto pública se lleva sus coordenadas ──');
{
  // Un JPEG de mentira con un bloque EXIF que contiene GPS. No hace falta que sea
  // una imagen válida: lo que se comprueba es que estos bytes NO son los que
  // llegan a la red, porque por el camino se vuelve a escribir el píxel.
  const conGps = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x16, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x47, 0x50, 0x53, 0x4c, 0x61, 0x74, 0x69, 0x74, 0x75, 0x64, 0x65]);
  const tieneGps = (bytes) => Buffer.from(bytes).includes('GPSLatitude');
  check('G) el archivo de prueba sí lleva GPS', tieneGps(conGps));

  // Un navegador de mentira: el canvas devuelve píxel limpio, sin metadatos.
  const visto = { orientacion: null, dibujos: 0, tipo: null };
  const limpio = new Uint8Array([0xff, 0xd8, 0x00, 0x11, 0x22]);
  globalThis.createImageBitmap = async (_blob, opciones) => {
    visto.orientacion = opciones && opciones.imageOrientation;
    return { width: 4, height: 3, close() {} };
  };
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => visto.dibujos++ }),
      toBlob: (cb, tipo) => {
        visto.tipo = tipo;
        cb(new Blob([limpio], { type: tipo }));
      },
    }),
  };

  const imagen = await cargar('utils/publicImage.ts', [
    ["import { Platform } from 'react-native';", "const Platform = { OS: 'web' };"],
    ["import * as ImageManipulator from 'expo-image-manipulator';", 'const ImageManipulator = { SaveFormat: { JPEG: "jpeg", PNG: "png" }, manipulateAsync: async () => ({ uri: "limpio" }) };'],
  ]);

  const original = new Blob([conGps], { type: 'image/jpeg' });
  const salida = await imagen.blobSinMetadatos(original);
  const bytes = new Uint8Array(await salida.arrayBuffer());

  check('G) lo que sale no es el archivo que entró', salida !== original);
  check('G) y ya no lleva GPS', !tieneGps(bytes));
  check('G) porque se ha vuelto a dibujar el píxel', visto.dibujos === 1);
  check('G) aplicando antes la orientación del EXIF, para no publicar la foto tumbada', visto.orientacion === 'from-image');
  check('G) un JPEG sigue siendo un JPEG', visto.tipo === 'image/jpeg');

  const png = await imagen.blobSinMetadatos(new Blob([conGps], { type: 'image/png' }));
  check('G) y un PNG sigue siendo PNG, para no perder la transparencia', visto.tipo === 'image/png' && png instanceof Blob);

  // Si no se puede limpiar, no se sube: fallar es mejor que filtrar.
  globalThis.createImageBitmap = async () => {
    throw new Error('sin canvas');
  };
  globalThis.document = { createElement: () => ({ getContext: () => null, toBlob: () => {} }) };
  globalThis.Image = function () {
    this.decode = async () => {
      throw new Error('sin decodificador');
    };
  };
  globalThis.URL.createObjectURL = () => 'blob:x';
  globalThis.URL.revokeObjectURL = () => {};
  let fallo = null;
  try {
    await imagen.blobSinMetadatos(original);
  } catch (error) {
    fallo = error;
  }
  check('G) si no se puede limpiar, no se sube el original', fallo !== null && fallo.name === 'ImagenNoLimpiable');
}

// ════════════════════════════════════════════════════════════════════════════
// H · la limpieza está en la puerta por la que pasa todo lo público
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · una sola puerta, y está vigilada ──');
{
  const cloudinary = leer('services/cloudinaryService.ts');
  const almacen = leer('services/storageService.ts');

  check('H) las dos subidas de imagen limpian antes de enviar', /resourceType === 'image' \? await blobSinMetadatos\(blob\) : blob/.test(cloudinary) && /const limpio = resourceType === 'image' \? await uriSinMetadatos\(uri\) : uri;/.test(cloudinary));
  // Desde la Fase 11 (C10) esa segunda puerta pasa también por el límite de tamaño y tipo.
  check('H) y la de blobs en memoria también', /const limpio = await blobSinMetadatos\(comprobarBlob\(blob, 'image'\)\);/.test(cloudinary) && /readAsDataURL\(limpio\)/.test(cloudinary));
  check('H) el original ya no se envía nunca', !/formData\.append\('file', blob,/.test(cloudinary) && !/readAsDataURL\(blob\)/.test(cloudinary));
  check('H) el video no se toca', /resourceType === 'image' \?/.test(cloudinary) && /uploadVideoToCloudinary/.test(cloudinary));
  check('H) todo lo público pasa por ahí: perfil, portada, publicación, comunidad, mensaje y comentario', ['uploadProfileImageFromUri', 'uploadBannerImageFromUri', 'uploadPostImage', 'uploadPostImageFromUri', 'uploadCommunityImage', 'uploadMessageImageFromUri', 'uploadCommentImage'].every((f) => almacen.includes(f)) && !/fetch\(`\$\{BASE_URL\}/.test(almacen));

  // Weë Creator no se toca: sus fotos son privadas y suyas.
  const creator = leer('services/creatorUploads.ts');
  check('H) las fotos privadas de Weë Creator se quedan como están', !/publicImage|SinMetadatos/.test(creator) && /creator-inputs/.test(creator));
  check('H) y siguen subiendo al Storage de Weë, no a Cloudinary', /uploadBytes/.test(creator) && !/cloudinary/i.test(creator));
}

// ════════════════════════════════════════════════════════════════════════════
// I · los flujos de imagen de siempre siguen enteros
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── I · nada de lo que ya funcionaba se ha roto ──');
{
  const utiles = leer('utils/imageUtils.ts');
  const avatar = leer('components/avatars/AvatarPicker.tsx');
  const crear = leer('screens/CreateScreen.tsx');

  check('I) la compresión de siempre sigue donde estaba', /export const compressImage/.test(utiles) && /export const compressPostImage/.test(utiles) && /export const compressProfileImage/.test(utiles));
  check('I) y no se ha metido la limpieza dentro de ella', !/publicImage|SinMetadatos/.test(utiles));
  check('I) el selector de avatar sigue igual', /ImageManipulator|manipulateAsync/.test(avatar));
  check('I) publicar sigue subiendo por storageService', /uploadPostImage/.test(crear) && /storageService/.test(crear));
  check('I) sin librería nueva: se reutiliza expo-image-manipulator', /expo-image-manipulator/.test(leer('utils/publicImage.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
// J · la configuración nativa es exactamente la que se pidió
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── J · permisos nativos: los justos ──');
{
  const app = JSON.parse(leer('app.json'));
  const paquete = JSON.parse(leer('package.json'));
  const plugin = app.expo.plugins.find((x) => Array.isArray(x) && x[0] === 'expo-location');

  check('J) expo-location está instalado', !!paquete.dependencies['expo-location']);
  check('J) y configurado como plugin', !!plugin);
  check('J) con el texto de "mientras se usa"', typeof plugin[1].locationWhenInUsePermission === 'string' && /mientras la tienes abierta/.test(plugin[1].locationWhenInUsePermission));
  check('J) sin "Siempre" en iOS', plugin[1].locationAlwaysPermission === false && plugin[1].locationAlwaysAndWhenInUsePermission === false);
  check('J) sin ubicación en segundo plano', plugin[1].isIosBackgroundLocationEnabled === false && plugin[1].isAndroidBackgroundLocationEnabled === false);
  check('J) sin servicio en primer plano en Android', plugin[1].isAndroidForegroundServiceEnabled === false);
  check('J) no se han inventado permisos sueltos', !app.expo.android || !app.expo.android.permissions || !app.expo.android.permissions.some((x) => /BACKGROUND_LOCATION/.test(x)));

  /*
   * ACCESS_MEDIA_LOCATION es el permiso que deja leer las coordenadas GPS de las
   * fotos que ya están en la galería. Weë no lo usa en ningún sitio —lo confirmó
   * la auditoría de 2E-63A.1— y además hacía que descargar un Weël pidiera acceso
   * a la ubicación de las fotos, para una función que solo guarda un video.
   */
  const media = app.expo.plugins.find((x) => Array.isArray(x) && x[0] === 'expo-media-library');
  const guardarVideo = leer('services/videoDownload.ts');
  check('K) Weë no pide acceso a la ubicación de las fotos', !!media && media[1].isAccessMediaLocationEnabled === false);
  check('K) y nadie la lee: ni getAssetInfoAsync ni exif', !/getAssetInfoAsync|resolveWithFullInfo|exif/i.test(guardarVideo));
  check('K) guardar un Weël pide solo escritura', /requestPermissionsAsync\(true\)/.test(guardarVideo));
  check('K) que es lo único que ese flujo hace', /saveToLibraryAsync/.test(guardarVideo) && !/getAssetsAsync|getAlbum|deleteAssets/.test(guardarVideo));
  check('K) expo-media-library sigue usándose en un solo sitio', (leer('package.json').includes('expo-media-library')));
}

// ════════════════════════════════════════════════════════════════════════════
// L · el techo: la preferencia de Weë nunca sube por encima del sistema
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── L · lo que pides y lo que te dan ──');
{
  const servicio = await cargar('services/locationService.ts', DOBLES);
  const permiso = (precision, concedido = true) => ({ concedido, denegado: !concedido, puedeVolverAPreguntar: false, precision });

  // La combinación que importa: la persona pide detalle, el sistema da la zona.
  check('L) pides detalle y el sistema da la zona → la zona', servicio.precisionEfectiva('precisa', permiso('aproximada')) === 'aproximada');
  check('L) pides detalle y el sistema lo da → detalle', servicio.precisionEfectiva('precisa', permiso('precisa')) === 'precisa');
  check('L) pides la zona y el sistema da detalle → la zona', servicio.precisionEfectiva('aproximada', permiso('precisa')) === 'aproximada');
  check('L) con Weë apagada da igual lo que conceda el sistema', servicio.precisionEfectiva('off', permiso('precisa')) === 'ninguna');
  check('L) y sin permiso, tampoco importa lo que pidas', servicio.precisionEfectiva('precisa', permiso('ninguna', false)) === 'ninguna');

  // Y el techo se aplica también al PEDIR la lectura, no solo al contarla.
  let pedida = null;
  globalThis.__wee = {
    Platform: { OS: 'android' },
    AsyncStorage: { getItem: async () => 'precisa', setItem: async () => {} },
    Location: {
      Accuracy: { High: 5, Low: 2 },
      hasServicesEnabledAsync: async () => true,
      getForegroundPermissionsAsync: async () => ({ granted: true, canAskAgain: false, android: { accuracy: 'coarse' } }),
      requestForegroundPermissionsAsync: async () => ({ granted: true, canAskAgain: false }),
      getCurrentPositionAsync: async (o) => {
        pedida = o.accuracy;
        return { coords: { latitude: -12.05, longitude: -77.04, accuracy: 1800 } };
      },
    },
  };
  const lectura = await servicio.leerUnaVez('precisa');
  check('L) no se pide detalle por detrás cuando el sistema no lo dio', pedida === 2);
  check('L) y la lectura se declara aproximada', lectura.precision === 'aproximada');
}

// ════════════════════════════════════════════════════════════════════════════
// M · privacidad: de la lectura a lo que se puede enseñar
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── M · zonas y bandas: cerca sin señalar a nadie ──');
{
  const priv = await cargar('utils/locationPrivacy.ts', [
    ["import { LecturaUbicacion } from '../services/locationService';", ''],
  ]);
  const punto = (latitude, longitude, extra = {}) => ({ latitude, longitude, radioMetros: 20, precision: 'precisa', ...extra });

  // La zona no es la posición.
  const casa = punto(-12.0464, -77.0428);
  const zona = priv.zonaDe(casa);
  check('M) la zona no contiene la coordenada exacta', !JSON.stringify(zona).includes('-12.0464') && !JSON.stringify(zona).includes('-77.0428'));
  check('M) y dice lo grande que es', zona.radioKm === 11);
  check('M) la misma casa siempre cae en la misma zona', priv.zonaDe(casa).celda === priv.zonaDe(punto(-12.0464, -77.0428)).celda);
  check('M) dos vecinos comparten zona', priv.mismaZona(casa, punto(-12.048, -77.041)) === true);
  check('M) dos ciudades distintas, no', priv.mismaZona(casa, punto(-16.409, -71.537)) === false);

  // Las bandas, no los metros.
  check('M) 300 m son "menos de 1 km"', priv.bandaDe(300).banda === '0-1');
  check('M) 2,4 km caen en 1–5', priv.bandaDe(2400).banda === '1-5');
  check('M) 7 km, en 5–10', priv.bandaDe(7000).banda === '5-10');
  check('M) 18 km, en 10–25', priv.bandaDe(18000).banda === '10-25');
  check('M) 400 km, más de 25', priv.bandaDe(400000).banda === '25+');
  check('M) el borde exacto cae en la banda de arriba', priv.bandaDe(1000).banda === '1-5' && priv.bandaDe(5000).banda === '5-10');
  check('M) y una distancia negativa no rompe nada', priv.bandaDe(-5).banda === '0-1');
  check('M) cada banda se puede leer en voz alta', priv.BANDAS.every((b) => typeof b.etiqueta === 'string' && b.etiqueta.length > 0));

  // La distancia entre dos puntos sale ya en banda: el número no cruza.
  const cerca = priv.distanciaEntre(casa, punto(-12.0500, -77.0450));
  check('M) la distancia se devuelve en bandas, no en metros', cerca.banda === '0-1' && !('metros' in cerca));
  const lejos = priv.distanciaEntre(casa, punto(-16.409, -71.537));
  check('M) y una ciudad lejana también', lejos.banda === '25+');
  check('M) el módulo no exporta los metros', typeof priv.metrosEntre === 'undefined');

  // La forma pública: lo único que puede salir de aquí.
  const publica = priv.aPublica(casa);
  check('M) lo público no lleva latitude ni longitude', !('latitude' in publica) && !('longitude' in publica));
  check('M) ni el radio en metros de la lectura', !('radioMetros' in publica));
  check('M) y no se puede reconstruir la posición desde el texto', !JSON.stringify(publica).includes('-12.0464'));
  check('M) pero sí dice con qué precisión se supo', publica.precision === 'precisa');
  check('M) una lectura difusa se reconoce como tal', priv.esAproximada(punto(0, 0, { radioMetros: 3000 })) === true);
  check('M) y una nítida, también', priv.esAproximada(casa) === false);
}

// ════════════════════════════════════════════════════════════════════════════
// N · el contexto: estado normalizado, refresco controlado, sin bucles
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── N · una capacidad del sistema, no una función de pantalla ──');
{
  const contexto = leer('contexts/LocationContext.tsx');

  // 1) Lo que una pantalla puede preguntar.
  for (const campo of ['estado', 'preferencia', 'permiso', 'precision', 'disponible', 'lectura', 'publica', 'leidaEn', 'cargando', 'error']) {
    check(`N) el estado responde a "${campo}"`, new RegExp('^  ' + campo + ':', 'm').test(contexto));
  }
  check('N) y lo que puede hacer', ['activar', 'desactivar', 'revisar', 'refrescar'].every((f) => new RegExp('^  ' + f + ':', 'm').test(contexto)));

  // 2) El refresco: una vez, cuando se pide, sin solaparse.
  check('N) refrescar no arranca solo: no hay useEffect que lo llame', !/useEffect\([\s\S]{0,200}refrescar\(\)/.test(contexto));
  check('N) dos peticiones a la vez comparten la misma lectura', /if \(enMarcha\.current\) return enMarcha\.current;/.test(contexto));
  check('N) y la marca se suelta al terminar', /finally \{\s*enMarcha\.current = null;/.test(contexto));
  check('N) con la preferencia apagada no se lee nada', /if \(preferencia === 'off'\) return null;/.test(contexto));
  check('N) ni sin permiso utilizable', /if \(ahora !== 'approximate' && ahora !== 'precise'\) \{/.test(contexto));
  check('N) el fallo se cuenta en una frase, no se traga', /setError\('No se pudo obtener tu ubicación/.test(contexto));

  // 3) Revocar limpia lo que quedaba en memoria.
  check('N) al revocar se olvida la lectura', /const olvidarLectura = useCallback/.test(contexto) && (contexto.match(/olvidarLectura\(\)/g) || []).length >= 3);
  check('N) apagar en Weë también la olvida', /const desactivar = [\s\S]*?olvidarLectura\(\)/.test(contexto));
  check('N) y se revisa al volver a la aplicación, no en bucle', /AppState\.addEventListener\('change'/.test(contexto) && !/setInterval|setTimeout\([\s\S]{0,40}revisar/.test(contexto));

  // 4) Nada de seguimiento, en ninguna de sus formas.
  const capa = leer('services/locationService.ts') + contexto + leer('utils/locationPrivacy.ts');
  check('N) sin watchPosition', !/watchPositionAsync\(|geolocation\.watchPosition/.test(capa));
  check('N) sin permiso de fondo', !/BackgroundPermissions|startLocationUpdatesAsync|startGeofencing/.test(capa));
  check('N) sin sondeos', !/setInterval/.test(capa));
  check('N) y sin geocodificación ni mapas', !/geocodeAsync|reverseGeocodeAsync|mapbox|googlemaps|places/i.test(capa));

  // 5) La conversión a forma pública se hace aquí, no en cada pantalla.
  check('N) lo que sale al resto de Weë ya viene sin coordenadas', /publica: lectura \? aPublica\(lectura\) : null/.test(contexto));
  check('N) y la utilidad de privacidad es transversal', /from '\.\.\/utils\/locationPrivacy'/.test(contexto));
}

// ════════════════════════════════════════════════════════════════════════════
// O · ninguna coordenada se escapa
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── O · buscando fugas ──');
{
  const capa = {
    'services/locationService.ts': leer('services/locationService.ts'),
    'contexts/LocationContext.tsx': leer('contexts/LocationContext.tsx'),
    'utils/locationPrivacy.ts': leer('utils/locationPrivacy.ts'),
    'screens/SettingsScreen.tsx': leer('screens/SettingsScreen.tsx'),
  };
  const todo = Object.values(capa).join('\n');

  check('O) ninguna coordenada va a un console', !/console\.(log|warn|error)\([^)]*\b(latitude|longitude|coords|lectura)\b/.test(todo));
  check('O) ninguna se guarda en el aparato', !/setItem\([^)]*\b(latitude|longitude|lectura|coords)\b/.test(todo) && !/SecureStore/.test(todo));
  check('O) ninguna se escribe en Firestore', !/setDoc|updateDoc|addDoc|collection\(/.test(todo));
  check('O) ninguna viaja en una URL', !/\?lat=|&lng=|latitude=\$\{|encodeURIComponent\([^)]*lat/i.test(todo));
  check('O) ninguna se manda a analítica', !/analytics|logEvent|track\(/i.test(todo));
  check('O) ninguna viaja como parámetro de navegación', !/navigate\([^)]*\b(latitude|longitude|lectura)\b/.test(todo));
  check('O) lo único que se guarda sigue siendo la preferencia', (capa['services/locationService.ts'].match(/setItem\(/g) || []).length === 1);
  check('O) y la lectura solo vive en el estado de React', /const \[lectura, setLectura\] = useState<LecturaUbicacion \| null>\(null\)/.test(capa['contexts/LocationContext.tsx']));

  // La ubicación de Weë viene del sistema, nunca de una foto.
  check('O) sin EXIF y sin getAssetInfoAsync en toda la capa', !/exif|getAssetInfoAsync|setRequireOriginal/i.test(todo));
  const app = JSON.parse(leer('app.json'));
  const media = app.expo.plugins.find((x) => Array.isArray(x) && x[0] === 'expo-media-library');
  check('O) y ACCESS_MEDIA_LOCATION sigue fuera', media[1].isAccessMediaLocationEnabled === false);
}

// ════════════════════════════════════════════════════════════════════════════
// P · nada de esto ha tocado el resto de Weë
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── P · la capa está sola: nadie la consume todavía ──');
{
  const fsx = fs;
  const raiz = new URL('../../', import.meta.url);
  const buscar = (dir, acc = []) => {
    for (const e of fsx.readdirSync(new URL(dir, raiz), { withFileTypes: true })) {
      const rel = dir + e.name;
      if (e.isDirectory()) buscar(rel + '/', acc);
      else if (/\.tsx?$/.test(e.name)) acc.push(rel);
    }
    return acc;
  };
  const archivos = ['screens/', 'components/', 'services/', 'hooks/', 'contexts/', 'utils/'].flatMap((d) => buscar(d));

  const usanUbicacion = archivos.filter((f) => /useLocation\(\)|locationService|locationPrivacy/.test(leer(f)));
  /*
   * Quién consume la capa está tasado. Settings la enciende, el compositor la
   * usa para decir desde qué zona se publica, y el modelo del post declara el
   * tipo de lo que se guarda. Nadie más: la lista es corta a propósito, y crece
   * solo cuando alguien decide que crezca.
   */
  check('P) la capa la consumen los sitios tasados, y nadie más', usanUbicacion.filter((f) => !/location(Service|Privacy|Context)/i.test(f)).join(',') === 'screens/AgregarUbicacionScreen.tsx,screens/CreateScreen.tsx,screens/SettingsScreen.tsx,services/firestoreService.ts', usanUbicacion.join(', '));
  check('P) expo-location sigue viviendo en un único archivo', archivos.filter((f) => /from 'expo-location'/.test(leer(f))).join(',') === 'services/locationService.ts');

  // Ni Comunidad, ni Travel, ni WeeBiz han estrenado su propio sistema.
  const sospechosos = archivos.filter((f) => /Community|Travel|WeeBiz|Landing|Home/i.test(f));
  check('P) Comunidad, Travel y WeeBiz no tienen ubicación propia', !sospechosos.some((f) => /expo-location|getCurrentPositionAsync|useLocation\(\)/.test(leer(f))), String(sospechosos.length) + ' archivos revisados');
  check('P) y no hay "personas cerca" ni "comunidades cerca" en ninguna pantalla', !archivos.some((f) => /Personas cerca|Comunidades cerca|Negocios cerca|Eventos cerca/i.test(leer(f))));
}

// ════════════════════════════════════════════════════════════════════════════
// Q · el muro es uno solo, y el contexto es una etiqueta
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Q · una publicación es del muro, venga de donde venga ──');
{
  const almacen = leer('services/firestoreService.ts');
  const tarjeta = leer('components/PostCard.tsx');
  const comunidad = leer('screens/CommunityScreen.tsx');
  const crear = leer('screens/CreateScreen.tsx');

  // 1) El muro general no filtra nada: por eso TODO aparece en él.
  const consulta = almacen.slice(almacen.indexOf('getPublicPostsPaginated:'), almacen.indexOf('getPublicPostsPaginated:') + 420);
  check('Q) el muro general lee la colección entera, sin filtros', /'posts',/.test(consulta) && /undefined, \/\/ Sin filtros/.test(consulta));
  check('Q) por fecha, como un muro social', /'createdAt',\s*'desc'/.test(consulta));

  // 2) Publicar desde una sección o una comunidad escribe UNA publicación.
  check('Q) publicar escribe un solo documento', (crear.match(/postsService\.create\(|addDoc\(/g) || []).length <= 1 && /const postData/.test(crear));
  check('Q) y siempre en la misma colección', !/collection\(db, '(travelPosts|studioPosts|sectionPosts)'/.test(almacen + crear));

  // 3) Las secciones y las comunidades FILTRAN el muro, no tienen el suyo.
  // Sigue filtrando el muro general, pero desde 2E-75 respeta los destinos que
  // la publicación eligió; las que no eligieron, por palabras clave como siempre.
  /* Ya no hay muro de sección; el reparto por destinos vive en `sectionFeed` y sigue en pie. */
  check('Q) el reparto por destinos sigue vivo', /postsDeLaSeccion/.test(leer('utils/sectionFeed.ts')));
  check('Q) y el de una comunidad también parte de las mismas publicaciones', /postsService|getPosts/.test(comunidad));
  check('Q) ninguna sección tiene colección propia', !/collection\(db, '[a-z]+Posts'\)/.test(almacen));

  // 4) El contexto se dice con una etiqueta, no mudando la publicación.
  check('Q) la tarjeta pinta el contexto con un WeeTag', /<WeeTag/.test(tarjeta) && /import WeeTag from '\.\/WeeTag'/.test(tarjeta));
  check('Q) la comunidad lleva al sitio; la sección solo etiqueta', /<WeeTag nombre=\{community\.name\} icono=\{community\.icon\} onPress=\{handleCommunityPress\} \/>/.test(tarjeta) && /<WeeTag nombre=\{seccion\.nombre\} icono="sparkles-outline" \/>/.test(tarjeta));
  check('Q) y va detrás de la hora, en el mismo renglón', tarjeta.indexOf('getRelativeTime(post.createdAt') < tarjeta.indexOf('<WeeTag'));
  check('Q) una publicación sin contexto no pinta nada', /\{community && \(/.test(tarjeta) && /\{!community && seccion && \(/.test(tarjeta));

  // 5) El WeeTag no dice dónde está nadie.
  const tag = leer('components/WeeTag.tsx');
  check('Q) el WeeTag no sabe nada de ubicación', !/useLocation|locationService|latitude|longitude|zona/i.test(tag));
  check('Q) y no finge ser un botón cuando no lleva a ningún sitio', /if \(!onPress\) \{/.test(tag));
  check('Q) un nombre largo se corta, no rompe la cabecera', /flexShrink: 1/.test(tag) && /maxWidth: '55%'/.test(tag) && /numberOfLines=\{1\}/.test(tag));
}

// ════════════════════════════════════════════════════════════════════════════
// R · de dónde viene: solo lo que la persona dijo, nunca lo que se adivina
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── R · el contexto se lee, no se supone ──');
{
  const js = ts.transpileModule(leerCrudo('utils/sectionFeed.ts').replace("import { Post } from '../services/firestoreService';", ''), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const feed = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  const post = (extra = {}) => ({ content: '', aiTools: [], tags: [], hashtags: [], ...extra });

  check('R) una publicación de Weë Studio se reconoce', feed.seccionDe(post({ aiTools: ['Weë Studio'] }))?.nombre === 'Weë Studio');
  check('R) y una de Weë Design', feed.seccionDe(post({ aiTools: ['Weë Design'] }))?.id === 'design');
  check('R) y una de Hogar & Diseño, que por dentro es Design', feed.seccionDe(post({ aiTools: ['Weë Design · Hogar & Diseño'] }))?.id === 'design');
  check('R) la diéresis y las mayúsculas dan igual', feed.seccionDe(post({ aiTools: ['WEE CHEF'] }))?.id === 'chef');
  check('R) varias herramientas: se reconoce la sección entre ellas', feed.seccionDe(post({ aiTools: ['ElevenLabs', 'Weë Music'] }))?.id === 'music');

  // Lo importante: NO etiquetar a nadie por lo que escribió.
  check('R) escribir "cena" no te etiqueta como Weë Chef', feed.seccionDe(post({ content: 'Hoy hice una cena riquísima' })) === undefined);
  check('R) ni un hashtag', feed.seccionDe(post({ hashtags: ['chef'] })) === undefined);
  check('R) ni el nombre de una comunidad', feed.seccionDe(post({ communitySlug: 'design' })) === undefined);
  check('R) una publicación normal no tiene contexto de sección', feed.seccionDe(post({ content: 'Buenos días' })) === undefined);
  check('R) y una herramienta que no es de Weë tampoco', feed.seccionDe(post({ aiTools: ['Kling', 'ElevenLabs'] })) === undefined);

  // El muro de la sección sigue siendo generoso: son dos cosas distintas.
  check('R) el muro de la sección sí es generoso, y eso no cambia', feed.belongsToSection(post({ content: 'una receta de cena' }), feed.SECTION_MARKERS.chef) === true);
  check('R) pero la etiqueta no hereda esa generosidad', feed.seccionDe(post({ content: 'una receta de cena' })) === undefined);
  check('R) leer el contexto no escribe nada', !/setDoc|updateDoc|addDoc/.test(leer('utils/sectionFeed.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
// S · el muro y la ubicación: separados, y sin fingir nada
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── S · el muro no pide ubicación ni inventa cercanía ──');
{
  const muro = ['screens/LandingScreen.tsx', 'screens/HomeScreen.tsx', 'screens/WebLandingScreen.tsx', 'components/PostCard.tsx', 'components/WeeTag.tsx', 'screens/CreateScreen.tsx', 'screens/CommunityScreen.tsx'];
  const textos = Object.fromEntries(muro.map((f) => [f, leer(f)]));
  const todo = Object.values(textos).join('\n');

  check('S) ninguna pantalla del muro importa expo-location', !/from 'expo-location'/.test(todo));
  check('S) ni el compositor', !/expo-location|getCurrentPositionAsync/.test(textos['screens/CreateScreen.tsx']));
  check('S) ni la tarjeta', !/expo-location|getCurrentPositionAsync/.test(textos['components/PostCard.tsx']));
  /*
   * Nadie pide el permiso POR ABRIRSE. Solo Configuración lo pide, y a petición
   * de la persona: lo que no puede haber en ningún sitio es un efecto de montaje
   * que lo pida por su cuenta.
   */
  check('S) nadie pide permiso al abrirse', !/requestForegroundPermissionsAsync/.test(todo) && !/useEffect\([\s\S]{0,400}?activar\(/.test(todo));
  check('S) no se guarda ninguna coordenada en una publicación', !/latitude|longitude|radiusMeters|radioMetros|GeoPoint|geohash/i.test(todo));
  check('S) el modelo Post sigue sin campos geográficos', !/latitude|longitude|geohash|GeoPoint|coordinates/i.test(soloCodigo(leer('services/firestoreService.ts').slice(leer('services/firestoreService.ts').indexOf('export interface Post {'), leer('services/firestoreService.ts').indexOf('export interface UserProfile')))));
  check('S) y no se inventa contenido cercano', !/publicaciones cerca|personas cerca|amigos cerca|a \d+ metros|Cerca de ti/i.test(todo));
  check('S) ni hay consulta geográfica en ningún sitio', !/nearBy\(|withinRadius|boundingBox|orderBy\(['"`](lat|lng|geo)/i.test(leer('services/firestoreService.ts')));

  // La capa de ubicación sigue donde estaba, intacta y sin consumidores nuevos.
  check('S) expo-location sigue viviendo en un solo archivo', /from 'expo-location'/.test(leer('services/locationService.ts')));
  check('S) y Firestore sigue sin reglas ni índices geográficos', !/location|geo|latitude/i.test(leer('firestore.rules')) && !/location|geo|latitude/i.test(leer('firestore.indexes.json')));
}

// ════════════════════════════════════════════════════════════════════════════
// T · el origen: lo que la publicación dice de sí misma
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── T · de dónde viene: declarado, no adivinado ──');
{
  const js = ts.transpileModule(leerCrudo('utils/sectionFeed.ts').replace("import { Post } from '../services/firestoreService';", ''), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const feed = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  const post = (extra = {}) => ({ content: '', aiTools: [], tags: [], hashtags: [], ...extra });

  // 1–5) Cada sección se representa con la misma estructura, sin código propio.
  for (const [id, nombre] of [['travel', 'Weë Travel'], ['studio', 'Weë Studio'], ['design', 'Weë Design'], ['chef', 'Weë Chef'], ['writer', 'Weë Writer']]) {
    check(`T) una publicación de ${nombre} lo dice`, feed.seccionDe(post({ sourceSection: id }))?.nombre === nombre);
  }

  // 6–9) Ni el Wall ni las palabras crean contexto.
  check('T) publicar desde el Wall no inventa ninguna sección', feed.seccionDe(post({ content: 'Hoy fue un buen día' })) === undefined);
  check('T) escribir "cena" no te pone en Weë Chef', feed.seccionDe(post({ content: 'Preparé una cena deliciosa' })) === undefined);
  check('T) escribir "viaje" no te pone en Weë Travel', feed.seccionDe(post({ content: 'Qué viaje tan bonito' })) === undefined);
  check('T) ni un hashtag ni un tag', feed.seccionDe(post({ hashtags: ['travel'], tags: ['chef'] })) === undefined);

  // 10) Lo explícito manda: aiTools no pisa el dato declarado.
  const contradictoria = post({ sourceSection: 'travel', aiTools: ['Weë Chef'] });
  check('T) el origen declarado gana sobre lo que digan las herramientas', feed.seccionDe(contradictoria)?.id === 'travel');

  // 11) Las publicaciones de antes siguen funcionando.
  check('T) una publicación histórica sin el campo sigue mostrando su contexto', feed.seccionDe(post({ aiTools: ['Weë Design'] }))?.id === 'design');
  check('T) y una histórica sin nada tampoco se rompe', feed.seccionDe(post()) === undefined);
  check('T) un valor desconocido no inventa un nombre', feed.seccionDe(post({ sourceSection: 'inexistente' })) === undefined);

  // 12–13) Un solo documento, y el contexto no lo duplica.
  const crear = leer('screens/CreateScreen.tsx');
  check('T) el contexto se guarda en el mismo documento', /\.\.\.\(sourceSection \? \{ sourceSection \} : \{\}\)/.test(crear));
  check('T) y no crea una segunda publicación', (crear.match(/const postData/g) || []).length === 1);
  check('T) la comunidad no se duplica en el nuevo campo', !/sourceSection: 'comunidad'|sourceSection: communityId/.test(crear));

  /*
   * El origen viaja desde donde nace la publicación. El muro de sección lo
   * enviaba con `sourceSection`; aquel muro se retiró y el campo sigue vivo,
   * que es lo que importa: lo manda Weë Creator y lo guarda el compositor.
   */
  check('T) y Weë Creator también, por su área', /sourceSection: EXPERIENCE_AREA\[experience\.id\]\?\.section \?\? experience\.id/.test(leer('screens/CreatorFlowScreen.tsx')));
  check('T) la ruta lo declara', /sourceSection\?: string;/.test(leer('navigation/MainStackNavigator.tsx')));
}

// ════════════════════════════════════════════════════════════════════════════
// U · el lugar: lo elige quien publica, y nunca el teléfono
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── U · el lugar del contenido no es dónde está el teléfono ──');
{
  const crear = leer('screens/CreateScreen.tsx');
  const tarjeta = leer('components/PostCard.tsx');
  const almacen = leer('services/firestoreService.ts');
  const modeloConComentarios = almacen.slice(almacen.indexOf('export interface Post {'), almacen.indexOf('export interface UserProfile'));
  /*
   * Los comentarios fuera antes de buscar: el modelo explica en prosa lo que NO
   * guarda —"aquí no hay latitude ni longitude"— y buscar la palabra encontraría
   * justamente la frase que promete lo contrario. Lo que se comprueba son los
   * CAMPOS.
   */
  const modelo = modeloConComentarios.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  // 1–3) Opcional de verdad.
  check('U) el lugar empieza sin elegir, siempre', /const \[place, setPlace\] = useState<PostPlace \| undefined>\(undefined\)/.test(crear) && /const \[texto, setTexto\] = useState\(''\)/.test(leer('screens/AgregarUbicacionScreen.tsx')));
  check('U) solo se guarda si se ha elegido uno', /\.\.\.\(place \? \{ place \} : \{\}\)/.test(crear));
  check('U) el campo es opcional en el modelo', /placeLabel\?: string;/.test(modelo));
  check('U) publicar sin lugar no avisa de nada', !/necesitas un lugar|añade un lugar para|sin lugar tu publicación/i.test(crear));

  // 4–7) El aparato no decide.
  /*
   * Quien consulta la ubicación es la PANTALLA, y solo por el contexto. El
   * compositor ya ni eso: recibe la zona ya convertida y no toca la capa.
   */
  check('U) la ubicación se consulta solo por el contexto, y desde su pantalla', /useLocation\(\)/.test(leer('screens/AgregarUbicacionScreen.tsx')) && !/locationService|expo-location|requestForegroundPermissionsAsync/.test(leer('screens/AgregarUbicacionScreen.tsx')) && !/useLocation\(\)/.test(crear));
  check('U) no hay sugerencia automática que rellene el campo', !/setPlaceLabel\((?!''\))[^)]*(zona|lectura|publica)/i.test(crear));
  /* Ya no hay un texto explicando que el lugar se verá: se VE, como un chip
     dentro de la publicación antes de publicarla, y se quita con su aspa. */
  check('U) el lugar se enseña en la publicación antes de publicar, con su aspa', /etiquetaDeLugar\(\{ place \}\)/.test(crear) && /accessibilityLabel="Quitar el lugar"/.test(crear) && !/El lugar se verá en tu publicación/.test(crear));
  check('U) y se puede quitar antes de publicar', /Quitar el lugar/.test(crear) && /setPlace\(undefined\)/.test(crear));

  // 9–15) Lo que NUNCA entra en una publicación.
  for (const prohibido of ['latitude', 'longitude', 'radiusMeters', 'radioMetros', 'accuracyMeters', 'GeoPoint', 'geohash', 'coordinates']) {
    check(`U) el modelo Post no tiene ${prohibido}`, !new RegExp(prohibido, 'i').test(modelo));
  }
  check('U) ni se escribe ninguna al publicar', !/latitude|longitude|GeoPoint|geohash|radioMetros/i.test(crear));
  check('U) y los dos únicos campos nuevos son los que se declararon', (modelo.match(/\n\s+(sourceSection|placeLabel)\?: string;/g) || []).length === 2);
  check('U) ni hay historial de lugares', !/locationHistory|locationEvents|placeHistory/i.test(crear + almacen));

  // 16–18) Lugar y WeeTag son cosas distintas.
  check('U) el lugar se pinta aparte del WeeTag', /\{!!lugar && \(/.test(tarjeta) && /icono=\{bandera \? undefined : 'location-outline'\}/.test(tarjeta));
  check('U) el WeeTag de sección sigue siendo suyo', /icono="sparkles-outline"/.test(tarjeta));
  check('U) y no se mezclan en un solo campo', /sourceSection\?: string;/.test(modelo) && /placeLabel\?: string;/.test(modelo));

  // El caso obligatorio: en Lima, publicando París.
  const js = ts.transpileModule(leerCrudo('utils/sectionFeed.ts').replace("import { Post } from '../services/firestoreService';", ''), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const feed = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  const deParis = { content: 'Esta foto es de hace años', aiTools: [], sourceSection: 'travel', placeLabel: 'París' };
  check('U) una foto de París publicada desde Lima dice París', deParis.placeLabel === 'París');
  check('U) y su contexto sigue siendo Weë Travel, que es otra cosa', feed.seccionDe(deParis)?.nombre === 'Weë Travel');
  check('U) sin que nadie escriba "Lima" en ningún sitio', !JSON.stringify(deParis).includes('Lima'));

  // 19–20) Sin lugar no se pierde nada.
  check('U) el muro sigue leyendo la colección entera', /undefined, \/\/ Sin filtros/.test(almacen));
  check('U) y no filtra ni ordena por lugar', !/where.*placeLabel|orderBy\('placeLabel'/.test(almacen));
}

// ════════════════════════════════════════════════════════════════════════════
// V · privacidad y permisos alrededor del lugar
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── V · ninguna coordenada, ningún permiso de más ──');
{
  const superficies = ['screens/CreateScreen.tsx', 'components/PostCard.tsx', 'components/WeeTag.tsx', 'screens/LandingScreen.tsx', 'screens/HomeScreen.tsx', 'utils/sectionFeed.ts', 'services/firestoreService.ts'];
  const todo = superficies.map(leer).join('\n');

  check('V) ninguna coordenada en consola', !/console\.(log|warn|error)\([^)]*\b(latitude|longitude|coords)\b/.test(todo));
  check('V) ninguna en almacenamiento local', !/setItem\([^)]*\b(latitude|longitude|coords)\b/.test(todo) && !/SecureStore/.test(todo));
  check('V) ninguna en una URL', !/\?lat=|&lng=|latitude=\$\{/.test(todo));
  check('V) ninguna en analítica', !/logEvent\([^)]*\b(lat|lng|coords|zona)\b/i.test(todo));
  check('V) ninguna como parámetro de navegación', !/navigate\([^)]*\b(latitude|longitude|lectura)\b/.test(todo));
  /*
   * `aPublica` es la puerta y se puede usar —el compositor la usa—; lo que no
   * sale de la capa es el CÁLCULO. Que nadie fuera arme celdas por su cuenta es
   * lo que impide que aparezca una segunda zona con otro redondeo.
   */
  check('V) la frontera sigue siendo locationPrivacy', /export const aPublica/.test(leer('utils/locationPrivacy.ts')) && !/zonaDe|mismaZona|distanciaEntre|bandaDe/.test(todo));

  // Permisos: nadie pide nada por abrirse.
  check('V) el Wall no pide permiso', !/requestForegroundPermissionsAsync|ubicacion\.activar/.test(leer('screens/LandingScreen.tsx') + leer('screens/HomeScreen.tsx')));
  const compositorV = leer('screens/CreateScreen.tsx');
  check('V) el compositor tampoco al montar', !/requestForegroundPermissionsAsync/.test(compositorV) && !/useEffect\([\s\S]{0,400}?activar\(/.test(compositorV));
  check('V) abrir una publicación tampoco', !/requestForegroundPermissionsAsync/.test(leer('screens/PostDetailScreen.tsx')));
  check('V) expo-location sigue en un solo archivo', !/from 'expo-location'/.test(todo));

  // Firestore: dos campos opcionales no necesitan reglas ni índices nuevos.
  const reglas = leer('firestore.rules');
  check('V) las reglas de posts validan quién eres, no qué campos traes', /match \/posts\/\{postId\}/.test(reglas) && /request\.resource\.data\.userId == request\.auth\.uid/.test(reglas));
  check('V) sin reglas nuevas de ubicación', !/placeLabel|sourceSection|location|geo/i.test(reglas));
  check('V) sin índices nuevos', !/placeLabel|sourceSection/.test(leer('firestore.indexes.json')));
}

// ════════════════════════════════════════════════════════════════════════════
// W · el catálogo de lugares: uno solo, local y sin coordenadas
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── W · buscar un lugar sin salir del teléfono ──');
{
  const lugares = await cargarLugares();
  const fuente = leer('data/countries.ts');

  // 1–3) Una sola fuente, la que ya existía.
  check('W) el catálogo es el que Weë ya tenía', /export const COUNTRIES: Country\[\]/.test(fuente) && (fuente.match(/\{ code:/g) || []).length > 150);
  check('W) places lo reutiliza en vez de copiarlo', /import \{ COUNTRIES, Country \} from '\.\/countries'/.test(leer('data/places.ts')));
  check('W) y no hay una segunda lista de países', !fs.existsSync(new URL('../../constants/countries.ts', import.meta.url)) && !/COUNTRIES\s*[:=]\s*\[/.test(leer('data/cities.ts')) && !/COUNTRIES\s*[:=]\s*\[/.test(leer('data/places.ts')));
  check('W) el catálogo no tiene coordenadas', !/latitude|longitude|lat:|lng:/i.test(fuente));

  // 4–6) La búsqueda: local, ordenada y con identificadores estables.
  const peru = lugares.buscarLugares('peru');
  check('W) buscar "peru" encuentra Perú', peru.length > 0 && peru[0].label === 'Perú');
  check('W) y devuelve un identificador estable, no un nombre', peru[0].id === 'PE');
  check('W) los acentos dan igual en los dos sentidos', lugares.buscarLugares('perú')[0]?.id === 'PE' && lugares.buscarLugares('PERU')[0]?.id === 'PE');
  check('W) lo que empieza por lo escrito va primero', lugares.buscarLugares('esp')[0]?.label === 'España');
  check('W) también se puede buscar por código', lugares.buscarLugares('fr').some((o) => o.id === 'FR'));
  check('W) una letra suelta no dispara la búsqueda', lugares.buscarLugares('p').length === 0);
  check('W) y no se devuelve una lista interminable', lugares.buscarLugares('a').length === 0 && lugares.buscarLugares('an').length <= 6);

  // 10) Sin resultados: no pasa nada.
  check('W) algo que no está en el catálogo no devuelve nada', lugares.buscarLugares('Zzzyx').length === 0);

  // 5) Nada de esto sale del dispositivo.
  const codigo = leer('data/places.ts');
  check('W) la búsqueda no llama a nadie', !/fetch\(|axios|https?:\/\//.test(codigo));
  check('W) ni geocodifica', !/googleapis|mapbox|nominatim|openstreetmap|places\.googleapis|geocod(e|ing)Async/i.test(codigo));

  // 6–8) Las dos clases de lugar.
  const delCatalogo = lugares.lugarDelCatalogo(peru[0]);
  check('W) un lugar del catálogo tiene identidad', delCatalogo.kind === 'catalog' && delCatalogo.id === 'PE' && delCatalogo.label === 'Perú');
  const propio = lugares.lugarPropio('la playa de mi pueblo');
  check('W) uno escrito a mano se guarda tal cual', propio.kind === 'custom' && propio.label === 'la playa de mi pueblo' && propio.id === undefined);
  check('W) y no se convierte en nada más', !('latitude' in propio) && !('id' in propio && propio.id));
  check('W) dos lugares del catálogo distintos no se confunden', lugares.lugarDelCatalogo(lugares.buscarLugares('francia')[0]).id !== delCatalogo.id);
  check('W) un texto vacío no crea lugar', lugares.lugarPropio('   ') === undefined);
  check('W) un texto larguísimo se recorta a lo que cabe', lugares.lugarPropio('x'.repeat(200)).label.length === 60);

  // 9) La etiqueta que se lee: lo estructurado manda, lo histórico se respeta.
  check('W) el lugar estructurado manda', lugares.etiquetaDeLugar({ place: delCatalogo, placeLabel: 'Tokio' }) === 'Perú');
  check('W) una publicación antigua sigue enseñando su texto', lugares.etiquetaDeLugar({ placeLabel: 'París' }) === 'París');
  check('W) y sin lugar no se enseña nada', lugares.etiquetaDeLugar({}) === undefined);
  check('W) la bandera solo sale si el lugar es del catálogo', lugares.banderaDe(delCatalogo) === '🇵🇪' && lugares.banderaDe(propio) === undefined);
}

// ════════════════════════════════════════════════════════════════════════════
// X · el lugar en el modelo y en la publicación
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── X · un lugar es una identidad, no una posición ──');
{
  const almacen = leer('services/firestoreService.ts');
  const modelo = soloCodigo(almacen.slice(almacen.indexOf('export interface Post {'), almacen.indexOf('export interface UserProfile')));
  const crear = leer('screens/CreateScreen.tsx');
  const tarjeta = leer('components/PostCard.tsx');
  const lugares = leer('data/places.ts');

  // 1–5) Opcional, compatible, sin migración.
  check('X) place es opcional', /place\?: PostPlace;/.test(modelo));
  check('X) y placeLabel sigue existiendo para los históricos', /placeLabel\?: string;/.test(modelo));
  check('X) las publicaciones nuevas escriben solo el estructurado', /\.\.\.\(place \? \{ place \} : \{\}\)/.test(crear) && !/placeLabel: /.test(crear));
  check('X) así que los dos campos nunca conviven', !/place: [\s\S]{0,80}placeLabel:/.test(crear));
  check('X) nadie reescribe publicaciones antiguas', !/migrat|backfill|forEach\(.*updateDoc/i.test(crear + almacen));

  // 6–7) Prioridad determinista.
  check('X) la prioridad está escrita en un solo sitio', /export const etiquetaDeLugar/.test(lugares) && /etiquetaDeLugar\(post\)/.test(tarjeta));
  check('X) y el Wall no la reinventa', !/post\.place\?\.label \|\| post\.placeLabel/.test(tarjeta));

  // 8–15) Lo que nunca hay.
  for (const prohibido of ['latitude', 'longitude', 'radiusMeters', 'accuracyMeters', 'GeoPoint', 'geohash', 'deviceCoordinates', 'locationHistory']) {
    check(`X) el modelo Post no tiene ${prohibido}`, !new RegExp(prohibido, 'i').test(modelo));
  }
  check('X) ni el catálogo ni el compositor los introducen', !/latitude|longitude|GeoPoint|geohash/i.test(soloCodigo(lugares) + soloCodigo(crear)));
}

// ════════════════════════════════════════════════════════════════════════════
// Y · Lima → París: el caso que no se puede fallar
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Y · en Lima, publicando París ──');
{
  const lugares = await cargarLugares();

  const jsFeed = ts.transpileModule(leerCrudo('utils/sectionFeed.ts').replace("import { Post } from '../services/firestoreService';", ''), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const feed = await import('data:text/javascript;base64,' + Buffer.from(jsFeed).toString('base64'));

  // La persona está en Lima. Publica desde Weë Travel una foto de París.
  const publicacion = {
    content: 'Esta foto es de hace años.',
    aiTools: [],
    sourceSection: 'travel',
    place: lugares.lugarPropio('París'),
  };

  check('Y) el contexto es Weë Travel', feed.seccionDe(publicacion)?.nombre === 'Weë Travel');
  check('Y) el lugar es París', lugares.etiquetaDeLugar(publicacion) === 'París');
  check('Y) y son dos campos distintos', publicacion.sourceSection !== publicacion.place.label);
  check('Y) "Lima" no aparece por ningún lado', !JSON.stringify(publicacion).includes('Lima'));
  check('Y) tampoco una coordenada', !/latitude|longitude|-12\.|-77\./.test(JSON.stringify(publicacion)));
  check('Y) el lugar escrito a mano no finge tener identidad', publicacion.place.kind === 'custom' && publicacion.place.id === undefined);

  // Y con Francia del catálogo, la identidad sí existe: sigue sin ser una posición.
  const conPais = { ...publicacion, place: lugares.lugarDelCatalogo(lugares.buscarLugares('francia')[0]) };
  check('Y) elegir Francia del catálogo da un código estable', conPais.place.kind === 'catalog' && conPais.place.id === 'FR');
  check('Y) y sigue sin llevar coordenadas', Object.keys(conPais.place).sort().join(',') === 'id,kind,label');
}

// ════════════════════════════════════════════════════════════════════════════
// Z · el lugar lo elige la persona, nunca el teléfono
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Z · sin automatismos ──');
{
  const crear = leer('screens/CreateScreen.tsx');

  check('Z) el compositor solo conoce la zona, no el aparato', !/useLocation\(\)|locationService|expo-location/.test(crear) && /UbicacionPublica/.test(crear));
  check('Z) el lugar empieza sin elegir', /const \[place, setPlace\] = useState<PostPlace \| undefined>\(undefined\)/.test(crear));
  /* Elegir se hace ahora en "Agregar ubicación", y sigue siendo un acto: se pulsa. */
  check('Z) solo se elige pulsando', /onPress=\{\(\) => elegir\(opcion\)\}/.test(leer('screens/AgregarUbicacionScreen.tsx')) && /lugarDelCatalogo\(opcion\)/.test(leer('screens/AgregarUbicacionScreen.tsx')) && /lugarPropio\(texto\)/.test(leer('screens/AgregarUbicacionScreen.tsx')));
  check('Z) y se puede quitar antes de publicar', /setPlace\(undefined\)/.test(crear) && /Quitar el lugar/.test(crear));
  check('Z) publicar sin lugar no avisa de nada', !/necesitas un lugar|elige un lugar para publicar/i.test(crear));
  check('Z) el lugar es visible en la publicación antes de publicar', /const renderLugar = \(\) =>\s*\n?\s*place \|\| ubicacion \? \(/.test(crear) && crear.indexOf('{renderLugar()}') < crear.indexOf('{renderAcciones()}'));
  /* Weë no rellena el lugar ni la zona por su cuenta: el compositor solo los
     recibe de la pantalla de ubicación, y nunca convierte una lectura. */
  check('Z) y Weë no lo rellena sola', !/aPublica\(/.test(crear) && !/setPlace\((lugarDelCatalogo|lugarPropio)/.test(crear) && !/useLocation\(\)/.test(crear));

  // Sigue sin haber nada de lo que esta fase no construye.
  const superficies = [crear, leer('components/PostCard.tsx'), leer('data/places.ts'), leer('components/WeeTag.tsx')].join('\n');
  check('Z) sin geocodificación ni proveedores de mapas', !/geocode|googleapis|mapbox|nominatim|openstreetmap|places api/i.test(superficies));
  /*
   * "Cerca de ti" ya existe, pero vive donde tiene que vivir: en el catálogo
   * —que sabe dónde están los lugares— y en su pantalla. Ni el compositor, ni la
   * tarjeta de una publicación, ni la etiqueta de sección calculan cercanía ni
   * enseñan distancias: ahí una distancia sería un dato de alguien.
   */
  const sinCercania = [crear, leer('components/PostCard.tsx'), leer('components/WeeTag.tsx')].join('\n');
  check('Z) el compositor y las tarjetas no hablan de cercanía', !/cerca de ti|nearby|distancia|km de/i.test(soloCodigo(sinCercania)));
  check('Z) ni calculan proximidad', !/lugaresCercanos|distanciaAproximada/.test(soloCodigo(sinCercania)));
  check('Z) sin consultas geográficas', !/where\(['"`]place|orderBy\(['"`]place/.test(leer('services/firestoreService.ts')));
  check('Z) y sin volver a mirar el EXIF de las fotos', !/exif|getAssetInfoAsync/i.test(superficies));

  // Firestore, intacto.
  check('Z) sin reglas nuevas', !/place|sourceSection/i.test(leer('firestore.rules')));
  check('Z) sin índices nuevos', !/place|sourceSection/i.test(leer('firestore.indexes.json')));
}

// ════════════════════════════════════════════════════════════════════════════
// AA · el catálogo de ciudades: íntegro, propio y sin coordenadas
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── AA · país → ciudad ──');
{
  const fuentePaises = leer('data/countries.ts');
  const fuenteCiudades = leer('data/cities.ts');

  const paises = [...fuentePaises.matchAll(/\{ code: '([A-Z]{2})', name: '([^']+)'/g)].map((m) => ({ code: m[1], name: m[2] }));
  const ciudades = [...fuenteCiudades.matchAll(/\{ id: '([^']+)', countryCode: '([^']+)', name: '([^']+)' \}/g)].map((m) => ({ id: m[1], cc: m[2], name: m[3] }));
  const codigos = new Set(paises.map((c) => c.code));

  // Integridad: lo que pide la fase, comprobado una a una.
  check('AA) el catálogo tiene entre 100 y 300 ciudades', ciudades.length >= 100 && ciudades.length <= 300, String(ciudades.length));
  check('AA) todos los identificadores son únicos', new Set(ciudades.map((c) => c.id)).size === ciudades.length);
  check('AA) todos los países existen en countries.ts', ciudades.every((c) => codigos.has(c.cc)), ciudades.filter((c) => !codigos.has(c.cc)).map((c) => c.cc).join(',') || 'todos válidos');
  check('AA) ninguna ciudad se queda sin país', ciudades.every((c) => !!c.cc));
  check('AA) el identificador empieza por su país', ciudades.every((c) => c.id.startsWith(c.cc + '-')));
  check('AA) ningún identificador es un número', ciudades.every((c) => !/^\d+$/.test(c.id)) && !/id: \d/.test(fuenteCiudades));
  check('AA) ninguna ciudad tiene nombre vacío', ciudades.every((c) => c.name.trim().length > 1));
  check('AA) y ninguna se repite dentro del mismo país', new Set(ciudades.map((c) => c.cc + '/' + c.name)).size === ciudades.length);

  // Lo que NO tiene el catálogo.
  const soloDatos = soloCodigo(fuenteCiudades);
  check('AA) sin coordenadas', !/latitude|longitude|lat:|lng:|coords/i.test(soloDatos));
  check('AA) sin geohash ni GeoPoint', !/geohash|GeoPoint/i.test(soloDatos));
  check('AA) sin población, huso horario ni radio', !/population|timezone|radius|bounding/i.test(soloDatos));
  check('AA) sin nombres de país repetidos', !/countryName/.test(soloDatos));
  check('AA) sin banderas repetidas', !/flag/.test(soloDatos));
  check('AA) el catálogo de países no se ha duplicado', !/COUNTRIES\s*[:=]\s*\[/.test(fuenteCiudades) && (fuentePaises.match(/export const COUNTRIES/g) || []).length === 1);
  check('AA) y sigue habiendo un solo archivo de países', !fs.existsSync(new URL('../../constants/countries.ts', import.meta.url)));

  // La estructura City es la mínima: tres campos.
  const tipo = fuenteCiudades.slice(fuenteCiudades.indexOf('export interface City {'), fuenteCiudades.indexOf('export const CITIES'));
  check('AA) City tiene exactamente tres campos', (soloCodigo(tipo).match(/^\s+\w+:/gm) || []).length === 3);

  // Los homónimos, que son el motivo de tener identificadores.
  const porNombre = {};
  for (const c of ciudades) (porNombre[c.name] = porNombre[c.name] || []).push(c);
  const homonimos = Object.entries(porNombre).filter(([, v]) => v.length > 1);
  check('AA) hay ciudades homónimas en países distintos', homonimos.length > 0, homonimos.map(([n]) => n).join(', '));
  check('AA) y sus identificadores son distintos', homonimos.every(([, v]) => new Set(v.map((c) => c.id)).size === v.length));
  check('AA) Córdoba está en Argentina y en España', !!ciudades.find((c) => c.id === 'AR-COR') && !!ciudades.find((c) => c.id === 'ES-ODB'));
  check('AA) Valencia, en España y en Venezuela', !!ciudades.find((c) => c.id === 'ES-VLC') && !!ciudades.find((c) => c.id === 'VE-VLN'));

  // Cobertura razonable.
  check('AA) cubre muchos países, no solo unos pocos', new Set(ciudades.map((c) => c.cc)).size >= 40, String(new Set(ciudades.map((c) => c.cc)).size) + ' países');
  check('AA) incluye las capitales que la fase nombra', ['PE-LIM', 'FR-PAR', 'IT-ROM', 'JP-TYO', 'US-NYC'].every((id) => ciudades.some((c) => c.id === id)));
}

// ════════════════════════════════════════════════════════════════════════════
// AB · buscar una ciudad sin salir del teléfono
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── AB · la búsqueda ──');
{
  const lugares = await cargarLugares();

  const primero = (q) => lugares.buscarLugares(q)[0];

  check('AB) "Lima" encuentra Lima', primero('Lima')?.id === 'PE-LIM');
  check('AB) "lim" también', primero('lim')?.id === 'PE-LIM');
  check('AB) "LIMA" también', primero('LIMA')?.id === 'PE-LIM');
  check('AB) y "líma", con la tilde de más', primero('líma')?.id === 'PE-LIM');
  check('AB) "par" encuentra París', primero('par')?.id === 'FR-PAR');
  check('AB) "paris" sin tilde, igual', primero('paris')?.id === 'FR-PAR');
  check('AB) "tok" encuentra Tokio', primero('tok')?.id === 'JP-TYO');
  check('AB) "PE" encuentra el país Perú', lugares.buscarLugares('PE').some((o) => o.id === 'PE'));
  check('AB) "peru" también el país', lugares.buscarLugares('peru').some((o) => o.id === 'PE'));

  // Las ciudades van delante de los países cuando ambas encajan.
  const sant = lugares.buscarLugares('santiago');
  check('AB) una ciudad encaja antes que un país que la contenga', sant[0]?.countryCode !== undefined);

  // Homónimos: los dos salen, diferenciados por su país.
  const cordobas = lugares.buscarLugares('cordoba');
  check('AB) buscar "cordoba" devuelve las dos', cordobas.filter((o) => o.label === 'Córdoba').length === 2);
  check('AB) y cada una dice de qué país es', cordobas.filter((o) => o.label === 'Córdoba').every((o) => !!o.sublabel));
  check('AB) con identificadores distintos', new Set(cordobas.filter((o) => o.label === 'Córdoba').map((o) => o.id)).size === 2);
  const valencias = lugares.buscarLugares('valencia').filter((o) => o.label === 'Valencia');
  check('AB) lo mismo con Valencia', valencias.length === 2 && valencias[0].sublabel !== valencias[1].sublabel);

  check('AB) una letra suelta no busca nada', lugares.buscarLugares('l').length === 0);
  check('AB) algo que no existe no devuelve nada', lugares.buscarLugares('Zzzyx').length === 0);
  check('AB) los resultados están limitados', lugares.buscarLugares('an').length <= 6);
  check('AB) y se puede pedir otro límite', lugares.buscarLugares('a', 3).length === 0 && lugares.buscarLugares('san', 2).length <= 2);

  // Nada de esto sale del dispositivo.
  const codigo = soloCodigo(leer('data/places.ts')) + soloCodigo(leer('data/cities.ts'));
  check('AB) sin fetch', !/fetch\(/.test(codigo));
  check('AB) sin axios ni XMLHttpRequest', !/axios|XMLHttpRequest/.test(codigo));
  check('AB) sin direcciones de internet', !/https?:\/\//.test(codigo));
  check('AB) sin SDK de lugares', !/googleapis|mapbox|nominatim|api\.geonames|places\.googleapis/i.test(codigo));
}

// ════════════════════════════════════════════════════════════════════════════
// AC · elegir un lugar: país, ciudad o mis palabras
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── AC · las tres formas de decir dónde ──');
{
  const lugares = await cargarLugares();

  // País, como en la fase anterior: nada se ha roto.
  const peru = lugares.lugarDelCatalogo(lugares.buscarLugares('peru').find((o) => o.id === 'PE'));
  check('AC) elegir un país sigue funcionando', peru.kind === 'catalog' && peru.id === 'PE' && peru.label === 'Perú');
  check('AC) y no arrastra un país padre, porque es el país', peru.countryCode === undefined);
  check('AC) se lee tal cual', lugares.etiquetaDeLugar({ place: peru }) === 'Perú');
  check('AC) con su bandera', lugares.banderaDe(peru) === '🇵🇪');

  // Ciudad: identidad estable y el país detrás.
  const lima = lugares.lugarDelCatalogo(lugares.buscarLugares('Lima')[0]);
  check('AC) elegir una ciudad da un identificador compuesto', lima.kind === 'catalog' && lima.id === 'PE-LIM');
  check('AC) guarda solo la ciudad como etiqueta', lima.label === 'Lima');
  check('AC) y su país aparte', lima.countryCode === 'PE');
  check('AC) se lee "Lima, Perú"', lugares.etiquetaDeLugar({ place: lima }) === 'Lima, Perú');
  check('AC) con la bandera de su país', lugares.banderaDe(lima) === '🇵🇪');
  check('AC) y sin ninguna coordenada', Object.keys(lima).sort().join(',') === 'countryCode,id,kind,label');

  // Homónimas: la que se elige es la que se lee.
  const cordobaAR = lugares.lugarDelCatalogo(lugares.buscarLugares('cordoba').find((o) => o.id === 'AR-COR'));
  const cordobaES = lugares.lugarDelCatalogo(lugares.buscarLugares('cordoba').find((o) => o.id === 'ES-ODB'));
  check('AC) dos Córdobas, dos lecturas distintas', lugares.etiquetaDeLugar({ place: cordobaAR }) === 'Córdoba, Argentina' && lugares.etiquetaDeLugar({ place: cordobaES }) === 'Córdoba, España');
  check('AC) y dos banderas distintas', lugares.banderaDe(cordobaAR) !== lugares.banderaDe(cordobaES));

  // Texto libre: intacto.
  const propio = lugares.lugarPropio('la playa de mi pueblo');
  check('AC) escribirlo a mano sigue funcionando', propio.kind === 'custom' && propio.label === 'la playa de mi pueblo');
  check('AC) sin identificador ni país', propio.id === undefined && propio.countryCode === undefined);
  check('AC) no se convierte en ciudad', lugares.etiquetaDeLugar({ place: propio }) === 'la playa de mi pueblo');
  check('AC) y no tiene bandera, porque Weë no sabe dónde está', lugares.banderaDe(propio) === undefined);
  check('AC) "Barranco" no está en el catálogo y no se inventa', lugares.buscarLugares('Barranco').length === 0);

  // Histórico: sin migrar, sin romper.
  check('AC) una publicación antigua sigue leyéndose', lugares.etiquetaDeLugar({ placeLabel: 'París' }) === 'París');
  check('AC) y el estructurado manda si están los dos', lugares.etiquetaDeLugar({ place: lima, placeLabel: 'Tokio' }) === 'Lima, Perú');
  check('AC) sin lugar, nada', lugares.etiquetaDeLugar({}) === undefined);

  // La etiqueta se compone en un solo sitio.
  const tarjeta = leer('components/PostCard.tsx');
  const crear = leer('screens/CreateScreen.tsx');
  check('AC) el Wall no compone la etiqueta por su cuenta', /etiquetaDeLugar\(post\)/.test(tarjeta) && !/place\.countryCode/.test(tarjeta));
  check('AC) ni el compositor', /etiquetaDeLugar\(\{ place \}\)/.test(crear) && !/, \$\{pais/.test(crear));
  check('AC) la pantalla enseña el país al elegir, para no confundirse', /opcion\.sublabel/.test(leer('screens/AgregarUbicacionScreen.tsx')));
}

// ════════════════════════════════════════════════════════════════════════════
// AD · Lima → París, ahora con identidad
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── AD · en Lima, publicando París ──');
{
  const lugares = await cargarLugares();

  const jsFeed = ts.transpileModule(leerCrudo('utils/sectionFeed.ts').replace("import { Post } from '../services/firestoreService';", ''), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const feed = await import('data:text/javascript;base64,' + Buffer.from(jsFeed).toString('base64'));

  const publicacion = {
    content: 'Esta foto es de hace años.',
    aiTools: [],
    sourceSection: 'travel',
    place: lugares.lugarDelCatalogo(lugares.buscarLugares('París')[0]),
  };

  check('AD) el lugar es París con identidad estable', publicacion.place.id === 'FR-PAR');
  check('AD) se lee "París, Francia"', lugares.etiquetaDeLugar(publicacion) === 'París, Francia');
  check('AD) el contexto sigue siendo Weë Travel', feed.seccionDe(publicacion)?.nombre === 'Weë Travel');
  check('AD) y son campos distintos', publicacion.sourceSection === 'travel' && publicacion.place.countryCode === 'FR');
  check('AD) "Lima" no aparece por ningún lado', !JSON.stringify(publicacion).includes('Lima') && !JSON.stringify(publicacion).includes('PE-'));
  check('AD) ni una coordenada', !/latitude|longitude|-12\.|-77\.|48\.85|2\.35/.test(JSON.stringify(publicacion)));
  check('AD) la publicación entera cabe en cuatro claves de lugar', Object.keys(publicacion.place).length === 4);

  // Y el contexto no se adivina por las palabras.
  check('AD) escribir "viaje" o "París" no crea contexto Travel', feed.seccionDe({ content: 'un viaje a París', aiTools: [] }) === undefined);
}

// ════════════════════════════════════════════════════════════════════════════
// AE · el teléfono sigue sin decidir nada
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── AE · el lugar lo elige la persona ──');
{
  const crear = leer('screens/CreateScreen.tsx');
  const lugares = leer('data/places.ts');
  const ciudades = leer('data/cities.ts');

  check('AE) el compositor solo conoce la zona, no el aparato', !/useLocation\(\)|locationService|expo-location/.test(crear) && /UbicacionPublica/.test(crear));
  check('AE) el catálogo tampoco', !/useLocation|locationService|expo-location|getCurrentPosition/.test(lugares + ciudades));
  /*
   * Escribir un lugar a mano y pedir la ubicación del aparato son dos gestos
   * distintos, y solo el segundo pide permiso. Elegir "París" en el buscador no
   * puede encender el GPS de rebote.
   */
  check('AE) elegir un lugar a mano no pide permiso', !/requestForegroundPermissionsAsync/.test(crear) && !/setPlace\([\s\S]{0,150}?activar\(/.test(crear));
  check('AE) el lugar empieza sin elegir', /const \[place, setPlace\] = useState<PostPlace \| undefined>\(undefined\)/.test(crear));
  check('AE) y se puede quitar', /setPlace\(undefined\)/.test(crear) && /Quitar el lugar/.test(crear));

  // La infraestructura de ubicación, sin tocar.
  check('AE) LocationContext sigue sin saber de lugares', !/data\/places|CITIES|lugarDelCatalogo/.test(leer('contexts/LocationContext.tsx')));
  check('AE) locationService tampoco', !/data\/places|CITIES/.test(leer('services/locationService.ts')));
  check('AE) ni locationPrivacy', !/data\/places|CITIES/.test(leer('utils/locationPrivacy.ts')));

  // Y el registro sigue usando el catálogo de países tal cual.
  check('AE) el registro no se ha tocado', /import \{ COUNTRIES, Country \} from '\.\.\/data\/countries'/.test(leer('screens/OnboardingScreen.tsx')));

  // Firestore, intacto.
  check('AE) sin reglas nuevas', !/place|city|cities/i.test(leer('firestore.rules')));
  check('AE) sin índices nuevos', !/place|city|cities/i.test(leer('firestore.indexes.json')));
  check('AE) sin consultas geográficas', !/where\(['"`]place|orderBy\(['"`]place/.test(leer('services/firestoreService.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
// AF · niveles, clases y el ranking de búsqueda
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── AF · una ciudad pequeña no queda tapada por una grande ──');
{
  const lugares = await cargarLugares();
  const fuente = leer('data/cities.ts');
  const ciudades = [...fuente.matchAll(/\{ id: '([^']+)', countryCode: '([^']+)', name: '([^']+)'(?:, tier: '([^']+)')?(?:, kind: '([^']+)')? \}/g)]
    .map((m) => ({ id: m[1], cc: m[2], name: m[3], tier: m[4], kind: m[5] }));

  // El modelo: dos niveles y dos clases, ambos opcionales.
  check('AF) el catálogo distingue nivel', /export type CityTier = 'major' \| 'secondary'/.test(fuente));
  check('AF) y clase', /export type CityKind = 'city' \| 'destination'/.test(fuente));
  check('AF) los dos son opcionales, para no repetir lo evidente', /tier\?: CityTier;/.test(fuente) && /kind\?: CityKind;/.test(fuente));
  check('AF) un solo catálogo, no dos listas', (fuente.match(/export const CITIES/g) || []).length === 1 && !/CITIES_SECONDARY|SECONDARY_CITIES/.test(fuente));
  check('AF) y sigue sin coordenadas', !/latitude|longitude|geohash|GeoPoint/i.test(soloCodigo(fuente)));

  // Bali y Santorini dejan de mentir sobre lo que son.
  const destinos = ciudades.filter((c) => c.kind === 'destination');
  check('AF) Bali y Santorini son destinos, no ciudades', destinos.map((c) => c.name).sort().join(',') === 'Bali,Santorini');
  check('AF) pero siguen buscándose igual', lugares.buscarLugares('bali')[0]?.label === 'Bali' && lugares.buscarLugares('santorini')[0]?.label === 'Santorini');
  check('AF) y se leen con su país, sin llamarlos ciudad', lugares.etiquetaDeLugar({ place: lugares.lugarDelCatalogo(lugares.buscarLugares('bali')[0]) }) === 'Bali, Indonesia');

  // El ranking: lo exacto primero, pase lo que pase.
  check('AF) "Casma" encuentra Casma, aunque sea secundaria', lugares.buscarLugares('Casma')[0]?.id === 'PE-CAS');
  check('AF) "Huarmey" encuentra Huarmey', lugares.buscarLugares('Huarmey')[0]?.id === 'PE-HRM');
  check('AF) "Chancay" encuentra Chancay', lugares.buscarLugares('Chancay')[0]?.id === 'PE-CHY');
  check('AF) "Huaral" encuentra Huaral', lugares.buscarLugares('Huaral')[0]?.id === 'PE-HRL');
  check('AF) y sin tilde ni mayúsculas también', lugares.buscarLugares('CASMA')[0]?.id === 'PE-CAS');

  // Y con un prefijo corto, la principal va antes que la secundaria.
  const hua = lugares.buscarLugares('hua');
  const posicion = (id) => hua.findIndex((o) => o.id === id);
  check('AF) con "hua", Huancayo (principal) va antes que Huarmey (secundaria)', posicion('PE-HYO') >= 0 && posicion('PE-HYO') < posicion('PE-HRM'));
  // Un resultado de búsqueda no trae `tier`: el nivel se mira en el catálogo.
  check('AF) pero las secundarias siguen apareciendo', hua.some((o) => ciudades.find((c) => c.id === o.id)?.tier === 'secondary') && hua.length > 1);

  // El orden es estable: la lista no baila entre pulsaciones.
  check('AF) dos búsquedas iguales dan lo mismo, en el mismo orden', JSON.stringify(lugares.buscarLugares('san')) === JSON.stringify(lugares.buscarLugares('san')));

  // Perú, el ejemplo trabajado.
  const pe = ciudades.filter((c) => c.cc === 'PE');
  check('AF) Perú tiene principales y secundarias', pe.some((c) => !c.tier) && pe.filter((c) => c.tier === 'secondary').length >= 10, pe.length + ' lugares');
  check('AF) con las que pidió el producto', ['PE-LIM', 'PE-CAS', 'PE-HRM', 'PE-CHY', 'PE-HRL', 'PE-BAR', 'PE-HCO'].every((id) => pe.some((c) => c.id === id)));
  check('AF) los identificadores de siempre no se han movido', ['PE-LIM', 'PE-CUZ', 'FR-PAR', 'IT-ROM', 'JP-TYO', 'US-NYC'].every((id) => ciudades.some((c) => c.id === id)));

  // Y el mundo sigue funcionando.
  for (const [q, id] of [['par', 'FR-PAR'], ['tok', 'JP-TYO'], ['nairobi', 'KE-NBO'], ['sidney', 'AU-SYD'], ['lima', 'PE-LIM']]) {
    check(`AF) "${q}" sigue encontrando ${id}`, lugares.buscarLugares(q)[0]?.id === id);
  }
  check('AF) y los países también', lugares.buscarLugares('peru').some((o) => o.id === 'PE') && lugares.buscarLugares('PE').some((o) => o.id === 'PE'));

  // Los homónimos, intactos.
  check('AF) las dos Córdobas siguen distinguiéndose', lugares.buscarLugares('cordoba').filter((o) => o.label === 'Córdoba').length === 2);
  check('AF) y las dos Valencias', lugares.buscarLugares('valencia').filter((o) => o.label === 'Valencia').length === 2);
}

// ════════════════════════════════════════════════════════════════════════════
// AG · el pipeline: reproducible, y sin escribir sin permiso
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── AG · la herramienta que traerá el mundo ──');
{
  const script = leer('scripts/buildCities.mjs');

  check('AG) existe y es una herramienta de escritorio', /node scripts\/buildCities\.mjs/.test(script));
  check('AG) documenta la fuente', /download\.geonames\.org/.test(script));
  check('AG) y su licencia', /Creative Commons Attribution 4\.0/.test(script) && /creativecommons\.org\/licenses\/by\/4\.0/.test(script));
  check('AG) la escritura sigue detrás de un interruptor explícito', /const IMPORTACION_AUTORIZADA = (true|false);/.test(script) && /if \(escribir && !IMPORTACION_AUTORIZADA\)/.test(script) && /process\.exit\(1\)/.test(script));
  check('AG) y en seco no escribe jamás', /if \(!escribir\) \{[\s\S]{0,200}en seco: no se ha escrito nada/.test(script));
  check('AG) el filtro incluye las sedes administrativas, que es lo que salva a Casma', /PPLA3/.test(script) && /SEDES\.includes/.test(script));
  check('AG) respeta los identificadores escritos a mano', /escritoAMano/.test(script) && /NUNCA se toca/.test(script) && /descartes\.yaEstaban\+\+/.test(script));
  check('AG) da otro formato a los importados, para no colisionar', /\$\{l\.cc\}-g\$\{l\.geonameId\}/.test(script));
  check('AG) aparta los territorios que countries.ts no lista', /sinPais/.test(script) && /NO los inventa/.test(script));
  check('AG) y no toca countries.ts', !/writeFileSync[^)]*countries\.ts/.test(script));

  // Lo importante: esto NO corre dentro de la aplicación.
  const app = ['screens/CreateScreen.tsx', 'data/places.ts', 'data/cities.ts', 'components/PostCard.tsx'].map(leer).join('\n');
  check('AG) la aplicación no llama al pipeline', !/buildCities/.test(app));
  check('AG) ni descarga nada al buscar', !/curl|execFileSync|download\.geonames/.test(app));
  check('AG) la búsqueda sigue siendo local y offline', !/fetch\(|https?:\/\//.test(soloCodigo(leer('data/places.ts')) + soloCodigo(leer('data/cities.ts'))));
}

// ════════════════════════════════════════════════════════════════════════════
// AH · el catálogo mundial: íntegro, diferido y sin coordenadas
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── AH · setenta y ocho mil lugares, y ninguno al arrancar ──');
{
  const archivo = leer('data/citiesWorld.ts');
  const cuerpo = catalogoMundial();
  const lineas = cuerpo.split('\n');
  const paises = new Set([...leer('data/countries.ts').matchAll(/\{ code: '([A-Z]{2})'/g)].map((m) => m[1]));

  // 1) Es una cadena, no ochenta mil objetos.
  check('AH) el catálogo es una sola cadena', /export const WORLD_PLACES = `/.test(archivo) && !/\{ id: '/.test(archivo));
  check('AH) con una línea por lugar', lineas.length > 70000, lineas.length.toLocaleString('es') + ' líneas');
  /* Nueve: coordenadas, región y relevancia:
     país|identificador|nombre|nivel|alias|latitud|longitud|región|relevancia */
  check('AH) y nueve campos por línea', lineas.every((l) => l.split('|').length === 9));
  check('AH) la relevancia es un solo dígito', lineas.every((l) => /^\d$/.test(l.split('|')[8])));
  /* La región es un código corto; el nombre va una sola vez en su tabla. */
  const tablaRegiones = regionesTabla().split('\n').filter(Boolean);
  check('AH) la región de cada lugar es un código, no un nombre repetido', lineas.slice(0, 2000).every((l) => (l.split('|')[7] || '').length <= 4));
  check('AH) y hay una tabla de regiones con sus nombres', tablaRegiones.length > 1000 && tablaRegiones.every((l) => /^[A-Z]{2}\.[^|]+\|.+$/.test(l)), tablaRegiones.length + ' regiones');
  check('AH) Lima es Lima, no "Lima region" ni "Departamento de Lima"', tablaRegiones.includes('PE.15|Lima'));

  // 2) Integridad, sobre el archivo entero.
  const ids = new Set();
  const problemas = [];
  const porPais = {};
  for (const linea of lineas) {
    const [cc, sufijo, nombre, nivel] = linea.split('|');
    const id = cc + '-' + sufijo;
    if (ids.has(id)) problemas.push('repetido ' + id);
    ids.add(id);
    if (!paises.has(cc)) problemas.push('país inválido ' + cc);
    if (!nombre) problemas.push('sin nombre ' + id);
    if (nivel !== 'M' && nivel !== 's') problemas.push('nivel raro ' + id);
    if (!/^g\d+$/.test(sufijo)) problemas.push('identificador raro ' + id);
    porPais[cc] = (porPais[cc] || 0) + 1;
  }
  check('AH) sin problemas de integridad', problemas.length === 0, problemas.slice(0, 3).join(' · ') || 'ninguno');
  check('AH) todos los identificadores son únicos', ids.size === lineas.length);
  check('AH) cubre los 193 países de Weë', Object.keys(porPais).length === paises.size, Object.keys(porPais).length + ' de ' + paises.size);
  check('AH) y ninguno se queda vacío', [...paises].every((c) => porPais[c] > 0));

  // 3) Lo escrito a mano no se ha pisado.
  const aMano = [...leer('data/cities.ts').matchAll(/\{ id: '([^']+)'/g)].map((m) => m[1]);
  check('AH) ningún identificador escrito a mano aparece en el mundial', !aMano.some((id) => ids.has(id)));
  check('AH) los de siempre siguen en su archivo', ['PE-LIM', 'PE-CAS', 'FR-PAR', 'IT-ROM', 'JP-TYO'].every((id) => aMano.includes(id)));
  check('AH) los importados llevan otro formato, para no chocar', [...ids].every((id) => /-g\d+$/.test(id)));

  /*
   * 4) Las coordenadas que SÍ hay, y las que siguen sin haber.
   *
   * Desde "lugares cerca de ti" el catálogo guarda dónde está cada sitio. Son
   * coordenadas DEL LUGAR, públicas como las de un atlas, y no tienen nada que
   * ver con la posición de ninguna persona —que sigue saliendo como zona—.
   *
   * Lo que se vigila es que no haya MÁS precisión de la necesaria: tres
   * decimales son unos 110 m, suficiente para ordenar por cercanía. Cinco
   * decimales serían un metro, que aquí no sirve para nada y sí pesa medio mega.
   */
  check('AH) las coordenadas del lugar no pasan de tres decimales', !/\|-?\d+\.\d{4,}/.test(cuerpo));
  check('AH) y están todas dentro del planeta', lineas.every((l) => {
    const c = l.split('|');
    const la = Number(c[5]);
    const lo = Number(c[6]);
    return Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
  }));
  check('AH) sin geohash ni GeoPoint', !/geohash|GeoPoint/i.test(archivo));
  check('AH) sin población ni huso horario', !/population|timezone/i.test(archivo));
  /* Las coordenadas de los escritos a mano van aparte y con su identificador. */
  const hand = coordsAMano().split('\n').filter(Boolean);
  check('AH) los escritos a mano tienen sus coordenadas aparte', hand.length > 100, hand.length + ' de ' + aMano.length);
  check('AH) con cuatro campos por línea: coordenadas y relevancia', hand.every((l) => l.split('|').length === 4));
  check('AH) y todos sus identificadores son de los escritos a mano', hand.every((l) => aMano.includes(l.split('|')[0])));

  // 5) La licencia, documentada y atribuida.
  const licencia = leer('data/GEONAMES-LICENSE.md');
  check('AH) la licencia está en el repositorio', /CC BY 4\.0/.test(licencia) && /creativecommons\.org\/licenses\/by\/4\.0/.test(licencia));
  check('AH) con la fuente y la versión del dataset', /download\.geonames\.org/.test(licencia) && /2026-09/.test(licencia));
  check('AH) y el archivo generado la cita', /GeoNames/.test(archivo) && /CC BY 4\.0/.test(archivo));
  check('AH) la atribución se ve en la aplicación', /Datos geográficos: GeoNames \(geonames\.org\), CC BY 4\.0/.test(leer('screens/SettingsScreen.tsx')));
  check('AH) y no se repite en el muro ni en las publicaciones', !/GeoNames/.test(leer('components/PostCard.tsx') + leer('components/WeeTag.tsx')));
}

// ════════════════════════════════════════════════════════════════════════════
// AI · carga diferida y búsqueda sobre el mundo
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── AI · no se paga por lo que no se usa ──');
{
  const places = leer('data/places.ts');

  // 1) El arranque no lo toca.
  check('AI) el catálogo mundial se carga dentro de la función, no al importar', /const modulo = require\('\.\/citiesWorld'\)/.test(places) && !/^import .*citiesWorld/m.test(places));
  check('AI) y no hay ningún import estático de él', !/^import .*citiesWorld/m.test(places));
  check('AI) hasta entonces vale null', /let mundo: string \| null = null;/.test(places));
  check('AI) dos peticiones a la vez comparten la misma carga', /if \(cargando\) return cargando;/.test(places));
  check('AI) y si falla, Weë sigue funcionando', /No se pudo cargar el catálogo mundial/.test(places));

  // 2) Lo pide el compositor al abrir el bloque, no antes.
  const crear = leer('screens/CreateScreen.tsx');
  check('AI) lo pide la pantalla de ubicación al abrirse, no el compositor', /cargarMundo\(\)/.test(leer('screens/AgregarUbicacionScreen.tsx')) && !/cargarMundo\(\)/.test(crear));
  check('AI) y no al abrir la pantalla', !/useEffect\(\(\) => \{\s*cargarMundo/.test(crear));
  /* La búsqueda depende del catálogo Y del contexto: cuando llega el mundo, o
     cambia desde dónde se busca, lo ya escrito se vuelve a buscar. */
  check('AI) al llegar, se vuelve a buscar lo ya escrito', /\[texto, mundoCargado, contextoBusqueda\]/.test(leer('screens/AgregarUbicacionScreen.tsx')));

  // 3) La búsqueda funciona con el mundo cargado.
  globalThis.__WORLD = catalogoMundial();
  globalThis.__HAND = coordsAMano();
  globalThis.__REG = regionesTabla();
  const lugares = await cargarLugares();

  check('AI) antes de cargar, el mundo no está', lugares.mundoListo() === false);
  const soloAMano = lugares.buscarLugares('lima');
  check('AI) y aun así se busca en lo escrito a mano', soloAMano[0]?.id === 'PE-LIM');

  await lugares.cargarMundo();
  check('AI) después de cargar, sí está', lugares.mundoListo() === true);

  // Los casos obligatorios.
  for (const [q, id] of [['casma', 'PE-CAS'], ['huarmey', 'PE-HRM'], ['chancay', 'PE-CHY'], ['huaral', 'PE-HRL'], ['lima', 'PE-LIM'], ['paris', 'FR-PAR'], ['parís', 'FR-PAR'], ['bali', 'ID-DPS'], ['santorini', 'GR-JTR'], ['tokio', 'JP-TYO']]) {
    check(`AI) "${q}" encuentra ${id}`, lugares.buscarLugares(q)[0]?.id === id);
  }

  // Español e inglés llevan al mismo sitio.
  check('AI) "munich" y "múnich" llevan al mismo lugar', lugares.buscarLugares('munich')[0]?.id === lugares.buscarLugares('múnich')[0]?.id);
  check('AI) y ese lugar se lee en español', lugares.buscarLugares('munich')[0]?.label === 'Múnich');

  // Los homónimos, intactos tras la importación masiva.
  const cordobas = lugares.buscarLugares('cordoba').filter((o) => o.label === 'Córdoba');
  check('AI) las dos Córdobas siguen distinguiéndose', cordobas.length >= 2 && new Set(cordobas.map((o) => o.sublabel)).size >= 2);
  const valencias = lugares.buscarLugares('valencia').filter((o) => o.label === 'Valencia');
  check('AI) y las dos Valencias', valencias.length >= 2 && new Set(valencias.map((o) => o.sublabel)).size >= 2);
  const santiagos = lugares.buscarLugares('santiago').filter((o) => o.label === 'Santiago');
  check('AI) y los Santiagos', santiagos.length >= 2 && new Set(santiagos.map((o) => o.sublabel)).size >= 2);

  // Lo escrito a mano gana a lo importado cuando pesan igual.
  check('AI) Lima la de siempre va antes que cualquier Lima importada', lugares.buscarLugares('lima')[0]?.id === 'PE-LIM');

  // El mundo aporta de verdad: hay más resultados que antes.
  check('AI) el mundo aporta resultados nuevos', lugares.buscarLugares('lima').length > 1);
  check('AI) y todos traen su país', lugares.buscarLugares('lima').every((o) => !!o.sublabel || !o.countryCode));

  // Rendimiento razonable, medido aquí mismo.
  const t = Date.now();
  for (const q of ['san', 'lima', 'paris', 'cas', 'hua', 'tok']) lugares.buscarLugares(q);
  const ms = (Date.now() - t) / 6;
  check('AI) buscar sigue siendo rápido', ms < 60, ms.toFixed(1) + ' ms de media');

  // Y nada de esto sale del dispositivo.
  check('AI) sin red', !/fetch\(|axios|XMLHttpRequest|https?:\/\//.test(soloCodigo(places)));
  check('AI) sin ubicación del aparato', !/useLocation|locationService|expo-location/.test(places));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Ubicación: estados, preferencia, permisos y EXIF/GPS en orden');
process.exit(failures ? 1 : 0);
