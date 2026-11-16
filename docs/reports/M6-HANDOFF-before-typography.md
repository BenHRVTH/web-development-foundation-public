> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M6 átadás — integrációs QA és release candidate

Dátum: 2026-11-15, UTC / Europe/Budapest. Ág: `feat/m6-release-qa`.
Kiindulópont: `5f0d8b3556ba772ffb9c6c0ecb27ebaba3988254`, frissen lekért, elfogadott M5 main.
Kiadási jelölt: **0.1.0-rc.1**, öt összehangolt npm-artifact.
PR: [#7](https://github.com/BenHRVTH/web-development-foundation/pull/7).

**Readiness: BLOKKOLT — R05 FAIL, a QA-korrekció végrehajtva.**
A korábbi jelölt technikai kapuja sikeres volt; az R05 szakmai bizonyítéka elégtelen volt.
A korábbi R05 PASS nem elfogadható bizonyíték: az Arial Canvas-minta nem az alkalmazás renderelése. Az új ellenőrzés a Task Manager 600/700 súlyainál tényleges összeolvadást mutat; ez kiadásblokkoló, nem PASS. Nincs npm-publikálás, GitHub Release, végleges tag vagy merge.

## Aktuális R05-korrekció

A jelenlegi szakmai státusz a [célzott korrekciós jelentésben](M6-R05-CORRECTION.md)
szerepel. Az alábbi korábbi 7e1dbe0/9c13dc1 kapu-PASS eredmények történeti
futtatási tények; nem igazolják a hiányos R05 bizonyíték szakmai megfelelőségét.
A felülvizsgálat által jelzett önálló Arial Canvas-minta eltávolítva; az új teszt
valódi szerepeket, Lab-szerkesztést és glyph-pixeleket mér. A teljes új Linux és Windows kapu
R05 miatt FAIL; a Hangár tokenjavítása és az összes többi végrehajtott regresszió PASS.
A jelenlegi újrafuttatás siker utáni repack szakasza NOT_RUN, nem a régi PASS ismétlése.

## Csomagarchitektúra és publikus interfész

| Csomag             | Felelősség / publikus belépés                                      | Kiadás                                            |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------- |
| @wdf/foundation    | LOCKED szabályok, `.`                                              | Függőségmentes ESM + deklaráció                   |
| @wdf/core          | Contract, token/Registry/Audit és Change típusok; `.`, `/change`   | Foundation/Zod, böngésző- és Node-határok         |
| @wdf/adapter-react | Valódi React Studio/preview, `.`, `/preview`, `/vite`, `/registry` | Explicit React/React DOM/Vite host peerek         |
| @wdf/qa            | Projektfüggetlen böngészős Approval QA, `/browser`                 | Core/adapter/Playwright/axe, fejlesztői használat |
| @wdf/ui-lab        | Helyi Lab, tároló/Change Manager, `wdf-ui-lab` bin                 | Fordított Node CLI, HTML/CSS és React kliens      |

A tényleges exportok, fájlok, módok, méretek és dependency/peer verziók az
inventoryban (privát archívum: `M6-package-inventory.json`) és az artifactok `package.json` fájljaiban
vannak. A minimális indokolt struktúra öt meglévő felelősségi határt tart meg.
A UI Lab/QA a fogyasztó devDependencies része; a production app nem importál WDF-et.
A source-workspace privát `0.0.0` manifestje tudatosan marad a régi fejlesztői
kapuk számára; a kiadási manifest `0.1.0-rc.1`, dist ESM/types exportokkal és
pontos belső verziókkal. Sem TS-loader, sem monorepo-gyökér nem kell telepítés után.

[ADR-0010](../adr/0010-m6-packaged-release.md): a meglévő TypeScript fordító,
explicit JS-kiterjesztések, LF és normalizált csomagfájlmódok; új bundler nincs.
Runtime index/CSS bekerül, teszt/appdesign/munkaadat/secret/screenshot nem.
A `files` szűk; nincs WDF install/postinstall script. CJS-t nem ígérünk.

A korábbi Task Manager-specifikus QA-előkészítés saját `wdf/qa.ts` modulba került.
Az új projekt saját megbízható Node `WebsiteQa` drivert deklarál öt állapottal,
ready/control/card szelektorokkal és valós tokenhelyekkel. Hiányos driver vagy
leméretlen kötelező kártyatoken ERROR/FAIL, nem üres PASS. A környezetlenyomat a
ténylegesen importált csomagokból és a fogyasztó lockfile-jából készül.
A böngésző nem küldhet kódot vagy fájlútvonalat.

## Telepíthető artifactok

Az alábbiak a teljes sikeres helyi Linux-futás csomagjai. Az öt csomag verziója
`0.1.0-rc.1`; SHA-256 a tényleges `npm pack` byte-okon:

| Fájl                             |  Byte | SHA-256                                                            |
| -------------------------------- | ----: | ------------------------------------------------------------------ |
| wdf-foundation-0.1.0-rc.1.tgz    |  2532 | `352983428ff00dcc64ddb84fd0589ac962d729076468574af15747f1c5fe36fa` |
| wdf-core-0.1.0-rc.1.tgz          | 19225 | `a7ab7c4b6c53611750f0b125edf96197da952f62104000adfaec9acdcbaaa2a0` |
| wdf-adapter-react-0.1.0-rc.1.tgz |  9620 | `6fcc911cf100943acb845674445ae031a0de0e385760b79a175c86cb72a05136` |
| wdf-qa-0.1.0-rc.1.tgz            |  7283 | `819314bacf11961e0007aefa729ac6fbd687aae3b4ebef409b998f9a1788bdfb` |
| wdf-ui-lab-0.1.0-rc.1.tgz        | 37682 | `b3ec6858b2b2b964f0fa7bd437ad8f6feb231062d3b47ec1623c645b85a1f3d4` |

A Windows inventory (privát archívum: `M6-package-inventory-windows.json`) első négy csomagja
byte-azonos. A Windows UI Lab 37676 byte, SHA-256
`a682a6854796f278417af0e559b85ca8f3e41cfc9fef9a0f73bad962bc267e28`.
Platformonként a második build/pack byte-azonossága kötelező és ellenőrzött;
minden platform tgz-jére közös lenyomatot nem állítunk.
A két platform teljes fájllistája rendelkezésre áll, nem feltételezünk bizonyítatlan
azonos archiválási metaadatokat.

A GitHub Actions artifact a csomagokat, inventoryt, tiszta fogyasztósnapshotot,
lockfile-t, vendor tgz-ket, riportokat, screenshotokat és hibatrace-eket őrzi.
A végső CI-azonosítók és artifactlinkek a platformfejezetben.
Az artifactmegőrzés nem registry-publikálás, és nem állandó backup.

## Független fogyasztó és dokumentált telepítés

**Hangár · Hallgatószoba**, saját projektazonosító/név/Contract/tokenek.
Kék–rozsdaszínű műsorrend és helyfoglalás, négy valódi megosztott React-komponens,
15 fixture; a Task Manager nem klónozva és nem importálva.

A `tools/install-consumer.ts` új, repositoryn kívüli, szóközös/ékezetes tempmappába
másol. Az öt tgz a saját `vendor` könyvtárból települ. Valódi npm install, saját
lockfile-os npm ci, nem symlinkelt csomagkönyvtárak, publikus ESM-importok,
deklarációk és privát deep-import elutasítás következik.
A Contract/generálás/typecheck/Vite produkciós build ténylegesen lefut.
Telepítési eredmény (privát archívum: `M6-consumer.json`), böngészős bizonyíték (privát archívum: `M6-browser.json`).

A teljes folyamat bizonyított: projektből `npm run ui-lab`; tényleges app
Website View; saját Registry/fixture a Studio-ban; global/family/variant edit
a megfelelő előfordulásokon; tokenforrás változatlan jóváhagyás előtt;
Undo/Redo, A/B, tartós Draft és valódi restart; Audit; hatcheckes Approval QA
**100 renderelt viewport/állapot/fixture esettel**; külön modal megerősítés;
hiteles token/CSS/TS/Approved Baseline; utána új production build/generálási check.
A saját `qa:browser` hook öt valódi Chromium-renderrel és axe-szal is végrehajtott.

Az Actionsben megőrzött `artifacts/consumer` a jóváhagyás előtti tiszta snapshot,
node_modules/dist/.wdf-lab nélkül. Ezt ismét külön `/tmp/wdf M6 átadás-iWTHI3`
könyvtárba másoltam, és ténylegesen végrehajtottam:

```sh
npm ci --ignore-scripts
npm run check:generated
npm run build
npm run ui-lab
# A Lab leállítása után:
npm run qa:browser
```

Újratelepítési/build eredmény (privát archívum: `M6-relocated-consumer.json`),
saját hook napló (privát archívum: `M6-relocated-hook.log`).
A snapshot lockfile SHA-256:
`0bc2dfd2dd299ace7dfaca9f641c2f478d4cff2175caf1ae8abd5ac41c0693ff`.
A Labot e könyvtárból natív Chromiumban is megnyitottam.
A buildhatár ellenőrzése nem enged WDF/Registry fejlesztői modult a production bundle-be.

## Követelményalapú elfogadás és bizonyítékok

A teljes **T01–T16, C01–C10, R01–R10**, 12 negatív, három csomagolási és egy
teljes E2E sor: [52 soros mátrix](M6-ACCEPTANCE-MATRIX.md),
gépi mátrix (privát archívum: `M6-acceptance-matrix.json`).
Minden sorhoz konkrét tényleges teszt, eljárás, elvárt/tényleges eredmény,
commit/verzió/környezet, státusz és megőrzött riport tartozik.
A platform- és kézi/NOT_RUN sorok külön szerepelnek. Hiányzó teszt nincs PASS-ként feltüntetve.

| Ellenőrzés                                     | Tényleges eredmény                                                     | Bizonyíték                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Induló teljes verify:m5                        | PASS: 195 unit; 89+24+15+11 browser; 160 Approval                      | Kiinduló napló (privát archívum: `M6-baseline-m5.log`)                                                   |
| Végső helyi verify:m6                          | PASS: 204 unit; 89+24+15+11+3 = 142 browser, nincs skip/retry          | Kapueredmény (privát archívum: `M6-results.json`), teljes napló (privát archívum: `M6-verification.log`) |
| Task Manager Approval                          | PASS: 160 tényleges renderelt eset, hat check                          | QA (privát archívum: `M6-m5-approval-qa.json`)                                                           |
| Telepített Hangár Approval                     | PASS: 100 tényleges renderelt eset, hat check                          | QA (privát archívum: `M6-consumer-approval.json`)                                                        |
| R01                                            | PASS: 25 pár, 0 geometriai eltérés; max. 6 pixel, max. csatornadelta 1 | R01 (privát archívum: `M6-m3-results.json`)                                                              |
| Csomag-reprodukálhatóság                       | PASS: ismételt pack azonos inventory/SHA minden futtatott platformon   | Linux (privát archívum: `M6-package-reproducibility.json`), Windows napló                                |
| Új környezetből dokumentált snapshot-parancsok | PASS: ci/check/build/Lab/browser hook                                  | Újratelepítési riport, kézi review                                                                       |
| UI-skill audit / DESIGN lint                   | 0 finding / 0 error és warning                                         | Audit (privát archívum: `M6-consumer-ui-audit.json`), DESIGN kontextus                                   |

A végső teljes helyi futás és a közös natív CI ellenőrzött commitja
`7e1dbe063c19656704818ce9becf96a9bf46a7dc`. A csomag/app/fogyasztó előtte/utána
SHA-térképe az eredményben van; a futás közben mind változatlan.
Az első teljes helyi futás külön történeti bizonyíték:
M6-first-linux-results.json (privát archívum: `M6-first-linux-results.json`).
A kézi státusz és másik platform a nyers automatikus runnerben szándékosan NOT_RUN:
a runner nem hajtja végre ezeket. A külön bizonyítékok egészítik ki, nem átírjuk a nyers riportot.

A négy specifikáció hashkapuja, Foundation LOCKED forrása, a Task Manager tokenjei
és React-forrása az M5-höz képest változatlanok. A Task Manager app CSS-ében hét
reszponzív deklaráció a 200%-ra nagyított márkafelirat szűk nézeti túlcsordulását
javítja; a normál arculat mind az öt szélességen pixelpontosan változatlan. Az elfogadott M0–M5 viselkedés
regressziói megmaradtak; nincs új fő termékfunkció vagy kötelező WDF-arculat.

## Vizuális, reszponzív és akadálymentességi QA

320/390/768/1024/1440 CSS px; normal/empty/long/error/missing; fixture-variánsok,
disabled/busy/error/hover/focus, űrlap és modal. A geometriát tényleges DOMRect,
computed stílus és tartalmi inset méri. Hangár kártyapadding 16/24/32 px;
tipográfiai méret és renderelt glyph-súlykülönbség, ikon/szöveg igazítás,
overflow, duplikált ID, görgetés és modal-fókuszkör ellenőrzött.
Geometria (privát archívum: `M6-consumer-geometry.json`), Task reflow (privát archívum: `M6-task-accessibility.json`),
képek (privát archívum: `evidence/m6`).

Az eredeti R01 <=8 pixel / <=1 csatornadelta és 0 geometriai tolerancia változatlan,
nincs screenshotmaszk. A Chromium részleges raszterezési javítása megmaradt.
Az axe releváns WCAG 2.2 AA tagek mellett valódi Tab/Shift+Tab/Escape,
fókuszvisszaadás/láthatóság, kontraszt, magyar/hosszú szöveg és reduced motion is vizsgált.
A Task reflow scanner color-contrast incomplete tétele nem scanner-PASS állítás:
a kontrasztot a tényleges Approval QA és a külön kézi vizuális review is lefedi.

Automatizált 200% root-font + 640/320 CSS px reflow mellett tényleges Chromium
**200% browser zoom** kézi ellenőrzés történt mindkét production appban és az
újratelepített Lab Website/Studio felületén. A nagyított formok/modalok műveletei
elérhetők és görgethetők. [Kézi eljárás/eredmény](M6-VISUAL-REVIEW.md).
A natív zoom képernyőképei a chat computer-use bizonyítékai; közvetlen mentésüket
a desktop read-only környezete nem engedte. A fájlként megőrzött automatikus képek
külön reprodukálhatóak. Nem állítunk nem létező natív screenshotfájlt.

**NOT_RUN:** célzott képernyőolvasó (nincs megfelelő eszköz/AT-SPI provider),
Firefox/WebKit, fizikai érintős mobil/virtuális billentyűzet.
Ezek nem igazolt támogatások. A releváns mért és kézzel vizsgált állapotokon nincs
nyitott akadálymentességi blocker; teljes, minden platformra érvényes WCAG-tanúsítást nem állítunk.

## Natív platformok és CI

Helyi Linux: Debian 13, kernel 6.18.57 x64; Node 24.22.1, npm 11.9.0,
Playwright 1.65.1, Chromium **159.0.8154.6**. A teljes végső kapu PASS,
a forrás a futás alatt változatlan. Az első történeti futás Chromium 156-tal ment.

CI: Ubuntu Linux és Windows Server 2025; Node 24.22.1/npm 11.9.0,
Playwright 1.65.1 / Chromium 159.0.8154.6. Push és pull_request esemény.
[Végső közös run 43704755663](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43704755663), head `7e1dbe063c19656704818ce9becf96a9bf46a7dc`,
PR-merge checkout `0e6ce0df56cf03f22b2986ee6d32c5a29173b942`.

| Platform | Job          | Eredmény | Végrehajtott ellenőrzés                                                                                                                |
| -------- | ------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Linux    | 132783330358 | **PASS** | Teljes M0–M6, 204 unit, 142 browser; Task 160 és fogyasztó 100 Approval, install/build/repeat pack                                     |
| Windows  | 132783330569 | **PASS** | 20 natív storage/journal, 3 M6 browser; valós pack/install/ci/Contract/Lab/két workspace/Draft/restart/Approval/hook/build/repeat pack |

Linux napló (privát archívum: `M6-linux-final-verification.log`),
Windows napló (privát archívum: `M6-windows-final-verification.log`),
gépi CI-metaadat (privát archívum: `M6-CI-final.json`).
Az új normál arculatellenőrzés öt viewporton 0 pixel eltérést követel és mindkét
natív platformon sikeres. A Windows /proc nélkül, valódi Windows folyamatokkal fut.

| Platform artifact | GitHub Actions letöltés                                                                                              | ZIP SHA-256                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Linux             | [14158421969](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43704755663/artifacts/14158421969) | `a45a3356e2cbaa0d0ce45cdc42c44e848d1a0c5f4de6a138dd85c5e2514620db` |
| Windows           | [14158511747](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43704755663/artifacts/14158511747) | `bffb9db28c474affd2c1d5b2c8be064a038fdd9afdca041e6e89bd1ca2c2abdd` |

Az artifactok 2027-02-13-ig megőrzöttek a rögzített metaadat szerint.
A csomagok saját SHA-256 értéke a fenti pack-táblában és inventoryban van;
a ZIP lenyomata a riportokat és futási adatokat is tartalmazó teljes konténert azonosítja.
A névben szereplő SHA a PR-merge checkout, a tényleges branch head külön rögzített.

Korábbi sikertelen CI-ket nem minősítünk PASS-nak:

- `43700326012`: kezdeti reflow-mérés FAIL; a renderkész-várakozás javult,
  de a későbbi fontfüggő termékhibát ez önmagában nem oldotta meg.
  Napló (privát archívum: `M6-linux-ci-initial-failure.log`).
- `43702129090`: M3-B01 navigáció utáni strict-locator versenyhelyzet FAIL;
  a céloldali cím és egyetlen article megvárása megőrzi a tartalmi/fókuszkövetelményt.
  Napló (privát archívum: `M6-linux-navigation-ci-failure.log`).
- `43702966017`: 320 px / 200% font Ubuntu alatt 325 px scrollWidth FAIL;
  a márkafelirat tördelési javítása és a normál arculat 0-pixeles regressziója oldja meg.
  Napló (privát archívum: `M6-linux-font-reflow-ci-failure.log`).

A Windows helyi tárolás/journal helyreállítás igazolt, **könyvtár-fsync,
áramszünet/OS-crash utáni Linuxszal azonos tartósság nem**. Az ADR-0009 és
STORAGE_DURABILITY_LIMIT figyelmeztetés megmaradt. Hálózati/felhőszinkronizált
fájlrendszer, többgépes lock és más böngésző nem igazolt. Nem teszünk rájuk támogatási ígéretet.

## Biztonság, javítások és ismert korlátok

[Biztonsági értékelés](M6-SECURITY.md), nyers audit (privát archívum: `M6-dependency-audit.json`),
függőségi gráf (privát archívum: `M6-dependencies.json`). 0 high/critical; 7 moderate a dev lintlánc
minimatch advisory-jának továbbvezetése. Nincs érintett szállított runtime, távoli
globinput vagy production bundle; dokumentált nem blokkoló értékelés, kényszerített
inkompatibilis downgrade nélkül. Következő kompatibilis lintfrissítéskor új audit.

Host/Origin/session/project/revision, bodylimit, schema, path containment,
symlink/junction, Foundation/scope, malformed/stale Contract/QA és tiltott műveletek
negatív regressziói PASS. Nincs szükségtelen jogosultság vagy központi felhőszolgáltatás.
A Lab továbbra sem végez automatikus Git-műveletet.

Feltárt és javított integrációs problémák: workspace TS/TSX helyett valódi dist;
monorepo-független engine fingerprint; saját projekt QA; pontos variánstokenek;
teljes modal-fókuszkör; Windows LF, kanonikus Unicode/temp útvonal, shellmentes npm;
saját teszttárolók és elkülönített riportkimenet; minden releváns kártyatoken mérése.
A zárt dialoghoz nem követelünk nem renderelt kártyát; open/long fixture-höz igen.
A köztes portütközések és elavult Draft-kísérletek nem PASS eredmények;
a végső kapu sorosan fut és saját storage-t használ.
Az fsync-tesztek 15 s időkerete a meglévő portable kapuval egyezik;
assertion nem lazult, automatikus retry nincs.

## Parancsok, rollback és hibakeresés

```sh
npm ci
npx playwright install --with-deps chromium
npm run verify:m5
npm run verify:m6
# Részlépések:
npm run build:packages
npm run install:consumer
npm run test:m6
```

Windows böngészőtelepítés: `npx playwright install chromium`;
`verify:m6` automatikusan check:spec + portable storage + build/pack + install + M6 browser kaput választ.
Minden fenti fő lépés tényleges futási kimenete a megőrzött naplókban/artifactokban.

Hiba esetén először a konkrét kapu státuszát, CLI naplót és trace-et vizsgáld.
Szabad portok: 5173/5175/5176/5183. Hiányzó Chromium explicit hiba, nincs sikeres
scannerhelyettesítés. Contract-hibánál a megnevezett saját integrációt javítsd.
Stale QA után új QA; engine drift után restart. Idegen/sérült tárolót ne írj felül.

Rollback: állítsd le a Labot; együtt archiváld a teljes .wdf-lab projektállapotot,
hiteles tokent és generált CSS/TS-t. Ép journal startupkor helyreáll; sérültnél blokkol.
Teljes, egymáshoz illő csomagkészletet és lockfile-t állíts vissza, majd npm ci és QA.
Ez az első telepíthető RC: korábbi nyilvános WDF npm-release nincs, ilyen downgrade-et
nem ígérünk. A jóváhagyás előtti fogyasztósnapshot új, tiszta ellenőrzéshez használható.
Kódfallback az elfogadott `5f0d8b3` külön checkoutja vagy M6 revert; nincs main-történetátírás.

[Getting Started](../GETTING-STARTED.md),
[Developer Guide](../DEVELOPER-GUIDE.md),
[Release Guide](../RELEASE-GUIDE.md).
A következő lépés független szakmai review. Merge, nyilvános kiadás és végleges tag
külön későbbi döntés; ez a feladat egyiket sem hajtja végre.

## Reflow-javítás és megőrzött normál arculat

A `7e1dbe0` a brand szélességét a rendelkezésre álló helyre korlátozza,
a szöveget szükség esetén tördelhetővé teszi és az ikon zsugorodását tiltja.
Token, szín, betűméret, spacing és normál arculat nem változik.
Az összehasonlítás a korábbi brand-szabályokkal ugyanabban a böngészőben
**0 pixel eltérést követel mind az öt normál viewporton**, screenshotmaszk nélkül.
Normál arculat (privát archívum: `M6-task-normal-design.json`), végső reflow (privát archívum: `M6-task-accessibility.json`).
A teljes helyi és natív Ubuntu/Windows kapu e javítással PASS.
Külön korlátozott DejaVu fontkészlettel is sikeres célzott vizsgálat:
napló (privát archívum: `M6-task-fontset-reflow.log`), fontkonfiguráció (privát archívum: `M6-fontconfig.conf`).

Az újabb natív 200% browser-zoom ismétlés **NOT_RUN**: a korábban működő desktop
Chromium nem indult újra, a cloud browser kapcsolat „could not read requirements”
eszközhibát adott. A korábbi tényleges natív 200% review-t nem írjuk át új futássá.
A végső CSS normál 320 px-es képe és a 200%-os error/modal képe külön kézzel
értékelve: a magyar szöveg és hiba tördelődik, a fókusz látható, nincs vízszintes
levágás; a hosszú modal függőlegesen görgethető, műveleteit a valódi billentyűzetteszt eléri.
A célzott képernyőolvasó és a többi NOT_RUN korlát továbbra a fenti státusszal él.
A kézi és automatizált bizonyíték együtt a vizsgált releváns állapotokra vonatkozik,
nem általános WCAG-tanúsítás.
