/*
 * WEË CHEF · CHEF-02 (parte pura) — LOS AJUSTES DE COCINA VIAJAN COMO RESPUESTAS QUE EL SERVIDOR YA ENTIENDE.
 *
 *   node test/chef-contexto.test.mjs        (usa el compilado para el planificador: `npm run build` antes)
 *
 * Prueba `utils/contextoDeChef.ts`: la función pura que traduce lo elegido en «Ajustes de la receta» (personas y
 * tiempo) a `presets` con los ids de las preguntas de la plantilla de Chef, y que conserva el `preset` de la tarjeta
 * (o del panel) DENTRO de `presets` y además suelto. No toca ninguna pantalla: `ChefScreen` todavía no la llama
 * (esa parte de CHEF-02 espera a D-1, PENDIENTE DE DECISIÓN del dueño). Por eso `chef-caracterizacion` D-CHEF-4
 * sigue como HOY: la pantalla manda lo de siempre.
 *
 * Lo que se comprueba, con el código de verdad:
 *   A. El contrato de la función (AC-11, AC-12): ids, `auto`, `diet`/`level`, una respuesta por pregunta, el preset.
 *   B. Que el SERVIDOR lo entiende: la misma regla de `creatorChat` (`respuestaPara` sobre la plantilla) y el
 *      planificador de plantillas real, con un objetivo en inglés y en danés, no vuelven a preguntar personas ni tiempo.
 *   C. Contar como el servidor (AC-13): `largoParaElServidor` = `trim()` y unidades UTF-16, como `slice(0, 300)`.
 *   D. Que la tabla no se separe de los ajustes de la pantalla ni de la plantilla, y que la función siga siendo pura.
 *
 * Solo lectura: no llama a ningún proveedor, no abre emuladores y no escribe en ninguna base.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const cargar = crearCargador();
let modulo = null;
try {
  modulo = cargar('utils/contextoDeChef.ts');
} catch (e) {
  check('el módulo utils/contextoDeChef.ts existe y se carga', false, e.message.split('\n')[0]);
}

if (modulo) {
  const { contextoDeChef, largoParaElServidor, AJUSTES_QUE_SON_PREGUNTA, OPCIONES_QUE_SON_RESPUESTA, LARGO_QUE_LEE_EL_SERVIDOR } = modulo;
  const RECETA = { questionId: 'what', optionId: 'recipe' };

  /* ═══ A · EL CONTRATO DE LA FUNCIÓN ════════════════════════════════════════════════════════════════════ */
  console.log('\n── A · El contrato de contextoDeChef ──');
  {
    const c = contextoDeChef({ objetivo: 'Una lasaña (Para la familia, Media hora)', ajustes: { people: '4', time: '30', diet: 'vegan', level: 'auto' } });
    check('AC-11 · personas y tiempo elegidos viajan como presets con los ids del servidor, en ese orden',
      igual(c.presets, [{ questionId: 'people', optionId: '4' }, { questionId: 'time', optionId: '30' }]), JSON.stringify(c.presets));
    check('AC-12 · el contexto lleva workspace «chef»', c.workspace === 'chef');
    check('el objetivo viaja tal cual lo armó la pantalla (la unión «idea (ajustes)» sigue siendo de `chef.goalWith`)',
      c.goal === 'Una lasaña (Para la familia, Media hora)'
      && contextoDeChef({ objetivo: ' una sopa \n', ajustes: {} }).goal === ' una sopa \n'
      && contextoDeChef({ objetivo: '', ajustes: {} }).goal === '');
    check('diet y level NO viajan como presets: el servidor no tiene pregunta para ellos hasta CHEF-06',
      !c.presets.some((p) => p.questionId === 'diet' || p.questionId === 'level'));
    check('no lleva experienceId: el literal `experienceId: \'chef\'` de la llamada se queda en la pantalla (regla 4)',
      !('experienceId' in c));

    const auto = contextoDeChef({ objetivo: 'x', ajustes: { people: 'auto', time: 'auto' } });
    check('AC-11 · `auto` no viaja: sin nada decidido no hay `presets` (la llamada es la de hoy más `workspace`)',
      !('presets' in auto) && igual(auto, { workspace: 'chef', goal: 'x' }), JSON.stringify(auto));

    const conTarjeta = contextoDeChef({ preset: RECETA, ajustes: { people: '4', time: 'auto' }, imageUri: 'file:///nevera.jpg' });
    check('regla 1 · el preset de la tarjeta va DENTRO de presets (el flujo no los suma: `presets ?? [preset]`) y además suelto',
      igual(conTarjeta.presets, [RECETA, { questionId: 'people', optionId: '4' }]) && igual(conTarjeta.preset, RECETA), JSON.stringify(conTarjeta));
    check('la foto viaja como imageUri y un objetivo ausente no se inventa',
      conTarjeta.imageUri === 'file:///nevera.jpg' && !('goal' in conTarjeta));

    const soloTarjeta = contextoDeChef({ preset: RECETA, ajustes: {} });
    check('una tarjeta sin ajustes manda lo mismo que hoy: `preset` y ningún `presets`',
      igual(soloTarjeta, { workspace: 'chef', preset: RECETA }), JSON.stringify(soloTarjeta));

    const choque = contextoDeChef({ preset: { questionId: 'people', optionId: '2' }, ajustes: { people: '8', time: '15' } });
    check('regla 2 · una sola respuesta por pregunta: si la puerta ya responde una, manda la de la puerta',
      igual(choque.presets, [{ questionId: 'people', optionId: '2' }, { questionId: 'time', optionId: '15' }]), JSON.stringify(choque.presets));

    const raro = contextoDeChef({ ajustes: { people: '3', time: 'idk', days: '7', ...Object.fromEntries([['__proto__', '1'], ['constructor', '2']]) } });
    check('un id que la pregunta no tiene (people 3), `idk`, `days` (no hay ajuste de días, regla 6) o una clave rara no viajan',
      !('presets' in raro), JSON.stringify(raro));

    const ajustes = Object.freeze({ people: '1' });
    const entrada = Object.freeze({ preset: Object.freeze({ ...RECETA }), ajustes });
    const r1 = contextoDeChef(entrada);
    r1.presets.push({ questionId: 'x', optionId: 'y' });
    check('es pura: no muta la entrada y dos llamadas iguales dan lo mismo',
      igual(contextoDeChef(entrada), { workspace: 'chef', preset: RECETA, presets: [RECETA, { questionId: 'people', optionId: '1' }] })
      && r1.preset !== entrada.preset);
  }

  /* ═══ B · EL SERVIDOR LO ENTIENDE ══════════════════════════════════════════════════════════════════════ */
  console.log('\n── B · Lo que hace el servidor con esos presets ──');
  {
    const { TEMPLATES } = lib('creator/templates.js');
    const { templatePlanner, respuestaPara } = lib('creator/planner.js');
    const chef = TEMPLATES.chef;
    /* La regla de `creatorChat` (creator/index.ts) para los presetAnswers, copiada en su forma: pregunta que exista + `respuestaPara`. */
    const comoElServidor = (presets = []) => {
      const answers = [];
      for (const p of presets) {
        const q = chef.questions.find((x) => x.id === String(p?.questionId));
        if (!q) continue;
        const r = respuestaPara(q, p?.optionId != null ? String(p.optionId) : undefined);
        if (r) answers.push({ questionId: q.id, ...r });
      }
      return answers;
    };
    const fuenteDelServidor = sinComentarios(leer('functions/src/creator/index.ts'));
    check('la regla copiada sigue siendo la de creatorChat (pregunta de la plantilla + respuestaPara sobre optionId)',
      /TEMPLATES\[experienceId\]\.questions\.find\(\(q\) => q\.id === String\(preset\?\.questionId\)\)/.test(fuenteDelServidor)
      && /respuestaPara\(question, bruto\)/.test(fuenteDelServidor));

    const preguntasHasta = async (goal, presets) => {
      const answers = comoElServidor(presets);
      const hechas = [];
      let t = await templatePlanner.next({ experienceId: 'chef', goal, answers });
      let guarda = 0;
      while (t.question && guarda++ < 8) {
        hechas.push(t.question.id);
        answers.push({ questionId: t.question.id, optionId: t.question.id === 'what' ? 'recipe' : 'idk' });
        t = await templatePlanner.next({ experienceId: 'chef', goal, answers });
      }
      return { hechas, plan: t.plan };
    };
    for (const [idioma, goal] of [['inglés', 'a lasagna for four, quick'], ['danés', 'en lasagne til fire, hurtigt']]) {
      const sin = await preguntasHasta(goal, contextoDeChef({ objetivo: goal, ajustes: {} }).presets);
      const con = await preguntasHasta(goal, contextoDeChef({ objetivo: goal, ajustes: { people: '4', time: '15' } }).presets);
      check(`AC-11 · en ${idioma}, sin ajustes el planificador pregunta personas y tiempo (el deductor solo lee español)`,
        sin.hechas.includes('people') && sin.hechas.includes('time'), sin.hechas.join(' · '));
      check(`AC-11 · en ${idioma}, con personas y tiempo elegidos ya no los pregunta y el plan los usa`,
        !con.hechas.includes('people') && !con.hechas.includes('time') && !!con.plan
        && /familia/i.test(JSON.stringify(con.plan.steps)) && /15 minutos/i.test(JSON.stringify(con.plan.steps)),
        `${con.hechas.join(' · ')} → ${con.plan?.steps?.find((s) => s.id === 'recipe')?.input?.brief}`);
    }
    const conTarjeta = await preguntasHasta('a lasagna', contextoDeChef({ preset: RECETA, ajustes: { people: '2', time: '60' } }).presets);
    check('con la tarjeta de receta y los dos ajustes, el servidor no pregunta nada: va derecho al plan',
      conTarjeta.hechas.length === 0 && !!conTarjeta.plan, conTarjeta.hechas.join(' · '));

    /* D · La tabla no se separa de la plantilla. */
    for (const id of AJUSTES_QUE_SON_PREGUNTA) {
      const q = chef.questions.find((x) => x.id === id);
      check(`la pregunta «${id}» existe en la plantilla de Chef y acepta todas las opciones de la tabla`,
        !!q && OPCIONES_QUE_SON_RESPUESTA[id].every((o) => q.options.some((x) => x.id === o)), q ? q.options.map((o) => o.id).join('·') : 'no existe');
    }
    check('ni diet ni level son preguntas de la plantilla (si CHEF-06 las crea, esta comprobación avisa de añadirlas a la tabla)',
      !chef.questions.some((q) => q.id === 'diet' || q.id === 'level'));
  }

  /* ═══ C · CONTAR COMO EL SERVIDOR ═════════════════════════════════════════════════════════════════════ */
  console.log('\n── C · Contar como el servidor ──');
  {
    const servidor = sinComentarios(leer('functions/src/creator/index.ts'));
    check(`AC-13 · el servidor sigue leyendo ${LARGO_QUE_LEE_EL_SERVIDOR} tras trim(): String(data.goal || '').trim().slice(0, ${LARGO_QUE_LEE_EL_SERVIDOR})`,
      LARGO_QUE_LEE_EL_SERVIDOR === 300 && servidor.includes(`String(data.goal || '').trim().slice(0, ${LARGO_QUE_LEE_EL_SERVIDOR})`));
    const casos = ['  hola  ', '😀'.repeat(150), '😀'.repeat(151), ' '.repeat(40) + 'a'.repeat(300) + '\n', 'é', ''];
    check('AC-13 · largoParaElServidor cuenta tras trim() y en unidades UTF-16: cabe exactamente lo que slice(0, 300) no corta',
      casos.every((s) => (largoParaElServidor(s) <= 300) === (s.trim().slice(0, 300) === s.trim()) && largoParaElServidor(s) === s.trim().length),
      casos.map((s) => largoParaElServidor(s)).join(' · '));
    check('un emoji cuenta dos (150 caben, 151 no), los espacios del borde no cuentan',
      largoParaElServidor('😀'.repeat(150)) === 300 && largoParaElServidor('😀'.repeat(151)) === 302 && largoParaElServidor('  hola  ') === 4);
    check('sin texto, 0', largoParaElServidor('') === 0 && largoParaElServidor(undefined) === 0);
  }

  /* ═══ D · LA TABLA Y LA PUREZA ═════════════════════════════════════════════════════════════════════════ */
  console.log('\n── D · La tabla frente a los ajustes de la pantalla, y la pureza ──');
  {
    const { AJUSTES_DE_COCINA } = cargar('constants/chefTools.ts');
    check('AJUSTES_QUE_SON_PREGUNTA = people y time, nada más', igual([...AJUSTES_QUE_SON_PREGUNTA], ['people', 'time']));
    for (const id of AJUSTES_QUE_SON_PREGUNTA) {
      const grupo = AJUSTES_DE_COCINA.find((g) => g.id === id);
      const deLaPantalla = grupo ? grupo.opciones.map((o) => o.id).filter((o) => o !== 'auto') : [];
      check(`las opciones de «${id}» de la pantalla (sin auto) son exactamente las de la tabla`,
        igual(deLaPantalla, [...OPCIONES_QUE_SON_RESPUESTA[id]]), deLaPantalla.join('·'));
    }
    const fuente = sinComentarios(leer('utils/contextoDeChef.ts'));
    const imports = fuente.match(/^\s*import[^;]*;/gm) ?? [];
    check('es pura: solo importa tipos (ni React, ni el traductor, ni servicios)',
      imports.every((l) => /^\s*import type /.test(l)) && !/react|useT|i18n|services\//.test(imports.join('\n')), imports.join(' | '));
    const flujo = leer('screens/CreatorFlowScreen.tsx');
    check('por qué la regla 1 existe: el flujo sigue eligiendo `presets` O `[preset]`, sin sumarlos',
      /params\.presets \?\? \(params\.preset \? \[params\.preset\] : undefined\)/.test(flujo));
    const pantalla = leer('screens/ChefScreen.tsx');
    check('PENDIENTE DE DECISIÓN (D-1) · la pantalla todavía NO la usa: esta rama no toca ChefScreen',
      !/contextoDeChef/.test(pantalla));
  }
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
