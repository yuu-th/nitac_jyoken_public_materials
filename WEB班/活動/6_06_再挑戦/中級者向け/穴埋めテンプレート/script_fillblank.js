// ===== アプリケーション初期化 =====
document.addEventListener("______", function () {
  console.log("📚 学習タスク管理アプリ開始！");

  // Phase 3で学習: 要素の取得
  const taskCheckboxes = document.querySelectorAll("______");
  const progressFill = document.getElementById("______");
  const progressText = document.getElementById("______");
  const completionMessage = document.getElementById("______");

  // Phase 3で学習: 各チェックボックスにイベントを追加
  taskCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("______", function () {
      handleTaskChange(this);
    });
  });

  // タスクの状態が変更された時の処理
  function handleTaskChange(checkbox) {
    const taskItem = checkbox.closest("______");

    if (checkbox.checked) {
      // Phase 3で学習: 完了時の処理
      taskItem.classList.add("______");
    } else {
      // Phase 3で学習: 未完了時の処理
      taskItem.classList.______("completed");
    }

    // 進捗バーを更新
    ______();
  }

  // 進捗バーの更新
  function updateProgress() {
    const totalTasks = taskCheckboxes.______;
    const completedTasks = document.querySelectorAll("______").length;
    const percentage = Math.round((completedTasks / totalTasks) * ___);

    // Phase 3で学習: 進捗バーのアニメーション
    progressFill.style.______ = percentage + "____";
    progressText.______ = `${completedTasks} / ${totalTasks} 完了 (${percentage}%)`;

    // 全タスク完了時の表示
    if (completedTasks === totalTasks) {
      completionMessage.style.______ = "______";
    } else {
      completionMessage.style.display = "______";
    }
  }

  // 完了メッセージをクリックで閉じる
  completionMessage.addEventListener("______", function () {
    completionMessage.style.display = "______";
  });

  // 初期状態の進捗を計算
  ______();
});

/*
穴埋めのヒント:
1. DOMContentLoaded - HTMLが読み込まれた後に実行
2. .task-checkbox - チェックボックスのクラスセレクタ
3. progressFill - 進捗バーの中身のID
4. progressText - 進捗テキストのID
5. completionMessage - 完了メッセージのID
6. change - チェックボックスの変更イベント
7. .task-item - タスクアイテムのクラスセレクタ
8. completed - 完了状態のクラス名
9. remove - クラスを削除するメソッド
10. updateProgress - 進捗更新関数名
11. length - 配列の長さプロパティ
12. .task-checkbox:checked - チェック済みのチェックボックス
13. 100 - パーセンテージ計算用
14. width - 幅のスタイルプロパティ
15. % - パーセンテージの単位
16. textContent - テキスト内容のプロパティ
17. display - 表示スタイルプロパティ
18. block - 表示状態
19. none - 非表示状態
20. click - クリックイベント
21. none - 非表示状態
22. updateProgress - 初期化時の関数呼び出し
*/
