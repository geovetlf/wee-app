/*
 * FILIPINO — lo que describe cada experiencia de Weë AI y los ejemplos que se tocan para empezar. Los nombres
 * —Weë Design, Weë Studio…— son marca y viven en constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * LAS DESCRIPCIONES son listas cortas con las palabras del glosario y del catálogo (`catalogo.ts`): «larawan»,
 * «content», «social media», «script», «recipe», «resume» (el CV en Filipinas), «presentation», «makeup»,
 * «makeover», «outfit», «interior design», «narasyon». Las de verbos coordinados comparten foco (§ 3.1 y cabecera del
 * catálogo): «Likhain at baguhin ang…», «Pagandahin, i-restore at baguhin ang…». La de Weë Travel repite el arranque
 * del catálogo, «Ihanda ang biyahe mo», y «cómo moverte» es «paano lumibot».
 *
 * LOS EJEMPLOS hablan con la voz de la persona, como se escribiría en una caja de Weë AI, y dicen lo mismo que sus
 * gemelos del catálogo cuando los hay: «Japan sa Oktubre», «Gusto ko ng tahimik at murang beach», «Hindi ko alam
 * kung saan bibiyahe», «Hindi ko alam ang lulutuin ko ngayon», «Subukan ang ibang kulay ng buhok», «cover ng libro
 * ko». Se adapta lo que el calco no serviría: el patio es la «bakuran», la música de fondo «background music» y «Mi CV
 * actualizado», «I-update ang resume ko». Un Weël es «Weël», sin nada pegado.
 *
 * LAS ÁREAS se traducen porque se leen; la marca de delante no: «Weë Studio · Mga larawan», «Weë Studio · Mga
 * video», «Weë Studio · Pagpapaganda» (el «Beauty» del español es el nombre del área, no la marca Weë Beauty, igual
 * que en el catálogo) y «Weë Design · Bahay at disenyo», el nombre que el catálogo da a «Hogar & Diseño», con «at» en
 * vez de «&».
 *
 * `tellTheSpecialist` nombra al especialista con su marcador de cosa («Sabihin sa {{especialista}}…», § 6) y luego lo
 * retoma con «ito», nunca con «siya». Las comillas del ejemplo son las tipográficas “…” (§ 7).
 */
export const creator: typeof import('../es/creator').creator = {
  design: 'Mga logo, poster, ilustrasyon at content para sa social media mo',
  studio: 'Likhain at baguhin ang mga larawan at video gamit ang AI.',
  photo: 'Pagandahin, i-restore at baguhin ang mga larawan mo',
  writer: 'Mga post, kuwento, script, email at libro',
  music: 'Mga kanta, instrumental na musika, boses at narasyon',
  beauty: 'Makeup, buhok, balbas, outfit at makeover',
  chef: 'Ang personal chef mo: kung ano ang lulutuin, mga recipe at menu',
  home: 'Dekorasyon, interior design, renovation at hardin',
  business: 'Mga ideya sa negosyo, marketing, resume, dokumento at presentation',
  travel: 'Ihanda ang biyahe mo: kung saan pupunta, ano ang gagawin at paano lumibot',
  brain: 'Hindi mo alam kung saan maghahanap? Tanungin ang Weë',
  designEx1: 'Logo para sa negosyo ko',
  designEx2: 'Post para sa Instagram',
  designEx3: 'Cover ng libro ko',
  studioEx1: 'Video para i-promote ang restaurant ko',
  studioEx2: 'Gawing video ang larawan ko',
  studioEx3: 'Weël na tampok ang produkto ko',
  photoEx1: 'Pagandahin ang kalidad ng isang larawan',
  photoEx2: 'Alisin ang hindi kailangan sa larawan',
  photoEx3: 'Palitan ang background ng larawan ko',
  writerEx1: 'Script para sa video ko',
  writerEx2: 'Email para sa isang customer',
  writerEx3: 'Itama ang text ko',
  musicEx1: 'Jingle para sa brand ko',
  musicEx2: 'Background music para sa video ko',
  musicEx3: 'Gawing boses ang text ko',
  beautyEx1: 'Ano ang magiging itsura ko sa mahabang buhok',
  beautyEx2: 'Look para sa isang party',
  beautyEx3: 'Subukan ang ibang kulay ng buhok',
  chefEx1: 'Recipe gamit ang mayroon ako sa bahay',
  chefEx2: 'Masustansyang menu para sa buong linggo',
  chefEx3: 'Hindi ko alam ang lulutuin ko ngayon',
  homeEx1: 'Ano ang magiging itsura ng sala ko sa ibang istilo',
  homeEx2: 'Mga ideya para dekorasyunan ang kuwarto ko',
  homeEx3: 'Maliit na hardin para sa bakuran ko',
  businessEx1: 'Plano para sa bagong negosyo ko',
  businessEx2: 'I-update ang resume ko',
  businessEx3: 'Presentation para sa mga investor',
  travelEx1: 'Japan sa Oktubre',
  travelEx2: 'Gusto ko ng tahimik at murang beach',
  travelEx3: 'Hindi ko alam kung saan bibiyahe',
  brainEx1: 'Hindi ko alam kung saan magsisimula',
  brainEx2: 'Ipaliwanag ito sa akin nang simple',
  brainEx3: 'Isalin ang text na ito',
  areaStudioPhotos: 'Weë Studio · Mga larawan',
  areaStudioVideos: 'Weë Studio · Mga video',
  areaStudioBeauty: 'Weë Studio · Pagpapaganda',
  areaDesignHome: 'Weë Design · Bahay at disenyo',
  areaHomeName: 'Bahay at disenyo',
  tellTheSpecialist: 'Sabihin sa {{especialista}} kung ano ang gusto mong gawin: magtatanong ito ng dalawa o tatlong simpleng tanong at ito na ang bahala sa iba pa. Pagkatapos, puwede mo itong i-post agad sa komunidad mo.',
  exampleQuoted: '“{{ejemplo}}”',
};
