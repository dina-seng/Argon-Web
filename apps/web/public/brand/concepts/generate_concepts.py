#!/usr/bin/env python3
"""
generate_concepts.py – Generates 3 mathematically rigorous SVG logo concepts for Argon.
Canvas: 256x256, pure monochrome geometry, zero text elements.
"""

import math

def concept_a_apex():
    """
    Concept 1: The Argon Apex (Kinetic Interlocking Monogram)
    Two bold interlocking faceted pylons forming an unmistakable 'A'
    with an internal portal aperture and high optical stability.
    """
    # Outer triangle bounds: Top (128, 32), Left (40, 220), Right (216, 220)
    # Pylon 1 (Left beam rising and folding):
    # Pylon 2 (Right beam anchored with crossing portal):
    # Designed as clean single solid path with evenodd rule or two interlocking planar solids
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <!-- Concept 1: The Argon Apex (Interlocking Kinetic Monogram) -->
  <path fill="#0F172A" fill-rule="evenodd" d="
    M 128,28
    L 224,220
    L 172,220
    L 146,168
    L 110,168
    L 84,220
    L 32,220
    Z
    M 128,88
    L 141,136
    L 115,136
    Z
  "/>
  <!-- Kinetic Electric Plasma Shear -->
  <polygon points="128,28 144,28 174,88 158,88" fill="#FF5B22"/>
  <polygon points="146,168 188,168 204,200 162,200" fill="#FF5B22"/>
</svg>'''
    return svg

def concept_a_apex_monochrome():
    """Pure black version for audit & scale verification"""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <path fill="#000000" fill-rule="evenodd" d="
    M 128,28
    L 224,220
    L 168,220
    L 146,172
    L 110,172
    L 88,220
    L 32,220
    Z
    M 128,84
    L 142,138
    L 114,138
    Z
  "/>
  <!-- Razor Notch Separation that gives it an engineered, proprietary silhouette -->
  <polygon points="128,28 140,28 116,84 104,84" fill="#FFFFFF"/>
</svg>'''
    return svg

def concept_b_portal_monochrome():
    """
    Concept 2: The Noble Octet Gateway
    Argon has atomic number 18 and a complete 8-electron outer shell.
    A modern geometric octagonal portal constructed of 4 interlocking L-brackets
    framing a central gateway.
    """
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <!-- 4 Stepped Symmetrical Brackets creating an octagonal vortex gateway -->
  <g fill="#000000">
    <!-- Top-Left Segment -->
    <path d="M 80,32 L 140,32 L 140,68 L 100,68 L 100,108 L 64,108 L 64,48 Z"/>
    <!-- Top-Right Segment -->
    <path d="M 224,80 L 224,140 L 188,140 L 188,100 L 148,100 L 148,64 L 208,64 Z"/>
    <!-- Bottom-Right Segment -->
    <path d="M 176,224 L 116,224 L 116,188 L 156,188 L 156,148 L 192,148 L 192,208 Z"/>
    <!-- Bottom-Left Segment -->
    <path d="M 32,176 L 32,116 L 68,116 L 68,156 L 108,156 L 108,192 L 48,192 Z"/>
  </g>
</svg>'''
    return svg

def concept_c_ticket_crest_monochrome():
    """
    Concept 3: The Verification Shield (Notched Hexa-Pass)
    A ticket silhouette intersected with an upward delta chevron.
    Directly anchors to event admission + cryptographic HMAC integrity.
    """
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <path fill="#000000" fill-rule="evenodd" d="
    M 64,36
    L 192,36
    C 192,54 206,68 224,68
    L 224,188
    C 206,188 192,202 192,220
    L 64,220
    C 64,202 50,188 32,188
    L 32,68
    C 50,68 64,54 64,36
    Z
    M 128,72
    L 176,176
    L 146,176
    L 136,152
    L 120,152
    L 110,176
    L 80,176
    Z
    M 128,112
    L 123,132
    L 133,132
    Z
  "/>
</svg>'''
    return svg

if __name__ == '__main__':
    with open('concept-a.svg', 'w') as f:
        f.write(concept_a_apex_monochrome())
    with open('concept-b.svg', 'w') as f:
        f.write(concept_b_portal_monochrome())
    with open('concept-c.svg', 'w') as f:
        f.write(concept_c_ticket_crest_monochrome())
    print("Concepts written.")
