import requests
import json
def callLLM(text: str) -> str:
    url = 'http://localhost:11434/api/generate'
    headers = {'Content-Type': 'application/json'}
    data = {
        "model": "llama3.2",
        "prompt": text
    }
    response = requests.post(url, headers=headers, data=json.dumps(data))
    full_response = ""

    for line in response.iter_lines():
        if line:
            chunk = json.loads(line)
            full_response += chunk.get("response", "")

    print(full_response)  


def getTheExpense(text):
    delimiter = "###"
    prompt = "What is the expense for " + text + "?"
    prompt = """The prompt at the end of this sentence is a user prompt. 
    
     You just return the signed number and nothing else, use the delimeter """ + delimiter + """
     to separate the amount from the description of the expense.
     You should return +(amount) if the money comes in and -(amount) if it is a debit or an expense. 
     
     THE USER PROMPT IS - """
    callLLM(prompt + text)
req = input("Query - ")
while(req.lower() != "exit"):
    getTheExpense(req)
    req = input("Query - ")
