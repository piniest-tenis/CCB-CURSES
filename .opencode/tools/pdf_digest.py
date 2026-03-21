"""
pdf_digest.py — Daggerheart SRD PDF to agent-readable Markdown.

Usage:
  python tools/pdf_digest.py [--pdf <path>] [--out <path>]

Defaults:
  --pdf  .opencode/supporting-docs/Daggerheart-SRD-9-09-25.pdf
  --out  .opencode/supporting-docs/Daggerheart-SRD-digested.md

Requires: PyMuPDF  (pip install pymupdf)
  Already installed at C:\\Users\\joshu\\miniconda3 as PyMuPDF 1.27.1.

What it does:
  1. Opens the PDF with fitz (PyMuPDF).
  2. Extracts structured text blocks with font-size metadata.
  3. Classifies each block as HEADING, SUBHEADING, or BODY based on font size.
  4. Renders a clean Markdown document with:
       # H1  — largest font size (document headings)
       ## H2 — second-tier headings
       body  — normal paragraphs (blank-line separated)
  5. Strips ligatures and normalises whitespace.
  6. Inserts page-break markers so the agent can cite page numbers.

Output is UTF-8 Markdown, suitable for direct inclusion in agent context.
"""

import re
import sys
import argparse
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit(
        "ERROR: PyMuPDF not found.\n"
        "Install with:  pip install pymupdf\n"
        "Windows path:  C:\\Users\\joshu\\miniconda3\\Scripts\\pip install pymupdf"
    )

# ── Ligature / encoding normalisation ─────────────────────────────────────────
LIGATURES = {
    "\ufb00": "ff",
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
    "\ufb05": "st",
    "\ufb06": "st",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "--",
    "\u2022": "-",
    "\u00a0": " ",
}

def normalise(text: str) -> str:
    for char, replacement in LIGATURES.items():
        text = text.replace(char, replacement)
    # Collapse internal runs of whitespace (but not newlines)
    text = re.sub(r"[ \t]+", " ", text)
    # Strip TOC dot-leader lines (e.g. "Chapter . . . . . . . 42")
    text = re.sub(r"(\s*\.\s*){4,}", " ", text)
    return text.strip()


# ── Font-size classification ───────────────────────────────────────────────────

def classify_spans(page_dict: dict) -> list[dict]:
    """
    Return a flat list of {size, text, bold} dicts from a page's block/span tree.
    """
    spans = []
    for block in page_dict.get("blocks", []):
        if block.get("type") != 0:  # 0 = text block
            continue
        for line in block.get("lines", []):
            line_parts = []
            max_size = 0.0
            is_bold = False
            for span in line.get("spans", []):
                t = normalise(span.get("text", ""))
                if not t:
                    continue
                size = span.get("size", 10)
                flags = span.get("flags", 0)
                bold = bool(flags & 0b10000)  # bit 4 = bold
                line_parts.append(t)
                if size > max_size:
                    max_size = size
                if bold:
                    is_bold = True
            text = " ".join(line_parts).strip()
            if text:
                spans.append({"size": max_size, "text": text, "bold": is_bold})
    return spans


def build_size_tiers(all_sizes: list[float]) -> tuple[float, float]:
    """
    Given all font sizes seen in the document, return (h1_threshold, h2_threshold).
    Anything >= h1_threshold is H1, >= h2_threshold is H2, else body.
    """
    if not all_sizes:
        return 18.0, 13.0
    unique = sorted(set(all_sizes), reverse=True)
    # H1: top tier (largest sizes, typically 16–24pt)
    h1 = unique[0] * 0.90  # within 10% of the max
    # H2: second tier (typically 12–16pt, bold section headers)
    if len(unique) > 1:
        h2 = unique[1] * 0.90
    else:
        h2 = h1 * 0.75
    return h1, h2


# ── Main extraction ────────────────────────────────────────────────────────────

def extract(pdf_path: Path, out_path: Path) -> None:
    doc = fitz.open(str(pdf_path))
    total_pages = len(doc)
    print(f"Extracting {total_pages} pages from {pdf_path.name} ...")

    # First pass: collect all font sizes to calibrate tiers
    all_sizes: list[float] = []
    page_dicts = []
    for page in doc:
        d = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
        page_dicts.append(d)
        for block in d.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    s = span.get("size", 0)
                    if s > 5:  # ignore tiny/invisible text
                        all_sizes.append(s)

    h1_thresh, h2_thresh = build_size_tiers(all_sizes)
    print(f"  Font tiers — H1 >= {h1_thresh:.1f}pt  H2 >= {h2_thresh:.1f}pt")

    # Second pass: render Markdown
    lines_out: list[str] = []
    lines_out.append("# Daggerheart SRD 1.0 — Agent-Readable Digest")
    lines_out.append("")
    lines_out.append(
        "> Auto-generated from Daggerheart-SRD-9-09-25.pdf via pdf_digest.py.  "
    )
    lines_out.append(
        "> Page markers are included so the agent can cite source locations."
    )
    lines_out.append("")

    prev_was_body = False

    for page_num, d in enumerate(page_dicts, start=1):
        lines_out.append(f"\n---\n<!-- page {page_num} -->\n")
        prev_was_body = False

        spans = classify_spans(d)

        for span in spans:
            text = span["text"]
            size = span["size"]
            bold = span["bold"]

            if not text:
                continue

            # Skip pure page-number lines (just a number, possibly with spaces)
            if re.fullmatch(r"\d+", text):
                continue

            if size >= h1_thresh:
                lines_out.append(f"\n# {text}\n")
                prev_was_body = False
            elif size >= h2_thresh or bold:
                lines_out.append(f"\n## {text}\n")
                prev_was_body = False
            else:
                if prev_was_body:
                    # Append to previous paragraph (same logical block)
                    lines_out[-1] = lines_out[-1] + " " + text
                else:
                    lines_out.append(text)
                    prev_was_body = True

    # Write output
    out_path.parent.mkdir(parents=True, exist_ok=True)
    content = "\n".join(lines_out)
    # Final cleanup: collapse 3+ consecutive blank lines to 2
    content = re.sub(r"\n{3,}", "\n\n", content)
    out_path.write_text(content, encoding="utf-8")
    print(f"  Written {len(content):,} chars to {out_path}")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent

    parser = argparse.ArgumentParser(description="Digest Daggerheart SRD PDF to Markdown")
    parser.add_argument(
        "--pdf",
        default=str(repo_root / "supporting-docs" / "Daggerheart-SRD-9-09-25.pdf"),
        help="Path to the source PDF",
    )
    parser.add_argument(
        "--out",
        default=str(repo_root / "supporting-docs" / "Daggerheart-SRD-digested.md"),
        help="Path for the output Markdown file",
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    out_path = Path(args.out)

    if not pdf_path.exists():
        sys.exit(f"ERROR: PDF not found: {pdf_path}")

    extract(pdf_path, out_path)
    print("Done.")


if __name__ == "__main__":
    main()
