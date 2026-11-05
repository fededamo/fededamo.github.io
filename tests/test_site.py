"""Check both static pages without third-party dependencies."""

from html.parser import HTMLParser
from pathlib import Path
import unittest
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.elements = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))


class SiteTests(unittest.TestCase):
    def test_every_window_has_a_taskbar_button(self):
        for relative in ("index.html", "en/index.html"):
            with self.subTest(page=relative):
                page = Page(ROOT / relative)
                windows = {attrs["id"] for _, attrs in page.elements if "data-window" in attrs}
                tasks = [attrs["data-task"] for _, attrs in page.elements if "data-task" in attrs]
                self.assertCountEqual(tasks, windows)

    def test_languages_sections_and_local_links(self):
        for relative, language in (("index.html", "it"), ("en/index.html", "en")):
            with self.subTest(page=relative):
                path = ROOT / relative
                page = Page(path)
                self.assertIn(("html", {"lang": language}), page.elements)
                self.assertEqual(sum(tag == "h1" for tag, _ in page.elements), 1)
                controls = [attrs for tag, attrs in page.elements if "data-theme-select" in attrs]
                self.assertEqual(len(controls), 1)
                self.assertIn("aria-label", controls[0])
                self.assertEqual([attrs.get("value") for tag, attrs in page.elements if tag == "option"], ["system", "light", "dark"])
                for tag, attrs in page.elements:
                    if tag == "script" and "src" in attrs:
                        script = ROOT / "public" / attrs["src"].lstrip("/") if attrs["src"].startswith("/") else path.parent / attrs["src"]
                        self.assertTrue(script.is_file())
                    if tag == "img":
                        self.assertIn("alt", attrs)
                        self.assertTrue((path.parent / attrs["src"]).is_file())
                ids = [attrs["id"] for _, attrs in page.elements if "id" in attrs]
                self.assertNotIn("percorso", ids)
                self.assertEqual(len(ids), len(set(ids)))
                self.assertTrue({"profilo", "progetti", "curriculum", "contatti"} <= set(ids))
                for _, attrs in page.elements:
                    if "aria-labelledby" in attrs:
                        self.assertTrue(set(attrs["aria-labelledby"].split()) <= set(ids))
                    if "href" not in attrs:
                        continue
                    link = urlsplit(attrs["href"])
                    self.assertFalse(link.scheme or link.netloc)
                    self.assertFalse(link.path.startswith("/"), "Keep links compatible with repository subpaths")
                    target = path.parent / link.path if link.path else path
                    if target.is_dir():
                        target /= "index.html"
                    self.assertTrue(target.is_file(), str(target))
                    if link.fragment:
                        self.assertIn(link.fragment, ids)


if __name__ == "__main__":
    unittest.main()
