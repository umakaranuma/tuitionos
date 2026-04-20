import os, requests

def send_whatsapp_message(to: str, template_name: str, components: list) -> dict:
    token = os.environ.get('META_WHATSAPP_API_TOKEN')
    phone_id = os.environ.get('META_PHONE_NUMBER_ID')
    url = f'https://graph.facebook.com/v19.0/{phone_id}/messages'
    payload = {
        'messaging_product': 'whatsapp',
        'to': to,
        'type': 'template',
        'template': {'name': template_name, 'language': {'code': 'en'}, 'components': components},
    }
    response = requests.post(url, json=payload, headers={'Authorization': f'Bearer {token}'})
    response.raise_for_status()
    return response.json()
