# Design system do Nexo

Fonte única das regras visuais. Os tokens vivem em `src/lib/designSystem.ts`
e os componentes-base em `src/components/ui` e `src/components/shared`.
**Nenhum componente define o próprio padrão** — ele compõe estas peças.

## Identidade

Interface sóbria de "ledger": cantos retos, hairlines (`border-border`),
tipografia monoespaçada para dados e rótulos, cor apenas com significado
(sucesso/alerta/destrutivo) e alto contraste reservado ao que está ativo.
Tudo opera 100% por teclado; o mouse é opcional.

## Regras

| # | Regra | Token / componente |
|---|-------|--------------------|
| 1 | Rótulo de campo: mono, uppercase, 10px, tracking 0.14em | `dsFieldLabel`, `<Label>` (padrão) |
| 2 | Rótulo de seção: idem com tracking 0.18em + hairline | `dsSectionLabel`, `<SectionHeader>` |
| 3 | Campo de formulário: h-9, `border-border`, fundo transparente, `ui-focus-ring`; aberto/ativo → `border-foreground` | `dsFieldTrigger`, `<Input>`, `<SelectTrigger>`, `<PickerField>` |
| 4 | Valor em gatilho de picker: mono 12px uppercase | `dsFieldValue` (embutido em `<PickerField>`) |
| 5 | Superfície flutuante única (popover, select, toast): `bg-popover` + hairline + sombra profunda, entrada fade+zoom 100–150ms | `dsPopoverSurface`, `dsShadow` |
| 6 | Anatomia de picker: gatilho → cabeçalho (busca/entrada) → corpo (grade/lista) → rodapé (dicas de teclado) | `<PickerField>`, `<PickerPopoverHeader>`, `<PickerPopoverFooter>` |
| 7 | Dica de tecla é sempre chip | `<Kbd>` / `<KbdGroup>` |
| 8 | Herói de página: overline mono 11px + valor mono 4xl/5xl light tabular | `dsHeroOverline`, `dsHeroValue` |
| 9 | Valor monetário renderizado leva a classe `.money` (borrado no modo sigilo, Ctrl/Cmd H) — sem exceção | `.money`, `<AnimatedCurrency>` |
| 10 | Botão de ação: `rounded-sm text-xs`; destrutivo é ghost `text-destructive` com confirmação em dois passos | `<Button>`, `<ConfirmDeleteButton>` |
| 11 | Erro de formulário: mono 11px destructive com `role="alert"` | `dsError` |
| 12 | Alternador segmentado: h-9, mono 11px uppercase, ativo em alto contraste (`bg-foreground text-background`) | `<SegmentedToggle>` |

## Como estender

1. Precisa de um rótulo, dica ou superfície? Importe o token — não copie a string.
2. Novo picker? Componha `PickerField` + `PickerPopover(Header/Footer)`;
   o corpo é livre, a casca não.
3. Novo padrão recorrente? Promova a token/componente aqui e documente a regra.
