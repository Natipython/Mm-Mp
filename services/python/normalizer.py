"""
Amharic Fidel Normalizer for MenuMini
Handles Ethiopic homophone canonicalization, punctuation folding, and whitespace normalization.
"""

FIDEL_HOMOPHONES = {
    'ሐ': 'ሀ', 'ኀ': 'ሀ', 'ሗ': 'ኋ',
    'ሠ': 'ሰ', 'ሡ': 'ሱ', 'ሢ': 'ሲ', 'ሣ': 'ሳ', 'ሤ': 'ሴ', 'ሥ': 'ስ', 'ሦ': 'ሶ',
    'ዐ': 'አ', 'ዑ': 'ኡ', 'ዒ': 'ኢ', 'ዓ': 'ኣ', 'ዔ': 'ኤ', 'ዕ': 'እ', 'ዖ': 'ኦ',
    'ፀ': 'ጸ', 'ፁ': 'ጹ', 'ፂ': 'ጺ', 'ፃ': 'ጻ', 'ፄ': 'ጼ', 'ፅ': 'ጽ', 'ፆ': 'ጾ',
}

PUNCTUATION_MAP = {
    '፡': ' ',  # Ethiopian word space
    '፣': ',',  # Ethiopian comma
    '፤': ';',  # Ethiopian semicolon
    '።': '.',  # Ethiopian full stop
    '፦': ':',  # Ethiopian colon / preface
    '፧': '?',  # Ethiopian question mark
}

def normalize_amharic(text: str) -> str:
    """
    Canonicalizes Amharic Fidel characters, normalizes Ethiopian punctuation,
    and strips redundant whitespace.
    """
    if not text:
        return ""
    
    chars = []
    for ch in str(text):
        if ch in FIDEL_HOMOPHONES:
            chars.append(FIDEL_HOMOPHONES[ch])
        elif ch in PUNCTUATION_MAP:
            chars.append(PUNCTUATION_MAP[ch])
        else:
            chars.append(ch)
            
    # Collapse multiple spaces and trim
    result = "".join(chars)
    import re
    return re.sub(r'\s+', ' ', result).strip()
