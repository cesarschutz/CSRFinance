# CSRFinance — Melhorias Propostas

## Visão Geral

Este documento descreve um conjunto abrangente de melhorias para o sistema CSRFinance, cobrindo redesign visual, nova arquitetura de contextos, novos tipos de conta, gestão de contas a pagar, cartão de crédito, relatórios avançados e analytics aprofundados.

---

## 1. Redesign Visual — Obsidian Glass (Dark Glassmorphism)

### Problema Atual
O tema atual não transmite a sofisticação esperada de um sistema financeiro pessoal moderno. A identidade visual precisa ser mais imersiva e profissional.

### Proposta
Migrar todo o design system para um tema **dark glassmorphism** chamado "Obsidian Glass", com cards translúcidos, blur de fundo, bordas sutis e gradientes refinados.

### Design Tokens Principais

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0A0A12` | Fundo principal escuro |
| `--surface` | `rgba(255, 255, 255, 0.04)` | Cards e superfícies glass |
| `--glass-bg` | `rgba(255, 255, 255, 0.03)` | Fundo de elementos glass |
| `--glass-blur` | `24px` | Intensidade do backdrop-filter blur |
| `--glass-border` | `rgba(255, 255, 255, 0.06)` | Bordas sutis glass |
| `--accent` | `#818CF8` | Cor de destaque (indigo/violeta) |
| `--income` | `#34D399` | Receitas (verde esmeralda) |
| `--expense` | `#FB7185` | Despesas (rosa) |
| `--transfer` | `#38BDF8` | Transferências (azul) |
| `--warning` | `#FBBF24` | Alertas (âmbar) |

### Detalhamento
- **Cards:** `backdrop-filter: blur(24px)`, fundo semi-transparente, bordas `rgba(255, 255, 255, 0.06)`, sombras com profundidade (`--shadow-sm`, `--shadow-md`, `--shadow-lg`)
- **Tipografia:** DM Sans para corpo, com `font-variant-numeric: tabular-nums` em valores monetários (classe `.money`)
- **Animações:** `fadeInUp` e `slideIn` para entrada suave de seções
- **Hover states:** Elevação com `translateY(-2px)` ou `translateX(4px)`, box-shadow com glow sutil
- **Scrollbars:** Estilizadas com cores do tema, track transparente
- **Seleção de texto:** Cor de destaque usando `--accent`

### Arquivos Impactados
- `src/assets/styles/_variables.scss` — Reescrita completa dos design tokens
- `src/assets/styles/_mixins.scss` — Novos mixins: `glass-card`, `card-glow`, `card-hover`, `fade-in-up`, `custom-scrollbar`
- `src/assets/styles/_reset.scss` — Atualização para tema escuro
- Todos os `.scss` de componentes — Migração para novas variáveis e mixins

---

## 2. Separação de Contextos: Contas vs Investimentos

### Problema Atual
Contas bancárias e investimentos coexistem no mesmo espaço de navegação. Isso gera confusão, pois são domínios financeiros com necessidades de visualização e gestão distintas.

### Proposta
Criar um **toggle de contexto no header** que alterna entre "Contas" e "Investimentos". Cada contexto possui sua própria navegação, dashboard e relatórios.

### Arquitetura

```
ContextService (providedIn: 'root')
├── context: signal<'accounts' | 'investments'>
├── isAccounts: computed(() => context() === 'accounts')
├── isInvestments: computed(() => context() === 'investments')
├── toggle(): void
└── setContext(ctx): void
```

### Comportamento por Contexto

| Aspecto | Contas | Investimentos |
|---|---|---|
| **Tipos de conta** | `checking`, `credit_card` | `savings`, `investment` |
| **Dashboard** | Saldo, receitas, despesas, contas a pagar, cartões | Patrimônio investido, rendimentos, evolução |
| **Relatórios** | Categoria, diário, balanço, fluxo de caixa, comparativo, análises, anuais | Patrimônio, rendimentos por tipo, evolução temporal |
| **Nav items** | Dashboard, Transações, Relatórios, Categorias, Contas | Dashboard, Investimentos, Relatórios, Contas |
| **Sidebar** | Lista contas bancárias + cartões | Lista investimentos (poupança, LCI, etc.) |

### Toggle no Header
- Posicionado entre o logo e a FileBar
- Dois botões: "Contas" e "Investimentos" com indicador animado
- Ao trocar contexto, o roteamento e a sidebar se adaptam automaticamente

### Arquivos Impactados
- `src/app/core/services/context.service.ts` — **Novo serviço**
- `src/app/layout/main-layout/` — Toggle no header
- `src/app/shared/components/sidebar/` — Navegação e lista de contas contextual
- `src/app/layout/mobile-nav/` — Bottom nav contextual
- `src/app/app.routes.ts` — Rotas com lazy loading por contexto

---

## 3. Novos Tipos de Conta

### Problema Atual
O sistema suporta apenas contas genéricas. Não diferencia cartão de crédito (com fatura, limite, vencimento) de conta corrente ou investimentos com rendimentos.

### Proposta
Expandir o `AccountType` para 4 tipos com campos específicos:

```typescript
export type AccountType = 'checking' | 'credit_card' | 'savings' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bank: string;
  color: string;
  icon: string;
  initialBalance: number;

  // Campos específicos de cartão de crédito
  closingDay?: number;    // Dia de fechamento da fatura (1-31)
  dueDay?: number;        // Dia de vencimento (1-31)
  creditLimit?: number;   // Limite do cartão

  // Campos específicos de investimento
  investmentType?: 'savings' | 'lci' | 'treasury' | 'cdb' | 'other';
  annualRate?: number;    // Taxa anual de rendimento (%)
  maturityDate?: string;  // Data de vencimento do investimento
}
```

### Computed Signals no AccountService

```typescript
readonly checkingAccounts    = computed(() => filter by 'checking');
readonly creditCardAccounts  = computed(() => filter by 'credit_card');
readonly savingsAccounts     = computed(() => filter by 'savings');
readonly investmentAccounts  = computed(() => filter by 'investment');
readonly bankAccounts        = computed(() => checking + credit_card);
```

### Compatibilidade
Contas existentes sem `type` definido devem ser tratadas como `checking` por padrão.

### Arquivos Impactados
- `src/app/core/models/account.model.ts` — Novos campos
- `src/app/core/services/account.service.ts` — Computed signals por tipo
- `src/app/features/accounts/` — UI para campos específicos por tipo

---

## 4. Gestão de Contas a Pagar (Bills Tracking)

### Problema Atual
Não há visibilidade clara do que ainda precisa ser pago no mês vs o que já foi quitado. O campo `status` existe (`pending`/`settled`) mas não é explorado na UI.

### Proposta
Adicionar ao dashboard uma seção "Contas do Mês" com resumo visual e lista de próximas contas a vencer.

### Estrutura da Seção

```
┌─────────────────────────────────────────────────┐
│  Contas do Mês                    [Ver todas →] │
├────────────┬─────────────┬──────────────────────┤
│  ⏳ A Pagar │  ✅ Pago     │  📋 Total Despesas    │
│  R$ 1.200  │  R$ 3.400   │  R$ 4.600            │
│  3 pendentes│  8 pagos    │                      │
├────────────┴─────────────┴──────────────────────┤
│  Próximas a vencer:                             │
│  🏠 Aluguel        · Moradia · 10/03  R$ 1.500  │
│  ⚡ Conta de Luz    · Utilidades · 15/03  R$ 180 │
│  📱 Internet       · Utilidades · 20/03  R$ 120  │
└─────────────────────────────────────────────────┘
```

### Computed Signal

```typescript
readonly bills = computed(() => {
  const expenses = getByMonth(year, month, accountId).filter(t => t.type === 'expense');
  const pending = expenses.filter(t => t.status === 'pending');
  const settled = expenses.filter(t => t.status === 'settled');

  return {
    pending: [...mapped and sorted by date],
    settled: [...mapped],
    totalPending, totalSettled, totalExpenses,
    pendingCount, settledCount
  };
});
```

### Regras de Negócio
- Ao marcar como "pago", a data original da transação é mantida (apenas o `status` muda para `settled`)
- A lista "Próximas a vencer" exibe no máximo 5 itens, ordenados por data
- Cards com border-left colorido: âmbar (pendente), verde (pago), indigo (total)

### Arquivos Impactados
- `src/app/features/dashboard/dashboard.component.ts` — Computed signal `bills`
- `src/app/features/dashboard/dashboard.component.html` — Seção bills
- `src/app/features/dashboard/dashboard.component.scss` — Estilos bills
- `src/app/features/transactions/` — Botão "Marcar como pago" nas transações

---

## 5. Cartão de Crédito — Fatura Mensal

### Problema Atual
Cartões de crédito não possuem visualização de fatura. Não é possível ver o total gasto, o que está pendente e o que foi pago no mês.

### Proposta
Widget compacto no dashboard com resumo por cartão e barra de utilização do limite.

### Layout do Widget

```
┌──────────────────────────────────┐
│  🟣 Nubank          Nu Pagamentos│
│  R$ 2.340,00                     │
│  ████████████░░░░  78% do limite │
│  Pendente: R$ 840  Pago: R$ 1.500│
└──────────────────────────────────┘
```

### Computed Signal

```typescript
readonly creditCards = computed(() => {
  return accountService.creditCardAccounts().map(card => {
    const txns = getByMonth(year, month, card.id);
    const expenses = txns.filter(t => t.type === 'expense');
    return {
      ...card,
      totalMonth: sum(expenses),
      pendingMonth: sum(expenses where status === 'pending'),
      paidMonth: sum(expenses where status === 'settled'),
      usagePercent: (totalMonth / card.creditLimit) * 100
    };
  });
});
```

### Funcionalidades Futuras (não incluídas nesta fase)
- Botão "Pagar fatura" que cria transferência da conta corrente para o cartão
- Detalhamento da fatura com lista de compras do período
- Fechamento automático baseado no `closingDay`

### Arquivos Impactados
- `src/app/features/dashboard/dashboard.component.ts` — Computed signals `creditCards` e `hasCreditCards`
- `src/app/features/dashboard/dashboard.component.html` — Seção credit cards
- `src/app/features/dashboard/dashboard.component.scss` — Estilos dos widgets

---

## 6. Dashboard Aprimorado

### Problema Atual
O dashboard é básico e não oferece insights suficientes para tomada de decisão financeira.

### Proposta
Dashboard completo com as seguintes seções (de cima para baixo):

1. **Page Header** — Título + pills de tendência (↑ Receitas +12%, ↓ Despesas -5%) + Month Picker
2. **Summary Cards** — Saldo, Receitas, Despesas, Balanço (com breakdown de transferências quando filtrado por conta)
3. **Contas do Mês** — Bills tracking (seção 4)
4. **Cartões de Crédito** — Widgets por cartão (seção 5)
5. **Charts Grid** — Donut (despesas por categoria) + Barras (receitas vs despesas, 6 meses)
6. **Top Categorias** — Ranking das 5 categorias mais gastas com barra percentual
7. **Quick Insights** — 4 chips: Taxa de Poupança, Média/dia, Média/despesa, Total Transações
8. **Transações Recentes** — Últimas 8 transações com ícone, descrição, categoria, data, valor e status

### Tendências Mês a Mês

```typescript
readonly monthTrends = computed(() => {
  return transactionService.getMonthOverMonthComparison(year, month, accountId);
  // Retorna: { incomeChange: number, expenseChange: number } em %
});
```

### Arquivos Impactados
- `src/app/features/dashboard/` — Reescrita completa (TS, HTML, SCSS)

---

## 7. Novos Métodos Analytics no TransactionService

### Problema Atual
O serviço de transações oferece apenas operações CRUD básicas e cálculos simples. Faltam analytics avançados para alimentar relatórios sofisticados.

### Proposta
Adicionar 6 novos métodos computed ao `TransactionService`:

### 7.1 `getNetWorthHistory(months = 12)`
Evolução do patrimônio líquido mês a mês.

```typescript
// Retorno:
Array<{ label: string; balance: number; income: number; expense: number }>
```

**Uso:** Relatório de Patrimônio, gráfico de linha.

### 7.2 `getCashFlow(pastMonths = 6, futureMonths = 3)`
Fluxo de caixa histórico e projetado.

```typescript
// Retorno:
Array<{
  label: string;
  income: number;
  expense: number;
  net: number;
  cumulative: number;
  isProjection: boolean;
}>
```

**Uso:** Relatório de Fluxo de Caixa, planejamento futuro.

### 7.3 `getCategoryComparison(year1, month1, year2, month2, accountId?)`
Comparativo de gastos por categoria entre dois meses.

```typescript
// Retorno:
Array<{
  categoryId: string;
  name: string; icon: string; color: string;
  month1Value: number;
  month2Value: number;
  change: number;       // valor absoluto
  changePercent: number; // percentual
}>
```

**Uso:** Relatório Comparativo, identificar variações.

### 7.4 `getTopExpenses(year, month, limit = 10, accountId?)`
Ranking das maiores despesas individuais do mês.

```typescript
// Retorno:
Array<{
  description: string;
  amount: number;
  categoryName: string;
  categoryIcon: string;
  date: string;
  percentage: number; // % do total de despesas
}>
```

**Uso:** Relatório de Análises, identificar gastos relevantes.

### 7.5 `getExpenseInsights(year, month, accountId?)`
Insights estatísticos sobre os gastos do mês.

```typescript
// Retorno:
{
  totalExpense: number;
  totalIncome: number;
  savingsRate: number;          // % poupado
  dailyAverage: number;         // média gasto/dia
  averageExpense: number;       // média por transação
  transactionCount: number;
  weekdayDistribution: Map<string, number>;
  highestDay: { date: string; amount: number };
  lowestDay: { date: string; amount: number };
}
```

**Uso:** Chips de insights no dashboard, relatório de Análises.

### 7.6 `getMonthOverMonthComparison(year, month, accountId?)`
Variação percentual em relação ao mês anterior.

```typescript
// Retorno:
{
  incomeChange: number;   // ex: +12.5
  expenseChange: number;  // ex: -3.2
}
```

**Uso:** Pills de tendência no header do dashboard.

### Arquivos Impactados
- `src/app/core/services/transaction.service.ts` — 6 novos métodos

---

## 8. Sistema de Relatórios — 11 Abas

### Problema Atual
Os relatórios são limitados a poucas visualizações e não cobrem análises anuais, fluxo de caixa ou comparativos temporais.

### Proposta
Expandir para **11 abas** de relatórios, organizadas em 3 grupos:

### Grupo 1 — Relatórios Mensais

| # | Aba | Descrição |
|---|---|---|
| 1 | **Por Categoria** | Donut chart + lista detalhada com barras percentuais |
| 2 | **Diário** | Gráfico de barras empilhadas dia a dia (receitas/despesas) |
| 3 | **Balanço** | Receitas vs Despesas em formato tabular com totais e saldo |
| 4 | **Patrimônio** | Gráfico de linha da evolução do patrimônio (12 meses) |
| 5 | **Fluxo de Caixa** | Gráfico combinado (barras + linha) com projeção futura |
| 6 | **Comparativo** | Comparação lado a lado entre dois meses selecionados |
| 7 | **Análises** | Top despesas + distribuição por dia da semana + insights |
| 8 | **Investimentos** | Evolução de cada investimento, rendimentos, % retorno |

### Grupo 2 — Relatórios Anuais

| # | Aba | Descrição |
|---|---|---|
| 9 | **Anual Categorias** | Tabela 12 colunas com total por categoria por mês + total anual |
| 10 | **Despesas Fixas** | Grid de 12 meses para cada despesa recorrente, mostrando se foi paga |
| 11 | **Mês a Mês** | Heatmap visual: card por mês com receitas/despesas/saldo e cor por resultado |

### Detalhamento — Aba 9: Anual Categorias

```
┌────────────┬─────┬─────┬─────┬─────┬─── ... ─┬───────┐
│ Categoria  │ Jan │ Fev │ Mar │ Abr │   ...    │ Total │
├────────────┼─────┼─────┼─────┼─────┼─── ... ─┼───────┤
│ 🍔 Alimentação │ 800 │ 750 │ 920 │ 680 │ ...  │ 9.400 │
│ 🏠 Moradia    │ 1.5k│ 1.5k│ 1.5k│ 1.5k│ ...  │ 18.0k │
├────────────┼─────┼─────┼─────┼─────┼─── ... ─┼───────┤
│ **TOTAL**  │ 3.2k│ 3.0k│ 3.4k│ 2.9k│ ...  │ 38.0k │
└────────────┴─────┴─────┴─────┴─────┴─── ... ─┴───────┘
```

- Tabela com cabeçalho fixo (sticky)
- Scroll horizontal em mobile
- Linha de total com destaque visual

### Detalhamento — Aba 10: Despesas Fixas

Para cada despesa recorrente, exibir um grid de 12 meses indicando se há registro naquele mês, o valor pago e se está pendente ou quitado.

### Detalhamento — Aba 11: Mês a Mês (Heatmap)

Grid de 12 cards, um por mês, com:
- Receitas, Despesas e Saldo
- Cor de fundo baseada no resultado: verde (positivo), vermelho (negativo), cinza (sem dados)
- Intensidade da cor proporcional ao valor

### Arquivos Impactados
- `src/app/features/reports/reports.component.ts` — Reescrita com 11 tabs e computed signals
- `src/app/features/reports/reports.component.html` — Templates para todas as abas
- `src/app/features/reports/reports.component.scss` — Estilos para tabelas anuais, grids, heatmap

---

## 9. Melhorias no Layout e Navegação

### 9.1 Header Redesenhado
- Logo à esquerda
- Context Toggle centralizado (Contas ↔ Investimentos)
- FileBar à direita (indicador de arquivo aberto/salvo)

### 9.2 Sidebar Contextual
- **Contexto Contas:** Nav (Dashboard, Transações, Relatórios, Categorias, Contas) + Lista de contas bancárias/cartões + Quick Actions (Receita, Despesa, Transferência)
- **Contexto Investimentos:** Nav (Dashboard, Investimentos, Relatórios, Contas) + Lista de investimentos
- Scroll customizado na lista de contas
- Footer fixo na sidebar

### 9.3 Mobile Nav Contextual
- Bottom bar com 4-5 items baseados no contexto ativo
- Indicador ativo animado
- Ícones nativos (emojis)

### Arquivos Impactados
- `src/app/layout/main-layout/` — Header com toggle
- `src/app/shared/components/sidebar/` — Navegação e contas contextuais
- `src/app/layout/mobile-nav/` — Nav contextual

---

## 10. Melhorias em Componentes Compartilhados

### 10.1 Summary Cards
- Border-top colorido por tipo (indigo=saldo, verde=receita, rosa=despesa)
- Efeito radial gradient no canto superior direito para receita/despesa
- Card de saldo com destaque especial (border glow + fundo diferenciado)
- Breakdown de transferências quando filtrado por conta específica

### 10.2 Donut Chart
- Tooltip atualizado para tema escuro (`rgba(18, 18, 30, 0.95)`)
- Cores de texto ajustadas para contraste no fundo escuro

### 10.3 Month Picker
- Capitalização correta dos meses em pt-BR
- Estilo glass consistente com o tema

### Arquivos Impactados
- `src/app/shared/components/summary-cards/` — Estilos e template
- `src/app/shared/components/donut-chart/` — Cores do tooltip
- `src/app/shared/components/month-picker/` — Capitalização e estilos

---

## 11. Resumo de Prioridade de Implementação

| Prioridade | Melhoria | Complexidade | Impacto |
|---|---|---|---|
| 🔴 Alta | Redesign Obsidian Glass | Alta | Visual completo |
| 🔴 Alta | Separação Contas/Investimentos | Alta | Arquitetura |
| 🔴 Alta | Novos tipos de conta | Média | Modelo de dados |
| 🟡 Média | Bills Tracking | Média | UX do dashboard |
| 🟡 Média | Cartão de Crédito | Média | UX do dashboard |
| 🟡 Média | 6 métodos analytics | Média | Base para relatórios |
| 🟡 Média | Dashboard aprimorado | Alta | UX principal |
| 🟢 Normal | 11 abas de relatórios | Alta | Análises avançadas |
| 🟢 Normal | Layout e navegação | Média | UX geral |
| 🟢 Normal | Componentes compartilhados | Baixa | Consistência visual |

---

## 12. Considerações Técnicas

- **Compatibilidade:** Todas as mudanças devem ser retrocompatíveis com dados existentes no localStorage/Excel
- **Performance:** Computed signals com dependências claras evitam recalculos desnecessários
- **Mobile-first:** Todo novo componente deve funcionar em telas a partir de 320px
- **Lazy loading:** Novas features devem ser lazy-loaded nas rotas
- **Tipagem:** Sem uso de `any`, interfaces para todos os novos models
- **Testes:** Recomendado adicionar testes unitários para os novos métodos analytics

---

*Documento gerado em março/2026 para o projeto CSRFinance.*
