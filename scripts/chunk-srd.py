#!/usr/bin/env python3
"""
scripts/chunk-srd.py

Daggerheart SRD Chunking & Indexing Script — Human-Readable Digest Edition
=============================================================================
Parses the canonical human-readable digested SRD file:
  .opencode/supporting-docs/Daggerheart-SRD-HumanReadable-digested.normalized.md

Outputs a FLAT ARRAY of SRDChunk objects to:
  frontend/public/srd-index.json

Run with:  python3 scripts/chunk-srd.py
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

# ─── Configuration ────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
SRD_SOURCE = os.path.join(
    REPO_ROOT, ".opencode", "supporting-docs",
    "Daggerheart-SRD-HumanReadable-digested.normalized.md"
)
OUTPUT_PATH = os.path.join(REPO_ROOT, "frontend", "public", "srd-index.json")
FILE_PATH = "Daggerheart-SRD-HumanReadable-digested.normalized.md"
MAX_CHUNK_SIZE = 8000

# ─── Canonical SRD Structure ──────────────────────────────────────────────────

CLASSES = [
    "Bard", "Druid", "Guardian", "Ranger", "Rogue",
    "Seraph", "Sorcerer", "Warrior", "Wizard",
]

ANCESTRIES = [
    "Clank", "Drakona", "Dwarf", "Elf", "Faerie", "Faun", "Firbolg",
    "Fungril", "Galapa", "Giant", "Goblin", "Halfling", "Human",
    "Infernis", "Katari", "Orc", "Ribbet", "Simiah",
]

COMMUNITIES = [
    "Highborne", "Loreborne", "Orderborne", "Ridgeborne", "Seaborne",
    "Slyborne", "Underborne", "Wanderborne", "Wildborne",
]

DOMAINS = [
    "Arcana", "Blade", "Bone", "Codex", "Grace",
    "Midnight", "Sage", "Splendor", "Valor",
]

# Map the H1 headings in the file to our canonical 9 section names.
# The file's H1s: DAGGERHEART, CONTENTS, INTRODUCTION, CHARACTER CREATION,
#   CORE MATERIALS, CORE MECHANICS, RUNNING AN ADVENTURE, APPENDIX
# Note: CORE MATERIALS contains Domains, Classes, Ancestries, and Communities
# as H2 subsections, which we break out into their own top-level sections.

SECTION_ORDER = [
    "Introduction",
    "Character Creation",
    "Classes",
    "Ancestries",
    "Communities",
    "Domains",
    "Core Mechanics",
    "Running an Adventure",
    "Appendix",
]

SECTION_RANK = {s: i for i, s in enumerate(SECTION_ORDER)}

# ─── Utilities ────────────────────────────────────────────────────────────────

def slugify(s: str) -> str:
    """Convert a string to a URL-safe kebab-case slug."""
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s-]", " ", s)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-{2,}", "-", s)
    s = s.strip("-")
    return s


STOP_WORDS = frozenset([
    "a", "an", "the", "and", "or", "of", "in", "to", "for", "is", "it", "at",
    "by", "on", "as", "be", "if", "so", "do", "up", "my", "we", "no", "you",
    "can", "are", "was", "has", "had", "not", "its", "per", "all", "any",
    "one", "two", "but", "with", "from", "that", "this", "your", "they",
    "have", "their", "will", "when", "each", "make", "take", "into", "roll",
    "once", "long", "rest", "range", "near", "far", "very", "close", "next",
    "turn", "end", "also", "gain", "use", "may", "must", "would", "could",
    "should", "does", "did", "more", "most", "them", "these", "those", "than",
])


def tokenize(s: str) -> list[str]:
    """Tokenize a string into lowercase words, filtering stop words."""
    s = re.sub(r"[^a-z0-9\s]", " ", s.lower())
    return [w for w in s.split() if len(w) > 2 and w not in STOP_WORDS]


MECH_KEYWORDS = [
    "hp", "hit points", "evasion", "stress", "hope", "fear",
    "damage threshold", "thresholds", "reaction", "action roll",
    "spellcast", "melee", "ranged", "close", "far", "very close", "very far",
    "passive", "active", "spotlight", "advantage", "disadvantage",
    "rest", "short rest", "long rest", "foundation", "specialization", "mastery",
    "tier", "leader", "standard", "skull", "solo", "horde",
    "physical", "magical", "prone", "restrained", "frightened",
    "hidden", "invisible", "vulnerable", "stunned", "distracted",
    "beastform", "companion", "domain card", "armor slot",
    "proficiency", "experience", "level up", "multiclass",
    "duality dice", "critical success", "gold", "consumable",
]


def extract_tags(section: str, subsection: str | None, title: str, content: str) -> list[str]:
    """Extract search-relevant tags from chunk metadata and content."""
    tags = set()

    for t in tokenize(section):
        tags.add(t)
    if subsection:
        for t in tokenize(subsection):
            tags.add(t)
    for t in tokenize(title):
        tags.add(t)

    content_lower = content.lower()
    for kw in MECH_KEYWORDS:
        if kw in content_lower:
            tags.add(kw.replace(" ", "-"))

    # Extract tier mentions
    tier_match = re.search(r"Tier\s+(\d+)", content, re.IGNORECASE)
    if tier_match:
        tags.add(f"tier-{tier_match.group(1)}")

    # Tokenize the first 600 chars for context keywords
    for t in tokenize(content[:600]):
        tags.add(t)

    return sorted(t for t in tags if 2 <= len(t) <= 40)


# ─── Markdown Parser ──────────────────────────────────────────────────────────

def parse_headings(text: str) -> list[dict]:
    """
    Parse the markdown file into a list of heading entries.
    Each entry: { level, title, line, content }
    Content is the text between this heading and the next heading of same or higher level.
    """
    lines = text.split("\n")
    heading_re = re.compile(r"^(#{1,6})\s+(.*)")
    entries = []

    for i, line in enumerate(lines):
        m = heading_re.match(line)
        if m:
            entries.append({
                "level": len(m.group(1)),
                "title": m.group(2).strip(),
                "line": i,
            })

    # Compute content ranges
    for i, entry in enumerate(entries):
        start_line = entry["line"]
        if i + 1 < len(entries):
            end_line = entries[i + 1]["line"]
        else:
            end_line = len(lines)
        # Content includes the heading line itself and everything until the next heading
        entry["content"] = "\n".join(lines[start_line:end_line]).strip()
        # Also store content without the heading line for body-only use
        entry["body"] = "\n".join(lines[start_line + 1:end_line]).strip()

    return entries


# ─── Section Mapping Logic ────────────────────────────────────────────────────

def map_to_sections(headings: list[dict]) -> list[dict]:
    """
    Map parsed headings into our canonical section structure.
    Returns a list of chunk definitions:
    { section, subsection, title, content, level }
    """
    chunks = []

    # Skip preamble headings: DAGGERHEART (H1), CONTENTS (H1)
    # Find the index of the first relevant H1
    h1_indices = {}
    for i, h in enumerate(headings):
        if h["level"] == 1:
            title_upper = h["title"].upper().strip()
            if title_upper == "INTRODUCTION":
                if "INTRODUCTION" not in h1_indices:
                    h1_indices["INTRODUCTION"] = i
            elif title_upper == "CHARACTER CREATION":
                h1_indices["CHARACTER CREATION"] = i
            elif title_upper == "CORE MATERIALS":
                h1_indices["CORE MATERIALS"] = i
            elif title_upper == "CORE MECHANICS":
                h1_indices["CORE MECHANICS"] = i
            elif title_upper == "RUNNING AN ADVENTURE":
                h1_indices["RUNNING AN ADVENTURE"] = i
            elif title_upper == "APPENDIX":
                h1_indices["APPENDIX"] = i

    # ── INTRODUCTION ──────────────────────────────────────────────────────
    if "INTRODUCTION" in h1_indices:
        idx = h1_indices["INTRODUCTION"]
        # Collect everything from INTRODUCTION H1 up to CHARACTER CREATION H1
        end_idx = h1_indices.get("CHARACTER CREATION", len(headings))
        intro_content = _collect_content(headings, idx, end_idx)
        chunks.append({
            "section": "Introduction",
            "subsection": None,
            "title": "Introduction",
            "content": intro_content,
            "level": 1,
        })

    # ── CHARACTER CREATION ────────────────────────────────────────────────
    if "CHARACTER CREATION" in h1_indices:
        idx = h1_indices["CHARACTER CREATION"]
        end_idx = h1_indices.get("CORE MATERIALS", len(headings))
        cc_content = _collect_content(headings, idx, end_idx)
        chunks.append({
            "section": "Character Creation",
            "subsection": None,
            "title": "Character Creation",
            "content": cc_content,
            "level": 1,
        })

    # ── CORE MATERIALS → Domains, Classes, Ancestries, Communities ────────
    if "CORE MATERIALS" in h1_indices:
        cm_idx = h1_indices["CORE MATERIALS"]
        cm_end = h1_indices.get("CORE MECHANICS", len(headings))

        # Find the H2 sections inside CORE MATERIALS
        domains_idx = None
        classes_idx = None
        ancestries_idx = None
        communities_idx = None

        for i in range(cm_idx, cm_end):
            h = headings[i]
            if h["level"] == 2:
                title_upper = h["title"].upper().strip()
                if title_upper == "DOMAINS" and domains_idx is None:
                    domains_idx = i
                elif title_upper == "CLASSES" and classes_idx is None:
                    classes_idx = i
                elif title_upper == "ANCESTRIES" and ancestries_idx is None:
                    ancestries_idx = i
                elif title_upper == "COMMUNITIES" and communities_idx is None:
                    communities_idx = i

        # ── DOMAINS section ───────────────────────────────────────────────
        if domains_idx is not None:
            domains_end = classes_idx if classes_idx is not None else (ancestries_idx or communities_idx or cm_end)
            domains_content = _collect_content(headings, domains_idx, domains_end)
            chunks.append({
                "section": "Domains",
                "subsection": "Overview",
                "title": "Domains Overview",
                "content": domains_content,
                "level": 1,
            })

        # ── CLASSES section ───────────────────────────────────────────────
        if classes_idx is not None:
            classes_end = ancestries_idx if ancestries_idx is not None else (communities_idx or cm_end)
            # Classes overview: content from ## CLASSES heading up to first ### CLASS_NAME
            _add_class_chunks(headings, classes_idx, classes_end, chunks)

        # ── ANCESTRIES section ────────────────────────────────────────────
        if ancestries_idx is not None:
            anc_end = communities_idx if communities_idx is not None else cm_end
            _add_ancestry_chunks(headings, ancestries_idx, anc_end, chunks)

        # ── COMMUNITIES section ───────────────────────────────────────────
        if communities_idx is not None:
            _add_community_chunks(headings, communities_idx, cm_end, chunks)

    # ── CORE MECHANICS ────────────────────────────────────────────────────
    if "CORE MECHANICS" in h1_indices:
        cm_idx = h1_indices["CORE MECHANICS"]
        cm_end = h1_indices.get("RUNNING AN ADVENTURE", len(headings))
        _add_core_mechanics_chunks(headings, cm_idx, cm_end, chunks)

    # ── RUNNING AN ADVENTURE ──────────────────────────────────────────────
    if "RUNNING AN ADVENTURE" in h1_indices:
        ra_idx = h1_indices["RUNNING AN ADVENTURE"]
        ra_end = h1_indices.get("APPENDIX", len(headings))
        _add_running_adventure_chunks(headings, ra_idx, ra_end, chunks)

    # ── APPENDIX ──────────────────────────────────────────────────────────
    if "APPENDIX" in h1_indices:
        app_idx = h1_indices["APPENDIX"]
        _add_appendix_chunks(headings, app_idx, len(headings), chunks)

    return chunks


def _collect_content(headings: list[dict], start_idx: int, end_idx: int) -> str:
    """Collect the content from headings[start_idx] through headings[end_idx - 1]."""
    if start_idx >= len(headings):
        return ""
    # Get the content from the start heading's line to the end heading's line
    parts = []
    for i in range(start_idx, min(end_idx, len(headings))):
        parts.append(headings[i]["content"])
    return "\n\n".join(parts).strip()


def _collect_range_content(headings: list[dict], start_idx: int, end_idx: int) -> str:
    """
    Collect ALL content from the starting heading through end_idx - 1,
    preserving the full text including sub-headings.
    """
    if start_idx >= len(headings):
        return ""
    # Use the line numbers to extract the full text range
    first_line = headings[start_idx]["line"]
    if end_idx < len(headings):
        last_line = headings[end_idx]["line"]
    else:
        # For the last heading, use its content end
        last_entry = headings[min(end_idx - 1, len(headings) - 1)]
        content_lines = last_entry["content"].count("\n") + 1
        last_line = last_entry["line"] + content_lines

    # We need the original text - reconstruct from headings content
    # Actually, each heading's "content" includes everything up to the next heading
    # So collecting from start_idx to end_idx gives us the full range
    parts = []
    for i in range(start_idx, min(end_idx, len(headings))):
        parts.append(headings[i]["content"])
    return "\n\n".join(parts).strip()


def _add_class_chunks(headings, classes_idx, classes_end, chunks):
    """Add chunks for each class found within the Classes section."""
    class_names_upper = {c.upper(): c for c in CLASSES}

    # Find the overview content (before first class H3)
    overview_parts = []
    first_class_heading = None

    for i in range(classes_idx, classes_end):
        h = headings[i]
        if h["level"] == 3 and h["title"].upper().strip() in class_names_upper:
            first_class_heading = i
            break

    # Overview: from ## CLASSES to first class ### heading
    if first_class_heading is not None and first_class_heading > classes_idx:
        overview_content = _collect_range_content(headings, classes_idx, first_class_heading)
        if overview_content.strip():
            chunks.append({
                "section": "Classes",
                "subsection": "Overview",
                "title": "Classes Overview",
                "content": overview_content,
                "level": 1,
            })

    # Find each class's H3 heading and collect its content
    class_heading_indices = []
    for i in range(classes_idx, classes_end):
        h = headings[i]
        if h["level"] == 3 and h["title"].upper().strip() in class_names_upper:
            class_heading_indices.append(i)

    for ci, idx in enumerate(class_heading_indices):
        h = headings[idx]
        class_name = class_names_upper[h["title"].upper().strip()]

        # End at next class heading or end of classes section
        if ci + 1 < len(class_heading_indices):
            end_idx = class_heading_indices[ci + 1]
        else:
            end_idx = classes_end

        content = _collect_range_content(headings, idx, end_idx)
        chunks.append({
            "section": "Classes",
            "subsection": class_name,
            "title": class_name,
            "content": content,
            "level": 2,
        })


def _add_ancestry_chunks(headings, anc_idx, anc_end, chunks):
    """Add chunks for each ancestry found within the Ancestries section."""
    ancestry_names_upper = {a.upper(): a for a in ANCESTRIES}
    # Also handle MIXED ANCESTRY
    ancestry_names_upper["MIXED ANCESTRY"] = "Mixed Ancestry"

    # Find overview content (before first ancestry H3)
    first_anc_heading = None
    for i in range(anc_idx, anc_end):
        h = headings[i]
        if h["level"] == 3 and h["title"].upper().strip() in ancestry_names_upper:
            first_anc_heading = i
            break

    # Overview
    if first_anc_heading is not None and first_anc_heading > anc_idx:
        overview_content = _collect_range_content(headings, anc_idx, first_anc_heading)
        if overview_content.strip():
            chunks.append({
                "section": "Ancestries",
                "subsection": "Overview",
                "title": "Ancestries Overview",
                "content": overview_content,
                "level": 1,
            })

    # Find each ancestry's H3 heading
    anc_heading_indices = []
    for i in range(anc_idx, anc_end):
        h = headings[i]
        title_upper = h["title"].upper().strip()
        if h["level"] == 3 and title_upper in ancestry_names_upper:
            anc_heading_indices.append(i)

    for ci, idx in enumerate(anc_heading_indices):
        h = headings[idx]
        title_upper = h["title"].upper().strip()
        anc_name = ancestry_names_upper[title_upper]

        if ci + 1 < len(anc_heading_indices):
            end_idx = anc_heading_indices[ci + 1]
        else:
            end_idx = anc_end

        content = _collect_range_content(headings, idx, end_idx)
        chunks.append({
            "section": "Ancestries",
            "subsection": anc_name,
            "title": anc_name,
            "content": content,
            "level": 2,
        })


def _add_community_chunks(headings, comm_idx, comm_end, chunks):
    """Add chunks for each community found within the Communities section."""
    comm_names_upper = {c.upper(): c for c in COMMUNITIES}

    # Overview
    first_comm_heading = None
    for i in range(comm_idx, comm_end):
        h = headings[i]
        if h["level"] == 3 and h["title"].upper().strip() in comm_names_upper:
            first_comm_heading = i
            break

    if first_comm_heading is not None and first_comm_heading > comm_idx:
        overview_content = _collect_range_content(headings, comm_idx, first_comm_heading)
        if overview_content.strip():
            chunks.append({
                "section": "Communities",
                "subsection": "Overview",
                "title": "Communities Overview",
                "content": overview_content,
                "level": 1,
            })

    # Find each community's H3 heading
    comm_heading_indices = []
    for i in range(comm_idx, comm_end):
        h = headings[i]
        if h["level"] == 3 and h["title"].upper().strip() in comm_names_upper:
            comm_heading_indices.append(i)

    for ci, idx in enumerate(comm_heading_indices):
        h = headings[idx]
        comm_name = comm_names_upper[h["title"].upper().strip()]

        if ci + 1 < len(comm_heading_indices):
            end_idx = comm_heading_indices[ci + 1]
        else:
            end_idx = comm_end

        content = _collect_range_content(headings, idx, end_idx)
        chunks.append({
            "section": "Communities",
            "subsection": comm_name,
            "title": comm_name,
            "content": content,
            "level": 2,
        })


# Core Mechanics subsections - we break at H2 level
CORE_MECHANICS_SUBSECTIONS = {
    "FLOW OF THE GAME": "Flow of the Game",
    "CORE GAMEPLAY LOOP": "Core Gameplay Loop",
    "THE SPOTLIGHT": "The Spotlight",
    "TURN ORDER & ACTION ECONOMY": "Turn Order & Action Economy",
    "MAKING MOVES & TAKING ACTION": "Action Rolls",
    "COMBAT": "Combat",
    "STRESS": "Stress",
    "ATTACKING": "Attacking",
    "MAPS, RANGE, AND MOVEMENT": "Maps, Range & Movement",
    "CONDITIONS": "Conditions",
    "DOWNTIME": "Downtime",
    "DEATH": "Death",
    "ADDITIONAL RULES": "Additional Rules",
    "LEVELING UP": "Leveling Up",
    "MULTICLASSING": "Multiclassing",
    "EQUIPMENT": "Equipment",
}


def _add_core_mechanics_chunks(headings, cm_idx, cm_end, chunks):
    """Add chunks for Core Mechanics, breaking at H2 subsections."""
    subsection_map_upper = {k.upper(): v for k, v in CORE_MECHANICS_SUBSECTIONS.items()}

    # Find H2 headings within Core Mechanics
    h2_indices = []
    for i in range(cm_idx + 1, cm_end):
        h = headings[i]
        if h["level"] == 2:
            h2_indices.append(i)

    if not h2_indices:
        # No subsections found, emit the whole section as one chunk
        content = _collect_range_content(headings, cm_idx, cm_end)
        chunks.append({
            "section": "Core Mechanics",
            "subsection": None,
            "title": "Core Mechanics",
            "content": content,
            "level": 1,
        })
        return

    # Overview: from Core Mechanics H1 to first H2
    if h2_indices[0] > cm_idx + 1:
        overview = _collect_range_content(headings, cm_idx, h2_indices[0])
        if overview.strip():
            chunks.append({
                "section": "Core Mechanics",
                "subsection": "Overview",
                "title": "Core Mechanics Overview",
                "content": overview,
                "level": 1,
            })

    # Each H2 subsection
    for si, idx in enumerate(h2_indices):
        h = headings[idx]
        title_upper = h["title"].upper().strip()

        # Map to canonical name
        subsection_name = subsection_map_upper.get(title_upper, h["title"].strip())

        if si + 1 < len(h2_indices):
            end_idx = h2_indices[si + 1]
        else:
            end_idx = cm_end

        content = _collect_range_content(headings, idx, end_idx)
        chunks.append({
            "section": "Core Mechanics",
            "subsection": subsection_name,
            "title": subsection_name,
            "content": content,
            "level": 2,
        })


# Running an Adventure subsections - we break at H2 level
RUNNING_ADVENTURE_SUBSECTIONS = {
    "GM GUIDANCE": "GM Guidance",
    "CORE GM MECHANICS": "Core GM Mechanics",
    "ADVERSARIES AND ENVIRONMENTS": "Adversaries and Environments",
    "ADDITIONAL GM GUIDANCE": "Additional GM Guidance",
    "THE WITHERWILD": "The Witherwild",
}


def _add_running_adventure_chunks(headings, ra_idx, ra_end, chunks):
    """Add chunks for Running an Adventure, breaking at H2 subsections."""
    subsection_map_upper = {k.upper(): v for k, v in RUNNING_ADVENTURE_SUBSECTIONS.items()}

    # Find H2 headings (and also look for the second H1 INTRODUCTION which is
    # actually the intro paragraph for Running an Adventure)
    h2_indices = []
    for i in range(ra_idx + 1, ra_end):
        h = headings[i]
        if h["level"] <= 2:
            # Include H1 "INTRODUCTION" that appears right after "RUNNING AN ADVENTURE"
            # as it's actually the intro text for this section
            if h["level"] == 1 and h["title"].upper().strip() == "INTRODUCTION":
                # This is the Running an Adventure intro paragraph, skip as H2-level
                continue
            if h["level"] == 2:
                h2_indices.append(i)

    if not h2_indices:
        content = _collect_range_content(headings, ra_idx, ra_end)
        chunks.append({
            "section": "Running an Adventure",
            "subsection": None,
            "title": "Running an Adventure",
            "content": content,
            "level": 1,
        })
        return

    # Overview: from RUNNING AN ADVENTURE through the INTRODUCTION H1 to first real H2
    if h2_indices[0] > ra_idx + 1:
        overview = _collect_range_content(headings, ra_idx, h2_indices[0])
        if overview.strip():
            chunks.append({
                "section": "Running an Adventure",
                "subsection": "Overview",
                "title": "Running an Adventure Overview",
                "content": overview,
                "level": 1,
            })

    # Merge consecutive H2 headings that resolve to the same canonical subsection name
    # (e.g., "## The Witherwild" at line 7616 and "## THE WITHERWILD" at line 7840)
    merged_h2 = []  # list of (canonical_name, start_idx, end_idx)
    for si, idx in enumerate(h2_indices):
        h = headings[idx]
        title_upper = h["title"].upper().strip()
        subsection_name = subsection_map_upper.get(title_upper, h["title"].strip())

        if si + 1 < len(h2_indices):
            end_idx = h2_indices[si + 1]
        else:
            end_idx = ra_end

        # Merge with previous entry if same canonical name
        if merged_h2 and merged_h2[-1][0] == subsection_name:
            merged_h2[-1] = (subsection_name, merged_h2[-1][1], end_idx)
        else:
            merged_h2.append((subsection_name, idx, end_idx))

    for subsection_name, start_idx, end_idx in merged_h2:
        content = _collect_range_content(headings, start_idx, end_idx)
        chunks.append({
            "section": "Running an Adventure",
            "subsection": subsection_name,
            "title": subsection_name,
            "content": content,
            "level": 2,
        })


def _add_appendix_chunks(headings, app_idx, app_end, chunks):
    """Add chunks for the Appendix, breaking by domain card sections."""
    domain_names_upper = {d.upper(): d for d in DOMAINS}

    # Find ### DOMAIN headings within the appendix
    domain_heading_indices = []
    for i in range(app_idx, app_end):
        h = headings[i]
        if h["level"] == 3:
            # Check if this is a "XXX DOMAIN" heading
            title_upper = h["title"].upper().strip()
            for domain_upper, domain_name in domain_names_upper.items():
                if title_upper == f"{domain_upper} DOMAIN":
                    domain_heading_indices.append((i, domain_name))
                    break

    # Overview: from APPENDIX heading to first domain heading
    if domain_heading_indices:
        first_domain_idx = domain_heading_indices[0][0]
        if first_domain_idx > app_idx:
            overview = _collect_range_content(headings, app_idx, first_domain_idx)
            if overview.strip():
                chunks.append({
                    "section": "Appendix",
                    "subsection": "Overview",
                    "title": "Appendix Overview",
                    "content": overview,
                    "level": 1,
                })

        # Each domain card section
        for di, (idx, domain_name) in enumerate(domain_heading_indices):
            if di + 1 < len(domain_heading_indices):
                end_idx = domain_heading_indices[di + 1][0]
            else:
                end_idx = app_end

            content = _collect_range_content(headings, idx, end_idx)
            chunks.append({
                "section": "Appendix",
                "subsection": f"{domain_name} Domain Cards",
                "title": f"{domain_name} Domain Cards",
                "content": content,
                "level": 2,
            })
    else:
        # No domain headings found, emit the whole appendix
        content = _collect_range_content(headings, app_idx, app_end)
        chunks.append({
            "section": "Appendix",
            "subsection": None,
            "title": "Appendix",
            "content": content,
            "level": 1,
        })


# ─── Chunk ID Generation & Splitting ──────────────────────────────────────────

def assign_ids(chunks: list[dict]) -> list[dict]:
    """Assign unique kebab-case IDs to each chunk."""
    id_counts = {}
    for chunk in chunks:
        section_slug = slugify(chunk["section"])
        subsection_slug = slugify(chunk["subsection"]) if chunk.get("subsection") else ""
        if subsection_slug:
            base_id = f"{section_slug}-{subsection_slug}"
        else:
            base_id = section_slug

        count = id_counts.get(base_id, 0)
        id_counts[base_id] = count + 1
        chunk["id"] = base_id if count == 0 else f"{base_id}-{count + 1}"

    return chunks


def split_oversized_chunks(chunks: list[dict]) -> list[dict]:
    """Split chunks that exceed MAX_CHUNK_SIZE into multiple parts."""
    result = []
    for chunk in chunks:
        if len(chunk["content"]) <= MAX_CHUNK_SIZE:
            result.append(chunk)
            continue

        paragraphs = re.split(r"\n\n+", chunk["content"])
        current_content = ""
        part_num = 1

        for para in paragraphs:
            if len(current_content) + len(para) > MAX_CHUNK_SIZE and len(current_content) > 0:
                result.append({
                    **chunk,
                    "id": f"{chunk['id']}-part-{part_num}",
                    "title": f"{chunk['title']} (Part {part_num})",
                    "content": current_content.strip(),
                })
                part_num += 1
                current_content = para
            else:
                current_content += ("\n\n" if current_content else "") + para

        if current_content.strip():
            if part_num == 1:
                result.append(chunk)
            else:
                result.append({
                    **chunk,
                    "id": f"{chunk['id']}-part-{part_num}",
                    "title": f"{chunk['title']} (Part {part_num})",
                    "content": current_content.strip(),
                })

    return result


# ─── Output Builder ───────────────────────────────────────────────────────────

def build_output(chunks: list[dict]) -> list[dict]:
    """Build the final output array of SRDChunk objects."""
    output = []
    for chunk in chunks:
        tags = extract_tags(
            chunk["section"],
            chunk.get("subsection"),
            chunk["title"],
            chunk["content"],
        )
        entry = {
            "id": chunk["id"],
            "title": chunk["title"],
            "section": chunk["section"],
        }
        if chunk.get("subsection"):
            entry["subsection"] = chunk["subsection"]
        entry["content"] = chunk["content"]
        entry["filePath"] = FILE_PATH
        entry["tags"] = tags
        entry["level"] = chunk.get("level", 1)
        output.append(entry)
    return output


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Daggerheart SRD Chunking Pipeline — Human-Readable Digest")
    print(f"  {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    print(f"  Source:  {SRD_SOURCE}")
    print(f"  Output:  {OUTPUT_PATH}")
    print()

    if not os.path.exists(SRD_SOURCE):
        print(f"  ❌ Source file not found: {SRD_SOURCE}")
        sys.exit(1)

    # Read and normalize
    with open(SRD_SOURCE, "r", encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")

    print(f"  Source file size: {len(text) // 1024} KB")

    # Parse headings
    headings = parse_headings(text)
    print(f"  Parsed {len(headings)} headings")

    # Map to sections
    chunks = map_to_sections(headings)
    print(f"  Mapped {len(chunks)} logical sections/subsections")

    # Assign IDs
    chunks = assign_ids(chunks)

    # Split oversized
    pre_split = len(chunks)
    chunks = split_oversized_chunks(chunks)
    print(f"  Raw chunks: {pre_split}")
    print(f"  After splitting oversized: {len(chunks)}")

    # Re-assign IDs after splitting (the split function already handles this)
    # Sort by section order → subsection → id
    chunks.sort(key=lambda c: (
        SECTION_RANK.get(c["section"], 99),
        c.get("subsection") or "",
        c["id"],
    ))

    # Build output
    output = build_output(chunks)

    # Write
    output_dir = os.path.dirname(OUTPUT_PATH)
    os.makedirs(output_dir, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    output_size = os.path.getsize(OUTPUT_PATH)
    output_size_kb = output_size // 1024

    # ── Report ──────────────────────────────────────────────────────────────
    print()
    print("-" * 60)
    print(f"  ✓ Written to: {OUTPUT_PATH}")
    print(f"  ✓ File size:  ~{output_size_kb} KB")
    print(f"  ✓ Output format: FLAT ARRAY (Array.isArray compatible)")
    print()

    section_counts = {}
    for chunk in output:
        section_counts[chunk["section"]] = section_counts.get(chunk["section"], 0) + 1

    print("  Per-Section Summary:")
    print("  " + "-" * 45)
    total = 0
    for section in SECTION_ORDER:
        count = section_counts.get(section, 0)
        total += count
        padding = " " * max(0, 30 - len(section))
        print(f"    {section}{padding} {count:4d} chunks")
    print("  " + "-" * 45)
    print(f"    {'TOTAL':<30} {total:4d} chunks")
    print()

    # List all sections and subsections
    print("  All Section → Subsection Entries:")
    print("  " + "-" * 45)
    section_subs: dict[str, set] = {}
    for chunk in output:
        key = chunk["section"]
        if key not in section_subs:
            section_subs[key] = set()
        if "subsection" in chunk and chunk["subsection"]:
            section_subs[key].add(chunk["subsection"])

    for section in SECTION_ORDER:
        subs = section_subs.get(section, set())
        if not subs:
            print(f"    {section}")
        else:
            print(f"    {section}:")
            for sub in sorted(subs):
                print(f"      → {sub}")

    # Content quality checks
    print()
    print("  Content Quality Checks:")
    print("  " + "-" * 45)

    for cls in CLASSES:
        matching = [c for c in output if c["section"] == "Classes" and c.get("subsection") == cls]
        if matching:
            chunk = matching[0]
            starts_ok = chunk["content"].lstrip("#").strip().upper().startswith(cls.upper())
            status = "✓" if starts_ok else "⚠"
            print(f"    {status} {cls}: {len(chunk['content'])} chars, starts: \"{chunk['content'][:50]}...\"")
        else:
            print(f"    ✗ {cls}: MISSING")

    # Check all 9 sections are represented
    print()
    missing_sections = [s for s in SECTION_ORDER if s not in section_counts]
    if missing_sections:
        print(f"  ⚠ Missing sections: {', '.join(missing_sections)}")
    else:
        print("  ✓ All 9 canonical sections represented")

    # Verify no empty chunks
    empty_chunks = [c for c in output if not c["content"].strip()]
    if empty_chunks:
        print(f"  ⚠ {len(empty_chunks)} empty chunks found: {[c['id'] for c in empty_chunks]}")
    else:
        print("  ✓ No empty chunks")

    # Verify JSON is a flat array
    with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
        loaded = json.load(f)
    assert isinstance(loaded, list), "Output is not a flat array!"
    print(f"  ✓ Output verified as flat JSON array with {len(loaded)} entries")

    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
