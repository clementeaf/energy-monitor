"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRdsCaPath = resolveRdsCaPath;
exports.getRdsCaPem = getRdsCaPem;
exports.getPgSslOptionsForRds = getPgSslOptionsForRds;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
let cachedCa;
/**
 * Resuelve la ruta al PEM del bundle CA global de Amazon RDS (Lambda en raíz del paquete).
 * @returns Ruta absoluta al fichero
 */
function resolveRdsCaPath() {
    const envPath = process.env.RDS_CA_BUNDLE_PATH;
    if (envPath !== undefined && envPath.length > 0) {
        return envPath;
    }
    return path.join(__dirname, 'certs', 'rds-global-bundle.pem');
}
/**
 * Lee el bundle CA (cacheado).
 * @returns Contenido PEM
 */
function getRdsCaPem() {
    if (cachedCa === undefined) {
        cachedCa = fs.readFileSync(resolveRdsCaPath(), 'utf8');
    }
    return cachedCa;
}
/**
 * Opciones SSL para `pg` contra RDS con verificación del certificado.
 * @returns Objeto para la propiedad `ssl` de `Client`
 */
function getPgSslOptionsForRds() {
    return {
        rejectUnauthorized: true,
        ca: getRdsCaPem(),
    };
}
//# sourceMappingURL=rds-ssl.js.map