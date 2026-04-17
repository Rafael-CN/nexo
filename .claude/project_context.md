# Contexto do Projeto — Financeiro

> Documento de referência carregado em conversas futuras. Concentra as decisões arquiteturais, regras de produto e do estilo de colaboração. Mantenha-o curto, conciso e atualizado.

## Visão de Produto

**Nome interno:** Financeiro
**Idioma da UI:** Português (Brasil)
**Tipo:** Aplicativo desktop de finanças pessoais
**Diferencial-chave:** *Projeção de saldo futuro via calendário* — o usuário vê, dia a dia, como seu saldo evolui com base em transações recorrentes e lançadas.

## Stack Técnica

| Camada | Escolha | Observações |
| ------ | ------- | ----------- |
| Shell desktop | **Tauri v2** | Rust no backend, WebView no frontend. Identifier: `com.financeiro.app`. |
| Frontend | **React 18 + Vite + TypeScript** | Alias `@/*` → `./src/*`. |
| UI kit | **shadcn/ui** (estilo `new-york`, base `zinc`) | Componentes copiados em `src/components/ui`. Cores primárias: verde esmeralda (`160 64% 39%`). |
| Estilização | **Tailwind CSS** (`darkMode: "class"`) | Tokens via CSS vars — suporte nativo a Dark/Light. |
| Ícones | **lucide-react** | |
| Roteamento | **React Router v6** | `createBrowserRouter` com layout aninhado. |
| Estado global | **Zustand** | Store única: `useFinanceStore`. |
| Datas | **date-fns** | Timezone local, locale `pt-BR` quando possível. |
| Persistência | **Não implementada ainda** | Mock-only na fase atual. Planejado: SQLite via `tauri-plugin-sql`. |

## Modelagem de Dados (resumo)

```ts
Account      → id, name, type, balance, color, institution, icon
Transaction  → id, title, amount, date, accountId, categoryId, type, isProjected, recurrenceId?
Category     → id, name, color, icon, kind (income|expense)
RecurrenceRule (futuro) → frequency, interval, until
```

Fonte da verdade: `src/types/index.ts`. Mocks realistas em `src/mocks/financeData.ts`.

## Organização de Pastas

```
src/
  components/
    ui/           → primitivos shadcn
    layout/       → Sidebar, Header, AppLayout
    shared/       → cards, widgets reutilizáveis
  pages/          → telas (Dashboard, Calendar, Accounts, Transactions)
  store/          → Zustand
  types/          → interfaces TS
  mocks/          → dados simulados
  lib/            → utils (cn, formatters)
  hooks/          → hooks reutilizáveis (ex: useTheme)
src-tauri/        → shell Rust (dev requer Rust instalado)
```

## Princípios de Design (não negociáveis)

1. **Clean, moderno, elegante**, não minimalista raso — o app crescerá em complexidade.
2. **Carga cognitiva baixa** na primeira tela.
3. **Layout SaaS clássico**: sidebar fixa + header opcional + main.
4. **Dark/Light** desde o primeiro commit.
5. **Espaçamento, tipografia e paleta importam** — use tokens do Tailwind (zinc/neutros + primary emerald).
6. **Componentização**: primeiro em `ui/`, depois compõe em `shared/`, depois em `pages/`.

## Modo de Colaboração com o Usuário

- Respostas em **português**.
- **Pense passo a passo**, mas seja conciso no relatório final.
- Sinalize e **peça permissão** ao fechar blocos grandes do plano.
- Entregas têm que gerar o efeito "uau, que app profissional".
- Sem backend real enquanto o usuário não pedir — foco obsessivo em UI/UX nesta fase.

## Personas de IA (subagentes)

Ativar mentalmente conforme a tarefa. Prompts de sistema em `.claude/agents/`.

| Persona | Arquivo | Quando usar |
| ------- | ------- | ----------- |
| UI Designer | `agents/ui_designer_agent.md` | Decisões visuais, shadcn, Tailwind, acessibilidade, motion. |
| State Manager | `agents/state_manager_agent.md` | Modelagem, Zustand, mocks, tipagem, seletores. |
| Tauri/Rust | `agents/tauri_rust_agent.md` | (Futuro) bridge Tauri, comandos Rust, SQLite. |

## Próximas Iterações Planejadas

1. Integrar **FullCalendar** na tela de Calendário (substituir wireframe).
2. Implementar CRUD completo de Transações em modal + tabela (shadcn Table/Dialog).
3. Modelo de **Recorrências** + projeção real de saldo diário.
4. Persistência via SQLite (Tauri plugin).
5. Importação OFX/CSV.
