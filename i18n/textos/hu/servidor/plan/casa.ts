/*
 * HÚNGARO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega con su artículo y en nominativo («a nappali», «egy hálószoba»): va entre paréntesis o detrás de dos
 * puntos, porque el acusativo no se le puede pegar. `{{estilo}}` es un adjetivo delante de «stílusban».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'A fotódból kiindulva javítom a fényt. Az étel pontosan olyan marad, amilyen.',
  chefExplicaRetoqueFondo: 'A fotódból kiindulva lecserélem a hátteret. Az étel pontosan olyan marad, amilyen.',
  chefExplicaRetoqueApetitoso: 'A fotódból kiindulva étvágygerjesztőbbé teszem a képet. Az étel pontosan olyan marad, amilyen.',
  chefExplicaRetoqueRestaurante: 'A fotódból kiindulva éttermi fotó hatását adom neki. Az étel pontosan olyan marad, amilyen.',
  chefExplicaRetoqueQuitar: 'A fotódból kiindulva eltávolítom, ami felesleges. Az étel pontosan olyan marad, amilyen.',
  chefExplicaRetoqueNoSe: 'A fotódból kiindulva szebbé teszem a képet, az ételen nem változtatva. Az étel pontosan olyan marad, amilyen.',
  chefExplicaRetoqueLibre: 'A fotódból kiindulva csak azokat a változtatásokat végzem el, amelyeket megadtál. Az étel pontosan olyan marad, amilyen.',

  chefExplicaMenuTresDias: 'Összeállítok egy háromnapos menüt, {{comensales}}, és megadom a bevásárlólistát.',
  chefExplicaMenuTodaLaSemana: 'Összeállítok egy menüt az egész hétre, {{comensales}}, és megadom a bevásárlólistát.',
  chefExplicaMenuParaLaSemana: 'Összeállítok egy heti menüt, {{comensales}}, és megadom a bevásárlólistát.',
  chefExplicaMenu: 'Összeállítok egy menüt (időtartam: {{duracion}}), {{comensales}}, és megadom a bevásárlólistát.',

  chefExplicaRecetaEnTiempo: 'Készítek egy lépésről lépésre követhető receptet (idő: {{tiempo}}), {{comensales}}, és egy fotót a kész ételről.',
  chefExplicaRecetaSinApuro: 'Készítek egy lépésről lépésre követhető receptet, sietség nélkül, {{comensales}}, és egy fotót a kész ételről.',
  chefExplicaConLoQueTienesEnTiempo: 'Készítek egy receptet abból, ami otthon van (idő: {{tiempo}}), {{comensales}}, és egy fotót a kész ételről.',
  chefExplicaConLoQueTienesSinApuro: 'Készítek egy receptet abból, ami otthon van, sietség nélkül, {{comensales}}, és egy fotót a kész ételről.',
  chefExplicaSaludableEnTiempo: 'Készítek egy egészséges receptet (idő: {{tiempo}}), {{comensales}}, és egy fotót a kész ételről.',
  chefExplicaSaludableSinApuro: 'Készítek egy egészséges receptet, sietség nélkül, {{comensales}}, és egy fotót a kész ételről.',
  chefExplicaPostreEnTiempo: 'Készítek egy desszertet (idő: {{tiempo}}), {{comensales}}, és egy fotót a kész ételről.',
  chefExplicaPostreSinApuro: 'Készítek egy desszertet, sietség nélkül, {{comensales}}, és egy fotót a kész ételről.',

  chefDecisionAlgoRico: 'valami finomat és egyszerűt javaslok abból, ami általában otthon van',
  chefDecisionParaDos: 'két személyre terveztem',
  chefDecisionSinApuro: 'nem szabok időkorlátot',
  chefDecisionTodaLaSemana: 'az egész hétre készítem',

  chefPasoMirarIngredientes: 'A meglévő hozzávalók áttekintése',
  chefPasoEscribirReceta: 'A recept megírása lépésről lépésre',
  chefPasoFotoDelPlato: 'Fotó készítése az ételről',
  chefPasoArmarMenu: 'A menü összeállítása',
  chefPasoPreciosIngredientes: 'A hozzávalók árainak megnézése',
  chefPasoListaDeCompras: 'A bevásárlólista elkészítése',
  chefPasoRetocarFoto: 'Az ételed fotójának retusálása',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Megnézem a teret ({{espacio}}), és elmondom, mit változtatnék – bútorok, színek, elrendezés –, hogy eldönthesd, hol kezdd. Egyelőre nem készítek képet.',
  homeExplicaIdeas: 'Keresek három ötletet ({{espacio}}, {{estilo}} stílusban), és elmagyarázom, hogyan valósíthatod meg őket.',
  homeExplicaDistribucion: 'Megnézem a teret ({{espacio}}), javaslok egy jobb térkihasználású elrendezést, és megmutatom, hogyan festene a saját bútoraiddal.',
  homeExplicaRedisenar: 'Újratervezem a teret ({{espacio}}) {{estilo}} stílusban, két javaslattal, és megadom a változtatások és a vásárlások listáját.',
  homeExplicaMuebles: 'Lecserélem a tér bútorait ({{espacio}}) {{estilo}} stílusban, két javaslattal, és megadom a változtatások és a vásárlások listáját.',
  homeExplicaColores: 'Megváltoztatom a tér stílusát és színeit ({{espacio}}) {{estilo}} stílusban, két javaslattal, és megadom a változtatások és a vásárlások listáját.',
  homeExplicaExterior: 'Megtervezem a kültéri teredet {{estilo}} stílusban, két javaslattal, és megadom a változtatások és a vásárlások listáját.',

  homeDecisionEmpiezoPorLaSala: 'a nappalival kezdem',
  homeDecisionEstiloAcogedor: 'hangulatos stílust választottam',

  homePasoMirarFotoDelEspacio: 'A térről készült fotó megtekintése',
  homePasoRedisenar: 'Újratervezés: {{espacio}}, {{estilo}} stílusban',
  homePasoMuebles: 'Bútorcsere: {{espacio}}, {{estilo}} stílusban',
  homePasoColores: 'Stílus- és színváltás: {{espacio}}, {{estilo}} stílusban',
  homePasoExterior: 'A kültéri tered megtervezése {{estilo}} stílusban',
  homePasoListaDeCambios: 'A változtatások és a vásárlások listájának elkészítése',
  homePasoProponerDistribucion: 'Jobb elrendezés javaslása',
  homePasoMostrarComoQuedaria: 'Annak megmutatása, hogyan festene',
  homePasoBuscarIdeas: 'Ötletek keresése: {{espacio}}',
  homePasoExplicarComoLograrlo: 'A megvalósítás elmagyarázása',
  homePasoMirarFotoDeTuEspacio: 'A teredről készült fotó megtekintése',
  homePasoContarQueVeo: 'Mit látok és mit tennék',

  /* LA VOZ DE QUIEN HABLA: aquí habla Weë, así que «nekem» pasa a «neked» y «az irodám» a «az irodád». */
  chefComensalesSoloParaMi: 'csak neked',
  homeEspacioMiOficina: 'az irodád',
};
