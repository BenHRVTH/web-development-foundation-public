> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M6 átadás — projektszintű tipográfiai képességkezelés

Dátum: 2026-11-15, Europe/Budapest. PR: [#7](https://github.com/BenHRVTH/web-development-foundation/pull/7).
Ág: `feat/m6-release-qa`. Funkcionális commit: `f2abff32008ced54cdf5055f6c4013ef6bd57ded`.
A korábbi `b767cff` implementáció után a `b538534`/`7d40999` diagnosztika feltárta a QA hover- és a kliens polling-hibáját. Az `f2abff3` ezeket külön regresszióval javítja. A végső gate hat M6 böngészős tesztet követel, kihagyás és retry nélkül. A tesztelt ágcommit `027b3922a36e3917d72250bfce25fc0a7109072f`; az ezt követő átadási commit csak dokumentációt/bizonyítékot tartalmaz.
Kiadási jelölt: `0.1.0-rc.1`; nem publikált, pontos artifact-SHA-val azonosítandó.

**Az alkalmazások rendszerfontjai és alapmegjelenése változatlanok. Az M6 kiadása blokkolt marad, amíg az aktuális kötelező R05 nem PASS.**

## Döntés és megvalósított határok

A felhasználó végleges döntése a rendszerfontok megőrzése. Nincs fontkészletcsere,
automatikus súlyjavítás, Foundation-módosítás, új workspace vagy általános fontkezelő.
[ADR-0011](../adr/0011-m6-typography-capabilities.md) rögzíti a legkisebb közös modellt.

- Core: strict, saját 1.0.0 verziójú profil; típusos tokenhivatkozások, egyedi
  szerepek/súlyjelöltek, valamennyi súlytoken referencia-lefedettsége.
- Projekt: saját `wdf/typography.json`, a preview default exportjának `typography`
  mezőjén. Task Manager: kilenc szerep, 400/600/700 jelöltek; Hangár: hat szerep,
  400/700. Egyetlen korábbi sikertelen jelöltpárt sem töröltünk a profilból.
- QA: az eredeti alkalmazás- és Studio-elemek, öt szélesség, valamennyi jelöltpár,
  fontbetöltés, computed értékek, tényleges fontface-diagnosztika, PNG/SHA-256.
- Lab: a közös TokenField natív súlyválasztója mindkét workspace-ben. Csak a friss
  QA-val bizonyított részhalmaz választható; más érték láthatóan nem igazolt.
- Jóváhagyás: a korábbi hat check mellett `WDF-TYPE-001` kötelező. A részben
  sikeres QA nem ad jóváhagyási jogot. A közvetlen API sem kerülheti meg a kaput.

A profilsúlyok mérendő jelöltek, nem eleve támogatott lehetőségek. Az összeolvadó
600/700 párból a determinisztikus, csökkenő sorrendű képviselőválasztás 700-at tart
meg külön opcióként; a 600-at nem írja át. A metszet az összes célra/szélességre,
közös tokennél minden fontfogyasztóra érvényes. Ez konzervatív kiválasztási szabály,
nem Foundation által előírt súlykészlet vagy platformkivétel.

## Állapotok és megőrzés

NOT_RUN: még nincs bizonyíték. RUNNING: a tényleges mérés folyamatban. STALE:
eltérő Draft/forrás/környezet vagy korábbi Lab-munkamenet. ERROR: hibás integráció
vagy technikai mérési hiba. Ezek mellett nincs igazolt új súlyválasztás.
A FAIL összesítésben mért megfelelő opciók felhasználhatók kifejezett javításhoz;
a nem igazolt aktuális érték és a régi Draft megmarad. A hivatkozásmód sem
jeleníthet meg nem igazolt súlyt igazolt kerülőútként.

A QA a saját iframe-jeiben az eredeti apply-design protokollt használja; nem
írja a Draftot vagy a hiteles token/CSS/TS-forrást. A felhasználói szerkesztés a
meglévő Change Manageren át történik, Undo/Redo-val. A mentés továbbra sem
jóváhagyás. A frissesség újraindítás után a megőrzött munkaállapot módosítása
nélkül STALE; a mentett korábbi bizonyítékot nem írjuk át friss eredménynek.

## A megmaradó ütközés pontos értelme

A 600 érvényes CSS-érték, de több fontkörnyezetben ugyanazt a face-t és pixeleket
adja, mint a 700. Nem állítjuk, hogy a CSS érvénytelen, és nem állítunk három
külön súlyfokozatot. A jelenlegi minimális jóváhagyási politika a nem igazolt
képviselőként megmaradó aktuális értéket blokkolja.

Az eredeti Task Manager utility/action szerepeiben a 600 megőrzése ezért
ütközhet a képességkapuval. A Lab kezeli és jelzi ezt, de a rendszer nem
minősíti pusztán a felismerés sikerét az alapállapot R05 PASS-ának. A fennmaradó
szemantikai/súlypolitikai döntés külön szakmai felülvizsgálatot kíván; az M6 nem
vezet be csendes alias-migrációt vagy arculatváltoztatást.

A pozitív Task Manager jóváhagyási regresszió kifejezett tesztfelhasználói 600→700
editet végez **csak saját elkülönített Draftjában**, és ellenőrzi a valódi QA-t,
megerősítést, rollbacket és token/CSS/TS tranzakciót. Ez nem az eredeti Task
Manager alapállapotának PASS-minősítése és nem változtatja meg a repository
alkalmazását. A Hangár saját 400/700 arculata külön, tényleges artifacttelepítéssel
ellenőrzött.

## Megőrzött szigor és feltárt integrációs hibák

A képi megkülönböztethetőség minimuma változatlan: legalább 20, legalább 8/255
csatornaeltérésű pixel és legalább 1% tintapixel. Nincs Canvas-minta,
screenshotmaszk vagy pixeltolerancia-lazítás. Az azonos kép negatív kontroll.
R01: az eredeti 8 pixel / 1 csatornaérték / nulla geometriai eltérés és a
`--disable-partial-raster` javítás megmarad.

Az új mérés feltárta, hogy a Studio első ACK-ja néha megelőzte a Vite CSS-importját.
A dev-only adapter connectje most a kezdeti dokumentumbetöltés után indul;
a későn betöltött CSS nem írhatja vissza az első Draft-snapshotot. A mérés
valódi reconnectet használ Vite-újratöltés után. A normál glyph-mérés a külön
billentyűzetes teszt előtt történik, hogy a fókuszált tartalomra ugró link ne
takarja el a vizsgált fejlécet. A billentyűzet/fókusz ellenőrzés ettől még lefut. A külön negatív kontroll egy
valódi komponens súlyát ideiglenesen rögzíti a teszt iframe-jében, az eredeti
600-as alapmegjelenést megtartva. A tokenváltozás figyelmen kívül hagyása
`TYPOGRAPHY_OPTION_BINDING_MISMATCH`, nem fontsúly-támogatási siker.
A hibás szerep egyetlen opciója sem minősül igazoltnak. Ez kizárólag fault-injection
teszt; a normál, valamennyi jelöltet mérő elfogadási bizonyítékban nincs ilyen
felülírás vagy a sikertelen párok eltávolítása.

Az Approval-mérés képei SHA-ellenőrzött manifesttel archiválódnak a CI
`test-results/m5-typography-approval`, `m6-consumer-typography-approval` és a
`docs/reports/evidence/m6/r05-capabilities` könyvtárakban. A manifest összeköti
az eredeti mérési útvonalat az archivált fájllal. A repository képei saját,
megnevezett futási környezetükhöz tartoznak; Windows-kép nem helyettesíthető
Linux-képpel.
A megváltozott M3–M6 regressziós képek külön, a `typography-regression` alatt
archiválva maradnak; a történeti eredeti képeket nem írtuk felül.
Aktuális útvonalak és SHA-256 (privát archívum: `M6-TYPOGRAPHY-regression-captures.json`).

## Végső eredmények — 027b392

| Környezet                                                                 | Tényleges eredmény                                                                          | Kapu |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---- |
| Debian 13, Node 24.22.1/npm 11.9.0, Chromium 159.0.8154.6                 | 216 unit/integrációs PASS; 89 M0–M2 + 24 M3 + 15 M4 + 11 M5 + 5 M6 browser PASS; 1 R05 FAIL | FAIL |
| Ubuntu 26.04.1 LTS, azonos Node/npm/Chromium, natív Actions               | 216 unit/integrációs PASS; 144 browser PASS; 1 R05 FAIL                                     | FAIL |
| Windows Server 2025 / 10.0.26100, azonos Node/npm/Chromium, natív Actions | 20 tárolási/journal PASS; 5 M6 browser PASS; 1 R05 FAIL                                     | FAIL |

A helyi teljes kapu nyers eredménye (privát archívum: `M6-TYPOGRAPHY-m6-results.json`),
teljes naplója (privát archívum: `M6-TYPOGRAPHY-linux-gate.log`),
Ubuntu fontjelentése (privát archívum: `M6-TYPOGRAPHY-ubuntu-r05.json`),
Windows fontjelentése (privát archívum: `M6-TYPOGRAPHY-windows-r05.json`) és a
CI-azonosítók/digesztek (privát archívum: `M6-TYPOGRAPHY-ci.json`) külön megőrzöttek.
Nincs kihagyás vagy Playwright-retry. A helyi `sourceIntegrity` true.
A négy eredeti specifikáció, a Foundation és mindkét alkalmazás `src`/alaptoken
fájljai `d39adb7` óta byte-azonosak. Az új profilok/integráció a `wdf` rétegben vannak.

Mindhárom futásban kizárólag az eredeti Task Manager nem igazolt aktuális 600-as
értéke maradt FAIL. Linuxon utility és action, Windowson utility. A Windows
Segoe UI valóban külön 600-as súlya több szerepnél igazolt marad; a Trebuchet és
Consolas összeolvadó párjai továbbra külön FAIL mérések. A Hangár R05 mindenhol
PASS; 30 computed/default összevetésben 0 pixel arculati eltérés.
Valamennyi 75 baseline és 95 Website/Studio mérési kontextus végrehajtott.

A végső R01: 25 pár, legfeljebb 6 eltérő pixel, maximum 1 csatornaérték,
geometriai eltérés nélkül; az eredeti 8/1 határ és részlegesraszter-javítás megmaradt.
A sikerhez kötött második pack **NOT_RUN**, mert a teljes kapu R05 miatt FAIL.
A kötelező mátrix: **50 PASS, 1 FAIL, 2 NOT_RUN** (R10 teljes kézi mátrix és PKG03 repack).
A tipográfiai kezelés működésének sikere nem azonos az alapállapot R05 PASS-ával.

A `027b392` tesztkorrekció a korábbi negatív próba hibás `[700,400]` elvárását
javítja: Segoe UI esetén 600 is valóban különbözhet. Most minden igazoltnak kínált
párhoz minden mérési kontextusban tényleges PASS különbség szükséges. Nincs OS-név
alapú kivétel, sikertelen pár törlése, maszkolás vagy lazább küszöb.
A korábbi hibák és megszakított fejlesztési futások nem kerültek a végső PASS-ok közé.

## Actions artifactok és reprodukálható átadás

Végső [run 43755049117](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43755049117).
Head: `027b392`; a GitHub CI szintetikus merge-refje: `4843d82f04af88c266b6f81d5cb67634d952722a`.
Ez tesztref, a PR nincs beolvasztva. Az artifactok öt pontos RC-csomagot,
inventoryt, önálló fogyasztó-snapshotot/lockfile-t, nyers JSON-t, trace-t és az adott
platform saját PNG-it őrzik. A repo PNG-i a helyi Debian-méréshez tartoznak;
Ubuntu/Windows képek a megfelelő Actions artifactban vannak.

| Artifact | ID          | GitHub által közölt ZIP SHA-256                                    |
| -------- | ----------- | ------------------------------------------------------------------ |
| Linux    | 14178009454 | `baaf28f9e8ddfc8ff73f9bfd9008b444048c24b76487909c2af0ec910dedd084` |
| Windows  | 14178870324 | `8c894d62209c769b51e3c247d749d605bb425c507c1f67aaf53b9f0f7ded44ba` |

A szolgáltatói megőrzés jelenleg 2027-02-13-ig tart. A ZIP-digesztek az Actions
API-jából származnak; helyi ZIP-újrahash nem történt, mert a letöltési hálózati
útvonal nem volt elérhető. A fontjelentések teljes JSON-ja a jobnaplóból is
archivált. A képek SHA-it a mérési/archiválási manifest ellenőrzi.

A végső `artifacts/consumer` snapshotból új
`/tmp/wdf M6 natív végső-75_d10di` könyvtárban saját `npm ci --ignore-scripts`,
`npm run check:generated` és `npm run build` is PASS. Innen külön produkciós
preview futott a natív 200%-os megfigyeléshez, a tesztelt Draftoktól elkülönítve.
A friss saját függőségi audit 0 sérülékenység; a monorepo audit 7 ismert moderate
fejlesztői lint-jelzés, 0 high/critical. Részletek a biztonsági jelentésben.

## Korábbi teljes helyi kapu — összehasonlítási alap

A teljes helyi Linux `verify:m6` funkcionális `b767cff` commiton: **FAIL**,
kizárólag a változatlan Task Manager alapállapot R05-jénél. 216 unit/integrációs
PASS; 89 M0–M2, 24 M3, 15 M4, 11 M5 és 4 M6 böngészős PASS, 1 M6 FAIL.
Nincs skip/retry. A 25 szigorú R01 képpár maximuma 6 eltérő pixel,
maximum 1 csatornaérték; geometriai eltérés nincs. Az eredeti 8/1 határ változatlan.
Foundation/forrásintegritás: true. A siker utáni második
repack szakasz NOT_RUN, nem korábbi PASS átvétele.

A 75 alapállapotbeli computed mérés megfelelő. Task Manager: valamennyi
400/600/700 jelölt és minden pár megmaradt; az alapállapot utility/action 600
értéke nem igazolt képviselő. Hangár: 400/700 minden deklarált szerepen
megkülönböztethető, 30 alapmegjelenési összevetésben 0 pixel eltérés.
A valódi, hibás tokenbindingot injektáló negatív kontroll PASS; a hibás szerep
igazolt súlykészlete üres. A közvetlen jóváhagyás blokkolása, explicit edit,
STALE, Undo és újraindítás is ténylegesen lefutott a sikertelen R05 assertion előtt.

A korábbi natív CI tényleges hibái a
megőrzött hibarészletekben (privát archívum: `M6-TYPOGRAPHY-superseded-ci-failures.json`) és az
Actions teljes artifactjaiban szerepelnek. A helyi PASS nem írja felül ezeket.

## A feltárt CI-gyökérokok javítása

Ubuntu: a korábbi fixture után bent maradó egérmutató miatt a súlyváltáskor
átmenetileg eltért a task-title hover/szín kontextusa. A normál fontminták
rögzítése előtt, görgetés után a QA saját oldala az iframe-en kívülre helyezi
a valódi pointert, majd megvárja a fontokat és a paintet. A színazonosság,
glyph-küszöb, minden jelöltpár és a külön hover-tesztek változatlanok.
A negatív próba valódi hoverrel is igazolja ezt, és saját QA-hostot használ,
amelyen nincs a Lab normál snapshot-szinkronizálójával versengő listener.

Windows: egy állapot-GET timeout után a kliens read pollingja végleg leállt,
miközben a szerver QA-ja elkészült. Most egyszerre egy lekérdezés fut;
az átmeneti olvasási hiba a következő sikeres, aktuális válasz után helyreáll.
Addig a szerkesztés blokkolt. A 10 másodperces timeout változatlan.
Bizonytalan írás után nincs automatikus POST-ismétlés vagy csendes feloldás:
kifejezett visszaolvasás kell. A külön `M6 polling` böngészős regresszió
valóban mentett Draft-írás elveszett válaszával is ellenőrzi az egyszeri írást,
az egyidejűleg egy GET-et és a hiteles forrás sértetlenségét.

## Új képességkezelési követelmények bizonyítéka

| Ellenőrzés                           | Tényleges eljárás                                                                                   | Helyi eredmény                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Profil és lefedettség                | `typography.test.ts`: hibás típus/duplikáció/hiányzó kontextus, eredeti jelöltek megőrzése          | PASS                                                     |
| Közös és responsive referencia       | Ugyanott: minden fogyasztó metszete, referenciás kerülőút kizárása                                  | PASS                                                     |
| Ismeretlen/hiányos bizonyíték        | Unit és valódi Lab: nincs igazolt új súlyopció, aktuális érték megmarad                             | PASS                                                     |
| Valódi szerepek és eltérések         | `M6-R05`: 75 computed baseline, 95 Website/Studio kontextus, minden jelöltpár                       | Task Manager alapállapot FAIL; Hangár PASS               |
| Figyelmen kívül hagyott tokenbinding | `M6-R05 negative`: valódi komponens, izolált fault-injection, üres igazolt készlet                  | PASS; a belső próba szándékosan FAIL-t ad                |
| Edit, Undo és session-frissesség     | Valódi Lab és Change Manager unit; restart után STALE, Draft/history/mentett bizonyíték változatlan | PASS                                                     |
| Jóváhagyási védelem                  | Valódi Approval QA; régi/hiányzó check és alapállapoti FAIL blokkolja az API-t                      | PASS                                                     |
| Pozitív tranzakció                   | M5 explicit teszt-Draft edit, hét valódi check, külön modal, rollback és konzisztens CSS/TS/token   | PASS Linuxon és a telepített Hangár Windows-folyamatában |

Nyers eredmények: unit (privát archívum: `M6-TYPOGRAPHY-unit.json`),
M5 böngésző (privát archívum: `M6-TYPOGRAPHY-m5-browser.json`),
M6 böngésző (privát archívum: `M6-TYPOGRAPHY-m6-browser.json`),
teljes R05 (privát archívum: `M6-TYPOGRAPHY-m6-r05-typography.json`),
binding negatív kontroll (privát archívum: `M6-TYPOGRAPHY-binding-negative.json`).
A 53 soros kötelező mátrix (privát archívum: `M6-acceptance-matrix.json`) minden PASS sorában
az aktuális archivált tesztnév/status egyezését külön ellenőriztük.

## Helyi csomagolt artifactok

Mind az öt csomag `0.1.0-rc.1`. A privát source workspace `0.0.0` manifestjeit
a build tudatosan külön kezeli; a telepített belső RC-függőségek pontosak.
A teljes inventory (privát archívum: `M6-TYPOGRAPHY-package-inventory.json`) fájllistát is tartalmaz.

| Csomag             | SHA-256                                                            |
| ------------------ | ------------------------------------------------------------------ |
| @wdf/foundation    | `352983428ff00dcc64ddb84fd0589ac962d729076468574af15747f1c5fe36fa` |
| @wdf/core          | `bb1d70809c4e8ea461269682721f3f19b47eeec22058ad2a873cef2fdfc546c0` |
| @wdf/adapter-react | `e48918c7afa1815134da8fe8742cd56f4fb6eef7a86e019d6507130415fd901f` |
| @wdf/qa            | `1ddc7373541128541b4b0e48c77803bdc375a445fbd22778f56c636d3ac6a7f1` |
| @wdf/ui-lab        | `b3534bab42ef0df24317119d3cd08a50758ad2d802ada2255d4a58b40d406a67` |

A tiszta fogyasztó telepítés, saját lockfile-os `npm ci --ignore-scripts`,
ESM/deklaráció/deep-import határ, Contract/generálás és önálló production build
sikeres. A `M6-PACK/E2E` valódi Approval QA-val és külön megerősített tranzakcióval
PASS. A termelési bundle nem importálja a WDF fejlesztői csomagjait.

## Környezet és reprodukció

```sh
npm ci
npx playwright install --with-deps chromium
npm run verify:m6
```

Windows: `npx playwright install chromium`, majd ugyanaz a `verify:m6`.
A Windows-kapu natív tárolási/journal-, csomag-/telepítési és teljes M6 browser
próbákat futtat; nem állítja a Linux-only folyamat/`/proc` tesztek Windows-futtatását.
Célzott R05: `npm run build:packages`, `npm run install:consumer`, majd
`npm run test:m6 -- --grep M6-R05`. A jelenlegi blokkolt alapállapot miatt a
valódi R05 assertion reprodukálhatóan FAIL-t ad; ez nem technikai indítási hiba vagy kihagyás.

## Függőségek, korlátok, régi munkaállapot

Új font, központi szolgáltatás vagy rendszerfont-hozzáférési engedély nincs.
A már rögzített pngjs 7.0.0 a dev-only QA runtime-függősége lett; a produkciós
alkalmazás nem importálja. Az audit nem jelent teljes biztonsági tanúsítást.

A profil nélküli régi integráció javításra megnyitható, de nem kap automatikus
font-PASS-t. A profil/preview forrásváltozása a meglévő Contract-lenyomatot is
érinti: egy korábbi fejlesztői verzióval mentett munkaállapotnál a meglévő
Contract-konfliktusvédelem blokkolhatja az írást. A fájlokat és historyt nem
töröljük és nem migráljuk automatikusan. Ilyenkor mentés és külön, ellenőrzött
Contract/Draft-egyeztetés szükséges; a hibajelzés nem törlési utasítás.

A rendszer nem figyeli az OS összes fontfájlját. Fonttelepítés/frissítés után
Lab-restart és friss QA szükséges. Bármely designedit konzervatívan érvényteleníti
a közös QA-t; a Tipográfia ellenőrzése jelenleg a meglévő Targeted QA része,
nem külön optimalizált háttérszolgáltatás. A támogatási állítás az ellenőrzött
Chromium/platform/fontkörnyezetre vonatkozik.

A natív 200%-os browser zoom célzott ismétlése a végső `027b392` forráson
megtörtént mindkét alkalmazás normál, dialógus és üresen elküldött űrlap állapotán.
A Chrome saját menüje 200%-ot mutatott; a végén 100%-ra visszaállítva.
A teljes kézi R10-mátrix összesített státusza továbbra **NOT_RUN**: a teljes
állapot-/viewport-mátrix és a tartósan exportált natív képek hiányoznak.
Eljárás, megfigyelések és eszközkorlátok (privát archívum: `M6-TYPOGRAPHY-native-zoom.json`).
Az eredeti sikertelen zoom-próba (privát archívum: `M6-R05-native-zoom.json`) történetileg megmarad.
CSS-fontnagyítás nem natív zoom. Képernyőolvasó és nem támogatott böngészők nem kaptak új PASS-t.
A Windows directory-fsync/tartóssági korlát változatlan.

## Visszaállítás és átadás

A funkcionális commit elkülöníthető, visszaállítási referencia `d39adb7`.
Visszaállítás előtt a teljes helyi munkaállapotot meg kell őrizni; vegyes engine-
és bizonyítékverzió nem igazolt. A korábbi R05 FAIL visszaállításkor sem válik
PASS-szá. A történeti [R05-korrekció](M6-R05-CORRECTION.md) és valamennyi nyers
sikertelen mérés változatlanul megmarad.

Nincs merge, npm-publikálás, GitHub Release, végleges tag vagy M7-fejlesztés.
Az átadás az M6 független szakmai felülvizsgálatának szól.

A dokumentációs átadás fájlonkénti SHA-256 jegyzéke (privát archívum: `M6-TYPOGRAPHY-evidence-index.json`) a nyers eredményeket, az archivált PNG-ket és a megőrzött korábbi R05-bizonyítékokat azonosítja. A jegyzék az átadási fájlok sértetlenségét ellenőrzi; nem helyettesít tesztfuttatást vagy a távoli artifact saját digestjét.
