# フォーク・リリース運用ルール（AIエージェント向け）

このリポジトリで作業する AI エージェントは、以下を必ず守ること。

## 1. リポジトリの位置づけ

- 本リポジトリは **misskey-dev/misskey** のフォークである。

## 2. フォーク元への操作禁止

- Issue 作成・PR 作成・ブランチの push など、**いかなる操作も misskey-dev/misskey（フォーク元）に対して行ってはいけない**。
- **リモートの区別**
  - `origin` = 本リポジトリ（azuki774/azkey）
  - `upstream` = misskey-dev/misskey
  - PR・push・Issue は **origin のみ**。upstream への操作は禁止。

## 3. 本番相当ブランチ

- 本リポジトリにおける master 相当（本番運用）のブランチは **release** である。

## 4. リリースタグの形式

- upstream が `2025.12.1` の場合、本フォークのタグは **`2025.12.1-azk.1`** とする。
- 同一 upstream バージョンに対する修正を重ねる場合は `2025.12.1-azk.2`, `2025.12.1-azk.3` と増やす。

## 5. 基本運用（upstream 取り込み）

- 指定したタグをフォーク元（upstream）から取得し、本リポジトリの **release** ブランチにマージする。
- コンフリクトは内容を十分に検討してから解消する。
- 併せて以下を更新する:
  - ルートの `package.json` の `version`
  - `packages/misskey-js/package.json` の `version`
  - **version はリリースタグと一致させる**（例: タグ `2025.12.1-azk.1` なら `"version": "2025.12.1-azk.1"`）。
