# ADR-0004 — M2 alkalmazás és típusos React Registry

- Dátum: 2026-11-14 (Europe/Budapest)
- Állapot: M2-ben alkalmazott döntés
- Kiindulópont: `c3b5728`, az elfogadott M1 merge-je
- Forrás: Blueprint §4–5, §10, M2; a felhasználó M2 megbízása

## Döntés

A meglévő React/Vite app kapja a valódi Task Manager implementációt. Az üzleti
adatmodell és a szinkron memóriaállapot az alkalmazásban marad; nincs külön
szolgáltatásréteg, routerkönyvtár, backend vagy tárolási infrastruktúra.
A hash-alapú lista/részlet navigáció önálló statikus buildben is közvetlenül nyitható.
A szűrő munkameneten belüli memóriaállapot, a létrehozás/szerkesztés közös modal form.
A specifikáció két állapota nyitott és kész; nem vezetünk be prioritást, határidőt,
törlést vagy új üzleti státuszokat.

A projekt saját lila munkafüzet-arculata lecseréli a korlátozott bootstrap felületet.
A Foundation/Core implementáció változatlan. A meglévő M1 forrásformátum és generátor
marad a designértékek tulajdonosa. A kártyák három valódi variánsa a zárolt
Foundation preseteket használja, a layout különbségei explicit token-deklarációk.

A hét közös React-komponens az app `src/components` könyvtárában él; a Registry
pontosan ezeket importálja. Az adapter privát workspace a `defineComponent`,
`resolveRegistry` és `FixtureBoundary` API-t adja. A Core továbbra sem importál Reactot.
A Registry belépési pont `configured`, a Preview M3-ig őszintén `deferred` marad.
A szerződésverzió nem változik: az M1 Manifest már tartalmazta a configured állapotot.

A `defineComponent<P>` az implementációból következteti a props-típust; a schema és
fixture `NoInfer<P>`-vel ezt követi. Nincs `any` vagy kézzel elcastolt egészséges
fixture. A futásidejű props-validáció Zod 4, ugyanaz a rögzített verzió, mint az
M1-ben; a schema fejlesztői fixture-szerződés, nem React üzleti formvalidátor.
A vegyes Registry megőrzi a tényleges implementációreferenciát, és típusosan zárt
renderfüggvénnyel készít React-elemet. M2-ben function/class implementáció támogatott;
React exotic/memo/lazy wrapperre nincs általános támogatási ígéret.

A Manifest/token hiba az egész feloldást blokkolja. A bejegyzéshiba a saját tulajdonosát
karanténozza, pontos component/fixture/prop útvonallal; a többi komponens használható.
Dupla komponensazonosítónál minden kétértelmű bejegyzés kimarad. A renderelés későbbi
hibája külön, kulcsolt React Error Boundaryben lokalizálható, az egészséges szomszéd
működőképes marad. Ez nem Studio-felület és nem M3 preview-protokoll.

## Teszthatár és következmények

A `tests/fixtures` külön Vite tesztbelépés egyetlen kiválasztott valódi fixture-höz;
nincs galéria, szerkesztő, Lab-szolgáltatás vagy production belépési pont.
A produkciós Vite-build a modullistában tiltja a tesztharness, Registry és WDF
fejlesztői csomagok bekerülését. A unit teszt betölti a tényleges Manifestet és
Registryt; a böngészőteszt valódi komponenseket, eseményeket és geometriát mér.

Az M0/M1 smoke-tesztek alkalmazáscíme és arculati elvárásai migrálódnak az M2-re,
de a build-, billentyűzet-, overflow-, ID-, axe-, generátor-, scope- és negatív
Contract-vizsgálatok megmaradnak. A fejlesztés előtti eredeti M1-kapu naplója
külön megőrzött. Az M2 új vizuális alap; nem hasonlítunk pixelre a bootstraphoz.
A CI `verify:m2` kapuja magában foglalja a teljes M1/M0 kaput és az M2 teszteket.

M3–M6 implementációt ez a döntés nem engedélyez. A külső publikálható csomagolás,
a teljes Lab integráció és a végleges C10 igazolás későbbi mérföldkő marad.
