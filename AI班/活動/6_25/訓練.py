import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import matplotlib.pyplot as plt

# ==============================================================================
# 1. データセットの定義 (理論: データセット)
# torch.utils.data.Datasetを継承し、データ管理をクラスにまとめます。
# これが実践的なデータハンドリングの第一歩です。
# ==============================================================================
class XorDataset(Dataset):
    """XOR問題のカスタムデータセットクラス"""
    def __init__(self):
        # データを定義
        self.X = torch.tensor([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=torch.float32)
        self.y = torch.tensor([[0], [1], [1], [0]], dtype=torch.float32)

    def __len__(self):
        # データセットのサンプル数を返す
        return len(self.y)

    def __getitem__(self, idx):
        # 指定されたインデックスの入力データと正解ラベルを返す
        return self.X[idx], self.y[idx]


# ==============================================================================
# 2. モデルの定義 (理論: モデル関数)
# nn.Moduleを継承する点は同じですが、より汎用的な書き方を意識します。
# ==============================================================================
class XORNet(nn.Module):
    """XOR問題を解くためのニューラルネットワークモデル"""
    def __init__(self, input_size, hidden_size, output_size):
        super(XORNet, self).__init__()
        # 各層を定義
        self.layer1 = nn.Linear(input_size, hidden_size)
        self.layer2 = nn.Linear(hidden_size, output_size)
        
        # 活性化関数を定義
        # ReLUは現代のニューラルネットワークで広く使われる標準的な活性化関数です
        self.relu = nn.ReLU()
        self.sigmoid = nn.Sigmoid()

    # (理論: 順伝播)
    def forward(self, x):
        """順伝播のプロセスを定義"""
        # 層 -> 活性化関数 -> 層 -> 活性化関数 という流れ
        x = self.layer1(x)
        x = self.relu(x)
        x = self.layer2(x)
        x = self.sigmoid(x)
        return x

# ==============================================================================
# 3. 学習関数の定義
# 学習プロセス全体を一つの関数にまとめることで、コードの見通しが良くなります。
# ==============================================================================
def train_model(model, dataloader, criterion, optimizer, epochs):
    """モデルを学習させるための関数"""
    print("学習を開始します...")
    # 損失の履歴を保存するためのリスト
    loss_history = []
    
    for epoch in range(epochs):
        epoch_loss = 0.0
        
        # (理論: ミニバッチ学習)
        # DataLoaderからバッチ単位でデータを取り出す
        for inputs, labels in dataloader:
            
            # --- 勾配のリセット ---
            optimizer.zero_grad()
            
            # --- 順伝播・損失計算・逆伝播・パラメータ更新 ---
            # (理論: 順伝播)
            outputs = model(inputs)
            # (理論: 損失関数)
            loss = criterion(outputs, labels)
            # (理論: 誤差逆伝播)
            loss.backward()
            # (理論: パラメータ更新)
            optimizer.step()
            
            # このバッチの損失を加算
            epoch_loss += loss.item()

        # エポック全体の平均損失を計算し、履歴に保存
        avg_epoch_loss = epoch_loss / len(dataloader)
        loss_history.append(avg_epoch_loss)

        if (epoch + 1) % 1000 == 0:
            print(f'エポック: {epoch+1:5d}/{epochs}, 損失: {avg_epoch_loss:.4f}')
            
    print("学習が完了しました。")
    return loss_history

# ==============================================================================
# 4. 評価関数の定義
# 学習済みモデルの性能を評価する部分も関数化します。
# ==============================================================================
def evaluate_model(model, dataloader):
    """学習済みモデルの性能を評価する関数"""
    print("\n学習済みモデルの評価:")
    # model.eval()でモデルを評価モードに切り替える
    model.eval() 
    
    # 勾配計算を無効にする (評価時には不要なため)
    with torch.no_grad():
        for inputs, labels in dataloader:
            outputs = model(inputs)
            # 確率出力を0か1の予測に変換
            predicted = (outputs > 0.5).float()
            
            # バッチ内の全サンプルについて表示
            for i in range(len(inputs)):
                print(f"入力: {inputs[i].numpy()} -> "
                      f"正解: {int(labels[i].item())}, "
                      f"予測: {int(predicted[i].item())}")


# ==============================================================================
# 5. メイン実行ブロック
# ここで上記で定義した要素を組み合わせて実行します。
# ==============================================================================
if __name__ == "__main__":
    
    # --- ハイパーパラメータの設定 ---
    INPUT_SIZE = 2
    HIDDEN_SIZE =   16# 隠れ層のノード数を少し増やしてみる
    OUTPUT_SIZE = 1
    LEARNING_RATE = 0.01
    BATCH_SIZE = 4   # データが4つしかないので全件バッチと同じ
    EPOCHS = 10000

    # --- 1. データ準備 ---
    dataset = XorDataset()
    # (理論: ミニバッチ学習)
    # DataLoaderは、バッチ処理やデータのシャッフルを自動化してくれる便利なツール
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    # --- 2. モデル・損失関数・オプティマイザの準備 ---
    model = XORNet(INPUT_SIZE, HIDDEN_SIZE, OUTPUT_SIZE)
    criterion = nn.BCELoss() # (理論: 損失関数)
    # AdamはSGDを改良した、より収束が速い傾向にある人気のオプティマイザ
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    # --- 3. 学習の実行 ---
    loss_history = train_model(model, dataloader, criterion, optimizer, EPOCHS)

    # --- 4. 評価の実行 ---
    evaluate_model(model, dataloader)

    # --- 5. 結果の可視化 ---
    plt.figure(figsize=(10, 5))
    plt.plot(loss_history)
    plt.title("Loss History")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.grid(True)
    plt.show()