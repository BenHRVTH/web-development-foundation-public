> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M3 átadás — UI Lab Website View

Dátum: 2026-11-14 (Europe/Budapest). Ág: `feat/m3-website-view`.
Állapot: **PASS — teljes helyi `verify:m3` kapu sikeres, szakmai felülvizsgálatra kész**.
A PR a `main` felé készül; nem merge-eljük. M4–M6 fejlesztés nem történt.

## Kiindulópont

A frissen lekért `origin/main` állapota `81a47e0`, az elfogadott M2 #3 PR merge-je.
A helyi main frissítve, külön fejlesztési ág létrehozva, a négy irányadó specifikáció,
M0–M2 architektúra és ADR-ek teljesen elolvasva. A négy eredeti specifikáció byte-pontosan
változatlan, a kapu SHA-256 ellenőrzése ezt minden futáskor igazolja.

Az implementáció előtti `verify:m2` **PASS: 116 unit/integrációs, 89 Chromium-teszt**.
Napló: M3-baseline-m2.log (privát archívum: `M3-baseline-m2.log`). Az első környezeti kísérletben a
Playwright saját böngészője hiányzott; a sikeres teljes kapu a telepített rendszer-Chromiumot
használta. Csak ennek sikeres befejezése után kezdődött az M3 implementációja.

## Megvalósított funkciók

- A projekt könyvtárából ténylegesen induló `npm run ui-lab`, Contract-alapú
  projektazonosítással, pontos indulási diagnosztikával és két helyi szerverrel.
- Website View a projekt eredeti Vite/index/main belépésével és a valódi Task Managerrel.
  Létrehozás, szerkesztés, validáció, teljesítés/visszavonás, szűrés, lista/részlet,
  hash-navigáció, billentyűzet, fókusz és görgetés működik az iframe-ben.
- Colors, Typography, Spacing, Shapes, Layout; Contractból származó, típusos globális
  értékek, hivatkozások és kizárólag a már deklarált reszponzív override-ok szerkesztése.
  A szín és fontcsalád szabadon megadható, nincs indokolatlan kreatív presetkorlát.
- M1 Foundation/scope/repair védelem. LOCKED értékek olvashatók, nem írhatók.
  Hibás literál mezőhibát ad; meglévő hibás jelölt lépésenként javítható.
  Hibás konfigurációból nincs új CSS; a korábbi megjelenés külön jelöléssel marad meg.
- Verziózott, strict, kétirányú Preview Interface, pontos origin/source/project/session
  ellenőrzéssel, monotón revízióval és zárt parancskészlettel. Nincs JS-/CSS-/forráskódparancs.
- Tényleges 320, 390, 768, 1024 és 1440 CSS px viewport, 900 px magasságban, 100%-os skálán.
  A szélességváltás és a tokenfrissítés megtartja az alkalmazás memóriáját és navigációját.
- Külön Lab-arculat, összecsukható jobb panel, fokozatosan megnyitható szemantikus
  mezők, natív vezérlők, hozzáférhető állapot-/hibaüzenetek és kisebb desktop támogatása.
- Betöltési, runtime-, megszakadási és update-ack hibák helyreállítással.
  A handshake előtti alkalmazásindítási hiba sem válhat kész státusszá.
- Csak transient böngészőmemória: a Lab bezárása/újratöltése eldobja az editet,
  a hiteles tokenforrás és a projektkód változatlan. A dirty állapot beforeunload-védett.

## Használat

```sh
# repository gyökérben:
npm ci
cd apps/task-manager
npm run ui-lab
```

Lab: `http://127.0.0.1:5175`, külön preview: `http://127.0.0.1:5176`.
Ctrl+C mindkét szervert leállítja. Gyökérből a `npm run ui-lab` ugyanide delegál.
A futó Labot állítsd le a teljes tesztkapu előtt: a tesztek saját szervereket indítanak.

Újracsatlakozás megtartja az alkalmazást és újraküldi a jelöltet. Az explicit
Előnézet újratöltése külön inline megerősítés után visszaállítja az alkalmazásadatait,
de a nyitott Lab tokenbeállításait újraalkalmazza. A Lab teljes újratöltése ezeket is elveszíti.
Runtime-hiba javítása után explicit preview-reload szükséges.

Részletes [használati/integrációs útmutató](../M3-UI-LAB.md),
[Preview API](../M3-PREVIEW-API.md), [ADR-0005](../adr/0005-m3-website-preview.md).

## Módosított területek

| Terület                                                            | Eredmény                                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `packages/ui-lab`                                                  | CLI, read-only bootstrap, Website View, TokenField, connection hook, saját design/UX-szerződés |
| `packages/adapter-react/src/preview`                               | dev-only Vite-kapcsolás, külön cache/origin, valódi alkalmazás és hitelesített bridge          |
| `packages/core/src/preview`                                        | protokollsémák és TS-típusok, globális edit/snapshot API az M1 primitív fölött                 |
| `packages/core/src/tokens/css.ts`, `generation`                    | az M1 CSS-emitter közös tiszta függvénybe kiemelve, változatlan Node CSS/TS kimenettel         |
| `apps/task-manager/wdf/project.json`, `preview.ts`, package script | configured Preview és fejlesztői csomagkapcsolás                                               |
| `tests/m3`, `playwright.m3.config.ts`, unit tesztek                | funkcionális, negatív kommunikációs, startup-, viewport-, geometriai és vizuális bizonyíték    |
| `tools/verify-m3.ts`, package script, Actions                      | teljes M0–M3 kapu, előtte/utána forráslenyomat, nyers jelentések és CI artifactok              |
| dokumentáció és bizonyíték                                         | M3 API, ADR, útmutató, Lab design/UX, handoff, valós PNG-k és JSON-jelentések                  |

A Foundation implementációja, a Project Contract formátuma és az M1 engine
szakmai szabályai nem változtak. Nem készült új Registry, tokenmotor vagy második Task Manager.
Az alkalmazás teljes `src` könyvtára, a hiteles `tokens.json` és generált CSS/TS
byte-pontosan változatlan az elfogadott M2-höz képest.

Az M1 deferred resource-fixture külön megmaradt, függetlenül a most configured
projekt-Preview-tól. Az M2 integrációs teszt a tényleges, immár feloldott Preview-t
ellenőrzi; a korábbi negatív Contract-, gráf-, scope-, IO- és komponensvizsgálatok megmaradtak.
Az eredeti app `premium-ui.json` és saját komponensei is változatlanok;
a Lab saját manifestet és stílust használ.

## Tényleges ellenőrzések

Környezet: Linux, Node 24.22.1, npm 11.9.0, Chromium 156.0.8078.79,
Playwright 1.65.1, Vitest 5.1.0, axe-core 4.14.0, pngjs 7.0.0.
Böngésző: hu-HU, Europe/Budapest, DPR 1, alapból reduced-motion.

```sh
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m2  # fejlesztés előtti alap
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m3
python3 /tmp/m3-audit-project.py . --mode strict --output docs/reports/M3-app-ui-static-audit.json
python3 /tmp/m3-audit-project.py . --mode strict --config packages/ui-lab/premium-ui.json --output docs/reports/M3-ui-static-audit.json
npx --yes --package @google/design.md@0.4.0 designmd lint DESIGN.md
npx --yes --package @google/design.md@0.4.0 designmd lint packages/ui-lab/DESIGN.md
git diff --check
git diff --exit-code -- AGENTS.md WDF_IMPLEMENTATION_BLUEPRINT.md WDF_TEST_PLAN.md CODEX_START_PROMPT.md apps/task-manager/wdf/tokens.json apps/task-manager/src
```

| Vizsgálat                                                                    | Tényleges eredmény                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Teljes M3 kapu                                                               | PASS, exit 0                                                                    |
| Specifikáció, generált drift, M2 CSS-integritás, Prettier, ESLint, strict TS | PASS                                                                            |
| Unit/integráció                                                              | 129/129 PASS, 0 failed, 0 skipped                                               |
| M0–M2 Chromium-regresszió                                                    | 89/89 PASS, dev/production és valódi komponensek                                |
| Új M3 Chromium                                                               | 24/24 PASS, 0 skipped/retry/flaky                                               |
| R01                                                                          | 25/25 valódi képpár és pontos geometriai összevetés PASS                        |
| Production build                                                             | PASS, a fejlesztői WDF/Lab/Registry modulok kizárva a buildgráfból              |
| Hiteles app-/tokenforrások a teljes kapu előtt/után                          | azonos SHA-256 lenyomatok                                                       |
| App és Lab statikus UI-audit                                                 | mindkettő 0 finding                                                             |
| Root és Lab DESIGN lint                                                      | 0 error; mindkettő 1 warning a szándékosan nem duplikált YAML tokenadatok miatt |

A teljes napló (privát archívum: `M3-verification.log`), kapueredmény és forráslenyomatok (privát archívum: `M3-results.json`),
unit JSON (privát archívum: `M3-unit-results.json`), korábbi browser JSON (privát archívum: `M3-regression-browser-results.json`),
M3 browser JSON (privát archívum: `M3-browser-results.json`), tesztelt forrássnapshot (privát archívum: `M3-source-snapshot.json`)
ellenőrizhető gépi bizonyíték. A negatív tesztek szándékosan dobott boot/runtime hibái
a naplóban láthatók; az elutasítás és helyreállítás sikeres teszteredmény.
A skill ideiglenesen kiolvasott statikus audit-scriptje nem a repository-kapu függősége;
a valódi runtime ellenőrzést nem helyettesíti.

## Böngészős és vizuális bizonyíték

A tényleges Lab 1440 px (privát archívum: `evidence/m3/lab-1440.png`), 1024 px (privát archívum: `evidence/m3/lab-1024.png`),
760 px (privát archívum: `evidence/m3/lab-760.png`), 390 px (privát archívum: `evidence/m3/lab-390.png`) asztalon/reflowban.
Élő színváltoztatás (privát archívum: `evidence/m3/lab-live-color.png`), hibás érték (privát archívum: `evidence/m3/lab-invalid-color.png`).
A közös böngészőben kézzel is megnyitottuk és képernyőn ellenőriztük a valódi Labot;
a mentett desktop/mobil/hiba képeket vizuálisan is átnéztük.

R01: azonos browser-context, betűk, viewport, adat és alkalmazásállapot.
Példa: önálló 1440 (privát archívum: `evidence/m3/r01-1440-normal-outside.png`) és
Labon belüli 1440 (privát archívum: `evidence/m3/r01-1440-normal-inside.png`);
önálló 320 (privát archívum: `evidence/m3/r01-320-normal-outside.png`) és
Labon belüli 320 (privát archívum: `evidence/m3/r01-320-normal-inside.png`).
A teljes 50 PNG az evidence/m3 (privát archívum: `evidence/m3/`) könyvtárban van.

A geometriai tolerancia nulla. 22 képpár teljesen pixelazonos. Három párban:
768/error: 6 pixel, 1024/error: 6 pixel, 768/missing: 8 pixel tér el; az eltérés
minden esetben legfeljebb **1/255** csatornaérték a Chromium ívelt/levágott élein.
A dokumentált felső határ képenként 8 pixel és 1 csatornaegység; nincs maszkolás,
skálázás, tartalmi vagy geometriai eltérés elfogadva. A scrollbar-gutter teljes
fehér sávját ténylegesen javítottuk, nem hagytuk ki az összehasonlításból.
Módszer: [M3 útmutató](../M3-UI-LAB.md#reprodukálható-ellenőrzés-és-r01).

Mért DOMRect/computed adatok: főcímek, kártyák, összes releváns vezérlő, modal,
padding, tipográfia, színek, lekerekítés, viewport, scrollWidth és ID-egyediség.
Comfortable 24 px, Spacious részlet minden méreten 32 px. A korábbi M2-kapu
továbbra külön méri a Compact 16 és más komponensállapotokat.

## Biztonság, állapothatár és korlátok

Csak deklarált globális értékhelyek szerkeszthetők. Foundation-, komponens-,
új responsive-, JS-/CSS- és fájlmódosító üzenetek elutasítottak. Idegen origin,
ablak, projekt, session, verzió és régi revízió külön negatív tesztet kap.
A helyi HTTP-szerver POST/DELETE/idegen Origin/Host kérése 403; nincs írható API.
A projekt saját Vite-konfigurációja megbízható helyi kód, nem ellenséges plugin-sandbox.

Nincs nyitott M3-blokkoló. A következő határok szándékosak:

- Chromium ellenőrzött; Firefox/WebKit, képernyőolvasó, fizikai mobil és teljes
  200%-os zoommátrix NOT_RUN. Az axe sikere nem teljes WCAG-tanúsítás.
- A natív select/color picker platformfüggő. Betűcsaládlista szabad, külső
  fontletöltés nincs; a helyi elérhetőség és fonttámogatás határozza meg a renderelt készletet.
- A tokenvalidáció nem Approval QA vagy kontraszt-audit; M5 nem készült el.
- Egy helyi Lab egy projekthez, fix Lab-porttal; a preview-portot a Contract deklarálja.
  A privát TS-workspace még nem publikálható M6-csomag.
- A forrás-HMR maga okozhat alkalmazás-state resetet; tokenfrissítés és viewportváltás nem.
  Külső kód/Draft konfliktuskezelés M5-feladat.
- Nincs Component Studio, DOM-kiválasztó, Initial Reference, Approved Baseline,
  perzisztens Working Draft, Undo/Redo, A/B, Audit-javaslat vagy véglegesítés.

## Biztonságos visszaállítás

Az M3 külön ágon marad, a main nincs módosítva. Tiszta munkafáról az elfogadott M2
új ágon elérhető, az M3 munkájának törlése nélkül:

```sh
git switch -c rollback/m3-to-m2 81a47e0
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m2
# visszatérés:
git switch feat/m3-website-view
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m3
```

Egy később jóváhagyott merge visszavonása Git revert feladat, nem történetátírás
vagy a Lab automatikus művelete. Nincs migráció, adatbázis vagy perzisztált M3 Draft.
A memóriaedit eldobásához elég a Lab újratöltése/bezárása; hiteles forrást nem kell helyreállítani.

## Következő mérföldkő és megállás

M4 csak az M3 szakmai felülvizsgálata és külön jóváhagyás után indulhat.
Belépési alap: működő M2 Registry, sikeres M3 kapu, a globális és komponens-scope
megtartott határai. Az M4 Studio és az M5 Change Manager teljes folyamatai nincsenek
előre részlegesen implementálva. Az M3 PR nincs merge-elve; itt megállunk.

## M3 szakmai review — célzott viewport-javítás

A korábbi `4a17a57` M3-állapot rögzített 768 px-es induló nézetét felváltotta a
preview belső terének egyszeri mérése. A Lab a padding és a lefoglalt gutter után
elférő legnagyobb támogatott szélességet választja, az első festés előtt.
Ha a belső tér még 320 px-nél is kisebb, a legkisebb valódi viewport marad, látható
szöveges jelzéssel. A fizikailag kilógó tartalom vízszintesen elérhető.
A későbbi ResizeObserver csak a helyhiány jelzését frissíti, a kiválasztott méretet
nem írja át; az iframe és a React-állapot megmarad.

| Lab ablakszélesség | Tényleges induló iframe-viewport                |
| ------------------ | ----------------------------------------------- |
| 390 px             | 320 CSS px, minimum alatti belső tér jelzésével |
| 760 px             | 390 CSS px                                      |
| 1024 px            | 390 CSS px                                      |
| 1440 px            | 768 CSS px                                      |
| 1720 px            | 1024 CSS px                                     |
| 1960 px            | 1440 CSS px                                     |

Kilenc új regressziós browser-eset: hét indulási méret (a 320 px-es Labot is
beleértve), kézi 1440 px + vízszintes görgetés + ablak-/panelváltozások, valamint a
minimum alatti fallback kiszámíthatósága. A feladat, teljesítés, szűrő, részletútvonal,
iframe-memória, nem mentett formérték és fókusz megmaradását is ellenőriztük.
Nincs skálázás; a mért iframe DOMRect-szélessége és window.innerWidth egyezik.

Célzott parancs: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:m3 -- viewport.spec.ts`
→ **9/9 PASS**. A teljes `verify:m3` újrafutott → **129 unit/integrációs,
89 korábbi + 24 M3 browser PASS**, 25/25 R01 képpár. A fenti gépi jelentések és
forrássnapshot a javított verzióra frissítve. A Task Manager teljes forrása és
konfigurációja, valamint a Foundation változatlan a javítás előtti commithoz képest.

Új bizonyítékok: 390 (privát archívum: `evidence/m3/viewport-initial-390.png`),
760 (privát archívum: `evidence/m3/viewport-initial-760.png`), 1024 (privát archívum: `evidence/m3/viewport-initial-1024.png`),
1440 (privát archívum: `evidence/m3/viewport-initial-1440.png`),
minimum alatti 320 (privát archívum: `evidence/m3/viewport-initial-320.png`),
kézi nagy viewport görgetése (privát archívum: `evidence/m3/viewport-manual-scroll.png`).
Az eredeti Lab-képek is újrafelvéve. Nyitott javítási blocker nincs.

Visszaállítás: a célzott javító commit önállóan revertelhető; a korábbi M3-alap
`4a17a57`. M4 nem kezdődött el, a PR #4 változatlanul szakmai review-ra nyitva marad.
