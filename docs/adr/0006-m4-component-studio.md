# ADR-0006 — M4 Component Studio és közös designmunkamenet

- Dátum: 2026-11-14 (Europe/Budapest)
- Kiindulópont: `22358f0`, az elfogadott M3 #4 merge-je.
- Forrás: M4 felhasználói megbízás; Blueprint §5.2–5.4, §7, M4; Test Plan T06/T07, C04/C05, R01–R03/R09.
- Állapot: M4-ben alkalmazott döntés, szakmai felülvizsgálatra.

## Döntés

A meglévő Lab második munkaterületet kap. Az App egyetlen `EditableTokenConfig`
jelöltet tart memóriában; mindkét workspace ebből szerkeszt és ebből kap snapshotot.
Munkaterületváltáskor a meglátogatott nézetek mounted állapotban maradnak, `hidden`
kizárással. A Website View alkalmazásadatai, navigációja és nem mentett formja
megmaradnak. Nincs M5-tároló, mentés, referencia, jóváhagyás vagy Undo/Redo.

A galéria a Manifest Registry-erőforrásából, a meglévő `resolveRegistry` eredményéből
készül. A Lab kizárólag serializálható katalógust kap. Implementáció, schema, callback
és fixture-props a projekt adapterében marad. A technikai komponenseket nem keressük
DOM-ban vagy fájlnevek alapján. A teljes, kis Registry csoportosított listaként látszik.

Az adapter ugyanazon preview-originen külön `/__wdf/studio` dokumentumot szolgál ki.
Ez a Registry eredeti React-referenciáit rendereli; a Website eredeti index/main belépése
változatlan. A projekt preview-deklarációjának opcionális `studioStyles` listája adja
az izolált komponensek valódi CSS-ét. A Studio saját CSS-e csak a specimen elrendezése.
Az öt iframe-szélesség tényleges CSS viewport; nincs transform vagy zoom.

## Registry és fixture-határok

Az M2 alapértelmezett karanténszerződése megmarad. A Studio opt-in
`{ fixtureIsolation: true, repair: true }` feloldást használ. A hibás props konkrét
fixture-diagnosztika marad; az egészséges fixture-ök elérhetők. Strukturális, duplikált
ID- vagy tokentulajdonosi hiba továbbra is karanténozza a kétértelmű bejegyzést.
A repair mód a Core meglévő javító kapujával ellenőrzi az identitást; hibás érték
nem tünteti el a galériát. Ez nem enyhíti a CSS-generálás szigorú feltételeit.

A `renderFixture(id, true)` opcionális, props-típusos `fixtureOwner` állapottulajdonost
használhat. Ez az eredeti komponenst rendereli, kizárólag eseményállapotot kezel.
Nincs komponensmásolat vagy props-szerkesztő. Fixtureváltás/visszaállítás új,
reprodukálható dokumentumot ad; viewport- és tokenváltás nem remountol.
Az alap `renderFixture(id)` változatlanul az eredeti elemreferenciát adja.

A keyed `FixtureBoundary` a renderkivételt lokalizálja. A schemahibák teljes
component/fixture/props útvonalat kapnak. Eseménykezelő- és async kivétel továbbra
runtime-hiba; a Boundary szerződését nem állítjuk általános hibasandboxnak.

## Preview Interface 1.1.0

A wire-verzió `1.1.0`; a Manifest, tokenformátum és preview deklarációs adapter
verziója `1.0.0` marad. A wire-verzió nem implicit kompatibilitási tartomány.
Régi `1.0.0` üzenet elutasított; a régi globális `apply` parancs jogosultsága
az új boríték alatt is kizárólag global. Az új `apply-design` értéksnapshot
`{ id, scope, value, responsive? }` rekordokat visz. Ez a legkisebb külön bővítés,
amely nem tágítja ki a globális edit meglévő jelentését.

A receiver a saját Contractja és ellenőrzött Registry-tokenengedélylistája alapján
minden értéket a meglévő `updateTokensInScope` primitívvel ellenőriz. A küldött scope
állítás, nem jogosultság. A Foundation, ismeretlen/unregistered ID, idegen család,
másik variáns és új responsive hely tiltott. Egy snapshotban minden értékhely egyedi.
A receiver az utolsó alkalmazott konfiguráción dolgozik, így részleges vagy legacy globális edit sem nullázhat le más scope-ot. A Lab továbbra teljes snapshotot küld. Bármely hiba az egész snapshotot elutasítja; CSS és alkalmazott revízió csak teljes
szigorú generálás után cserélődik. Nincs JS-, CSS-, forrás- vagy importparancs.

A pontos origin/source/project/session ellenőrzés és a monotón revízió marad.
A két frame külön kapcsolati életciklust és ACK-számlálót használ ugyanahhoz a
jelölthöz. Reconnect a receiver revíziója fölötti teljes snapshotot ismétli meg.
A háttérben levő workspace kapcsolati hibája a látható munkaterületen is jelzést
és célzott reconnect műveletet kap. Nincs csendes siker ACK nélkül.

## Következmények és alternatívák

A közös Lab-DOM-ban való renderelés összekeverné a két CSS-rendszert, és nem adna
valódi media-query viewportot. A Labba serializált React-props elveszítené a callbacket,
ReactNode-ot és schema-szerződést. Ezért a Lab csak metaadatot kezel, a projekt adaptere
renderel. A második memóriabeli designkonfiguráció egymást felülíró állapotot okozna;
a meglévő App-jelölt megtartása ezt elkerüli. Nincs új tokenmotor vagy Registry.

A Registry-modul importhibája teljes galériadiagnosztika; egy import közben összeomló
modulon belüli bejegyzések nem különíthetők el biztonságosan. A Website View használható
marad. A projektszintű kód megbízható helyi fejlesztői bemenet, nem ellenséges plugin.
A hiteles `tokens.json`, `project.json`, generált tokenek és alkalmazáskomponensek
változatlanok. A Registry dev-only owner deklarációi és a preview CSS-listája bővül.

## Reprodukálható vizuális QA

A M3/M4 pixel-összevetések azonos `--disable-gpu` Chromium-raszterezést használnak
mindkét felülethez. Az egész pixeles iframe-elhelyezés mellett a GPU-kompozitálás
320 px-en egy Plus SVG pixelben 5/255 eltérést adott; szoftveres raszterezéssel a
25 R01 pár változatlan 8 pixel / 1 csatornaegység határral átment. Az alkalmazás
CSS-ét és SVG-jét nem módosítjuk a teszt kedvéért. A tesztalgoritmus, geometria,
maszkmentesség és eredeti tolerancia marad; a futtató rendererét tesszük reprodukálhatóvá.
A valódi megosztott Chromium UI-ellenőrzése ettől külön bizonyíték.
