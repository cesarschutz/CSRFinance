# CSRFinance - Sistema Financeiro Pessoal

## Descrição
Sistema financeiro pessoal inspirado no Mobills, construído em Angular 19+ com standalone components, responsivo (mobile-first), e preparado para futura integração com backend.

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
│   │   ├── account.service.ts     # CRUD de contas
│   │   ├── transaction.service.ts # CRUD de transações + cálculos
│   │   └── category.service.ts    # CRUD de categorias
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

### Cores (CSS Variables)
- `--bg: #F0F2F8` (fundo geral)
- `--surface: #FFFFFF` (cards)
- `--text: #1A1D2E` (texto principal)
- `--text-secondary: #6B7194`
- `--accent: #6C5CE7` (cor principal/destaque)
- `--income: #00B894` (receitas - verde)
- `--expense: #E84393` (despesas - rosa)
- `--border: #E8EAF2`

### Tipografia
- Body: `'DM Sans', sans-serif`
- Valores monetários: `'Space Mono', monospace` com classe `.money`

### Breakpoints (mobile-first)
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
- Wide: > 1440px

### Sidebar
- Background: gradient `#1A1D2E → #2D3154`
- Width: 280px (desktop), 72px (colapsada), hidden (mobile)

## Padrões de Arquitetura
- **Services:** Singleton com `providedIn: 'root'`, usam signals internos
- **StorageService:** Abstração de persistência com `onChange$` Subject para notificar mudanças
- **FileService:** Persistência em Excel (.xlsx) via SheetJS + File System Access API. Auto-save com debounce 1.5s. Fallback para download em browsers sem suporte
- **Shared components:** Independentes e reutilizáveis, recebem dados via @Input
- **Features:** Cada feature é lazy-loaded, contém componente principal + sub-componentes
- **Filtro por conta:** `accountService.selectedAccountId()` filtra dados globalmente

## Histórico de Mudanças
- **v0.3.2** - Fix: cálculo de saldos em transferências (deduplicação por transferId), validação de workbook simplificada
- **v0.3.1** - Fix: reatividade dos saldos (computed signals), app inicia vazio (sem seed data), validação de formato ao abrir .xlsx com mensagens de erro claras
- **v0.3.0** - Persistência em arquivo Excel (.xlsx): FileService com SheetJS, FileBarComponent, auto-save via File System Access API, 3 planilhas (Contas, Categorias, Transações), fallback para download
- **v0.2.0** - Transferências entre contas: novo tipo `transfer` no model, transações pareadas com `transferId`, modal de transferência, filtro por transferências, exclusão automática do par, transferências excluídas dos resumos de receita/despesa
- **v0.1.0** - Setup inicial: projeto Angular 19+, design system, models, services, seed data, layout (sidebar + mobile nav), todas as features (dashboard, transações, relatórios, categorias, contas), documentação
