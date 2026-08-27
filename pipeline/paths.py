"""Where the pipeline reads and writes.

Every path used to be hardcoded to one Mac and to a temporary scratch folder
that has since been wiped — which is how motion_runtime_v2.6.js was lost and
had to be recovered out of a built page. Nothing here points anywhere by
default that is not inside this repository.

Override with environment variables when running elsewhere:

    PIPELINE_WORK   scratch space for a run   (default: ./_work)
    PIPELINE_ENV    .env with the API keys    (default: ../frontend/.env.local)
    SITEREPLICATE_ENV  optional second .env   (default: unset)
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent

# Scratch space for a run. Inside the repo and git-ignored, so a run's
# intermediate files survive a reboot.
WORK = Path(os.environ.get("PIPELINE_WORK", ROOT / "_work"))
WORK.mkdir(parents=True, exist_ok=True)

# Where the API keys live. Read, never written, never committed.
FRONTEND_ENV = Path(os.environ.get("PIPELINE_ENV", REPO / "frontend" / ".env.local"))
SITEREPLICATE_ENV = (
    Path(os.environ["SITEREPLICATE_ENV"]) if os.environ.get("SITEREPLICATE_ENV") else None
)

# Assets the build injects. These are repository files, not scratch.
MOTION_RUNTIME = ROOT / "motion_runtime_v2.6.js"


def work(*parts: str) -> Path:
    """A path inside the run's scratch space, with parents created."""
    p = WORK.joinpath(*parts)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p
