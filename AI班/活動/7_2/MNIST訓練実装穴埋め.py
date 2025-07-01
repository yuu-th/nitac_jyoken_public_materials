import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import os
import torchvision
import torchvision.transforms as transforms

# ==============================================================================
# 1. データセットの定義 (理論: データセット)
# torch.utils.data.Datasetを継承し、データ管理をクラスにまとめます。
# ==============================================================================
class NumberDataset(Dataset):
    def __init__(self, train=True, transform=None):
        # torchvisionのMNISTデータセットをダウンロードして利用
        if transform is None:
            transform = transforms.Compose([
                transforms.ToTensor(),
                # 必要なら正規化も追加
            ])
        self.dataset = torchvision.datasets.MNIST(
            root='./data', train=train, download=True, transform=transform
        )

    def __len__(self):
        return len(self.dataset)

    def __getitem__(self, idx):
        image, label = self.dataset[idx]
        # 画像を1次元ベクトルに変換
        image = image.view(-1)
        return image, label


# ==============================================================================
# 2. モデルの定義 (理論: モデル関数)
# nn.Moduleを継承する点は同じですが、より汎用的な書き方を意識します。
# ==============================================================================
class MyNet(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(MyNet, self).__init__()
        self.layer1 = ＿＿＿
        self.layer2 = ＿＿＿
        # 必要に応じて層の数を増やす

        # 活性化関数を定義(ここではreluとsoftmax、ネットで使い方を調べてもよい　「Pytorch Relu」「Pytorch Softmax」)
        self.relu = ＿＿＿
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x):
        x = self.layer1(x)
        x = self.relu(x)
        x = ＿＿＿
        ...
        

        x = self.softmax(x)
        return x

# ==============================================================================
# 3. 学習関数の定義
# 学習プロセス全体を一つの関数にまとめることで、コードの見通しが良くなります。
# ==============================================================================
def train_model(model, test_loader, validation_loader, criterion, optimizer, epochs):
    """モデルを学習させるための関数"""
    print("学習を開始します...")
    # 損失の履歴を保存するためのリスト
    train_loss_history = []
    val_loss_history = []
    
    for epoch in range(epochs):
        epoch_loss = 0.0
        
        # (理論: ミニバッチ学習)
        # DataLoaderからバッチ単位でデータを取り出す
        for inputs, labels in test_loader:
            
            # --- 勾配のリセット ---
            optimizer.＿＿＿()
            
            # --- 順伝播・損失計算・逆伝播・パラメータ更新 ---
            # (理論: 順伝播)
            outputs = ＿＿＿(＿＿＿)
            # (理論: 損失関数)
            loss = ＿＿＿(outputs, labels)
            # (理論: 誤差逆伝播)
            loss.＿＿＿()
            # (理論: パラメータ更新)
            optimizer.＿＿＿()
            
            # このバッチの損失を加算
            epoch_loss += loss.item()

        # エポック全体の平均損失を計算し、履歴に保存
        avg_epoch_loss = epoch_loss / len(test_loader)
        train_loss_history.append(avg_epoch_loss)


        # --- 検証データでの損失計算 ---
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for val_inputs, val_labels in validation_loader:
                val_outputs = model(val_inputs)
                v_loss = criterion(val_outputs, val_labels)
                val_loss += v_loss.item()
        avg_val_loss = val_loss / len(validation_loader)
        val_loss_history.append(avg_val_loss)


        if (epoch + 1) % 1000 == 0:
            print(f'エポック: {epoch+1:5d}/{epochs}, 損失: {avg_epoch_loss:.4f}, 検証損失: {avg_val_loss:.4f}')

    print("学習が完了しました。")
    return train_loss_history, val_loss_history



# ==============================================================================
# 4. 評価関数の定義
# 学習済みモデルの性能を評価する部分も関数化します。
# ==============================================================================
def evaluate_model(model, dataloader):
    print("\n学習済みモデルの評価:")
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for inputs, labels in dataloader:
            outputs = model(inputs)
            # 出力から最大値のインデックス（予測クラス）を取得
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            # バッチ内の全サンプルについて表示（最初のバッチのみ表示例）
            for i in range(len(inputs)):
                print(f"正解: {int(labels[i].item())}, 予測: {int(predicted[i].item())}")
            break  # 全部表示すると多すぎるので最初のバッチのみ
    print(f"正解率: {100 * correct / total:.2f}%")

# ==============================================================================
# 5. 可視化用関数の定義
# ==============================================================================
def visualize_predictions(model, dataset, title, num_samples=10):
    model.eval()
    plt.figure(figsize=(10, 2))
    with torch.no_grad():
        for i in range(num_samples):
            image, label = dataset[i]
            output = model(image.unsqueeze(0))
            pred = output.argmax(dim=1).item()
            image2d = image.view(28, 28)
            plt.subplot(1, num_samples, i+1)
            plt.imshow(image2d, cmap="gray")
            plt.title(f"T:{label}\nP:{pred}")
            plt.axis("off")
    plt.suptitle(title)
    plt.show()

# ==============================================================================
# 6. メイン実行ブロック
# ここで上記で定義した要素を組み合わせて実行します。
# ==============================================================================
if __name__ == "__main__":
    # --- ハイパーパラメータの設定 ---
    INPUT_SIZE = 28 * 28  # MNIST画像は28x28
    HIDDEN_SIZE = 128
    OUTPUT_SIZE = 10      # 10クラス分類
    LEARNING_RATE = 0.001
    BATCH_SIZE = 64
    EPOCHS = 5

    VALIDATION_RATIO = 0.1  # 訓練データの10%を検証用に使用

    # --- 1. データ準備 ---
    full_train_dataset = NumberDataset(train=True)
    test_dataset = NumberDataset(train=False)

    # 訓練・検証データに分割
    n_total = len(full_train_dataset)
    n_val = int(n_total * VALIDATION_RATIO)
    n_train = n_total - n_val
    train_dataset, validation_dataset = torch.utils.data.random_split(
        full_train_dataset, [n_train, n_val],
        generator=torch.Generator().manual_seed(42)  # 再現性のため
    )

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    validation_loader = DataLoader(validation_dataset, batch_size=BATCH_SIZE, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)


    model = ＿＿＿(INPUT_SIZE, HIDDEN_SIZE, OUTPUT_SIZE)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.＿＿＿(model.parameters(), lr=＿＿＿)  # TODO: Adamという最適化手法を用いる

    # --- 訓練前の予測可視化 ---
    print("【訓練前の予測】")
    visualize_predictions(model, test_dataset, "Before Training (T:正解, P:予測)")

    # --- 3. 学習の実行 ---
    train_loss_history, val_loss_history = train_model(＿＿＿, train_loader, val_loader, ＿＿＿, ＿＿＿, EPOCHS)

    # --- 訓練後の予測可視化 ---
    print("【訓練後の予測】")
    visualize_predictions(model, test_dataset, "After Training (T:正解, P:予測)")

    # --- 4. 評価の実行 ---
    evaluate_model(model, test_loader)

    # --- 5. 結果の可視化 ---
    plt.figure(figsize=(10, 5))
    plt.plot(train_loss_history, label="Train Loss")
    plt.plot(val_loss_history, label="Validation Loss")
    plt.title("Loss History")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.grid(True)
    plt.legend()
    plt.show()