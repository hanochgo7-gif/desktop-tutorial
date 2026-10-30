"""קרודו הנדסה · הכנת תמונות: צילום, אייקונים, לוגו האיגוד. מריצים פעם אחת, עם נתיב לקבצי המקור."""
import sys, os
from PIL import Image
SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets', 'img')

# צילום: צל אורנים, קריית טבעון (Jakednb, CC BY 4.0, ויקישיתוף)
im = Image.open(os.path.join(SRC, 'found', 'kiryat-tivon-oranim.jpg')).convert('RGB')
for w in (900, 1600, 1920):
    r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    r.save(os.path.join(A, 'photo', f'tivon-oranim-{w}.webp'), 'WEBP', quality=74, method=6)

# הסימן מהלוגו (קובץ המקור הגדול) על רקע הפטרול: אייקונים
mark = Image.open(os.path.join(SRC, 'media', '2b2704_3ae92fbe168540769df35add4d629954~mv2.png')).convert('RGBA')
def icon(size, pad, bg=(3, 32, 45, 255)):
    c = Image.new('RGBA', (size, size), bg)
    h = size - 2 * pad
    w = round(mark.width * h / mark.height)
    m = mark.resize((w, h), Image.LANCZOS)
    c.alpha_composite(m, ((size - w) // 2, pad))
    return c
icon(180, 22).convert('RGB').save(os.path.join(A, 'brand', 'apple-touch-icon.png'), optimize=True)
icon(32, 2, (0, 0, 0, 0)).save(os.path.join(A, 'brand', 'favicon-32.png'), optimize=True)
icon(512, 64).convert('RGB').save(os.path.join(A, 'brand', 'icon-512.png'), optimize=True)

# לוגו איגוד המהנדסים (מהאתר הקודם)
asc = Image.open(os.path.join(SRC, 'media', '2b2704_cb3aad77eac2418ba887bbe11e6acba7~mv2.png')).convert('RGBA')
bgw = Image.new('RGBA', asc.size, (255, 255, 255, 255)); bgw.alpha_composite(asc)
bgw = bgw.convert('RGB').resize((336, round(asc.height * 336 / asc.width)), Image.LANCZOS)
bgw.save(os.path.join(A, 'brand', 'engineers-association.png'), optimize=True)
print('ok', bgw.size)
