"use strict";

(() => {
  const STORAGE_KEY = "taskflow:intro-shown";

  const modal = document.createElement("div");
  modal.className = "welcome-overlay";
  modal.hidden = true;

  modal.innerHTML = `
    <section
      class="welcome-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <button class="welcome-close" type="button" aria-label="Закрыть">
        &times;
      </button>

      <div class="welcome-icon">✦</div>

      <div class="welcome-heading">
        <span class="welcome-label">ЗНАКОМСТВО С ПРИЛОЖЕНИЕМ</span>
        <h2 id="welcome-title">Добро пожаловать в Taskflow!</h2>
        <p>
          Простое пространство для твоих задач.
          Создавай планы, расставляй приоритеты и следи за прогрессом.
        </p>
      </div>

      <div class="welcome-content">

        <article class="welcome-section">
          <span class="welcome-number">01</span>
          <div>
            <h3>Создавай задачи</h3>
            <p>
              Введи название задачи в поле добавления и нажми Enter
              или кнопку добавления. Ненужные задачи можно удалить.
            </p>
          </div>
        </article>

        <article class="welcome-section">
          <span class="welcome-number">02</span>
          <div>
            <h3>Выбирай приоритет</h3>
            <p>Цвет помогает быстро определить важность задачи:</p>

            <div class="welcome-priorities">
              <span><i class="priority-dot low"></i> Низкий</span>
              <span><i class="priority-dot medium"></i> Средний</span>
              <span><i class="priority-dot high"></i> Высокий</span>
            </div>
          </div>
        </article>

        <article class="welcome-section">
          <span class="welcome-number">03</span>
          <div>
            <h3>Разбивай большие задачи</h3>
            <p>
              Добавляй подзадачи и разделяй сложные дела на небольшие
              шаги. Так проще отслеживать выполнение.
            </p>
          </div>
        </article>

        <article class="welcome-section">
          <span class="welcome-number">04</span>
          <div>
            <h3>Отмечай выполнение</h3>
            <p>
              Выполненные задачи можно отмечать галочкой.
              Когда все подзадачи завершены, основная задача
              тоже отмечается выполненной.
            </p>
          </div>
        </article>

        <article class="welcome-section">
          <span class="welcome-number">05</span>
          <div>
            <h3>Используй фильтры</h3>
            <p>
              Переключайся между всеми задачами, активными
              и уже выполненными, чтобы не теряться в списке.
            </p>
          </div>
        </article>

        <article class="welcome-section">
          <span class="welcome-number">06</span>
          <div>
            <h3>Дополнительные возможности</h3>
            <p>
              Меняй тему оформления, используй голосовой ввод,
              перетаскивай задачи для изменения порядка
              и открывай командную панель сочетанием
              <kbd>Ctrl</kbd> + <kbd>K</kbd>.
            </p>
          </div>
        </article>

      </div>

      <div class="welcome-footer">
        <p class="welcome-note">
          <span>ⓘ</span>
          Задачи сохраняются автоматически в этом браузере.
          Данные не синхронизируются между устройствами.
        </p>

        <button class="welcome-start" type="button">
          Всё понятно, начать работу
          <span>→</span>
        </button>
      </div>
    </section>
  `;

  document.body.append(modal);

  const closeButton = modal.querySelector(".welcome-close");
  const startButton = modal.querySelector(".welcome-start");

  let previousFocus = null;

  function openWelcome() {
    previousFocus = document.activeElement;

    modal.hidden = false;
    document.body.classList.add("welcome-open");

    requestAnimationFrame(() => {
      modal.classList.add("is-visible");
      startButton.focus();
    });
  }

  function closeWelcome() {
    modal.classList.remove("is-visible");
    document.body.classList.remove("welcome-open");

    localStorage.setItem(STORAGE_KEY, "true");

    setTimeout(() => {
      modal.hidden = true;

      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    }, 220);
  }

  closeButton.addEventListener("click", closeWelcome);
  startButton.addEventListener("click", closeWelcome);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeWelcome();
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;

    if (event.key === "Escape") {
      closeWelcome();
    }
  });

  window.openTaskflowWelcome = openWelcome;

  if (localStorage.getItem(STORAGE_KEY) !== "true") {
    window.addEventListener(
      "load",
      () => {
        openWelcome();
      },
      { once: true },
    );
  }
})();
