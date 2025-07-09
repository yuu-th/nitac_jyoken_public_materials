// CLI用のNode.jsスクリプト例（クラスなし・関数分割・保守性重視）
// todo_cli_refactored_noclass.js
//
// このファイルは、JavaScriptの基礎から実践まで学習するためのTodo CLIアプリケーションです。
// 初心者がJavaScriptの概念を理解しやすいよう、詳細なコメントを追加しています。

// Node.jsのreadlineモジュールを読み込み（ユーザー入力を処理するため）
const readline = require("readline");

// readlineインターフェースを作成（標準入力・出力を使用）
const rl = readline.createInterface({
  input: process.stdin, // 標準入力（キーボード）から入力を受け取る
  output: process.stdout, // 標準出力（画面）に出力する
});

// メニューの選択肢を配列で定義（定数として管理）
const MENU = ["タスク追加", "一覧(forEach)", "一覧(for)", "一覧(while)", "完了", "削除", "検索", "統計", "プロパティ", "終了"];

// タスクを格納する配列（プログラム実行中のデータを保持）
let tasks = [];

function createTask(title, desc = null, priority = 1, important = false) {
  return {
    title: title || "無題",
    desc: desc ?? "説明なし",
    priority: Number(priority),
    important: Boolean(important),
    completed: false,
    created: new Date(),
  };
}

function addTask(task) {
  tasks.push(task);
}

function listTasks(mode = "forEach") {
  if (tasks.length === 0) {
    console.log("タスクがありません");
    return;
  }
  if (mode === "forEach") {
    tasks.forEach((t, i) => {
      console.log(`${i + 1}: [${t.completed ? "x" : " "}] ${t.title} (優先度:${t.priority}, 重要:${t.important ? "!" : "-"})`);
    });
  } else if (mode === "for") {
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      console.log(`${i + 1}: [${t.completed ? "x" : " "}] ${t.title}`);
    }
  } else if (mode === "while") {
    let i = 0;
    while (i < tasks.length) {
      const t = tasks[i];
      console.log(`${i + 1}: [${t.completed ? "x" : " "}] ${t.title}`);
      i++;
    }
  }
}

function completeTask(idx) {
  if (tasks[idx] && !tasks[idx].completed) {
    tasks[idx].completed = true;
    console.log("完了にしました!");
  } else {
    console.log("無効な番号または既に完了済み");
  }
}

function deleteTask(idx) {
  try {
    if (tasks[idx]) {
      tasks.splice(idx, 1);
      console.log("削除しました!");
    } else {
      throw new Error("無効な番号");
    }
  } catch (e) {
    console.log("エラー:", e.message);
  }
}

function searchTasks(word) {
  const found = tasks.filter((t) => t.title.includes(word));
  if (found.length > 0) {
    found.forEach((t, i) => console.log(`${i + 1}: [${t.completed ? "x" : " "}] ${t.title}`));
    console.log(
      "全て完了:",
      found.every((t) => t.completed),
      "未完了あり:",
      found.some((t) => !t.completed)
    );
  } else {
    console.log("該当タスクなし");
  }
}

function showStats() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const allCompleted = tasks.every((t) => t.completed);
  const hasIncomplete = tasks.some((t) => !t.completed);
  const eq = total == completed;
  const strictEq = total === completed;
  console.log(`総数: ${total}, 完了: ${completed}, 未完了: ${total - completed}`);
  console.log(`全て完了: ${allCompleted ? "はい" : "いいえ"}, 未完了あり: ${hasIncomplete ? "はい" : "いいえ"}`);
  console.log(`==: ${eq}, ===: ${strictEq}`);
}

function showTaskProperties(idx) {
  if (typeof idx !== "number" || idx < 0 || idx >= tasks.length) {
    console.log("無効な番号");
    return;
  }
  const task = tasks[idx];
  console.log("プロパティ一覧:");
  for (const [key, value] of Object.entries(task)) {
    console.log(`  ${key}: ${value}`);
  }
}

function promptAddTask() {
  rl.question("タスク名: ", (title) => {
    rl.question("説明: ", (desc) => {
      rl.question("優先度(数字): ", (priority) => {
        rl.question("重要? (true/false): ", (important) => {
          const task = createTask(title, desc, priority, important === "true");
          addTask(task);
          console.log(`追加しました! (${task.title})`);
          showMenu();
        });
      });
    });
  });
}

function promptCompleteTask() {
  rl.question("完了にする番号: ", (num) => {
    const idx = Number(num) - 1;
    completeTask(idx);
    showMenu();
  });
}

function promptDeleteTask() {
  rl.question("削除する番号: ", (num) => {
    const idx = Number(num) - 1;
    deleteTask(idx);
    showMenu();
  });
}

function promptSearchTask() {
  rl.question("検索ワード: ", (word) => {
    searchTasks(word);
    showMenu();
  });
}

function promptShowProperties() {
  rl.question("プロパティを見たいタスク番号: ", (num) => {
    showTaskProperties(Number(num) - 1);
    showMenu();
  });
}

function showMenu() {
  console.log("\n" + MENU.map((item, i) => `${i + 1}. ${item}`).join("  "));
  rl.question("操作を選んでください: ", (answer) => {
    switch (answer.trim()) {
      case "1":
        promptAddTask();
        break;
      case "2":
        listTasks("forEach");
        showMenu();
        break;
      case "3":
        listTasks("for");
        showMenu();
        break;
      case "4":
        listTasks("while");
        showMenu();
        break;
      case "5":
        promptCompleteTask();
        break;
      case "6":
        promptDeleteTask();
        break;
      case "7":
        promptSearchTask();
        break;
      case "8":
        showStats();
        showMenu();
        break;
      case "9":
        promptShowProperties();
        break;
      case "10":
        rl.close();
        break;
      default:
        console.log("1～10の番号で選択してください");
        showMenu();
    }
  });
}

// コメント例
// これは単一行コメントです
/*
  これは複数行コメントです。
  文法事項の説明やサンプルをここに書けます。
*/

showMenu();
