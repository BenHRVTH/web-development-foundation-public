# ADR-0010 — M6 telepíthető ESM release candidate

Dátum: 2026-11-15. Kiindulópont: `5f0d8b3`, az elfogadott M5 merge-je.
Forrás: M6 felhasználói megbízás; Blueprint §3, §5, §9, §11.

## Csomaghatárok és build

Az öt meglévő felelősségi határ öt közösen verziózott npm-artifact marad:
Foundation, Core, React adapter, QA, UI Lab. Nincs új framework vagy csomagkezelő.
A jelölt verzió **0.1.0-rc.1**; a belső `0.0.0` source-workspace verzió nem kiadási artifact.
A Contract/adapter 1.0.0 és Preview wire 1.1.0 protokollverzió ettől független.

A `tools/build-packages.ts` a meglévő TypeScript fordítót használja JS és `.d.ts`
kibocsátásra, explicit Node ESM relatív kiterjesztésekkel. Nincs runtime TS-loader,
Node alatti TSX vagy új bundler. A release-manifestek a source-manifestekből
származnak: csak `dist`, README, npm-metaadat, pontos belső RC-verziók, ESM/types
exportpárok és a fordított CLI-bin kerülnek terjesztésbe. A Lab saját index/CSS
és az adapter Studio CSS szállítandó runtime-adat. Teszt, munkaadat, appdesign,
repo-szintű eszköz, secret és dokumentációs screenshot nem kerül a csomagba.
A fejlesztői manifestek source-exportjai tudatosan megmaradnak a meglévő M0–M5
workflowhoz; **a kiadási manifestek és az install teszt kizárólag a csomagolt distet használják**.
A tényleges, generált manifestek a pack inventory fájllistáival együtt áttekinthetők.

A UI Lab és QA a fogyasztó **devDependencies** része; a projekt React/Vite hostja
explicit függőség. A produkciós app csak saját komponenseket és generált CSS-t
használ. Az ESM exportlista zárt, belső fájlok deep importja nem publikus API.
A teljes függőségi gráfot a root és az elkülönített fogyasztó lockfile-ja rögzíti.
`npm pack` nem publikálás; registry, Release és végleges tag nem készül.

## Projektfüggetlen integráció

Az M5 QA Task Manager-specifikus oldal-előkészítését annak saját `wdf/qa.ts`
modulja birtokolja. A `preview.websiteQa` a megbízható helyi projekt Node-integrációja:
öt állapot, helyi URL, opcionális valódi Playwright-előkészítés, ready/control/card
szelektorok és kártyatokenek. Az adapter Node oldalon továbbítja, a QA validálja;
nem új HTTP-/postMessage-parancs, nem böngészőből beküldhető kód. A preview browser
modulja csak `import type` kapcsolaton használja a QA-t, Node-függőség nem kerül bele.
Hiányzó driver nem lesz csendes PASS: a QA hibát ad, a Lab ettől még megnyitható.
A közös hat check és az öt szélesség megmarad; a mátrix a saját Registry méretéből adódik.

A QA-környezet az importált csomagok tényleges gyökerét, metadata/src/bin/dist
fájljait és a legközelebbi projekt-lockfile-t méri. Nem feltételez testvércsomagokat
vagy a monorepo gyökerét. A futó engine külső módosítása továbbra restartot követel.

## Bizonyítás és korlát

Az artifactokat a repositoryn kívüli, új könyvtárba másoljuk. Mind az öt `.tgz`
a fogyasztó saját `vendor` könyvtárából települ; `npm install`, majd saját lockfile-ból
`npm ci`, valódi típusellenőrzés/build/Lab/Approval következik. Symlink, workspace
alias, belső forrásimport nincs. A csomagolt fájllista és SHA-256 inventory megmarad.
Az ismételt pack byte-egyezést kapuként ellenőrizzük.

A Linux/Windows helyi tárolási szerződés változatlan (ADR-0009). A Windows
könyvtár-fsync és áramszünet utáni tartósság nem lesz igazoltnak feltüntetve.
A platformtesztek és a kézi ellenőrzések tényleges státusza a végső mátrixban szerepel.
