"""QR code to the website for the printable company profile (public/assets/qr-site.svg)."""
import re
from pathlib import Path
from reportlab.graphics import renderSVG
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors

W = Path(__file__).resolve().parents[2]
w = qr.QrCodeWidget("https://www.miftah.co.il/")
w.barFillColor = colors.HexColor("#0E4239"); w.barStrokeColor = colors.HexColor("#0E4239")
x0, y0, x1, y1 = w.getBounds()
d = Drawing(120, 120, transform=[120 / (x1 - x0), 0, 0, 120 / (y1 - y0), 0, 0]); d.add(w)
out = W / "src/assets/icons/qr-site.svg"
renderSVG.drawToFile(d, str(out))
out.write_text(re.sub(r"<!DOCTYPE[^>]*>\s*", "", out.read_text()))  # no DTD: plain SVG
print("qr ok")
