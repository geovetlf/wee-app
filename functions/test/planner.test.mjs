// Weë Brain — planificador: a qué preguntas se consulta al LLM.
//
// El gateway se sustituye por un doble que NO llama a ningún proveedor: solo
// apunta qué preguntas viajaron a text.structure. Así se puede comprobar sin
// gastar nada que las preguntas condicionales que no aplican dejan de salir.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

// ─── Doble del gateway: registra la llamada y devuelve "no sé" a todo ───────────
const llamadas = [];
const idGateway = require.resolve(path.resolve(here, '../lib/gateway/index.js'));
require.cache[idGateway] = {
  id: idGateway,
  loaded: true,
  exports: {
    async runCapability(capability, input, ctx) {
      llamadas.push({ capability, prompt: String(input.prompt || ''), ctx });
      // Ninguna respuesta con confianza alta: el planificador sigue preguntando.
      const preguntas = JSON.parse((String(input.prompt).match(/\(JSON\): (\[.*\])/) || [])[1] || '[]');
      return {
        provider: 'gemini',
        model: 'doble-de-pruebas',
        output: { kind: 'text', content: JSON.stringify({ answers: preguntas.map((q) => ({ questionId: q.id, optionId: null, confidence: 'low' })) }) },
        costUSD: 0,
        latencyMs: 1,
      };
    },
  },
};

const { llmPlanner, templatePlanner, getPlanner } = lib('creator/planner.js');
const { TEMPLATES } = lib('creator/templates.js');
const { disponibilidadDe } = lib('planner/index.js');

const gateway = { userId: 'u1', jobId: 'j1', record: async () => {} };
const turno = async (experienceId, goal, answers = []) => {
  llamadas.length = 0;
  const salida = await llmPlanner.next({ experienceId, goal, answers, gateway });
  const consultadas = llamadas.length
    ? JSON.parse((llamadas[0].prompt.match(/\(JSON\): (\[.*\])/) || [])[1] || '[]').map((q) => q.id)
    : [];
  return { salida, llamadas: llamadas.length, consultadas };
};

console.log('\n── El doble no llama a ningún proveedor ──');
{
  /*
   * QUÉ PLANIFICADOR SE USA LO DECIDE LA CAPACIDAD, NO UN PROVEEDOR.
   *
   * Esta comprobación decía «cuando Gemini está configurado», y para lograrlo
   * parcheaba `geminiAdapter.isConfigured`. Era el reflejo exacto de la deuda
   * que la Fase 4 vino a saldar: un adaptador concreto decidiendo si Weë Brain
   * razona. Ahora se pregunta por `text.structure` y da igual quién la sirva.
   */
  check('getPlanner elige el planificador con LLM cuando se puede entender texto con estructura',
    getPlanner(disponibilidadDe(['text.structure'])) === llmPlanner);
  check('y el de plantilla cuando esa capacidad no la sirve nadie',
    getPlanner(disponibilidadDe([])) === templatePlanner);
  const t = await turno('chef', 'Quiero opciones saludables para comer');
  check('el doble intercepta la consulta y registra la capacidad', t.llamadas === 1 && llamadas[0].capability === 'text.structure', llamadas[0]?.capability);
  check('y ningún proveedor real recibió nada', llamadas.every((l) => !l.ctx.creditTransactionId));
}

// ── 1 y 4) Una pregunta cuyo `when` es falso NO llega al LLM ────────────────────
console.log('\n── 1 y 4 · las preguntas que no aplican dejan de consultarse ──');
{
  // Chef: `days` solo existe para un menú; `time`, solo para lo que no es menú.
  const receta = await turno('chef', 'Quiero opciones saludables para comer', [{ questionId: 'what', optionId: 'healthy' }]);
  check('4) en una receta ya no se consulta por "days"', !receta.consultadas.includes('days'), receta.consultadas.join(', '));
  check('1) se consulta exactamente por lo que la persona verá', receta.consultadas.join(',') === 'people,time', receta.consultadas.join(','));

  // El turno que en 2E-14 gastaba una llamada entera para preguntar solo por `days`
  const ultimo = await turno('chef', 'Quiero opciones saludables para comer', [
    { questionId: 'what', optionId: 'healthy' },
    { questionId: 'people', optionId: '2' },
    { questionId: 'time', optionId: '30' },
  ]);
  check('4) con todo respondido ya NO se gasta ninguna llamada', ultimo.llamadas === 0, ultimo.consultadas.join(', '));
  check('4) y ese turno entrega el plan, como antes', !!ultimo.salida.plan && ultimo.salida.plan.steps.some((s) => s.capability === 'image.generate'));
}

// ── 2) Una pregunta cuyo `when` es verdadero SÍ sigue llegando ──────────────────
console.log('\n── 2 · las preguntas que sí aplican siguen consultándose ──');
{
  const menu = await turno('chef', 'Quiero opciones saludables para comer', [{ questionId: 'what', optionId: 'menu' }]);
  check('2) en un menú SÍ se consulta por "days"', menu.consultadas.includes('days'), menu.consultadas.join(', '));
  check('2) y deja de consultarse por "time", que no aplica a un menú', !menu.consultadas.includes('time'), menu.consultadas.join(', '));

  // El `when` se evalúa con el MISMO estado que verá templatePlanner: aquí "menu"
  // no viene de un clic, lo deduce la propia plantilla del texto.
  const deducido = await turno('chef', 'Crear un menú');
  check('2) con "menu" deducido del texto por la plantilla, se consulta por "days"', deducido.consultadas.includes('days'), deducido.consultadas.join(', '));
  check('2) y no por "time"', !deducido.consultadas.includes('time'), deducido.consultadas.join(', '));
}

// ── 3) Una pregunta sin `when` sigue funcionando igual ──────────────────────────
console.log('\n── 3 · las preguntas sin condición no cambian ──');
{
  // Weë Photo sigue sin condicionales: es la prueba de que una plantilla llana se
  // consulta entera, igual que antes de que `when` existiera.
  const photo = await turno('photo', 'Cambiar el fondo de una foto');
  check('3) Weë Photo no tiene condicionales y se consulta por todas', photo.consultadas.length === TEMPLATES.photo.questions.length, photo.consultadas.join(','));
  check('3) y "action", que no tiene when, sigue consultándose', photo.consultadas.includes('action'));

  // Weë Design sí los tiene desde 2E-45: cada intención tiene sus dos preguntas y
  // no se consulta por las de las otras seis.
  const design = await turno('design', 'Un logo para mi cafetería');
  check('3) Weë Design consulta solo lo del logo', design.consultadas.join(',') === 'what,name,feel', design.consultadas.join(','));
  check('3) y no por lo de las demás intenciones', !design.consultadas.some((id) => ['item', 'machine', 'place', 'who', 'message'].includes(id)), design.consultadas.join(','));
}

// ── 5) No se altera el comportamiento de las preguntas válidas ──────────────────
console.log('\n── 5 · el recorrido completo sigue dando lo mismo que la plantilla ──');
{
  // Los dos planificadores deben preguntar SIEMPRE lo mismo a la persona.
  const casos = [
    ['chef', 'Quiero opciones saludables para comer', []],
    ['chef', 'Crear un menú', []],
    ['chef', 'Quiero una receta', [{ questionId: 'what', optionId: 'recipe' }, { questionId: 'people', optionId: '4' }]],
    ['music', 'Una canción para mi vídeo', []],
    ['writer', 'Ideas para un relato corto sobre un faro', []],
    ['beauty', 'Probar un cambio de look', []],
    ['home', 'Renovar un espacio de mi casa', []],
    ['business', 'Hacer crecer mi negocio', []],
    ['studio', 'Un video corto para mis redes', []],
    ['design', 'Un logo para mi cafetería', []],
    ['brain', 'Necesito ayuda y no sé por dónde empezar', []],
  ];
  const distintos = [];
  for (const [exp, goal, answers] of casos) {
    llamadas.length = 0;
    const conLlm = await llmPlanner.next({ experienceId: exp, goal, answers, gateway });
    const conPlantilla = await templatePlanner.next({ experienceId: exp, goal, answers, gateway });
    const idA = conLlm.question?.id ?? (conLlm.plan ? 'PLAN' : '—');
    const idB = conPlantilla.question?.id ?? (conPlantilla.plan ? 'PLAN' : '—');
    if (idA !== idB) distintos.push(`${exp} "${goal}": llm=${idA} plantilla=${idB}`);
  }
  check('5) los dos planificadores preguntan lo mismo en las 10 experiencias', distintos.length === 0, distintos.join(' · '));

  // `inferred` sí difiere, y es como estaba antes de esta fase: llmPlanner informa
  // SOLO lo que dedujo el LLM y sustituye lo que traía el de plantilla. La
  // deducción local no se pierde —templatePlanner la aplica por dentro y decide
  // con ella—, simplemente no se informa hacia fuera. Aquí solo queda fijado.
  {
    llamadas.length = 0;
    const conLlm = await llmPlanner.next({ experienceId: 'chef', goal: 'Crear un menú', answers: [], gateway });
    const conPlantilla = await templatePlanner.next({ experienceId: 'chef', goal: 'Crear un menú', answers: [], gateway });
    check('5) la deducción local sigue decidiendo igual en los dos', conLlm.question?.id === conPlantilla.question?.id && conLlm.question?.id === 'people');
    check('5) y llmPlanner sigue informando solo lo del LLM, como antes', conLlm.inferred.length === 0 && conPlantilla.inferred[0]?.optionId === 'menu');
  }

  // Y las condicionales nunca se consultan cuando no aplican, en ninguna experiencia.
  const fugas = [];
  for (const [exp, t] of Object.entries(TEMPLATES)) {
    const condicionales = t.questions.filter((q) => q.when);
    if (!condicionales.length) continue;
    const r = await turno(exp, 'un objetivo escrito por la persona');
    for (const q of condicionales) {
      const aplica = q.when({});
      if (!aplica && r.consultadas.includes(q.id)) fugas.push(exp + '/' + q.id);
    }
  }
  check('5) ninguna condicional que no aplica se cuela en text.structure', fugas.length === 0, fugas.join(', '));
}

// ── NO SE VUELVE A CONSULTAR POR LO MISMO ───────────────────────────────────
// El LLM solo deduce del texto libre. Si la persona se limita a elegir opciones,
// ese texto no cambia y volver a preguntarle solo puede dar lo mismo. La única
// excepción es una pregunta condicional que aparece por primera vez.
console.log('\n── 2E-18 · elegir una opción ya no vuelve a consultar al LLM ──');

// Reproduce lo que hace creatorChat: captura el estado ANTES y aplica la respuesta.
const turnoCon = async (experienceId, goal, before, respuesta) => {
  llamadas.length = 0;
  let answers = before;
  let turn = { newFreeText: false, before };
  if (respuesta) {
    turn = { newFreeText: !!respuesta.text && !respuesta.optionId, before };
    answers = [...before.filter((a) => a.questionId !== respuesta.questionId), respuesta];
  }
  const salida = await llmPlanner.next({ experienceId, goal, answers, gateway, turn });
  const consultadas = llamadas.length
    ? JSON.parse((llamadas[0].prompt.match(/\(JSON\): (\[.*\])/) || [])[1] || '[]').map((q) => q.id)
    : [];
  return { salida, answers, llamadas: llamadas.length, consultadas };
};

const META = 'Quiero opciones saludables para comer';

{
  // 1) Primer turno: el trabajo acaba de crearse, no hay turno anterior que pasar.
  const uno = await turno('chef', META, [{ questionId: 'what', optionId: 'healthy' }]);
  check('1) primer turno con objetivo escrito: SÍ consulta', uno.llamadas === 1 && uno.consultadas.join(',') === 'people,time', uno.consultadas.join(','));

  // 2) Segundo turno eligiendo una opción: mismo texto, nada nuevo que preguntar.
  const dos = await turnoCon('chef', META, [{ questionId: 'what', optionId: 'healthy' }], { questionId: 'people', optionId: '2' });
  check('2) elegir una opción NO vuelve a consultar', dos.llamadas === 0, 'llamadas=' + dos.llamadas);
  check('2) y el turno sigue entregando su pregunta', dos.salida.question?.id === 'time', dos.salida.question?.id);

  // 3) Texto libre nuevo: hay información que el modelo no ha visto.
  const tres = await turnoCon('chef', META, [{ questionId: 'what', optionId: 'healthy' }], { questionId: 'people', text: 'somos cuatro en casa' });
  check('3) texto libre nuevo SÍ consulta', tres.llamadas === 1, 'llamadas=' + tres.llamadas);

  // 5) Opción y texto a la vez cuenta como opción, igual que en freeText.
  const cinco = await turnoCon('chef', META, [{ questionId: 'what', optionId: 'healthy' }], { questionId: 'people', optionId: '2', text: 'somos cuatro en casa' });
  check('5) optionId + text NO cuenta como texto libre nuevo', cinco.llamadas === 0, 'llamadas=' + cinco.llamadas);

  // 6) Adjuntar una foto mientras se pregunta: no llega ninguna respuesta.
  const seis = await turnoCon('chef', META, [{ questionId: 'what', optionId: 'healthy' }, { questionId: 'people', optionId: '2' }], null);
  check('6) adjuntar foto sin responder NO provoca reinferencia', seis.llamadas === 0, 'llamadas=' + seis.llamadas);

  // 7) Sustituir una opción por texto libre: el texto crece, hay que consultar.
  const siete = await turnoCon('chef', META, [{ questionId: 'what', optionId: 'healthy' }, { questionId: 'people', optionId: '2' }], { questionId: 'people', text: 'mejor para seis' });
  check('7) reemplazar opción por texto SÍ consulta', siete.llamadas === 1, 'llamadas=' + siete.llamadas);

  // 8) Sustituir texto libre por una opción: por sí solo, no.
  const ocho = await turnoCon('chef', META, [{ questionId: 'what', optionId: 'healthy' }, { questionId: 'people', text: 'somos cuatro' }], { questionId: 'people', optionId: '4' });
  check('8) reemplazar texto por opción NO consulta por sí solo', ocho.llamadas === 0, 'llamadas=' + ocho.llamadas);
}

// ── 4 y 13) El contraejemplo de `days`: aparece una pregunta nunca consultada ──
console.log('\n── 4 y 13 · una pregunta que aparece por primera vez SÍ se consulta ──');
{
  const antes = [{ questionId: 'what', optionId: 'healthy' }, { questionId: 'people', optionId: '2' }];
  // La persona cambia de idea: ahora quiere un menú. Surge "¿para cuántos días?",
  // que nunca se consultó, con el mismo texto libre de siempre.
  const cambio = await turnoCon('chef', META, antes, { questionId: 'what', optionId: 'menu' });
  check('4) SÍ consulta aunque el texto libre no haya cambiado', cambio.llamadas === 1, 'llamadas=' + cambio.llamadas);
  check('4) y consulta exactamente por la pregunta nueva', cambio.consultadas.join(',') === 'days', cambio.consultadas.join(','));

  // La secuencia completa de §13, turno a turno, como la ejecutaría creatorChat.
  const t1 = await turno('chef', META, [{ questionId: 'what', optionId: 'healthy' }]);
  const t2 = await turnoCon('chef', META, [{ questionId: 'what', optionId: 'healthy' }], { questionId: 'people', optionId: '2' });
  const t3 = await turnoCon('chef', META, t2.answers, { questionId: 'what', optionId: 'menu' });
  check('13) turno 1 consulta por people,time', t1.llamadas === 1 && t1.consultadas.join(',') === 'people,time');
  check('13) turno 2 NO consulta', t2.llamadas === 0);
  check('13) turno 3 consulta por days: la inferencia de days NO se pierde', t3.llamadas === 1 && t3.consultadas.join(',') === 'days');
}

// ── 14) Medición local sobre el doble: cuántas llamadas cuesta el flujo de Chef ──
console.log('\n── 14 · llamadas al doble en el flujo de 2E-14 ──');
{
  // El recorrido exacto de 2E-14: preset saludable, luego dos clics.
  let total = 0;
  const a = await turno('chef', META, [{ questionId: 'what', optionId: 'healthy' }]);
  total += a.llamadas;
  const b = await turnoCon('chef', META, [{ questionId: 'what', optionId: 'healthy' }], { questionId: 'people', optionId: '2' });
  total += b.llamadas;
  const c = await turnoCon('chef', META, b.answers, { questionId: 'time', optionId: '30' });
  total += c.llamadas;
  check('14) el flujo completo de Chef cuesta UNA sola consulta (antes 2 tras 2E-16, 3 antes)', total === 1, 'llamadas=' + total);
  check('14) y termina entregando el plan, con su paso de imagen', !!c.salida.plan && c.salida.plan.steps.some((s) => s.capability === 'image.generate'));
}

// ── 9 a 11) Nada de lo anterior cambia ─────────────────────────────────────────
console.log('\n── 9 a 11 · el comportamiento funcional se mantiene ──');
{
  // 9) Las dos capas siguen compartiendo el mismo filtro `when`.
  const distintos = [];
  for (const [exp, t] of Object.entries(TEMPLATES)) {
    for (const goal of [t.defaultGoal, 'un objetivo escrito por la persona']) {
      llamadas.length = 0;
      const conLlm = await llmPlanner.next({ experienceId: exp, goal, answers: [], gateway });
      const conPlantilla = await templatePlanner.next({ experienceId: exp, goal, answers: [], gateway });
      const idA = conLlm.question?.id ?? (conLlm.plan ? 'PLAN' : '—');
      const idB = conPlantilla.question?.id ?? (conPlantilla.plan ? 'PLAN' : '—');
      if (idA !== idB) distintos.push(exp + '/' + goal.slice(0, 18));
    }
  }
  check('9) los dos planificadores siguen preguntando lo mismo', distintos.length === 0, distintos.join(' · '));

  // 10 y 11) Ninguna condicional que no aplica se consulta, en ninguna experiencia,
  // tampoco por el camino nuevo con turno.
  const fugas = [];
  for (const [exp, t] of Object.entries(TEMPLATES)) {
    const condicionales = t.questions.filter((q) => q.when);
    if (!condicionales.length) continue;
    const r = await turnoCon(exp, 'un objetivo escrito por la persona', [], { questionId: t.questions[0].id, text: 'algo escrito' });
    for (const q of condicionales) if (!q.when({}) && r.consultadas.includes(q.id)) fugas.push(exp + '/' + q.id);
  }
  check('10-11) ninguna condicional inválida se cuela, tampoco con el turno', fugas.length === 0, fugas.join(', '));
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nPlanificador: solo se consulta al LLM por preguntas que la persona verá');
process.exit(failures ? 1 : 0);
