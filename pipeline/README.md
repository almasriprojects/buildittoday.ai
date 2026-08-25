# Site generation pipeline

The Python that produces every demo site: research, design brief, scene
prompts, image generation, image-to-video, montage, build and validation.

These scripts built all 43 sites currently live. Until now they existed only in
a temporary directory and were not in version control — a wipe of that folder
would have destroyed the means of producing the product. They are here so that
cannot happen.

## Rough order

| Script | Does |
|---|---|
| `stage1_style_analysis.py` | Reference styling analysis |
| `stage3_synthesis.py` | Design direction from the business's real content |
| `brain_v2.py` | Brief plus three scene prompts |
| `brain_v2_media.py` | Images, then image-to-video |
| `brain_v3_fixes.py` | Crop, retry, compress, text detection |
| `brain_v3_run.py` | Media run with the vision gate and dual retry |
| `brain_v2_build.py` | Assemble the page |
| `brain_v2_validate.py` | Check the result, one corrective retry |
| `batch_worker.py` | Resumable batch with a cost ceiling |
| `build_all.py` | Drive a whole batch |
| `scan_quality.py`, `triage_text.py` | Quality passes |
| `topup_clips.py`, `upload_video_and_patch.py` | Repair specific sites |

## Known limitations

**Hardcoded absolute paths.** Several scripts point at
`/Users/ananalmasri/...` and at a `/private/tmp/claude-501/...` scratchpad that
no longer reliably exists. They will not run unchanged on another machine, and
some will not run on this one either. Paths need lifting into environment
variables before this is dependable.

**Runs locally, not on a schedule.** Producing sites for new leads currently
means someone opening a terminal. The rest of the funnel — scraping,
classifying, emailing — runs on cron without anyone present. This is the one
manual link in an otherwise automatic chain.

**Credentials** are read from `.env` files by path; nothing is embedded here.
That is why these files are safe to commit, and also part of why the paths are
hardcoded.
