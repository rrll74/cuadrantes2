// Este archivo le dice a TypeScript cómo manejar importaciones de archivos que no son .ts o .tsx.

// Al importar un archivo .css, solo nos interesan sus efectos secundarios (aplicar estilos),
// no estamos importando ningún valor. Esta declaración le dice a TypeScript que esto es válido.
declare module "*.css";
