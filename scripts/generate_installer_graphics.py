import os
from PIL import Image, ImageDraw, ImageFont

base_dir = r"f:\projects\Atlas\apps\editor\build"
logo_path = r"C:\Users\HP\.gemini\antigravity-ide\brain\4da5fce4-6a4e-4ec7-83b2-99d83b4c2421\media__1784371131300.png"

os.makedirs(base_dir, exist_ok=True)

# 1. Generate crisp high-DPI Multi-size ICO file
img = Image.open(logo_path).convert("RGBA")
icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
img.save(os.path.join(base_dir, "icon.ico"), format="ICO", sizes=icon_sizes)
print("[PASS] Generated icon.ico")

# 2. Generate installerHeader.png (150x57 px)
header_w, header_h = 150, 57
header_bg = Image.new("RGBA", (header_w, header_h), (22, 22, 30, 255))

# Paste small logo on right
logo_small = img.resize((42, 42), Image.Resampling.LANCZOS)
header_bg.paste(logo_small, (header_w - 48, (header_h - 42) // 2), logo_small)

header_bg.convert("RGB").save(os.path.join(base_dir, "installerHeader.bmp"), format="BMP")
header_bg.save(os.path.join(base_dir, "installerHeader.png"))
print("[PASS] Generated installerHeader.png & BMP")

# 3. Generate installerSidebar.png (164x314 px)
sidebar_w, sidebar_h = 164, 314
sidebar_bg = Image.new("RGBA", (sidebar_w, sidebar_h), (22, 22, 30, 255))

# Paste large centered logo
logo_large = img.resize((120, 120), Image.Resampling.LANCZOS)
sidebar_bg.paste(logo_large, ((sidebar_w - 120) // 2, 40), logo_large)

sidebar_bg.convert("RGB").save(os.path.join(base_dir, "installerSidebar.bmp"), format="BMP")
sidebar_bg.save(os.path.join(base_dir, "installerSidebar.png"))
print("[PASS] Generated installerSidebar.png & BMP")
