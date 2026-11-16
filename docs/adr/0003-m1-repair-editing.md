# ADR-0003 — M1 javító szerkesztés és szigorú validáció szétválasztása

- Dátum: 2026-11-14
- Állapot: alkalmazott M1 javítás, a #2 PR szakmai felülvizsgálata alapján
- Előzmény: ADR-0002; `b1105d75f6e0305c409d23a3d86c082a6b7acd3f`
- Követelmény: a Foundation-hiba javítható legyen; a hibás Contract és a scope-sértés továbbra is blokkoljon.

## Probléma

Az `updateTokensInScope()` a módosítás előtt és után is teljes `resolveTokens()`
ellenőrzést végzett. A 19 px spacing emiatt 24 px-re sem volt javítható.
Csak az előzetes teljes validáció elhagyása sem elég: az utóellenőrzés más,
egymástól független hibák fokozatos javítását is blokkolná.
A javítás előtti M1-E01 és E02 regressziós teszt mindkét esetet ténylegesen reprodukálta.

## Döntés

A szerkesztési művelet eredménye és a jelölt konfiguráció érvényessége két külön állítás.
A tiszta M1 primitív kötelező Manifest-paramétert kap, amelyet minden híváskor strukturálisan
és kompatibilitás szempontjából ellenőriz. Nincs opcionális vagy megkerülhető Manifest-kapu.

A szerkeszthető bemenet külön strict szerkezeti sémát használ. Megőrzi a verzió,
token-ID, típus, scope, szerep, responsive-deklaráció és kivételrekord ismert szerkezetét;
a meglévő tokenértékeket JSON-ként olvassa. Így hibás színliterál vagy referenciagráf
sem akadályoz egy másik, egyértelműen azonosítható érték javításában.
A JSON-séma származék, nem új designforrás vagy eltérő tartós tokenformátum.

A token ID és scope összhangját a szigorú validátorral közös ellenőrzés biztosítja.
A hamisított scope, a Foundation névtér vagy az ismeretlen tulajdonosi struktúra továbbra
is blokkol. A primitív kizárólag meglévő értékeket módosít; nem írhat át ID-t, típust,
scope-ot, responsive feltételt vagy más metaadatot, és nem hoz létre tokeneket.

A változtatás lokális ellenőrzése kötelező: az új érték típusa, literál-spacingje,
card-paddingje, közvetlen referenciájának létezése/típusa és réteg-/scope-határa.
Egy hibás új érték vagy egy tiltott batch-tag az egész műveletet elutasítja;
a bemenet és a patch nem mutálódik. Más token meglévő audit-hibája nem jogosultsági hiba.

Sikeres művelet: `{ ok: true, value: { config, validation } }`.
A `config` típusa `EditableTokenConfig`, nem validált `TokenConfig`.
A `validation` a teljes, változatlanul szigorú `resolveTokens(config)` eredménye,
amely hibák esetén `ok: false` és strukturált diagnosztika. Nincs néma kivétel,
elnyelt hiba vagy részleges CSS/TS-kimenet.

A meglévő explicit responsive override értéke ugyanilyen scope-ellenőrzéssel javítható
az opcionális `{ responsive: '<név>' }` célmegadással. Ez nem hozhat létre új szabályt,
breakpointot vagy override-bejegyzést. Enélkül csak az alapértékek módosulnak.
Ez azért szükséges, hogy egy rossz responsive érték se váljon érték-API-val javíthatatlanná.

## Határok és következmények

A generátor továbbra is teljes validációt követel. Egy elfogadott javító szerkesztés
nem jelent Foundation-megfelelést vagy generálhatóságot: a fennmaradó/indirekt gráfhibák,
például egy ciklus, a `validation` mezőben hibaként jelennek meg. A közvetlen szerkesztési
scope- és referenciakorlátok ettől függetlenül blokkolnak.

Nem egyértelmű vagy hibás metaadatot ez az értékprimitív nem javít; ahhoz fejlesztői
forrásjavítás kell. A primitív nem állapottároló, nem Working Draft, Audit engine,
Undo/Redo, jóváhagyás vagy UI Lab. A jelöltet sem lemezre, sem hiteles forrásba nem menti.

A belső, még be nem olvasztott M1 API szignatúrája változik; minden meglévő hívás
migrálva és tesztelve. A tartós Manifest/tokenformátum `1.0.0` verziója változatlan.
