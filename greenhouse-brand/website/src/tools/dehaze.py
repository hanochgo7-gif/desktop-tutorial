import cv2, numpy as np, sys
src, out = sys.argv[1], sys.argv[2]
I = cv2.imread(src).astype(np.float32)/255
H, W = I.shape[:2]
# haze colour: bright, low-saturation pixels in the top band
top = I[:int(H*.06)].reshape(-1,3)
A = np.percentile(top, 90, axis=0)
y = np.linspace(0,1,H)[:,None]
# haze is strongest at the horizon and fades to none by ~62% of the height (the net houses and the road stay as shot)
m = np.clip((0.62 - y)/0.62, 0, 1)**0.8
t = 1 - 0.42*m          # transmission: 0.5 at the top edge, 1 from 62% down
J = (I - A)/t[...,None] + A
J = np.clip(J, 0, 1)
# local contrast on lightness, weighted by the same mask
lab = cv2.cvtColor((J*255).astype(np.uint8), cv2.COLOR_BGR2LAB)
L = lab[...,0]
Lc = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8,8)).apply(L)
w = (0.25 + 0.6*m)                       # a light touch everywhere, more in the distance
lab[...,0] = np.clip(L*(1-w[:, :1].squeeze()[:,None]) + Lc*w[:, :1].squeeze()[:,None], 0, 255).astype(np.uint8)
J = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR).astype(np.float32)/255
# gentle unsharp mask
b = cv2.GaussianBlur(J, (0,0), 1.4)
J = np.clip(J + 0.45*(J-b), 0, 1)
cv2.imwrite(out, (J*255).round().astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
