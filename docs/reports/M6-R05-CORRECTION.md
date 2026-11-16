> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M6 R05 QA-korrekció

A független felülvizsgálat megállapítása helyes: a korábbi, önálló Arial Canvas
400/700 minta nem igazolta a Task Manager és Hangár alkalmazáselemeit.
A korábbi R05 PASS visszavonva; az M6 readiness blokkolt az új mérés alapján.

## Módszer

`tests/m6/typography.spec.ts`: valódi Task Manager projekt a saját Labjával;
a Hangár a monorepón kívül, tényleges npm-artifactokból telepített CLI-vel.
Mindkét projekt hiteles tokens.json fájljának feloldott értékei az elvárt adatok.
Öt valódi preview-szélesség (320/390/768/1024/1440), 9 Task Manager és 6 Hangár
szerep: family, méret és súly tényleges computed érték, szöveg, DOM Range-szélesség,
fontbetöltési státusz, és a Chromium által használt platform-fontface adata.

A rögzítés `document.fonts.load` + `document.fonts.ready` és két frame után történik.
A fontcsaládoknál a deklarált fallback-láncot is megőrizzük; egy nem telepített
Trebuchet/Verdana nevét nem állítjuk ténylegesen betöltött elsődleges fontnak.
A CDP-adat mutatja a valódi helyettesítő face-t.

A Lab tényleges Typography mezőjében változik a token, a projekt **ugyanazon
valódi elemén**, változatlan szöveggel, mérettel, családdal és színnel készül a
súlypárok PNG-je. Task Manager: a deklarált 400/600/700, Hangár: 400/700.
A body, display és utility fontszerep külön mérés. A szabad numerikus mező nem
jelent 1000 külön fontface-re vonatkozó ígéretet; itt a projekt névvel deklarált
súlyai az ellenőrzött opciók. A 32/48 px-es címméretek is ugyanazon H1-en,
a Labon keresztül, egy rögzített viewporton szerepelnek.

A különbség a tényleges DOM-elem PNG-pixeleiből számított: legalább 20, legalább
8/255 csatornaeltérésű pixel és az összes tintapixel legalább 1%-a változzon.
Ez **minimum megkülönböztethetőség**, nem a vizuális regressziós eltérés megengedése.
Nincs screenshotmaszk, Canvas-szövegminta vagy független demófont. Az azonos kép
negatív kontrollként elutasított. Azonos advance-szélesség önmagában nem hiba:
a monospace 400/700 szélessége lehet azonos, miközben a betűképe különbözik.

## Feltárt és javított integrációs hiba

A Hangár `primitive.weight.body` tokenjét nem fogyasztotta a törzsszöveg;
a H1/H2 az UA alapértelmezett bold értékéből élt. A meglévő body/méret/súly,
címsor-, akció- és label-tokenek most explicit CSS-bekötést kapnak.
A default 400/700 és valamennyi arculati érték változatlan. Öt szélesség × hat
szerep, **30 nulla pixel-eltérésű összehasonlítás** a korábbi fontdeklarációkkal.
A generált tokenfájlok és a Task Manager arculata változatlanok.

## Valódi nyitott R05 hiba

A helyi Debian 13 / Chromium 159 vizsgálatban a Task Manager 600/700:

| Valódi elem   | 600 és 700 platform-face                  | Változó pixel | Státusz |
| ------------- | ----------------------------------------- | ------------: | ------- |
| `.page-intro` | NotoSans-Bold / NotoSans-Bold             |             0 | FAIL    |
| `h1`          | NotoSans-Bold / NotoSans-Bold             |             0 | FAIL    |
| `.eyebrow`    | DejaVuSansMono-Bold / DejaVuSansMono-Bold |             0 | FAIL    |

A computed súly 600 és 700, a betűkép mégis teljesen azonos. Ezt nem fogadjuk el
különböző opcióként, és nem emeljük a toleranciát. A Task Manager fontjait,
súlyait és CSS-ét nem módosítjuk a hiba elrejtésére. A feloldáshoz a használt
fontadatok vagy a projekt által kínált súlyok szakmai döntése szükséges.
A meglévő, elfogadott arculat csendes cseréje nem része e QA-korrekciónak.

A Hangár tokenbekötés utáni 400/700 és a két projekt 32/48 méretpárjai a
célzott mérésben ténylegesen különböznek. A teljes új Linux/Windows kapu is R05 miatt FAIL; a részletes futási adatok alább szerepelnek.

## Vizuális és platformkövetelmények

R01: az eredeti legfeljebb 8 pixel / 1 csatornaérték és nulla geometriai eltérés,
Chromium `--disable-partial-raster` javítás, Foundation LOCKED: változatlan.
A teszt a saját Draftban dolgozik, megvárja a visszaállítás mentését, és ellenőrzi,
hogy nem írta a hiteles tokenforrást. Jóváhagyás, Git-művelet vagy publikálás nincs.
A `verify:m6` most négy kötelező M6 tesztet és külön R05 bizonyítékot követel.
Korábbi futásból megmaradt eredmény nem maradhat aktuális PASS: a kapu induláskor
ERROR/NOT_RUN jelöléssel érvényteleníti a saját korábbi összesítő/R05/repack riportját.

A natív 200% browser zoom státusza külön vizsgálat; CSS-fontnagyítás nem helyettesíti.
Az aktuális natív ismétlés NOT_RUN: a CUA/Sky Chromium-indítás nem adott böngészőablakot. Két ablaklista és a desktopkép is ezt mutatta. Pontos eljárás és korlát (privát archívum: `M6-R05-native-zoom.json`).
A teljes M6 továbbra kizárólag független szakmai felülvizsgálatig terjed.

## Végső teljes ellenőrzések

Ág: `feat/m6-release-qa`, fejlesztési head:
`5b4d4d644aae4cc3a3c0a86c59376df67a4e1b47`. A CI a PR-merge checkoutot
vizsgálta: `59b0262e6938b01ff2ed4291662bee6974a0da6c` (azonos módosított források, main `5f0d8b3`).
Verzió 0.1.0-rc.1, Node 24.22.1/npm 11.9.0, Playwright 1.65.1/Chromium 159.0.8154.6.
Teljes gépi összefoglaló (privát archívum: `M6-R05-summary.json`), CI-metaadat (privát archívum: `M6-R05-CI.json`).

| Környezet              | Teljes kapu | Tényleges eredmény                                                        | Bizonyíték                                                                                                                                                 |
| ---------------------- | ----------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Debian 13 Linux x64    | **FAIL**    | 204 unit PASS; 89+24+15+11+3 = 142 browser PASS; 1 R05 FAIL; 0 skip/retry | Kapu (privát archívum: `M6-R05-m6-results.json`), napló (privát archívum: `M6-R05-full-linux.log`), R05 (privát archívum: `M6-R05-m6-r05-typography.json`) |
| Natív Ubuntu CI        | **FAIL**    | Teljes M0–M5 PASS; 3 korábbi M6 teszt PASS; R05 FAIL                      | Napló (privát archívum: `M6-R05-ubuntu-verification.log`), R05 (privát archívum: `M6-R05-ubuntu-results.json`)                                             |
| Windows Server 2025 CI | **FAIL**    | 20 portable storage/journal PASS; 3 korábbi M6 browser PASS; R05 FAIL     | Napló (privát archívum: `M6-R05-windows-verification.log`), R05 (privát archívum: `M6-R05-windows-results.json`)                                           |

[Actions run 43715859941](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43715859941),
Linux job 132817130310, Windows job 132817130132. A kapuk ténylegesen végrehajtottak,
a FAIL nem technikai indítási hiba: az R05 assertion pontosan a fontütközést jelzi.
A statikus formatter/lint/TypeScript és UI-audit is hibamentes; az utóbbi nem helyettesíti a renderelt fonttesztet.
A helyi teljes kapu sourceIntegrity értéke true; mindhárom R05-reportban a vizsgált projektek hiteles tokenforrása változatlan.

| Környezet  | Task body 600/700                                            | Task display 600/700                   | Task utility 600/700                      |
| ---------- | ------------------------------------------------------------ | -------------------------------------- | ----------------------------------------- |
| Debian 13  | NotoSans-Bold / azonos, **0 pixel: FAIL**                    | NotoSans-Bold / azonos, **0: FAIL**    | DejaVuSansMono-Bold / azonos, **0: FAIL** |
| Ubuntu CI  | DejaVuSans-Bold / azonos, **0: FAIL**                        | DejaVuSans-Bold / azonos, **0: FAIL**  | DejaVuSansMono-Bold / azonos, **0: FAIL** |
| Windows CI | SegoeUI-Semibold / SegoeUI-Bold, **3520 eltérő pixel: PASS** | TrebuchetMS-Bold / azonos, **0: FAIL** | Consolas-Bold / azonos, **0: FAIL**       |

Mindhárom környezetben 75/75 alapértelmezett szerep/viewport computed ellenőrzés PASS.
A Hangár 400/700 body/display/utility párjai és a 32/48 címméretek mind különböznek;
a 30 alapmegjelenési összehasonlítás mindhárom környezetben **0 pixel eltérés**.
A Task Manager arculati forrása nem változott. A helyi R01 újrafutás 25 párja PASS,
a korábbi szigorú határokkal. A Task Manager 160 és Hangár 100 Approval-render ellenőrzése PASS;
ez nem írja felül az új R05 FAIL-t.

### Képek és artifactok

A repository r05 képei (privát archívum: `evidence/m6/r05`) a helyi Debian-futásból valók.
Az Ubuntu/Windows JSON-ok saját képfájljai a saját Actions artifactjukban vannak;
a hasonló fájlnév nem jelenti a három környezet képeinek azonosságát.
A mostani további regresszióképek a CI artifact `artifacts/evidence/m3`–`m5`
és `docs/reports/evidence/m6` könyvtáraiban találhatók. A repository történeti
átadási képeit nem írjuk át új futás képének álcázva.

- [Ubuntu artifact 14163006733](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43715859941/artifacts/14163006733), ZIP SHA-256 `1f146c24483be2eb51b8b663a4c7ccb89001dc800b333a87b33cfd2820025244`.
- [Windows artifact 14162772837](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43715859941/artifacts/14162772837), ZIP SHA-256 `0153768ecb8117e728281e82f20b89edd1dfed053327aab8880df78aa2d0c2d1`.

A bináris csomagok build/pack/telepítése sikeres volt, verzióik változatlanok.
A sikeres kapu utáni második pack/reprodukálhatósági szakasz ebben a futásban
**NOT_RUN**, mert a R05 blokkolta a kaput; nyers státusz (privát archívum: `M6-R05-m6-package-reproducibility.json`).
A korábbi M6 PASS nem lett újra felhasználva aktuális eredményként.

### Reprodukció és visszaállítás

```sh
npm ci
npx playwright install --with-deps chromium
npm run verify:m6
# Célzott R05-hez, friss fogyasztóval:
npm run build:packages
npm run install:consumer
npm run test:m6 -- --grep M6-R05
```

Windows alatt `npx playwright install chromium`; a `verify:m6` natív portable
storage + csomag/install + négy M6 browser tesztet futtat. A fontok az operációs
rendszer által rendelkezésre bocsátott, a JSON-ban ténylegesen azonosított face-ek.
Eltérő rendszeren a konkrét face és páronkénti eredmény eltérhet; ezt nem állítjuk
a ténylegesen futtatott környezettel azonosnak. A jelen három eredmény reprodukciós
kiindulópontja az explicit commit/környezet/fontface adat.

Visszaállítási referencia `9c13dc1`: a QA-korrekció commitja revertelhető, de
ez a korábbi R05 bizonyíték hiányát nem teszi megfelelővé. A javított Hangár CSS
default 400/700 megjelenése azonos; tokenek/generált fájlok nem változtak.
A Task Manager fontadatának cseréje vagy a projektszintű súlyopciók pontosítása
fontonkénti/platformonkénti szakmai döntést és új arculati regressziót kíván.
A jelen QA-korrekció nem hajt végre rejtett fontcserét, kivételkezelést vagy tolerancialazítást.

**Átadás: a QA-korrekció végrehajtva, M6 továbbra BLOKKOLT.** A valódi R05 hiba
nyitott maradt a megőrzött arculati keret mellett. Nincs merge, npm-publikálás,
GitHub Release, tag vagy továbblépés M7-re. Független szakmai felülvizsgálat következik.

Az R10 mátrixsor az automatizált PASS mellett a natív 200% ismétlést is
megkülönbözteti: az összesített aktuális lefedettség **NOT_RUN**, nem teljes
kézi megfelelőségi PASS. Ez környezeti ellenőrzési korlát, nem új fontcsere vagy
CSS-nagyítással elért natív zoomeredmény. A PKG03 szintén NOT_RUN a kapu
siker utáni fázisának kihagyása miatt; a teljes mátrix 49 PASS / 1 FAIL / 2 NOT_RUN.
