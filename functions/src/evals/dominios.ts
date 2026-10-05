/*
 * Los dominios que `evalRun` puede correr con el proveedor REAL. El registro es el COMÚN (`motor/dominios.ts`:
 * congelado, sin prototipo, un nombre sin registrar falla cerrado); aquí solo se dice quién está. El Router es el
 * primero; uno nuevo es un adaptador en `dominios/`, su dataset en `DATASETS_REALES` y una línea más aquí.
 */
import { crearRegistroDeDominios } from './motor/dominios';
import type { DatasetDeEval } from './motor/contrato';
import { dominioRouterReal } from './dominios/router';
import { DATASET_REAL } from './datos';

export const DOMINIOS_REALES = crearRegistroDeDominios([dominioRouterReal]);

/** El dataset real de cada dominio registrado. Un dominio sin dataset aquí no se corre (falla cerrado). */
export const DATASETS_REALES: Readonly<Record<string, DatasetDeEval>> = Object.freeze({ [dominioRouterReal.id]: DATASET_REAL });
