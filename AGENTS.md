# 项目工作规则
## 工作原则
1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

- 如果用户明确下达“回滚”指令，则本次回滚不需要再额外创建新备份，直接按用户指定的回滚点执行。
- 修改现有功能时，优先在当前真实生效的页面、接口、云函数和配置上直接修正，不要另起一套平行实现。
- 处理问题时，先查看当前真实生效的代码和配置，不要先大范围阅读无关目录或无关规则。
- 项目中的 AI 编辑器适配目录、兼容规则目录、镜像规则文件属于辅助文件，业务源码、项目主文档和当前实际配置才是主源。
- 将本文件作为长期记忆入口，动态维护为记忆路由，而非内容仓库。对于能够提升未来工作正确性、效率或跨会话上下文连续性，且具有长期或阶段性复用价值的信息，应提炼为摘要、索引、路径、适用范围与更新规则，使后续任务开展更高效。此类信息全部放在“##信息索引”章节下。

## 信息索引

## 与用户协作

1. 默认把用户视为编程初学者，尽量少用术语；必须解释时，用通俗说法说明。
2. 在与用户沟通过程中，只要涉及更改代码，必须先把对任务的理解发给用户确认；如有不确定、不清楚的地方，要先直接询问用户；只有在用户明确同意后，才能开始修改代码。
3. 当用户反馈问题时，默认工作流程是：先修改源码，再交给用户测试；用户测试后会告知问题是否解决，或者由 Codex 主动询问“问题是否已经解决”。
4. 修改完成后，需要向用户用通俗语言说明：
   - 改了什么
   - 用户接下来要做什么
   - 如果出问题怎么回滚
5. 每次改完程序后，不能只说“改完了”；必须明确告诉用户下一步该做什么，是需要部署、还是需要测试，并直接说明用户现在具体要做的操作。
6. 以后凡是 Codex 能在当前环境里自己完成的测试、构建、语法检查、脚本断言、云端只读验证，都必须先由 Codex 自己执行；只有真机、微信开发者工具、微信公众平台后台、真实账号操作等 Codex 无法直接完成的部分，才交给用户测试。
7. 以后凡是 Codex 对程序源码进行新增、修改、优化或其他改变，交付前必须由 Codex 自己完成充分测试，并把测试结果作为交付说明的一部分；不得把 Codex 当前环境可以完成的验证直接留给用户。
8. 以后 Codex 在完成自身可执行的完整、严谨测试后，交付说明中还必须明确建议用户可以进行哪些人工验证，并区分“必须做的人工测试”和“建议做的人工测试”。
9. 在这个项目中，如果用户说“记住”，默认把这条内容写入 `AGENTS.md`；只有用户特别指定记到别处时，才按用户指定的位置处理。

## 项目文档规则

1. 处理需求、功能修改、方案判断时，优先参考以下文档：
   - `项目文档/PRD_V4.5.md`
   - `项目文档/技术方案文档_V1.4.md`
   - `项目文档/发布记录.md`
   - `项目文档/CloudBase自动部署规范.md`
   - `项目文档/TinyMCE 6.8.6应用指南.md`
   - `项目文档/官网素材/2026-05-25-现有官网内容抓取.md`
   - `项目文档/官网素材/2026-05-25-PC端案例内容整理.md`
2. 涉及 TinyMCE 的一切工作时，必须先阅读 `项目文档/TinyMCE 6.8.6应用指南.md`，再开始分析、修改或替换相关实现。
3. 以后凡是富文本相关的修改和优化，都必须统一检查并同步所有共用富文本场景，不能只修改案例管理；至少要同时覆盖案例管理、公司管理以及相关预览/展示链路。
4. 只有在用户确认问题已经解决后，才需要检查并同步 PRD 文档或技术方案文档，确保文档内容与最新源码保持一致。
5. 以后每次修改 `PRD` 文档或 `技术方案文档` 时，必须同步更新版本号，并记录本次更改的日期、时间、版本号和变更说明。
6. 涉及 CloudBase 自动部署、环境配置、发布链路变更时，问题确认解决后，再同步相关项目文档。
7. 涉及官网规划、官网设计、官网内容管理或官网前台实现时，必须优先阅读 `项目文档/官网素材/2026-05-25-现有官网内容抓取.md` 和 `项目文档/官网素材/2026-05-25-PC端案例内容整理.md`，并以其中的现有官网文案、三类能力架构、客户素材、PC 端案例内容和联系方式作为基础素材。

## CloudBase 与发布规则

1. 涉及 CloudBase 环境、部署、云函数、静态托管等操作时，必须先确认当前环境 ID，避免误操作到错误环境。
2. 涉及 CloudBase CLI、部署脚本、发布命令时，优先查看官方帮助、现有脚本或现有配置，不要凭猜测编写命令。
3. 涉及删除、覆盖、替换、批量更新云资源的操作时，必须先检查目标范围，确认无误后再执行。
4. 每次 CloudBase 发布后，必须进行结果验证，确认云函数、静态托管或相关资源已经真正更新生效。
5. 如果本次改动同时依赖后端和前端，默认发布顺序为：后端先发，前端后发。
6. 向本地 JSON、配置文件写入工具结果时，先转成字符串再写入，避免因数据类型错误导致写入失败。
7. CloudBase 自动部署与发布细则，统一参考：`项目文档/CloudBase自动部署规范.md`。
8. 以后本项目的 CloudBase CLI 操作默认使用项目专用腾讯云子账号 API 密钥登录态，不再使用主账号扫码授权；如登录态失效，优先按 `项目文档/CloudBase自动部署规范.md` 中的子账号密钥方式恢复，不要重新发起主账号扫码授权。

## 发布记录规则

1. 以后每次上传发布小程序、PC 端后台、云函数，或它们的组合内容后，都必须在 `项目文档/发布记录.md` 里追加一条发布记录。
2. 发布记录必须使用分段方式书写，不使用单行表格记录。
3. 每条发布记录至少包含以下内容：
   - 发布时间
   - 发布类型
   - 发布起因
   - 响应分析
   - 主要更新内容
   - 发布范围
   - 发布前备份
   - 备注
4. `发布起因` 必须写清楚：这是用户提的问题、需求、UI 优化，还是配置调整。
5. `响应分析` 必须写清楚：对这次问题或需求是如何判断的、为什么这样改、哪些重要约束被保留。
6. `主要更新内容` 必须用用户容易看懂的话，写清楚这次实际改了什么。
7. 如果本次发布后用户还没完成验证，记录中不要写“已解决”，只记录本次发布内容和回滚点。

## 发布相关

1. 涉及管理端发布时，优先提醒用户同时关注前端构建产物和相关云函数。
2. 涉及上线操作时，优先提醒用户先做备份，再发布，再验证。

## 备份方式

优先级如下：

1. Git 提交回滚点
2. 本地备份脚本：`scripts/create-release-backup.ps1`
3. 手工导出当前发布包
