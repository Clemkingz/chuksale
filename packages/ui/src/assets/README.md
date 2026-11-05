# Design assets

Shared by every app (fonts, shared icons). Drop the reference design's font files in `fonts/` and declare them
with `@font-face` at the top of `../styles/globals.css`.

App-only images stay in that app's `public/images` (hero art, empty states, category art), because `next/image`
and CSS backgrounds need a plain URL.
