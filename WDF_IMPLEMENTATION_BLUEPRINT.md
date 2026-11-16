# WDF — Implementation Blueprint

**Státusz:** Implementációs specifikáció  
**Dátum:** 2026-11-14  
**Célplatform v1:** React + TypeScript + Vite  
**Referenciaprojekt:** Task Manager  
**Irányadó alap:** A közösen elfogadott új WDF-koncepció

## 1. Alapvető végrehajtási utasítás

A Web Development Foundation (WDF) új rendszerét a jelen specifikáció alapján kell megvalósítani.

A korábbi WDF és UI Lab verziók nem képeznek architekturális, funkcionális vagy kompatibilitási követelményt.

Korábbi megoldás kizárólag akkor használható újra, ha:

- Pontosan megfelel az új specifikációnak.
- Az új architektúrába tisztán integrálható.
- Az új tesztek igazolják a működését.
- Nem hoz magával elvetett korábbi működési modellt.

A fejlesztésnek nem kell megőriznie a korábbi UI Lab adatmodelljét, kezelőfelületét vagy fájlstruktúráját.

## 2. A WDF rendeltetése

A WDF olyan újrahasznosítható, AI-asszisztált webfejlesztési rendszer, amely két egyenrangú célt szolgál.

**Szakmai alapminőség:** A projektek automatikusan követik a meghatározott, ellenőrizhető minőségi szabályokat. Az alapvető spacing-, igazítási, tipográfiai, reszponzív, szemantikai és akadálymentességi hibákat a fejlesztési folyamat felismeri.

**Kreatív szabadság:** A WDF nem kényszerít egységes arculatot, komponenskönyvtárat, dashboard-elrendezést vagy sablonos vizuális megoldásokat a projektekre.

A felhasználó elsősorban termék-, UX- és kreatív döntéseket hoz. A technikai következetesség és az objektív minőségellenőrzés a fejlesztési rendszer feladata.

## 3. A rendszer logikai architektúrája

### 3.1 WDF Foundation

Technológiafüggetlen szakmai szabályrendszer.

Felelőssége:

- Design- és geometriai invariánsok.
- Akadálymentességi minimumkövetelmények.
- Tokenhasználati és szemantikai szabályok.
- Kötelező minőségellenőrzési feltételek.
- Dokumentált és jóváhagyott kivételkezelés.

### 3.2 WDF Core

Az automatikusan érvényesíthető szerződések végrehajtó rétege.

Felelőssége:

- Project Contract-sémák és verzióellenőrzés.
- Design tokenek validálása és feloldása.
- Tokenek közötti függőségek kezelése.
- Konfigurációk és változtatások ellenőrzése.
- QA-szabályok és eredményadatok közös interfészei.

### 3.3 Technology Adapter

A technológiaspecifikus integrációs réteg.

A v1 kizárólag React + TypeScript + Vite támogatást igényel.

Az adapter felel a projekt előnézetének indításáért, a valódi komponensek regisztrációjáért és rendereléséért, valamint a generált design tokenek alkalmazásáért.

### 3.4 UI Lab

Külön fejlesztői eszköz, amely az aktuális projekt valódi implementációját használja.

Két elsődleges munkaterülete:

- Website View.
- Component Studio.

Közös, becsukható Review panelje:

- Audit.
- Changes.

A UI Lab nem általános célú React-kódszerkesztő. Kizárólag strukturált, deklarált designparamétereket szerkeszt.

### 3.5 QA Engine

A szabályellenőrzések és böngészős tesztek végrehajtó rendszere.

Megkülönbözteti a determinisztikus ellenőrzéseket, a vizuális regressziós teszteket és a szakmai vagy emberi review-t.

Az opcionális AI Design Review nem kötelező érvényű, nem helyettesíti a Foundation Auditot, és nem módosíthatja automatikusan a projektet.

## 4. Kötelező Foundation-szabályok

### 4.1 Követelménytípusok

**STANDARD / MUST:** Alkalmazandó jogi, biztonsági, szemantikai és akadálymentességi követelmények. Projektengedéllyel sem kerülhetők meg.

**WDF LOCKED:** A WDF által meghatározott szakmai invariánsok. Indokolt eltérés csak pontosan körülhatárolt, dokumentált és kifejezetten jóváhagyott kivétellel lehetséges.

**PROJECT CREATIVE:** A projekt arculata, vizuális karaktere, tipográfiai kifejezése, kompozíciója, grafikai világa és egyedi interakciói. Szabadon alakíthatók a kötelező követelményeken belül.

### 4.2 Spacing

Kötelező referencia-skála: **0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80 CSS px**, 16 px gyökérbetűméretnél. Az implementáció megfelelő rem tokeneket használ.

A térközök szemantikus szerepekkel rendelkeznek.

Tartalmat hordozó kártyánál a standard belső padding presetek:

- Compact: 16 px.
- Comfortable: 24 px.
- Spacious: 32 px.

Nem megengedett, hogy a Spacious preset mobilnézetben automatikusan kisebb paddinget alkalmazzon külön deklarált reszponzív szabály nélkül.

A reszponzív tokenek alapértelmezetten azonosak minden viewporton. Eltérés kizárólag explicit és ellenőrzött konfigurációval engedhető meg.

### 4.3 Tipográfia és ikonok

Kötelező szerepalapú tipográfiai hierarchia, ténylegesen elkülönülő fontméretek és súlyok, megbízható betűbetöltés és szükség esetén magyar karakterkészlet.

A felhasználónak kínált tipográfiai opciók tényleges renderelt különbségét ellenőrizni kell.

Felületi ikonokhoz ellenőrzött, következetes ikonkészlet használható; ajánlott alapértelmezés a Lucide. Egyedi márkaikonok és illusztrációk megengedettek. Technikai UI-ikonok esetleges Unicode-karakterekkel történő helyettesítése nem elfogadható.

### 4.4 Akadálymentesség és használhatóság

A releváns WCAG 2.2 AA követelmények teljesítése kötelező.

Szemantikus HTML, hozzáférhető vezérlőnevek, billentyűzetes működés, fókuszállapotok, megfelelő kontraszt és érthető hibaállapotok szükségesek.

A WDF 44 px-es alapértelmezett vezérlőmagassága saját használhatósági cél, nem azonos a WCAG célméretre vonatkozó minimumkövetelményével.

Támogatni kell a csökkentett animációs beállításokat és a szükséges reflow-viselkedést.

### 4.5 Böngészős geometria

A puszta CSS-token jelenléte nem bizonyítja a megfelelő megjelenést.

Ahol automatizálható, valódi renderelt méreteket kell vizsgálni: padding, tartalmi inset, ikon–szöveg igazítás, túlcsordulás, átfedés, fókuszláthatóság és reszponzív viselkedés.

## 5. Kötelező Project Contract

A projekt öt interfészt biztosít.

### 5.1 Project Manifest

A projekt rendelkezzen verziózott, géppel ellenőrizhető konfigurációval.

Minimális mezők:

- Contract schema version.
- Projektazonosító és projektmegnevezés.
- Technológiai adapter azonosítója és kompatibilis verziója.
- Design token konfiguráció belépési pontja.
- Component Registry belépési pontja.
- Preview konfiguráció.
- QA-végrehajtási kapcsolódási pontok.

A hiányzó vagy inkompatibilis Contract megakadályozza a szerkesztést. A Foundation Audit hibája önmagában nem akadályozhatja a Lab megnyitását.

### 5.2 Design Token Interface

Négyszintű architektúra:

1. Foundation: zárolt szabályok és alapértékek.
2. Project Primitives: projektspecifikus alapértékek.
3. Semantic Tokens: szerephez rendelt értékek.
4. Component Tokens: komponenscsaládok és variánsok megjelenési paraméterei.

A projektnek egyetlen hiteles, strukturált designkonfigurációja legyen. A CSS custom property-k és a TypeScript-típusok ebből származzanak.

A tokenek közvetlen értéket vagy típushelyes tokenhivatkozást tartalmazhatnak.

Kötelező validáció:

- Típushelyesség.
- Ismeretlen hivatkozások felismerése.
- Körkörös függőségek felismerése.
- Foundation-szabályok ellenőrzése.
- Szerkesztési hatókörök ellenőrzése.
- Deklarált reszponzív eltérések ellenőrzése.

A globális token módosítása nem lehet mellékhatása egy komponensvariáns szerkesztésének.

A kategóriapreset az érintett szerkeszthető tokeneket teljesen lecseréli. A művelet egyetlen Undo-lépésben visszavonható. Más kategóriákat nem érint.

### 5.3 Component Registry

Kizárólag tudatosan regisztrált, vizuálisan releváns React-komponensek kerülnek a Component Studióba.

Támogatott típusok:

- Primitive: például Button, Input, Checkbox.
- Composite: például TaskCard, SummaryPanel.

A technikai segédkomponensek nem kerülnek automatikusan a galériába.

Minimális regisztrációs adatok:

- Stabil komponensazonosító.
- Megjelenítési név és kategória.
- A tényleges React-implementáció referenciája.
- Variánsok.
- Reprodukálható preview fixture-ök.
- Szerkeszthető család- és variánstokenek.

A fixture-ök props-típusának összhangban kell állnia a komponens implementációjával.

A Studio a valódi React-komponenst rendereli, nem annak különálló utánzatát.

Szerkesztési hatókörök:

- Komponenscsalád.
- Komponensvariáns.

Egyedi komponenspéldány-szerkesztés és DOM-kattintásos kiválasztás nincs a v1-ben.

A hibás komponensregisztrációt lokalizáltan kell jelezni. Egyetlen komponens hibája nem teheti használhatatlanná a teljes Labot.

### 5.4 Preview Interface

A Website View a teljes, működő alkalmazást jeleníti meg.

A Component Studio ugyanazon projekt valódi, regisztrált komponenseit jeleníti meg kontrollált fixture-ökkel.

A Lab és az alkalmazás előnézete elkülönített környezetben működik, típusosan meghatározott kommunikációs protokollal.

Az előnézeti protokoll nem biztosíthat tetszőleges JavaScript-végrehajtási lehetőséget.

Kötelező ellenőrzési szélességek: **320, 390, 768, 1024 és 1440 CSS px**. Ezek tesztméretek, nem kötelező layout-töréspontok.

A/B összehasonlítás:

- A: Initial Reference, később Approved Baseline.
- B: Working Draft.
- Mindkettő ugyanazt az aktuális React-forráskódot használja.
- A különbség kizárólag a designkonfigurációból származik.

Különböző React-forráskódverziók összehasonlítása nem része a v1-nek.

### 5.5 Change & Quality Interface

Három designállapot létezik:

**Initial Reference:** Az első sikeres Lab-indításkor automatikusan rögzített, nem jóváhagyott és változtathatatlan referencia.

**Approved Baseline:** A legutóbb kifejezetten elfogadott, QA-val ellenőrzött designkonfiguráció.

**Working Draft:** Az aktuális, helyben automatikusan mentett és szerkeszthető designkonfiguráció.

Egyetlen Working Draft létezik.

A saját szerkesztések közvetlenül a Working Draftot módosítják.

Az Audit megállapításai nem módosíthatják automatikusan a Draftot.

Minden javasolt Audit-javítás egyenként:

- Megtekinthető.
- Elfogadható vagy elutasítható.
- Elfogadás után visszavonható.
- Elfogadás után újraellenőrizendő.

A kötelező szabálysértés nem szűnik meg attól, hogy a javasolt javítást elutasítják.

A teljes Working Draft egyben véglegesíthető, sikeres Approval QA és kifejezett felhasználói jóváhagyás után.

A jóváhagyás nem végez automatikus Git-commitot vagy távoli feltöltést.

## 6. Audit és QA

Három vizsgálati szint:

**Live Validation:** Tokenek és közvetlenül érintett szabályok gyors ellenőrzése szerkesztés közben.

**Targeted QA:** Az érintett komponensek, variánsok, állapotok és nézetméretek célzott vizsgálata.

**Approval QA:** Kötelező teljes vizsgálat a véglegesítés előtt.

Egy Audit-megállapítás legalább az alábbi adatokat tartalmazza:

- Egyedi azonosító.
- Szabályazonosító.
- Súlyosság.
- Érintett token, komponens vagy oldal.
- Ember számára érthető leírás.
- Ellenőrzési bizonyíték.
- Opcionális javítási javaslat.

Súlyosságok: blocker, warning, suggestion.

Ellenőrzési státuszok: PASS, FAIL, ERROR, NOT_RUN, STALE.

A futtatási hiba és a nem futtatott teszt nem jelenthet sikert.

A QA-eredmény az ellenőrzött konfigurációhoz, a releváns forrásállapothoz és a tesztkörnyezethez kötött. A szerkesztések vagy külső kódmódosítások elavulttá tehetik az eredményt.

A React-kód módosítását igénylő problémát a Lab jelzi, de nem javítja automatikusan.

A véglegesítésnek konzisztensnek és visszaállíthatónak kell lennie: sikertelen művelet nem hagyhat részben frissített designállapotot.

## 7. UI Lab felhasználói felület

A v1 kizárólag két elsődleges munkaterületet tartalmaz.

### Website View

- Valódi, működő weboldal.
- Globális designparaméterek.
- Kategóriák: Colors, Typography, Spacing, Shapes, Layout.
- Kategóriánként fokozatosan feltáruló részletes szerkesztés.
- Projektfüggő, szakmailag korlátozott presetek.
- Manuálisan megadható projekt- és accent színek.
- Valódi reszponzív előnézet.
- Reference / Draft A/B váltás.

A Layout kategória csak a Project Contract által biztonságosan deklarált paramétereket módosíthatja. Nem alakíthatja át szabadon a DOM-szerkezetet.

### Component Studio

- Automatikus, Registry-alapú komponensgaléria.
- Primitive és Composite kategóriák.
- Valódi React-komponensek.
- Variáns- és állapot-előnézetek.
- Család- és variánsszintű tokenek szerkesztése.
- A Website View-val közös Working Draft.

### Review panel

Közös, becsukható panel Audit és Changes fülekkel.

Az Audit megállapításai a megfelelő szerkesztőmezőhöz vagy regisztrált komponenshez navigálhatnak.

Az opcionális AI Design Review külön kezdeményezhető, és kizárólag javaslatokat adhat.

## 8. Fejlesztési workflow

A WDF hétfázisú projektmunkafolyamata:

1. Product Discovery.
2. Functional Design.
3. UX Design.
4. Initial Implementation.
5. UI Lab Fine-tuning.
6. QA & Review.
7. Release & Learning.

A 04. fázisban már működő, WDF-kompatibilis prototípus készül.

A 05. fázisban ezt a tényleges alkalmazást finomhangoljuk.

Szükség esetén a Codex módosítja a forráskódot, majd a projekt újra megnyitható a UI Labban.

A Lab nem előzi meg a működő implementációt, és nem működik különálló, a végleges alkalmazást utánzó látványtervként.

## 9. Csomagolás és indítás

A WDF közös, verziózott fejlesztői csomagként használható.

A projektek rögzített, kompatibilis csomagverziókat alkalmaznak.

A UI Lab a projekt könyvtárából indul, a következő parancson keresztül:

`npm run ui-lab`

Az indításnak automatikusan az aktuális projekt Contractját kell betöltenie.

A WDF nem igényel központi, folyamatosan futó felhőszolgáltatást.

A UI Lab és annak helyi szolgáltatása fejlesztési függőség. Nem része a publikált webalkalmazás futtatási környezetének.

Az egyes modulok pontos npm-csomaghatárait a megvalósítás során, dokumentált architekturális döntéssel kell kialakítani.

## 10. Referenciaprojekt

A v1 kötelező referenciaprojektje egy React + TypeScript + Vite alapú Task Manager.

Funkciók:

- Feladat létrehozása.
- Feladat szerkesztése.
- Teljesítés jelölése.
- Feladatok szűrése.
- Feladatlista és részletnézet.
- Dialógusablak.
- Alapvető űrlapvalidáció.

A referenciaprojekt előre meghatározott tesztadatokat és nem perzisztens alkalmazásállapotot használ.

Nem szükséges adatbázis, felhasználói bejelentkezés, szerveroldali API vagy felhőszinkronizáció.

Kötelező komponensek: Button, TextInput, Select, Checkbox, TaskCard, Dialog, StatusBadge.

A valódi alkalmazás és a Component Studio ugyanazon komponensimplementációkat használja.

## 11. Fejlesztési mérföldkövek

### M0 — Repository és végrehajtási szerződés

Készítsd elő az új, tiszta WDF-projektet.

Rögzítsd a specifikáció érvényességét, a modulkiosztást, a függőségeket és a tesztfuttatási parancsokat.

A korábbi WDF nem kerülhet automatikusan a projekt forrásába.

**Kilépési feltétel:** Az új projekt indul, a dokumentált architektúra és a fejlesztési eszközlánc konzisztens.

### M1 — Foundation és Project Contract

Valósítsd meg a Foundation-szabályok géppel ellenőrizhető részét, a Manifestet, a tokenrendszert, a sémákat és a CSS/TypeScript-generálást.

**Kilépési feltétel:** A szerződés validálható; a hibás hivatkozások, tiltott spacingértékek és inkompatibilis verziók ellenőrzötten elutasíthatók.

### M2 — Task Manager

Készítsd el a minimális, működő referenciaprojektet, annak designrendszerével, komponensregisztrációival és reprodukálható fixture-jeivel.

**Kilépési feltétel:** Az alkalmazás önállóan fut, a szerződés érvényes, a komponensek ténylegesen renderelhetők, és az alapvető funkciók teszteltek.

### M3 — Website View

Valósítsd meg a Lab helyi indítását, a valódi alkalmazás előnézetét és a globális tokenszerkesztést.

**Kilépési feltétel:** A projekt változtatás nélkül az eredeti megjelenését mutatja, a globális tokenmódosítások élőben működnek, és nem írják át jóváhagyás nélkül a hiteles projektkonfigurációt.

### M4 — Component Studio

Valósítsd meg a regisztrált komponensek galériáját, a fixture-öket, valamint a család- és variánsszintű szerkesztést.

**Kilépési feltétel:** A szerkesztés minden megfelelő alkalmazásbeli előforduláson érvényesül, példányszintű felülírás nélkül.

### M5 — Change Manager és Audit

Valósítsd meg az Initial Reference, Approved Baseline, Working Draft, Undo/Redo, A/B, Audit, javasolt javítások és véglegesítés működését.

**Kilépési feltétel:** A javasolt javítások külön kezelhetők, a Draft túléli az újraindítást, és csak megfelelő QA után véglegesíthető.

### M6 — Integrációs QA és kiadás

Futtasd a teljes funkcionális, szerződéses, böngészős, reszponzív, regressziós és akadálymentességi tesztcsomagot.

Készítsd el a végleges fejlesztői dokumentációt és a telepíthető WDF-csomagot.

**Kilépési feltétel:** A kötelező tesztek teljesülnek, a korlátok dokumentáltak, és egy új WDF-projekt a dokumentált módon elindítható.

## 12. Nem része a v1-nek

- Általános, vizuális React- vagy DOM-szerkesztő.
- Egyedi komponenspéldány-felülírás.
- Kattintásos komponenskiválasztás a teljes weboldalon.
- Több párhuzamosan szerkeszthető designalternatíva.
- Különböző forráskódverziók A/B összehasonlítása.
- A Lab által végzett React-forráskód-átalakítás.
- Automatikus Foundation-kivétel-engedélyezés.
- Automatikus Git-commit és publikálás.
- Általános, technológiafüggetlen böngészős szerkesztő.
- Reacttól eltérő frontend adapterek.
- Többprojektes, önálló Lab-indító.
- Kötelező központi felhőszolgáltatás.

## 13. Definition of Done

Egy mérföldkő csak akkor kész, ha:

- A meghatározott funkció működik.
- A releváns automatizált tesztek ténylegesen lefutottak.
- A felhasználói felület valódi böngészőben ellenőrzött.
- A regressziós kockázatokat megvizsgálták.
- Nincs nyitott, a mérföldkövet blokkoló hiba.
- A dokumentáció megfelel a tényleges implementációnak.
- Az eredmény visszaállítható.
- A nem ellenőrzött területek és a fennmaradó korlátok nyilvánvalók.

A teszteredményekről soha nem elegendő azt állítani, hogy sikeresek. A ténylegesen végrehajtott parancsokat, eredményeket és vizsgált környezeteket dokumentálni kell.

**A WDF akkor tekinthető megfelelően megvalósítottnak, ha a Task Manager referenciaprojekten keresztül a teljes új fejlesztési és finomhangolási munkafolyamat bizonyíthatóan működik.**
