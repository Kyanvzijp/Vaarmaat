// De gedeelde modules in ../src gebruiken import.meta.env (Vite) voor de web-URL's van de data.
// In de app wordt die code niet aangeroepen; babel-preset-expo vult import.meta zelf in.
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly [key: string]: string | undefined;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
