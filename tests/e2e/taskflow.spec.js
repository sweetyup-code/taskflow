import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("taskflow:v1", "[]");
    localStorage.setItem("taskflow:intro-shown", "true");
  });

  await page.goto("/");
});

test("пользователь может добавить, выполнить и удалить задачу", async ({
  page,
}) => {
  const input = page.locator("#input");
  const list = page.locator("#list");
  const taskText = "Проверить работу приложения";

  // Добавление задачи
  await input.fill(taskText);
  await input.press("Enter");

  const task = list.locator(".task");

  await expect(task).toHaveCount(1);
  await expect(task).toContainText(taskText);

  // Ожидание завершения анимации появления
  await expect(task).not.toHaveClass(/enter/);

  // Выполнение задачи
  const checkbox = task.getByRole("checkbox", {
    name: "Выполнено",
  });

  await expect(checkbox).toBeVisible();

  const box = await checkbox.boundingBox();

  if (!box) {
    throw new Error("Не удалось определить положение чекбокса");
  }

  await page.mouse.click(box.x + 5, box.y + box.height / 2);

  await expect(checkbox).toBeChecked();

  // Удаление задачи
  await task.getByRole("button", {
    name: "Удалить задачу",
  }).click();

  await expect(task).toHaveCount(0);
});