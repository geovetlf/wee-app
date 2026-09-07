"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlanner = exports.llmPlanner = exports.templatePlanner = void 0;
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
 * Fase 0: planificador por plantillas, sin LLM. Pregunta lo que falta y arma el plan.
 */
exports.templatePlanner = {
    async next({ experienceId, goal, answers }) {
        const template = templates_1.TEMPLATES[experienceId];
        const record = toRecord(answers);
        // Lo que ya se entiende del texto de la persona no se vuelve a preguntar
        const inferred = [];
        if (template.infer && goal && goal !== template.defaultGoal) {
            const guessed = template.infer(goal);
            for (const [questionId, optionId] of Object.entries(guessed)) {
                const question = template.questions.find((q) => q.id === questionId);
                if (!question || questionId in record)
                    continue;
                if (!question.options.some((o) => o.id === optionId))
                    continue;
                record[questionId] = optionId;
                inferred.push({ questionId, optionId, inferred: true });
            }
        }
        // Solo se hacen las preguntas que aplican a lo ya respondido (when)
        const applicable = template.questions.filter((question) => !question.when || question.when(record));
        const pending = applicable.find((question) => !(question.id in record));
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
        const record = toRecord(answers);
        const pending = template.questions.filter((q) => !(q.id in record));
        const freeText = [
            goal !== template.defaultGoal ? goal : '',
            ...answers.filter((a) => !a.optionId && a.text).map((a) => a.text),
        ].filter(Boolean);
        let inferred = [];
        if (pending.length > 0 && freeText.length > 0) {
            inferred = await inferAnswers(experienceId, freeText, pending, gateway);
        }
        const base = await exports.templatePlanner.next(Object.assign(Object.assign({}, input), { answers: [...answers, ...inferred] }));
        return Object.assign(Object.assign({}, base), { inferred });
    },
};
const getPlanner = () => (gemini_1.geminiAdapter.isConfigured() ? exports.llmPlanner : exports.templatePlanner);
exports.getPlanner = getPlanner;
//# sourceMappingURL=planner.js.map