/*
 * ISLANDÉS (is · is-IS) — Lo que contestan las Functions sociales cuando algo no se puede hacer: ËContact y las
 * encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * ËContact es marca y no se declina: «ËContacts» del español se dice «ËContact-tengiliðir» (compuesto con guion,
 * la flexión cae en «-tengiliðir»). «Contigo misma» se dice sin género: «við sjálfa/n þig» se evita con
 * «við þinn eigin prófíl».
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Engin beiðni bíður samþykkis.',
  ecRelacionInvalida: 'Þessi beiðni er ekki gild.',
  ecNoLaRecibiste: 'Aðeins sá sem fékk beiðnina getur samþykkt hana.',
  ecYaSonContactos: 'Þið eruð nú þegar ËContact-tengiliðir.',
  ecIdentidadInvalida: 'Þessi prófíll er ekki gildur.',
  ecIdentidadDesconocida: 'Þessi prófíll er ekki til.',
  ecIdentidadAjena: 'Þessi prófíll er ekki þinn.',
  ecMismaPersona: 'Þú getur ekki tengst þínum eigin prófíl.',
  ecYaExiste: 'Það eru þegar tengsl við þennan prófíl.',
  ecIniciaSesion: 'Skráðu þig inn til að nota ËContact.',
  ecNoSeCompleto: 'Ekki tókst að ljúka aðgerðinni. Reyndu aftur.',
  ecFaltaPerfilPropio: 'Það vantar prófílinn sem þú tengist með.',
  ecFaltaPerfilAjeno: 'Það vantar prófílinn sem á að tengjast.',
  ecFaltaPerfilQueAcepta: 'Það vantar prófílinn sem þú samþykkir með.',
  ecFaltaPerfilQueEnvia: 'Það vantar prófíl þess sem sendi þér beiðnina.',
  encSinEncuesta: 'Þessi færsla er ekki með könnun.',
  encInvalida: 'Þessi könnun er ekki gild.',
  encAntigua: 'Þessi könnun er úr eldri útgáfu af Weë og tekur ekki lengur við atkvæðum.',
  encOpcionInexistente: 'Þessi valkostur er ekki til í könnuninni.',
  encCerrada: 'Þessari könnun er lokið.',
  encYaVotaste: 'Þú hefur þegar kosið í þessari könnun.',
  encPostNoExiste: 'Þessi færsla er ekki lengur til.',
  encIniciaSesion: 'Þú þarft að skrá þig inn til að kjósa.',
  encFaltaPublicacion: 'Það vantar færsluna.',
  encFaltaOpcion: 'Það vantar valkostinn.',
  encNoSeRegistro: 'Ekki tókst að skrá atkvæðið þitt. Reyndu aftur.',
};
