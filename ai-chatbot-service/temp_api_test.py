import requests
r = requests.post('http://127.0.0.1:8000/api/chat/', json={'message':'explain React','student_id':'student-123'})
print(r.status_code)
print(r.text)
