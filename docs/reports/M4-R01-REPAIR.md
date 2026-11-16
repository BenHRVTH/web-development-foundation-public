> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M4 — R01 CI-eltérés kivizsgálása és javítása

## Kiváltó ok

A Chromium részleges raszterezése állapotváltások után a renderelési előélettől
függő élsimítási pixeleket hagyott a képen. Azonos kész DOM, geometria és stílus
mellett a standalone dokumentum és a Lab iframe korábban festett képrészleteinek
újrafelhasználása eltérő eredményt adott. A `--disable-gpu` ezt nem kapcsolta ki.
A célzott javítás a teljes csempék újraraszterezése a pixeltesztekben:
`--disable-gpu --disable-partial-raster`.

A besorolás alapja az eredeti CI-képpár és trace, a helyi reprodukció, az azonnali
újrafényképezés és az egyetlen további raszterbeállítást változtató kontrollkísérlet.
A trace nem tartalmazza a Skia belső C++ végrehajtását; upstream hibasort nem állítunk.

## A két eredeti futás

| Tulajdonság             | Push                                                                                           | Pull request                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Futás                   | [43638414760](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43638414760) | [43638591887](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43638591887) |
| Commit                  | `5b544068a0d886c436892f28ce1b96e909e2e946`                                                     | `f88fd425747776a44c14325184b9038c4b70bf4e` szintetikus merge                                   |
| Forrásfa                | `97d61578d29e0730f50f5abf051fa0d3ec650579`                                                     | pontosan ugyanaz                                                                               |
| Runner                  | Ubuntu 26.04, image `20261111.196.1`                                                           | ugyanaz                                                                                        |
| Node / npm / Playwright | 24.22.1 / 11.9.0 / 1.65.1                                                                      | ugyanaz                                                                                        |
| Chromium                | 159.0.8154.6, revision 1255, headless shell                                                    | ugyanaz                                                                                        |
| Eredmény                | 135 unit + 89 M0–M2 PASS; 23/24 M3; M4 nem indult                                              | 135 + 89 + 24 + 15 PASS                                                                        |

A trigger önmagában nem változtatott forrást, tesztparancsot vagy böngészőprofilt.
Mindkét workflow ugyanazt az `npm run verify:m4` parancsot futtatja, két workerrel,
újrapróbálkozás nélkül. A diagnosztikai commit a régi profil változtatása nélkül
újabb R01-hibákat is előidézett mindkét triggeren.

## Az eredeti hibás pixelek

A koordináták nullától indulnak a teljes, maszkolatlan 320 × 900 PNG-ben.
A push képpárban **10 eltérő pixel** található:

| Hely                                                                                      | Jelleg                                                  | Legnagyobb csatornaeltérés |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------- |
| `(23, 291)`                                                                               | Bevezető szöveg bal oldali LCD élsimítási pereme        | 17                         |
| `(23, 420)`                                                                               | Visszajelző szöveg bal oldali LCD élsimítási pereme     | 28                         |
| `(23, 456)`                                                                               | Már háttérrel fedett területen maradó színes perempixel | 28                         |
| `(24, 823)`, `(24, 824)`, `(25, 824)`, `(24, 825)`, `(25, 826)`, `(24, 827)`, `(25, 827)` | Üres kártya bal felső ívének raszterkerekítése          | 1                          |

A `(23, 420)` pixel RGBA értéke kívül `[243,237,220,255]`, belül
`[243,242,248,255]`; a kék csatorna különbsége 28. A `(23, 456)` pontban ugyanez
a háttér/perempixel különbség fordított irányban jelentkezik. Az üres állapot
ikonja és a kép összes többi pixele egyezik. A sikeres PR-futás ugyanilyen
állapotának teljes képpárja pixelazonos.

- Eredeti push: standalone (privát archívum: `evidence/m4-r01-repair/ci-push-320-empty-outside.png`), iframe (privát archívum: `evidence/m4-r01-repair/ci-push-320-empty-inside.png`).
- Eredeti PR: standalone (privát archívum: `evidence/m4-r01-repair/ci-pr-320-empty-outside.png`), iframe (privát archívum: `evidence/m4-r01-repair/ci-pr-320-empty-inside.png`).
- Nagyított perempixelek (privát archívum: `evidence/m4-r01-repair/ci-push-pixel-enlargement.png`). A nagyítás csak szemléltetés; az összehasonlítás az eredeti PNG-ken történt.
- Mért RGBA értékek, PNG-hash-ek, trace-adatok és kontrollkísérletek (privát archívum: `M4-R01-forensics.json`).

Az artifactok a GitHub runneren, az eredeti run-id alapján kerültek kiolvasásra;
a letöltéshez használt ideiglenes workflow-lépések és segédprogram a végleges
javításnak nem részei.

## Környezet, fontok, animációk és időzítés

Az eredeti trace-ben a két geometriaeredmény pontosan egyezik, beleértve a
számított fontokat, méreteket, paddingeket, színeket, vezérlőket és a 320 × 900
viewportot. A layout és a szövegtördelés egyezik.

A projekt rendszerfontokat használ: `system-ui`, `Trebuchet MS` fallbackkel,
illetve `ui-monospace`. Nincs `@font-face` vagy külső fontkérés. Az eredeti trace
kizárólag helyi HTTP-erőforrásokat tartalmaz. Mindkét `document.fonts.ready`
feloldódott a screenshot előtt; az utolsó 47,587 ms-mal a standalone kép kezdete
előtt. Az utolsó iframe-checkbox kattintás 170,270 ms-mal korábban befejeződött.

A profil headless Chromium, `hu-HU`, `Europe/Budapest`, `reducedMotion: reduce`.
A screenshot `animations: disabled`, `caret: hide`; az app nem deklarál
animációt vagy transitiont. A helyi műszeres reprodukcióban a fontállapot `loaded`,
az aktív animációk száma 0, a DPR 1, a görgetés mindkét felületen `(0,0)`, az iframe
helyzete egész pixeles `(648,254,320,900)`.

A hibás helyi képpár azonnali újrafényképezése mindkét oldalon **0 változó pixelt**
adott, miközben az oldalak közötti eltérés megmaradt. Egy további screenshot vagy
önkényes várakozás ezért nem kezeli a kiváltó okot.

## Célzott változtatás

- Az M3 és M4 Playwright-profil `--disable-partial-raster` kapcsolót kapott a meglévő szoftveres profil mellett.
- Az R01 a mért állapotot az assert előtt elmenti. Hiba esetén külön megőrzi az összehasonlított eredeti PNG-buffereket, a pixelkoordinátákat, a böngészőverziót, a font-/animációállapotot és az SVG-/iframe-geometriát.
- A pixel- és geometriai összehasonlítás, a 8 pixeles / 1 csatornaegységes határ, a teljes viewport, az öt szélesség és az öt állapot változatlan. Nincs maszk, kihagyás, retry vagy fix idejű sleep.
- Az M4 termékkód, a Task Manager, a tokenforrások, a Foundation és a négy eredeti specifikáció változatlan.

## Stabilitás ellenőrzése

A raszterjavítással a `232a025` commit push és PR futása, majd a `9d930c2` push
futása is sikeres lett Chromium 159 alatt. A `9d930c2` PR-futásban külön hideg
indulási időzítési korlát jelentkezett: az első két R01 teszt még a screenshotok
előtt elérte a Playwright alapértelmezett 5 másodperces `expect` határidejét.
A státusz kilenc `Kapcsolódás` mintavétel után már `Tokenek frissítése` volt.

Az R01 ezért az induláskor és újranavigáláskor a valódi `Élő kapcsolat` állapotot
(az aktuális design ACK-ját) legfeljebb 15 másodpercig várja. Ez az eseményalapú
tesztelőkészítést érinti. A termék 8 másodperces kapcsolat-/ACK-határidői, az
ACK-validáció és minden pixelküszöb változatlan. A kép csak a sikeres
visszaigazolás után készül; hibás kapcsolat nem minősül sikeresnek.

Helyi Chromium: **156.0.8078.79**, Debian 13. Ez különbözik a CI rögzített
159.0.8154.6 böngészőjétől; a CI-profilt a GitHub mindkét triggerén is ellenőrizni kell.

A régi profillal 60 célzott ismétlésből 4 FAIL született. A részleges raszterezés
kikapcsolásával, ugyanabban a műszeres és újrafényképező tesztben **40/40 PASS**,
**200/200 pixelazonos képpár** született. A próbateszt nem maradt a tesztkészletben.

A teljes, egymást követő `verify:m4` futások mért eredményei a
stabilitási jegyzőkönyvben (privát archívum: `M4-R01-stability.json`) szerepelnek. Mindegyik teljes
kapu tartalmazza a formázást, lintet, típusellenőrzést, buildet, 135 unit tesztet,
89 M0–M2, 24 M3 és 15 M4 Chromium-tesztet, 25 R01 képpárt, 135 fixture/viewport
mérést és 4 M4 pixel-összehasonlítást.

A javított ág GitHub-futásai: [Actions — feat/m4-component-studio](https://github.com/BenHRVTH/web-development-foundation/actions?query=branch%3Afeat%2Fm4-component-studio).
A konkrét push és pull_request futásazonosítók a [PR #5](https://github.com/BenHRVTH/web-development-foundation/pull/5) leírásában szerepelnek.

## Visszaállítás

A javítás QA-konfigurációra, hibadiagnosztikára és bizonyítékokra korlátozódik.
A javítás commitjának revertje visszaállítja a korábbi tesztprofilt; alkalmazásadatot,
funkciót vagy Foundation-szabályt nem érint. A korábbi profil ismert R01-instabilitása
ezzel visszatérne. A PR nyitva marad; M5-fejlesztés nem része ennek a javításnak.
