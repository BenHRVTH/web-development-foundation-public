# ADR-0011 — M6 projektszintű, ellenőrzött tipográfiai képességek

Dátum: 2026-11-15, Europe/Budapest. Állapot: alkalmazott döntés.
Kiindulópont: PR #7, `d39adb7`. A felhasználó végleges döntése: rendszerfontok,
meglévő Task Manager és Hangár arculat; nincs új fontkészlet vagy automatikus javítás.

## Probléma és változatlan követelmények

A CSS 600/700 computed értékei helyesen eltérnek, miközben több rendszerfont
ugyanazt a face-t és pontosan azonos pixeleket rendereli. A korábbi
[M6 R05 FAIL](../reports/M6-R05-CORRECTION.md) teljes bizonyítéka megmarad.
Az 1–1000 típusellenőrzés nem fontképesség-bizonyíték. A Foundation LOCKED,
R01 toleranciái/raszterezése, tokenforrás és jóváhagyás védelme változatlan.

## Legkisebb szerződés

A projekt `wdf/typography.json` saját `schemaVersion: 1.0.0` profilt importál
az eddigi megbízható preview default export `typography` mezőjében. A Manifest
1.0.0, tokenformátum 1.0.0 és Preview wire 1.1.0 nem változik. A profil nem
produkciós függőség és nem második designadat-forrás. Nincs új csomag.

Egy szerep: stabil `id`, `familyToken`, `sizeToken`, `weightToken`, `weights`
(véges mérendő jelöltek), `targets` (Website selector, illetve Studio
component/fixture/selector). A `weights` nem támogatási állítás: a QA minden
párt megmér, a Lab csak a bizonyított részhalmazt engedi külön opcióként.
Egy fix szerep egyetlen súlyt is deklarálhat; nem kényszerítünk minden fontra két face-t.
A default értékek továbbra kizárólag a hiteles tokens.json-ból jönnek.

A Core strict verziózott sémát és típus/scope-független referencia-lefedettséget
ellenőriz: minden súlytoken elérhető valamely deklarált szerepen; nincs ismeretlen
vagy hibás típusú token, ismételt szerep/súly, üres mérési cél. A QA a Registry
component/fixture hivatkozást és a célok tényleges renderelését is ellenőrzi.
A projekt választja a szerepeket; a Task Manager nem globális WDF alapértelmezés.

## Valódi QA és támogatási részhalmaz

A közös `@wdf/qa/browser` futtató mindkét projekt szerepeit öt szélességen,
valódi Website- és deklarált Studio-elemen ellenőrzi. A Targeted QA sem hagyhatja
ki a profilhoz szükséges Studio-célokat. A súlypróbák az eredeti Preview
apply-design protokollon át, kizárólag a QA saját iframe-jeiben történnek.
Nincs másolt demókomponens, Canvas, CSS-maszk vagy DOM-stílusfelülírás.
A Draft és a hiteles tokenforrás ettől nem változik.

Betöltés: document.fonts.load + ready és két frame. Mérés: computed család,
méret, súly, változatlan szöveg/stílus/szín/letter-spacing; valódi PNG és SHA-256;
CDP tényleges fontface-diagnosztika, ahol elérhető. A különbség minimuma változatlan:
legalább 20 pixel, legalább 8/255 csatornaeltérés, legalább 1% tintapixel.
Az azonos raszter negatív kontrollként mindig elutasítandó. A monospace azonos
advance-szélessége önmagában nem elutasítási ok.

Minden jelöltpár PASS/FAIL eredménye megmarad. Összeolvadásnál csökkenő numerikus
sorrendben választunk egymástól bizonyítottan eltérő képviselőket; így az azonos
600/700 párból 700 képviselő és 600 elutasított jelölt lesz. Ez kizárólag a
választó működése: meglévő 600-as értéket soha nem ír át 700-ra. A szerep támogatott
készlete a célok és szélességek, közös tokennél minden fogyasztó metszete.

A jelenlegi érték nem igazolt képviselőként FAIL és jóváhagyási blocker marad.
Ez konzervatív határ: a megőrzött Task Manager 600-as utility/action szerepei
mellett az M6 továbbra blokkolt lehet. Nem minősítjük pusztán a detektálás
sikerét az alkalmazás tipográfiai megfelelőségének. A Hangár 400/700 mérése ettől
függetlenül igazolható. Nincs platformnév alapján kiosztott felmentés.

## Lab és bizonyítékfrissesség

Az egyetlen közös TokenField kezeli a súlyválasztót mindkét workspace-ben.
Mérés előtt NOT_RUN, futás alatt RUNNING, szerkesztés vagy bemenetváltozás után
STALE, hibás profil/technikai mérés esetén ERROR. Ezek nem igazolt opciók.
Az összeolvadó érték látható, de külön igazolt választásként disabled; az aktuális,
régi vagy listán kívüli érték megmarad és pontos magyarázatot kap. A hivatkozásmód
sem kínálhat nem igazolt súlyt kerülőútként. A sima numerikus szerkesztés helyett
natív, a Lab meglévő select-tulajdonosi döntésének megfelelő választó működik.

A friss, FAIL összesítésű QA is bizonyíthat egyes megfelelő opciókat; ezek
választhatók javításhoz. Ebből nem következik jóváhagyhatóság. Új érték választása
kifejezett felhasználói Draft-edit, Undo/Redo és mentés a meglévő Change Manageré.
A szerver általános típusos szerkesztési API-ja megőrzi a javíthatóságot; közvetlen
API-val vagy régi Draftból bekerülő nem igazolt érték sem mehet át az Approval QA-n.

A profil, projektforrás/CSS, tokenállapot, engine/lockfile és környezet a meglévő
lenyomatokhoz kötött. A rendszerfont-bizonyíték ezen felül a Lab munkamenetéhez
kötött: restart után új mérés kell, miközben a tartós Draft/history sértetlen marad.
Fonttelepítés vagy operációsrendszer-fontfrissítés után a Labot újra kell indítani;
a WDF nem állít teljes operációsrendszer-fontfigyelőt. A tényleges fontface-ek és
PNG-k a mérés környezetének bizonyítékai, nem platformfüggetlen pixelazonossági ígéret.

A PNG-k a már ellenőrzött helyi tároló evidence almappájába kerülnek, véletlen
futásazonosítóval, szűk módokkal és symlink-elutasítással. Nem kerülnek npm-csomagba.
A kiszolgáló nem fogad el böngészőből mérési útvonalat, profilt vagy végrehajtókódot.

## Approval és kompatibilitás

A meglévő hat check mellé `WDF-TYPE-001` kötelező. Hiányzó check vagy friss PASS
nélkül nincs jóváhagyás. A többi check, explicit modal, tranzakció/journal,
Foundation és biztonsági korlát nem változik. Régi QA nem válik új PASS-szá.
Profil nélkül a Lab javításra megnyitható, a súlyok nem igazoltak, az új QA ERROR.
Ismeretlen profilverzió elutasított; nincs implicit migráció vagy Draft-átírás.

Az öt csomag együtt csomagolandó, pontos belső RC-verziókkal. Új QA futásidejű
függőség a már rögzített pngjs 7.0.0; kizárólag a dev-only QA-csomagban.
A régi protokollok nem kapnak dokumentálatlan új mezőt; a profil az új kiadás
projektintegrációjának külön, verziózott képessége.

## Nem része az M6-nak

Fontkészlet-csere, automatikus fonttelepítés, fontkatalógus, folytonos variable-font
csúszka, automatikus arculati javítás, új adapter/böngészőtámogatás. A natív 200%
browser zoom külön bizonyíték marad; CSS-fontnagyítás nem helyettesíti.

## Elfogadás és rollback

A történeti hibák és az új összes jelöltpár megőrzendő. Sikeres mérés mellett
valódi választó-, stale/restart-, megőrzöttérték-, referencia-, hiányosintegráció-
és Approval-blokkolási teszt szükséges. A Task Manager pozitív tranzakciós
regressziója kizárólag explicit tesztfelhasználói szerkesztést alkalmazhat saját
elkülönített Draftban; ez nem állíthatja az eredeti 600-as alapállapot PASS-át.

Rollback: a képességkezelési commit revertje elkülöníthető; a `d39adb7` eredeti
R05 FAIL-ját és korlátait ettől változatlanul fenn kell tartani. Régi Lab és új
bizonyíték vegyes használata nem támogatott; visszaállítás előtt a munkaállapotot
meg kell őrizni. Nincs merge, publikálás, Release vagy végleges tag.

## Feltárt betöltési sorrend javítása

Az első Studio apply-design ACK korábban megelőzhette a Vite modul/CSS-importjait;
a későbbi generált stylesheet visszaírhatta a Draft súlyát. A dev-only adapter
csak document.readyState=complete után fogadja a connectet. A meglévő újracsatlakozó
kliens ezután ugyanazon protokollon küldi a snapshotot. A szigorú computed mérés
nem alkalmaz ismételt snapshotot a hiba elrejtésére. A glyph-capture az elem
láthatóvá görgetése után várja meg a fontokat és két paint frame-et.

## A teljes QA-ban feltárt állapotizoláció és polling

Egy korábbi fixture után a pointer a feladatcím fölött maradhatott; a súly
változtatta a tördelést és ezzel a hover/szín kontextust. A normál tipográfiai
mintákhoz a QA saját böngészőoldalán a valódi pointert az iframe-en kívülre
helyezzük, görgetés után, font/paint megvárása előtt. Nincs hover-CSS felülírás,
maszk vagy lazább színazonosság. A meglévő külön hover-tesztek megmaradnak.
A negatív kontroll saját QA-hostot használ, nem versenyez a Lab normál snapshot
szinkronizálójával; tényleges hoverrel és figyelmen kívül hagyott komponenssúllyal
ellenőrzi mindkét határt.

Windows CI-ben a hosszú QA alatt egy read polling timeout végleg megállította
a kliens frissülését, miközben a szerver már elkészült. Egyszerre egy állapot-GET
engedett; átmeneti olvasási hibánál a szerkesztés blokkolt marad a következő
sikeres, aktuális visszaolvasásig. A timeout nem lett megemelve. Bizonytalan
írás továbbra külön, tartósan blokkolt állapot: nincs automatikus POST-ismétlés
vagy csendes feloldás, kifejezett visszaolvasás szükséges. A regresszió valóban
végrehajtott Draft-írás elveszett válaszával is igazolja ezt.
