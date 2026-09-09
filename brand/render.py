import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


def render(svg: Path, out: Path, size, bg: str | None = None):
    """Render an SVG to a square PNG at the given pixel size."""
    svg = svg.resolve()
    out = out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    raw = svg.read_text(encoding="utf-8")
    if isinstance(size, int):
        width = height = size
    else:
        text = str(size).lower()
        if "x" in text:
            a, b = text.split("x")
            width, height = int(a), int(b)
        else:
            width = height = int(text)
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="msedge", headless=True)
        except Exception:
            browser = p.chromium.launch(
                headless=True,
                executable_path=r"C:\Users\ljh\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe",
            )
        page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
        html = (
            "<!doctype html><html><head><meta charset='utf-8'>"
            "<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}"
            "svg{width:100%!important;height:100%!important;display:block}</style>"
            "</head><body>" + raw + "</body></html>"
        )
        page.set_content(html, wait_until="load")
        page.wait_for_timeout(120)
        page.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": width, "height": height})
        browser.close()


if __name__ == "__main__":
    render(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3])
