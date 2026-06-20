import json
import urllib.request


request = urllib.request.Request("http://localhost:8000/demo/seed", method="POST")
with urllib.request.urlopen(request) as response:
    print(json.dumps(json.load(response), ensure_ascii=False, indent=2))
