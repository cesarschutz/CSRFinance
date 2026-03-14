# CSRFinance - Sistema Financeiro Pessoal

## Descrição
Sistema financeiro pessoal com tema Obsidian Glass (dark glassmorphism), construído em Angular 19+ com standalone components, responsivo (mobile-first), com separação de contextos Contas e Investimentos, e preparado para futura integração com backend.

## Stack Técnica
- **Framework:** Angular 19+ (standalone components, signals)
- **Estilização:** SCSS com CSS variables (design tokens)
- **Gráficos:** ng2-charts (Chart.js wrapper)
- **Ícones:** Emojis nativos
- **Fontes:** DM Sans (corpo) + Space Mono (valores monetários)
- **Persistência:** localStorage + Excel (.xlsx) via FileService (SheetJS)
- **Arquivo Excel:** SheetJS (xlsx) para ler/escrever .xlsx com File System Access API
- **Roteamento:** Angular Router com lazy loading por feature

## Comandos Essenciais
```bash
ng serve              # Dev server em http://localhost:4200
ng build              # Build de produção
ng build --watch      # Build com watch mode
ng generate component # Gerar componente (usa standalone por padrão)
```

## Estrutura do Projeto
```
src/app/
├── core/                    # Serviços singleton, models
│   ├── services/
│   │   ├── storage.service.ts     # Abstração localStorage com onChange$ notification
│   │   ├── file.service.ts        # Persistência em arquivo Excel (.xlsx)
│   │   ├── account.service.ts     # CRUD de contas (checking, credit_card, savings, investment)
│   │   ├── transaction.service.ts # CRUD de transações + analytics avançados
│   │   ├── category.service.ts    # CRUD de categorias
│   │   └── context.service.ts     # Toggle entre contextos Contas/Investimentos
│   ├── models/
│   │   ├── account.model.ts
│   │   ├── transaction.model.ts
│   │   └── category.model.ts
│   └── seed-data.ts               # Dados iniciais de exemplo
├── shared/                  # Componentes reutilizáveis
│   ├── components/
│   │   ├── sidebar/
│   │   ├── month-picker/
│   │   ├── summary-cards/
│   │   ├── donut-chart/
│   │   ├── modal/
│   │   ├── file-bar/
│   │   └── empty-state/
│   └── pipes/
│       └── currency-brl.pipe.ts
├── features/
│   ├── dashboard/           # Dashboard principal
│   ├── transactions/        # CRUD de transações
│   ├── reports/             # Relatórios (3 abas)
│   ├── categories/          # CRUD de categorias
│   └── accounts/            # CRUD de contas
├── layout/
│   ├── main-layout/         # Layout com sidebar + content
│   └── mobile-nav/          # Bottom navigation mobile
├── app.component.ts
├── app.routes.ts
└── app.config.ts
```

## Convenções de Código
- **Standalone components** em todos os componentes (sem NgModules)
- **Signals** para estado reativo nos serviços e componentes
- **SCSS** com imports de mixins: `@import 'assets/styles/mixins'`
- **Control flow:** usar `@if`, `@for`, `@switch` (novo syntax Angular 17+)
- **Código em inglês**, textos de interface em **português brasileiro**
- **Tipagem forte:** interfaces para todos os models, sem `any`
- **Reactive Forms** nos modais de CRUD
- **Lazy loading** nas rotas de features

## Design System

### Tema: Obsidian Glass (Dark Glassmorphism)
- `--bg: #0A0A12` (fundo escuro)
- `--surface: rgba(255, 255, 255, 0.04)` (cards glass)
- `--text: #EEEEF4` (texto principal claro)
- `--text-secondary: #9394A5`
- `--text-muted: #5C5D72`
- `--accent: #818CF8` (indigo/violeta)
- `--income: #34D399` (receitas - verde)
- `--expense: #FB7185` (despesas - rosa)
- `--transfer: #38BDF8` (transferências - azul)
- `--glass-bg: rgba(255, 255, 255, 0.03)` (fundo glass)
- `--glass-border: rgba(255, 255, 255, 0.06)` (borda glass)

### Layout
- **Top Header**: Logo + Context Toggle (Contas/Investimentos) + FileBar
- **Sidebar**: 260px (desktop), 72px (colapsada), hidden (mobile)
- **Mobile Nav**: Bottom bar com items contextuais
- **Context Toggle**: Alterna navegação, sidebar e conteúdo entre Contas e Investimentos

### Tipografia
- Body: `'DM Sans', sans-serif`
- Valores monetários: `'DM Sans'` com `font-variant-numeric: tabular-nums` e classe `.money`

### Breakpoints (mobile-first)
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
- Wide: > 1440px

## Padrões de Arquitetura
- **Services:** Singleton com `providedIn: 'root'`, usam signals internos
- **ContextService:** Toggle global entre 'accounts' e 'investments', define navegação e conteúdo
- **StorageService:** Abstração de persistência com `onChange$` Subject para notificar mudanças
- **FileService:** Persistência em Excel (.xlsx) via SheetJS + File System Access API. Auto-save com debounce 1.5s
- **AccountService:** CRUD de contas com tipos: checking, credit_card, savings, investment. Computed signals para cada tipo
- **TransactionService:** CRUD + analytics: getNetWorthHistory, getCashFlow, getCategoryComparison, getTopExpenses, getExpenseInsights, getMonthOverMonthComparison
- **Shared components:** Independentes e reutilizáveis, recebem dados via @Input
- **Features:** Cada feature é lazy-loaded, contém componente principal + sub-componentes
- **Filtro por conta:** `accountService.selectedAccountId()` filtra dados globalmente
- **Tipos de conta:** checking (corrente), credit_card (cartão), savings (poupança), investment (investimentos fixos)

## Funcionalidades
- **Dashboard**: Cards de resumo, tendências vs mês anterior, contas a pagar/pagas, cartões de crédito, gráficos (donut + barras), top categorias, insights
- **Relatórios (11 abas)**: Por Categoria, Diário, Balanço, Patrimônio, Fluxo de Caixa, Comparativo, Análises, Anual Categorias, Despesas Fixas, Mês a Mês, Investimentos
- **Transações**: CRUD com filtros, transferências pareadas, recorrentes, status pago/pendente
- **Cartão de Crédito**: Visualização de fatura mensal, pagamento, pendente vs pago
- **Investimentos**: Poupança, LCI, Tesouro Direto - rendimentos, saldo real, % rendimento

## Histórico de Mudanças
- **v1.0.0** - Redesign completo: tema Obsidian Glass (dark glassmorphism), context toggle Contas/Investimentos no header, AccountType credit_card com fatura mensal, ContextService para gerenciar contexto, TransactionService com 6 novos métodos analytics (netWorthHistory, cashFlow, categoryComparison, topExpenses, expenseInsights, monthOverMonth), dashboard com bills a pagar/pagas + cartões de crédito + insights + tendências, 11 abas de relatórios incluindo 3 relatórios anuais (categorias, despesas fixas, heatmap mês-a-mês), sidebar e mobile nav contextuais, novo design system com CSS variables dark
- **v0.5.0** - Revisão de produção: welcome screen como gate obrigatório, tela de boas-vindas com features, correção de bugs (timezone em datas, newFile/closeFile limpando dados, open file aceitando xlsx), summary cards com breakdown de transferências por conta, meta tags para PWA, mobile nav com indicador ativo, sidebar com scroll em contas e footer fixo, dashboard com empty states melhores e link "Ver todas", transações mostram transferências com ícone 🔄 e cor accent, month picker com capitalização correta, seleção de texto estilizada, scrollbar mais sutil
- **v0.3.2** - Fix: cálculo de saldos em transferências (deduplicação por transferId), validação de workbook simplificada
- **v0.3.1** - Fix: reatividade dos saldos (computed signals), app inicia vazio (sem seed data), validação de formato ao abrir .xlsx com mensagens de erro claras
- **v0.3.0** - Persistência em arquivo Excel (.xlsx): FileService com SheetJS, FileBarComponent, auto-save via File System Access API, 3 planilhas (Contas, Categorias, Transações), fallback para download
- **v0.2.0** - Transferências entre contas: novo tipo `transfer` no model, transações pareadas com `transferId`, modal de transferência, filtro por transferências, exclusão automática do par, transferências excluídas dos resumos de receita/despesa
- **v0.1.0** - Setup inicial: projeto Angular 19+, design system, models, services, seed data, layout (sidebar + mobile nav), todas as features (dashboard, transações, relatórios, categorias, contas), documentação
