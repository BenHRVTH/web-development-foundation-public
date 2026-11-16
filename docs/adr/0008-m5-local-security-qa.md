# ADR-0008 — M5 helyi jogosultság és reprodukálható QA

Dátum: 2026-11-14, Europe/Budapest. Forrás: M5 §6–10; Blueprint §5.4–6.

## Jogosultsági modell

A megbízható projektkönyvtárból indított dev-only Node szolgáltatás loopbacken fut.
Az adapter és a Lab külön originű. A Preview 1.1.0 origin/source/project/session,
scope-, Registry- és monoton revízióellenőrzése változatlan. A Preview önmagában
nem kap írható HTTP-végpontot.

A Lab bővítése két zárt végpont:

- `GET /__wdf/state`: a közös állapot és friss diagnosztikák.
- `POST /__wdf/change`: strict `1.0.0` kérés, zárt műveletunió.

A pontos Host, munkamenetenként véletlen 256 bites `X-WDF-Session`, POST-nál
pontos Origin és `application/json` kötelező. Cross-site és idegen origin tiltott;
nincs nyitott CORS. A body legfeljebb 256 KiB. A body projekt-/sessionazonossága
is egyezzen. UUID és compare-and-swap revízió véd a replay, régi lap és párhuzamos
írás ellen. A sikeres UUID-k a tartós állapotban is megmaradnak (utolsó 512);
régebbi kérés változatlan régi revíziója ezután is elutasított.

A böngésző nem adhat parancsot, shellt, forráskódot, CSS-t, tetszőleges tokenmetaadatot,
Foundation-kivételt, fájlútvonalat vagy tárolási helyet. A backend újraellenőrzi a
Core-típusokat, scope-ot, Registry-engedélylistát és a már deklarált responsive helyet.
A fájlcélok szerveroldaliak; symlink és rootból kilépés tiltott. A helyi állapot
0600 fájlokat és 0700 új könyvtárat használ. A PID-lock nem hálózati autentikáció.

A bootstrap képesség a saját helyi Lab JavaScript-moduljában él, nem URL-ben,
cookie-ban, logban vagy localStorage-ban. Azonos felhasználó ellenséges helyi
folyamata vagy megbízhatatlan Vite-plugin nem része ennek a v1 fenyegetési modellnek.
A filesystemnek támogatnia kell az atomi rename és fájl-fsync műveleteket; hálózati
fájlrendszer és többgépes lock nem támogatott. A könyvtár-fsync és a Windows
tartóssági/ACL-korlát külön szerződése: [ADR-0009](0009-m5-platform-storage.md).

## QA-szerződés

A Live Validation az eredeti Core `resolveTokens` tényleges eredménye. A javítási
javaslatok csak ellenőrzött, meglévő spacinghelyekre adnak érvényes értéket.
A javaslat ID-ja konfiguráció-, forrás- és környezetfüggő. Elutasítása nem oldja
fel a blockert; elfogadása a Core-on át egyetlen history-tranzakció, új validációval.
React-hibánál csak diagnosztika keletkezik.

A Targeted QA a megváltozott Registry-scope-okat vizsgálja; globális eltérésnél vagy
érintettségi adat hiányában teljes komponensmátrixot választ. A Website öt állapota
minden esetben ellenőrzött. Az Approval QA teljes, kötelező M5 designkapuja:

| Kötelező szabály   | Tényleges végrehajtás                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| WDF-TOKENS         | Core típus-, gráf-, scope-, Foundation- és responsive validáció                                                                  |
| WDF-REGISTRY       | Eredeti Registry feloldása, minden fixture metaadatának és diagnosztikájának ellenőrzése                                         |
| WDF-BROWSER-MATRIX | Valódi alkalmazás normal/error/long/empty/missing állapotban és 27 eredeti fixture öt szélességen; preview ACK és runtime hibák  |
| WDF-GEOMETRY       | 160 render: valódi szélesség, duplikált ID, overflow, 44 px kontroll és Contract szerinti kártyapadding; font/role mérési adatok |
| STD-A11Y-001       | axe releváns WCAG A/AA szabályai minden fenti renderen; incomplete szabályok bizonyítékként megőrizve                            |
| STD-KEYBOARD-001   | Valódi Tab, fókuszláthatóság a 390 px-es fixture-ökön és modal containment az alkalmazás hibás űrlapján                          |

Ez az Approval QA a Lab designvéglegesítési kapuja; a repository teljes
`verify:m5` fejlesztési kapuja ezen felül lintet, typechecket, unitot, produkciós
buildet, M0–M4 regressziókat és M5 workflow-/fault-/biztonsági teszteket futtat.
Nem indítunk önmagába visszahívó verify folyamatot a Labon belül.

A három párhuzamos Chromium-kontektsztus ugyanazon aktuális React-forráson,
az izolált Lab QA-harness szülőablakából, a Preview saját ellenőrzött protokollján
kapja a vizsgált Draftot. Nincs külön alkalmazásrenderelő vagy rejtett CSS-override.
A viewport 320/390/768/1024/1440 CSS px, locale hu-HU, timezone Europe/Budapest,
reduced-motion, `--disable-gpu --disable-partial-raster`. A környezetlenyomat tartalmazza
a Node/platform/architektúra, lockfile, tényleges Chromium-verzió és QA/adapter/Core/Lab
forrásazonosságát. Minden eredményben egyedi check-ID, szabály, cél, súlyosság,
státusz, konfiguráció-SHA, forrás- és környezet-ID, tényleges mérési bizonyíték található.

Futás közben `running=true`, a státusz `NOT_RUN`, nem PASS. Kivétel/indítási hiba
ERROR; érvénytelen konfigurációnál a böngészős rész NOT_RUN. Megszakadt korábbi
futás restartkor ERROR. Módosítás közbeni futás eredménye STALE. Csak a teljes,
aktuális, minden kötelező checket PASS-szal tartalmazó Approval-futás fogadható el.
A saját, sikeres véglegesítés a tesztelt Draftot publikálja a tokenforrásba;
ez önmagában nem változtatja meg a tesztelt design-/React-bemenetet. Külső
tokenforrás-eltérés ettől függetlenül konfliktus és STALE.

Az automatikus scanner nem igazol teljes WCAG-megfelelőséget. A manuális vizuális,
fókusz-, magyar karakter- és elrendezésreview külön M5 bizonyíték. Képernyőolvasós,
Firefox/WebKit és fizikai érintős ellenőrzés nem állított teljesítés.

A futó Foundation/Core/adapter/Lab/QA vagy lockfile külső változása külön restartot
igényel: az új forráslenyomat nem minősítheti az előzőleg betöltött Node-kódot új
QA-futtatónak. A szolgáltatás ilyen drift mellett megőrzi a Draftot és blokkolja
az új írást/QA-t a Lab ellenőrzött újraindításáig.
