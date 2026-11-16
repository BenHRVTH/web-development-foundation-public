> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M6 függőségi és biztonsági összefoglaló

Vizsgálat: 2026-11-15; Node 24.22.1/npm 11.9.0; RC 0.1.0-rc.1.
A pontos pack-fájllista, exportok, verziók és SHA-256 lenyomatok a kiadási
inventoryban; az installált gráf a fogyasztó lockfile-jában és npm ls kimenetében.

## Függőségek és izoláció

Öt közösen verziózott csomag; Foundation függőségmentes, Core Zodot és Foundationt
használ; React adapter Core/Zod + explicit React/React DOM/Vite peerek;
QA Core/adapter/Playwright/axe; Lab Core/adapter/Foundation/QA, React/React DOM,
Lucide, Prettier és Zod, explicit Vite/plugin hosttal. A release-manifestek belső
verziói pontosak, a React/Vite hostpeerek az ellenőrzött verzióra rögzítettek.
CJS nincs; a publikus Node/browser importhatár és minden deklarált entry létezése
a telepített csomagokon tényleges importtal/TypeScripttel ellenőrzött.
A nem exportált deep importok ERR_PACKAGE_PATH_NOT_EXPORTED hibával elutasítottak.

A source-workspace privát; a terjeszthető artifactok a build által létrehozott
release-manifestből készülnek. Nincs install/postinstall script a WDF-csomagokban.
A telepítési próba ignore-scripts mellett is buildel és fut. A csomaglista kizárja
a tesztforrásokat, eredményeket, workspace alkalmazást, Git-adatot, munkaállapotot,
.env fájlokat és egyéb érzékeny anyagot. A runtime HTML/CSS kifejezetten bekerül.
A produkciós app buildgráfja kizárja az összes WDF/Registry fejlesztői modult.

A helyi Lab loopbacken, külön originű preview-val fut. Exact Host/Origin/session/
project/revision ellenőrzés, szűk HTTP- és postMessage-séma, body-limit, scope és
receiver-owned Registry-tokenlista marad. A böngésző nem küldhet fájlútvonalat,
shellparancsot, forráskódot vagy Foundation-kivételt. A projekt websiteQa drivere
megbízható helyi Node-integráció; nem kliensoldali kódfuttatási végpont.
A Labban továbbra sincs Git-commit/push/merge/tag/publikálás.

A Windows npm-indítás process.execPath + npm saját Node CLI, shell nélkül;
a szóközös/ékezetes útvonal nem parancsszöveg. A temp-projektet realpath oldja fel,
a tároló containment/symlink/junction ellenőrzése és a tartóssági figyelmeztetés él.
Nincs új jogosultság, központi felhőszolgáltatás vagy távoli runtime-függőség.
A helyi projekt/Vite-plugin megbízható fejlesztői kód; ez nem ellenséges kód sandboxa.

## npm audit értékelése

A tényleges `npm audit --json` eredménye: **0 high, 0 critical, 7 moderate**.
A hét jelzés egy gyökérok függőségi lánca: a lint eszközökben használt minimatch
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249),
globparts-amplifikációval előidézhető denial of service. Az érintett verziótartomány

`>=7.0.0 <11.0.1`; a rögzített typescript-eslint lánc jelzi tovább a moderate státuszt.

Ez a monorepo lintelésének dev-eszközlánca, nem a WDF release-csomagok függősége,
nem a fogyasztó produkciós bundle-je és nem HTTP-ből vezérelhető globparaméter.
A feltételezett támadó által beküldött globminta nincs a helyi lint workflowban.
Ezért a jelen RC fenyegetési modelljében nem kiadásblokkoló runtime-sérülékenység.
A nyers audit és a teljes gráf megőrzendő; automatikus force downgrade nem indokolt:
az npm javaslata régebbi typescript-eslint verzióra váltana, külön TS6-kompatibilitási
kockázattal. A lintlánc következő kompatibilis frissítésénél új audit szükséges.
A scanner sikere vagy ez az értékelés nem általános biztonsági tanúsítás.

A külön átadott, saját lockfile-ból újratelepített fogyasztóprojektben végzett
`npm audit --json` eredménye **0 info/low/moderate/high/critical**, a fejlesztői
WDF/QA eszközökkel együtt. Nyers fogyasztói audit (privát archívum: `M6-consumer-dependency-audit.json`).
Ez külön bizonyíték a root lintlánc fenti moderate jelzéseinek értékelésétől.

## Platformkorlátok

Az ADR-0009 változatlan: helyi Linux fsync/rename, illetve Windows helyi NTFS
fájl-fsync és journal. Windows könyvtár-fsync/áramszünet/OS-crash garancia nincs;
ACL és PID-azonosság korlátját nem helyettesíti a POSIX fájlmód vagy a processlock.
Hálózati, felhőszinkronizált, többgépes tároló nem igazolt. A végső natív futások
státusza külön szerepel az M6 átadásban; a történeti M5 platformteszt nem M6 PASS.

## Tipográfiai képességkezelés — aktuális kiegészítés

Az új profil megbízható helyi preview-integrációból származik; a HTTP-kliens
nem küldhet profilt, mérési útvonalat vagy futtatandó kódot. A tényleges mérés
az eredeti origin/session/scope protokollt használja. A képek ellenőrzött helyi
könyvtárban, véletlen futásazonosítóval és symlink-elutasítással tárolódnak.
Az új kötelező `WDF-TYPE-001` hiánya vagy elavultsága blokkolja a jóváhagyást.
A pngjs 7.0.0 explicit QA runtime dependency, kizárólag fejlesztői eszközként.

Az új monorepo audit (privát archívum: `M6-TYPOGRAPHY-dependency-audit.json`) változatlanul
7 moderate dev-lint jelzést, 0 high/critical hibát mutat. A ténylegesen telepített,
független fogyasztó auditja (privát archívum: `M6-TYPOGRAPHY-consumer-audit.json`): 0 sérülékenység.
Az M3–M5 regresszió és a csomagolt fogyasztó bizonyítékait a
[tipográfiai átadás](M6-TYPOGRAPHY-HANDOFF.md) köti az ellenőrzött commitokhoz.
