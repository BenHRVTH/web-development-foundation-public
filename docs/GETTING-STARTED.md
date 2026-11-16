# WDF Getting Started — 0.1.0-rc.1

Ez helyi release candidate, nincs nyilvános npm-release. Node **24.22.1**, npm
**11.9.0**, React **19.3.1**, Vite **8.3.8**, React plugin **6.3.0** az ellenőrzött host.
Linux helyi fájlrendszer; a Windows támogatás pontos bizonyítékát és tartóssági
különbségét a [release guide](RELEASE-GUIDE.md) és az ADR-0009 rögzíti.

## Tiszta forráscheckoutból

```sh
npm ci
npm run build:packages
npm run install:consumer
```

Az utolsó parancs új, monorepón kívüli könyvtárat hoz létre, kiírja annak helyét,
és a tényleges `.tgz` artifactokból telepít. A kapu `npm ci`-t, Contract/token-
ellenőrzést, TypeScriptet és produkciós buildet is végez. A létrehozott könyvtár
pontos útvonala `test-results/m6-consumer.json` alatt van. Nem kell kézzel
összeállított alias, symlink vagy a gyökér `node_modules` könyvtára.

A kiírt fogyasztókönyvtárból:

```sh
npm run dev
npm run ui-lab
```

Ezeket külön terminálban indítsd. App: `127.0.0.1:5183`; Lab: `127.0.0.1:5175`;
a Lab saját alkalmazáselőnézete: `127.0.0.1:5176`. Ctrl+C leállítja a Lab mindkét
szerverét. Az alkalmazás saját memóriája újratöltéskor alaphelyzetbe áll; a WDF
Working Draft és history tartós helyi fejlesztői adat.
A Playwright Chromium a QA-hoz szükséges: `npx playwright install chromium`;
Linux CI-ben `npx playwright install --with-deps chromium`. Alternatíva egy meglévő
kompatibilis Chromium explicit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` beállítással.

## Új vagy meglévő React/Vite projekt

A független, teljes példa: `examples/listening-room`. Nem Task Manager-klón.
Másold saját könyvtárba a példát, adj saját projektazonosítót és saját tokeneket,
és a kiadási artifactokból telepítsd az öt WDF-csomagot fejlesztési függőségként.
A példabeli `vendor/*.tgz` relatív hivatkozásokat az install eszköz automatikusan
írja be. A saját lockfile-t verziózd; következő gépen `npm ci`.

A minimális integráció hat része:

1. `wdf/project.json`: 1.0.0 Manifest, saját ID/név, react-vite 1.0.0 adapter,
   token JSON, configured Registry és Preview, az öt tesztszélesség, QA-hookok.
2. `wdf/tokens.json`: saját primitív/szemantikus/család/variáns tokenek;
   Foundation szabályok és spacing-skála változatlan.
3. `wdf/registry.tsx`: az alkalmazás **tényleges** komponensreferenciái, props-
   sémák, variánsok, fixture-ök és pontos szerkeszthető tokenhelyek.
4. `wdf/preview.ts`: previewDefinition, saját CSS, `WebsiteQa` és az importált
   `typography` profil.
5. `wdf/typography.json`: saját 1.0.0 képességprofil, valódi fontszerepek,
   tokenhivatkozások, mérendő súlyok és Website/Studio célok. A példát saját
   komponenseidhez igazítsd; a súlylista önmagában nem fontbizonyíték.
6. `generate.mjs`, `src/generated/tokens.css` és `tokens.ts`, az app saját
   Vite/index/main belépése; `ui-lab: wdf-ui-lab` script.

A teljes minimális Manifest a példában olvasható; minden kötelező mező szerepel
benne. Az egyszerű JSON-betöltés nem importál Registryt és nem hajt végre shellt.
A `qa.hooks` deklaráció; a Lab belső Approval QA a saját szűk böngészős futtatója,
nem önmagát rekurzívan indító verify parancs.

## Első használat

Első sikeres Lab-indítás: változatlan, nem jóváhagyott Initial Reference.
A Website globális és Studio család/variáns szerkesztése egyetlen Draftba ment.
Undo/Redo logikai műveleteket mozgat; A/B ugyanazon React-forráson vált designt.
Az Audit-javaslat külön elfogadható/elutasítható; nem automatikus javítás.
Friss, minden kötelező checkre PASS Approval QA után a Changes fülön a Draft jóváhagyása külön megerősítést kér.
Csak ez írja a hiteles tokenforrást, CSS/TS kimenetet és Approved Baseline-t.
A Lab nem készít Git-commitot, push-t, taget vagy publikálást.

A fogyasztó saját böngészős hookja `npm run qa:browser`: öt valós render, overflow és axe.
Telepített Chromiumot igényel; a teljes M6 fogyasztóteszt ezt a parancsot is ténylegesen futtatja.

A Typography súlyválasztója kezdetben NOT_RUN. A **Tipográfia ellenőrzése** vagy
az Approval QA bizonyítja a felkínálható súlyokat; szerkesztés és újraindítás
után a régi bizonyíték elavult. Az összeolvadó vagy még nem igazolt érték nem
választható külön igazolt fokozatként; meglévő értéket a Lab nem ír át.
A Task Manager megőrzött 600-as alapértékei kiadásblokkolók lehetnek; a Hangár
független 400/700 működése nem oldja fel ezt automatikusan.
Részletek: [Developer Guide](DEVELOPER-GUIDE.md), [ADR-0011](adr/0011-m6-typography-capabilities.md).
