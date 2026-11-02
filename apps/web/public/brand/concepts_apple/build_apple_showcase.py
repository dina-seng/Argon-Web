#!/usr/bin/env python3
"""
build_apple_showcase.py – Creates:
1. appstore-spotlight.svg (1200x800): Apple App Store Product Card & Concept Grid.
2. iphone-homescreen.svg (1200x900): iPhone 16 Pro iOS 18 Home Screen with Argon in the app grid.
All SVG symbols are fully inlined for 100% self-contained rendering.
"""

import os

def get_concept_symbol(concept_num):
    if concept_num == 1:
        # Concept 1: The Cupertino Prism
        return '''
        <g id="emblem-concept-1">
          <defs>
            <radialGradient id="bgGrad1" cx="50%" cy="25%" r="85%">
              <stop offset="0%" stop-color="#1E293B" />
              <stop offset="45%" stop-color="#0F172A" />
              <stop offset="100%" stop-color="#05070D" />
            </radialGradient>
            <linearGradient id="beamLeft1" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stop-color="#67E8F9" />
              <stop offset="40%" stop-color="#06B6D4" />
              <stop offset="100%" stop-color="#0284C7" />
            </linearGradient>
            <linearGradient id="beamRight1" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stop-color="#818CF8" />
              <stop offset="50%" stop-color="#6366F1" />
              <stop offset="100%" stop-color="#4338CA" />
            </linearGradient>
            <linearGradient id="crossbarGrad1" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stop-color="#38BDF8" />
              <stop offset="50%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#A5B4FC" />
            </linearGradient>
            <linearGradient id="apexSpecular" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0" />
            </linearGradient>
            <linearGradient id="rimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
              <stop offset="25%" stop-color="#FFFFFF" stop-opacity="0.10" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.06" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="115" ry="115" fill="url(#bgGrad1)" />
          <circle cx="256" cy="256" r="140" fill="#06B6D4" opacity="0.2" filter="blur(36px)" />
          <circle cx="256" cy="270" r="100" fill="#6366F1" opacity="0.22" filter="blur(42px)" />
          <rect width="512" height="512" rx="115" ry="115" fill="none" stroke="url(#rimGrad)" stroke-width="3" />
          
          <!-- Monogram Prism Structure -->
          <g transform="translate(0, -6)">
            <!-- Left Beam -->
            <path d="M 256 104 C 246 104 238 110 233 119 L 132 322 C 126 334 135 348 149 348 L 182 348 C 192 348 201 342 205 333 L 229 282 L 283 282 L 256 104 Z" fill="url(#beamLeft1)" />
            <!-- Right Beam -->
            <path d="M 256 104 L 229 282 L 283 282 L 307 333 C 311 342 320 348 330 348 L 363 348 C 377 348 386 334 380 322 L 279 119 C 274 110 266 104 256 104 Z" fill="url(#beamRight1)" />
            <!-- Center Ticket Aperture Flare -->
            <path d="M 218 296 L 294 296 C 298 296 300 300 298 303 C 291 314 275 322 256 322 C 237 322 221 314 214 303 C 212 300 214 296 218 296 Z" fill="url(#crossbarGrad1)" />
            <!-- Inner Triangular Void -->
            <path d="M 256 168 L 274 254 L 238 254 Z" fill="#0A101D" opacity="0.95" />
            <!-- Apex Chamfer -->
            <path d="M 242 114 C 249 106 263 106 270 114 L 256 130 Z" fill="url(#apexSpecular)" />
          </g>
          <path d="M 0 0 L 260 0 L 0 380 Z" fill="#FFFFFF" opacity="0.025" />
        </g>
        '''
    elif concept_num == 2:
        # Concept 2: The Apple Wallet Jewel
        return '''
        <g id="emblem-concept-2">
          <defs>
            <radialGradient id="bgGrad2" cx="50%" cy="30%" r="80%">
              <stop offset="0%" stop-color="#182032" />
              <stop offset="50%" stop-color="#0B0F1A" />
              <stop offset="100%" stop-color="#030509" />
            </radialGradient>
            <linearGradient id="ticketFoil2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#22D3EE" />
              <stop offset="35%" stop-color="#3B82F6" />
              <stop offset="70%" stop-color="#6366F1" />
              <stop offset="100%" stop-color="#A855F7" />
            </linearGradient>
            <linearGradient id="ticketSheen2" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45" />
              <stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.05" />
              <stop offset="100%" stop-color="#000000" stop-opacity="0.3" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="115" ry="115" fill="url(#bgGrad2)" />
          <ellipse cx="256" cy="256" rx="150" ry="120" fill="#3B82F6" opacity="0.22" filter="blur(40px)" />
          <rect width="512" height="512" rx="115" ry="115" fill="none" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="2.5" />
          
          <!-- Floating Ticket Pass Card -->
          <g>
            <path fill="url(#ticketFoil2)" fill-rule="evenodd" d="M 172 136 C 152 136 136 152 136 172 L 136 230 C 154 230 168 244 168 256 C 168 268 154 282 136 282 L 136 340 C 136 360 152 376 172 376 L 340 376 C 360 376 376 360 376 340 L 376 282 C 358 282 344 268 344 256 C 344 244 358 230 376 230 L 376 172 C 376 152 360 136 340 136 Z" />
            <path fill="url(#ticketSheen2)" fill-rule="evenodd" d="M 172 136 C 152 136 136 152 136 172 L 136 230 C 154 230 168 244 168 256 C 168 268 154 282 136 282 L 136 340 C 136 360 152 376 172 376 L 340 376 C 360 376 376 360 376 340 L 376 282 C 358 282 344 268 344 256 C 344 244 358 230 376 230 L 376 172 C 376 152 360 136 340 136 Z" />
            <path fill="none" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.5" d="M 172 136 C 152 136 136 152 136 172 L 136 230 C 154 230 168 244 168 256 C 168 268 154 282 136 282 L 136 340 C 136 360 152 376 172 376 L 340 376 C 360 376 376 360 376 340 L 376 282 C 358 282 344 268 344 256 C 344 244 358 230 376 230 L 376 172 C 376 152 360 136 340 136 Z" />
            <!-- Laser Cut A -->
            <path fill="#090E17" d="M 256 182 C 250 182 245 186 242 192 L 204 290 C 201 297 206 306 215 306 L 230 306 C 235 306 240 302 242 297 L 248 280 L 264 280 L 270 297 C 272 302 277 306 282 306 L 297 306 C 306 306 311 297 308 290 L 270 192 C 267 186 262 182 256 182 Z M 256 222 L 260 262 L 252 262 Z" />
            <circle cx="216" cy="334" r="3.5" fill="#FFFFFF" opacity="0.6" />
            <circle cx="236" cy="334" r="3.5" fill="#FFFFFF" opacity="0.6" />
            <circle cx="256" cy="334" r="3.5" fill="#FFFFFF" opacity="0.8" />
            <circle cx="276" cy="334" r="3.5" fill="#FFFFFF" opacity="0.6" />
            <circle cx="296" cy="334" r="3.5" fill="#FFFFFF" opacity="0.6" />
          </g>
        </g>
        '''
    elif concept_num == 3:
        # Concept 3: The Noble Gateway
        return '''
        <g id="emblem-concept-3">
          <defs>
            <radialGradient id="bgGrad3" cx="50%" cy="40%" r="75%">
              <stop offset="0%" stop-color="#151926" />
              <stop offset="60%" stop-color="#0C0F17" />
              <stop offset="100%" stop-color="#020306" />
            </radialGradient>
            <linearGradient id="ringGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38BDF8" />
              <stop offset="50%" stop-color="#06B6D4" />
              <stop offset="100%" stop-color="#3B82F6" />
            </linearGradient>
            <linearGradient id="ringGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#818CF8" />
              <stop offset="50%" stop-color="#6366F1" />
              <stop offset="100%" stop-color="#4F46E5" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="115" ry="115" fill="url(#bgGrad3)" />
          <circle cx="256" cy="256" r="130" fill="#06B6D4" opacity="0.2" filter="blur(38px)" />
          <circle cx="256" cy="270" r="100" fill="#6366F1" opacity="0.22" filter="blur(42px)" />
          <rect width="512" height="512" rx="115" ry="115" fill="none" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="2.5" />
          
          <g>
            <circle cx="256" cy="256" r="128" fill="none" stroke="url(#ringGrad1)" stroke-width="24" stroke-linecap="round" stroke-dasharray="720 80" />
            <path d="M 194 324 L 256 186 L 318 324" fill="none" stroke="url(#ringGrad2)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="218" y1="284" x2="294" y2="284" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" opacity="0.9" />
            <circle cx="256" cy="186" r="10" fill="#FFFFFF" />
          </g>
        </g>
        '''

def generate_spotlight():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 860" width="1200" height="860">
  <defs>
    {get_concept_symbol(1)}
    {get_concept_symbol(2)}
    {get_concept_symbol(3)}
    
    <radialGradient id="spotlightBg" cx="50%" cy="0%" r="90%">
      <stop offset="0%" stop-color="#151D2F" />
      <stop offset="45%" stop-color="#0B0F18" />
      <stop offset="100%" stop-color="#04060A" />
    </radialGradient>
    <filter id="tileShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#000000" flood-opacity="0.6" />
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <rect width="1200" height="860" fill="url(#spotlightBg)" />

  <!-- App Store Header -->
  <g transform="translate(60, 42)">
    <text x="0" y="20" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="12" font-weight="700" letter-spacing="2">APPLE APP STORE IDENTITY SYSTEM</text>
    <text x="0" y="52" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="30" font-weight="800" letter-spacing="-0.5">Argon App Store Collection</text>
    <text x="0" y="78" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="14">Engineered to Apple Human Interface Guidelines with continuous squircle curvature and tactile depth.</text>
  </g>

  <!-- Featured App Banner (Hero) -->
  <g transform="translate(60, 150)">
    <rect width="1080" height="220" rx="28" fill="#111827" fill-opacity="0.6" stroke="#FFFFFF" stroke-opacity="0.1" />

    <!-- Big Featured Icon -->
    <g transform="translate(36, 26)" filter="url(#tileShadow)">
      <use href="#emblem-concept-1" x="0" y="0" width="168" height="168" />
    </g>

    <!-- App Titles & Metadata -->
    <g transform="translate(235, 40)">
      <text x="0" y="28" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="32" font-weight="800" letter-spacing="-0.5">Argon</text>
      <text x="0" y="54" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="16" font-weight="500">Live Passes, Tickets & Gate Access</text>
      <text x="0" y="76" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12" font-weight="700" letter-spacing="1">ARGON TECHNOLOGIES INC.</text>

      <g transform="translate(0, 96)">
        <rect width="84" height="32" rx="16" fill="#06B6D4" />
        <text x="42" y="21" fill="#05070D" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="13" font-weight="700" text-anchor="middle">GET</text>
        <text x="98" y="20" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11">In-App Purchases</text>
      </g>
    </g>

    <!-- App Store Badges -->
    <g transform="translate(680, 48)">
      <g transform="translate(0, 0)">
        <text x="40" y="16" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" font-weight="700" text-anchor="middle">RATINGS</text>
        <text x="40" y="44" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="24" font-weight="800" text-anchor="middle">4.9</text>
        <text x="40" y="66" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="13" text-anchor="middle">★★★★★</text>
        <text x="40" y="86" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" text-anchor="middle">12.8K Reviews</text>
      </g>
      <line x1="95" y1="10" x2="95" y2="90" stroke="#FFFFFF" stroke-opacity="0.12" />
      <g transform="translate(125, 0)">
        <text x="45" y="16" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" font-weight="700" text-anchor="middle">CHART</text>
        <text x="45" y="44" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="24" font-weight="800" text-anchor="middle">#1</text>
        <text x="45" y="66" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12" text-anchor="middle">Events</text>
        <text x="45" y="86" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" text-anchor="middle">Top Grossing</text>
      </g>
      <line x1="210" y1="10" x2="210" y2="90" stroke="#FFFFFF" stroke-opacity="0.12" />
      <g transform="translate(240, 0)">
        <text x="65" y="16" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" font-weight="700" text-anchor="middle">EDITORIAL</text>
        <rect x="18" y="28" width="94" height="24" rx="6" fill="#6366F1" fill-opacity="0.3" stroke="#818CF8" stroke-width="1" />
        <text x="65" y="44" fill="#A5B4FC" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="9" font-weight="800" text-anchor="middle">EDITORS' CHOICE</text>
        <text x="65" y="70" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12" font-weight="600" text-anchor="middle">Design Award</text>
        <text x="65" y="86" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" text-anchor="middle">Winner 2026</text>
      </g>
    </g>
  </g>

  <!-- 3 Concept Cards -->
  <g transform="translate(60, 410)">
    <!-- Card 1 -->
    <g transform="translate(0, 0)">
      <rect width="340" height="410" rx="24" fill="#111827" fill-opacity="0.5" stroke="#FFFFFF" stroke-opacity="0.08" />
      <g transform="translate(95, 30)" filter="url(#tileShadow)">
        <use href="#emblem-concept-1" x="0" y="0" width="150" height="150" />
      </g>
      <text x="170" y="215" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="800" text-anchor="middle">1. The Cupertino Prism</text>
      <text x="170" y="238" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12" font-weight="700" text-anchor="middle">SHORTCUTS &amp; VISION PRO MOTIF</text>
      <text x="28" y="270" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12">
        <tspan x="28" dy="0">• Precision interlocking architectural A</tspan>
        <tspan x="28" dy="20">• Floating ambient depth &amp; top specular rim</tspan>
        <tspan x="28" dy="20">• Electric Cyan into Deep Royal Indigo</tspan>
        <tspan x="28" dy="20">• Flawless legibility from 16px to 1024px</tspan>
      </text>
      <rect x="85" y="355" width="170" height="28" rx="14" fill="#06B6D4" fill-opacity="0.2" stroke="#22D3EE" stroke-width="1" />
      <text x="170" y="373" fill="#67E8F9" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" font-weight="700" text-anchor="middle">SENIOR RECOMMENDATION</text>
    </g>

    <!-- Card 2 -->
    <g transform="translate(370, 0)">
      <rect width="340" height="410" rx="24" fill="#111827" fill-opacity="0.5" stroke="#FFFFFF" stroke-opacity="0.08" />
      <g transform="translate(95, 30)" filter="url(#tileShadow)">
        <use href="#emblem-concept-2" x="0" y="0" width="150" height="150" />
      </g>
      <text x="170" y="215" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="800" text-anchor="middle">2. The Apple Wallet Jewel</text>
      <text x="170" y="238" fill="#818CF8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12" font-weight="700" text-anchor="middle">HOLOGRAPHIC PASS CARD</text>
      <text x="28" y="270" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12">
        <tspan x="28" dy="0">• Precision ticket geometry with edge notches</tspan>
        <tspan x="28" dy="20">• Laser-cut A monogram &amp; NFC dot matrix</tspan>
        <tspan x="28" dy="20">• Iridescent foil surface with light sweep</tspan>
        <tspan x="28" dy="20">• Instant metaphor of event admissions</tspan>
      </text>
      <rect x="85" y="355" width="170" height="28" rx="14" fill="#6366F1" fill-opacity="0.2" stroke="#818CF8" stroke-width="1" />
      <text x="170" y="373" fill="#C7D2FE" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" font-weight="700" text-anchor="middle">HIGH METAPHOR CLARITY</text>
    </g>

    <!-- Card 3 -->
    <g transform="translate(740, 0)">
      <rect width="340" height="410" rx="24" fill="#111827" fill-opacity="0.5" stroke="#FFFFFF" stroke-opacity="0.08" />
      <g transform="translate(95, 30)" filter="url(#tileShadow)">
        <use href="#emblem-concept-3" x="0" y="0" width="150" height="150" />
      </g>
      <text x="170" y="215" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="800" text-anchor="middle">3. The Noble Gateway</text>
      <text x="170" y="238" fill="#A855F7" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12" font-weight="700" text-anchor="middle">ACTIVITY RINGS / SIRI GLOW</text>
      <text x="28" y="270" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12">
        <tspan x="28" dy="0">• Pure concentric circular continuous geometry</tspan>
        <tspan x="28" dy="20">• Glowing noble gas plasma torus &amp; portal</tspan>
        <tspan x="28" dy="20">• Volumetric illuminated glass tube look</tspan>
        <tspan x="28" dy="20">• Hypnotic Apple Cupertino aesthetic</tspan>
      </text>
      <rect x="85" y="355" width="170" height="28" rx="14" fill="#A855F7" fill-opacity="0.2" stroke="#C084FC" stroke-width="1" />
      <text x="170" y="373" fill="#E9D5FF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" font-weight="700" text-anchor="middle">FUTURISTIC &amp; MINIMAL</text>
    </g>
  </g>
</svg>'''

def generate_iphone_mockup():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
  <defs>
    {get_concept_symbol(1)}
    
    <!-- iPhone Device Frame & Shadows -->
    <filter id="phoneShadow" x="-30%" y="-20%" width="160%" height="150%">
      <feDropShadow dx="0" dy="36" stdDeviation="45" flood-color="#000000" flood-opacity="0.7" />
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.4" />
    </filter>
    <radialGradient id="studioWall" cx="50%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#1E273A" />
      <stop offset="50%" stop-color="#0E131E" />
      <stop offset="100%" stop-color="#05070B" />
    </radialGradient>
    <!-- iOS 18 Wallpaper Gradient -->
    <linearGradient id="iosWallpaper" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="35%" stop-color="#1E1B4B" />
      <stop offset="70%" stop-color="#311042" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <!-- Frosted Dock Material -->
    <linearGradient id="dockMaterial" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.10" />
    </linearGradient>
  </defs>

  <!-- Studio Stage Background -->
  <rect width="1200" height="900" fill="url(#studioWall)" />

  <!-- Left Column: Context & Editorial Rationale -->
  <g transform="translate(80, 180)">
    <text x="0" y="0" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="13" font-weight="700" letter-spacing="2">REAL HARDWARE CONTEXT</text>
    <text x="0" y="38" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="34" font-weight="800" letter-spacing="-0.5">iOS 18 Native Experience</text>
    <text x="0" y="76" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="15" line-height="24">
      <tspan x="0" dy="0">An icon must belong in the ecosystem.</tspan>
      <tspan x="0" dy="24">Here is Argon sitting alongside Apple Wallet,</tspan>
      <tspan x="0" dy="24">Photos, Camera, and Calendar on a real iPhone 16 Pro.</tspan>
    </text>

    <!-- Inspection Callouts -->
    <g transform="translate(0, 180)">
      <circle cx="12" cy="12" r="10" fill="#06B6D4" fill-opacity="0.2" stroke="#22D3EE" stroke-width="1.5" />
      <text x="12" y="16" fill="#67E8F9" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" text-anchor="middle">1</text>
      <text x="32" y="10" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700">Continuous Squircle Curvature</text>
      <text x="32" y="28" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">Matches Apple's exact 22.4% superellipse geometry</text>
    </g>

    <g transform="translate(0, 245)">
      <circle cx="12" cy="12" r="10" fill="#6366F1" fill-opacity="0.2" stroke="#818CF8" stroke-width="1.5" />
      <text x="12" y="16" fill="#C7D2FE" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" text-anchor="middle">2</text>
      <text x="32" y="10" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700">Top-Edge Specular Rim</text>
      <text x="32" y="28" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">Micro-fine 1px light catch catches overhead ambient photons</text>
    </g>

    <g transform="translate(0, 310)">
      <circle cx="12" cy="12" r="10" fill="#A855F7" fill-opacity="0.2" stroke="#C084FC" stroke-width="1.5" />
      <text x="12" y="16" fill="#E9D5FF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" text-anchor="middle">3</text>
      <text x="32" y="10" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700">Instant Iconic Recognition</text>
      <text x="32" y="28" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">Bold silhouette punches through noisy wallpapers cleanly</text>
    </g>
  </g>

  <!-- Right Column: iPhone 16 Pro Mockup -->
  <g transform="translate(680, 50)" filter="url(#phoneShadow)">
    <!-- Titanium Outer Chassis -->
    <rect width="400" height="800" rx="55" fill="#1E232F" stroke="#334155" stroke-width="3" />
    <!-- Bezel -->
    <rect x="8" y="8" width="384" height="784" rx="48" fill="#000000" />
    
    <!-- Screen Area -->
    <g clip-path="url(#phoneScreenClip)">
      <clipPath id="phoneScreenClip">
        <rect x="12" y="12" width="376" height="776" rx="44" />
      </clipPath>

      <!-- Wallpaper -->
      <rect x="12" y="12" width="376" height="776" fill="url(#iosWallpaper)" />

      <!-- Status Bar -->
      <g transform="translate(36, 32)">
        <text x="0" y="0" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600">9:41</text>
        <g transform="translate(270, -10)">
          <!-- Cellular -->
          <rect x="0" y="6" width="3" height="4" fill="#FFFFFF" rx="0.5" />
          <rect x="5" y="4" width="3" height="6" fill="#FFFFFF" rx="0.5" />
          <rect x="10" y="2" width="3" height="8" fill="#FFFFFF" rx="0.5" />
          <rect x="15" y="0" width="3" height="10" fill="#FFFFFF" rx="0.5" />
          <!-- Battery -->
          <rect x="26" y="0" width="20" height="10" rx="3" fill="none" stroke="#FFFFFF" stroke-width="1" />
          <rect x="28" y="2" width="14" height="6" rx="1.5" fill="#FFFFFF" />
        </g>
      </g>

      <!-- Dynamic Island -->
      <rect x="140" y="20" width="120" height="32" rx="16" fill="#000000" />

      <!-- Date & Clock Widget -->
      <g transform="translate(42, 90)">
        <rect width="150" height="150" rx="22" fill="#FFFFFF" fill-opacity="0.08" stroke="#FFFFFF" stroke-opacity="0.1" />
        <text x="18" y="32" fill="#F43F5E" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700">SUNDAY</text>
        <text x="18" y="80" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="44" font-weight="300">1</text>
        <text x="18" y="112" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">EDM Festival Night</text>
        <text x="18" y="130" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600">Gate opens 18:00</text>
      </g>

      <!-- Weather Widget -->
      <g transform="translate(208, 90)">
        <rect width="150" height="150" rx="22" fill="#FFFFFF" fill-opacity="0.08" stroke="#FFFFFF" stroke-opacity="0.1" />
        <text x="18" y="32" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600">Phnom Penh</text>
        <text x="18" y="78" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="38" font-weight="300">28°</text>
        <text x="18" y="112" fill="#FBBF24" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">Clear night</text>
        <text x="18" y="130" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11">H:32° L:24°</text>
      </g>

      <!-- App Grid Row 1 (Argon Featured in Top Left of Apps) -->
      <g transform="translate(42, 275)">
        <!-- ARGON APP ICON -->
        <g transform="translate(0, 0)">
          <use href="#emblem-concept-1" x="0" y="0" width="64" height="64" />
          <text x="32" y="80" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Argon</text>
        </g>

        <!-- APPLE WALLET -->
        <g transform="translate(84, 0)">
          <rect width="64" height="64" rx="14" fill="#0F172A" />
          <path d="M 16 26 L 48 26 C 50 26 52 28 52 30 L 52 46 C 52 48 50 50 48 50 L 16 50 C 14 50 12 48 12 46 L 12 30 C 12 28 14 26 16 26 Z" fill="#F59E0B" opacity="0.8" />
          <path d="M 14 32 L 50 32 C 51 32 52 33 52 34 L 52 46 C 52 48 50 50 48 50 L 16 50 C 14 50 12 48 12 46 L 12 34 C 12 33 13 32 14 32 Z" fill="#3B82F6" opacity="0.9" />
          <path d="M 12 38 L 52 38 L 52 46 C 52 48 50 50 48 50 L 16 50 C 14 50 12 48 12 46 Z" fill="#10B981" />
          <text x="32" y="80" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Wallet</text>
        </g>

        <!-- PHOTOS -->
        <g transform="translate(168, 0)">
          <rect width="64" height="64" rx="14" fill="#FFFFFF" />
          <circle cx="32" cy="32" r="14" fill="#F59E0B" opacity="0.8" />
          <circle cx="26" cy="26" r="10" fill="#EF4444" opacity="0.8" />
          <circle cx="38" cy="26" r="10" fill="#3B82F6" opacity="0.8" />
          <circle cx="32" cy="38" r="10" fill="#10B981" opacity="0.8" />
          <text x="32" y="80" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Photos</text>
        </g>

        <!-- CAMERA -->
        <g transform="translate(252, 0)">
          <rect width="64" height="64" rx="14" fill="#1E293B" />
          <circle cx="32" cy="32" r="16" fill="#334155" />
          <circle cx="32" cy="32" r="10" fill="#0F172A" stroke="#64748B" stroke-width="1.5" />
          <circle cx="44" cy="22" r="2.5" fill="#F59E0B" />
          <text x="32" y="80" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Camera</text>
        </g>
      </g>

      <!-- App Grid Row 2 -->
      <g transform="translate(42, 385)">
        <!-- SHORTCUTS -->
        <g transform="translate(0, 0)">
          <rect width="64" height="64" rx="14" fill="#020617" />
          <rect x="18" y="22" width="22" height="14" rx="7" fill="#F43F5E" />
          <rect x="24" y="28" width="22" height="14" rx="7" fill="#38BDF8" />
          <text x="32" y="80" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Shortcuts</text>
        </g>

        <!-- MAPS -->
        <g transform="translate(84, 0)">
          <rect width="64" height="64" rx="14" fill="#10B981" />
          <path d="M 18 46 L 46 18 M 18 18 L 46 46" stroke="#FFFFFF" stroke-width="5" />
          <text x="32" y="80" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Maps</text>
        </g>

        <!-- NOTES -->
        <g transform="translate(168, 0)">
          <rect width="64" height="64" rx="14" fill="#FEF08A" />
          <rect x="0" y="0" width="64" height="16" fill="#FACC15" />
          <line x1="12" y1="28" x2="52" y2="28" stroke="#E2E8F0" stroke-width="1.5" />
          <line x1="12" y1="38" x2="52" y2="38" stroke="#E2E8F0" stroke-width="1.5" />
          <text x="32" y="80" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Notes</text>
        </g>

        <!-- SETTINGS -->
        <g transform="translate(252, 0)">
          <rect width="64" height="64" rx="14" fill="#64748B" />
          <circle cx="32" cy="32" r="14" fill="#475569" stroke="#94A3B8" stroke-width="3" />
          <circle cx="32" cy="32" r="6" fill="#64748B" />
          <text x="32" y="80" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="500" text-anchor="middle">Settings</text>
        </g>
      </g>

      <!-- Frosted Dock at Bottom -->
      <g transform="translate(24, 670)">
        <rect width="352" height="88" rx="34" fill="url(#dockMaterial)" stroke="#FFFFFF" stroke-opacity="0.18" />
        
        <!-- Dock Icons -->
        <g transform="translate(20, 12)">
          <!-- Phone -->
          <rect x="0" y="0" width="64" height="64" rx="14" fill="#22C55E" />
          <path d="M 24 20 C 22 20 20 22 20 24 C 20 34 28 42 38 42 C 40 42 42 40 42 38 L 38 32 L 32 34 L 28 30 L 30 24 Z" fill="#FFFFFF" />
          <!-- Safari -->
          <rect x="80" y="0" width="64" height="64" rx="14" fill="#FFFFFF" />
          <circle cx="112" cy="32" r="20" fill="#0284C7" />
          <polygon points="112,18 116,32 112,46 108,32" fill="#EF4444" />
          <!-- Messages -->
          <rect x="160" y="0" width="64" height="64" rx="14" fill="#22C55E" />
          <path d="M 174 26 C 174 20 184 16 192 16 C 200 16 210 20 210 26 C 210 32 200 36 192 36 L 184 40 L 186 36 C 178 34 174 30 174 26 Z" fill="#FFFFFF" />
          <!-- Music -->
          <rect x="240" y="0" width="64" height="64" rx="14" fill="#F43F5E" />
          <path d="M 258 38 C 258 40 256 42 254 42 C 252 42 250 40 250 38 C 250 36 252 34 254 34 L 258 34 L 258 24 L 272 20 L 272 34 C 272 36 270 38 268 38 C 266 38 264 36 264 34 L 268 34 L 268 26 L 258 28 Z" fill="#FFFFFF" />
        </g>
      </g>

      <!-- Home Indicator Bar -->
      <rect x="135" y="774" width="130" height="5" rx="2.5" fill="#FFFFFF" opacity="0.8" />
    </g>
  </g>
</svg>'''

def main():
    base_dir = "apps/web/public/brand/concepts_apple"
    os.makedirs(base_dir, exist_ok=True)

    with open(f"{base_dir}/appstore-spotlight.svg", "w") as f:
        f.write(generate_spotlight())

    with open(f"{base_dir}/iphone-homescreen.svg", "w") as f:
        f.write(generate_iphone_mockup())

    print("Spotlight and iPhone Home Screen SVGs successfully created.")

if __name__ == "__main__":
    main()
