/*
 * EL PANEL DE ESPECIFICACIONES DE WEË FILMMAKER (2026-11-18): el catálogo único espeja al servidor y las opciones dependen del modelo.
 *   node test/filmmaker-especificaciones.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearCargador, leer, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const cargar = crearCargador({});
const M = cargar('constants/filmmakerModelos.ts');
const U = cargar('utils/especificacionesDeFilmmaker.ts');
const I = cargar('utils/ideaDeFilmmaker.ts');
const srv = fs.readFileSync(path.join(RAIZ, 'functions/src/engine/providers/seedance.ts'), 'utf8');
const cap = fs.readFileSync(path.join(RAIZ, 'functions/src/engine/providers/seedance-capacidades.ts'), 'utf8');

console.log('── A · El catálogo espeja al servidor ──');
const ids = M.MODELOS_DE_FILMMAKER.map((m) => m.id);
check('A1) los ids del catálogo son únicos', new Set(ids).size === ids.length);
const integradosDeVideo = M.MODELOS_DE_FILMMAKER.filter((m) => m.tipo === 'video' && m.estado === 'integrado');
check('A2) hay cuatro modelos de vídeo integrados (Seedance 2.5, 2.0, Fast, Mini)', integradosDeVideo.length === 4, integradosDeVideo.map((m) => m.id).join());
for (const m of M.MODELOS_DE_FILMMAKER.filter((x) => x.idServidor)) {
  check(`A3) el id oficial de ${m.nombre} existe en el servidor`, srv.includes(m.idServidor) || cap.includes(m.idServidor), m.idServidor);
}
const bloque = (clave) => { const i = srv.indexOf(`key: '${clave}'`); return srv.slice(i, srv.indexOf('rates:', i)); };
const claves = { 'seedance-2-5': 'SEEDANCE_2_5', 'seedance-2-0': 'SEEDANCE_2_0', 'seedance-2-0-fast': 'SEEDANCE_2_0_FAST', 'seedance-2-0-mini': 'SEEDANCE_2_0_MINI' };
for (const [id, k] of Object.entries(claves)) {
  const m = M.modeloPorId(id); const b = bloque(k);
  const res = [...b.match(/resolutions: \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  const min = Number(b.match(/minDurationSec: (\d+)/)[1]); const max = Number(b.match(/maxDurationSec: (\d+)/)[1]);
  const im = Number(b.match(/maxReferenceImages: (\d+)/)[1]); const vi = Number(b.match(/maxReferenceClips: (\d+)/)[1]);
  check(`A4) ${m.nombre}: resoluciones, duración y referencias iguales al adaptador`, JSON.stringify(res) === JSON.stringify(m.resoluciones) && m.duracion.min === min && m.duracion.max === max && m.referencias.imagenes === im && m.referencias.videos === vi);
}
const flash = M.modeloPorId('seedance-2-5-flash');
check('A5) Flash sale sin configurar (el servidor lo declara NOT_CONFIGURED) y no se puede elegir', flash.estado === 'sin_configurar' && /nombreVisible: 'Seedance 2.5 Flash', estado: 'NOT_CONFIGURED'/.test(cap) && !M.esElegible(flash));
check('A6) los demás proveedores de vídeo salen «pronto», sin capacidades inventadas', M.MODELOS_DE_FILMMAKER.filter((m) => m.tipo === 'video' && m.estado === 'pronto').length >= 8
  && M.MODELOS_DE_FILMMAKER.filter((m) => m.estado === 'pronto').every((m) => m.duracion === 'desconocido' && m.resoluciones === 'desconocido' && m.formatos === 'desconocido' && !M.esElegible(m)));
check('A7) el vídeo solo se elige entre los integrados de vídeo (ni imagen ni voz)', M.MODELOS_ELEGIBLES.length === 4 && M.MODELOS_ELEGIBLES.every((m) => m.tipo === 'video'));

console.log('── B · Las opciones dependen del modelo ──');
let idea = I.ideaVacia('film');
check('B1) con Auto se ofrece lo que admite el contrato de crear', U.opcionesDe(null).resoluciones.join() === '720p,1080p' && U.opcionesDe(null).porCuadro === null);
const ofast = U.opcionesDe(M.modeloPorId('seedance-2-0-fast'));
check('B2) 2.0 Fast: 480p y 720p, de 4 a 15 s por cuadro', ofast.resoluciones.join() === '480p,720p' && ofast.porCuadro.max === 15);
check('B3) 2.5: hasta 30 s por cuadro y 1080p', U.opcionesDe(M.modeloPorId('seedance-2-5')).porCuadro.max === 30 && U.opcionesDe(M.modeloPorId('seedance-2-5')).resoluciones.includes('1080p'));
idea = I.poner(I.poner(idea, 'resolution', '1080p'), 'format', '4:5');
const cambiada = U.elegirModelo(idea, 'seedance-2-0-fast');
check('B4) cambiar a un modelo que no admite lo elegido lo devuelve a Auto (1080p y 4:5)', cambiada.valores.model === 'seedance-2-0-fast' && !cambiada.valores.resolution && !cambiada.valores.format);
check('B5) elegir un modelo cerrado no cambia nada', U.elegirModelo(idea, 'kling') === idea && U.elegirModelo(idea, 'seedance-2-5-flash') === idea);
check('B6) volver a Auto limpia el modelo; un id viejo se lee como Auto', U.elegirModelo(cambiada, 'auto').valores.model === undefined && U.modeloDeLaIdea(I.poner(idea, 'model', 'ya-no-existe')) === null);
check('B7) solo viajan al servidor formato, resolución y duración', JSON.stringify(U.CAMPOS_QUE_VIAJAN) === JSON.stringify(['format', 'resolution', 'duration']));

console.log('── C · Texto y forma ──');
const es = leer('i18n/textos/es/filmmakerSpecs.ts'); const en = leer('i18n/textos/en/filmmakerSpecs.ts');
const claves2 = (s) => [...s.matchAll(/^\s{2}(\w+):/gm)].map((x) => x[1]);
check('C1) es y en tienen las mismas claves', JSON.stringify(claves2(es).sort()) === JSON.stringify(claves2(en).sort()) && claves2(es).length > 25);
const fuentes = ['components/filmmaker/PanelDeEspecificaciones.tsx', 'components/filmmaker/PanelDeEspecificacionesModelos.tsx', 'constants/filmmakerModelos.ts'].map((f) => leer(f));
const usadas = new Set(fuentes.flatMap((s) => [...s.matchAll(/filmmakerSpecs\.(\w+)/g)].map((x) => x[1])));
check('C2) toda clave usada existe', [...usadas].every((k) => claves2(es).includes(k)), [...usadas].filter((k) => !claves2(es).includes(k)).join());
const etiquetas = new Set(M.MODELOS_DE_FILMMAKER.flatMap((m) => m.etiquetas));
check('C3) toda microetiqueta tiene su texto', [...etiquetas].every((e) => claves2(es).includes(e)));
const todo = fuentes.slice(0, 2).join('\n');
check('C4) ninguna fila con scroll horizontal ni id técnico a la vista', !/horizontal/.test(todo) && !/dreamina/.test(todo) && !/>{[^}]*idServidor/.test(todo));
check('C5) las píldoras saltan de línea (flexWrap) y miden al menos 44 dp', /flexWrap: 'wrap'/.test(todo) && /minHeight: 52/.test(todo) && /minHeight: 44/.test(todo));
check('C6) la pantalla monta el resumen y la hoja Proyecto lo contiene', /ResumenDeEspecificaciones/.test(leer('screens/FilmmakerCrearScreen.tsx')) && /ContenidoDeEspecificaciones/.test(leer('components/filmmaker/HojaDeProyecto.tsx')));
check('C7) no hay buscador y no se muestra ningún coste inventado', !/TextInput|searchPlaceholder/.test(fuentes[1]) && /costTbc/.test(todo) && !/USD/.test(todo));

console.log('── D · Preferencias hacia el servidor ──');
let d = I.ideaVacia('film');
check('D1) sin elegir nada no se manda ninguna preferencia', Object.keys(U.preferenciasDeLaIdea(d)).length === 0);
d = U.elegirModelo(I.poner(I.poner(d, 'variants', '3'), 'seed', '4294967295'), 'seedance-2-5');
const pf = U.preferenciasDeLaIdea(d);
check('D2) el modelo va con su id oficial, las variantes tal cual y la semilla como consistencySeed', pf.preferredModel === 'dreamina-seedance-2-5-260628' && pf.variants === 3 && pf.consistencySeed === 4294967295 && !('seed' in pf));
check('D3) semilla inválida (letras, fuera de rango) o variantes fuera de 1–4 no se mandan', U.semillaDe(I.poner(d, 'seed', '4294967296')) === null && U.semillaDe(I.poner(d, 'seed', '12a')) === null && U.variantesDe(I.poner(d, 'variants', '9')) === 1);
const orq = leer('services/filmmakerOrquestacionService.ts');
check('D4) sincronizar manda change_generation solo de lo que cambió (null quita)', /change_generation/.test(orq) && /preferredModel', 'variants', 'consistencySeed/.test(orq));
check('D5) la pantalla y la experiencia llevan las preferencias a production.generation', /preferencias: preferenciasDeLaIdea\(base\)/.test(leer('screens/FilmmakerCrearScreen.tsx')) && /generation: \{ \.\.\.prod\.generation, \.\.\.e\.preferencias \}/.test(leer('utils/filmmakerOrquestacion.ts')));
check('D6) la semilla solo se abre si el servidor dice «si» (cerrada sin respuesta)', /semilla: m\.options\?\.semilla === 'si'/.test(leer('hooks/useCapacidadesDeVideo.ts')) && /disabled=\{!servidor\.semilla\}/.test(fuentes[0]));

check('D7) la calidad solo cuenta con Auto y viaja como quality (standard/high/max); con modelo elegido se limpia', (() => {
  let q = I.poner(I.ideaVacia('film'), 'quality', 'max');
  const a = U.preferenciasDeLaIdea(q).quality === 'max';
  const b = U.preferenciasDeLaIdea(U.elegirModelo(q, 'seedance-2-0-fast')).quality === undefined && U.elegirModelo(q, 'seedance-2-0-fast').valores.quality === undefined;
  return a && b && U.calidadDe(I.poner(I.ideaVacia('film'), 'quality', 'x')) === null;
})());
check('D8) variantes cerradas (sin acción) hasta que el servidor multiplique tomas; calidad con modelo cerrada', /cerrada\(`v\$\{n\}`/.test(fuentes[0]) && /cerrada\('qfijo'/.test(fuentes[0]));
check('D9) cada celda de la tarjeta abre la hoja en su control (foco) y la rejilla lleva fundido', /onAbrir\('model'\)/.test(fuentes[0]) && /scrollTo/.test(leer('components/filmmaker/HojaDeProyecto.tsx')) && /fundido/.test(fuentes[1]));

check('E1) la línea compacta nombra QUÉ configura («Configurar vídeo») y el resumen va aparte, más pequeño', /filmmakerSpecs\.configure/.test(fuentes[0]) && /textoPortada\(11, '400'\)/.test(fuentes[0].split('filmmakerSpecs.configure')[1] || ''));
const pant = leer('screens/FilmmakerCrearScreen.tsx');
check('E2) una sola frase de placeholder en la Idea y la ayuda para continuar (con la flecha del sentido de lectura)', /storyPlaceholder/.test(pant) && !/refPlaceholder|ideaPlaceholder/.test(pant) && /continueHint', \{ flecha: dir\.flecha\.adelante/.test(pant));

console.log(failures ? `\n${failures} FALLOS de ${n}` : `\n${n}/${n} OK`);
process.exit(failures ? 1 : 0);
