### FINANSLOV

Millioner, milliarder og millioner af millioner! Ved du hvor stort det offentlige budget, finansloven, er? Og har du nogensinde tænkt over hvordan vi egentlig bruger vores penge? Eller hvilken betydning det _egentligt_ har når et parti vil bevilge flere eller færre milliarder til det ene eller det andet? Hvordan hele kagen ser ud og hvordan den bliver skåret og fordelt? Eller om den offentlige debat i virkeligheden er afsporet i proportionerne af nyhedsdækning og samme emnes størrelse i det offentlige budget?

Visualiseringen kan ses [her](http://52.59.14.148:10000/)

**Data**

Data er indsamlet fra [Finansministeriets Finanslovsdatabase](http://www.oes-cs.dk/olapdatabase/finanslov/index.cgi).
Hvor nærmere beskrivelse af dataen også er at hente. Yderlige information samt hele finansloven i dets fulde beskrivelse kan findes i PDF format på 
[Finansministeriets website](https://www.fm.dk/publikationer/2016/finanslov-for-2016).

Finanslovene fra 2003-2017 er tilgængelig i _.tsv_ format fra mappen [`public/data/`](https://github.com/kalkun/finansloven/tree/master/public/data).

Den første række i hvert datasæt er en navne række for de forskellige kolonner. For en uddybet forklaring af kolonnerne se den oprindelige database på Finansministeriets hjemmeside. 

Alle tal i datasættene er i millioner i overensstemmelse med det oprindelige datasæt. Tilgengæld er kommaer og læsevenlige punktummer skiftet ud med engelsk komma for nemmere beregning.

**Visualisering**

Visualiseringen er lavet i [D3.js](https://d3js.org/) ud fra Mike Bostocks sunburst eksempler. Visualiseringen viser enten budgetterede udgifter eller indtægter på finansloven. Budgetterede indtægter er på finansloven angivet i negative tal - og filtreringen er foretaget ud fra dette kritiere. 

Tallene som indgår i visualiseringen er udelukkende fra kolonne `F 2017` som ifølge finanslovsdatabasen angiver finansårets bevilling for 2017.
