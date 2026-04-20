#!/usr/bin/env python3
"""
extract-srd-sub-entries.py

Reads frontend/public/srd-index.json (119 chunks) and extracts granular
sub-entries for:
  - Weapons (from equipment table HTML)
  - Armor   (from equipment table HTML)
  - Loot    (from equipment table HTML)
  - Adversaries (from markdown stat blocks)
  - Environments (from markdown stat blocks)
  - GM Mechanic subsections (H3+ headings in Running an Adventure)

Outputs frontend/public/srd-sub-entries.json with envelope:
  { version, generatedAt, entries[] }

Sub-entry ID format: "{parentChunkId}--{slug}"
"""

import json
import re
import sys
import html
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
INDEX_PATH = REPO_ROOT / "frontend" / "public" / "srd-index.json"
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "srd-sub-entries.json"

VERSION = "1.0.0"

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    text = text.lower().strip()
    text = html.unescape(text)
    # Replace unicode minus with hyphen
    text = text.replace("\u2212", "-")
    # Replace non-alphanum with hyphens
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    # Collapse multiple hyphens
    text = re.sub(r"-{2,}", "-", text)
    return text


def extract_tags(text: str) -> list:
    """Extract keyword tags from text content."""
    STOP_WORDS = frozenset([
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "it", "as", "be", "was", "are",
        "were", "been", "has", "have", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "can", "shall", "this",
        "that", "these", "those", "not", "no", "if", "then", "than", "so",
        "up", "out", "about", "into", "over", "after", "before", "between",
        "through", "during", "without", "again", "also", "just", "more",
        "most", "other", "some", "such", "only", "own", "same", "very",
        "each", "every", "all", "both", "few", "many", "much", "any",
        "when", "where", "how", "what", "which", "who", "whom", "why",
        "because", "while", "until", "since", "here", "there", "its",
        "your", "their", "our", "his", "her", "my", "they", "them", "you",
        "we", "us", "he", "she", "me", "him", "per", "one", "two",
    ])
    # Strip HTML
    clean = re.sub(r"<[^>]+>", " ", text)
    # Strip markdown formatting
    clean = re.sub(r"[#*_`\[\]()>|~]", " ", clean)
    words = re.findall(r"[a-z][a-z0-9]+", clean.lower())
    seen = set()
    tags = []
    for w in words:
        if w not in STOP_WORDS and w not in seen and len(w) > 2:
            seen.add(w)
            tags.append(w)
    return tags[:30]  # Cap at 30 tags


def make_sub_entry_id(parent_id: str, slug: str) -> str:
    """Create sub-entry ID: {parentChunkId}--{slug}"""
    return f"{parent_id}--{slug}"


def decode_html_entities(text: str) -> str:
    """Decode HTML entities like &#x27; and &amp;"""
    return html.unescape(text)


# ---------------------------------------------------------------------------
# Table HTML parsing
# ---------------------------------------------------------------------------

def parse_html_tables(content: str) -> list:
    """
    Extract all <table>...</table> blocks from content.
    Returns list of tables, each table is a list of rows,
    each row is a list of cell strings.
    
    Handles multi-line tables by joining content first.
    """
    tables = []
    # Find all table blocks (DOTALL to handle multi-line)
    table_blocks = re.findall(r"<table>(.*?)</table>", content, re.DOTALL)
    for block in table_blocks:
        rows = []
        # Find all <tr>...</tr> blocks
        tr_blocks = re.findall(r"<tr>(.*?)</tr>", block, re.DOTALL)
        for tr in tr_blocks:
            cells = re.findall(r"<td>(.*?)</td>", tr, re.DOTALL)
            # Clean whitespace in cells
            cells = [decode_html_entities(c.strip().replace("\n", " ")) for c in cells]
            if cells:
                rows.append(cells)
        if rows:
            tables.append(rows)
    return tables


def is_weapon_table(headers: list) -> bool:
    """Check if headers match weapon table format."""
    if len(headers) < 6:
        return False
    norm = [h.upper().strip() for h in headers]
    return "NAME" in norm and "TRAIT" in norm and "DAMAGE" in norm and "BURDEN" in norm


def is_armor_table(headers: list) -> bool:
    """Check if headers match armor table format."""
    if len(headers) < 4:
        return False
    joined = " ".join(h.upper().strip() for h in headers)
    return "NAME" in joined and "BASE" in joined and ("THRESHOLDS" in joined or "SCORE" in joined)


def is_loot_table_with_header(headers: list) -> bool:
    """Check if headers match loot table format (ROLL|LOOT|DESCRIPTION)."""
    if len(headers) < 3:
        return False
    norm = [h.upper().strip() for h in headers]
    return "ROLL" in norm and "LOOT" in norm


def looks_like_loot_row(row: list) -> bool:
    """Check if a row looks like a loot entry (starts with a number)."""
    if len(row) >= 3 and row[0].strip():
        return bool(re.match(r"^\d{1,2}$", row[0].strip()))
    return False


# ---------------------------------------------------------------------------
# Weapon extraction
# ---------------------------------------------------------------------------

def determine_weapon_tier(chunk_id: str, chunk_title: str, content_before_table: str) -> int:
    """Determine weapon tier from chunk ID and surrounding context."""
    # Equipment parts 1-4 correspond to tiers 1-4 for primary weapons
    part_match = re.search(r"part-(\d+)", chunk_id)
    if part_match:
        part = int(part_match.group(1))
        if 1 <= part <= 4:
            return part
        if part == 5:
            # Secondary weapons - check content for tier info
            # Secondary weapon tables: Standard, Improved, Advanced, Legendary
            content_upper = content_before_table.upper()
            if "LEGENDARY" in content_upper:
                return 4
            if "ADVANCED" in content_upper:
                return 3
            if "IMPROVED" in content_upper:
                return 2
            return 1
        if part == 6:
            # Wheelchair weapons contain all tiers in TIER column
            return 0  # Signal to read from row data
    return 1


def determine_weapon_category(chunk_id: str, content_before_table: str) -> str:
    """Determine if weapons are Primary or Secondary."""
    part_match = re.search(r"part-(\d+)", chunk_id)
    if part_match:
        part = int(part_match.group(1))
        if part <= 4:
            return "Primary"
        if part == 5:
            return "Secondary"
        if part == 6:
            return "Primary"  # Wheelchairs are primary
    return "Primary"


def determine_damage_type(damage: str) -> str:
    """Determine Physical vs Magic from damage string."""
    d_lower = damage.lower().strip()
    if "mag" in d_lower:
        if "phy" in d_lower:
            return "Physical"  # e.g., "d10+7 phy or mag" - default to Physical
        return "Magic"
    return "Physical"


def extract_weapons_from_chunk(chunk: dict, entries: list, seen_ids: set):
    """Extract weapon sub-entries from an equipment chunk."""
    content = chunk["content"]
    chunk_id = chunk["id"]
    section = chunk["section"]
    
    tables = parse_html_tables(content)
    if not tables:
        return
    
    for table in tables:
        if len(table) < 2:
            continue
        headers = table[0]
        if not is_weapon_table(headers):
            continue
        
        norm_headers = [h.upper().strip() for h in headers]
        has_tier_col = "TIER" in norm_headers
        
        # Find column indices
        name_idx = next((i for i, h in enumerate(norm_headers) if h == "NAME"), 0)
        tier_idx = next((i for i, h in enumerate(norm_headers) if h == "TIER"), -1) if has_tier_col else -1
        trait_idx = next((i for i, h in enumerate(norm_headers) if h == "TRAIT"), 1)
        range_idx = next((i for i, h in enumerate(norm_headers) if h == "RANGE"), 2)
        damage_idx = next((i for i, h in enumerate(norm_headers) if h == "DAMAGE"), 3)
        burden_idx = next((i for i, h in enumerate(norm_headers) if h == "BURDEN"), 4)
        feature_idx = next((i for i, h in enumerate(norm_headers) if h == "FEATURE"), 5)
        
        # Determine context for tier/category
        # Find text before this table in content
        table_html = re.search(r"<table>", content)
        content_before = content[:table_html.start()] if table_html else ""
        
        base_tier = determine_weapon_tier(chunk_id, chunk["title"], content_before)
        category = determine_weapon_category(chunk_id, content_before)
        
        # Determine if this is magic or physical section
        # Look for "Magic Weapons" or "Physical Weapons" label before this table
        is_magic_section = False
        # Find all table positions and match
        table_positions = [m.start() for m in re.finditer(r"<table>", content)]
        current_table_idx = 0
        for i, tbl in enumerate(tables):
            if tbl is table:
                current_table_idx = i
                break
        if current_table_idx < len(table_positions):
            text_before = content[:table_positions[current_table_idx]]
            # Check for "Magic Weapons" label closer to this table
            magic_pos = text_before.rfind("Magic Weapons")
            phys_pos = text_before.rfind("Physical Weapons")
            if magic_pos > phys_pos:
                is_magic_section = True
        
        for row in table[1:]:  # Skip header
            if len(row) < len(norm_headers):
                continue
            
            name = row[name_idx].strip()
            if not name or name == "NAME":
                continue  # Skip if it's another header row
            
            trait = row[trait_idx].strip() if trait_idx < len(row) else ""
            rng = row[range_idx].strip() if range_idx < len(row) else ""
            damage = row[damage_idx].strip() if damage_idx < len(row) else ""
            burden = row[burden_idx].strip() if burden_idx < len(row) else ""
            feature = row[feature_idx].strip() if feature_idx < len(row) else ""
            
            # Handle tier from column or from context
            tier = base_tier
            if has_tier_col and tier_idx >= 0 and tier_idx < len(row):
                tier_str = row[tier_idx].strip()
                tier_match = re.match(r"(\d+)", tier_str)
                if tier_match:
                    tier = int(tier_match.group(1))
            
            # Determine damage type
            damage_type = determine_damage_type(damage)
            if is_magic_section:
                damage_type = "Magic"
            
            # Clean feature
            if feature in ("--", "\u2014", "-", ""):
                feature = None
            
            slug = slugify(name)
            entry_id = make_sub_entry_id(chunk_id, slug)
            
            # Deduplicate IDs
            if entry_id in seen_ids:
                counter = 2
                while f"{entry_id}-{counter}" in seen_ids:
                    counter += 1
                entry_id = f"{entry_id}-{counter}"
            seen_ids.add(entry_id)
            
            breadcrumb_parts = ["Core Mechanics", "Equipment"]
            if category == "Secondary":
                breadcrumb_parts.append("Secondary Weapons")
            else:
                breadcrumb_parts.append("Weapons")
            breadcrumb_parts.append(f"Tier {tier}")
            
            entry = {
                "id": entry_id,
                "parentChunkId": chunk_id,
                "breadcrumb": " > ".join(breadcrumb_parts),
                "name": name,
                "type": "weapon",
                "fields": {
                    "trait": trait,
                    "range": rng,
                    "damage": damage,
                    "burden": burden,
                    "feature": feature,
                    "tier": tier,
                    "category": category,
                    "damageType": damage_type,
                },
                "tags": extract_tags(f"{name} {trait} {rng} {damage} {burden} {feature or ''} weapon {damage_type.lower()} tier {tier}"),
                "section": section,
            }
            entries.append(entry)


# ---------------------------------------------------------------------------
# Armor extraction
# ---------------------------------------------------------------------------

def extract_armor_from_chunk(chunk: dict, entries: list, seen_ids: set):
    """Extract armor sub-entries from an equipment chunk."""
    content = chunk["content"]
    chunk_id = chunk["id"]
    section = chunk["section"]
    
    tables = parse_html_tables(content)
    if not tables:
        return
    
    # Determine starting tier based on chunk
    # part-6 has Tier 1 armor only (1 armor table, the last of 4 tables)
    # part-7 has Tiers 2-4 armor (3 armor tables)
    if "part-6" in chunk_id:
        tier_start = 1
    elif "part-7" in chunk_id:
        tier_start = 2
    else:
        tier_start = 1
    
    armor_table_idx = 0
    for table in tables:
        if len(table) < 2:
            continue
        headers = table[0]
        if not is_armor_table(headers):
            continue
        
        tier = tier_start + armor_table_idx
        armor_table_idx += 1
        
        for row in table[1:]:
            if len(row) < 4:
                continue
            
            name = row[0].strip()
            if not name or "NAME" in name.upper():
                continue
            
            thresholds_raw = row[1].strip()
            score_raw = row[2].strip()
            feature = row[3].strip() if len(row) > 3 else ""
            
            # Parse thresholds: "5 / 11" -> major=5, severe=11
            threshold_match = re.match(r"(\d+)\s*/\s*(\d+)", thresholds_raw)
            major_threshold = int(threshold_match.group(1)) if threshold_match else 0
            severe_threshold = int(threshold_match.group(2)) if threshold_match else 0
            
            # Parse armor score
            score_match = re.match(r"(\d+)", score_raw)
            armor_score = int(score_match.group(1)) if score_match else 0
            
            # Parse feature type
            feature_type = None
            if feature and feature not in ("--", "\u2014", "-"):
                ft_match = re.match(r"^(\w+):", feature)
                if ft_match:
                    feature_type = ft_match.group(1)
            else:
                feature = None
            
            slug = slugify(name)
            entry_id = make_sub_entry_id(chunk_id, slug)
            
            if entry_id in seen_ids:
                counter = 2
                while f"{entry_id}-{counter}" in seen_ids:
                    counter += 1
                entry_id = f"{entry_id}-{counter}"
            seen_ids.add(entry_id)
            
            entry = {
                "id": entry_id,
                "parentChunkId": chunk_id,
                "breadcrumb": f"Core Mechanics > Equipment > Armor > Tier {tier}",
                "name": name,
                "type": "armor",
                "fields": {
                    "baseThresholds": thresholds_raw,
                    "baseMajorThreshold": major_threshold,
                    "baseSevereThreshold": severe_threshold,
                    "baseArmorScore": armor_score,
                    "feature": feature,
                    "featureType": feature_type,
                    "tier": tier,
                },
                "tags": extract_tags(f"{name} armor tier {tier} {feature or ''} {feature_type or ''}"),
                "section": section,
            }
            entries.append(entry)


# ---------------------------------------------------------------------------
# Loot extraction
# ---------------------------------------------------------------------------

def determine_loot_table_name(chunk_id: str, content: str, table_index: int) -> str:
    """Determine which loot table this is from context."""
    if "part-8" in chunk_id or "part-9" in chunk_id:
        return "Reusable Items"
    if "part-10" in chunk_id:
        # part-10 has consumables
        if table_index == 0:
            return "Consumables"
        return "Consumables"
    return "Loot"


def extract_loot_from_chunk(chunk: dict, entries: list, seen_ids: set):
    """Extract loot sub-entries from equipment chunks with loot tables."""
    content = chunk["content"]
    chunk_id = chunk["id"]
    section = chunk["section"]
    
    tables = parse_html_tables(content)
    if not tables:
        return
    
    for table_idx, table in enumerate(tables):
        if len(table) < 2:
            continue
        
        headers = table[0]
        has_header = is_loot_table_with_header(headers)
        
        # Skip if this is a weapon or armor table
        if is_weapon_table(headers) or is_armor_table(headers):
            continue
        
        loot_table_name = determine_loot_table_name(chunk_id, content, table_idx)
        
        # Determine if this is a 6-column double layout
        is_double = len(headers) == 6 and has_header
        
        data_rows = table[1:] if has_header else table
        
        # Check first row to see if it looks like loot data
        if data_rows and not looks_like_loot_row(data_rows[0]):
            if not has_header:
                continue
        
        for row in data_rows:
            # Process left side (cols 0-2)
            if len(row) >= 3 and row[0].strip():
                roll = row[0].strip()
                name = row[1].strip()
                description = row[2].strip()
                
                if roll and name and re.match(r"^\d{1,2}$", roll):
                    _add_loot_entry(chunk_id, section, roll, name, description, loot_table_name, entries, seen_ids)
            
            # Process right side for double layout (cols 3-5)
            if is_double and len(row) >= 6 and row[3].strip():
                roll = row[3].strip()
                name = row[4].strip()
                description = row[5].strip()
                
                if roll and name and re.match(r"^\d{1,2}$", roll):
                    _add_loot_entry(chunk_id, section, roll, name, description, loot_table_name, entries, seen_ids)


def _add_loot_entry(chunk_id, section, roll, name, description, loot_table_name, entries, seen_ids):
    """Helper to create and add a loot sub-entry."""
    slug = slugify(name)
    entry_id = make_sub_entry_id(chunk_id, slug)
    
    if entry_id in seen_ids:
        counter = 2
        while f"{entry_id}-{counter}" in seen_ids:
            counter += 1
        entry_id = f"{entry_id}-{counter}"
    seen_ids.add(entry_id)
    
    # Determine rarity tier from roll number
    roll_num = int(roll)
    tier = None
    if roll_num <= 12:
        tier = "Common"
    elif roll_num <= 24:
        tier = "Uncommon"
    elif roll_num <= 36:
        tier = "Rare"
    else:
        tier = "Legendary"
    
    entry = {
        "id": entry_id,
        "parentChunkId": chunk_id,
        "breadcrumb": f"Core Mechanics > Equipment > {loot_table_name}",
        "name": name,
        "type": "loot",
        "fields": {
            "roll": roll,
            "description": description,
            "lootTable": loot_table_name,
            "tier": tier,
        },
        "tags": extract_tags(f"{name} loot {loot_table_name} {description}"),
        "section": section,
    }
    entries.append(entry)


# ---------------------------------------------------------------------------
# Adversary extraction
# ---------------------------------------------------------------------------

def extract_adversaries_from_chunk(chunk: dict, entries: list, seen_ids: set):
    """Extract adversary stat blocks from adversary chunks."""
    content = chunk["content"]
    chunk_id = chunk["id"]
    section = chunk["section"]
    
    # Split content into lines
    lines = content.split("\n")
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Look for #### ADVERSARY_NAME (H4 heading)
        h4_match = re.match(r"^####\s+(.+)$", line)
        if not h4_match:
            i += 1
            continue
        
        adv_name = h4_match.group(1).strip()
        
        # Look for ##### Tier N Type on next non-empty line
        j = i + 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        
        if j >= len(lines):
            i += 1
            continue
        
        tier_line = lines[j].strip()
        # Match tier line - type may be followed by parenthetical or description on same line
        tier_match = re.match(
            r"^#####\s+Tier\s+(\d)\s+(\w+)(?:\s*\((.+?)\))?\s*(.*)?$",
            tier_line
        )
        if not tier_match:
            i += 1
            continue
        
        tier = int(tier_match.group(1))
        adv_type = tier_match.group(2)
        type_parenthetical = tier_match.group(3)  # e.g., "5/HP" for Horde
        inline_description = (tier_match.group(4) or "").strip()
        
        # Now parse the remaining fields
        j += 1
        description = inline_description  # May already have description from tier line
        motives = ""
        difficulty = 0
        thresholds = ""
        hp = 0
        stress = 0
        attack_str = ""
        experiences = []
        features = []
        
        # Skip blank lines to description
        while j < len(lines) and not lines[j].strip():
            j += 1
        
        # Description (first non-empty line after tier, if not already set from inline)
        if not description and j < len(lines) and not lines[j].strip().startswith("#") and not lines[j].strip().startswith("Motives"):
            description = lines[j].strip()
            j += 1
        
        # Parse remaining structured lines
        while j < len(lines):
            curr = lines[j].strip()
            
            if not curr:
                j += 1
                continue
            
            # Check for next H4 (next adversary)
            if re.match(r"^####\s+", curr) and not curr.startswith("##### FEATURES"):
                break
            
            # Motives & Tactics
            motives_match = re.match(r"^Motives\s*&\s*Tactics:\s*(.+)$", curr)
            if motives_match:
                motives = motives_match.group(1).strip()
                j += 1
                continue
            
            # Stat line: Difficulty: X | Thresholds: X/Y | HP: X | Stress: X
            stat_match = re.match(
                r"Difficulty:\s*(\d+)\s*\|\s*Thresholds:\s*(.+?)\s*\|\s*HP:\s*(\d+)\s*\|\s*Stress:\s*(\d+)",
                curr
            )
            if stat_match:
                difficulty = int(stat_match.group(1))
                thresholds = stat_match.group(2).strip()
                hp = int(stat_match.group(3))
                stress = int(stat_match.group(4))
                j += 1
                continue
            
            # ATK line
            atk_match = re.match(r"ATK:\s*(.+)$", curr)
            if atk_match:
                attack_str = atk_match.group(1).strip()
                # Normalize unicode minus
                attack_str = attack_str.replace("\u2212", "-")
                j += 1
                continue
            
            # Experience line
            exp_match = re.match(r"Experience:\s*(.+)$", curr)
            if exp_match:
                exp_text = exp_match.group(1).strip()
                # Parse "Name +N, Name +N"
                exp_parts = re.findall(r"([^,]+?\s*\+\d+)", exp_text)
                experiences = [e.strip() for e in exp_parts]
                j += 1
                continue
            
            # Features section
            if curr == "##### FEATURES":
                j += 1
                # Parse feature lines
                while j < len(lines):
                    feat_line = lines[j].strip()
                    
                    # Stop at next H4 or end
                    if re.match(r"^#{1,4}\s+", feat_line) and not feat_line.startswith("##### FEATURES"):
                        break
                    
                    # Feature: Name - Action|Reaction|Passive: description
                    feat_match = re.match(
                        r"^(.+?)\s*-\s*(Action|Reaction|Passive):\s*(.+)$",
                        feat_line
                    )
                    if feat_match:
                        feat_name = feat_match.group(1).strip()
                        feat_type = feat_match.group(2)
                        feat_desc = feat_match.group(3).strip()
                        
                        # Check for continuation on next lines
                        k = j + 1
                        while k < len(lines):
                            next_line = lines[k].strip()
                            if not next_line:
                                break
                            if re.match(r"^#{1,5}\s+", next_line):
                                break
                            if re.match(r"^.+?\s*-\s*(Action|Reaction|Passive):", next_line):
                                break
                            if re.match(r"^####\s+", next_line):
                                break
                            feat_desc += " " + next_line
                            k += 1
                        j = k
                        
                        features.append({
                            "name": feat_name,
                            "type": feat_type,
                            "description": feat_desc,
                        })
                        continue
                    
                    j += 1
                continue
            
            j += 1
        
        # Build the entry
        slug = slugify(adv_name)
        entry_id = make_sub_entry_id(chunk_id, slug)
        
        if entry_id in seen_ids:
            counter = 2
            while f"{entry_id}-{counter}" in seen_ids:
                counter += 1
            entry_id = f"{entry_id}-{counter}"
        seen_ids.add(entry_id)
        
        # Build type string with parenthetical
        full_type = adv_type
        if type_parenthetical:
            full_type = f"{adv_type} ({type_parenthetical})"
        
        entry = {
            "id": entry_id,
            "parentChunkId": chunk_id,
            "breadcrumb": f"Running an Adventure > Adversaries > Tier {tier} > {adv_name.title()}",
            "name": adv_name.title(),  # Title case for display
            "type": "adversary",
            "fields": {
                "tier": tier,
                "type": full_type,
                "description": description,
                "motives": motives,
                "difficulty": difficulty,
                "thresholds": thresholds,
                "hp": hp,
                "stress": stress,
                "attack": attack_str,
                "experiences": experiences,
                "features": features,
            },
            "tags": extract_tags(
                f"{adv_name} adversary tier {tier} {adv_type} {description} {motives} "
                f"{' '.join(e for e in experiences)} "
                f"{' '.join(f['name'] for f in features)}"
            ),
            "section": section,
        }
        entries.append(entry)
        
        # Move i to j (past this adversary)
        i = j


# ---------------------------------------------------------------------------
# Environment extraction
# ---------------------------------------------------------------------------

def extract_environments_from_chunk(chunk: dict, entries: list, seen_ids: set):
    """Extract environment stat blocks from environment chunks."""
    content = chunk["content"]
    chunk_id = chunk["id"]
    section = chunk["section"]
    
    lines = content.split("\n")
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Look for #### ENVIRONMENT_NAME
        h4_match = re.match(r"^####\s+(.+)$", line)
        if not h4_match:
            i += 1
            continue
        
        env_name = h4_match.group(1).strip()
        
        # Look for ##### Tier N Type
        j = i + 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        
        if j >= len(lines):
            i += 1
            continue
        
        tier_line = lines[j].strip()
        tier_match = re.match(
            r"^#####\s+Tier\s+(\d)\s+(\w+)",
            tier_line
        )
        if not tier_match:
            i += 1
            continue
        
        tier = int(tier_match.group(1))
        env_type = tier_match.group(2)
        
        # Check this is an environment type, not adversary
        env_types = {"Exploration", "Social", "Traversal", "Event"}
        if env_type not in env_types:
            i += 1
            continue
        
        j += 1
        description = ""
        impulses = ""
        difficulty_str = ""
        potential_adversaries = ""
        features = []
        
        # Skip blank lines
        while j < len(lines) and not lines[j].strip():
            j += 1
        
        # Description
        if j < len(lines) and not lines[j].strip().startswith("#") and not lines[j].strip().startswith("Impulses"):
            description = lines[j].strip()
            j += 1
        
        # Parse remaining fields
        while j < len(lines):
            curr = lines[j].strip()
            
            if not curr:
                j += 1
                continue
            
            if re.match(r"^####\s+", curr) and not curr.startswith("##### FEATURES"):
                break
            
            # Impulses
            imp_match = re.match(r"^Impulses:\s*(.+)$", curr)
            if imp_match:
                impulses = imp_match.group(1).strip()
                j += 1
                continue
            
            # Difficulty (standalone, no pipe-delimited stats)
            diff_match = re.match(r"^Difficulty:\s*(.+)$", curr)
            if diff_match and "|" not in curr:
                difficulty_str = diff_match.group(1).strip()
                j += 1
                continue
            
            # Potential Adversaries
            pa_match = re.match(r"^Potential Adversaries:\s*(.+)$", curr)
            if pa_match:
                potential_adversaries = pa_match.group(1).strip()
                j += 1
                continue
            
            # Features section
            if curr == "##### FEATURES":
                j += 1
                while j < len(lines):
                    feat_line = lines[j].strip()
                    
                    if re.match(r"^#{1,4}\s+", feat_line) and not feat_line.startswith("##### FEATURES"):
                        break
                    
                    feat_match = re.match(
                        r"^(.+?)\s*-\s*(Action|Reaction|Passive):\s*(.+)$",
                        feat_line
                    )
                    if feat_match:
                        feat_name = feat_match.group(1).strip()
                        feat_type = feat_match.group(2)
                        feat_desc = feat_match.group(3).strip()
                        
                        # Check continuation
                        k = j + 1
                        while k < len(lines):
                            next_line = lines[k].strip()
                            if not next_line:
                                break
                            if re.match(r"^#{1,5}\s+", next_line):
                                break
                            if re.match(r"^.+?\s*-\s*(Action|Reaction|Passive):", next_line):
                                break
                            if re.match(r"^####\s+", next_line):
                                break
                            feat_desc += " " + next_line
                            k += 1
                        j = k
                        
                        features.append({
                            "name": feat_name,
                            "type": feat_type,
                            "description": feat_desc,
                        })
                        continue
                    elif feat_line and not feat_line.startswith("#"):
                        # Feature question (plain text, no dash prefix)
                        # Add as a passive feature question
                        if features:
                            # Attach to previous feature as additional context
                            features[-1]["description"] += " " + feat_line
                    
                    j += 1
                continue
            
            j += 1
        
        slug = slugify(env_name)
        entry_id = make_sub_entry_id(chunk_id, slug)
        
        if entry_id in seen_ids:
            counter = 2
            while f"{entry_id}-{counter}" in seen_ids:
                counter += 1
            entry_id = f"{entry_id}-{counter}"
        seen_ids.add(entry_id)
        
        # Parse difficulty as int if possible
        try:
            difficulty_num = int(difficulty_str)
        except ValueError:
            difficulty_num = 0
        
        entry = {
            "id": entry_id,
            "parentChunkId": chunk_id,
            "breadcrumb": f"Running an Adventure > Environments > Tier {tier} > {env_name.title()}",
            "name": env_name.title(),
            "type": "environment",
            "fields": {
                "tier": tier,
                "type": env_type,
                "description": description,
                "impulses": impulses,
                "difficulty": difficulty_num,
                "difficultyRaw": difficulty_str,
                "potentialAdversaries": potential_adversaries,
                "features": features,
            },
            "tags": extract_tags(
                f"{env_name} environment tier {tier} {env_type} {description} {impulses} "
                f"{potential_adversaries} {' '.join(f['name'] for f in features)}"
            ),
            "section": section,
        }
        entries.append(entry)
        
        i = j


# ---------------------------------------------------------------------------
# GM Subsection extraction
# ---------------------------------------------------------------------------

def extract_gm_subsections_from_chunk(chunk: dict, entries: list, seen_ids: set):
    """Extract H3+ subsections from GM mechanics/guidance chunks as sub-entries."""
    content = chunk["content"]
    chunk_id = chunk["id"]
    section = chunk["section"]
    title = chunk["title"]
    
    lines = content.split("\n")
    
    # Find all H3 and H4 headings
    headings = []
    for idx, line in enumerate(lines):
        stripped = line.strip()
        # Match ### or #### headings (H3 or H4)
        heading_match = re.match(r"^(#{3,4})\s+(.+)$", stripped)
        if heading_match:
            level = len(heading_match.group(1))
            heading_text = heading_match.group(2).strip()
            headings.append((idx, level, heading_text))
    
    if not headings:
        return
    
    # For each heading, collect content until the next heading of same or higher level
    for h_idx, (line_idx, level, heading_text) in enumerate(headings):
        # Find end of this section
        end_idx = len(lines)
        for next_h_idx in range(h_idx + 1, len(headings)):
            next_line_idx, next_level, _ = headings[next_h_idx]
            if next_level <= level:
                end_idx = next_line_idx
                break
        else:
            # If there are more headings after, the last heading goes to end
            if h_idx + 1 < len(headings):
                end_idx = headings[h_idx + 1][0]
        
        # Collect content (skip the heading line itself)
        section_lines = lines[line_idx + 1:end_idx]
        section_content = "\n".join(section_lines).strip()
        
        if not section_content or len(section_content) < 20:
            continue
        
        slug = slugify(heading_text)
        entry_id = make_sub_entry_id(chunk_id, slug)
        
        if entry_id in seen_ids:
            counter = 2
            while f"{entry_id}-{counter}" in seen_ids:
                counter += 1
            entry_id = f"{entry_id}-{counter}"
        seen_ids.add(entry_id)
        
        entry = {
            "id": entry_id,
            "parentChunkId": chunk_id,
            "breadcrumb": f"Running an Adventure > {title} > {heading_text.title()}",
            "name": heading_text.title(),
            "type": "subsection",
            "fields": {
                "heading": heading_text,
                "headingLevel": level,
                "content": section_content,
                "contentLength": len(section_content),
            },
            "tags": extract_tags(f"{heading_text} {section_content[:200]}"),
            "section": section,
        }
        entries.append(entry)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"Reading index from: {INDEX_PATH}")
    
    if not INDEX_PATH.exists():
        print(f"ERROR: {INDEX_PATH} not found!")
        sys.exit(1)
    
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    
    print(f"Loaded {len(chunks)} chunks")
    
    entries = []
    seen_ids = set()
    
    # --- Equipment (Weapons, Armor, Loot) ---
    equipment_chunks = [c for c in chunks if "equipment" in c["id"]]
    print(f"\nProcessing {len(equipment_chunks)} equipment chunks...")
    
    # Weapon chunks: parts 1-6
    weapon_chunk_ids = {
        "core-mechanics-equipment-part-1",
        "core-mechanics-equipment-part-2",
        "core-mechanics-equipment-part-3",
        "core-mechanics-equipment-part-4",
        "core-mechanics-equipment-part-5",
        "core-mechanics-equipment-part-6",
    }
    
    for chunk in equipment_chunks:
        if chunk["id"] in weapon_chunk_ids:
            extract_weapons_from_chunk(chunk, entries, seen_ids)
    
    weapon_count = len(entries)
    print(f"  Weapons extracted: {weapon_count}")
    
    # Armor chunks: part 6 has Tier 1 armor (last table), part 7 has Tiers 2-4
    armor_chunk_ids = {
        "core-mechanics-equipment-part-6",
        "core-mechanics-equipment-part-7",
    }
    for chunk in equipment_chunks:
        if chunk["id"] in armor_chunk_ids:
            extract_armor_from_chunk(chunk, entries, seen_ids)
    
    armor_count = len(entries) - weapon_count
    print(f"  Armor extracted: {armor_count}")
    
    # Loot chunks: parts 8-10
    loot_chunk_ids = {
        "core-mechanics-equipment-part-8",
        "core-mechanics-equipment-part-9",
        "core-mechanics-equipment-part-10",
    }
    for chunk in equipment_chunks:
        if chunk["id"] in loot_chunk_ids:
            extract_loot_from_chunk(chunk, entries, seen_ids)
    
    loot_count = len(entries) - weapon_count - armor_count
    print(f"  Loot extracted: {loot_count}")
    
    # --- Adversaries ---
    adv_chunks = [
        c for c in chunks
        if "adversaries-and-environments" in c["id"]
        and c["id"] != "running-an-adventure-adversaries-and-environments-part-1"  # Part 1 is meta/documentation
    ]
    print(f"\nProcessing {len(adv_chunks)} adversary/environment chunks...")
    
    pre_adv = len(entries)
    for chunk in adv_chunks:
        # Parts 2-22 may contain adversaries (17+ also has some mixed in before environments)
        part_match = re.search(r"part-(\d+)", chunk["id"])
        if part_match:
            part_num = int(part_match.group(1))
            if 2 <= part_num <= 22:
                extract_adversaries_from_chunk(chunk, entries, seen_ids)
    
    adv_count = len(entries) - pre_adv
    print(f"  Adversaries extracted: {adv_count}")
    
    # --- Environments ---
    pre_env = len(entries)
    for chunk in adv_chunks:
        part_match = re.search(r"part-(\d+)", chunk["id"])
        if part_match:
            part_num = int(part_match.group(1))
            if 17 <= part_num <= 22:
                extract_environments_from_chunk(chunk, entries, seen_ids)
    
    env_count = len(entries) - pre_env
    print(f"  Environments extracted: {env_count}")
    
    # --- GM Mechanic Subsections ---
    gm_chunk_ids = {
        "running-an-adventure-core-gm-mechanics-part-1",
        "running-an-adventure-core-gm-mechanics-part-2",
        "running-an-adventure-core-gm-mechanics-part-3",
        "running-an-adventure-core-gm-mechanics-part-4",
        "running-an-adventure-gm-guidance",
        "running-an-adventure-additional-gm-guidance",
    }
    gm_chunks = [c for c in chunks if c["id"] in gm_chunk_ids]
    print(f"\nProcessing {len(gm_chunks)} GM mechanic chunks...")
    
    pre_gm = len(entries)
    for chunk in gm_chunks:
        extract_gm_subsections_from_chunk(chunk, entries, seen_ids)
    
    gm_count = len(entries) - pre_gm
    print(f"  GM subsections extracted: {gm_count}")
    
    # --- Summary ---
    print(f"\n{'='*50}")
    print(f"Total sub-entries: {len(entries)}")
    print(f"  Weapons:      {weapon_count}")
    print(f"  Armor:        {armor_count}")
    print(f"  Loot:         {loot_count}")
    print(f"  Adversaries:  {adv_count}")
    print(f"  Environments: {env_count}")
    print(f"  GM sections:  {gm_count}")
    
    # Type distribution
    type_counts = {}
    for e in entries:
        t = e["type"]
        type_counts[t] = type_counts.get(t, 0) + 1
    print(f"\nType distribution: {type_counts}")
    
    # Build output envelope
    output = {
        "version": VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "entries": entries,
    }
    
    # Write output
    print(f"\nWriting to: {OUTPUT_PATH}")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"Done! {OUTPUT_PATH.stat().st_size / 1024:.1f} KB written")


if __name__ == "__main__":
    main()
