# M1 publikus API és szerződések

Az API-k a privát workspace-ben használhatók Node 24 / strict TypeScript alatt.
A csomagok TS-forrást exportálnak; ez még nem publikálható disztribúció.

## Modulhatárok

| Import                 | Tényleges exportok                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@wdf/foundation`      | `ROOT_REFERENCE_PX`, `SPACING_PX`, `CARD_PADDING_PX`, `FOUNDATION_RULES`; `FoundationRule`, `RuleCategory`, `ExceptionDeclaration` típusok                                                                                                                                                                                                                      |
| `@wdf/core`            | `manifestSchema`, `validateManifestStructure`, `validateManifest`, `CONTRACT_VERSION`, `contractJsonSchemas`; `tokenIdSchema`, `tokenScopeSchema`, `tokenSchema`, `tokenConfigSchema`, `editableTokenConfigSchema`, `literalSchemas`, `resolveTokens`, `foundationTokens`, `sameScope`, `updateTokensInScope`; `fromSchema`, `unwrap`, `WdfError`; ezek típusai |
| `@wdf/core/node`       | `loadProject`, `ResolvedProject` — kizárólag Node, fájlrendszer                                                                                                                                                                                                                                                                                                 |
| `@wdf/core/generation` | `generateTokens`, `canonicalJson`, `cssVariableName`, `cssValue`, `GeneratedArtifacts` — Node, SHA-256                                                                                                                                                                                                                                                          |

A Core további exportált típusai: `Diagnostic`, `Result<T>`, `ProjectManifest`,
`RegistryContract`, `PreviewContract`, `Token`, `TokenConfig`, `TokenType`,
`TokenValue`, `EditableTokenConfig`, `TokenEdit`, `TokenEditOptions`, `ResolvedToken`, `ResolvedTokens`, `QualityStatus`, `QualityEvidence`.
A QA-típus adatmodell; nincs eredményfrissesség-ellenőrzés vagy Approval QA.

```ts
import { resolveTokens, unwrap, validateManifest } from '@wdf/core';
import { loadProject } from '@wdf/core/node';
import { generateTokens } from '@wdf/core/generation';

const project = unwrap(await loadProject('/absolute/project'));
const tokens = unwrap(resolveTokens(project.tokenInput));
const artifacts = unwrap(generateTokens(project.tokenInput));
// artifacts.css, artifacts.typescript, artifacts.sourceDigest
// Sem a betöltés, sem a generálás nem módosítja a bemenetet.
void tokens;
void validateManifest;
```

## Project Manifest 1.0.0

A működő példa: `apps/task-manager/wdf/project.json`.
Gépi strukturális séma: [manifest.schema.json](schemas/manifest.schema.json).
A séma a runtime Zod-sémából generált származék; kézzel nem szerkeszthető.

| Mező                | Szerződés                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`     | M1-ben pontosan `1.0.0`; más verzió kompatibilitási hiba                                                         |
| `project`           | `id`: kisbetűvel kezdődő ASCII slug; `name`: nem üres megnevezés                                                 |
| `adapter`           | `id: react-vite`, `version: 1.0.0` — protokollkompatibilitás                                                     |
| `designTokens`      | Projektre relatív `entryPoint`; `format: wdf-tokens@1`; JSON bemenet                                             |
| `componentRegistry` | `entryPoint` és `availability: deferred`, `milestone: M2`; vagy `availability: configured`                       |
| `preview`           | `entryPoint` és `availability: deferred`, `milestone: M3`; vagy `configured`, `origin`, pozitív egész `widths[]` |
| `qa.hooks[]`        | Legalább egy egyedi `id`, `kind: static / browser`, nem üres argv `command[]`                                    |

Minden objektum strict: ismeretlen mező hiba. A hivatkozott fájlútvonalak nem
lehetnek abszolútak és nem tartalmazhatnak szülőkönyvtárra lépést.
A QA-parancs deklaráció; M1 nem hajtja végre és nem tekinti sikeres QA-nak.
A példaparancsok a repository gyökerében futtatandók; nincs implicit hook-végrehajtási cwd.

1. `validateManifestStructure(unknown): Result<ProjectManifest>` csak szerkezetet vizsgál.
2. `validateManifest(unknown)` ehhez hozzáadja a verzió- és adapterkompatibilitást, a hook-ID-k egyediségét.
3. `loadProject(root, manifestPath = 'wdf/project.json')` validál, JSON-t olvas,
   valós útvonalat ellenőriz és feloldási státuszt ad. A deferred fájl hiánya nem hiba;
   a configured fájl hiánya igen. Modulok végrehajtása, Registry fixture- és preview-protokoll
   ellenőrzése nem része ennek a lépésnek.
4. `resolveTokens(project.tokenInput)` külön szemantikus tokenellenőrzés.
5. A tényleges komponens-/böngésző-/a11y működés későbbi, önálló QA.

## Tokenformátum és feloldás

A teljes példa: `apps/task-manager/wdf/tokens.json`.
Strukturális séma: [tokens.schema.json](schemas/tokens.schema.json).
A JSON Schema **nem** foglalja magában a referencia-, ciklus-, scope-, spacing-,
verziókompatibilitási és fájlrendszer-ellenőrzéseket. A mérvadó kapu a runtime API.

```json
{
  "schemaVersion": "1.0.0",
  "tokens": {
    "primitive.brand": {
      "type": "color",
      "scope": { "kind": "global" },
      "value": "#7252c1"
    },
    "semantic.action": {
      "type": "color",
      "scope": { "kind": "global" },
      "value": { "ref": "primitive.brand" }
    },
    "component.card.padding": {
      "type": "spacing",
      "role": "card-padding",
      "scope": { "kind": "family", "family": "card" },
      "value": { "ref": "foundation.card.spacious" }
    },
    "component.card.featured.padding": {
      "type": "spacing",
      "role": "card-padding",
      "scope": { "kind": "variant", "family": "card", "variant": "featured" },
      "value": { "ref": "component.card.padding" }
    }
  },
  "responsive": {
    "tablet": {
      "minWidth": 768,
      "overrides": {
        "component.card.padding": { "ref": "foundation.card.comfortable" }
      }
    }
  }
}
```

A token ID kisbetűs ASCII szegmensekből áll, ponttal elválasztva; kötőjel és
szám engedélyezett. `primitive.*` és `semantic.*` scope-ja `global`.
A komponens-ID pontosan `component.<family>.<slot>` vagy
`component.<family>.<variant>.<slot>`, és egyezik az explicit scope-pal.
Nincs példányszintű scope. A `foundation.*` névtér foglalt, nem projektinput.

| Típus        | Literál                                                               | CSS-kimenet      |
| ------------ | --------------------------------------------------------------------- | ---------------- |
| `spacing`    | Foundation-skálán lévő nem negatív szám, referencia px                | `value / 16` rem |
| `dimension`  | Tetszőleges véges, nem negatív referencia px                          | `value / 16` rem |
| `color`      | CSS hex: 3/4/6/8 karakter, bármely szín és alfa                       | változatlan      |
| `fontFamily` | Literál családnévlista; Unicode név, idézőjel és fallback megengedett | változatlan      |
| `fontWeight` | Egész 1–1000                                                          | egység nélküli   |
| `number`     | Véges szám                                                            | egység nélküli   |
| `duration`   | Véges, nem negatív ms                                                 | ms               |

Minden típus fogadhat `{ "ref": "token.id" }` értéket; csak pontosan egyező típusú
cél engedélyezett. A `dimension` geometriai méret, nem spacing-kiskapu: a térköz
szerepű paramétert `spacing` típusúnak kell deklarálni. M1 nem elemzi a tetszőleges
alkalmazás-CSS összes tulajdonságának tokenhasználatát. A `card-padding` szerep
kifejezetten spacinget és a 16/24/32 értékek egyikét követeli meg.

Hivatkozási irány: Foundation → nem hivatkozik projektértékre;
primitív → Foundation/primitív; szemantikus → Foundation/primitív/szemantikus;
komponens → az előbbiek vagy a megengedett komponens-scope.
Család csak saját családra; variáns saját variánsra és saját családra mutathat.
Fordított rétegirány, más család vagy más variáns elutasítva.

`resolveTokens(input)` visszaadja a validált másolatot (`config`), a típusos feloldott
alaptokeneket (`base`) és a növekvő `minWidth` szerint kumulált, újrafeloldott
`responsive[]` állapotokat. Az alapkonfiguráció minden szélességen érvényes;
a responsive mapen kívüli eltérés hibás. Azonos minWidth nem megengedett.
Az override kizárólag meglévő projekttokenre irányulhat és újra típus-/scope-/skálaellenőrzött.

## Scope-biztos javító szerkesztés

```ts
updateTokensInScope(manifest, input, scope, changes, options?): Result<TokenEdit>
// TokenEdit: { config: EditableTokenConfig; validation: Result<ResolvedTokens> }
// options: { responsive?: string }
```

**M1 API-változás:** a Manifest új, kötelező első paraméter; a visszaadott `value`
most külön `config` és `validation` mezőt tartalmaz. Korábbi hívásokat migrálni kell.
A perzisztált Manifest és tokenformátum verziója továbbra is `1.0.0`.

Minden hívás ellenőrzi a Manifest szerkezetét, verzióját és adapterkompatibilitását.
Hiányzó/hibás Manifest vagy inkompatibilis Contract esetén nincs szerkesztési eredmény.
Az ezt követő szerkesztési struktúra strict, de a már meglévő tokenértékek JSON-értékek:
azok hibás típusa/literálja, feloldhatatlan referenciája vagy más szemantikus hibája
nem blokkol egy független javítást. A szerkezeti séma:
[editableTokens.schema.json](schemas/editableTokens.schema.json), runtime-forrása
`editableTokenConfigSchema`. Ez önmagában sem szerkesztési engedély, sem megfelelőségi bizonyíték.

A `changes` továbbra is `Record<string, TokenValue>`. Csak már létező token pontosan
egyező scope-jú **értékét** módosíthatja. A token ID és a scope közötti összhang,
a Foundation védelme és az új érték típusa külön ellenőrzött. Új literál spacing csak
skálaérték, card-padding csak 16/24/32 lehet. Az új közvetlen referencia céljának
léteznie kell, típusa és réteg-/scope-kapcsolata megengedett kell legyen.
A batch bármely tagjának megsértésekor az egész művelet elutasított, nincs részleges eredmény.

`options` nélkül csak az alap tokenérték változik. `{ responsive: 'tablet' }` esetén
kizárólag a már deklarált `responsive.tablet.overrides` meglévő értékei javíthatók,
ugyanazon token-scope szerint. Nincs implicit breakpoint, új override, metaadatátírás
vagy másik scope-ba írás.

Az elfogadott művelet nem állítja, hogy a teljes konfiguráció érvényes:

```ts
import { updateTokensInScope, unwrap } from '@wdf/core';

const first = unwrap(
  updateTokensInScope(
    manifest,
    invalidConfig,
    { kind: 'global' },
    { 'semantic.gap': 24 },
  ),
);
// first.config tartalmazza a javítást, akkor is, ha más hibák még fennállnak.
if (!first.validation.ok) {
  console.log(first.validation.diagnostics);
}
const second = unwrap(
  updateTokensInScope(
    manifest,
    first.config,
    { kind: 'global' },
    { 'semantic.action': { ref: 'primitive.brand' } },
  ),
);
if (second.validation.ok) {
  const validatedConfig = second.validation.value.config;
  // Csak itt bizonyított a teljes tokenvalidáció sikere.
  void validatedConfig;
}
```

A teljes `resolveTokens()` eredménye minden elfogadott műveletnél visszakerül a
`validation` mezőbe, a fennmaradó ciklusokkal, indirekt referenciahibákkal és más
diagnosztikával együtt. Az input és a patch változatlan, a jelölt másolatot kap.
A `generateTokens(config)` továbbra is szigorúan újraellenőriz és hibás jelöltből
semmilyen CSS/TS-artifactot nem ad vissza. Későbbi további módosítás után újra kell validálni.

Hibás verzió, hiányzó tokenazonosság/típus/scope, hamisított tulajdonosi metaadat
vagy hibás responsive fejléc továbbra is blokkol: ezeket nem lehet egy értékcserével
biztonságosan kijavítani. Nincs automatikus mentés, jóváhagyás, Draft vagy Undo.
A részletes döntés: [ADR-0003](adr/0003-m1-repair-editing.md).

## Kivételkezelési szerződés

Opcionális `exceptions[]`: `id`, ismert WDF LOCKED `ruleId`, konkrét `tokenIds[]`,
`reason`, `requestedBy`, `evidence[]`. A külső döntés opcionális rekordja:
`approval: { approvedBy, approvedAt (ISO UTC), decisionId }`.
Az azonosítók egyediek, a céloknak létezniük kell. MUST vagy CREATIVE szabályra
nem kérhető WDF-kivétel. A rekord dokumentálás, **nem felmentés**: még jóváhagyási
adat mellett is hibát ad a 19 px spacing. M1-ben nincs automatikus vagy kézi
kivételaktiváló API. A Foundation konstansok kivétellel sem írhatók át.

## Generálás és driftvédelem

`generateTokens(input): Result<GeneratedArtifacts>` mindig validál és felold;
csak siker esetén ad `css`, `typescript`, `sourceDigest` értékeket. Nem ír fájlt.
A generált TS literal mapjeiből származik `TokenId` és `CssVariable`.
A reszponzív map a TS-ben is jelen van. Minden CSS media blokk teljes feloldott
állapotot tartalmaz, így az indirekt függők is frissülnek.

A nevek stabilak: `semantic.color.text` → `--wdf-semantic--color--text`.
Szegmensen belüli `--` foglalt és generálási hiba; nincs néma ütközés.
Kulcsrendezés ASCII szerinti; nincs időbélyeg vagy környezetfüggő adat a kimenetben.
A SHA-256 a validált, kanonikus JSON-forrást köti mindkét kimenethez.

```sh
npm run generate:tokens
npm run check:generated
# Más projekt JSON Contractjának integrációs kimenete:
node tools/generate-m1.ts --project /absolute/project
node tools/generate-m1.ts --project /absolute/project --check
```

A CLI célja a projekt `src/generated/tokens.css` és `tokens.ts` fájlja. Az alapértelmezett
repository-példa a `docs/schemas/*.schema.json` fájlokat is generálja/ellenőrzi.
A CLI a rögzített Prettierrel formáz; a könyvtári generátor formázástól függetlenül determinisztikus.
`--check` hiányzó/eltérő kimenetnél hibakóddal lép ki, nem javítja azt.
A `predev`, `prebuild` és `verify:m1` ezt ellenőrzi. A generált fájl nem bemeneti konfiguráció,
kézi módosítása a következő kapun elbukik. React-forrást a generátor nem olvas vagy módosít.

## Diagnosztika

`Result<T>`: `{ ok: true, value }` vagy `{ ok: false, diagnostics[] }`.
`Diagnostic`: `code`, `phase`, `path`, `message`, opcionális `ruleId`, `related[]`.
`unwrap` hibánál `WdfError`-t dob az eredeti strukturált diagnosztikával.

| Fázis         | Fő hibakódok                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| structure     | `SCHEMA_INVALID`, `QA_HOOK_DUPLICATE`                                                                                                                            |
| compatibility | `CONTRACT_VERSION_UNSUPPORTED`, `ADAPTER_INCOMPATIBLE`                                                                                                           |
| resolution    | `RESOURCE_UNRESOLVED`, `RESOURCE_JSON_INVALID`                                                                                                                   |
| tokens        | `TOKEN_NAMESPACE`, `TOKEN_SCOPE`, `TOKEN_VALUE_TYPE`, `TOKEN_REFERENCE_UNKNOWN`, `TOKEN_REFERENCE_TYPE`, `TOKEN_REFERENCE_SCOPE`, `TOKEN_CYCLE`                  |
| tokens        | `FOUNDATION_OVERRIDE`, `SPACING_OUT_OF_SCALE`, `CARD_PADDING_TYPE`, `CARD_PADDING_INVALID`, `EDIT_SCOPE_FORBIDDEN`                                               |
| tokens        | `RESPONSIVE_TARGET_UNKNOWN`, `RESPONSIVE_AMBIGUOUS`, `EDIT_RESPONSIVE_UNDECLARED`, `EXCEPTION_DUPLICATE`, `EXCEPTION_RULE_FORBIDDEN`, `EXCEPTION_TARGET_UNKNOWN` |
| generation    | `CSS_NAME_COLLISION`, `GENERATED_OUTPUT_STALE`, `GENERATED_SCHEMA_STALE`; CLI IO-hibánál `GENERATION_IO_ERROR`                                                   |

A sémahibák path-ja a tényleges mezőt jelöli; a ciklus `related[]` mezője a ciklus útvonala.
A QA PASS nem következik sem egy sikeres Manifestből, sem egy érvényes tokenkonfigurációból.
