import {
  CAPACIDADES_DE_MC4,
  CapacidadDeProceso,
  DesenlaceDeProceso,
  DescriptorDeProveedorDeMedios,
  PeticionDeProceso,
  PuertoDeProceso,
  Transformacion,
  falloDeProceso,
  transformacionValida,
} from '../core';

/**
 * EL PROCESADOR DE IMAGEN DE WEË. El único archivo que sabe qué es `sharp`.
 *
 * ── Por qué `sharp` y no otra cosa ──────────────────────────────────────────
 *
 * Porque ya estaba. Es dependencia de las Functions desde antes de Media Cloud
 * y lleva tiempo funcionando en producción en `vertexAI.ts`, comprimiendo las
 * fotos que van a Gemini. Traer una librería pesada nueva para hacer lo mismo
 * habría sido añadir megas al despliegue y una segunda forma de redimensionar.
 *
 * Se importa PEREZOSAMENTE, y no es una manía: `vertexAI.ts` ya lo hacía y dice
 * por qué —«lazy-loaded to avoid deployment timeout»—. Cargar un binario nativo
 * al arrancar el módulo retrasa el despliegue de TODAS las Functions, incluidas
 * las que no procesan nada.
 *
 * ── Por qué aquí no puede haber inyección de comandos ───────────────────────
 *
 * No porque se escape nada, sino porque **no hay ningún comando**. `sharp` es
 * una librería, no un programa: se le pasan números y palabras de una lista
 * cerrada a través de su API. No hay cadena que componer, no hay intérprete que
 * engañar, no hay `exec`, no hay tubería y no hay ruta. Una transformación que
 * llegue aquí ya pasó por `transformacionValida`, que exige exactamente los
 * campos esperados, enteros acotados y palabras de un catálogo — así que lo
 * único que cruza esta frontera son números y tres nombres de formato.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * Nada de vídeo, nada de audio, nada de documentos: eso necesita herramientas
 * que Weë no tiene hoy, y declararlo sin tenerlo sería prometer una capacidad
 * inexistente. Y nada de IA: recortar no es generar, y la generación tiene su
 * propio camino desde hace fases.
 */

export const PROCESADOR_DE_IMAGEN_ID = 'wee-image';

/**
 * LO QUE SABE HACER DE VERDAD: las tres de imagen. Ni una más.
 *
 * READY desde el 2026-09-21, y con qué se ganó: un canary autorizado recorrió
 * la cadena entera contra material real. Un JPEG de 577.908 bytes que ya vivía
 * en el proveedor se leyó con un GET firmado, `sharp` lo redimensionó de verdad
 * a una miniatura de 400×400 en WebP —10.604 bytes—, se escribió con «solo si
 * está libre», se comprobó con un HEAD, y de ahí salieron su ficha de objeto y
 * su `AssetVariant`. El trabajo quedó `completed` en el Job Engine con un solo
 * intento, y repetirlo no produjo nada: `skipped`.
 *
 * Estuvo en `UNVERIFIED` hasta ese día a propósito: la librería estaba probada
 * —hay pruebas que la ejercitan de verdad— pero un procesador no está
 * verificado hasta que transforma un material real en producción. Ahora lo hizo.
 */
export const DESCRIPTOR_DEL_PROCESADOR_DE_IMAGEN: DescriptorDeProveedorDeMedios<CapacidadDeProceso> = Object.freeze({
  id: PROCESADOR_DE_IMAGEN_ID,
  name: 'Procesador de imagen de Weë (sharp)',
  estado: 'READY',
  capacidades: CAPACIDADES_DE_MC4,
});

/** Lo que `sharp` llama a cada ajuste. La traducción vive aquí y en ningún otro sitio. */
const AJUSTE: Readonly<Record<string, string>> = Object.freeze({
  cover: 'cover', contain: 'contain', dentro: 'inside',
});

const TIPO_DE_SALIDA: Readonly<Record<string, string>> = Object.freeze({
  jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png',
});

export interface DepsDelProcesador {
  /** Entra por la puerta para poder probar el camino malo sin romper nada. */
  cargarSharp?: () => Promise<any>;
}

const cargaPerezosa = async (): Promise<any> => {
  const m: any = await import('sharp');
  return m.default || m;
};

export const crearProcesadorDeImagen = (deps: DepsDelProcesador = {}): PuertoDeProceso => {
  const cargar = deps.cargarSharp ?? cargaPerezosa;

  return {
    processorId: PROCESADOR_DE_IMAGEN_ID,
    capacidades: CAPACIDADES_DE_MC4,

    async procesar(peticion: PeticionDeProceso): Promise<DesenlaceDeProceso> {
      const t: Transformacion = peticion.transformacion;
      if (!transformacionValida(t)) {
        return { ok: false, error: falloDeProceso(PROCESADOR_DE_IMAGEN_ID, 'peticion_invalida', { field: 'transformacion' }) };
      }
      /* Un póster sale de un vídeo, y aquí no hay nada que sepa abrir un vídeo. */
      if (t.tipo === 'poster') {
        return { ok: false, error: falloDeProceso(PROCESADOR_DE_IMAGEN_ID, 'sin_capacidad', { field: 'tipo' }) };
      }
      if (!Buffer.isBuffer(peticion.cuerpo) || !peticion.cuerpo.length) {
        return { ok: false, error: falloDeProceso(PROCESADOR_DE_IMAGEN_ID, 'peticion_invalida', { field: 'cuerpo' }) };
      }
      if (typeof peticion.contentType !== 'string' || !peticion.contentType.startsWith('image/')) {
        return { ok: false, error: falloDeProceso(PROCESADOR_DE_IMAGEN_ID, 'sin_capacidad', { field: 'contentType' }) };
      }

      try {
        const sharp = await cargar();
        /*
         * Números y palabras de un catálogo. Nada que venga de fuera se
         * concatena en nada: se pasan como argumentos a una función.
         */
        const tuberia = sharp(peticion.cuerpo).resize(t.ancho, t.alto, {
          fit: AJUSTE[t.ajuste],
          withoutEnlargement: true,
        });
        const conFormato = t.formato === 'png'
          ? tuberia.png({ compressionLevel: 9 })
          : t.formato === 'webp'
            ? tuberia.webp({ quality: t.calidad })
            : tuberia.jpeg({ quality: t.calidad });

        const { data, info } = await conFormato.toBuffer({ resolveWithObject: true });
        const cuerpo = Buffer.from(data);
        return {
          ok: true,
          resultado: {
            cuerpo,
            contentType: TIPO_DE_SALIDA[t.formato],
            bytes: cuerpo.length,
            ...(Number.isSafeInteger(info?.width) ? { ancho: info.width } : {}),
            ...(Number.isSafeInteger(info?.height) ? { alto: info.height } : {}),
          },
        };
      } catch {
        /* Ni el mensaje de la librería ni nada del contenido salen de aquí. */
        return { ok: false, error: falloDeProceso(PROCESADOR_DE_IMAGEN_ID, 'origen_ilegible') };
      }
    },
  };
};
