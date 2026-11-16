# Hangár viselkedés

hu-HU; helyi, szinkron bemutatóadatok, nincs hálózati foglalás vagy személyesadat-tárolás.

| Capability | Canonical owner     | Source of truth          | Allowed variants         | Verification        |
| ---------- | ------------------- | ------------------------ | ------------------------ | ------------------- |
| Form       | Reservation + Field | Ez a szerződés           | Helyfoglalás, noValidate | M6 consumer browser |
| Scrollbar  | src/app.css         | DESIGN.md                | document / dialog        | M6 geometry         |
| Toast      | Notice              | Ez a szerződés           | tartós role=status       | M6 consumer browser |
| CRUD       | App + Reservation   | Helyi foglalási bemutató | create, cancel           | M6 consumer browser |

A Helyet kérek a választott program dialógusát nyitja meg. A natív modal csapdázza a fókuszt;
Mégse/Escape visszaadja a kiváltó gombnak. A megadás csak egy név; üres értéknél szöveges,
mezőhöz kötött hiba és a hibás mezőn fókusz. Siker bezárja az ablakot és tartós státuszt ad.
Nincs aszinkron művelet, törlés, dropdown, dátumválasztó vagy belépés. Az újratöltés eldobja
az alkalmazás munkamenetét; ezt a lap kimondja. A WDF Draft külön fejlesztői állapot.
