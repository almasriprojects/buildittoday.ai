import re
import urllib.request

ENV_PATH = "/Users/ananalmasri/Downloads/autosite.ai/frontend/.env.local"

def load_env():
    vals = {}
    with open(ENV_PATH) as f:
        for line in f:
            line = line.strip()
            m = re.match(r"^([A-Z_]+)=(.*)$", line)
            if m:
                vals[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return vals

env = load_env()
SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

VIDEO_LOCAL = "/private/tmp/claude-501/-Users-ananalmasri-Downloads-autosite-ai/d8d1f973-387b-45fb-bb53-9b4960fab6b7/scratchpad/hero_video_test_professional_services.mp4"
VIDEO_STORAGE_PATH = "professional-services/hero-video.mp4"
BUCKET = "category-photography"

def upload(local_path, storage_path, content_type):
    with open(local_path, "rb") as f:
        data = f.read()
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}?upsert=true"
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "apikey": SERVICE_KEY,
            "Content-Type": content_type,
            "x-upsert": "true",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        resp.read()
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"

video_url = upload(VIDEO_LOCAL, VIDEO_STORAGE_PATH, "video/mp4")
print("Video uploaded:", video_url)
