# Phase 2: CSS基本スタイルのヒント集

## 🎨 CSSの基本概念

### ヒント1: CSSの基本文法
```css
セレクタ {
    プロパティ: 値;
    プロパティ: 値;
}
```

例：
```css
.container {
    width: 400px;
    margin: 0 auto;
}
```

### ヒント2: クラスセレクタの使い方
- HTMLで`class="container"`と書いたら
- CSSでは`.container`と書く（ドット忘れ注意！）

### ヒント3: よく使うCSSプロパティ
```css
/* レイアウト関連 */
width: 400px;          /* 幅 */
height: 200px;         /* 高さ */
margin: 20px;          /* 外側の余白 */
padding: 15px;         /* 内側の余白 */

/* テキスト関連 */
color: #333;           /* 文字色 */
font-size: 16px;       /* 文字サイズ */
text-align: center;    /* 文字揃え */

/* 背景・境界線 */
background-color: #f0f0f0;  /* 背景色 */
border: 1px solid #ddd;     /* 境界線 */
border-radius: 5px;         /* 角の丸み */
```

## 🔧 レイアウトのコツ

### ヒント4: 中央寄せの方法
```css
.container {
    width: 400px;
    margin: 0 auto;  /* 左右の余白を自動調整 → 中央寄せ */
}
```

### ヒント5: フレックスボックス（横並び）
```css
.input-section {
    display: flex;
    gap: 10px;  /* 要素間の隙間 */
}

.input-section input {
    flex: 1;  /* 残りの幅を全て使用 */
}
```

### ヒント6: ボタンのスタイリング
```css
button {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;  /* マウスカーソルが指になる */
}

button:hover {
    background-color: #0056b3;  /* マウスを重ねた時の色 */
}
```

## 🚨 よくある間違いとその解決法

### 間違い1: セレクタの書き方
❌ **間違い例:**
```css
container {  /* ドットがない */
    width: 400px;
}

#container {  /* シャープ（ID用）を使っている */
    width: 400px;
}
```

✅ **正しい例:**
```css
.container {  /* クラスはドットから始める */
    width: 400px;
}
```

### 間違い2: 単位の付け忘れ
❌ **間違い例:**
```css
.container {
    width: 400;  /* 単位がない */
    margin: 20;  /* 単位がない */
}
```

✅ **正しい例:**
```css
.container {
    width: 400px;
    margin: 20px;
}
```

### 間違い3: セミコロンの忘れ
❌ **間違い例:**
```css
.container {
    width: 400px  /* セミコロンがない */
    margin: 20px;
}
```

✅ **正しい例:**
```css
.container {
    width: 400px;
    margin: 20px;
}
```

## 📝 段階別チェックポイント

### Step 1: 基本的なレイアウトができているか？
- [ ] コンテナが中央に配置されている
- [ ] 適切な幅が設定されている
- [ ] 背景色が設定されている

### Step 2: 入力部分のスタイルができているか？
- [ ] 入力欄とボタンが横並びになっている
- [ ] 入力欄が適切な幅になっている
- [ ] ボタンが魅力的な見た目になっている

### Step 3: タスクリストのスタイルができているか？
- [ ] リストの装飾が適切である
- [ ] 各タスクアイテムが見やすくなっている
- [ ] 適切な余白が設定されている

## 🎯 スタイリングのポイント
- まずは大きなレイアウトから始める
- 細かい調整は後回し
- ブラウザで確認しながら少しずつ調整
- 完成版と見比べて同じような見た目になっているか確認
