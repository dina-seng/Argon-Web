#!/usr/bin/env python3
"""
generate_fluid_concepts.py – Generates 3 fluid, organic-precision noble plasma loop concepts.
Colors: Electric Cyan (#06B6D4 / #22D3EE) to Deep Indigo (#6366F1 / #4F46E5) on Obsidian Slate (#0B0F17).
"""

import os

def concept_1_plasma_portal(color=True):
    """
    Concept 1: 'The Plasma Portal' (Fluid Infinity A-Gate)
    A continuous, smoothly looping ribbon that loops upward through an apex
    and twists into an infinite portal gateway.
    """
    if color:
        return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Argon — The Plasma Portal</title>
  <defs>
    <linearGradient id="argonPlasma1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE" />
      <stop offset="50%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#6366F1" />
    </linearGradient>
    <linearGradient id="argonPlasmaBack1" x1="100%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
  </defs>
  <!-- Background Loop Underlay -->
  <path fill="url(#argonPlasmaBack1)" d="
    M 78 174
    C 98 140 120 110 128 76
    C 134 50 148 40 162 48
    C 178 58 178 84 164 116
    C 152 144 130 178 114 196
    C 98 214 74 216 64 202
    C 54 188 62 168 78 174
    Z
  "/>
  <!-- Foreground Primary Ribbon Loop -->
  <path fill="url(#argonPlasma1)" fill-rule="evenodd" d="
    M 128 32
    C 106 32 88 56 82 86
    C 74 126 94 168 128 196
    C 156 220 186 216 198 194
    C 210 172 202 144 178 126
    C 154 108 140 98 142 82
    C 144 68 154 60 164 66
    C 178 74 182 96 172 120
    C 168 130 172 142 184 146
    C 196 150 206 142 210 128
    C 224 88 214 48 184 34
    C 164 24 144 26 128 32
    Z
    M 112 124
    C 114 100 122 82 128 66
    C 126 92 118 114 112 124
    Z
  "/>
</svg>'''
    else:
        return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Argon — The Plasma Portal (Monochrome)</title>
  <path fill="#000000" fill-rule="evenodd" d="
    M 128 32
    C 92 32 68 64 64 108
    C 60 152 86 198 128 218
    C 170 238 206 214 216 176
    C 226 138 210 94 178 68
    C 158 52 140 48 128 32
    Z
    M 128 72
    C 142 88 158 108 166 136
    C 174 164 160 184 136 178
    C 112 172 98 144 100 118
    C 102 92 114 78 128 72
    Z
  "/>
</svg>'''

def concept_2_ion_orbit(color=True):
    """
    Concept 2: 'The Noble Orbit' (Fluid Dual-Loop Shell)
    Argon atomic shell represented as two interlocking continuous fluid ribbons
    forming an inner gateway aperture and an upward flow.
    """
    if color:
        return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Argon — The Noble Orbit</title>
  <defs>
    <linearGradient id="cyanPlasma" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <linearGradient id="indigoPlasma" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
  </defs>
  <!-- Orbit Ring 1: Upward Ascending Cyan Helix -->
  <path fill="url(#cyanPlasma)" d="
    M 128 28
    C 78 28 38 68 38 118
    C 38 152 56 182 84 198
    C 94 204 108 200 114 190
    C 120 180 116 166 106 160
    C 86 148 74 126 74 102
    C 74 68 100 48 132 50
    C 160 52 182 72 186 100
    C 190 126 176 152 152 164
    C 134 172 124 190 132 208
    C 140 224 160 230 178 220
    C 214 200 232 160 228 118
    C 222 66 180 28 128 28
    Z
  "/>
  <!-- Orbit Ring 2: Interlocking Noble Core -->
  <path fill="url(#indigoPlasma)" d="
    M 128 76
    C 106 76 88 94 88 116
    C 88 138 106 156 128 156
    C 150 156 168 138 168 116
    C 168 94 150 76 128 76
    Z
    M 128 102
    C 136 102 142 108 142 116
    C 142 124 136 130 128 130
    C 120 130 114 124 114 116
    C 114 108 120 102 128 102
    Z
  "/>
</svg>'''
    else:
        return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Argon — The Noble Orbit (Monochrome)</title>
  <path fill="#000000" fill-rule="evenodd" d="
    M 128 28
    C 78 28 38 68 38 118
    C 38 168 78 208 128 208
    C 178 208 218 168 218 118
    C 218 68 178 28 128 28
    Z
    M 128 64
    C 158 64 182 88 182 118
    C 182 148 158 172 128 172
    C 98 172 74 148 74 118
    C 74 88 98 64 128 64
    Z
    M 128 92
    C 114 92 102 104 102 118
    C 102 132 114 144 128 144
    C 142 144 154 132 154 118
    C 154 104 142 92 128 92
    Z
  "/>
</svg>'''

def concept_3_fluid_apex(color=True):
    """
    Concept 3: 'The Fluid Apex' (Curved Monogram Ribbon)
    A calligraphic, fluidly sculpted letterform A with soft continuous curves,
    a tapered apex loop, and a glowing cyan cross-turnstile.
    """
    if color:
        return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Argon — The Fluid Apex</title>
  <defs>
    <linearGradient id="apexGradient" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="45%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <linearGradient id="crossbeamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>
  </defs>
  <!-- Fluid Outer Ribbon A -->
  <path fill="url(#apexGradient)" d="
    M 128 32
    C 140 32 150 42 156 56
    L 218 196
    C 224 210 216 224 202 224
    C 192 224 182 216 178 206
    L 164 172
    C 146 172 110 172 92 172
    L 78 206
    C 74 216 64 224 54 224
    C 40 224 32 210 38 196
    L 100 56
    C 106 42 116 32 128 32
    Z
    M 128 84
    L 106 142
    L 150 142
    Z
  "/>
  <!-- Floating Fluid Cross-Portal Glow -->
  <path fill="url(#crossbeamGradient)" d="
    M 88 152
    C 88 146 94 140 102 140
    L 154 140
    C 162 140 168 146 168 152
    C 168 158 162 164 154 164
    L 102 164
    C 94 164 88 158 88 152
    Z
  "/>
</svg>'''
    else:
        return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Argon — The Fluid Apex (Monochrome)</title>
  <path fill="#000000" fill-rule="evenodd" d="
    M 128 32
    C 140 32 150 42 156 56
    L 218 196
    C 224 210 216 224 202 224
    C 192 224 182 216 178 206
    L 164 172
    L 92 172
    L 78 206
    C 74 216 64 224 54 224
    C 40 224 32 210 38 196
    L 100 56
    C 106 42 116 32 128 32
    Z
    M 128 84
    L 106 142
    L 150 142
    Z
  "/>
</svg>'''

if __name__ == '__main__':
    out_dir = 'apps/web/public/brand/concepts_v2'
    with open(f'{out_dir}/concept-1-color.svg', 'w') as f:
        f.write(concept_1_plasma_portal(True))
    with open(f'{out_dir}/concept-1-mono.svg', 'w') as f:
        f.write(concept_1_plasma_portal(False))

    with open(f'{out_dir}/concept-2-color.svg', 'w') as f:
        f.write(concept_2_ion_orbit(True))
    with open(f'{out_dir}/concept-2-mono.svg', 'w') as f:
        f.write(concept_2_ion_orbit(False))

    with open(f'{out_dir}/concept-3-color.svg', 'w') as f:
        f.write(concept_3_fluid_apex(True))
    with open(f'{out_dir}/concept-3-mono.svg', 'w') as f:
        f.write(concept_3_fluid_apex(False))

    print("Fluid noble loop concepts written.")
