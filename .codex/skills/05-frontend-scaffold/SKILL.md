name: frontend-scaffold
description: Use this skill when creating the Next.js/React frontend, routes, feature folders, role switch, API clients, and basic UI.
Frontend Scaffold Skill
Goal

Build a simple Web2 demo UI quickly.

No wallet.
No real auth.
No payment.
No payout.

Use role switch:

Buyer
Contributor
Validator
Recommended Structure

apps/web/src/

app/
features/
integrations/
components/
types/

features/

buyer/
contributor/
validator/
dataset/
shared/

integrations/

realtime/
recorder/
storage/
Buyer Screens

Required:

Campaign list
Create campaign
Campaign detail / coverage
Dataset export / verify

Buyer actions:

create campaign
add script lines
generate items
activate campaign
view coverage
build dataset
verify manifest
Contributor Screens

Required:

Contributor home
Recording session
Session summary

Contributor actions:

select active campaign
start recording session
view current item
hear/read coach instruction
record audio
submit audio
retry same item if needed
continue next item
Validator Screens

Required:

Review queue
Sample review detail

Validator actions:

play audio
inspect transcript/context/emotion
accept/reject/need retake
Frontend API Rule

Frontend must not invent state.

Use backend response.

If backend says RETAKE_NOW:

retry same item

If backend says CONTINUE_NEXT:

move next

If backend says sample is REVIEW_PENDING:

show validator queue
UI Style

Keep it clean:

simple cards
status badges
progress bars
audio player
clear action buttons

Do not over-design.
Do not block implementation on UI perfection.
