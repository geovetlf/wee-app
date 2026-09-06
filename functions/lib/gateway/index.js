"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCapability = runCapability;
const engine_1 = require("../engine");
async function runCapability(capability, input, ctx) {
    const result = await engine_1.engine.generate({
        capability,
        input,
        userId: ctx.userId,
        jobId: ctx.jobId,
        stepId: ctx.stepId,
        experienceId: ctx.experienceId,
        goal: ctx.goal,
        prefs: ctx.prefs,
        record: ctx.record,
    });
    return {
        output: result.output,
        usage: result.usage,
        costUSD: result.costUSD,
        latencyMs: result.latencyMs,
        provider: result.provider,
        credits: result.credits,
        generationId: result.generationId,
        demo: result.demo,
        attempts: result.attempts,
    };
}
//# sourceMappingURL=index.js.map