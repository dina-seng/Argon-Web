#!/usr/bin/env python3
"""
build_showcase.py – Creates high-resolution visual mockups of the Argon Noble Plasma identity.
1. VIP Event Lanyard Badge (with attendee name, QR code, holograph)
2. Mobile Apple Wallet Ticket Pass (dark mode smartphone UI)
3. Platform Header & Dashboard in situ
4. Side-by-side visual comparison sheet
"""

import os
import subprocess

OUT_DIR = 'apps/web/public/brand/concepts_v2'

def make_vip_badge_mockup():
    """VIP Event Lanyard Pass Mockup with Concept 3 / Concept 1 Mark"""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <!-- Background Canvas Gradient -->
    <radialGradient id="stageGlow" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#1E1B4B" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#05070D" stop-opacity="1" />
    </radialGradient>

    <!-- Pass Acrylic Material -->
    <linearGradient id="badgeBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#090D16" />
    </linearGradient>

    <!-- Holographic Plasma Strip -->
    <linearGradient id="holoPlasma" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06B6D4" />
      <stop offset="35%" stop-color="#3B82F6" />
      <stop offset="70%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>

    <linearGradient id="apexGradient" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="50%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#22D3EE" />
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Stage Canvas -->
  <rect width="800" height="1000" fill="url(#stageGlow)"/>

  <!-- Subtle Studio Grid -->
  <g stroke="#334155" stroke-width="0.5" opacity="0.15">
    <line x1="0" y1="200" x2="800" y2="200"/>
    <line x1="0" y1="400" x2="800" y2="400"/>
    <line x1="0" y1="600" x2="800" y2="600"/>
    <line x1="0" y1="800" x2="800" y2="800"/>
    <line x1="200" y1="0" x2="200" y2="1000"/>
    <line x1="400" y1="0" x2="400" y2="1000"/>
    <line x1="600" y1="0" x2="600" y2="1000"/>
  </g>

  <!-- Lanyard Strap Mockup -->
  <path d="M 360 0 L 375 140 L 425 140 L 440 0 Z" fill="#0B0F17" stroke="#1E293B" stroke-width="2"/>
  <rect x="375" y="115" width="50" height="30" rx="6" fill="#334155" stroke="#475569" stroke-width="1.5"/>
  <circle cx="400" cy="130" r="6" fill="#0F172A"/>

  <!-- Physical VIP Pass Shadow -->
  <rect x="185" y="180" width="430" height="720" rx="36" fill="#000000" opacity="0.6" filter="blur(24px)"/>

  <!-- Pass Card Body (Obsidian Frosted Glass) -->
  <rect x="185" y="160" width="430" height="720" rx="36" fill="url(#badgeBody)" stroke="#334155" stroke-width="1.5"/>
  <!-- Specular inner rim -->
  <rect x="187" y="162" width="426" height="716" rx="34" fill="none" stroke="#64748B" stroke-width="0.5" opacity="0.5"/>

  <!-- Punch Hole -->
  <rect x="370" y="185" width="60" height="12" rx="6" fill="#05070D" stroke="#334155" stroke-width="1"/>

  <!-- Holographic Security Foil Top Strip -->
  <rect x="186" y="225" width="428" height="12" fill="url(#holoPlasma)"/>

  <!-- BRAND LOGO MARK (Centered, Luminous Glow) -->
  <g transform="translate(340, 260) scale(0.47)" filter="url(#neonGlow)">
    <path fill="url(#apexGradient)" d="
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
    <path fill="#22D3EE" d="
      M 88 152
      C 88 146 94 140 102 140
      L 154 140
      C 162 140 168 146 168 152
      C 168 158 162 164 154 164
      L 102 164
      C 94 164 88 158 88 152
      Z
    "/>
  </g>

  <!-- Brand Title -->
  <text x="400" y="415" text-anchor="middle" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="28" letter-spacing="4" fill="#FFFFFF">
    ARGON
  </text>
  <text x="400" y="438" text-anchor="middle" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="700" font-size="11" letter-spacing="2" fill="#22D3EE">
    CRYPTO-SETTLEMENT ECOSYSTEM
  </text>

  <!-- Attendee Section Card -->
  <rect x="220" y="475" width="360" height="150" rx="20" fill="#0B0F17" stroke="#1E293B" stroke-width="1"/>
  
  <text x="245" y="515" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="22" fill="#FFFFFF">
    ALEX CHEN
  </text>
  <text x="245" y="538" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="600" font-size="12" fill="#94A3B8">
    Lead Delegate · CADT Tech Summit 2026
  </text>

  <!-- Badge Pill Tag -->
  <rect x="245" y="565" width="115" height="28" rx="6" fill="#1E1B4B" stroke="#4F46E5" stroke-width="1"/>
  <text x="302" y="583" text-anchor="middle" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="11" letter-spacing="1" fill="#818CF8">
    VIP PASS
  </text>

  <rect x="370" y="565" width="95" height="28" rx="6" fill="#042F2E" stroke="#0D9488" stroke-width="1"/>
  <text x="417" y="583" text-anchor="middle" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="11" letter-spacing="1" fill="#2DD4BF">
    ACTIVE
  </text>

  <!-- Cryptographic Gate QR Section -->
  <g transform="translate(260, 655)">
    <!-- QR Card Background -->
    <rect x="0" y="0" width="280" height="175" rx="18" fill="#0B0F17" stroke="#1E293B" stroke-width="1"/>
    
    <!-- Stylized Geometric QR Pattern -->
    <g fill="#22D3EE" opacity="0.9">
      <!-- Corners -->
      <rect x="20" y="20" width="36" height="36" rx="4" fill="none" stroke="#22D3EE" stroke-width="4"/>
      <rect x="28" y="28" width="20" height="20" rx="2"/>
      
      <rect x="224" y="20" width="36" height="36" rx="4" fill="none" stroke="#22D3EE" stroke-width="4"/>
      <rect x="232" y="28" width="20" height="20" rx="2"/>

      <rect x="20" y="119" width="36" height="36" rx="4" fill="none" stroke="#22D3EE" stroke-width="4"/>
      <rect x="28" y="127" width="20" height="20" rx="2"/>

      <!-- Inner bit grid -->
      <circle cx="80" cy="38" r="4"/>
      <circle cx="100" cy="38" r="4"/>
      <circle cx="120" cy="38" r="4"/>
      <circle cx="150" cy="38" r="4"/>
      <circle cx="180" cy="38" r="4"/>

      <circle cx="80" cy="68" r="4"/>
      <circle cx="110" cy="68" r="4"/>
      <circle cx="140" cy="68" r="4"/>
      <circle cx="170" cy="68" r="4"/>
      <circle cx="200" cy="68" r="4"/>

      <circle cx="90" cy="100" r="4"/>
      <circle cx="130" cy="100" r="4"/>
      <circle cx="160" cy="100" r="4"/>
      <circle cx="190" cy="100" r="4"/>

      <circle cx="80" cy="137" r="4"/>
      <circle cx="110" cy="137" r="4"/>
      <circle cx="140" cy="137" r="4"/>
      <circle cx="170" cy="137" r="4"/>
      <circle cx="200" cy="137" r="4"/>
    </g>

    <!-- Scan Line -->
    <line x1="20" y1="88" x2="260" y2="88" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.8"/>
  </g>

  <!-- Footer Microtext -->
  <text x="400" y="855" text-anchor="middle" font-family="monospace" font-size="10" letter-spacing="1" fill="#64748B">
    HASH: 9F82A4C0 · SECURE ENCLAVE VERIFIED
  </text>
</svg>'''
    return svg

def make_concepts_comparison_board():
    """Generates an aesthetic 3-concept visual comparison sheet in Electric Noble Plasma"""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 680" width="1200" height="680">
  <defs>
    <radialGradient id="compBg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#05070D" />
    </radialGradient>

    <!-- Concept 1 Gradient -->
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE" />
      <stop offset="50%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#6366F1" />
    </linearGradient>

    <!-- Concept 2 Gradient -->
    <linearGradient id="g2a" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <linearGradient id="g2b" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>

    <!-- Concept 3 Gradient -->
    <linearGradient id="g3a" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="45%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="680" fill="url(#compBg)"/>

  <!-- Header -->
  <text x="60" y="60" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="28" fill="#FFFFFF">
    Argon — Fluid Noble Plasma Identity
  </text>
  <text x="60" y="86" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="600" font-size="14" fill="#94A3B8">
    Organic-precision curved loops in authentic Argon ionization glow (#06B6D4 Cyan &amp; #6366F1 Indigo)
  </text>

  <!-- CARD 1: The Plasma Portal -->
  <g transform="translate(60, 120)">
    <rect width="340" height="490" rx="28" fill="#0B0F17" stroke="#1E293B" stroke-width="1.5"/>
    <!-- Mark Display Area -->
    <rect x="20" y="20" width="300" height="230" rx="20" fill="#131926" stroke="#1E293B" stroke-width="1"/>
    
    <!-- Concept 1 SVG Centered -->
    <g transform="translate(90, 55) scale(0.62)">
      <path fill="#1E1B4B" d="
        M 78 174 C 98 140 120 110 128 76 C 134 50 148 40 162 48
        C 178 58 178 84 164 116 C 152 144 130 178 114 196
        C 98 214 74 216 64 202 C 54 188 62 168 78 174 Z
      "/>
      <path fill="url(#g1)" fill-rule="evenodd" d="
        M 128 32 C 106 32 88 56 82 86 C 74 126 94 168 128 196
        C 156 220 186 216 198 194 C 210 172 202 144 178 126
        C 154 108 140 98 142 82 C 144 68 154 60 164 66
        C 178 74 182 96 172 120 C 168 130 172 142 184 146
        C 196 150 206 142 210 128 C 224 88 214 48 184 34
        C 164 24 144 26 128 32 Z
        M 112 124 C 114 100 122 82 128 66 C 126 92 118 114 112 124 Z
      "/>
    </g>

    <text x="30" y="290" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="20" fill="#FFFFFF">
      1 · Plasma Portal
    </text>
    <rect x="30" y="306" width="105" height="22" rx="4" fill="#0C4A6E" stroke="#0284C7" stroke-width="1"/>
    <text x="82" y="321" text-anchor="middle" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="700" font-size="10" letter-spacing="1" fill="#38BDF8">
      INFINITY GATE
    </text>

    <text x="30" y="354" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">
      Continuous twisting Möbius ribbon forming
    </text>
    <text x="30" y="374" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">
      an infinite event gateway and subtle A glyph.
    </text>
    <text x="30" y="394" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">
      Zero sharp vertices. High fluid motion.
    </text>

    <!-- Mini scale test bar -->
    <line x1="30" y1="425" x2="310" y2="425" stroke="#1E293B" stroke-width="1"/>
    <text x="30" y="455" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="600" font-size="11" fill="#64748B">
      64px · 32px · 16px Scale Test
    </text>
    <!-- 32px -->
    <circle cx="280" cy="452" r="14" fill="#131926" stroke="#334155"/>
    <circle cx="280" cy="452" r="7" fill="#06B6D4"/>
  </g>

  <!-- CARD 2: The Noble Orbit -->
  <g transform="translate(430, 120)">
    <rect width="340" height="490" rx="28" fill="#0B0F17" stroke="#1E293B" stroke-width="1.5"/>
    <rect x="20" y="20" width="300" height="230" rx="20" fill="#131926" stroke="#1E293B" stroke-width="1"/>

    <!-- Concept 2 SVG Centered -->
    <g transform="translate(90, 55) scale(0.62)">
      <path fill="url(#g2a)" d="
        M 128 28 C 78 28 38 68 38 118 C 38 152 56 182 84 198
        C 94 204 108 200 114 190 C 120 180 116 166 106 160
        C 86 148 74 126 74 102 C 74 68 100 48 132 50
        C 160 52 182 72 186 100 C 190 126 176 152 152 164
        C 134 172 124 190 132 208 C 140 224 160 230 178 220
        C 214 200 232 160 228 118 C 222 66 180 28 128 28 Z
      "/>
      <path fill="url(#g2b)" d="
        M 128 76 C 106 76 88 94 88 116 C 88 138 106 156 128 156
        C 150 156 168 138 168 116 C 168 94 150 76 128 76 Z
        M 128 102 C 136 102 142 108 142 116 C 142 124 136 130 128 130
        C 120 130 114 124 114 116 C 114 108 120 102 128 102 Z
      "/>
    </g>

    <text x="30" y="290" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="20" fill="#FFFFFF">
      2 · Noble Orbit
    </text>
    <rect x="30" y="306" width="115" height="22" rx="4" fill="#1E1B4B" stroke="#4F46E5" stroke-width="1"/>
    <text x="87" y="321" text-anchor="middle" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="700" font-size="10" letter-spacing="1" fill="#A5B4FC">
      ATOMIC SHELL
    </text>

    <text x="30" y="354" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">
      Dual interlocking continuous rings reflecting
    </text>
    <text x="30" y="374" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">
      Argon's completed noble outer shell (valency 8)
    </text>
    <text x="30" y="394" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">
      and attendee rotation through venue turnstiles.
    </text>

    <line x1="30" y1="425" x2="310" y2="425" stroke="#1E293B" stroke-width="1"/>
    <text x="30" y="455" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="600" font-size="11" fill="#64748B">
      64px · 32px · 16px Scale Test
    </text>
    <circle cx="280" cy="452" r="14" fill="#131926" stroke="#334155"/>
    <circle cx="280" cy="452" r="7" fill="#6366F1"/>
  </g>

  <!-- CARD 3: The Fluid Apex (RECOMMENDED) -->
  <g transform="translate(800, 120)">
    <!-- Highlighted Active Frame -->
    <rect width="340" height="490" rx="28" fill="#0B0F17" stroke="#38BDF8" stroke-width="2"/>
    <rect x="20" y="20" width="300" height="230" rx="20" fill="#131926" stroke="#1E293B" stroke-width="1"/>

    <!-- Concept 3 SVG Centered -->
    <g transform="translate(90, 55) scale(0.62)">
      <path fill="url(#g3a)" d="
        M 128 32 C 140 32 150 42 156 56 L 218 196
        C 224 210 216 224 202 224 C 192 224 182 216 178 206
        L 164 172 L 92 172 L 78 206 C 74 216 64 224 54 224
        C 40 224 32 210 38 196 L 100 56 C 106 42 116 32 128 32 Z
        M 128 84 L 106 142 L 150 142 Z
      "/>
      <path fill="#22D3EE" d="
        M 88 152 C 88 146 94 140 102 140 L 154 140
        C 162 140 168 146 168 152 C 168 158 162 164 154 164
        L 102 164 C 94 164 88 158 88 152 Z
      "/>
    </g>

    <text x="30" y="290" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="20" fill="#FFFFFF">
      3 · Fluid Apex
    </text>
    <rect x="30" y="306" width="125" height="22" rx="4" fill="#0369A1" stroke="#38BDF8" stroke-width="1"/>
    <text x="92" y="321" text-anchor="middle" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="10" letter-spacing="1" fill="#FFFFFF">
      RECOMMENDED
    </text>

    <text x="30" y="354" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">
      Continuous sculpted monogram A with softened
    </text>
    <text x="30" y="374" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">
      corners, tapered apex loop, and floating
    </text>
    <text x="30" y="394" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">
      electric cyan portal beam. Highest legibility.
    </text>

    <line x1="30" y1="425" x2="310" y2="425" stroke="#1E293B" stroke-width="1"/>
    <text x="30" y="455" font-family="-apple-system, system-ui, BlinkMacSystemFont, sans-serif" font-weight="600" font-size="11" fill="#64748B">
      64px · 32px · 16px Scale Test
    </text>
    <circle cx="280" cy="452" r="14" fill="#131926" stroke="#38BDF8"/>
    <circle cx="280" cy="452" r="7" fill="#38BDF8"/>
  </g>
</svg>'''
    return svg

if __name__ == '__main__':
    with open(f'{OUT_DIR}/mockup-vip-pass.svg', 'w') as f:
        f.write(make_vip_badge_mockup())
    with open(f'{OUT_DIR}/showcase-comparison.svg', 'w') as f:
        f.write(make_concepts_comparison_board())
    print("Mockup SVGs written.")
