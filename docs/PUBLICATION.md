# Tiszta nyilvános repository — előkészítés és közzététel

Forrás: a privát fejlesztési állapot `363a39541b9ec4fa8e25a581eb20dec35b125a06` fájlfája. Az export nem tartalmaz `.git` könyvtárat, régi commitokat/szerzői metaadatokat, CI ZIP-et, trace-t, naplót, régi gépi teszteredményt vagy helyi Draftot. A tulajdonos nyilatkozata szerint a WDF munkáltatótól független magánprojekt, ismert publikálási munkaszerződéses korlátozás nélkül.

**Ez nem M6 release. R05 továbbra ismert kiadásblokkoló.** Az alkalmazások, a Foundation LOCKED, valamennyi R01/R05 teszt és súlyjelölt változatlan. A régi sikertelen bizonyítékok a privát archívumban maradnak; új repohoz friss, valódi futtatás szükséges. A nyilvános ellenőrzőlista minden sora NOT_RUN. Az importált történeti Markdown-átadások külön jelöltek, nem aktuális igazolások.

## Mi maradt meg?

Minden szükséges forrás, típus, Registry/fixture, Contract, token, generált CSS/TS, teszt, platformkonfiguráció, specifikáció, architektúra és ADR. A négy specifikáció és ellenőrző hash-eik változatlanok. A történeti szöveges átadásokat megtartottuk; a kizárt nyers fájlokra mutató linkek privát archívumhivatkozássá váltak.

Egyetlen képkészlet marad bemenetként: az opcionális M0 összehasonlító tíz saját, ellenőrzött referencia-PNG-je. Ezek nem korábbi M6 PASS-bizonyítékok; [céljuk és SHA-256](BASELINE-ASSETS.md). A teljes M6/R01/R05 kapu friss rendereléseket készít, nem ezekre támaszkodik.

A gépi [M6 ellenőrzőlista](reports/M6-acceptance-matrix.json) mind az 53 követelményt és a tesztmintákat megőrzi. A hiányzó régi bizonyítékot semmilyen új PASS nem helyettesíti.

## Licencek és csomagolás

A saját kód jelenlegi `UNLICENSED` állapota megmarad; a [LICENSE](../LICENSE) minden jog fenntartva nyilatkozatot ad. Nyilvános GitHub-tárolás nem jelent általános újrafelhasználási engedélyt. Nyílt forrású licenc csak külön tulajdonosi döntéssel alkalmazható. A harmadik felek feltételei változatlanok: [értesítések](../THIRD_PARTY_NOTICES.md), [pontos leltár](publication/dependencies.json).

A packer a saját LICENSE-t is csomagolja. Mindkét Vite-app production buildje `THIRD-PARTY-LICENSES.md` fájlt készít a tényleges bundle-höz; ezt együtt kell szállítani a builddel. Ez buildmetaadat, nem app-/arculat-/QA-változtatás. A rendszerfontok fájljai nem kerülnek az exportba.

Az előkészített, javasolt cél `BenHRVTH/web-development-foundation-public`, `main` ággal. Ilyen repository nem lett létrehozva. Más név választásakor közzététel előtt a `tools/build-packages.ts` repository URL-jét és az öt `packages/*/README.md` dokumentációs URL-jét együtt frissítsd; ismételd meg a helyi csomag-/hash-ellenőrzést. A történeti privát URL-ek nem új távoli függőségek.

## A nyilvános Actions biztonsági határa

A workflow main-pushra, main felé nyitott PR-re és kézi indításra képes. Linux és Windows külön, fail-fast nélkül fut; a korábbi `verify:m6` teljes platformos ellenőrzési listája és sikertelenségi feltételei megmaradnak. Linux 50, Windows 35 perc felső korláttal fut. Az ismert R05-hiba piros CI-t okozhat; ezt tilos continue-on-errorral vagy tesztkihagyással zölddé tenni.

Mindhárom action teljes upstream commit-SHA-ra rögzített. Csak `contents: read`; nincs explicit secret, OIDC, write-token, self-hosted runner, `pull_request_target`, privilegizált `workflow_run`, cache-visszatöltés vagy fork-artifactot fogyasztó kiadási lépés. Checkout nem tárol hitelesítő adatot; npm-ci nem futtat install-scripteket. A böngészőt kifejezett, helyi CLI-parancs telepíti. A run parancsok nem interpolálnak PR-címet vagy branchnevet shellkódba.

A PR-kód ettől még nem megbízható: tesztekben tetszőleges kódot futtathat az eldobható hosted runneren. Ezért a repositoryszintű jóváhagyási beállítás az alábbi kötelező külső feltétel. A YAML önmagában nem tudja ezeket az adminbeállításokat létrehozni vagy igazolni.

A friss artifact diagnosztika, nem automatikusan megbízható release candidate. Névben platform/esemény/commit/run; PR-megőrzés 7, egyéb 14 nap. Mindig ellenőrizd a run eseményét, head/base SHA-ját és a tényleges kapueredményt. Fork-PR artifactot ne promotálj release-be. Nincs csomag-, Release- vagy tag-publikálás. Korábbi Actions ZIP nem kerül át.

A friss Windows-run nem támaszkodik előre bemásolt Linux-képekre. A verify eszköz csak ténylegesen létező friss M3–M5 képkönyvtárakat archivál; ez nem változtat meg tesztet vagy platform-lefedettséget. Windows továbbra hordozható tárolási/journal és valódi artifact-fogyasztói M6 futtatást végez; a Linux-only tesztek nem kapnak Windows PASS-t.

## Pontos közzétételi sorrend — csak külön jóváhagyás után

1. Tekintsd át a helyi átadási jelentést, eltérés-/SHA-jegyzéket, a licencpolitikát és a megmaradt R05-blokkolót. Válaszd ki a végleges repositorynevet; szükség esetén frissítsd a fenti hat metadatahivatkozást.
2. GitHubon hozz létre egy **üres** új repository-t a kiválasztott néven. Ne másold/importáld az eredetit, ne forkold, ne inicializáld README/licenc/gitignore fájllal. Ha már nyilvánosként hozod létre, üres állapotban előbb tiltsd le az Actionst; első push előtt még nincs futtatható workflow. Az eredeti repository maradjon privát és változatlan.
3. Tulajdonosi beállítások: Actions esetén csak a három jóváhagyott, SHA-val rögzített action; minden külső hozzájáruló fork-futtatásához jóváhagyás. Ne engedélyezz írótoken- vagy secret-átadást forkoknak, illetve Actions általi PR-jóváhagyást. Ehhez a CI-hez ne adj repository-, environment- vagy szervezeti titkot. Csak GitHub-hosted runnerek szükségesek. Ellenőrizd és rögzítsd a tényleges beállításokat; ezek még NOT_RUN.
4. Csak a tiszta forráskönyvtárból hozz létre új, egyszülő nélküli Git-történetet. Az alábbi parancsok példaértékű, tudatosan csak a **javasolt célra** mutató közzétételi parancsok; az előkészítés során nem futottak:

   ```sh
   cd /workspace/wdf-public-ready
   git init -b main
   git config --local user.name "WDF maintainers"
   git config --local user.email "125744774+BenHRVTH@users.noreply.github.com"
   git add --all
   git diff --cached --check
   git commit -m "Initialize clean WDF public snapshot"
   git rev-list --all --count
   git log -1 --format=fuller
   git remote add origin https://github.com/BenHRVTH/web-development-foundation-public.git
   git push -u origin main
   ```

   Az első történetben pontosan egy root commit legyen, ne legyen második távoli repository, régi ref, tag vagy alternates. A nyilvános noreply címet a fiók saját GitHub-beállításaiban is ellenőrizd; személyes/céges címet ne használj. Ne adj hozzá `--mirror` vagy régi remote-ból fetch lépést.

5. A feltöltött fájlokat és történetet külön ellenőrizd. Mivel Actions le volt tiltva, az első pushhoz nincs friss CI-eredmény; ne minősítsd PASS-nak. Konfigurálj main branch-védelmet/rulesetet: PR, review, erőltetett push és törlés tiltása; a két `M6 / Linux` és `M6 / Windows` checket kötelezőként kezeld. A checknevek az UI-ban esetleg csak az első kézi futás után jelennek meg; ekkor fejezd be a kötelezővé tételt, bármely PR elfogadása előtt. R05 miatt az M6-feloldó PR előtt ezek várhatóan nem zöldek.
6. A beállítások ellenőrzése után engedélyezd az Actionst, és a `workflow_dispatch` segítségével indítsd az első kétplatformos kaput a feltöltött main commiton. Ez már külön, későbbi művelet, nem része a helyi előkészítésnek. A standard publikus hosted compute előnye nem jelent korlátlan párhuzamosságot, artifactmegőrzést vagy abuse-keret felmentést.
7. Vizsgáld meg az eredményeket és a friss artifactok tartalmát; új head/run/környezet alapján vezesd át az elfogadási mátrixot. A hibákat, R05-öt és kézi NOT_RUN tételeket őszintén őrizd meg. Npm-publikálás, GitHub Release, végleges tag és M6-elfogadás továbbra külön feladat.

## Helyi ellenőrzési korlát

A helyi előkészítés nem állíthat új natív Windows-/GitHub-fork-policy-/teljes M6 PASS-t. A teljes Linux- és Windows-kapu végrehajtása NOT_RUN, amíg valóban le nem fut. A meglévő Windows fsync/ACL, kézi WCAG/képernyőolvasó és R05 korlátok változatlanok. A privát archívumban megőrzött sikertelen bizonyítékokat ez az export nem törli.
