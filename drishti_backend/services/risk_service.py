# ============================================
# DRISHTI — Weighted Risk Scoring System v2
# ============================================
# Transparent, explainable scoring (0–100 points).
#
# Factor Weights (rebalanced):
#   Distance from calamity : 30 points
#   Weather (rainfall)     : 25 points
#   Calamity severity      : 15 points
#   Time factor            : 10 points
#   Wind bonus             : up to +5
#
# Thresholds (widened):
#   0–35   → LOW
#   36–60  → MEDIUM
#   61–100 → HIGH
# ============================================

CALAMITY_SEVERITY = {
    "flood": 15,
    "collapse": 12,
    "accident": 8,
    "unknown": 4,
}


def _distance_score(distance_km):
    """Score 0–30 based on proximity. Closer = more dangerous."""
    if distance_km < 0.5:
        return 30
    elif distance_km < 1.5:
        return 22
    elif distance_km < 3:
        return 15
    elif distance_km < 5:
        return 8
    elif distance_km < 8:
        return 3
    else:
        return 0


def _rainfall_score(rainfall_mm):
    """Score 0–25 based on rainfall intensity (mm/hr from weather API)."""
    if rainfall_mm > 50:
        return 25
    elif rainfall_mm > 30:
        return 20
    elif rainfall_mm > 15:
        return 14
    elif rainfall_mm > 5:
        return 8
    elif rainfall_mm > 0:
        return 3
    else:
        return 0


def _calamity_score(calamity):
    """Score 0–15 based on inherent severity of the calamity type."""
    return CALAMITY_SEVERITY.get(calamity, 4)


def _time_score(time_min):
    """Score 0–10. Lower time = closer encounter = more danger."""
    if time_min < 15:
        return 10
    elif time_min < 30:
        return 8
    elif time_min < 60:
        return 5
    elif time_min < 120:
        return 3
    else:
        return 1


def predict_risk(rainfall, distance, time_min, calamity, wind_speed=0):
    """
    Calculate risk using a weighted scoring system (0–100).
    Returns a dict with the risk level and score breakdown.
    """
    d_score = _distance_score(distance)
    r_score = _rainfall_score(rainfall)
    c_score = _calamity_score(calamity)
    t_score = _time_score(time_min)

    # Bonus: wind amplification (up to +5 for extreme wind)
    wind_bonus = 0
    if wind_speed > 15 and calamity in ("flood", "collapse"):
        wind_bonus = 5
    elif wind_speed > 10:
        wind_bonus = 2

    total = d_score + r_score + c_score + t_score + wind_bonus
    total = min(total, 100)

    # Determine risk level (widened thresholds)
    if total >= 61:
        risk = "HIGH"
    elif total >= 36:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return {
        "risk": risk,
        "score": total,
        "breakdown": {
            "distance": d_score,
            "rainfall": r_score,
            "calamity_severity": c_score,
            "time": t_score,
            "wind_bonus": wind_bonus,
        }
    }
