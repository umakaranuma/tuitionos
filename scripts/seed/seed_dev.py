import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()
from apps.institutes.models import Institute
data = [{"name":"St. Patricks Academy","subdomain":"stpatricks"},{"name":"Royal Tutorial","subdomain":"royal"},{"name":"Sunrise Institute","subdomain":"sunrise"}]
for d in data:
    obj, c = Institute.objects.get_or_create(subdomain=d["subdomain"], defaults={"name":d["name"],"owner_name":"Demo","owner_email":f"owner@{d['subdomain']}.lk","owner_mobile":"0771234567","plan":"premium","status":"active"})
    print(("Created" if c else "Exists") + f": {obj.name}")
