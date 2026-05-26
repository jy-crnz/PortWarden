import requests
import time

url = "http://127.0.0.1:8000/api/v1/ai-assessment/"
payload = {"devices": [{"ip": "192.168.1.1"}]}  # Dummy data

for i in range(5):
    response = requests.post(url, json=payload)
    print(f"Request {i + 1}: Status {response.status_code}")
    time.sleep(0.5)  # Fast sequence
