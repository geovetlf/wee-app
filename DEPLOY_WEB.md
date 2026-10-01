> **LEGADO (HideTok) — no describe Weë actual.** Guía del 2025-10-16, de cuando el proyecto se llamaba HideTok: habla del proyecto de Firebase `hidetok-9a642` (Weë no lo usa), de Netlify (ningún sitio de Weë lo usa; `netlify.toml` se retiró el 2026-10-01) y de órdenes `firebase deploy` a mano que hoy rechaza el `predeploy` (`scripts/solo-desde-el-workflow.mjs`). Se conserva como historia; **no la sigas**. Lo vigente: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (producción = `get-wee`, solo por el workflow; `wee.zone` en Vercel) y [`README.md`](README.md) § Entornos. Inventario del legado: [`docs/LEGADO-HIDETOK.md`](docs/LEGADO-HIDETOK.md).

# Guía de Despliegue Web - HideTok

## 📋 Índice
1. [Configuración de Firebase](#configuración-de-firebase)
2. [Variables de Entorno](#variables-de-entorno)
3. [Despliegue en Vercel](#despliegue-en-vercel)
4. [Despliegue en Netlify](#despliegue-en-netlify)
5. [Despliegue en Firebase Hosting](#despliegue-en-firebase-hosting)

---

## 🔥 Configuración de Firebase

### 1. Obtener Credenciales de Firebase

Ya tienes un proyecto Firebase configurado (`hidetok-9a642`). Las credenciales están en la consola de Firebase:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `hidetok-9a642`
3. Ve a **Project Settings** (⚙️ arriba a la izquierda)
4. En la sección **Your apps**, busca la app web
5. Si no tienes una app web, haz clic en el ícono `</>` para crear una
6. Copia las credenciales del objeto `firebaseConfig`

### 2. Estructura de las Credenciales

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "hidetok-9a642.firebaseapp.com",
  projectId: "hidetok-9a642",
  storageBucket: "hidetok-9a642.firebasestorage.app",
  messagingSenderId: "600935858829",
  appId: "1:600935858829:web:...",
  measurementId: "G-..."
};
```

---

## 🌐 Variables de Entorno

### Para Desarrollo Local (Ya configurado)

El archivo `env.local` es para desarrollo:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=hidetok-9a642.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=hidetok-9a642
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=hidetok-9a642.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=600935858829
EXPO_PUBLIC_FIREBASE_APP_ID=1:600935858829:web:...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
```

### Para Producción Web

**IMPORTANTE**: Las variables `EXPO_PUBLIC_*` funcionan automáticamente en Expo web porque se incluyen en el bundle durante el build.

---

## 🚀 Opción 1: Despliegue en Vercel (Recomendado)

### Preparación

1. Instala Vercel CLI:
```bash
npm install -g vercel
```

2. Build para web:
```bash
npx expo export -p web
```

### Despliegue

1. Inicializa Vercel:
```bash
vercel
```

2. Configura las variables de entorno en Vercel Dashboard:
   - Ve a tu proyecto en [vercel.com](https://vercel.com)
   - Settings → Environment Variables
   - Agrega cada variable:
     ```
     EXPO_PUBLIC_FIREBASE_API_KEY = AIzaSy...
     EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = hidetok-9a642.firebaseapp.com
     EXPO_PUBLIC_FIREBASE_PROJECT_ID = hidetok-9a642
     EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = hidetok-9a642.firebasestorage.app
     EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 600935858829
     EXPO_PUBLIC_FIREBASE_APP_ID = 1:600935858829:web:...
     EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = G-...
     ```

3. Redeploy:
```bash
vercel --prod
```

### Configuración de vercel.json

Crea `vercel.json` en la raíz:
```json
{
  "buildCommand": "npx expo export -p web",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 🎨 Opción 2: Despliegue en Netlify

### Preparación

1. Build para web:
```bash
npx expo export -p web
```

### Despliegue Manual

1. Ve a [netlify.com](https://netlify.com)
2. Arrastra la carpeta `dist` (o `web-build`)
3. Configura variables de entorno en Site settings → Environment variables

### Despliegue Automático (GitHub)

1. Conecta tu repositorio de GitHub
2. Configura Build settings:
   - Build command: `npx expo export -p web`
   - Publish directory: `dist`
3. Agrega variables de entorno en Site settings

### Configuración de netlify.toml

Crea `netlify.toml` en la raíz:
```toml
[build]
  command = "npx expo export -p web"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
```

---

## 🔥 Opción 3: Firebase Hosting

### Ventaja
Está todo en el mismo ecosistema Firebase.

### Configuración

1. Instala Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Inicia sesión:
```bash
firebase login
```

3. Inicializa hosting (ya tienes `firebase.json`):
```bash
firebase init hosting
```
- Selecciona tu proyecto: `hidetok-9a642`
- Public directory: `dist`
- Configure as SPA: `Yes`
- Overwrite index.html: `No`

4. Build:
```bash
npx expo export -p web
```

5. Deploy:
```bash
firebase deploy --only hosting
```

### Variables de Entorno en Firebase Hosting

**IMPORTANTE**: Firebase Hosting es estático, las variables de entorno NO funcionan en runtime.

**Solución**: Las variables `EXPO_PUBLIC_*` se incluyen en el bundle durante `expo export -p web`, así que ya están en el código compilado.

---

## ✅ Verificación Post-Despliegue

1. **Prueba Firebase Auth**:
   - Intenta hacer login
   - Verifica en Firebase Console → Authentication que los usuarios se registran

2. **Prueba Firestore**:
   - Crea un post
   - Verifica en Firebase Console → Firestore que los datos se guardan

3. **Prueba Storage**:
   - Sube una imagen de perfil
   - Verifica en Firebase Console → Storage que se sube correctamente

4. **Verifica la consola del navegador**:
   - No debe haber errores de Firebase
   - Deberías ver logs de conexión exitosa

---

## 🔒 Seguridad

### Reglas de Firestore

Ya tienes reglas configuradas. Verifica en Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### Reglas de Storage

Verifica en Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-images/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /post-images/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🌍 Dominios

### Vercel
Tu app estará en: `https://tu-proyecto.vercel.app`

### Netlify
Tu app estará en: `https://tu-proyecto.netlify.app`

### Firebase Hosting
Tu app estará en: `https://hidetok-9a642.web.app` o `https://hidetok-9a642.firebaseapp.com`

### Dominio Personalizado

1. **En Vercel**: Settings → Domains → Add Domain
2. **En Netlify**: Domain settings → Add custom domain
3. **En Firebase**: Hosting → Add custom domain

---

## 📝 Checklist de Despliegue

- [ ] Credenciales de Firebase correctas en variables de entorno
- [ ] Build exitoso: `npx expo export -p web`
- [ ] Variables de entorno configuradas en la plataforma
- [ ] Reglas de Firestore configuradas
- [ ] Reglas de Storage configuradas
- [ ] Autenticación funcionando
- [ ] Posts se pueden crear y leer
- [ ] Imágenes se pueden subir
- [ ] No hay errores en la consola del navegador
- [ ] Responsive design funciona en móvil y desktop
- [ ] Certificado SSL activo (HTTPS)

---

## 🆘 Troubleshooting

### Error: Firebase not initialized
**Solución**: Verifica que las variables de entorno estén configuradas correctamente.

### Error: Permission denied (Firestore/Storage)
**Solución**: Revisa las reglas de seguridad en Firebase Console.

### Error: Build failed
**Solución**:
```bash
rm -rf node_modules .expo dist
npm install
npx expo export -p web
```

### Las variables de entorno no se cargan
**Solución**: Asegúrate de usar el prefijo `EXPO_PUBLIC_` y redeploy después de agregar las variables.

---

## 📚 Recursos

- [Expo Web Deployment](https://docs.expo.dev/distribution/publishing-websites/)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Vercel Deployment](https://vercel.com/docs)
- [Netlify Deployment](https://docs.netlify.com/)
