/**
 * E-learning en regelkennis voor de pleziervaart op de Nederlandse binnenwateren.
 * Gebaseerd op het Binnenvaartpolitiereglement (BPR) en de veiligheidscampagne Varen doe je Samen.
 * Dit is een praktische samenvatting, geen vervanging van het reglement of een vaaropleiding.
 */

export type Trigger = 'lock' | 'movable_bridge' | 'bridge' | 'depart' | 'arrive' | 'mooring' | 'crossing' | 'general';

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface LessonSection {
  title: string;
  body?: string;
  steps?: string[];
  tips?: string[];
  warning?: string;
  /** signalen: label + betekenis, met kleurcodes voor weergave */
  signals?: { lights: ('red' | 'green' | 'yellow' | 'white' | 'blue')[]; label: string; meaning: string }[];
}

export interface Lesson {
  id: string;
  title: string;
  icon: string;
  minutes: number;
  summary: string;
  triggers: Trigger[];
  /** korte checklist die tijdens het varen getoond wordt bij nadering */
  quick: string[];
  sections: LessonSection[];
  quiz: QuizQuestion[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'sluis',
    title: 'Een sluis passeren',
    icon: '🔒',
    minutes: 8,
    summary: 'Van aanmelden tot uitvaren: zo schut je veilig en zonder stress, ook samen met beroepsvaart.',
    triggers: ['lock'],
    quick: [
      'Stootwillen aan beide kanten hangen, landvasten voor en achter klaar',
      'Zwemvesten aan, losse spullen opbergen',
      'Meld je aan: marifoon, meldknop of wachten op de sluiswachter',
      'Wacht aan de wachtsteiger, niet ronddrijven voor de deuren',
      'Rood = wachten, rood en groen = klaarmaken, groen = invaren',
      'Vaar langzaam zo ver mogelijk naar voren, afmeren met slippende lijnen',
      'Schroef stil zodra je vastligt, lijnen vieren of aanhalen met het water mee',
    ],
    sections: [
      {
        title: 'Wat is schutten?',
        body: 'Een sluis brengt je boot van het ene waterpeil naar het andere. Je vaart de sluiskolk in, de deuren gaan dicht, het water stijgt of zakt, en aan de andere kant vaar je op het nieuwe peil verder. Handig ezelsbruggetje: de punt van de sluisdeuren wijst altijd naar de kant met het hoogste water.',
      },
      {
        title: 'Voor je aankomt',
        steps: [
          'Kijk in de app welke sluis eraan komt, wat de bedieningstijden zijn en of er een marifoonkanaal of meldknop is.',
          'Hang stootwillen (fenders) aan beide zijden: je weet vooraf niet aan welke kant je komt te liggen.',
          'Leg een voorlijn en een achterlijn klaar, ruim lang genoeg (minimaal twee keer de hoogte van het peilverschil).',
          'Zorg dat iedereen aan boord een zwemvest draagt en weet wat zijn taak is: één persoon voor, één achter, de schipper stuurt.',
          'Berg losse spullen op en zet kinderen en huisdieren in de kuip, niet op het voordek.',
        ],
      },
      {
        title: 'Aanmelden en wachten',
        steps: [
          'Meld je aan zoals de sluis dat wil: via de marifoon op het kanaal van de sluis, via de meldknop of intercom op de wachtsteiger, of gewoon door zichtbaar te wachten.',
          'Marifoon: "Sluis [naam], sluis [naam], hier motorjacht [scheepsnaam], ik lig aan de wachtsteiger [zijde] en wil graag naar [richting] schutten, over." Sluit af met "uit".',
          'Leg aan bij de wachtsteiger en blijf daar. Drijf niet rond voor de deuren en vaar niet in de zone met het bord "verboden te wachten".',
          'Volgorde: wie het eerst komt, gaat het eerst. Beroepsvaart gaat altijd voor; die ligt sneller vast en heeft een grote dode hoek.',
        ],
        signals: [
          { lights: ['red'], label: 'Rood', meaning: 'Wachten, niet invaren.' },
          { lights: ['red', 'green'], label: 'Rood en groen', meaning: 'De sluis wordt zo bediend: motor starten, lijnen los, klaar om in te varen.' },
          { lights: ['green'], label: 'Groen', meaning: 'Invaren toegestaan. Vaar langzaam en in volgorde naar binnen.' },
          { lights: ['red', 'red'], label: 'Twee keer rood', meaning: 'Sluis buiten bedrijf of gestremd. Kijk in de app of in de berichten aan de scheepvaart.' },
        ],
      },
      {
        title: 'Invaren en afmeren',
        steps: [
          'Vaar rustig naar binnen, met net genoeg vaart om te kunnen sturen. In de kolk staat vaak stroming door lekwater.',
          'Vaar zo ver mogelijk naar voren door, tot aan de stopstreep, zodat er ruimte is voor de boten achter je.',
          'Leg de voorlijn en achterlijn om een bolder of door een ring, maar maak ze niet vast met een knoop: slippend (dubbel terug aan boord) zodat je kunt vieren en aanhalen.',
          'Bij drijvende bolders (die mee omhoog en omlaag gaan) kun je wel gewoon vastmaken, maar houd de lijnen in de gaten.',
          'Zet de schroef stil zodra je vastligt: motor in neutraal of uit. Een draaiende schroef zuigt de boot uit positie en is gevaarlijk voor je buren.',
          'Wacht bij schutten met beroepsvaart tot het schip zijn trossen vast heeft en de schroef stilstaat. De extra stroming is precies waar kleine boten last van hebben.',
        ],
        warning: 'Hou nooit je hand of voet tussen de boot en de sluiswand. Gebruik de stootwillen, niet je lichaam.',
      },
      {
        title: 'Tijdens het schutten',
        steps: [
          'Stijgend water: haal de lijnen rustig aan zodat de boot tegen de wand blijft. Zakkend water: vier de lijnen, anders hangt je boot straks aan de bolder.',
          'Bij een groot peilverschil kan een lijn zwaar worden. Neem één slag om de bolder aan boord; zo hou je hem met weinig kracht.',
          'Kijk naar de wand en naar de boten om je heen. Als iets vastzit: direct vieren en zo nodig de sluiswachter roepen.',
          'Blijf uit de buurt van de deuren en de nissen in de wand; daar kolkt het water het hardst.',
        ],
      },
      {
        title: 'Uitvaren',
        steps: [
          'Wacht op groen. De deuren zijn open, maar pas bij groen mag je gaan.',
          'Maak de achterlijn eerst los en de voorlijn als laatste, zodat je de boot in de hand houdt.',
          'Vaar in volgorde naar buiten, langzaam, en geef beroepsvaart de ruimte: niet pal achter een binnenvaartschip gaan varen (schroefwater).',
          'Bedank de sluiswachter kort op de marifoon als je via de marifoon hebt gecommuniceerd, en schakel terug naar het normale uitluisterkanaal.',
        ],
        tips: ['Bij sommige sluizen betaal je sluisgeld, vaak met een klompje aan een hengel of via een app. Houd kleingeld of je telefoon bij de hand.', 'Zelfbedieningssluis: lees het instructiebord, druk op de knop en wacht op de lichten. Nooit zelf aan deuren of schuiven trekken.'],
      },
    ],
    quiz: [
      { q: 'Het sluislicht is rood en groen tegelijk. Wat doe je?', options: ['Invaren', 'Klaarmaken: motor aan, lijnen los, wachten op groen', 'Omdraaien, de sluis is buiten bedrijf'], answer: 1, explain: 'Rood en groen betekent dat de sluis zo bediend wordt. Pas bij groen vaar je in.' },
      { q: 'Het water in de kolk zakt. Wat doe je met je lijnen?', options: ['Aanhalen', 'Vieren', 'Vastzetten met een knoop'], answer: 1, explain: 'Bij zakkend water moet je vieren, anders komt je boot aan de bolder te hangen.' },
      { q: 'Je schut samen met een binnenvaartschip. Wanneer maak je vast?', options: ['Zo snel mogelijk, dan ben je klaar', 'Nadat het schip vastligt en de schroef stilstaat', 'Pas als de deuren dicht zijn'], answer: 1, explain: 'De schroef van een groot schip zet veel water in beweging; wacht tot die stilstaat.' },
    ],
  },
  {
    id: 'brug',
    title: 'Een beweegbare brug passeren',
    icon: '🌉',
    minutes: 6,
    summary: 'Lichten, aanvragen, wachten en doorvaren: de regels bij bediende en zelfbedieningsbruggen.',
    triggers: ['movable_bridge'],
    quick: [
      'Check in de app: doorvaarthoogte, bedieningstijden, marifoonkanaal',
      'Past je boot eronder? Dan is openen niet nodig; let op geel licht',
      'Vraag de opening aan: marifoon, meldknop, bel of gewoon zichtbaar wachten',
      'Wacht op afstand aan de juiste kant, niet vlak onder de brug',
      'Rood = wachten, rood en groen = klaarmaken, groen = doorvaren',
      'Doorvaren in volgorde, langzaam, midden van de doorvaartopening',
    ],
    sections: [
      {
        title: 'Moet de brug wel open?',
        body: 'Veel bruggen hebben genoeg doorvaarthoogte voor een sloep of motorboot met de kap omlaag. De app rekent met de hoogte van je boot plus je marge. Hou rekening met de waterstand: bij hoog water is de doorvaarthoogte lager dan op het bord staat. Twijfel je? Vraag de brug te openen of meet je hoogte een keer goed op met een lange lat.',
      },
      {
        title: 'Bruglichten',
        signals: [
          { lights: ['red'], label: 'Eén rood licht', meaning: 'Doorvaart verboden. Wachten.' },
          { lights: ['red', 'green'], label: 'Rood boven groen', meaning: 'Doorvaart wordt zo toegestaan. Klaarmaken, nog niet doorvaren.' },
          { lights: ['red', 'green', 'green'], label: 'Rood boven dubbel groen', meaning: 'Nieuw sein: de brug gaat zo open voor beide richtingen tegelijk. Klaarmaken.' },
          { lights: ['green'], label: 'Groen', meaning: 'Doorvaart toegestaan.' },
          { lights: ['green', 'green'], label: 'Dubbel groen', meaning: 'Doorvaart toegestaan, uit beide richtingen tegelijk.' },
          { lights: ['yellow'], label: 'Eén geel licht', meaning: 'Brug is dicht, maar doorvaart onder de gesloten brug is toegestaan als je eronder past. Reken op tegenliggers.' },
          { lights: ['yellow', 'yellow'], label: 'Dubbel geel', meaning: 'Doorvaart onder de gesloten brug toegestaan, tegenliggende vaart is verboden.' },
          { lights: ['red', 'red'], label: 'Twee rode lichten', meaning: 'Brug buiten bedrijf of niet bediend. Wachten tot de bediening begint of een andere route kiezen.' },
        ],
      },
      {
        title: 'Opening aanvragen',
        steps: [
          'Marifoon: roep de brug aan op het kanaal dat op het bord bij de brug of in de app staat. "[Brugnaam], [brugnaam], hier motorjacht [naam], ik nader vanuit [richting] en verzoek om een opening, over."',
          'Meldknop of intercom: veel bruggen op afstand bediende trajecten hebben een paal met knop bij de wachtplaats. Druk één keer en wacht.',
          'Bellen: bij sommige bruggen staat een telefoonnummer op het bord. Dat staat ook in de app als het bekend is.',
          'Geen van alle? Blijf goed zichtbaar wachten aan de wachtplaats. De brugwachter ziet je via camera of vanuit het brughuis.',
          'Geluidssein "lang, kort, lang" is het officiële verzoek tot openen, maar wordt zelden gebruikt en niet overal op prijs gesteld.',
        ],
        tips: ['Bedieningstijden verschillen per brug en per seizoen. Veel bruggen hebben een spitssluiting voor het wegverkeer (ongeveer 7:00 tot 9:00 en 16:00 tot 18:00) en gaan dan niet open.', 'Een brug opent liever voor meerdere boten tegelijk. Als je een andere boot ziet naderen, wacht dan even zodat jullie samen door kunnen.'],
      },
      {
        title: 'Wachten en doorvaren',
        steps: [
          'Wacht aan de kant waar de wachtplaats is (vaak een steiger of remmingwerk), met minstens een scheepslengte afstand tot de brug.',
          'Let op de stroming en de wind: hou de boot met lichte vaart op zijn plek of leg kort aan bij de wachtsteiger.',
          'Bij groen: doorvaren in volgorde van aankomst, langzaam en door het midden van de opening. Niet inhalen onder de brug.',
          'Kijk omhoog: sommige bruggen openen niet volledig. Val van de brug, kabels en de brugklep zijn gevaren voor mast en bimini.',
          'Na de brug direct ruimte maken voor de boten achter je en voor tegenliggers.',
        ],
        warning: 'Nooit onder een openende of sluitende brug door varen, ook niet als je denkt dat je nog net past.',
      },
    ],
    quiz: [
      { q: 'De brug toont één geel licht. Je boot past eronder. Mag je door?', options: ['Nee, wachten op groen', 'Ja, en er kunnen tegenliggers komen', 'Ja, tegenliggers zijn verboden'], answer: 1, explain: 'Eén geel licht: doorvaart onder de gesloten brug toegestaan, reken op tegemoetkomend verkeer. Bij dubbel geel is tegenliggende vaart verboden.' },
      { q: 'Twee rode lichten boven elkaar betekent:', options: ['Extra streng wachten', 'Brug buiten bedrijf of niet bediend', 'Alleen beroepsvaart mag door'], answer: 1, explain: 'Twee rode lichten: de brug wordt niet bediend. Kijk naar de bedieningstijden of kies een andere route.' },
      { q: 'Wat is de nette manier om een opening aan te vragen?', options: ['Toeteren tot de brug opengaat', 'Marifoon, meldknop of zichtbaar wachten bij de wachtplaats', 'Vlak onder de brug gaan liggen'], answer: 1, explain: 'Gebruik het kanaal of de knop van de brug en wacht op afstand bij de wachtplaats.' },
    ],
  },
  {
    id: 'marifoon',
    title: 'Marifoon gebruiken',
    icon: '📻',
    minutes: 5,
    summary: 'Welk kanaal wanneer, hoe je een brug of sluis aanroept en wat verplicht is.',
    triggers: ['lock', 'movable_bridge', 'general'],
    quick: [
      'Uitluisteren op kanaal 10, in een blokgebied op het blokkanaal (rood bord)',
      'Aanroepen: naam van de brug of sluis twee keer, dan "hier" en je scheepsnaam',
      'De vier W\'s: wie, wat, waar, waarheen',
      '"Over" als je antwoord verwacht, "uit" als het gesprek klaar is',
      'Kort en duidelijk, geen gebabbel op werkkanalen',
    ],
    sections: [
      {
        title: 'Wat heb je nodig?',
        steps: [
          'Een basiscertificaat marifonie (examen bij het CBR). Zonder certificaat mag je de marifoon niet bedienen.',
          'Registratie van de marifoon bij de Rijksinspectie Digitale Infrastructuur (RDI). Je krijgt dan een roepnaam en een ATIS-code die in het toestel geprogrammeerd wordt.',
          'Voor pleziervaart is een marifoon niet verplicht, maar op drukke vaarwegen en bij op afstand bediende bruggen en sluizen is hij goud waard.',
          'Heb je hem aan boord, dan geldt de uitluisterplicht: aan en op het juiste kanaal.',
        ],
      },
      {
        title: 'Welk kanaal?',
        steps: [
          'Kanaal 10: het algemene schip-schip kanaal op de binnenwateren. Hier luister je standaard uit.',
          'Blokkanaal: op vaarwegen met verkeersbegeleiding (blokgebied) schakel je over naar het kanaal op het bord met rode rand. Na het gebied weer terug naar 10.',
          'Brug- en sluiskanalen: staan op het bord bij het object en in deze app bij de brug of sluis, als ze in de kaartdata bekend zijn.',
          'Kanaal 16: nood, spoed en veiligheid. Niet voor gewone gesprekken.',
          'Blauwe borden met een kanaal zijn informatiekanalen; overschakelen is niet verplicht.',
        ],
      },
      {
        title: 'Zo roep je aan',
        body: 'Voorbeeld: "Lisserbrug, Lisserbrug, hier motorjacht Zeehond, ik kom vanuit de Kaag richting Haarlem en verzoek een opening, over." Antwoord van de brug: "Zeehond, Lisserbrug, ik open over vijf minuten, blijf wachten aan de wachtsteiger, over." Jij: "Begrepen, wachten aan de steiger, Zeehond uit."',
        tips: ['Luister eerst een paar seconden of het kanaal vrij is.', 'Spreek rustig, hou de microfoon een paar centimeter van je mond en laat de knop pas los als je klaar bent.', 'Zeg alleen wat nodig is. Werkkanalen zijn geen praatkanalen.'],
      },
    ],
    quiz: [
      { q: 'Op welk kanaal luister je standaard uit op de binnenwateren?', options: ['Kanaal 16', 'Kanaal 10', 'Kanaal 1'], answer: 1, explain: 'Kanaal 10 is het schip-schip kanaal op de binnenwateren. In een blokgebied schakel je over naar het blokkanaal.' },
      { q: 'Je zegt "over" als:', options: ['Het gesprek klaar is', 'Je een antwoord verwacht', 'Je over een ander schip praat'], answer: 1, explain: '"Over" betekent dat je antwoord verwacht; "uit" sluit het gesprek af.' },
    ],
  },
  {
    id: 'voorrang',
    title: 'Voorrang en uitwijken',
    icon: '⚖️',
    minutes: 7,
    summary: 'Stuurboordwal, klein wijkt voor groot, motor wijkt voor spier wijkt voor zeil, en wat je doet bij kruisen en oplopen.',
    triggers: ['crossing', 'depart', 'general'],
    quick: [
      'Hou stuurboordwal (rechts) op kanalen en rivieren',
      'Klein (korter dan 20 m) wijkt voor groot, altijd',
      'Motorboot wijkt voor roeiboot en kano, die wijken voor zeilboot',
      'Kruisen zonder stuurboordwal: wie van rechts komt gaat voor',
      'Vanuit een haven of nevenvaarwater het hoofdvaarwater op: jij wijkt',
      'Bij twijfel: vaart minderen en duidelijk uitwijken',
    ],
    sections: [
      {
        title: 'Twee reglementen',
        body: 'Op bijna alle binnenwateren geldt het Binnenvaartpolitiereglement (BPR). Op de grote rivieren zoals Rijn, Waal en Lek geldt het Rijnvaartpolitiereglement (RPR); daar wijkt een klein schip altijd voor een groot schip, zonder uitzondering. Een klein schip is korter dan 20 meter. Veerponten en beroepsvaart tellen als groot schip, ook als ze korter zijn.',
      },
      {
        title: 'De hoofdregels',
        steps: [
          'Stuurboordwal: wie aan zijn stuurboordkant (rechts) van het vaarwater vaart, heeft voorrang op schepen die dat niet doen. Dit is de belangrijkste regel op kanalen en rivieren.',
          'Klein wijkt voor groot: buiten de betonde vaargeul en in het algemeen geef je als klein schip ruimte aan grote schepen. Ze hebben een grote dode hoek en kunnen niet snel stoppen.',
          'Tussen kleine schepen: een motorboot wijkt voor een roeiboot of kano, en die wijken voor een zeilboot. Dus motor wijkt voor spier, spier wijkt voor zeil.',
          'Zeilboten onderling: het schip met de wind over stuurboord heeft voorrang. Bij dezelfde boeg: loef wijkt voor lij.',
          'Kruisende koersen tussen twee motorboten zonder stuurboordwal: het schip dat van stuurboord (rechts) komt, gaat voor.',
        ],
      },
      {
        title: 'Bijzondere situaties',
        steps: [
          'Haven verlaten of vanuit een nevenvaarwater het hoofdvaarwater opvaren: jij wijkt voor alles op het hoofdvaarwater.',
          'Veerpont die vertrekt: kleine schepen wijken. Kijk naar het witte licht of de vlag en wacht even.',
          'Oplopen (inhalen): de oploper wijkt en houdt afstand. Inhalen mag alleen als het veilig kan en niet onder bruggen of in sluizen.',
          'Betonde vaargeul kruisen: wie de vaargeul oversteekt wijkt voor het verkeer in de geul.',
          'Bij smalle vaarwegen: pas je snelheid aan, geen golfslag voor aangemeerde boten en oevers.',
        ],
        tips: ['Maak je uitwijkmanoeuvre vroeg en duidelijk. Kleine koerswijzigingen zijn voor de ander niet te zien.', 'Onthoud: voorrang hebben betekent niet dat je door kunt varen als de ander niet uitwijkt. Voorkom altijd een aanvaring.'],
      },
    ],
    quiz: [
      { q: 'Je vaart met een sloep aan stuurboordwal. Een zeilboot kruist zonder stuurboordwal te houden. Wie heeft voorrang?', options: ['De zeilboot, want zeil gaat voor motor', 'Jij, want stuurboordwal gaat voor', 'Wie het hardst vaart'], answer: 1, explain: 'De stuurboordwalregel gaat voor de regel motor wijkt voor zeil.' },
      { q: 'Je vaart vanuit een jachthaven het kanaal op. Er nadert een sloep over het kanaal.', options: ['Jij wijkt', 'De sloep wijkt', 'Wie van rechts komt gaat voor'], answer: 0, explain: 'Vanuit een haven of nevenvaarwater het hoofdvaarwater op: jij wijkt.' },
      { q: 'Op de Waal nadert een binnenvaartschip. Jij vaart een motorboot van 8 meter aan stuurboordwal.', options: ['Jij hebt voorrang door stuurboordwal', 'Jij wijkt, op de grote rivieren wijkt klein altijd voor groot', 'Het grootste schip wijkt'], answer: 1, explain: 'Onder het RPR wijkt een klein schip altijd voor een groot schip.' },
    ],
  },
  {
    id: 'aanmeren',
    title: 'Aanmeren en afmeren',
    icon: '⚓',
    minutes: 6,
    summary: 'Waar je wel en niet mag liggen, hoe je veilig aanlegt en welke knopen je nodig hebt.',
    triggers: ['arrive', 'mooring'],
    quick: [
      'Kies: jachthaven, passantenplaats, aanlegsteiger of vrije oever waar het mag',
      'Niet liggen in de vaargeul, bij bruggen, sluizen, wachtplaatsen of onder hoogspanning',
      'Stootwillen op de goede hoogte, lijnen klaar, aanleggen tegen wind of stroom in',
      'Voorlijn, achterlijn en springen; boot ligt stil en kan niet schuren',
      'Melden bij de havenmeester, liggeld betalen, huisregels lezen',
    ],
    sections: [
      {
        title: 'Waar mag je liggen?',
        steps: [
          'Jachthavens en passantenhavens: altijd toegestaan, tegen liggeld. Vaak met stroom, water, sanitair en soms douches. De app toont ze op de kaart.',
          'Aanlegplaatsen van gemeenten, waterschappen, Staatsbosbeheer of Natuurmonumenten: vaak gratis, meestal met een maximale ligduur (bijvoorbeeld 3 x 24 uur). Kijk op het bord ter plekke.',
          'Vrije oever: alleen waar het niet verboden is, waar je de scheepvaart niet hindert en waar je geen schade aan de oever maakt. Vraag bij twijfel de eigenaar of het waterschap.',
          'Ankeren: alleen buiten de vaargeul en waar geen verbodsbord staat. Sinds 2016 gelden voor spudpalen dezelfde regels als voor ankeren.',
        ],
      },
      {
        title: 'Waar mag het niet?',
        steps: [
          'In of langs een vaargeul en op smalle vaarwegen waar je de doorvaart hindert.',
          'Bij bruggen, sluizen, wachtplaatsen (behalve om te wachten op bediening), veerstoepen en havenmonden.',
          'Onder hoogspanningskabels en bij kabels en leidingen die op de oever met borden zijn aangegeven.',
          'Waar een verbodsbord staat: rood-wit bord met anker (verboden te ankeren) of met een afgemeerd schip (verboden af te meren), soms met een tekst zoals "geen ligplaats".',
          'In natuurgebieden met een vaar- of aanlegverbod, in rietkragen en bij broedende vogels. Veel plassen hebben een eilandenreglement.',
          'Voor particuliere steigers en aan andermans boot zonder toestemming.',
        ],
        warning: 'Een verbodsbord geldt ook als er al andere boten liggen.',
      },
      {
        title: 'Zo leg je aan',
        steps: [
          'Verken de plek: diepte, wind, stroming, ruimte om weg te komen. Kies een plek die bij je bootlengte past.',
          'Hang stootwillen op de hoogte van de steiger en leg voor- en achterlijn klaar, met een oog om de kikker aan boord.',
          'Nader langzaam, onder een hoek van ongeveer 30 graden, tegen wind of stroom in. Zo kun je de boot stilleggen zonder harde stoot.',
          'Stap pas over als de boot stilligt en de steiger binnen handbereik is. Nooit springen.',
          'Voorlijn eerst, dan achterlijn, dan springen (lijnen schuin naar voren en achteren) zodat de boot niet langs de steiger beweegt.',
          'Bij een paal of bolder: mastworp of twee halve steken; om een kikker: een kikkerslag; oog in de lijn: paalsteek.',
        ],
        tips: ['Motor uit, contactsleutel eruit, gastoevoer dicht, en kijk nog één keer naar je lijnen als het gaat waaien.', 'In een haven: meld je bij de havenmeester, betaal liggeld en lees de huisregels (stilte na 22:00, geen afval in het water).'],
      },
    ],
    quiz: [
      { q: 'Je ziet een mooie plek aan de rietkraag in een natuurgebied. Er staat geen bord, maar het gebied heeft een aanlegverbod op de kaart.', options: ['Aanleggen mag, er staat geen bord', 'Niet aanleggen, het verbod geldt voor het hele gebied', 'Alleen overdag aanleggen'], answer: 1, explain: 'Een gebiedsverbod geldt ook zonder bord op elke plek. Kies een aangewezen aanlegplaats.' },
      { q: 'Hoe nader je een steiger bij wind?', options: ['Met de wind mee, dan gaat het vanzelf', 'Tegen de wind in, langzaam, onder een hoek', 'Zo snel mogelijk'], answer: 1, explain: 'Tegen wind of stroom in kun je de boot rustig stilleggen.' },
    ],
  },
  {
    id: 'regels',
    title: 'Vaarregels en verplichtingen',
    icon: '📜',
    minutes: 6,
    summary: 'Vaarbewijs, snelheid, alcohol, verlichting, geluidsseinen en wat je verplicht aan boord hebt.',
    triggers: ['depart', 'general'],
    quick: [
      'Vaarbewijs verplicht bij boten sneller dan 20 km/u of langer dan 15 m',
      'Snelheid: de limiet op het bord of in de app, en nooit hinderlijke golfslag',
      'Maximaal 0,5 promille alcohol voor de schipper',
      'Verlichting aan tussen zonsondergang en zonsopkomst',
      'Zwemvesten voor iedereen, blusser en anker aan boord',
    ],
    sections: [
      {
        title: 'Vaarbewijs en leeftijd',
        steps: [
          'Klein Vaarbewijs 1 is verplicht voor boten die sneller kunnen dan 20 km/u en voor boten van 15 tot 25 meter. Klein Vaarbewijs 2 heb je nodig voor ruime wateren zoals IJsselmeer, Waddenzee en Westerschelde.',
          'Snelle motorboot (sneller dan 20 km/u): schipper minimaal 18 jaar, registratieteken op de boot, zwemvesten, dodemanskoord bij een buitenboordmotor.',
          'Minimumleeftijd zonder vaarbewijs: 16 jaar voor een motorboot met een lengte tot 7 meter die niet sneller kan dan 13 km/u; onder de 16 alleen onder toezicht en langzamer.',
        ],
      },
      {
        title: 'Snelheid',
        steps: [
          'De maximumsnelheid staat op borden langs het water en, waar bekend, in deze app op de route. Op veel kanalen en plassen is dat 6 of 9 km/u.',
          'Ook zonder bord: geen hinderlijke golfslag voor aangemeerde boten, oevers, zwemmers en kleine bootjes.',
          'Snelvaren mag alleen op aangewezen snelvaargebieden en nooit binnen 20 meter van de oever, binnen 50 meter van een zwemplek, bij slecht zicht (minder dan 500 m), in havens of tussen zonsondergang en zonsopkomst.',
        ],
      },
      {
        title: 'Alcohol, verlichting en seinen',
        steps: [
          'Alcohol: maximaal 0,5 promille voor de schipper. De politie controleert met blaastesten, ook op het water.',
          'Verlichting tussen zonsondergang en zonsopkomst en bij slecht zicht: motorboten voeren toplicht, boordlichten (rood links, groen rechts) en heklicht. Een boot korter dan 7 meter die niet harder kan dan 13 km/u mag met één wit rondom schijnend licht volstaan.',
          'Geluidsseinen: één lange stoot is attentie; één korte: ik ga naar stuurboord; twee korte: naar bakboord; drie korte: ik sla achteruit; vier korte: ik kan niet manoeuvreren; een reeks korte stoten: gevaar voor aanvaring.',
          'Zwemmen is verboden in vaargeulen, bij bruggen, sluizen en wachtplaatsen.',
        ],
      },
      {
        title: 'Aan boord',
        steps: [
          'Verplicht en verstandig: zwemvesten voor iedereen (verplicht op snelle motorboten), brandblusser, anker met lijn, hoosvat of pomp, pikhaak, reservebrandstof en EHBO-set.',
          'Zorg dat je scheepspapieren, vaarbewijs, verzekeringsbewijs en registratie aan boord zijn (een foto op je telefoon helpt).',
          'Marifoon alleen met certificaat en registratie. Telefoon met deze app opgeladen en in een waterdicht hoesje.',
        ],
      },
    ],
    quiz: [
      { q: 'Een sloep van 6 meter met een topsnelheid van 12 km/u. Vaarbewijs nodig?', options: ['Ja, altijd', 'Nee, korter dan 15 m en langzamer dan 20 km/u', 'Alleen op de plassen'], answer: 1, explain: 'Onder de 15 meter en niet sneller dan 20 km/u is geen vaarbewijs verplicht. Kennis van de regels wel.' },
      { q: 'Twee korte stoten op de hoorn betekent:', options: ['Ik ga naar stuurboord', 'Ik ga naar bakboord', 'Ik sla achteruit'], answer: 1, explain: 'Eén korte: stuurboord. Twee korte: bakboord. Drie korte: achteruit.' },
    ],
  },
  {
    id: 'borden',
    title: 'Borden en betonning',
    icon: '🪧',
    minutes: 5,
    summary: 'De belangrijkste verkeerstekens op het water en hoe je de betonning leest.',
    triggers: ['general'],
    quick: [
      'Rond bord met rode rand: verbod. Vierkant blauw: gebod of aanwijzing',
      'Rode tonnen links (bakboord) van de vaargeul stroomafwaarts, groene rechts',
      'Gele tonnen: bijzondere zone, bijvoorbeeld zwemgebied of snelvaargebied',
      'Verboden af te meren: bord met afgemeerd schip en rode streep',
    ],
    sections: [
      {
        title: 'Verbodsborden (rood-witte rand)',
        steps: [
          'Rode balk op wit: verboden in te varen of doorvaart verboden.',
          'Anker met rode streep: verboden te ankeren.',
          'Afgemeerd schip met rode streep: verboden af te meren of ligplaats te nemen.',
          'Motorboot met rode streep: verboden voor motorboten.',
          'Zeilboot of surfer met rode streep: verboden te zeilen of surfen.',
          'Golf met rode streep: verboden hinderlijke waterbeweging te maken (langzaam varen).',
          'Getal in km/u: maximumsnelheid.',
          'Pijlen naar elkaar: oploopverbod (niet inhalen).',
        ],
      },
      {
        title: 'Gebods- en aanwijzingsborden (blauw)',
        steps: [
          'Pijl: verplichte vaarrichting.',
          'Vierkant blauw met wit motorschip: aanbevolen doorvaartopening voor motorschepen.',
          'Blauw bord met "P" of afgemeerd schip: toegestaan af te meren of aan te leggen.',
          'Blauw bord met anker: toegestaan te ankeren.',
          'Wit bord met rode rand en kanaalnummer: verplicht marifoonkanaal (blokgebied). Blauw bord met kanaal: informatiekanaal.',
          'Bord met bordje "ROOD" of "GROEN" in de doorvaart van een brug: rood-witte borden markeren de kant die verboden is, geel-zwarte of groene ruiten de vrije doorvaart.',
        ],
      },
      {
        title: 'Betonning',
        steps: [
          'Laterale betonning: rode tonnen (stomp of cilinder) markeren de bakboordkant van de vaargeul, groene (spits) de stuurboordkant, gezien in de richting van de betonning (meestal stroomafwaarts of van zee af).',
          'Rood-groen horizontaal gestreept: splitsing, de bovenste kleur geeft de hoofdgeul aan.',
          'Gele tonnen: begrenzing van een bijzonder gebied zoals zwemzone, snelvaargebied of werkzaamheden.',
          'Zwart-gele tonnen (kardinaal): geven aan aan welke kant van de ton je veilig kunt passeren (noord, oost, zuid, west).',
          'Buiten de betonning is het ondiep of verboden, ook al ziet het water er hetzelfde uit.',
        ],
      },
    ],
    quiz: [
      { q: 'Een rond bord met rode rand en een afgemeerd schip:', options: ['Hier aanleggen', 'Verboden af te meren', 'Wachtplaats'], answer: 1, explain: 'Ronde borden met rode rand zijn verboden; blauwe borden staan iets toe of schrijven iets voor.' },
    ],
  },
  {
    id: 'veiligheid',
    title: 'Veiligheid en noodgevallen',
    icon: '🛟',
    minutes: 5,
    summary: 'Man overboord, motorstoring, brand en hoe je hulp inroept.',
    triggers: ['depart', 'general'],
    quick: [
      'Zwemvesten aan bij kinderen, zwakke zwemmers, kou en op ruim water',
      'Man overboord: roepen, wijzen, motor uit bij de drenkeling, aan lijzijde ophalen',
      'Brand: gas dicht, blusser op de basis van de vlammen, roep hulp',
      'Nood: 112, of marifoon kanaal 16 met "Mayday" bij levensgevaar',
      'KNRM Helpt app of 0900 0111 voor hulp zonder direct levensgevaar',
    ],
    sections: [
      {
        title: 'Man overboord',
        steps: [
          'Roep "man overboord" en blijf wijzen naar de drenkeling; één persoon houdt oogcontact.',
          'Gooi direct iets dat drijft, bijvoorbeeld een reddingsboei of stootwil.',
          'Draai rustig terug, nader tegen wind in en zet de motor in neutraal zodra de drenkeling bij de boot is: een draaiende schroef is levensgevaarlijk.',
          'Haal de drenkeling aan de lage kant of via de zwemtrap aan boord. Koud water: snel uit de natte kleren, warm inpakken, bij twijfel 112.',
        ],
      },
      {
        title: 'Motorstoring of aan de grond',
        steps: [
          'Anker uit om niet af te drijven naar de vaargeul of de oever. Zet zo nodig een reeks korte stoten in als er verkeer nadert.',
          'Check het simpele eerst: brandstof, dodemanskoord, waterinlaat verstopt (waterplanten), zekering.',
          'Vaste grond: probeer achteruit met gewicht naar de diepe kant. Niet forceren; bel de KNRM of een sleepdienst.',
          'Waarschuw andere boten en, op drukke vaarwegen, de verkeerspost via de marifoon.',
        ],
      },
      {
        title: 'Brand en gas',
        steps: [
          'Gas dicht bij de fles, motor uit, iedereen benedenwinds en uit de kajuit.',
          'Blus met een poeder- of schuimblusser gericht op de basis van de vlammen. Motorruimte: klep zo klein mogelijk openen.',
          'Lukt het niet binnen een halve minuut: iedereen van boord, weg van de boot, 112 bellen.',
        ],
      },
      {
        title: 'Hulp inroepen',
        steps: [
          'Levensgevaar: 112 of marifoon kanaal 16: "Mayday, mayday, mayday, hier [scheepsnaam], positie [waar], [wat er aan de hand is], [aantal personen]".',
          'Geen direct levensgevaar (motorstoring, aan de grond): KNRM Helpt app of 0900 0111 (Kustwacht) of een sleepdienst.',
          'Deel je positie: in de app zie je je coördinaten en de naam van het vaarwater. Noem ook een herkenbare brug of kilometerraai.',
        ],
      },
    ],
    quiz: [
      { q: 'Iemand valt overboord. Wat doe je als eerste?', options: ['Direct de motor uitzetten', 'Roepen, wijzen en iets drijvends gooien', 'Springen om te helpen'], answer: 1, explain: 'Oogcontact houden en drijfmiddel gooien. De motor zet je pas in neutraal als je bij de drenkeling bent.' },
    ],
  },
  {
    id: 'weer',
    title: 'Weer, wind en water',
    icon: '🌤️',
    minutes: 4,
    summary: 'Wanneer je beter niet gaat en hoe wind en stroming je plan beïnvloeden.',
    triggers: ['depart', 'general'],
    quick: [
      'Check wind, windstoten, onweer en zicht voor je vertrekt',
      'Sloep of open boot: vanaf windkracht 5 op de plassen niet meer prettig, vanaf 6 blijf je binnen',
      'Onweer: niet uitvaren, op het water zo snel mogelijk naar een haven',
      'Tegenwind of stroom: reken op langere vaartijd en meer brandstof',
    ],
    sections: [
      {
        title: 'Wind',
        body: 'Op plassen als de Kaag, Braassem, Westeinder en Loosdrecht bouwt zich bij wind snel golfslag op. Windkracht 4 is voor een sloep nog prima, bij 5 wordt aanleggen lastig en bij 6 en meer blijf je in de haven. Windstoten (vlagen) zijn belangrijker dan het gemiddelde. De app laat wind en vlagen zien voor de dag van je tocht.',
      },
      {
        title: 'Onweer, mist en zon',
        steps: [
          'Onweer: bij een voorspelling niet uitvaren, of alleen kort en dicht bij een haven. Op het water: iedereen laag in de boot, mast en antenne niet aanraken, naar de dichtstbijzijnde haven.',
          'Mist en zicht onder 500 meter: niet varen zonder radar en marifoon; snelvaren is dan sowieso verboden.',
          'Zon en hitte: drink water, pet en zonnebrand, en weet dat hitte ook op het water slaat.',
        ],
      },
      {
        title: 'Stroming en waterstand',
        steps: [
          'Op rivieren en getijdenwater (Nieuwe Maas, Hollandsche IJssel bij Gouda) heb je stroom en tij: plan met de stroom mee als het kan.',
          'Hoog water verlaagt de doorvaarthoogte onder vaste bruggen. De hoogtes in de app zijn de opgegeven waarden; controleer de peilschaal bij de brug.',
          'Laag water: minder diepgang aan de kant en bij ondiepe plassen. Blijf in de betonde geul.',
        ],
      },
    ],
    quiz: [
      { q: 'Er is windkracht 6 voorspeld met vlagen 7 op de Westeinder. Je hebt een open sloep.', options: ['Gewoon gaan, binnenwater', 'Niet gaan of alleen beschut water', 'Alleen met zeil'], answer: 1, explain: 'Op de grote plassen is 6 en meer voor een open boot niet veilig.' },
    ],
  },
];

export const CHECKLISTS: { id: string; title: string; icon: string; items: string[] }[] = [
  {
    id: 'vertrek',
    title: 'Vertrekchecklist',
    icon: '🚩',
    items: [
      'Weerbericht en wind gecheckt voor de hele tocht',
      'Route en bedieningstijden van bruggen en sluizen bekeken',
      'Brandstof voldoende (plus reserve) en olie gecontroleerd',
      'Accu geladen, navigatieverlichting werkt',
      'Zwemvesten voor iedereen aan boord en op maat',
      'Lijnen, stootwillen, pikhaak en anker klaar',
      'Blusser, EHBO-set en hoosvat aanwezig',
      'Telefoon opgeladen, in waterdicht hoesje, app werkt',
      'Papieren: vaarbewijs, verzekering, registratie',
      'Water en eten aan boord, afval mee terug',
      'Iemand aan wal weet waar je heen gaat en wanneer je terug bent',
      'Koelwater komt eruit na het starten',
    ],
  },
  {
    id: 'sluisbrug',
    title: 'Voor een sluis of brug',
    icon: '🔒',
    items: [
      'Stootwillen aan beide zijden',
      'Voor- en achterlijn klaar, lang genoeg',
      'Zwemvesten aan',
      'Losse spullen opgeborgen, kap of bimini omlaag als nodig',
      'Marifoonkanaal of meldknop bekend',
      'Taken verdeeld: voor, achter, roer',
      'Sluisgeld of app bij de hand',
    ],
  },
  {
    id: 'aankomst',
    title: 'Aankomst en afmeren',
    icon: '⚓',
    items: [
      'Ligplaats gekozen die is toegestaan',
      'Boot ligt vast: voorlijn, achterlijn, springen',
      'Stootwillen op de goede hoogte',
      'Motor uit, sleutel eruit, gas dicht',
      'Gemeld bij de havenmeester, liggeld betaald',
      'Walstroom aangesloten of accu-hoofdschakelaar uit',
      'Kuipzeil erop, waardevolle spullen mee',
    ],
  },
  {
    id: 'seizoen',
    title: 'Begin van het seizoen',
    icon: '🛠️',
    items: [
      'Motor gestart en warm gedraaid, koelwater gecontroleerd',
      'Impeller, olie en filters vervangen',
      'Accu getest, verbindingen schoon',
      'Romp en schroef schoon, geen beschadigingen',
      'Verlichting, hoorn en instrumenten getest',
      'Blusser en zwemvesten gekeurd (datum)',
      'Verzekering en registratie nog geldig',
      'Bilgepomp werkt, geen water in de boot',
    ],
  },
];

export function lessonsFor(trigger: Trigger): Lesson[] {
  return LESSONS.filter((l) => l.triggers.includes(trigger));
}
