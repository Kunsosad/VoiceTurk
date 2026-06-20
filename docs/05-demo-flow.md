
VoiceTurk MVP — Demo Flow
Demo Story

VoiceTurk helps a buyer create a Vietnamese e-commerce customer support prosody dataset.

The buyer wants audio samples where contributors say customer support lines with different target emotions.

Demo Data

Domain:

ecommerce_cskh

Intents:

order_status
delivery_delay
refund_request

Target emotions:

neutral
confused
impatient
angry

Example script lines:

Tôi chưa nhận được hàng.
Đơn hàng của tôi đang ở đâu?
Tôi muốn hoàn tiền cho đơn này.
Sao đơn hàng giao trễ vậy?
Tôi cần kiểm tra trạng thái đơn hàng.
Buyer Demo
Open Buyer page.
Create campaign:
name: E-commerce Prosody Dataset
domain: ecommerce_cskh
target emotions: neutral, confused, impatient, angry
Add script lines.
Generate RecordingItems.
Activate campaign.
View coverage.

Expected:

5 script lines × 4 emotions = 20 RecordingItems.
Contributor Demo
Open Contributor page.
Select active campaign.
Start recording session.
See current item:
transcript
context
target emotion
Coach speaks instruction.
Record audio.
Submit audio.
Backend returns:
RETAKE_NOW, or
CONTINUE_NEXT
Continue until session summary.

Expected:

Audio file is saved.
AudioSample is created after FastCheck passes.
Mock DeepCheck sends it to review queue.
Validator Demo
Open Validator page.
See review queue.
Open sample detail.
Play audio.
See expected transcript/context/emotion.
Click ACCEPT.

Expected:

AudioSample becomes ACCEPTED.
RecordingItem becomes ACCEPTED.
Campaign coverage increases.
Dataset Demo
Open campaign detail.
Click Build Dataset.
Backend exports dataset package.
Open verify page.
Verify manifest hash.

Expected:

Verify result: MATCH.
Demo Success

The demo is successful when the flow works without:

real Agora
real Solana
real S3
real ASR
real LLM
real Redis
