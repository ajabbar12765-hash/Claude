"""Generate Scam Shield app icons: a glossy 3D gradient shield with a check.

Produces static/apple-touch-icon.png (180) and static/favicon.png (32).
Run: python3 make_icons.py
"""
from PIL import Image, ImageDraw, ImageFilter

SS = 4  # supersample factor for smooth edges


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def build(size):
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Rounded-square background with a diagonal gradient (indigo -> blue -> cyan).
    c0 = (108, 74, 247)   # indigo
    c1 = (79, 142, 247)   # blue
    c2 = (56, 205, 209)   # teal
    grad = Image.new("RGB", (S, S))
    gp = grad.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2 * S)
            col = lerp(c0, c1, t * 2) if t < 0.5 else lerp(c1, c2, (t - 0.5) * 2)
            gp[x, y] = col
    radius = int(S * 0.235)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius, fill=255)
    img.paste(grad, (0, 0), mask)

    # Soft top gloss highlight.
    gloss = Image.new("L", (S, S), 0)
    ImageDraw.Draw(gloss).ellipse(
        [-S * 0.25, -S * 0.75, S * 1.25, S * 0.55], fill=90)
    gloss = gloss.filter(ImageFilter.GaussianBlur(S * 0.05))
    gloss = Image.composite(gloss, Image.new("L", (S, S), 0), mask)
    white = Image.new("RGBA", (S, S), (255, 255, 255, 255))
    img = Image.alpha_composite(img, Image.merge(
        "RGBA", (*white.split()[:3], gloss)))

    d = ImageDraw.Draw(img)

    # Shield outline (rounded top, pointed bottom), centered.
    cx = S / 2
    top = S * 0.20
    bot = S * 0.82
    halfw = S * 0.235
    shoulder = S * 0.40
    shield = [
        (cx, top),
        (cx + halfw, top + S * 0.055),
        (cx + halfw, shoulder),
        (cx, bot),
        (cx - halfw, shoulder),
        (cx - halfw, top + S * 0.055),
    ]
    # Drop shadow for depth.
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).polygon(
        [(x, y + S * 0.02) for x, y in shield], fill=(20, 24, 40, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(S * 0.02))
    img = Image.alpha_composite(img, sh)
    d = ImageDraw.Draw(img)

    d.polygon(shield, fill=(255, 255, 255, 255))
    # Inner tint so the check reads, plus a faux-3D left/right shade.
    inner = [
        (cx, top + S * 0.045),
        (cx + halfw * 0.82, top + S * 0.085),
        (cx + halfw * 0.82, shoulder - S * 0.01),
        (cx, bot - S * 0.05),
        (cx - halfw * 0.82, shoulder - S * 0.01),
        (cx - halfw * 0.82, top + S * 0.085),
    ]
    d.polygon(inner, fill=(238, 244, 255, 255))

    # Bold gradient check mark.
    lw = int(S * 0.075)
    p1 = (cx - S * 0.115, S * 0.505)
    p2 = (cx - S * 0.02, S * 0.60)
    p3 = (cx + S * 0.145, S * 0.40)
    check = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cd = ImageDraw.Draw(check)
    cd.line([p1, p2, p3], fill=(79, 142, 247, 255), width=lw, joint="curve")
    for pt in (p1, p2, p3):
        cd.ellipse([pt[0] - lw / 2, pt[1] - lw / 2,
                    pt[0] + lw / 2, pt[1] + lw / 2], fill=(79, 142, 247, 255))
    # Tint the check with the brand gradient.
    cg = Image.new("RGB", (S, S))
    cgp = cg.load()
    for y in range(S):
        for x in range(S):
            cgp[x, y] = lerp((99, 102, 241), (56, 205, 209), x / S)
    img = Image.alpha_composite(
        img, Image.merge("RGBA", (*cg.split(), check.split()[3])))

    return img.resize((size, size), Image.LANCZOS)


build(180).save("static/apple-touch-icon.png")
build(512).save("static/icon-512.png")
build(32).save("static/favicon.png")
print("icons written")
