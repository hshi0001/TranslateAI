# 发布步骤（GitHub + Vercel）

在**已安装 Git** 的终端（如 Git Bash、VS Code 终端）里按顺序执行。

## 一、在 GitHub 创建仓库

1. 打开 https://github.com/new
2. **Repository name** 填：`translate-app`（或你喜欢的名字）
3. 选 **Public**，不要勾选 “Add a README”
4. 点 **Create repository**

## 二、在项目目录执行（替换成你的仓库地址）

在项目根目录 `MVP IDEA` 下打开终端，执行：

```bash
git init
git add .
git commit -m "Initial commit: Translate app"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

把 `你的用户名/你的仓库名` 换成你刚建的仓库，例如：`hangs/translate-app`。

## 三、在 Vercel 部署

1. 打开 https://vercel.com ，用 GitHub 登录
2. 点 **Add New** → **Project**
3. 在列表里选刚推送的 **translate-app**（或你的仓库名）→ **Import**
4. **Environment Variables** 里添加：
   - `GEMINI_API_KEY` = 你的 Gemini API Key
   - `TRANSLATE_JWT_SECRET` = 一串随机字符串（可用：https://generate-secret.vercel.app/32）
5. 点 **Deploy**，等构建完成即可得到线上地址

---

如果终端提示 `git` 不是内部或外部命令，请先安装 Git：  
https://git-scm.com/download/win
