import requests

def chat_with_gpt(prompt):
    url = "https://api.puter.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "model": "gpt-4o",  # Free and fast model
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post(url, headers=headers, json=data)

    if response.status_code == 200:
        return response.json()['choices'][0]['message']['content'].strip()
    else:
        return f"❌ Error {response.status_code}: {response.text}"

# Example usage
user_prompt = "Explain the difference between list and tuple in Python."\
reply = chat_with_gpt(user_prompt)
print("GPT-4o:", reply)