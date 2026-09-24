// Vult app.json aan met geheimen uit de omgeving, zodat die niet in git staan.
// Android heeft voor react-native-maps een Google Maps API-sleutel nodig in echte builds (niet in Expo Go).
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  return {
    ...config,
    plugins: config.plugins.map((p) => (p === 'react-native-maps' && key ? ['react-native-maps', { androidGoogleMapsApiKey: key }] : p)),
  };
};
