"""Inspect actual emitted HTML, independently of the Markdown renderer."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import re
import sys


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.images, self.cards = [], [], [], []
        self.headings, self.code, self.blocks, self.words, self.h1 = [], [], [], [], 0
        self._heading = None
        self._code = None
        self._pre = 0
        self.noindex = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.append(a['id'])
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        if tag in ('img', 'script', 'link') and a.get('src' if tag != 'link' else 'href'):
            self.images.append(a['src' if tag != 'link' else 'href'])
        if a.get('data-wu-slug'):
            self.cards.append(a['data-wu-slug'])
        if tag == 'h1':
            self.h1 += 1
        if tag == 'pre':
            self._pre += 1
        if re.fullmatch('h[1-6]', tag):
            self._heading = [tag, a.get('id'), '']
        if tag == 'code':
            self._code = ''
        if tag == 'meta' and a.get('name') == 'robots' and 'noindex' in a.get('content', ''):
            self.noindex = True

    def handle_endtag(self, tag):
        if self._heading and self._heading[0] == tag:
            self.headings.append(self._heading)
            self._heading = None
        if tag == 'code' and self._code is not None:
            self.code.append(self._code)
            if self._pre:
                self.blocks.append(self._code)
            self._code = None
        if tag == 'pre':
            self._pre -= 1

    def handle_data(self, data):
        self.words.append(data)
        if self._heading is not None:
            self._heading[2] += data
        if self._code is not None:
            self._code += data


def compact(text):
    return ' '.join(text.split())


def main():
    root = Path(sys.argv[1]).resolve()
    review = sys.argv[2] == 'review'
    payload = json.load(sys.stdin)
    reports = payload['reports']
    expected = [r for r in reports if review or r['approved']]
    pages = {p: Page(p.read_text()) for p in root.rglob('*.html')}
    assert pages, f'No emitted HTML in {root}'
    errors = []

    def check(condition, message):
        if not condition:
            errors.append(message)

    routes = ['/', '/writeups/', '/research/', '/projects/', '/about/']
    routes += ['/research/' + slug + '/' for slug in payload['research']]
    for route in routes:
        check(root / route.lstrip('/') / 'index.html' in pages, f'Missing preserved route {route}')

    for file, page in pages.items():
        check(len(page.ids) == len(set(page.ids)), f'Duplicate heading/element ID: {file.relative_to(root)}')
        for href in page.links + page.images:
            url = urlsplit(href)
            if url.scheme or url.netloc:
                continue
            target = (root / unquote(url.path).lstrip('/')) if url.path.startswith('/') else file.parent / unquote(url.path)
            target = target.resolve()
            if not url.path:
                target = file
            if target.is_dir():
                target /= 'index.html'
            check(target.exists(), f'Broken local link/asset: {file.relative_to(root)} -> {href}')
            if url.fragment and target in pages:
                check(unquote(url.fragment) in pages[target].ids, f'Broken fragment: {file.relative_to(root)} -> {href}')

    index = pages.get(root / 'writeups/index.html')
    if index:
        check(sorted(index.cards) == sorted(r['slug'] for r in expected), 'Index cards differ from canonical visible reports')
        check(len(index.cards) == len(set(index.cards)), 'Duplicate module cards')
    actual_routes = {p.parent.name for p in pages if p.parent.parent == root / 'writeups'}
    check(actual_routes == {r['slug'] for r in expected}, f'Unexpected/missing write-up routes: {actual_routes}')

    for r in reports:
        file = root / 'writeups' / r['slug'] / 'index.html'
        if not review and not r['approved']:
            check(not file.exists(), f'Pending report leaked into production: {r["slug"]}')
            check(not (root / 'writeups/evidence' / r['slug']).exists(), f'Draft evidence leaked: {r["slug"]}')
            continue
        page = pages.get(file)
        check(page is not None, f'Missing canonical report: {r["slug"]}')
        if not page:
            continue
        reference = Page(r['html'])
        check(page.h1 == 1, f'Duplicate/missing article title: {r["slug"]}')
        actual = [(h[1], compact(h[2])) for h in page.headings if h[1] in {x['id'] for x in r['headings']}]
        wanted = [(h[1], compact(h[2])) for h in reference.headings]
        check(actual == wanted, f'Source/rendered heading mismatch: {r["slug"]}')
        for code in reference.code:
            check(code in page.code, f'Truncated code block: {r["slug"]}')
        # Full source body must occur once, not a shortened sections-array approximation.
        visible, source = compact(' '.join(page.words)), compact(' '.join(reference.words))
        check(source in visible, f'Missing/reordered canonical body: {r["slug"]}')
        check(visible.count(source) == 1, f'Canonical body rendered twice: {r["slug"]}')
        if not r['approved']:
            check(page.noindex, f'Draft lacks noindex: {r["slug"]}')
        if r['evidenceStatus'] == 'pending':
            check('Evidence Pending' in visible and 'Local draft' in visible, f'Draft label missing: {r["slug"]}')
        print(f'PASS rendered {r["slug"]}: {len(wanted)} source headings, {len(reference.blocks)} code blocks, {len(reference.code) - len(reference.blocks)} inline code spans, complete body once')

    for error in errors:
        print('FAIL', error, file=sys.stderr)
    if errors:
        raise SystemExit(1)
    print(f'PASS {sys.argv[2]} HTML: {len(pages)} pages; {len(expected)} canonical cards/routes; internal links/assets/fragments; 4 Research routes preserved')
    if not review:
        print(f'PASS production exclusion: {sum(not r["approved"] for r in reports)} unapproved reports and their evidence excluded')


if __name__ == '__main__':
    main()
