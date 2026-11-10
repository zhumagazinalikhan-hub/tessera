"""Year-in-dots lock screen wallpapers, one PNG per day.

Writes <out>/wallpaper/YYYY-MM-DD.png for every day of the given years.
An iPhone Shortcut downloads today's file each morning and sets it as the
lock screen. Usage: python3 scripts/wallpapers.py dist 2026 2027
"""
import calendar
import datetime as dt
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "fonts", "Inter-Medium.otf")
FONT_BOLD = os.path.join(HERE, "fonts", "Inter-SemiBold.otf")

W, H = 1290, 2796  # iPhone Pro Max; iOS scales it for other models
BG = (0, 0, 0)
PAST = (232, 230, 234)
FUTURE = (46, 44, 48)
TODAY = (224, 74, 104)  # Tessera crimson
LABEL = (200, 196, 202)
MUTED = (120, 116, 122)

DOT = 21  # dot diameter
STEP = 41  # distance between dot centres
COL_X = [140, 505, 870]  # left edge of each month column
ROW_Y = [690, 1093, 1496, 1899]  # top of each month label (leaves room for the clock)


def render(day: dt.date, path: str) -> None:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    f_label = ImageFont.truetype(FONT, 31)
    f_big = ImageFont.truetype(FONT_BOLD, 40)

    for m in range(1, 13):
        r, c = divmod(m - 1, 3)
        x0, y0 = COL_X[c], ROW_Y[r]
        d.text((x0 - 4, y0), calendar.month_abbr[m], font=f_label, fill=LABEL)
        first_wd = dt.date(day.year, m, 1).weekday()  # Monday = 0
        days = calendar.monthrange(day.year, m)[1]
        for n in range(1, days + 1):
            slot = first_wd + n - 1
            row, col = divmod(slot, 7)
            cx = x0 + col * STEP + DOT // 2
            cy = y0 + 70 + row * STEP + DOT // 2
            this = dt.date(day.year, m, n)
            if this == day:
                fill, rad = TODAY, DOT // 2 + 3
            elif this < day:
                fill, rad = PAST, DOT // 2
            else:
                fill, rad = FUTURE, DOT // 2
            d.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), fill=fill)

    # "51 days left · 86%" under the grid, above the flashlight/camera row.
    year_days = 366 if calendar.isleap(day.year) else 365
    done = day.timetuple().tm_yday
    left = year_days - done
    pct = round(done / year_days * 100)
    a = f"{left} {'day' if left == 1 else 'days'} left"
    b = f"  ·  {pct}%"
    wa = d.textlength(a, font=f_big)
    wb = d.textlength(b, font=f_big)
    x = (W - wa - wb) / 2
    y = 2380
    d.text((x, y), a, font=f_big, fill=TODAY)
    d.text((x + wa, y), b, font=f_big, fill=MUTED)

    img.save(path, optimize=True)


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 else "dist"
    years = [int(y) for y in sys.argv[2:]] or [dt.date.today().year, dt.date.today().year + 1]
    folder = os.path.join(out, "wallpaper")
    os.makedirs(folder, exist_ok=True)
    count = 0
    for y in years:
        day = dt.date(y, 1, 1)
        while day.year == y:
            render(day, os.path.join(folder, f"{day.isoformat()}.png"))
            day += dt.timedelta(days=1)
            count += 1
    print(f"wrote {count} wallpapers to {folder}")


if __name__ == "__main__":
    main()
