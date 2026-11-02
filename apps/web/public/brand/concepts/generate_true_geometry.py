#!/usr/bin/env python3
"""
generate_true_geometry.py – Generates 3 pristine, true single-color marks.
Zero white knockouts. True negative space. Production ready.
"""

def make_concept_a():
    """
    Concept A: 'The Interlocking Apex' (Monogram A)
    Constructed as two solid black polygons separated by an angled 16px negative-space channel.
    Polygon 1: Rising left pylon that terminates at the apex.
    Polygon 2: Descending right pylon with integrated horizontal cross-beam.
    """
    # Canvas 256x256. Center (128, 128).
    # Left pylon:
    # Starts at base (36, 220), goes to top (120, 32), cut at top to (136, 32),
    # down inner edge to (76, 220), closed.
    # Gap is 14px running at 63.43° slope (2:1).
    
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Argon — Concept A: Interlocking Apex</title>
  <!-- Left Ascending Pylon -->
  <path fill="#000000" d="
    M 120 32
    L 36 220
    L 88 220
    L 136 112
    L 136 32
    Z
  "/>
  <!-- Right Descending Pylon & Integrated Gate Crossbar -->
  <path fill="#000000" d="
    M 148 32
    L 148 134
    L 106 134
    L 94 162
    L 172 162
    L 146 220
    L 220 220
    L 148 32
    Z
  "/>
</svg>'''
    return svg

def make_concept_b():
    """
    Concept B: 'The Octet Turnstile' (Rotational Portal)
    Argon atomic noble shell (8-node symmetry).
    Four interlocking stepped brackets creating an architectural turnstile gateway.
    True negative space. Centered at (128, 128).
    """
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Argon — Concept B: Octet Turnstile</title>
  <g fill="#000000">
    <!-- Top Wing -->
    <path d="M 68 36 L 156 36 L 156 68 L 104 68 L 104 104 L 68 104 Z"/>
    <!-- Right Wing -->
    <path d="M 220 68 L 220 156 L 188 156 L 188 104 L 152 104 L 152 68 Z"/>
    <!-- Bottom Wing -->
    <path d="M 188 220 L 100 220 L 100 188 L 152 188 L 152 152 L 188 152 Z"/>
    <!-- Left Wing -->
    <path d="M 36 188 L 36 100 L 68 100 L 68 152 L 104 152 L 104 188 Z"/>
    <!-- Central Kinetic Diamond Core -->
    <polygon points="128,110 146,128 128,146 110,128"/>
  </g>
</svg>'''
    return svg

def make_concept_c():
    """
    Concept C: 'The Verified Ticket Delta' (Admission Seal)
    Combines the silhouette of an event admission pass (with circular verification notches)
    and an internal bold upward arrow/letter A using a true evenodd negative space path.
    """
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Argon — Concept C: Verified Ticket Delta</title>
  <path fill="#000000" fill-rule="evenodd" d="
    M 56 36
    L 200 36
    A 24 24 0 0 1 224 60
    L 224 104
    A 24 24 0 0 0 224 152
    L 224 196
    A 24 24 0 0 1 200 220
    L 56 220
    A 24 24 0 0 1 32 196
    L 32 152
    A 24 24 0 0 0 32 104
    L 32 60
    A 24 24 0 0 1 56 36
    Z
    M 128 64
    L 184 184
    L 148 184
    L 138 160
    L 118 160
    L 108 184
    L 72 184
    Z
    M 128 104
    L 122 136
    L 134 136
    Z
  "/>
</svg>'''
    return svg

if __name__ == '__main__':
    import os
    os.chdir('apps/web/public/brand/concepts')
    with open('concept-a.svg', 'w') as f:
        f.write(make_concept_a())
    with open('concept-b.svg', 'w') as f:
        f.write(make_concept_b())
    with open('concept-c.svg', 'w') as f:
        f.write(make_concept_c())
    print("Concepts regenerated with zero white knockouts.")
