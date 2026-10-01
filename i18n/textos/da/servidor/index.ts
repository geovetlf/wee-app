/*
 * DANÉS — LOS TEXTOS QUE ESCRIBE EL SERVIDOR (ver `../../es/servidor/index.ts`).
 *
 * Sección opcional: quien la declara, la declara entera (`FormaDelServidor`).
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
