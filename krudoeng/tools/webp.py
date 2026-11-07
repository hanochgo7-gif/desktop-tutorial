"""ממיר את תמונת השיתוף ש-render.cjs צילם ל-JPEG."""
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
f = os.path.join(HERE, 'out', 'og.png')
Image.open(f).convert('RGB').save(os.path.join(ROOT, 'assets', 'img', 'og.jpg'), 'JPEG', quality=84, optimize=True, progressive=True)
os.remove(f)
print('ok')
