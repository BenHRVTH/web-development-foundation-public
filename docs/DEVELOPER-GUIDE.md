# WDF Developer Guide

## Határok és publikus modulok

| Modul         | Publikus ESM API                                           | Felelősség                                                   |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| Foundation    | `@wdf/foundation`                                          | LOCKED skálák és szakmai szabályok, arculat nélkül           |
| Core          | `@wdf/core`, `/node`, `/generation`, `/preview`, `/change` | Manifest, tokenmotor, generálás, wire és állapotsémák        |
| React adapter | `@wdf/adapter-react`, `/registry`, `/preview`, `/vite`     | valódi komponensek, izoláció, projekt Vite/Studio integráció |
| QA            | `@wdf/qa/browser`                                          | tényleges Chromium, geometria, axe és billentyűzet           |
| UI Lab        | `@wdf/ui-lab/cli`, `wdf-ui-lab` bin                        | két workspace, közös Review és helyi ChangeManager           |

A `/node`, `/generation`, `/vite`, QA és CLI Node/dev-only. A preview és registry
böngészős határok nem importálnak Node szolgáltatást. CJS nincs; ESM import és
TypeScript deklaráció az exports-listából érhető el. Belső fájlútvonal nem stabil API.

## Design Token Interface

Egyetlen hiteles `wdf/tokens.json`: Foundation referencia → project primitive →
semantic → component family/variant. A `generateTokens` ugyanazt a feloldót használja,
mint a preview és validáció. A CSS/TS nem kézi bemenet. Scope, típus, referencia,
ciklus, Foundation és deklarált reszponzív eltérés továbbra kötelező ellenőrzés.
Részletek: [M1 API](M1-API.md); az ottani source-workspace leírás történeti,
a kiadási exportok fordított JS/`.d.ts` párok.

### Tipográfiai opciók ellenőrzése

A `fontFamily` fallback-lánc és a `fontWeight` numerikus validációja nem bizonyítja,
hogy a helyi fontnak van külön face-e minden felkínált súlyhoz. A computed 600/700
különbséghez azonos betűkép is tartozhat. Az R05 az alkalmazás saját szerepeit,
betöltött fontjait, valós Lab-tokenmódosítását és tényleges glyph-pixeleit vizsgálja;
a monospace azonos advance-szélessége önmagában nem hiba.
A jelenlegi Task Manager súlyütközése kiadásblokkoló: [R05 eredmény](reports/M6-R05-CORRECTION.md).
A forrásfont/arculat cseréje vagy az opciószerződés pontosítása külön szakmai döntés;
nem írjuk át a Foundationt, és nem minősítjük az összeolvadt opciót PASS-nak.

### ADR-0011: projektprofil és igazolt súlyválasztás

A preview default export `typography` mezője a projekt saját
`wdf/typography.json` profilja. `schemaVersion: "1.0.0"`; minden szerep `id`,
`familyToken`, `sizeToken`, `weightToken`, `weights` és `targets` mezővel rendelkezik.
A tokenazonosítók a hiteles designforrásra hivatkoznak; a `weights` mérendő jelöltek,
nem automatikusan támogatott választások. A Website-cél `{workspace: "website",
selector: "..."}`, a Studio-cél ezen felül a `component` és `fixture` azonosítója.
A projekt valamennyi súlytokenjének fontkörnyezetét deklarálni kell.

A `Typography` panel **Tipográfia ellenőrzése** gombja a közös Targeted QA-t
futtatja; az Approval QA ugyanezt a kötelező `WDF-TYPE-001` ellenőrzést tartalmazza.
A Lab csak a célok, szélességek és közös tokenfogyasztók metszetében igazolt
súlyokat engedi választani. Az összeolvadó jelöltek mérései megmaradnak, a
nem igazolt aktuális érték nincs automatikusan átírva. A FAIL összesítésből is
felhasználhatók az igazolt javítási opciók; ez nem jelent jóváhagyhatóságot.

Új Draft-szerkesztés után a bizonyíték elavult, új QA szükséges. Lab-restart után
rendszerfontokra új mérés kell, a mentett Draft/history változatlan. Fonttelepítés
vagy OS-fontfrissítés után indítsd újra a Labot. A WDF nem figyeli az operációs
rendszer valamennyi fontfájlját. Profilhiány esetén a projekt javításra megnyitható,
de nincs igazolt súlyválasztás és a tipográfiai Approval-check ERROR.

A nyers HTTP API nem igazol fonttámogatást: meglévő javítandó értéket megőrizhet,
de nem kerülheti meg az aktuális Approval QA-t. A profilt csak fejlesztési
forrásváltoztatás rendezheti; a Lab nem módosítja saját követelményeit.
Részletes döntés: [ADR-0011](adr/0011-m6-typography-capabilities.md).

## Registry, fixture és preview

`defineComponent` a projekt tényleges komponensét és props-típusát köti össze a
sémával és fixture-ökkel. A `fixtureOwner` csak interakciós állapotot biztosít;
a renderelt komponens ugyanaz. A galéria nem keres DOM-elemet és nem készít
példányszintű felülírást. A Preview wire 1.1.0 project/session/origin/source/revision
és receiver-owned tokenlista alapján alkalmaz teljes design snapshotot.
Részletek: [M4 API](M4-API.md), [Studio](M4-COMPONENT-STUDIO.md).

## Új projekt QA-integrációja

A preview default exportjába `websiteQa` kerül, `WebsiteQa` típusellenőrzéssel:

```ts
import { previewDefinition } from '@wdf/adapter-react/preview';
import type { WebsiteQa } from '@wdf/qa/browser';
const websiteQa = {
  readySelector: 'h1',
  controls: '.action, .field input',
  cards: [
    {
      selector: '.session-spacious',
      token: 'component.session-card.spacious.padding',
    },
  ],
  cases: [
    { id: 'normal', url: '/' },
    { id: 'error', url: '/?state=error' },
    { id: 'long', url: '/?state=long' },
    { id: 'empty', url: '/?state=empty' },
    { id: 'missing', url: '/?state=missing' },
  ],
} satisfies WebsiteQa;
export default {
  ...previewDefinition,
  studioStyles: ['/src/app.css'],
  websiteQa,
};
```

Minden állapotnak valódi alkalmazásállapotot kell előidéznie. Szükség esetén a
case `async prepare(frame, page, width)` a projekt megbízható Node oldali Playwright
kódja. A Task Manager példája a saját `wdf/qa.ts` fájlban van. A böngésző preview
modulban a QA **csak type import**: a Node futtató nem kerülhet böngészőbundle-be.
A `cards` szelektorai a valóban renderelt kártyák minden variánsát fedjék le.
A nem renderelt fixture-állapot (például zárt modal) paddingmérése explicit
`fixtureStates` listával határolható. A nyitott állapot tényleges mérést követel;
a Registry card-padding tokenjéhez hiányzó mérési mapping nem PASS.
Az integráció hiánya ERROR, nem automatikus siker. A HTTP-kliens nem küldhet drivert.

## Changes, Audit és jóváhagyás

Egy tartós Draft, változatlan Initial, külön Approved Baseline; közös, szerializált
Node tulajdonos. Audit-javaslatonkénti döntés és egy Undo; elutasítás nem tüntet el
blockert. A/B aktuális React-forráson vált designt. Approval QA hat checket futtat
minden saját fixture-re és az öt website-állapotra, mind az öt szélességen.
Forrás/config/engine/környezet drift STALE vagy konfliktus. Külön megerősítés után
journal védi a token/CSS/TS/state konzisztenciát. A Lab nem hajt végre Git-műveletet.
Teljes szerződés és hibaelhárítás: [M5 API](M5-CHANGE-QUALITY-API.md),
[Review útmutató](M5-REVIEW-GUIDE.md), ADR-0007–0009.

## Hibakeresés

- Inkompatibilis Manifest: a pontos diagnosztika szerinti Contractot javítsd; nincs implicit migráció.
- Registry import/props/render hiba: az érintett komponens/fixture/path a diagnosztikában van.
- Ütköző port: állítsd le a korábbi Labot; strictPort miatt nincs csendes originváltás.
- Preview nincs kész: konzol/hálózat, ACK és saját CSS/Registry integráció ellenőrzése.
- QA ERROR: Chromium telepítés és websiteQa driver; a log/evidence hibáját javítsd, ne nevezd át PASS-ra.
- Külső forrásmódosítás: Draftot őrizd meg, ellenőrzött restart; új Approval QA szükséges.
- Tárolási/journal hiba: állítsd le, archiváld a teljes mentést és a három designfájlt;
  kövesd az M5 helyreállítási útmutatót. Ne töröld a sérült állapotot.
