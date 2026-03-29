# Prototype Quality Overhaul

## Problem Summary

4 issues to fix in priority order:
1. Setu AA may not be connecting properly (credentials set but flow not verified)
2. Twilio is too complex — need QR-code WhatsApp sender instead
3. Frontend pages are boring — raw AI text, same layout, no markdown rendering
4. File upload (PDF/CAMS) should flow into agents for parsing

---

## Proposed Changes

### 1. Setu AA — Fix Integration

The current Setu service looks correct architecturally but needs a fix: the VUA (Virtual User Address) format should be `mobile@setu` for sandbox, not bare `mobile`. Also the `product_instance_id` you have (`orgservice-prod`) may need checking against your Setu Bridge dashboard.

#### [MODIFY] [setu_aa.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/services/setu_aa.py)
- Fix VUA format: `"999999999"` → `"999999999@setu"` for sandbox
- Add detailed error logging with full response body on failure
- Add a `/api/aa/test-connection` endpoint that hits Setu sandbox and returns status
- Make `full_flow_sandbox()` more robust with step-by-step status

#### [MODIFY] [aa.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/routers/aa.py)
- Add `GET /api/aa/test` endpoint for verifying credentials
- Better error messages with Setu error codes

> [!IMPORTANT]
> Your `setu_product_instance_id` is `orgservice-prod`. This should match the Product Instance ID from your Setu Bridge dashboard (Data > Account Aggregator). Please verify this value there.

---

### 2. WhatsApp — Replace Twilio with WAHA (Self-hosted)

**Recommended approach**: Use **WAHA** (WhatsApp HTTP API) — a self-hosted Docker container that exposes a REST API. You scan a QR code once from the terminal, then send/receive via HTTP calls. No Twilio needed, no API keys, works locally.

Alternative fallback: `pywhatkit` (browser automation, less reliable but zero setup).

#### Plan
- Run WAHA via Docker: `docker run -it -p 3001:3000/e WHATSAPP_DEFAULT_ENGINE=WEBJS devlikeapro/waha`
- Scan QR code from `http://localhost:3001`
- Send messages via `POST http://localhost:3001/api/sendText`

#### [NEW] [whatsapp_direct.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/services/whatsapp_direct.py)
- WAHA HTTP client for send/receive
- Fallback to `pywhatkit` if Docker not available
- Keep existing Twilio code as another fallback

#### [MODIFY] [whatsapp.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/routers/whatsapp.py)
- Route through new `whatsapp_direct.py` as primary sender
- Fall back to Twilio if WAHA unavailable

> [!WARNING]
> WAHA requires Docker. If Docker is not available on your demo machine, we can use `pywhatkit` (pip install) which opens a Chrome tab to send via WhatsApp Web. Less clean but zero dependencies beyond Chrome.
>
> **Which do you prefer?** (a) WAHA via Docker, or (b) pywhatkit browser automation?

---

### 3. Frontend — Rich AI Rendering + Dynamic UI

This is the biggest visual upgrade. Three changes:

#### A. Markdown Renderer Component
Install `react-markdown`, `remark-gfm`, `react-syntax-highlighter`. Create an `<AIResponse>` component that renders markdown with:
- Styled headers, bold, lists
- Tables with dark-theme styling
- Code blocks with syntax highlighting
- Stat cards embedded inline (AI can output `:::stat` blocks)

#### [NEW] [AIResponse.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/components/AIResponse.tsx)
- `react-markdown` with `remark-gfm`
- Custom renderers for tables, code, headings (dark theme)
- Support for AI "widget" directives (stat cards, allocation charts)

#### B. AI-Driven Dynamic UI Blocks
Instead of just pasting AI text, the backend will return **structured UI blocks** alongside the text. The frontend renders these as interactive components.

```json
{
  "response_text": "## Analysis\nHere's your breakdown...",
  "ui_blocks": [
    { "type": "stat_row", "items": [{"label": "Tax Saved", "value": "Rs 42,500"}] },
    { "type": "allocation_chart", "data": {"Equity": 60, "Debt": 30, "Gold": 10} },
    { "type": "action_card", "title": "Next Step", "description": "Start SIP", "cta": "/fire-planner" }
  ]
}
```

#### [NEW] [UIBlocks.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/components/UIBlocks.tsx)
- `StatRow` — horizontal stat cards
- `AllocationChart` — CSS bar chart
- `ActionCard` — clickable recommendation card
- `ComparisonTable` — Old vs New regime style
- `TimelineBlock` — milestone timeline

#### C. Update All Pages
Replace raw `{advice}` text blocks with `<AIResponse text={advice} blocks={result?.ui_blocks} />` across all 6 feature pages + ChatPanel.

---

### 4. File Upload → Agent Pipeline

#### [NEW] [upload.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/routers/upload.py)
- `POST /api/upload` — accepts PDF, XLSX, CSV, images
- Uses Gemini Flash for PDF/image parsing (OCR + structured extraction)
- Returns parsed data + routes to appropriate agent (CAMS → MF X-Ray, Form 16 → Tax Wizard, etc.)

#### [MODIFY] [api.ts](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/lib/api.ts)
- Add `uploadFile(file, agentHint)` function

#### [NEW] [FileUpload.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/components/FileUpload.tsx)
- Drag-and-drop upload zone
- Auto-detects document type and routes to agent
- Shows parsed preview before analysis

---

## Open Questions

> [!IMPORTANT]
> 1. **WhatsApp**: Do you have Docker on your machine? If yes → WAHA (clean REST API). If no → `pywhatkit` (browser automation, needs Chrome open).
>
> 2. **Setu**: Can you verify the Product Instance ID from your [Setu Bridge dashboard](https://bridge.setu.co/)? The value `orgservice-prod` looks like a default — it should be a UUID or similar from your specific AA app.
>
> 3. **File upload priority**: Should file upload work for all agents or just MF X-Ray (CAMS) and Tax Wizard (Form 16) for the demo?

---

## Verification Plan

### Automated Tests
- Backend: `python -c "from services.setu_aa import ...; print('OK')"` + hit `/api/aa/test`
- Frontend: `npm run build` must pass with new dependencies
- WhatsApp: Send test message via new service

### Manual Verification
- Open each page → trigger AI analysis → verify markdown renders properly
- Upload a sample PDF → see it parsed and routed
- Run the full demo flow: Voice → AI response with UI blocks → WhatsApp summary
