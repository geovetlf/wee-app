// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/escena3d.ts: no se edita a mano, se regenera.
import { ESCENA3D_CONTRACT_VERSION } from './contracts';
import { OwnedByAccount } from './identity';
export type ModoDeComposicion = 'world' | 'design' | 'filmmaker';
export const MODOS_DE_COMPOSICION: readonly ModoDeComposicion[] = Object.freeze(['world', 'design', 'filmmaker'] as const);
export type PapelDeNodo = 'environment' | 'object' | 'character' | 'light' | 'camera_target';
export const PERFILES_DE_COMPOSICION: Readonly<Record<ModoDeComposicion, readonly PapelDeNodo[]>> = Object.freeze({
    world: Object.freeze(['environment', 'object', 'light', 'camera_target'] as PapelDeNodo[]),
    design: Object.freeze(['environment', 'object', 'light', 'camera_target'] as PapelDeNodo[]),
    filmmaker: Object.freeze(['environment', 'object', 'character', 'light', 'camera_target'] as PapelDeNodo[]),
});
export type Vector3 = readonly [
    number,
    number,
    number
];
export type Cuaternion = readonly [
    number,
    number,
    number,
    number
];
export interface Transformacion3D {
    posicion: Vector3;
    rotacion: Cuaternion;
    escala: Vector3;
}
export const TRANSFORMACION_NEUTRA: Transformacion3D = Object.freeze({
    posicion: Object.freeze([0, 0, 0]) as Vector3,
    rotacion: Object.freeze([0, 0, 0, 1]) as Cuaternion,
    escala: Object.freeze([1, 1, 1]) as Vector3,
});
export interface Nodo3D {
    nodeId: string;
    papel: PapelDeNodo;
    assetId?: string;
    elementId?: string;
    nombre?: string;
    transform: Transformacion3D;
    zoneId?: string;
}
export interface Camara3D {
    cameraId: string;
    posicion: Vector3;
    objetivo: Vector3;
    fovGrados: number;
    nombre?: string;
}
export interface Zona3D {
    zoneId: string;
    estado: 'generada' | 'pendiente';
    worldAssetId?: string;
    nombre?: string;
}
export interface Escena3D extends OwnedByAccount {
    contract: typeof ESCENA3D_CONTRACT_VERSION;
    sceneId: string;
    modo: ModoDeComposicion;
    projectId?: string;
    entorno?: {
        worldAssetId?: string;
        previewAssetId?: string;
    };
    nodos: readonly Nodo3D[];
    camaras: readonly Camara3D[];
    zonas: readonly Zona3D[];
    createdAt: number;
    updatedAt: number;
}
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const esId = (v: unknown): v is string => typeof v === 'string' && ID.test(v);
const finitos = (v: unknown, n: number): boolean => Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'number' && Number.isFinite(x));
const erroresDeTransformacion = (t: unknown, donde: string): string[] => {
    if (!t || typeof t !== 'object')
        return [`${donde}: sin transformación`];
    const x = t as Record<string, unknown>;
    const e: string[] = [];
    if (!finitos(x.posicion, 3))
        e.push(`${donde}: posición, tres números`);
    if (!finitos(x.rotacion, 4))
        e.push(`${donde}: rotación, cuaternión de cuatro números`);
    if (!finitos(x.escala, 3) || !(x.escala as number[]).every((s) => s > 0))
        e.push(`${donde}: escala, tres números positivos`);
    return e;
};
export const validarEscena3D = (escena: unknown): string[] => {
    if (!escena || typeof escena !== 'object')
        return ['la escena no es un objeto'];
    const s = escena as Escena3D;
    const e: string[] = [];
    if (s.contract !== ESCENA3D_CONTRACT_VERSION)
        e.push(`contrato ${ESCENA3D_CONTRACT_VERSION}`);
    if (!esId(s.sceneId))
        e.push('sceneId no válido');
    if (typeof s.ownerAccountId !== 'string' || !s.ownerAccountId)
        e.push('sin cuenta dueña');
    if (!(MODOS_DE_COMPOSICION as readonly string[]).includes(s.modo))
        return [...e, `modo desconocido: ${String(s.modo)}`];
    if (s.projectId !== undefined && !esId(s.projectId))
        e.push('projectId no válido');
    if (s.entorno?.worldAssetId !== undefined && !esId(s.entorno.worldAssetId))
        e.push('entorno: worldAssetId no válido');
    if (s.entorno?.previewAssetId !== undefined && !esId(s.entorno.previewAssetId))
        e.push('entorno: previewAssetId no válido');
    const admitidos = PERFILES_DE_COMPOSICION[s.modo];
    const zonas = new Set<string>();
    for (const z of Array.isArray(s.zonas) ? s.zonas : []) {
        if (!esId(z.zoneId) || zonas.has(z.zoneId))
            e.push(`zona repetida o no válida: ${String(z.zoneId)}`);
        zonas.add(z.zoneId);
        if (z.estado !== 'generada' && z.estado !== 'pendiente')
            e.push(`zona ${z.zoneId}: estado desconocido`);
        if (z.estado === 'generada' && !esId(z.worldAssetId))
            e.push(`zona ${z.zoneId}: generada sin material`);
    }
    const nodos = new Set<string>();
    for (const n of Array.isArray(s.nodos) ? s.nodos : []) {
        if (!esId(n.nodeId) || nodos.has(n.nodeId))
            e.push(`nodo repetido o no válido: ${String(n.nodeId)}`);
        nodos.add(n.nodeId);
        if (!admitidos.includes(n.papel))
            e.push(`nodo ${n.nodeId}: el papel ${String(n.papel)} no es del modo ${s.modo}`);
        if (n.papel !== 'light' && n.papel !== 'camera_target' && !esId(n.assetId) && !esId(n.elementId))
            e.push(`nodo ${n.nodeId}: sin material ni Element (por id)`);
        if (n.assetId !== undefined && !esId(n.assetId))
            e.push(`nodo ${n.nodeId}: assetId no válido (un id, nunca una URL)`);
        if (n.elementId !== undefined && !esId(n.elementId))
            e.push(`nodo ${n.nodeId}: elementId no válido`);
        if (n.zoneId !== undefined && !zonas.has(n.zoneId))
            e.push(`nodo ${n.nodeId}: zona desconocida`);
        e.push(...erroresDeTransformacion(n.transform, `nodo ${n.nodeId}`));
    }
    const camaras = new Set<string>();
    for (const c of Array.isArray(s.camaras) ? s.camaras : []) {
        if (!esId(c.cameraId) || camaras.has(c.cameraId))
            e.push(`cámara repetida o no válida: ${String(c.cameraId)}`);
        camaras.add(c.cameraId);
        if (!finitos(c.posicion, 3) || !finitos(c.objetivo, 3))
            e.push(`cámara ${c.cameraId}: posición y objetivo, tres números`);
        if (typeof c.fovGrados !== 'number' || !(c.fovGrados > 0 && c.fovGrados < 180))
            e.push(`cámara ${c.cameraId}: campo de visión entre 0 y 180`);
    }
    return e;
};
const comprobada = (escena: Escena3D): Escena3D => {
    const e = validarEscena3D(escena);
    if (e.length)
        throw new Error(`escena 3D no válida: ${e.join('; ')}`);
    return escena;
};
export const crearEscena3D = (datos: {
    sceneId: string;
    modo: ModoDeComposicion;
    ownerAccountId: string;
    projectId?: string;
    ahora: number;
    entorno?: Escena3D['entorno'];
}): Escena3D => comprobada({
    contract: ESCENA3D_CONTRACT_VERSION,
    sceneId: datos.sceneId,
    modo: datos.modo,
    ownerAccountId: datos.ownerAccountId,
    ...(datos.projectId ? { projectId: datos.projectId } : {}),
    ...(datos.entorno ? { entorno: { ...datos.entorno } } : {}),
    nodos: [],
    camaras: [],
    zonas: [],
    createdAt: datos.ahora,
    updatedAt: datos.ahora,
});
export const agregarNodo3D = (escena: Escena3D, nodo: Nodo3D, ahora: number): Escena3D => comprobada({ ...escena, nodos: [...escena.nodos, { ...nodo }], updatedAt: ahora });
export const moverNodo3D = (escena: Escena3D, nodeId: string, transform: Transformacion3D, ahora: number): Escena3D => {
    if (!escena.nodos.some((n) => n.nodeId === nodeId))
        throw new Error(`escena 3D: no hay nodo ${nodeId}`);
    return comprobada({ ...escena, nodos: escena.nodos.map((n) => (n.nodeId === nodeId ? { ...n, transform } : n)), updatedAt: ahora });
};
export const quitarNodo3D = (escena: Escena3D, nodeId: string, ahora: number): Escena3D => comprobada({ ...escena, nodos: escena.nodos.filter((n) => n.nodeId !== nodeId), updatedAt: ahora });
export const fijarCamara3D = (escena: Escena3D, camara: Camara3D, ahora: number): Escena3D => comprobada({ ...escena, camaras: [...escena.camaras.filter((c) => c.cameraId !== camara.cameraId), { ...camara }], updatedAt: ahora });
export const agregarZona3D = (escena: Escena3D, zona: Zona3D, ahora: number): Escena3D => comprobada({ ...escena, zonas: [...escena.zonas, { ...zona }], updatedAt: ahora });
export const materialesDeLaEscena3D = (escena: Escena3D): string[] => [...new Set([
        ...(escena.entorno?.worldAssetId ? [escena.entorno.worldAssetId] : []),
        ...(escena.entorno?.previewAssetId ? [escena.entorno.previewAssetId] : []),
        ...escena.zonas.flatMap((z) => (z.worldAssetId ? [z.worldAssetId] : [])),
        ...escena.nodos.flatMap((n) => (n.assetId ? [n.assetId] : [])),
    ])].sort();
export const CAPACIDAD_DE_AMPLIACION = 'world.expand';
export const puedeAmpliarse = (escena: Escena3D, capacidadesDisponibles: readonly string[]): boolean => escena.modo === 'world' && capacidadesDisponibles.includes(CAPACIDAD_DE_AMPLIACION);
