---
"louise-toolkit": patch
---

Turn on native browser spellcheck for multiline plain-text section fields (#142). Textarea-backed section fields (`data-louise-multiline` — taglines, card bodies, longer prose) now render with `spellcheck="true"` when edited in place, so misspellings get the browser's underline for free. Single-line headline/label fields stay `spellcheck="false"` (squiggles there are noise), and rich-text prose keeps using the Harper checker (#110). Spelling-only, zero-dependency — the lightweight first step from #142 ahead of any full Harper overlay for plain-text `contenteditable`.
