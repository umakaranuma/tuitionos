# Define limits and features for each plan type
PLAN_LIMITS = {
    'solo': {'students': 75, 'batches': 3},
    'institute': {'students': 200, 'batches': 10},
    'institute_pro': {'students': float('inf'), 'batches': float('inf')}
}

PLAN_FEATURES = {
    'solo': ['basic_reporting'],
    'institute': ['basic_reporting', 'pdf_gen'],
    'institute_pro': ['basic_reporting', 'pdf_gen', 'whatsapp', 'timetable', 'promotion', 'custom_domain']
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
