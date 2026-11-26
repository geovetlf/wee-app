/*
 * KALAALLISUT (kl-GL) — lengua propia, NO danés ni variante del danés; sin respaldo en danés — los textos que escribe el servidor (push, página pública, preguntas y planes de Weë AI).
 * Traducción hecha por agentes de IA y SIN revisión humana nativa (2026-11-03).
 */
import type { FormaDelServidor } from '../../es/servidor';
import { preguntas } from './preguntas';
import { opciones } from './opciones';
import { objetivos } from './objetivos';
import { plan } from './plan';
import { progreso } from './progreso';
import { motor } from './motor';
import { movimientos } from './movimientos';
import { social } from './social';
import { avisos } from './avisos';
import { publica } from './publica';
import { resultado } from './resultado';

export const servidor: FormaDelServidor = {
  preguntas,
  opciones,
  objetivos,
  plan,
  progreso,
  motor,
  movimientos,
  social,
  avisos,
  publica,
  resultado,
};
