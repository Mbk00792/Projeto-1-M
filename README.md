# Agenda da Semana

Agenda semanal no navegador, sem servidor. Os eventos ficam neste aparelho, no `localStorage` (`agenda_semana_eventos_v1`).

Abra `index.html` no navegador.

## Uso

- A semana começa na segunda. As setas mudam a semana e **Hoje** volta para a semana atual, com a grade rolada até o horário de agora.
- Clique num horário vazio para criar um evento começando nesse horário. Clique na faixa de dia inteiro para criar um evento de dia inteiro.
- Clique num evento para editar título, cor e horário. No painel, o mesmo formulário abre ao clicar no item da lista.
- Eventos que se cruzam no mesmo dia ficam lado a lado.
- Escape ou um clique no fundo escuro fecha o painel e devolve o foco ao dia que o abriu.
- Até 640px de largura, a grade mostra um dia por vez. Toque no dia do cabeçalho para escolhê-lo; toque de novo para abrir o painel desse dia.
- Uma linha vermelha marca o horário atual e anda a cada minuto, sem reconstruir a semana.
