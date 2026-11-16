> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M2 átadás — Task Manager és Component Registry

Dátum: 2026-11-14 (Europe/Budapest). Ág: `feat/m2-task-manager`.
Állapot: **PASS — M2 megvalósítva, helyi teljes kapu sikeres**. M3–M6 nem kezdődött el.

## Kiindulópont és scope

A GitHub main frissen lekért `c3b5728` állapotából indultunk, amely tartalmazza
az elfogadott M1-et és az M1 javító szerkesztését. A munkafa induláskor tiszta volt.
A négy eredeti specifikáció, M0/M1 átadások, architektúra és ADR-ek elolvasva;
az eredeti négy fájl byte-szinten változatlan, lenyomatukat a kapu ellenőrzi.
Az M1 implementációból nem készült párhuzamos Foundation vagy Contract rendszer.

A fejlesztés előtti eredeti `verify:m1` eredménye **PASS: 69 unit/integrációs,
20 Chromium-teszt**. Napló: M2-baseline-m1.log (privát archívum: `M2-baseline-m1.log`).
Az első kísérlet a még nem telepített függőségek miatt nem indult el; `npm ci`
után a teljes M1-kapu ténylegesen végigfutott, az implementáció megkezdése előtt.

## Megvalósított funkciók és használat

A Lépés egy önálló React + TypeScript + Vite Task Manager, magyar felülettel,
saját lila munkafüzet-arculattal. A karakteres megjelenés projektszintű döntés,
nem új WDF-alapértelmezés.

- Lista hat rögzített feladattal, ebből kettő kész; munkameneten belül stabil ID-k.
- Részletnézet teljes tartalommal, hash-navigációval, Vissza/Előre működéssel.
- Új feladat, meglévő feladat szerkesztése ugyanabban a modal űrlapban.
- Teljesítés és visszavonás listán és részletekben; azonnali visszajelzés.
- Minden/Nyitott/Kész szűrés; mentéskor a szűrő csak akkor vált, ha elrejtené a mentett feladatot.
- Kötelező, legfeljebb 160 karakteres cím; opcionális, legfeljebb 4000 karakteres leírás.
- Inline hiba, első hibás mező fókusza, értékmegőrzés és dupla submit elleni védelem.
- Nem mentett módosítások elvetésének külön döntése; Escape, fókuszkör és visszaadás.
- Üres szűrési eredmény, hiányzó részlet és hosszú szövegek érthető kezelése.
- A lap világosan jelzi: az állapot memóriában él, újratöltés visszaállítja a kezdőadatokat.

Indítás: `npm ci`, `npm run dev` → `http://127.0.0.1:5173`.
Önálló build: `npm run build`, `npm run preview` → `http://127.0.0.1:4173`.
Nincs adatbázis, API, bejelentkezés, felhőszinkron vagy külső fontfüggőség.

## Módosított területek

| Terület                                                 | Eredmény                                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/task-manager/src/App.tsx`, `tasks/`               | Valódi üzleti folyamatok, memóriaállapot, navigáció és közös form                               |
| `src/components/`                                       | Button, TextInput, Select, Checkbox, TaskCard, Dialog, StatusBadge; exportált props-interfészek |
| `wdf/project.json`, `tokens.json`, `registry.ts`        | Configured Registry, egyetlen tokenforrás, 7 tudatos regisztráció és 27 fixture                 |
| `src/generated/`, `app.css`                             | M1 által generált CSS/TS; a bootstrap CSS helyett tokenfogyasztó appstílus                      |
| `packages/adapter-react/src/`                           | Props-típusos regisztráció, lokális diagnosztika és fixture render boundary                     |
| Vite / tesztkonfiguráció                                | Test-only fixture-root, a production modulgráf tiltott importjainak kapuja                      |
| `tools/check-m2.ts`, package scripts, Actions           | Önálló M2 kapu, M0/M1 regresszióval; CI artifactok                                              |
| `docs/M2-API.md`, ADR-0004, DESIGN, UX-CONTRACT, README | Publikus komponens/Registry API, design-tulajdon és használati szerződés                        |

A Foundation és Core implementációja változatlan. M1-tesztekben kizárólag a
projektre vonatkozó integrációs és arculati elvárások migrálódtak; a deferred M1
resource-fixture külön megmaradt, a gráf/scope/IO/negatív esetek nem lettek kihagyva.
Az M2 új vizuális alap, nem az M0 indítási oldal pixelazonos folytatása.

## Komponens- és Registry-szerződés

Primitive: Button, TextInput, Select, Checkbox, StatusBadge.
Composite: TaskCard, Dialog. A TaskForm és a technikai segédek nem kerülnek
implicit módon a Registrybe. Az app és a fixture ugyanazokat a React-exportokat használja.

A regisztráció stabil ID-t, nevet, kategóriát, tényleges implementációreferenciát,
variánsokat, állapotokat, props-sémát, típusos fixture-öket és pontos family/variant
token-ID-kat tartalmaz. A `defineComponent<P>` a tényleges implementációból vezeti
le a props-típust; a negatív TypeScript assertion hibás boolean propot tilt.
A runtime ellenőrzi a típust, azonosítókat, fixture-lefedést és token-scope-ot.

Hibás projektszerződés/token blokkol; hibás regisztráció a saját komponensét zárja ki.
A diagnosztika eljut a component/fixture/prop útvonalig. A renderkivétel külön React
boundaryben lokalizált; a szomszéd működőképes marad. A bejegyzések hibáját nem
minősítjük csendes sikernek: a projekt tesztje 7 egészséges bejegyzést és 0 diagnosztikát kér.
Részletek és API-példák: [M2-API](../M2-API.md), [ADR-0004](../adr/0004-m2-task-manager-registry.md).

A `tests/fixtures` egyetlen kiválasztott komponenst renderelő tesztoldal, külön
Vite-rooton; nincs galéria, szerkesztő vagy Studio-kezelőfelület. A production
build modulgráfja elutasítja a Registry, harness és WDF fejlesztői runtime importját.

## Tényleges ellenőrzések

Környezet: Linux, Node 24.22.1, npm 11.9.0, rendszer-Chromium 156.0.8078.79,
Playwright 1.65.1, Vitest 5.1.0, axe-core 4.14.0. Böngésző: hu-HU,
Europe/Budapest, headless; reduced-motion alapbeállítás, explicit no-preference próbával.

```sh
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m1
npm run generate:tokens
npm run format
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m2
python3 /tmp/wdf-m2-audit.py . --mode strict --output docs/reports/M2-ui-static-audit.json
npx --yes --package @google/design.md@0.4.0 designmd lint DESIGN.md
python3 tools/compare-m2-screenshots.py
git diff --check
git diff --exit-code -- AGENTS.md WDF_IMPLEMENTATION_BLUEPRINT.md WDF_TEST_PLAN.md CODEX_START_PROMPT.md
```

A végleges gépi eredmények: M2-unit-results.json (privát archívum: `M2-unit-results.json`),
M2-browser-results.json (privát archívum: `M2-browser-results.json`). Teljes kapunapló:
M2-verification.log (privát archívum: `M2-verification.log`). A vizsgált forrásállapotot
M2-source-snapshot.json (privát archívum: `M2-source-snapshot.json`), a snapshot lenyomatát és a
futási környezetet M2-results.json (privát archívum: `M2-results.json`) köti az eredményekhez.

A végső kapu **exit 0: 116 unit/integrációs teszt 5 fájlban, 89 Chromium-teszt**,
0 failed, 0 skipped, 0 flaky. A CI külön távoli eredmény; a helyi futással nem azonos.

| Tesztcsoport            | Követelmény / módszer                                                                       | Eredmény                                              |
| ----------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| M0–M1 induló kapu       | Eredeti M1 ellenőrzés fejlesztés előtt                                                      | PASS, 69 unit + 20 browser                            |
| M2 statikus             | Spec SHA-256, token/séma drift, Prettier, ESLint, strict TS, CSS tokenintegritás            | PASS, exit 0                                          |
| Unit / integration      | M0/M1 + M2 Registry, 27 fixture SSR, negatív regisztráció, validáció                        | PASS, 116/116, 0 skipped                              |
| Funkcionális            | Létrehozás, validáció, szerkesztés, teljesítés/visszavonás, szűrés, navigáció, reset        | PASS, dev és production                               |
| Komponens               | Minden fixture valódi böngészőrenderje, állapotok, események, Select popup                  | PASS, 27 fixture + állapot/esemény/geometriai tesztek |
| Foundation / responsive | 5 szélesség; actual card/detail inset, ikonközép, méret/súly, overflow, ID, focus, axe      | PASS, 5/5 szélesség mindkét appkörnyezetben           |
| Negatív browser         | Ismétlődő ID, rossz kontraszt, mobiloverflow és izolált renderkivétel szándékos injektálása | PASS, a szándékos hibák észlelve                      |
| Production build        | Önálló statikus bundle, tiltott fejlesztői modul nélkül                                     | PASS, önálló production app                           |
| UI-skill statikus audit | A betöltött skill változatlan, ideiglenes scriptje                                          | PASS, 0 találat                                       |
| DESIGN lint             | Hivatalos CLI                                                                               | PASS, 0 error; 1 warning: nincs YAML tokenmásolat     |

A YAML-warning tudatos: az egyetlen designforrás a meglévő strukturált JSON.
A skill scriptje nem WDF QA engine és nem a reprodukálható repositorykapu függősége.
A teljes helyi kapu tényleges futása nem helyettesíthető a statikus audit eredményével.

## Böngészős és vizuális bizonyíték

Kötelező szélességek: **320, 390, 768, 1024, 1440 CSS px**, 900 px magassággal.
Minden szélesség normál/hiba/hosszú/üres/hiányzó állapotban, dev és production alatt.
Kiegészítés: 320×568 modal, billentyűzet, dupla submit és reduced-motion.
A kontrollált fixture-k külön komponensprojektben renderelődnek.

A mérések tényleges DOMRect értékek: a kártya keretétől a tartalmi dobozig mért,
borderrel korrigált inset; Compact 16, Comfortable 24, Spacious 32 px.
A részletnézet Spacious insetje mobilon is 32 px. A Button ikon/szöveg középeltérése
legfeljebb 1 CSS px, a 20 px-es ikonméret és legalább 44 px-es kontrollmagasság vizsgált.
A tipográfia számított mérete/súlya, a globális scrollbar, látható Tab-fókusz,
Dialog fókuszkör/Escape/visszaadás és a label/error kapcsolatok külön ellenőrzöttek.

A screenshotok: evidence/m2 (privát archívum: `evidence/m2/`). Példák:
desktop (privát archívum: `evidence/m2/production-1440-normal.png`),
mobil (privát archívum: `evidence/m2/production-320-normal.png`),
űrlaphiba (privát archívum: `evidence/m2/production-390-error.png`),
hosszú részletek (privát archívum: `evidence/m2/production-390-long.png`),
üres lista (privát archívum: `evidence/m2/production-320-empty.png`),
natív Select nyitva (privát archívum: `evidence/m2/native-select-open.png`).
Az 50 alkalmazás-screenshot az M2 kezdeti referenciabizonyítéka, nem Approved Baseline.
Az error-képek a modal tényleges viewportját mutatják; a többi nézet teljesoldalas.
Kiegészítő, azonos környezetű dev/production RGB-összehasonlítás:
M2-visual-comparison.json (privát archívum: `M2-visual-comparison.json`), mind a 25 pár pixelazonos.
Ez nem operációs rendszereken átívelő regressziós garancia, és nem M3 Lab R01.

A képeket vizuálisan is átnéztük, nem csak automatizált scannert futtattunk.
A review a desktop/mobil kompozíciót, magyar szövegtördelést, ikonok illeszkedését,
a hibaüzeneteket és a hosszú tartalom teljes hozzáférését vizsgálta.
Talált és javított részletek:

- Mobilon a checkbox eredetileg túl sok szélességet vett el a címtől; a felső sorba került.
- StrictMode mellett a kezdeti főcím feleslegesen fókuszt kapott; csak tényleges navigáció fókuszál.
- A busy Button láthatatlan felirata elvesztette a hozzáférhető nevét; most a név és méret megmarad.
- A márkalink neve eltért a látható szövegtől; most a saját szövege adja a nevét.
- A dialógus natív tabkezelését explicit záró fókuszkör egészíti ki.
- A hosszú mobilos részletcím túl nagy volt; deklarált reszponzív mérettoken javítja.
- A visszajelzés hosszú cím ismétlése helyett rövid kész/összes számlálót ad, stabil helyen.

A kontrollált fixture noop nem állapotkezelő: a Select billentyűzetes eseményét
külön teszttulajdonos frissíti, ugyanazzal a valódi komponenssel. A szűrt listából
eltűnő checkboxot a teszt kattintással és az eredmény ellenőrzésével vizsgálja;
nem várja hibásan egy már eltávolított DOM-elem checked attribútumát.

## GitHub Actions eltérés és javítás

Az első PR-futásban (`7647636`, [run 43619062627](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43619062627))
116 unit és 88 browser teszt sikeres, 1 browser teszt hibás volt.
A 1440 px-es production hosszútartalom-teszt a hash-váltás után az általános
`article` lokátort még a hét listaelemre oldotta fel, mielőtt a natív hashchange
esemény megjelenítette a részleteket. A teszt most közvetlenül a céloldal
`.task-detail` felületét várja, és azon ellenőrzi a teljes tartalmat.
Nincs mesterséges várakozás, skip vagy automatikus retry; az alkalmazás működése nem változott.
A tényleges CI-hibakivonat: M2-CI-REPAIR.log (privát archívum: `M2-CI-REPAIR.log`).
A helyi teljes kapu újrafutott a javított tesztforrással; a megőrzött M2-forrássnapshot
és tesztadatok ezt a változatot rögzítik. A távoli újrafutás állapota a PR Checks alatt követhető.

## Korlátok, további mérföldkövek

Nincs szándékosan kihagyott kötelező M2-funkció. A tesztelt böngésző Chromium;
Firefox/WebKit, képernyőolvasó, fizikai mobilbillentyűzet és teljes 200%-os zoommátrix
**NOT_RUN**. A releváns automatizált WCAG-eredmény nem teljes megfelelőségi tanúsítás.
A natív Select OS-felülete elfogadott és platformfüggő; nem állítunk egységes popup-arculatot.
A fixture boundary nem fog SSR-, async- vagy eseménykezelő-kivételt; import-sandbox nincs.
A privát TS-workspace export nem publikálható M6-disztribúció.

M3 Preview/Website View, M4 Studio UI, M5 Draft/Audit/jóváhagyás, M6 teljes release QA
**NOT_RUN**, nem kész. A Preview Manifest továbbra M3 deferred. Az eredeti T01–T16,
Lab R01 és a Draft/approval tesztek teljes rendszerszintű elfogadása nem következik
az M2 lokális szerződéses és böngészős eredményeiből.
A következő mérföldkő előfeltétele az M2 szakmai és felhasználói elfogadása, külön M3-utasítással.

## Biztonságos visszaállítás és átadási határ

Az M2 külön ágon, elkülönített commitokban adható át; a main változatlan.
Az elfogadott M1 tiszta munkafáról új ágon elérhető, az M2 törlése nélkül:

```sh
git switch -c rollback/m2-to-m1 c3b5728
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m1
# Visszatérés:
git switch feat/m2-task-manager
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m2
```

Már beolvasztott PR-nál merge-commit esetén `git revert -m 1 <M2-merge>`,
squash esetén `git revert <M2-squash-commit>` szükséges, nem történetátírás.
Rebase-elt, többcommitból álló átadásnál az egész M2-csomagot kell visszavonni,
fordított sorrendben: előbb a CI-tesztjavítást, majd az M2 implementációját.
A csomag listája: `git log --oneline c3b5728..feat/m2-task-manager`. Tokenváltoztatás külön
visszavonásakor a kanonikus JSON-t állítjuk vissza, majd generálunk és ellenőrzünk;
a CSS/TS kézi visszaírása nem önálló visszaállítás.
Nincs adatbázis, migráció vagy mentett Draft, amely külön helyreállítást igényelne.

A kért ág push és main felé nyitott PR az átadás utolsó Git-lépése.
A PR-t nem merge-eljük, az M3 nem indul automatikusan.
