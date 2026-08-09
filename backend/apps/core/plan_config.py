# Define limits and features for each plan type.
# 'students' is enforced per academic year (see StudentViewSet.create) — a
# solo teacher or growing institute can take on a fresh 200 each year without
# students from prior years (graduated/inactive) eating into the cap forever.
PLAN_LIMITS = {
    'solo': {'students': 200, 'batches': float('inf'), 'subjects': 1},
    'institute': {'students': 200, 'batches': float('inf'), 'subjects': float('inf')},
    'institute_pro': {'students': float('inf'), 'batches': float('inf'), 'subjects': float('inf')}
}

# Timetable and QR ID cards are available on every plan. WhatsApp
# notifications and Year-end Promotion remain Institute Pro exclusives.
PLAN_FEATURES = {
    'solo': ['basic_reporting', 'timetable'],
    'institute': ['basic_reporting', 'pdf_gen', 'timetable'],
    'institute_pro': ['basic_reporting', 'pdf_gen', 'timetable', 'whatsapp', 'promotion', 'custom_domain']
}

def check_feature_access(institute, feature_key):
    if not institute or not institute.plan:
        return False
    return feature_key in PLAN_FEATURES.get(institute.plan, [])

def check_limit_access(institute, limit_key, current_count):
    if not institute or not institute.plan:
        return False
    max_allowed = PLAN_LIMITS.get(institute.plan, {}).get(limit_key, 0)
    return current_count < max_allowed
