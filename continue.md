# Claudable 继续开发规划

本文档旨在规划 Claudable 项目的下一阶段开发，核心目标是将项目从一个“项目生成工具”转变为一个功能更强大的“本地代码库 AI 开发助手”。用户将能够连接到本地的 Git 仓库，选择特定分支，并利用 AI 代理进行代码的修改、开发和版本控制。

## 核心需求

1.  **本地项目管理:**
    *   支持配置一个本地的项目根目录（例如 `~/code/github/`）。
    *   用户可以在界面上浏览、添加（通过 `git clone`）和删除这个根目录下的项目。
    *   假设用户的 Git SSH 密钥已配置好，所有 Git 操作都通过 SSH 进行。

2.  **增强的开发流程:**
    *   **项目选择:** 用户首先选择一个要操作的本地项目。
    *   **分支选择:** 进入项目后，用户可以选择或切换 Git 分支。
    *   **AI 交互:** 在选定的项目和分支上下文中，用户与 AI 代理（如 Claude Code）进行交互来修改代码。
    *   **分支交互:** 添加一个刷新按钮，用户可以执行  git fetch 操作，这样可以获取最新的分支信息

3.  **新的 API 支持:**
    *   **项目管理:**
        *   列出指定根目录下的所有 Git 项目。
        *   通过 SSH URL `git clone` 一个新项目到根目录。
        *   删除一个本地项目（从文件系统和数据库中）。
    *   **Git 操作:**
        *   列出指定项目的所有分支。
        *   为指定项目执行 `git fetch` 以更新远程分支信息。
        *   支持切换到指定分支 (`git checkout`)。

4.  **UI/UX 改进:**
    *   **新的主页/项目选择页:** 应用的首页将变为一个项目列表，展示所有在根目录下的项目。
    *   **新的交互流程:**
        1.  用户在主页选择一个项目。
        2.  进入该项目的“聊天”或“工作区”页面。
        3.  在该页面中，用户可以看到当前分支，并可以切换到其他分支。
        4.  然后，用户像现在一样选择 AI 代理和模型，开始进行代码开发。
    *   **历史会话:** 所有的聊天和操作历史将与具体的项目和分支关联。

5.  **配置优化:**
    *   在 `.env` 文件中添加一个新的环境变量，用于指定项目根目录。
    *   Setting 页面应支持配置默认的 AI 代理和模型，API 在未指定时应使用这些默认值。

## 开发计划 (TODO List)

### 第一阶段：后端 API 和核心逻辑

-   [ ] **环境配置:** 在 `app/core/config.py` 中添加 `PROJECTS_ROOT_DIR` 配置项，从 `.env` 文件读取，并提供一个合理的默认值（如 `~/code/github`）。
-   [ ] **数据库模型更新:**
    -   修改 `Project` 模型，将 `repo_path` 字段的含义从“内部生成的路径”改为“指向本地代码库的绝对路径”。
    -   添加 `branches` (JSON) 和 `current_branch` (String) 字段到 `Project` 模型，用于缓存和追踪分支信息。
-   [ ] **Git 操作服务:** 创建一个新的服务模块 `app/services/git_service.py`，封装所有 Git 命令行操作（`clone`, `fetch`, `branch`, `checkout` 等），并处理相关的输出和错误。
-   [ ] **新的 Project API:**
    -   `GET /api/projects`: 修改此接口，使其扫描 `PROJECTS_ROOT_DIR` 目录，返回所有有效的 Git 项目列表，并与数据库中的记录进行同步。
    -   `POST /api/projects`: 修改此接口，使其接受一个 Git SSH URL，调用 `git_service.py` 来 `clone` 项目到本地。
    -   `DELETE /api/projects/{project_id}`: 修改此接口，使其能从文件系统中删除整个项目目录。
-   [ ] **新的 Git API:**
    -   `GET /api/projects/{project_id}/branches`: 获取项目的所有本地和远程分支。
    -   `POST /api/projects/{project_id}/fetch`: 对项目执行 `git fetch`。
    -   `POST /api/projects/{project_id}/checkout`: 切换到指定分支。
-   [ ] **AI 交互逻辑调整:**
    -   修改 `UnifiedCLIManager`，确保所有 AI 操作（读写文件、执行命令）都在 `project.repo_path` 所指定的目录下执行。
    -   在 AI 的系统提示（System Prompt）中注入当前项目和分支的上下文信息。

### 第二阶段：前端 UI 和用户体验

-   [ ] **新的项目列表页面:**
    -   修改 `apps/web/app/page.tsx`，将其重构为一个项目浏览器，展示从 `GET /api/projects` 获取的项目列表。
    -   添加“添加新项目”的模态框，允许用户输入 Git SSH URL 来 clone 新项目。
-   [ ] **新的工作区页面:**
    -   创建一个新的页面 `apps/web/app/[project_id]/workspace/page.tsx` (或类似路由)。
    -   在该页面顶部添加一个分支选择器（下拉菜单），调用 `GET /api/projects/{project_id}/branches` 和 `POST /api/projects/{project_id}/checkout` 来显示和切换分支。
-   [ ] **重构聊天界面:**
    -   将现有的聊天交互界面（`ChatInterface` 等组件）集成到新的工作区页面中。
    -   确保所有的 AI 请求都包含了当前选定的项目 ID 和分支信息。
-   [ ] **设置页面更新:**
    -   在 `SettingsModal` 中添加对默认 AI 代理和模型的配置选项。

### 第三阶段：集成和测试

-   [ ] **端到端测试:** 手动测试完整的用户流程：添加项目 -> 选择项目 -> 切换分支 -> 使用 AI 修改代码 -> 验证文件变更和 Git 提交。
-   [ ] **文档更新:** 更新 `README.md`，说明新的本地项目开发模式和所需的配置。
