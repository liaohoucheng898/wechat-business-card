# Huayue Official Website Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first browsable HTML prototype of the HuaYue official website home page from `docs/superpowers/specs/2026-05-26-huayue-official-website-design.md`.

**Architecture:** Create one standalone static HTML prototype under a semantic prototype directory. The file contains scoped CSS, semantic sections, lightweight JavaScript for solution tabs and mobile navigation, and static content derived from the approved spec and case materials.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, local HTTP preview.

---

## File Structure

- Create: `项目文档/官网原型/2026-05-26-首页第一版/2026-05-26-huayue-homepage-v1.html`
  - Responsibility: standalone homepage prototype; includes layout, content, styling, responsive behavior, and small interactions.
- No production source files are modified.
- No deployment files are modified.

---

### Task 1: Create Prototype HTML

**Files:**
- Create: `项目文档/官网原型/2026-05-26-首页第一版/2026-05-26-huayue-homepage-v1.html`

- [ ] **Step 1: Create the prototype directory**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'E:\Codex\微信名片\项目文档\官网原型\2026-05-26-首页第一版'
```

Expected: directory exists.

- [ ] **Step 2: Create a standalone HTML file**

Write one HTML file with these required sections:

```text
Header: 首页 / 解决方案 / 客户案例 / 本地服务 / 关于华悦
Hero: main problem sentence, explanation, HuaYue answer, low-noise business visual
Trust Strip: representative customers
Solutions: three tabs for core ERP, pan-ERP, custom development
Scenario Cards: eight management scenarios
Case Posters: first eight cases ordered by backend sort value
Local Service: 20年+ / X名PMP / X个以上 / 本地团队 plus four-step flow
About: short HuaYue positioning
Contact: phone, address, map placeholder
Footer: company name and navigation
```

Expected: file opens as a complete page without external build step.

- [ ] **Step 3: Add minimal JavaScript behavior**

Include JavaScript for:

```text
- Solution tabs switch active panel.
- Mobile menu opens and closes.
- Header links scroll to anchors.
```

Expected: no console syntax errors.

---

### Task 2: Static Content Verification

**Files:**
- Verify: `项目文档/官网原型/2026-05-26-首页第一版/2026-05-26-huayue-homepage-v1.html`

- [ ] **Step 1: Verify required wording**

Run:

```powershell
Select-String -LiteralPath 'E:\Codex\微信名片\项目文档\官网原型\2026-05-26-首页第一版\2026-05-26-huayue-homepage-v1.html' -Pattern '首页','解决方案','客户案例','本地服务','关于华悦','系统越来越多','这些组织，把复杂管理问题交给华悦','本地团队的价值，不只是能到现场' -Encoding UTF8
```

Expected: every pattern appears at least once.

- [ ] **Step 2: Verify forbidden headline wording is absent**

Run:

```powershell
Select-String -LiteralPath 'E:\Codex\微信名片\项目文档\官网原型\2026-05-26-首页第一版\2026-05-26-huayue-homepage-v1.html' -Pattern '客户证据','复杂组织数字化管理服务商' -Encoding UTF8
```

Expected: no matches.

---

### Task 3: Browser Preview Verification

**Files:**
- Preview: `项目文档/官网原型/2026-05-26-首页第一版/2026-05-26-huayue-homepage-v1.html`

- [ ] **Step 1: Start a local HTTP server**

Run from the prototype directory:

```powershell
cmd /c npx.cmd --yes http-server . -p 60421 -c-1
```

Expected: server listens on `http://127.0.0.1:60421/`.

- [ ] **Step 2: Open prototype through HTTP**

Open:

```text
http://127.0.0.1:60421/2026-05-26-huayue-homepage-v1.html
```

Expected: page loads through HTTP, not file protocol.

- [ ] **Step 3: Check desktop and mobile viewports**

Verify:

```text
- Desktop first screen has the approved navigation.
- Hero text is stronger than the visual.
- Solution tabs work.
- 390px mobile width has no horizontal scrolling and readable text.
```

Expected: no obvious layout overlap or horizontal page overflow.
