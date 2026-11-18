const DIAS_ABREV = ['SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.', 'DOM.'];
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const CHAVE_STORAGE = 'agenda_semana_eventos_v1';
const CONSULTA_TELA_ESTREITA = window.matchMedia('(max-width: 640px)');

const PALETA = [
  { nome: 'Vinho', cor: '#7C4054' },
  { nome: 'Rosa', cor: '#B85C82' },
  { nome: 'Laranja', cor: '#E2632F' },
  { nome: 'Verde', cor: '#3FAE74' },
  { nome: 'Azul', cor: '#4C6B8A' },
  { nome: 'Oliva', cor: '#8A9A4F' },
];

let corSelecionada = PALETA[0].cor;
let corCustomInput = null;
let eventos = {}; // { "2026-08-26": [{id, titulo, cor, diaInteiro, inicio, fim}] }
let weekStart = getMonday(new Date());
let diaSelecionado = null;
let eventoEmEdicao = null;
let rascunhoAntesDeEditar = null;
let chaveFocoPainel = null;
let chaveDiaRenderizado = null;
let indiceDiaMovel = null;

const weekLabel = document.getElementById('week-label');
const cabecalhoDias = document.getElementById('cabecalho-dias');
const diaInteiroLinha = document.getElementById('dia-inteiro-linha');
const gutterHoras = document.getElementById('gutter-horas');
const colunasDias = document.getElementById('colunas-dias');
const gradeScroll = document.getElementById('grade-scroll');
const gradeSemana = document.querySelector('.grade-semana');

const painelOverlay = document.getElementById('painel-overlay');
const painelTituloDia = document.getElementById('painel-titulo-dia');
const painelLista = document.getElementById('painel-lista');
const painelForm = document.getElementById('painel-form');
const inputDiaInteiro = document.getElementById('input-dia-inteiro');
const linhaHoras = document.getElementById('linha-horas');
const inputInicio = document.getElementById('input-inicio');
const inputFim = document.getElementById('input-fim');
const inputTitulo = document.getElementById('input-titulo');
const coresPicker = document.getElementById('cores-picker');
const btnSalvar = document.getElementById('btn-salvar');
const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');

function getMonday(date) {
  const d = new Date(date);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatarChave(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mesmoDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function diasDaSemana() {
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dias.push(d);
  }
  return dias;
}

function visaoDiaUnico() {
  return CONSULTA_TELA_ESTREITA.matches;
}

function indiceDiaEmFoco(dias) {
  if (indiceDiaMovel == null || indiceDiaMovel < 0 || indiceDiaMovel > 6) {
    const hoje = new Date();
    const encontrado = dias.findIndex((d) => mesmoDay(d, hoje));
    indiceDiaMovel = encontrado === -1 ? 0 : encontrado;
  }
  return indiceDiaMovel;
}

function alturaHora() {
  const valor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hora-altura'));
  return Number.isFinite(valor) && valor > 0 ? valor : 48;
}

function minutosDeHorario(horario) {
  const [h, m] = horario.split(':').map(Number);
  return h * 60 + m;
}

function formatarHorario(minutos) {
  const limitado = Math.max(0, Math.min(minutos, 23 * 60 + 59));
  const h = Math.floor(limitado / 60);
  const m = limitado % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function intervaloVisual(ev) {
  const ini = minutosDeHorario(ev.inicio);
  const fimReal = minutosDeHorario(ev.fim);
  const fim = Math.min(24 * 60, Math.max(fimReal, ini + 20));
  return { ini, fim };
}

function horarioDoClique(event, coluna) {
  const y = event.clientY - coluna.getBoundingClientRect().top;
  const minutos = Math.max(0, (y / alturaHora()) * 60);
  const inicioMin = Math.min(Math.floor(minutos / 30) * 30, 23 * 60);
  const fimMin = Math.min(inicioMin + 60, 23 * 60 + 59);
  return { inicio: formatarHorario(inicioMin), fim: formatarHorario(fimMin) };
}

function distribuirColunas(lista) {
  const ordenados = [...lista].sort((a, b) => {
    const ia = intervaloVisual(a);
    const ib = intervaloVisual(b);
    if (ia.ini !== ib.ini) return ia.ini - ib.ini;
    return ib.fim - ia.fim;
  });

  const grupos = [];
  let grupo = [];
  let fimGrupo = -1;
  ordenados.forEach((ev) => {
    const { ini, fim } = intervaloVisual(ev);
    if (grupo.length > 0 && ini >= fimGrupo) {
      grupos.push(grupo);
      grupo = [];
      fimGrupo = -1;
    }
    grupo.push(ev);
    fimGrupo = Math.max(fimGrupo, fim);
  });
  if (grupo.length > 0) grupos.push(grupo);

  const posicoes = new Map();
  grupos.forEach((itens) => {
    const fins = [];
    itens.forEach((ev) => {
      const { ini, fim } = intervaloVisual(ev);
      let coluna = fins.findIndex((fimColuna) => fimColuna <= ini);
      if (coluna === -1) {
        coluna = fins.length;
        fins.push(fim);
      } else {
        fins[coluna] = fim;
      }
      posicoes.set(ev, { coluna, total: 0 });
    });
    itens.forEach((ev) => {
      posicoes.get(ev).total = fins.length;
    });
  });
  return posicoes;
}

function carregarEventos() {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE);
    eventos = raw ? JSON.parse(raw) : {};
  } catch (e) {
    eventos = {};
  }
}

function salvarEventos() {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(eventos));
  } catch (e) {
    /* localStorage indisponível: eventos ficam só nesta sessão */
  }
}

function selecionarCor(cor) {
  corSelecionada = cor;
  const amostras = [...coresPicker.querySelectorAll('.cor-swatch')];
  const igual = amostras.find((el) => el.dataset.cor.toLowerCase() === String(cor).toLowerCase());
  amostras.forEach((el) => el.classList.toggle('selecionada', el === igual));
  if (!corCustomInput) return;
  corCustomInput.classList.toggle('selecionada', !igual);
  if (!igual && /^#[0-9a-fA-F]{6}$/.test(cor) && corCustomInput.value.toLowerCase() !== cor.toLowerCase()) {
    corCustomInput.value = cor.toLowerCase();
  }
}

function montarSeletorCores() {
  coresPicker.innerHTML = '';
  PALETA.forEach(({ nome, cor }) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'cor-swatch';
    swatch.style.background = cor;
    swatch.dataset.cor = cor;
    swatch.setAttribute('aria-label', nome);
    swatch.addEventListener('click', () => selecionarCor(cor));
    coresPicker.appendChild(swatch);
  });

  corCustomInput = document.createElement('input');
  corCustomInput.type = 'color';
  corCustomInput.className = 'cor-custom';
  corCustomInput.value = PALETA[0].cor;
  corCustomInput.title = 'Escolher outra cor';
  corCustomInput.setAttribute('aria-label', 'Escolher cor personalizada');
  corCustomInput.addEventListener('input', () => selecionarCor(corCustomInput.value));
  coresPicker.appendChild(corCustomInput);
  selecionarCor(corSelecionada);
}

function montarGutterHoras(altura) {
  gutterHoras.innerHTML = '';
  gutterHoras.style.height = `${24 * altura}px`;
  for (let h = 0; h < 24; h++) {
    const rotulo = document.createElement('div');
    rotulo.className = 'rotulo-hora';
    rotulo.style.top = `${h * altura}px`;
    rotulo.textContent = `${String(h).padStart(2, '0')}:00`;
    gutterHoras.appendChild(rotulo);
  }
}

function formatarLabelSemana(dias) {
  const inicio = dias[0];
  const fim = dias[6];
  const mesInicio = MESES_ABREV[inicio.getMonth()];
  const mesFim = MESES_ABREV[fim.getMonth()];
  if (inicio.getMonth() === fim.getMonth()) {
    return `${inicio.getDate()} – ${fim.getDate()} de ${mesInicio.charAt(0).toUpperCase() + mesInicio.slice(1)}, ${fim.getFullYear()}`;
  }
  return `${inicio.getDate()} ${mesInicio} – ${fim.getDate()} ${mesFim}, ${fim.getFullYear()}`;
}

function nomeDia(data) {
  const bruto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}

function renderSemana() {
  const altura = alturaHora();
  const visaoUnica = visaoDiaUnico();
  const hoje = new Date();
  const dias = diasDaSemana();
  const indice = indiceDiaEmFoco(dias);
  const diasGrade = visaoUnica ? [dias[indice]] : dias;

  chaveDiaRenderizado = formatarChave(hoje);
  gradeSemana.classList.toggle('visao-dia', visaoUnica);
  weekLabel.textContent = formatarLabelSemana(dias);
  montarGutterHoras(altura);

  cabecalhoDias.querySelectorAll('.dia-header').forEach((el) => el.remove());
  dias.forEach((d, i) => {
    const ehHoje = mesmoDay(d, hoje);
    const col = document.createElement('button');
    col.type = 'button';
    col.className = 'dia-header' + (ehHoje ? ' hoje' : '');
    col.dataset.chave = formatarChave(d);
    col.setAttribute('aria-label', nomeDia(d));
    if (ehHoje) col.setAttribute('aria-current', 'date');

    const abrev = document.createElement('div');
    abrev.className = 'abrev';
    abrev.textContent = DIAS_ABREV[(d.getDay() + 6) % 7];
    const numero = document.createElement('div');
    numero.className = 'numero';
    numero.textContent = String(d.getDate());
    col.append(abrev, numero);

    if (visaoUnica) {
      col.setAttribute('aria-pressed', i === indice ? 'true' : 'false');
      if (i === indice) col.classList.add('selecionado');
    }

    col.addEventListener('click', () => {
      if (!visaoUnica) {
        abrirPainel(d);
        return;
      }
      if (indiceDiaMovel === i) {
        abrirPainel(d);
        return;
      }
      indiceDiaMovel = i;
      renderSemana();
    });
    cabecalhoDias.appendChild(col);
  });

  diaInteiroLinha.querySelectorAll('.coluna-dia-inteiro').forEach((el) => el.remove());
  diasGrade.forEach((d) => {
    const chave = formatarChave(d);
    const col = document.createElement('div');
    col.className = 'coluna-dia-inteiro';
    const lista = (eventos[chave] || []).filter((ev) => ev.diaInteiro);
    lista.forEach((ev) => {
      const chip = document.createElement('div');
      chip.className = 'chip-dia-inteiro';
      chip.style.background = ev.cor;
      chip.textContent = ev.titulo;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirPainel(d, { evento: ev });
      });
      col.appendChild(chip);
    });
    col.addEventListener('click', (e) => {
      if (e.target !== col) return;
      abrirPainel(d, { diaInteiro: true });
    });
    diaInteiroLinha.appendChild(col);
  });

  colunasDias.innerHTML = '';
  colunasDias.style.height = `${24 * altura}px`;
  diasGrade.forEach((d) => {
    const ehHoje = mesmoDay(d, hoje);
    const chave = formatarChave(d);
    const col = document.createElement('div');
    col.className = 'coluna-dia' + (ehHoje ? ' hoje' : '');
    col.addEventListener('click', (e) => {
      if (e.target !== col) return;
      abrirPainel(d, horarioDoClique(e, col));
    });

    const lista = (eventos[chave] || []).filter((ev) => !ev.diaInteiro && ev.inicio && ev.fim);
    const posicoes = distribuirColunas(lista);
    lista.forEach((ev) => {
      const { ini, fim } = intervaloVisual(ev);
      const pos = posicoes.get(ev);
      const bloco = document.createElement('div');
      bloco.className = 'evento-bloco';
      bloco.style.top = `${(ini / 60) * altura}px`;
      bloco.style.height = `${((fim - ini) / 60) * altura}px`;
      bloco.style.left = `calc(${(pos.coluna / pos.total) * 100}% + 1px)`;
      bloco.style.width = `calc(${100 / pos.total}% - 2px)`;
      bloco.style.background = ev.cor;

      const titulo = document.createElement('strong');
      titulo.textContent = ev.titulo;
      const hora = document.createElement('span');
      hora.textContent = `${ev.inicio} – ${ev.fim}`;
      bloco.append(titulo, hora);

      bloco.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirPainel(d, { evento: ev });
      });
      col.appendChild(bloco);
    });

    colunasDias.appendChild(col);
  });

  posicionarLinhaAgora();
}

function posicionarLinhaAgora() {
  const coluna = colunasDias.querySelector('.coluna-dia.hoje');
  let linha = colunasDias.querySelector('.linha-tempo-atual');
  if (!coluna) {
    if (linha) linha.remove();
    return;
  }
  if (!linha) {
    linha = document.createElement('div');
    linha.className = 'linha-tempo-atual';
  }
  const agora = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  linha.style.top = `${(minutos / 60) * alturaHora()}px`;
  if (linha.parentElement !== coluna) coluna.appendChild(linha);
}

function atualizarLinhaAgora() {
  const chaveHoje = formatarChave(new Date());
  if (chaveHoje !== chaveDiaRenderizado) {
    renderSemana();
    return;
  }
  posicionarLinhaAgora();
}

// No minuto cheio. A grade só é recriada quando o dia muda.
function agendarLinhaAgora() {
  const agora = new Date();
  const espera = 60000 - (agora.getSeconds() * 1000 + agora.getMilliseconds());
  setTimeout(() => {
    atualizarLinhaAgora();
    agendarLinhaAgora();
  }, espera);
}

function abrirPainel(data, opcoes = {}) {
  diaSelecionado = data;
  chaveFocoPainel = formatarChave(data);
  rascunhoAntesDeEditar = null;
  painelTituloDia.textContent = nomeDia(data);
  if (opcoes.evento) prepararFormularioEdicao(opcoes.evento);
  else prepararFormularioNovo(opcoes);
  renderizarListaPainel();
  painelOverlay.hidden = false;
  inputTitulo.focus();
  if (opcoes.evento) inputTitulo.select();
}

function fecharPainel() {
  if (painelOverlay.hidden) return;
  painelOverlay.hidden = true;
  rascunhoAntesDeEditar = null;
  prepararFormularioNovo();
  const alvo = chaveFocoPainel && cabecalhoDias.querySelector(`[data-chave="${chaveFocoPainel}"]`);
  if (alvo) alvo.focus();
}

function atualizarAcaoFormulario() {
  const editando = eventoEmEdicao !== null;
  btnSalvar.textContent = editando ? '✓' : '+';
  btnSalvar.setAttribute('aria-label', editando ? 'Salvar alterações' : 'Adicionar evento');
  btnCancelarEdicao.hidden = !editando;
}

function prepararFormularioNovo({ titulo = '', inicio = '09:00', fim = '10:00', diaInteiro = false } = {}) {
  eventoEmEdicao = null;
  inputTitulo.value = titulo;
  inputDiaInteiro.checked = diaInteiro;
  linhaHoras.style.display = diaInteiro ? 'none' : 'flex';
  inputInicio.value = inicio || '09:00';
  inputFim.value = fim || '10:00';
  inputFim.setCustomValidity('');
  atualizarAcaoFormulario();
}

function prepararFormularioEdicao(ev) {
  eventoEmEdicao = ev.id;
  inputTitulo.value = ev.titulo;
  inputDiaInteiro.checked = Boolean(ev.diaInteiro);
  linhaHoras.style.display = ev.diaInteiro ? 'none' : 'flex';
  inputInicio.value = ev.inicio || '09:00';
  inputFim.value = ev.fim || '10:00';
  inputFim.setCustomValidity('');
  selecionarCor(ev.cor);
  atualizarAcaoFormulario();
}

function lerFormulario() {
  return {
    titulo: inputTitulo.value,
    diaInteiro: inputDiaInteiro.checked,
    inicio: inputInicio.value,
    fim: inputFim.value,
  };
}

function iniciarEdicao(ev) {
  if (eventoEmEdicao === null) rascunhoAntesDeEditar = lerFormulario();
  prepararFormularioEdicao(ev);
  renderizarListaPainel();
  inputTitulo.focus();
  inputTitulo.select();
}

function cancelarEdicao() {
  const rascunho = rascunhoAntesDeEditar;
  rascunhoAntesDeEditar = null;
  prepararFormularioNovo(rascunho || {});
  renderizarListaPainel();
  inputTitulo.focus();
}

function renderizarListaPainel() {
  painelLista.innerHTML = '';
  const chave = formatarChave(diaSelecionado);
  const lista = [...(eventos[chave] || [])].sort((a, b) => {
    if (a.diaInteiro && !b.diaInteiro) return -1;
    if (!a.diaInteiro && b.diaInteiro) return 1;
    if (a.diaInteiro && b.diaInteiro) return 0;
    return a.inicio.localeCompare(b.inicio);
  });

  if (lista.length === 0) {
    const vazio = document.createElement('li');
    vazio.className = 'vazio';
    vazio.textContent = 'Nenhum evento neste dia.';
    painelLista.appendChild(vazio);
    return;
  }

  lista.forEach((ev) => {
    const item = document.createElement('li');
    if (ev.id === eventoEmEdicao) item.classList.add('editando');

    const btnEditar = document.createElement('button');
    btnEditar.type = 'button';
    btnEditar.className = 'evento-info';
    btnEditar.addEventListener('click', () => iniciarEdicao(ev));

    const ponto = document.createElement('span');
    ponto.className = 'ponto';
    ponto.style.background = ev.cor;

    const txt = document.createElement('div');
    txt.className = 'txt';
    const titulo = document.createElement('span');
    titulo.className = 'titulo';
    titulo.textContent = ev.titulo;
    const hora = document.createElement('span');
    hora.className = 'hora';
    hora.textContent = ev.diaInteiro ? 'Dia inteiro' : `${ev.inicio} – ${ev.fim}`;
    txt.append(titulo, hora);
    btnEditar.append(ponto, txt);

    const btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.className = 'btn-remover';
    btnRemover.textContent = '×';
    btnRemover.setAttribute('aria-label', `Remover evento ${ev.titulo}`);
    btnRemover.addEventListener('click', () => removerEvento(ev.id));

    item.append(btnEditar, btnRemover);
    painelLista.appendChild(item);
  });

  const destacado = painelLista.querySelector('.editando');
  if (destacado) destacado.scrollIntoView({ block: 'nearest' });
}

function gravarEvento(dados) {
  const chave = formatarChave(diaSelecionado);
  if (!eventos[chave]) eventos[chave] = [];
  if (eventoEmEdicao) {
    const indice = eventos[chave].findIndex((ev) => ev.id === eventoEmEdicao);
    if (indice !== -1) eventos[chave][indice] = { ...eventos[chave][indice], ...dados };
    eventoEmEdicao = null;
  } else {
    eventos[chave].push({ id: Date.now().toString(), ...dados });
  }
  rascunhoAntesDeEditar = null;
  salvarEventos();
  atualizarAcaoFormulario();
  renderizarListaPainel();
  renderSemana();
}

function removerEvento(id) {
  const chave = formatarChave(diaSelecionado);
  const editava = eventoEmEdicao === id;
  eventos[chave] = (eventos[chave] || []).filter((ev) => ev.id !== id);
  if (eventos[chave].length === 0) delete eventos[chave];
  salvarEventos();
  if (editava) {
    const rascunho = rascunhoAntesDeEditar;
    rascunhoAntesDeEditar = null;
    prepararFormularioNovo(rascunho || {});
  }
  renderizarListaPainel();
  renderSemana();
}

function scrollParaAgora() {
  const dias = diasDaSemana();
  const hoje = new Date();
  if (visaoDiaUnico()) {
    if (!mesmoDay(dias[indiceDiaEmFoco(dias)], hoje)) return;
  } else if (!dias.some((d) => mesmoDay(d, hoje))) {
    return;
  }
  gradeScroll.scrollTop = Math.max(0, (hoje.getHours() - 2) * alturaHora());
}

document.getElementById('prev-week').addEventListener('click', () => {
  weekStart.setDate(weekStart.getDate() - 7);
  renderSemana();
});

document.getElementById('next-week').addEventListener('click', () => {
  weekStart.setDate(weekStart.getDate() + 7);
  renderSemana();
});

document.getElementById('btn-hoje').addEventListener('click', () => {
  weekStart = getMonday(new Date());
  indiceDiaMovel = null;
  renderSemana();
  scrollParaAgora();
});

document.getElementById('painel-fechar').addEventListener('click', fecharPainel);
painelOverlay.addEventListener('click', (e) => {
  if (e.target === painelOverlay) fecharPainel();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !painelOverlay.hidden) fecharPainel();
});

inputDiaInteiro.addEventListener('change', () => {
  linhaHoras.style.display = inputDiaInteiro.checked ? 'none' : 'flex';
});

inputInicio.addEventListener('input', () => inputFim.setCustomValidity(''));
inputFim.addEventListener('input', () => inputFim.setCustomValidity(''));

btnCancelarEdicao.addEventListener('click', cancelarEdicao);

painelForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const titulo = inputTitulo.value.trim();
  if (!titulo) return;

  const diaInteiro = inputDiaInteiro.checked;
  if (!diaInteiro && inputInicio.value >= inputFim.value) {
    inputFim.setCustomValidity('O horário final precisa ser depois do inicial.');
    inputFim.reportValidity();
    return;
  }
  inputFim.setCustomValidity('');

  gravarEvento({
    titulo,
    cor: corSelecionada,
    diaInteiro,
    inicio: diaInteiro ? null : inputInicio.value,
    fim: diaInteiro ? null : inputFim.value,
  });
  inputTitulo.value = '';
  inputTitulo.focus();
});

CONSULTA_TELA_ESTREITA.addEventListener('change', () => {
  renderSemana();
  scrollParaAgora();
});

montarSeletorCores();
carregarEventos();
renderSemana();
scrollParaAgora();
agendarLinhaAgora();
