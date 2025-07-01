import torch
import torch.nn as nn
import torch.optim as optim
import matplotlib.pyplot as plt

# XORデータセット
def get_xor_data():
    X = torch.tensor([[0,0],[0,1],[1,0],[1,1]], dtype=torch.float32)
    Y = torch.tensor([[0],[1],[1],[0]], dtype=torch.float32)
    return X, Y

# モデル定義関数
def make_model_tanh():
    return nn.Sequential(
        nn.Linear(2, 4),
        nn.Tanh(),
        nn.Linear(4, 1),
        nn.Sigmoid()
    )

def make_model_relu():
    return nn.Sequential(
        nn.Linear(2, 4),
        nn.ReLU(),
        nn.Linear(4, 1),
        nn.Sigmoid()
    )

def make_model_deep():
    return nn.Sequential(
        nn.Linear(2, 8),
        nn.ReLU(),
        nn.Linear(8, 4),
        nn.ReLU(),
        nn.Linear(4, 1),
        nn.Sigmoid()
    )

def make_model_deeper():
    return nn.Sequential(
        nn.Linear(2, 16),
        nn.ReLU(),
        nn.Linear(16, 8),
        nn.ReLU(),
        nn.Linear(8, 4),
        nn.ReLU(),
        nn.Linear(4, 1),
        nn.Sigmoid()
    )

def make_model_too_deep():
    return nn.Sequential(
        nn.Linear(2, 128),
        nn.ReLU(),
        nn.Linear(128, 64),
        nn.ReLU(),
        nn.Linear(64, 32),
        nn.ReLU(),
        nn.Linear(32, 16),
        nn.ReLU(),
        nn.Linear(16, 8),
        nn.ReLU(),
        nn.Linear(8, 4),
        nn.ReLU(),
        nn.Linear(4, 1),
        nn.Sigmoid()
    )

# モデルの構造情報
def summarize_model(model):
    n_params = sum(p.numel() for p in model.parameters())
    return f"{model.__class__.__name__}, total parameters: {n_params}"

# 出力を表形式で表示
def evaluate_model(model, X, Y, title=""):
    print(f"\n=== {title} ===")
    correct = 0
    with torch.no_grad():
        outputs = model(X)
        for i in range(len(X)):
            x = X[i].tolist()
            y_true = int(Y[i].item())
            y_pred_prob = outputs[i].item()
            y_pred = int(round(y_pred_prob))
            mark = "✅" if y_pred == y_true else "❌"
            if y_pred == y_true:
                correct += 1
            print(f"Input: {x} => Output: {y_pred_prob:.4f} => Pred: {y_pred}, Label: {y_true} {mark}")
    acc = correct / len(X)
    print(f"Accuracy: {acc * 100:.1f}%")

# 学習ループ + loss記録
def train_model(model, X, Y, epochs=5000, lr=0.1):
    criterion = nn.BCELoss()
    optimizer = optim.SGD(model.parameters(), lr=lr)
    losses = []
    for epoch in range(epochs):
        optimizer.zero_grad()
        outputs = model(X)
        loss = criterion(outputs, Y)
        loss.backward()
        optimizer.step()
        losses.append(loss.item())
    return losses

# グラフ表示
def plot_losses(losses, label):
    plt.plot(losses, label=label)
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()

# 実験実行
def run_experiments():
    X, Y = get_xor_data()

    model_configs = {
        "Tanh shallow (2-4-1)": make_model_tanh,
        "ReLU shallow (2-4-1)": make_model_relu,
        "ReLU deep (2-8-4-1)": make_model_deep,
        "ReLU extreme deep (2-16-8-4-1)": make_model_deeper,
        "ReLU too deep (2-128-64-32-16-8-4-1)": make_model_too_deep
    }

    plt.figure(figsize=(10, 6))

    for name, make_model in model_configs.items():
        model = make_model()
        print(f"\n========== {name} ==========")
        print(summarize_model(model))

        print("\n[Before Training]")
        evaluate_model(model, X, Y)

        losses = train_model(model, X, Y)
        plot_losses(losses, name)

        print("\n[After Training]")
        evaluate_model(model, X, Y)
        print(f"Final Loss: {losses[-1]:.4f}")

    plt.suptitle("Loss Curve for Different Network Structures")
    plt.grid(True)
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    run_experiments()
