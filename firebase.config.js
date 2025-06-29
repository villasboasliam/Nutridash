// firebase.config.js
module.exports = {
  hosting: {
    source: ".next",
    frameworksBackend: {
      // Use isso apenas se estiver usando Firebase Functions para SSR
      region: "us-central1", // ou a região configurada no seu projeto
    },
  },
};
