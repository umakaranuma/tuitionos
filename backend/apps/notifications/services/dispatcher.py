from .whatsapp import send_whatsapp_message
from .sms import send_sms

def dispatch_notification(student, template_name: str, components: list, sms_fallback: str):
    if student.has_whatsapp:
        return send_whatsapp_message(student.parent_mobile, template_name, components)
    return send_sms(student.parent_mobile, sms_fallback)
