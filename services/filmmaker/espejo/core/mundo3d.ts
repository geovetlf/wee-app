// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/mundo3d.ts: no se edita a mano, se regenera.
import { MUNDO3D_CONTRACT_VERSION } from './contracts';
import type { CapabilityId } from './capability';
import { FORMA_DE_ID_DE_MATERIAL } from './content/asset';
import { FORMA_DE_ID_3D } from './escena3d';
import type { AssetKind, DerechosDelMaterial, VariantKind } from './content/asset';
export const CAPACIDAD_DE_MUNDO = 'world.generate' satisfies CapabilityId;
export type ModoDeMundo = 'desde_imagen';
export const MODOS_DE_MUNDO: readonly ModoDeMundo[] = Object.freeze(['desde_imagen'] as const);
export type EspacioDelMundo = 'exterior' | 'interior';
export const ESPACIOS_DEL_MUNDO: readonly EspacioDelMundo[] = Object.freeze(['exterior', 'interior'] as const);
export const ESPACIO_POR_DEFECTO: EspacioDelMundo = 'exterior';
export const MAX_ELEMENTOS_DEL_MUNDO = 2;
export const MAX_LARGO_DE_UN_ELEMENTO = 60;
export const MAX_LARGO_DE_LA_DESCRIPCION = 300;
export const MAX_LARGO_DE_LA_DIRECCION = 2000;
export type FuenteDeImagenDeMundo = {
    readonly tipo: 'storage';
    readonly url: string;
} | {
    readonly tipo: 'material';
    readonly assetId: string;
};
export interface PeticionDeMundo3D {
    readonly contract: typeof MUNDO3D_CONTRACT_VERSION;
    readonly modo: ModoDeMundo;
    readonly imagen: FuenteDeImagenDeMundo;
    readonly descripcion?: string;
    readonly espacio?: EspacioDelMundo;
    readonly elementos?: readonly string[];
    readonly projectId?: string;
}
export type MotivoDePeticionNoValida = 'forma_no_valida' | 'contrato_no_valido' | 'campo_desconocido' | 'modo_no_soportado' | 'falta_imagen' | 'imagen_sin_subir' | 'imagen_ajena' | 'material_no_valido' | 'descripcion_no_valida' | 'espacio_no_valido' | 'elementos_no_validos' | 'proyecto_no_valido';
export type LecturaDePeticion = {
    readonly ok: true;
    readonly peticion: PeticionDeMundo3D;
} | {
    readonly ok: false;
    readonly motivo: MotivoDePeticionNoValida;
    readonly campo?: string;
};
const CAMPOS_DE_LA_PETICION: readonly string[] = Object.freeze(['contract', 'modo', 'imagen', 'descripcion', 'espacio', 'elementos', 'projectId']);
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const decodificar = (texto: string): string | null => {
    try {
        return decodeURIComponent(texto);
    }
    catch {
        return null;
    }
};
export const rutaEnElStorageDeWee = (url: unknown): {
    bucket: string;
    path: string;
} | null => {
    if (typeof url !== 'string' || !url.length || url.length > MAX_LARGO_DE_LA_DIRECCION)
        return null;
    const formas = [
        /^gs:\/\/([^/]+)\/(.+)$/,
        /^https?:\/\/[^/]+\/v0\/b\/([^/]+)\/o\/([^?]+)/,
        /^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?]+)/,
    ];
    for (const forma of formas) {
        const m = url.match(forma);
        if (!m)
            continue;
        const path = decodificar(m[2]);
        return path === null ? null : { bucket: m[1], path };
    }
    return null;
};
export const esImagenDeLaCuenta = (url: unknown, cuenta: string): boolean => {
    const ruta = rutaEnElStorageDeWee(url);
    return !!ruta && typeof cuenta === 'string' && /^[^/\s]+$/.test(cuenta) && ruta.path.startsWith(`users/${cuenta}/`);
};
const textoLimpio = (v: unknown, maximo: number): string | null => {
    if (typeof v !== 'string')
        return null;
    if (/[\u0000-\u001f\u007f]/.test(v.replace(/[\n\r\t]/g, ' ')))
        return null;
    const t = v.replace(/\s+/g, ' ').trim();
    return t.length && t.length <= maximo ? t : null;
};
export const leerPeticionDeMundo3D = (crudo: unknown, cuenta: string): LecturaDePeticion => {
    const no = (motivo: MotivoDePeticionNoValida, campo?: string): LecturaDePeticion => ({ ok: false, motivo, ...(campo ? { campo } : {}) });
    if (!esObjeto(crudo))
        return no('forma_no_valida');
    const sobra = Object.keys(crudo).find((k) => !CAMPOS_DE_LA_PETICION.includes(k));
    if (sobra)
        return no('campo_desconocido', sobra);
    if (crudo.contract !== MUNDO3D_CONTRACT_VERSION)
        return no('contrato_no_valido', 'contract');
    if (!MODOS_DE_MUNDO.includes(crudo.modo as ModoDeMundo))
        return no('modo_no_soportado', 'modo');
    const imagen = crudo.imagen;
    let fuente: FuenteDeImagenDeMundo;
    if (!esObjeto(imagen))
        return no('falta_imagen', 'imagen');
    if (imagen.tipo === 'storage') {
        if (Object.keys(imagen).some((k) => k !== 'tipo' && k !== 'url'))
            return no('campo_desconocido', 'imagen');
        if (!rutaEnElStorageDeWee(imagen.url))
            return no('imagen_sin_subir', 'imagen');
        if (!esImagenDeLaCuenta(imagen.url, cuenta))
            return no('imagen_ajena', 'imagen');
        fuente = Object.freeze({ tipo: 'storage', url: imagen.url as string });
    }
    else if (imagen.tipo === 'material') {
        if (Object.keys(imagen).some((k) => k !== 'tipo' && k !== 'assetId'))
            return no('campo_desconocido', 'imagen');
        if (typeof imagen.assetId !== 'string' || !FORMA_DE_ID_DE_MATERIAL.test(imagen.assetId))
            return no('material_no_valido', 'imagen');
        fuente = Object.freeze({ tipo: 'material', assetId: imagen.assetId });
    }
    else {
        return no('falta_imagen', 'imagen');
    }
    let descripcion: string | undefined;
    if (crudo.descripcion !== undefined && crudo.descripcion !== '') {
        const d = textoLimpio(crudo.descripcion, MAX_LARGO_DE_LA_DESCRIPCION);
        if (d === null)
            return no('descripcion_no_valida', 'descripcion');
        descripcion = d;
    }
    if (crudo.espacio !== undefined && !ESPACIOS_DEL_MUNDO.includes(crudo.espacio as EspacioDelMundo))
        return no('espacio_no_valido', 'espacio');
    let elementos: string[] | undefined;
    if (crudo.elementos !== undefined) {
        if (!Array.isArray(crudo.elementos) || crudo.elementos.length > MAX_ELEMENTOS_DEL_MUNDO)
            return no('elementos_no_validos', 'elementos');
        const limpios = crudo.elementos.map((e) => textoLimpio(e, MAX_LARGO_DE_UN_ELEMENTO));
        if (limpios.some((e) => e === null))
            return no('elementos_no_validos', 'elementos');
        elementos = limpios as string[];
    }
    if (crudo.projectId !== undefined && (typeof crudo.projectId !== 'string' || !FORMA_DE_ID_3D.test(crudo.projectId))) {
        return no('proyecto_no_valido', 'projectId');
    }
    return {
        ok: true,
        peticion: Object.freeze({
            contract: MUNDO3D_CONTRACT_VERSION,
            modo: crudo.modo as ModoDeMundo,
            imagen: fuente,
            ...(descripcion ? { descripcion } : {}),
            ...(crudo.espacio !== undefined ? { espacio: crudo.espacio as EspacioDelMundo } : {}),
            ...(elementos?.length ? { elementos: Object.freeze(elementos) } : {}),
            ...(typeof crudo.projectId === 'string' ? { projectId: crudo.projectId } : {}),
        }),
    };
};
export interface EntradaDeMundo3D {
    readonly modo: ModoDeMundo;
    readonly imagen: string;
    readonly descripcion?: string;
    readonly espacio: EspacioDelMundo;
    readonly elementos: readonly string[];
}
const CAMPOS_DE_LA_ENTRADA: readonly string[] = Object.freeze(['modo', 'imagen', 'descripcion', 'espacio', 'elementos']);
export const entradaDeMundo3D = (peticion: PeticionDeMundo3D, imagen: string): EntradaDeMundo3D => Object.freeze({
    modo: peticion.modo,
    imagen,
    ...(peticion.descripcion ? { descripcion: peticion.descripcion } : {}),
    espacio: peticion.espacio ?? ESPACIO_POR_DEFECTO,
    elementos: Object.freeze([...(peticion.elementos ?? [])]),
});
export type MotivoDeEntradaNoValida = 'forma_no_valida' | 'modo_no_soportado' | 'imagen_ajena' | 'espacio_no_valido' | 'elementos_no_validos' | 'descripcion_no_valida';
export const leerEntradaDeMundo3D = (input: unknown, cuenta: string): {
    readonly ok: true;
    readonly entrada: EntradaDeMundo3D;
} | {
    readonly ok: false;
    readonly motivo: MotivoDeEntradaNoValida;
} => {
    if (!esObjeto(input))
        return { ok: false, motivo: 'forma_no_valida' };
    const propio = Object.fromEntries(Object.entries(input).filter(([k]) => CAMPOS_DE_LA_ENTRADA.includes(k)));
    if (!MODOS_DE_MUNDO.includes(propio.modo as ModoDeMundo))
        return { ok: false, motivo: 'modo_no_soportado' };
    if (!esImagenDeLaCuenta(propio.imagen, cuenta))
        return { ok: false, motivo: 'imagen_ajena' };
    if (!ESPACIOS_DEL_MUNDO.includes(propio.espacio as EspacioDelMundo))
        return { ok: false, motivo: 'espacio_no_valido' };
    const elementos = Array.isArray(propio.elementos) ? propio.elementos.map((e) => textoLimpio(e, MAX_LARGO_DE_UN_ELEMENTO)) : null;
    if (!elementos || elementos.length > MAX_ELEMENTOS_DEL_MUNDO || elementos.some((e) => e === null))
        return { ok: false, motivo: 'elementos_no_validos' };
    let descripcion: string | undefined;
    if (propio.descripcion !== undefined) {
        const d = textoLimpio(propio.descripcion, MAX_LARGO_DE_LA_DESCRIPCION);
        if (d === null)
            return { ok: false, motivo: 'descripcion_no_valida' };
        descripcion = d;
    }
    return {
        ok: true,
        entrada: Object.freeze({
            modo: propio.modo as ModoDeMundo,
            imagen: propio.imagen as string,
            ...(descripcion ? { descripcion } : {}),
            espacio: propio.espacio as EspacioDelMundo,
            elementos: Object.freeze(elementos as string[]),
        }),
    };
};
export type PapelDeSalidaDeMundo = 'world' | 'preview';
export const PAPELES_DE_SALIDA_DE_MUNDO: readonly PapelDeSalidaDeMundo[] = Object.freeze(['world', 'preview'] as const);
export const TIPO_DE_MATERIAL_DEL_MUNDO: AssetKind = 'world';
export const VARIANTE_DE_LA_VISTA_PREVIA: VariantKind = 'preview';
export type EstadoDeMundo3D = 'en_cola' | 'generando' | 'cancelando' | 'completado' | 'fallido' | 'cancelado';
export const ESTADOS_DE_MUNDO3D: readonly EstadoDeMundo3D[] = Object.freeze(['en_cola', 'generando', 'cancelando', 'completado', 'fallido', 'cancelado'] as const);
export const ESTADOS_FINALES_DE_MUNDO3D: readonly EstadoDeMundo3D[] = Object.freeze(['completado', 'fallido', 'cancelado'] as const);
export const ESTADO_DE_MUNDO_POR_ESTADO_DE_TRABAJO: Readonly<Record<string, EstadoDeMundo3D>> = Object.freeze({
    queued: 'en_cola',
    running: 'generando',
    waiting: 'generando',
    cancel_requested: 'cancelando',
    completed: 'completado',
    failed: 'fallido',
    timed_out: 'fallido',
    cancelled: 'cancelado',
});
export const estadoDeMundoDelTrabajo = (estadoDelTrabajo: unknown): EstadoDeMundo3D | undefined => typeof estadoDelTrabajo === 'string' && Object.prototype.hasOwnProperty.call(ESTADO_DE_MUNDO_POR_ESTADO_DE_TRABAJO, estadoDelTrabajo)
    ? ESTADO_DE_MUNDO_POR_ESTADO_DE_TRABAJO[estadoDelTrabajo]
    : undefined;
export const sePuedeCancelarElMundo = (estado: EstadoDeMundo3D | undefined): boolean => estado === 'en_cola' || estado === 'generando';
export interface MundoTerminado {
    readonly assetId: string;
    readonly kind: typeof TIPO_DE_MATERIAL_DEL_MUNDO;
    readonly conVistaPrevia: boolean;
    readonly derechos?: DerechosDelMaterial;
}
export interface TrabajoDeMundo3D {
    readonly contract: typeof MUNDO3D_CONTRACT_VERSION;
    readonly requestId: string;
    readonly estado: EstadoDeMundo3D;
    readonly mundo?: MundoTerminado;
}
