# League Duo Now

LEAGUEMATE — ULTRA MASTER PROMPT

0. ROLE

Jsi seniorní product designer, UX/UI designer, full-stack engineer, databázový architekt a realtime systems engineer.

Nevytvářej pouze vizuální prototyp.

Vytvoř reálně fungující, produkčně připravenou webovou aplikaci, která funguje jako „Tinder pro League of Legends“ — platforma pro hledání spoluhráčů, jejímž hlavním principem je LIVE matchmaking.

Hlavní myšlenka produktu:

„Zapnul jsem League of Legends a právě teď chci někoho, s kým si zahraju.“

Aplikace proto nesmí fungovat primárně jako klasická databáze profilů nebo fórum.

Musí být postavena kolem konceptu:

PLAY NOW / HRAJU TEĎ

Uživatel se přihlásí → nastaví, co chce hrát → aktivuje LIVE status → systém mu začne okamžitě hledat vhodné hráče, kteří jsou online a hledají spoluhráče ve stejný okamžik.

1. PRODUKT

Název aplikace:

LeagueMate

Pracovní slogan:

Find your next teammate. Live.

Alternativní slogan v UI:

Your duo is online.

Aplikace je určena primárně pro League of Legends hráče.

Cílem je vytvořit nejrychlejší způsob, jak najít kvalitního spoluhráče právě v okamžiku, kdy chce člověk hrát.

2. HLAVNÍ PRODUKTOVÝ PRINCIP

Nikdy nezobrazuj uživatele jako „aktivní“, pokud není skutečně aktivní.

Rozlišuj:

ONLINE

Uživatel má aplikaci otevřenou.

LIVE / LOOKING

Uživatel je online a aktivně hledá spoluhráče.

IN GAME

Uživatel momentálně hraje.

AWAY

Uživatel byl aktivní, ale přestal reagovat.

OFFLINE

Uživatel aplikaci opustil / heartbeat vypršel.

Nejdůležitější status je:

🟢 LOOKING NOW

Tento status musí být viditelný prakticky všude.

3. HLAVNÍ FLOW

První návštěva:

LANDING PAGE
↓
SIGN UP / LOGIN
↓
RIOT ID CONNECTION
↓
PROFILE SETUP
↓
PREFERENCE SETUP
↓
DASHBOARD
↓
„PLAY NOW“

Po kliknutí na PLAY NOW:

PLAYER nastaví:

Game mode

Preferred role

Secondary role

Desired rank range

Language

Voice preference

Playstyle

Number of games

Region

↓
START LOOKING

Systém vytvoří LIVE SESSION.

↓
REALTIME MATCHMAKING

↓
MATCH CANDIDATES

↓
LIKE / PASS

Pokud:

PLAYER A → LIKE PLAYER B

a současně:

PLAYER B → LIKE PLAYER A

vytvoří se:

MATCH

↓
MATCH ANIMATION

↓
CHAT

↓
START GAME

4. HOME / DASHBOARD

Dashboard musí být velmi jednoduchý.

Nezahlcuj uživatele.

Horní část:

„Who are you playing with today?“

Velké hlavní tlačítko:

🟢 PLAY NOW

Pod ním:

„127 players are looking right now“

Toto číslo musí být realtime.

Dashboard dále obsahuje:

LIVE NOW

Horizontální / grid seznam aktuálně hledajících hráčů.

Každý hráč:

avatar

Riot ID

rank

preferred role

region

language

playstyle

voice

LIVE badge

5. TINDER-LIKE MATCHMAKING UI

Hlavní matchmaking obrazovka musí působit jako moderní dating app, ale musí být jasně gamingová.

Centrálně zobrazuj jednu kartu hráče.

Například:

🟢 LOOKING NOW

Martin#CZ1

Emerald II

🧙 MID

🇨🇿 CZ/SK

🎤 Voice

🔥 Competitive

54% WR

„Looking for jungle duo“

Dole:

PASS

👎

LIKE

❤️

Volitelně:

⭐ SUPER LIKE

Karta musí mít možnost:

kliknutí

swipe left

swipe right

Na desktopu musí fungovat tlačítka i klávesnice.

6. MATCH ALGORITMUS

Nevybírej náhodné hráče.

Vytvoř scoring systém.

Každý kandidát dostane MATCH SCORE.

Například:

same region: +20

compatible rank: +20

compatible role: +20

complementary roles: +15

same language: +10

same game mode: +10

same playstyle: +5

similar session length: +5

previous positive interaction: +10

Maximální score:

100+

Zobrazuj:

92% MATCH

Ale neprezentuj score jako objektivní pravdu.

Používej ho jako UX indikátor kompatibility.

7. ROLE MATCHING

League of Legends role:

TOP

JUNGLE

MID

ADC

SUPPORT

FILL

Uživatel může nastavit:

PRIMARY ROLE

SECONDARY ROLE

Například:

PRIMARY:
MID

SECONDARY:
TOP

Systém má preferovat komplementární kombinace:

MID + JUNGLE

ADC + SUPPORT

TOP + JUNGLE

atd.

Ale nikdy uživatele tvrdě neblokuj pouze kvůli rolím.

8. RANK MATCHING

Podporuj:

IRON
BRONZE
SILVER
GOLD
PLATINUM
EMERALD
DIAMOND
MASTER
GRANDMASTER
CHALLENGER

Používej skutečná data z Riot API, pokud jsou dostupná.

Uživatel si může nastavit:

„I want to play with“

same rank

±1 division

±2 divisions

any rank

Nikdy nesmí být možné ručně tvrdit rank, pokud je rank získáván z Riot API.

9. RIOT ACCOUNT

Navrhni integraci s Riot Games API.

Uživatel může propojit Riot účet.

Profil následně může obsahovat:

Riot ID

Tagline

Region

Summoner data

Rank

Solo/Duo rank

profile level, pokud je dostupný

recent games

champion statistics, pokud jsou dostupné

win rate, pokud je možné bezpečně vypočítat

preferred champions, pokud jsou data dostupná

Nikdy nevystavuj Riot API key na frontend.

Veškeré citlivé API operace musí probíhat server-side.

Pokud konkrétní Riot API endpoint není dostupný nebo vyžaduje další konfiguraci, vytvoř správnou abstraction layer a jasný TODO bod místo falešných dat.

10. LIVE SESSION SYSTEM

Toto je nejdůležitější technická část aplikace.

Každý uživatel může mít maximálně jednu aktivní LIVE SESSION.

Session obsahuje například:

user_id

started_at

last_seen_at

status

game_mode

primary_role

secondary_role

language

voice

playstyle

region

rank_snapshot

Použij heartbeat.

Například:

Frontend pravidelně posílá:

HEARTBEAT

Pokud heartbeat dlouho nepřijde:

LOOKING
↓
AWAY
↓
OFFLINE

LIVE uživatelé musí být synchronizováni pomocí Supabase Realtime.

Pokud jeden uživatel klikne:

„STOP LOOKING“

musí okamžitě zmizet z LIVE queue ostatních uživatelů.

11. PREVENT DUPLICATES

Nikdy nezobrazuj:

uživatele, kterého jsem právě PASSnul

uživatele, kterého jsem už MATCHnul

uživatele, kterého jsem blokoval

sebe samotného

uživatele mimo kompatibilní region, pokud má region restriction

uživatele, který už není LIVE

Použij persistent interaction history.

12. LIKE / PASS

Každá interakce:

LIKE
PASS
SUPER LIKE

se uloží do databáze.

Pokud:

A LIKE B

a:

B LIKE A

→ MATCH.

MATCH musí být vytvořen atomicky, aby nevznikaly duplicitní matche.

13. MATCH SCREEN

Po matchi zobraz výraznou animaci:

IT'S A MATCH! 🎮

„You and Martin want to play together.“

Zobraz:

oba avatary

rank

role

match score

game mode

CTA:

START CHAT

Sekundární:

INVITE TO GAME

14. CHAT

Každý MATCH automaticky vytvoří private conversation.

Chat obsahuje:

text

timestamps

online status

typing indicator

read status

basic emoji

block

report

Realtime chat přes Supabase Realtime.

15. PARTY / GAME STATUS

Navrhni stavový systém:

LOOKING
MATCHED
CHAT
INVITED
IN PARTY
IN GAME
FINISHED

Uživatel může ručně změnit stav.

Pokud je dostupná integrace s Riot daty, lze později automaticky detekovat IN GAME.

Architektura musí počítat s touto funkcí už nyní.

16. PROFILE

Profil musí působit jako gaming identity card.

Obsah:

Avatar

Riot ID

Rank

Region

Languages

Main role

Secondary role

Voice

Playstyle

Games played together

Successful matches

Rating

Preferred champions

Recent activity

Bio

Příklad:

„Emerald mid looking for chill ranked duo. Usually play evenings. Voice preferred.“

17. PLAYER REPUTATION

Po společné hře může uživatel ohodnotit spoluhráče.

Například:

👍 Good teammate

🎤 Good communication

🔥 Competitive

😄 Chill

🚫 Toxic

Nepoužívej pouze klasické 1–5 hvězdičky.

Vytvoř gaming reputation systém.

Po dokončení hry:

How was your teammate?

[ 👍 Great ]
[ 😐 Okay ]
[ 👎 Bad ]

Volitelně tagy.

Reputation musí být chráněna před jednoduchým abusem.

18. REPORTING & SAFETY

Každý profil a chat musí mít:

REPORT

BLOCK

Důvody:

Toxic behavior

Harassment

Spam

Scam

Fake account

Inappropriate content

Other

Po blocknutí:

uživatelé se navzájem nikdy nesmí zobrazovat v matchmakingu.

19. ANTI-SPAM / ANTI-ABUSE

Implementuj základní ochranu:

rate limits

LIKE limits

message rate limits

report limits

duplicate interaction prevention

session validation

server-side validation

auth checks

Row Level Security

Nikdy nevěř datům pouze z frontendu.

20. SUPABASE DATABASE

Navrhni čistou relační databázi.

Minimálně:

users
profiles
riot_accounts
player_preferences
live_sessions
swipes
matches
conversations
conversation_members
messages
blocks
reports
ratings
notifications

Přidej správné:

primary keys

foreign keys

indexes

unique constraints

timestamps

created_at

updated_at

Použij UUID.

21. ROW LEVEL SECURITY

RLS musí být zapnuté.

Uživatel může:

číst svůj profil

upravovat svůj profil

upravovat své preference

vytvářet vlastní LIVE session

vytvářet vlastní swipes

číst pouze své matches

číst pouze konverzace, jejichž je členem

posílat zprávy pouze do konverzací, jejichž je členem

Uživatel nesmí:

číst cizí soukromé zprávy

upravovat cizí profil

vytvářet match za jiného uživatele

měnit cizí LIVE status

přistupovat k Riot credentials

22. NOTIFICATIONS

Realtime notification systém.

Typy:

❤️ Someone liked you

🔥 It's a match!

💬 New message

🎮 Player invited you

👋 Someone wants to play

Notifications musí být viditelné v aplikaci.

23. DESIGN

Vizuální styl:

Moderní gaming SaaS + premium matchmaking app.

Inspirace principy:

Tinder

Discord

Riot client

modern gaming dashboards

premium social apps

Ale nekopíruj jejich design.

Použij vlastní brand identity.

24. DESIGN LANGUAGE

Dark mode jako default.

Použij:

deep dark background

glassmorphism pouze decentně

soft gradients

glowing LIVE indicators

rounded cards

high contrast typography

subtle animations

gaming-inspired details

Aplikace musí působit:

FAST
PREMIUM
MODERN
SOCIAL
GAMING

Ne:

cheap
generic
template-like

25. COLOR LOGIC

Používej barvy primárně jako význam:

🟢 LIVE

🔴 PASS / destructive

💜 MATCH / social

🟡 notification

Rank může mít vlastní badge styl.

Nepřeháněj neon efekty.

26. RESPONSIVE DESIGN

Mobile-first.

Aplikace musí fungovat perfektně:

320px+
mobile
tablet
desktop
ultrawide

Na mobilu musí být matchmaking ovladatelný swipe gestures.

Na desktopu:

karta uprostřed
sidebar
navigation
live player count

27. NAVIGATION

Desktop sidebar:

🏠 Home

🔥 Live

❤️ Matches

💬 Messages

👤 Profile

⚙ Settings

Mobilní bottom navigation:

Home
Live
Matches
Messages
Profile

28. LANDING PAGE

Pro nepřihlášeného uživatele:

Hero:

FIND YOUR NEXT DUO.

Subtitle:

„Stop searching Discord servers. Find someone who is ready to play right now.“

CTA:

FIND PLAYERS

Secondary:

HOW IT WORKS

Sekce:

1. Go Live

Tell us what you want to play.

2. Find Players

Discover compatible players online right now.

3. Match

Both like → instant match.

4. Play

Chat, connect and start your game.

29. EMPTY STATES

Každá obrazovka musí mít kvalitní empty state.

Například:

Žádní hráči:

It's quiet right now...

„Try expanding your rank or language preferences.“

CTA:

EXPAND SEARCH

Žádné matche:

Your next duo is out there.

CTA:

START LOOKING

30. LOADING STATES

Nepoužívej pouze obyčejné spinnery.

Použij skeletons a gaming-specific loading states.

Například:

„Scanning the Rift...“

„Finding compatible players...“

„Looking for your duo...“

31. ERROR STATES

Chyby musí být lidské.

Nikdy:

„Error 500“

Raději:

„Something went wrong while finding players.“

CTA:

TRY AGAIN

32. REALTIME UX

Realtime musí být vidět.

Pokud se objeví nový hráč:

jemně aktualizuj queue.

Pokud někdo odejde:

automaticky ho odstraň.

Pokud někdo dostane match:

okamžitě zobraz notification.

Chat musí být realtime.

Online status musí být realtime.

33. PERFORMANCE

Optimalizuj aplikaci pro rychlý první load.

lazy loading

pagination

indexed queries

debounce

optimistic UI

realtime subscriptions pouze tam, kde jsou potřeba

unsubscribe při unmount

minimalizace nepotřebných API requestů

Nikdy nenačítej všechny uživatele najednou.

34. SECURITY

Dodrž:

RLS

server-side validation

secure auth

protected routes

API secrets pouze server-side

rate limiting

input sanitization

XSS protection

safe message rendering

Nikdy neukládej citlivé údaje do localStorage, pokud to není nezbytné.

35. AUTH

Podporuj minimálně:

Email
Password

A připrav architekturu pro:

Google
Discord
Riot account

Pozor:

Riot účet a autentizace aplikace nemusí být totéž.

Odděl:

APPLICATION ACCOUNT

a

RIOT ACCOUNT CONNECTION.

36. ONBOARDING

Po registraci:

STEP 1

„What's your Riot ID?“

STEP 2

Region

STEP 3

Main role

STEP 4

Secondary role

STEP 5

Languages

STEP 6

Playstyle

STEP 7

Voice

STEP 8

„When do you usually play?“

Options:

Morning
Afternoon
Evening
Night

STEP 9

Finish.

Poté:

Your profile is ready.

CTA:

START LOOKING

37. LIVE PLAYER CARD

Karta musí být vizuálně velmi kvalitní.

Obsah:

Avatar

🟢 LIVE NOW

Riot ID

Rank

Role

Language

Voice

Playstyle

„Looking for: Duo“

Match %

CTA:

PASS

LIKE

38. FILTERS

Filtry musí být rychlé.

Rank:

Any
Same
±1
±2

Role:

Any
Top
Jungle
Mid
ADC
Support

Language:

CZ
SK
EN
DE
PL
etc.

Voice:

Required
Preferred
Not needed

Playstyle:

Chill
Competitive
Serious
Fun
Learning

Game:

Ranked
Normal
ARAM
Flex

39. MATCHMAKING PRIORITY

Priorita:

LIVE status

Same game mode

Compatible role

Compatible rank

Same region

Same language

Voice preference

Playstyle

Session length

Nikdy neupřednostňuj offline uživatele před LIVE uživatelem.

40. SESSION EXPIRATION

LIVE session musí automaticky expirovat.

Pokud uživatel zavře browser nebo ztratí spojení:

session se nesmí držet navždy.

Použij:

heartbeat + last_seen_at + server-side cleanup logic.

41. MATCH EXPIRATION

Pokud uživatel aktivuje LIVE:

MATCHMAKING musí respektovat aktuální stav.

Pokud user začne hrát:

LOOKING → IN GAME

a přestane být kandidátem.

42. ADMIN PANEL

Vytvoř základní admin architecture.

Admin může:

view users

view reports

ban user

suspend user

review reports

view active LIVE users

view matches

view system health

Admin dashboard nemusí být vizuálně stejně propracovaný jako frontend, ale musí být funkční a bezpečný.

43. ANALYTICS ARCHITECTURE

Připrav event tracking.

Events:

signup
profile_completed
riot_connected
play_now_clicked
live_session_started
player_viewed
like
pass
match_created
message_sent
game_started
game_finished
rating_submitted
report_created

To umožní později měřit:

MATCH RATE
MATCH → GAME RATE
DAILY ACTIVE USERS
LIVE USERS
RETENTION
AVG TIME TO MATCH

44. PRODUCT METRIC

Nejdůležitější KPI aplikace:

TIME TO FIRST MATCH

Měř:

„Jak dlouho trvá novému hráči získat první match?“

Cíl:

co nejméně sekund/minut.

45. GAMIFICATION

Později připrav:

streaks

teammate badges

reputation

„Top teammate“

activity score

profile completion

achievement system

Ale nepřetěžuj MVP.

46. MVP PRIORITY

Nejdříve musí perfektně fungovat:

Auth

Profile

Riot connection architecture

Preferences

LIVE status

Realtime queue

Player cards

Like / Pass

Match creation

Realtime chat

Block / Report

Responsive UI

Teprve potom:

ratings
advanced analytics
gamification
premium
Discord integration
advanced Riot features

47. DŮLEŽITÉ: NEDĚLEJ FALEŠNÉ FUNKCE

Nikdy nepoužívej fake data tam, kde má být skutečná funkce.

Pokud něco nelze ještě implementovat kvůli chybějícím API credentials:

vytvoř správnou architekturu

použij jasný placeholder

označ TODO

připrav environment variables

nevytvářej falešnou iluzi, že je API napojené

48. ENVIRONMENT VARIABLES

Připrav:

SUPABASE_URL

SUPABASE_ANON_KEY

RIOT_API_KEY

a další secrets pouze server-side.

Nikdy je nevkládej přímo do frontendového kódu.

49. CODE QUALITY

Piš čistý TypeScript.

Preferuj:

reusable components

hooks

services

typed database interfaces

validation schemas

centralized constants

error handling

clean folder structure

Nedělej obří komponenty.

50. UX PRINCIPLE

Celá aplikace musí být pochopitelná bez návodu.

Uživatel musí během několika sekund pochopit:

„Tady jsou lidé, kteří chtějí právě teď hrát.“

Hlavní CTA proto musí být vždy:

PLAY NOW

51. MICROINTERACTIONS

Přidej kvalitní mikroanimace:

LIKE:
karta odjede doprava

PASS:
karta odjede doleva

MATCH:
výrazná, ale krátká animace

LIVE:
jemný pulzující indikátor

Message:
smooth realtime appearance

Notifications:
subtle animation

Nepoužívej přehnané animace, které zpomalují používání.

52. FIRST IMPRESSION

První pocit uživatele po přihlášení:

„Wow, tady opravdu vidím lidi, kteří právě teď hledají duo.“

Ne:

„Tohle je jen další seznamka hráčů.“

53. DATABASE-FIRST APPROACH

Nejdříve promysli databázový model a realtime architekturu.

Potom implementuj UI.

Neopakuj stejnou logiku na více místech.

Matchmaking logic musí být centralizovaná.

54. IMPORTANT REALTIME RULE

Nepoužívej pouze frontend filtering.

Server musí ověřovat:

session active

player availability

block status

existing match

swipe history

preferences

Realtime frontend pouze zobrazuje aktuální stav.

55. FUTURE EXPANSION

Architektura musí být připravená na další hry.

Neomezuj všechny tabulky a logiku natvrdo pouze na League of Legends.

Použij koncept:

games

Například:

League of Legends
Valorant
Fortnite
Apex Legends
Overwatch

MVP ale zaměř pouze na League of Legends.

56. MONETIZATION — FUTURE

Nepřidávej monetizaci do základního MVP.

Architektura ale může později podporovat:

FREE

PREMIUM

Premium může nabídnout:

advanced filters

unlimited likes

priority matchmaking

profile boosts

advanced statistics

Super Likes

Nikdy nezamkni základní LIVE matchmaking za paywall v MVP.

57. MOBILE EXPERIENCE

Mobilní verze musí působit jako skutečná mobilní aplikace.

bottom navigation

swipe cards

large touch targets

sticky actions

no tiny buttons

responsive chat

mobile-friendly filters

58. DESKTOP EXPERIENCE

Desktop:

Sidebar vlevo.

Main matchmaking area uprostřed.

Optional live stats / filters vpravo.

Chat může fungovat jako panel.

59. DESIGN DETAIL

Každý profil musí mít jasnou hierarchii:

WHO

RANK

ROLE

WHAT THEY WANT

WHY YOU MATCH

ACTION

Například:

Martin#CZ1

Emerald II

🧙 MID

„Looking for Jungle“

🟢 Live for 2 games

🔥 Competitive

91% MATCH

60. „WHY YOU MATCH“

Velmi důležitá UX funkce.

Pod match score zobraz:

Why you match

✓ Same region
✓ Similar rank
✓ Compatible roles
✓ Both use voice
✓ Both looking for ranked

Tím uživatel pochopí, proč mu byl hráč doporučen.

61. FINAL QUALITY BAR

Před dokončením aplikace proveď vlastní audit:

FUNCTIONALITY

Auth funguje

Profile funguje

LIVE funguje

Realtime funguje

Like funguje

Pass funguje

Match funguje

Chat funguje

Block funguje

Report funguje

SECURITY

RLS

protected routes

server-side validation

secrets protected

no unauthorized data access

UX

mobile

desktop

loading

empty states

error states

animations

REALTIME

online status

LIVE queue

chat

match notifications

PERFORMANCE

indexed queries

no unnecessary subscriptions

no loading entire player database

62. IMPLEMENTATION ORDER

Implementuj v tomto pořadí:

PHASE 1
Project foundation

PHASE 2
Authentication

PHASE 3
Database schema

PHASE 4
Profile system

PHASE 5
Preferences

PHASE 6
LIVE SESSION ENGINE

PHASE 7
Realtime player queue

PHASE 8
Tinder-style cards

PHASE 9
LIKE / PASS

PHASE 10
MATCH ENGINE

PHASE 11
CHAT

PHASE 12
BLOCK / REPORT

PHASE 13
Riot API abstraction

PHASE 14
Responsive polish

PHASE 15
Performance/security audit

63. VERY IMPORTANT LOVABLE INSTRUCTION

Nezačínej pouze tvorbou landing page.

Nechci pouze mockup.

Nechci fake Tinder cards.

Nechci hardcoded players.

Nechci fake match.

Nechci fake chat.

Nechci pouze frontend.

Chci skutečný full-stack základ aplikace.

Použij Supabase pro backend a realtime.

Každá důležitá akce musí mít reálný databázový stav.

64. START

Začni nejprve analýzou celé architektury.

Před samotným implementováním si interně rozlož:

database schema

relationships

realtime channels

auth flow

matchmaking flow

security policies

Riot integration architecture

component architecture

Poté začni implementovat.

Pokud je něco nejasné, zvol řešení, které je nejjednodušší, bezpečné, škálovatelné a vhodné pro MVP.

Nevytvářej zbytečně komplikovanou enterprise architekturu.

Priorita:

REALTIME > SPEED > UX > SECURITY > SCALABILITY > FEATURES

Výsledkem má být aplikace, která působí jako reálný nový gaming startup, nikoliv jako AI-generated demo.

CORE PRODUCT STATEMENT

Celý produkt se musí řídit jedinou myšlenkou:

„I want to play League right now. Show me someone who wants to play League right now too.“

Aplikace má tento problém vyřešit během několika sekund.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fa514cb3-8fd5-45c6-a70d-d7e4bba47625).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
