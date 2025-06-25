import torch
import torch.nn as nn
import torch.optim as optim

# 結果を固定するため、乱数シードを設定します
torch.manual_seed(0)

# ==============================================================================
# 1. 準備 (データセット、モデル、損失関数、オプティマイザ)
# ※この部分は前回のコードと同じです
# ==============================================================================

# --- データセット ---
X = torch.tensor([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=torch.float32)
y = torch.tensor([[0], [1], [1], [0]], dtype=torch.float32)

# --- モデル定義 ---
class XORNet(nn.Module):
    def __init__(self):
        super(XORNet, self).__init__()
        self.hidden_layer = nn.Linear(2, 16)
        self.output_layer = nn.Linear(16, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        hidden_output = self.sigmoid(self.hidden_layer(x))
        output = self.sigmoid(self.output_layer(hidden_output))
        return output

# --- モデル、損失関数、オプティマイザのインスタンス作成 ---
model = XORNet()
criterion = nn.BCELoss()
lr = 0.1  # 学習率を後で使うために変数に入れておく
optimizer = optim.SGD(model.parameters(), lr=lr)


# ==============================================================================
# 2. 学習プロセスのステップ・バイ・ステップ実行
# ここからが本題です。学習の最初の1ステップを詳細に追跡します。
# ==============================================================================

print("========== 学習の1ステップを可視化します ==========")

# --- 特定のパラメータに注目する ---
# 例として、隠れ層の最初の重みとバイアスに注目します
# model.parameters()の中身はジェネレータなのでリストに変換
params = list(model.parameters())
hidden_weights = params[0]
hidden_biases  = params[1]

print(f"【初期状態】 隠れ層の重み(一部): {hidden_weights[0, 0].item():.4f}")
print("-" * 50)


# --- ステップ1: 順伝播 (Forward Pass) ---
# 入力データXをモデルに通し、予測値 y_pred を得ます。
y_pred = model(X)
print("【ステップ1: 順伝播】")
print(f"正解ラベル y:\n{y.T}") # .T で転置して見やすくする
print(f"モデルの予測値 y_pred:\n{y_pred.T.detach().numpy()}") # .detach()で勾配計算グラフから切り離し、numpyに変換
print("-" * 50)


# --- ステップ2: 損失計算 (Calculate Loss) ---
# 予測値 y_pred と正解ラベル y のズレを損失関数で計算します。
loss = criterion(y_pred, y)
print("【ステップ2: 損失計算】")
print(f"計算された損失 (Loss): {loss.item():.4f}")
print("-" * 50)


# --- ステップ3: 逆伝播 (Backpropagation) ---
# 損失を基に、各パラメータの勾配を計算します。
# まず、前回の勾配が残らないようにリセットします。
optimizer.zero_grad()
# 損失から逆方向に勾配を計算します。
loss.backward()

# 注目しているパラメータの勾配を確認します
hidden_weights_grad = hidden_weights.grad
print("【ステップ3: 逆伝播（勾配計算）】")
print("各パラメータについて、「損失を小さくするには、この値をどちらにどれだけ動かせば良いか」を示す「勾配」が計算されました。")
print(f"隠れ層の重み(一部)に対する勾配: {hidden_weights_grad[0, 0].item():.4f}")
print("-" * 50)


# --- ステップ4: パラメータ更新 (Update Parameters) ---
# オプティマイザが勾配を基にパラメータを更新します。
# SGDの更新式: 新しい重み = 古い重み - 学習率 * 勾配

# 更新前の値を保存しておきます
weight_before_update = hidden_weights[0, 0].item()

# オプティマイザにパラメータを更新させます
optimizer.step()

# 更新後の値を取得します
weight_after_update = hidden_weights[0, 0].item()

print("【ステップ4: パラメータ更新】")
print("SGDのルールに従って、重みが更新されました。")
print(f"更新前の重み: {weight_before_update:.4f}")
print(f"  - (学習率 {lr} * 勾配 {hidden_weights_grad[0, 0].item():.4f})")
manual_calculation = weight_before_update - (lr * hidden_weights_grad[0, 0].item())
print(f"  = 手計算による更新後の重み: {manual_calculation:.4f}")
print(f"実際に更新された重み: {weight_after_update:.4f}")
print("-" * 50)

print("========== 可視化終了 ==========\n")
print("ニューラルネットワークの学習では、この4ステップを何千・何万回と繰り返すことで、")
print("損失が徐々に小さくなるように、すべてのパラメータが少しずつ調整されていきます。")