#!/usr/bin/env python3
"""
generate_lockups.py – Builds horizontal lockup SVGs for Concept A, B, and C.
viewBox: 0 0 768 256. Vector letterforms for 'ARGON' (no live text).
"""

import os

# Pure vector path glyphs for "ARGON" at height 96, y baseline 176
# Tracking: 18px gap between letters
GLYPH_A = "M 28 0 L 76 0 L 104 96 L 78 96 L 70 68 L 34 68 L 26 96 L 0 96 Z M 52 24 L 40 50 L 64 50 Z"
GLYPH_R = "M 0 0 L 54 0 C 74 0 86 10 86 28 C 86 42 76 50 62 54 L 88 96 L 60 96 L 36 58 L 26 58 L 26 96 L 0 96 Z M 26 20 L 26 40 L 52 40 C 60 40 64 36 64 30 C 64 24 60 20 52 20 Z"
GLYPH_G = "M 52 0 C 82 0 102 20 102 48 C 102 76 80 96 50 96 C 20 96 0 76 0 48 C 0 20 20 0 52 0 Z M 50 20 C 34 20 26 32 26 48 C 26 64 34 76 50 76 C 64 76 72 68 74 58 L 50 58 L 50 42 L 98 42 C 98 56 94 72 84 82 C 76 90 64 96 50 96 Z"
GLYPH_O = "M 48 0 C 76 0 96 22 96 48 C 96 74 76 96 48 96 C 20 96 0 74 0 48 C 0 22 20 0 48 0 Z M 48 20 C 32 20 24 32 24 48 C 24 64 32 76 48 76 C 64 76 72 64 72 48 C 72 32 64 20 48 20 Z"
GLYPH_N = "M 0 0 L 26 0 L 70 64 L 70 0 L 96 0 L 96 96 L 70 96 L 26 32 L 26 96 L 0 96 Z"

def build_lockup(mark_content, title_label):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 256" width="768" height="256">
  <title>{title_label}</title>
  <!-- Brand Symbol scaled to 160x160 centered at (130, 128) -->
  <g transform="translate(50, 48) scale(0.625)">
    {mark_content}
  </g>
  <!-- Wordmark 'ARGON' in bold neo-grotesque vector geometry -->
  <g fill="#000000" transform="translate(260, 80)">
    <!-- A -->
    <path d="M 28 0 L 64 0 L 92 96 L 68 96 L 62 72 L 30 72 L 24 96 L 0 96 Z M 46 20 L 35 54 L 57 54 Z"/>
    <!-- R -->
    <path d="M 108 0 L 158 0 C 176 0 188 10 188 28 C 188 42 178 50 164 54 L 190 96 L 164 96 L 140 58 L 132 58 L 132 96 L 108 96 Z M 132 18 L 132 40 L 156 40 C 164 40 168 36 168 29 C 168 22 164 18 156 18 Z"/>
    <!-- G -->
    <path d="M 252 0 C 280 0 298 20 298 48 L 274 48 C 274 32 264 20 252 20 C 236 20 226 32 226 48 C 226 64 236 76 252 76 C 264 76 272 70 274 58 L 254 58 L 254 42 L 298 42 L 298 90 C 286 94 270 96 252 96 C 220 96 202 74 202 48 C 202 22 222 0 252 0 Z"/>
    <!-- O -->
    <path d="M 358 0 C 386 0 406 22 406 48 C 406 74 386 96 358 96 C 330 96 310 74 310 48 C 310 22 330 0 358 0 Z M 358 20 C 342 20 334 32 334 48 C 334 64 342 76 358 76 C 374 76 382 64 382 48 C 382 32 374 20 358 20 Z"/>
    <!-- N -->
    <path d="M 422 0 L 446 0 L 490 66 L 490 0 L 514 0 L 514 96 L 490 96 L 446 30 L 446 96 L 422 96 Z"/>
  </g>
</svg>'''
    return svg

if __name__ == '__main__':
    os.chdir('apps/web/public/brand/concepts')
    
    with open('concept-a.svg') as f:
        content_a = f.read()
        # strip svg tag
        inner_a = content_a[content_a.find('>')+1:content_a.rfind('</svg>')]

    with open('concept-b.svg') as f:
        content_b = f.read()
        inner_b = content_b[content_b.find('>')+1:content_b.rfind('</svg>')]

    with open('concept-c.svg') as f:
        content_c = f.read()
        inner_c = content_c[content_c.find('>')+1:content_c.rfind('</svg>')]

    with open('lockup-a.svg', 'w') as f:
        f.write(build_lockup(inner_a, 'Argon — Lockup A'))

    with open('lockup-b.svg', 'w') as f:
        f.write(build_lockup(inner_b, 'Argon — Lockup B'))

    with open('lockup-c.svg', 'w') as f:
        f.write(build_lockup(inner_c, 'Argon — Lockup C'))

    print("Lockups written.")
