def route_status(risk: str) -> str:
    if risk == "HIGH":
        return "UNSAFE"
    elif risk == "MEDIUM":
        return "CAUTION"
    return "SAFE"
