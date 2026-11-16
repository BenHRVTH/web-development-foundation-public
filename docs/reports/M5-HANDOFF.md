> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M5 átadás — Change Manager, Audit és jóváhagyás

Dátum: 2026-11-14–15 (Europe/Budapest). Kiindulópont: `25320d3`, elfogadott M4 main.
Ág: `feat/m5-change-manager-audit`. **Állapot: a teljes helyi M5-kapu PASS,
szakmai felülvizsgálatra kész.** A négy irányadó specifikáció változatlan.
A fejlesztés az M5 végén megáll; merge, M6-fejlesztés és kiadás nem történt.

## Megvalósított funkciók

- Egyetlen, helyben tartós Working Draft, változatlan Initial Reference és külön,
  kifejezett QA-jóváhagyással létrehozott Approved Baseline.
- Atomikus, checksumolt mentés, history/cursor-integritás, folyamatlock és CAS;
  sérült vagy külsőleg átírt adatnál diagnosztika, automatikus helyettesítés nélkül.
- Global/family/variant edit, összetartozó gépelési művelet, teljes spacingpreset
  és egyedi Audit-javítás egyetlen Undo/Redo egységként. Mindkét preview közös állapotú.
- A/B: ugyanazon aktuális React-forrás Initial/Baseline és Draft designnal;
  a referencia olvasható, a Draftot nem írja felül, az elavultság látható.
- Közös, másodlagos Review panel, Audit és Changes, bizonyítékok, tokennavigáció,
  külön javaslatelfogadás/elutasítás, mentési és jóváhagyási visszajelzés.
- Tényleges Live Validation, Targeted és Approval Chromium QA. Config-, forrás-,
  környezet- és futásazonosság, öt külön státusz, valódi mérés, megszakításdiagnosztika.
- Megerősített token/CSS/TS/Baseline tranzakció, rollback-journal, újraindítás előtti
  helyreállítás. A Lab nem commitol, nem pushol és nem publikál.
- Strict, session/project/origin/Host-védett, zárt helyi API; nincs böngészőből
  küldhető fájlútvonal, shell, React-kód vagy Foundation-kivétel.

## Módosított területek

Core `change` API; Node ChangeManager és tároló; meglévő Lab App/Studio/TokenField;
közös Review/Comparison; QA Chromium-futtató; privát dev-függőségek; tesztek és kapu;
Actions; API, útmutató és ADR-0007/0008. A Task Manager hiteles tokenforrása, generált
kimenetei, React-komponensei és a Foundation változatlanok.

## Tényleges ellenőrzések és reprodukció

Környezet: Linux 6.18.57 x64, Node 24.22.1, npm 11.9.0, Chromium 156.0.8078.79,
Playwright 1.65.1, Vitest 5.1.0. Locale hu-HU, időzóna Europe/Budapest,
reduced-motion; változatlan `--disable-gpu --disable-partial-raster` renderer.
A folyamat-életciklus tesztek Linux `/proc`-ot és Python 3-at használnak;
a Lab futtatásának Python nem függősége.

```sh
npm ci
npx playwright install --with-deps chromium
npm run verify:m5
# A jelen környezetben ténylegesen végrehajtott teljes kapu:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m5
```

| Vizsgálat                                                               | Tényleges eredmény                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Induló `verify:m4`                                                      | PASS: 135 unit, 89 + 24 + 15 Chromium-teszt; 25 R01 pár                                                |
| Végső `verify:m5`                                                       | PASS, minden alkapu exit 0                                                                             |
| Specifikáció-/generáltkimenet-kapu, Prettier, ESLint, strict TypeScript | PASS                                                                                                   |
| Unit/integráció                                                         | 175/175 PASS, 0 failed/pending; ebből 39 Change Manager eset és egy valódi SIGKILL-integráció          |
| M0–M2 böngészős regresszió                                              | 89/89 PASS                                                                                             |
| M3 regresszió                                                           | 24/24 PASS, az eredeti R01 algoritmussal                                                               |
| M4 regresszió                                                           | 15/15 PASS, 135 valódi fixture/viewport geometria és négy pixel-összevetés                             |
| M5 workflow/biztonság/reszponzivitás                                    | 11/11 PASS, 0 skip/retry/flaky                                                                         |
| Approval QA                                                             | Hat kötelező check PASS, 32 Website/fixture állapot × öt szélesség = 160 tényleges renderelt vizsgálat |
| R01                                                                     | 25/25 képpár; geometriai eltérés 0; legnagyobb képi eltérés 6 pixel, legfeljebb 1/255 csatornaegység   |
| Jóváhagyás utáni CSS/TS                                                 | Az eredeti `generate-m1.ts --project <izolált-projekt> --check` byte-pontos kapuja PASS                |
| Forrásintegritás                                                        | Task Manager source/token/generált kimenet és Foundation előtte/utána SHA-256 egyezés                  |
| Git-invariáns                                                           | A Lab-tesztek nem változtatták a HEAD-et: első kapu `25320d3`, ismételt kapu `e1b4456`                 |
| Statikus app-/Lab-audit                                                 | 0 finding mindkettőben                                                                                 |
| Lab DESIGN lint                                                         | 0 hiba, 1 warning: nincs párhuzamos YAML-tokenforrás; a runtime tulajdonos dokumentált                 |

Tényleges bizonyítékok: teljes napló (privát archívum: `M5-verification.log`), kapuösszesítő (privát archívum: `M5-results.json`),
környezet és eredmények (privát archívum: `M5-reproduction.json`), tesztelt forráslenyomat (privát archívum: `M5-source-snapshot.json`),
unit (privát archívum: `M5-unit-results.json`), korábbi böngészős regresszió (privát archívum: `M5-regression-browser-results.json`),
M3 (privát archívum: `M5-m3-browser-results.json`), M4 (privát archívum: `M5-m4-browser-results.json`), M5 (privát archívum: `M5-browser-results.json`),
R01 nyers mérési adat (privát archívum: `M5-r01-results.json`), M4 geometria/pixel (privát archívum: `M5-m4-results.json`),
teljes Approval QA bizonyíték (privát archívum: `M5-approval-qa.json`), induló M4-kapu (privát archívum: `M5-baseline-m4.log`),
folyamat/fault résztesztek (privát archívum: `M5-process-lifecycle-tests.log`), Lab-audit (privát archívum: `M5-ui-static-audit.json`),
app-audit (privát archívum: `M5-app-static-audit.json`), DESIGN lint (privát archívum: `M5-design-lint.json`).

Külön is futtatva: `npm run typecheck`, `npm run lint`, `npm run format:check`,
`npm ls --depth=0`, `git diff --check`. A két statikus skill-audit parancsa
`python3 /tmp/wdf-m5-skill/audit_project.py . --mode strict`, illetve ugyanaz
`--config packages/ui-lab/premium-ui.json` kapcsolóval. Ez az ideiglenesen kiolvasott
skill-eszköz nem a WDF kapujának függősége. DESIGN: `npx --yes --package @google/design.md designmd lint packages/ui-lab/DESIGN.md`.

## Követelmények és hibainjektálás

A GitHub [első push CI-futásában](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43654136677)
a teljes Approval mátrix a 180 másodperces határnál `QA_TIMEOUT`/`ERROR` állapottal
leállt; ugyanazon commit [PR-futása PASS](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43654288713)
volt. A teljes QA-korlát ezért 600 másodperc, a tesztvárakozás ehhez igazodik.
A kötelező 160 render, hat check, eredeti R01 tolerancia és retry nélküli kapu
változatlan; az időkorlát lejárta továbbra is blokkoló ERROR.
Az ismételt helyi kapu a megőrzött Initial mellett megjelenő forrásváltozás-
diagnosztikával is fut. A régi M3/M4 előnézeti hibatesztek az alkalmazáselőnézet
region értesítését ellenőrzik, így a külön Change Manager értesítés nem okoz
félreérthető, több találatos locatort.

- T02/T13: egyszeri Initial, nem jóváhagyott referencia, tartós Draft és history/Redo restart után.
- T04/T05: minden globális/deklarált responsive spacinghely cseréje; egy Undo;
  valódi CSS-változás és visszaállítás. A család/variáns saját szerkesztése izolált.
- T09: A/B azonos React-belépéssel, változatlan teljes mentett állapottal;
  Initial és sikeres jóváhagyás után Approved Baseline a referencia.
- T10/T11/T12/C07: valódi, 19 px-es hibás projektkonfiguráció; egyenkénti elfogadás,
  elutasítás változatlan Drafttal és fennmaradó blockerrel; egy Undo. Inherited
  responsive hiba a ténylegesen deklarált értékhelyen javul.
- T14/T15: tényleges Approval QA, külön megerősítés, sikertelen token/CSS/TS/state
  tranzakció visszaállítása és sikeres újrapróbálás. Korábbi Baseline megőrzése
  minden pre-commit írási ponton külön unit/fault tesztben is bizonyított.
- T16/C08/C09: szerkesztés, külső React-/CSS-, Contract/token-/Registry- és
  környezetváltozás; QA érvénytelenítés, Draft-megőrzés, konfliktusos írás elutasítása.
- Sérült JSON/checksum/history, futás közben átírt mentés, bizonytalan rename,
  hozzáférési hiba, sérült journal, minden megszakítási pont, valódi SIGKILL,
  tényleges Linux-zombi és két egyidejű újraindítás: kontrollált hiba/helyreállítás.
- Duplikált/régi/jogosulatlan HTTP-művelet, idegen session/origin/project,
  Foundation- és scope-túllépés, tetszőleges útvonal/shell/kód: elutasítva.
- Futó, PASS, FAIL/NOT_RUN, ERROR és STALE QA látható; hiányzó kötelező check sem
  fogadható el. Audit-fix és Undo/Redo mindkét preview-val szinkronban marad.
- A produkciós build modulgráfja továbbra kizárja a Core/adapter/Lab/QA/Registry
  fejlesztői futtatókörnyezetét. A négy eredeti specifikáció és a LOCKED Foundation ép.

A régi M3/M4 böngészőbootstrap-hibainjektálások most elszigetelt, valóban hibás
projektklónból indulnak, mert a Draft tulajdonosa már a Node-szolgáltatás.
A regressziós tesztek a közös Draftot valódi Undo-val állítják vissza; az R01
összehasonlítását és toleranciáját nem lazítottuk. A leállítás SIGTERM/graceful,
a zombi- és PID-újrafelhasználási védelem külön tesztelt.

A GitHub Actions [M5 verification workflow](https://github.com/BenHRVTH/web-development-foundation/actions/workflows/check.yml)
`push` és `pull_request` eseményre is ugyanezt a teljes kaput futtatja. A távoli
runok naplója és artifactjai a PR Checks felületén érhetők el; a fejlesztői workflow
kezeli a Git-műveleteket, nem a Lab jóváhagyása.

## Böngészős bizonyíték

Az `evidence/m5` alatt Audit/Changes 320/390/768/1024/1440 px-en, hibás token és
finding, elfogadás/elutasítás, Undo/Redo, Draft-restart, Initial/Baseline A/B,
futó/sikeres/hibás/elavult QA, modal megerősítés, véglegesítési hiba és új Baseline.
A screenshotokat geometriai, állapot-, accessibility- és fókuszállítások egészítik ki;
a kép létrejötte önmagában nem PASS. A vizuális review a meglévő semleges petrol
keretet, preview-hangsúlyt, ikon–szöveg igazítást, tördelést és görgetést vizsgálta.

## Korlátok és M6

### PR #6 platformjavítás — 2026-11-15

A tároló containment ellenőrzése `path.relative`/`isAbsolute`/natív `sep` alapú;
nincs POSIX-elválasztót feltételező biztonsági ág. Hiányzó `.wdf-lab` és explicit
tárológyökér ellenőrzött ősből jön létre. Minden útvonalkomponens symlink/junction
ellenőrzést kap, másik Windows meghajtó vagy szomszédos prefix nem megengedett cél.
A Preview fájl-URL-konverziója is javult a natív Windows-, szóközös és ékezetes
projektútvonalak indításához; Task Manager arculati változás nem történt.

A fájl-fsync, atomikus rename, checksum és journal-helyreállítás megmaradt. Linuxon
az új könyvtárak és recovery-törlések szülőkönyvtár-fsync-et is kapnak. Windows alatt
a Node könyvtár-fsync hiányát nem rejtjük el: `STORAGE_DURABILITY_LIMIT` látható
induláskor és a Lab állapotában. Folyamatmegszakítási helyreállítás ellenőrzött;
**Windows áramszünet/OS-crash utáni tartóssága nem garantált**. Helyi NTFS a célzott
környezet; ACL, PID-azonosság és nem igazolt fájlrendszerek korlátai:
[ADR-0009](../adr/0009-m5-platform-storage.md).

Új célzott kapu: `npm run test:m5:storage`, külön `windows-latest` Actions jobbal,
mind `push`, mind `pull_request` eseményen. A Linux-specifikus SIGKILL-/`/proc`-
tesztek nem kerülnek a Windows-konfigurációba. A platformjavítás eredményei:

- `npm run test:m5:storage`: Linuxon 20/20 PASS, nincs skip/retry.
- Teljes Linux `verify:m5`: PASS; 195/195 unit/integrációs, 89 + 24 + 15 + 11
  böngészős teszt, 160 tényleges Approval QA-eset. A Task Manager hiteles forrása és
  a Foundation változatlan.
- Az R01 eredeti feltételei mellett 25 pár PASS, geometriai eltérés 0, legfeljebb
  6 eltérő pixel és 1/255 csatornaegység. A toleranciák változatlanok.
- Reprodukció és a javított források SHA-256 lenyomata:
  kiegészítő eredmények (privát archívum: `M5-platform-results.json`), teljes Linux napló (privát archívum: `M5-platform-linux.log`),
  20 célzott teszt nyers eredménye (privát archívum: `M5-platform-storage-tests.json`),
  valódi Approval QA (privát archívum: `M5-platform-approval-qa.json`).
- A natív Windows végrehajtás bizonyítéka a [PR #6 aktuális Checks felülete](https://github.com/BenHRVTH/web-development-foundation/pull/6/checks):
  `m5-windows-storage`, külön artifacttal, mindkét eseményen. A helyi Linux-riport
  nem minősül Windows-teszteredménynek.

A korábbi táblázat és `M5-*` alapjelentések az eredeti M5 átadás bizonyítékai;
a platformjavítás pontos forrását és új futásait a fenti kiegészítő jelentések kötik össze.

Chromium/Linux ellenőrzött. Az axe és a fókuszmérés nem teljes WCAG-tanúsítás;
képernyőolvasó, Firefox/WebKit, fizikai érintős eszköz és teljes 200%-os zoommátrix
NOT_RUN. A privát TS-workspace csomagolása és az új projektre telepítési/release QA
M6-feladat; ebben az ágban nem készül publikálható csomag vagy éles kiadás.

Helyi, megbízható projektre és rename/fsync-et támogató fájlrendszerre készült.
Nincs hálózati/többgépes lock, Draft-merge, több Draft vagy automatikus Contract-migráció.
A teljes snapshot-history nagy projekteknél mérendő. Registry-/preview-/Contract-
változás ellenőrzött restartot igényel. A hibás referencia nem alkalmazható.

## Biztonságos visszaállítás

Állítsd le a Labot; őrizd meg a teljes `.wdf-lab/<id>` könyvtárat és a token/CSS/TS
fájlokat együtt. Ép journal esetén a következő indítás helyreállít. Sérült vagy külső
konfliktusos adatot ne törölj: az [API helyreállítási útmutatóját](../M5-CHANGE-QUALITY-API.md)
kövesd. Kódvisszaállításhoz külön worktree-ben az elfogadott `25320d3` érhető el;
M5-adatot M4 nem olvas, ezért előbb archiváld. Merge után célzott `git revert`
használható; nincs szükség történetátírásra vagy általános `git clean` műveletre.

Az M5 után megállunk. A PR szakmai review-ra kerül, merge és M6-kezdés nélkül.
