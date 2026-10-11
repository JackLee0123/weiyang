"""Obsidian Markdown → 富文本 HTML 渲染。

用 mistune 渲染（GFM 表格/删除线），再用 bleach 白名单消毒，
防 XSS 的同时保留笔记常用排版。对 Obsidian 特有语法做轻量转换：
- [[wikilink]] / [[page|别名]] → 普通内联文本
- ![[image.png]] → 占位说明（附件暂不上传）
- #标签 → 保留原样（# 在标题行按标题解析）
"""

from __future__ import annotations

import re

import bleach
import bleach.css_sanitizer
import mistune

_ALLOWED_TAGS = [
    "a", "p", "br", "hr", "pre", "code", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "dl", "dt", "dd",
    "table", "thead", "tbody", "tr", "th", "td",
    "strong", "em", "del", "s", "b", "i", "u", "mark", "sub", "sup",
    "img", "figure", "figcaption", "span", "div", "input",
]
_ALLOWED_ATTRS = {
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title", "width", "height"],
    "code": ["class"],
    "pre": ["class"],
    "span": ["class"],
    "div": ["class"],
    "input": ["type", "checked", "disabled"],
    "th": ["align"],
    "td": ["align"],
}
_ALLOWED_PROTOCOLS = ["http", "https", "mailto"]

_WIKILINK_RE = re.compile(r"!?\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]")


def _convert_wikilinks(md: str) -> str:
    """[[页面|别名]] → 别名；[[页面]] → 页面；![[嵌入]] → 加粗占位文本。"""

    def repl(match: re.Match[str]) -> str:
        target = match.group(1).strip()
        alias = (match.group(2) or "").strip()
        label = alias or target
        if match.group(0).startswith("!"):
            # 嵌入附件：图片给占位，其他给名称
            if re.search(r"\.(png|jpe?g|gif|webp|svg)$", target, re.I):
                return f"*{target}（附件未上传）*"
            return f"**{label}**"
        return label

    return _WIKILINK_RE.sub(repl, md)


def render_markdown(md: str) -> str:
    html = mistune.create_markdown(
        plugins=["strikethrough", "table", "task_lists"],
    )(_convert_wikilinks(md))
    return bleach.clean(
        html,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        protocols=_ALLOWED_PROTOCOLS,
        css_sanitizer=bleach.css_sanitizer.CSSSanitizer(),
        strip=True,
    )
