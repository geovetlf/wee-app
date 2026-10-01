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

/** La condición que tiene que cumplir el token de GitHub para obtener credencial. */
export const CONDICION = [
  `assertion.repository_id == '${REPOSITORIO_ID}'`,
  `assertion.repository_owner_id == '${DUENO_ID}'`,
  `assertion.workflow_ref.startsWith('${REPOSITORIO}/.github/workflows/despliegue.yml@refs/heads/main')`,
  `assertion.environment == '${ENTORNO}'`,
].join(' && ');

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
    `gcloud iam workload-identity-pools providers create-oidc wee-app --project=${PROYECTO} --location=global --workload-identity-pool=github --display-name="geovetlf/wee-app" --issuer-uri="https://token.actions.githubusercontent.com" --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.workflow_ref=assertion.workflow_ref,attribute.environment=assertion.environment" --attribute-condition="${CONDICION}"`,
    '',
    '# 2 · Cuenta de servicio de despliegue',
    `gcloud iam service-accounts create despliegue-github --project=${PROYECTO} --display-name="Despliegue desde GitHub (workflow aprobado)"`,
    ...ROLES.map(([rol, para]) => `gcloud projects add-iam-policy-binding ${PROYECTO} --member="serviceAccount:${CUENTA}" --role="${rol}" --condition=None   # ${para}`),
    `gcloud iam service-accounts add-iam-policy-binding ${CUENTA_DE_EJECUCION} --project=${PROYECTO} --member="serviceAccount:${CUENTA}" --role="roles/iam.serviceAccountUser"   # desplegar funciones que corren con la cuenta de ejecución`,
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
  ];
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log('# Weë · identidad de despliegue sin claves. LO EJECUTA EL DUEÑO, línea a línea; este script no ejecuta nada.\n');
  for (const l of comandos()) console.log(l);
}
