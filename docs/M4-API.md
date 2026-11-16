# M4 — Registry és Preview API

Döntés: [ADR-0006](adr/0006-m4-component-studio.md). Az M1/M2/M3 API-k tovább
használhatók az alábbi kifejezett bővítésekkel. A négy eredeti specifikáció változatlan.

## Registry

`Registration<P>.fixtureOwner?: ComponentType<{ initialProps: NoInfer<P> }>`:
fejlesztői állapottulajdonos. A props az eredeti komponens típusából származik;
a fixture schema-validációja az owner létrehozása előtt történik.

`RegistryEntry.renderFixture(id, interactive = false): Result<ReactElement>`.
`false` esetén az M2-viselkedés marad; `true` esetén a deklarált owner renderel,
annak hiányában az eredeti komponens. A Studio nem ad át felhasználó által szerkesztett props-ot.

`resolveRegistry(manifest, tokenInput, entries, options?)`:

- `fixtureIsolation: true`: props-hiba csak a fixture-höz tartozik; az entry
  megmarad. Az eredmény diagnosztikáját kötelező megjeleníteni. Strukturális és
  token-scope-hiba, dupla entry/fixture/variant/state továbbra karantén.
- `repair: true`: értékhibák mellett is feloldható a katalógus. A Core javító
  kapuja továbbra megköveteli az érvényes Manifestet és egyértelmű tokenmetaadatot.
- Opció nélkül az M2 teljes, szigorú validációja és karanténja változatlan.

`registryCatalog(resolution): RegistryCatalog` kizárólag az `id`, `name`, `category`,
`family`, `variants`, `states`, `tokens`, valamint props nélküli fixture-metaadatokat
és diagnosztikát adja. `registryTokenIds(catalog)` az ellenőrzött komponens-tokenek
egyedi listája. Nem kézzel karbantartott galéria vagy második designforrás.

`mayReference(sourceId, source, targetId, target)` az M1 eddigi referenciahatárának
közös, exportált predikátuma. A TokenField ugyanazt a réteg-/scope-szabályt használja
a típusazonos célok felkínálásához; a végső engedélyt mindig a javító engine dönti el.

## Preview wire 1.1.0

Import: `@wdf/core/preview`. A `PREVIEW_VERSION` értéke `1.1.0`. Kötelező boríték:
`channel: wdf-preview`, pontos verzió, projekt-ID és 64 hex karakteres session.
Minden request/response strict. A sender source/origin ellenőrzése megelőzi a sémát.

Új parancs:

```ts
{
  ...previewEnvelope(connection),
  type: 'apply-design',
  revision: 12,
  edits: [
    { id: 'component.button.radius', scope: { kind: 'family', family: 'button' }, value: 16 },
    { id: 'component.button.primary.background', scope: { kind: 'variant', family: 'button', variant: 'primary' }, value: { ref: 'semantic.color.accent' } },
  ],
}
```

`DesignEdit`: a fenti rekord, opcionális meglévő `responsive` értékhellyel.
`designEditSchema` a runtime séma; legfeljebb 4096 rekord, pozitív egész revízió,
egyedi `[responsive,id]` értékhely. `scope` strict global/family/variant unió,
instance és ismeretlen mező nem megengedett.

`applyDesignEdits(manifest, input, edits, trustedComponentTokenIds): Result<TokenEdit>`:
a trusted lista a receiver saját Registry-feloldásából jön. A függvény másolaton
szerkeszt, nem ír lemezre. A `scope` és ID összhangját az M1 engine ellenőrzi.
Egy elutasított batch-tag esetén nincs részleges eredmény. Elfogadott javításnál
`value.validation` lehet hibás; ebből a `generateTokenCss` nem ad kimenetet.

`designEdits(config, componentTokenIds): DesignEdit[]` az összes global és
engedélyezett komponens-értékhely teljes snapshotja. A Lab csak szigorúan
generálható jelöltből küldi. Metaadat, React, CSS és végrehajtható forrás nem része.

A korábbi `apply`/`applyGlobalEdits` továbbra csak globális tokent enged. Nem kap
implicit komponensjogosultságot. A `ready`, `applied`, `error`, `pong` válaszformátum
változatlan; az új borítékverzió kötelező. Az érvénytelen design-snapshot
`PREVIEW_TOKENS_INVALID`, azon belül például `PREVIEW_SCOPE_FORBIDDEN`,
`PREVIEW_EDIT_DUPLICATE` vagy eredeti Core diagnosztika. Régi revízió:
`PREVIEW_REVISION_STALE`. A CSS és a receiver revíziója hibánál változatlan.

## Adapter

A Manifest által feloldott preview-deklaráció opcionális `studioStyles: string[]`
listát adhat, például `['/src/app.css']`. Csak projektlokális CSS-útvonal fogadható el,
URL, `..`, futtatható modul vagy protokollon küldött importlista nem. A deklaráció
`version: '1.0.0'` értéke a meglévő dev adapterhez tartozik, nem a wire-verzióhoz.

`createProjectPreview` opcionális `registryEntry` útvonalat kap a Contract erőforrásából.
A visszaadott Vite-server `wdfCatalog` tulajdonsága a serializálható metaadat.
A Registryt a projekt Vite-loadere importálja. Importhiba diagnosztika, nem üres siker.

A `/__wdf/studio?component=<id>&fixture=<id>&compare=false` dokumentum a saját
Registryjéből választ. `compare=true` minden deklarált variáns első fixture-jét
rendereli. A query sem props-ot, sem kódot nem adhat át. Érvénytelen kiválasztás
helyi hiba; a Lab chrome és Website tovább használható.

A Lab `usePreview` hookja a trusted token-ID listát is megkapja; a két frame
ugyanabból a konfigurációból külön ACK-olt snapshotot kap. A timeoutok és a
reconnect viselkedése az M3-ból megmarad. Nincs szerveroldali állapotíró API.
