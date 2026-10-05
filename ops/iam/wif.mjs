#!/usr/bin/env node
/*
 * LA IDENTIDAD DE DESPLIEGUE, SIN CLAVES — Weë Agent Harness, FASE 2 y 6.
 *
 * SOLO IMPRIME los comandos que el DUEÑO ejecuta en su terminal (IAM es suyo:
 * docs/SECURITY.md §7). Este script no ejecuta nada ni tiene modo de hacerlo.
 *
 * Qué crea, una vez:
 *  · un pool y un proveedor de Workload Identity Federation para GitHub, que
 *    SOLO acepta el workflow `despliegue.yml` de main de geovetlf/wee-app,
 *    ejecutado en el entorno `get-wee` (es decir: después de que el dueño lo
 *    apruebe). Una copia del workflow en otra rama no consigue credencial;
 *  · una cuenta de servicio de despliegue con los permisos mínimos para
 *    desplegar Functions, reglas, índices y hosting, y mover tráfico de Cloud
 *    Run (la marcha atrás). Sin Owner, sin facturación, sin leer secretos, sin
 *    IAM del proyecto;
 *  · y lo que hay que poner en GitHub (entorno y variables, ningún secreto).
 *
 *   node ops/iam/wif.mjs
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROYECTO = 'get-wee';
export const NUMERO = '546769059837';
export const REPOSITORIO = 'geovetlf/wee-app';
export const REPOSITORIO_ID = '1357703472';
export const DUENO_ID = '325097307';
export const ENTORNO = 'get-wee';
export const CUENTA = `despliegue-github@${PROYECTO}.iam.gserviceaccount.com`;
export const CUENTA_DE_EJECUCION = `${NUMERO}-compute@developer.gserviceaccount.com`;
/**
 * La cuenta de App Engine. Ninguna función corre con ella, pero firebase-tools 15.29.0 (`checkIam.js`)
 * comprueba SIEMPRE «actuar como» sobre ella antes de desplegar Functions, aunque las gen2 corran con la
 * de ejecución. Sin ese permiso el primer despliegue (run 37258963670) abortó en esa comprobación, sin
 * tocar producción. El dueño lo concedió el 2026-10-05, solo sobre esta cuenta, después de ver que no tiene
 * roles en el proyecto (si tuviera Editor, «actuar como» ella sería una escalada).
 */
export const CUENTA_DE_APP_ENGINE = `${PROYECTO}@appspot.gserviceaccount.com`;

export const WORKFLOW_REF = `${REPOSITORIO}/.github/workflows/despliegue.yml@refs/heads/main`;

/**
 * Lo que tiene que decir el token de GitHub para obtener credencial, campo a campo y SIEMPRE con
 * igualdad exacta. Con `startsWith`, una rama llamada `main-x` (`…despliegue.yml@refs/heads/main-x`)
 * también pasaba, y lo único que la frenaba era el entorno de GitHub, que se configura a mano. Ahora
 * la condición no depende de él: este repositorio y este dueño (por id, que no cambia al renombrar),
 * el workflow despliegue.yml de main, lanzado desde main, a mano (`workflow_dispatch`) y en el entorno
 * aprobado.
 */
export const REQUISITOS = Object.freeze([
  ['repository_id', REPOSITORIO_ID],
  ['repository_owner_id', DUENO_ID],
  ['workflow_ref', WORKFLOW_REF],
  ['ref', 'refs/heads/main'],
  ['event_name', 'workflow_dispatch'],
  ['environment', ENTORNO],
]);

/** La condición del proveedor: la misma lista, solo igualdades. */
export const CONDICION = REQUISITOS.map(([campo, valor]) => `assertion.${campo} == '${valor}'`).join(' && ');

/** Pura: ¿obtendría credencial un token de GitHub con estos datos? Sale de la misma lista que la condición. */
export const admite = (token) => REQUISITOS.every(([campo, valor]) => String(token?.[campo] ?? '') === valor);

/**
 * QUIÉN Y QUÉ WORKFLOW OBTUVO LA IDENTIDAD. El `sub` de GitHub para un job con
 * entorno es `repo:geovetlf/wee-app:environment:get-wee`: dice el repositorio,
 * no quién lanzó el despliegue ni qué ejecución fue. Cloud Audit Logs guarda
 * `google.subject` en cada acción de la cuenta de despliegue (desplegar una
 * función, mover tráfico), así que se compone con el repositorio, la ejecución,
 * su intento y la persona. Cabe de sobra en los 127 bytes que admite Google.
 * Los atributos guardan además la rama, el workflow y su commit.
 */
export const SUJETO = "'gh:' + assertion.repository + ':run:' + assertion.run_id + ':' + assertion.run_attempt + ':actor:' + assertion.actor";
export const MAPEO = [
  `google.subject=${SUJETO}`,
  'attribute.repository_id=assertion.repository_id',
  'attribute.repository_owner_id=assertion.repository_owner_id',
  'attribute.workflow_ref=assertion.workflow_ref',
  'attribute.workflow_sha=assertion.workflow_sha',
  'attribute.environment=assertion.environment',
  'attribute.ref=assertion.ref',
  'attribute.actor=assertion.actor',
  'attribute.run_id=assertion.run_id',
].join(',');

/**
 * Roles de proyecto de la cuenta de despliegue: propuesta MÍNIMA. Si en el primer
 * despliegue falta un permiso, el despliegue FALLA (nunca abre más de la cuenta):
 * se añade el rol concreto que nombre el error, y se anota aquí.
 */
export const ROLES = [
  ['roles/cloudfunctions.developer', 'crear y actualizar las Functions'],
  ['roles/run.developer', 'actualizar los servicios de Cloud Run y mover el tráfico (marcha atrás)'],
  ['roles/firebaserules.admin', 'publicar las reglas de Firestore y Storage'],
  ['roles/datastore.indexAdmin', 'crear los índices de Firestore'],
  ['roles/firebasehosting.admin', 'publicar los dos sitios de Hosting'],
  ['roles/cloudscheduler.admin', 'la programación del barrido (barridoDeLiquidacion)'],
  ['roles/eventarc.developer', 'los disparadores de Firestore (nacimientoDeCuenta, avisos)'],
  ['roles/secretmanager.viewer', 'comprobar las versiones de los secretos que monta cada función, sin leer valores'],
  ['roles/serviceusage.serviceUsageConsumer', 'usar las APIs del proyecto'],
  ['roles/monitoring.viewer', 'contar los 5xx en la observación posterior al despliegue (solo lectura de métricas)'],
];

/* Lo que NO tiene, a propósito. */
export const NUNCA = ['roles/owner', 'roles/editor', 'roles/iam.securityAdmin', 'roles/resourcemanager.projectIamAdmin',
  'roles/secretmanager.secretAccessor', 'roles/secretmanager.admin', 'roles/billing.admin', 'roles/run.admin', 'roles/cloudfunctions.admin'];

export const comandos = () => {
  const pool = `projects/${NUMERO}/locations/global/workloadIdentityPools/github`;
  return [
    '# 1 · Pool y proveedor de Workload Identity Federation (solo el workflow despliegue.yml de main, en el entorno get-wee)',
    `gcloud iam workload-identity-pools create github --project=${PROYECTO} --location=global --display-name="GitHub (despliegue de Weë)"`,
    `gcloud iam workload-identity-pools providers create-oidc wee-app --project=${PROYECTO} --location=global --workload-identity-pool=github --display-name="geovetlf/wee-app" --issuer-uri="https://token.actions.githubusercontent.com" --attribute-mapping="${MAPEO}" --attribute-condition="${CONDICION}"`,
    '',
    '# 2 · Cuenta de servicio de despliegue',
    `gcloud iam service-accounts create despliegue-github --project=${PROYECTO} --display-name="Despliegue desde GitHub (workflow aprobado)"`,
    ...ROLES.map(([rol, para]) => `gcloud projects add-iam-policy-binding ${PROYECTO} --member="serviceAccount:${CUENTA}" --role="${rol}" --condition=None   # ${para}`),
    `gcloud iam service-accounts add-iam-policy-binding ${CUENTA_DE_EJECUCION} --project=${PROYECTO} --member="serviceAccount:${CUENTA}" --role="roles/iam.serviceAccountUser"   # desplegar funciones que corren con la cuenta de ejecución`,
    `gcloud iam service-accounts add-iam-policy-binding ${CUENTA_DE_APP_ENGINE} --project=${PROYECTO} --member="serviceAccount:${CUENTA}" --role="roles/iam.serviceAccountUser"   # firebase-tools lo comprueba antes de desplegar Functions (ver CUENTA_DE_APP_ENGINE); esa cuenta no tiene roles en el proyecto`,
    '',
    '# 3 · Que el workflow pueda hacerse pasar por la cuenta (solo desde este repositorio; la condición del proveedor ya exige main y el entorno)',
    `gcloud iam service-accounts add-iam-policy-binding ${CUENTA} --project=${PROYECTO} --role="roles/iam.workloadIdentityUser" --member="principalSet://iam.googleapis.com/${pool}/attribute.repository_id/${REPOSITORIO_ID}"`,
    '',
    '# 4 · En GitHub (Settings → Environments → New environment "get-wee"): revisor obligatorio = el dueño; rama permitida: main.',
    '#     Variables del entorno (Settings → Environments → get-wee → Variables), ningún secreto:',
    `#       WIF_PROVEEDOR = ${pool}/providers/wee-app`,
    `#       CUENTA_DE_DESPLIEGUE = ${CUENTA}`,
    '#       WEE_ADMIN_UIDS, R2_ACCOUNT_ID, R2_BUCKET = los de functions/.env.get-wee',
    '#       EXPO_PUBLIC_FIREBASE_* = la configuración web pública de get-wee (solo para hosting:wee-app)',
    '',
    '# 5 · (Opcional, recomendado) Que quede escrito también CADA canje del token de GitHub por la identidad.',
    '#     Las acciones de la cuenta (desplegar, mover tráfico) ya quedan en Cloud Audit Logs (Admin Activity, siempre activo y',
    '#     gratis) con el sujeto de arriba. El canje en sí es un registro de «acceso a datos» de STS, apagado por defecto.',
    '#     Son unas pocas líneas por despliegue: caben de sobra en la cuota gratuita de Cloud Logging. Se activa en la consola:',
    '#     IAM y administración → Registros de auditoría → «Security Token Service API» y «IAM Service Account Credentials API»',
    '#     → marcar «Lectura de datos» y «Escritura de datos». (Es un cambio de la política del proyecto: lo hace el dueño.)',
    '',
    '# 6 · Comprueba que lo creado es exactamente esto (solo lectura): node ops/iam/wif-verificar.mjs',
  ];
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log('# Weë · identidad de despliegue sin claves. LO EJECUTA EL DUEÑO, línea a línea; este script no ejecuta nada.\n');
  for (const l of comandos()) console.log(l);
}
