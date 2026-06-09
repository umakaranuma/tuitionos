"""Backfill InvoicePayment rows for invoices paid before the per-payment
model existed.

For each invoice with paid_amount > 0 and fewer recorded payments than its
paid total, reconstruct the individual transfers from the InvoiceActivity log
(payment_recorded / advance_applied / marked_paid entries). Any remaining
unaccounted amount becomes a single reconstructed payment so the displayed
records always add up to paid_amount.

Run:  python manage.py backfill_invoice_payments
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.billing.models import Invoice, InvoiceActivity, InvoicePayment

SOURCE_ACTIONS = [
    InvoiceActivity.ACTION_PAYMENT_RECORDED,
    InvoiceActivity.ACTION_ADVANCE_APPLIED,
    InvoiceActivity.ACTION_MARKED_PAID,
]


class Command(BaseCommand):
    help = "Reconstruct InvoicePayment rows for invoices paid before the model existed."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing.")

    def handle(self, *args, **opts):
        dry = opts["dry_run"]
        created_total = 0
        touched = 0

        for inv in Invoice.objects.filter(paid_amount__gt=0).select_related("institute"):
            paid = Decimal(str(inv.paid_amount or 0))
            existing = sum((Decimal(str(p.amount)) for p in inv.payments.all()), Decimal("0"))
            remaining = paid - existing
            if remaining <= 0:
                continue

            touched += 1
            self.stdout.write(
                f"Invoice {inv.id} ({inv.institute.name}, {inv.month:%b %Y}): "
                f"paid={paid} existing_records={existing} -> reconstructing {remaining}"
            )

            new_rows = []  # (amount, reference, actor, is_advance, created_at)
            acc = Decimal("0")
            acts = inv.activities.filter(action__in=SOURCE_ACTIONS).order_by("created_at")
            for a in acts:
                if acc >= remaining:
                    break
                amt = Decimal(str(a.amount_snapshot or 0))
                if amt <= 0:
                    continue
                amt = min(amt, remaining - acc)
                is_adv = a.action == InvoiceActivity.ACTION_ADVANCE_APPLIED
                ref = a.detail[:200] if a.detail else ("Advance carried" if is_adv else "Reconstructed from activity log")
                new_rows.append((amt, ref, a.actor or "Admin", is_adv, a.created_at))
                acc += amt

            # Any amount the activity log didn't explain → one reconstructed entry.
            if acc < remaining:
                new_rows.append((remaining - acc, "Reconstructed from prior paid total", "System", False, inv.created_at))

            for amt, ref, actor, is_adv, when in new_rows:
                self.stdout.write(f"    + payment LKR {amt}  ({ref})")
                if not dry:
                    p = InvoicePayment.objects.create(
                        invoice=inv,
                        institute=inv.institute,
                        amount=amt,
                        slip=None,
                        reference_note=ref,
                        actor=actor,
                        is_advance=is_adv,
                        source_month=None,
                    )
                    # Preserve the original timestamp (auto_now_add ignores it on create).
                    InvoicePayment.objects.filter(pk=p.pk).update(created_at=when)
                created_total += 1

        # Attach existing invoice.payment_slip to the earliest payment that has no slip.
        if not dry:
            with transaction.atomic():
                for inv in Invoice.objects.filter(paid_amount__gt=0).exclude(payment_slip="").exclude(payment_slip=None):
                    first = inv.payments.filter(slip__in=["", None]).order_by("created_at").first()
                    if first and not first.slip:
                        first.slip = inv.payment_slip
                        first.save(update_fields=["slip"])

        verb = "Would create" if dry else "Created"
        self.stdout.write(self.style.SUCCESS(f"{verb} {created_total} payment record(s) across {touched} invoice(s)."))
