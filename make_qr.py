#!/usr/bin/env python3
# vocab-pwa 二维码 · 美观版
# 配色取自项目主题色 #059669（emerald-600），中心 logo 用 PWA 自带 icon-maskable-512
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer, CircleModuleDrawer
from qrcode.image.styles.colormasks import VerticalGradiantColorMask, RadialGradiantColorMask
from PIL import Image, ImageDraw, ImageFont

URL = "https://vocab-daily-36791.app.workbuddy.host/"
OUT = "/Users/zoujiean/WorkBuddy/2026-09-28-09-41-26/vocab-pwa-二维码.png"
ICON = "/Users/zoujiean/CodeX/vocab-pwa/public/icons/icon-maskable-512.png"

GREEN_DEEP = (4, 78, 60)      # #064e3b 深绿
GREEN_MID = (5, 150, 105)     # #059669 主题绿
GREEN_LIGHT = (16, 185, 129)  # #10b981 亮绿
WHITE = (255, 255, 255)
INK = (24, 32, 30)
GREY = (138, 148, 145)

# ---------- 二维码主体 ----------
qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H,
                   box_size=16, border=2)
qr.add_data(URL)
qr.make(fit=True)

img = qr.make_image(
    image_factory=StyledPilImage,
    module_drawer=RoundedModuleDrawer(radius_ratio=0.5),
    eye_drawer=RoundedModuleDrawer(radius_ratio=1.0),
    color_mask=VerticalGradiantColorMask(
        back_color=WHITE, top_color=GREEN_DEEP, bottom_color=GREEN_LIGHT),
).convert("RGB")

QW, QH = img.size

# ---------- 中心 logo：白色圆角托盘 + 图标 ----------
logo_box = int(QW * 0.215)                 # logo 占宽约 21.5%，配合 H 级纠错安全
tray = int(logo_box * 1.16)                # 白托盘比 logo 大一圈
tray_img = Image.new("RGB", (tray, tray), WHITE)
mask = Image.new("L", (tray * 4, tray * 4), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, tray * 4 - 1, tray * 4 - 1),
                                       radius=int(tray * 4 * 0.26), fill=255)
mask = mask.resize((tray, tray), Image.LANCZOS)

icon = Image.open(ICON).convert("RGB").resize((logo_box, logo_box), Image.LANCZOS)
# 图标自身是圆角绿底白书，直接居中贴
tray_img.paste(icon, ((tray - logo_box) // 2, (tray - logo_box) // 2))

offset = ((QW - tray) // 2, (QH - tray) // 2)
img.paste(tray_img, offset, mask)

# ---------- 画布：白底卡片 + 文字区 ----------
PAD = 56
TOP = 34
BAND = 154
CW = QW + PAD * 2
CH = TOP + QH + BAND + PAD
canvas = Image.new("RGB", (CW, CH), WHITE)
canvas.paste(img, (PAD, TOP))
d = ImageDraw.Draw(canvas)


def load_font(size, bold=False):
    for p in ("/System/Library/Fonts/PingFang.ttc",
              "/System/Library/Fonts/Hiragino Sans GB.ttc",
              "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(p, size, index=(2 if bold and p.endswith(".ttc") else 0))
        except Exception:
            continue
    return ImageFont.load_default()


f_title = load_font(46, bold=True)
f_sub = load_font(26)


def center(text, font, y, fill):
    w = d.textlength(text, font=font)
    d.text(((CW - w) / 2, y), text, font=font, fill=fill)


y = TOP + QH + 34
center("背单词 · 每日强化", f_title, y, INK)
y += 64
center("手机扫码直接打开", f_sub, y, GREY)

canvas.save(OUT, "PNG", optimize=True)
print("saved:", OUT, canvas.size)
