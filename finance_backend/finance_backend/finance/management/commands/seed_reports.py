"""
Django Management Command — Seed May 2026 Test Data
=====================================================
Place this file at:
  finance/management/commands/seed_reports.py

Make sure finance/ has a management/commands/ folder with __init__.py files:
  finance/
    management/
      __init__.py
      commands/
        __init__.py
        seed_reports.py

Then run (from the folder containing manage.py):
  python manage.py seed_reports

To wipe and re-seed cleanly:
  python manage.py seed_reports --clear
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
import decimal

from finance.models import DailyReport, IncomeEntry, ExpenseEntry

User = get_user_model()

# The seed data below uses a couple of category labels ("Food", "Equipment")
# that aren't in DailyReport's CATEGORY_CHOICES. Map them onto real ones.
CATEGORY_MAP = {
    'Food': 'Food & kitchen',
    'Equipment': 'Other expenses',
}

SEED_DATA = [
    {
        "date": "2026-05-01",
        "income_entries": [
            {"label": "Balance b/f", "amount": 850000, "order": 0},
            {"label": "Withdrawal",  "amount": 1200000, "order": 1},
            {"label": "Collections", "amount": 340000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Sports",    "item": "Football jerseys",  "qty": 10, "unit_price": 45000,  "order": 0},
            {"category": "Sports",    "item": "Training cones",    "qty": 20, "unit_price": 8000,   "order": 1},
            {"category": "Transport", "item": "Fuel",              "qty": 30, "unit_price": 5200,   "order": 2},
            {"category": "Utilities", "item": "Electricity bill",  "qty": 1,  "unit_price": 180000, "order": 3},
        ],
    },
    {
        "date": "2026-05-02",
        "income_entries": [
            {"label": "Balance b/f", "amount": 526000,  "order": 0},
            {"label": "Withdrawal",  "amount": 900000,  "order": 1},
            {"label": "Collections", "amount": 210000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Salaries",  "item": "Part-time coach", "qty": 1,  "unit_price": 350000, "order": 0},
            {"category": "Sports",    "item": "Footballs",        "qty": 5,  "unit_price": 55000,  "order": 1},
            {"category": "Food",      "item": "Team lunch",       "qty": 22, "unit_price": 12000,  "order": 2},
        ],
    },
    {
        "date": "2026-05-03",
        "income_entries": [
            {"label": "Balance b/f", "amount": 436000, "order": 0},
            {"label": "Withdrawal",  "amount": 750000, "order": 1},
            {"label": "Collections", "amount": 185000, "order": 2},
        ],
        "expense_entries": [
            {"category": "Equipment", "item": "Goal nets",    "qty": 2, "unit_price": 120000, "order": 0},
            {"category": "Transport", "item": "Bus hire",     "qty": 1, "unit_price": 250000, "order": 1},
            {"category": "Medical",   "item": "First aid kit","qty": 2, "unit_price": 45000,  "order": 2},
        ],
    },
    {
        "date": "2026-05-05",
        "income_entries": [
            {"label": "Balance b/f", "amount": 711000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1500000, "order": 1},
            {"label": "Collections", "amount": 420000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Salaries",  "item": "Head coach salary",  "qty": 1, "unit_price": 800000, "order": 0},
            {"category": "Salaries",  "item": "Assistant coach",     "qty": 1, "unit_price": 450000, "order": 1},
            {"category": "Utilities", "item": "Water bill",          "qty": 1, "unit_price": 65000,  "order": 2},
            {"category": "Sports",    "item": "Whistles & flags",    "qty": 5, "unit_price": 15000,  "order": 3},
        ],
    },
    {
        "date": "2026-05-06",
        "income_entries": [
            {"label": "Balance b/f", "amount": 596000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1100000, "order": 1},
            {"label": "Collections", "amount": 295000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Equipment", "item": "Bibs (training vests)", "qty": 25, "unit_price": 18000, "order": 0},
            {"category": "Transport", "item": "Fuel",                   "qty": 25, "unit_price": 5200,  "order": 1},
            {"category": "Food",      "item": "Drinks & snacks",        "qty": 30, "unit_price": 5000,  "order": 2},
        ],
    },
    {
        "date": "2026-05-07",
        "income_entries": [
            {"label": "Balance b/f", "amount": 821000, "order": 0},
            {"label": "Withdrawal",  "amount": 650000, "order": 1},
            {"label": "Collections", "amount": 175000, "order": 2},
        ],
        "expense_entries": [
            {"category": "Medical",   "item": "Physiotherapy session", "qty": 3, "unit_price": 80000,  "order": 0},
            {"category": "Utilities", "item": "Internet bill",          "qty": 1, "unit_price": 120000, "order": 1},
            {"category": "Sports",    "item": "Pump & needles",         "qty": 3, "unit_price": 12000,  "order": 2},
        ],
    },
    {
        "date": "2026-05-08",
        "income_entries": [
            {"label": "Balance b/f", "amount": 946000,  "order": 0},
            {"label": "Withdrawal",  "amount": 2000000, "order": 1},
            {"label": "Collections", "amount": 510000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Salaries",  "item": "Admin staff",        "qty": 2,  "unit_price": 300000, "order": 0},
            {"category": "Equipment", "item": "Scoreboard repair",  "qty": 1,  "unit_price": 180000, "order": 1},
            {"category": "Transport", "item": "Team bus fuel",      "qty": 40, "unit_price": 5200,   "order": 2},
            {"category": "Food",      "item": "Match day catering", "qty": 50, "unit_price": 15000,  "order": 3},
        ],
    },
    {
        "date": "2026-05-09",
        "income_entries": [
            {"label": "Balance b/f", "amount": 776000, "order": 0},
            {"label": "Withdrawal",  "amount": 850000, "order": 1},
            {"label": "Collections", "amount": 230000, "order": 2},
        ],
        "expense_entries": [
            {"category": "Sports",    "item": "Volleyball net",    "qty": 1,  "unit_price": 95000, "order": 0},
            {"category": "Utilities", "item": "Generator fuel",    "qty": 20, "unit_price": 5500,  "order": 1},
            {"category": "Medical",   "item": "Pain relief spray", "qty": 6,  "unit_price": 22000, "order": 2},
        ],
    },
    {
        "date": "2026-05-10",
        "income_entries": [
            {"label": "Balance b/f", "amount": 534000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1800000, "order": 1},
            {"label": "Collections", "amount": 380000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Salaries",  "item": "Groundsman",            "qty": 1, "unit_price": 250000, "order": 0},
            {"category": "Equipment", "item": "Lawn mower service",    "qty": 1, "unit_price": 150000, "order": 1},
            {"category": "Sports",    "item": "Athletics spikes",      "qty": 8, "unit_price": 65000,  "order": 2},
            {"category": "Transport", "item": "Away match transport",  "qty": 1, "unit_price": 320000, "order": 3},
        ],
    },
    {
        "date": "2026-05-12",
        "income_entries": [
            {"label": "Balance b/f", "amount": 892000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1300000, "order": 1},
            {"label": "Collections", "amount": 445000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Food",      "item": "Team breakfast",   "qty": 25, "unit_price": 10000, "order": 0},
            {"category": "Utilities", "item": "Phone bill",       "qty": 1,  "unit_price": 85000, "order": 1},
            {"category": "Sports",    "item": "Swimming goggles", "qty": 12, "unit_price": 25000, "order": 2},
        ],
    },
    {
        "date": "2026-05-13",
        "income_entries": [
            {"label": "Balance b/f", "amount": 1102000, "order": 0},
            {"label": "Withdrawal",  "amount": 700000,  "order": 1},
            {"label": "Collections", "amount": 198000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Equipment", "item": "Stopwatches",             "qty": 4,  "unit_price": 35000, "order": 0},
            {"category": "Medical",   "item": "Sports tape & bandages",  "qty": 10, "unit_price": 18000, "order": 1},
            {"category": "Transport", "item": "Fuel",                    "qty": 20, "unit_price": 5200,  "order": 2},
        ],
    },
    {
        "date": "2026-05-14",
        "income_entries": [
            {"label": "Balance b/f", "amount": 667000,  "order": 0},
            {"label": "Withdrawal",  "amount": 2500000, "order": 1},
            {"label": "Collections", "amount": 620000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Salaries",  "item": "Head coach (2nd half)",  "qty": 1,  "unit_price": 800000, "order": 0},
            {"category": "Salaries",  "item": "Medical officer",         "qty": 1,  "unit_price": 550000, "order": 1},
            {"category": "Equipment", "item": "Dumbbell set",            "qty": 1,  "unit_price": 380000, "order": 2},
            {"category": "Food",      "item": "Post-match meal",         "qty": 30, "unit_price": 18000,  "order": 3},
            {"category": "Utilities", "item": "Electricity top-up",      "qty": 1,  "unit_price": 200000, "order": 4},
        ],
    },
    {
        "date": "2026-05-15",
        "income_entries": [
            {"label": "Balance b/f", "amount": 739000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1050000, "order": 1},
            {"label": "Collections", "amount": 310000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Sports",    "item": "Basketball", "qty": 4,  "unit_price": 78000, "order": 0},
            {"category": "Transport", "item": "Fuel",       "qty": 35, "unit_price": 5200,  "order": 1},
            {"category": "Medical",   "item": "Ice packs",  "qty": 20, "unit_price": 8000,  "order": 2},
        ],
    },
    {
        "date": "2026-05-16",
        "income_entries": [
            {"label": "Balance b/f", "amount": 527000, "order": 0},
            {"label": "Withdrawal",  "amount": 900000, "order": 1},
            {"label": "Collections", "amount": 265000, "order": 2},
        ],
        "expense_entries": [
            {"category": "Equipment", "item": "Gym equipment maintenance", "qty": 1,  "unit_price": 220000, "order": 0},
            {"category": "Utilities", "item": "Water & sewage",            "qty": 1,  "unit_price": 75000,  "order": 1},
            {"category": "Food",      "item": "Hydration drinks",          "qty": 48, "unit_price": 4500,   "order": 2},
        ],
    },
    {
        "date": "2026-05-17",
        "income_entries": [
            {"label": "Balance b/f", "amount": 183000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1600000, "order": 1},
            {"label": "Collections", "amount": 490000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Sports",    "item": "Relay batons",              "qty": 8,  "unit_price": 15000, "order": 0},
            {"category": "Sports",    "item": "Shot put balls",            "qty": 4,  "unit_price": 85000, "order": 1},
            {"category": "Transport", "item": "Charter bus (tournament)",  "qty": 1,  "unit_price": 450000,"order": 2},
            {"category": "Medical",   "item": "Glucose sachets",           "qty": 30, "unit_price": 3500,  "order": 3},
        ],
    },
    {
        "date": "2026-05-19",
        "income_entries": [
            {"label": "Balance b/f", "amount": 614000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1250000, "order": 1},
            {"label": "Collections", "amount": 350000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Salaries",  "item": "Referees (weekend)",    "qty": 3,  "unit_price": 80000, "order": 0},
            {"category": "Equipment", "item": "Cones & markers",       "qty": 30, "unit_price": 6000,  "order": 1},
            {"category": "Food",      "item": "Referee refreshments",  "qty": 3,  "unit_price": 15000, "order": 2},
            {"category": "Utilities", "item": "Generator fuel",        "qty": 15, "unit_price": 5500,  "order": 3},
        ],
    },
    {
        "date": "2026-05-20",
        "income_entries": [
            {"label": "Balance b/f", "amount": 880000, "order": 0},
            {"label": "Withdrawal",  "amount": 750000, "order": 1},
            {"label": "Collections", "amount": 215000, "order": 2},
        ],
        "expense_entries": [
            {"category": "Sports",    "item": "Netball",          "qty": 3,  "unit_price": 60000, "order": 0},
            {"category": "Transport", "item": "Fuel",             "qty": 25, "unit_price": 5200,  "order": 1},
            {"category": "Medical",   "item": "Muscle rub cream", "qty": 8,  "unit_price": 16000, "order": 2},
        ],
    },
    {
        "date": "2026-05-21",
        "income_entries": [
            {"label": "Balance b/f", "amount": 995000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1100000, "order": 1},
            {"label": "Collections", "amount": 390000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Equipment", "item": "Treadmill belt replacement", "qty": 1, "unit_price": 280000, "order": 0},
            {"category": "Salaries",  "item": "Nutritionist",               "qty": 1, "unit_price": 400000, "order": 1},
            {"category": "Food",      "item": "Protein supplements",        "qty": 5, "unit_price": 85000,  "order": 2},
            {"category": "Utilities", "item": "Internet renewal",           "qty": 1, "unit_price": 120000, "order": 3},
        ],
    },
    {
        "date": "2026-05-22",
        "income_entries": [
            {"label": "Balance b/f", "amount": 405000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1400000, "order": 1},
            {"label": "Collections", "amount": 475000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Sports",    "item": "Cricket bat",         "qty": 2,  "unit_price": 120000, "order": 0},
            {"category": "Sports",    "item": "Cricket pads",        "qty": 4,  "unit_price": 65000,  "order": 1},
            {"category": "Transport", "item": "Fuel",                "qty": 30, "unit_price": 5200,   "order": 2},
            {"category": "Medical",   "item": "Vitamin supplements", "qty": 25, "unit_price": 12000,  "order": 3},
        ],
    },
    {
        "date": "2026-05-23",
        "income_entries": [
            {"label": "Balance b/f", "amount": 744000, "order": 0},
            {"label": "Withdrawal",  "amount": 950000, "order": 1},
            {"label": "Collections", "amount": 280000, "order": 2},
        ],
        "expense_entries": [
            {"category": "Equipment", "item": "Locker room repairs", "qty": 1,  "unit_price": 195000, "order": 0},
            {"category": "Utilities", "item": "Electricity bill",    "qty": 1,  "unit_price": 190000, "order": 1},
            {"category": "Food",      "item": "Team dinner",         "qty": 28, "unit_price": 22000,  "order": 2},
        ],
    },
    {
        "date": "2026-05-24",
        "income_entries": [
            {"label": "Balance b/f", "amount": 309000,  "order": 0},
            {"label": "Withdrawal",  "amount": 2200000, "order": 1},
            {"label": "Collections", "amount": 560000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Salaries",  "item": "Head coach salary",  "qty": 1, "unit_price": 800000, "order": 0},
            {"category": "Salaries",  "item": "Assistant coaches",  "qty": 2, "unit_price": 450000, "order": 1},
            {"category": "Salaries",  "item": "Admin officer",      "qty": 1, "unit_price": 350000, "order": 2},
            {"category": "Transport", "item": "Tournament transport","qty": 1, "unit_price": 380000, "order": 3},
        ],
    },
    {
        "date": "2026-05-26",
        "income_entries": [
            {"label": "Balance b/f", "amount": 529000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1150000, "order": 1},
            {"label": "Collections", "amount": 330000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Sports",    "item": "Table tennis set",     "qty": 2, "unit_price": 95000, "order": 0},
            {"category": "Equipment", "item": "Safety padding (gym)", "qty": 4, "unit_price": 55000, "order": 1},
            {"category": "Medical",   "item": "Antiseptic solution",  "qty": 5, "unit_price": 18000, "order": 2},
            {"category": "Utilities", "item": "Water top-up",         "qty": 1, "unit_price": 70000, "order": 3},
        ],
    },
    {
        "date": "2026-05-27",
        "income_entries": [
            {"label": "Balance b/f", "amount": 672000, "order": 0},
            {"label": "Withdrawal",  "amount": 800000, "order": 1},
            {"label": "Collections", "amount": 240000, "order": 2},
        ],
        "expense_entries": [
            {"category": "Transport", "item": "Fuel",           "qty": 28, "unit_price": 5200,  "order": 0},
            {"category": "Food",      "item": "Training snacks","qty": 35, "unit_price": 6000,  "order": 1},
            {"category": "Sports",    "item": "Jump rope set",  "qty": 15, "unit_price": 12000, "order": 2},
        ],
    },
    {
        "date": "2026-05-28",
        "income_entries": [
            {"label": "Balance b/f", "amount": 858000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1700000, "order": 1},
            {"label": "Collections", "amount": 415000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Salaries",  "item": "Security guard",         "qty": 1,  "unit_price": 280000, "order": 0},
            {"category": "Equipment", "item": "CCTV maintenance",       "qty": 1,  "unit_price": 160000, "order": 1},
            {"category": "Medical",   "item": "Dental check-up (team)", "qty": 5,  "unit_price": 45000,  "order": 2},
            {"category": "Utilities", "item": "Phone & internet",       "qty": 1,  "unit_price": 195000, "order": 3},
            {"category": "Food",      "item": "End of week meal",       "qty": 30, "unit_price": 20000,  "order": 4},
        ],
    },
    {
        "date": "2026-05-29",
        "income_entries": [
            {"label": "Balance b/f", "amount": 943000,  "order": 0},
            {"label": "Withdrawal",  "amount": 1350000, "order": 1},
            {"label": "Collections", "amount": 370000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Sports",    "item": "Rugby ball",    "qty": 3,  "unit_price": 88000, "order": 0},
            {"category": "Sports",    "item": "Rugby boots",   "qty": 6,  "unit_price": 95000, "order": 1},
            {"category": "Transport", "item": "Fuel",          "qty": 22, "unit_price": 5200,  "order": 2},
            {"category": "Medical",   "item": "Mouthguards",   "qty": 15, "unit_price": 15000, "order": 3},
        ],
    },
    {
        "date": "2026-05-30",
        "income_entries": [
            {"label": "Balance b/f", "amount": 718000,  "order": 0},
            {"label": "Withdrawal",  "amount": 3000000, "order": 1},
            {"label": "Collections", "amount": 780000,  "order": 2},
        ],
        "expense_entries": [
            {"category": "Salaries",  "item": "All staff — month end",     "qty": 1,  "unit_price": 2800000, "order": 0},
            {"category": "Equipment", "item": "Monthly equipment check",   "qty": 1,  "unit_price": 120000,  "order": 1},
            {"category": "Utilities", "item": "Electricity",               "qty": 1,  "unit_price": 185000,  "order": 2},
            {"category": "Food",      "item": "Month-end team lunch",      "qty": 40, "unit_price": 18000,   "order": 3},
        ],
    },
]


class Command(BaseCommand):
    help = 'Seeds the database with 26 days of May 2026 test data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing May 2026 reports before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            # date__startswith isn't reliable across DB backends for DateField,
            # so filter by year/month instead — works on SQLite and Postgres.
            deleted, _ = DailyReport.objects.filter(date__year=2026, date__month=5).delete()
            self.stdout.write(self.style.WARNING(f'Cleared {deleted} existing May 2026 reports'))

        # Attribute seeded reports to an existing accountant if one exists,
        # otherwise leave created_by null (the field allows it).
        creator = User.objects.filter(role='accountant').first()

        created = skipped = 0

        with transaction.atomic():
            for day in SEED_DATA:
                date_str = day['date']

                if DailyReport.objects.filter(date=date_str).exists():
                    self.stdout.write(f'  ⏭  {date_str} already exists — skipping')
                    skipped += 1
                    continue

                report = DailyReport.objects.create(
                    date=date_str,
                    created_by=creator,
                )

                for e in day['income_entries']:
                    IncomeEntry.objects.create(
                        report=report,
                        label=e['label'],
                        amount=decimal.Decimal(str(e['amount'])),
                        order=e['order'],
                    )

                for e in day['expense_entries']:
                    qty = decimal.Decimal(str(e['qty'])) if e.get('qty') is not None else None
                    unit_price = decimal.Decimal(str(e['unit_price'])) if e.get('unit_price') is not None else None
                    category = CATEGORY_MAP.get(e['category'], e['category'])
                    ExpenseEntry.objects.create(
                        report=report,
                        category=category,
                        item=e['item'],
                        qty=qty,
                        unit_price=unit_price,
                        order=e['order'],
                        # total is auto-calculated in ExpenseEntry.save()
                    )

                # Recompute total_income / total_expense / balance from the
                # entries we just created, using the model's own logic.
                report.recalculate_totals()

                created += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✅  {date_str}  |  '
                        f'Income: {report.total_income:,.0f}  '
                        f'Expenses: {report.total_expense:,.0f}  '
                        f'Balance: {report.balance:,.0f}'
                    )
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done — {created} reports created, {skipped} skipped'
        ))