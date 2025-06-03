# Phase 1: HTML構造のヒント集

## 🔍 HTML構造を理解するためのヒント

### ヒント1: HTML文書の基本構造
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <!-- ページの情報（タイトル、文字コードなど） -->
</head>
<body>
    <!-- 実際に表示される内容 -->
</body>
</html>
```

### ヒント2: divタグの役割
- `<div>`は「容器」のようなもの
- 関連する要素をグループ化するために使用
- `class`属性で名前を付けて、後でCSSでスタイルを適用

### ヒント3: 入力フォームの作成
```html
<input type="text" placeholder="何かを入力してください">
<button>ボタン</button>
```

### ヒント4: リスト構造
```html
<ul>
    <li>項目1</li>
    <li>項目2</li>
    <li>項目3</li>
</ul>
```

## 🚨 よくある間違いとその解決法

### 間違い1: タグの閉じ忘れ
❌ **間違い例:**
```html
<div>
    <p>段落です
</div>
```

✅ **正しい例:**
```html
<div>
    <p>段落です</p>
</div>
```

### 間違い2: 属性の書き方
❌ **間違い例:**
```html
<div class=container>
<input type=text>
```

✅ **正しい例:**
```html
<div class="container">
<input type="text">
```

## 📝 段階別チェックポイント

### Step 1: 基本構造ができているか？
- [ ] `<!DOCTYPE html>`が先頭にある
- [ ] `<html lang="ja">`がある
- [ ] `<head>`と`<body>`がある
- [ ] タイトルが設定されている

### Step 2: 必要な要素があるか？
- [ ] タスク入力欄（input要素）
- [ ] 追加ボタン（button要素）
- [ ] タスクリスト（ul要素）

### Step 3: 構造が整理されているか？
- [ ] コンテナ（.container）でまとめられている
- [ ] 入力部分（.input-section）がある
- [ ] リスト部分（.task-list）がある

## 🎯 完成目標
完成版のHTMLと見比べて、同じような構造になっているか確認しましょう。
見た目は気にせず、まずは必要な要素がすべて含まれていることが重要です。
