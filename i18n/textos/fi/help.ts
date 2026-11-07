/*
 * FINÉS — La Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El contenido de la Ayuda es interfaz y se traduce entero; los emojis y los
 * nombres de Weë se copian tal cual. Las respuestas CITAN botones de otros
 * módulos y usan exactamente los términos del glosario para que la ayuda diga
 * lo mismo que la pantalla: ”En tiedä” (No sé), ”Kopioi kehote” (Copiar
 * prompt), ”Tallenna projektiin” (Guardar en un proyecto), ”Weël”, y ”Näin
 * tein sen” (Cómo lo hice). Las marcas no se declinan: se les pone una cabeza
 * («Weë AI -palvelussa», «Weë-sovelluksen», «Weë-avustajalle»).
 */
export const help: typeof import('../es/help').help = {
  title: 'Ohje',
  intro: 'Täältä löydät vastaukset yleisimpiin kysymyksiin. Jos jokin jää epäselväksi, kerro meille: Weë kehittyy yhteisön avulla.',
  faqTitle: 'Usein kysytyt kysymykset',
  contact: 'Yhteystiedot',
  contactBody: 'Pian saat tänne suoran kanavan Weë-tiimiin. Sillä välin jaa ideasi ja ongelmasi julkaisussa: yhteisö ja tiimi lukevat ne.',
  askQuestion: 'Esitä kysymys',
  legalTitle: 'Käyttöehdot ja tietosuoja',
  legalBody: 'Tietosi ovat sinun. Weë käyttää sähköpostiosoitettasi ja profiiliasi vain siihen, että sovellus toimii: sisäänkirjautumiseen sekä julkaisujesi, Credits-saldosi ja luomustesi näyttämiseen. Emme myy tietojasi.',
  legalPending: 'Täydelliset käyttöehdot ja tietosuojakäytäntö julkaistaan osoitteessa wee.zone ennen sovelluksen lanseerausta. Weë on rakenteilla: jotkin toiminnot käyttävät testidataa, ja sanomme sen selvästi siellä, missä niin tapahtuu.',
  footer: 'Weë · World Encode Entity · versio 1.0.0',
  q1: 'Mikä Weë on?',
  a1: 'Weë (World Encode Entity) on sosiaalinen verkosto ihmisille, jotka luovat tekoälyn avulla: täällä löydät, opit, luot, jaat ja verkostoidut. Tekoäly on moottori; yhteisö on sydän.',
  q2: 'Mitä eroa on Oikealla profiililla ja Weë-profiililla?',
  a2: 'Oikea profiili on tavallinen identiteettisi, ja sovellus näkyy valkoisena. Weë-profiili on identiteettisi tekoälyllä luomiseen: oma avatar ja oma nimi luomustesi julkaisemiseen, ja silloin sovellus muuttuu tummaksi, jotta tiedät aina, kenenä osallistut. Vaihdat profiilista toiseen ☰-valikosta tai yläpalkin painikkeesta.',
  q3: 'Miten Weë AI toimii?',
  a3_one: 'Kerro Weë-avustajalle omin sanoin, mitä haluat saada aikaan. Weë kysyy muutaman yksinkertaisen kysymyksen (voit aina vastata ”En tiedä”), laatii suunnitelman ja luo tuloksen. Sinä valitset tuloksen; Weë valitsee tekoälyn. Weë AI -palvelussa on {{contador}} asiantuntija: {{lista}}.',
  a3_other: 'Kerro Weë-avustajalle omin sanoin, mitä haluat saada aikaan. Weë kysyy muutaman yksinkertaisen kysymyksen (voit aina vastata ”En tiedä”), laatii suunnitelman ja luo tuloksen. Sinä valitset tuloksen; Weë valitsee tekoälyn. Weë AI -palvelussa on {{contador}} asiantuntijaa: {{lista}}.',
  q4: 'Mitä Credits ovat?',
  a4: 'Jokainen Weë AI -luomus käyttää Credits-saldoa. Ennen luomista näet, paljonko se maksaa, ja jos jokin epäonnistuu, ne palautetaan. Sillä aikaa, kun rakennamme Weë AI -palvelua, hinnat ovat testihintoja eivätkä lataukset maksa mitään: lopulliset hinnat tulevat oikeiden tekoälyjen myötä.',
  q5: 'Mihin projekteja käytetään?',
  a5: 'Projekti kokoaa yhteen eri asiantuntijoiden luomuksia: esimerkiksi ”Ravintolani”-projektin logon, kuvat, mainoksen, videon ja musiikin. Tallenna jokainen tulos omaan projektiinsa kohdasta ”Tallenna projektiin”.',
  q6: 'Mitä Weëls ovat?',
  a6: 'Enintään 15 sekunnin videoita, joilla näytät, mitä luot. Niitä voi jakaa Weë-sovelluksen ulkopuolelle, ja niissä on pieni Weë-vesileima. Luot ne +-painikkeesta valitsemalla ”Weël”.',
  q7: 'Mitä yhteisöt ovat?',
  a7: 'Ryhmiä ihmisille, joilla on sama kiinnostuksen kohde: Elokuva & animaatio, Taide & luovuus, Liiketoiminta & yrittäjyys, Teknologia & tekoäly ja monta muuta. Liity niihin, jotka kiinnostavat sinua, ja julkaise niissä.',
  q8: 'Mikä WeeTalk on?',
  a8: 'Se on Weë-sovelluksen chat: yksityisiä keskusteluja yhteisön muiden ihmisten kanssa tekstillä, kuvilla ja ääniviesteillä.',
  q9: 'Mikä on ”Näin tein sen”?',
  a9: 'Julkaistessasi voit kertoa, mitä työkaluja käytit, sekä kehotteen ja prosessin. Näin muut oppivat sinulta ja sinä heiltä: riittää, että napautat ”Kopioi kehote”.',
  q10: 'Kuinka vanha pitää olla, jotta voi käyttää Weë-sovellusta?',
  a10: 'Weë on vain {{edad}} vuotta täyttäneille. Syntymäaikasi kysytään rekisteröitymisen yhteydessä, eikä sitä voi muuttaa tallentamisen jälkeen.',
  heroTitle: 'Miten voimme auttaa?',
  legalVisibility: 'Se, mitä julkaiset, näkyy yhteisölle; se, mitä luot Weë AI -palvelussa, on yksityistä, kunnes päätät julkaista sen. Voit poistaa julkaisusi ja projektisi milloin haluat.',
  askPrefill: 'Kysymys Weë-yhteisölle: ',
};
