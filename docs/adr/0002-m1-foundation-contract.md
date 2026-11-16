# ADR-0002 — M1 Foundation, Project Contract és tokengenerálás

- Dátum: 2026-11-14
- Állapot: az M1-ben alkalmazott döntés
- Kiindulópont: `66b716b` (M0, a #1 PR merge commitja)
- Forrás: Blueprint §4–5, M1; a felhasználó M1 végrehajtási szerződése.

A szerkesztési primitív javíthatóságát az [ADR-0003](0003-m1-repair-editing.md) pontosítja.

## Döntés és indok

A Foundation függőségmentes TypeScript-modul: fagyasztott referenciaértékek és
stabil azonosítójú szabálykatalógus. A Core közvetlenül ezt használja. Sem a
Manifest, sem a tokenforrás nem írhatja át a Foundationt.

A Core **Zod 4.6.7** strict sémákat használ: egyetlen sémából származik a futásidejű
strukturális validáció, a TypeScript-bemenettípus és az exportált JSON Schema.
Kézzel párhuzamosan fenntartott JSON-/TS-séma helyett ez csökkenti az eltérések esélyét.
A Foundationnek nem kell sémakönyvtár. Zod helyett kézi ellenőrzés vagy AJV + külön
TS-típusgenerálás nagyobb belső karbantartási terhet jelentene ehhez a szerződéshez.

Contract- és tokenformátum-verzió: `1.0.0`. Az adapter `react-vite / 1.0.0` értéke
**szerződésprotokoll-verzió**, nem a privát workspace npm-verziója és nem egy kész
Registry-/Preview-adapter ígérete. A támogatott verzió egyezése pontos; nincs
implicit minor/frissítési migráció. Új verzió külön kompatibilitási döntést igényel.

A Manifest strukturális ellenőrzése, kompatibilitása, JSON-erőforrásainak feloldása,
a tokenek szemantikus validációja és a későbbi működési QA külön lépés.
A JSON-betöltő nem importál projektmodult, nem futtat QA-parancsot. Valós útvonalat
ellenőriz; a projekten kívülre mutató szimbolikus linket is elutasítja.

A Registry és Preview típusos, diszkriminált elérhetőségi szerződést kap.
A `deferred` belépési pont szándéknyilatkozat, erőforrás-státusza `NOT_RUN`;
nincs üres Registry, no-op preview vagy sikeres működési tesztnek álcázott stub.
A `configured` pontot a feloldó fájlként ellenőrzi, végrehajthatóságát nem minősíti.

A projekt egyetlen designforrása `wdf/tokens.json`. A tokenek stabil, réteget
jelölő ID-kat és explicit global/family/variant scope-ot kapnak. A referenciák
azonos típusú, azonos vagy alacsonyabb rétegű, engedélyezett scope-ú tokenre
mutathatnak. DFS ciklusfelismerés; nincs implicit típuskonverzió.
A változat szerkesztése tiszta, másolt konfiguráción végzett scope-ellenőrzött
értékcsere. Ez M1 primitív, nem Draft, Undo vagy Change Manager.

A reszponzív eltérések kizárólag a névvel és `minWidth` értékkel deklarált mapben
élhetnek. A feldolgozás növekvő szélességű és kumulatív; minden lépésben újrafeloldjuk
a teljes gráfot. Így a primitív módosítása a szemantikus és komponensfüggőkben is
helyesen jelenik meg. Azonos szélességű deklarációk nem megengedettek.
Az alapérték minden viewporton él, amíg explicit szabály nem írja felül.

A generátor szándékosan konkrét, feloldott CSS-értékeket bocsát ki, stabil ID-sorrendben.
A rem-értékek referenciaalapja 16 px. Nem kényszerítünk pixelben rögzített gyökérfontot
az alkalmazásra; a felhasználó betűméret-preferenciája továbbra is érvényesülhet.
A típusos TS-map és CSS közös forráslenyomatot kap. Az ellenőrző kapu byte-pontosan
újragenerálva hasonlítja össze őket és a strukturális sémákat; nem javít csendben.

CSS-név: `--wdf-` + a token ID, pontok helyett `--`. A ponton belüli dupla kötőjel
foglalt, generáláskor hiba. Ütközéskor nincs automatikus sorszámozás vagy felülírás.
M1-ben a színek CSS hex literálok, a tipográfia literál családnévlista, méret és
súly: nincs nyers CSS-, `var()`- vagy `calc()`-menekülőút a típusos referenciák mellett.
Ez formátumszabály, nem márkapaletta vagy vizuális stíluskorlát.

## Kivétel és minőségi határ

A deklarált kivétel indokot, konkrét célokat, bizonyítékot és kérelmezőt tartalmaz;
az opcionális külső jóváhagyási rekord sem futtatható felmentés. MUST-szabályra
nem kérhető kivétel. M1 egyetlen kivételt sem engedélyez és spacingellenőrzést
nem kapcsol ki. A későbbi engedélyezési mechanizmus külön döntés.

A tokenvalidáció nem bizonyít HTML-szemantikát, kontrasztot, billentyűzetes működést,
fontbetöltést vagy teljes WCAG-megfelelést. Ezekhez a katalógus browser/manual
módszert és elvárt bizonyítékot rögzít; a QA evidence típus nem végrehajtó motor.

A bootstrap React-szerkezete és működése változatlan. A CSS csak generált változókat
fogyaszt. Nincs UI Lab, Registry-renderelés, Task Manager üzleti funkció vagy M2–M6
megvalósítás. Külső publikálható csomagépítés és végső C10 igazolás továbbra is M6.
