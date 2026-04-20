from django.template.loader import render_to_string

def generate_timetable_pdf(batch) -> bytes:
    html = render_to_string('pdfs/timetable.html', {'batch': batch})
    return html.encode()  # TODO: WeasyPrint

def generate_fee_report_pdf(institute, month) -> bytes:
    html = render_to_string('pdfs/fee_report.html', {'institute': institute, 'month': month})
    return html.encode()

def generate_fee_receipt_pdf(fee_payment) -> bytes:
    html = render_to_string('pdfs/fee_receipt.html', {'payment': fee_payment})
    return html.encode()
