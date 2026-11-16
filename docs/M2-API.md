# M2 — Task Manager és Component Registry

## Alkalmazás

A repository gyökerében `npm ci`, majd `npm run dev`. Statikus önálló build:
`npm run build`, utána `npm run preview`. Az alkalmazás nem igényel WDF-szolgáltatást,
Labot, backendet, bejelentkezést vagy külső hálózatot a betöltött asseteken túl.

Kezdéskor hat determinisztikus feladat van, kettő kész. A címlink a teljes részletet
nyitja, a checkbox teljesít/visszavon, az Állapot szűrő Minden/Nyitott/Kész nézetet ad.
Új feladatot az Új feladat gomb, módosítást a részlet Szerkesztés gombja indít.
A cím kötelező, a leírás opcionális. A mentés a listára vezet és jelzi az eredményt.
Azonosítók stabilak egy munkameneten belül; újratöltés a kezdőadatokat állítja vissza.

## A hét React-komponens publikus props API-ja

Minden komponens név szerinti export az `apps/task-manager/src/components` alatt.
A props-interfészek ugyanott exportáltak. React 19 ref prop támogatott, nincs második
komponenskönyvtár vagy csak bemutatásra készített implementáció.

| Komponens / kategória   | Kötelező props                                                     | Opcionális props / alapérték                                                                                                       |
| ----------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Button / Primitive      | `children: string`                                                 | `variant: primary/secondary/quiet` (primary), `disabled`, `busy` (false), `icon`, `type: button/submit` (button), `onClick`, `ref` |
| TextInput / Primitive   | `label`, `value: string`, `onChange`                               | `multiline`, `required`, `disabled` (false), `error`, `hint`, `maxLength`, `inputRef`                                              |
| Select / Primitive      | `label`, `value`, `options: {value,label,disabled?}[]`, `onChange` | `disabled` (false); tudatosan natív OS popup                                                                                       |
| Checkbox / Primitive    | `label`, `checked`, `onChange`                                     | `disabled`, `labelHidden` (false)                                                                                                  |
| TaskCard / Composite    | `task: Task`, `onToggle(id)`, `href`                               | `density: compact/comfortable/spacious` (comfortable)                                                                              |
| Dialog / Composite      | `open`, `title`, `description`, `children`, `onClose`              | nincs; szülő kezeli az open állapotot                                                                                              |
| StatusBadge / Primitive | `completed: boolean`                                               | nincs; állapotot szöveg és Lucide ikon is jelöl                                                                                    |

A TextInput label/help/error ID-kat React useId készíti. Multiline esetén a textarea
alapból megfelelő magasságú, nem átméretezhető és belül görgethető; a teljes érték megmarad.
A Checkbox és Select kontrollált mező: a tulajdonosnak frissítenie kell az értéket az
eseményre. A Button busy állapota letiltja a gombot, megtartja a felirat geometriáját
és hozzáférhető nevét. A Dialog natív showModal + explicit Tab-kör, Escape, inert
háttér, scroll lock és fókusz-visszaadás. Nem ment adatot és nem dönt az elvetésről.

A `Task` readonly `id/title/description/completed`; `TaskValues` a form szerkeszthető
értéke. `filterTasks` és `validateTask` tiszta appfüggvények, nem WDF-szerződések.

## Registry-formátum

Belépési pont: `apps/task-manager/wdf/registry.ts`, a meglévő Manifest
`componentRegistry.availability: configured` mezőjével. A Registry fejlesztői modul;
a production app közvetlenül a komponenseket importálja, Registry nélkül.

`@wdf/adapter-react` exportok:

- `defineComponent<P extends object>(Registration<P>): Registration<P> & RegistryEntry`
- `resolveRegistry(manifest, tokenInput, entries): Result<RegistryResolution>`
- `FixtureBoundary`, `FixtureBoundaryProps`
- `Registration<P>`, `Fixture<P>`, `RegistryEntry`, `RegistryResolution`

A `Registration<P>` mezői: stabil slug `id`, `name`, `category: Primitive/Composite`,
`family`, valódi `component: ComponentType<P>`, `propsSchema: z.ZodType<NoInfer<P>>`,
`variants[]`, `states[]`, `tokens: { family: TokenId[], variants: Record<variant,TokenId[]> }`,
`fixtures: Fixture<NoInfer<P>>[]`.

A `Fixture<P>` mezői: `id`, `name`, `variant`, `state`, `props: P`.
A schema és fixture ugyanazt a komponensprops-típust követi; a negatív TS-teszt
ellenőrzi, hogy például `disabled: 'yes'` fordítási hiba marad.
A projekt tokenlistái a generált TokenId unionon keresztül is ellenőrzöttek.

A `RegistryEntry` heterogén tároláshoz megőrzi a komponensreferenciát és két zárt
műveletet ad: `checkProps(unknown)` és `renderFixture(fixtureId)`.
A `renderFixture` előbb ellenőrzi a props-ot, majd a regisztrált implementációból
készít React-elemet; nem alternatív renderert vagy utánzatot használ.
A visszaadott elem tényleges React-renderelése külön lépés.

```ts
import { resolveRegistry } from '@wdf/adapter-react';
import { unwrap } from '@wdf/core';
// manifest/tokens: az aktuális projekt egyetlen hiteles Contract-bemenete
const resolved = unwrap(resolveRegistry(manifest, tokens, componentRegistry));
const entry = resolved.entries.find((item) => item.id === 'task-card');
if (entry) {
  const element = unwrap(entry.renderFixture('spacious'));
  // React render: <FixtureBoundary key="task-card/spacious"
  //   componentId="task-card" fixtureId="spacious">{element}</FixtureBoundary>
  void element;
}
```

A példában említett importált projektváltozók a projekt Registry moduljából és JSON
belépési pontjaiból jönnek; nincs implicit fájlrendszer-hozzáférés a böngészős adapterben.

## Validáció és lokalizált hibák

A resolver a meglévő Core `validateManifest` és `resolveTokens` függvényeit használja.
Hibás Contract/token esetén `ok: false`. Érvényes projektnél `ok: true`,
`value: {entries, diagnostics}`: az entries kizárólag az egészséges komponensek listája.
A lokális diagnosztikák jelenléte nem tévesztendő össze teljes sikerrel; a projekt
M2-tesztje megköveteli az üres diagnosztikalistát és mind a hét bejegyzést.

Ellenőrzött: slug, kategória, implementáció, egyedi komponens/fixture/variáns/állapot,
lefedett variánsok és állapotok, fixture metaadat, props-schema, tokenlétezés és pontos
family/variant scope. Dupla component ID esetén mindkét bejegyzés karanténba kerül.
Példa: `REGISTRY_PROPS_INVALID $.registry["button"].fixtures["broken"].props["disabled"]`.

A renderkivételt `FixtureBoundary` fogja: lokalizált hibaüzenet és opcionális
`onError({componentId,fixtureId,message,componentStack})`. Fixtureváltáskor a boundary
React key-je is változzon; ez állítja vissza a hibás fixture lokális állapotát.
React Error Boundary nem fog el SSR-, eseménykezelő- vagy tetszőleges async hibát;
M2 a böngészős komponensrenderelést izolálja. Importhibát a modulbetöltő/tesztfuttató
jelez; nincs általános dinamikus plugin loader vagy import-sandbox.

## Fixture-használat és tesztelés

A fixture-k rögzített magyar tartalmat, feladatinformációt és determinisztikus noop
callbacket használnak; a kontrollált állapot nem változik önmagától. A funkcionális
tesztek a valódi appban, az izolált eseménytesztek teszttulajdonos állapotával
vizsgálják ugyanazt a komponenst. Nincs Date.now, random adat vagy távoli API.

`npm run test:fixtures` külön tesztoldalt indít a 5174-es loopback porton, például
`/?component=task-card&fixture=spacious`. Ez egyetlen kiválasztott fixture tesztbetöltője,
nem komponensgaléria vagy Studio UI, és nem kerül a production buildbe.
A teljes kapu saját maga indítja és leállítja a három tesztszervert.

`npm run verify:m2`: M2 CSS/forrás-integritás → M1 driftkapu → M0 statikus/unit/build
kapu → minden böngészőteszt. A korábbi M1 headless szerződéses tesztek megmaradtak;
a bootstrap-specifikus vizuális elvárások az új referenciaprojekthez igazodnak.
