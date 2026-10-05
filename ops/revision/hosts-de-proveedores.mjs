/*
 * LOS HOSTS DE LOS PROVEEDORES DE IA, SACADOS DE LOS ADAPTADORES — una sola fuente.
 *
 * Regla de Weë (CLAUDE.md §6): «nunca llamar a una API de IA fuera de un adaptador». Para vigilarla hace falta
 * saber qué direcciones son de un proveedor, y esa lista NO se escribe a mano en cada prueba: se lee de donde vive,
 * `functions/src/engine/providers/*.ts`. Si mañana entra un proveedor nuevo con su adaptador, su host entra solo en
 * la vigilancia; si alguien copia su dirección en otro archivo, la vigilancia lo ve.
 *
 * Lo usan la suite `gateway-autoridad`, `runtime-map` y los detectores del revisor (`ops/revision/detectores.mjs`).
 *
 * Dos cosas no se pueden leer de una URL escrita y se declaran aquí, con su porqué:
 *   - los SDK de IA que el adaptador carga como paquete (no escribe el host): `@google/genai` (gemini.ts);
 *   - los hosts que usan esos SDK por dentro.
 * Y una excepción documentada como deuda: `functions/src/vertexAI.ts` (el avatar), fuera del motor desde antes
 * del ENGINE — RUNTIME.md §4 y §11.1.
 */
import fs from 'node:fs';
import path from 'node:path';

export const CARPETA_DE_ADAPTADORES = 'functions/src/engine/providers';

/** Paquetes de SDK de IA: importarlos fuera de un adaptador es llamar a la IA fuera de un adaptador. */
export const SDKS_DE_IA = ['@google/genai', '@google/generative-ai', 'openai', '@anthropic-ai/sdk', 'elevenlabs', '@elevenlabs/elevenlabs-js'];

/** Hosts que los SDK de arriba usan sin que el adaptador los escriba. */
export const HOSTS_DE_SDKS = ['generativelanguage.googleapis.com', 'aiplatform.googleapis.com'];

/** Archivos que pueden nombrar un proveedor sin ser un adaptador, cada uno con su porqué. */
export const EXCEPCIONES = new Map([
  ['functions/src/vertexAI.ts', 'avatar del Perfil Weë, anterior al ENGINE: deuda escrita en docs/RUNTIME.md §4 y §11.1'],
]);

/** Hosts que no son de IA aunque aparezcan en un adaptador (almacenamiento propio, etc.). */
const NO_SON_DE_IA = new Set(['firebasestorage.googleapis.com', 'storage.googleapis.com']);

/**
 * Los archivos de DATOS de modelos (`*-modelos.ts`, p. ej. `fal-modelos.ts`) no son adaptadores: declaran modelos con
 * su licencia, su precio publicado y sus fuentes oficiales, y sus URLs son REFERENCIAS (documentación, términos,
 * licencias en GitHub), no direcciones a las que Weë llame. Contarlas como hosts de IA convertiría `github.com` en un
 * proveedor. Que de verdad no llamen a nada lo vigila `gateway-autoridad`: solo importan tipos y no tienen funciones.
 */
export const esDatosDeModelos = (archivo) => archivo.endsWith('-modelos.ts');

/**
 * Lee los adaptadores y devuelve los hosts de IA que escriben (`https://host...`), más los de los SDK.
 * Ignora `mock.ts` (no llama a nada), los archivos de datos de modelos y los hosts que no son de IA.
 */
export const hostsDeProveedores = (raiz) => {
  const dir = path.join(raiz, CARPETA_DE_ADAPTADORES);
  const hosts = new Set(HOSTS_DE_SDKS);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts') && x !== 'mock.ts' && !esDatosDeModelos(x))) {
    const texto = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of texto.matchAll(/https:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)) {
      const host = m[1].toLowerCase();
      if (!NO_SON_DE_IA.has(host)) hosts.add(host);
    }
  }
  return [...hosts].sort();
};

/** Una expresión que encuentra cualquiera de esos hosts (o un subdominio suyo) en un texto. */
export const patronDeHosts = (hosts) =>
  new RegExp(hosts.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');

/** ¿Este archivo puede nombrar a un proveedor? Solo los adaptadores y las excepciones declaradas. */
export const puedeNombrarProveedores = (ruta) =>
  ruta.startsWith(`${CARPETA_DE_ADAPTADORES}/`) || EXCEPCIONES.has(ruta);
