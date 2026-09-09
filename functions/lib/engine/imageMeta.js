"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPixels = void 0;
exports.dimensionsOf = dimensionsOf;
exports.imageDimensions = imageDimensions;
const storage_1 = require("firebase-admin/storage");
const http_1 = require("./http");
const be16 = (b, i) => b.readUInt16BE(i);
const le24 = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
/**
 * Ancho y alto leídos de la cabecera del archivo, sin descomprimir la imagen y
 * sin ninguna dependencia externa. Cubre los tres formatos que Weë admite hoy en
 * las subidas: JPEG, PNG y WebP. Cualquier otro devuelve null en vez de inventar
 * un tamaño.
 */
function dimensionsOf(buffer) {
    if (!buffer || buffer.length < 24)
        return null;
    // PNG: firma de 8 bytes y después la cabecera IHDR con ancho y alto de 32 bits
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    // JPEG: se recorren los marcadores hasta el SOF, que es el que lleva el tamaño
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        let offset = 2;
        while (offset + 9 < buffer.length) {
            if (buffer[offset] !== 0xff) {
                offset++;
                continue;
            }
            const marker = buffer[offset + 1];
            // SOF0…SOF15 llevan las dimensiones; C4, C8 y CC son tablas, no cabeceras
            if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                return { height: be16(buffer, offset + 5), width: be16(buffer, offset + 7) };
            }
            const length = be16(buffer, offset + 2);
            if (length < 2)
                return null;
            offset += 2 + length;
        }
        return null;
    }
    // WebP: contenedor RIFF con tres variantes de bloque
    if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        const chunk = buffer.toString('ascii', 12, 16);
        if (chunk === 'VP8 ')
            return { width: be16(buffer, 27) & 0x3fff, height: be16(buffer, 29) & 0x3fff };
        if (chunk === 'VP8L') {
            const bits = buffer.readUInt32LE(21);
            return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
        }
        if (chunk === 'VP8X')
            return { width: le24(buffer, 24) + 1, height: le24(buffer, 27) + 1 };
    }
    return null;
}
/** Con el tamaño ya conocido, el dato completo. */
const withPixels = (size, source) => {
    const width = Math.round(Number(size.width));
    const height = Math.round(Number(size.height));
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
        return null;
    return { width, height, pixelCount: width * height, source };
};
exports.withPixels = withPixels;
/**
 * Dimensiones de una imagen del Storage de Weë.
 *
 *  1. Metadatos del archivo (los escribe la app al subir). No descarga nada:
 *     es una consulta de metadatos, del orden de decenas de milisegundos.
 *  2. Respaldo: descarga el archivo y lee su cabecera. Cuesta lo que pese la
 *     foto —hasta 10 MB, que es el tope de subida— y solo ocurre con imágenes
 *     anteriores a este cambio o subidas por otra vía. La descarga es de lectura:
 *     el archivo original no se toca.
 *
 * Devuelve null si no se puede determinar. Nunca inventa un tamaño: quien llama
 * decide qué hacer, y el precio se queda en la cota inferior conocida.
 */
async function imageDimensions(url) {
    const own = (0, http_1.parseStorageUrl)(url);
    if (!own)
        return null;
    const file = (0, storage_1.getStorage)().bucket(own.bucket).file(own.path);
    try {
        const [metadata] = await file.getMetadata();
        const custom = ((metadata === null || metadata === void 0 ? void 0 : metadata.metadata) || {});
        const guardadas = (0, exports.withPixels)({ width: Number(custom.width), height: Number(custom.height) }, 'metadata');
        if (guardadas)
            return guardadas;
    }
    catch (_a) {
        // Sin metadatos accesibles se intenta el respaldo
    }
    try {
        const [buffer] = await file.download();
        const leidas = dimensionsOf(buffer);
        return leidas ? (0, exports.withPixels)(leidas, 'file') : null;
    }
    catch (_b) {
        return null;
    }
}
//# sourceMappingURL=imageMeta.js.map