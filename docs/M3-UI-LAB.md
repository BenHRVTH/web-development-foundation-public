# M3 — UI Lab indítás és használat

Előfeltétel: a repository rögzített Node/npm verziója és `npm ci` a gyökérben.
A projekt könyvtárában:

```sh
cd apps/task-manager
npm run ui-lab
```

A gyökérbeli `npm run ui-lab` ugyanennek a workspace-parancsnak a kényelmi delegálása.
Nyisd meg: `http://127.0.0.1:5175`. A szerver csak a helyi gépen figyel.
Leállítás: Ctrl+C. A preview külön, a Contractban deklarált 5176-os portot használja.
Foglalt portnál a parancs hibával megáll; nem vált csendben másik originre.

## Website View

A bal oldali munkatér a teljes, eredeti alkalmazás. A lista, feladatlétrehozás,
validáció, részletek, szerkesztés, teljesítés, szűrés és hash-navigáció működik benne.
A Lab nem másolja az alkalmazás komponenseit és nem használ külön tesztadatforrást.

Első megnyitáskor a Lab a preview tényleges belső szélességéből választja ki a
legnagyobb teljesen elférő támogatott viewportot. A mérés levonja a vászon paddingjét
és a ténylegesen lefoglalt görgetősávot; nem a Lab ablakának szélességét becsüli.
Ha a belső tér még 320 px-nél is kisebb, a 320 px-es valódi nézet marad aktív,
világos tájékoztatással. A fizikailag kilógó tartalom vízszintesen elérhető.
A választás csak induláskor automatikus: későbbi ablak- vagy panelátméretezés
nem írja át sem az induló, sem a kézzel kiválasztott méretet.

A felső 320 / 390 / 768 / 1024 / 1440 vezérlők az iframe valódi CSS-viewportját
változtatják. A magasság 900 CSS px; a skála 100%. A szélesebb nézetet a szürke
munkatér görgetésével lehet megvizsgálni. Az alkalmazás saját dokumentuma ettől
függetlenül görgethető. A Beállítások gomb felszabadítja a panel helyét.
Nincs mobilnak álcázott scale/zoom és nincs DOM-kattintásos komponenskiválasztás.

## Globális design

A panel öt kategóriája: Colors, Typography, Spacing, Shapes, Layout.
A szerkeszthető mezők az aktuális Contract globális tokenjeiből származnak.
Projekt-alapértékek és fokozatosan megnyitható szemantikus szerepek külön látszanak.
A mező felirata mellett az eredeti token-ID és a típus mértékegysége is elérhető.

- Szín: színválasztó és szabad hex mező, alfaértékkel is. Nincs kötelező palettapreset.
- Tipográfia: szabad fontcsaládlista és fallback, méret, súly, sorköz. Nincs külső
  fontletöltő; a megadott fontnak helyben rendelkezésre kell állnia, különben a fallback él.
- Spacing: a Foundation referencia-skálája szerinti érték vagy típusos hivatkozás.
  A zárolt skála és 16/24/32 px kártyapresetek a LOCKED részben olvashatók.
- Shapes és Layout: kizárólag a Contractban ténylegesen globálisnak deklarált értékek.
  A DOM, komponensprops vagy alkalmazáslogika nem szerkeszthető.

Az Érték/Hivatkozás natív választóval válthatsz. A Hivatkozás ugyanazon típusú
globális/Foundation célokat kínál; a végleges réteg-/scope-engedélyt mindig az M1
engine ellenőrzi. A natív választók és színválasztó OS-megjelenése tudatosan platformfüggő.

Az Értékek hatóköre alapból minden viewport. Töréspont kiválasztásakor csak az ott
már deklarált globális override értékei látszanak; a küszöböt, célokat és scope-ot
nem lehet hozzáadni vagy átírni. A kategória üres állapota ezt világosan jelzi.

A sikeres értékváltoztatás élőben frissíti a szemantikus és komponensfüggőket,
a React-állapot és a navigáció megtartásával. Hibás új érték mezőhöz kötött diagnosztikát
kap, és nem kerül az elfogadott jelöltbe. Meglévő hibás értékek lépésenként javíthatók:
a teljes jelölt hibái külön listában maradnak, és érvénytelen konfigurációból nincs új CSS.
A Lab ekkor az utolsó érvényes megjelenést közli; ez nem sikeres validáció.

## Memória és hibák

Az M3 tokenbeállításai kizárólag a Lab böngészőlapjának memóriájában élnek.
A Lab újratöltése vagy bezárása elveszíti őket; változtatáskor a beforeunload
védelem figyelmeztet. Nincs automatikus mentés, tokenforrás-átírás vagy Git-művelet.

Az Újracsatlakozás megismétli a handshake-et és az aktuális érvényes jelöltet küldi,
az alkalmazás állapotának megtartásával. Az Előnézet újratöltése külön inline
megerősítés után az alkalmazás kezdőadatait állítja vissza; ugyanazon Labban a
tokenbeállítások megmaradnak. A Lab teljes újratöltése ezeket is eldobja.

Betöltési/handshake-hiba 8 másodperc, heartbeat-kimaradás 6,5 másodperc, hiányzó
update-visszaigazolás 8 másodperc után kap látható üzenetet és helyreállítási lehetőséget.
Runtime-hibánál a konzol pontosít, a forrásjavítás fejlesztői feladat. A korai
alkalmazásindítási hiba sem válhat kész állapottá; javítás után explicit preview-reload szükséges.
Hibás/inkompatibilis Contractnál az indító pontos diagnosztikával nem indul el.
Hibás tokenérték önmagában nem akadályozza a javításra megnyitást; hibás metaadat igen.

## Új WDF-projekt kapcsolása

Az M1-kompatibilis, `react-vite / 1.0.0` projektbe fejlesztői függőségként kerül a
`@wdf/ui-lab` és `@wdf/adapter-react`. A privát workspace még nem M6 npm-kiadás.
Az npm-script `"ui-lab": "wdf-ui-lab"`. A Manifest configured Preview pontja:

```json
{
  "availability": "configured",
  "entryPoint": "wdf/preview.ts",
  "origin": "http://127.0.0.1:5176",
  "widths": [320, 390, 768, 1024, 1440]
}
```

A deklarációs modul:

```ts
import { previewDefinition } from '@wdf/adapter-react/preview';
export default previewDefinition;
```

Az adapter kizárólag a külön preview-szerverhez injektálja a bridge-et, a projekt
`src/main.tsx` fájljába semmit nem kell importálni. A szokásos `npm run dev/build`
és a production alkalmazás nem használ Lab-runtime-ot. A meglévő production
modulgráf-kapu ezt a referenciaalkalmazásban build közben ellenőrzi.

## Reprodukálható ellenőrzés és R01

```sh
npm ci
npx playwright install --with-deps chromium
npm run verify:m3
# Telepített rendszer-Chromium esetén:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m3
```

A kapu előbb a teljes M2/M1/M0 statikus, unit, build és 89 böngészős regressziót
futtatja; utána az M3 Chromium-teszteket és az R01 vizuális összehasonlítást.
A `test-results/m3-results.json` a parancsok tényleges exitkódját és az alkalmazás/token
források előtte/utána SHA-256 lenyomatát rögzíti. Sikertelen lépésnél a kapu nem PASS.
A GitHub Actions ugyanazt a parancsot futtatja és feltölti a jelentéseket/képeket.

Az R01 öt szélességen, normál/űrlaphiba/hosszú részlet/üres/hiányzó állapotban
25 valódi PNG-párt készít. Egy Chromium-context, hu-HU, Europe/Budapest, DPR 1,
azonos kezdőadatok és végrehajtott műveletek, 900 px magasság és `document.fonts.ready`
utáni felvétel. A standalone saját viewportképe és a Lab iframe kivágása összevetett.
A kurzor mindkettőben rejtett; nincs dinamikus tartalom, screenshotmaszk vagy képskálázás.

Mérjük a főcímeket, kártyákat, vezérlőket, dialógust, paddinget, típót, színeket,
lekerekítést, viewportot, overflow-t és ID-kat. A DOMRect/computed adatoknak pontosan
egyezniük kell. A normál kártyapadding 24, a Spacious részleté minden méreten 32 px.

A PNG-k RGBA-csatornáit a rögzített `pngjs` dekódolja. Geometriai tolerancia **0**;
képenként legfeljebb **8 eltérő pixel**, azok minden csatornáján legfeljebb **1/255**
eltérés engedett. Ennek oka a Chromium beágyazott backdropjának viewportnál levágott
lekerekített élein mért egyegységes raszterkerekítés. A nyers eltérésszámot és maximumot
minden képhez megőrizzük. Ez nem szemmel látható eltérésre adott felmentés.
Az iframe scrollbar-gutter háttérhibája javítva van, a sáv nincs kizárva a mérésből.

Képek: `docs/reports/evidence/m3`; részletes gépi adatok: `test-results/m3/`, a
verziózott átadási másolatok a `docs/reports/M3-*.json` fájlokban.

M4: Studio; M5: Reference/Baseline, perzisztens Draft, Undo/Redo, A/B, Audit és
véglegesítés; M6: kiadás. Egyik sem része az M3 felületnek.
