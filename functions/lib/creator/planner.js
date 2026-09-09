"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlanner = exports.llmPlanner = exports.templatePlanner = exports.respuestaPara = void 0;
const templates_1 = require("./templates");
const prompts_1 = require("./prompts");
const gateway_1 = require("../gateway");
const gemini_1 = require("../engine/providers/gemini");
const toRecord = (answers) => {
    var _a, _b;
    const record = {};
    for (const answer of answers) {
        const value = (_a = answer.optionId) !== null && _a !== void 0 ? _a : ((_b = answer.text) !== null && _b !== void 0 ? _b : '').trim();
        if (value)
            record[answer.questionId] = value;
    }
    return record;
};
/**
 * Lo que la plantilla deduce sola del texto de la persona, sin gastar nada.
 * ESCRIBE en `record`, que es como se usaba antes dentro del planificador.
 *
 * Está aquí fuera para que los DOS planificadores puedan razonar sobre el mismo
 * estado de respuestas: el que consulta al LLM necesita ese estado para evaluar
 * las condiciones `when` igual que lo hará después el de plantilla.
 */
/** Lo más largo que se acepta como respuesta escrita, igual de generoso que el objetivo. */
const MAXIMO_TEXTO = 200;
/**
 * Qué vale como respuesta a una pregunta, venga de donde venga.
 *
 * Hay dos puertas por las que entra una respuesta sin que nadie la haya tocado:
 * lo que Weë deduce del texto (`localInference`) y lo que llega ya contestado al
 * abrir un trabajo (`presetAnswers`, en creator/index.ts). Las dos aplicaban la
 * misma regla por su cuenta, y al cambiar una se olvidó la otra: las fechas
 * elegidas en el calendario sobrevivían a la conversación pero se perdían al
 * pulsar "Ajustar" (GAP 1 de la fase 2E-65).
 *
 * Por eso la regla vive aquí y solo aquí:
 *
 *   · si el valor es una de las opciones, es esa opción;
 *   · si no lo es, solo vale cuando la pregunta declara `freeInfer` —unas fechas
 *     o dos intereses a la vez no caben en una lista de botones—;
 *   · cualquier otra cosa se descarta, como siempre.
 *
 * Ninguna pregunta de las otras diez experiencias declara `freeInfer`, así que
 * para ellas esto sigue aceptando únicamente opciones.
 */
const respuestaPara = (question, valor) => {
    const limpio = (valor !== null && valor !== void 0 ? valor : '').trim();
    if (!limpio)
        return null;
    if (question.options.some((o) => o.id === limpio))
        return { optionId: limpio };
    if (question.freeInfer)
        return { text: limpio.slice(0, MAXIMO_TEXTO) };
    return null;
};
exports.respuestaPara = respuestaPara;
const localInference = (template, goal, record) => {
    var _a;
    const inferred = [];
    if (!template.infer || !goal || goal === template.defaultGoal)
        return inferred;
    const guessed = template.infer(goal);
    for (const [questionId, valor] of Object.entries(guessed)) {
        const question = template.questions.find((q) => q.id === questionId);
        if (!question || questionId in record)
            continue;
        const respuesta = (0, exports.respuestaPara)(question, valor);
        if (!respuesta)
            continue;
        record[questionId] = (_a = respuesta.optionId) !== null && _a !== void 0 ? _a : respuesta.text;
        inferred.push(Object.assign(Object.assign({ questionId }, respuesta), { inferred: true }));
    }
    return inferred;
};
/**
 * Preguntas que aplican a lo ya respondido (when). ÚNICO sitio de Weë donde se
 * evalúa esa condición, para que los dos planificadores no puedan discrepar.
 */
const applicableQuestions = (template, record) => template.questions.filter((question) => !question.when || question.when(record));
/**
 * Fase 0: planificador por plantillas, sin LLM. Pregunta lo que falta y arma el plan.
 */
exports.templatePlanner = {
    async next({ experienceId, goal, answers }) {
        const template = templates_1.TEMPLATES[experienceId];
        const record = toRecord(answers);
        // Lo que ya se entiende del texto de la persona no se vuelve a preguntar
        const inferred = localInference(template, goal, record);
        // Solo se hacen las preguntas que aplican a lo ya respondido (when)
        const pending = applicableQuestions(template, record).find((question) => !(question.id in record));
        if (pending)
            return { question: (0, templates_1.plainQuestion)(pending), inferred };
        return { plan: template.buildPlan(goal, record), inferred };
    },
};
const INFER_SCHEMA = {
    type: 'OBJECT',
    properties: {
        answers: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    questionId: { type: 'STRING' },
                    optionId: { type: 'STRING', nullable: true },
                    confidence: { type: 'STRING', enum: ['high', 'low'] },
                },
                required: ['questionId', 'optionId', 'confidence'],
            },
        },
    },
    required: ['answers'],
};
/**
 * Deduce respuestas a las preguntas pendientes a partir de lo que la persona
 * escribió con sus palabras. Solo acepta respuestas con confianza alta.
 */
async function inferAnswers(experienceId, freeText, pending, gateway) {
    const questions = pending.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options.filter((o) => o.id !== 'idk').map((o) => ({ id: o.id, label: o.label })),
    }));
    const prompt = [
        `La persona escribió: ${freeText.map((t) => `"${t}"`).join(' / ')}.`,
        `Preguntas pendientes con sus opciones (JSON): ${JSON.stringify(questions)}`,
        'Para cada pregunta: si el texto de la persona deja CLARA la respuesta, devuelve el id de la opción con confidence "high"; si no está claro, devuelve optionId null con confidence "low". No adivines.',
    ].join('\n\n');
    try {
        const run = await (0, gateway_1.runCapability)('text.structure', { system: prompts_1.BRAIN_SYSTEM, prompt, schema: INFER_SCHEMA, purpose: 'Entender lo que la persona quiere', maxOutputTokens: 512 }, Object.assign(Object.assign({}, gateway), { experienceId }));
        if (run.provider === 'mock')
            return [];
        const parsed = JSON.parse(run.output.content || '{}');
        const inferred = [];
        for (const item of parsed.answers || []) {
            const question = pending.find((q) => q.id === item.questionId);
            if (!question || !item.optionId || item.confidence !== 'high')
                continue;
            if (!question.options.some((o) => o.id === item.optionId && o.id !== 'idk'))
                continue;
            inferred.push({ questionId: question.id, optionId: String(item.optionId), inferred: true });
        }
        return inferred;
    }
    catch (error) {
        console.warn('Weë Brain: no pude interpretar el texto; pregunto normalmente.', error);
        return [];
    }
}
/**
 * Fase 1: Weë Brain con Gemini. Entiende el objetivo y las respuestas escritas
 * con palabras propias y responde por la persona lo que ya quedó claro; solo
 * pregunta lo que falta. El plan de pasos sigue saliendo de la plantilla.
 */
exports.llmPlanner = {
    async next(input) {
        const { experienceId, goal, answers, gateway } = input;
        const template = templates_1.TEMPLATES[experienceId];
        /*
         * Solo se consulta al LLM por preguntas que la persona va a ver de verdad.
         *
         * Antes se le pasaban TODAS las que faltaban, sin mirar su `when`, mientras
         * que el planificador de plantilla sí lo aplica dos pasos después. En Chef
         * eso significaba preguntar por "¿para cuántos días?" —que solo existe para
         * un menú— en una receta, y llegaba a gastar una llamada entera dedicada
         * únicamente a esa pregunta que nadie iba a usar.
         *
         * `when` se evalúa sobre el mismo estado que verá templatePlanner, con la
         * inferencia local ya aplicada; sobre una copia, porque `record` sigue
         * marcando qué se pregunta y aquí no se cambia esa decisión.
         */
        const pendientesCon = (respuestas) => {
            const hechas = toRecord(respuestas);
            const previstas = Object.assign({}, hechas);
            localInference(template, goal, previstas);
            return applicableQuestions(template, previstas).filter((q) => !(q.id in hechas));
        };
        const pending = pendientesCon(answers);
        const freeText = [
            goal !== template.defaultGoal ? goal : '',
            ...answers.filter((a) => !a.optionId && a.text).map((a) => a.text),
        ].filter(Boolean);
        /*
         * NO se vuelve a consultar por lo mismo.
         *
         * El LLM solo deduce a partir del texto libre, y ese texto no cambia cuando la
         * persona se limita a elegir opciones: el objetivo es inmutable dentro de un
         * trabajo y las respuestas con `optionId` no entran en `freeText`. Preguntarle
         * otra vez por las mismas preguntas y el mismo texto solo puede dar lo mismo.
         *
         * Pero hay un caso en el que SÍ hay información nueva aunque el texto no haya
         * cambiado: una pregunta condicional que aparece por primera vez. En Chef, si
         * la persona elige "menú", surge "¿para cuántos días?", que nunca se consultó
         * —y el objetivo escrito puede contener ya la respuesta—. Por eso se compara
         * lo que está pendiente ahora con lo que lo estaba ANTES de este turno.
         *
         * Es seguro mirar un solo turno atrás: si algo sigue pendiente y ya lo estaba,
         * o se consultó en el turno anterior, o ese turno se saltó justamente porque no
         * traía nada nuevo; encadenando, se llega al primer turno, donde siempre se
         * consulta. Nada que no se haya preguntado puede quedarse sin preguntar.
         */
        const yaPendientes = input.turn ? pendientesCon(input.turn.before).map((q) => q.id) : [];
        const preguntaNueva = !input.turn || pending.some((q) => !yaPendientes.includes(q.id));
        const aportaTexto = !input.turn || input.turn.newFreeText;
        let inferred = [];
        if (pending.length > 0 && freeText.length > 0 && (aportaTexto || preguntaNueva)) {
            inferred = await inferAnswers(experienceId, freeText, pending, gateway);
        }
        const base = await exports.templatePlanner.next(Object.assign(Object.assign({}, input), { answers: [...answers, ...inferred] }));
        return Object.assign(Object.assign({}, base), { inferred });
    },
};
const getPlanner = () => (gemini_1.geminiAdapter.isConfigured() ? exports.llmPlanner : exports.templatePlanner);
exports.getPlanner = getPlanner;
//# sourceMappingURL=planner.js.map