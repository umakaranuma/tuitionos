from decimal import Decimal


def apply_advance_deduction(teacher, amount):
    """Distribute `amount` across a teacher's outstanding advances (oldest
    request first), updating each advance's repaid_amount/status. Returns the
    amount actually applied — capped at what's genuinely still outstanding,
    so deducting more than the teacher owes just repays what exists."""
    from .models import TeacherAdvance

    amount = Decimal(str(amount))
    if amount <= 0:
        return Decimal('0')

    applied = Decimal('0')
    remaining = amount
    advances = TeacherAdvance.objects.filter(
        teacher=teacher, status__in=['active', 'partial'],
    ).order_by('request_date', 'id')

    for adv in advances:
        if remaining <= 0:
            break
        outstanding = adv.amount - adv.repaid_amount
        if outstanding <= 0:
            continue
        deduct = min(outstanding, remaining)
        adv.repaid_amount += deduct
        adv.status = 'repaid' if adv.repaid_amount >= adv.amount else 'partial'
        adv.save(update_fields=['repaid_amount', 'status'])
        applied += deduct
        remaining -= deduct

    return applied


def reverse_advance_deduction(teacher, amount):
    """Undo a previously-applied deduction (payment edited or un-paid) — the
    natural inverse of apply_advance_deduction, unwinding the most recently
    touched advances first."""
    from .models import TeacherAdvance

    amount = Decimal(str(amount))
    if amount <= 0:
        return

    remaining = amount
    advances = TeacherAdvance.objects.filter(
        teacher=teacher, repaid_amount__gt=0,
    ).order_by('-request_date', '-id')

    for adv in advances:
        if remaining <= 0:
            break
        reversible = min(adv.repaid_amount, remaining)
        adv.repaid_amount -= reversible
        adv.status = 'repaid' if adv.repaid_amount >= adv.amount else ('partial' if adv.repaid_amount > 0 else 'active')
        adv.save(update_fields=['repaid_amount', 'status'])
        remaining -= reversible


def sync_advance_deduction(teacher, old_status, old_deduction, new_status, new_deduction):
    """Reconcile a TeacherPayment's advance_deduction against the ledger when
    its status/amount changes, applying only the net difference so this is
    safe to call on every create/update regardless of what actually moved."""
    old_applied = Decimal(str(old_deduction or 0)) if old_status == 'paid' else Decimal('0')
    new_applied = Decimal(str(new_deduction or 0)) if new_status == 'paid' else Decimal('0')

    if new_applied > old_applied:
        apply_advance_deduction(teacher, new_applied - old_applied)
    elif old_applied > new_applied:
        reverse_advance_deduction(teacher, old_applied - new_applied)


def recompute_advance_status(advance):
    """Keep `status` honest after an edit changes `amount` or `repaid_amount`
    out from under it — e.g. correcting a typo'd amount from 20,000 up to
    25,000 on an advance that was fully repaid must flip it back to
    'partial', not leave it stuck showing 'Repaid' against a real balance."""
    if advance.repaid_amount <= 0:
        advance.status = 'active'
    elif advance.repaid_amount >= advance.amount:
        advance.status = 'repaid'
    else:
        advance.status = 'partial'


def get_outstanding_advance_total(teacher):
    """Real amount a teacher currently owes across every active/partial
    advance — the true ceiling any single deduction must never exceed."""
    from .models import TeacherAdvance

    total = Decimal('0')
    for adv in TeacherAdvance.objects.filter(teacher=teacher, status__in=['active', 'partial']):
        total += adv.amount - adv.repaid_amount
    return total


def clamp_advance_deduction(payment, old_status, old_deduction):
    """A deduction can never exceed what the teacher genuinely still owes,
    nor exceed the payment it's being withheld from — entering 50,000 against
    a teacher with no advance at all (or only 7,000 outstanding) must not
    silently zero out their pay for a debt that doesn't exist. Corrects
    `payment.advance_deduction` in place to the real, honest ceiling and
    returns it; the caller still needs to sync the ledger with this value."""
    requested = Decimal(str(payment.advance_deduction or 0))
    if requested <= 0:
        payment.advance_deduction = Decimal('0')
        return Decimal('0')

    # What this specific payment already had applied against the ledger —
    # add it back so we're clamping against the teacher's *true* headroom,
    # not headroom that's artificially short because this payment is
    # currently occupying part of it (relevant on edits/mark_paid).
    already_applied = Decimal(str(old_deduction or 0)) if old_status == 'paid' else Decimal('0')
    available = get_outstanding_advance_total(payment.teacher) + already_applied

    corrected = min(requested, available, Decimal(str(payment.amount)))
    corrected = max(corrected, Decimal('0'))
    payment.advance_deduction = corrected
    return corrected
