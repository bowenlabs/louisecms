---
"louise-toolkit": minor
---

Rich-text format bubble + brand colours (#182 Phase 5). The inline editor's
formatting toolbar is now a floating **selection bubble** (ProseKit
`InlinePopover`) that appears over highlighted text, instead of a caret-following
focus dock. It gains an inline **link** control, and the text-colour swatches are
now **brand tokens** rather than fixed hex: applying one stores
`color: var(--color-<token>)`, so the colour resolves to the *site's own* daisyUI
theme (primary / secondary / accent / neutral / info / success / warning / error)
and a re-theme flows through with no content rewrite. The sanitizer accepts
`color: var(--color-*)` on the mark's `<span>`.
