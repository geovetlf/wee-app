/*
 * Servidor de SOLO LECTURA de los medios de la demo, para la red local. Sirve una carpeta plana, con Range (los
 * reproductores de vídeo lo necesitan para saltar) y sin listar nada. No es el almacenamiento de Weë.
 *
 *   node scripts/demo/servidor-medios.mjs <carpeta> [puerto=8096]
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TIPOS = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

/** El archivo que se pide, o null si no es un archivo plano de medios. Pura salvo la comprobación del disco. */
export const resolverMedio = (carpeta, pathname) => {
  let nombre;
  try { nombre = decodeURIComponent(pathname.replace(/^\/+/, '')); } catch { return null; }
  if (!nombre || nombre !== path.basename(nombre) || nombre.startsWith('.') || !TIPOS[path.extname(nombre).toLowerCase()]) return null;
  const ruta = path.join(carpeta, nombre);
  return fs.existsSync(ruta) && fs.statSync(ruta).isFile() ? ruta : null;
};

/* Un error de lectura o un cliente que se va solo cierran esa petición: el servidor sigue vivo para las demás. */
const enviar = (lectura, res) => {
  lectura.on('error', (error) => {
    console.error(`Error de lectura: ${error.code}`);
    res.destroy();
  });
  res.on('close', () => lectura.destroy());
  lectura.pipe(res);
};

const arrancar = (carpeta, puerto) => http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  /* Las copias no cambian de contenido sin cambiar de fecha: el aparato puede guardarlas. */
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const ruta = req.method === 'GET' || req.method === 'HEAD' ? resolverMedio(carpeta, new URL(req.url, 'http://x').pathname) : null;
  res.on('finish', () => console.log(`${req.socket.remoteAddress} ${req.method} ${req.url} ${req.headers.range || '-'} ${res.statusCode}`));
  if (!ruta) { res.writeHead(404); res.end(); return; }
  const { size: total, mtimeMs } = fs.statSync(ruta);
  const etiqueta = `"${total}-${Math.round(mtimeMs)}"`;
  res.setHeader('ETag', etiqueta);
  if (req.headers['if-none-match'] === etiqueta && !req.headers.range) { res.writeHead(304); res.end(); return; }
  res.setHeader('Content-Type', TIPOS[path.extname(ruta).toLowerCase()]);
  const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (rango && (rango[1] || rango[2])) {
    const inicio = rango[1] ? Number(rango[1]) : Math.max(0, total - Number(rango[2]));
    const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), total - 1) : total - 1;
    if (inicio > fin || inicio >= total) { res.writeHead(416, { 'Content-Range': `bytes */${total}` }); res.end(); return; }
    res.writeHead(206, { 'Content-Range': `bytes ${inicio}-${fin}/${total}`, 'Content-Length': fin - inicio + 1 });
    if (req.method === 'HEAD') { res.end(); return; }
    enviar(fs.createReadStream(ruta, { start: inicio, end: fin }), res);
    return;
  }
  res.writeHead(200, { 'Content-Length': total });
  if (req.method === 'HEAD') { res.end(); return; }
  enviar(fs.createReadStream(ruta), res);
}).listen(puerto, '0.0.0.0', () => console.log(`Medios de la demo en el puerto ${puerto}, desde ${carpeta}`));

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const carpeta = process.argv[2];
  if (!carpeta || !fs.existsSync(carpeta)) { console.error('✘ Indica la carpeta de los medios.'); process.exit(2); }
  arrancar(path.resolve(carpeta), Number(process.argv[3] || 8096));
}
