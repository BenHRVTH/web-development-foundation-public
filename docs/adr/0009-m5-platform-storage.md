# ADR-0009 — M5 natív útvonalak és platformfüggő tartósság

Dátum: 2026-11-15. Forrás: PR #6 szakmai felülvizsgálat, Windows tárolási blocker.
Kiegészíti az ADR-0007/0008 szerződését; nem módosít Foundation- vagy tokenfeltételt.

## Útvonalak és első indítás

A fájlrendszerhez natív `node:path` útvonalat használunk. A containment ellenőrzése
`relative`, `isAbsolute`, `sep` alapján történik; a szomszédos prefix, `..` komponens,
Windows másik meghajtója vagy másik UNC-megosztása nem gyerekútvonal. A kis-/nagybetű
eltérését Windows alatt a `path.relative` kezeli, nem nyers sztring-összehasonlítás.
A Core fájlerőforrás-feloldójának `..` ellenőrzése is natív elválasztót használ,
így egy Contract-erőforrás junctionje sem léphet ki a projektből indításkor.

A hiányzó `.wdf-lab`, projektkönyvtár és explicit `WDF_LAB_STORAGE_DIR` a legközelebbi
létező, ellenőrzött őstől jön létre. Minden meglévő komponenst `lstat` ellenőriz;
symlink és Windows junction tiltott. A meglévő ős `realpath` azonosságának vizsgálata
az ősökön keresztüli átirányítást is felismeri. A böngésző továbbra sem választhat
fájlútvonalat. Az explicit külső tároló kizárólag a megbízható indítási környezetből
származhat. Azonos helyi felhasználó versenyző, rosszindulatú fájlrendszermódosítása
továbbra sem része a fenyegetési modellnek; ez nem kernel-szintű `openat` sandbox.

A Preview indítás fájl-URL-jét `fileURLToPath` alakítja natív útvonallá. Csak a Vite
modulazonosító-határán használunk `normalizePath`-ot; a `.pathname` nem fájlrendszerút.
Így a Windows meghajtó, szóköz és ékezet nem marad hibás URL-kódolt alakban.

## Atomi csere és visszaállítás

Mindkét platformon azonos könyvtárban, `wx` módban létrehozott ideiglenes fájlba írunk,
majd a fájlt `FileHandle.sync()` után lezárjuk, és natív `rename` cseréli a célt.
Nincs célfájl-törlés vagy másolásos fallback sikertelen rename esetén. Windowsos
sharing violation, ACL- vagy antivírus miatti hiba sem minősül sikernek.

A checksumolt journal, a négy zárt célfájl, a state utolsó commit-markere, az előző
Baseline megőrzése, a hibás/idegen adatnál blokkoló helyreállítás és a soros műveletek
követelménye változatlan. Folyamatmegszakítás után a journal régi vagy teljes új
állapotot állít helyre. A fault injection folyamatmegszakítást modellez, nem fizikai
áramszünetet. A Linux valódi SIGKILL és `/proc` tesztje külön megmarad.

## Tartóssági képesség és korlát

| Környezet                                    | Szerződés                                                                                                                                                                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux, helyi fsync/rename képes fájlrendszer | Fájl-fsync + rename + szülőkönyvtár-fsync. Az új könyvtárak bejegyzéseit és a helyreállítás törléseit is könyvtár-fsync követi. A sync hibája továbbterjed; nincs elnyelt EIO/EPERM.                                                                                    |
| Natív Windows/Node, helyi NTFS               | Fájl-fsync (`FlushFileBuffers`) + natív rename + ugyanaz a journal-helyreállítás. A Node könyvtármegnyitása/fsync-je nem ad a Linuxszal azonos tartóssági API-t, ezért könyvtár-fsync-et nem állítunk. Áramszünet vagy OS-összeomlás utáni tartósság **nem garantált**. |

A Windows-korlát nem hibakód alapján elnyelt kivétel: előre meghatározott platformág,
`STORAGE_DURABILITY_LIMIT` figyelmeztetéssel a Lab indulási naplójában és a közös
állapotdiagnosztikában. A mentés nem jelent jóváhagyást, a figyelmeztetés pedig nem
helyettesít sikeres QA-t. A jóváhagyás folyamatmegszakítási konzisztenciát biztosít;
aki a Linux könyvtár-fsync szerződését igényli, azon a támogatott környezeten fusson.

Windows alatt a POSIX 0600/0700 mód nem helyettesíti az NTFS ACL-t: a projekt és a
tároló a megbízható felhasználó megfelelően védett könyvtárában legyen. Hálózati,
megosztott/többgépes, felhőszinkronizált tároló és egyéb Windows fájlrendszer nincs
igazolva. A Windows PID-újrafelhasználásnál élő/nem ellenőrizhető tulajdonost nem
veszünk át; nincs Linux `/proc`-alapú folyamatkezdési vagy zombi-azonosság.

## Ellenőrzés

`npm run test:m5:storage`: külön Vitest konfiguráció, natív útvonalak, valódi két
Vite/HTTP szerver indítás és restart, hiányzó tároló, projektgyökéren kívüli explicit
tároló, history/Undo/Redo, Windows drive/UNC containment, symlink/junction,
sérült mentés, byte-pontos generált CSS/TS, jóváhagyás, öt journal-megszakítás,
íráshiba és a könyvtár-fsync hibájának el nem nyelése.

A `windows-latest` job csak ezt a hordozható csomagot futtatja, Linux SIGKILL,
`/proc`, Python vagy teljes böngészős mátrix nélkül. A teljes Linux `verify:m5`
ugyanezeket a hordozható teszteket is futtatja az összes korábbi kapu mellett.
