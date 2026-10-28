"""Inline the homepage subset of styles.css. Run after changing shared styles or home markup.

This extractor supports the simple style rules and nested @media blocks used here.
Dynamic homepage classes are explicitly retained below.
"""
from pathlib import Path
import re
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parent.parent
PAGES = [ROOT / 'index.html', ROOT / 'en/index.html']

class Names(HTMLParser):
    def __init__(self):
        super().__init__()
        self.classes = {'dark', 'sketch-frame'}
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.classes.update(attrs.get('class', '').split())
        if 'id' in attrs:
            self.ids.add(attrs['id'])

def subset(css, names):
    result = []
    position = 0
    while position < len(css):
        opening = css.find('{', position)
        if opening < 0:
            break
        selector = css[position:opening].strip()
        depth, end = 1, opening + 1
        while depth:
            if css[end] == '{': depth += 1
            if css[end] == '}': depth -= 1
            end += 1
        body = css[opening + 1:end - 1]
        if selector.startswith('@media'):
            body = subset(body, names)
            if body: result.append(selector + '{' + body + '}')
        elif not selector.startswith('@'):
            kept = []
            for part in selector.split(','):
                classes = set(re.findall(r'\.([\w-]+)', part))
                ids = set(re.findall(r'#([\w-]+)', part))
                if classes <= names.classes and ids <= names.ids:
                    kept.append(part.strip())
            if kept:
                result.append(','.join(kept) + '{' + body.strip() + '}')
        position = end
    return '\n'.join(result)

css = re.sub(r'/\*.*?\*/', '', (ROOT / 'styles.css').read_text(), flags=re.S)
for page in PAGES:
    html = page.read_text()
    names = Names()
    names.feed(html)
    selected = subset(css, names)
    # Collapse indentation only; preserve spaces required by calc() and strings.
    selected = re.sub(r'\s+', ' ', selected).strip()
    block = '<style id="home-styles">\n      ' + selected + '\n    </style>'
    html, count = re.subn(r'<style id="home-styles">.*?</style>|<link rel="stylesheet" href="(?:\.\./)?styles\.css[^\"]*" />', lambda _: block, html, flags=re.S)
    assert count == 1, (page, count)
    page.write_text(html)
    print(f'{page.relative_to(ROOT)}: {len(selected.encode())} bytes of inline CSS (source: {len(css.encode())})')
