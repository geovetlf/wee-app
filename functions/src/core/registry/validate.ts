import { RegistryData } from './types';

/**
 * WEE CORE — INTEGRIDAD DEL REGISTRO.
 *
 * ── Por qué esto existe aparte del constructor ──────────────────────────────
 *
 * Porque devuelve TODOS los problemas de golpe. Un constructor que lanza a la
 * primera obliga a arreglarlos de uno en uno, y cuando se añade una matriz se
 * tocan cuatro archivos a la vez: lo normal es equivocarse en varios.
 *
 * ── Qué vigila, y por qué cada cosa ─────────────────────────────────────────
 *
 * IDS DUPLICADOS. Dos modelos con el mismo id hacen que el índice se quede con
 * el último y el otro desaparezca en silencio. Nadie lo nota hasta que un
 * enrutado elige el que no era.
 *
 * REFERENCIAS ROTAS. Un modelo de un proveedor que no existe, un adaptador de
 * un proveedor que no existe, un proveedor que apunta a un adaptador ausente.
 * Son el resultado típico de renombrar algo a medias.
 *
 * CAPACIDADES FUERA DEL CATÁLOGO. Un modelo que declara servir algo que Weë no
 * sabe nombrar. Suele significar que alguien copió el nombre de un endpoint en
 * vez de usar una capacidad.
 *
 * PROMESAS SIN RESPALDO. Un proveedor `READY` sin adaptador, o `PENDING` que
 * declara capacidades. Las dos son la misma mentira en direcciones opuestas: o
 * prometes lo que no puedes servir, o escondes lo que ya sirves.
 *
 * SECRETOS. `credentialEnv` tiene que parecer el NOMBRE de una variable de
 * entorno y no su valor. Es la última red antes de que un descuido acabe en
 * git.
 */

/** Un problema encontrado, con dónde y qué. */
export interface ProblemaDeRegistro {
  severity: 'error' | 'warning';
  where: string;
  message: string;
}

/** Forma de un nombre de variable de entorno: MAYÚSCULAS_CON_GUIONES. */
const FORMA_DE_ENV = /^[A-Z][A-Z0-9_]{2,60}$/;

/**
 * Lo que NO puede parecer una credencial.
 *
 * Los prefijos de clave más comunes y cualquier cadena larga sin guiones bajos.
 * Un nombre de variable real es corto y tiene guiones; un valor es largo y no
 * los tiene.
 */
const PARECE_UN_VALOR = /^(sk-|pk-|AIza|ghp_|xox|Bearer\s|r8_)|^[A-Za-z0-9+/]{32,}$/;

export const validarRegistro = (datos: RegistryData): readonly ProblemaDeRegistro[] => {
  const problemas: ProblemaDeRegistro[] = [];
  const error = (where: string, message: string) => problemas.push({ severity: 'error', where, message });
  const aviso = (where: string, message: string) => problemas.push({ severity: 'warning', where, message });

  /* ── Ids únicos ────────────────────────────────────────────────────────── */
  const unicos = <T>(items: readonly T[], id: (t: T) => string, que: string) => {
    const vistos = new Set<string>();
    for (const item of items) {
      const k = id(item);
      if (vistos.has(k)) error(`${que}:${k}`, `id repetido: ${k}`);
      vistos.add(k);
    }
    return vistos;
  };

  const idsCapacidad = unicos(datos.capabilities, (c) => String(c.id), 'capability');
  const idsProveedor = unicos(datos.providers, (p) => p.id, 'provider');
  unicos(datos.models, (m) => m.id, 'model');
  unicos(datos.adapters, (a) => a.id, 'adapter');

  /* ── Referencias ───────────────────────────────────────────────────────── */
  for (const m of datos.models) {
    if (!idsProveedor.has(m.providerId)) {
      error(`model:${m.id}`, `apunta a un proveedor que no existe: ${m.providerId}`);
    }
    for (const c of m.capabilities) {
      if (!idsCapacidad.has(String(c))) {
        error(`model:${m.id}`, `declara una capacidad que no está en el catálogo: ${String(c)}`);
      }
    }
    if (!m.capabilities.length) aviso(`model:${m.id}`, 'no declara ninguna capacidad');
  }

  const idsAdaptador = new Set(datos.adapters.map((a) => a.id));
  for (const a of datos.adapters) {
    if (!idsProveedor.has(a.providerId)) {
      error(`adapter:${a.id}`, `apunta a un proveedor que no existe: ${a.providerId}`);
    }
    for (const c of a.supportedCapabilities) {
      if (!idsCapacidad.has(String(c))) {
        error(`adapter:${a.id}`, `declara una capacidad que no está en el catálogo: ${String(c)}`);
      }
    }
  }

  for (const p of datos.providers) {
    if (p.adapterId && !idsAdaptador.has(p.adapterId)) {
      error(`provider:${p.id}`, `apunta a un adaptador que no existe: ${p.adapterId}`);
    }

    /* ── Promesas sin respaldo ─────────────────────────────────────────── */
    if ((p.status === 'READY' || p.status === 'BETA') && !p.adapterId) {
      error(`provider:${p.id}`, `está en ${p.status} pero no tiene adaptador: promete algo que nadie puede servir`);
    }
    if (p.status === 'PENDING' && p.capabilities.length > 0) {
      error(`provider:${p.id}`, 'está PENDING pero declara capacidades: o está integrado o no lo está');
    }
    if (p.status === 'PENDING' && datos.models.some((m) => m.providerId === p.id)) {
      error(`provider:${p.id}`, 'está PENDING pero tiene modelos registrados');
    }

    /* ── Secretos ──────────────────────────────────────────────────────── */
    if (p.credentialEnv) {
      if (PARECE_UN_VALOR.test(p.credentialEnv)) {
        error(`provider:${p.id}`, 'credentialEnv parece un VALOR de credencial, no un nombre de variable');
      } else if (!FORMA_DE_ENV.test(p.credentialEnv)) {
        aviso(`provider:${p.id}`, `credentialEnv no tiene forma de variable de entorno: ${p.credentialEnv}`);
      }
    }

    /* ── Coherencia del grafo ──────────────────────────────────────────── */
    const susModelos = datos.models.filter((m) => m.providerId === p.id);
    const declaradas = new Set(p.capabilities.map(String));
    const deSusModelos = new Set(susModelos.flatMap((m) => m.capabilities.map(String)));
    for (const c of declaradas) {
      if (!deSusModelos.has(c)) {
        aviso(`provider:${p.id}`, `declara ${c} pero ninguno de sus modelos la cubre`);
      }
    }
    for (const c of deSusModelos) {
      if (!declaradas.has(c)) {
        aviso(`provider:${p.id}`, `alguno de sus modelos cubre ${c} pero el proveedor no la declara`);
      }
    }
  }

  return problemas;
};

/** ¿Está el registro sano? Los avisos no cuentan: son para leer, no para parar. */
export const registroSano = (datos: RegistryData): boolean =>
  !validarRegistro(datos).some((p) => p.severity === 'error');
