$ErrorActionPreference = "Continue"

New-Item -ItemType Directory -Force -Path ".agent-skills" | Out-Null

if (!(Test-Path ".agent-skills/openai-skills")) {
git clone https://github.com/openai/skills .agent-skills/openai-skills
}

if (!(Test-Path ".agent-skills/agora-skills")) {
git clone https://github.com/AgoraIO/skills .agent-skills/agora-skills
}

if (!(Test-Path ".agent-skills/agents-md")) {
git clone https://github.com/agentsmd/agents.md .agent-skills/agents-md
}

Write-Host "Agent reference skills installed or already present."
