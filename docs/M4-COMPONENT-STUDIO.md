# M4 — Component Studio használata és szerkesztési modellje

## Indítás és munkaterületek

A repository rögzített Node/npm verziójával:

```sh
npm ci
npm run ui-lab
```

A Lab címe `http://127.0.0.1:5175`, az adapteré a Manifestben megadott
`http://127.0.0.1:5176`. Leállítás Ctrl+C; foglalt portnál nincs csendes portváltás.
A felső Website View / Component Studio gombok egyértelmű munkaterületváltók.
A Website View a teljes alkalmazás, a Studio a Registry ugyanazon komponensei.

Az egyszer már megnyitott munkaterület állapota megmarad váltáskor. A Website
feladatai, szűrője, részlete és szerkesztett formja nem töltődik újra. A Lab teljes
újratöltése/bezárása elveszíti a memóriabeli designmódosításokat; dirty állapotban
a meglévő beforeunload védelem figyelmeztet. Nincs automatikus mentés.

## Galéria, variáns és fixture

A galéria automatikusan a Contract Registry-belépésének deklarációiból épül.
Primitive és Composite csoport, komponensnév és fixture-szám látszik. A referenciában
hét komponens és 27 eredeti M2-fixture van. Technikai segédkomponens nem kerül be.

Komponensválasztás után a variáns, állapot és fixture külön választható. A deklarált,
de az adott variánshoz nem fixture-özött állapot letiltva marad; a Studio nem állít
elő kitalált props-kombinációkat. A Fixture választó minden deklarált, reprodukálható
kezdőállapotot felsorol. A konkrét kiválasztás a vászon feliratában is látszik.

Az Összes variáns minden deklarált variáns első fixture-jét egymás alatt mutatja.
Konkrét fixture-, variáns- vagy állapotválasztás visszalép az egyedi fixture nézetbe.
Ez vizsgálati kiválasztás, nem egyedi komponenspéldány-szerkesztés.

A kontrollált TextInput, Select, Checkbox, TaskCard és Dialog fejlesztői
állapottulajdonost kap: gépelés, kiválasztás, teljesítés és bezárás működik.
A Button aktiválásszámot jelez. Mindegyik az alkalmazás eredeti React-komponense.
A fixture váltása vagy a Fixture visszaállítása visszaadja az eredeti kezdőállapotot.
A token- és viewportváltás megtartja az aktuális interakciót.

A hover és focus valódi pointer-/billentyűzetállapot; nem CSS-utánzat vagy állapotkapcsoló.
A disabled, busy, error és hosszú tartalmú állapotok az eredeti fixture-ökből jönnek.
A Dialog modal viselkedése az iframe dokumentumát izolálja, ezért a Lab vezérlői
elérhetők maradnak. Escape és Bezárás az eredeti komponens működését követi.

## Család- és variánstokenek

A jobb oldali panel két hatóköre:

- **Component Family:** az adott család közös tokenjei; például Button radius,
  TaskCard radius és háttér. Minden megfelelő variáns és alkalmazásbeli előfordulás fogyasztja.
- **Component Variant:** kizárólag a kiválasztott variáns deklarált tokenjei;
  például Button primary háttér. A secondary/quiet és a globális accent ettől nem változik.

A mezők kizárólag az ellenőrzött Registry-tokenlisták és a Contract metszetéből jönnek.
Nincs tetszőleges CSS-mező. Az Érték/Hivatkozás választó a közös TokenField része.
A típusazonos, engedélyezett rétegű/családú/variánsú célokat a Core szabálya szűri.
Hivatkozás esetén a teljes célazonosító külön sorban is olvasható.

Az Értékek hatóköre csak a már deklarált responsive override-okat teszi elérhetővé.
Ha nincs ilyen komponens-token azon a törésponton, érthető üres állapot jelenik meg.
A felület nem hoz létre új override-ot vagy breakpointot. A Foundation LOCKED,
közvetlenül nem szerkeszthető; a referenciaskála és a 16/24/32 px kártyapresetek élnek.

Hibás új érték a mezőnél konkrét Core hibakódot és tokenútvonalat kap; nem kerül a
jelöltbe. Meglévő hibás konfiguráció fokozatosan javítható. Elfogadott javítás mellett
maradhat másik gráfhiba; azt a vászon jelzi, és az utolsó érvényes CSS marad aktív.
Részben érvénytelen konfigurációból soha nem alkalmazunk félkész CSS-t.

## Közös munkamenet és későbbi M5-integráció

A tulajdonos `App.config: EditableTokenConfig`. A két szerkesztő a meglévő
`updateTokensInScope` függvénnyel másolt jelöltet hoz létre, és ezt a közös
állapotot frissíti. A Studio Registry-tokenengedélylistát is ellenőriz.
A gyökérjelöltön kívül nincs második designkonfiguráció. A mező szövege lehet hibás
helyi beviteli állapot; ez nem második elfogadott tokenállapot.

Érvényes jelöltből mindkét preview teljes engedélyezett értéksnapshotot kap. Az
adapter újraellenőrzi a saját Contract és Registry alapján, majd a közös M1 emitterrel
generál. A CSS-csere az alkalmazás React-gyökerét és adatait nem cseréli.
A globális edit a Studióban, a komponensedit a Website View-ban is megjelenik.

Mindkét frame külön ACK-kal igazolja a tényleges alkalmazást. Timeout vagy elutasítás
megmaradó, célzott hibaüzenetet ad. A háttérben lévő workspace hibája a másikban is
látszik. Az Újracsatlakozás az aktuális jelöltet ismétli, nem dobja el az editet.
A Website explicit újratöltése csak a meglévő megerősítés után állítja vissza az appadatokat.

M5-ben az App-jelölt tulajdonlása átadható egy Change Managernek. Az adat továbbra
ugyanaz a Core `EditableTokenConfig`; a renderelő adapter nem tulajdonol mentést vagy
jóváhagyást. Az M4 nem készít Initial Reference-t, Baseline-t, perzisztens Working
Draftot, Undo/Redo-t, A/B-t, Auditot vagy véglegesítést.

## Hiba és visszaállítás

Props-hibánál component/fixture/props útvonal, renderhibánál a FixtureBoundary
komponens- és fixture-azonosítója látszik. Másik fixture vagy komponens tovább
választható. Dupla azonosító vagy hibás bejegyzés karanténba kerül; a többi galéria és
Website működik. A teljes Registry-modul importhibája diagnosztikát ad; forrásjavítás
és Lab-újraindítás szükséges. Esemény-/async kivétel runtime-hiba, nem Boundary által
elnyelt siker.

Egy sessionedit eldobásához a Lab újratöltése elég. Git-szintű visszaállítás és a teljes
ellenőrzési eredmények az [M4 átadásban](reports/M4-HANDOFF.md) szerepelnek.

## Ellenőrzés és vizuális regresszió

```sh
npm run verify:m4
# Rendszer-Chromium esetén:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m4
```

A kapu a teljes `verify:m3` regresszió után futtatja az M4 Chromium-csomagot,
és 135 valós fixture/viewport mérési rekordot követel meg. A jelentés a teljes
app-/tokenforrás előtte/utána SHA-256 lenyomatát is rögzíti. A production build továbbra
tilti a Lab, adapter, Registry és tesztharness bekerülését.

Az M3/M4 pixeltesztek mindkét összevetett felületet ugyanabban a Chromiumban,
azonos `--disable-gpu` szoftveres raszterezéssel futtatják. Ez a nested SVG
kompozitálás egyetlen pixelén mért driverkerekítést szünteti meg; nem módosít
alkalmazás-CSS-t, képet vagy toleranciát. Az R01 M3-elfogadási feltételei változatlanok: 25 standalone/Website képpár és pontos geometria,
maszkolás nélkül. Az új VR01 ugyanabban a Chromiumban a kiinduló fixture képét az
összehasonlító nézettel, majd egy tényleges edit és visszaállítás utáni képpel veti össze.
A variáns-összehasonlításnál nulla eltérő pixel szükséges. Visszaállításnál azonos
képméret és legfeljebb 64 pixel, csatornánként legfeljebb 1/255 eltérés megengedett,
kizárólag a Chromium négy 8 px-es kártyasarkán (helyzet szerint is ellenőrizve). A nyers számokat megőrizzük;
nincs skálázás, maszk vagy geometriai eltérésre adott tolerancia.
A radius 8→24 módosítás képének ténylegesen különböznie kell. A screenshotok létrejötte
önmagában nem PASS: geometriai, pixel- és vizuális review is szükséges.
