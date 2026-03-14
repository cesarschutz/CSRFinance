# Prompt: Sistema Financeiro Pessoal — CSRFinance

Crie um sistema financeiro pessoal completo em **Angular 19+** com standalone components, signals, SCSS e design moderno (tema dark glassmorphism). O sistema deve ser responsivo (mobile-first), funcionar 100% no frontend (sem backend), com persistência em arquivo Excel (.xlsx) via SheetJS + File System Access API.

---

## 1. Entidades e Dados

### 1.1 Conta (`Account`)
- `id`, `name`, `bank`, `type`, `color`, `initialBalance`, `createdAt`
- **Tipos de conta:** `checking` (corrente), `credit_card` (cartão de crédito), `savings` (poupança), `investment` (investimento fixo)
- Contas do tipo `savings` e `investment` possuem `parentAccountId` vinculando à conta corrente mãe
- Contas `investment` possuem `investmentDate` (data do investimento) e `maturityDate` (data de resgate)
- Contas `credit_card` possuem `closingDay` (dia de fechamento da fatura), `dueDay` (dia de vencimento) e `creditLimit`

### 1.2 Transacao (`Transaction`)
- `id`, `description`, `amount`, `type`, `categoryId`, `accountId`, `date` (YYYY-MM-DD), `status`, `createdAt`
- **Tipos:** `income` (receita), `expense` (despesa), `transfer` (transferencia), `yield` (rendimento)
- **Status:** `settled` (pago/liquidado) ou `pending` (pendente)
- Transferencias usam `transferId` (ID unico pareando as duas pontas) e `transferAccountId` (conta destino/origem)
- Suporte a parcelamento: `installmentCurrent` e `installmentTotal`
- Vinculo com recorrencia: `recurringId`, `isFixed`

### 1.3 Categoria (`Category`)
- `id`, `name`, `type` (`income` ou `expense`), `icon` (emoji), `color` (hex)

### 1.4 Recorrencia (`RecurringTransaction`)
- `id`, `description`, `amount`, `type`, `categoryId`, `accountId`, `frequency`, `startDate`, `endDate?`, `dayOfMonth?`, `dayOfWeek?`, `status`, `lastGeneratedDate`, `active`, `createdAt`
- **Frequencias:** `weekly`, `biweekly`, `monthly`, `yearly`
- O sistema deve gerar automaticamente as transacoes pendentes de cada recorrencia ativa ate a data atual

---

## 2. Regras de Negocio

### 2.1 Saldo de Conta
```
saldo = saldoInicial + receitas + rendimentos - despesas - transferencias_saida + transferencias_entrada
```
- Transferencias criam DUAS transacoes pareadas pelo mesmo `transferId` — uma de saida na conta origem, uma de entrada na conta destino
- Na hora de calcular, deduplicar transferencias pelo `transferId` para nao contar dobrado

### 2.2 Investimentos
- Quando uma transferencia vai para uma conta do tipo `savings` ou `investment`, ela conta como **investimento** (nao como transferencia comum) nos resumos
- **Rendimento (yield):** ao atualizar o saldo real de uma conta de investimento, o sistema calcula `rendimento = saldoReal - saldoCalculado` e registra uma transacao do tipo `yield` automaticamente
- Cada conta de investimento deve ter: total depositado, total resgatado, rendimento total, saldo real, % de rendimento

### 2.3 Cartao de Credito
- Fatura mensal baseada no `closingDay` da conta
- Visualizar despesas do periodo da fatura (entre fechamentos)
- Pagamento da fatura gera uma transacao de despesa na conta corrente vinculada
- Mostrar limite disponivel = `creditLimit - totalFaturaPendente`

### 2.4 Transferencias
- Sempre criam um par de transacoes (saida + entrada) com o mesmo `transferId`
- Excluir uma transferencia deve excluir o par automaticamente
- Nao devem aparecer nos resumos de receita/despesa (exceto quando vao para investimento)

### 2.5 Parcelamento
- Uma despesa parcelada gera N transacoes (uma por parcela) com `installmentCurrent` e `installmentTotal`
- Parcelas futuras ficam com status `pending`

### 2.6 Recorrencias
- Ao criar, gerar todas as transacoes da `startDate` ate hoje
- Na inicializacao do app, verificar recorrencias ativas e gerar transacoes faltantes ate a data atual
- Transacoes futuras geradas ficam como `pending`
- Respeitar `endDate` quando definido
- Suportar edicao em lote: alterar uma unica, todas futuras, ou todas

### 2.7 Contextos
- O sistema possui dois contextos: **Contas** e **Investimentos**
- A navegacao, sidebar e conteudo mudam conforme o contexto ativo
- Contexto Contas: Dashboard, Contas, Transacoes, Relatorios, Categorias
- Contexto Investimentos: Carteira de investimentos, Relatorios de investimento

---

## 3. Funcionalidades Esperadas

### 3.1 CRUD Completo
- **Categorias:** criar, editar, excluir. Separadas por tipo (receita/despesa). Icone emoji + cor
- **Contas:** criar, editar, excluir. 4 tipos (corrente, cartao, poupanca, investimento). Hierarquia pai-filho para poupanca/investimento
- **Transacoes:** criar, editar, excluir. Filtro por conta, mes, tipo, status. Suporte a parcelamento e recorrencia
- **Transferencias:** modal especifico para transferir entre contas
- **Recorrencias:** criar, ativar/desativar, editar, excluir

### 3.2 Dashboard (Contexto Contas)
- Cards de resumo: saldo, receitas, despesas, balanco do mes
- Tendencia vs mes anterior (% de variacao em receita e despesa)
- Contas a pagar (pendentes) e contas pagas do mes
- Visao rapida dos cartoes de credito (fatura atual, limite usado)
- Grafico donut de despesas por categoria
- Grafico de barras receita vs despesa (ultimos 6 meses)
- Top 5 categorias de despesa
- Ultimas transacoes

### 3.3 Carteira de Investimentos (Contexto Investimentos)
- Cards: total investido, valor real, rendimento total, % rendimento
- Grafico donut de distribuicao por conta de investimento
- Lista de cada investimento com: depositado, saldo real, rendimento, %
- Funcao de atualizar saldo real (calcula e registra rendimento automaticamente)
- Historico mensal por investimento: acumulado, rendimento do mes, %

### 3.4 Relatorios (devem ser diferentes por contexto)
- **Contexto Contas:** por categoria, diario, balanco mensal, evolucao patrimonial, fluxo de caixa com projecao, comparativo mes a mes, analises/insights, anual por categoria, despesas fixas, heatmap mensal
- **Contexto Investimentos:** resumo geral, evolucao patrimonial, comparativo mensal

### 3.5 Filtros Globais
- Filtro por conta na sidebar (selecionar uma conta especifica ou "Todas")
- Filtro por mes/ano (month picker) em todas as telas

### 3.6 Persistencia
- Arquivo Excel (.xlsx) com SheetJS — 4 planilhas: Contas, Categorias, Transacoes, Recorrencias
- File System Access API para salvar direto no arquivo aberto (com auto-save debounce)
- Fallback para download em navegadores sem suporte
- Tela de boas-vindas como gate: so entra no sistema apos criar novo arquivo ou abrir existente
- Barra de arquivo no header: nome do arquivo, status (salvo/pendente/salvando), botao salvar, botao fechar

---

## 4. Calculos e Analytics que o Sistema Deve Fornecer

### Resumo Mensal
- Receita, despesa, balanco, transferencias entrada/saida, investimentos, rendimentos do mes

### Por Categoria
- Total de despesas por categoria com % do total

### Despesas Diarias
- Mapa de valor gasto por dia do mes

### Evolucao Patrimonial
- Historico de patrimonio liquido dos ultimos 12 meses
- Variacao mensal e variacao total em valor e %

### Fluxo de Caixa
- Receitas vs despesas dos ultimos 6 meses + projecao de 3 meses futuros (media dos ultimos 3)
- Saldo acumulado ao longo do tempo

### Comparativo
- Comparar despesas por categoria entre dois meses consecutivos, com diferenca e %

### Insights
- Taxa de poupanca (% da receita que sobrou)
- Media por despesa, media diaria
- Total de transacoes
- Dia com mais gastos
- Maior categoria
- Distribuicao de gastos por dia da semana

### Comparacao Mes a Mes
- Receita, despesa e balanco do mes atual vs anterior com % de variacao

### Investimentos
- Por conta: total depositado, resgatado, rendimento, saldo real, %
- Dados mensais: acumulado investido, rendimento do mes, %, saldo

---

## 5. Requisitos Tecnicos

- **Angular 19+** com standalone components (sem NgModules)
- **Signals** para estado reativo em services e components
- **SCSS** com CSS variables (design tokens) para temas
- **Control flow** Angular 17+: `@if`, `@for`, `@switch`
- **Lazy loading** em todas as rotas de features
- **Reactive Forms** nos modais de CRUD
- **ng2-charts** (Chart.js) para graficos
- **SheetJS (xlsx)** para persistencia em Excel
- **Mobile-first** responsivo com breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- **Tipagem forte** — interfaces para todos os models, sem `any`
- **Codigo em ingles**, textos de interface em **portugues brasileiro**
- **Emojis nativos** como icones (sem biblioteca de icones)
- **Suporte a tema dark e light** via CSS variables com toggle
