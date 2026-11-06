
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  where,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDhJQEZFxX9Re9172lgVqKo4OwWFCIp3fs',
  authDomain: 'inve-eb546.firebaseapp.com',
  projectId: 'inve-eb546',
  storageBucket: 'inve-eb546.firebasestorage.app',
  messagingSenderId: '1014956147760',
  appId: '1:1014956147760:web:01e66111c8ccf26f9659f5',
  measurementId: 'G-39RSTSN2WZ'
};

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getFirestore(appFirebase);
auth.languageCode = 'pt-BR';

const $ = id => document.getElementById(id);
let personagemAberto = null;
let personagemEditandoId = null;
let resultadosIniciativa = null;
let campanhaCompartilhada = {
  codigo: '',
  papel: '',
  fichas: [],
  pararEscuta: null
};

// O legado preserva fichas antigas de investigação, sem converter CAR/PEC para PRE/VIG automaticamente.
const periciasRPGLegado = [
  ['Acrobacia', 'AGL'],
  ['Adestramento', 'CAR'],
  ['Artes', 'CAR'],
  ['Atletismo', 'FOR'],
  ['Atualidades', 'INT'],
  ['Ciências', 'INT'],
  ['Crime', 'AGL'],
  ['Diplomacia', 'CAR'],
  ['Enganação', 'CAR'],
  ['Fortitude', 'FOR'],
  ['Furtividade', 'AGL'],
  ['Iniciativa', 'AGL'],
  ['Intimidação', 'CAR'],
  ['Intuição', 'PEC'],
  ['Investigação', 'PEC'],
  ['Luta', 'FOR'],
  ['Medicina', 'INT'],
  ['Ocultismo', 'INT'],
  ['Percepção', 'PEC'],
  ['Pilotagem', 'AGL'],
  ['Pontaria', 'AGL'],
  ['Persuasão', 'CAR'],
  ['Profissão', 'INT'],
  ['Reflexos', 'AGL'],
  ['Religião', 'INT'],
  ['Sobrevivência', 'PEC'],
  ['Tática', 'INT'],
  ['Tecnologia', 'INT'],
  ['Vontade', 'CAR']
];
const atributosInfoLegado = [
  ['agl', 'AGILIDADE', 'AGL'],
  ['for', 'FORÇA', 'FOR'],
  ['int', 'INTELIGÊNCIA', 'INT'],
  ['car', 'CARISMA', 'CAR'],
  ['pec', 'PERCEPÇÃO', 'PEC']
];

const periciasRPG = [
  ['Acrobacia', 'AGL'], ['Adestramento', 'PRE'], ['Artes', 'PRE'],
  ['Atletismo', 'FOR'], ['Atualidades', 'INT'], ['Ciências', 'INT'],
  ['Crime', 'AGL'], ['Diplomacia', 'PRE'], ['Enganação', 'PRE'],
  ['Fortitude', 'VIG'], ['Furtividade', 'AGL'], ['Iniciativa', 'AGL'],
  ['Intimidação', 'PRE'], ['Intuição', 'PRE'], ['Investigação', 'INT'],
  ['Luta', 'FOR'], ['Medicina', 'INT'], ['Ocultismo', 'INT'],
  ['Percepção', 'PRE'], ['Pilotagem', 'AGL'], ['Pontaria', 'AGL'],
  ['Profissão', 'INT'], ['Reflexos', 'AGL'], ['Religião', 'PRE'],
  ['Sobrevivência', 'INT'], ['Tática', 'INT'], ['Tecnologia', 'INT'], ['Vontade', 'PRE']
];
const atributosInfo = [
  ['agl', 'AGILIDADE', 'AGL'],
  ['for', 'FORÇA', 'FOR'],
  ['int', 'INTELECTO', 'INT'],
  ['pre', 'PRESENÇA', 'PRE'],
  ['vig', 'VIGOR', 'VIG']
];

const REGRAS_CLASSE = {
  combatente: { pv:20, pe:2, san:12, pvNivel:4, peNivel:2, sanNivel:3, periciasInt:1, periciasBase:3 },
  especialista: { pv:16, pe:3, san:16, pvNivel:3, peNivel:3, sanNivel:4, periciasInt:1, periciasBase:7 },
  ocultista: { pv:12, pe:4, san:20, pvNivel:2, peNivel:4, sanNivel:5, periciasInt:1, periciasBase:5 }
};

function fichaUsaRegrasAntigas(ficha) {
  return !!ficha && (ficha.regras === 'legado' || (!ficha.regras && !('pre' in (ficha.atributos || {}))));
}
function nexFormulario() {
  return $('personagem-classe-base').value === 'sobrevivente'
    ? 0
    : Number($('personagem-nex').value || 5);
}
function aumentosAtributosDisponiveis() {
  const classe = $('personagem-classe-base').value;
  if (classe === 'sobrevivente') return Number($('personagem-estagio').value || 1) >= 3 ? 1 : 0;
  const nex = nexFormulario();
  return [20, 50, 80, 95].filter(marco => nex >= marco).length;
}
function maximoAtributoPersonagem() {
  return $('personagem-classe-base').value === 'sobrevivente'
    ? 3 : Math.min(5, 3 + aumentosAtributosDisponiveis());
}

function nexFicha(ficha) {
  return fichaUsaRegrasAntigas(ficha) ? nexAtualDaMesa() : Number(ficha?.nex ?? 5);
}
function calcularValoresLivro(classe, atributos, nex, estagio) {
  const agl = Number(atributos.agl) || 0;
  const pre = Number(atributos.pre) || 0;
  const vig = Number(atributos.vig) || 0;
  if (classe === 'sobrevivente') {
    const evolucoes = Math.max(0, Math.min(4, Number(estagio || 1) - 1));
    return { pv:8+vig+2*evolucoes, pe:2+pre+evolucoes, san:8+2*evolucoes, defesa:10+agl };
  }
  const base = REGRAS_CLASSE[classe] || REGRAS_CLASSE.especialista;
  const passos = Number(nex) === 99 ? 19 : Math.max(0, Math.floor((Number(nex || 5)-5)/5));
  return {
    pv:base.pv+vig+passos*(base.pvNivel+vig),
    pe:base.pe+pre+passos*(base.peNivel+pre),
    san:base.san+passos*base.sanNivel,
    defesa:10+agl
  };
}
function limitePericiasClasse(classe, int) {
  if (classe === 'sobrevivente') return 1 + Math.max(0, Number(int) || 0);
  const base = REGRAS_CLASSE[classe] || REGRAS_CLASSE.especialista;
  return base.periciasBase + Math.max(0, Number(int) || 0);
}
function limitePericiasDisponiveis(classe, int, origem) {
  // Uma origem do livro fornece duas perícias treinadas; os nomes exatos
  // devem ser conferidos com a origem escolhida pelo mestre.
  return limitePericiasClasse(classe, int) + (String(origem || '').trim() ? 2 : 0);
}
function limitesGrausTreinamento(nex, int, classeBase = 'combatente') {
  if (classeBase === 'sobrevivente') return { veteranas:0, experts:0 };
  const porMarco = (classeBase === 'especialista' ? 5 : classeBase === 'ocultista' ? 3 : 2) + Math.max(0, Number(int) || 0);
  return {
    veteranas: Number(nex) >= 70 ? 2 * porMarco : Number(nex) >= 35 ? porMarco : 0,
    experts: Number(nex) >= 70 ? porMarco : 0
  };
}


/* ==========================================
   NAVEGAÇÃO
========================================== */

function mostrarTela(nome) {
  ['home-screen', 'login-screen', 'app'].forEach(id => {
    $(id).hidden = true;
  });

  const telas = {
    inicio: 'home-screen',
    login: 'login-screen',
    app: 'app'
  };

  $(telas[nome]).hidden = false;
  window.scrollTo(0, 0);
}

function mostrarFormulario(nome) {
  ['login-form', 'register-form', 'recovery-form'].forEach(id => {
    $(id).hidden = true;
  });

  const formularios = {
    login: 'login-form',
    cadastro: 'register-form',
    recuperar: 'recovery-form'
  };

  const titulos = {
    login: 'ACESSO RESTRITO',
    cadastro: 'CRIAR CONTA',
    recuperar: 'RECUPERAR SENHA'
  };

  $(formularios[nome]).hidden = false;
  $('auth-title').textContent = titulos[nome];
  $('auth-message').textContent = '';
}

function erroAuth(e) {
  const erros = {
    'auth/email-already-in-use': 'E-mail já cadastrado.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/weak-password': 'Senha muito fraca.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/network-request-failed': 'Verifique a conexão.',
    'auth/operation-not-allowed': 'Ative E-mail/Senha no Firebase.'
  };

  return erros[e.code] || 'Não foi possível concluir a operação.';
}

$('enter-button').onclick = () => {
  mostrarFormulario('login');
  mostrarTela('login');
};

$('show-register').onclick = () => mostrarFormulario('cadastro');
$('show-recovery').onclick = () => mostrarFormulario('recuperar');

document.querySelectorAll('.back-login').forEach(botao => {
  botao.onclick = () => mostrarFormulario('login');
});

document.querySelector('.mostrar-senha').onclick = () => {
  const campo = $('login-password');
  campo.type = campo.type === 'password' ? 'text' : 'password';
};

/* ==========================================
   AUTENTICAÇÃO
========================================== */

$('register-form').onsubmit = async e => {
  e.preventDefault();

  try {
    const resultado = await createUserWithEmailAndPassword(
      auth,
      $('register-email').value.trim(),
      $('register-password').value
    );

    await updateProfile(resultado.user, {
      displayName: $('register-name').value.trim()
    });

    $('welcome-message').textContent =
      `Bem-vindo, ${resultado.user.displayName || 'Investigador'}.`;

    mostrarTela('app');
  } catch (erro) {
    $('auth-message').textContent = erroAuth(erro);
  }
};

$('login-form').onsubmit = async e => {
  e.preventDefault();

  try {
    await signInWithEmailAndPassword(
      auth,
      $('login-email').value.trim(),
      $('login-password').value
    );
  } catch (erro) {
    $('auth-message').textContent = erroAuth(erro);
  }
};

$('recovery-form').onsubmit = async e => {
  e.preventDefault();

  try {
    await sendPasswordResetEmail(
      auth,
      $('recovery-email').value.trim()
    );

    $('auth-message').textContent =
      'Se o e-mail estiver cadastrado, você receberá instruções.';
  } catch (erro) {
    $('auth-message').textContent = erroAuth(erro);
  }
};

/* ==========================================
   TELAS INTERNAS
========================================== */

function abrirTela(id) {
  $('painel-principal').hidden = true;

  document.querySelectorAll('.app-pagina').forEach(tela => {
    tela.hidden = true;
  });

  $(id).hidden = false;
  if (id === 'tela-personagens') {
    mostrarAreaPersonagens('criar');
    atualizarLimitesTreinamento();
  }
  if (id === 'tela-mestre') {
    atualizarPainelMestre();
  }
  window.scrollTo(0, 0);
}

function abrirMesaSessao(sessaoId) {
  const sessoes = carregar('sessoes');
  const sessao = sessoes.find(item => item.id === (sessaoId || $('sessao-atual-seletor').value));
  abrirTela('tela-sessao');
  renderizarSeletorSessao();
  $('sessao-atual-seletor').value = sessao?.id || '';
  $('titulo-mesa-sessao').textContent = sessao?.titulo || 'MESA DE INVESTIGAÇÃO';
  $('detalhes-mesa-sessao').textContent = sessao
    ? [sessao.codigo, sessao.casoTitulo, sessao.data].filter(Boolean).join(' · ')
    : 'Mesa livre · fichas, NPCs, pistas, anotações e dados em um só lugar.';
}


$('voltar-area-mestre').onclick = () => abrirTela('tela-mestre');

function voltarPainel() {
  $('painel-principal').hidden = false;

  document.querySelectorAll('.app-pagina').forEach(tela => {
    tela.hidden = true;
  });

  window.scrollTo(0, 0);
}

function mostrarAreaPersonagens(area) {
  const criando = area === 'criar';
  $('painel-criacao-personagem').hidden = !criando;
  $('painel-fichas-personagem').hidden = criando;
  $('aba-criar-personagem').classList.toggle('active', criando);
  $('aba-fichas-personagem').classList.toggle('active', !criando);
  $('aba-criar-personagem').setAttribute('aria-selected', String(criando));
  $('aba-fichas-personagem').setAttribute('aria-selected', String(!criando));
}

$('aba-criar-personagem').onclick = () => mostrarAreaPersonagens('criar');
$('aba-fichas-personagem').onclick = () => {
  mostrarRegistros('personagens', 'lista-personagens');
  mostrarAreaPersonagens('fichas');
};

document.querySelectorAll('[data-tela]').forEach(botao => {
  botao.onclick = () => {
    abrirTela(botao.dataset.tela);
    if (botao.dataset.tela === 'tela-personagens') {
      mostrarAreaPersonagens('criar');
    }
    document.querySelectorAll('#tela-mestre .master-nav-link').forEach(link => {
      link.classList.toggle('active', link === botao);
    });
  };
});

document.querySelectorAll('[data-master-action]').forEach(botao => {
  botao.onclick = () => {
    const acao = botao.dataset.masterAction;
    const destinos = {
      cases: 'tela-casos',
      notes: 'tela-anotacoes',
      dice: 'tela-dados',
      pj: 'tela-personagens',
      npc: 'tela-personagens'
    };

    abrirTela(destinos[acao]);
    if (acao === 'pj' || acao === 'npc') {
      mostrarAreaPersonagens('criar');
      $('personagem-tipo').value = acao === 'npc' ? 'npc' : 'pj';
      $('form-personagem').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (acao === 'cases') {
      $('caso-titulo').focus({ preventScroll: true });
    } else if (acao === 'notes') {
      $('anotacao-texto').focus({ preventScroll: true });
    }
  };
});

document.querySelectorAll('[data-master-section]').forEach(botao => {
  botao.onclick = () => {
    const secao = $(botao.dataset.masterSection);
    if (secao) { secao.open = true; secao.scrollIntoView({behavior:'smooth',block:'start'}); }
  };
});
$('concluir-sessao-atual').onclick = () => {
  const selecionada = $('sessao-atual-seletor').value;
  const sessoes = carregar('sessoes');
  const sessao = sessoes.find(item => item.id === selecionada);
  if (!sessao) { $('sessao-atual-status').textContent = 'Selecione uma sessão.'; return; }
  if (!confirm('Concluir esta sessão?')) return;
  sessao.status = 'concluida';
  if (salvar('sessoes', sessoes)) {
    atualizarPainelMestre();
    $('sessao-atual-seletor').value = selecionada;
    $('sessao-atual-status').textContent = 'Sessão concluída.';
  }
};

function atualizarNex(valor) {
  const nex = Math.max(0, Math.min(100, Math.round(valor / 5) * 5));
  $('nex-valor').value = `${nex}%`;
  $('nex-ajuste').value = String(nex);
  atualizarLimitesTreinamento();

  try {
    localStorage.setItem(chave('nex'), String(nex));
    $('sessao-atual-status').textContent = '';
  } catch (erro) {
    console.error('Não foi possível salvar o NEX da mesa.', erro);
    $('sessao-atual-status').textContent =
      'Não foi possível salvar o NEX neste navegador.';
  }
}

$('nex-ajuste').oninput = () => {
  atualizarNex(Number($('nex-ajuste').value));
};

$('nex-diminuir').onclick = () => {
  atualizarNex(Number.parseInt($('nex-valor').value, 10) - 5);
};

$('nex-aumentar').onclick = () => {
  atualizarNex(Number.parseInt($('nex-valor').value, 10) + 5);
};

$('sessao-atual-seletor').onchange = () => {
  $('sessao-atual-status').textContent = '';
  renderizarSeletorSessao();
};

$('rolar-iniciativa').onclick = () => {
  const personagens = fichasDaMesa();
  if (!personagens.length) return;

  somDadosRPG(personagens.length);
  resultadosIniciativa = personagens.map(personagem => {
    const agilidade = Math.max(0, Math.floor(Number(personagem.atributos?.agl) || 0));
    const quantidade = agilidade === 0 ? 2 : Math.min(agilidade, 10);
    const dados = Array.from({length:quantidade}, () => rolarDado(20));
    const escolhido = agilidade === 0 ? Math.min(...dados) : Math.max(...dados);
    const bonusBruto = Number(personagem.pericias?.Iniciativa ?? 0);
    const bonus = Number.isFinite(bonusBruto) ? bonusBruto : 0;
    return {
      id: personagem.id,
      nome: personagem.titulo || 'Personagem sem nome',
      dado: escolhido,
      dados,
      atributo: agilidade,
      bonus,
      total: escolhido + bonus
    };
  }).sort((a, b) =>
    b.total - a.total ||
    b.dado - a.dado ||
    a.nome.localeCompare(b.nome, 'pt-BR')
  );

  renderizarOrdemIniciativa();
};

$('iniciar-sessao-atual').onclick = () => {
  const sessaoId = $('sessao-atual-seletor').value;
  const sessoes = carregar('sessoes');
  const sessao = sessoes.find(item => item.id === sessaoId);

  if (!sessao) {
    $('sessao-atual-status').textContent =
      'Mesa livre iniciada. Boa investigação!';
    abrirMesaSessao();
    return;
  }

  sessao.status = 'andamento';
  if (salvar('sessoes', sessoes)) {
    atualizarPainelMestre();
    $('sessao-atual-seletor').value = sessaoId;
    $('sessao-atual-status').textContent = `Sessão iniciada: ${sessao.titulo}.`;
    abrirMesaSessao(sessaoId);
  }
};

$('form-anotacao-mestre').onsubmit = e => {
  e.preventDefault();
  const texto = $('anotacao-mestre-texto').value.trim();
  if (!texto) return;

  const anotacoes = carregar('anotacoes');
  anotacoes.push({
    id: id(),
    titulo: 'Anotação · ' + new Date().toLocaleString('pt-BR'),
    descricao: texto
  });

  if (salvar('anotacoes', anotacoes)) {
    $('form-anotacao-mestre').reset();
    mostrarRegistros('anotacoes', 'lista-anotacoes');
    atualizarPainelMestre();
  }
};

document.querySelectorAll('.voltar-painel').forEach(botao => {
  botao.onclick = voltarPainel;
});

$('voltar-personagens').onclick = () => {
  const destino = $(telaAnteriorFicha) ? telaAnteriorFicha : 'tela-personagens';
  abrirTela(destino);
  if (destino === 'tela-personagens') {
    mostrarRegistros('personagens', 'lista-personagens');
    mostrarAreaPersonagens('fichas');
  }
};

/* ==========================================
   ARMAZENAMENTO
========================================== */

function chave(tipo) {
  if (!auth.currentUser) {
    throw Error('Entre na conta.');
  }

  return `arquivo-cinza-${auth.currentUser.uid}-${tipo}`;
}

function carregar(tipo) {
  try {
    const dados = JSON.parse(
      localStorage.getItem(chave(tipo)) || '[]'
    );

    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvar(tipo, dados) {
  try {
    localStorage.setItem(chave(tipo), JSON.stringify(dados));
    return true;
  } catch {
    alert('Não foi possível salvar no navegador.');
    return false;
  }
}

function id() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + '-' + String(Math.random());
}

function gerarCodigoSessao(sessoes) {
  const codigosExistentes = new Set(
    sessoes.map(sessao => sessao.codigo).filter(Boolean)
  );
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo;

  do {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    codigo = 'AC-' + Array.from(bytes, byte =>
      alfabeto[byte % alfabeto.length]
    ).join('');
  } while (codigosExistentes.has(codigo));

  return codigo;
}

function garantirCodigosSessoes() {
  const sessoes = carregar('sessoes');
  let alterou = false;

  sessoes.forEach(sessao => {
    if (sessao.codigo) return;
    sessao.codigo = gerarCodigoSessao(
      sessoes.filter(item => item !== sessao)
    );
    alterou = true;
  });

  return !alterou || salvar('sessoes', sessoes);
}

function botao(texto, funcao, classe = 'outline') {
  const elemento = document.createElement('button');

  elemento.type = 'button';
  elemento.className = classe;
  elemento.textContent = texto;
  elemento.onclick = funcao;

  return elemento;
}

/* ==========================================
   REGISTROS
========================================== */

function renderizarGaleriaFichas() {
  const area = $('lista-personagens');
  if (!area) return;
  area.replaceChildren();
  const busca = $('jogadores-busca').value.trim().toLocaleLowerCase('pt-BR');
  const filtro = $('jogadores-filtro').value;
  const fichas = fichasDaMesa().filter(ficha => {
    if (filtro !== 'todos' && (ficha.tipo === 'npc' ? 'npc' : 'pj') !== filtro) return false;
    return [ficha.titulo, ficha.classe, ficha.classeBase, ficha.origem]
      .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(busca);
  }).sort((a,b)=>String(a.titulo || '').localeCompare(String(b.titulo || ''),'pt-BR'));
  $('jogadores-contador').textContent = fichas.length + (fichas.length === 1 ? ' ficha encontrada' : ' fichas encontradas');
  if (!fichas.length) {
    const vazio=document.createElement('p');
    vazio.className='player-archive-empty';
    vazio.textContent = busca ? 'Nenhuma ficha corresponde à pesquisa.' :
      'Ainda não há personagens nesta lista. Crie uma ficha ou acesse uma campanha compartilhada.';
    area.append(vazio);
    return;
  }
  const criar=(tag,cls,txt)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(txt!==undefined)el.textContent=String(txt);
    return el;
  };
  fichas.forEach(ficha=>{
    const compartilhada=campanhaCompartilhada.fichas.some(f=>f.id===ficha.id);
    const local=carregar('personagens').some(f=>f.id===ficha.id);
    const podeEditar=compartilhada ? campanhaCompartilhada.papel==='mestre' : local;
    const card=criar('article','player-archive-card');
    const cab=criar('div','player-archive-card-header');
    cab.append(criarRetratoMestre(ficha,'player-archive-portrait'));
    const info=criar('div','player-archive-card-info');
    info.append(
      criar('span','player-archive-source',compartilhada?'◈ CAMPANHA':'◈ FICHA LOCAL'),
      criar('h4','',ficha.titulo || 'Investigador'),
      criar('p','',ficha.classe || 'Investigador')
    );
    cab.append(info);
    card.append(cab);
    const subtitulo=criar('p','player-archive-subtitle',
      fichaUsaRegrasAntigas(ficha) ? 'Regras originais do Código Sombrio' :
      (ficha.classeBase || 'Especialista') + ' · ' +
      (ficha.classeBase==='sobrevivente'?'Estágio '+(ficha.estagio||1):'NEX '+nexFicha(ficha)+'%')
    );
    card.append(subtitulo);
    const stats=criar('div','player-archive-stats');
    for(const [rotulo,atual,max] of [
      ['♥ VIDA',ficha.pvAtual ?? ficha.pv,ficha.pv],
      ['◈ SAN',ficha.sanAtual ?? ficha.san,ficha.san],
      ['✦ PE',ficha.peAtual ?? ficha.pe,ficha.pe],
      ['⬡ DEF',ficha.defesa,ficha.defesa]
    ]){
      const item=criar('div','player-archive-stat');
      item.append(criar('small','',rotulo),
        criar('strong','',rotulo==='⬡ DEF' ? (max??'—') : (atual??'—')+'/'+(max??'—')));
      stats.append(item);
    }
    card.append(stats);
    const acoes=criar('div','player-archive-actions');
    acoes.append(botao('VER FICHA COMPLETA',()=>abrirFicha(ficha.id),'primary'));
    if(podeEditar){
      acoes.append(botao('EDITAR',()=>editarFichaCompartilhada(ficha),'outline'));
    }
    if(local && !compartilhada){
      acoes.append(botao('EXCLUIR',()=>{
        if(!confirm('Excluir a ficha local de '+(ficha.titulo||'este personagem')+'?'))return;
        const novas=carregar('personagens').filter(item=>item.id!==ficha.id);
        if(salvar('personagens',novas)) {
          renderizarGaleriaFichas();
          atualizarPainelMestre();
        }
      },'outline player-archive-delete'));
    }
    card.append(acoes);
    area.append(card);
  });
}
$('jogadores-busca').addEventListener('input',renderizarGaleriaFichas);
$('jogadores-filtro').addEventListener('change',renderizarGaleriaFichas);
$('jogadores-atualizar').addEventListener('click',renderizarGaleriaFichas);

function mostrarRegistros(tipo, container) {
  if(tipo==='personagens' && container==='lista-personagens') {
    renderizarGaleriaFichas();
    return;
  }
  const alvo = $(container);
  alvo.replaceChildren();

  const registros = carregar(tipo);

  if (!registros.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Nenhum registro encontrado.';
    alvo.append(p);
    return;
  }

  registros.forEach(registro => {
    const artigo = document.createElement('article');
    artigo.className = 'registro';

    const titulo = document.createElement('h3');
    titulo.textContent = registro.titulo || 'Sem título';
    artigo.append(titulo);

    if (tipo !== 'personagens') {
      const descricao = document.createElement('p');
      descricao.textContent = registro.descricao || '';
      artigo.append(descricao);

      if (tipo === 'sessoes') {
        const codigo = document.createElement('small');
        codigo.className = 'session-record-code';
        codigo.textContent = `Código da sessão: ${registro.codigo || 'indisponível'}`;
        const detalhes = document.createElement('small');
        const participantes = Array.isArray(registro.participantes)
          ? registro.participantes.map(item => item.nome).join(', ')
          : '';
        const informacoes = [
          registro.data
            ? new Date(`${registro.data}T12:00:00`).toLocaleDateString('pt-BR')
            : '',
          registro.duracao,
          registro.status === 'andamento'
            ? 'Em andamento'
            : registro.status === 'concluida'
              ? 'Concluída'
              : 'Planejada',
          registro.casoTitulo ? `Caso: ${registro.casoTitulo}` : '',
          participantes ? `Participantes: ${participantes}` : ''
        ].filter(Boolean);

        detalhes.textContent = informacoes.join(' · ');
        artigo.append(codigo, detalhes);
      }
    } else {
      const classe = document.createElement('p');
      classe.textContent = registro.classe || 'Investigador';

      artigo.append(
        classe,
        botao('◈ VER FICHA RPG', () => abrirFicha(registro.id), 'character-sheet-button')
      );
    }

    artigo.append(
      botao('EXCLUIR', () => {
        if (!confirm('Excluir este registro?')) return;

        const novos = carregar(tipo).filter(
          item => item.id !== registro.id
        );

        if (salvar(tipo, novos)) {
          mostrarRegistros(tipo, container);
          if (tipo === 'personagens' || tipo === 'sessoes' || tipo === 'anotacoes') {
            atualizarPainelMestre();
          }
        }
      })
    );

    alvo.append(artigo);
  });
}

/* ==========================================
   CRIAÇÃO DAS PERÍCIAS
========================================== */

periciasRPG.forEach(([nome, atributo], indice) => {
  const campo = document.createElement('label');
  campo.className = 'skill-field';

  const titulo = document.createElement('strong');
  titulo.textContent = nome;

  const descricao = document.createElement('small');
  descricao.textContent = `Atributo: ${atributo}`;

  const seletor = document.createElement('select');
  seletor.id = `pericia-${indice}`;

  [
    [0, 'Destreinado (+0)'],
    [5, 'Treinado (+5)'],
    [10, 'Veterano (+10 · NEX 35%)'],
    [15, 'Expert (+15 · NEX 70%)']
  ].forEach(([valor, texto]) => {
    const opcao = document.createElement('option');
    opcao.value = valor;
    opcao.textContent = texto;
    seletor.append(opcao);
  });

  campo.append(titulo, descricao, seletor);
  $('lista-pericias').append(campo);
  seletor.addEventListener('change', atualizarResumoPericias);
});
atualizarLimitesTreinamento();

/* ==========================================
   ATRIBUTOS DO PERSONAGEM
========================================== */

function atributosForm() {
  return Object.fromEntries(
    atributosInfo.map(([chave]) => [
      chave,
      Number($('atributo-' + chave).value)
    ])
  );
}


// Recursos automáticos do Código Sombrio; os campos continuam editáveis.
function calcularRecursosPersonagem() {
  const atributos = atributosForm();
  const classe = $('personagem-classe-base').value || 'especialista';
  const valores = calcularValoresLivro(classe, atributos, nexFormulario(), $('personagem-estagio').value);
  $('personagem-pv').value = String(valores.pv);
  $('personagem-pe').value = String(valores.pe);
  $('personagem-san').value = String(valores.san);
  $('personagem-defesa').value = String(valores.defesa);
}

function pontosExtrasDisponiveis(valores = atributosForm()) {
  const foiReduzido = Object.values(valores).some(valor => valor === 0);
  return ($('personagem-classe-base').value === 'sobrevivente' ? 3 : 4) +
    aumentosAtributosDisponiveis() + (foiReduzido ? 1 : 0);
}

function atualizarTotal(chaveAlterada) {
  const valores = atributosForm();
  if (chaveAlterada) {
    const campo = $('atributo-' + chaveAlterada);
    const bruto = Number(campo.value);
    if (!Number.isInteger(bruto)) campo.value = '1';
    else campo.value = String(Math.max(0, Math.min(maximoAtributoPersonagem(), bruto)));
    valores[chaveAlterada] = Number(campo.value);
    if (Object.values(valores).filter(valor => valor === 0).length > 1) {
      campo.value = '1';
      valores[chaveAlterada] = 1;
    }
    const gastos = Object.values(valores).reduce((a,b)=>a+b,0) - 5;
    const limite = pontosExtrasDisponiveis(valores);
    if (gastos > limite) {
      campo.value = String(Math.max(0, valores[chaveAlterada] - (gastos - limite)));
      valores[chaveAlterada] = Number(campo.value);
    }
  }
  const gastos = Object.values(valores).reduce((a,b)=>a+b,0) - 5;
  const limite = pontosExtrasDisponiveis(valores);
  atributosInfo.forEach(([chave]) => {
    $('atributo-' + chave).max = String(maximoAtributoPersonagem());
  });
  $('total-atributos').textContent =
    'Pontos distribuídos: ' + Math.max(0,gastos) + ' / ' + limite +
    (Object.values(valores).some(valor => valor === 0) ? ' (um atributo reduzido a 0)' : '');
  $('total-atributos').classList.toggle('is-over-limit', gastos > limite);
  atualizarResumoPericias();
  if (chaveAlterada || !personagemEditandoId) calcularRecursosPersonagem();
}

atributosInfo.forEach(([chave]) => {
  $('atributo-' + chave).addEventListener('input', () => atualizarTotal(chave));
});

function atualizarResumoPericias() {
  const classe = $('personagem-classe-base').value;
  const inteligencia = Number($('atributo-int').value) || 0;
  const maximo = limitePericiasDisponiveis(classe, inteligencia, $('personagem-origem').value);
  const selecionadas = [...document.querySelectorAll('#lista-pericias select')]
    .filter(select => Number(select.value) >= 5).length;
  const local = $('pericias-limite-info');
  if (local) local.textContent = 'Perícias treinadas: ' + selecionadas + ' / ' + maximo +
    ' (' + limitePericiasClasse(classe, inteligencia) + ' da classe' +
    ($('personagem-origem').value.trim() ? ' + 2 da origem' : '') +
    '). Confira as perícias obrigatórias e as duas da origem no livro.';
}

function prepararCamposProgressao() {
  const sobrevivente = $('personagem-classe-base').value === 'sobrevivente';
  $('personagem-nex-wrap').hidden = sobrevivente;
  $('personagem-estagio-wrap').hidden = !sobrevivente;
  atualizarTotal();
  atualizarLimitesTreinamento();
  calcularRecursosPersonagem();
}

$('personagem-classe-base').addEventListener('change', prepararCamposProgressao);
$('personagem-nex').addEventListener('change', () => {
  atualizarTotal();
  atualizarLimitesTreinamento();
  calcularRecursosPersonagem();
});
$('personagem-estagio').addEventListener('change', () => {
  atualizarTotal();
  calcularRecursosPersonagem();
});
$('personagem-origem').addEventListener('input', atualizarResumoPericias);

atualizarTotal();

function nexAtualDaMesa() {
  const valor = Number.parseInt($('nex-valor')?.value || '0', 10);
  return Number.isInteger(valor) ? Math.max(0, Math.min(100, valor)) : 0;
}

function bonusMaximoTreinamento(nex = nexFormulario()) {
  if (nex >= 70) return 15;
  if (nex >= 35) return 10;
  return 5;
}

function atualizarCampoClassePersonalizada() {
  const personalizada = $('personagem-classe').value === '__outra__';
  const campo = $('personagem-classe-personalizada');
  $('personagem-classe-personalizada-wrap').hidden = !personalizada;
  campo.required = personalizada;
  if (!personalizada) campo.value = '';
}

$('personagem-classe').addEventListener('change', () => {
  atualizarCampoClassePersonalizada();
  calcularRecursosPersonagem();
  if ($('personagem-classe').value === '__outra__') {
    $('personagem-classe-personalizada').focus();
  }
});

function classeSelecionada() {
  return $('personagem-classe').value === '__outra__'
    ? $('personagem-classe-personalizada').value.trim()
    : $('personagem-classe').value.trim();
}

function nomeTreinamento(valor) {
  if (valor >= 15) return 'Expert';
  if (valor >= 10) return 'Veterano';
  if (valor >= 5) return 'Treinado';
  return 'Destreinado';
}

function atualizarLimitesTreinamento(nex = nexFormulario()) {
  const bonusMaximo = bonusMaximoTreinamento(nex);
  document.querySelectorAll('#lista-pericias select').forEach(seletor => {
    [...seletor.options].forEach(opcao => {
      opcao.disabled = Number(opcao.value) > bonusMaximo;
    });
    seletor.title = 'Treinamento liberado conforme NEX individual da ficha.';
  });

  document.querySelectorAll('.skill-point-button[data-training-bonus]').forEach(botao => {
    botao.disabled =
      botao.dataset.readOnly === 'true' ||
      Number(botao.dataset.trainingBonus) >= bonusMaximo;
  });
}

/* ==========================================
   SALVAR PERSONAGEM
========================================== */

$('form-personagem').onsubmit = async e => {
  e.preventDefault();

  const atributos = atributosForm();

  const somaAtributos = Object.values(atributos).reduce((soma, valor) => soma + valor, 0);
  const zeros = Object.values(atributos).filter(valor => valor === 0).length;
  const limiteAtributos = pontosExtrasDisponiveis(atributos);
  if (Object.values(atributos).some(valor => !Number.isInteger(valor) || valor < 0 || valor > maximoAtributoPersonagem()) ||
      zeros > 1 || somaAtributos - 5 > limiteAtributos) {
    alert('Atributos fora do limite do livro. Verifique os pontos iniciais, aumentos por evolução e o máximo permitido de cada atributo.');
    return;
  }
  const classeBase = $('personagem-classe-base').value;
  const nex = nexFormulario();
  const estagio = Number($('personagem-estagio').value || 1);
  if (classeBase !== 'sobrevivente' && ![...Array.from({length:19}, (_,i)=>5+i*5), 99].includes(nex)) {
    alert('Escolha um NEX válido (5% a 95% de 5 em 5, ou 99%).');
    return;
  }

  const fichaExistente = campanhaCompartilhada.fichas.find(
    item => item.id === personagemEditandoId
  ) || carregar('personagens').find(
    item => item.id === personagemEditandoId
  );
  const bonusMaximo = bonusMaximoTreinamento(nex);
  const pericias = Object.fromEntries(
    periciasRPG.map(([nome], indice) => [
      nome,
      Number($('pericia-' + indice).value)
    ])
  );

  const aumentouAcimaDoNex = periciasRPG.some(([nome]) =>
    pericias[nome] > bonusMaximo &&
    pericias[nome] > Number(fichaExistente?.pericias?.[nome] || 0)
  );
  if (aumentouAcimaDoNex) {
    alert('Seu NEX individual (' + nex + '%) permite, no máximo, treinamento +' + bonusMaximo + '.');
    return;
  }

  const treinadas = Object.values(pericias).filter(valor => valor >= 5).length;
  const maximoTreinadas = limitePericiasDisponiveis(classeBase, atributos.int, $('personagem-origem').value);
  if (treinadas > maximoTreinadas) {
    alert('Você selecionou ' + treinadas + ' perícias treinadas. A classe-base permite ' + maximoTreinadas +
      ' (incluindo 2 da origem, se informada; confira as perícias específicas no livro).');
    return;
  }
  if (classeBase === 'combatente' &&
      (!(pericias.Luta >= 5 || pericias.Pontaria >= 5) ||
       !(pericias.Fortitude >= 5 || pericias.Reflexos >= 5))) {
    alert('Combatente precisa treinar Luta ou Pontaria, e Fortitude ou Reflexos.');
    return;
  }
  if (classeBase === 'ocultista' &&
      (!(pericias.Ocultismo >= 5) || !(pericias.Vontade >= 5))) {
    alert('Ocultista precisa treinar Ocultismo e Vontade.');
    return;
  }

  const graus = limitesGrausTreinamento(nex, atributos.int, classeBase);
  const veteranas = Object.values(pericias).filter(valor => Number(valor) >= 10).length;
  const experts = Object.values(pericias).filter(valor => Number(valor) >= 15).length;
  if (veteranas > graus.veteranas || experts > graus.experts) {
    alert('Graus de treinamento excedem as escolhas liberadas em NEX 35% e 70%. Confira a evolução de perícias da classe no livro.');
    return;
  }

  const pv = Number($('personagem-pv').value);
  const pe = Number($('personagem-pe').value);
  const san = Number($('personagem-san').value);
  const defesa = Number($('personagem-defesa').value);

  if (
    !Number.isInteger(pv) ||
    pv < 1 ||
    ![pe, san, defesa].every(valor => Number.isInteger(valor) && valor >= 0)
  ) {
    alert('Verifique os pontos de vida, esforço e sanidade.');
    return;
  }

  const nome = $('personagem-nome').value.trim();
  const classe = classeSelecionada();
  const historia = $('personagem-historia').value.trim();
  const habilidades = $('personagem-habilidades').value
    .split(/\r?\n/)
    .map(habilidade => habilidade.trim())
    .filter(Boolean);
  const imagem = $('personagem-imagem').value.trim();
  const tipo = $('personagem-tipo').value;

  if (!nome || !classe) return;

  const personagem = {
    id: personagemEditandoId || id(),
    titulo: nome,
    classe,
    classeBase,
    origem: $('personagem-origem').value.trim(),
    nex,
    estagio: classeBase === 'sobrevivente' ? estagio : null,
    regras: 'ordem-v1.3-adaptado',
    historia,
    habilidades,
    imagem,
    atributos,
    pericias,
    pv,
    pe,
    san,
    defesa,
    pvAtual: Math.min(Number(fichaExistente?.pvAtual ?? pv), pv),
    peAtual: Math.min(Number(fichaExistente?.peAtual ?? pe), pe),
    sanAtual: Math.min(Number(fichaExistente?.sanAtual ?? san), san),
    relacao: Math.max(0, Number(fichaExistente?.relacao) || 0),
    ataques: fichaExistente?.ataques || [],
    inventario: fichaExistente?.inventario || [],
    tipo
  };

  if (campanhaCompartilhada.papel === 'mestre') {
    try {
      await salvarFichaCompartilhada(personagem);
    } catch (erro) {
      console.error('Não foi possível salvar a ficha compartilhada.', erro);
      alert('Não foi possível salvar a ficha na campanha. Verifique a conexão e as regras do Firestore.');
      return;
    }
  } else {
    const registros = carregar('personagens');
    const indiceExistente = registros.findIndex(item => item.id === personagem.id);
    if (indiceExistente >= 0) registros[indiceExistente] = personagem;
    else registros.push(personagem);

    if (!salvar('personagens', registros)) return;
    garantirCodigosSessoes();
    mostrarRegistros('personagens', 'lista-personagens');
  }

  atualizarPainelMestre();
  $('form-personagem').reset();
  atualizarCampoClassePersonalizada();
  personagemEditandoId = null;
  $('form-personagem').querySelector('[type="submit"]').textContent =
    '+  CRIAR PERSONAGEM';
  $('cancelar-edicao-personagem').hidden = true;
  atualizarTotal();
  prepararCamposProgressao();
  abrirFicha(personagem.id);
};

$('cancelar-edicao-personagem').onclick = () => {
  $('form-personagem').reset();
  atualizarCampoClassePersonalizada();
  personagemEditandoId = null;
  $('form-personagem').querySelector('[type="submit"]').textContent =
    '+  CRIAR PERSONAGEM';
  $('cancelar-edicao-personagem').hidden = true;
  atualizarTotal();
  prepararCamposProgressao();
};

/* ==========================================
   DADOS 3D DOS ATRIBUTOS
========================================== */

let rolagemFichaAtiva = false;

function atributoFichaPorSigla(sigla) {
  return {
    AGL: 'agl',
    FOR: 'for',
    INT: 'int',
    CAR: 'car',
    PEC: 'pec',
    PRE: 'pre',
    VIG: 'vig'
  }[sigla];
}

function criarIconePequenoDado() {
  const namespace = 'http://www.w3.org/2000/svg';
  const icone = document.createElementNS(namespace, 'svg');
  icone.setAttribute('viewBox', '0 0 32 32');
  icone.setAttribute('aria-hidden', 'true');
  icone.classList.add('skill-die-icon');

  const forma = document.createElementNS(namespace, 'path');
  forma.setAttribute('d', 'M9 2.8h14l7 12.2-7 12.2H9L2 15z');
  forma.setAttribute('class', 'skill-die-face');
  icone.appendChild(forma);

  [[16, 9], [11, 15], [21, 15], [16, 21]].forEach(([x, y]) => {
    const ponto = document.createElementNS(namespace, 'circle');
    ponto.setAttribute('cx', x);
    ponto.setAttribute('cy', y);
    ponto.setAttribute('r', '1.7');
    ponto.setAttribute('class', 'skill-die-dot');
    icone.appendChild(ponto);
  });

  return icone;
}

async function rolarTesteFicha(atributo, bonusTreinamento = 0, pericia = '') {
  if (rolagemFichaAtiva) return;

  const valorAtributo = Math.max(0, Math.min(10, Math.floor(
    Number(atributo.valor) || 0
  )));
  const quantidadeDados = valorAtributo || 2;
  const resultados = Array.from({ length: quantidadeDados }, () => rolarDado(20));
  const indiceEscolhido = resultados.reduce((melhorIndice, valor, indice) => {
    if (valorAtributo === 0) {
      return valor < resultados[melhorIndice] ? indice : melhorIndice;
    }
    return valor > resultados[melhorIndice] ? indice : melhorIndice;
  }, 0);
  const dadoEscolhido = resultados[indiceEscolhido];
  const total = dadoEscolhido + bonusTreinamento;
  const saida = $('ficha-resultado-dados');
  const botoes = document.querySelectorAll(
    '#ficha-atributos .attribute-die, #ficha-pericias .skill-row'
  );
  const descricao = pericia || atributo.nome;

  rolagemFichaAtiva = true;
  botoes.forEach(botao => { botao.disabled = true; });
  saida.classList.remove('has-result');
  saida.replaceChildren();

  const titulo = document.createElement('strong');
  titulo.className = 'sheet-dice-result-title';
  titulo.textContent = `Teste de ${descricao}`;

  const detalhe = document.createElement('span');
  detalhe.className = 'sheet-dice-result-detail';
  detalhe.textContent = 'Calculando resultado...';

  const totalResultado = document.createElement('strong');
  totalResultado.className = 'sheet-dice-result-total';
  totalResultado.textContent = '...';
  totalResultado.setAttribute('aria-label', 'Total');
  saida.append(titulo, detalhe, totalResultado);

  somDadosRPG(quantidadeDados);
  await new Promise(resolve =>
    window.setTimeout(resolve, MOVIMENTO_REDUZIDO ? 120 : DURACAO_ROLAGEM_DADOS + 150)
  );

  detalhe.textContent =
    `${atributo.sigla} ${valorAtributo} · D20 [${resultados.join(', ')}]` +
    ` · ${valorAtributo === 0 ? 'menor' : 'maior'} ${dadoEscolhido}` +
    (pericia ? ` + treino ${bonusTreinamento}` : '');
  totalResultado.textContent = String(total);
  saida.classList.add('has-result');
  botoes.forEach(botao => { botao.disabled = false; });
  rolagemFichaAtiva = false;
}

function desenharAtributos3D(atributos = {}, fichaLegada = false) {
  const area = document.getElementById('ficha-atributos');

  if (!area) return;

  area.replaceChildren();

  const lista = (fichaLegada ? atributosInfoLegado : atributosInfo).map(([chave, nome, sigla]) => ({
    nome, sigla, chave
  }));

  lista.forEach(atributo => {
    const dado = document.createElement('button');
    dado.type = 'button';
    dado.className = `attribute-die die-${atributo.chave}`;
    dado.setAttribute('aria-label', `Rolar teste de ${atributo.nome}`);

    const faceta = document.createElement('span');
    faceta.className = 'facet';
    faceta.setAttribute('aria-hidden', 'true');

    const numero = document.createElement('span');
    numero.className = 'value';
    numero.textContent = atributos[atributo.chave] ?? 0;
    const valor = Number(atributos[atributo.chave]) || 0;

    const nome = document.createElement('span');
    nome.className = 'name';
    nome.textContent = atributo.nome;

    const sigla = document.createElement('span');
    sigla.className = 'abbr';
    sigla.textContent = atributo.sigla;

    dado.append(faceta, numero, nome, sigla);
    dado.addEventListener('click', () => rolarTesteFicha({
      nome: atributo.nome,
      sigla: atributo.sigla,
      valor
    }));
    area.appendChild(dado);
  });
}

/* ==========================================
   ABRIR FICHA RPG
========================================== */

let telaAnteriorFicha = 'tela-personagens';

function preencherResumoFicha(ficha, somenteLeitura) {
  $('ficha-progressao').textContent = fichaUsaRegrasAntigas(ficha)
    ? 'REGRAS ANTIGAS'
    : ficha.classeBase === 'sobrevivente'
      ? 'ESTÁGIO ' + (ficha.estagio || 1)
      : 'NEX ' + nexFicha(ficha) + '%';
  $('ficha-origem').textContent = ficha.origem ? 'ORIGEM · ' + ficha.origem : 'ORIGEM NÃO REGISTRADA';
  $('ficha-edicao').textContent = somenteLeitura ? 'SOMENTE LEITURA' : 'EDIÇÃO PERMITIDA';
  $('ficha-edicao').classList.toggle('is-readonly', somenteLeitura);
  ['pv','pe','san'].forEach(chave => {
    const max = Number(ficha[chave]);
    const atual = Number(ficha[chave+'Atual'] ?? ficha[chave]);
    $('ficha-resumo-'+chave).textContent =
      Number.isFinite(max) && Number.isFinite(atual) ? atual + ' / ' + max : '—';
  });
  $('ficha-resumo-defesa').textContent = String(ficha.defesa ?? '—');
  const area = $('ficha-resumo-atributos');
  area.replaceChildren();
  (fichaUsaRegrasAntigas(ficha) ? atributosInfoLegado : atributosInfo).forEach(([chave,nome,sigla])=>{
    const chip=document.createElement('span');
    chip.className='sheet-overview-attribute';
    chip.title=nome;
    const rotulo=document.createElement('small');
    rotulo.textContent=sigla;
    const valor=document.createElement('strong');
    valor.textContent=String(ficha.atributos?.[chave] ?? '—');
    chip.append(rotulo,valor);
    area.append(chip);
  });
  const habilidades=Array.isArray(ficha.habilidades) ? ficha.habilidades :
    typeof ficha.habilidades==='string' ? ficha.habilidades.split(/\r?\n/).filter(Boolean) : [];
  $('ficha-resumo-habilidades').textContent=String(habilidades.length);
  $('ficha-resumo-itens').textContent=String(Array.isArray(ficha.inventario) ? ficha.inventario.length : 0);
  $('ficha-resumo-ataques').textContent=String(Array.isArray(ficha.ataques) ? ficha.ataques.length : 0);
}
document.querySelectorAll('[data-ficha-atalho]').forEach(botao => {
  botao.addEventListener('click',()=>{
    selecionarAba(botao.dataset.fichaAtalho);
    document.querySelector('#tela-ficha .sheet-tabs')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
});

function abrirFicha(idFicha) {
  const abaDeRetorno = !$('tela-ficha').hidden && personagemAberto === idFicha
    ? document.querySelector('#tela-ficha .sheet-tab.active')?.dataset.aba || 'resumo'
    : 'resumo';
  const telaAnterior = document.querySelector('.app-pagina:not([hidden])');
  if (telaAnterior && telaAnterior.id !== 'tela-ficha') telaAnteriorFicha = telaAnterior.id;
  $('voltar-personagens').textContent = telaAnteriorFicha === 'tela-mestre'
    ? '← VOLTAR AO DOSSIÊ DOS JOGADORES'
    : telaAnteriorFicha === 'tela-sessao'
      ? '← VOLTAR À MESA'
      : '← VOLTAR AOS PERSONAGENS';
  personagemAberto = idFicha;

  const personagem = campanhaCompartilhada.fichas.find(item => item.id === idFicha) ||
    carregar('personagens').find(item => item.id === idFicha);

  if (!personagem) return;
  const somenteLeitura =
    campanhaCompartilhada.fichas.some(item => item.id === idFicha) &&
    campanhaCompartilhada.papel !== 'mestre';
  if ($('ficha-nex-atual')) {
    $('ficha-nex-atual').textContent = personagem.classeBase === 'sobrevivente'
      ? `0% · estágio ${personagem.estagio || 1}`
      : `${nexFicha(personagem)}%`;
  }

  $('form-ataque').hidden = somenteLeitura;
  $('form-inventario').hidden = somenteLeitura;
  ['pv-atual', 'pe-atual', 'san-atual'].forEach(id => {
    $(id).disabled = somenteLeitura;
  });
  $('relacao-diminuir').disabled =
    somenteLeitura || Number(personagem.relacao) <= 0;
  $('relacao-aumentar').disabled = somenteLeitura;
  $('relacao-atual').textContent = String(
    Math.max(0, Number(personagem.relacao) || 0)
  );

  $('ficha-nome').textContent = personagem.titulo;
  $('ficha-defesa').textContent = String(personagem.defesa ?? 15);
  $('ficha-classe').textContent = fichaUsaRegrasAntigas(personagem)
    ? (personagem.classe || 'Investigador') + ' · regras antigas'
    : (personagem.classe || 'Investigador') + ' · ' +
      ({ combatente:'Combatente', especialista:'Especialista', ocultista:'Ocultista', sobrevivente:'Sobrevivente' }[personagem.classeBase] || 'Especialista') +
      (personagem.origem ? ' · origem: ' + personagem.origem : '');

  const retrato = $('ficha-retrato');
  retrato.replaceChildren();

  if (
    personagem.imagem &&
    /^https?:\/\//i.test(personagem.imagem)
  ) {
    const imagem = document.createElement('img');

    imagem.src = personagem.imagem;
    imagem.alt = 'Retrato do investigador';
    imagem.onerror = () => {
      retrato.textContent = '◈';
    };

    retrato.append(imagem);
  } else {
    retrato.textContent = '◈';
  }

  [
    ['pv', 'pvAtual'],
    ['pe', 'peAtual'],
    ['san', 'sanAtual']
  ].forEach(([chave, atualChave]) => {
    const maximo = Number(
      personagem[chave] ?? (chave === 'pv' ? 20 : 3)
    );

    const atual = Number(
      personagem[atualChave] ?? maximo
    );

    const valor = Math.max(0, Math.min(maximo, atual));

    $(chave + '-max').textContent = maximo;
    $(chave + '-atual').max = maximo;
    $(chave + '-atual').value = valor;

    $(chave + '-bar').style.width =
      (maximo ? Math.max(0, Math.min(100, atual / maximo * 100)) : 0) + '%';
  });

  // AQUI OS DADOS 3D SÃO CRIADOS
  desenharAtributos3D(personagem.atributos || {}, fichaUsaRegrasAntigas(personagem));

  const areaPericias = $('ficha-pericias');
  areaPericias.replaceChildren();

  (fichaUsaRegrasAntigas(personagem) ? periciasRPGLegado : periciasRPG).forEach(([nome, atributo]) => {
    const linha = document.createElement('div');
    linha.className = 'skill-row';

    const rolarPericia = document.createElement('button');
    rolarPericia.type = 'button';
    rolarPericia.className = 'skill-roll-button';
    rolarPericia.setAttribute('aria-label', `Rolar teste de ${nome}`);

    const grupo = document.createElement('span');
    grupo.className = 'skill-row-label';
    const topo = document.createElement('span');
    topo.className = 'skill-row-title';

    const titulo = document.createElement('strong');
    titulo.textContent = nome;
    topo.append(titulo, criarIconePequenoDado());

    const subtitulo = document.createElement('small');
    subtitulo.textContent = atributo;

    grupo.append(topo, subtitulo);
    rolarPericia.append(grupo);

    let valorTreinamento = Number(personagem.pericias?.[nome]) || 0;
    const bonus = document.createElement('span');
    bonus.className = 'skill-bonus';
    bonus.textContent = '+' + valorTreinamento;

    const nivel = document.createElement('small');
    nivel.className = 'skill-training-grade';
    nivel.textContent = nomeTreinamento(valorTreinamento);

    const valorExibido = document.createElement('span');
    valorExibido.className = 'skill-bonus-value';
    valorExibido.append(bonus, nivel);

    const controles = document.createElement('span');
    controles.className = 'skill-point-controls';

    const diminuir = document.createElement('button');
    diminuir.type = 'button';
    diminuir.className = 'skill-point-button';
    diminuir.textContent = '−';
    diminuir.setAttribute('aria-label', `Remover 5 pontos de ${nome}`);
    diminuir.disabled = somenteLeitura || valorTreinamento <= 0;

    const aumentar = document.createElement('button');
    aumentar.type = 'button';
    aumentar.className = 'skill-point-button';
    aumentar.textContent = '+';
    aumentar.setAttribute('aria-label', `Adicionar 5 pontos a ${nome}`);
    aumentar.dataset.trainingBonus = String(valorTreinamento);
    aumentar.dataset.readOnly = String(somenteLeitura);

    const ajustarTreinamento = variacao => {
      const novoValor = Math.max(
        0,
        Math.min(bonusMaximoTreinamento(nexFicha(personagem)), valorTreinamento + variacao)
      );
      if (somenteLeitura || novoValor === valorTreinamento) return;
      if (!fichaUsaRegrasAntigas(personagem) && valorTreinamento === 0 && novoValor > 0) {
        const total = Object.values(personagem.pericias || {}).filter(valor => Number(valor) >= 5).length;
        const limite = limitePericiasDisponiveis(personagem.classeBase, personagem.atributos?.int, personagem.origem);
        if (total >= limite) {
          alert('Limite de perícias treinadas da classe atingido. Verifique as perícias adicionais recebidas pela origem com o mestre.');
          return;
        }
      }

      atualizarPersonagem(registro => {
        registro.pericias = {
          ...registro.pericias,
          [nome]: novoValor
        };
      });

      valorTreinamento = novoValor;
      bonus.textContent = '+' + valorTreinamento;
      nivel.textContent = nomeTreinamento(valorTreinamento);
      aumentar.dataset.trainingBonus = String(valorTreinamento);
      diminuir.disabled = valorTreinamento <= 0;
      atualizarLimitesTreinamento(nexFicha(personagem));
    };

    diminuir.addEventListener('click', () => ajustarTreinamento(-5));
    aumentar.addEventListener('click', () => ajustarTreinamento(5));

    controles.append(diminuir, valorExibido, aumentar);
    linha.append(rolarPericia, controles);
    rolarPericia.addEventListener('click', () => rolarTesteFicha({
      nome: atributo,
      sigla: atributo,
      valor: personagem.atributos?.[atributoFichaPorSigla(atributo)]
    }, valorTreinamento, nome));
    areaPericias.append(linha);
  });
  atualizarLimitesTreinamento(nexFicha(personagem));

  mostrarInventario(personagem);

  $('ficha-historia').textContent =
    personagem.historia || 'História ainda não registrada.';
  renderizarHabilidades(personagem.habilidades);

  mostrarAtaques(personagem);
  preencherResumoFicha(personagem,somenteLeitura);
  selecionarAba(abaDeRetorno);
  abrirTela('tela-ficha');
}

function renderizarHabilidades(habilidades) {
  const area = $('ficha-habilidades');
  area.replaceChildren();

  const lista = Array.isArray(habilidades)
    ? habilidades
    : typeof habilidades === 'string'
      ? habilidades.split(/\r?\n/)
      : [];
  const habilidadesValidas = lista
    .map(habilidade => String(habilidade).trim())
    .filter(Boolean);

  if (!habilidadesValidas.length) {
    const vazio = document.createElement('p');
    vazio.className = 'special-abilities-empty';
    vazio.textContent = 'Nenhuma habilidade especial cadastrada.';
    area.append(vazio);
    return;
  }

  habilidadesValidas.forEach((habilidade, indice) => {
    const cartao = document.createElement('article');
    cartao.className = 'special-ability-card';

    const numero = document.createElement('span');
    numero.className = 'special-ability-number';
    numero.textContent = String(indice + 1).padStart(2, '0');

    const descricao = document.createElement('p');
    descricao.textContent = habilidade;
    cartao.append(numero, descricao);
    area.append(cartao);
  });
}

/* ==========================================
   ATUALIZAR PV, PE E SAN
========================================== */

function atualizarPersonagem(funcao) {
  const registros = carregar('personagens');

  const personagem = campanhaCompartilhada.fichas.find(item => item.id === personagemAberto) ||
    registros.find(item => item.id === personagemAberto);

  if (!personagem) return;
  if (
    campanhaCompartilhada.fichas.includes(personagem) &&
    campanhaCompartilhada.papel !== 'mestre'
  ) return;

  funcao(personagem);

  if (campanhaCompartilhada.fichas.includes(personagem)) {
    salvarFichaCompartilhada(personagem).catch(erro => {
      console.error('Não foi possível atualizar a ficha compartilhada.', erro);
      alert('A ficha não foi atualizada na campanha. Verifique a conexão.');
    });
  } else {
    if (salvar('personagens', registros)) {
      atualizarPainelMestre();
    }
  }
}

[
  ['pv', 'pvAtual'],
  ['pe', 'peAtual'],
  ['san', 'sanAtual']
].forEach(([chave, atualChave]) => {
  $(chave + '-atual').addEventListener('change', () => {
    const input = $(chave + '-atual');
    const maximo = Number($(chave + '-max').textContent);

    const numero = Math.max(
      0,
      Math.min(maximo, Number(input.value) || 0)
    );

    input.value = numero;
    if ($('ficha-resumo-' + chave)) $('ficha-resumo-' + chave).textContent = numero + ' / ' + maximo;

    $(chave + '-bar').style.width =
      (maximo ? numero / maximo * 100 : 0) + '%';

    atualizarPersonagem(personagem => {
      personagem[atualChave] = numero;
    });
  });
});

$('relacao-diminuir').addEventListener('click', () => {
  atualizarPersonagem(personagem => {
    personagem.relacao = Math.max(0, (Number(personagem.relacao) || 0) - 1);
    $('relacao-atual').textContent = String(personagem.relacao);
    $('relacao-diminuir').disabled = personagem.relacao === 0;
  });
});

$('relacao-aumentar').addEventListener('click', () => {
  atualizarPersonagem(personagem => {
    personagem.relacao = Math.max(0, Number(personagem.relacao) || 0) + 1;
    $('relacao-atual').textContent = String(personagem.relacao);
    $('relacao-diminuir').disabled = false;
  });
});

/* ==========================================
   ABAS DA FICHA
========================================== */

function selecionarAba(aba) {
  document.querySelectorAll('.sheet-tab').forEach(botao => {
    const selecionada = botao.dataset.aba === aba;
    botao.classList.toggle('active', selecionada);
    botao.setAttribute('aria-selected', String(selecionada));
    botao.tabIndex = selecionada ? 0 : -1;
  });

  document.querySelectorAll('.sheet-page').forEach(pagina => {
    pagina.hidden = pagina.id !== `aba-${aba}`;
  });
}

document.querySelectorAll('.sheet-tab').forEach(botao => {
  botao.onclick = () => selecionarAba(botao.dataset.aba);
  botao.addEventListener('keydown', evento => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    const abas = [...document.querySelectorAll('.sheet-tab')];
    const indice = abas.indexOf(botao);
    const destino = evento.key === 'Home'
      ? abas[0]
      : evento.key === 'End'
        ? abas[abas.length - 1]
        : abas[(indice + (evento.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length];
    selecionarAba(destino.dataset.aba);
    destino.focus();
  });
});

/* ==========================================
   ATAQUES
========================================== */

function mostrarAtaques(personagem) {
  const area = $('lista-ataques');
  area.replaceChildren();

  const ataques = Array.isArray(personagem.ataques)
    ? personagem.ataques
    : [];

  if (!ataques.length) {
    const mensagem = document.createElement('p');
    mensagem.className = 'muted';
    mensagem.textContent = 'Nenhum ataque registrado.';
    area.append(mensagem);
  }

  ataques.forEach((ataque, indice) => {
    const cartao = document.createElement('div');
    cartao.className = 'attack-card';

    const nome = document.createElement('strong');
    nome.textContent = ataque.nome;

    const detalhes = document.createElement('small');
    detalhes.textContent =
      `Dano: ${ataque.dano} · Crítico: ${ataque.critico}`;

    cartao.append(nome, detalhes);
    if (
      !campanhaCompartilhada.fichas.some(item => item.id === personagemAberto) ||
      campanhaCompartilhada.papel === 'mestre'
    ) {
      cartao.append(botao('Remover', () => {
        atualizarPersonagem(personagem => {
          personagem.ataques.splice(indice, 1);
        });

        abrirFicha(personagemAberto);
      }));
    }

    area.append(cartao);
  });
}

$('form-ataque').onsubmit = e => {
  e.preventDefault();

  const nome = $('ataque-nome').value.trim();
  const dano = $('ataque-dano').value.trim();
  const critico = $('ataque-critico').value.trim();

  if (!nome || !dano || !critico) return;

  atualizarPersonagem(personagem => {
    if (!Array.isArray(personagem.ataques)) {
      personagem.ataques = [];
    }

    personagem.ataques.push({
      nome,
      dano,
      critico
    });
  });

  $('form-ataque').reset();
  abrirFicha(personagemAberto);
};

/* ==========================================
   INVENTÁRIO
========================================== */

function mostrarInventario(personagem) {
  const area = $('lista-inventario');
  area.replaceChildren();

  const itens = Array.isArray(personagem.inventario)
    ? personagem.inventario
    : [];

  if (!itens.length) {
    const mensagem = document.createElement('p');
    mensagem.className = 'muted';
    mensagem.textContent = 'Nenhum item no inventário.';
    area.append(mensagem);
    return;
  }

  itens.forEach((item, indice) => {
    const cartao = document.createElement('article');
    cartao.className = 'inventory-item';

    const detalhes = document.createElement('div');
    const nome = document.createElement('strong');
    nome.textContent = item.nome;

    const quantidade = document.createElement('span');
    quantidade.className = 'inventory-quantity';
    quantidade.textContent = `Quantidade: ${item.quantidade}`;
    detalhes.append(nome, quantidade);

    if (item.observacoes) {
      const observacoes = document.createElement('p');
      observacoes.textContent = item.observacoes;
      detalhes.append(observacoes);
    }

    cartao.append(detalhes);
    if (
      !campanhaCompartilhada.fichas.some(item => item.id === personagemAberto) ||
      campanhaCompartilhada.papel === 'mestre'
    ) {
      cartao.append(botao('REMOVER', () => {
        atualizarPersonagem(personagemAtual => {
          if (!Array.isArray(personagemAtual.inventario)) {
            personagemAtual.inventario = [];
          }

          personagemAtual.inventario.splice(indice, 1);
        });

        abrirFicha(personagemAberto);
        selecionarAba('inventario');
      }));
    }

    area.append(cartao);
  });
}

$('form-inventario').onsubmit = e => {
  e.preventDefault();

  const nome = $('item-nome').value.trim();
  const quantidade = Number($('item-quantidade').value);
  const observacoes = $('item-observacoes').value.trim();

  if (!nome || !Number.isInteger(quantidade) || quantidade < 1) {
    alert('Informe o nome do item e uma quantidade inteira maior que zero.');
    return;
  }

  atualizarPersonagem(personagem => {
    if (!Array.isArray(personagem.inventario)) {
      personagem.inventario = [];
    }

    personagem.inventario.push({ nome, quantidade, observacoes });
  });

  $('form-inventario').reset();
  $('item-quantidade').value = 1;
  abrirFicha(personagemAberto);
  selecionarAba('inventario');
};

/* ==========================================
   CASOS
========================================== */

$('form-caso').onsubmit = e => {
  e.preventDefault();

  const titulo = $('caso-titulo').value.trim();
  const descricao = $('caso-descricao').value.trim();

  if (!titulo || !descricao) return;

  const registros = carregar('casos');

  registros.push({
    id: id(),
    titulo,
    descricao
  });

  if (salvar('casos', registros)) {
    $('form-caso').reset();
    mostrarRegistros('casos', 'lista-casos');
  }
};

/* ==========================================
   ANOTAÇÕES
========================================== */

$('form-anotacao').onsubmit = e => {
  e.preventDefault();

  const descricao = $('anotacao-texto').value.trim();

  if (!descricao) return;

  const registros = carregar('anotacoes');

  registros.push({
    id: id(),
    titulo: 'Anotação · ' + new Date().toLocaleString('pt-BR'),
    descricao
  });

  if (salvar('anotacoes', registros)) {
    $('form-anotacao').reset();
    mostrarRegistros('anotacoes', 'lista-anotacoes');
    atualizarPainelMestre();
  }
};

/* ==========================================
   ÁREA DO MESTRE
========================================== */

function mostrarCampanha() {
  const campanha = carregar('campanha')[0];

  $('campanha-nome').value = campanha?.titulo || '';
  $('campanha-descricao').value = campanha?.descricao || '';
  $('campanha-status').textContent = campanha
    ? 'Campanha salva neste perfil.'
    : '';
}

function fichasDaMesa() {
  const fichas = new Map();
  carregar('personagens').forEach(ficha => fichas.set(ficha.id, ficha));
  campanhaCompartilhada.fichas.forEach(ficha => fichas.set(ficha.id, ficha));
  return Array.from(fichas.values());
}

function criarRetratoMestre(ficha, classe = 'master-portrait') {
  const retrato = document.createElement('div');
  retrato.className = classe;

  if (ficha.imagem && /^https?:\/\//i.test(ficha.imagem)) {
    const imagem = document.createElement('img');
    imagem.src = ficha.imagem;
    imagem.alt = `Retrato de ${ficha.titulo || 'personagem'}`;
    imagem.loading = 'lazy';
    imagem.onerror = () => {
      retrato.replaceChildren();
      retrato.textContent = '♙';
    };
    retrato.append(imagem);
  } else {
    retrato.textContent = '♙';
  }

  return retrato;
}

function renderizarVisaoMesa() {
  const area = $('visao-mesa-personagens');
  area.replaceChildren();
  const personagens = fichasDaMesa().filter(ficha => ficha.tipo !== 'npc');

  if (!personagens.length) {
    const vazio = document.createElement('p');
    vazio.className = 'master-empty';
    vazio.textContent = 'As fichas dos investigadores aparecerão aqui.';
    area.append(vazio);
  } else {
    personagens.forEach(ficha => {
      const cartao = document.createElement('article');
      cartao.className = 'master-character-card';
      cartao.append(criarRetratoMestre(ficha));

      const nome = document.createElement('strong');
      nome.textContent = ficha.titulo || 'Investigador';
      const classe = document.createElement('span');
      classe.className = 'master-character-class';
      classe.textContent = ficha.classe || 'Investigador';
      const vida = document.createElement('span');
      vida.className = 'master-character-life';
      vida.textContent =
        `♥ ${ficha.pvAtual ?? ficha.pv ?? 20}/${ficha.pv ?? 20}`;

      const abrir = botao('ABRIR FICHA', () => abrirFicha(ficha.id), 'master-character-open');
      cartao.append(nome, classe, vida, abrir);
      area.append(cartao);
    });
  }

  const adicionar = document.createElement('button');
  adicionar.type = 'button';
  adicionar.className = 'master-add-character-tile';
  const simbolo = document.createElement('span');
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.textContent = '+';
  const rotulo = document.createElement('span');
  rotulo.textContent = 'Adicionar personagem';
  adicionar.append(simbolo, rotulo);
  adicionar.onclick = () => {
    abrirTela('tela-personagens');
    $('personagem-tipo').value = 'pj';
    $('form-personagem').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  area.append(adicionar);
}

function renderizarPainelNpcs() {
  const area = $('painel-npcs');
  area.replaceChildren();
  const npcs = fichasDaMesa().filter(ficha => ficha.tipo === 'npc');

  if (!npcs.length) {
    const vazio = document.createElement('p');
    vazio.className = 'master-empty';
    vazio.textContent = 'Nenhum NPC cadastrado nesta campanha.';
    area.append(vazio);
    return;
  }

  npcs.forEach(ficha => {
    const cartao = document.createElement('article');
    cartao.className = 'master-npc-row';
    cartao.append(criarRetratoMestre(ficha, 'master-npc-portrait'));

    const detalhes = document.createElement('div');
    const nome = document.createElement('strong');
    nome.textContent = ficha.titulo || 'NPC sem nome';
    const classe = document.createElement('small');
    classe.textContent = ficha.classe || 'Personagem não jogador';
    detalhes.append(nome, classe);

    const abrir = botao('ABRIR', () => abrirFicha(ficha.id), 'master-npc-open');
    cartao.append(detalhes, abrir);
    area.append(cartao);
  });
}

function renderizarAnotacoesMestra() {
  const area = $('painel-anotacoes');
  area.replaceChildren();
  const anotacoes = carregar('anotacoes').slice(-4).reverse();

  if (!anotacoes.length) {
    const vazio = document.createElement('p');
    vazio.className = 'master-empty';
    vazio.textContent = 'Suas pistas e ideias aparecerão aqui.';
    area.append(vazio);
    return;
  }

  anotacoes.forEach(anotacao => {
    const item = document.createElement('p');
    item.className = 'master-note-item';
    item.textContent = anotacao.descricao || anotacao.titulo || 'Anotação';
    area.append(item);
  });
}

function renderizarSeletorSessao() {
  const seletor = $('sessao-atual-seletor');
  const selecionada = seletor.value;
  const sessoes = carregar('sessoes');
  seletor.replaceChildren(new Option('Mesa livre · sem sessão cadastrada', ''));

  sessoes.forEach(sessao => {
    const status = sessao.status === 'andamento'
      ? 'Em andamento'
      : sessao.status === 'concluida'
        ? 'Concluída'
        : 'Planejada';
    seletor.append(new Option(
      `${sessao.codigo || 'Sem código'} · ${sessao.titulo || 'Sessão sem título'} · ${status}`,
      sessao.id
    ));
  });

  const proximaSelecionada = sessoes.some(sessao => sessao.id === selecionada)
    ? selecionada
    : (sessoes.find(sessao => sessao.status === 'andamento') || sessoes[0])?.id || '';
  seletor.value = proximaSelecionada;
  const sessaoAtual = sessoes.find(sessao => sessao.id === proximaSelecionada);
  const codigoAtual = $('sessao-codigo-atual');
  codigoAtual.hidden = !sessaoAtual;
  codigoAtual.textContent = sessaoAtual
    ? `CÓDIGO DA SESSÃO · ${sessaoAtual.codigo || 'INDISPONÍVEL'}`
    : '';
  $('iniciar-sessao-atual').disabled = false;
}

function renderizarOrdemIniciativa() {
  const lista = $('ordem-iniciativa');
  const personagens = fichasDaMesa();
  const rolar = $('rolar-iniciativa');
  lista.replaceChildren();
  rolar.disabled = personagens.length === 0;

  if (!personagens.length) {
    const vazio = document.createElement('li');
    vazio.className = 'master-empty';
    vazio.textContent = 'Crie ou compartilhe personagens para rolar a iniciativa.';
    lista.append(vazio);
    return;
  }

  if (!resultadosIniciativa) {
    const vazio = document.createElement('li');
    vazio.className = 'master-empty';
    vazio.textContent = 'A ordem aparecerá aqui depois da rolagem.';
    lista.append(vazio);
    return;
  }

  const fichasAtuais = new Map(personagens.map(personagem => [personagem.id, personagem]));
  resultadosIniciativa = resultadosIniciativa.filter(resultado =>
    fichasAtuais.has(resultado.id)
  );

  if (!resultadosIniciativa.length) {
    resultadosIniciativa = null;
    renderizarOrdemIniciativa();
    return;
  }

  resultadosIniciativa.forEach((resultado, indice) => {
    const linha = document.createElement('li');
    linha.className = 'initiative-result';

    const posicao = document.createElement('span');
    posicao.className = 'initiative-position';
    posicao.textContent = String(indice + 1).padStart(2, '0');

    const nome = document.createElement('strong');
    nome.textContent = resultado.nome;

    const conta = document.createElement('span');
    conta.className = 'initiative-calculation';
    conta.textContent =
      `AGL ${resultado.atributo ?? 1} · D20 [${(resultado.dados || [resultado.dado]).join(', ')}] ` +
      `→ ${resultado.dado} ${resultado.bonus >= 0 ? '+' : '−'} ${Math.abs(resultado.bonus)} = ${resultado.total}`;

    linha.append(posicao, nome, conta);
    lista.append(linha);
  });
}

let fichaMestreSelecionadaId = null;

function renderizarFichasJogadoresMestre() {
  const lista = $('master-players-list');
  const detalhe = $('master-dossier-detail');
  const campoBusca = $('master-players-search');
  const contador = $('master-players-count');
  if (!lista || !detalhe || !campoBusca || !contador) return;

  const busca = campoBusca.value.trim().toLocaleLowerCase('pt-BR');
  const fichas = fichasDaMesa()
    .filter(ficha => ficha.tipo !== 'npc')
    .sort((a, b) => String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR'));
  const encontradas = fichas.filter(ficha =>
    (String(ficha.titulo || '') + ' ' + String(ficha.classe || '')).toLocaleLowerCase('pt-BR').includes(busca)
  );

  const criar = (tag, classe, texto) => {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = String(texto);
    return elemento;
  };

  contador.textContent = encontradas.length + ' de ' + fichas.length +
    ' investigador' + (fichas.length === 1 ? '' : 'es');
  lista.replaceChildren();
  detalhe.replaceChildren();

  if (!encontradas.length) {
    const mensagem = fichas.length
      ? 'Nenhum investigador corresponde à busca.'
      : 'Nenhuma ficha encontrada. Crie um personagem ou compartilhe as fichas da campanha para consultá-las aqui.';
    lista.append(criar('p', 'master-dossier-sidebar-empty', fichas.length ? 'Sem resultados' : 'Nenhum jogador ainda'));
    detalhe.append(criar('p', 'master-players-empty', mensagem));
    return;
  }

  if (!encontradas.some(ficha => ficha.id === fichaMestreSelecionadaId)) {
    fichaMestreSelecionadaId = encontradas[0].id;
  }

  encontradas.forEach(ficha => {
    const selecionada = ficha.id === fichaMestreSelecionadaId;
    const botaoJogador = criar('button', 'master-dossier-player' + (selecionada ? ' is-selected' : ''));
    botaoJogador.type = 'button';
    botaoJogador.setAttribute('aria-pressed', String(selecionada));
    botaoJogador.append(criarRetratoMestre(ficha, 'master-dossier-thumb'));
    const textos = criar('span', 'master-dossier-player-text');
    textos.append(
      criar('strong', '', ficha.titulo || 'Investigador'),
      criar('small', '', ficha.classe || 'Investigador')
    );
    const vida = ficha.pvAtual ?? ficha.pv;
    const pvMax = ficha.pv;
    if (vida !== undefined && pvMax !== undefined) {
      textos.append(criar('small', 'master-dossier-player-life', '♥ ' + vida + '/' + pvMax + ' PV'));
    }
    botaoJogador.append(textos, criar('span', 'master-dossier-chevron', '›'));
    botaoJogador.onclick = () => {
      fichaMestreSelecionadaId = ficha.id;
      renderizarFichasJogadoresMestre();
    };
    lista.append(botaoJogador);
  });

  const ficha = encontradas.find(item => item.id === fichaMestreSelecionadaId);
  if (!ficha) return;

  const topo = criar('div', 'master-dossier-hero');
  const retrato = criarRetratoMestre(ficha, 'master-dossier-portrait');
  const identidade = criar('div', 'master-dossier-identity');
  identidade.append(
    criar('span', 'master-dossier-kicker', 'DOSSIÊ DO INVESTIGADOR'),
    criar('h4', '', ficha.titulo || 'Investigador'),
    criar('p', '', (ficha.classe || 'Investigador') + (fichaUsaRegrasAntigas(ficha) ? ' · ficha antiga' : ' · ' + (ficha.classeBase || 'especialista') + ' · ' + (ficha.classeBase === 'sobrevivente' ? 'Estágio ' + (ficha.estagio || 1) : 'NEX ' + nexFicha(ficha) + '%')))
  );
  const defesa = criar('div', 'master-dossier-defense');
  defesa.append(criar('span', '', 'DEFESA'), criar('strong', '', ficha.defesa ?? '—'));
  topo.append(retrato, identidade, defesa);
  detalhe.append(topo);

  const recursos = criar('div', 'master-dossier-resources');
  for (const [rotulo, campo, campoAtual, cor] of [
    ['VIDA', 'pv', 'pvAtual', 'pv'],
    ['SANIDADE', 'san', 'sanAtual', 'san'],
    ['PONTOS DE ESFORÇO', 'pe', 'peAtual', 'pe']
  ]) {
    const maxRaw = ficha[campo];
    const atualRaw = ficha[campoAtual] ?? maxRaw;
    const max = Number(maxRaw);
    const atual = Number(atualRaw);
    const valido = maxRaw !== undefined && Number.isFinite(max) && max >= 0 && Number.isFinite(atual);
    const cartao = criar('div', 'master-dossier-resource resource-' + cor);
    cartao.append(
      criar('span', 'master-dossier-resource-label', rotulo),
      criar('strong', '', valido ? String(atualRaw) + ' / ' + String(maxRaw) : '—')
    );
    const barra = criar('div', 'master-dossier-track');
    const preenchimento = criar('span', '');
    preenchimento.style.width = valido && max > 0
      ? String(Math.max(0, Math.min(100, atual / max * 100))) + '%'
      : '0%';
    barra.append(preenchimento);
    cartao.append(barra);
    recursos.append(cartao);
  }
  detalhe.append(recursos);

  const conteudo = criar('div', 'master-dossier-columns');
  const atributos = criar('section', 'master-dossier-box');
  atributos.append(criar('h5', '', '◈ ATRIBUTOS'));
  const valores = criar('div', 'master-dossier-attributes');
  for (const [chave, nome, sigla] of (fichaUsaRegrasAntigas(ficha) ? atributosInfoLegado : atributosInfo)) {
    const item = criar('div', 'master-dossier-attribute');
    item.append(
      criar('span', '', sigla),
      criar('strong', '', ficha.atributos?.[chave] ?? '—')
    );
    item.title = nome;
    valores.append(item);
  }
  atributos.append(valores);

  const habilidades = criar('section', 'master-dossier-box');
  habilidades.append(criar('h5', '', '✦ HABILIDADES'));
  const listaHabilidades = Array.isArray(ficha.habilidades)
    ? ficha.habilidades
    : typeof ficha.habilidades === 'string'
      ? ficha.habilidades.split(/\r?\n/)
      : [];
  const habilidadesValidas = listaHabilidades.map(item => String(item).trim()).filter(Boolean);
  if (habilidadesValidas.length) {
    const itens = criar('ul', 'master-dossier-mini-list');
    habilidadesValidas.forEach(item => itens.append(criar('li', '', item)));
    habilidades.append(itens);
  } else {
    habilidades.append(criar('p', 'master-dossier-muted', 'Nenhuma habilidade cadastrada.'));
  }

  const inventario = criar('section', 'master-dossier-box master-dossier-inventory');
  inventario.append(criar('h5', '', '▤ INVENTÁRIO'));
  const itensInventario = Array.isArray(ficha.inventario) ? ficha.inventario : [];
  if (itensInventario.length) {
    const itens = criar('ul', 'master-dossier-mini-list');
    itensInventario.forEach(item => {
      const nome = typeof item === 'string' ? item : item?.nome || item?.titulo || 'Item sem nome';
      const quantidade = typeof item === 'object' && item !== null && Number(item.quantidade) > 1
        ? ' ×' + item.quantidade : '';
      itens.append(criar('li', '', String(nome) + quantidade));
    });
    inventario.append(itens);
  } else {
    inventario.append(criar('p', 'master-dossier-muted', 'Nenhum item no inventário.'));
  }
  conteudo.append(atributos, habilidades, inventario);
  detalhe.append(conteudo);

  if (ficha.historia && String(ficha.historia).trim()) {
    const historia = criar('section', 'master-dossier-story');
    historia.append(
      criar('h5', '', 'HISTÓRIA DO PERSONAGEM'),
      criar('p', '', ficha.historia)
    );
    detalhe.append(historia);
  }

  const rodape = criar('div', 'master-dossier-actions');
  const abrir = criar('button', 'primary master-dossier-open', '▤ VER FICHA COMPLETA');
  abrir.type = 'button';
  abrir.onclick = () => abrirFicha(ficha.id);
  rodape.append(abrir);
  detalhe.append(rodape);
}

$('master-players-refresh').onclick = renderizarFichasJogadoresMestre;
$('master-players-search').addEventListener('input', renderizarFichasJogadoresMestre);

function atualizarPainelMestre() {
  if (!$('visao-mesa-personagens')) return;
  if (!$('painel-fichas-personagem').hidden) renderizarGaleriaFichas();
  const fichasUnicas = [...new Map([...carregar('personagens'), ...campanhaCompartilhada.fichas].map(f => [f.id, f])).values()];
  const contadores = {
    'mestre-total-pjs': fichasUnicas.filter(f => f.tipo !== 'npc').length,
    'mestre-total-npcs': fichasUnicas.filter(f => f.tipo === 'npc').length,
    'mestre-total-sessoes': carregar('sessoes').length,
    'mestre-total-casos': carregar('casos').length,
    'mestre-total-objetivos': carregar('objetivos').length
  };
  Object.entries(contadores).forEach(([id, n]) => { if ($(id)) $(id).textContent = String(n); });
  renderizarVisaoMesa();
  renderizarFichasJogadoresMestre();
  renderizarPainelNpcs();
  renderizarAnotacoesMestra();
  renderizarSeletorSessao();
  renderizarOrdemIniciativa();

  try {
    const nexSalvo = Number(localStorage.getItem(chave('nex')));
    const nex = Number.isInteger(nexSalvo) ? Math.max(0, Math.min(100, nexSalvo)) : 0;
    $('nex-valor').value = `${nex}%`;
    $('nex-ajuste').value = String(nex);
    atualizarLimitesTreinamento(nex);
  } catch (erro) {
    console.error('Não foi possível carregar o NEX da mesa.', erro);
    $('sessao-atual-status').textContent =
      'Não foi possível carregar o NEX salvo neste navegador.';
  }
}

function chaveCampanhaCompartilhada() {
  return `arquivo-cinza-${auth.currentUser.uid}-campanha-compartilhada`;
}

function mostrarFichasCompartilhadas(fichas) {
  const area = $('lista-fichas-compartilhadas');
  area.replaceChildren();

  if (!fichas.length) {
    const mensagem = document.createElement('p');
    mensagem.className = 'muted';
    mensagem.textContent = campanhaCompartilhada.codigo
      ? 'Ainda não há fichas compartilhadas nesta campanha.'
      : 'Crie uma campanha ou entre com um código para ver as fichas.';
    area.append(mensagem);
    atualizarPainelMestre();
    return;
  }

  fichas.forEach(ficha => {
    const cartao = document.createElement('article');
    cartao.className = 'registro shared-character';

    const detalhes = document.createElement('div');
    const nome = document.createElement('h3');
    nome.textContent = ficha.titulo || 'Sem nome';

    const tipo = document.createElement('p');
    tipo.className = 'muted';
    tipo.textContent =
      `${ficha.tipo === 'npc' ? 'NPC' : 'PJ'} · ${ficha.classe || 'Investigador'}`;

    detalhes.append(nome, tipo);
    cartao.append(detalhes);

    if (campanhaCompartilhada.papel === 'mestre') {
      cartao.append(botao('EDITAR', () => editarFichaCompartilhada(ficha)));
    }

    cartao.append(botao('ABRIR FICHA', () => abrirFicha(ficha.id)));

    if (campanhaCompartilhada.papel === 'mestre') {
      cartao.append(botao('EXCLUIR', async () => {
        if (!confirm(`Excluir a ficha de ${ficha.titulo || 'Sem nome'}?`)) return;

        try {
          await deleteDoc(doc(
            db,
            'campanhas',
            campanhaCompartilhada.codigo,
            'personagens',
            ficha.id
          ));
          campanhaCompartilhada.fichas =
            campanhaCompartilhada.fichas.filter(item => item.id !== ficha.id);
          mostrarFichasCompartilhadas(campanhaCompartilhada.fichas);
        } catch (erro) {
          console.error('Não foi possível excluir a ficha compartilhada.', erro);
          alert('Não foi possível excluir a ficha. Verifique as regras do Firestore.');
        }
      }));
    }

    area.append(cartao);
  });
  atualizarPainelMestre();
}

function editarFichaCompartilhada(ficha) {
  if (fichaUsaRegrasAntigas(ficha)) {
    alert('Esta ficha usa as regras antigas (CAR/PEC) e foi preservada. Para seguir as novas regras, crie uma nova ficha com PRE/VIG; você pode consultar a ficha antiga normalmente.');
    abrirFicha(ficha.id);
    return;
  }
  personagemEditandoId = ficha.id;
  $('personagem-classe-base').value = ficha.classeBase || 'especialista';
  $('personagem-nex').value = String(ficha.nex ?? 5);
  $('personagem-estagio').value = String(ficha.estagio ?? 1);
  $('personagem-origem').value = ficha.origem || '';
  prepararCamposProgressao();
  $('personagem-nome').value = ficha.titulo || '';
  const classeSalva = ficha.classe || '';
  const classeExiste = [...$('personagem-classe').options]
    .some(opcao => opcao.value === classeSalva);
  $('personagem-classe').value = classeExiste ? classeSalva : '__outra__';
  $('personagem-classe-personalizada').value = classeExiste ? '' : classeSalva;
  atualizarCampoClassePersonalizada();
  $('personagem-imagem').value = ficha.imagem || '';
  $('personagem-pv').value = ficha.pv ?? 20;
  $('personagem-pe').value = ficha.pe ?? 3;
  $('personagem-san').value = ficha.san ?? 20;
  $('personagem-defesa').value = ficha.defesa ?? 15;
  $('personagem-tipo').value = ficha.tipo === 'npc' ? 'npc' : 'pj';
  $('personagem-historia').value = ficha.historia || '';
  $('personagem-habilidades').value = Array.isArray(ficha.habilidades)
    ? ficha.habilidades.join('\n')
    : ficha.habilidades || '';

  atributosInfo.forEach(([chave]) => {
    const valorSalvo = Number(ficha.atributos?.[chave]);
    $('atributo-' + chave).value = String(
      Number.isFinite(valorSalvo) ? Math.max(0, Math.min(maximoAtributoPersonagem(), valorSalvo)) : 1
    );
  });
  periciasRPG.forEach(([nome], indice) => {
    $('pericia-' + indice).value = ficha.pericias?.[nome] ?? 0;
  });

  $('form-personagem').querySelector('[type="submit"]').textContent =
    'ATUALIZAR FICHA';
  atualizarLimitesTreinamento();
  atualizarResumoPericias();
  $('cancelar-edicao-personagem').hidden = false;
  atualizarTotal();
  abrirTela('tela-personagens');
  $('form-personagem').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function salvarFichaCompartilhada(personagem) {
  if (!campanhaCompartilhada.codigo || campanhaCompartilhada.papel !== 'mestre') {
    throw Error('Apenas o mestre pode salvar fichas compartilhadas.');
  }

  await setDoc(
    doc(db, 'campanhas', campanhaCompartilhada.codigo, 'personagens', personagem.id),
    personagem
  );

  const indice = campanhaCompartilhada.fichas.findIndex(
    item => item.id === personagem.id
  );
  if (indice === -1) {
    campanhaCompartilhada.fichas.push(personagem);
  } else {
    campanhaCompartilhada.fichas[indice] = personagem;
  }
  mostrarFichasCompartilhadas(campanhaCompartilhada.fichas);
}

async function ativarCampanhaCompartilhada(codigo) {
  if (campanhaCompartilhada.pararEscuta) {
    campanhaCompartilhada.pararEscuta();
  }

  const membroRef = doc(
    db,
    'campanhas',
    codigo,
    'membros',
    auth.currentUser.uid
  );
  const membroSnap = await getDoc(membroRef);

  if (!membroSnap.exists()) {
    throw Error('Esta conta não está vinculada à campanha.');
  }

  const papel = membroSnap.data().papel;
  if (!['mestre', 'jogador'].includes(papel)) {
    throw Error('O perfil desta conta não tem uma função válida na campanha.');
  }

  campanhaCompartilhada = {
    codigo,
    papel,
    fichas: [],
    pararEscuta: null
  };
  localStorage.setItem(chaveCampanhaCompartilhada(), codigo);
  $('compartilhamento-status').textContent =
    `Campanha conectada · ${papel === 'mestre' ? 'Mestre' : 'Jogador'} · Código: ${codigo}`;
  mostrarFichasCompartilhadas([]);

  const fichasRef = collection(db, 'campanhas', codigo, 'personagens');
  const consulta = papel === 'mestre'
    ? fichasRef
    : query(fichasRef, where('tipo', '==', 'pj'));

  campanhaCompartilhada.pararEscuta = onSnapshot(
    consulta,
    snapshot => {
      campanhaCompartilhada.fichas = snapshot.docs.map(item => ({
        ...item.data(),
        id: item.id
      }));
      mostrarFichasCompartilhadas(campanhaCompartilhada.fichas);

      if (personagemAberto) {
        const atualizado = campanhaCompartilhada.fichas.find(
          item => item.id === personagemAberto
        );
        if (atualizado) abrirFicha(atualizado.id);
      }
    },
    erro => {
      console.error('Não foi possível carregar as fichas compartilhadas.', erro);
      $('compartilhamento-status').textContent =
        'Falha ao carregar fichas. Confira a conexão e as regras do Firestore.';
    }
  );
}

$('criar-campanha-compartilhada').onclick = async () => {
  if (!auth.currentUser) {
    $('compartilhamento-status').textContent = 'Entre na conta antes de criar uma campanha.';
    return;
  }

  const campanhaLocal = carregar('campanha')[0];
  const titulo = $('campanha-nome').value.trim() || campanhaLocal?.titulo;

  if (!titulo) {
    $('compartilhamento-status').textContent =
      'Informe e salve o nome da campanha antes de criar o compartilhamento.';
    return;
  }

  const aleatorio = new Uint8Array(8);
  crypto.getRandomValues(aleatorio);
  const codigo = Array.from(aleatorio, byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');

  try {
    const lote = writeBatch(db);
    lote.set(doc(db, 'campanhas', codigo), {
      titulo,
      descricao: $('campanha-descricao').value.trim() || campanhaLocal?.descricao || '',
      ownerUid: auth.currentUser.uid,
      inviteCode: codigo,
      criadaEm: new Date().toISOString()
    });
    lote.set(doc(
      db,
      'campanhas',
      codigo,
      'membros',
      auth.currentUser.uid
    ), {
      papel: 'mestre'
    });
    await lote.commit();
    await ativarCampanhaCompartilhada(codigo);
  } catch (erro) {
    console.error('Não foi possível criar a campanha compartilhada.', erro);
    $('compartilhamento-status').textContent =
      'Falha ao criar. Ative o Cloud Firestore e publique as regras de firestore.rules.';
  }
};

$('form-entrar-campanha').onsubmit = async e => {
  e.preventDefault();

  const codigo = $('codigo-campanha').value.trim().toLowerCase();
  if (!/^[a-f0-9]{16}$/.test(codigo)) {
    $('compartilhamento-status').textContent =
      'O código deve ter 16 caracteres hexadecimais.';
    return;
  }

  try {
    await setDoc(
      doc(db, 'campanhas', codigo, 'membros', auth.currentUser.uid),
      { papel: 'jogador', inviteCode: codigo }
    );
    await ativarCampanhaCompartilhada(codigo);
    $('form-entrar-campanha').reset();
  } catch (erro) {
    console.error('Não foi possível entrar na campanha compartilhada.', erro);
    $('compartilhamento-status').textContent =
      'Não foi possível entrar. Confira o código, a conexão e as regras do Firestore.';
  }
};

async function restaurarCampanhaCompartilhada() {
  const codigo = localStorage.getItem(chaveCampanhaCompartilhada());
  if (!codigo) {
    campanhaCompartilhada = {
      codigo: '',
      papel: '',
      fichas: [],
      pararEscuta: null
    };
    mostrarFichasCompartilhadas([]);
    return;
  }

  try {
    await ativarCampanhaCompartilhada(codigo);
  } catch (erro) {
    console.error('Não foi possível restaurar a campanha compartilhada.', erro);
    $('compartilhamento-status').textContent =
      'Não foi possível abrir a campanha compartilhada desta conta.';
  }
}

$('form-campanha').onsubmit = e => {
  e.preventDefault();

  const titulo = $('campanha-nome').value.trim();
  const descricao = $('campanha-descricao').value.trim();

  if (!titulo) return;

  const campanhaAnterior = carregar('campanha')[0];

  if (salvar('campanha', [{
    id: campanhaAnterior?.id || id(),
    titulo,
    descricao
  }])) {
    $('campanha-status').textContent = 'Campanha salva.';
  }
};

function dataLocalHoje() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

$('form-objetivo').onsubmit = e => {
  e.preventDefault();

  const titulo = $('objetivo-nome').value.trim();
  const descricao = $('objetivo-descricao').value.trim();

  if (!titulo) return;

  const registros = carregar('objetivos');
  registros.push({ id: id(), titulo, descricao });

  if (salvar('objetivos', registros)) {
    $('form-objetivo').reset();
    mostrarRegistros('objetivos', 'lista-objetivos');
  }
};

/* ==========================================
   ROLAGEM DE DADOS
========================================== */

function rolarDado(lados) {
  const numero = new Uint32Array(1);
  const limite = 4294967296;
  const aceito = limite - (limite % lados);

  do {
    crypto.getRandomValues(numero);
  } while (numero[0] >= aceito);

  return numero[0] % lados + 1;
}

const MOVIMENTO_REDUZIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DURACAO_ANIMACAO_DADO = MOVIMENTO_REDUZIDO ? 50 : 1100;
const DURACAO_ROLAGEM_DADOS = MOVIMENTO_REDUZIDO ? 50 : 1850;
const AudioContextDados = window.AudioContext || window.webkitAudioContext;
let contextoSom;
let saidaSomDados;

function somDadosRPG(quantidadeDados = 1) {
  if (!AudioContextDados) {
    console.warn('Este navegador não oferece suporte ao áudio da rolagem de dados.');
    return;
  }

  contextoSom ??= new AudioContextDados();
  const ctx = contextoSom;

  if (!saidaSomDados) {
    const compressor = ctx.createDynamicsCompressor();
    saidaSomDados = ctx.createGain();
    saidaSomDados.gain.value = 0.7;
    compressor.threshold.value = -12;
    compressor.knee.value = 6;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;
    saidaSomDados.connect(compressor);
    compressor.connect(ctx.destination);
  }

  const reproduzir = () => {
    const inicio = ctx.currentTime + 0.02;
    const duracao = 0.045;
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * duracao),
      ctx.sampleRate
    );
    const amostras = buffer.getChannelData(0);

    for (let indice = 0; indice < amostras.length; indice += 1) {
      const progresso = indice / amostras.length;
      amostras[indice] =
        (Math.random() * 2 - 1) * Math.pow(1 - progresso, 5);
    }

    const batidas = [
      [0.00, 0.7, 900],
      [0.08, 0.9, 1200],
      [0.15, 0.6, 850],
      [0.24, 0.8, 1100],
      [0.34, 0.5, 1300],
      [0.46, 0.4, 950],
      [0.59, 0.3, 1250],
      [0.75, 0.2, 1000],
      [0.94, 0.15, 800]
    ];
    const reducaoVolume = 1 / Math.sqrt(Math.min(Math.max(quantidadeDados, 1), 12));

    batidas.forEach(([tempo, volume, frequencia]) => {
      const instante = inicio + tempo;
      const fonte = ctx.createBufferSource();
      const filtro = ctx.createBiquadFilter();
      const ganho = ctx.createGain();
      fonte.buffer = buffer;
      filtro.type = 'bandpass';
      filtro.frequency.setValueAtTime(frequencia, instante);
      filtro.Q.setValueAtTime(0.8, instante);
      ganho.gain.setValueAtTime(0.0001, instante);
      ganho.gain.exponentialRampToValueAtTime(
        volume * reducaoVolume,
        instante + 0.003
      );
      ganho.gain.exponentialRampToValueAtTime(0.0001, instante + duracao);
      fonte.connect(filtro);
      filtro.connect(ganho);
      ganho.connect(saidaSomDados);
      fonte.start(instante);
      fonte.stop(instante + duracao);
    });
  };

  if (ctx.state === 'suspended') {
    void ctx.resume().then(reproduzir).catch(erro => {
      console.warn('Não foi possível iniciar o som dos dados.', erro);
    });
    return;
  }

  reproduzir();
}

const MODELOS_DADOS = {
  4: [
    { pontos: '60,5 8,103 60,84', valor: '1' },
    { pontos: '60,5 112,103 60,84', valor: '2' },
    { pontos: '8,103 112,103 60,84', valor: '3' }
  ],
  6: [
    { pontos: '60,8 105,32 60,57 15,32', valor: '2' },
    { pontos: '15,32 60,57 60,108 15,82', valor: '5' },
    { pontos: '60,57 105,32 105,82 60,108', valor: '1' }
  ],
  8: [
    { pontos: '60,7 8,60 60,60', valor: '1' },
    { pontos: '60,7 112,60 60,60', valor: '3' },
    { pontos: '8,60 60,113 60,60', valor: '5' },
    { pontos: '112,60 60,113 60,60', valor: '7' }
  ],
  10: Array.from({ length: 10 }, (_, indice) => {
    const angulo = (-90 + indice * 36) * Math.PI / 180;
    const proximo = (-90 + (indice + 1) * 36) * Math.PI / 180;
    const x = 60 + Math.cos(angulo) * 53;
    const y = 60 + Math.sin(angulo) * 53;
    const proximoX = 60 + Math.cos(proximo) * 53;
    const proximoY = 60 + Math.sin(proximo) * 53;
    return {
      pontos: `60,60 ${x.toFixed(2)},${y.toFixed(2)} ${proximoX.toFixed(2)},${proximoY.toFixed(2)}`,
      valor: String(indice + 1)
    };
  }),
  12: [
    { pontos: '60,5 86,16 103,38 86,51 60,41', valor: '1' },
    { pontos: '103,38 111,64 98,88 79,75 86,51', valor: '2' },
    { pontos: '98,88 76,107 49,107 54,83 79,75', valor: '3' },
    { pontos: '49,107 24,96 9,73 33,64 54,83', valor: '4' },
    { pontos: '9,73 9,45 24,22 42,42 33,64', valor: '5' },
    { pontos: '24,22 60,5 60,41 42,42', valor: '6' },
    { pontos: '60,41 86,51 79,75 54,83 33,64 42,42', valor: '7' }
  ],
  20: [
    { pontos: '60,5 105,30 60,60', valor: '3' },
    { pontos: '105,30 112,82 60,60', valor: '8' },
    { pontos: '112,82 60,112 60,60', valor: '20' },
    { pontos: '60,112 8,82 60,60', valor: '11' },
    { pontos: '8,82 15,30 60,60', valor: '5' },
    { pontos: '15,30 60,5 60,60', valor: '14' }
  ],
  100: Array.from({ length: 10 }, (_, indice) => {
    const angulo = (-90 + indice * 36) * Math.PI / 180;
    const proximo = (-90 + (indice + 1) * 36) * Math.PI / 180;
    const x = 60 + Math.cos(angulo) * 53;
    const y = 60 + Math.sin(angulo) * 53;
    const proximoX = 60 + Math.cos(proximo) * 53;
    const proximoY = 60 + Math.sin(proximo) * 53;
    return {
      pontos: `60,60 ${x.toFixed(2)},${y.toFixed(2)} ${proximoX.toFixed(2)},${proximoY.toFixed(2)}`,
      valor: String(indice * 10).padStart(2, '0')
    };
  })
};

let proximoGradienteDado = 0;

const PALETAS_DADOS = new Map([
  [4, { destaque: '#22c55e', faces: [
    ['#86efac', '#22c55e', '#08753c'],
    ['#4ade80', '#16a34a', '#065f35'],
    ['#bbf7d0', '#15803d', '#064e3b'],
    ['#34d399', '#047857', '#064e3b']
  ] }],
  [6, { destaque: '#20bfd0', faces: [
    ['#8ff5ff', '#20bfd0', '#087f91'],
    ['#4dd8e8', '#0ea5b7', '#075985'],
    ['#cffafe', '#0891b2', '#164e63'],
    ['#22d3ee', '#0e7490', '#164e63']
  ] }],
  [8, { destaque: '#a855f7', faces: [
    ['#e9b5ff', '#a855f7', '#6313a3'],
    ['#d08cff', '#9333ea', '#581c87'],
    ['#f3e8ff', '#7e22ce', '#4c1d95'],
    ['#c084fc', '#7e22ce', '#3b0764']
  ] }],
  [10, { destaque: '#ec4899', faces: [
    ['#ffb4db', '#ec4899', '#a21b62'],
    ['#f472b6', '#db2777', '#831843'],
    ['#fce7f3', '#be185d', '#701a43'],
    ['#fb7185', '#be185d', '#881337']
  ] }],
  [12, { destaque: '#e53935', faces: [
    ['#ffaaa2', '#e53935', '#8e1717'],
    ['#ff817c', '#ce1d2c', '#4b0b16'],
    ['#ffd0b5', '#ad1828', '#390712'],
    ['#e95450', '#941321', '#28050d']
  ] }],
  [20, { destaque: '#ff6500', faces: [
    ['#ffd18a', '#ff6500', '#b53200'],
    ['#ffad42', '#f45100', '#9a3412'],
    ['#ffedd5', '#ea580c', '#7c2d12'],
    ['#fb923c', '#c2410c', '#7c2d12']
  ] }],
  [100, { destaque: '#eab308', faces: [
    ['#fff0a6', '#eab308', '#9f6b00'],
    ['#facc15', '#ca8a04', '#854d0e'],
    ['#fef9c3', '#a16207', '#713f12'],
    ['#fde047', '#b45309', '#78350f']
  ] }]
]);

/* ---------- Cor escolhida pelo jogador ---------- */
const CHAVE_COR_DADOS = 'arquivo-cinza-cor-dados';
const CORES_RAPIDAS_DADOS = [
  { nome: 'Original', cor: '' },
  { nome: 'Vermelho', cor: '#e53935' },
  { nome: 'Laranja', cor: '#ff6500' },
  { nome: 'Dourado', cor: '#eab308' },
  { nome: 'Verde', cor: '#22c55e' },
  { nome: 'Ciano', cor: '#20bfd0' },
  { nome: 'Azul', cor: '#3b82f6' },
  { nome: 'Roxo', cor: '#a855f7' },
  { nome: 'Rosa', cor: '#ec4899' },
  { nome: 'Prata', cor: '#9ca3af' },
  { nome: 'Sombra', cor: '#3f3f46' }
];

function lerCorDados() {
  try {
    const cor = localStorage.getItem(CHAVE_COR_DADOS) || '';
    return /^#[0-9a-f]{6}$/i.test(cor) ? cor : '';
  } catch {
    return '';
  }
}

let corDadosEscolhida = lerCorDados();

function misturarCor(hex, alvo, quanto) {
  const n = parseInt(hex.slice(1), 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(c => Math.round(c + (alvo - c) * quanto));
  return '#' + canais.map(c => c.toString(16).padStart(2, '0')).join('');
}

function paletaDaCor(hex) {
  const claro = q => misturarCor(hex, 255, q);
  const escuro = q => misturarCor(hex, 0, q);
  return {
    destaque: hex,
    faces: [
      [claro(0.55), hex, escuro(0.45)],
      [claro(0.35), escuro(0.1), escuro(0.6)],
      [claro(0.75), escuro(0.2), escuro(0.65)],
      [claro(0.25), escuro(0.3), escuro(0.7)]
    ]
  };
}

function paletaAtualDados(lados) {
  return corDadosEscolhida
    ? paletaDaCor(corDadosEscolhida)
    : (PALETAS_DADOS.get(lados) || PALETAS_DADOS.get(12));
}

function redesenharTodosDados() {
  if (typeof renderizarSeletoresDados === 'function' && $('seletores')) {
    try { renderizarSeletoresDados(); } catch { /* ainda carregando */ }
  }
  document.querySelectorAll('.dice-3d, .dice-2d').forEach(dado => {
    const lados = Number(dado.dataset.sides);
    if (lados) desenharDado(dado, lados);
  });
}

function aplicarCorDados(cor) {
  corDadosEscolhida = cor;
  try {
    if (cor) localStorage.setItem(CHAVE_COR_DADOS, cor);
    else localStorage.removeItem(CHAVE_COR_DADOS);
  } catch { /* sem armazenamento */ }
  document.querySelectorAll('#dice-color-swatches button').forEach(botao => {
    botao.setAttribute('aria-pressed', String(botao.dataset.cor === cor));
  });
  if (cor && $('dice-color-picker')) $('dice-color-picker').value = cor;
  redesenharTodosDados();
}

function montarSeletorCorDados() {
  const area = $('dice-color-swatches');
  if (!area) return;
  CORES_RAPIDAS_DADOS.forEach(({ nome, cor }) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'dice-color-swatch' + (cor ? '' : ' is-original');
    botao.dataset.cor = cor;
    botao.title = nome;
    botao.setAttribute('aria-label', `Dados ${nome.toLowerCase()}`);
    botao.setAttribute('aria-pressed', String(cor === corDadosEscolhida));
    if (cor) botao.style.setProperty('--swatch', cor);
    botao.addEventListener('click', () => aplicarCorDados(cor));
    area.appendChild(botao);
  });
  const seletor = $('dice-color-picker');
  if (corDadosEscolhida) seletor.value = corDadosEscolhida;
  seletor.addEventListener('input', () => aplicarCorDados(seletor.value.toLowerCase()));
}

function desenharDado(dado, lados) {
  const svg = dado.querySelector('.dice-model');
  const faces = MODELOS_DADOS[lados];
  if (!svg || !faces) return;

  svg.replaceChildren();
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const paleta = paletaAtualDados(lados);
  dado.style.setProperty('--dice-accent', paleta.destaque);

  faces.forEach((_, indice) => {
    const gradiente = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    const gradienteId = `dice-gradient-${proximoGradienteDado}-${indice}`;
    gradiente.setAttribute('id', gradienteId);
    gradiente.setAttribute('x1', '0');
    gradiente.setAttribute('y1', '0');
    gradiente.setAttribute('x2', '1');
    gradiente.setAttribute('y2', '1');
    paleta.faces[indice % paleta.faces.length].forEach((cor, parada) => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', `${parada * 50}%`);
      stop.setAttribute('stop-color', cor);
      gradiente.appendChild(stop);
    });
    defs.appendChild(gradiente);
  });
  proximoGradienteDado += 1;
  svg.appendChild(defs);

  const profundidade = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  profundidade.setAttribute('class', 'dice-body-depth');
  profundidade.setAttribute('transform', 'translate(0 5)');
  faces.forEach(face => {
    const lateral = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    lateral.setAttribute('points', face.pontos);
    lateral.setAttribute('fill', '#12080b');
    lateral.setAttribute('stroke', '#090507');
    lateral.setAttribute('stroke-width', '2');
    lateral.setAttribute('stroke-linejoin', 'round');
    profundidade.appendChild(lateral);
  });
  svg.appendChild(profundidade);

  faces.forEach((face, indice) => {
    const poligono = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poligono.setAttribute('points', face.pontos);
    poligono.setAttribute('class', `dice-facet dice-facet-${indice % 4}`);
    poligono.setAttribute('fill', `url(#dice-gradient-${proximoGradienteDado - 1}-${indice})`);
    svg.appendChild(poligono);

    const pontos = face.pontos.split(' ').map(ponto => ponto.split(',').map(Number));
    const centroX = pontos.reduce((soma, ponto) => soma + ponto[0], 0) / pontos.length;
    const centroY = pontos.reduce((soma, ponto) => soma + ponto[1], 0) / pontos.length;
    const bevel = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    bevel.setAttribute('points', pontos.map(([x, y]) =>
      `${(centroX + (x - centroX) * 0.82).toFixed(1)},${(centroY + (y - centroY) * 0.82).toFixed(1)}`
    ).join(' '));
    bevel.setAttribute('class', 'dice-facet-bevel');
    svg.appendChild(bevel);

    const numero = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    numero.setAttribute('x', centroX.toFixed(1));
    numero.setAttribute('y', (centroY + 3).toFixed(1));
    numero.setAttribute('class', 'dice-facet-number');
    numero.textContent = face.valor;
    svg.appendChild(numero);
  });
}

document.querySelectorAll('.dice-3d').forEach(dado => {
  desenharDado(dado, Number(dado.dataset.sides));
});
montarSeletorCorDados();

const quantidadesDados = new Map(
  [4, 6, 8, 10, 12, 20, 100].map(lados => [lados, 0])
);
const MAX_DADOS_POR_TIPO = 10;
const historicoRolagens = [];
const LIMITE_DADOS_POR_ROLAGEM = 12;
let rolagemDadosAtiva = false;
const iconesDados = new Map([
  [4, '△'],
  [6, '⬡'],
  [8, '◇'],
  [10, '⬠'],
  [12, '⬡'],
  [20, '✧'],
  [100, '⬡']
]);

function criarDado2D(tipo, valor = null) {
  const cartao = document.createElement('div');
  cartao.className = 'rolled-die dice-2d-card';
  cartao.setAttribute('aria-label', valor === null
    ? `Dado de ${tipo} lados`
    : `Dado de ${tipo} lados: resultado ${valor}`);

  const titulo = document.createElement('strong');
  titulo.className = 'dice-2d-title';
  titulo.textContent = `D${tipo}`;

  const dado = document.createElement('div');
  dado.className = 'dice-2d';
  dado.dataset.sides = String(tipo);
  const direcaoGiro = Math.random() < 0.5 ? -1 : 1;
  const giroX = (360 + Math.floor(Math.random() * 3) * 180) *
    (Math.random() < 0.5 ? -1 : 1);
  const giroY = (540 + Math.floor(Math.random() * 2) * 180) *
    (Math.random() < 0.5 ? -1 : 1);
  const giroZ = direcaoGiro * (360 + Math.floor(Math.random() * 3) * 180);
  const etapasRolagem = [
    [14, 0.16, -12, -32],
    [34, 0.4, 26, -68],
    [52, 0.61, 18, -8],
    [68, 0.78, -16, -40],
    [84, 0.92, 7, -5],
    [94, 1, 0, -14],
    [100, 1, 0, 0]
  ];
  etapasRolagem.forEach(([etapa, fator, x, y]) => {
    dado.style.setProperty(`--dice-spin-x-${etapa}`, `${giroX * fator}deg`);
    dado.style.setProperty(`--dice-spin-y-${etapa}`, `${giroY * fator}deg`);
    dado.style.setProperty(`--dice-spin-z-${etapa}`, `${giroZ * fator}deg`);
    dado.style.setProperty(`--dice-x-${etapa}`, `${x * direcaoGiro}px`);
    dado.style.setProperty(`--dice-y-${etapa}`, `${y}px`);
  });
  const desenho = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  desenho.classList.add('dice-model');
  desenho.setAttribute('viewBox', '0 0 120 120');
  desenho.setAttribute('aria-hidden', 'true');
  dado.appendChild(desenho);
  desenharDado(dado, tipo);

  if (tipo === 6) {
    dado.classList.add('has-d6-cube');
    const cubo = document.createElement('div');
    cubo.className = 'dice-cube-d6';
    cubo.setAttribute('aria-hidden', 'true');
    [
      ['frente', 1],
      ['tras', 6],
      ['direita', 3],
      ['esquerda', 4],
      ['cima', 2],
      ['baixo', 5]
    ].forEach(([face, numero]) => {
      const elementoFace = document.createElement('span');
      elementoFace.className = `dice-cube-d6-face ${face}`;
      elementoFace.textContent = String(numero);
      cubo.appendChild(elementoFace);
    });
    dado.appendChild(cubo);
  }

  const resultado = document.createElement('span');
  resultado.className = 'rolled-die-result';
  resultado.textContent = valor === null ? 'Pronto' : `Resultado: ${valor}`;

  if (tipo === 6 && valor !== null) {
    dado.dataset.result = String(valor);
  }

  cartao.append(titulo, dado, resultado);
  return cartao;
}

function animarCuboD6(dado, resultado) {
  const cubo = dado.querySelector('.dice-cube-d6');
  if (!cubo || !resultado) return;

  const posicoes = new Map([
    [1, [-12, -18]],
    [2, [-78, -18]],
    [3, [-12, -72]],
    [4, [-12, 108]],
    [5, [78, -18]],
    [6, [-12, 162]]
  ]);
  const [alvoX, alvoY] = posicoes.get(resultado);
  const rotacaoInicialX = -25;
  const rotacaoInicialY = -30;
  const rotacaoFinalX = rotacaoInicialX + 720 +
    ((alvoX - rotacaoInicialX) % 360 + 360) % 360;
  const rotacaoFinalY = rotacaoInicialY + 720 +
    ((alvoY - rotacaoInicialY) % 360 + 360) % 360;
  const etapasCubo = [
    [14, 0.14],
    [34, 0.38],
    [52, 0.6],
    [68, 0.78],
    [84, 0.92],
    [94, 1],
    [100, 1]
  ];

  etapasCubo.forEach(([etapa, progresso]) => {
    const oscilacao = Math.sin(progresso * Math.PI * 4) * 42;
    cubo.style.setProperty(
      `--cube-rotate-x-${etapa}`,
      `${rotacaoInicialX + (rotacaoFinalX - rotacaoInicialX) * progresso + oscilacao}deg`
    );
    cubo.style.setProperty(
      `--cube-rotate-y-${etapa}`,
      `${rotacaoInicialY + (rotacaoFinalY - rotacaoInicialY) * progresso - oscilacao}deg`
    );
  });
  cubo.style.setProperty('--cube-rotate-x-final', `${rotacaoFinalX}deg`);
  cubo.style.setProperty('--cube-rotate-y-final', `${rotacaoFinalY}deg`);
  cubo.style.transform = `rotateX(${rotacaoFinalX}deg) rotateY(${rotacaoFinalY}deg)`;
  if (MOVIMENTO_REDUZIDO) return;

  cubo.classList.add('is-rolling');
  void cubo.offsetWidth;
}

function mostrarDadosIniciais2D() {
  const cenario = $('cenario-dados');
  cenario.replaceChildren();
  cenario.classList.remove('has-three-dice');
  cenarioDados3D.palco.classList.remove('has-three-dice');
  if (cenarioDados3D.renderer) removerDadosCenario3D();
  [6, 20, 12].forEach(lados => {
    cenario.appendChild(criarDado2D(lados));
  });
}

const cenarioDados3D = {
  biblioteca: null,
  cena: null,
  camera: null,
  renderer: null,
  objetos: [],
  observer: null,
  quadro: 0,
  pronto: null,
  palco: $('cenario-dados').closest('.dice-playfield')
};

function inicializarCenarioDados3D() {
  if (cenarioDados3D.pronto) return cenarioDados3D.pronto;

  cenarioDados3D.pronto = import(
    'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js'
  ).then(THREE => {
    cenarioDados3D.biblioteca = THREE;
    cenarioDados3D.cena = new THREE.Scene();
    cenarioDados3D.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    cenarioDados3D.camera.position.set(0, 9, 14);
    cenarioDados3D.camera.lookAt(0, -0.45, 0);

    cenarioDados3D.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    cenarioDados3D.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    cenarioDados3D.renderer.domElement.className = 'dice-three-canvas';
    cenarioDados3D.renderer.domElement.setAttribute('aria-hidden', 'true');
    cenarioDados3D.palco.appendChild(cenarioDados3D.renderer.domElement);

    cenarioDados3D.cena.add(new THREE.HemisphereLight(0xffe5d0, 0x2a0808, 2.1));

    const luzPrincipal = new THREE.DirectionalLight(0xffd6bd, 3.1);
    luzPrincipal.position.set(-4, 9, 7);
    cenarioDados3D.cena.add(luzPrincipal);

    const luzVermelha = new THREE.PointLight(0xc52c2c, 70);
    luzVermelha.position.set(5, 5, 1);
    cenarioDados3D.cena.add(luzVermelha);

    const piso = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        color: 0x281715,
        roughness: 0.95,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
      })
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = -1.52;
    cenarioDados3D.cena.add(piso);

    cenarioDados3D.observer = new ResizeObserver(redimensionarCenarioDados3D);
    cenarioDados3D.observer.observe(cenarioDados3D.palco);
    cenarioDados3D.observer.observe($('cenario-dados'));
    redimensionarCenarioDados3D();
    return true;
  }).catch(erro => {
    cenarioDados3D.renderer?.dispose();
    cenarioDados3D.renderer?.domElement.remove();
    cenarioDados3D.renderer = null;
    console.error('Não foi possível iniciar a mesa 3D; usando a animação alternativa.', erro);
    cenarioDados3D.pronto = Promise.resolve(false);
    return false;
  });

  return cenarioDados3D.pronto;
}

function redimensionarCenarioDados3D() {
  const { palco, renderer, camera } = cenarioDados3D;
  if (!renderer || !camera) return;

  const largura = palco.clientWidth;
  const altura = palco.clientHeight;
  if (!largura || !altura) return;

  camera.aspect = largura / altura;
  camera.updateProjectionMatrix();
  renderer.setSize(largura, altura, false);
  if (!cenarioDados3D.quadro) renderer.render(cenarioDados3D.cena, camera);
}

function geometriaDado3D(lados) {
  const THREE = cenarioDados3D.biblioteca;
  if (lados === 4) return new THREE.TetrahedronGeometry(1);
  if (lados === 6) return new THREE.BoxGeometry(1.5, 1.5, 1.5);
  if (lados === 8) return new THREE.OctahedronGeometry(1);
  if (lados === 12) return new THREE.DodecahedronGeometry(1);
  if (lados === 20) return new THREE.IcosahedronGeometry(1);
  if (lados === 100) {
    return new THREE.CylinderGeometry(0.9, 0.9, 1.45, 10, 1);
  }

  const vertices = [0, 1.3, 0];
  const indices = [];
  const segmentos = 10;
  for (let indice = 0; indice < segmentos; indice += 1) {
    const angulo = 2 * Math.PI * indice / segmentos;
    vertices.push(Math.cos(angulo) * 0.95, 0, Math.sin(angulo) * 0.95);
  }
  vertices.push(0, -1.3, 0);
  for (let indice = 0; indice < segmentos; indice += 1) {
    const atual = 1 + indice;
    const proximo = 1 + (indice + 1) % segmentos;
    indices.push(0, atual, proximo, segmentos + 1, proximo, atual);
  }

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometria.setIndex(indices);
  geometria.computeVertexNormals();
  return geometria;
}

function adicionarNumerosFacesDado3D(grupo, geometria, lados) {
  const THREE = cenarioDados3D.biblioteca;
  const geometriaFaces = geometria.index ? geometria.toNonIndexed() : geometria;
  const posicoes = geometriaFaces.getAttribute('position');
  const centroForma = new THREE.Vector3();
  for (let indice = 0; indice < posicoes.count; indice += 1) {
    centroForma.add(new THREE.Vector3().fromBufferAttribute(posicoes, indice));
  }
  centroForma.divideScalar(posicoes.count);

  const faces = new Map();
  const verticeA = new THREE.Vector3();
  const verticeB = new THREE.Vector3();
  const verticeC = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let indice = 0; indice < posicoes.count; indice += 3) {
    verticeA.fromBufferAttribute(posicoes, indice);
    verticeB.fromBufferAttribute(posicoes, indice + 1);
    verticeC.fromBufferAttribute(posicoes, indice + 2);
    normal.subVectors(verticeB, verticeA)
      .cross(new THREE.Vector3().subVectors(verticeC, verticeA))
      .normalize();

    const centroTriangulo = verticeA.clone().add(verticeB).add(verticeC)
      .divideScalar(3);
    if (normal.dot(centroTriangulo.clone().sub(centroForma)) < 0) {
      normal.negate();
    }

    const distancia = normal.dot(centroTriangulo);
    const chave = [
      normal.x.toFixed(3),
      normal.y.toFixed(3),
      normal.z.toFixed(3),
      distancia.toFixed(3)
    ].join(':');
    let face = faces.get(chave);
    if (!face) {
      face = {
        normal: normal.clone(),
        centro: new THREE.Vector3(),
        quantidadeVertices: 0,
        menorAresta: Infinity,
        pontos: new Map()
      };
      faces.set(chave, face);
    }
    face.centro.add(verticeA).add(verticeB).add(verticeC);
    face.quantidadeVertices += 3;
    [verticeA, verticeB, verticeC].forEach(vertice => {
      face.pontos.set(
        `${vertice.x.toFixed(4)}:${vertice.y.toFixed(4)}:${vertice.z.toFixed(4)}`,
        vertice.clone()
      );
    });
    face.menorAresta = Math.min(
      face.menorAresta,
      verticeA.distanceTo(verticeB),
      verticeB.distanceTo(verticeC),
      verticeC.distanceTo(verticeA)
    );
  }

  if (geometriaFaces !== geometria) geometriaFaces.dispose();

  const facesNumeradas = [...faces.values()]
    .filter(face => lados !== 100 || Math.abs(face.normal.y) < 0.5)
    .sort((a, b) => {
      const anguloA = Math.atan2(a.normal.z, a.normal.x);
      const anguloB = Math.atan2(b.normal.z, b.normal.x);
      return Math.abs(a.normal.y - b.normal.y) > 0.5
        ? b.normal.y - a.normal.y
        : anguloA - anguloB;
    });
  const numeros = lados === 100
    ? Array.from({ length: 10 }, (_, indice) => String(indice * 10).padStart(2, '0'))
    : Array.from({ length: lados }, (_, indice) => String(indice + 1));
  const paleta = paletaAtualDados(lados);
  const corDetalhe = new THREE.Color(paleta.destaque);
  const materialContorno = new THREE.LineBasicMaterial({
    color: corDetalhe.clone().lerp(new THREE.Color(0xffffff), 0.38),
    transparent: true,
    opacity: 0.62,
    depthWrite: false
  });

  const rotulos = [];
  facesNumeradas.forEach((face, indice) => {
    face.centro.divideScalar(face.quantidadeVertices);
    const pontosFace = [...face.pontos.values()];
    const eixoReferencia = Math.abs(face.normal.y) > 0.9
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    const eixoX = new THREE.Vector3().crossVectors(eixoReferencia, face.normal).normalize();
    const eixoY = new THREE.Vector3().crossVectors(face.normal, eixoX).normalize();
    pontosFace.sort((a, b) => {
      const deslocamentoA = a.clone().sub(face.centro);
      const deslocamentoB = b.clone().sub(face.centro);
      const anguloA = Math.atan2(deslocamentoA.dot(eixoY), deslocamentoA.dot(eixoX));
      const anguloB = Math.atan2(deslocamentoB.dot(eixoY), deslocamentoB.dot(eixoX));
      return anguloA - anguloB;
    });
    const pontosBiselados = pontosFace.map(ponto =>
      face.centro.clone().addScaledVector(ponto.clone().sub(face.centro), 0.88)
        .addScaledVector(face.normal, 0.012)
    );
    const geometriaContorno = new THREE.BufferGeometry().setFromPoints(pontosBiselados);
    const contorno = new THREE.LineLoop(geometriaContorno, materialContorno);
    contorno.renderOrder = 1;
    grupo.add(contorno);

    const texto = numeros[indice % numeros.length];
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('Não foi possível criar os números das faces 3D.');

    let tamanhoFonte = 184;
    contexto.font = `bold ${tamanhoFonte}px Georgia`;
    while (contexto.measureText(texto).width > 220) {
      tamanhoFonte -= 8;
      contexto.font = `bold ${tamanhoFonte}px Georgia`;
    }
    contexto.textAlign = 'center';
    contexto.textBaseline = 'middle';
    contexto.lineJoin = 'round';
    contexto.shadowColor = '#000';
    contexto.shadowBlur = 12;
    contexto.shadowOffsetY = 5;
    contexto.lineWidth = 22;
    contexto.strokeStyle = '#100608';
    contexto.strokeText(texto, 128, 130);
    contexto.lineWidth = 12;
    contexto.strokeStyle = corDetalhe.getStyle();
    contexto.strokeText(texto, 128, 130);
    contexto.fillStyle = '#fffdf7';
    contexto.fillText(texto, 128, 130);

    const textura = new THREE.CanvasTexture(canvas);
    const numero = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: textura,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        side: THREE.DoubleSide
      })
    );
    numero.position.copy(face.centro).addScaledVector(face.normal, 0.025);
    const tamanho = Math.min(0.92, face.menorAresta * 0.9);
    numero.scale.set(tamanho, tamanho, 1);
    numero.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face.normal);
    numero.renderOrder = 2;
    grupo.add(numero);
    rotulos.push({ sprite: numero, normal: face.normal });
  });
  return rotulos;
}

function criarTexturaGranuladaDado3D() {
  const THREE = cenarioDados3D.biblioteca;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('Não foi possível criar a textura do dado 3D.');

  const imagem = contexto.createImageData(canvas.width, canvas.height);
  for (let indice = 0; indice < imagem.data.length; indice += 4) {
    const ruido = 104 + ((indice * 37 + Math.floor(indice / 128) * 17) % 54);
    imagem.data[indice] = ruido;
    imagem.data[indice + 1] = ruido;
    imagem.data[indice + 2] = ruido;
    imagem.data[indice + 3] = 255;
  }
  contexto.putImageData(imagem, 0, 0);

  const textura = new THREE.CanvasTexture(canvas);
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(2, 2);
  return textura;
}

function atualizarVisibilidadeNumerosDado3D(dado) {
  const camera = cenarioDados3D.camera;
  dado.numerosFaces.forEach(({ sprite, normal }) => {
    const normalMundo = normal.clone().applyQuaternion(dado.grupo.quaternion);
    const posicaoMundo = sprite.position.clone()
      .applyQuaternion(dado.grupo.quaternion)
      .add(dado.grupo.position);
    const direcaoCamera = camera.position.clone().sub(posicaoMundo).normalize();
    sprite.visible = normalMundo.dot(direcaoCamera) > 0.05;
  });
}

function criarTexturaDado3D(texto) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('Não foi possível criar o rótulo do dado 3D.');

  contexto.fillStyle = '#f4dfc5';
  contexto.font = 'bold 100px Georgia';
  contexto.textAlign = 'center';
  contexto.textBaseline = 'middle';
  contexto.shadowColor = '#000';
  contexto.shadowBlur = 12;
  contexto.fillText(texto, 128, 132);
  return new cenarioDados3D.biblioteca.CanvasTexture(canvas);
}

function removerDadosCenario3D() {
  const { cena, objetos } = cenarioDados3D;
  objetos.forEach(({ grupo, sombra }) => {
    cena.remove(grupo, sombra);
    grupo.traverse(objeto => {
      objeto.geometry?.dispose();
      const materiais = Array.isArray(objeto.material)
        ? objeto.material
        : [objeto.material];
      materiais.forEach(material => {
        material?.map?.dispose();
        material?.dispose();
      });
    });
    sombra.geometry.dispose();
    sombra.material.dispose();
  });
  cenarioDados3D.objetos = [];
  if (cenarioDados3D.renderer && cena) {
    cenarioDados3D.renderer.render(cena, cenarioDados3D.camera);
  }
}

function posicionarDado3D(elemento) {
  const { biblioteca: THREE, camera, renderer } = cenarioDados3D;
  const areaCanvas = renderer.domElement.getBoundingClientRect();
  const caixa = elemento.getBoundingClientRect();
  const pontoTela = new THREE.Vector2(
    ((caixa.left + caixa.width / 2 - areaCanvas.left) / areaCanvas.width) * 2 - 1,
    -((caixa.top + caixa.height / 2 - areaCanvas.top) / areaCanvas.height) * 2 + 1
  );
  const raio = new THREE.Raycaster();
  raio.setFromCamera(pontoTela, camera);
  const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.45);
  return raio.ray.intersectPlane(plano, new THREE.Vector3()) ||
    new THREE.Vector3(0, -0.45, 0);
}

function criarObjetoDado3D(rolagem, indice, total) {
  const THREE = cenarioDados3D.biblioteca;
  const grupo = new THREE.Group();
  const geometria = geometriaDado3D(rolagem.lados);
  const paleta = paletaAtualDados(rolagem.lados);
  const corAresta = new THREE.Color(paleta.destaque);
  const material = new THREE.MeshPhysicalMaterial({
    color: corAresta.clone().lerp(new THREE.Color(0x171113), 0.42),
    metalness: 0.2,
    roughness: 0.32,
    flatShading: true,
    side: THREE.DoubleSide,
    bumpMap: criarTexturaGranuladaDado3D(),
    bumpScale: 0.025,
    clearcoat: 0.8,
    clearcoatRoughness: 0.24,
    emissive: corAresta.clone().multiplyScalar(0.12)
  });
  const malha = new THREE.Mesh(geometria, material);
  grupo.add(malha);

  const arestas = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometria),
    new THREE.LineBasicMaterial({
      color: corAresta.clone().lerp(new THREE.Color(0xffffff), 0.24),
      transparent: true,
      opacity: 0.92
    })
  );
  grupo.add(arestas);
  const numerosFaces = adicionarNumerosFacesDado3D(grupo, geometria, rolagem.lados);

  const textura = criarTexturaDado3D(`D${rolagem.lados}`);
  const rotulo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textura,
    transparent: true,
    depthTest: false
  }));
  rotulo.scale.set(1.35, 0.68, 1);
  rotulo.position.y = 1.55;
  grupo.add(rotulo);

  const THREEColor = new THREE.Color(0x000000);
  const sombra = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 32),
    new THREE.MeshBasicMaterial({
      color: THREEColor,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    })
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = -1.5;

  const destino = posicionarDado3D(rolagem.elemento.querySelector('.dice-2d'));
  const colunas = Math.ceil(Math.sqrt(total));
  const linhas = Math.ceil(total / colunas);
  const coluna = indice % colunas;
  const linha = Math.floor(indice / colunas);
  const espalhamento = total > 1 ? 0.24 : 0;
  const baseX = destino.x + (coluna - (colunas - 1) / 2) * espalhamento;
  const baseZ = destino.z + (linha - (linhas - 1) / 2) * espalhamento;
  const dado = {
    grupo,
    sombra,
    rotulo,
    numerosFaces,
    baseX,
    baseZ,
    inicioX: (Math.random() - 0.5) * 2.4,
    inicioZ: (Math.random() - 0.5) * 1.8,
    rotacao: new THREE.Vector3(
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI * 2
    ),
    giro: new THREE.Vector3(
      (Math.random() * 2 + 2) * (Math.random() < 0.5 ? -1 : 1),
      (Math.random() * 2 + 2) * (Math.random() < 0.5 ? -1 : 1),
      (Math.random() * 2 + 2) * (Math.random() < 0.5 ? -1 : 1)
    ),
    fase: Math.random() * Math.PI * 2
  };
  grupo.position.set(baseX + dado.inicioX, -0.45, baseZ + dado.inicioZ);
  grupo.rotation.set(dado.rotacao.x, dado.rotacao.y, dado.rotacao.z);
  sombra.position.x = baseX;
  sombra.position.z = baseZ;
  cenarioDados3D.cena.add(grupo, sombra);
  cenarioDados3D.objetos.push(dado);
  atualizarVisibilidadeNumerosDado3D(dado);
  return dado;
}

function prepararDadosCenario3D(rolagens) {
  if (!cenarioDados3D.renderer) return false;

  const container = $('cenario-dados');
  removerDadosCenario3D();
  try {
    redimensionarCenarioDados3D();
    rolagens.forEach((rolagem, indice) => {
      criarObjetoDado3D(rolagem, indice, rolagens.length);
    });
    container.classList.add('has-three-dice');
    cenarioDados3D.palco.classList.add('has-three-dice');
    cenarioDados3D.renderer.render(cenarioDados3D.cena, cenarioDados3D.camera);
    return true;
  } catch (erro) {
    removerDadosCenario3D();
    container.classList.remove('has-three-dice');
    cenarioDados3D.palco.classList.remove('has-three-dice');
    console.error('Não foi possível montar os dados 3D; usando a animação alternativa.', erro);
    return false;
  }
}

function animarDadosCenario3D() {
  if (MOVIMENTO_REDUZIDO) {
    cenarioDados3D.objetos.forEach(dado => {
      dado.grupo.position.set(dado.baseX, -0.45, dado.baseZ);
      atualizarVisibilidadeNumerosDado3D(dado);
    });
    cenarioDados3D.renderer.render(cenarioDados3D.cena, cenarioDados3D.camera);
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const inicio = performance.now();
    const duracao = DURACAO_ROLAGEM_DADOS;

    const quadro = agora => {
      const progresso = Math.min(1, (agora - inicio) / duracao);
      const ease = 1 - Math.pow(1 - progresso, 4);

      cenarioDados3D.objetos.forEach(dado => {
        const envelope = 1 - progresso;
        const quique = Math.abs(Math.sin(progresso * 4 * Math.PI + dado.fase)) *
          envelope * envelope * 1.05;
        const arco = Math.sin(progresso * Math.PI) * 1.2;
        dado.grupo.position.set(
          dado.baseX + dado.inicioX * envelope +
            Math.sin(progresso * 9 + dado.fase) * 0.22 * envelope,
          -0.45 + arco + quique,
          dado.baseZ + dado.inicioZ * envelope +
            Math.cos(progresso * 7 + dado.fase) * 0.18 * envelope
        );
        dado.grupo.rotation.set(
          dado.rotacao.x + dado.giro.x * ease,
          dado.rotacao.y + dado.giro.y * ease,
          dado.rotacao.z + dado.giro.z * ease
        );
        atualizarVisibilidadeNumerosDado3D(dado);
        dado.rotulo.material.opacity = Math.max(0.35, ease);
        dado.sombra.material.opacity = 0.12 + (1 - Math.min(1, arco)) * 0.25;
        dado.sombra.scale.setScalar(0.72 + Math.min(1, arco) * 0.38);
      });
      cenarioDados3D.renderer.render(cenarioDados3D.cena, cenarioDados3D.camera);

      if (progresso < 1) {
        cenarioDados3D.quadro = window.requestAnimationFrame(quadro);
      } else {
        cenarioDados3D.quadro = 0;
        resolve();
      }
    };

    cenarioDados3D.quadro = window.requestAnimationFrame(quadro);
  });
}

function renderizarSeletoresDados() {
  const seletores = $('seletores');
  seletores.replaceChildren();

  quantidadesDados.forEach((quantidade, lados) => {
    const linha = document.createElement('div');
    linha.className = 'dice-count-row';
    linha.style.setProperty('--dice-accent', paletaAtualDados(lados).destaque);

    const icone = document.createElement('span');
    icone.className = 'dice-icon';
    icone.setAttribute('aria-hidden', 'true');
    icone.textContent = iconesDados.get(lados);

    const titulo = document.createElement('strong');
    titulo.textContent = `D${lados}`;

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.dataset.countChange = '-1';
    remover.dataset.sides = String(lados);
    remover.setAttribute('aria-label', `Remover um D${lados}`);
    remover.textContent = '−';
    remover.onclick = () => alterarQuantidadeDado(lados, -1);

    const contador = document.createElement('output');
    contador.dataset.diceCount = String(lados);
    contador.textContent = String(quantidade);
    contador.setAttribute('aria-label', `Quantidade de D${lados}`);

    const adicionar = document.createElement('button');
    adicionar.type = 'button';
    adicionar.dataset.countChange = '1';
    adicionar.dataset.sides = String(lados);
    adicionar.setAttribute('aria-label', `Adicionar um D${lados}`);
    adicionar.textContent = '+';
    adicionar.onclick = () => alterarQuantidadeDado(lados, 1);

    linha.append(icone, titulo, remover, contador, adicionar);
    seletores.appendChild(linha);
  });
}

function interpretarFormulaDados(formula) {
  const compacta = formula.replace(/\s+/g, '').toLowerCase();
  if (!compacta) throw new Error('Digite uma fórmula de rolagem.');

  const grupos = new Map();
  let modificador = 0;
  let totalDados = 0;
  let posicao = 0;
  let primeiroTermo = true;

  while (posicao < compacta.length) {
    const restante = compacta.slice(posicao);
    if (!primeiroTermo && !/^[+-]/.test(restante)) {
      throw new Error('Separe cada dado ou modificador com + ou -.');
    }

    const termo = restante.match(/^([+-]?)(?:(\d*)d(100|4|6|8|10|12|20)|(\d+))/i);
    if (!termo) throw new Error('Fórmula inválida. Exemplo: 3d20+2 ou 2d6-1.');

    const [, sinal, quantidadeTexto, ladosTexto, constanteTexto] = termo;
    if (ladosTexto) {
      if (sinal === '-') {
        throw new Error('Não é possível subtrair um grupo de dados. Use um modificador, como 2d6-1.');
      }
      const quantidade = Number(quantidadeTexto || 1);
      const lados = Number(ladosTexto);
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_DADOS_POR_TIPO) {
        throw new Error(`Use de 1 a ${MAX_DADOS_POR_TIPO} dados de cada tipo.`);
      }
      grupos.set(lados, (grupos.get(lados) || 0) + quantidade);
      totalDados += quantidade;
      if (grupos.get(lados) > MAX_DADOS_POR_TIPO) {
        throw new Error(`Use no máximo ${MAX_DADOS_POR_TIPO} dados de cada tipo.`);
      }
    } else {
      modificador += (sinal === '-' ? -1 : 1) * Number(constanteTexto);
    }

    if (totalDados > LIMITE_DADOS_POR_ROLAGEM) {
      throw new Error(`Use no máximo ${LIMITE_DADOS_POR_ROLAGEM} dados por rolagem.`);
    }
    posicao += termo[0].length;
    primeiroTermo = false;
  }

  if (!totalDados) throw new Error('A fórmula precisa incluir pelo menos um dado.');
  return { grupos, modificador };
}

function formatarFormulaDados(grupos, modificador = 0) {
  const formulaDados = [...grupos.entries()]
    .map(([lados, quantidade]) => `${quantidade}d${lados}`)
    .join('+');
  if (!modificador) return formulaDados;
  return `${formulaDados}${modificador > 0 ? '+' : ''}${modificador}`;
}

function atualizarSelecaoDados() {
  const totalSelecionado = [...quantidadesDados.values()]
    .reduce((soma, quantidade) => soma + quantidade, 0);

  quantidadesDados.forEach((quantidade, lados) => {
    const contador = document.querySelector(`#seletores [data-dice-count="${lados}"]`);
    if (contador) contador.textContent = String(quantidade);
    document.querySelectorAll(`#tela-dados [data-sides="${lados}"][data-count-change="-1"]`)
      .forEach(botao => { botao.disabled = quantidade === 0; });
    document.querySelectorAll(`#tela-dados [data-sides="${lados}"][data-count-change="1"]`)
      .forEach(botao => {
        botao.disabled =
          quantidade === MAX_DADOS_POR_TIPO || totalSelecionado >= LIMITE_DADOS_POR_ROLAGEM;
      });
  });

  $('rolar').disabled =
    totalSelecionado === 0 && !$('dice-formula').value.trim();
}

function alterarQuantidadeDado(lados, alteracao) {
  const quantidade = quantidadesDados.get(lados) ?? 0;
  const totalSelecionado = [...quantidadesDados.values()]
    .reduce((soma, selecionada) => soma + selecionada, 0);
  if (alteracao > 0 && totalSelecionado >= LIMITE_DADOS_POR_ROLAGEM) {
    $('detalhes').textContent = `Use no máximo ${LIMITE_DADOS_POR_ROLAGEM} dados por rolagem.`;
    return;
  }

  const novaQuantidade = Math.max(
    0,
    Math.min(MAX_DADOS_POR_TIPO, quantidade + alteracao)
  );
  quantidadesDados.set(lados, novaQuantidade);
  $('dice-formula').value = formatarFormulaDados(
    new Map([...quantidadesDados].filter(([, quantidade]) => quantidade > 0))
  );
  $('dice-macro').value = '';
  atualizarSelecaoDados();
}

function renderizarHistoricoDados() {
  const historico = $('historico');
  historico.replaceChildren();

  if (!historicoRolagens.length) {
    const vazio = document.createElement('p');
    vazio.className = 'dice-history-empty';
    vazio.textContent = 'Suas rolagens aparecerão aqui.';
    historico.appendChild(vazio);
    return;
  }

  historicoRolagens.forEach(rolagem => {
    const item = document.createElement('article');
    item.className = 'dice-history-entry';

    const expressao = document.createElement('strong');
    expressao.textContent = rolagem.expressao;
    const horario = document.createElement('small');
    horario.textContent = rolagem.horario;
    item.append(expressao, horario);
    historico.appendChild(item);
  });
}

$('rolar').onclick = async () => {
  if (rolagemDadosAtiva) return;
  let grupos;
  let modificador = 0;
  const formulaDigitada = $('dice-formula').value.trim();
  if (formulaDigitada) {
    try {
      ({ grupos, modificador } = interpretarFormulaDados(formulaDigitada));
    } catch (erro) {
      $('detalhes').textContent = erro.message;
      return;
    }
  } else {
    grupos = new Map([...quantidadesDados.entries()]
      .filter(([, quantidade]) => quantidade > 0));
  }
  if (!grupos.size) return;

  const rolagens = [...grupos.entries()].flatMap(([lados, quantidade]) =>
    Array.from({ length: quantidade }, () => {
      const valor = rolarDado(lados);
      return {
        lados,
        valor,
        elemento: criarDado2D(lados, valor)
      };
    })
  );
  somDadosRPG(rolagens.length);
  $('cenario-dados').replaceChildren(...rolagens.map(rolagem => rolagem.elemento));
  rolagemDadosAtiva = true;
  $('total').textContent = '...';
  $('detalhes').textContent = 'Preparando a mesa de dados 3D...';
  document.querySelectorAll(
    '#tela-dados [data-count-change], #limpar, #rolar, #dice-formula, #dice-macro'
  )
    .forEach(botao => { botao.disabled = true; });

  const disponivel3D = await inicializarCenarioDados3D();
  const usarCenario3D = disponivel3D && prepararDadosCenario3D(rolagens);
  if (usarCenario3D) {
    $('detalhes').textContent = 'Os dados estão rolando...';
  } else {
    $('detalhes').textContent =
      'A mesa 3D não está disponível. Rolando na animação alternativa...';
    rolagens.forEach(rolagem => {
      const dado = rolagem.elemento.querySelector('.dice-2d');
      dado.classList.add('is-rolling');
      animarCuboD6(dado, rolagem.valor);
    });
  }

  if (!MOVIMENTO_REDUZIDO) {
    rolagens.forEach(rolagem => {
      const indicador = rolagem.elemento.querySelector('.rolled-die-result');
      indicador.textContent = '· · ·';
      rolagem.intervalo = window.setInterval(() => {
        indicador.textContent = `Girando · ${rolarDado(rolagem.lados)}`;
      }, 110);
    });
  }

  if (usarCenario3D) {
    await animarDadosCenario3D();
  } else {
    await new Promise(resolve =>
      window.setTimeout(resolve, DURACAO_ROLAGEM_DADOS + 150)
    );
  }

  const total = rolagens.reduce((soma, rolagem) => soma + rolagem.valor, modificador);
  rolagens.forEach(rolagem => {
    if (rolagem.intervalo) window.clearInterval(rolagem.intervalo);
    const dado = rolagem.elemento.querySelector('.dice-2d');
    dado.classList.remove('is-rolling');
    dado.querySelector('.dice-cube-d6')?.classList.remove('is-rolling');
    const critico = rolagem.lados >= 4 && rolagem.valor === rolagem.lados;
    const falha = rolagem.lados >= 4 && rolagem.valor === 1;
    rolagem.elemento.classList.toggle('is-critical', critico);
    rolagem.elemento.classList.toggle('is-fumble', falha);
    rolagem.elemento.querySelector('.rolled-die-result').textContent =
      critico ? `★ CRÍTICO: ${rolagem.valor}` :
      falha ? `✖ FALHA: ${rolagem.valor}` : `Resultado: ${rolagem.valor}`;
    rolagem.elemento.setAttribute(
      'aria-label',
      `Dado de ${rolagem.lados} lados: resultado ${rolagem.valor}`
    );
  });

  const expressao = [...grupos.entries()]
    .map(([lados, quantidade]) => {
      const resultados = rolagens
        .filter(rolagem => rolagem.lados === lados)
        .map(rolagem => rolagem.valor);
      return `${quantidade}d${lados} [${resultados.join(', ')}]`;
    })
    .join(' + ') +
    (modificador ? ` ${modificador > 0 ? '+' : '-'} ${Math.abs(modificador)}` : '');
  $('total').textContent = String(total);
  $('detalhes').textContent = expressao;
  const cartaoTotal = $('total').closest('.dice-total-card');
  cartaoTotal.classList.remove('is-critical', 'is-fumble', 'pop');
  void cartaoTotal.offsetWidth;
  cartaoTotal.classList.add('pop');
  if (rolagens.length === 1) {
    const unico = rolagens[0];
    if (unico.valor === unico.lados) cartaoTotal.classList.add('is-critical');
    else if (unico.valor === 1) cartaoTotal.classList.add('is-fumble');
  }
  historicoRolagens.unshift({
    expressao: `${expressao} = ${total}`,
    horario: ` · às ${new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`
  });
  renderizarHistoricoDados();
  document.querySelectorAll(
    '#tela-dados [data-count-change], #limpar, #dice-formula, #dice-macro'
  )
    .forEach(botao => { botao.disabled = false; });
  rolagemDadosAtiva = false;
  atualizarSelecaoDados();
};

$('limpar').onclick = () => {
  if (rolagemDadosAtiva) return;
  quantidadesDados.forEach((_, lados) => quantidadesDados.set(lados, 0));
  $('dice-formula').value = '';
  $('dice-macro').value = '';
  historicoRolagens.length = 0;
  mostrarDadosIniciais2D();
  $('total').textContent = '—';
  $('detalhes').textContent = 'Selecione os dados para começar.';
  renderizarHistoricoDados();
  atualizarSelecaoDados();
};

$('dice-formula').addEventListener('input', () => {
  $('dice-macro').value = '';
  atualizarSelecaoDados();
});

$('dice-macro').addEventListener('change', () => {
  const formula = $('dice-macro').value;
  if (!formula) return;
  $('dice-formula').value = formula;
  const { grupos } = interpretarFormulaDados(formula);
  quantidadesDados.forEach((_, lados) => {
    quantidadesDados.set(lados, grupos.get(lados) || 0);
  });
  renderizarSeletoresDados();
  atualizarSelecaoDados();
});

renderizarSeletoresDados();
atualizarSelecaoDados();
mostrarDadosIniciais2D();
void inicializarCenarioDados3D();

document.querySelectorAll('[data-dado]').forEach(botao => {
  botao.onclick = () => {
    const lados = Number(botao.dataset.dado);
    const rolagem = botao.closest('.dice-roller');
    const dado = rolagem.querySelector('.dice-3d');
    const resultado = rolagem.querySelector('#master-roll-result, #resultado-dado');
    const valor = rolarDado(lados);
    somDadosRPG(1);

    rolagem.querySelectorAll('[data-dado]').forEach(botaoDado => {
      botaoDado.disabled = true;
    });

    dado.dataset.sides = String(lados);
    desenharDado(dado, lados);
    dado.querySelector('.dice-face-value').textContent = '…';
    dado.querySelector('.dice-face-label').textContent = `D${lados}`;
    resultado.textContent = 'ROLANDO...';
    dado.classList.remove('is-rolling');
    void dado.offsetWidth;
    dado.classList.add('is-rolling');

    window.setTimeout(() => {
      dado.classList.remove('is-rolling');
      dado.querySelector('.dice-face-value').textContent = String(valor);
      resultado.textContent = `D${lados}: ${valor}`;
      rolagem.querySelectorAll('[data-dado]').forEach(botaoDado => {
        botaoDado.disabled = false;
      });
    }, DURACAO_ANIMACAO_DADO);
  };
});

/* ==========================================
   ESTADO DO LOGIN
========================================== */

onAuthStateChanged(auth, async usuario => {
  if (usuario) {
    $('welcome-message').textContent =
      `Bem-vindo, ${usuario.displayName || 'Investigador'}. ` +
      'Selecione uma área para começar.';

    mostrarRegistros('personagens', 'lista-personagens');
    mostrarRegistros('casos', 'lista-casos');
    mostrarRegistros('anotacoes', 'lista-anotacoes');
    mostrarCampanha();
    mostrarRegistros('objetivos', 'lista-objetivos');
    await restaurarCampanhaCompartilhada();
    atualizarPainelMestre();

    voltarPainel();
    mostrarTela('app');
  } else {
    if (campanhaCompartilhada.pararEscuta) {
      campanhaCompartilhada.pararEscuta();
    }
    campanhaCompartilhada = {
      codigo: '',
      papel: '',
      fichas: [],
      pararEscuta: null
    };
    voltarPainel();
    mostrarFormulario('login');
    mostrarTela('inicio');
  }
});

$('logout-button').onclick = async () => {
  try {
    await signOut(auth);
  } catch {
    alert('Não foi possível sair da conta.');
  }
};