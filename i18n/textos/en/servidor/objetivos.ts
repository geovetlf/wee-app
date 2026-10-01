/*
 * ENGLISH — Objetivos por defecto del flujo guiado de Weë AI (11): lo que pide una persona que empieza sin escribir
 * nada, dicho con su voz. Ver `../../es/servidor/objetivos.ts`.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const objetivos: typeof import('../../es/servidor/objetivos').objetivos = {
  objDesign: 'Design something I have in mind',
  objStudio: 'A short video for my social media',
  objPhoto: 'Improve a photo',
  objWriter: 'A text to publish',
  objMusic: 'Music for my content',
  objBeauty: 'Try a new look',
  objChef: 'Something tasty to eat today',
  objHome: 'Renovate a space in my home',
  objBusiness: 'Grow my business',
  objTravel: 'A trip I want to take',
  objBrain: 'I need help and I don’t know where to start',
};
