# M0 architektúra és végrehajtási szerződés

Ez az elfogadott M0 történeti állapota. Az M1 megvalósult API-ját a
[M1-API](M1-API.md), változásait az [ADR-0002](adr/0002-m1-foundation-contract.md)
és az [M1-átadás](reports/M1-HANDOFF.md) rögzíti.

## Érvényesség

Az irányadó négy gyökérdokumentum változatlan. A kezdőpont a
`4dafec21df5a175a766ef510c002928d05f29abe` commit. A byte-szintű lenyomatok a
`specification-baseline.json` fájlban vannak; ellenőrzésük: `npm run check:spec`.
Ez nem Project Contract-verzióellenőrzés és nem helyettesíti a dokumentumok szakmai review-ját.
Jóváhagyott későbbi specifikációváltozáskor a baseline-t külön, áttekinthető változtatásként kell frissíteni.

## Fizikai kiosztás

```text
apps/task-manager/       React + TypeScript + Vite belépési pont; M0 indítási próba
packages/foundation/    @wdf/foundation — szakmai invariánsok
packages/core/          @wdf/core — Project Contract és token-végrehajtás
packages/adapter-react/ @wdf/adapter-react — React/Vite integráció
packages/ui-lab/        @wdf/ui-lab — fejlesztői Lab és helyi szolgáltatás
packages/qa/            @wdf/qa — ellenőrzési végrehajtás
tests/browser/          M0 böngészős infrastruktúra
tools/                  repository-szintű ellenőrzések
docs/adr/               levezetett technikai döntések
docs/reports/           mérföldkő-bizonyíték és átadás
```

Az öt `packages/` workspace az M0-ban **csak metaadat és felelősségleírás**.
Nincs belőlük exportált üres API, generátor, séma vagy futtatható Lab.
A modulhatár nem igényel öt külön publikált npm-csomagot a kiadás előtt.
Jelenleg minden workspace privát, közös `0.0.0` előkiadási verzióval.

## Tervezett függőségi irányok

| Modul         | Tervezett belső függőség                                            | Kizárt felelősség                                  |
| ------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| Foundation    | nincs                                                               | React, DOM, Lab UI, projektarculat                 |
| Core          | Foundation                                                          | React-renderelés, rejtett CSS-felülírás            |
| React adapter | Core                                                                | Draft-jóváhagyás, üzleti alkalmazáslogika          |
| QA            | Foundation, Core; böngészős vizsgálathoz deklarált adapterkapcsolat | automatikus javítás/jóváhagyás                     |
| UI Lab        | Core, React adapter, QA                                             | React-/DOM-kódszerkesztés, automatikus Git-művelet |
| Task Manager  | React, React DOM; később WDF mint fejlesztői integráció             | Lab futtatókörnyezete a publikált alkalmazásban    |

Ez **terv**, a még meg nem valósult belső kapcsolatok nem szerepelnek hamis függőségként a package.json fájlokban.
Az M0 tényleges futásidejű függősége csak React és React DOM az alkalmazásban;
a build-, TypeScript-, lint-, unit- és böngészős eszközök gyökérszintű devDependencies.
Az npm lockfile és a pontos közvetlen verziók rögzítik a teljes gráfot.
A WDF majdani fejlesztői csomagjainak a projektből kell elindulniuk; nincs központi szolgáltatás.

## Gépi szerződések tervezett helye — még nem implementált

| Hely                                   | Tulajdon és későbbi feladat                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `packages/foundation/src/`             | M1: géppel ellenőrizhető Foundation-invariánsok                                          |
| `packages/core/src/contracts/`         | M1: verziózott Manifest és közös szerződéssémák                                          |
| `packages/core/src/tokens/`            | M1: négy tokenréteg, hivatkozásfeloldás, scope és reszponzív validáció                   |
| `packages/core/src/generation/`        | M1: ugyanazon tokenforrásból származó CSS és TS kimenetek                                |
| `packages/adapter-react/src/registry/` | M2/M4: React-implementáció és props-típusos fixture kapcsolata                           |
| `packages/adapter-react/src/preview/`  | M3: izolált preview adapter                                                              |
| `packages/core/src/preview/`           | M3: típusos, szűk kommunikációs üzenetek; tetszőleges JS-végrehajtás nélkül              |
| `packages/core/src/quality/`           | M1/M5: QA-státusz és bizonyíték közös interfészei; érvényességi kötések                  |
| `packages/core/src/changes/`           | M5: designállapotok és változások szerződése                                             |
| `apps/task-manager/wdf/`               | M1/M2: Manifest, egy hiteles designkonfiguráció, Registry, preview és QA belépési pontok |
| `packages/qa/src/`                     | M1–M6: statikus és böngészős szabályvégrehajtás                                          |
| `packages/ui-lab/src/`                 | M3–M5: szerkesztő UI, helyi Draft és konzisztens véglegesítés                            |

A fenti útvonalak foglalt tervezési helyek, nem létező interfészekre tett működési ígéretek.
A sémakönyvtár, Contract-verzió, tokenformátum és szerkesztési protokoll részleteinek döntése M1 vagy későbbi feladat.
Nem vezetünk be párhuzamos CSS-/TS-/Lab-designadatforrást.

## M0 végrehajtási kapu

`npm ci` után `npm run verify:m0`: specifikáció → formázás → lint → TypeScript →
React-renderelési próba → build → valódi Chromium dev és statikus preview.
A böngészős kapu 320, 390, 768, 1024 és 1440 CSS px szélességet, konzol-/hálózati hibákat,
alapvető geometriát, HTML ID-kat, billentyűzetes tartalomra ugrást és axe-ellenőrzést vizsgál.
Az M0 nem minősíti sikeresnek a későbbi T01–T16, C01–C10 és R01–R10 rendszerszintű teszteket.

A forráskövetés Git-feladat. A build és a tesztek nem módosítanak hiteles designkonfigurációt,
nem készítenek commitot és nem publikálnak. A következő mérföldkő előtt minden M0-változás
egy elkülöníthető változtatáscsomag; a visszaállítás pontos módja az átadásban található.

## M2 állapotkiegészítés — a fenti M0-terv végrehajtott része

Az M2-ben `apps/task-manager/src` a tényleges Task Manager és hét közös komponens
helye. A korábbi bootstrap felület lecserélve. `apps/task-manager/wdf/registry.ts`
a Manifestből feloldható, `configured` belépési pont. `packages/adapter-react/src`
a React Registry és fixture-határok tulajdonosa; közvetlen függősége Core és Zod,
React peer-függőséggel. A Foundation és Core implementációja változatlan.

A production App kizárólag React/React DOM/Lucide runtime-ot és generált CSS-t
használ; nem importál adaptert, Registryt vagy Labot. A Vite build modulhatár-kapuja
ezt ellenőrzi. `tests/fixtures` külön test-only Vite-root az izolált komponensekhez;
a fő app buildjének nem belépési pontja. A Registry importálása fejlesztői/tesztfeladat.

Az üzleti adatállapot App-memória, a formvalidáció appkód; nincs Draft, Audit engine
vagy jóváhagyás. A Preview továbbra M3 `NOT_RUN`. A részletes API és az alkalmazott
architekturális döntés: [M2-API](M2-API.md), [ADR-0004](adr/0004-m2-task-manager-registry.md).

## M3 állapotkiegészítés

A Preview configured. A `packages/core/src/preview` a strict verziózott adatprotokoll,
a `packages/adapter-react/src/preview` a projekt saját Vite/index belépését használó
külön originű adapter, a `packages/ui-lab` az aktuális Contractból induló fejlesztői
CLI és Website View. A production alkalmazás forrása és tokenadata változatlan.
A közös CSS-emitter a meglévő M1 generálásból kiemelt tiszta függvény, változatlan
Node-kimenettel és driftkapuval. A transient jelölt nem Change Manager vagy mentett Draft.
A Studio/M5/M6 továbbra nem implementált. Részletek:
[ADR-0005](adr/0005-m3-website-preview.md), [M3 útmutató](M3-UI-LAB.md),
[Preview API](M3-PREVIEW-API.md).

## M4 állapotkiegészítés

A Lab második workspace-e Component Studio, ugyanazzal az App-tulajdonú transient
`EditableTokenConfig` jelölttel. A Registry serializálható katalógust ad, a projekt
adaptere külön iframe-dokumentumban rendereli az eredeti komponenseket és CSS-t.
A Preview wire 1.1.0 külön `apply-design` snapshotot enged a receiver Registry-listájával
ellenőrzött family/variant értékhelyekhez. Az M1 tokenmotor, M2 alapértelmezett Registry
és M3 Website/R01 megmarad. M5 és M6 nem implementált. Részletek:
[ADR-0006](adr/0006-m4-component-studio.md), [M4 API](M4-API.md),
[Studio útmutató](M4-COMPONENT-STUDIO.md).

## M5 állapotkiegészítés

A Core `change` API strict designállapot-, history-, QA- és műveletszerződést ad.
A UI Lab Node ChangeManager az egyetlen Draft-tulajdonos, a useChangeManager
visszaigazolt állapotot közvetít mindkét workspace-be. A Review panel közös és
másodlagos. Az adapter Preview 1.1.0 változatlan; A/B is ezen alkalmaz designadatot.
A QA workspace tényleges Chromium-futtatóval bővül, a produkciós alkalmazás nem
importálja. Az Initial, Baseline, Draft, undo-history és QA ugyanabban a helyi,
checksumolt állapotban él; véglegesítéskor rollback-journal védi a token/CSS/TS/state
konzisztenciát. Részletek: [ADR-0007](adr/0007-m5-change-manager.md),
[ADR-0008](adr/0008-m5-local-security-qa.md), [M5 API](M5-CHANGE-QUALITY-API.md).
M6 csomagolás és kiadás nem része az M5 változtatásnak.
