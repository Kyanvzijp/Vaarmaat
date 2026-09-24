// Synchrone localStorage (SQLite) zodat de gedeelde opslag uit ../src/store.ts en ../src/profile.ts ongewijzigd werkt.
import 'expo-sqlite/localStorage/install';
import { registerRootComponent } from 'expo';

import App from './src/App';

registerRootComponent(App);
