/*
 * FILIPINO — la Ayuda (Tulong): las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario (`docs/I18N-FILIPINO.md` § 11): «Tulong», «Mga madalas itanong», «Makipag-ugnayan»
 * (Contacto), «Magtanong», «Mga tuntunin», «Privacy» y «Patakaran sa privacy», «Tunay na profile» y «Weë profile»
 * (§ 6), «likha» (creación), «espesyalista», «proyekto», «larawan», «voice message», «pansubok» (de prueba) y
 * «top-up». Se habla de tú, sin «po», y cuando Weë habla de sí mismo usa el «kami» exclusivo: «Hindi namin
 * ibinebenta…», «Ilalabas namin…», «Paano ka namin matutulungan?» (§ 2).
 *
 * La Ayuda CITA botones y opciones de otras pantallas, entre “…”, y dice lo mismo que ellos: «Kopyahin ang prompt»
 * (`wall.copyPrompt`), «I-save sa isang proyekto» (glosario § 11.10), «Weël» (`composer.kindWeel`), «Hindi ko alam»
 * (la opción 🤷 de Weë Brain) y «Paano ko ginawa» (`wall.howIMadeIt`, que el diseño pinta en mayúsculas). El proyecto
 * de ejemplo, «Restaurant ko», es el mismo que `projects.namePlaceholder`. Las frases fijas del glosario van palabra
 * por palabra: «Sa iyo ang data mo», «Hindi namin ibinebenta ang impormasyon mo», «Ikaw ang pipili ng resulta; ang
 * Weë ang pipili ng AI», «kung may pumalya, ibabalik ang mga ito» y «pribado hanggang magpasya kang i-post»
 * (con «ang mga ito» porque aquí son varias creaciones).
 *
 * `a1` sigue a `settings.aboutBody` («Ang Weë (World Encode Entity) ang social network para sa mga taong lumilikha
 * gamit ang Artificial Intelligence») y escribe «Artificial Intelligence» entero porque el español lo escribe entero;
 * «motor» es «makina». Las temáticas de comunidad de `a7` (Cine & Animación…) aún no tienen claves —viven en
 * `constants/communityCategories.ts`—: aquí van en filipino, en mayúscula de frase y con «at» en lugar de «&» (los
 * lectores de pantalla leen mal los signos); «Emprendimiento» es «entrepreneurship», la palabra que se usa en
 * Filipinas. Weë es didáctico y las marcas llevan su marcador de cosa: «ang chat ng Weë», «sa labas ng Weë»,
 * «maliit na watermark ng Weë», «May … espesyalista ang Weë AI».
 *
 * Plural (§ 8.3 y caso difícil `help.a3_*` del § 12): `{{contador}}` va delante de «espesyalista», así que `_other`
 * lleva el enlace «na» y `_one` no; con 11 sale `one` (*labing-isang espesyalista*), que es correcto. `footer`
 * escribe «bersyon» (§ 5.2). `askPrefill` conserva el espacio final: se pega delante de lo que escriba la persona.
 */
export const help: typeof import('../es/help').help = {
  title: 'Tulong',
  intro: 'Narito ang mga sagot sa mga pinakakaraniwang tanong. Kung may hindi malinaw, sabihin sa amin: mas gumaganda ang Weë sa tulong ng komunidad.',
  faqTitle: 'Mga madalas itanong',
  contact: 'Makipag-ugnayan',
  contactBody: 'Malapit ka nang magkaroon dito ng direktang paraan para makausap ang team ng Weë. Habang wala pa, ibahagi ang mga ideya at problema mo sa isang post: binabasa ng komunidad at ng team ang mga ito.',
  askQuestion: 'Magtanong',
  legalTitle: 'Mga tuntunin at privacy',
  legalBody: 'Sa iyo ang data mo. Ginagamit lang ng Weë ang email at profile mo para gumana ang app: para makapag-sign in ka at maipakita ang mga post mo, ang Credits mo at ang mga likha mo. Hindi namin ibinebenta ang impormasyon mo.',
  legalPending: 'Ilalabas namin sa wee.zone ang kumpletong tuntunin at patakaran sa privacy bago ang opisyal na paglulunsad. Ginagawa pa ang Weë: may ilang feature na gumagamit ng pansubok na data, at malinaw naming sinasabi iyon kung saan ito nangyayari.',
  footer: 'Weë · World Encode Entity · bersyon 1.0.0',
  q1: 'Ano ang Weë?',
  a1: 'Ang Weë (World Encode Entity) ang social network para sa mga taong lumilikha gamit ang Artificial Intelligence: dito ka tumutuklas, natututo, lumilikha, nagbabahagi at kumokonekta. Ang AI ang makina; ang komunidad ang puso.',
  q2: 'Ano ang pagkakaiba ng Tunay na profile at ng Weë profile?',
  a2: 'Ang Tunay na profile mo ang pang-araw-araw mong pagkakakilanlan, at puti ang itsura ng app kapag ito ang gamit mo. Ang Weë profile mo ang pagkakakilanlan mo sa paglikha gamit ang AI: may sarili itong avatar at pangalan na ginagamit mo sa pag-post ng mga likha mo, at sa profile na ito, nagiging madilim ang app para lagi mong alam kung aling profile ang ginagamit mo. Puwede kang magpalipat-lipat sa dalawa gamit ang menu ☰ o ang button sa itaas ng screen.',
  q3: 'Paano gumagana ang Weë AI?',
  a3_one: 'Sabihin sa Weë sa sarili mong salita ang gusto mong makamit. Tatanungin ka ng Weë ng ilang simpleng tanong (puwede mong laging isagot ang “Hindi ko alam”), saka ito maghahanda ng plano at gagawa ng resulta. Ikaw ang pipili ng resulta; ang Weë ang pipili ng AI. May {{contador}} espesyalista ang Weë AI: {{lista}}.',
  a3_other: 'Sabihin sa Weë sa sarili mong salita ang gusto mong makamit. Tatanungin ka ng Weë ng ilang simpleng tanong (puwede mong laging isagot ang “Hindi ko alam”), saka ito maghahanda ng plano at gagawa ng resulta. Ikaw ang pipili ng resulta; ang Weë ang pipili ng AI. May {{contador}} na espesyalista ang Weë AI: {{lista}}.',
  q4: 'Ano ang Credits?',
  a4: 'Gumagamit ng Credits ang bawat likha sa Weë AI. Bago gumawa, makikita mo kung magkano ang magagastos, at kung may pumalya, ibabalik ang mga ito. Habang binubuo namin ang Weë AI, pansubok ang mga presyo at libre ang mga top-up: darating ang mga pinal na presyo kasabay ng mga totoong AI.',
  q5: 'Para saan ang mga proyekto?',
  a5: 'Pinagsasama-sama ng isang proyekto ang mga likha ng iba’t ibang espesyalista: halimbawa, ang logo, ang mga larawan, ang ad, ang video at ang musika para sa “Restaurant ko”. I-save ang bawat resulta sa tamang proyekto gamit ang “I-save sa isang proyekto”.',
  q6: 'Ano ang Weëls?',
  a6: 'Mga video na hanggang 15 segundo para ipakita ang mga ginagawa mo. Puwede mong ibahagi ang mga ito sa labas ng Weë, at may maliit na watermark ng Weë ang mga ito. Para gumawa ng isa, i-tap ang button na + at piliin ang “Weël”.',
  q7: 'Ano ang mga komunidad?',
  a7: 'Mga grupo ng taong may iisang interes: Pelikula at animation, Sining at pagkamalikhain, Negosyo at entrepreneurship, Teknolohiya at AI, at marami pa. Sumali sa mga gusto mo at mag-post doon.',
  q8: 'Ano ang WeeTalk?',
  a8: 'Ito ang chat ng Weë: mga pribadong usapan kasama ang ibang tao sa komunidad, gamit ang text, larawan at voice message.',
  q9: 'Ano ang “Paano ko ginawa”?',
  a9: 'Kapag nag-post ka, puwede mong ikuwento kung anong mga tool ang ginamit mo, ang prompt at ang proseso. Sa ganitong paraan, natututo sa iyo ang ibang tao, at ikaw rin sa kanila, sa isang tap lang sa “Kopyahin ang prompt”.',
  q10: 'Ilang taon ka dapat para magamit ang Weë?',
  a10: 'Para lang sa mga {{edad}} taong gulang pataas ang Weë. Hinihingi ang kaarawan mo kapag nag-sign up ka, at kapag na-save na, hindi na ito mababago.',
  heroTitle: 'Paano ka namin matutulungan?',
  legalVisibility: 'Nakikita ng komunidad ang mga pino-post mo; pribado ang mga ginagawa mo sa Weë AI hanggang magpasya kang i-post ang mga ito. Puwede mong i-delete ang mga post at proyekto mo kahit kailan mo gusto.',
  askPrefill: 'Isang tanong para sa Weë: ',
};
