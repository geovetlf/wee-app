// Metro: configuración de Expo por defecto, sin vigilar ni resolver el código del servidor.
// functions/ (Cloud Functions, con su propio node_modules) y las carpetas nativas no forman
// parte del bundle de la app; excluirlas evita que un cambio en functions/node_modules
// (p. ej. npm install) tumbe el bundler.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const projectDir = (name) => new RegExp(`^${escapeRegExp(path.join(__dirname, name))}[\\\\/].*`);

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : config.resolver.blockList ? [config.resolver.blockList] : []),
  projectDir('functions'),
  projectDir('android'),
  projectDir('ios'),
  projectDir('design'),
];

module.exports = config;
