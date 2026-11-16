> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M4 átadás — Component Studio

Dátum: 2026-11-14 (Europe/Budapest). Ág: `feat/m4-component-studio`.
Kiindulópont: `22358f0`, az elfogadott M3 #4 merge-je a frissen lekért `origin/main` ágon.
Állapot: **PASS — teljes helyi kapu, szakmai felülvizsgálatra kész**. Az M4 után megállunk; a PR-t nem merge-eljük.
M5–M6 fejlesztés nem történt.

## Előkészítés

A négy irányadó specifikáció, M0–M3 architektúra, API-k és ADR-ek alapján készült.
A négy eredeti dokumentum byte-pontosan változatlan; a `check:spec` SHA-256 kapu él.
A fejlesztés előtt a teljes `verify:m3` PASS: **129 unit/integrációs, 89 korábbi
és 24 M3 Chromium-teszt, 25 R01 képpár**. Eredeti napló (privát archívum: `M4-baseline-m3.log`).
A környezet függőségeit `npm ci` telepítette; a Playwright saját Chromiumának hiánya
után a sikeres futások a meglévő `/usr/bin/chromium` böngészőt használták.

## Megvalósított funkciók

- Website View / Component Studio váltó a meglévő UI Labban; megőrzött munkamenet,
  alkalmazásadatok és egyetlen közös `EditableTokenConfig` jelölt.
- Registry-alapú Primitive/Composite galéria: mind a hét valódi komponens és az
  eredeti 27 fixture. Kiválasztott komponens, variáns, állapot és fixture látható.
- Valódi React- és CSS-renderelés külön adapterdokumentumban. Összes variáns
  nézet, hosszú tartalom, disabled/busy/error fixture, valódi hover/focus és
  kontrollált input/select/checkbox/kártya/dialog interakciók.
- Component Family / Component Variant élő szerkesztés a Registry és Contract
  deklarációiból; közös TokenField, típusos referenciák, pontos mezőhiba,
  Foundation/scope-védelem és fokozatos javíthatóság.
- A family edit minden megfelelő variánsra, a variant edit kizárólag a saját
  variánsára hat, a Website View összes megfelelő előfordulásán is. Nincs
  rejtett CSS-felülírás, DOM-kiválasztó vagy példányszintű szerkesztő.
- Preview wire 1.1.0, külön `apply-design` parancs, receiver-tulajdonú Registry
  engedélylista, strict scope/érték/azonosság, pontos origin/source/project/session,
  monotón revízió és teljes validáció utáni atomi CSS-csere.
- A legacy globális parancs komponensértéket nem módosít és nem állít vissza
  mellékhatásként. Elavult revízió és hiányzó ACK látható; reconnect újraküldi
  a közös jelöltet. A háttérben lévő workspace hibája a másikban is látszik.
- Props-hiba component/fixture/props útvonallal, renderkivétel FixtureBoundaryvel
  lokalizálva. Másik fixture, komponens és Website működőképes marad.
- Valódi 320/390/768/1024/1440 CSS px iframe; nincs skálázás. Kisebb desktop,
  összehajtható panel, hosszú tokennevek, görgethető nagy viewport és reflow.

A Foundation, hiteles `tokens.json`, `project.json`, az összes alkalmazáskomponens
és generált tokenfájl változatlan az M3-hoz képest. A projektben kizárólag a dev-only
Registry owner-deklarációi, új fixture-owner modulja és preview CSS-listája bővült.

## Módosított területek

| Terület                                                 | Eredmény                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/ui-lab/src`                                   | Studio, közös jelölt és mező, két megőrzött frame, státusz/hibajelzés, galéria és scope UI                        |
| `packages/adapter-react/src/registry`                   | Opcionális típusos fixture-owner, fixture-lokális props-hiba, repair katalógus, serializálható metaadat           |
| `packages/adapter-react/src/preview`                    | Studio-dokumentum és valódi projekt-CSS, engedélylista, közös validáció, utolsó alkalmazott receiver-konfiguráció |
| `packages/core/src/preview`                             | 1.1.0 séma, design snapshot és scope-biztos alkalmazás az M1 primitív fölött                                      |
| `packages/core/src/tokens/resolve.ts`                   | Meglévő referenciapredikátum exportja, a szabály módosítása nélkül                                                |
| `apps/task-manager/wdf`                                 | Eredeti komponenseket használó dev állapottulajdonosok és CSS-deklaráció                                          |
| `tests/m4`, Core M4 unit, Playwright M3/M4 konfiguráció | Pozitív, negatív, geometriai, interaktív és pixelregressziós bizonyíték                                           |
| package script, `tools/verify-m4.ts`, Actions           | Teljes M0–M4 kapu, 135 mért eset, négy pixel-összevetés, forrásintegritás                                         |
| Dokumentáció és Lab design/UX                           | ADR, API, használat, adatmodell, ellenőrzések, vizuális review, visszaállítás                                     |

## Lefuttatott ellenőrzések

| Vizsgálat                                                                 | Tényleges eredmény                                                                                                                                             |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m4` | PASS, minden alkapu exit 0                                                                                                                                     |
| Specifikáció, generált CSS/TS/séma, Prettier, ESLint, strict TS           | PASS                                                                                                                                                           |
| Unit/integráció                                                           | 135/135 PASS, 0 failed/skipped                                                                                                                                 |
| M0–M2 Chromium                                                            | 89/89 PASS (dev, production, valódi komponensek)                                                                                                               |
| M3 Chromium                                                               | 24/24 PASS, az eredeti R01 algoritmussal és toleranciával                                                                                                      |
| M4 Chromium                                                               | 15/15 PASS, 0 failed/skipped/retry/flaky                                                                                                                       |
| T07 + R02/R03/R07/R08                                                     | 27 fixture × 5 valódi viewport = 135 mérési rekord; 16/24/32 px padding és tartalmi inset                                                                      |
| T06/C05                                                                   | Valós app összes primary gombja változik, más variáns és global accent izolált; family az összes Button/TaskCard előforduláson és részleten is él              |
| C04                                                                       | Hibás props, dobó validator és renderkivétel lokalizált; egészséges fixture és Website használható                                                             |
| Negatív protokoll                                                         | Forged identity/scope/code, Foundation, hibás referencia, mixed batch, duplikált slot és stale revision elutasítva; ACK/reconnect és 404 boot-hiba ellenőrizve |
| R01                                                                       | 25/25 valós kép/geometria pár PASS; geometriai tolerancia 0                                                                                                    |
| VR01                                                                      | 4/4 pixel-összevetés PASS, geometria visszaállításkor pontosan azonos                                                                                          |
| Production                                                                | Build PASS, fejlesztői modulok kizárása a buildgráfban; az app forrása és tokenadata változatlan                                                               |
| Hiteles forrásintegritás                                                  | Teljes kapu előtti/utáni SHA-256 lenyomat azonos                                                                                                               |
| Statikus UI-audit, app + Lab                                              | 0 finding mindkettőben                                                                                                                                         |
| Lab DESIGN lint                                                           | 0 error, 1 warning: nincs duplikált YAML tokenforrás, a runtime tulajdonos dokumentált                                                                         |

Bizonyítékok: teljes napló (privát archívum: `M4-verification.log`), M4 kapu/geometria/pixeladat (privát archívum: `M4-results.json`),
unit JSON (privát archívum: `M4-unit-results.json`), korábbi browser JSON (privát archívum: `M4-regression-browser-results.json`),
M3 browser JSON (privát archívum: `M4-m3-browser-results.json`), M4 browser JSON (privát archívum: `M4-browser-results.json`),
M3 regressziós képadatok (privát archívum: `M4-m3-regression-results.json`), tesztelt forráslenyomat (privát archívum: `M4-source-snapshot.json`),
Lab audit (privát archívum: `M4-ui-static-audit.json`), app audit (privát archívum: `M4-app-static-audit.json`), DESIGN lint (privát archívum: `M4-design-lint.json`).

Külön végrehajtva: `npm run typecheck`, `npm run lint`, `npm run format:check`;
`python3 /tmp/m4-skill/audit_project.py . --mode strict` és ugyanaz
`--config packages/ui-lab/premium-ui.json` kapcsolóval; `npx --yes --package @google/design.md designmd lint packages/ui-lab/DESIGN.md`.
A skill audit-scriptje ideiglenesen kiolvasott eszköz, nem repository- vagy CI-függőség.
A runtime megfelelőséget a projekt saját kapui bizonyítják.

Az R01 diagnosztikai naplók történeti részvizsgálatok: M3 kontroll (privát archívum: `M4-R01-control.log`),
renderer-rögzítés előtti SVG-pixel eltérés (privát archívum: `M4-R01-position.log`),
azonos rendererrel 25/25 pár PASS (privát archívum: `M4-R01-renderer.log`). Az aktuális teljes kapu
eredménye a fenti M4-verification.log és M4-results.json; a korábbi eltérés nem
nyitott hibaként vagy elfogadott toleranciabővítésként maradt meg.

Teljes reprodukció:

```sh
npm ci
npx playwright install --with-deps chromium
npm run verify:m4
# A jelen környezetben végrehajtott teljes kapu:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m4
```

A kapu saját szervereket indít; előtte minden kézi Lab/dev/preview folyamatot állíts le.
Az M4 kapu a teljes `verify:m3`-at hívja, az pedig M2/M1/M0 regressziót futtat.
A jelentés PASS csak teljes, skip/retry nélküli M4 böngészős csomag, 135 geometriai
rekord, négy pixel-összevetés és változatlan app-/tokenforrás esetén lehet.

A negatív tesztek route-szintű, kizárólag tesztböngészőben érvényes injektálást
használnak. A szándékos `M4_RENDER_FAILURE` konzolnyoma a sikeresen elkapott hiba
bizonyítéka. A referenciaprojektben nem maradt hibás fixture vagy forrásmódosítás.

## Vizuális és böngészős bizonyíték

Az R01 PNG-k a végleges forrássnapshoton megismételt, önálló képrögzítő futásból
származnak: 25 pár pontos pixel-/geometriaadata (privát archívum: `M4-r01-proof.json`),
napló (privát archívum: `M4-r01-proof.log`), 320 px standalone (privát archívum: `evidence/m4/r01/r01-320-normal-outside.png`)
és Website (privát archívum: `evidence/m4/r01/r01-320-normal-inside.png`). Az összes 50 eredeti PNG
az `evidence/m4/r01` könyvtárban van. A történeti M3-átadás képei változatlanul
megmaradtak; az új bizonyíték az M4 csomagjához tartozik.

- Component Studio desktop (privát archívum: `evidence/m4/studio-1440.png`), kisebb desktop (privát archívum: `evidence/m4/studio-1024.png`), 760 px (privát archívum: `evidence/m4/studio-760.png`), 390 px reflow (privát archívum: `evidence/m4/studio-390.png`).
- Primitive variánsok (privát archívum: `evidence/m4/primitive-variants.png`), Composite / Compact–Comfortable–Spacious TaskCard (privát archívum: `evidence/m4/task-card-comparison.png`).
- Family előtte (privát archívum: `evidence/m4/family-before.png`), utána (privát archívum: `evidence/m4/family-after.png`); Variant előtte (privát archívum: `evidence/m4/variant-before.png`), utána (privát archívum: `evidence/m4/variant-after.png`).
- Ugyanazon edit a Website View több gombján (privát archívum: `evidence/m4/website-shared-edit.png`).
- Hibás fixture pontos props-útvonallal (privát archívum: `evidence/m4/invalid-fixture.png`), lokalizált renderkivétel (privát archívum: `evidence/m4/render-failure.png`).
- Focus (privát archívum: `evidence/m4/button-focus.png`), busy (privát archívum: `evidence/m4/button-busy.png`), hosszú gomb (privát archívum: `evidence/m4/button-long.png`), inputhiba (privát archívum: `evidence/m4/input-error.png`), natív Select billentyűzet (privát archívum: `evidence/m4/native-select-keyboard.png`), hosszú Dialog (privát archívum: `evidence/m4/dialog-long.png`).
- Button kiinduló pixelkép (privát archívum: `evidence/m4/vr-button-before.png`), visszaállított (privát archívum: `evidence/m4/vr-button-restored.png`); TaskCard kiinduló (privát archívum: `evidence/m4/vr-task-card-before.png`), visszaállított (privát archívum: `evidence/m4/vr-task-card-restored.png`).

A végleges futásban az R01 legnagyobb eltérése 8 pixel / 1 csatornaegység.
A VR01 három párja teljesen pixelazonos; a TaskCard visszaállításánál 38 pixel,
legfeljebb 1/255 csatornakülönbség mérhető kizárólag a négy mért kártyasarokban.
A renderelt alakzatok mérete, paddingje és radiusa visszaállításkor pontosan egyezik.

Vizuálisan megvizsgálva: galériacsoportok és kiválasztás, vezérlők igazítása,
fixturenevek, tokenhivatkozások, panelgörgetés, preview-hangsúly, hosszú tartalom,
modal, hiba és keskeny desktop. A hosszú referencia teljes célja külön sorba került;
a Studio vásznának látható magassága a magasabb vezérlősorhoz igazodik.
A teljes regresszió által feltárt félpixeles munkaterületváltó-sormagasság javítva:
a keretek egész pixelre kerülnek. A váltó a meglévő fejlécben kapott helyet, így
a Website iframe fizikai helyzete is az elfogadott M3-é marad; a külön vezérlősor eltolása nem marad része a Website elrendezésének. A
`--disable-gpu` beállítással az akkori 25 képpár PASS lett, de ez önmagában
nem bizonyult stabilnak: a későbbi push CI-futás elbukott. A javított M3/M4
profil a részleges raszterújrafelhasználást is kikapcsolja
(`--disable-gpu --disable-partial-raster`). Az R01 összehasonlítási algoritmusa,
geometriai feltételei és toleranciája változatlan; a hibás állapot diagnosztikája
most az assert előtt megmarad. A kiváltó ok, az eredeti CI-pixelek és az ismételt
teljes ellenőrzések a [javítás jelentésében](M4-R01-REPAIR.md) szerepelnek.
A Studio-mátrix már a parent iframe
900 px-es méretét és egész pixeles x/y elhelyezését is ellenőrzi.
A tudatosan kiválasztott túlméretes iframe levágása a vásznon belüli görgetés része;
nem skálázás vagy elveszett tartalom. 390 px-es Labban a panel a dokumentumba sorolódik.

A közös asztali Chromiumban a Website View, Component Studio, valódi Button és
TaskCard variánsnézet is megnyitva és képernyőn ellenőrizve. A végleges
fejléces Studio natív Select popupját Space billentyűvel megnyitottuk, a listát
vizuálisan ellenőriztük; Down/Down/Enter után a kontrollált érték ténylegesen Kész lett. A natív popupok a
platform tulajdonában maradnak. A renderelt kártyák bal oldali tartalmi insetje és
computed paddingje minden mért szélességen 16/24/32 px.

Az eredeti R01 elvárás és tolerancia változatlan: 25 kép/geometria pár, geometriai
eltérés 0, legfeljebb 8 pixel, csatornánként legfeljebb 1/255. Az M4 VR01 külön
fixture-párokat vizsgál: variáns-összehasonlítás 0 pixel; edit/visszaállítás azonos
méret mellett legfeljebb 64 egyegységes pixel, kizárólag a négy 8 px-es kártyasarkon,
helyzet szerint is ellenőrizve. Nincs maszkolás vagy skálázás. A nyers különbségadatok
és képek megőrzöttek; a screenshot elkészülte nem önálló sikerkritérium.

### Designkontextus egyeztetése

| Szabály                                              | Bizonyíték                                                     | Eredmény / intézkedés                               |
| ---------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| Semleges, petrol Lab-keret és eredeti projektarculat | változatlan `--lab-*`, app CSS és tokenforrás                  | MATCH                                               |
| Preview az elsődleges, jobb oldali közös TokenField  | Studio vászon, scope panel, felső Registry-sor                 | MATCH; nincs állandó új bal oldalsáv                |
| M3-ban nincs Studio                                  | az engedélyezett M4 második workspace                          | szándékos mérföldkőbővítés; Lab DESIGN/UX frissítve |
| Egyetlen hiteles tokenforrás                         | közös Core emitter, egy App-jelölt, receiver Registry-engedély | MATCH; dokumentáció nem duplikál tokenadatot        |

## Ismert korlátok és megállás

Nincs nyitott M4-blokkoló a fent rögzített környezetben. A szakmai felülvizsgálat
és a PR merge külön döntés; merge nem történt.

- Chromium ellenőrzött; Firefox/WebKit, képernyőolvasó, fizikai érintős mobil és
  teljes 200%-os zoommátrix NOT_RUN. Az axe nem teljes WCAG-tanúsítvány.
- Natív select/color picker popup platformfüggő. Helyi fontfallback; nincs fontletöltő.
- FixtureBoundary renderkivételt izolál; esemény-/async kivétel preview runtime-hiba.
  Teljes Registry-modul importhibájánál a modulon belüli entry-k nem különíthetők el;
  a Website tovább használható, a forrást fejlesztő javítja.
- A Registry-katalógus szerverindításkor készül; Registry-metaadat módosítása után
  indítsd újra a Labot. Forrás-HMR állapotresetet okozhat, ez nem M5-konfliktuskezelés.
- Egy helyi projekt, külön loopback origin és fix Lab-port. A privát TS-workspace
  külső publikálható csomagolása M6-feladat.
- Nincs Initial Reference, Approved Baseline, perzisztens Working Draft, Undo/Redo,
  A/B, Audit, javításjóváhagyás vagy véglegesítés. A Lab-újratöltés eldobja a jelöltet.

## Biztonságos visszaállítás

Tiszta munkafáról külön ágon elérhető az elfogadott M3, az M4 törlése nélkül:

```sh
git switch -c rollback/m4-to-m3 22358f0
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m3
# Visszatérés:
git switch feat/m4-component-studio
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m4
```

Később jóváhagyott merge visszavonása Git revert feladat; nincs történetátírás,
adatbázis vagy designmigráció. Sessionedit eldobásához a Lab bezárása/újratöltése elég.
A Lab semmilyen Git-műveletet vagy hiteles tokenforrás-írást nem hajt végre.

## Következő mérföldkő

M5 csak az M4 szakmai elfogadása és külön felhasználói jóváhagyás után indulhat.
Belépési feltétel a sikeres M4 kapu, a dokumentált közös jelölt és a scope-/preview
szerződés megtartása. M5-ben a jelölt tulajdonlása Change Managerhez kerülhet;
ez az M4-ben nem részlegesen implementált funkció.

Részletek: [ADR-0006](../adr/0006-m4-component-studio.md), [M4 API](../M4-API.md),
[Studio útmutató és adatmodell](../M4-COMPONENT-STUDIO.md).
