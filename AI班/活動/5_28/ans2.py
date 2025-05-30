import tkinter as tk
from enum import Enum
from random import randint
from tkinter import ttk


class Result(Enum):
    bigger = "Bigger"
    smaller = "Smaller"
    equal = "Equal"
    invalid = "Invalid"
    finished = "Finished"


class Game:
    def __init__(self, trial_count: int, min_number=1, max_number=30):
        self._max_number = max_number
        self._min_number = min_number
        self.trial_count = trial_count
        self.tried_count = 0

        self._answer = randint(min_number, max_number)

    def check(self, number: int) -> Result:
        # ガード節
        if number < self._min_number or number > self._max_number:
            return Result.invalid
        if self._check_if_remaining_count():
            return Result.finished
        self.tried_count += 1
        if self._answer == number:
            return Result.equal
        elif self._answer > number:
            return Result.smaller
        elif self._answer < number:
            return Result.bigger
        else:
            assert False

    def finish_and_get_answer(self) -> int:
        self.tried_count = self.trial_count
        return self._answer


class GUI:
    def __init__(self):
        self.game = Game(10)  # 10回の試行回数でゲームを初期化

        self._init_tkinter()

    def on_enter(self, event):
        """Enterキーが押された時の処理"""
        self.check_number()

    def check_number(self):
        """入力された数字をチェックする"""
        try:
            number = int(self.entry.get())

            result = self.game.check(number)

            # 結果に応じたメッセージを作成
            message = f"試行{self.game.tried_count}: {number} → "

            if result == Result.equal:
                message += "正解！おめでとうございます！🎉"
                self._add_output(message)
                self.game_over(True)
            elif result == Result.bigger:
                message += "もっと小さい数字です"
                self._add_output(message)
            elif result == Result.smaller:
                message += "もっと大きい数字です"
                self._add_output(message)
            elif result == Result.invalid:
                message += f"無効な入力です（{self.game._min_number}～{self.game._max_number}の範囲で入力してください）"
                self._add_output(message)

            elif result == Result.finished:
                message += "ゲームオーバー"

            # 入力欄をクリア
            self.entry.delete(0, tk.END)

        except ValueError:
            self._add_output("数字を入力してください。")

    def _add_output(self, message):
        """出力ボックスにメッセージを追加"""
        self.output_text.config(state=tk.NORMAL)
        self.output_text.insert(tk.END, message + "\n")
        self.output_text.config(state=tk.DISABLED)
        self.output_text.see(tk.END)  # 最新のメッセージまでスクロール

    def game_over(self, won):
        """ゲーム終了処理"""
        if won:
            self._add_output("🎉 ゲームクリア！🎉")
        else:
            self._add_output(f"ゲームオーバー。正解は {self.game._answer} でした。")

        # 入力を無効化
        self.entry.config(state=tk.DISABLED)
        self.submit_button.config(state=tk.DISABLED)

    def _reset_game(self):
        """ゲームをリセット"""
        self.game = Game(10)
        self.trial_label.config(
            text=f"試行回数: {self.game.tried_count}/{self.game.trial_count}"
        )

        # 出力をクリア
        self.output_text.config(state=tk.NORMAL)
        self.output_text.delete(1.0, tk.END)
        self.output_text.config(state=tk.DISABLED)

        # 入力欄とボタンを有効化
        self.entry.config(state=tk.NORMAL)
        self.submit_button.config(state=tk.NORMAL)
        self.entry.delete(0, tk.END)

        # 初期メッセージ
        self._add_output("新しいゲームを開始しました！数字を当ててください。")

    def run(self):
        """GUIを実行"""
        self.root.mainloop()

    def _init_tkinter(self):
        # メインウィンドウの設定
        self.root = tk.Tk()
        self.root.title("数当てゲーム")
        self.root.geometry("400x300")

        # タイトルラベル
        self.title_label = tk.Label(
            self.root,
            text=f"数当てゲーム ({self.game._min_number}～{self.game._max_number})",
            font=("Arial", 16, "bold"),
        )
        self.title_label.pack(pady=10)

        # 試行回数表示
        self.trial_label = tk.Label(
            self.root,
            text=f"試行回数: {self.game.tried_count}/{self.game.trial_count}",
            font=("Arial", 12),
        )
        self.trial_label.pack(pady=5)

        # 入力フレーム
        input_frame = tk.Frame(self.root)
        input_frame.pack(pady=10)

        tk.Label(input_frame, text="数字を入力:", font=("Arial", 12)).pack(side=tk.LEFT)

        # 入力ボックス
        self.entry = tk.Entry(input_frame, font=("Arial", 12), width=10)
        self.entry.pack(side=tk.LEFT, padx=5)
        self.entry.bind("<Return>", self.on_enter)  # Enterキーでも実行

        # 送信ボタン
        self.submit_button = tk.Button(
            input_frame, text="判定", command=self.check_number, font=("Arial", 12)
        )
        self.submit_button.pack(side=tk.LEFT, padx=5)

        # 出力ボックス（結果表示エリア）
        self.output_frame = tk.Frame(self.root)
        self.output_frame.pack(pady=10, padx=20, fill=tk.BOTH, expand=True)

        tk.Label(self.output_frame, text="結果:", font=("Arial", 12, "bold")).pack(
            anchor=tk.W
        )

        self.output_text = tk.Text(
            self.output_frame,
            height=8,
            width=40,
            font=("Arial", 10),
            state=tk.DISABLED,
            wrap=tk.WORD,
        )
        self.output_text.pack(fill=tk.BOTH, expand=True)

        # スクロールバー
        scrollbar = tk.Scrollbar(self.output_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.output_text.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.output_text.yview)

        # リセットボタン
        self.reset_button = tk.Button(
            self.root,
            text="新しいゲームを開始",
            command=self._reset_game,
            font=("Arial", 12),
        )
        self.reset_button.pack(pady=10)

        # 初期メッセージ
        self._add_output("ゲームを開始しました！数字を当ててください。")


# ゲームを実行する場合
if __name__ == "__main__":
    gui = GUI()
    gui.run()
