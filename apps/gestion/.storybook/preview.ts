import "../src/app/globals.css";
import type { Preview } from "@storybook/nextjs-vite";
// Importa los estilos globales para que se apliquen a todos los componentes en Storybook

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
