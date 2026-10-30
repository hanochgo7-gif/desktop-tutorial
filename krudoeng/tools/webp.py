"""ממיר את התמונות ש-render.mjs צילם ל-WebP (ותמונת השיתוף ל-JPEG)."""
import os, glob
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
for f in glob.glob(os.path.join(HERE, 'out', '*.png')):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert('RGB')
    if name == 'og':
        im.save(os.path.join(ROOT, 'assets', 'img', 'og.jpg'), 'JPEG', quality=84, optimize=True, progressive=True)
    else:
        im.save(os.path.join(ROOT, 'assets', 'img', 'scene', name + '.webp'), 'WEBP', quality=78, method=6)
    os.remove(f)
print('ok')
