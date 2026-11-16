# Lépés — a Task Manager vizuális kontextusa

## Overview

Magyar nyelvű feladatmunkatér, egyetlen céllal: a következő teendő gyors rögzítése,
megnyitása és teljesítése. A vizuális referencia egy gondosan rendezett munkafüzet:
széles, olvasható feladatcímek, kis azonosítók, nyugodt sorritmus. A karakteres elem
az elvégzett lépéseket mutató szegmentált haladássáv. A feladatlista marad az elsődleges.
Product register; nincs marketing hero, oldalsáv, KPI-dashboard vagy admin-sablon.

Az M0/M1 technikai indítási oldalt az M2 megbízása alapján felváltja ez a valódi
alkalmazás. Ez szándékos arculatváltás, nem vizuális regresszió. Kizárólag a Task
Managerre érvényes; nem a Foundation, a Lab vagy más WDF-projektek alapértelmezése.

## Colors

Tulajdonos: `apps/task-manager/wdf/tokens.json`. A DESIGN.md prózai szándékleírás,
nem alternatív konfiguráció és nem generál designértékeket. A projektpaletta tintaszerű
sötét szöveg, halvány levendula háttér, fehér felületek és lila elsődleges akció.
A zöld kizárólag a kész állapotot és a pozitív visszajelzést jelöli; a piros az
űrlaphibát. Minden állapotnak szöveges és szükség szerint ikonos megfelelője van.
A kontrasztot a normál, üres, hosszú és hibás állapotokon axe vizsgálja.
Csak világos téma tartozik az M2-höz; forced-colors esetén a rendszer görgetősávja él.

## Typography

A display szerep helyi Trebuchet MS / system-ui fallback; a törzs system-ui,
a stabil feladatazonosítók és a kis felső felirat ui-monospace. Nincs külső
fontkérés vagy fontcsere miatti layoutugrás. Minden fallback támogatja a magyar
ékezeteket. A böngészőteszt tényleges méretet és súlyt vizsgál, nem kínálunk
nem bizonyított betűválasztót. H1: deklarált mobil/desktop token, H2 és feladatcím:
kisebb, hangsúlyos szerepek; törzsszöveg és kiegészítő szöveg elkülönül.

## Layout

Természetes magasságú, középre rendezett munkatér; a dokumentum görget.
A lista és a részletek ugyanazt a fejlécet, tipográfiát és műveleti nyelvet használják.
A flex-wrap és a kártyák közös gridje tartalomalapú tördelést ad, CSS-ben nincs
viewport szerinti paddingcsere. A lap vízszintes térközének és H1-méretének
eltérései kizárólag a tokenforrás `tablet` és `desktop` deklarációiból jönnek.

A Foundation spacing-skálája érvényes minden térközre. A TaskCard Compact,
Comfortable, Spacious variánsai a zárolt 16/24/32 px presetet fogyasztják.
A listában Comfortable, a részletnézetben Spacious él. Spacious mobilon is 32 px.
A cím teljes szélességben törik; a hosszú leírás a kártyán két sorra rövidül,
a részletekben hiánytalanul olvasható. A 44 px-es vezérlőmagasság tervezési cél.

A dialógus a viewporton belül marad, saját tartalma görgethető; megnyitásakor a
háttér inert és a dokumentum görgetése zárolt. A globális scrollbar baseline
minden új görgethető felületre opt-in osztály nélkül érvényes.

## Elevation & Depth

A lapfelületek laposak, finom tokenizált határvonallal. Nincs kártyaárnyék.
A dialógus mélységét a natív top layer és tokenizált backdrop adja.
Nincs animáció: a reduced-motion beállítás mellett és nélkül is azonnaliak az állapotok.

## Shapes

Visszafogott, közös lekerekítési család. A státuszjelzők kis címkék, nem műveleti
chipek. Az alkalmazás Lucide SVG-ikonokat használ állandó méret- és stroke-rendszerrel;
a technikai ikonokat nem helyettesítik Unicode-jelek.

## Components

A hét Registry-tag: Button, TextInput, Select, Checkbox, TaskCard, Dialog,
StatusBadge. Ugyanezeket importálja az alkalmazás. A form és az üzleti állapot az
alkalmazás felelőssége; az adapter csak regisztrációt és izolált fixture-kezelést ad.
A publikus props API: [M2-API](docs/M2-API.md); közös viselkedés: [UX-CONTRACT](UX-CONTRACT.md).

| Szerep           | Hiteles token / réteg                                                                     | Runtime fogyasztó                        |
| ---------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| Színek           | `primitive.color.*` → `semantic.color.*`                                                  | globális app CSS, hiba, focus, státusz   |
| Tipográfia       | `primitive.font/size/weight/leading.*`, `semantic.font.*`, `semantic.size.heading/detail` | body, H1, H2, meta                       |
| Térközök         | `foundation.spacing.*` → `semantic.space.*`                                               | app CSS minden margin/padding/gap értéke |
| Kártyageometria  | `foundation.card.*` → `component.task-card.<variant>.padding`                             | TaskCard és Spacious részletek           |
| Család / variáns | `component.<family>.<slot>`, `component.<family>.<variant>.<slot>`                        | közös komponensosztályok                 |
| Kontroll / ikon  | `semantic.control.height`, `primitive.geometry.*`                                         | vezérlők, ikonok, keretek                |

Az M1-generátor készíti a `src/generated/tokens.css` és `tokens.ts` fájlokat.
CSS-leképezés: `component.button.radius` → `--wdf-component--button--radius`.
A driftkapu byte-pontos; a statikus M2-kapu minden CSS tokenhivatkozást felold,
és tiltja a nyers színeket, a nem nulla literál spacinget és a WDF-változók helyi átírását.
A Registry tokenazonosítóit a generált TokenId és a futásidejű scope-vizsgálat ellenőrzi.

## Do's and Don'ts

A cím és a következő művelet legyen a fókusz. A díszítés ne előzze meg a tartalmat.
Használd a közös komponenseket; új variáns csak valódi használattal kerüljön be.
A kártyapaddinget nem szabad mobilon rejtetten összehúzni. A generált fájlokat nem
szerkesztjük kézzel, a CSS nem írja felül a tokenváltozókat.
Nincs Studio-galéria, Website View, Working Draft vagy jóváhagyási felület az M2-ben.

### M3 — önálló Lab chrome

A Task Manager fenti arculata változatlan. A külön dokumentumban futó fejlesztői
Lab saját semleges palaszürke/petrol munkapad, saját tokennévtérrel és közös
értékszerkesztővel. Ez új felület, nem a Task Manager designrendszerének módosítása.
Tulajdon és leképezés: [Lab DESIGN](packages/ui-lab/DESIGN.md),
[Lab interakciós szerződés](packages/ui-lab/UX-CONTRACT.md). A preview kizárólag a
projekt Contractját és az M1 közös CSS-emitterét használja, nem a Lab --lab-* értékeit.
