// ===== Phase 3: JavaScript による DOM 操作を学ぼう！ =====
// 🎯 学習目標: ユーザーの操作に反応して画面を動的に変更する

// ===== Step 1: 画面が読み込まれたときの処理 =====
// ↓ この部分は「画面の準備ができたら実行する」という意味
document.addEventListener("DOMContentLoaded", function () {
  console.log("📚 アプリがスタートしました！");

  // ===== Step 2: HTML要素を取得する =====
  // ❓ 質問: なぜ要素を「取得」する必要があるのでしょうか？
  // 💡 ヒント: JavaScriptから変更するには、まず対象を指定する必要があります

  // TODO 1: チェックボックスをすべて取得しよう
  // 💡 ヒント: document.querySelectorAll(".task-checkbox") を使う
  const taskCheckboxes = /* ここにコードを書く */;

  // TODO 2: 進捗バーの要素を取得しよう
  // 💡 ヒント: document.getElementById("要素のID") を使う
  const progressFill = /* ここにコードを書く */;
  const progressText = /* ここにコードを書く */;
  const completionMessage = /* ここにコードを書く */;

  // ===== Step 3: イベントリスナーを追加する =====
  // ❓ 質問: イベントリスナーとは何でしょうか？
  // 💡 ヒント: 「○○が起こったときに△△を実行する」という仕組み

  // TODO 3: 各チェックボックスに「変更」イベントを追加しよう
  taskCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener(/* イベントの種類 */, function () {
      handleTaskChange(this);
    });
  });

  // ===== Step 4: タスクの状態変更処理 =====
  // この関数は「チェックボックスが変更されたとき」に呼ばれます
  function handleTaskChange(checkbox) {
    // 親要素（タスク全体）を取得
    const taskItem = checkbox.closest(".task-item");

    if (checkbox.checked) {
      // TODO 4: タスクが完了したときの処理
      // 💡 ヒント: taskItem に "completed" クラスを追加する
      taskItem.classList./* メソッド名 */("completed");
    } else {
      // TODO 5: タスクが未完了に戻ったときの処理
      // 💡 ヒント: taskItem から "completed" クラスを削除する
      taskItem.classList./* メソッド名 */("completed");
    }

    // 進捗バーを更新
    updateProgress();
  }

  // ===== Step 5: 進捗バーの更新 =====
  function updateProgress() {
    // TODO 6: 完了したタスクの数を数えよう
    const totalTasks = taskCheckboxes.length;
    const completedTasks = document.querySelectorAll(/* セレクタ */).length;
    const percentage = Math.round((completedTasks / totalTasks) * 100);

    // TODO 7: 進捗バーの幅を変更しよう
    // 💡 ヒント: style.width プロパティを使う
    progressFill.style.width = /* パーセンテージ */ + "%";
    
    // TODO 8: 進捗テキストを更新しよう
    progressText.textContent = `${completedTasks} / ${totalTasks} 完了 (${percentage}%)`;

    // TODO 9: 全タスク完了時の処理
    if (/* 完了条件 */) {
      completionMessage.style.display = "block";
    } else {
      completionMessage.style.display = "none";
    }
  }

  // ===== Step 6: 完了メッセージを閉じる処理 =====
  // TODO 10: 完了メッセージをクリックで閉じられるようにしよう
  completionMessage.addEventListener(/* イベントタイプ */, function () {
    completionMessage.style.display = /* 表示状態 */;
  });

  // 最初の進捗を計算
  updateProgress();
});

// ===== 🎓 学習のまとめ =====
// ✅ document.querySelector() / querySelectorAll() で要素を取得
// ✅ addEventListener() でイベントを監視
// ✅ classList.add() / remove() でCSSクラスを操作
// ✅ style プロパティでスタイルを直接変更
// ✅ textContent でテキスト内容を変更

// 🚀 次のステップ: 実際にコードを完成させて動作を確認してみよう！
