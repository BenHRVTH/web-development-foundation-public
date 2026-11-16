"""Optional same-environment pixel evidence; requires Pillow. Not a cross-OS CI gate."""
from pathlib import Path
import json
from PIL import Image, ImageChops

root = Path(__file__).resolve().parent.parent
results = []
for project in ['dev', 'production']:
    for width in [320, 390, 768, 1024, 1440]:
        baseline = root / f'docs/reports/evidence/{project}-{width}.png'
        candidates = list((root / 'test-results/browser').glob(f'bootstrap-*{project}/startup-{width}.png'))
        if len(candidates) != 1:
            raise SystemExit(f'Expected one executed M0 screenshot for {project}/{width}; run verify:m1 first.')
        before = Image.open(baseline).convert('RGB')
        after = Image.open(candidates[0]).convert('RGB')
        changed = None
        if before.size == after.size:
            pixels = ImageChops.difference(before, after).tobytes()
            changed = sum(any(pixel) for pixel in zip(pixels[0::3], pixels[1::3], pixels[2::3]))
        results.append({'project': project, 'width': width, 'sameSize': before.size == after.size, 'changedPixels': changed, 'status': 'PASS' if changed == 0 else 'FAIL'})
payload = {'method': 'Exact RGB pixel equality, zero tolerance, original M0 baseline, same Chromium/font environment.', 'results': results}
output = root / 'docs/reports/M1-visual-comparison.json'
output.write_text(json.dumps(payload, indent=2) + '\n')
print(json.dumps(payload, indent=2))
raise SystemExit(0 if all(r['status'] == 'PASS' for r in results) else 1)
