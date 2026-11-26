/*
 * ISLANDÉS (is · is-IS) — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * {{comensales}} trae su preposición desde la opción («fyrir tvo»), así que va suelto tras la coma. {{tiempo}},
 * {{duracion}} y {{espacio}} entran entre paréntesis, en nominativo («(tími: hálftími)», «rýmið (stofan)»), y
 * {{estilo}} tras «stíll:» como adjetivo masculino. Las `…Decision…` empiezan por el verbo (V2).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Ég vinn út frá myndinni þinni og bæti birtuna. Rétturinn helst nákvæmlega eins og hann er.',
  chefExplicaRetoqueFondo: 'Ég vinn út frá myndinni þinni og skipti um bakgrunn. Rétturinn helst nákvæmlega eins og hann er.',
  chefExplicaRetoqueApetitoso: 'Ég vinn út frá myndinni þinni og læt réttinn líta girnilegri út. Rétturinn helst nákvæmlega eins og hann er.',
  chefExplicaRetoqueRestaurante: 'Ég vinn út frá myndinni þinni og læt hana líta út eins og hún sé tekin á veitingastað. Rétturinn helst nákvæmlega eins og hann er.',
  chefExplicaRetoqueQuitar: 'Ég vinn út frá myndinni þinni og fjarlægi það sem er óþarft. Rétturinn helst nákvæmlega eins og hann er.',
  chefExplicaRetoqueNoSe: 'Ég vinn út frá myndinni þinni og bæti útlit hennar án þess að breyta réttinum. Rétturinn helst nákvæmlega eins og hann er.',
  chefExplicaRetoqueLibre: 'Ég vinn út frá myndinni þinni og geri eingöngu þær breytingar sem þú baðst um. Rétturinn helst nákvæmlega eins og hann er.',

  chefExplicaMenuTresDias: 'Ég set saman matseðil fyrir þrjá daga, {{comensales}}, og læt innkaupalistann fylgja.',
  chefExplicaMenuTodaLaSemana: 'Ég set saman matseðil fyrir alla vikuna, {{comensales}}, og læt innkaupalistann fylgja.',
  chefExplicaMenuParaLaSemana: 'Ég set saman matseðil fyrir vikuna, {{comensales}}, og læt innkaupalistann fylgja.',
  chefExplicaMenu: 'Ég set saman matseðil (tímabil: {{duracion}}), {{comensales}}, og læt innkaupalistann fylgja.',

  chefExplicaRecetaEnTiempo: 'Ég útbý uppskrift skref fyrir skref (tími: {{tiempo}}), {{comensales}}, og mynd af því hvernig rétturinn lítur út.',
  chefExplicaRecetaSinApuro: 'Ég útbý uppskrift skref fyrir skref í rólegheitum, {{comensales}}, og mynd af því hvernig rétturinn lítur út.',
  chefExplicaConLoQueTienesEnTiempo: 'Ég útbý uppskrift úr því sem þú átt heima (tími: {{tiempo}}), {{comensales}}, og mynd af því hvernig rétturinn lítur út.',
  chefExplicaConLoQueTienesSinApuro: 'Ég útbý uppskrift úr því sem þú átt heima, í rólegheitum, {{comensales}}, og mynd af því hvernig rétturinn lítur út.',
  chefExplicaSaludableEnTiempo: 'Ég útbý holla uppskrift (tími: {{tiempo}}), {{comensales}}, og mynd af því hvernig rétturinn lítur út.',
  chefExplicaSaludableSinApuro: 'Ég útbý holla uppskrift í rólegheitum, {{comensales}}, og mynd af því hvernig rétturinn lítur út.',
  chefExplicaPostreEnTiempo: 'Ég útbý eftirrétt (tími: {{tiempo}}), {{comensales}}, og mynd af því hvernig rétturinn lítur út.',
  chefExplicaPostreSinApuro: 'Ég útbý eftirrétt í rólegheitum, {{comensales}}, og mynd af því hvernig rétturinn lítur út.',

  chefDecisionAlgoRico: 'sting ég upp á einhverju góðu og einföldu úr því sem þú átt yfirleitt heima',
  chefDecisionParaDos: 'miðaði ég við tvo',
  chefDecisionSinApuro: 'gef ég mér góðan tíma',
  chefDecisionTodaLaSemana: 'geri ég hann fyrir alla vikuna',

  chefPasoMirarIngredientes: 'Skoða hvaða hráefni þú átt',
  chefPasoEscribirReceta: 'Skrifa uppskriftina skref fyrir skref',
  chefPasoFotoDelPlato: 'Búa til mynd af réttinum',
  chefPasoArmarMenu: 'Setja saman matseðilinn',
  chefPasoPreciosIngredientes: 'Kanna hvað hráefnin kosta',
  chefPasoListaDeCompras: 'Gera innkaupalistann',
  chefPasoRetocarFoto: 'Lagfæra myndina af réttinum þínum',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Ég skoða rýmið ({{espacio}}) og segi þér hverju ég myndi breyta —húsgögnum, litum, skipulagi— svo þú getir valið hvar á að byrja. Ég bý ekki til neina mynd enn.',
  homeExplicaIdeas: 'Ég leita að þremur hugmyndum fyrir rýmið ({{espacio}}; stíll: {{estilo}}) og útskýri hvernig þú getur látið þær verða að veruleika.',
  homeExplicaDistribucion: 'Ég skoða rýmið ({{espacio}}), sting upp á skipulagi sem nýtir plássið betur og sýni þér hvernig það myndi líta út með sömu húsgögnum.',
  homeExplicaRedisenar: 'Ég endurhanna rýmið ({{espacio}}; stíll: {{estilo}}) í tveimur tillögum og læt lista yfir breytingar og innkaup fylgja.',
  homeExplicaMuebles: 'Ég skipti um húsgögn í rýminu ({{espacio}}; stíll: {{estilo}}) í tveimur tillögum og læt lista yfir breytingar og innkaup fylgja.',
  homeExplicaColores: 'Ég breyti stíl og litum rýmisins ({{espacio}}; stíll: {{estilo}}) í tveimur tillögum og læt lista yfir breytingar og innkaup fylgja.',
  homeExplicaExterior: 'Ég hanna útisvæðið þitt (stíll: {{estilo}}) í tveimur tillögum og læt lista yfir breytingar og innkaup fylgja.',

  homeDecisionEmpiezoPorLaSala: 'byrja ég á stofunni',
  homeDecisionEstiloAcogedor: 'valdi ég notalegan stíl',

  homePasoMirarFotoDelEspacio: 'Skoða myndina af rýminu',
  homePasoRedisenar: 'Endurhanna rýmið ({{espacio}}; stíll: {{estilo}})',
  homePasoMuebles: 'Skipta um húsgögn í rýminu ({{espacio}}; stíll: {{estilo}})',
  homePasoColores: 'Breyta stíl og litum rýmisins ({{espacio}}; stíll: {{estilo}})',
  homePasoExterior: 'Hanna útisvæðið þitt (stíll: {{estilo}})',
  homePasoListaDeCambios: 'Setja saman lista yfir breytingar og innkaup',
  homePasoProponerDistribucion: 'Stinga upp á betra skipulagi',
  homePasoMostrarComoQuedaria: 'Sýna þér hvernig það myndi líta út',
  homePasoBuscarIdeas: 'Leita að hugmyndum fyrir rýmið ({{espacio}})',
  homePasoExplicarComoLograrlo: 'Útskýra fyrir þér hvernig það tekst',
  homePasoMirarFotoDeTuEspacio: 'Skoða myndina af rýminu þínu',
  homePasoContarQueVeo: 'Segja þér hvað ég sé og hvað ég myndi gera',

  /* LA VOZ DE QUIEN HABLA: la opción dice «mig»/«mín»; Weë habla de «þú». */
  chefComensalesSoloParaMi: 'bara fyrir þig',
  homeEspacioMiOficina: 'skrifstofan þín',
};
