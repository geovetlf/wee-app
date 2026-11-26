/*
 * MONGOL — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` ya trae su dativo («хоёр хүнд»). `{{estilo}}` es adjetivo delante de «хэв маяг». `{{espacio}}`,
 * `{{tiempo}}` y `{{duracion}}` son nombres sin caso: entran con «гэсэн» o detrás de una etiqueta («хугацаа: …»).
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Таны зургаас эхлээд гэрлийг сайжруулна. Хоол яг хэвээрээ үлдэнэ.',
  chefExplicaRetoqueFondo: 'Таны зургаас эхлээд дэвсгэрийг солино. Хоол яг хэвээрээ үлдэнэ.',
  chefExplicaRetoqueApetitoso: 'Таны зургаас эхлээд илүү амттай харагдуулна. Хоол яг хэвээрээ үлдэнэ.',
  chefExplicaRetoqueRestaurante: 'Таны зургаас эхлээд рестораны зураг шиг харагдуулна. Хоол яг хэвээрээ үлдэнэ.',
  chefExplicaRetoqueQuitar: 'Таны зургаас эхлээд илүүдэл зүйлийг арилгана. Хоол яг хэвээрээ үлдэнэ.',
  chefExplicaRetoqueNoSe: 'Таны зургаас эхлээд хоолыг өөрчлөхгүйгээр харагдах байдлыг сайжруулна. Хоол яг хэвээрээ үлдэнэ.',
  chefExplicaRetoqueLibre: 'Таны зургаас эхлээд зөвхөн таны хэлсэн өөрчлөлтүүдийг хийнэ. Хоол яг хэвээрээ үлдэнэ.',

  chefExplicaMenuTresDias: 'Гурван өдрийн цэс гаргаж ({{comensales}}), худалдан авалтын жагсаалтыг өгнө.',
  chefExplicaMenuTodaLaSemana: 'Бүтэн долоо хоногийн цэс гаргаж ({{comensales}}), худалдан авалтын жагсаалтыг өгнө.',
  chefExplicaMenuParaLaSemana: 'Долоо хоногийн цэс гаргаж ({{comensales}}), худалдан авалтын жагсаалтыг өгнө.',
  chefExplicaMenu: 'Цэс гаргаж (хугацаа: {{duracion}}; {{comensales}}), худалдан авалтын жагсаалтыг өгнө.',

  chefExplicaRecetaEnTiempo: 'Алхам алхмаар жор бэлдэж (хугацаа: {{tiempo}}; {{comensales}}), бэлэн хоолны зураг бүтээнэ.',
  chefExplicaRecetaSinApuro: 'Алхам алхмаар жор яаралгүй бэлдэж ({{comensales}}), бэлэн хоолны зураг бүтээнэ.',
  chefExplicaConLoQueTienesEnTiempo: 'Гэрт тань байгаа зүйлээр жор бэлдэж (хугацаа: {{tiempo}}; {{comensales}}), бэлэн хоолны зураг бүтээнэ.',
  chefExplicaConLoQueTienesSinApuro: 'Гэрт тань байгаа зүйлээр жор яаралгүй бэлдэж ({{comensales}}), бэлэн хоолны зураг бүтээнэ.',
  chefExplicaSaludableEnTiempo: 'Эрүүл жор бэлдэж (хугацаа: {{tiempo}}; {{comensales}}), бэлэн хоолны зураг бүтээнэ.',
  chefExplicaSaludableSinApuro: 'Эрүүл жор яаралгүй бэлдэж ({{comensales}}), бэлэн хоолны зураг бүтээнэ.',
  chefExplicaPostreEnTiempo: 'Амттан бэлдэж (хугацаа: {{tiempo}}; {{comensales}}), бэлэн хоолны зураг бүтээнэ.',
  chefExplicaPostreSinApuro: 'Амттан яаралгүй бэлдэж ({{comensales}}), бэлэн хоолны зураг бүтээнэ.',

  chefDecisionAlgoRico: 'гэртээ ихэвчлэн байдаг зүйлээр хийх амттай, хялбар хоол санал болгоно',
  chefDecisionParaDos: 'хоёр хүнд зориулж бодлоо',
  chefDecisionSinApuro: 'яаралгүй хийхээр бодлоо',
  chefDecisionTodaLaSemana: 'бүтэн долоо хоногт зориулж хийнэ',

  chefPasoMirarIngredientes: 'Танд ямар орц байгааг харах',
  chefPasoEscribirReceta: 'Жорыг алхам алхмаар бичих',
  chefPasoFotoDelPlato: 'Хоолны зураг бүтээх',
  chefPasoArmarMenu: 'Цэс гаргах',
  chefPasoPreciosIngredientes: 'Орцын үнийг шалгах',
  chefPasoListaDeCompras: 'Худалдан авалтын жагсаалт гаргах',
  chefPasoRetocarFoto: 'Таны хоолны зургийг засах',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: '{{espacio}} гэсэн орон зайг харж, юуг өөрчлөхөө — тавилга, өнгө, зохион байгуулалт — хэлье, тэгвэл та хаанаас эхлэхээ сонгоно. Одоохондоо зураг үүсгэхгүй.',
  homeExplicaIdeas: '{{espacio}} гэсэн орон зайд {{estilo}} хэв маягаар гурван санаа хайж, хэрхэн хэрэгжүүлэхийг тайлбарлана.',
  homeExplicaDistribucion: '{{espacio}} гэсэн орон зайг харж, зайг илүү сайн ашиглах зохион байгуулалт санал болгоод, одоогийн тавилгаар тань ямар харагдахыг үзүүлнэ.',
  homeExplicaRedisenar: '{{espacio}} гэсэн орон зайг {{estilo}} хэв маягаар дахин зохион бүтээж, хоёр санал бэлдээд, өөрчлөлт ба худалдан авалтын жагсаалтыг өгнө.',
  homeExplicaMuebles: '{{espacio}} гэсэн орон зайн тавилгыг {{estilo}} хэв маягаар сольж, хоёр санал бэлдээд, өөрчлөлт ба худалдан авалтын жагсаалтыг өгнө.',
  homeExplicaColores: '{{espacio}} гэсэн орон зайн өнгө, төрхийг {{estilo}} хэв маягаар өөрчилж, хоёр санал бэлдээд, өөрчлөлт ба худалдан авалтын жагсаалтыг өгнө.',
  homeExplicaExterior: 'Таны гадна орчныг {{estilo}} хэв маягаар зохион бүтээж, хоёр санал бэлдээд, өөрчлөлт ба худалдан авалтын жагсаалтыг өгнө.',

  homeDecisionEmpiezoPorLaSala: 'зочны өрөөнөөс эхэлнэ',
  homeDecisionEstiloAcogedor: 'тухтай хэв маяг сонголоо',

  homePasoMirarFotoDelEspacio: 'Орон зайн зургийг харах',
  homePasoRedisenar: 'Дахин зохион бүтээх: {{espacio}}, {{estilo}} хэв маягаар',
  homePasoMuebles: 'Тавилга солих: {{espacio}}, {{estilo}} хэв маягаар',
  homePasoColores: 'Өнгө, төрхийг өөрчлөх: {{espacio}}, {{estilo}} хэв маягаар',
  homePasoExterior: 'Таны гадна орчныг {{estilo}} хэв маягаар зохион бүтээх',
  homePasoListaDeCambios: 'Өөрчлөлт ба худалдан авалтын жагсаалт гаргах',
  homePasoProponerDistribucion: 'Илүү сайн зохион байгуулалт санал болгох',
  homePasoMostrarComoQuedaria: 'Ямар харагдахыг үзүүлэх',
  homePasoBuscarIdeas: 'Санаа хайх: {{espacio}}',
  homePasoExplicarComoLograrlo: 'Хэрхэн хэрэгжүүлэхийг тайлбарлах',
  homePasoMirarFotoDeTuEspacio: 'Таны орон зайн зургийг харах',
  homePasoContarQueVeo: 'Юу харж, юу хийхээ хэлэх',

  /* La voz de quien habla: Weë habla de «та», no de «би». */
  chefComensalesSoloParaMi: 'зөвхөн танд',
  homeEspacioMiOficina: 'таны оффис',
};
