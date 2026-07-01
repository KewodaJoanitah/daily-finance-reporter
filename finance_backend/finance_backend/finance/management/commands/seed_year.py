"""
Django Management Command — Seed a Full Year of Test Data
============================================================
Place this file at:
  finance/management/commands/seed_year.py

Make sure finance/management/commands/ already has __init__.py files
(you set this up already for seed_reports.py / seed_users.py).

Run:
  python manage.py seed_year                      # seeds the year 2026
  python manage.py seed_year --year 2025           # seeds a different year
  python manage.py seed_year --year 2026 --clear   # wipes that whole year first, then reseeds fresh

Behavior:
- Generates one report per day for the given year, SKIPPING Sundays
  (treated as a closed day — change the `weekday() == 6` check below
  if that's not what you want).
- Skips any date that already has a report, so it's safe to re-run.
- Income (Balance b/f / Withdrawal / Collections) and 2-5 random
  expense line items per day are randomized within realistic ranges
  matching the scale of your existing data — not hand-written values,
  since this is meant to give you bulk varied data to exercise charts,
  tables, search, and analytics with.
"""

import random
import decimal
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

from finance.models import DailyReport, IncomeEntry, ExpenseEntry

User = get_user_model()

# ── Item pools per category: (item_name, qty_range, unit_price_range) ──────
# Categories here match ExpenseEntry.CATEGORY_CHOICES exactly.
ITEM_POOLS = {
    'Sports': [
        ("Footballs", (3, 8), (45000, 60000)),
        ("Jerseys", (5, 15), (35000, 50000)),
        ("Training cones", (10, 30), (6000, 9000)),
        ("Whistles & flags", (2, 6), (12000, 18000)),
        ("Volleyball net", (1, 2), (80000, 100000)),
        ("Basketball", (2, 5), (70000, 85000)),
        ("Athletics spikes", (4, 10), (55000, 70000)),
        ("Cricket bat", (1, 3), (100000, 130000)),
        ("Rugby ball", (2, 4), (80000, 95000)),
        ("Netball", (2, 4), (55000, 65000)),
        ("Shot put balls", (2, 5), (75000, 90000)),
        ("Relay batons", (4, 10), (12000, 18000)),
        ("Table tennis set", (1, 2), (85000, 100000)),
        ("Swimming goggles", (8, 15), (20000, 28000)),
    ],
    'Food & kitchen': [
        ("Team lunch", (15, 40), (8000, 15000)),
        ("Team breakfast", (15, 30), (7000, 12000)),
        ("Drinks & snacks", (20, 50), (3500, 6000)),
        ("Hydration drinks", (30, 60), (4000, 5500)),
        ("Match day catering", (30, 60), (12000, 18000)),
        ("Team dinner", (20, 35), (18000, 25000)),
        ("Post-match meal", (20, 40), (15000, 20000)),
        ("Referee refreshments", (3, 6), (12000, 18000)),
    ],
    'Utilities': [
        ("Electricity bill", (1, 1), (150000, 220000)),
        ("Water bill", (1, 1), (55000, 90000)),
        ("Internet bill", (1, 1), (100000, 140000)),
        ("Generator fuel", (10, 25), (5000, 6000)),
        ("Phone bill", (1, 1), (70000, 100000)),
        ("Water & sewage", (1, 1), (60000, 90000)),
    ],
    'Salaries': [
        ("Part-time coach", (1, 1), (300000, 400000)),
        ("Head coach salary", (1, 1), (750000, 850000)),
        ("Assistant coach", (1, 2), (400000, 480000)),
        ("Admin staff", (1, 3), (280000, 350000)),
        ("Groundsman", (1, 1), (220000, 280000)),
        ("Security guard", (1, 1), (250000, 300000)),
        ("Medical officer", (1, 1), (500000, 580000)),
        ("Referees (weekend)", (2, 4), (70000, 90000)),
        ("Nutritionist", (1, 1), (380000, 430000)),
    ],
    'Transport': [
        ("Fuel", (15, 45), (5000, 5500)),
        ("Bus hire", (1, 1), (220000, 300000)),
        ("Away match transport", (1, 1), (280000, 380000)),
        ("Team bus fuel", (20, 45), (5000, 5500)),
        ("Charter bus (tournament)", (1, 1), (400000, 480000)),
        ("Tournament transport", (1, 1), (340000, 420000)),
    ],
    'Medical': [
        ("First aid kit", (1, 3), (40000, 50000)),
        ("Physiotherapy session", (1, 4), (70000, 90000)),
        ("Pain relief spray", (3, 8), (18000, 25000)),
        ("Ice packs", (10, 25), (6000, 9000)),
        ("Sports tape & bandages", (5, 15), (15000, 20000)),
        ("Glucose sachets", (15, 35), (3000, 4000)),
        ("Vitamin supplements", (15, 30), (10000, 14000)),
        ("Mouthguards", (10, 20), (12000, 18000)),
        ("Muscle rub cream", (5, 10), (14000, 18000)),
    ],
    'Stationery': [
        ("Printing paper", (2, 6), (25000, 35000)),
        ("Pens & markers", (10, 30), (1500, 3000)),
        ("Notebooks", (10, 25), (3000, 5000)),
        ("Toner/ink cartridge", (1, 2), (80000, 120000)),
        ("Folders & files", (10, 20), (2500, 4000)),
    ],
    'Maintenance': [
        ("Lawn mower service", (1, 1), (130000, 170000)),
        ("Scoreboard repair", (1, 1), (150000, 200000)),
        ("CCTV maintenance", (1, 1), (140000, 180000)),
        ("Locker room repairs", (1, 1), (170000, 220000)),
        ("Gym equipment maintenance", (1, 1), (180000, 240000)),
        ("Treadmill belt replacement", (1, 1), (250000, 310000)),
    ],
    'Other expenses': [
        ("Bibs (training vests)", (15, 30), (15000, 20000)),
        ("Goal nets", (1, 3), (100000, 140000)),
        ("Stopwatches", (2, 5), (30000, 40000)),
        ("Dumbbell set", (1, 1), (340000, 420000)),
        ("Cones & markers", (20, 40), (5000, 7000)),
        ("Safety padding (gym)", (2, 6), (45000, 60000)),
        ("Cricket pads", (2, 6), (55000, 70000)),
    ],
}

MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]


def rand_amount(price_range):
    return random.randint(price_range[0], price_range[1])


class Command(BaseCommand):
    help = 'Seeds a full year of randomized daily finance reports for testing'

    def add_arguments(self, parser):
        parser.add_argument('--year', type=int, default=2026, help='Year to seed (default: 2026)')
        parser.add_argument('--clear', action='store_true', help='Delete all existing reports for that year before seeding')

    def handle(self, *args, **options):
        year = options['year']

        if options['clear']:
            deleted, _ = DailyReport.objects.filter(date__year=year).delete()
            self.stdout.write(self.style.WARNING(f'Cleared {deleted} existing reports for {year}'))

        creator = User.objects.filter(role='accountant').first()

        start = date(year, 1, 1)
        end = date(year, 12, 31)
        current = start

        created = skipped = 0
        month_created = 0
        current_month = start.month

        with transaction.atomic():
            while current <= end:
                date_str = current.isoformat()

                # Flush a per-month summary line whenever we cross into a new month
                if current.month != current_month:
                    self.stdout.write(f'  ✅ {MONTH_NAMES[current_month - 1]} {year} — {month_created} reports created')
                    current_month = current.month
                    month_created = 0

                if current.weekday() == 6:  # Sunday — treated as a closed day
                    current += timedelta(days=1)
                    continue

                if DailyReport.objects.filter(date=date_str).exists():
                    skipped += 1
                    current += timedelta(days=1)
                    continue

                report = DailyReport.objects.create(date=date_str, created_by=creator)

                # ── Income ──
                IncomeEntry.objects.create(report=report, label='Balance b/f', amount=decimal.Decimal(rand_amount((150000, 1200000))), order=0)
                IncomeEntry.objects.create(report=report, label='Withdrawal', amount=decimal.Decimal(rand_amount((600000, 3000000))), order=1)
                IncomeEntry.objects.create(report=report, label='Collections', amount=decimal.Decimal(rand_amount((150000, 800000))), order=2)

                # ── Expenses: 2-5 random categories, one item each ──
                categories = random.sample(list(ITEM_POOLS.keys()), k=random.randint(2, 5))
                for i, cat in enumerate(categories):
                    item_name, qty_range, price_range = random.choice(ITEM_POOLS[cat])
                    qty = random.randint(*qty_range)
                    unit_price = rand_amount(price_range)
                    ExpenseEntry.objects.create(
                        report=report,
                        category=cat,
                        item=item_name,
                        qty=decimal.Decimal(qty),
                        unit_price=decimal.Decimal(unit_price),
                        order=i,
                    )

                report.recalculate_totals()
                created += 1
                month_created += 1
                current += timedelta(days=1)

            # Flush the final month's summary line
            self.stdout.write(f'  ✅ {MONTH_NAMES[current_month - 1]} {year} — {month_created} reports created')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done — {created} reports created, {skipped} skipped (already existed) for {year}'
        ))
