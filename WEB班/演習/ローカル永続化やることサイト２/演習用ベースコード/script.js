// ===== ローカル永続化やることサイト２ ベースコード =====
// （localStorage機能は意図的に未実装 - 演習で段階的に追加）

document.addEventListener("DOMContentLoaded", function () {
  console.log("📚 永続化学習タスク管理アプリ開始！");

  // 要素の取得
  const taskInput = document.getElementById("taskInput");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const taskList = document.getElementById("taskList");
  const emptyMessage = document.getElementById("emptyMessage");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const completionMessage = document.getElementById("completionMessage");

  // タスクデータ（配列形式） - まだlocalStorageからの読み込みなし
  let tasks = [];

  // タスク追加ボタンのクリックイベント
  addTaskBtn.addEventListener("click", function () {
    addTask();
  });

  // Enterキーでもタスクを追加できるように
  taskInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      addTask();
    }
  });

  // タスクを追加する関数（まだlocalStorage保存なし）
  function addTask() {
    const taskText = taskInput.value.trim();

    if (taskText === "") {
      alert("タスクを入力してください");
      return;
    }

    // 新しいタスクオブジェクトを作成
    const newTask = {
      id: Date.now(), // 簡易的なID生成
      text: taskText,
      completed: false,
    };

    // タスク配列に追加
    tasks.push(newTask);

    // 入力フィールドをクリア
    taskInput.value = "";

    // 画面に表示
    renderTasks();
    updateProgress();

    console.log("✅ タスクを追加しました:", newTask.text);
  }

  // タスクリストを画面に表示する関数
  function renderTasks() {
    // 既存のタスクリストをクリア
    taskList.innerHTML = "";

    if (tasks.length === 0) {
      // タスクがない場合は空のメッセージを表示
      taskList.appendChild(emptyMessage);
      return;
    }

    // 各タスクを画面に追加
    tasks.forEach((task) => {
      const taskItem = createTaskElement(task);
      taskList.appendChild(taskItem);
    });
  }

  // 個別のタスク要素を作成する関数
  function createTaskElement(task) {
    const taskItem = document.createElement("div");
    taskItem.className = "task-item";
    if (task.completed) {
      taskItem.classList.add("completed");
    }

    taskItem.innerHTML = `
      <input type="checkbox" id="task-${task.id}" class="task-checkbox" ${task.completed ? "checked" : ""}>
      <label for="task-${task.id}" class="task-label">${task.text}</label>
      <button class="task-delete" data-id="${task.id}">削除</button>
    `;

    // チェックボックスのイベントリスナー
    const checkbox = taskItem.querySelector(".task-checkbox");
    checkbox.addEventListener("change", function () {
      toggleTask(task.id);
    });

    // 削除ボタンのイベントリスナー
    const deleteBtn = taskItem.querySelector(".task-delete");
    deleteBtn.addEventListener("click", function () {
      deleteTask(task.id);
    });

    return taskItem;
  }

  // タスクの完了状態を切り替える関数（まだlocalStorage更新なし）
  function toggleTask(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      renderTasks();
      updateProgress();
      console.log("🔄 タスク状態を変更:", task.text, task.completed ? "完了" : "未完了");
    }
  }

  // タスクを削除する関数（まだlocalStorageからの削除なし）
  function deleteTask(taskId) {
    tasks = tasks.filter((t) => t.id !== taskId);
    renderTasks();
    updateProgress();
    console.log("🗑️ タスクを削除しました");
  }

  // 進捗バーを更新する関数
  function updateProgress() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // 進捗バーの表示を更新
    progressFill.style.width = percentage + "%";
    progressText.textContent = `${completedTasks} / ${totalTasks} 完了 (${percentage}%)`;

    // 全て完了した場合の処理
    if (totalTasks > 0 && completedTasks === totalTasks) {
      showCompletionMessage();
    } else {
      hideCompletionMessage();
    }
  }

  // 完了メッセージを表示
  function showCompletionMessage() {
    completionMessage.style.display = "block";
  }

  // 完了メッセージを非表示
  function hideCompletionMessage() {
    completionMessage.style.display = "none";
  }

  // 完了メッセージをクリックで閉じる
  completionMessage.addEventListener("click", function () {
    hideCompletionMessage();
  });

  // 初期状態の進捗を表示
  updateProgress();
});
