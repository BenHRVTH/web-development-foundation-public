> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M1 felülvizsgálati javítás — scope-biztos, fokozatos tokenjavítás

Dátum: 2026-11-14 (Europe/Budapest). Ág: `feat/m1-foundation-contract`, meglévő #2 PR.
Kiindulópont: `b1105d75f6e0305c409d23a3d86c082a6b7acd3f`.
A javítás kizárólag M1; a PR beolvasztása és az M2 indítása nem része.

## Azonosított hiba és reprodukció

Az `updateTokensInScope()` teljes tokenvalidációt végzett a változtatás előtt.
A 19 px spacing már a 24 px javítás alkalmazása előtt elutasításra került.
A teljes utóvalidáció sikerkövetelménye pedig egy második, független hiba mellett
ugyanúgy megakadályozta volna a részleges javítást.

Két automatizált tesztet először az eredeti implementációval futtattunk:

```sh
npx vitest run packages/core/src/m1.test.ts -t 'M1-E0[12]'
```

**Tényleges reprodukció: exit 1, 2 failed.** Mindkét esetben az elvárt siker helyett
`ok: false` érkezett. A napló: `M1-REPAIR-reproduction.log`. A tesztek azután
kiegészültek az eredmény, a diagnosztika, a generálási tilalom és az immutabilitás
ellenőrzésével; nem maradt várható hibára vagy skipre állított regressziós teszt.

## Megvalósított működés és érintett fájlok

- `packages/core/src/tokens/schema.ts`: külön strict szerkesztési szerkezet;
  ismert verzió/típus/scope/metaadat, a meglévő hibás értékek JSON-ként olvashatók.
- `packages/core/src/tokens/resolve.ts`: közös tulajdonosi ellenőrzés; kötelező,
  újraellenőrzött Manifest-kapu; scope-biztos, atomi és tiszta értékcsere.
- A visszatérés `{ config, validation }`: elfogadott szerkesztési jelölt és külön
  teljes validáció. Más token fennmaradó hibája nem blokkolja a javítást és nem tűnik el.
- Az új érték típusa, közvetlen referencia-célja és scope-ja, literal spacing/card-padding
  követelménye továbbra is kötelező. Scope vagy Foundation sértésekor nincs jelölt.
- Az explicit responsive override meglévő értéke az opcionális célmegadással javítható;
  új breakpointot vagy override-ot ez nem hoz létre.
- A `resolveTokens()` és `generateTokens()` továbbra is teljes megfelelést követel.
  Sem hibás köztes jelöltből, sem hibás végső konfigurációból nem keletkezhet CSS/TS-artifact.
- `contracts/schemas.ts` és `docs/schemas/editableTokens.schema.json`: a tényleges
  szerkesztési struktúra gépi származéka. Az eredeti strict token-/Manifest-sémák,
  a designforrás és a bootstrap generált CSS/TS kimenete byte-szinten változatlan.
- API-dokumentáció és migráció: [M1-API](../M1-API.md).
  Döntési indoklás és határok: [ADR-0003](../adr/0003-m1-repair-editing.md).
  Az eredeti M1 átadás történeti eredményei megmaradtak, e javításra mutató hivatkozással.

A belső M1 API szignatúrája változott: `updateTokensInScope(manifest, input, scope, changes, options?)`.
A kötelező Manifest nélkül nincs visszafelé kompatibilis vagy kaput megkerülő szerkesztési út.
A tartós Contract/tokenformátum `1.0.0` maradt; nem keletkezett párhuzamos designadat-forrás.

## Tesztek és tényleges eredmények

```sh
npm run typecheck
npm run test:unit
npm run generate:tokens
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m1
```

A teljes `verify:m1` eredménye **PASS, exit 0**:

- Eredeti négy specifikáció SHA-256 ellenőrzése, generált kimenet/séma driftkapu,
  Prettier, ESLint, strict TypeScript és production build: PASS.
- **69 unit/integrációs teszt, 3 fájlban; 0 failed, 0 skipped.**
- **20 valódi Chromium böngészőteszt; 0 failed, 0 skipped, 0 flaky.**
- Az eredeti M0-tesztek és az M1 korábbi tesztkövetelményei továbbra is teljesülnek.

| Új regresszió  | Ténylegesen ellenőrzött követelmény                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| M1-E01         | 19→24 px javítás elfogadva; teljes validáció és generálás sikeres; input sértetlen                                            |
| M1-E02         | Spacing, hiányzó referencia és card-padding három önálló lépésben javítható; köztes generálás elutasítva                      |
| M1-E03         | Hibás típusú meglévő literál nem blokkol másik javítást; utána maga is javítható; a jelölt TS-típusa nem validált TokenConfig |
| M1-E04–E05     | Ciklus, hibás típusú referencia és hibás referenciascope javítható, másik spacinghiba mellett is                              |
| M1-E06, 6 eset | Hiányzó, hibás, hiányos, inkompatibilis Manifest és adapter blokkolja a szerkesztést; nincs részleges jelölt                  |
| M1-E07, 9 eset | Global/family/variant, sibling variant és más család határa változatlanul sérthetetlen hibás input mellett is                 |
| M1-E08–E10     | Hamisított scope, tiltott új referencia, hibás patch, Foundation-átírás, rossz card-padding és részben hibás batch elutasítva |
| M1-E11–E12     | Alap- és responsive hibák külön javíthatók; nincs implicit szabály/override vagy responsive scope-kikerülés                   |
| M1-E13–E14     | Hiányos/értelmezhetetlen struktúra és argumentumok blokkolnak; sem a bemenet, sem a patch nem aliasa a jelöltnek              |

A teljes eredmény naplója: `M1-REPAIR-verification.log`.
Gépi futási eredmények: `M1-REPAIR-unit-results.json`, `M1-REPAIR-browser-results.json`.
A forrásazonosságot a `M1-REPAIR-source-snapshot.json` és az azt SHA-256-tal megkötő
`M1-REPAIR-results.json` rögzíti. Ezek ehhez a javításhoz tartoznak, az eredeti M1
bizonyítékait nem minősítik az új API futásának.

## Böngészős bizonyíték és korlátok

Dev és produkciós nézetben 320, 390, 768, 1024 és 1440 CSS px szélesség ellenőrzött:
bootstrap padding/betűméret és generált rem-értékek; Compact/Comfortable/Spacious
16/24/32 px tényleges inset; explicit responsive eltérés; overflow, ID-egyediség,
Tab/Enter és fókusz; axe és reduced-motion preferencia. A tartós screenshotok az `evidence/m1-repair/` könyvtárban vannak.
Az eredeti M0-val való azonos környezetű összehasonlítás mind a 10 nézetben
0 eltérő RGB pixelt mért (`M1-REPAIR-visual-comparison.json`).
A JSON-riport a mért geometria-
és accessibility-mellékleteket is tartalmazza. A futás a meglévő Playwright szerverekkel
és az előzetesen buildelt produkciós appal történt.

UI nem változott; a javító primitív headless szerződéses viselkedését a 27 új eset méri.
Nincs UI Lab, Working Draft, Undo/Redo vagy M5 jóváhagyási motor.
Az elfogadott szerkesztési művelet önmagában nem megfelelőségi állítás.
A megmaradó indirekt hibák, például ciklusok, a teljes `validation` eredményben maradnak.
Értelmezhetetlen vagy hamisított metaadatot az értékprimitív nem javít; ahhoz forrásjavítás kell.
A lokális böngészőteszt nem teljes WCAG-, többmotoros vagy képernyőolvasós megfelelőség.

A távoli GitHub Actions eredménye nincs helyi sikernek feltüntetve; a GitHub API
olvasása ebben a környezetben `Forbidden` hibát adott. A kért ágfrissítés Git pushon keresztül történik.

## Visszaállítás és megállás

A javítás külön commitban visszavonható. Tiszta munkafáról az eredeti M1 adatvesztés
nélkül külön ágon elérhető:

```sh
git switch -c rollback/m1-before-repair b1105d75f6e0305c409d23a3d86c082a6b7acd3f
npm ci
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m1
```

Ez az eredeti M1 API-t és annak ismert javíthatósági hibáját is visszaállítja.
Visszatérés: `git switch feat/m1-foundation-contract`, `npm ci`, majd `verify:m1`.
Nincs adatbázis, migráció, rejtett állapot vagy mentett Draft.
A PR nyitott felülvizsgálatra marad; merge és M2 csak külön felhasználói döntés alapján történhet.
