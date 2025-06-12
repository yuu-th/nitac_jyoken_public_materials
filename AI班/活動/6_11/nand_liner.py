import random

import torch
from torch.nn import Linear

test_input_data = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
]


hidden_dimension = 128
linear1 = Linear(2, hidden_dimension, bias=True)
linear2 = Linear(hidden_dimension, hidden_dimension, bias=True)
linear3 = Linear(hidden_dimension, 1, bias=True)


def NAND(input):
    return linear3(linear2(linear1(input)))


# ---

print("訓練前、テストデータを入れてみます")
test_data = test_input_data
print(f"{test_data=}")
for input in test_data:
    input_tensor = torch.tensor([input], dtype=torch.float32)
    output = NAND(input_tensor)
    print(
        f" 入力: {input}, 出力: {output.item()}, 期待値: {1 if input != [1, 1] else 0}"
    )

print("訓練を開始します")

optimizer = torch.optim.Adam(
    list(linear1.parameters()) + list(linear2.parameters()),
    lr=0.001,
)
for epoch in range(10000):
    optimizer.zero_grad()

    # NANDの訓練データ
    training_data = [
        ([0, 0], 1),
        ([0, 1], 1),
        ([1, 0], 1),
        ([1, 1], 0),
    ]

    for input_data, target in training_data:
        input_tensor = torch.tensor([input_data], dtype=torch.float32)
        target_tensor = torch.tensor([[target]], dtype=torch.float32)

        output = NAND(input_tensor)
        loss = torch.nn.functional.mse_loss(output, target_tensor)

        loss.backward()

    optimizer.step()


print("訓練後、テストデータを入れてみます")
test_data = test_input_data
print(f"{test_data=}")
for input in test_data:
    input_tensor = torch.tensor([input], dtype=torch.float32)
    output = NAND(input_tensor)
    print(
        f" 入力: {input}, 出力: {round(output.item())}, 期待値: {1 if input != [1, 1] else 0}"
    )
