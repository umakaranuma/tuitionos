import os, requests

def send_sms(to: str, message: str) -> dict:
    api_key = os.environ.get('DIALOG_SMS_API_KEY')
    api_url = os.environ.get('DIALOG_SMS_API_URL', 'https://sms.dialog.lk/api/v2/send')
    response = requests.post(api_url, json={'to': to, 'message': message, 'api_key': api_key})
    response.raise_for_status()
    return response.json()
