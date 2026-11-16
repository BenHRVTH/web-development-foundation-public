"""Optional same-environment dev/production evidence. Requires Pillow, outside the CI gate."""
from pathlib import Path
import json
from PIL import Image, ImageChops

root = Path(__file__).resolve().parent.parent
images = root / 'docs/reports/evidence/m2'
results = []
for width in [320, 390, 768, 1024, 1440]:
    for state in ['normal', 'error', 'long', 'empty', 'missing']:
        dev = Image.open(images / f'dev-{width}-{state}.png').convert('RGB')
        production = Image.open(images / f'production-{width}-{state}.png').convert('RGB')
        bounds = ImageChops.difference(dev, production).getbbox() if dev.size == production.size else 'size-mismatch'
        results.append({'width': width, 'state': state, 'size': list(dev.size), 'equal': bounds is None, 'differenceBounds': bounds})
payload = {'comparison': 'dev vs production, exact RGB equality, same Chromium and fonts; new M2 reference, not approved baseline', 'results': results}
(root / 'docs/reports/M2-visual-comparison.json').write_text(json.dumps(payload, indent=2) + '\n')
print(json.dumps({'pairs': len(results), 'equal': sum(item['equal'] for item in results)}, indent=2))
raise SystemExit(0 if all(item['equal'] for item in results) else 1)
