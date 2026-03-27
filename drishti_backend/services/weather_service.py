import requests

API_KEY = "af8c0397a66c9cbc2cd6e2525fe388a1"

def get_weather(lat: float, lon: float):
    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
    )

    response = requests.get(url)
    data = response.json()

    rainfall = 0
    if "rain" in data:
        rainfall = data["rain"].get("1h", 0)

    wind_speed = data["wind"]["speed"]

    return rainfall, wind_speed
