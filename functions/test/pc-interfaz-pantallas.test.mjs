/*
 * MIS PROYECTOS / MIS CREACIONES — LA INTERFAZ, DIBUJADA Y TOCADA (R9, línea B · Interfaz).
 *
 * Definición de producto que se comprueba:
 *   · Mis proyectos  = trabajo EN PROCESO que se puede continuar («Continuar»).
 *   · Mis creaciones = resultados terminados que la persona DECIDIÓ conservar («Guardar en Mis creaciones»).
 *   · Local / Weë Cloud = UBICACIÓN del archivo, que no es un estado.
 *
 * Método: el de `_pantallas.mjs` (el código de VERDAD de cada pantalla transpilado al vuelo, `react-dom/server` para
 * dibujarla, un `useState` que sobrevive entre dibujados y dobles mínimos de lo que no es de Weë). Aquí el entorno se arma
 * para cualquier componente con props —`ResultCard` no es una pantalla— y el CONTRATO (`services/cicloDeTrabajo.ts`) se
 * sustituye por uno de mentira que anota cada llamada y contesta lo que pida el escenario: datos, un fallo de red o
 * `pendiente`. Sin red, sin emulador, sin Metro.
 *
 *   A · Mis proyectos: cargando, fallo + reintentar, vacío que explica cómo empezar, tarjeta con «Continuar».
 *   B · Mis creaciones: vacío DISTINTO, «todavía no disponible», fallo + reintentar, tarjeta con ubicación, «Volver a editar».
 *   C · El resultado: «Guardar en Mis creaciones» idempotente, ocupado mientras confirma, honesto si está pendiente.
 *   D · El proyecto: el mismo guardar, con la misma petición, y solo cuando no hay que elegir.
 *   E · Las funciones puras de `conservar.ts`.
 *   F · Ninguna acción falsa ni ningún texto escrito a mano.
 *   G · Las claves nuevas, en los dieciséis idiomas.
 *
 * Cada detector lleva su CONTROL, para que un verde no pueda ser un verde vacío.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { RAIZ, crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const grupo = (titulo) => console.log(`\n─── ${titulo} ───`);
const prueba = async (name, fn) => {
  try {
    const [ok, extra] = await fn();
    check(name, ok === true, extra);
  } catch (e) {
    check(name, false, `lanzó: ${e && e.message ? e.message : e}`);
  }
};

import { React, h, calma, base, crearTraductor, DICCIONARIOS, t, formato, pendiente, sinRed, crearContrato, crearMontaje } from './_pc-interfaz-montaje.mjs';
const AHORA = Date.now();

/* ═══ A · MIS PROYECTOS ═════════════════════════════════════════════════════ */
grupo('A · Mis proyectos: trabajo en proceso, con «Continuar»');
const P = crearMontaje('screens/ProjectsScreen.tsx');
{
  await prueba('A1) mientras carga, lo dice (no es un vacío)', async () => {
    P.reiniciar();
    P.estado.contrato.diferir.listarProyectosEnCurso = true;
    const d = await P.montar();
    return [d.texto.includes(t('projects.loading')) && !d.texto.includes(t('projects.emptyTitle')), d.texto.slice(0, 120)];
  });
  await prueba('A2) vacío: explica qué es un proyecto y cómo empezar, con su botón', async () => {
    P.reiniciar();
    const d = await P.montar();
    const empezar = t('projects.emptyStart');
    return [d.texto.includes(t('projects.emptyTitle')) && d.texto.includes(empezar) && d.texto.includes(t('projects.emptyText')) && !!P.boton(d, t('projects.emptyAction'))
      && !d.texto.includes(t('creaciones.emptyKeepText', { accion: t('creaciones.keep') })), empezar];
  });
  await prueba('A3) un fallo de red NO se disfraza de vacío: dice que falló y ofrece reintentar', async () => {
    P.reiniciar();
    P.estado.contrato.falla.listarProyectosEnCurso = sinRed;
    const d = await P.montar();
    return [d.texto.includes(t('projects.loadFailed')) && !d.texto.includes(t('projects.emptyTitle')) && !!P.boton(d, t('projects.retry')), d.texto.slice(0, 160)];
  });
  await prueba('A4) «Reintentar» vuelve a pedir la lista y, si ya hay red, la enseña', async () => {
    P.reiniciar();
    P.estado.contrato.falla.listarProyectosEnCurso = sinRed;
    let d = await P.montar();
    delete P.estado.contrato.falla.listarProyectosEnCurso;
    P.estado.contrato.proyectos = [{ id: 'p1', nombre: 'Mi cafetería', herramienta: 'design', actualizadoEn: AHORA - 3_600_000, estado: 'en_proceso', miniatura: null, trabajos: 2 }];
    P.tocar(d, t('projects.retry'));
    await calma();
    d = P.dibujar();
    return [P.estado.contrato.de('listarProyectosEnCurso').length === 2 && d.texto.includes('Mi cafetería'), `${P.estado.contrato.de('listarProyectosEnCurso').length} peticiones`];
  });
  await prueba('A5) la tarjeta: nombre, herramienta, modificado hace…, «En proceso» y «Continuar»', async () => {
    P.reiniciar();
    P.estado.contrato.proyectos = [{ id: 'p1', nombre: 'Mi cafetería', herramienta: 'design', actualizadoEn: AHORA - 3_600_000, estado: 'en_proceso', miniatura: null, trabajos: 2 }];
    const d = await P.montar();
    const cuando = formato.tiempoRelativo(AHORA - 3_600_000);
    const ok = d.texto.includes('Mi cafetería') && d.texto.includes('Weë Design') && d.texto.includes(t('projects.updatedAgo', { cuando }))
      && d.texto.includes(t('projects.stateInProgress')) && !!P.boton(d, t('projects.continueProject', { nombre: 'Mi cafetería' }));
    return [ok, d.texto.slice(0, 200)];
  });
  await prueba('A6) «Continuar» abre ESE proyecto', async () => {
    P.reiniciar();
    P.estado.contrato.proyectos = [{ id: 'p7', nombre: 'Logo', herramienta: null, actualizadoEn: AHORA, estado: 'en_proceso', miniatura: null, trabajos: 0 }];
    const d = await P.montar();
    P.tocar(d, t('projects.continueProject', { nombre: 'Logo' }));
    return [JSON.stringify(P.navegacion) === JSON.stringify([['navigate', 'Project', { id: 'p7' }]]), JSON.stringify(P.navegacion)];
  });
  await prueba('A7) sin miniatura no es «sin proyecto»: se ve el proyecto y se dice que no hay vista previa; con miniatura, la imagen', async () => {
    P.reiniciar();
    P.estado.contrato.proyectos = [
      { id: 'a', nombre: 'Sin foto', herramienta: null, actualizadoEn: AHORA, estado: 'en_proceso', miniatura: null, trabajos: 0 },
      { id: 'b', nombre: 'Con foto', herramienta: 'photo', actualizadoEn: AHORA, estado: 'en_proceso', miniatura: 'https://x.test/m.png', trabajos: 1 },
    ];
    const d = await P.montar();
    const imagenes = (d.html.match(/data-imagen/g) || []).length;
    const sinVista = d.etiquetas.filter((e) => e === t('projects.noThumbnail')).length;
    return [imagenes === 1 && sinVista === 1 && d.texto.includes('Sin foto') && d.texto.includes('Con foto'), `${imagenes} imagen(es), ${sinVista} sin vista previa`];
  });
  await prueba('A8) herramienta desconocida o mezclada (null) no se inventa', async () => {
    P.reiniciar();
    P.estado.contrato.proyectos = [{ id: 'a', nombre: 'Mezcla', herramienta: null, actualizadoEn: 0, estado: 'en_proceso', miniatura: null, trabajos: 3 }];
    const d = await P.montar();
    const hay = ['Weë Design', 'Weë Studio', 'Weë Photo', 'Weë Writer'].some((n) => d.texto.includes(n));
    return [!hay && !d.texto.includes(t('projects.updatedAgo', { cuando: '' }).trim()), d.texto.slice(0, 160)];
  });
  await prueba('A9) con el contrato `pendiente`, se ven los proyectos GUARDADOS de la cuenta (reales), no un vacío ni un error', async () => {
    P.reiniciar();
    P.estado.contrato.falla.listarProyectosEnCurso = pendiente;
    P.estado.proyectosGuardados = [{ id: 'g1', userId: 'u1', name: 'Guardado', emoji: '🍔', updatedAt: AHORA, createdAt: AHORA }];
    const d = await P.montar();
    return [d.texto.includes('Guardado') && d.texto.includes('🍔') && !d.texto.includes(t('projects.loadFailed')) && !!P.boton(d, t('projects.continueProject', { nombre: 'Guardado' })), d.texto.slice(0, 160)];
  });
  await prueba('A9) CONTROL: con el contrato disponible, NO se usa la lista antigua', async () => {
    P.reiniciar();
    P.estado.contrato.proyectos = [{ id: 'c1', nombre: 'Del contrato', herramienta: null, actualizadoEn: AHORA, estado: 'en_proceso', miniatura: null, trabajos: 0 }];
    P.estado.proyectosGuardados = [{ id: 'g1', userId: 'u1', name: 'Guardado', emoji: '🍔', updatedAt: AHORA }];
    const d = await P.montar();
    return [d.texto.includes('Del contrato') && !d.texto.includes('Guardado'), d.texto.slice(0, 120)];
  });
}

/* ═══ B · MIS CREACIONES ════════════════════════════════════════════════════ */
grupo('B · Mis creaciones: lo que se decidió conservar');
const C = crearMontaje('screens/MisCreacionesScreen.tsx', () => ({ '../services/assetDownload': { descargarCreacion: async () => 'guardado' } }));
const creacion = (extra = {}) => ({ id: 'c1', assetIds: ['a1'], nombre: 'Logo final', tipo: 'image', herramienta: 'design', finalizadaEn: AHORA - 60_000, proyectoOrigenId: 'p1', ubicacion: 'wee_cloud', ...extra });
{
  await prueba('B1) mientras carga, lo dice', async () => {
    C.reiniciar();
    C.estado.contrato.diferir.listarCreacionesFinales = true;
    const d = await C.montar();
    return [d.texto.includes(t('creaciones.loading')), d.texto.slice(0, 120)];
  });
  await prueba('B2) vacío DISTINTO del de Mis proyectos: aparecen cuando terminas y guardas un resultado', async () => {
    C.reiniciar();
    const d = await C.montar();
    const guardar = t('creaciones.emptyKeepText', { accion: t('creaciones.keep') });
    return [d.texto.includes(guardar) && !d.texto.includes(t('projects.emptyStart')) && !!C.boton(d, t('creaciones.emptyAction')), guardar];
  });
  check('B2) CONTROL: los dos vacíos son frases distintas; el de creaciones nombra cómo se conserva y el de proyectos dice qué es un proyecto',
    t('creaciones.emptyKeepText', { accion: t('creaciones.keep') }) !== t('projects.emptyStart')
    && t('creaciones.emptyKeepText', { accion: t('creaciones.keep') }).includes(t('creaciones.keep'))
    && !t('projects.emptyStart').includes(t('creaciones.keep')) && t('projects.emptyStart') !== t('projects.emptyText'));
  await prueba('B3) contrato `pendiente`: lo dice con honestidad, sin creaciones inventadas ni «vacío»', async () => {
    C.reiniciar();
    C.estado.contrato.falla.listarCreacionesFinales = pendiente;
    const d = await C.montar();
    return [d.texto.includes(t('creaciones.listPending')) && !d.texto.includes(t('creaciones.emptyTitle')) && !d.texto.includes(t('creaciones.loadFailed')), d.texto.slice(0, 200)];
  });
  await prueba('B4) un fallo de red: lo dice y «Reintentar» vuelve a pedir', async () => {
    C.reiniciar();
    C.estado.contrato.falla.listarCreacionesFinales = sinRed;
    let d = await C.montar();
    const primero = d.texto.includes(t('creaciones.loadFailed')) && !d.texto.includes(t('creaciones.emptyTitle'));
    delete C.estado.contrato.falla.listarCreacionesFinales;
    C.estado.contrato.creaciones = [creacion()];
    C.tocar(d, t('creaciones.retry'));
    await calma();
    d = C.dibujar();
    return [primero && d.texto.includes('Logo final') && C.estado.contrato.de('listarCreacionesFinales').length === 2, d.texto.slice(0, 160)];
  });
  await prueba('B5) la tarjeta: tipo, herramienta, proyecto de origen (su nombre), cuándo se guardó y DÓNDE está', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion()];
    C.estado.proyectosGuardados = [{ id: 'p1', userId: 'u1', name: 'Mi cafetería', emoji: '☕' }];
    const d = await C.montar();
    const ok = d.texto.includes('Logo final') && d.texto.includes(t('creaciones.kindImage'))
      && d.texto.includes(t('creaciones.createdWith', { nombre: 'Weë Design' }))
      && d.texto.includes(t('creaciones.fromProject', { proyecto: 'Mi cafetería' }))
      && d.texto.includes(t('creaciones.savedAgo', { cuando: formato.tiempoRelativo(AHORA - 60_000) }))
      && d.texto.includes(t('creaciones.locationCloud'))
      && d.etiquetas.includes(t('creaciones.locationLabel', { lugar: t('creaciones.locationCloud') }));
    return [ok, d.texto.slice(0, 260)];
  });
  await prueba('B6) la ubicación sale del dato: local, Weë Cloud y almacenamiento anterior, cada una con su texto', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion({ id: 'l', ubicacion: 'local' }), creacion({ id: 'w', ubicacion: 'wee_cloud' }), creacion({ id: 'r', ubicacion: 'remoto_legado' })];
    const d = await C.montar();
    const tres = ['locationLocal', 'locationCloud', 'locationLegacy'].every((k) => d.texto.includes(t(`creaciones.${k}`)));
    return [tres, ''];
  });
  await prueba('B6) CONTROL: una creación SOLO en local no dice «Weë Cloud»', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion({ ubicacion: 'local' })];
    const d = await C.montar();
    return [d.texto.includes(t('creaciones.locationLocal')) && !d.texto.includes(t('creaciones.locationCloud')), ''];
  });
  await prueba('B7) proyecto de origen que ya no está (o sin proyecto): no se inventa un nombre', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion({ proyectoOrigenId: 'borrado' }), creacion({ id: 'c2', proyectoOrigenId: null })];
    C.estado.proyectosGuardados = [{ id: 'p1', name: 'Otro' }];
    const d = await C.montar();
    return [!d.texto.includes(t('creaciones.fromProject', { proyecto: '' }).trim().split(' ')[0] + ' proyecto'), d.texto.slice(0, 200)];
  });
  await prueba('B8) «Volver a editar» pide reabrir ESA creación y abre el proyecto que devuelve el contrato', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion()];
    C.estado.contrato.reabrir = { proyectoId: 'p-vinculado', nuevo: true };
    const d = await C.montar();
    C.tocar(d, t('creaciones.editAgainOf', { nombre: 'Logo final' }));
    await calma();
    return [JSON.stringify(C.estado.contrato.de('reabrirParaEditar')) === JSON.stringify([['reabrirParaEditar', 'c1']])
      && JSON.stringify(C.navegacion) === JSON.stringify([['navigate', 'Project', { id: 'p-vinculado' }]]), JSON.stringify(C.navegacion)];
  });
  await prueba('B9) «Volver a editar» con el contrato `pendiente`: lo dice y NO navega', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion()];
    C.estado.contrato.falla.reabrirParaEditar = pendiente;
    const d = await C.montar();
    C.tocar(d, t('creaciones.editAgainOf', { nombre: 'Logo final' }));
    await calma();
    return [C.navegacion.length === 0 && C.avisos.includes(t('creaciones.editAgainPending')), JSON.stringify(C.avisos)];
  });
  await prueba('B10) «Volver a editar» dos veces seguidas: una sola petición; ocupado mientras abre', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion()];
    C.estado.contrato.diferir.reabrirParaEditar = true;
    const d = await C.montar();
    const etiqueta = t('creaciones.editAgainOf', { nombre: 'Logo final' });
    C.tocar(d, etiqueta);
    C.tocar(d, etiqueta);
    const ocupado = C.boton(C.dibujar(), etiqueta)?.apagado === true;
    C.estado.contrato.pendientes.forEach((p) => p.ok());
    await calma();
    return [C.estado.contrato.de('reabrirParaEditar').length === 1 && ocupado, `${C.estado.contrato.de('reabrirParaEditar').length} petición(es), ocupado=${ocupado}`];
  });
  await prueba('B11) «Cargar más» solo si el contrato dice que hay más, y pide con su cursor', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion()];
    C.estado.contrato.siguiente = { cursor: 1 };
    const d = await C.montar();
    const hay = !!C.boton(d, t('creaciones.loadMore'));
    C.estado.contrato.siguiente = undefined;
    C.tocar(d, t('creaciones.loadMore'));
    await calma();
    const segunda = C.estado.contrato.de('listarCreacionesFinales')[1];
    const d2 = C.dibujar();
    return [hay && JSON.stringify(segunda?.[2]) === JSON.stringify({ cursor: 1 }) && !C.boton(d2, t('creaciones.loadMore')), JSON.stringify(segunda)];
  });
  await prueba('B13) entrar lee UNA vez; cambiar de filtro no vuelve a leer (el filtro mira lo ya cargado)', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion(), creacion({ id: 'v', tipo: 'video', nombre: 'Clip' })];
    const d = await C.montar();
    const alEntrar = C.estado.contrato.de('listarCreacionesFinales').length;
    C.tocar(d, t('creaciones.filterVideos'));
    await calma();
    const d2 = C.dibujar();
    const despues = C.estado.contrato.de('listarCreacionesFinales').length;
    return [alEntrar === 1 && despues === 1 && d2.texto.includes('Clip') && !d2.texto.includes('Logo final'), `${alEntrar} al entrar, ${despues} tras filtrar`];
  });
  await prueba('B13) CONTROL: volver a la pantalla (foco) sí vuelve a leer, una vez', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion()];
    await C.montar();
    C.enfocar();
    await calma();
    return [C.estado.contrato.de('listarCreacionesFinales').length === 2, String(C.estado.contrato.de('listarCreacionesFinales').length)];
  });
  await prueba('B12) ninguna acción que no exista: ni «Eliminar», ni «Publicar», ni «Compartir», ni «Descargar» en la lista', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion()];
    const d = await C.montar();
    const falsas = ['delete', 'publish', 'share', 'download', 'useInProject', 'open'].map((k) => t(`creaciones.${k}`)).filter((e) => d.botones.some((b) => b.etiqueta === e));
    return [falsas.length === 0, falsas.join(' · ')];
  });
}

/* ═══ C · EL RESULTADO: «GUARDAR EN MIS CREACIONES» ═════════════════════════ */
grupo('C · El resultado: guardar en Mis creaciones, idempotente y honesto');
const R = crearMontaje('components/creator/ResultCard.tsx', ({ h: hh }) => ({
  '../../i18n/servidor': { textoDelServidor: (s) => s, textoDeObjetivo: (_t, _e, g) => g },
  '../../services/assetDownload': { descargarCreacion: async () => 'guardado' },
  './TarjetaTresD': { TarjetaTresD: () => hh('div') },
}));
const trabajo = (extra = {}) => ({
  id: 'j1', userId: 'u1', experienceId: 'design', goal: 'Un logo', questions: [], answers: [], plan: null, steps: [], status: 'done',
  results: [{ stepId: 'logo', kind: 'image', title: 'Logo', url: 'https://x.test/logo.png', assetIds: ['a1'] }],
  progressText: '', creditsEstimated: 2, creditsCharged: 2, demo: false, projectId: 'p1', ...extra,
});
const propsDe = (job, extra = {}) => ({ experienceName: 'Weë Design', job, busy: false, onAnotherVersion: () => {}, onEdit: () => {}, onPublish: () => {}, ...extra });
const GUARDAR = t('creaciones.keep');
const K = base('components/creator/conservar.ts');
const FORMA_DE_REQUEST_ID = /^[A-Za-z0-9_.:-]{8,128}$/;
{
  await prueba('C1) con material real, se ofrece «Guardar en Mis creaciones» (y NO «ya guardada» antes de decidirlo)', async () => {
    R.reiniciar();
    const d = R.dibujar(propsDe(trabajo(), { onOpenCreations: () => {} }));
    return [!!R.boton(d, GUARDAR) && !d.texto.includes(t('creaciones.savedInCreations')), d.botones.map((b) => b.etiqueta).join(' · ')];
  });
  await prueba('C2) guardar llama UNA vez al contrato con los materiales, el proyecto de origen y un requestId estable', async () => {
    R.reiniciar();
    const props = propsDe(trabajo(), { onOpenCreations: () => {} });
    const d = R.dibujar(props);
    R.tocar(d, GUARDAR);
    await calma();
    const [llamada] = R.estado.contrato.de('finalizarCreacion');
    const e = llamada?.[1];
    return [R.estado.contrato.de('finalizarCreacion').length === 1 && JSON.stringify(e?.assetIds) === '["a1"]' && e?.proyectoOrigenId === 'p1' && e?.requestId === K.peticionDeConservar('j1', ['a1']) && FORMA_DE_REQUEST_ID.test(e?.requestId), JSON.stringify(e)];
  });
  await prueba('C3) doble toque: una sola petición, y el botón queda ocupado («Guardando…») mientras confirma', async () => {
    R.reiniciar();
    R.estado.contrato.diferir.finalizarCreacion = true;
    const props = propsDe(trabajo(), { onOpenCreations: () => {} });
    const d = R.dibujar(props);
    R.tocar(d, GUARDAR);
    R.tocar(d, GUARDAR);
    const ocupado = R.dibujar(props);
    const b = R.boton(ocupado, GUARDAR);
    const okOcupado = b?.apagado === true && ocupado.texto.includes(t('creaciones.keeping'));
    R.estado.contrato.pendientes.forEach((p) => p.ok());
    await calma();
    return [R.estado.contrato.de('finalizarCreacion').length === 1 && okOcupado, `${R.estado.contrato.de('finalizarCreacion').length} petición(es)`];
  });
  await prueba('C4) confirmado: dice «Guardada en tus creaciones» y lleva a la biblioteca; ya no ofrece guardar otra vez', async () => {
    R.reiniciar();
    let abierta = 0;
    const props = propsDe(trabajo(), { onOpenCreations: () => { abierta++; } });
    R.tocar(R.dibujar(props), GUARDAR);
    await calma();
    const d = R.dibujar(props);
    R.tocar(d, t('creaciones.savedInCreations'));
    return [!R.boton(d, GUARDAR) && abierta === 1, d.botones.map((b) => b.etiqueta).join(' · ')];
  });
  await prueba('C5) contrato `pendiente`: avisa que todavía no está disponible y NO finge que quedó guardada', async () => {
    R.reiniciar();
    R.estado.contrato.falla.finalizarCreacion = pendiente;
    const props = propsDe(trabajo(), { onOpenCreations: () => {} });
    R.tocar(R.dibujar(props), GUARDAR);
    await calma();
    const d = R.dibujar(props);
    return [R.avisos.includes(t('creaciones.keepPending')) && !d.texto.includes(t('creaciones.savedInCreations')) && R.boton(d, GUARDAR)?.apagado === false, JSON.stringify(R.avisos)];
  });
  await prueba('C6) fallo de red: lo dice (otro texto) y el botón pasa a «Reintentar»', async () => {
    R.reiniciar();
    R.estado.contrato.falla.finalizarCreacion = sinRed;
    const props = propsDe(trabajo(), { onOpenCreations: () => {} });
    R.tocar(R.dibujar(props), GUARDAR);
    await calma();
    const d = R.dibujar(props);
    return [R.avisos.includes(t('creaciones.keepFailed')) && !R.avisos.includes(t('creaciones.keepPending')) && !!R.boton(d, t('creaciones.keepRetry')) && d.texto.includes(t('creaciones.retry')), JSON.stringify(R.avisos)];
  });
  await prueba('C7) lo de muestra (demo), o un resultado sin material ni texto, no se puede «guardar»: no hay botón', async () => {
    R.reiniciar();
    const demo = R.dibujar(propsDe(trabajo({ demo: true, results: [{ stepId: 'logo', kind: 'image', title: 'Logo', url: 'https://x.test/logo.png', demo: true, assetIds: ['a1'] }] })));
    const texto = R.dibujar(propsDe(trabajo({ results: [{ stepId: 'txt', kind: 'text', title: 'Idea', content: '' }] })));
    return [!R.boton(demo, GUARDAR) && !R.boton(texto, GUARDAR), ''];
  });
  await prueba('C8) CONTROL: el mismo trabajo con material real sí lo ofrece (el detector de C7 ve el botón cuando existe)', async () => {
    R.reiniciar();
    return [!!R.boton(R.dibujar(propsDe(trabajo())), GUARDAR), ''];
  });
  await prueba('C9) sin `onOpenCreations`, la constancia se ve pero no es un botón que no lleva a ninguna parte', async () => {
    R.reiniciar();
    const props = propsDe(trabajo());
    R.tocar(R.dibujar(props), GUARDAR);
    await calma();
    const d = R.dibujar(props);
    return [d.texto.includes(t('creaciones.savedInCreations')) && !R.boton(d, t('creaciones.savedInCreations')), ''];
  });
}

/* ═══ D · EL PROYECTO: EL MISMO GUARDAR ═════════════════════════════════════ */
grupo('D · El proyecto: guardar en Mis creaciones con la misma petición');
const PJ = crearMontaje('screens/ProjectScreen.tsx');
{
  const montarProyecto = async (trabajos, proyecto = { id: 'p1', userId: 'u1', name: 'Mi cafetería', emoji: '☕' }) => {
    PJ.reiniciar();
    PJ.estado.params = { id: 'p1' };
    PJ.estado.proyecto = () => proyecto;
    PJ.estado.trabajos = () => trabajos;
    return PJ.montar();
  };
  await prueba('D1) un trabajo terminado con un material: «Guardar en Mis creaciones» con la MISMA petición que el resultado', async () => {
    const d = await montarProyecto([trabajo()]);
    PJ.tocar(d, GUARDAR);
    await calma();
    const e = PJ.estado.contrato.de('finalizarCreacion')[0]?.[1];
    return [e?.requestId === K.peticionDeConservar('j1', ['a1']) && FORMA_DE_REQUEST_ID.test(e?.requestId) && e?.proyectoOrigenId === 'p1', JSON.stringify(e)];
  });
  await prueba('D2) con varias propuestas sin elegir, desde el proyecto NO se decide por la persona: no hay botón', async () => {
    const d = await montarProyecto([trabajo({ results: [{ stepId: 'logo', kind: 'image', title: 'Logo', url: 'https://x.test/1.png', urls: ['https://x.test/1.png', 'https://x.test/2.png'], assetIds: ['a1', 'a2'] }] })]);
    return [!PJ.boton(d, GUARDAR), d.botones.map((b) => b.etiqueta).join(' · ')];
  });
  await prueba('D3) un trabajo que no ha terminado no se puede guardar', async () => {
    const d = await montarProyecto([trabajo({ status: 'running' })]);
    return [!PJ.boton(d, GUARDAR), ''];
  });
  await prueba('D4) leer el proyecto falla → lo dice y reintenta (no «No encontramos este proyecto»)', async () => {
    PJ.reiniciar();
    PJ.estado.params = { id: 'p1' };
    PJ.estado.proyecto = () => { throw sinRed(); };
    const d = await PJ.montar();
    return [d.texto.includes(t('projects.loadProjectFailed')) && !d.texto.includes(t('projects.notFound')) && !!PJ.boton(d, t('projects.retry')), d.texto.slice(0, 160)];
  });
  await prueba('D5) leer sus trabajos falla → lo dice y reintenta (no «Todavía no hay creaciones aquí»)', async () => {
    PJ.reiniciar();
    PJ.estado.params = { id: 'p1' };
    PJ.estado.proyecto = () => ({ id: 'p1', name: 'Mi cafetería', emoji: '☕' });
    PJ.estado.trabajos = () => { throw sinRed(); };
    const d = await PJ.montar();
    return [d.texto.includes(t('projects.jobsLoadFailed')) && !d.texto.includes(t('projects.noCreations')) && !!PJ.boton(d, t('projects.retry')), d.texto.slice(0, 200)];
  });
  await prueba('D6) renombrar con el MISMO nombre no escribe; con otro, escribe una vez', async () => {
    let d = await montarProyecto([]);
    PJ.tocar(d, t('projects.rename'));
    d = PJ.dibujar();
    await PJ.tocar(d, t('projects.saveName'));
    const sinCambio = PJ.estado.renombrados.length;
    d = PJ.dibujar();
    PJ.tocar(d, t('projects.rename'));
    d = PJ.dibujar();
    PJ.estado.escribir('Mi cafetería nueva');
    d = PJ.dibujar();
    await PJ.tocar(d, t('projects.saveName'));
    return [sinCambio === 0 && PJ.estado.renombrados.length === 1 && PJ.estado.renombrados[0][1] === 'Mi cafetería nueva', JSON.stringify(PJ.estado.renombrados)];
  });
  await prueba('D5) CONTROL: con sus trabajos vacíos de verdad, sí dice que no hay nada', async () => {
    const d = await montarProyecto([]);
    return [d.texto.includes(t('projects.noCreations')) && !d.texto.includes(t('projects.jobsLoadFailed')), ''];
  });
}

/* ═══ E · LAS FUNCIONES PURAS ═══════════════════════════════════════════════ */
/* ═══ H · «SIN DECIDIR» (D-1) ═══════════════════════════════════════════════ */
grupo('H · Sin decidir: el material anterior, aparte, sin migrar ni borrar (D-1)');
const asset = (extra = {}) => ({
  assetId: 'as1', ownerAccountId: 'u1', kind: 'image', status: 'ready', name: 'Cartel viejo',
  delivery: { url: 'https://x.test/cartel.png' }, provenance: { createdAt: 1, jobId: 'jv' }, metadata: { experienceId: 'design' }, ...extra,
});
{
  await prueba('H1) `listarSinDecidir` no disponible: la sección lo dice con honestidad y las creaciones siguen viéndose', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion()];
    const d = await C.montar();
    return [d.texto.includes(t('creaciones.undecidedTitle')) && d.texto.includes(t('creaciones.undecidedPending')) && d.texto.includes('Logo final'), d.texto.slice(-260)];
  });
  await prueba('H2) publicada: el material sale APARTE (tras su título y su explicación), sin contarse como creación', async () => {
    C.reiniciar();
    C.estado.contrato.publicar();
    C.estado.contrato.creaciones = [creacion()];
    C.estado.contrato.sinDecidir = [asset()];
    const d = await C.montar();
    const iTitulo = d.texto.indexOf(t('creaciones.undecidedTitle'));
    const ok = iTitulo > d.texto.indexOf('Logo final') && d.texto.indexOf('Cartel viejo') > iTitulo
      && d.texto.includes(t('creaciones.undecidedText')) && d.texto.includes(t('creaciones.count', { contador: 1 }))
      && !!C.boton(d, t('creaciones.keepAsCreationOf', { nombre: 'Cartel viejo' }));
    return [ok, d.texto.slice(-300)];
  });
  await prueba('H3) «Conservar como creación»: una petición con ESE material y la misma petición que desde su resultado; sale de «Sin decidir» y se recarga la lista', async () => {
    C.reiniciar();
    C.estado.contrato.publicar();
    C.estado.contrato.sinDecidir = [asset()];
    const d = await C.montar();
    const etiqueta = t('creaciones.keepAsCreationOf', { nombre: 'Cartel viejo' });
    C.tocar(d, etiqueta);
    C.tocar(d, etiqueta);
    await calma();
    const d2 = C.dibujar();
    const e = C.estado.contrato.de('finalizarCreacion');
    return [e.length === 1 && JSON.stringify(e[0][1].assetIds) === '["as1"]' && e[0][1].requestId === K.peticionDeConservar('jv', ['as1']) && e[0][1].proyectoOrigenId === null
      && !d2.texto.includes('Cartel viejo') && C.estado.contrato.de('listarCreacionesFinales').length === 2 && C.avisos.includes(t('creaciones.savedInCreations')), JSON.stringify(e)];
  });
  await prueba('H4) conservar con el callable sin conectar (`no_disponible`): lo dice y el material se queda donde estaba', async () => {
    C.reiniciar();
    C.estado.contrato.publicar();
    C.estado.contrato.sinDecidir = [asset()];
    C.estado.contrato.falla.finalizarCreacion = () => Object.assign(new Error('no_disponible'), { code: 'no_disponible' });
    const d = await C.montar();
    C.tocar(d, t('creaciones.keepAsCreationOf', { nombre: 'Cartel viejo' }));
    await calma();
    const d2 = C.dibujar();
    return [C.avisos.includes(t('creaciones.keepPending')) && d2.texto.includes('Cartel viejo') && !C.avisos.includes(t('creaciones.savedInCreations')), JSON.stringify(C.avisos)];
  });
  await prueba('H5) un fallo de «Sin decidir» se dice con su reintento y NO tapa las creaciones', async () => {
    C.reiniciar();
    C.estado.contrato.publicar();
    C.estado.contrato.creaciones = [creacion()];
    C.estado.contrato.falla.listarSinDecidir = sinRed;
    const d = await C.montar();
    return [d.texto.includes(t('creaciones.undecidedFailed')) && d.texto.includes('Logo final') && !!C.boton(d, t('creaciones.undecidedRetry')), ''];
  });
  await prueba('H6) abrir un material sin decidir lo lleva a su trabajo, como antes', async () => {
    C.reiniciar();
    C.estado.contrato.publicar();
    C.estado.contrato.sinDecidir = [asset()];
    const d = await C.montar();
    C.tocar(d, t('creaciones.openCreation', { nombre: 'Cartel viejo' }));
    return [JSON.stringify(C.navegacion) === JSON.stringify([['navigate', 'CreatorFlow', { experienceId: 'design', jobId: 'jv' }]]), JSON.stringify(C.navegacion)];
  });
  await prueba('H7) en «Sin decidir» no se ofrece borrar (D-5: sin la vista previa de lo que se eliminaría, no hay botón)', async () => {
    C.reiniciar();
    C.estado.contrato.publicar();
    C.estado.contrato.sinDecidir = [asset()];
    const d = await C.montar();
    return [!C.boton(d, t('creaciones.delete')), ''];
  });
  await prueba('H8) «Sincronizado» frente a «En este dispositivo» (D-4), con el dato de la creación', async () => {
    C.reiniciar();
    C.estado.contrato.creaciones = [creacion({ id: 'l', ubicacion: 'local' }), creacion({ id: 'w', ubicacion: 'wee_cloud' })];
    const d = await C.montar();
    return [d.texto.includes(t('creaciones.locationLocal')) && d.texto.includes(t('creaciones.locationCloud')) && /Sincronizado/.test(t('creaciones.locationCloud')), t('creaciones.locationCloud')];
  });
}

/* ═══ I · TEXTOS FINALES (D-3) ══════════════════════════════════════════════ */
grupo('I · El texto final se puede guardar; lo provisional, no (D-3)');
{
  const receta = (extra = {}) => trabajo({ experienceId: 'chef', results: [{ stepId: 'recipe', kind: 'text', title: 'Receta', content: 'Tortilla: huevos, patatas.' }], ...extra });
  const conPropiedades = (job) => propsDe(job, { onOpenCreations: () => {} });
  await prueba('I1) un trabajo de TEXTO terminado ofrece «Guardar en Mis creaciones» y llama a `guardarTextoFinal` con su texto y su herramienta', async () => {
    R.reiniciar();
    R.estado.contrato.publicar();
    const props = conPropiedades(receta());
    R.tocar(R.dibujar(props), GUARDAR);
    await calma();
    const e = R.estado.contrato.de('guardarTextoFinal')[0]?.[1];
    const d = R.dibujar(props);
    return [e?.texto === 'Tortilla: huevos, patatas.' && e?.herramienta === 'chef' && e?.proyectoOrigenId === 'p1' && e?.requestId === K.peticionDeTexto('j1', 'Tortilla: huevos, patatas.') && FORMA_DE_REQUEST_ID.test(e?.requestId)
      && R.estado.contrato.de('finalizarCreacion').length === 0 && d.texto.includes(t('creaciones.savedInCreations')), JSON.stringify(e)];
  });
  await prueba('I2) `guardarTextoFinal` sin el callable conectado (`no_disponible`): avisa que todavía no está disponible y no finge éxito', async () => {
    R.reiniciar();
    const props = conPropiedades(receta());
    R.tocar(R.dibujar(props), GUARDAR);
    await calma();
    const d = R.dibujar(props);
    return [R.avisos.includes(t('creaciones.keepPending')) && !d.texto.includes(t('creaciones.savedInCreations')), JSON.stringify(R.avisos)];
  });
  await prueba('I3) lo provisional (trabajo sin terminar) y lo de muestra NO ofrecen guardar', async () => {
    R.reiniciar();
    const enCurso = R.dibujar(conPropiedades(receta({ status: 'running' })));
    const muestra = R.dibujar(conPropiedades(receta({ demo: true })));
    return [!R.boton(enCurso, GUARDAR) && !R.boton(muestra, GUARDAR), ''];
  });
  await prueba('I4) CONTROL: con materiales, se conservan los materiales (no el texto): un solo botón y `finalizarCreacion`', async () => {
    R.reiniciar();
    R.estado.contrato.publicar();
    const job = trabajo({ results: [...trabajo().results, { stepId: 'idea', kind: 'text', title: 'Idea', content: 'Un texto' }] });
    const d = R.dibujar(conPropiedades(job));
    const cuantos = d.botones.filter((b) => b.etiqueta === GUARDAR).length;
    R.tocar(d, GUARDAR);
    await calma();
    return [cuantos === 1 && R.estado.contrato.de('finalizarCreacion').length === 1 && R.estado.contrato.de('guardarTextoFinal').length === 0, `${cuantos} botón(es)`];
  });
}

grupo('E · conservar.ts');
{
  const k = base('components/creator/conservar.ts');
  check('E1) lo que se mira: un material por resultado; de varias propuestas, la elegida',
    JSON.stringify(k.materialesParaConservar([{ stepId: 'a', assetIds: ['x'] }, { stepId: 'b', urls: ['1', '2'], assetIds: ['y1', 'y2'] }], { b: 1 })) === '["x","y2"]');
  check('E2) sin elección y con varias propuestas: null (no se decide por la persona)', k.materialesParaConservar([{ stepId: 'b', urls: ['1', '2'], assetIds: ['y1', 'y2'] }]) === null);
  check('E3) demo y texto no cuentan; sin nada: null', k.materialesParaConservar([{ stepId: 'a', assetIds: ['x'], demo: true }, { stepId: 't' }]) === null);
  check('E4) la petición no depende del orden de los materiales', k.peticionDeConservar('j', ['b', 'a']) === k.peticionDeConservar('j', ['a', 'b']));
  check('E4) CONTROL: otro trabajo u otro material es otra petición', k.peticionDeConservar('j', ['a']) !== k.peticionDeConservar('k', ['a']) && k.peticionDeConservar('j', ['a']) !== k.peticionDeConservar('j', ['b']));
  const FORMA = /^[A-Za-z0-9_.:-]{8,128}$/;
  const muchos = Array.from({ length: 50 }, (_, n) => `asset_${n}_abcdefghijklmnop`);
  check('E6) las tres peticiones cumplen la forma que exige el servidor, aun con 50 materiales',
    FORMA.test(k.peticionDeConservar('j1', muchos)) && FORMA.test(k.peticionDeTexto('j1', 'x'.repeat(5000)))
    && FORMA.test(k.peticionDeLocal('j1', [{ projectId: 'p_1', recursoId: 'r/1', sha256: 'a'.repeat(64) }])));
  check('E6) CONTROL: pegar los ids (la forma de antes) no la cumple', !FORMA.test(`conservar:j1:${muchos.join(',')}`));
  check('E5) `pendiente` y `no_disponible` son «todavía no»; un fallo de red no', k.esNoDisponible(pendiente()) && k.esNoDisponible({ code: 'no_disponible' }) && !k.esNoDisponible(sinRed()) && !k.esNoDisponible(null));
}

/* ═══ F · NINGUNA ACCIÓN FALSA, NINGÚN TEXTO A MANO ═════════════════════════ */
grupo('F · Sin acciones falsas ni textos a mano');
const ARCHIVOS = ['screens/ProjectsScreen.tsx', 'screens/ProjectScreen.tsx', 'screens/MisCreacionesScreen.tsx', 'components/creator/RejillaDeCreaciones.tsx', 'components/creator/ResultCard.tsx', 'components/creator/BotonConservar.tsx', 'components/creator/conservar.ts'];
/*
 * Una frase de interfaz escrita a mano: un literal con tildes/eñes/¿¡, o que empieza en mayúscula y tiene más de una
 * palabra («Guardar en tus creaciones», «Save to your library»); o texto suelto entre etiquetas JSX. La marca (Weë, Weë AI)
 * no cuenta. Los `console.warn` son para quien depura, no para la persona.
 */
const MARCA = /^[^A-Za-zÁ-ú]*Weë(?: AI)?$/;
const sueltasDe = (codigo, nombre) => {
  const fuera = [];
  sinComentarios(codigo).split('\n').forEach((l, i) => {
    if (/console\.(warn|error|log)/.test(l)) return;
    for (const m of l.matchAll(/(['"`])([^'"`\n]+)\1/g)) {
      const v = m[2];
      if (MARCA.test(v)) continue;
      if (/[áéíóúñ¿¡]/i.test(v) || /^[A-ZÁ-Ú][a-zá-ú]+(?:\s+\S+)+$/.test(v)) fuera.push(`${nombre}:${i + 1} ${v.slice(0, 40)}`);
    }
    for (const m of l.matchAll(/>\s*([A-Za-zÁ-ú][^<>{}\n]*[A-Za-zá-ú])\s*</g)) fuera.push(`${nombre}:${i + 1} (jsx) ${m[1].slice(0, 40)}`);
  });
  return fuera;
};
{
  const sueltas = ARCHIVOS.flatMap((a) => sueltasDe(leer(a), a.split('/').pop()));
  check('F1) ninguna frase de interfaz escrita a mano en los siete archivos', sueltas.length === 0, sueltas.slice(0, 4).join(' | '));
  check('F1) CONTROL: el detector ve una frase a mano cuando la hay', sueltasDe("const x = 'Guardar en tus creaciones';", 'x').length === 1 && sueltasDe("const y = 'Save to your library';", 'y').length === 1);
  const claves = ARCHIVOS.flatMap((a) => [...leer(a).matchAll(/t\('((?:projects|creaciones)\.[A-Za-z0-9_]+)'/g)].map((m) => m[1]));
  const rotas = [...new Set(claves)].filter((c) => [t, crearTraductor('en', DICCIONARIOS, {})].some((tt) => tt(c, { contador: 1, accion: 'x', nombre: 'x', cuando: 'x', lugar: 'x', proyecto: 'x' }) === c));
  check(`F2) las ${new Set(claves).size} claves de projects/creaciones que se piden existen en español e inglés`, rotas.length === 0, rotas.join(' '));
  const mis = sinComentarios(leer('screens/MisCreacionesScreen.tsx'));
  check('F3) Mis creaciones ya no lista cada material generado ni borra archivos desde la lista', !/assetsService\.(listar|eliminar)/.test(mis) && /listarCreacionesFinales\(user\.uid/.test(mis));
  check('F4) ninguna de las cuatro piezas suma, resta ni cobra Credits ni llama a una IA', !/spendCredits|creditsBalance|httpsCallable|aiRouter|gemini|seedance/i.test(ARCHIVOS.map((a) => sinComentarios(leer(a))).join('\n')));
  const tarjeta = sinComentarios(leer('components/creator/ResultCard.tsx'));
  const boton = sinComentarios(leer('components/creator/BotonConservar.tsx'));
  const proyecto = sinComentarios(leer('screens/ProjectScreen.tsx'));
  check('F5) el resultado ya no afirma «guardada» sin que la persona lo haya decidido: la constancia sale solo tras confirmar',
    /<BotonConservar /.test(tarjeta) && !/publicable\.assetId && onOpenCreations/.test(tarjeta) && /if \(yaConservada\)/.test(boton) && /setConservada\(\{ peticion, yaExistia: r\?\.yaExistia === true \}\)/.test(boton));
  check('F6) el resultado y el proyecto usan EL MISMO botón: ni dos lógicas de guardar ni dos requestId',
    /<BotonConservar /.test(proyecto) && !/finalizarCreacion|peticionDeConservar/.test(tarjeta + proyecto));
}

/* ═══ G · LAS CLAVES NUEVAS, EN LOS DIECISÉIS IDIOMAS ════════════════════════ */
grupo('G · Dieciséis idiomas');
{
  const IDIOMAS = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos')).filter((d) => fs.existsSync(path.resolve(RAIZ, 'i18n/textos', d, 'projects.ts')));
  const NUEVAS = {
    projects: ['loading', 'loadFailed', 'retry', 'emptyStart', 'stateInProgress', 'updatedAgo', 'continue', 'continueProject', 'noThumbnail', 'loadProjectFailed', 'jobsLoadFailed'],
    creaciones: ['introKept', 'keep', 'keeping', 'keepPending', 'keepFailed', 'emptyKeepText', 'listPending', 'locationLocal', 'locationCloud', 'locationLegacy', 'locationLabel', 'fromProject', 'savedAgo', 'editAgain', 'editAgainOf', 'editAgainPending', 'editAgainFailed', 'undecidedTitle', 'undecidedText', 'undecidedFailed', 'undecidedRetry', 'undecidedPending', 'undecidedEmpty', 'undecidedLoadMore', 'keepAsCreation', 'keepAsCreationOf'],
  };
  const valor = (idioma, modulo, clave) => {
    const fuente = leer(`i18n/textos/${idioma}/${modulo}.ts`);
    const m = fuente.match(new RegExp(`\\n  ${clave}: '((?:[^'\\\\]|\\\\.)*)',`));
    return m ? m[1] : null;
  };
  const huecos = (s) => [...(s || '').matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',');
  const faltan = [];
  const desparejos = [];
  const copiadas = [];
  for (const idioma of IDIOMAS) {
    for (const [modulo, claves] of Object.entries(NUEVAS)) {
      for (const clave of claves) {
        const v = valor(idioma, modulo, clave);
        if (!v || !v.trim()) { faltan.push(`${idioma}/${modulo}.${clave}`); continue; }
        if (huecos(v) !== huecos(valor('es', modulo, clave))) desparejos.push(`${idioma}/${modulo}.${clave}`);
        if (idioma !== 'es' && v === valor('es', modulo, clave) && v.length > 25) copiadas.push(`${idioma}/${modulo}.${clave}`);
      }
    }
  }
  check(`G1) los ${IDIOMAS.length} diccionarios tienen las ${NUEVAS.projects.length + NUEVAS.creaciones.length} claves nuevas`, IDIOMAS.length === 16 && faltan.length === 0, faltan.slice(0, 6).join(' '));
  check('G2) con los mismos huecos que el español', desparejos.length === 0, desparejos.slice(0, 6).join(' '));
  check('G3) y traducidas, no copiadas del español', copiadas.length === 0, copiadas.slice(0, 6).join(' '));
  check('G4) CONTROL: el lector encuentra una clave que existe y no una que no', !!valor('en', 'creaciones', 'keep') && valor('en', 'creaciones', 'noExiste') === null);
  check('G5) «Weë Cloud» es nombre: no se traduce en ningún idioma', IDIOMAS.every((i) => (valor(i, 'creaciones', 'locationCloud') || '').includes('Weë Cloud')));
  check('G6) el portugués es el de Brasil: «Salvar», no «Guardar»', /Salvar/.test(valor('pt', 'creaciones', 'keep') || '') && !/Guardar/.test(valor('pt', 'creaciones', 'keep') || ''));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
