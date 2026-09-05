"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlanner = exports.templatePlanner = void 0;
const templates_1 = require("./templates");
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
 * Fase 1: se reemplaza por Gemini (capacidad text.structure) manteniendo este contrato.
 */
exports.templatePlanner = {
    async next({ experienceId, goal, answers }) {
        const template = templates_1.TEMPLATES[experienceId];
        const record = toRecord(answers);
        const pending = template.questions.find((question) => !(question.id in record));
        if (pending)
            return { question: pending };
        return { plan: template.buildPlan(goal, record) };
    },
};
const getPlanner = () => exports.templatePlanner;
exports.getPlanner = getPlanner;
//# sourceMappingURL=planner.js.map