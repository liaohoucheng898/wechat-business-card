# TinyMCE 6.8.6应用指南

## 一、文档目的

本文档用于给后续接手本项目的 agent 或开发人员提供一份可直接参考的 TinyMCE 6.8.6 使用说明。重点包括：

1. TinyMCE 6.8.6 官方推荐的关键配置思路
2. Vue 3 项目中的标准接法
3. 图片上传、段落间距、内容过滤等高频场景
4. 当前项目里 TinyMCE 的实际使用情况
5. 当前项目出现不稳定问题的可能原因
6. 后续优化时应该保留什么、避免什么

当前项目实际使用版本：

- `tinymce`: `6.8.6`
- `@tinymce/tinymce-vue`: `6.0.1`

## 二、官方资料入口

以下都是 TinyMCE 官方文档，后续排查时优先看这些页面：

1. TinyMCE 6 文档总入口  
   [https://www.tiny.cloud/docs/tinymce/6/](https://www.tiny.cloud/docs/tinymce/6/)
2. Vue 集成技术参考  
   [https://www.tiny.cloud/docs/tinymce/6/vue-ref/](https://www.tiny.cloud/docs/tinymce/6/vue-ref/)
3. Vue + npm / 自托管接入说明  
   [https://www.tiny.cloud/docs/tinymce/6/vue-pm/](https://www.tiny.cloud/docs/tinymce/6/vue-pm/)
4. 内容过滤配置  
   [https://www.tiny.cloud/docs/configure/content-filtering/](https://www.tiny.cloud/docs/configure/content-filtering/)
5. 内容外观配置  
   [https://www.tiny.cloud/docs/tinymce/6/content-appearance/](https://www.tiny.cloud/docs/tinymce/6/content-appearance/)
6. 编辑器外展示内容 CSS  
   [https://www.tiny.cloud/docs/tinymce/6/editor-content-css/](https://www.tiny.cloud/docs/tinymce/6/editor-content-css/)
7. 图片上传说明  
   [https://www.tiny.cloud/docs/tinymce/6/upload-images/](https://www.tiny.cloud/docs/tinymce/6/upload-images/)
8. 图片与文件选项  
   [https://www.tiny.cloud/docs/tinymce/6/file-image-upload/](https://www.tiny.cloud/docs/tinymce/6/file-image-upload/)

## 三、TinyMCE 6.8.6 核心认识

### 1. TinyMCE 负责“编辑”，不是负责你整条业务链

TinyMCE 本体擅长的事情是：

- 在编辑区里输入和排版
- 生成 HTML
- 提供图片、列表、标题、颜色、字号等编辑能力

TinyMCE 不负责：

- 你业务里的云文件 ID 映射
- 小程序 `rich-text` 兼容
- 预览页和线上展示页的统一样式
- 你项目自己的富文本净化规则

所以一旦项目在编辑器外面又加了很多“二次改写 HTML”的逻辑，稳定性就会明显下降。

### 2. `content_style` 只影响编辑器里看到的效果

官方文档明确说明：

- `content_style` 会注入到编辑区里
- 但这些样式不会保存进最终内容

所以：

- 编辑器里看起来有段距
- 不代表保存后预览页和小程序页也会自动有段距

如果展示页也想要同样效果，必须在展示端再提供同样的 CSS。

### 3. `content_css` 更适合做“可复用”的内容样式

官方推荐在经典 iframe 模式下使用 `content_css` 给编辑区加载样式文件，并建议编辑器与展示页尽量共用同一套内容样式。

这条对当前项目特别重要：

- 如果编辑器一套段落样式
- PC 预览一套段落样式
- 小程序展示再一套段落样式

那内容很容易“编辑时正常，保存后变样”。

## 四、Vue 3 中的推荐接法

### 1. 推荐的最小接法

在 Vue 3 项目里，官方推荐核心是：

- 使用 `@tinymce/tinymce-vue`
- 通过 `v-model` 绑定内容
- 用 `init` 传 TinyMCE 配置
- 自托管时通过 `tinymce-script-src` 指向本地 TinyMCE 资源

### 2. `model-events` 不要配得太激进

官方 Vue 集成文档允许自定义 `model-events`。  
对当前项目来说，更稳的思路是：只保留少量、较稳定的事件去触发 `v-model` 更新。

如果额外把：

- `ExecCommand`
- `SetContent`

这类事件也加进来，虽然不一定立刻报错，但很容易产生下面这些副作用：

- 频繁触发外层 `v-model`
- 外层 watch 立即回写编辑器
- 光标跳动
- 连按回车时光标跑到前面
- 某些格式命令触发后内容被重新 setContent

对于当前项目，这一点是高风险项。

## 五、段落、回车、空行相关的关键配置

### 1. `forced_root_block`

这个配置决定普通文本默认用什么块级元素包起来。  
当前项目设置为 `p`，这是合理的。

推荐：

- 普通正文继续使用 `p`
- 标题用 `h2`、`h3`
- 不要混用大量 `div` 充当正文段落

### 2. `pad_empty_with_br`

官方文档说明：

- TinyMCE 默认会把空块元素保存成 `&nbsp;`
- 如果设置 `pad_empty_with_br: true`
- 空段落会被序列化成 `<p><br></p>`

这条配置对当前项目非常重要。

原因：

- 你现在遇到的“编辑器里按回车拉开了距离，保存后又没了”
- 本质上就是“空段落如何保存、如何展示”的问题

如果继续用自定义占位符去硬塞：

- `&#12288;`
- `&#10240;`

就会出现：

- 编辑器一套逻辑
- 预览一套逻辑
- 云函数展示一套逻辑

更稳的方向，是优先让 TinyMCE 用官方机制保存空段落。

### 3. `remove_trailing_brs`

官方文档说明：

- 浏览器会在空块元素末尾注入 `<br>`
- TinyMCE 默认会尝试移除末尾 `<br>`

如果业务需要保留“用户主动插出来的空段落”，可以评估：

- `remove_trailing_brs: false`

但这项不能单独拍脑袋开，需要和当前内容保存链路一起测试。

## 六、内容过滤相关的关键配置

### 1. `valid_elements`

官方文档说明：

- `valid_elements` 会定义保存时允许保留哪些标签和属性
- 一旦你自定义它，就等于你自己接管了大量 HTML 规则

这项非常强，但也非常容易把内容搞坏。

当前项目已经重度使用了它，这会带来两个问题：

1. 稍有遗漏，就会把合法内容过滤掉
2. 后面每次新增一个属性或标签，都要自己补规则

### 2. `extended_valid_elements`

官方文档说明：

- 如果只是想在默认规则基础上增补某些属性
- 优先用 `extended_valid_elements`

这比直接整段重写 `valid_elements` 更稳。

对当前项目来说，更合理的思路是：

- 尽量保留 TinyMCE 默认元素规则
- 只增补项目真正需要的内容
- 例如 `img[data-cloud-file-id]`

### 3. `valid_styles`

官方文档说明：

- 默认情况下，所有样式都是允许的
- 一旦你配置了 `valid_styles`
- 就变成“只允许这些样式”

当前项目这里有一个明显问题：

- TinyEditor 里只允许：`text-align,color,font-size`
- 但项目其它地方实际上又在依赖：`line-height`

这会导致：

- 编辑器阶段看起来一套
- 保存时却把某些样式吃掉
- 预览和小程序端再补一层样式
- 最终形成不一致

如果项目要保留行高，`valid_styles` 至少要和展示规则保持一致。

## 七、图片上传的官方思路

### 1. 官方推荐的上传方式

官方文档给出的主要方式有两类：

1. `images_upload_url`
2. `images_upload_handler`

对于当前项目这种“图片要上传到云端，还要额外记录文件 ID”的场景，`images_upload_handler` 更合适。

### 2. 图片上传时的职责边界

更稳的做法应该是：

1. 编辑器上传图片  
   只负责把图片送上去，并返回一个可立即预览的 URL
2. 保存业务数据  
   只负责把图片和云文件 ID 建立关联
3. 预览和小程序展示  
   只负责把云文件 ID 转成临时 URL

不应该让每一层都去改图片标签结构。

## 八、当前项目里 TinyMCE 的实际使用情况

当前项目后台富文本组件在：

- `admin/src/components/TinyEditor.vue`

当前项目的主要特征：

1. 使用 `@tinymce/tinymce-vue` + 本地自托管脚本
2. 自定义了图片上传逻辑
3. 自定义了富文本内容恢复逻辑
4. 自定义了空段落占位逻辑
5. 自定义了预览内容规范化逻辑
6. 云函数侧又有一套富文本规范化逻辑

也就是说，当前项目不是“只用了 TinyMCE”。

而是：

`TinyMCE + 前端二次改写 + 预览二次改写 + 云函数二次改写`

## 九、当前项目可能存在的问题

### 1. `model-events` 太激进，容易造成光标跳动

当前项目把下面这些事件也加入了 `v-model` 同步：

- `ExecCommand`
- `SetContent`

这意味着：

- 只要编辑器执行命令
- 或外层 setContent
- 就可能触发内容同步

再叠加外层 watch 回写，就非常容易出现：

- 回车后光标跑到文章前面
- 第二次回车开始异常
- 正在编辑的段落被重新设值

### 2. 编辑器内容被反复“重写”

当前项目里，内容至少会经过三轮结构级改写：

1. `TinyEditor.vue` 中的内容恢复与规范化
2. PC 预览中的 `normalizePreviewDocument`
3. 云函数 `_shared/richtext.js` 中的规范化

这类“多层都在改 HTML 结构”的架构非常容易导致：

- 编辑器里有空行，预览里没有
- PC 预览正常，小程序不正常
- 这次修了图片，下次又坏段距

### 3. 用自定义占位符保存空段落，风险高

当前项目用过空白占位符：

- `&#12288;`
- `&#10240;`

这不是 TinyMCE 官方优先推荐的空段落方案。

风险包括：

- 编辑器认得，展示端不一定认得
- 展示端认得，净化函数不一定保得住
- 不同浏览器、不同渲染端表现不一致

### 4. 编辑区样式与展示区样式不是同一来源

当前项目编辑器里通过 `content_style` 定义了段落视觉效果。  
但保存后的内容在：

- PC 预览
- 小程序详情

又分别用其他样式和规则展示。

这会直接导致：

- 编辑时的段距不等于展示时的段距
- 标题和正文的上下间距容易漂移

### 5. `valid_elements` 重写过重

当前项目自己完整指定了 `valid_elements`，这会让 TinyMCE 默认的很多容错和兼容能力失效。

一旦规则漏掉：

- 某些合法标签被删
- 某些属性被删
- 某些块结构被重排

后续维护难度会越来越高。

### 6. `valid_styles` 与项目真实需求不一致

当前项目展示链路实际依赖：

- `font-size`
- `color`
- `text-align`
- `line-height`

但编辑器层只允许前三项，不允许 `line-height`。  
这属于明显不一致。

## 十、对当前项目的优化建议

### 建议一：先做“减法”，不要再继续叠加补丁

当前最需要的不是再补一个空格占位符，也不是再补一层 `normalize`。

而是把链路收缩成下面这样：

1. 编辑器负责编辑
2. 上传逻辑负责图片上传
3. 保存逻辑只做最小业务转换
4. 预览和展示只做 URL 替换和样式呈现

不要三层同时改内容结构。

### 建议二：优先用 TinyMCE 官方机制处理空段落

优先评估这组方向：

- `pad_empty_with_br: true`
- 根据测试评估是否需要 `remove_trailing_brs: false`

目标是：

- 空行用 TinyMCE 官方支持的 `<br>` 机制保存
- 不再用自定义占位符硬撑空段落

### 建议三：收缩 `model-events`

推荐优先退回到更接近官方默认的范围：

- `change input undo redo`

如果后续测试证明还可以更稳，可以进一步缩到更保守的范围。

但不建议继续把：

- `ExecCommand`
- `SetContent`

放进常规 `v-model` 同步链。

### 建议四：减少 `valid_elements` 重写，改用 `extended_valid_elements`

推荐思路：

1. 尽量恢复 TinyMCE 默认合法元素规则
2. 只对项目业务确实要补的属性做扩展

例如：

- `img[data-cloud-file-id]`

这样维护成本会明显下降。

### 建议五：统一内容样式来源

推荐建立一份共享的“富文本展示样式”：

1. 编辑器内使用
2. PC 预览使用
3. 非编辑态展示使用

原则是：

- 段距规则一份
- 标题规则一份
- 图片规则一份

这样才能做到“编辑看到什么，展示基本就是什么”。

### 建议六：图片链路只做 URL 映射，不改文档结构

推荐后续规范：

1. 保存时保留一个稳定的图片标识
2. 展示时把标识换成临时 URL
3. 不要在多处反复改 `<img>` 结构

## 十一、给后续 agent 的明确建议

### 可以做

1. 使用 TinyMCE 官方配置解决段落与空行问题
2. 使用 `images_upload_handler` 对接项目上传逻辑
3. 使用 `extended_valid_elements` 追加项目专有属性
4. 让编辑区和展示区尽量共用同一套内容样式

### 不要做

1. 不要再新增一套新的空白占位符方案
2. 不要在前端预览、云函数、小程序三处同时改内容结构
3. 不要一边限制 `valid_styles`，一边又在别处依赖被限制掉的样式
4. 不要把 `ExecCommand`、`SetContent` 这类高频内部事件继续直接接进常规双向绑定
5. 不要为了解决展示问题，反向污染编辑器原始内容

## 十二、推荐的后续落地顺序

如果后面要正式把当前项目的 TinyMCE 修稳，建议按下面顺序推进：

1. 先收缩 `model-events`
2. 再切换空段落保存策略，优先验证 `pad_empty_with_br`
3. 再减少 `valid_elements` 与 `valid_styles` 的过度定制
4. 最后统一编辑区、PC 预览、小程序展示的内容样式

不建议反过来做。  
如果先继续补展示端兼容，会把问题越修越散。

## 十三、结论

当前项目的主要问题，不像是“TinyMCE 6.8.6 本身不稳定”，更像是：

`TinyMCE 外围被加了太多结构改写、样式补偿、内容回写逻辑，最终把编辑、保存、预览、小程序展示搅在了一起。`

所以正确方向不是立刻换控件，而是：

1. 先按官方思路给 TinyMCE 减负
2. 让编辑器只做编辑
3. 让展示层只做展示
4. 把空段落和段距交给更稳定的官方配置与统一样式来处理

如果这几步做完还不稳，再评估是否替换编辑器，才是更合理的路径。
