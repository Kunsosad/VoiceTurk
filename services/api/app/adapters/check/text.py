import re
import unicodedata


def normalize_vietnamese_text(value: str) -> list[str]:
    normalized = unicodedata.normalize("NFC", value).lower()
    return re.findall(r"[^\W_]+", normalized, flags=re.UNICODE)


def compute_wer(reference: str, hypothesis: str) -> float:
    """Word error rate using Levenshtein distance; only call with a real ASR hypothesis."""
    expected, actual = normalize_vietnamese_text(reference), normalize_vietnamese_text(hypothesis)
    if not expected:
        return 0.0 if not actual else 1.0
    previous = list(range(len(actual) + 1))
    for i, ref_word in enumerate(expected, 1):
        current = [i]
        for j, hyp_word in enumerate(actual, 1):
            current.append(min(current[-1] + 1, previous[j] + 1,
                               previous[j - 1] + (ref_word != hyp_word)))
        previous = current
    return previous[-1] / len(expected)
