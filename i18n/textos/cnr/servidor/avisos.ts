/*
 * MONTENEGRINO (ijekaviano, latino) — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Novo sviđanje',
  likeCuerpo: 'Korisniku {{nombre}} se sviđa tvoja objava',
  comentarioTitulo: 'Novi komentar',
  comentarioCuerpo: '{{nombre}} komentariše tvoju objavu',
  seguidorTitulo: 'Novi pratilac',
  seguidorCuerpo: '{{nombre}} počinje da te prati',
  solicitudTitulo: 'Novi zahtjev za ËContact',
  solicitudCuerpo: '{{nombre}} želi da te doda u ËContact',
  aceptadaTitulo: 'Novi ËContact',
  aceptadaCuerpo: '{{nombre}} prihvata tvoj zahtjev za ËContact',
  mencionTitulo: 'Neko te pominje',
  mencionCuerpo: '{{nombre}} te pominje u objavi',
  repostTitulo: 'Tvoja objava je podijeljena',
  repostCuerpo: '{{nombre}} dijeli tvoju objavu',
  respuestaTitulo: 'Novi odgovor',
  respuestaCuerpo: '{{nombre}} odgovara na tvoj komentar',
  mensajeTitulo: 'Nova poruka',
  mensajeCuerpo: '{{nombre}} ti šalje poruku',
  alguien: 'Neko',
  teEnvioUnMensaje: 'Šalje ti poruku',
  fotoUnica: 'Jednokratna fotografija',
  imagen: '📷 Slika',
  audio: '🎤 Audio',
};
