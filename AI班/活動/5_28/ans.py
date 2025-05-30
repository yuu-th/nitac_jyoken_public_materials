import random

# --- ゲームの設定 ---
# 1. 秘密の数字を準備
# randomモジュールを使って1から30までのランダムな整数を生成
# secret_number = random.randint(1, 30)
# または、テスト用に固定の数字にする場合は以下のようにします
secret_number = 15
max_challenges = 5  # 最大挑戦回数
challenge_count = 0  # ユーザーが何回挑戦したかを数える変数
has_won = False  # ユーザーが勝ったかどうかを記録するフラグ

# --- ゲーム開始メッセージ ---
print("ようこそ！数当てゲームへ！")
print(f"1から30までの数字を当ててみてね。チャンスは{max_challenges}回だよ！")
# print(f"（デバッグ用：秘密の数字は {secret_number} です）") # 開発中はコメントを外すと便利

# --- メインループ (繰り返し挑戦) ---
while challenge_count < max_challenges and not has_won:
    print("-" * 20)  # 区切り線
    # 2. ユーザーからの予想を受け取る
    try:
        user_guess_str = input(
            f"あなたの予想は？（残り {max_challenges - challenge_count} 回）："
        )
        user_guess_num = int(user_guess_str)  # 文字列を整数に変換
    except ValueError:
        print("おっと！数字を入力してくださいね。")
        continue  # 今回の挑戦は無効として、ループの先頭に戻る

    challenge_count += 1  # 挑戦回数を1増やす

    # 3. ヒントを出す（判定ロジック）
    if user_guess_num == secret_number:
        print(f"おめでとう！正解です！ {challenge_count} 回で当たりました！")
        has_won = True  # 勝利フラグを立てる
    elif user_guess_num < secret_number:
        print("残念！もっと大きい数字だよ。")
    else:  # user_guess_num > secret_number
        print("残念！もっと小さい数字だよ。")

# --- ゲーム終了後のメッセージ ---
print("-" * 20)
if not has_won and challenge_count >= max_challenges:
    print(f"残念！回数制限の {max_challenges} 回に達しました。ゲームオーバー！")
    print(f"正解は {secret_number} でした。")

print("遊んでくれてありがとう！またね！")
