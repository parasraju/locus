# Focus and motion

Locus is keyboard-first. Every interactive control shows where focus is, and motion steps aside when the system asks.

## Focus

- Interactive elements use one accent ring on `:focus-visible`: `outline: 2px solid var(--color-locus-accent)` with `outline-offset: 2px`. The same token covers light and dark.
- Mouse clicks stay quiet. `:focus:not(:focus-visible)` clears the outline.
- Never remove an outline unless a `:focus-visible` replacement is in the same change. `outline-none`, `focus:outline-none`, and `focus:ring-0` on buttons, tabs, rows, and menu items are not allowed.
- Clickable rows and tabs that are in the tab order use that same ring. Do not leave a click target unfocusable if the keyboard is meant to reach it.
- Bordered text inputs use a softer cue: accent `border-color` plus a 3px `var(--color-locus-accent-soft)` shadow, instead of the ring.
- The CodeMirror editor is exempt. The caret is its focus indicator (`.cm-editor.cm-focused` keeps `outline: none`).

## Motion

- Entrance motion is only `locus-anim-fade`, `locus-anim-pop`, and `locus-anim-rise`.
- Under `prefers-reduced-motion: reduce`, those animations are disabled and transitions shorten to near zero.
