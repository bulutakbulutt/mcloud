"""Measures a glass capture (GlassLab layout: 40pt margin, 700x54 bar, 2x pixels).

  analyze.py <dir> [prefix]   reads <dir>/<prefix>grays.png, line.png, black.png, white.png, gray-128.png, vstripes.png, hstripes.png
"""
import sys, zlib, struct, os

S = 2  # pixels per point
M, W, H = 40, 700, 54


def load(path):
    d = open(path, 'rb').read(); i = 8; idat = b''
    while i < len(d):
        l = struct.unpack('>I', d[i:i + 4])[0]; t = d[i + 4:i + 8]; c = d[i + 8:i + 8 + l]
        if t == b'IHDR': w, h, bd, ct = struct.unpack('>IIBB', c[:10])
        if t == b'IDAT': idat += c
        i += 12 + l
    raw = zlib.decompress(idat); bpp = 4 if ct == 6 else 3; stride = w * bpp; rows = []; prev = bytearray(stride); p = 0
    for r in range(h):
        f = raw[p]; line = bytearray(raw[p + 1:p + 1 + stride]); p += 1 + stride
        for j in range(stride):
            a = line[j - bpp] if j >= bpp else 0; b = prev[j]; c = prev[j - bpp] if j >= bpp else 0
            if f == 1: line[j] = (line[j] + a) & 255
            elif f == 2: line[j] = (line[j] + b) & 255
            elif f == 3: line[j] = (line[j] + (a + b) // 2) & 255
            elif f == 4:
                pp = a + b - c; pa = abs(pp - a); pb = abs(pp - b); pc = abs(pp - c)
                line[j] = (line[j] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return lambda x, y: tuple(rows[int(round(y * S))][int(round(x * S)) * bpp:int(round(x * S)) * bpp + 3])


def lum(c): return round(.2126 * c[0] + .7152 * c[1] + .0722 * c[2], 1)


d = sys.argv[1]; pre = sys.argv[2] if len(sys.argv) > 2 else ''
f = lambda n: os.path.join(d, pre + n + '.png')
cy = M + H / 2; cx = M + W / 2

if os.path.exists(f('grays')):
    px = load(f('grays'))
    out = []
    for i in range(11):
        x = M + (i + .5) * W / 11
        out.append((round(i / 10 * 255), lum(px(x, M - 20)), lum(px(x, cy))))
    print('tone curve (input, outside, inside centre):', out)

for name in ('black', 'gray-128', 'white'):
    if not os.path.exists(f(name)): continue
    px = load(f(name))
    vert = [lum(px(cx, M + y)) for y in (0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 18, 27, 36, 42, 46, 48, 50, 51, 52, 52.5, 53, 53.5)]
    horiz = [lum(px(M + x, cy)) for x in (0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 18, 27, 40, 100)]
    print(f'{name}: centre {px(cx, cy)} | column at centre, y=0.5..53.5 from top: {vert} | row at centre from left cap x=0.5..100: {horiz}')

if os.path.exists(f('line')):
    px = load(f('line'))
    # Horizontal spread of the 2pt vertical line at the bar's centre row, and vertical spread of the horizontal line.
    row = [(round(x - cx, 1), lum(px(x, cy - 12))) for x in [cx + k / 2 for k in range(-60, 61)]]
    col = [(round(y - cy, 1), lum(px(cx - 150, y))) for y in [cy + k / 2 for k in range(-26, 27)]]
    def width(prof):
        vals = [v for _, v in prof]; lo = min(vals); hi = max(vals); half = lo + (hi - lo) / 2
        above = [p for p, v in prof if v >= half]
        return (min(above), max(above), round(max(above) - min(above), 1), lo, hi) if above else None
    print('line: horizontal FWHM (from, to, width, lo, hi) =', width(row), '| vertical FWHM =', width(col))
    print('line row profile:', [v for _, v in row[::4]])

def centroids(px, axis, pos, start, end, period, lo_ref):
    out = []
    k = 0
    while True:
        c0 = start + k * period
        if c0 > end: break
        s = ws = 0
        for q in range(int((c0 - period / 2) * S), int((c0 + period / 2) * S)):
            p = q / S
            v = lum(px(p, pos) if axis == 'x' else px(pos, p)) - lo_ref
            if v > 0: s += v * p; ws += v
        out.append((c0, round(s / ws - c0, 2) if ws else None))
        k += 1
    return out

if os.path.exists(f('vstripes')):
    px = load(f('vstripes'))
    for y in (M + 2, M + 5, M + 10, cy):
        lo = min(lum(px(M + x, y)) for x in range(5, 695))
        c = centroids(px, 'x', y, M + 1, M + W - 1, 20, lo)
        print(f'vstripes y={y - M:.0f}pt: stripe shift (expected x from bar left: shift) ', [(round(a - M), b) for a, b in c if b is not None and (a - M < 70 or a - M > W - 70 or abs(a - cx) < 25)])

if os.path.exists(f('hstripes')):
    px = load(f('hstripes'))
    for x in (cx, M + 8, M + 16):
        lo = min(lum(px(x, M + y)) for y in range(2, 52))
        c = centroids(px, 'y', x, M + 1, M + H - 1, 10, lo)
        print(f'hstripes x={x - M:.0f}pt: stripe shift (expected y from bar top: shift)', [(round(a - M), b) for a, b in c])
