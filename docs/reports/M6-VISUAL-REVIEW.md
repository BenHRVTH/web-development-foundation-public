> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M6 kézi vizuális és billentyűzetes review

2026-11-15, Europe/Budapest; Linux, látható Chromium; Task Manager önálló build
127.0.0.1:4184, telepített Hangár production build 127.0.0.1:4183.
A programok saját forrású React-komponenseket és generált token-CSS-t használnak.

## Tényleges eljárás és megfigyelés

A megosztott desktop Chromiumában mindkét alkalmazást megnyitottam. Ctrl+0,
majd öt Ctrl+plus lépés után a böngésző saját zoom-buboréka **200%** értéket
mutatott. Ez valódi browser zoom, külön az automatizált 200% root-font/reflow méréstől.
A native accessibility provider nem volt elérhető; X11 ablakra kötött billentyű-
és koordinátaműveleteket és tényleges képernyőképeket használtam.

Hangár: az időpontok mobil jellegű elrendezésben a programcím fölé kerültek;
a nagyított magyar szöveg tördelődött, nem alakult ki vízszintes vágás. Görgetéssel
elérhető maradt a Helyet kérek. A nyitott modal, névmező, megerősítés és Mégse
elfért. Üres submit után a szöveges hiba megjelent, a fókusz visszatért a névmezőre,
és a vastag fókuszkeret jól látható volt. Az arculat kék/rozsdaszínű maradt.

Task Manager: a levendula/lila munkafüzet-arculat változatlan. 200%-on az Új feladat
elérhető maradt. A modal saját belső görgetése nem vágta le az űrlap alját:
Tabbal a leíráson és checkboxon át elértem a Mégse/Feladat létrehozása gombokat,
a fókuszba kerülő tartalom megfelelően begördült. Üres submit után a kötelező név
hibája és a névmező fókusza látható volt; a teljes hosszú űrlap hozzáférhető maradt.

Az alkalmazásképek 320/1440 px-en és a modal/error képek külön vizuálisan is
áttekintve: jól olvasható magyar ékezetek, jellegzetes hierarchia, együtt álló ikon/szöveg,
érthető tiltott állapot, elérhető műveletek. A reproképek az evidence/m6 könyvtárban
vannak; a natív 200%-os ellenőrzés képernyőképei a chat computer-use bizonyítékai.
A desktop közvetlen fájlmentése a környezet read-only korlátja miatt nem volt
elérhető; nem tüntetünk fel nem létező natív screenshotfájlokat.

Az átadott `artifacts/consumer` snapshotot új `/tmp/wdf M6 átadás-iWTHI3`
könyvtárba másolva a saját lockfile-os `npm ci --ignore-scripts`, generálási check,
production build és `qa:browser` is sikeres. Ebből indítottam a `npm run ui-lab`
parancsot. Natív 200%-on a Lab saját Website/Studio fülei, viewport/A–B vezérlői
és négy saját Registry-komponense tördelődve, átfedés nélkül elérhetők maradtak.
A valódi Hangár preview függőlegesen görgethető volt. A képernyőképen a böngésző
200%-os buboréka is látható; a zoom nem a preview belső skálázásából származott.

## Designkontextus egyeztetés

| Szabály                                          | Bizonyíték                                                                      | Eredmény                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------- |
| Saját Hangár arculat, nincs Task Manager átvétel | Saját tokens.json, programlista és helyfoglalás; két szélesség vizuális review  | MATCH                                        |
| Egy hiteles tokenforrás                          | generate.mjs → CSS/TS; telepített check:generated és jóváhagyás utáni driftkapu | MATCH                                        |
| 16/24/32 kártyapadding                           | Mért computed padding és tényleges tartalmi inset, öt szélesség                 | Automatizált bizonyíték a geometriariportban |
| Látható fókusz, modal és reflow                  | Valódi Tab/Escape, üres submit, automatizált és natív 200%                      | PASS a vizsgált állapotokra                  |

Képernyőolvasó: NOT_RUN, megfelelő eszköz nem állt rendelkezésre. Firefox/WebKit,
fizikai érintős mobil és virtuális billentyűzet: NOT_RUN. A vizsgált, releváns
WCAG-ellenőrzések nem teljes, minden környezetre érvényes megfelelőségi tanúsítás.

## Korábbi javított forrás történeti review-ja

Commit: 7e1dbe063c19656704818ce9becf96a9bf46a7dc. A teljes kapu végső
`task-normal-320.png` és `task-reflow-200-320.png` képét külön megtekintettem:
a normál levendula/lila arculat és hierarchia megmaradt, a 200%-os modalban a
magyar label és hiba tördelődik, a vastag fókuszkeret látható, vízszintes vágás nincs.
A hosszú űrlap függőleges görgetését és műveleteinek elérését a tényleges
Tab/Escape/submit teszt igazolja. Öt szélességen a korábbi normál brand-szabályokkal
0 pixel eltérés; Ubuntu és Windows alatt is PASS.

A végső CSS utáni újabb natív 200% ismétlés: **NOT_RUN**. A desktop Chromium
indítása nem adott ablakot, a cloud browser „could not read requirements”
eszközhibával állt le. Az előző natív 200% PASS korábbi tényleges vizsgálat,
nem ezen sikertelen ismétlés átnevezése. A végső renderelt képek kézi review-ja
és a Chromium 159-es teljes regresszió külön, megőrzött bizonyíték.

## Korábbi R05-korrekció — történeti ellenőrzés

Forráscommit: `5b4d4d644aae4cc3a3c0a86c59376df67a4e1b47`. A Task Manager
`.page-intro` 600/700 kivágását egymás mellett ténylegesen megtekintettem: azonos
betűkép. A Hangár `.eyebrow` 400/700 párját is megtekintettem: az advance-szélesség
azonos, de az erősebb betűkép jól látható. Ezek valódi alkalmazáselem-screenshotok,
nem külön mintaszövegek. A mérések és a platform-fontface adatai a
[R05-korrekcióban](M6-R05-CORRECTION.md) és a kapcsolódó JSON-okban vannak.

Az akkori natív 200% browser-zoom ismétlés **NOT_RUN**. A CUA/Sky Chromium
indítása után két ablaklista és a desktopkép sem mutatott böngészőablakot;
natív zoomvezérlő nem állt rendelkezésre. Pontos aktuális korlát (privát archívum: `M6-R05-native-zoom.json`).
Nem helyettesítettük CSS-fontnagyítással, és a régebbi natív PASS-t nem minősítjük
aktuális commiton elvégzett ismétlésnek.

## Tipográfiai képességek és új natív megfigyelés

A végső `027b3922a36e3917d72250bfce25fc0a7109072f` commiton teljesen új Linux-kapu és natív Ubuntu/Windows CI készült. A korábbi
mérések és a fenti történeti megfigyelések megmaradnak; az aktuális bizonyíték
[M6-TYPOGRAPHY-HANDOFF](M6-TYPOGRAPHY-HANDOFF.md) szerint értékelendő.
A rendszerfontok, alkalmazás-CSS és alaptokenek változatlanok. A Hangár mind
30 alapállapotbeli tipográfiai összevetése pixelazonos. R01 tolerancia vagy
screenshotmaszk nem változott; a részleges raszterezés tiltása megmaradt.

A natív Chromium végül elérhetővé vált. A végső Task Manager produkciós buildet és az artifactokból külön, tiszta könyvtárban újratelepített/buildelt Hangárt nyitottam meg. Valódi, Chrome-menüben ellenőrzött
200%-on mindkét alkalmazás normál nézetét, dialógusát és üres submit hibáját
megfigyeltem. A Task Manager modal saját görgetésével az alsó műveletek
elérhetők maradtak. Mindkét névmezőn látszott a fókusz és a magyar hibaszöveg;
a Hangár Shift+Tabbal körbeforduló fókusza látható maradt. Mindkét alkalmazás Escape után visszaadta a fókuszt az indító gombnak.
A Chrome menüjében a végén 100%-ot ellenőriztem.

Ez célzott kézi megfigyelés. A teljes kézi R10-mátrix **NOT_RUN** marad:
a teljes állapot-/viewport-vizsgálat és a tartós natív PNG-export nem készült el.
A képek a CUA beszélgetésben láthatók, a fájlexport EROFS hibát adott;
nem hivatkozunk nem létező natív PNG-re. Pontos eljárás (privát archívum: `M6-TYPOGRAPHY-native-zoom.json`).

A végső helyi utility 600/700 alkalmazáselem-kivágását külön megtekintettem: azonos betűkép. A Hangár time 400/700 párján az azonos szöveg erősebb betűképe jól látható. Ezek a végső `r05-capabilities` alkalmazás-PNG-i; a szélességazonosság önmagában nem a megkülönböztethetőség mércéje.
