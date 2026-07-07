/**
 * Design system do Nexo — fonte única das regras visuais dos componentes.
 *
 * Identidade: interface sóbria de "ledger" — cantos retos, hairlines,
 * tipografia monoespaçada para dados e rótulos, alto contraste apenas
 * no que está ativo. Todo componente novo deve compor estes tokens em
 * vez de definir classes próprias; qualquer exceção precisa de motivo.
 *
 * Regras:
 * 1. Rótulos de campo e de seção são sempre mono, uppercase, 10px.
 *    Campos usam tracking 0.14em; seções (com hairline) 0.18em.
 * 2. Todo campo de formulário (input, select, picker) tem 9 unidades de
 *    altura (h-9), borda `border-border`, fundo transparente e
 *    `ui-focus-ring`. Aberto/ativo, a borda vira `border-foreground`.
 * 3. Valores dentro de gatilhos de picker são mono 12px uppercase.
 * 4. Popovers/painéis flutuantes compartilham a MESMA superfície:
 *    `border-border`, `bg-popover` e a sombra profunda única do app —
 *    com entrada `fade-in + zoom-in-95` de 100–150ms.
 * 5. A anatomia interna de um popover de picker é sempre
 *    cabeçalho (campo de busca/entrada) → corpo (grade/lista) →
 *    rodapé (dicas de teclado). Nenhum picker inventa outra ordem.
 * 6. Dicas de tecla usam o chip <Kbd>; nunca texto solto.
 * 7. Números-herói de página: mono 4xl/5xl light tabular. Valores
 *    monetários levam `.money` (modo sigilo) — sem exceção.
 * 8. Botões de ação usam `rounded-sm text-xs`; destrutivos são ghost
 *    com texto `text-destructive` e confirmação em dois passos.
 */

/** Sombra única de elementos flutuantes (popover, select, toast). */
export const dsShadow = "shadow-[0_24px_56px_-30px_rgba(0,0,0,0.85)]";

/** Superfície de popover/painel flutuante. */
export const dsPopoverSurface = `border border-border bg-popover text-popover-foreground ${dsShadow}`;

/** Rótulo de campo de formulário. */
export const dsFieldLabel =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

/** Rótulo de seção (acompanha hairline — ver <SectionHeader>). */
export const dsSectionLabel =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

/** Overline de herói de página (ex.: "Saldo efetivo"). */
export const dsHeroOverline =
  "font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground";

/** Número-herói de página. */
export const dsHeroValue =
  "font-mono text-4xl font-light tabular-nums tracking-tight md:text-5xl";

/** Gatilho fechado de picker/select — mesma casca em todos os campos. */
export const dsFieldTrigger =
  "flex h-9 w-full items-center gap-2.5 border border-border bg-transparent px-3 text-left text-sm transition-colors ui-focus-ring disabled:cursor-not-allowed disabled:opacity-50";

/** Estado aberto/ativo do gatilho. */
export const dsFieldTriggerOpen = "border-foreground";

/** Valor mono dentro de gatilhos de picker. */
export const dsFieldValue = "font-mono text-xs uppercase tracking-[0.12em]";

/** Dica/nota auxiliar (rodapés de popover, hints). */
export const dsHint =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

/** Mensagem de erro de formulário. */
export const dsError = "font-mono text-[11px] text-destructive";
