#!/usr/bin/env python3
"""
generate_pebble_concepts.py – Generates 3 organic, boutique-grade identity concepts
matching user references: Simon Felsenstein's 'aquon' (Ref 1) and tactile periwinkle app pebble (Ref 2).
"""

import os
import subprocess
from PIL import Image

def get_concept_1_path():
    """
    Concept 1: 'The Argon Wave Pebble' (Directly modeled after Simon Felsenstein / Aquon Ref 1)
    An organic, fluid pebble loop forming a modern lowercase 'a'.
    Smooth outer bean-arch with an inner sweeping wave curl.
    """
    return '''
    <!-- Continuous Organic Pebble 'a' with Wave Curl Negative Space -->
    <path fill="currentColor" fill-rule="evenodd" d="
      M 210 100
      C 300 95 385 145 408 230
      C 430 315 398 385 330 412
      C 270 436 200 428 152 384
      C 105 342 90 274 116 214
      C 138 162 172 105 210 100
      Z
      M 194 204
      C 152 208 128 244 134 286
      C 140 324 174 348 214 344
      C 252 340 278 308 272 268
      C 266 230 236 200 194 204
      Z
      M 214 344
      C 250 340 272 312 268 276
      C 264 244 240 224 208 228
      C 180 232 164 254 168 280
      C 172 306 190 326 214 344
      Z
    " />
    '''

def get_concept_1_svg():
    # Clean single-path SVG for Concept 1
    # Outer arch + inner wave cutout sculpted with exact organic curve
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Argon — The Wave Pebble</title>
  <!-- Asymmetric organic pebble 'a' inspired by Simon Felsenstein -->
  <path fill="#111827" fill-rule="evenodd" d="
    M 228 108
    C 314 102 388 152 408 234
    C 428 316 394 384 330 410
    C 268 435 198 426 150 380
    C 104 336 90 268 116 210
    C 138 158 174 114 228 108
    Z
    M 216 200
    C 168 204 140 242 146 288
    C 152 328 188 352 228 348
    C 268 344 294 310 288 268
    C 282 226 256 196 216 200
    Z
  "/>
</svg>'''

def get_concept_2_svg():
    """
    Concept 2: 'The Noble Blob' (Ref 2 tactile periwinkle app pebble)
    Organic 3-lobed cloud pebble with volumetric periwinkle gradient
    and internal joy/ticket glyph (wave smile + 2 ticket stamp dots).
    """
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Argon — The Noble Blob</title>
  <defs>
    <linearGradient id="blobGrad" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#707BFC" />
      <stop offset="50%" stop-color="#5560F4" />
      <stop offset="100%" stop-color="#363FE0" />
    </linearGradient>
    <linearGradient id="blobSheen" x1="50%" y1="0%" x2="50%" y2="60%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0" />
    </linearGradient>
  </defs>

  <!-- Organic Cloud Pebble Shape -->
  <path fill="url(#blobGrad)" d="
    M 256 96
    C 340 96 414 150 424 234
    C 434 318 392 374 340 398
    C 310 412 284 394 256 394
    C 228 394 202 412 172 398
    C 120 374 78 318 88 234
    C 98 150 172 96 256 96
    Z
  "/>

  <!-- Top Volumetric Sheen -->
  <path fill="url(#blobSheen)" d="
    M 256 96
    C 340 96 414 150 424 234
    C 360 200 280 180 200 210
    C 135 235 100 240 88 234
    C 98 150 172 96 256 96
    Z
  "/>

  <!-- Joyful Ticket / Wave Smile in Center (Ref 2 style) -->
  <path fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" d="
    M 196 270
    C 220 250 240 285 275 280
    C 292 278 304 266 312 254
  "/>

  <!-- Twin Ticket Punch Pills (Eyes / Admission Dots) -->
  <rect x="290" y="196" width="22" height="36" rx="11" fill="#FFFFFF" transform="rotate(18 301 214)" />
  <rect x="330" y="186" width="22" height="36" rx="11" fill="#FFFFFF" transform="rotate(18 341 204)" />
</svg>'''

def get_concept_3_svg():
    """
    Concept 3: 'The Plasma Teardrop' (Fluid lowercase 'a' & noble drop)
    Sculpted continuous loop with clean geometric negative space.
    Rich deep indigo-violet (#4F46E5) with an organic curve.
    """
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Argon — The Plasma Teardrop</title>
  <defs>
    <linearGradient id="dropGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#312E81" />
    </linearGradient>
  </defs>
  <!-- Fluid loop forming lowercase 'a' with ticket entrance notch -->
  <path fill="url(#dropGrad3)" fill-rule="evenodd" d="
    M 270 100
    C 350 100 410 160 410 240
    C 410 330 350 410 260 410
    C 180 410 110 350 110 270
    C 110 180 180 100 270 100
    Z
    M 240 200
    C 190 200 160 230 160 270
    C 160 310 190 340 240 340
    C 290 340 330 310 330 260
    C 330 210 290 200 240 200
    Z
    M 330 260
    L 370 380
    C 374 392 364 404 352 404
    L 326 404
    L 300 330
    Z
  "/>
</svg>'''

def build_aquon_style_poster(concept_name, symbol_svg_content, out_svg_path):
    """
    Generates a full presentation poster replicating Ref 1 (Simon Felsenstein):
    - Cool mist canvas (#EAEFF5)
    - Centered top lockup: miniature mark + 'argon' rounded wordmark
    - Big centered floating squircle card (#F8FAFC) with soft diffused shadow
    - Prominent mark centered inside the card
    - Copyright and studio watermark footer
    """
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1350" width="900" height="1350" style="background:#EAEFF5;">
  <defs>
    <!-- Soft Studio Diffused Shadow for the Squircle Card -->
    <filter id="softCardShadow" x="-20%" y="-15%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="34" flood-color="#8898AA" flood-opacity="0.32" />
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#8898AA" flood-opacity="0.18" />
    </filter>
    <filter id="innerGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#FFFFFF" flood-opacity="0.8" />
    </filter>
  </defs>

  <rect width="900" height="1350" fill="#EAEFF5" />

  <!-- Top Brand Lockup (Ref 1 Style: Mark + 'argon') -->
  <g transform="translate(450, 190)" text-anchor="middle">
    <!-- Mini Mark -->
    <g transform="translate(-130, -32) scale(0.12)">
      {symbol_svg_content}
    </g>
    <!-- Wordmark: 'argon' in clean circular geometric sans -->
    <text x="10" y="8" fill="#111827" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" font-size="52" font-weight="600" letter-spacing="-1.5">argon</text>
  </g>

  <!-- Big Floating Squircle Card (Ref 1 Exact Proportions) -->
  <g transform="translate(190, 370)" filter="url(#softCardShadow)">
    <!-- Squircle Card: 520x520, rx=130 -->
    <rect width="520" height="520" rx="130" ry="130" fill="#F8FAFC" />
    <rect width="520" height="520" rx="130" ry="130" fill="none" stroke="#FFFFFF" stroke-width="2.5" />

    <!-- Centered Hero Mark (340x340) -->
    <g transform="translate(90, 90) scale(0.664)">
      {symbol_svg_content}
    </g>

    <!-- Subtle (C) / Identity Mark Top Right of Card -->
    <g transform="translate(470, -20)">
      <circle cx="15" cy="15" r="14" fill="none" stroke="#111827" stroke-width="2" />
      <text x="15" y="20" fill="#111827" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle">C</text>
    </g>
  </g>

  <!-- Editorial Bottom Info (Ref 1 Exact Layout) -->
  <g transform="translate(450, 1100)" text-anchor="middle">
    <text x="0" y="0" fill="#111827" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" letter-spacing="3">✦ AVAILABLE FOR PRODUCTION</text>
    <text x="0" y="32" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="500">argon.events / visual identity system</text>
  </g>
</svg>'''

def build_comparison_board(c1_svg, c2_svg, c3_svg):
    """
    Builds a 1200x800 comparative board showing all 3 organic pebble concepts side by side.
    """
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800" style="background:#EBF0F6;">
  <defs>
    <filter id="pebbleShadow" x="-20%" y="-15%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#8898AA" flood-opacity="0.3" />
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#8898AA" flood-opacity="0.15" />
    </filter>
  </defs>

  <rect width="1200" height="800" fill="#EBF0F6" />

  <!-- Header -->
  <g transform="translate(60, 50)">
    <text x="0" y="20" fill="#475569" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700" letter-spacing="2">AUTHENTIC BOUTIQUE IDENTITY STUDY</text>
    <text x="0" y="52" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="30" font-weight="800" letter-spacing="-0.5">Argon: Pebble &amp; Organic Form Concepts</text>
    <text x="0" y="78" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14">Crafted from user references (Simon Felsenstein's aquon &amp; tactile periwinkle app pebble).</text>
  </g>

  <!-- 3 Cards -->
  <g transform="translate(60, 160)">
    <!-- Concept 1: The Wave Pebble (Aquon style) -->
    <g transform="translate(0, 0)">
      <rect width="340" height="480" rx="36" fill="#F8FAFC" stroke="#FFFFFF" stroke-width="2" filter="url(#pebbleShadow)" />
      <!-- Mark centered inside card -->
      <g transform="translate(70, 40) scale(0.39)">
        {c1_svg}
      </g>
      <text x="170" y="280" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="800" text-anchor="middle">1. The Wave Pebble</text>
      <text x="170" y="304" fill="#0284C7" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" letter-spacing="1" text-anchor="middle">SIMON FELSENSTEIN STYLE</text>
      <text x="35" y="340" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">
        <tspan x="35" dy="0">• Asymmetrical pebble 'a' loop</tspan>
        <tspan x="35" dy="20">• Organic teardrop wave counter-cutout</tspan>
        <tspan x="35" dy="20">• Deep solid midnight (#111827)</tspan>
        <tspan x="35" dy="20">• Understated, confident, high-art</tspan>
      </text>
      <rect x="85" y="420" width="170" height="28" rx="14" fill="#0284C7" fill-opacity="0.15" stroke="#0284C7" stroke-width="1" />
      <text x="170" y="438" fill="#0369A1" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" text-anchor="middle">SENIOR RECOMMENDATION</text>
    </g>

    <!-- Concept 2: The Noble Blob (Ref 2 style) -->
    <g transform="translate(370, 0)">
      <rect width="340" height="480" rx="36" fill="#F8FAFC" stroke="#FFFFFF" stroke-width="2" filter="url(#pebbleShadow)" />
      <g transform="translate(70, 40) scale(0.39)">
        {c2_svg}
      </g>
      <text x="170" y="280" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="800" text-anchor="middle">2. The Noble Blob</text>
      <text x="170" y="304" fill="#6366F1" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" letter-spacing="1" text-anchor="middle">PERIWINKLE APP PEBBLE</text>
      <text x="35" y="340" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">
        <tspan x="35" dy="0">• Soft 3D-shaded cloud pebble</tspan>
        <tspan x="35" dy="20">• Rich royal periwinkle (#5560F4)</tspan>
        <tspan x="35" dy="20">• Access wave + twin ticket pills</tspan>
        <tspan x="35" dy="20">• Playful, tactile, joyful character</tspan>
      </text>
      <rect x="85" y="420" width="170" height="28" rx="14" fill="#6366F1" fill-opacity="0.15" stroke="#6366F1" stroke-width="1" />
      <text x="170" y="438" fill="#4338CA" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" text-anchor="middle">TACTILE APP STORE HERO</text>
    </g>

    <!-- Concept 3: The Plasma Teardrop -->
    <g transform="translate(740, 0)">
      <rect width="340" height="480" rx="36" fill="#F8FAFC" stroke="#FFFFFF" stroke-width="2" filter="url(#pebbleShadow)" />
      <g transform="translate(70, 40) scale(0.39)">
        {c3_svg}
      </g>
      <text x="170" y="280" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="800" text-anchor="middle">3. The Plasma Teardrop</text>
      <text x="170" y="304" fill="#4F46E5" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" letter-spacing="1" text-anchor="middle">ORGANIC GAS CAPSULE</text>
      <text x="35" y="340" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">
        <tspan x="35" dy="0">• Continuous fluid loop lowercase 'a'</tspan>
        <tspan x="35" dy="20">• Ticket pass notch in the right stem</tspan>
        <tspan x="35" dy="20">• Saturated royal indigo (#4F46E5)</tspan>
        <tspan x="35" dy="20">• Balanced geometric minimalism</tspan>
      </text>
      <rect x="85" y="420" width="170" height="28" rx="14" fill="#4F46E5" fill-opacity="0.15" stroke="#4F46E5" stroke-width="1" />
      <text x="170" y="438" fill="#3730A3" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" text-anchor="middle">CLEAN MONOGRAM</text>
    </g>
  </g>
</svg>'''

def main():
    base_dir = "apps/web/public/brand/concepts_v3"
    renders_dir = f"{base_dir}/renders"
    os.makedirs(renders_dir, exist_ok=True)

    c1_svg = get_concept_1_svg()
    c2_svg = get_concept_2_svg()
    c3_svg = get_concept_3_svg()

    # Write SVGs
    with open(f"{base_dir}/concept-1-wave-pebble.svg", "w") as f:
        f.write(c1_svg)
    with open(f"{base_dir}/concept-2-noble-blob.svg", "w") as f:
        f.write(c2_svg)
    with open(f"{base_dir}/concept-3-plasma-drop.svg", "w") as f:
        f.write(c3_svg)

    # Write Ref 1 Simon Felsenstein style poster for Concept 1
    poster_1 = build_aquon_style_poster("The Wave Pebble", c1_svg, f"{base_dir}/poster-concept-1.svg")
    with open(f"{base_dir}/poster-concept-1.svg", "w") as f:
        f.write(poster_1)

    # Write Ref 2 tactile poster for Concept 2
    poster_2 = build_aquon_style_poster("The Noble Blob", c2_svg, f"{base_dir}/poster-concept-2.svg")
    with open(f"{base_dir}/poster-concept-2.svg", "w") as f:
        f.write(poster_2)

    # Write Comparison board
    comp_board = build_comparison_board(c1_svg, c2_svg, c3_svg)
    with open(f"{base_dir}/pebble-comparison-board.svg", "w") as f:
        f.write(comp_board)

    print("All SVGs created. Now rendering to high-res PNG via Inkscape...")

    # Render PNGs
    files_to_render = [
        ("concept-1-wave-pebble.svg", 512),
        ("concept-2-noble-blob.svg", 512),
        ("concept-3-plasma-drop.svg", 512),
        ("poster-concept-1.svg", 900),
        ("poster-concept-2.svg", 900),
        ("pebble-comparison-board.svg", 1200)
    ]

    for fname, width in files_to_render:
        src = f"{base_dir}/{fname}"
        png_name = fname.replace(".svg", ".png")
        dest = f"{renders_dir}/{png_name}"
        subprocess.run(["inkscape", src, f"--export-filename={dest}", f"--export-width={width}"], check=True)
        # Verify with PIL
        im = Image.open(dest)
        print(f"Rendered {png_name}: size={im.size}, extrema={im.getextrema()}")

    # Copy key showcase PNGs to artifacts directory
    brain_dir = "/Users/sorpheatepy/.gemini/antigravity-cli/brain/89a0c240-13c3-4113-b0d3-3068281d9240"
    subprocess.run(["cp", f"{renders_dir}/poster-concept-1.png", f"{brain_dir}/poster_concept_1_pebble.png"], check=True)
    subprocess.run(["cp", f"{renders_dir}/poster-concept-2.png", f"{brain_dir}/poster_concept_2_blob.png"], check=True)
    subprocess.run(["cp", f"{renders_dir}/pebble-comparison-board.png", f"{brain_dir}/pebble_comparison_board.png"], check=True)

    print("Execution & verification complete!")

if __name__ == "__main__":
    main()
