# M6 R05 — aktuális CSS-súlyképviselő, helyi véglegesítési átadás

Dátum: 2026-11-16 (UTC). Repository:
`BenHRVTH/web-development-foundation-public`.
Helyi ág: `fix/r05-current-representative`.
Kiinduló és változatlan távoli main: `99c649ae5a78bfea0ddb7646247870d3d97b38db`.
Ez a jelentés a **commit és PR előtti helyi munkafa** ellenőrzését rögzíti;
az eredmények nem a fenti kiinduló commit új teszteredményeiként értendők. A tesztharness és a futásidejű források SHA-256
azonosítják a mért változatot a `test-results/m6-r05-typography.json` fájlban.

**Helyi felülvizsgálati eredmény; nem M6 release-jóváhagyás.** A jelentésben
rögzített helyi átadáskor még nem történt commit, push, PR vagy új Actions-futtatás.
A csomag elfogadása után a tulajdonos külön engedélyezte a commitot, a push-t,
a PR-t és annak automatikus teljes Linux/Windows CI-jét. A későbbi PR saját
commitazonosítója és GitHub-ellenőrzései külön CI-bizonyítékok; az alábbi helyi
NOT_RUN státuszok nem azok eredményei. Merge, Release, tag és npm-publikálás
nem engedélyezett. Az eredeti privát repository és a nyilvános main változatlan.

## Elfogadott döntés és megvalósítás

Az [ADR-0011](../adr/0011-m6-typography-capabilities.md) pontosítja a felhasználó
által elfogadott szabályt. Minden tényleges cél/szélesség esetében az aktuális,
feloldott, **deklarált** súly kerül előre; utána a többi jelölt csökkenő sorrendben,
ismétlés nélkül. A meglévő kötés-, betöltés-, baseline-, párkülönbség- és metszet-
ellenőrzések változatlanok. Nincs platformnévre épülő kódelágazás.

Az igazolt CSS-súlyképviselő egy ténylegesen renderelt, a többi felkínált
képviselőtől eltérő megjelenés CSS-értéke. Nem jelent külön natív fontmetszetet
minden számhoz. Összeolvadó 600/700 mellett a jelenlegi 600 maradhat, 700 külön
opcióként kiesik; a 600/700 pár **FAIL marad**. Ha eltérnek, mindkettő igazolható.
A jelenlegi, de nem deklarált 500 nem kaphat elsőbbségi felmentést.

A Lab közös TokenFieldje „igazolt képviselő” feliratot ad. A közös Typography
státusz és súgó elmondja, hogy azonos betűkép nem két külön választható megjelenés,
és az igazolás nem külön natív fontfokozat ígérete. A natív select, label/help
kapcsolat, referenciaút és a két workspace közös tulajdonosa változatlan.
A mérés nem szerkeszti a Draftot. Régi, nem igazolt érték megőrizhető, de
jóváhagyást csak az aktuális teljes Approval QA és külön megerősítés enged.

### Változatlan arculat és mérések

Nem változtak a rendszerfontok, tokenek, profilok, alkalmazásforrások, generált
CSS/TS, Foundation LOCKED, vagy az R01 teszt és Chromium partial-raster javítása.
Nincs új fontfájl, függőség, schema vagy publikus modulinterfész.
A pixelküszöbök továbbra 20 pixel, 8/255 csatornaeltérés és 1% tintapixel;
nincs maszkolás. Minden eredeti súly és súlypár mérendő marad.

A medium token hat CSS-deklarációra hat: eyebrow, status-badge, button,
field label, text-link és workspace-footer span. Nincs globális vagy célzott
600→700 designátírás. A profil utility/action céljai nem hat külön fogyasztó
minden állapotának teljes tipográfiai lefedettségét jelentik; a korábbi lefedettség
megmarad. Az R01 további alkalmazásállapotokat is ténylegesen összehasonlít.

## Tesztmódosítások

- Az R05 teljes Approval QA-jában valamennyi profilcél mind az öt szélességen
  szerepeljen, pontos elemszámmal. Az opciólista és minden eredeti jelöltpár
  teljes azonosságát is ellenőrizzük. Bármely felkínált párhoz továbbra PASS kell.
- A jelenlegi 600 marad a Task Manager utility/action szerepeiben és a közös
  választóban. Ha a mért 600/700 pár FAIL, 700 nem lehet külön igazolt opció.
  A választó a mérésekből és minden közös tokenfogyasztóból számított metszethez
  igazodik; nincs OS-név szerinti tesztfelmentés.
- A natív billentyűzetes edit csak igazolt alternatívát választ. Edit után STALE,
  minden opció nem igazolt, és az eltérő Draft jóváhagyása elutasított. Undo az
  eredeti értéket és pontosan ugyanazt a korábban mért kontextust állítja vissza:
  azonos engine/session mellett az eredeti QA ismét használható. Új bizonyíték
  nem keletkezik. Restart után STALE, a tartós Draft megmarad.
- Sikeres teljes QA mellett is külön ellenőrizzük a hiányzó megerősítés (wire
  elutasítás), hibás run és hibás konfiguráció elutasítását, forrásváltozás nélkül.
- A súlyt figyelmen kívül hagyó valódi komponens és a natív hover izolációjának
  meglévő negatív kontrollja megmarad. Új altesetként egy explicit izolált Draft-
  edit 500-ra állítja a mediumot: teljes hételemű Approval QA, R05 FAIL,
  megőrzött/disabled 500, változatlan Draft/forrás és HTTP 409 jóváhagyás-tiltás.
  Ez nem a hiányzó vagy célzott QA miatt elutasított eset.
- Az M5 pozitív Approval-tranzakcióból eltűnt a korábbi 600→700 tesztjavítás:
  a színváltozás mellett a 600 marad. A teljes QA, modal/Escape/fókusz,
  tranzakcióhiba/rollback, explicit újrapróba, hiteles token/CSS/TS és újraindítás
  ellenőrzései megmaradnak; új állítás igazolja a hiteles forrás 600-as értékét.

A meglévő M6 tesztesetek száma nem változott; a negatív alteset ugyanazon eset
része. A teljes `verify:m6` továbbra valamennyi kötelező esetet követeli,
kihagyás/retry nélkül. A teljes kapu és a workflow nincs lazítva vagy módosítva.

## Végrehajtási eredmények

Helyi környezet: Linux/Debian, kernel 6.18.57, Node **24.22.1**, npm **11.9.0**,
Chromium **156.0.8078.79**, hu-HU / Europe/Budapest böngészőbeállítás.
Ez eltér a történeti CI Chromium 159.0.8154.6 környezetétől.

| Ellenőrzés                                                                                                   | Tényleges eredmény                                                                                               | Bizonyíték (helyi, ignored QA-artifact)                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Specifikáció-, formázás-, lint-, TypeScript-, generált tokenintegritás                                       | PASS a verify:m5-ben; végső statikus ellenőrzés külön naplóval                                                   | `test-results/r05-finalization/`, `verify-m5.log`                                                                       |
| Unit/integráció                                                                                              | 216/216 PASS                                                                                                     | `test-results/unit.json`                                                                                                |
| Teljes helyi verify:m5                                                                                       | PASS; 89 M0–M2 + 24 M3 + 15 M4 + 11 M5 browser, nincs skip/retry/flaky                                           | `test-results/m3-results.json`, `m4-results.json`, `m5-results.json`                                                    |
| Eredeti R01                                                                                                  | 5/5 teszt, 25 kép/geometria-pár PASS; maximum 6 eltérő pixel, maximum 1 csatornaeltérés, eredeti 8/1 tolerancia  | `test-results/m3/r01-*.json`, `docs/reports/evidence/m3/`                                                               |
| Valódi Task Manager Approval + rollback/retry, eredeti 600 megtartásával                                     | PASS; 7/7 check és 160 tényleges QA-eset; hiteles token/CSS/TS és restart ellenőrizve                            | `test-results/m5-approval-qa.json`, `m5-typography-approval/`, `m5-browser.json`                                        |
| Öt csomag build + npm pack                                                                                   | PASS; csak helyi RC-artifactok                                                                                   | `artifacts/packages/inventory.json`, `r05-finalization/build-packages.log`                                              |
| Tiszta Hangár telepítés a tarballokból, saját lockfile-os npm ci, ESM/export/típus-smoke és produkciós build | PASS; nincs WDF-package-symlink; a telepített QA és Lab JS bájtra egyezik a tarballokkal                         | `test-results/m6-consumer.json`, `r05-finalization/install-consumer.log`                                                |
| Hangár fogyasztó E2E/Approval és reszponzív/állapot/axe/billentyűzet                                         | 2/2 PASS, skip/retry nélkül                                                                                      | `r05-finalization/consumer-browser.json`, `consumer-e2e.log`                                                            |
| R05 kötési/hover negatív kontroll + nem deklarált 500, teljes QA                                             | PASS; az 500-as esetben kizárólag R05 FAIL, a másik 6 check PASS, explicit approve 409, változatlan Draft/forrás | `r05-finalization/attempt-1/r05-browser.json`, `m6-typography-binding-negative/report.json`, `unsupported-current.json` |
| Végleges pozitív R05, valódi Lab + csomagolt Hangár                                                          | 1/1 PASS, skip/retry nélkül; Task Manager és Hangár PASS                                                         | `r05-finalization/r05-positive-browser.json`, `r05-positive.log`, `test-results/m6-r05-typography.json`                 |
| Forrás- és UI-szerződésintegritás                                                                            | PASS; 92 védett fájl változatlan, mérési predikátumok bájtra változatlanok; premium audit 0 finding              | `r05-finalization/source-integrity.json`, `premium-audit.json`                                                          |
| Friss natív Windows                                                                                          | NOT_RUN                                                                                                          | nincs Windows-környezet; a javaslat alább                                                                               |
| Teljes aktuális verify:m6 / Linux+Windows CI                                                                 | NOT_RUN ebben a feladatban                                                                                       | nem indult új Actions-futás                                                                                             |

A két végleges pozitív projektmérés összesen **95 kontextus / 205 súlypár**:
Task Manager 55/165, Hangár 40/40. A Task Manager **55 sikertelen összeolvadási
párja megmaradt FAIL-nak**, nem került ki a mérésből; nincs köztük két felkínált
képviselő. Utility/action current 600, igazolt készlet 400/600, elutasított 700.
A Hangár 400/700 és 30 külön alaptipográfiai összevetése változatlan, PASS.
Mindkét projekt eredeti computed family/size/weight kötései és fontméret-
különbségei ellenőrzöttek. A vizsgált szélességek 320/390/768/1024/1440 CSS px.
A Hangár R05-képei az előző fogyasztó-E2E explicit tesztszerkesztéseivel létrehozott,
izolált Approved Baseline-t mutatják (például accent/radius módosítás). Ez nem az
`examples/listening-room` forrásának arculatmódosítása; a kanonikus projektfájlok
bájtra változatlanok. A 30 összevetés a korábbi alaptipográfiát ellenőrzi,
nem minden képpixel eredeti brandállapottal való azonosságát.

A külön 500-as negatív futás további 55 kontextust és 165 párt őriz; ez nem
keverendő a pozitív eredmény számaival.

A fogyasztó meglévő 200%-os CSS-szövegméret/reflow próbája PASS. Ez **nem natív
browser zoom**, nem helyettesíti a továbbra NOT_RUN natív 200%-os ismétlést.
Automatizált axe/keyboard PASS alapján nem állítunk teljes kézi WCAG-megfelelőséget.

### Sikertelen első futás és javított tesztelvárás

Az első R05-futtatás két esetéből a negatív PASS, a pozitív **FAIL** volt:
az új teszt 400-at várt a `confirmed:false` kérésre, a meglévő HTTP-végpont
viszont 409-cel utasít el minden ChangeManager-érvényesítési hibát. A Task Manager
képességmérése ebben is PASS volt, de a teljes pozitív teszt nem fejeződött be,
a globális mérési report ERROR. Ezt nem jelöljük teljesített R05-nek.

A teszt most 409-et és a `confirmed` mezőre mutató hibát követel; a hibás run és
konfiguráció továbbra 409 / APPROVAL_QA_REQUIRED. Nem változott a szerver vagy
a megerősítés literal-true feltétele. Az Undo-hoz eredetileg beírt új, állandó
STALE-feltevést is korrigáltuk a Blueprint §6 szerinti, meglévő kontextuskötéshez:
a jóváhagyási tiltást az eltérő Drafton mérjük, Undo után pedig pontos teljes
kontextusazonosságot és ugyanazon QA-id megtartását követeljük. Más kontextus
vagy restart nem használhatja ezt a bizonyítékot.

A sikertelen futás logja, JSON-ja, screenshotja és trace-e változatlanul a
`test-results/r05-finalization/attempt-1/` könyvtárban maradt. Az eredeti
`r05-focused.log` is megmaradt. A korrigált pozitív teszt külön futásban PASS,
a negatív teszt kódja eközben nem változott; a sikeres negatív esetet nem futtattuk
újra indokolatlanul. A két állapot/futtatás nem összevont vagy átírt eredmény.

### Pontos parancsok

```sh
npm ci --ignore-scripts --offline --cache .cache/npm
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m5
npm run build:packages
npm_config_offline=true npm run install:consumer
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:m6 -- consumer.spec.ts
# Első R05-futás: negatív PASS, pozitív tesztelvárás FAIL; megőrzött bizonyíték:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:m6 -- typography.spec.ts typography-negative.spec.ts
# Csak az érintett pozitív eset újrafuttatva, javított elvárással: PASS:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:m6 -- typography.spec.ts
npm run format:check
npm run lint
npm run typecheck
```

A függőségi cache harmadik fél rögzített csomagjaihoz helyben rendelkezésre állt;
a projekt saját WDF-csomagjai az aktuális forrásból készültek. A változatlan
mainből új npm ci esetén normál registry-hozzáférés használható. Nincs új függőség.

### A ténylegesen mért munkafa azonosítói

A `commit` mező a kiinduló commit, nem a még nem létrehozott javításcommit.
A `workingTree`, `sourceSha256` és `harnessSha256` mezők azonosítják a futtatott
módosításokat. A végleges pozitív R05-harness SHA-256:
`53983c277e5e0effa406cb6fe1c5d2a139a37c28514874855877edbb11b3941e`.
A QA algoritmus forrásának SHA-256:
`e78d8a12d7597655b8a21eec5fd94151195164ff7b71f76445d484857914f982`.
A teljes védettfájl- és futásidejű/tesztfájl-lista a forrásintegritási JSON-ban van.
Az új helyi csomagok pontos SHA-256-ja az inventoryban és az átadott csomagban
ellenőrizhető; az RC-verzió nem önmagában a változatlan tartalom azonosítója.

## Megőrzött történeti bizonyíték

A nyilvános [43825980171 futás](https://github.com/BenHRVTH/web-development-foundation-public/actions/runs/43825980171)
Linux és Windows teljes R05 JSON-blokkjai ellenőrzött gzip-exportban maradtak meg:
[proveniencia és lenyomatok](M6-R05-HISTORY.md). A teljes export helyi, ignored
QA-artifact; a forrás-diff mellett az átadott bizonyítékcsomag is megőrzendő.
Mindkét korábbi összesítés **FAIL**: platformonként 95 kontextus/205 pár, köztük
55 Linux- és 15 Windows-oldali sikertelen pár. A tömörített és kibontott SHA-256
külön rögzített. Sem ezek az eredmények, sem a privát archívum
[M6-R05-CORRECTION](M6-R05-CORRECTION.md) és
[M6-TYPOGRAPHY-HANDOFF](M6-TYPOGRAPHY-HANDOFF.md) történeti állításai nincsenek
új PASS-szá átírva. A régi PNG-hashekből nem állítunk helyben megnyitott képeket.

## Windows és célzott CI-javaslat

**Friss natív Windows: NOT_RUN.** Az elérhető futtatókörnyezet Linux; nincs
elérhető natív Windows-shell vagy távoli Windows-runner. A helyi véglegesítéskor új GitHub Actions-futtatás
még nem volt engedélyezett; a később engedélyezett PR-CI külön ellenőrzés. A korábbi Windows-adatok nem az új kód friss
végrehajtásai, és nem helyettesítik azt.

Felülvizsgálat után az **eddigi, regisztrált workflow** külön, kézi diagnosztikai
útvonala javasolt `workflow_dispatch` `scope: r05` bemenettel, `windows-latest`
runneren. A default `scope: full`, valamint valamennyi `push`/`pull_request`
esemény maradjon teljes `verify:m6`. A célzott job neve/artifactja jelezze:
**R05 diagnostics, not full M6**. Ez most csak javaslat; a workflow nem változott.

A célzott Windows-job parancsai (a feltöltés és indítás külön későbbi döntés):

```powershell
node --version
npm --version
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber
npm ci --ignore-scripts
npx --no-install playwright install chromium
npm run check:spec
npm run test:m5:storage
npm run build:packages
npm run install:consumer
npm run test:m6 -- typography.spec.ts typography-negative.spec.ts
npm run test:m5 -- --grep 'T14/T15|T16/C08'
npm run test:m3 -- r01.spec.ts
```

Minden parancs nem nulla kilépési kódja állítsa le a jobot; a PowerShell lépések
ne nyeljék el a korábbi hibát. Pinned checkout/setup-node/upload-artifact SHA-k,
`contents: read`, `persist-credentials: false`, nincs secret vagy írási jog.
A mérési forrás SHA-ját, tényleges Chromiumot/fontface-eket, minden nyers párt,
Lab-/alkalmazásképeket, negatív és Approval-/R01-bizonyítékokat, valamint az
artifactok SHA-256-át őrizze meg. A célzott futás nem váltja ki a később külön
jóváhagyandó teljes Linux/Windows M6-kaput.

## Korlátok, readiness és visszaállítás

- Teljes friss Linux/Windows `verify:m6`: **NOT_RUN** ebben a feladatban; helyi,
  releváns regresszió és célzott M6-integráció készül. A teljes kapu még szükséges.
- Friss natív Windows: **NOT_RUN**, ezért nincs platformfüggetlen végső PASS.
- A korábbi natív 200%-os browser zoom végső ismétlése és a teljes kézi/R10-
  mátrix nem kap új PASS-t. A CSS-fontnagyítás nem helyettesítés.
- A rendszerfontok OS-/fonttelepítés-függők; az igazolás továbbra mérési
  környezethez és munkamenethez kötött. Fontfrissítés után új Lab/QA kell.
- Az új csomagok helyi, azonos RC-verziójú ellenőrzési artifactok; nem kiadott
  frissítés és nem új licencdöntés. A meglévő publikációs/licencfeltételek élnek.

**M6 release readiness: BLOKKOLT**, a friss Windows-ellenőrzés, teljes kapu és
korábbi kötelező kézi hiányok lezárásáig. A helyi javítás ettől függetlenül
felülvizsgálható a külön ágon. Nincs automatikus merge vagy publikálás.

Rollback: a main és az eredeti repository eleve változatlan. A változatlan main
külön könyvtárból indítható; a helyi fejlesztési ág és bizonyítékai megőrizhetők.
Későbbi integráció esetén a teljes képviselőszabály-commit egységben revertálható;
ne keverjük az eltérő engine/session bizonyítékait. A Draft/Initial/Baseline
mentéseit visszaállítás előtt meg kell őrizni; nincs token- vagy adatmigráció.
