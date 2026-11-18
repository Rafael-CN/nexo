<p align="center">
  <img src="src/assets/nexo-desktop-logo.png" alt="Nexo" width="180">
</p>

<h1 align="center">Nexo</h1>

<p align="center">
  Aplicativo desktop <strong>local-first</strong> de gestão financeira pessoal com projeção diária de saldo via calendário, construído com <strong>Tauri v2</strong>, <strong>Rust</strong>, <strong>React</strong>, <strong>TypeScript</strong> e <strong>SQLite</strong>.
</p>

---

## Visão geral

O **Nexo** foi projetado para controle financeiro rápido pelo teclado e previsibilidade de caixa: todos os dados ficam armazenados localmente em um banco **SQLite** embarcado (sem dependência de nuvem ou contas externas), combinando lançamentos pontuais, recorrências, faturas, metas e contas-reserva em uma projeção diária clara.

## Principais funcionalidades

- **Projeção de saldo no calendário** — Visualize a evolução diária do saldo considerando receitas, despesas fixas/recorrentes e faturas futuras; contas-reserva ficam isoladas do saldo efetivo disponível.
- **Command Palette (`Ctrl+K`) & entrada em linguagem natural** — Busca global instantânea entre transações, contas, categorias e metas, além de lançamento rápido por texto (ex.: `"padaria 18,50 ontem"` interpreta valor, data relativa e sugere categoria automaticamente).
- **Transações orientadas a produtividade** — Seleção múltipla em lote (`Espaço` / `Ctrl+clique`), edição e exclusão por atalhos de linha (`E`, `Delete`), filtros combinados por conta/categoria/período, notas e ação de **desfazer** via toast em qualquer exclusão.
- **Importação de extratos (OFX e CSV)** — Importador com memória local de categorização para acelerar conciliações recorrentes, além de exportação de períodos em CSV.
- **Relatórios e tendências** — KPIs do período, fluxo de caixa, ranking por categoria com *drill-down* direto para as transações filtradas e histórico real dos últimos 12 meses.
- **Modo sigilo (`Ctrl+H`)** — Oculta instantaneamente todos os valores monetários na interface para uso seguro em ambientes compartilhados.
- **Multimoeda e backup local** — Suporte a formatação em `BRL`, `USD` e `EUR`, tema claro/escuro e rotinas nativas de backup e restauração do banco local.

---

## Stack

| Camada | Tecnologias |
|---|---|
| **Desktop / Core** | [Tauri v2](https://v2.tauri.app/), Rust (edição 2021), IPC tipado |
| **Persistência** | SQLite embarcado via `rusqlite` (`bundled`) |
| **Front-end** | React 18, TypeScript, Vite, React Router |
| **UI & Estado** | Tailwind CSS, Radix UI, Lucide Icons, Zustand |
| **Qualidade & CI** | Vitest, `cargo test`, `clippy`, GitHub Actions (builds para Windows, Linux e macOS) |

---

## Estrutura do projeto

```text
nexo/
├── src/                 # Interface React + TypeScript
│   ├── components/      # Layout, Command Palette, modais, gráficos e design system
│   ├── hooks/           # Projeção financeira, tema e atalhos globais
│   ├── lib/             # Regras de saldo, faturas, OFX/CSV, entrada natural e relatórios
│   ├── pages/           # Dashboard, Calendário, Transações, Contas, Metas, Relatórios e Ajustes
│   └── store/           # Estados globais em Zustand (finanças, privacidade, toasts)
├── src-tauri/           # Backend nativo em Rust + persistência SQLite
│   └── src/             # Comandos Tauri, schema/migrações SQLite, modelos e backup
└── docs/                # Especificação do design system
```

---

## Como executar em desenvolvimento

### Pré-requisitos
- **Node.js** 20+ e `npm`
- **Rust** (`rustup` / toolchain `stable`) e dependências de sistema do [Tauri v2](https://v2.tauri.app/start/prerequisites/)

### Comandos

```bash
# Instalar dependências do front-end
npm install

# Rodar apenas a interface web (Vite)
npm run dev

# Rodar o aplicativo desktop completo (Tauri + Rust)
npm run tauri dev
```

### Testes e build

```bash
# Testes unitários do front-end (Vitest)
npm test

# Testes do core em Rust
cd src-tauri && cargo test

# Gerar instalador nativo da plataforma atual
npm run tauri build
```
