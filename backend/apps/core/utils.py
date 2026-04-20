def format_lkr(amount: float) -> str:
    return f'LKR {amount:,.2f}'

def get_current_academic_year() -> int:
    from django.utils import timezone
    return timezone.now().year
