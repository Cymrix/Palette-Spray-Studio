import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('new_paint.js', 'r', encoding='utf-8') as f:
    new_paint = f.read()

with open('new_height.js', 'r', encoding='utf-8') as f:
    new_height = f.read()

# We need to replace exactly paintNoBlend and paintCombineSameColor.
# They are between "let noBlendScratchCanvas = null" and "function paintEraserDab".

pattern1 = re.compile(r'let noBlendScratchCanvas = null.*?function paintEraserDab', re.DOTALL)
replacement1 = new_paint + '\n  function paintEraserDab'
html = pattern1.sub(replacement1, html, count=1)

# Replace withHeightMask
pattern2 = re.compile(r'function withHeightMask\(bx, by, bw, bh, paintFn\)\{.*?layerCtx\.putImageData\(afterImg, bx, by\);\n  \}', re.DOTALL)
html = pattern2.sub(new_height, html, count=1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done!")
