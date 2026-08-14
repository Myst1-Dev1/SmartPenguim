const TOTAL_PERGUNTAS = 10;
const PREMIOS = [
  1000, 2000, 5000, 10000, 20000,
  50000, 100000, 200000, 500000, 1000000
];

let perguntaAtual = null;
let perguntaNumero = 1;
let premioGanho = 0;
let participanteNome = "";
const auxiliosUsados = new Set();
document.querySelector('[data-auxilio="pular"]')?.remove();
let highScore = parseInt(localStorage.getItem("pinguim_highscore") || "0", 10);

// Perguntas já exibidas nesta partida (por texto normalizado),
// para evitar repetição até o jogo ser finalizado.
let usadas = new Set();

// ===== Voz & Som =====
let vozHabilitada = true;
let somHabilitado = true;
let audioContext = null;
let reconhecimento = null;
let ouvindo = false;

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
    popularSeletorVoz();
  };
}

// Fila de fala: divide textos longos em trechos para evitar que o Chrome
// corte a narração no meio e para dar uma cadência mais natural.
let filaFala = [];
let falando = false;
let audioCustom = null;

function pontuarVoz(voz) {
  const nome = (voz.name || "").toLowerCase();
  const lang = (voz.lang || "").toLowerCase();
  let pontos = 0;

  // Idioma
  if (lang === "pt-br") pontos += 30;
  else if (lang.startsWith("pt")) pontos += 10;
  else return -100;

  // Qualidade da voz (Vozes neurais / naturais do Edge, Chrome, Safari e Windows)
  if (nome.includes("natural")) pontos += 50;
  if (nome.includes("neural")) pontos += 50;
  if (nome.includes("online")) pontos += 20;
  if (nome.includes("francisca")) pontos += 40;
  if (nome.includes("antonio")) pontos += 35;
  if (nome.includes("google") && lang === "pt-br") pontos += 30;
  if (nome.includes("luciana") || nome.includes("felipe") || nome.includes("joana")) pontos += 25;
  if (nome.includes("maria") || nome.includes("daniel")) pontos += 15;
  if (nome.includes("desktop") || nome.includes("zira")) pontos -= 30;

  return pontos;
}

function melhorVozPt() {
  const vozes = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  const pt = vozes.filter(v => (v.lang || "").toLowerCase().startsWith("pt"));
  if (pt.length === 0) return null;

  return pt.sort((a, b) => pontuarVoz(b) - pontuarVoz(a))[0];
}

// Voz escolhida pelo usuário no seletor (persistida no localStorage).
const CHAVE_VOZ = "pinguim_voz";
let FISH_API_KEY = "sk-fish-2Lb1z-8Xn0SBXWfQxRN1OtGGH9H-_7onS6jYjs6PEWE";

function vozEscolhida() {
  const salvou = localStorage.getItem(CHAVE_VOZ);
  if (!salvou || salvou === "gtts") return "auto";
  return salvou;
}

function obterVozesPt() {
  if (!window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .filter(v => (v.lang || "").toLowerCase().startsWith("pt"));
}

function vozParaUsar() {
  const escolhida = vozEscolhida();
  if (escolhida !== "auto" && escolhida !== "gtts" && escolhida !== "fishaudio") {
    const voz = obterVozesPt().find(v => v.voiceURI === escolhida);
    if (voz) return voz;
  }
  return melhorVozPt();
}

// Opções de TTS Externas
function usarGoogleTts() {
  return vozEscolhida() === "gtts";
}

function usarFishAudio() {
  return vozEscolhida() === "fishaudio";
}

function reproducaoGoogle(texto, aoTerminar) {
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pt-BR&q=" +
    encodeURIComponent(texto);
  const audio = new Audio(url);
  audioCustom = audio;

  const terminar = () => {
    audioCustom = null;
    aoTerminar();
  };

  audio.onended = terminar;
  audio.onerror = () => {
    audioCustom = null;
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(texto);
      const voz = melhorVozPt();
      if (voz) utterance.voice = voz;
      utterance.lang = voz ? voz.lang : "pt-BR";
      utterance.rate = 0.96;
      utterance.onend = aoTerminar;
      utterance.onerror = aoTerminar;
      window.speechSynthesis.speak(utterance);
    } else {
      aoTerminar();
    }
  };

  audio.play().catch(() => {
    audioCustom = null;
    aoTerminar();
  });
}

async function reproducaoFishAudio(texto, aoTerminar) {
  falando = true;
  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + FISH_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: texto,
        format: "mp3",
        normalize: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audioCustom = audio;

    const finalizar = () => {
      URL.revokeObjectURL(audioUrl);
      audioCustom = null;
      falando = false;
      aoTerminar();
    };

    audio.onended = finalizar;
    audio.onerror = () => {
      finalizar();
    };

    await audio.play();
  } catch (erro) {
    console.warn("Fish Audio indisponível (usando voz neural de fallback):", erro);
    falando = false;
    const utterance = new SpeechSynthesisUtterance(texto);
    const voz = melhorVozPt();
    if (voz) utterance.voice = voz;
    utterance.lang = voz ? voz.lang : "pt-BR";
    utterance.rate = 0.96;
    utterance.onend = aoTerminar;
    utterance.onerror = aoTerminar;
    window.speechSynthesis.speak(utterance);
  }
}

function testarVoz() {
  falar("Olá! Esta é a voz da narração do Pinguim Inteligente.");
}

function popularSeletorVoz() {
  const sel = document.getElementById("seletor-voz");
  if (!sel) return;

  const escolhida = vozEscolhida();
  const vozes = obterVozesPt();

  sel.innerHTML = "";

  const optAuto = document.createElement("option");
  optAuto.value = "auto";
  optAuto.textContent = "🎙️ Automática (Voz Neural Suave)";
  sel.appendChild(optAuto);

  const optFish = document.createElement("option");
  optFish.value = "fishaudio";
  optFish.textContent = "🐟 Fish Audio (IA Ultra-Realista)";
  sel.appendChild(optFish);

  const optGtts = document.createElement("option");
  optGtts.value = "gtts";
  optGtts.textContent = "🤖 Google Translate (Legado Robótico)";
  sel.appendChild(optGtts);

  vozes.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.voiceURI;
    opt.textContent = v.name + " (" + v.lang + ")" + (v.localService ? " • local" : " • online");
    sel.appendChild(opt);
  });

  const temEscolhida =
    escolhida === "gtts" ||
    escolhida === "fishaudio" ||
    (escolhida !== "auto" && vozes.some(v => v.voiceURI === escolhida));
  sel.value = temEscolhida ? escolhida : "auto";
}

function dividirEmTrechos(texto) {
  const frases = texto.match(/[^.!?]+[.!?]?/g) || [texto];
  const trechos = [];
  let atual = "";

  for (const frase of frases) {
    if (atual && (atual + frase).length > 190) {
      trechos.push(atual.trim());
      atual = frase;
    } else {
      atual += frase;
    }
  }

  if (atual.trim()) trechos.push(atual.trim());
  return trechos;
}

function processarFilaFala() {
  if (!vozHabilitada || filaFala.length === 0 || falando) return;

  const texto = filaFala.shift();

  if (usarFishAudio()) {
    reproducaoFishAudio(texto, () => {
      processarFilaFala();
    });
    return;
  }

  if (usarGoogleTts()) {
    falando = true;
    reproducaoGoogle(texto, () => {
      falando = false;
      processarFilaFala();
    });
    return;
  }

  const utterance = new SpeechSynthesisUtterance(texto);
  const voz = vozParaUsar();

  if (voz) utterance.voice = voz;
  utterance.lang = voz ? voz.lang : "pt-BR";
  utterance.rate = 0.96;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onend = () => {
    falando = false;
    processarFilaFala();
  };
  utterance.onerror = () => {
    falando = false;
    processarFilaFala();
  };

  falando = true;
  window.speechSynthesis.speak(utterance);
}

function falar(texto) {
  if (!vozHabilitada || !texto) return;
  if (!usarGoogleTts() && !("speechSynthesis" in window)) return;

  if (audioCustom) {
    audioCustom.pause();
    audioCustom = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }

  filaFala = dividirEmTrechos(texto);
  falando = false;
  processarFilaFala();
}

function pararFala() {
  filaFala = [];
  falando = false;
  if (audioCustom) {
    audioCustom.pause();
    audioCustom = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function valorFalado(valor) {
  const extenso = {
    1000: "mil reais",
    2000: "dois mil reais",
    5000: "cinco mil reais",
    10000: "dez mil reais",
    20000: "vinte mil reais",
    50000: "cinquenta mil reais",
    100000: "cem mil reais",
    200000: "duzentos mil reais",
    500000: "quinhentos mil reais",
    1000000: "um milhão de reais"
  };
  return extenso[valor] || formatarMoeda(valor);
}

function narrarPergunta(dados) {
  const saudacaoParticipante = participanteNome
    ? "Participante " + participanteNome + ", "
    : "";
  falar(
    saudacaoParticipante +
    "vamos lá! Pergunta que vale " + valorFalado(PREMIOS[perguntaNumero - 1]) + ". " +
    dados.pergunta + ". " +
    "Alternativa A: " + dados.opcoes.A + ". " +
    "Alternativa B: " + dados.opcoes.B + ". " +
    "Alternativa C: " + dados.opcoes.C + ". " +
    "Alternativa D: " + dados.opcoes.D + "."
  );
}

function toggleVoz() {
  vozHabilitada = !vozHabilitada;
  document.getElementById("btn-voz").classList.toggle("off", !vozHabilitada);
  if (!vozHabilitada) pararFala();
}

function toggleSom() {
  somHabilitado = !somHabilitado;
  document.getElementById("btn-som").classList.toggle("off", !somHabilitado);
}

function ctxAudio() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function tocarSom(tipo) {
  if (!somHabilitado) return;
  try {
    const ctx = ctxAudio();
    const agora = ctx.currentTime;

    const nota = (freq, inicio, duracao, forma, ganho) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = forma || "sine";
      osc.frequency.setValueAtTime(freq, agora + inicio);
      g.gain.setValueAtTime(0.0001, agora + inicio);
      g.gain.exponentialRampToValueAtTime(ganho || 0.15, agora + inicio + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, agora + inicio + duracao);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(agora + inicio);
      osc.stop(agora + inicio + duracao + 0.05);
    };

    switch (tipo) {
      case "clique":
        nota(600, 0, 0.1, "triangle", 0.12);
        break;
      case "mic":
        nota(880, 0, 0.12, "sine", 0.15);
        nota(1320, 0.12, 0.12, "sine", 0.15);
        break;
      case "acerto":
        nota(523.25, 0, 0.15, "triangle");
        nota(659.25, 0.15, 0.15, "triangle");
        nota(783.99, 0.3, 0.25, "triangle");
        break;
      case "erro":
        nota(220, 0, 0.25, "sawtooth", 0.12);
        nota(165, 0.25, 0.35, "sawtooth", 0.12);
        break;
      case "vitoria":
        nota(523.25, 0, 0.15, "triangle");
        nota(659.25, 0.15, 0.15, "triangle");
        nota(783.99, 0.3, 0.15, "triangle");
        nota(1046.5, 0.45, 0.4, "triangle");
        break;
    }
  } catch (erro) {
    console.warn("Som indisponível:", erro);
  }
}

function suportaReconhecimento() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function interpretarAlternativa(fala) {
  const texto = normalizar(fala);
  const tokens = texto.split(/[^a-z]+/).filter(t => t.length > 0);
  const mapa = { a: "A", be: "B", ce: "C", de: "D", b: "B", c: "C", d: "D" };

  for (let i = tokens.length - 1; i >= 0; i--) {
    if (mapa[tokens[i]]) return mapa[tokens[i]];
  }
  return null;
}

function setOuvindo(atual) {
  ouvindo = atual;
  const btn = document.getElementById("btn-mic");
  if (btn) btn.classList.toggle("ouvindo", atual);
}

function pararOuvir() {
  if (reconhecimento) {
    try { reconhecimento.stop(); } catch (e) { /* ignora */ }
  }
  setOuvindo(false);
}

function iniciarOuvir() {
  if (ouvindo) {
    pararOuvir();
    return;
  }

  if (!perguntaAtual) return;

  if (!suportaReconhecimento()) {
    alert("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge com o jogo aberto via http://localhost.");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  reconhecimento = new SR();
  reconhecimento.lang = "pt-BR";
  reconhecimento.interimResults = false;
  reconhecimento.maxAlternatives = 1;

  let repetirEscuta = false;

  reconhecimento.onresult = (evento) => {
    const fala = evento.results[0][0].transcript;
    console.log("Você disse:", fala);

    const alternativa = interpretarAlternativa(fala);
    if (alternativa) {
      repetirEscuta = false;
      pararOuvir();
      tocarSom("clique");
      responder(alternativa);
    } else {
      repetirEscuta = true;
      falar("Não entendi. Diga a letra: A, B, C ou D.");
      tocarSom("erro");
    }
  };

  reconhecimento.onerror = (evento) => {
    console.warn("Erro de reconhecimento:", evento.error);
    repetirEscuta = false;
    setOuvindo(false);
  };

  reconhecimento.onend = () => {
    setOuvindo(false);
    if (repetirEscuta) {
      repetirEscuta = false;
      try {
        reconhecimento.start();
        setOuvindo(true);
      } catch (e) { /* ignora */ }
    }
  };

  try {
    reconhecimento.start();
    setOuvindo(true);
    tocarSom("mic");
    falar("Diga a letra da sua resposta.");
  } catch (erro) {
    console.error(erro);
    setOuvindo(false);
  }
}

function ouvirPergunta() {
  if (perguntaAtual) narrarPergunta(perguntaAtual);
}


function marcarPerguntaLocal(local) {
  document.getElementById("badge-local").classList.toggle("hidden", !local);
}

function marcarPerguntaUsada(pergunta) {
  usadas.add(normalizar(pergunta));
}

function categoriaDoTema(temaNorm) {
  const chaves = [
    "programacao", "javascript", "node", "react", "next", "angular",
    "typescript", "microservices", "microfrontends", "rabbitmq"
  ];
  return chaves.some(chave => temaNorm.includes(chave)) ? "programacao" : null;
}

function termosDoTema(temaNorm) {
  return temaNorm
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 3 && !["do", "da", "de", "dos", "das", "gerais", "conhecimentos"].includes(t));
}

function pontuarTemaPergunta(temaNorm, perguntaTemaNorm) {
  if (!temaNorm || !perguntaTemaNorm) return 0;

  let pontos = 0;
  const termos = termosDoTema(temaNorm);

  if (perguntaTemaNorm.includes(temaNorm) || temaNorm.includes(perguntaTemaNorm)) {
    pontos += 10;
  }

  if (temaNorm === "jogos") {
    const termosJogos = [
      "jogo", "jogos", "game", "games", "videogame", "video game",
      "console", "playstation", "xbox", "nintendo", "mario", "zelda",
      "pokemon", "pokémon", "sonic", "minecraft", "gta", "fifa",
      "the witcher", "red dead", "halo", "zelda"
    ];
    for (const termo of termosJogos) {
      if (perguntaTemaNorm.includes(termo)) pontos += 6;
    }
  }

  for (const termo of termos) {
    if (perguntaTemaNorm.includes(termo)) pontos += 3;
  }

  return pontos;
}

function sorteiaPerguntaLocal(tema, nivel) {
  const temaNorm = normalizar(tema);
  const nivelNorm = normalizar(nivel);

  const pool = BANCO_PERGUNTAS.filter(
    p => normalizar(p.dificuldade) === nivelNorm
  );

  // Se o banco possui o tema exato, a partida deve permanecer nele.
  const porTemaExato = pool.filter(p => normalizar(p.tema) === temaNorm);

  const pontuadas = pool
    .map(p => ({ p, score: pontuarTemaPergunta(temaNorm, normalizar(p.tema)) }))
    .sort((a, b) => b.score - a.score);

  const porTemaForte = pontuadas.filter(item => item.score >= 3).map(item => item.p);
  const porTemaFraco = pontuadas.filter(item => item.score > 0 && item.score < 3).map(item => item.p);

  // Expande para a categoria (ex.: todo o acervo de programa??o) antes
  // de cair no banco geral, para manter o foco no assunto escolhido.
  const categoria = categoriaDoTema(temaNorm);
  const porCategoria = categoria
    ? pool.filter(p => normalizar(p.tema).includes(categoria))
    : [];
  const temaSimples = pool.filter(p => normalizar(p.tema).includes(temaNorm));

  const escolher = (lista) => {
    const naoUsadas = lista.filter(p => !usadas.has(normalizar(p.pergunta)));
    return naoUsadas[Math.floor(Math.random() * naoUsadas.length)];
  };

  // Prioridade: tema exato -> tema relacionado -> categoria.
  let escolhida = escolher(porTemaExato);
  if (!escolhida && porTemaExato.length > 0) {
    usadas.clear();
    escolhida = escolher(porTemaExato);
  }
  if (!escolhida && porTemaExato.length === 0) escolhida = escolher(porTemaForte);
  if (!escolhida) escolhida = escolher(porTemaFraco);
  if (!escolhida) escolhida = escolher(temaSimples);
  if (!escolhida) escolhida = escolher(porCategoria);
  if (!escolhida && porTemaExato.length === 0 && !normalizar(tema).includes("conhecimento geral")) {
    escolhida = escolher(pool.filter(p => normalizar(p.tema).includes("cultura geral")));
  }
  if (!escolhida && porTemaExato.length === 0) escolhida = escolher(pool);

  // ?ltimo recurso: esgotou as perguntas relevantes do n?vel.
  if (!escolhida) {
    usadas.clear();
    escolhida = escolher(porTemaExato);
  }
  if (!escolhida) escolhida = escolher(porTemaForte);
  if (!escolhida) escolhida = escolher(porTemaFraco);
  if (!escolhida) escolhida = escolher(porCategoria);
  if (!escolhida && porTemaExato.length === 0 && !normalizar(tema).includes("conhecimento geral")) {
    escolhida = escolher(pool.filter(p => normalizar(p.tema).includes("cultura geral")));
  }
  if (!escolhida && porTemaExato.length === 0) escolhida = escolher(pool);

  marcarPerguntaUsada(escolhida.pergunta);

  return {
    pergunta: escolhida.pergunta,
    opcoes: escolhida.opcoes,
    resposta_correta: escolhida.resposta_correta,
    explicacao: escolhida.explicacao
  };
}
function formatarMoeda(valor) {
  return "R$ " + valor.toLocaleString("pt-BR");
}

function atualizarHighScore() {
  const el = document.getElementById("high-score");
  el.innerText = highScore.toLocaleString("pt-BR") + " pts";
}

function atualizarStatusBar() {
  document.getElementById("rodada-texto").innerText =
    "Pergunta " + perguntaNumero + "/" + TOTAL_PERGUNTAS;
  document.getElementById("premio-atual").innerText =
    formatarMoeda(PREMIOS[perguntaNumero - 1]);
  document.getElementById("progress-fill").style.width =
    (perguntaNumero / TOTAL_PERGUNTAS) * 100 + "%";
}

function registrarPontuacao() {
  if (premioGanho > highScore) {
    highScore = premioGanho;
    localStorage.setItem("pinguim_highscore", String(highScore));
  }
  atualizarHighScore();
}

function fimDeJogo(venceu) {
  pararOuvir();

  if (venceu) {
    tocarSom("vitoria");
    falar("Parabéns! Você venceu o jogo e levou " + valorFalado(premioGanho) + "! Você é o grande campeão!");
  }

  const mensagem = venceu
    ? "🏆 PARABÉNS! Você venceu o jogo e levou " + formatarMoeda(premioGanho) + "!"
    : "❌ Fim de jogo! Seu prêmio acumulado: " + formatarMoeda(premioGanho) +
      ". A resposta certa era a alternativa " + perguntaAtual.resposta_correta + ".";

  alert(mensagem);

  perguntaAtual = null;
  perguntaNumero = 1;
  premioGanho = 0;
  usadas.clear();
  auxiliosUsados.clear();
  marcarPerguntaLocal(false);

  document.getElementById("quiz-panel").classList.add("hidden");
  document.getElementById("status-bar").classList.add("hidden");
  document.getElementById("setup-panel").classList.remove("hidden");
}

async function gerarPergunta() {
  participanteNome = document.getElementById("participante").value.trim();
  const tema =
    document.getElementById("tema").value || "Conhecimentos Gerais";

  const nivel = document.getElementById("nivel").value;

  pararFala();
  pararOuvir();

  // Atualiza visibilidade dos painéis
  document.getElementById("setup-panel").classList.add("hidden");
  document.getElementById("quiz-panel").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("feedback").classList.add("hidden");
  document.getElementById("btn-proxima").classList.add("hidden");
  document.getElementById("status-bar").classList.remove("hidden");

  atualizarStatusBar();

  try {
    await PROMESSA_BANCO;
    perguntaAtual = sorteiaPerguntaLocal(tema, nivel);
    marcarPerguntaLocal(true);
    exibirPergunta(perguntaAtual);
  } catch (erroBanco) {
    console.error('Falha ao carregar banco local:', erroBanco);
    alert('Falha ao carregar o banco local de perguntas. Certifique-se de abrir o jogo via http://localhost.');
    document.getElementById('setup-panel').classList.remove('hidden');
  } finally {
    document
      .getElementById("loading")
      .classList.add("hidden");
  }
}

function exibirPergunta(dados) {
  document.getElementById("pergunta-texto").innerText = dados.pergunta;
  document.getElementById("opt-A").innerText = dados.opcoes.A;
  document.getElementById("opt-B").innerText = dados.opcoes.B;
  document.getElementById("opt-C").innerText = dados.opcoes.C;
  document.getElementById("opt-D").innerText = dados.opcoes.D;

  // Habilita os botões novamente
  const botoes = document.querySelectorAll(".btn-opcao");
  botoes.forEach(btn => {
    btn.disabled = false;
    btn.classList.remove("eliminada");
  });

  document.getElementById("quiz-panel").classList.remove("hidden");

  narrarPergunta(dados);
}

function usarCarta(tipo) {
  if (!perguntaAtual || auxiliosUsados.has(tipo)) return;

  auxiliosUsados.add(tipo);
  const carta = document.querySelector(`[data-auxilio="${tipo}"]`);
  if (carta) {
    carta.classList.add("usada", "embaralhando");
    carta.disabled = true;
    setTimeout(() => carta.classList.remove("embaralhando"), 650);
  }

  if (tipo === "eliminar") {
    const incorretas = ["A", "B", "C", "D"]
      .filter(letra => letra !== perguntaAtual.resposta_correta)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    incorretas.forEach(letra => {
      const botao = document.querySelector(`.btn-opcao[onclick="responder('${letra}')"]`);
      if (!botao) return;
      botao.disabled = true;
      botao.classList.add("eliminada");
      botao.querySelector("span:last-child").textContent = "Alternativa eliminada";
    });
    tocarSom("clique");
    falar("Duas alternativas foram eliminadas.");
  } else if (tipo.startsWith("pular")) {
    falar("Vamos pular esta pergunta.");
    setTimeout(() => gerarPergunta(), 500);
  }
}

function responder(alternativaEscolhida) {
  if (!perguntaAtual) return;

  // Desabilita botões para evitar duplo clique
  const botoes = document.querySelectorAll(".btn-opcao");
  botoes.forEach(btn => btn.disabled = true);

  pararFala();
  pararOuvir();
  tocarSom("clique");

  const feedback = document.getElementById("feedback");
  feedback.classList.remove("hidden", "correto", "incorreto");

  if (alternativaEscolhida === perguntaAtual.resposta_correta) {
    premioGanho = PREMIOS[perguntaNumero - 1];
    registrarPontuacao();
    atualizarStatusBar();

    feedback.classList.add("correto");
    feedback.innerHTML = `🎉 <strong>CERTA RESPOSTA!</strong><br>${perguntaAtual.explicacao}`;

    tocarSom("acerto");
    falar("Certa resposta, bonzão! " + perguntaAtual.explicacao);

    if (perguntaNumero >= TOTAL_PERGUNTAS) {
      fimDeJogo(true);
      return;
    }

    perguntaNumero++;
    atualizarStatusBar();
    document.getElementById("btn-proxima").classList.remove("hidden");
  } else {
    feedback.classList.add("incorreto");
    feedback.innerHTML = `❌ <strong>QUE PENA, VOCÊ ERROU!</strong><br>A resposta certa era a alternativa <strong>${perguntaAtual.resposta_correta}</strong>.<br><br>💡 ${perguntaAtual.explicacao}`;

    tocarSom("erro");
    falar(
      "Poxa, que pena! A resposta certa era a alternativa " +
      perguntaAtual.resposta_correta + ". " + perguntaAtual.explicacao
    );

    registrarPontuacao();
    fimDeJogo(false);
  }
}

atualizarHighScore();

// ===== Seletor de voz =====
const seletorVoz = document.getElementById("seletor-voz");
if (seletorVoz) {
  seletorVoz.addEventListener("change", () => {
    localStorage.setItem(CHAVE_VOZ, seletorVoz.value);
    tocarSom("clique");
  });
}
popularSeletorVoz();


