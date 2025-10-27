// En tu fichero .eslintrc.js o similar
module.exports = {
  // ... otras configuraciones
  plugins: ["prettier"],

  rules: {
    // ... otras reglas
    "prettier/prettier": [
      "error",
      {
        endOfLine: "lf",
      },
    ],
  },

  extends: ["plugin:storybook/recommended"]
};
