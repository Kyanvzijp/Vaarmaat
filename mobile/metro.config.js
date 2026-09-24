// Metro-config: de app deelt de rekenlogica (routering, navigatie, tochtplanner, lessen) met de webapp in ../src
// en laadt de voorberekende data uit ../public/data. Beide mappen moeten daarom meegenomen worden in de bundel.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const root = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.join(root, 'src'), path.join(root, 'public', 'data')];
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules')];

module.exports = config;
