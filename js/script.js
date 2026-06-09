
(function () {
  const canvas  = document.getElementById('dollar-canvas');
  const ctx     = canvas.getContext('2d');
  const COUNT   = 28;
  const SYMBOLS = ['$', '$', '$', '💵', '$', '$'];
  let W, H, drops;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeDrops() {
    drops = Array.from({ length: COUNT }, (_, i) => ({
      x:      Math.random() * (W || 800),
      y:      Math.random() * -500 - 20,
      speed:  0.35 + Math.random() * 0.65,
      size:   11 + Math.random() * 14,
      alpha:  0.06 + Math.random() * 0.12,
      rot:    Math.random() * Math.PI * 2,
      rotV:   (Math.random() - 0.5) * 0.012,
      sym:    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      delay:  i * 120,
      active: false,
    }));
  }

  let elapsed = 0, last = 0;

  function tick(ts) {
    const dt = ts - last;
    last     = ts;
    elapsed += dt;

    ctx.clearRect(0, 0, W, H);

    drops.forEach(d => {
      if (elapsed < d.delay) return;
      d.active = true;
      d.y     += d.speed;
      d.rot   += d.rotV;

      if (d.y > H + 40) {
        d.y = -30;
        d.x = Math.random() * W;
      }

      // mais visível conforme rola a página
      const scrollRatio = Math.min(window.scrollY / 400, 1);
      const alpha = d.alpha * (0.5 + scrollRatio * 0.5);

      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.globalAlpha = alpha;
      ctx.font        = `${d.size}px sans-serif`;
      ctx.fillStyle   = '#16a34a';
      ctx.fillText(d.sym, 0, 0);
      ctx.restore();
    });

    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', () => { resize(); makeDrops(); });
  resize();
  makeDrops();
  requestAnimationFrame(tick);
})();

/* ══════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════ */
const revealObserver = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.12 }
);

function observeAll() {
  document.querySelectorAll('.card, .form-card, .transacao-item').forEach(el => {
    el.classList.remove('visible');
    revealObserver.observe(el);
  });
}

/* ══════════════════════════════════════
   ESTADO & STORAGE
══════════════════════════════════════ */
let transacoes = JSON.parse(localStorage.getItem('fc-transacoes') || '[]');

function salvar() {
  localStorage.setItem('fc-transacoes', JSON.stringify(transacoes));
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function fmt(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
function toast(msg, icon = '✅') {
  const wrap = document.getElementById('toast-wrap');
  const el   = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast__icon">${icon}</span><span>${msg}</span>`;
  wrap.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast--saindo');
    el.addEventListener('animationend', () => el.remove());
  }, 2600);
}

/* ══════════════════════════════════════
   RESUMO
══════════════════════════════════════ */
function atualizarResumo() {
  const receitas = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((a, t) => a + t.valor, 0);

  const despesas = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((a, t) => a + t.valor, 0);

  const saldo = receitas - despesas;

  document.getElementById('receitas').textContent = fmt(receitas);
  document.getElementById('despesas').textContent = fmt(despesas);

  const elSaldo = document.getElementById('saldo');
  elSaldo.textContent = fmt(saldo);
  elSaldo.className   = 'card__value';
  if (saldo > 0) elSaldo.classList.add('card__value--positivo');
  if (saldo < 0) elSaldo.classList.add('card__value--negativo');
}

/* ══════════════════════════════════════
   LISTA
══════════════════════════════════════ */
function criarItem(t) {
  const li    = document.createElement('li');
  li.className  = `transacao-item transacao-item--${t.tipo}`;
  li.dataset.id = t.id;

  const sinal = t.tipo === 'receita' ? '+' : '−';
  const icone = t.tipo === 'receita' ? '📈' : '📉';
  const label = t.tipo === 'receita' ? 'Receita' : 'Despesa';

  li.innerHTML = `
    <div class="transacao-item__badge">${icone}</div>
    <div class="transacao-item__info">
      <p class="transacao-item__titulo">${t.titulo}</p>
      <span class="transacao-item__tipo">${label}</span>
    </div>
    <span class="transacao-item__valor transacao-item__valor--${t.tipo}">
      ${sinal} ${fmt(t.valor)}
    </span>
    <button class="transacao-item__remover" data-id="${t.id}" aria-label="Remover">✕</button>
  `;

  return li;
}

function renderizarLista() {
  const lista = document.getElementById('transacoes-lista');
  const vazio = document.getElementById('historico-vazio');
  lista.innerHTML = '';

  if (transacoes.length === 0) {
    vazio.style.display = 'block';
  } else {
    vazio.style.display = 'none';
    [...transacoes].reverse().forEach(t => lista.appendChild(criarItem(t)));
  }

  observeAll();
}

/* ══════════════════════════════════════
   ADICIONAR
══════════════════════════════════════ */
const inputTitulo = document.getElementById('titulo');
const inputValor  = document.getElementById('valor');
const selectTipo  = document.getElementById('tipo');

function adicionarTransacao() {
  const titulo = inputTitulo.value.trim();
  const valor  = parseFloat(inputValor.value);
  const tipo   = selectTipo.value;
  let ok = true;

  if (!titulo) {
    inputTitulo.classList.add('form-input--erro');
    inputTitulo.focus();
    ok = false;
  }
  if (!valor || valor <= 0) {
    inputValor.classList.add('form-input--erro');
    if (ok) inputValor.focus();
    ok = false;
  }
  if (!ok) return;

  transacoes.push({ id: uid(), titulo, valor, tipo });
  salvar();
  renderizarLista();
  atualizarResumo();

  inputTitulo.value = '';
  inputValor.value  = '';
  selectTipo.value  = 'receita';
  inputTitulo.classList.remove('form-input--erro');
  inputValor.classList.remove('form-input--erro');
  inputTitulo.focus();

  toast(
    tipo === 'receita' ? 'Receita adicionada!' : 'Despesa registrada.',
    tipo === 'receita' ? '📈' : '📉'
  );
}

/* ══════════════════════════════════════
   REMOVER / LIMPAR
══════════════════════════════════════ */
function removerTransacao(id) {
  transacoes = transacoes.filter(t => t.id !== id);
  salvar();
  renderizarLista();
  atualizarResumo();
  toast('Transação removida.', '🗑️');
}

function limparTudo() {
  if (!transacoes.length) return;
  if (!confirm('Apagar todas as transações? Esta ação não pode ser desfeita.')) return;
  transacoes = [];
  salvar();
  renderizarLista();
  atualizarResumo();
  toast('Histórico apagado.', '🗑️');
}

/* ══════════════════════════════════════
   EVENTOS
══════════════════════════════════════ */
document.getElementById('btn-adicionar').addEventListener('click', adicionarTransacao);
document.getElementById('btn-limpar').addEventListener('click', limparTudo);

[inputTitulo, inputValor].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') adicionarTransacao(); });
  el.addEventListener('input',   () => el.classList.remove('form-input--erro'));
});

document.getElementById('transacoes-lista').addEventListener('click', e => {
  const btn = e.target.closest('.transacao-item__remover');
  if (btn) removerTransacao(btn.dataset.id);
});

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
renderizarLista();
atualizarResumo();
observeAll();
