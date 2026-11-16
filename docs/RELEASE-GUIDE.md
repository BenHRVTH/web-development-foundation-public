> Tiszta nyilvános snapshot: a friss közzétételi és CI-határokat a [PUBLICATION.md](PUBLICATION.md) írja le. A történeti mérési eredmények a privát archívumban maradnak; az új export teljes M6-/Windows-kapuja NOT_RUN, az R05 ismert blokkoló.

# WDF Release Guide — 0.1.0-rc.1

**Kizárólag release candidate; nincs registry-publikálás, GitHub Release vagy végleges tag.**
A teljes aktuális readiness és az esetleges blokkolók: [M6-HANDOFF](reports/M6-HANDOFF.md).

**Nyitott kiadásblokkoló: R05.** Az aktuális modell, pontos commitonkénti
Linux/Windows eredmények és nyitott hibák a
[tipográfiai átadásban](reports/M6-TYPOGRAPHY-HANDOFF.md) szerepelnek.
A Lab nem kínál összeolvadó súlyokat két igazolt opcióként; a megőrzött 600-as
értékek ettől még nem kapnak alapállapoti R05 PASS-t. A hét kötelező Approval-check
része a `WDF-TYPE-001`; régi hatcheckes QA nem jogosít új jóváhagyásra.
A [korábbi sikertelen mérések](reports/M6-R05-CORRECTION.md) történetileg megmaradnak.

## Előállítás és telepítési próba

```sh
npm ci
npm run build:packages
npm run install:consumer
npm run test:m6
# Linuxon teljes M0–M6:
npm run verify:m6
```

Chromium előfeltétel: `npx playwright install --with-deps chromium` Linux CI-ben;
Windows alatt `npx playwright install chromium`. Meglévő böngésző explicit executable
path környezeti változóval választható. A tesztek saját szervereket indítanak; a
5173/5175/5176/5183 portok legyenek szabadok. A fogyasztóprojekt mappájának eltávolítása
csak az ellenőrzés befejezése után indokolt; hiba esetén a fájlok diagnosztikai bizonyítékok.

Öt azonos RC-verziójú `.tgz` és `inventory.json`: `artifacts/packages/`.
A build a meglévő TS fordítóból állít ESM JS és `.d.ts` fájlokat; a release-manifest
pontos belső verziókat, exports/types/bin/files/engines/dependency adatokat tartalmaz.
A második build/pack byte-pontos egyezést követel. Az inventory fájlonkénti listája
és SHA-256 értékei a vizsgált artifactokat azonosítják; ne a munkafából feltételezd őket.

A tiszta telepítő a valódi csomagokat relatív `file:vendor/*.tgz` függőségként telepíti,
majd saját lockfile-ból `npm ci`-t futtat. Ez az előkiadás szállítási módja; nem próbál
nem publikált `@wdf` verziókat registryből letölteni. A létrejött fogyasztóprojekt
saját könyvtárából `npm run ui-lab`; nincs root/workspace-alias vagy symlink.

## CI és bizonyíték

A push és pull_request workflow külön Linux és natív Windows jobot futtat.
Linux a teljes M5 regressziót és az M6 telepítési/Approval mátrixot futtatja;
Windows a hordozható tárolási/journal csomagot és az artifactból telepített
fogyasztó Lab/workspace/Draft/Approval/browser folyamatait.
A workflow artifactként megőrzi a csomagokat, SHA-256 inventoryt, teszteredményeket,
trace-eket, telepítési adatokat és screenshotokat. A két platform sikerét külön
kell ellenőrizni; Linux PASS nem jelent Windows PASS-t.

## Verziózás és korlátok

Az öt csomag közös verziót kap; belső függőségeik pontos verzióra rögzítettek.
A protokollok külön verziózottak. Nem kompatibilis Contract/API váltás külön
migrációt és review-t igényel; nincs automatikus régi Draft-migráció.
A konkrét host és dependency-verziók az inventoryban és lockfile-ban vannak.
Node 24/npm 11, React 19/Vite 8 az ellenőrzött v1 platform; más major nem igazolt.

Linux: helyi fsync/rename képes fájlrendszer. Windows: helyi NTFS cél, látható
`STORAGE_DURABILITY_LIMIT`; a Node nem biztosít Linuxszal azonos könyvtár-fsync-et,
áramszünet/OS-crash utáni tartósság nem garantált. ACL-korlát, PID-azonosság és
helyreállítás: ADR-0009. Hálózati/felhőszinkronizált tároló és többgépes lock
nem igazolt, nem támogatott garancia. Firefox/WebKit és fizikai mobil külön
NOT_RUN, ha a végső mátrixban nincs tényleges bizonyíték.
Az axe eredmény nem teljes WCAG-tanúsítás; kézi és képernyőolvasós vizsgálatok
státuszát külön kell kezelni.

## Rollback

Állítsd le a Labot. Archiváld együtt a `.wdf-lab/<id>` teljes könyvtárát,
a hiteles tokenforrást és a generált CSS/TS fájlokat. Ép journal a következő
indításkor helyreállít; idegen/sérült adatnál blokkol, nincs találgató felülírás.
Korábbi teljes csomagkészletre és hozzá illő lockfile-ra válts; `npm ci` és teljes
QA szükséges. Egyetlen csomag önálló downgrade-je vagy fél designállapot másolása
nem konzisztens rollback. A történeti M6-/`5f0d8b3` referencia csak a privát fejlesztési archívumban
érhető el; a tiszta nyilvános repository nem tartalmazza ezeket a commitokat.
Ott kizárólag a saját, később létrejövő és ellenőrzött publikus commitok, illetve
a hozzájuk tartozó pontos csomag-inventory alapján állíts vissza. A régi
repository történetét ne importáld rollback céljából sem.

## Önálló fogyasztóátadás

Az Actions artifact `artifacts/consumer` könyvtára a ténylegesen telepített, még
jóváhagyás előtti fogyasztó forrását, saját lockfile-ját, generált CSS/TS fájljait és
öt vendor `.tgz` csomagját őrzi. Nincs benne node_modules, build vagy helyi Draft.
A lockfile SHA-256 értéke az install jelentésben szerepel. Kibontás után, a könyvtárban:

```sh
npm ci --ignore-scripts
npm run check:generated
npm run build
npm run ui-lab
# Telepített Chromium mellett, leállított dev/Lab szerverekkel:
npm run qa:browser
```

Ez a már tesztelt dependency-gráfot telepíti újra; új npm install helyett az átadott
lockfile-t használd. A Lab külön terminálból indítható az önálló apptól. A snapshotot
nem köti a runner ideiglenes könyvtárneve vagy a WDF monorepo.
