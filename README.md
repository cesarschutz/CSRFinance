# FinControl - Sistema Financeiro Pessoal

![Angular](https://img.shields.io/badge/Angular-19+-DD0031?style=flat&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?style=flat&logo=sass&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white)

Sistema financeiro pessoal completo inspirado no Mobills, construído com Angular 19+ e design moderno responsivo.

## Funcionalidades

### Implementadas
- [x] **Dashboard** - Resumo financeiro com cards, gráficos donut e barras, transações recentes
- [x] **Transações** - CRUD completo com filtros, busca, tabela/cards responsivos
- [x] **Relatórios** - 3 visualizações: por categoria, despesas diárias, balanço mensal
- [x] **Categorias** - Gerenciamento com emojis e cores customizáveis
- [x] **Contas** - Cards estilo banco com saldo calculado automaticamente
- [x] **Sidebar** - Navegação com filtro por conta e patrimônio total
- [x] **Mobile Navigation** - Bottom nav para dispositivos móveis
- [x] **Seletor de Mês** - Navegação temporal em todas as telas
- [x] **Responsividade** - Mobile-first, funcional de 360px a 1920px+

### Roadmap
- [ ] Cartão de Crédito (faturas, limite)
- [ ] Metas financeiras
- [ ] Orçamento por categoria
- [ ] Exportar PDF/CSV
- [ ] Dark mode
- [ ] PWA (Progressive Web App)
- [ ] Integração com backend REST API
- [ ] Autenticação de usuário

## Como Rodar

### Pré-requisitos
- Node.js 18+
- npm 9+

### Instalação
```bash
cd fincontrol
npm install
ng serve
```

Acesse `http://localhost:4200` no navegador.

### Build de Produção
```bash
ng build
```

Os arquivos de produção serão gerados em `dist/fincontrol/`.

## Estrutura do Projeto

```
src/app/
├── core/              # Models, services, seed data
├── shared/            # Componentes reutilizáveis, pipes
├── features/          # Páginas da aplicação
│   ├── dashboard/
│   ├── transactions/
│   ├── reports/
│   ├── categories/
│   └── accounts/
└── layout/            # Sidebar, mobile nav, main layout
```

## Design System

### Cores Principais
| Variável | Cor | Uso |
|----------|-----|-----|
| `--accent` | `#6C5CE7` | Cor principal, destaques |
| `--income` | `#00B894` | Receitas |
| `--expense` | `#E84393` | Despesas |
| `--bg` | `#F0F2F8` | Fundo |
| `--surface` | `#FFFFFF` | Cards |

### Tipografia
- **DM Sans** - Textos gerais
- **Space Mono** - Valores monetários

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## Tecnologias
- **Angular 19+** com standalone components e signals
- **SCSS** com design tokens (CSS variables)
- **ng2-charts** (Chart.js) para gráficos
- **localStorage** para persistência (preparado para API REST)
- **Reactive Forms** para formulários

## Dados de Exemplo
O sistema vem com dados pré-carregados:
- 2 contas (Itaú e Nubank)
- 12 categorias (8 despesas + 4 receitas)
- 18 transações de exemplo (fevereiro e março de 2026)

Os dados são salvos no localStorage e podem ser modificados livremente.
