/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — La Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. La Ayuda es interfaz y se traduce entera. Las marcas van
 * sin sufijo: como sujeto/objeto en absolutivo («Weë suua?», «Weë aperaara:»), con
 * «pillugu» o en aposición. «IA» en prosa = «qarasaasiap silaa»; como sigla, «AI».
 * Los nombres de las comunidades oficiales coinciden con communities.officialName*.
 * El nº de especialistas y su lista van tras «Weë AI:» para no declinar la marca.
 */
export const help: typeof import('../es/help').help = {
  title: 'Ikiuineq',
  intro: 'Maani apeqqutinut nalinginnaanerpaanut akissutit takusinnaavatit. Arlaat paasiuminaappat oqaluttuarisigut: Weë peqatigiiffiup ikiorneratigut pitsanngoriartortarpoq.',
  faqTitle: 'Apeqqutit akulikitsumik apeqqutigineqartartut',
  contact: 'Attavigisigut',
  contactBody: 'Sivitsunngitsukkut maani sulisoqatigiit Weë pillugu suliaqartut toqqaannartumik attavigisinnaalissavatit. Tamatuma tungaanut isumassarsiatit ajornartorsiutitillu saqqummiussami siammartikkit: peqatigiiffiup sulisoqatigiillu atuartarpaat.',
  askQuestion: 'Apeqquteqarit',
  legalTitle: 'Piumasaqaatit paasissutissanillu illersuineq',
  legalBody: 'Paasissutissatit pigaatit. Weë e-mailinnik profilinnillu atuisarpoq taamaallaat atorsinnaaniassammat: iserneq, saqqummiussatit, Credits pigisatit pilersitatillu takutinnissaat. Paasissutissatit tuniniarneq ajorpavut.',
  legalPending: 'Piumasaqaatit tamakkiisut paasissutissanillu illersuinermut maleruagassat nittartakkami wee.zone saqqummiunneqassapput Weë ammarneqannginnerani. Weë suli sanaartorneqarpoq: periarfissat ilaasa misiligutitut paasissutissat atortarpaat, tamannalu pisoqarfiani erseqqissumik oqaatigisarparput.',
  footer: 'Weë · World Encode Entity · nutarterneq 1.0.0',
  q1: 'Weë suua?',
  a1: 'Weë (World Encode Entity) tassaavoq inunnut qarasaasiap silaa atorlugu pilersitsisartunut attaveqatigiiffik: maani nassaarsisarputit, ilinniartarputit, pilersitsisarputit, siammartitsisarputit attaveqarlutillu. AI motoriuvoq; peqatigiiffik uummataavoq.',
  q2: 'Profili piviusoq aamma Profili Weë qanoq assigiinngissuteqarpat?',
  a2: 'Profili piviusoq tassaavoq kinaassutsit nalinginnaasoq, taassumalu atorneqarnerani Weë qaqortumik isikkoqartarpoq. Profili Weë tassaavoq AI atorlugu pilersitsinissamut kinaassutsit: inuusaq ateralu nammineq pilersitatit saqqummiunniarlugit, taassumalu atorneqarnerani Weë taartumik isikkoqalertarpoq, taamaalilluni kinaassutsit sorleq atorneriuk ilisimajuartassallugu. Toqqagassat ☰ imaluunniit qulaani attortagaq atorlugu allanngortitsisinnaavutit.',
  q3: 'Weë AI qanoq ingerlasarpa?',
  a3_one: 'Weë oqaluttuariuk suna anguniarneriuk, oqaatsitit atorlugit. Weë apeqqutinik ikittunik paasiuminartunik apeqquteqassaaq (»Nalugara« akissutigisinnaajuassavat), pilersaarummik piareersaassaaq inernerlu pilersissallugu. Illit inerneq toqqartarpat; AI sorleq atorneqassanersoq Weë aalajangiisarpoq. Weë AI: {{contador}} immikkut ilisimasalik ({{lista}}).',
  a3_other: 'Weë oqaluttuariuk suna anguniarneriuk, oqaatsitit atorlugit. Weë apeqqutinik ikittunik paasiuminartunik apeqquteqassaaq (»Nalugara« akissutigisinnaajuassavat), pilersaarummik piareersaassaaq inernerlu pilersissallugu. Illit inerneq toqqartarpat; AI sorleq atorneqassanersoq Weë aalajangiisarpoq. Weë AI: {{contador}} immikkut ilisimasallit ({{lista}}).',
  q4: 'Credits suuppat?',
  a4: 'Weë AI atorlugu pilersitaq tamarmi Credits atortarpai. Pilersitsinnginnerit qanoq akeqassanersoq takusarpat, arlaallu iluatsinngippat utertinneqartarput. Weë AI suli sanaartorneqartillugu akit misiligutaapput amerlisaanerillu akeqanngillat: akit kingulliit AI-t piviusut peqatigalugit takkussapput.',
  q5: 'Suliniutit sumut atorneqartarpat?',
  a5: 'Suliniummi immikkut ilisimasallit assigiinngitsut pilersitaat katersorneqartarput: assersuutigalugu ilisarnaat, assit, ussassaarut, video nipilersornerlu, suliniummut »Neriniartarfiga« atugassat. Inerneq tamarmi suliniummi naleqquttumi toqqoruk: »Suliniummut toqqoruk«.',
  q6: 'Weëls suuppat?',
  a6: 'Videot sekundit 15 tikillugit sivisussusillit, pilersitatit takutinniarlugit. Weë avataani siammartinneqarsinnaapput, ilisarnaammillu mikisumik nalunaaqutsersugaapput: Weë. Pilersinniarukkit + attoruk, »Weël« toqqaruk.',
  q7: 'Peqatigiiffiit suuppat?',
  a7: 'Inuit soqutigisaqatigiit ataatsimoorfii: Filmit & Assilissat aalasut, Eqqumiitsuliorneq & Pilersitsisinnaassuseq, Niuerneq & Suliffeqarfiliorneq, Atortorissaarutit & AI allallu. Soqutigisatit ilaasortaaffigikkit tassanilu saqqummiussigit.',
  q8: 'WeeTalk suua?',
  a8: 'Oqaloqatigiinneq Weë atorlugu: peqatigiiffimmi inunnik allanik oqaloqatigiinnerit isertortut, allagaq, assit nipimillu oqariartuutit atorlugit.',
  q9: '»Qanoq pilersippara« suua?',
  a9: 'Saqqummiussigaangavit sakkut atukkatit, peqqussut suliarinninnerlu oqaluttuarisinnaavatit. Taamaalilluni inuit allat ilinnit ilinniarsinnaapput, illillu taakkunannga: »Peqqussut assiliguk« ataasiarlugu attorlugu.',
  q10: 'Weë atorniarlugu qassinik ukioqartariaqarpit?',
  a10: 'Weë atorniarukku ukioqassaatit minnerpaamik: {{edad}}. Inunngorfiit nalunaarsornermi apeqqutigineqarput, toqqorneqareerpallu allanngortinneqarsinnaanngillat.',
  heroTitle: 'Qanoq ikiorsinnaavatsigit?',
  legalVisibility: 'Saqqummiussatit peqatigiiffimmit takuneqarsinnaapput; Weë AI atorlugu pilersitatit isertortuupput saqqummiunniarlugit aalajangiinnginnerit tikillugu. Saqqummiussatit suliniutitillu piumasaraangakkit peersinnaavatit.',
  askPrefill: 'Weë aperaara: ',
};
