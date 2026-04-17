# Contexto do Projeto — Financeiro

> Documento de referência carregado em conversas futuras. Concentra as decisões arquiteturais, regras de produto e do estilo de colaboração. Mantenha-o curto, conciso e atualizado.

## Visão de Produto

**Nome interno:** Financeiro
**Idioma da UI:** Português (Brasil)
**Tipo:** Aplicativo desktop de finanças pessoais
**Diferencial-chave:** *Projeção de saldo futuro via calendário* — o usuário vê, dia a dia, como seu saldo evolui com base em transações recorrentes e lançadas.

## Direção de Design (v2 — Midday/Brutalist Ledger)

O projeto **abandonou** a estética "SaaS verde suave" da v1 e pivotou para uma linguagem inspirada em **Midday**, **Linear (modo denso)** e softwares profissionais de controladoria (Ramp, Mercury, YNAB Classic).

**Eixo estético em três palavras:** **Modern Ledger, Brutalist Utility, Highly Typographic.**

- **Monocromático (95%)** — preto, branco e a escala `zinc` inteira. Nada de esmeralda como cor principal. Cores semânticas (success/destructive/warning) aparecem **apenas como pontos, ticks e sinais +/−**, nunca preenchendo cards ou pintando fundos.
- **Tipografia é o produto.** Valores monetários e números devem respirar. Fonte mono (Geist Mono ou JetBrains Mono) com `tabular-nums` e `font-feature-settings: "ss01", "zero"` (slashed-zero) para toda coluna financeira. Saldo principal do Dashboard em `text-5xl` ou maior, peso `light`/`normal`.
- **Bordas > sombras.** Linhas finas `border-zinc-200` / `dark:border-zinc-800`. **Zero shadows.** Nenhum `shadow-*` no código. A hierarquia vem da espessura/opacidade da borda e do espaço em branco.
- **Flat & Sharp.** `--radius: 0.2rem` (quase zero). Sem gradientes, sem blobs, sem blur glass.
- **Densidade deliberada.** Linhas tipo "ledger" nas listas (altura compacta, valor à direita em mono, título à esquerda, metadados em `text-xs text-muted-foreground`). Separator horizontal entre grupos em vez de card-em-card.
- **Layout**: sidebar do mesmo tom do app, separada só por `border-r`. Active state = fundo cinza sutil + `font-semibold`. Nada de pílulas coloridas.

## Stack Técnica

| Camada | Escolha | Observações |
| ------ | ------- | ----------- |
| Shell desktop | **Tauri v2** | Rust no backend, WebView no frontend. Identifier: `com.financeiro.app`. |
| Frontend | **React 18 + Vite + TypeScript** | Alias `@/*` → `./src/*`. |
| UI kit | **shadcn/ui** (estilo `new-york`, base `zinc`) | Componentes copiados em `src/components/ui`. **Primary agora é zinc/preto**, não mais esmeralda. |
| Estilização | **Tailwind CSS** (`darkMode: "class"`) | Tokens via CSS vars. Fonte mono expandida no `fontFamily`. |
| Ícones | **lucide-react** | Stroke fino, monocromáticos. |
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

1. **Clean, denso, afiado** — densidade alta, tipografia impecável, zero visual noise.
2. **Monocromático por padrão.** Cor é exceção (ponto, sinal, tick), nunca regra.
3. **Números em mono, sempre.** Valores R$ usam `font-mono tabular-nums`. Nunca sans.
4. **Bordas finas substituem cards flutuantes.** Um `border-b` entre linhas vale mais que 10 cards com shadow.
5. **Dark/Light paritários** — tokens via CSS vars. Dark bg = `hsl(0 0% 4%)` (~#0A0A0A). Light bg = branco puro.
6. **Sem gradientes, sem radius arredondado grande, sem shadow-float.** Flat e afiado.
7. **Sidebar não destaca** — faz parte do app. Só um `border-r` separa.

## Modo de Colaboração com o Usuário

- Respostas em **português**.
- **Pense passo a passo**, mas seja conciso no relatório final.
- Sinalize e **peça permissão** ao fechar blocos grandes do plano.
- Entregas têm que gerar o efeito "uau, que software profissional de controladoria".
- Sem backend real enquanto o usuário não pedir — foco obsessivo em UI/UX nesta fase.

## Personas de IA (subagentes)

Ativar mentalmente conforme a tarefa. Prompts de sistema em `.claude/agents/`.

| Persona | Arquivo | Quando usar |
| ------- | ------- | ----------- |
| UI Designer | `agents/ui_designer_agent.md` | Decisões visuais, shadcn, Tailwind, acessibilidade, motion. |
| State Manager | `agents/state_manager_agent.md` | Modelagem, Zustand, mocks, tipagem, seletores. |
| Tauri/Rust | `agents/tauri_rust_agent.md` | (Futuro) bridge Tauri, comandos Rust, SQLite. |

## Próximas Iterações Planejadas

1. Integrar **FullCalendar** na tela de Calendário (variante monocromática).
2. Implementar CRUD completo de Transações em modal + tabela densa ledger-style.
3. Modelo de **Recorrências** + projeção real de saldo diário.
4. Persistência via SQLite (Tauri plugin).
5. Importação OFX/CSV.
