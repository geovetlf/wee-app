import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { creatorService, CreatorJob, Question, Answer, humanizeCreatorError } from '../services/creatorService';

export interface QaItem {
  question: string;
  answer: string;
}

/**
 * Una conversación con un especialista de Weë Creator: empezar, responder,
 * crear y escuchar el trabajo. La pantalla solo pinta lo que este hook expone.
 */
export const useCreatorJob = (experienceId: string, initialJobId?: string) => {
  const { user } = useAuth();
  const [jobId, setJobId] = useState<string | null>(initialJobId || null);
  const [job, setJob] = useState<CreatorJob | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingGoal, setPendingGoal] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!jobId) return;
    return creatorService.subscribeToJob(jobId, setJob);
  }, [jobId]);

  // Al abrir un trabajo existente, la pregunta pendiente sale del propio trabajo
  useEffect(() => {
    if (!job || job.status !== 'asking' || question) return;
    const answered = new Set(job.answers.map((a) => a.questionId));
    const pending = job.questions.find((q) => !answered.has(q.id));
    if (pending) setQuestion(pending);
  }, [job, question]);

  const start = useCallback(
    async (goal?: string, presets?: Answer[]) => {
      if (!user) return false;
      setBusy(true);
      setError(null);
      setJob(null);
      setQuestion(null);
      setPendingGoal(goal);
      try {
        const response = await creatorService.start(experienceId, goal, presets);
        setJobId(response.jobId);
        setQuestion(response.question);
        return true;
      } catch (e) {
        setError(humanizeCreatorError(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [experienceId, user]
  );

  const answer = useCallback(
    async (optionId?: string, text?: string) => {
      if (!jobId || !question) return;
      setBusy(true);
      setError(null);
      try {
        const response = await creatorService.answer(jobId, { questionId: question.id, optionId, text });
        setQuestion(response.question);
      } catch (e) {
        setError(humanizeCreatorError(e));
      } finally {
        setBusy(false);
      }
    },
    [jobId, question]
  );

  const create = useCallback(async () => {
    if (!jobId) return;
    setBusy(true);
    setError(null);
    try {
      await creatorService.run(jobId);
    } catch (e) {
      setError(humanizeCreatorError(e));
    } finally {
      setBusy(false);
    }
  }, [jobId]);

  const reset = useCallback(() => {
    setJobId(null);
    setJob(null);
    setQuestion(null);
    setError(null);
    setPendingGoal(undefined);
  }, []);

  const history: QaItem[] = useMemo(() => {
    if (!job) return [];
    return job.answers
      .map((item) => {
        const q = job.questions.find((entry) => entry.id === item.questionId);
        if (!q) return null;
        const option = q.options.find((o) => o.id === item.optionId);
        const label = option ? option.label : item.text || '';
        return { question: q.text, answer: item.inferred ? `${label} · lo entendí de lo que escribiste` : label };
      })
      .filter((item): item is QaItem => !!item);
  }, [job]);

  return {
    user,
    jobId,
    job,
    question,
    busy,
    error,
    goal: job?.goal || pendingGoal,
    history,
    start,
    answer,
    create,
    reset,
  };
};
