"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAdmin = exports.isAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
/**
 * Administración: custom claim `admin: true` o uid listado en WEE_ADMIN_UIDS
 * (functions/.env.wee-dev-geovet en dev; functions/.env.get-wee en producción, no versionado).
 */
const isAdmin = (auth) => {
    var _a;
    if (!auth)
        return false;
    const allowed = (process.env.WEE_ADMIN_UIDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    return ((_a = auth.token) === null || _a === void 0 ? void 0 : _a.admin) === true || allowed.includes(auth.uid);
};
exports.isAdmin = isAdmin;
const assertAdmin = (auth) => {
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión');
    if (!(0, exports.isAdmin)(auth))
        throw new https_1.HttpsError('permission-denied', 'Solo administración');
};
exports.assertAdmin = assertAdmin;
//# sourceMappingURL=admin.js.map