import re
from typing import List, Optional


def normalize_cfr(cfr: Optional[str]) -> str:
    """
    Normalize CFR string for comparison.

    Examples:
    "21 CFR 211.22(a)" -> "21122a"
    "211.22(a)" -> "21122a"
    "211" -> "211"
    """
    if not cfr:
        return ""

    cfr = cfr.lower().strip()

    # remove "21 cfr"
    cfr = re.sub(r"21\s*cfr\s*", "", cfr).strip()

    # remove all non-alphanumeric
    cfr = re.sub(r"[^0-9a-z]", "", cfr)

    # "21 CFR Part 211.22(a)" → "part21122a" after alnum pass; strip literal "part" before section digits
    m = re.match(r"^part(\d.*)$", cfr)
    if m:
        cfr = m.group(1)

    return cfr


def cfr_match(output_cfr: Optional[str], candidates: List[str]) -> bool:
    """
    Flexible CFR matching:
    - normalized comparison
    - allows partial match (211 matches 21122a)
    """

    if not output_cfr or not candidates:
        return False

    norm_out = normalize_cfr(output_cfr)

    for c in candidates:
        norm_c = normalize_cfr(c)

        if (
            norm_out == norm_c
            or norm_out in norm_c
            or norm_c in norm_out
        ):
            return True

    return False
