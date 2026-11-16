# ADR-0005 — M3 helyi Website View és izolált Preview Interface

- Dátum: 2026-11-14 (Europe/Budapest)
- Állapot: M3 implementációs döntés
- Alap: `81a47e0`, az elfogadott M2 merge-je; Blueprint §5.4, §7, §9 és M3 megbízás

## Döntés

A `@wdf/ui-lab` fejlesztői csomag `wdf-ui-lab` CLI-je az aktuális munkakönyvtár
`wdf/project.json` Contractját az M1 `loadProject` API-jával olvassa. Nem importál
Task Manager-modult. Az adapter a projekt saját Vite-konfigurációját, eredeti
`index.html` belépését és változatlan alkalmazáskomponenseit használja.
A Registryt a Contract erőforrásként feloldja; M3 nem renderel Studio-felületet.

Két külön originű, loopback HTTP-szerver fut: Lab `127.0.0.1:5175`, preview a
Manifest `preview.origin` mezőjében deklarált, külön `127.0.0.1` porton (a példában 5176).
A Vite `strictPort` megakadályozza a csendes originváltást. Nincs felhőfüggőség,
háttérben futó központi szolgáltatás, írható HTTP API vagy QA-parancsvégrehajtás.
Mindkét szerver leáll SIGINT/SIGTERM esetén; hibás indítás felszabadítja a szervereket.

A Website View sandboxolt, valódi CSS-szélességű iframe. Nincs transform/zoom,
DOM-kiválasztó vagy alkalmazásmásolat. Az alkalmazás saját dokumentuma görget,
a Lab vászna a fizikai asztalnál nagyobb iframe-et görgeti. A 900 px-es previewmagasság
és az 5 szélesség explicit; a panel összecsukható. A kisebb desktopon a vászon
görgetése szándékos, a kezelőszervek a dokumentumban elérhetők maradnak.

## Kommunikáció és bizalmi határ

`postMessage`, pontos `targetOrigin`, kötelező `event.source` + `event.origin`,
projektazonosító és indításonként kriptográfiailag véletlen, 256 bites session.
Mindkét irány strict, verziózott Zod-sémát használ. A session a két helyi fejlesztői
runtime bootstrapadata; nem URL-paraméter, nem hitelesítési titok egy távoli szolgáltatáshoz.

Zárt parancskészlet: connect, ping, apply. Az apply meglévő globális **értékhelyek**
snapshotját küldi, monotón revízióval. Metaadat, scope, új token/breakpoint,
Foundation- és komponensérték, CSS vagy JS nem küldhető végrehajtandó parancsként.
A preview az indításkori Contract/tokenazonosságokból, az M1 `updateTokensInScope`
API-jával újraellenőrzi a változtatásokat, majd szigorúan validálva generál CSS-t.
Elutasításkor az addigi stíluslap és revízió megmarad. Régi revízió nem írhat felül újabbat.

A válaszok kész/frissített/hiba/heartbeat állapotot és a dokumentum tényleges
RGB(A) vászonháttérszínét közlik. Ez utóbbi az iframe saját háttérfestését igazítja
a projekthez: a Chromium lefoglalt scrollbar-gutter területe különben a beágyazó
elem fehér színét mutatná. Nem új token vagy alkalmazásbeli CSS-felülírás.
A preview pixelrácshoz igazított helyen áll, ezért a félpixeles középre rendezés
nem ad hozzá screenshot-szegélyt. R01 nem maszkolja ki a guttert.

A helyi HTTP-réteg pontos Hostot/origint és csak GET/HEAD módszert fogad;
CORS nincs megnyitva. CSP frame-ancestors csak a Labnak enged beágyazást;
a Lab saját maga nem ágyazható be. A sandbox tiltja a top-navigationt és popupokat.
Az allow-scripts/allow-same-origin a projekt saját futásához, allow-forms/allow-modals
a natív formokhoz és az alkalmazás beforeunload védelméhez szükséges. A két origin
különbözik, ezért az alkalmazás nem fér hozzá a Lab DOM-jához vagy konfigurációjához.

A projekt és annak Vite-konfigurációja megbízható helyi fejlesztői kód. Ez nem
tetszőleges, ellenséges React/Vite-pluginok futtatási sandboxa. A Vite fejlesztői
forráskiszolgálása a loopbacken elérhető; a Lab nem production hosting vagy távoli
többfelhasználós jogosultsági rendszer. A protokollon nem futtatható tetszőleges kód.

## Tokenek és állapot

A böngészős CSS-emitter az M1 generátorból kiemelt közös, tiszta függvény.
A Node SHA-256/TS-generálása továbbra ugyanazt a kimenetet adja; a byte-pontos
M1 driftkapu megmarad. Nincs második tokenmotor, palettatábla vagy szerkesztőkonfiguráció.
A mezők a Contract típusos globális tokenjeiből származnak; a kategória csak megjelenítési
csoportosítás az ID és típus alapján. Új projektnél a semleges dimenziók Layoutba kerülnek.

A javító API az érvénytelen meglévő értékek mellett is használható, amennyiben az
azonossági metaadatok épek. A jelölt és a teljes validáció eredménye külön marad.
Hibás új literál helyben javítható mezőhibát ad; a jelöltbe sem kerül. Elfogadott,
de még hibás gráf tovább javítható; abból nincs új CSS. A preview ilyenkor az utolsó
érvényes megjelenést jelzi. Hibás kezdeti konfigurációnál az eredeti app-stíluslap
látszik, külön diagnosztikával, nem sikeres élő tokengenerálásként.

A Lab kizárólag memóriában tartja az aktuális jelöltet. A sikeres frissítés egy
generált style-elemet cserél, az alkalmazás React-gyökerének és állapotának megtartásával.
Szélességváltás és újracsatlakozás sem cseréli az iframe-et. Az explicit újratöltés
visszaállítja az alkalmazás adatait, de ugyanazon Labban újraküldi a tokenjelöltet;
előtte inline megerősítés látszik. A Lab újratöltése/bezárása elveszíti a változtatásokat,
ezt a felület és dirty állapotnál a beforeunload védelem közli.

Ez nem Initial Reference, Baseline, mentett Working Draft vagy részleges Change Manager.
A tiszta globális edit és snapshot API később M5 tulajdonoshoz köthető, de M3 semmit
nem perzisztál. M4–M6 nem része a döntésnek.

## Alternatívák és következmények

A közös dokumentumbeli React-renderelés összekeverné a CSS-t és nem adna önálló
media-query viewportot. A vizuális skálázás nem reszponzív teszt. Azonos originű iframe
gyengébb izolációt adna. WebSocket/írható helyi API szükségtelen az ablakok közti
designadat-frissítéshez; a Vite saját HMR-je megmarad fejlesztői szolgáltatásnak. A standalone és a preview
külön optimizer-cache-t használ: eltérő plugingráfjuk így nem érvényteleníti egymás
React moduljait. A runtime-hiba kapcsolódás előtt is megmarad, nem minősül késznek;
forrásjavítás után explicit preview-reload oldja fel.

A heartbeat 1 másodpercenként fut, 6,5 másodperc válaszhiány megszakadást jelez;
kapcsolódás és apply-visszaigazolás 8 másodperc után hibát ad. Nincs örök spinner,
elnyelt update-hiba vagy automatikus állapotvesztő reload. Háttérlap időzítőlassítása
átmeneti megszakadást jelezhet, a következő heartbeat vagy kézi reconnect helyreállít.

Az R01 ugyanazon Chromium/font/adat/állapot mellett 25 screenshotpárt és teljes
DOM-geometriát hasonlít. Geometriai tolerancia nulla. Képenként legfeljebb nyolc pixel és csatornánként
legfeljebb 1/255 eltérés engedett: a Chromium a beágyazott backdrop viewportnál
levágott és ívelt élein ilyen kerekítést mutat. Nincs dinamikus tartalom vagy maszk, és
semmilyen látható tartalmi/geometriai eltérés nem elfogadott. A pontos módszer az M3 útmutatóban.

## M3 szakmai review — induló viewport javítása

A rögzített 768 px-es induló érték helyett a Lab layout utáni mérésből választja
ki a legnagyobb elférő támogatott szélességet. A `useViewport` a canvas clientWidth
értékéből levonja a számított vízszintes paddinget; a clientWidth a lefoglalt guttert
már nem tartalmazza. A döntés az első megjelenítés előtt, useLayoutEffectben történik.

A további ResizeObserver-mérések csak a minimumnál kisebb belső tér jelzését frissítik.
Nem írják át a kiválasztott szélességet, nem cserélik vagy méretezik át automatikusan
az iframe-et. Ha egyetlen támogatott méret sem fér a belső térbe, a legkisebb valódi
viewport marad, látható magyarázattal és a fizikailag kilógó tartalom görgethetőségével.
Ez a felhasználó célzott UX-javítása, nem új workspace vagy M4-funkció.
