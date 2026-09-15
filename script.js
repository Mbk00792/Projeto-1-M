const DIAS_ABREV = ['SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.', 'DOM.'];
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const HORA_ALTURA_PX = 48;
const CHAVE_STORAGE = 'agenda_semana_eventos_v1';

const PALETA = [
  { nome: 'Vinho', cor: '#7C4054' },
  { nome: 'Rosa', cor: '#B85C82' },
  { nome: 'Laranja', cor: '#E2632F' },
  { nome: 'Verde', cor: '#3FAE74' },
  { nome: 'Azul', cor: '#4C6B8A' },
  { nome: 'Oliva', cor: '#8A9A4F' },
];

let corSelecionada = PALETA[0].cor;
let eventos = {}; // { "2026-08-26": [{id, titulo, cor, diaInteiro, inicio, fim}] }
let weekStart = getMonday(new Date());
let diaSelecionado = null;

const weekLabel = document.getElementById('week-label');
const cabecalhoDias = document.getElementById('cabecalho-dias');
const diaInteiroLinha = document.getElementById('dia-inteiro-linha');
const gutterHoras = document.getElementById('gutter-horas');
const colunasDias = document.getElementById('colunas-dias');
const gradeScroll = document.getElementById('grade-scroll');

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

function montarSeletorCores() {
  coresPicker.innerHTML = '';
  PALETA.forEach(({ nome, cor }) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'cor-swatch';
    swatch.style.background = cor;
    swatch.dataset.cor = cor;
    swatch.setAttribute('aria-label', nome);
    if (cor === corSelecionada) swatch.classList.add('selecionada');

    swatch.addEventListener('click', () => {
      corSelecionada = cor;
      corCustomInput.classList.remove('selecionada');
      [...coresPicker.querySelectorAll('.cor-swatch')].forEach((el) => {
        el.classList.toggle('selecionada', el.dataset.cor === cor);
      });
    });

    coresPicker.appendChild(swatch);
  });

  const corCustomInput = document.createElement('input');
  corCustomInput.type = 'color';
  corCustomInput.className = 'cor-custom';
  corCustomInput.value = corSelecionada;
  corCustomInput.title = 'Escolher outra cor';
  corCustomInput.setAttribute('aria-label', 'Escolher cor personalizada');

  corCustomInput.addEventListener('input', () => {
    corSelecionada = corCustomInput.value;
    corCustomInput.classList.add('selecionada');
    [...coresPicker.querySelectorAll('.cor-swatch')].forEach((el) => {
      el.classList.remove('selecionada');
    });
  });

  coresPicker.appendChild(corCustomInput);
}

function montarGutterHoras() {
  gutterHoras.innerHTML = '';
  gutterHoras.style.height = `${24 * HORA_ALTURA_PX}px`;
  for (let h = 0; h < 24; h++) {
    const rotulo = document.createElement('div');
    rotulo.className = 'rotulo-hora';
    rotulo.style.top = `${h * HORA_ALTURA_PX}px`;
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

function renderSemana() {
  const hoje = new Date();
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dias.push(d);
  }

  weekLabel.textContent = formatarLabelSemana(dias);

  // Cabeçalho dos dias
  cabecalhoDias.querySelectorAll('.dia-header').forEach((el) => el.remove());
  dias.forEach((d) => {
    const ehHoje = mesmoDay(d, hoje);
    const col = document.createElement('div');
    col.className = 'dia-header' + (ehHoje ? ' hoje' : '');
    col.innerHTML = `<div class="abrev">${DIAS_ABREV[(d.getDay() + 6) % 7]}</div><div class="numero">${d.getDate()}</div>`;
    col.addEventListener('click', () => abrirPainel(d));
    cabecalhoDias.appendChild(col);
  });

  // Linha de eventos de dia inteiro
  diaInteiroLinha.querySelectorAll('.coluna-dia-inteiro').forEach((el) => el.remove());
  dias.forEach((d) => {
    const chave = formatarChave(d);
    const col = document.createElement('div');
    col.className = 'coluna-dia-inteiro';
    const lista = (eventos[chave] || []).filter((ev) => ev.diaInteiro);
    lista.forEach((ev) => {
      const chip = document.createElement('div');
      chip.className = 'chip-dia-inteiro';
      chip.style.background = ev.cor;
      chip.textContent = ev.titulo;
      col.appendChild(chip);
    });
    col.addEventListener('click', () => abrirPainel(d));
    diaInteiroLinha.appendChild(col);
  });

  // Colunas com grade de horários
  colunasDias.innerHTML = '';
  colunasDias.style.height = `${24 * HORA_ALTURA_PX}px`;
  dias.forEach((d) => {
    const ehHoje = mesmoDay(d, hoje);
    const chave = formatarChave(d);
    const col = document.createElement('div');
    col.className = 'coluna-dia' + (ehHoje ? ' hoje' : '');
    col.addEventListener('click', (e) => {
      if (e.target === col) abrirPainel(d);
    });

    const lista = (eventos[chave] || []).filter((ev) => !ev.diaInteiro);
    lista.forEach((ev) => {
      const [hIni, mIni] = ev.inicio.split(':').map(Number);
      const [hFim, mFim] = ev.fim.split(':').map(Number);
      const minutosIni = hIni * 60 + mIni;
      const minutosFim = Math.max(hFim * 60 + mFim, minutosIni + 20);

      const bloco = document.createElement('div');
      bloco.className = 'evento-bloco';
      bloco.style.top = `${(minutosIni / 60) * HORA_ALTURA_PX}px`;
      bloco.style.height = `${((minutosFim - minutosIni) / 60) * HORA_ALTURA_PX}px`;
      bloco.style.background = ev.cor;
      bloco.innerHTML = `<strong>${ev.titulo}</strong><span>${ev.inicio} – ${ev.fim}</span>`;
      bloco.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirPainel(d);
      });
      col.appendChild(bloco);
    });

    if (ehHoje) {
      const minutosAgora = hoje.getHours() * 60 + hoje.getMinutes();
      const linhaAgora = document.createElement('div');
      linhaAgora.className = 'linha-tempo-atual';
      linhaAgora.style.top = `${(minutosAgora / 60) * HORA_ALTURA_PX}px`;
      col.appendChild(linhaAgora);
    }

    colunasDias.appendChild(col);
  });
}

function abrirPainel(data) {
  diaSelecionado = data;
  const bruto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  painelTituloDia.textContent = bruto.charAt(0).toUpperCase() + bruto.slice(1);
  renderizarListaPainel();
  painelOverlay.hidden = false;
  inputTitulo.focus();
}

function fecharPainel() {
  painelOverlay.hidden = true;
  painelForm.reset();
  inputDiaInteiro.checked = false;
  linhaHoras.style.display = 'flex';
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

    const info = document.createElement('div');
    info.className = 'evento-info';

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
    txt.appendChild(titulo);
    txt.appendChild(hora);

    info.appendChild(ponto);
    info.appendChild(txt);

    const btnRemover = document.createElement('button');
    btnRemover.textContent = '×';
    btnRemover.setAttribute('aria-label', `Remover evento ${ev.titulo}`);
    btnRemover.addEventListener('click', () => removerEvento(ev.id));

    item.appendChild(info);
    item.appendChild(btnRemover);
    painelLista.appendChild(item);
  });
}

function adicionarEvento(dados) {
  const chave = formatarChave(diaSelecionado);
  if (!eventos[chave]) eventos[chave] = [];
  eventos[chave].push({ id: Date.now().toString(), ...dados });
  salvarEventos();
  renderizarListaPainel();
  renderSemana();
}

function removerEvento(id) {
  const chave = formatarChave(diaSelecionado);
  eventos[chave] = (eventos[chave] || []).filter((ev) => ev.id !== id);
  if (eventos[chave].length === 0) delete eventos[chave];
  salvarEventos();
  renderizarListaPainel();
  renderSemana();
}

function scrollParaAgora() {
  const hoje = new Date();
  const offset = Math.max(0, (hoje.getHours() - 2) * HORA_ALTURA_PX);
  gradeScroll.scrollTop = offset;
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
  renderSemana();
  scrollParaAgora();
});

document.getElementById('painel-fechar').addEventListener('click', fecharPainel);

inputDiaInteiro.addEventListener('change', () => {
  linhaHoras.style.display = inputDiaInteiro.checked ? 'none' : 'flex';
});

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

  adicionarEvento({
    titulo,
    cor: corSelecionada,
    diaInteiro,
    inicio: diaInteiro ? null : inputInicio.value,
    fim: diaInteiro ? null : inputFim.value,
  });

  inputTitulo.value = '';
});

// Atualiza a linha de "agora" a cada minuto
setInterval(renderSemana, 60000);

montarSeletorCores();
montarGutterHoras();
carregarEventos();
renderSemana();
scrollParaAgora();