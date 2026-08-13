// Carregador do banco local de perguntas.
// Os dados ficam em perguntas.json (somente dados) e são carregados aqui via fetch.
// OBSERVAÇÃO: por política de CORS dos navegadores, o fetch de um arquivo local
// só funciona quando a página é servida por um servidor local (ex.: http://localhost).
const BANCO_PERGUNTAS = [];

const PROMESSA_BANCO = fetch("perguntas.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Falha ao carregar perguntas.json (HTTP " + response.status + ")");
    }
    return response.json();
  })
  .then((dados) => {
    BANCO_PERGUNTAS.splice(0, BANCO_PERGUNTAS.length, ...dados);
    return BANCO_PERGUNTAS;
  });
