# Agora Option B integration

VoiceTurk's backend creates a `ConversationSession`, generates a unique RTC channel, and returns a contributor RTC token. It does not create, join, start, stop, or leave the AI Customer agent.

The AI Customer is preconfigured in Agora Console / Agent Studio. During a demo, start the VoiceTurk session through the backend, copy/use the returned channel in the frontend, then make the preconfigured agent join that channel manually or through an external script outside this application.

Use `AGORA_MOCK_MODE=true` for local development. Mock mode needs no Agora credentials and returns an explicit mock app ID/token. For real token generation, set `AGORA_MOCK_MODE=false`, `AGORA_APP_ID`, and `AGORA_APP_CERTIFICATE` through the environment. The App Certificate is used only for server-side signing and is never returned or logged.

There are intentionally no Agora Agent Join or Leave API calls in this codebase.
