> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M1 átadás — Foundation és Project Contract

Az alábbiak az eredeti `b1105d7` átadás bizonyítékai. A #2 PR szakmai felülvizsgálatából
származó szerkesztési javítás aktuális eredményei: [M1-REPAIR-HANDOFF](M1-REPAIR-HANDOFF.md).

Dátum: 2026-11-14 (Europe/Budapest). Állapot: **M1 megvalósítva, helyi kapu PASS**.
A fejlesztés megáll az M1-nél. M2-re nincs továbblépés ebben a változtatásban.

## Kiindulópont és forrásazonosság

- GitHub `origin/main` frissen lekérve; kiindulópont:
  `66b716bd74666f490fc24cd6682f7dddf4257fd5`, a #1 PR M0 merge commitja.
- Fejlesztési ág: `feat/m1-foundation-contract`.
- Az eredeti négy specifikáció változatlan; `check:spec` mind a négy SHA-256 ellenőrzést teljesítette.
- Az M0 architektúra és ADR-0001 elolvasva; korábbi WDF/UI Lab implementáció nem került be.
- Az ellenőrzött implementáció fájllenyomatai: `M1-source-snapshot.json`.
  A futási összesítő (`M1-results.json`) e snapshot SHA-256 értékére hivatkozik.
- Tényleges kimenet: `M1-verification.log`, `M1-unit-results.json`, `M1-browser-results.json`.

## Megvalósított funkciók és módosított területek

| Terület                           | Megvalósítás                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/foundation/src`         | Három szabálykategória; 12 stabil, egyedi szabály-ID; ellenőrzési mód, bizonyíték és referencia; fagyasztott spacing és padding                              |
| `packages/core/src/contracts`     | Strict Zod-sémák, verzió- és adapterkompatibilitás, strukturális JSON-sémaexport; biztonságosan feloldott, csak JSON-t olvasó projektbetöltő                 |
| `packages/core/src/tokens`        | Négyrétegű típusos tokenformátum; ismeretlen referenciák, ciklusok, típus-/réteg-/scope-hibák; spacing, card-padding és deklarált reszponzivitás ellenőrzése |
| `packages/core/src/generation`    | Stabil CSS/TS; rem-leképezés; névütközés elutasítása; kanonikus forrás-SHA-256                                                                               |
| `packages/core/src/quality`       | Későbbi QA eredmény- és bizonyíték-adatszerződés; nincs végrehajtó motor                                                                                     |
| `apps/task-manager/wdf`           | Betölthető Manifest és egyetlen hiteles projekt-tokenforrás                                                                                                  |
| `apps/task-manager/src/generated` | Generált CSS és konkrét projekttokenekre szűkített TypeScript-típusok                                                                                        |
| Bootstrap CSS                     | Ugyanaz a megjelenés, generált változókon keresztül; App/main React-kód változatlan                                                                          |
| `tools/generate-m1.ts`            | Reprodukálható generálás vagy írás nélküli driftellenőrzés; strukturális séma-származékok                                                                    |
| Tesztek / konfiguráció / CI       | M1 unit, IO, negatív CLI és böngészős tesztek; `verify:m1`; GitHub Actions M1 kapu és artifactfeltöltés                                                      |
| Dokumentáció                      | ADR-0002; tényleges API, séma- és tokenpéldák; README/DESIGN/modulleírások; ez az átadás                                                                     |

A referencia spacing 0/4/8/12/16/24/32/40/48/64/80 CSS px, 16 px root referencia mellett.
A Compact/Comfortable/Spacious 16/24/32 px. A root fontot nem rögzítjük pixelben:
rem-alapú kimenet tiszteletben tarthatja a felhasználó betűméret-beállítását.
A projekt nem írhatja át a Foundation értékeit. A kivételdeklaráció és a külső
jóváhagyás dokumentációja sem kapcsolja ki az ellenőrzéseket.

## Kötelező M1 tesztmátrix

Minden alábbi eredmény a tényleges helyi futásra vonatkozó **PASS**, nem tervezett eredmény.
A tesztazonosítók a megőrzött JSON-eredményekben is szerepelnek.

| Követelmény / ID                           | Módszer és elvárt eredmény                                                                        | Tényleges eredmény                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| M1-F01                                     | Foundation értékek, egyedi szabályok és befagyasztás                                              | 12 egyedi szabály, 3 kategória; fix skála/preset; browser/manual a11y meta                          |
| M1-C01                                     | Érvényes 1.0.0 és inkompatibilis Contract külön ellenőrzése                                       | Érvényes elfogadva; 2.0.0 `CONTRACT_VERSION_UNSUPPORTED`, pontos mezővel                            |
| M1-C02                                     | Minden kötelező Manifest-főmező elhagyása, 7 eset                                                 | Mindegyik `SCHEMA_INVALID`                                                                          |
| M1-C03–C04                                 | Adapter, strict mezők, path traversal, hook-ID és generált sémák                                  | Hibák elutasítva; strukturális séma runtime-forrásból exportálva                                    |
| M1-T01                                     | Szemantikus/család/variáns feloldás                                                               | Várt szín és Spacious padding helyesen öröklődik                                                    |
| M1-T02                                     | 7 hibás tokentípus/literál                                                                        | Mindegyik elutasítva                                                                                |
| M1-T03–T04                                 | Hiányzó referencia, ciklus                                                                        | Pontos cél és ciklusútvonal a diagnosztikában                                                       |
| M1-T05–T06                                 | 19 px, Foundation-átírás, hibás referenciatípus, hibás card-padding                               | Mind elutasítva, releváns kóddal/szabály-ID-val                                                     |
| M1-T07–T08                                 | Réteg-/család-/variánshatárok és izolált szerkesztés                                              | Tiltott hivatkozás/írás elutasítva; globális/family érték és input sértetlen                        |
| M1-T09–T11                                 | Deklarálatlan és deklarált responsive; rossz target/típus/skála/ciklus                            | Deklarálatlan elutasítva; explicit kumulált szabály elfogadva; indirekt függők frissülnek           |
| M1-T12                                     | Kivételkérelem és jóváhagyásrekord                                                                | Nem ad felmentést; MUST-kivétel elutasítva                                                          |
| M1-T13                                     | Magyar fontnév, hibás lista / nyers CSS                                                           | Magyar név elfogadva; hibás lista és CSS-függvény elutasítva                                        |
| M1-G01–G05                                 | Stabil CSS/TS, kulcssorrend, rem, lenyomat, módosuló forrás, ütközés, responsive, kreatív értékek | Reprodukálható eredmény; eltérő forrás mindkét kimenetet változtatja; ütközés elutasítva            |
| M1-G06                                     | CLI driftkapu szándékosan átírt generált CSS-sel, izolált ideiglenes projektben                   | Kilépés 1 és `GENERATED_OUTPUT_STALE`; nincs csendes javítás vagy forrásmódosítás                   |
| M1-R01–R04                                 | Valódi és ideiglenes projektbetöltés, hiányzó/hibás JSON, verzió és kifelé mutató symlink         | Sikeres forrásbetöltés; hibák pontosan elutasítva; deferred képességek `NOT_RUN`                    |
| M1-I01 + tsc                               | Generált TS típusbiztonság, nem létező ID fordítási hibája                                        | Valódi ID elfogadva; `@ts-expect-error` ellenőrizve a strict tsc által                              |
| M1-B320/390/768/1024/1440 × dev/production | Tényleges CSS, betűméret, rem, három preset renderelt insetje, explicit responsive                | Mind a 10 teszt sikeres; presetek 16/24/32 px; Spacious mobilon 32 px, explicit ≥768 override 24 px |
| M0-U01 és M0-B*                            | Eredeti M0 tesztek változatlanul                                                                  | 1 SSR teszt és 10 böngészős regresszió sikeres                                                      |

Összesen **42 Vitest teszt 3 fájlban**, **20 Playwright teszt**.
A különálló `verify:m1` nem igényli a korábbi shellben már elvégzett generálást:
a származékok verziózottak, a kapu azokat újragenerálás nélkül ellenőrzi.

## Lefuttatott parancsok és környezet

Node `v24.22.1`, npm `11.9.0`, Chromium `156.0.8078.79` (Debian Linux).
A függőségek a verziózott npm lockfile alapján `npm ci` paranccsal telepítve.
A WDF kapuhoz nincs új, globálisan telepítendő függőség.

```sh
npm ci
npm run generate:tokens
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m1
python3 tools/compare-m0-screenshots.py
python3 /tmp/wdf-m1-audit.py /workspace/web-development-foundation --mode strict --output /workspace/web-development-foundation/docs/reports/M1-ui-static-audit.json
npx --yes --package @google/design.md@0.4.0 designmd lint DESIGN.md
```

- `verify:m1`: exit 0; eredeti specifikációk, driftkapu, Prettier, ESLint, strict TS,
  42 unit/integrációs teszt, production build és 20 böngészőteszt sikeres.
- A screenshot-összehasonlító opcionális, Pillow-t használ (a jelen környezetben telepítve).
  Az eredeti M0 PNG-khez képest **0 eltérő RGB pixel mind a 10 nézetben**.
  Ez azonos Chromium-/fontkörnyezetben reprodukálható bizonyíték, nem különböző
  operációs rendszereken garantált pixelazonosság és nem R01 Lab-elfogadás.
- A frontend-design-premium skill statikus auditja strict módban: 0 finding.
  A `/tmp` script a skill `scripts/audit_project.py` forrásának változatlan másolata;
  nem része a WDF-kapunak és nem helyettesít böngészőtesztet.
- A DESIGN-lint exit 0, 0 error; 1 dokumentációs warning: a prózai DESIGN.md nem tartalmaz YAML-tokeneket.
  A tokenforrás tudatosan a strukturált projekt-JSON, így nem készül második designkonfiguráció.
- A távoli GitHub Actions nincs helyi futásnak feltüntetve: workflow frissítve,
  távoli eredmény **NOT_RUN**. A kötelező helyi kapu ténylegesen futott.

Az iteráció során egy TypeScript DOM-típushibát és egy idézőjelre érzékeny CSS-import
assertiont javítottunk. A produkciós minifikálás `.25rem` írásmódját a böngészőteszt
most numerikus rem-értékként ellenőrzi. A végleges futás mindezek javítása után történt.

## Böngészős bizonyíték

Tartós screenshotok: `docs/reports/evidence/m1/`, dev és produkciós bootstrap mind az öt
előírt szélességen. A megőrzött browser JSON tartalmazza a geometria- és axe-mellékleteket.
A kártyageometriát csak izolált, ideiglenes tesztfixture méri; nem épült termékbeli TaskCard.

Ellenőrzött állapotok: normál indítás; Tab-fókuszos tartalomra ugró link, Enter utáni
main-fókusz; látható fókusz; overflow és ID-egyediség; reduced-motion preferencia;
axe WCAG 2 A/AA, 2.1 A/AA, 2.2 AA címkéi. Az M1 CSS paddingje 24/64 px,
a H1 32 px a tesztelt root referencia mellett.
A három preset és az explicit responsive szabály valós renderelt insetje minden szélességen ellenőrzött.

A screenshotokat vizuálisan is ellenőriztük keskeny és széles nézetben.
Nincs új interaktív űrlap, üres/hiba/loading termékállapot, modal vagy Select;
ezek hiányát nem minősítjük sikeresen tesztelt M2-viselkedésnek.

## Nyitott határok és kockázatok

M1-et blokkoló ismert hiba nincs. A következők szándékosan nem megvalósított képességek:

- M2 Task Manager üzleti funkciók, valódi komponensregisztráció és props-típusos fixture-renderelés.
- M3 Preview-protokoll, Lab-indítás és Website View; a `configured` erőforrás fájlfeloldása nem működési bizonyíték.
- M4 Component Studio és galéria.
- M5 Working Draft, Initial Reference, Approved Baseline, Undo/Redo, Audit és véglegesítés.
- M6 publikálható csomagbuild, külső projektinstalláció, teljes C10 és integrációs release QA.

A színliterál formátuma hex, nem tetszőleges CSS-kifejezés; nincs korlátozott márkapaletta.
A spacingként használt paramétert a projektnek spacing típusúnak kell deklarálnia;
a tokenmotor nem elemzi a teljes alkalmazás tetszőleges CSS-ét.
Statikus validáció nem bizonyít teljes WCAG-megfelelést, megfelelő fontbetöltést vagy
minden lehetséges renderelt állapotot. Képernyőolvasós, többmotoros és teljes zoom-mátrix **NOT_RUN**.
A bootstrap axe-eredménye csak a konkrét tesztelt oldalra és állapotokra érvényes.

## Pontos visszaállítás

A változtatás egy külön M1-ágon van; a `main` ágat ez a munka nem írja át.
Tiszta munkafán az elfogadott M0 egy új ágon, adatvesztés nélkül ellenőrizhető:

```sh
git switch -c rollback/m1-to-m0 66b716bd74666f490fc24cd6682f7dddf4257fd5
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m0
```

Ez megőrzi az M1-ágat. Visszatérés:

```sh
git switch feat/m1-foundation-contract
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m1
```

Már beolvasztott M1 esetén a visszavonás külön `git revert` commit, nem a történet
átírása: az M1 commitazonosítója a `git log --oneline` listában az
`M1: Foundation and Project Contract` tárgy alapján azonosítható. Merge-commit
visszavonásánál a célág első szülőjét kell választani (`git revert -m 1 <merge-sha>`).
Nincs adatbázis, külső tároló, migráció vagy rejtett Draft, amelyet vissza kellene állítani.
Kizárólag tokenváltoztatás visszavonásakor a tokenforrást kell Gitből visszaállítani,
majd `npm run generate:tokens` és `verify:m1`; a generált CSS/TS külön szerkesztése tiltott.

## Következő mérföldkő belépési feltétele

M2 csak az M1 átadásának felhasználói elfogadása és külön továbblépési jóváhagyása után.
Előfeltétel a működő Contract, zöld `verify:m1`, egységes tokenforrás és az elfogadott
M2 Task Manager/Registry-scope. Ebben a munkában az M2 nem kezdődött el.
