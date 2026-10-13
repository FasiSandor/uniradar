# UniRadar

Reszponzív, magyar nyelvű felsőoktatási és felnőttképzési navigátor.

## Állapot
Első fejlesztői UI-verzió. A felület a jóváhagyott világos/kék oktatási dizájnt követi Macen, iPaden és iPhone-on. Menük: Kezdőlap, Képzéskereső, Érettségi-tervező, Doktori iskolák, Felnőttképzések, Egyetemi navigátor, Kedvencek, Saját profil, Értesítések.

A képzési lista **bemutató adat**, nem élő Felvi-, doktori.hu- vagy IKK-szinkron. A felvételi követelmények, aktuális nyelvvizsga-feltételek, érettségi pontszámítás, valódi útvonalak és értesítések későbbi integrációval aktiválhatók. A UI nem állít kitalált felvételi jogosultságot.

## Technika
Next.js App Router, React, TypeScript, CSS, lucide-react.

Helyi futtatás:
```bash
npm install
npm run dev
```

Deploy: GitHub import Vercelbe, Framework Preset: Next.js, Root Directory: . (alapértelmezett).

## Következő szakasz
1. Valódi intézmény- és képzésadatok hivatalos forrásokból.
2. Szakonkénti érettségi követelmények és ellenőrzött pontkalkuláció.
3. Kutatási témák és doktori felvételi feltételek.
4. Képzési helyszínek és menetidők.
5. Kedvencek felhőszinkronja és változásfigyelés.
