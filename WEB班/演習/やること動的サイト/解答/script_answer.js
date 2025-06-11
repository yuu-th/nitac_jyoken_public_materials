// ===== アプリケーション初期化 =====
document.addEventListener("DOMContentLoaded", function () {
  console.log("📚 学習タスク管理アプリ開始！");

  // Phase 3で学習: 要素の取得
  const taskCheckboxes = document.querySelectorAll(".task-checkbox");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const completionMessage = document.getElementById("completionMessage");

  // Phase 3で学習: 各チェックボックスにイベントを追加
  taskCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      handleTaskChange(this);
    });
  });

  // タスクの状態が変更された時の処理
  function handleTaskChange(checkbox) {
    const taskItem = checkbox.closest(".task-item");

    if (checkbox.checked) {
      // Phase 3で学習: 完了時の処理
      taskItem.classList.add("completed");
    } else {
      // Phase 3で学習: 未完了時の処理
      taskItem.classList.remove("completed");
    }

    // 進捗バーを更新
    updateProgress();
  }

  // 進捗バーの更新
  function updateProgress() {
    const totalTasks = taskCheckboxes.length;
    const completedTasks = document.querySelectorAll(".task-checkbox:checked").length;
    const percentage = Math.round((completedTasks / totalTasks) * 100);

    // Phase 3で学習: 進捗バーのアニメーション
    progressFill.style.width = percentage + "%";
    progressText.textContent = `${completedTasks} / ${totalTasks} 完了 (${percentage}%)`;

    // 全タスク完了時の表示
    if (completedTasks === totalTasks) {
      completionMessage.style.display = "block";
    } else {
      completionMessage.style.display = "none";
    }
  }

  // 完了メッセージをクリックで閉じる
  completionMessage.addEventListener("click", function () {
    completionMessage.style.display = "none";
  });

  // 初期状態の進捗を計算
  updateProgress();
});
