"use strict";

(() => {
  const $ = (selector, parent = document) => parent.querySelector(selector);

  const list = $("#list");
  const root = document.documentElement;
  const taskRows = new Map();
  const openedTasks = new Set();

  if (!list || typeof render !== "function") return;

  const getTasks = () => (typeof tasks !== "undefined" ? tasks : []);

  const saveTasks = () => {
    if (typeof save === "function") save();
  };

  const redraw = () => {
    saveTasks();
    if (typeof render === "function") render();
  };

  const escapeText = (value) => String(value ?? "");

  function syncTaskCompletion(task) {
    if (!task.subtasks.length) return;

    task.done = task.subtasks.every((item) => item.done);
  }

  function createSubtaskInterface(task, li) {
    let section = $(".subtasks", li);

    if (!section) {
      section = document.createElement("div");
      section.className = "subtasks";

      const body = $(".body", li);
      if (!body) return;

      body.append(section);
    }

    const items = Array.isArray(task.subtasks) ? task.subtasks : [];
    task.subtasks = items;

    const completed = items.filter((item) => item.done).length;
    const total = items.length;
    const percent = total ? (completed / total) * 100 : 0;
    const opened = openedTasks.has(task.id);

    section.replaceChildren();

    const header = document.createElement("div");
    header.className = "subtasks-header";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "subtasks-toggle";
    toggle.dataset.action = "toggle-subtasks";
    toggle.setAttribute("aria-expanded", String(opened));

    const heading = document.createElement("span");
    heading.className = "subtasks-heading";
    heading.textContent = "Подзадачи";

    const info = document.createElement("span");
    info.className = "subtasks-info";
    info.textContent = total
      ? `${completed} из ${total} выполнено`
      : "Добавьте небольшие шаги";

    const arrow = document.createElement("span");
    arrow.className = "subtasks-arrow";
    arrow.setAttribute("aria-hidden", "true");

    toggle.append(heading, info, arrow);
    header.append(toggle);

    if (total > 0) {
      const progress = document.createElement("div");
      progress.className = "subtasks-progress";

      const progressBar = document.createElement("span");
      progressBar.style.width = `${percent}%`;

      progress.append(progressBar);
      header.append(progress);
    }

    section.append(header);

    const panel = document.createElement("div");
    panel.className = "subtasks-panel";
    panel.hidden = !opened;

    const itemsList = document.createElement("div");
    itemsList.className = "subtasks-list";

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "subtask-row";
      row.classList.toggle("is-done", !!item.done);

      const checkboxLabel = document.createElement("label");
      checkboxLabel.className = "chk";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!item.done;
      checkbox.dataset.subtaskId = item.id;
      checkbox.setAttribute("aria-label", `Выполнено: ${item.text}`);

      const checkIcon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );

      checkIcon.setAttribute("viewBox", "0 0 28 28");
      checkIcon.setAttribute("aria-hidden", "true");

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );

      path.setAttribute("d", "M6 14l5 5L22 8");

      checkIcon.append(path);
      checkboxLabel.append(checkbox, checkIcon);

      const text = document.createElement("span");
      text.className = "subtask-text";
      text.textContent = item.text;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "subtask-remove";
      remove.dataset.action = "remove-subtask";
      remove.dataset.subtaskId = item.id;
      remove.setAttribute("aria-label", "Удалить подзадачу");
      remove.textContent = "×";

      row.append(checkboxLabel, text, remove);
      itemsList.append(row);
    });

    panel.append(itemsList);

    const form = document.createElement("form");
    form.className = "subtask-form";
    form.dataset.action = "add-subtask";
    form.autocomplete = "off";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 100;
    input.placeholder = "Добавить подзадачу...";
    input.setAttribute("aria-label", "Название подзадачи");

    const addButton = document.createElement("button");
    addButton.type = "submit";
    addButton.textContent = "+";
    addButton.setAttribute("aria-label", "Добавить подзадачу");

    form.append(input, addButton);
    panel.append(form);

    section.append(panel);
  }

  const originalRender = render;

  render = function (...args) {
    originalRender.apply(this, args);

    getTasks().forEach((task) => {
      if (!Array.isArray(task.subtasks)) {
        task.subtasks = [];
      }

      const li = [...list.children].find(
        (element) => element.dataset.id === task.id,
      );

      if (li) createSubtaskInterface(task, li);
    });
  };

  list.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest('[data-action="toggle-subtasks"]');

      if (!button) return;

      event.stopImmediatePropagation();

      const li = button.closest(".task");
      const task = getTasks().find((item) => item.id === li?.dataset.id);

      if (!task) return;

      if (openedTasks.has(task.id)) {
        openedTasks.delete(task.id);
      } else {
        openedTasks.add(task.id);
      }

      render();
    },
    true,
  );

  list.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest('[data-action="remove-subtask"]');

      if (!button) return;

      event.stopImmediatePropagation();

      const li = button.closest(".task");
      const task = getTasks().find((item) => item.id === li?.dataset.id);

      if (!task) return;

      task.subtasks = task.subtasks.filter(
        (item) => item.id !== button.dataset.subtaskId,
      );

      syncTaskCompletion(task);
      redraw();
    },
    true,
  );

  list.addEventListener(
    "submit",
    (event) => {
      const form = event.target.closest('[data-action="add-subtask"]');

      if (!form) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const li = form.closest(".task");
      const task = getTasks().find((item) => item.id === li?.dataset.id);

      const input = $("input", form);
      const text = input.value.trim();

      if (!task || !text) {
        input.focus();
        return;
      }

      task.subtasks.push({
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2),
        text: text.slice(0, 100),
        done: false,
      });

      syncTaskCompletion(task);
      openedTasks.add(task.id);

      redraw();
    },
    true,
  );

  list.addEventListener(
    "change",
    (event) => {
      const checkbox = event.target.closest(
        ".subtask-row input[type='checkbox']",
      );

      if (!checkbox) return;

      event.stopImmediatePropagation();

      const li = checkbox.closest(".task");
      const task = getTasks().find((item) => item.id === li?.dataset.id);

      if (!task) return;

      const subtask = task.subtasks.find(
        (item) => item.id === checkbox.dataset.subtaskId,
      );

      if (!subtask) return;

      const allWereDone = tasks.length > 0 && tasks.every((x) => x.done);

      subtask.done = checkbox.checked;

      syncTaskCompletion(task);

      const allDone = tasks.length > 0 && tasks.every((x) => x.done);

      if (!allWereDone && allDone) {
        const taskElement = checkbox.closest(".task");
        const r = taskElement.getBoundingClientRect();

        burst(r.left + 14, r.top + 14);
      }

      redraw();
    },
    true,
  );

  const palette = document.createElement("div");
  palette.className = "command-overlay";
  palette.hidden = true;

  palette.innerHTML = `
    <div class="command-backdrop" data-close-palette></div>

    <section
      class="command-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Командная палитра"
    >
      <div class="command-search">
        <span class="command-search-icon">⌕</span>
        <input
          class="command-input"
          type="search"
          placeholder="Найти задачу или команду..."
          autocomplete="off"
          spellcheck="false"
          aria-label="Поиск задач и команд"
        >
        <kbd>ESC</kbd>
      </div>

      <div class="command-results" role="listbox"></div>

      <footer class="command-footer">
        <span><kbd>↑</kbd> <kbd>↓</kbd> навигация</span>
        <span><kbd>↵</kbd> выбрать</span>
        <span><kbd>ESC</kbd> закрыть</span>
      </footer>
    </section>
  `;

  document.body.append(palette);

  const paletteInput = $(".command-input", palette);
  const results = $(".command-results", palette);

  let selectedIndex = 0;
  let commands = [];
  let previousFocus = null;

  const actions = [
    {
      title: "Создать новую задачу",
      description: "Перейти к полю добавления",
      icon: "＋",
      keywords: "добавить новая создать задача",
      run: () => $("#input")?.focus(),
    },
    {
      title: "Переключить тему",
      description: "Светлая ↔ тёмная",
      icon: "◐",
      keywords: "тёмная темная светлая тема оформление",
      run: () => $("#theme")?.click(),
    },
    {
      title: "Очистить выполненные",
      description: "Удалить завершённые задачи",
      icon: "✓",
      keywords: "очистить удалить готово выполненные завершенные",
      run: () => {
        const clear = $("#clear");
        if (clear && !clear.hidden) clear.click();
      },
    },
    {
      title: "Показать все задачи",
      description: "Сбросить фильтр",
      icon: "▤",
      keywords: "все задачи фильтр",
      run: () => $('[data-f="all"]')?.click(),
    },
    {
      title: "Показать активные",
      description: "Только незавершённые задачи",
      icon: "◷",
      keywords: "активные в работе не выполненные",
      run: () => $('[data-f="active"]')?.click(),
    },
    {
      title: "Показать выполненные",
      description: "Только завершённые задачи",
      icon: "✓",
      keywords: "выполненные готовые завершенные",
      run: () => $('[data-f="done"]')?.click(),
    },
    {
      title: "Как пользоваться Taskflow",
      description: "Открыть инструкцию",
      icon: "ⓘ",
      keywords: "инструкция помощь справка",
      run: () => window.openTaskflowWelcome?.(),
    },
  ];

  function buildCommands(query) {
    const q = query.trim().toLocaleLowerCase("ru");

    const commandItems = actions
      .filter((item) =>
        `${item.title} ${item.description} ${item.keywords}`
          .toLocaleLowerCase("ru")
          .includes(q),
      )
      .map((item) => ({
        ...item,
        type: "command",
      }));

    const taskItems = getTasks()
      .filter((task) => {
        const subtaskText = (task.subtasks || [])
          .map((subtask) => subtask.text)
          .join(" ");

        return `${task.text} ${subtaskText}`
          .toLocaleLowerCase("ru")
          .includes(q);
      })
      .slice(0, 8)
      .map((task) => ({
        title: task.text,
        description: task.done ? "Выполненная задача" : "Перейти к задаче",
        icon: task.done ? "✓" : "○",
        type: "task",
        task,
        run: () => {
          const filterButton = $('[data-f="all"]');
          filterButton?.click();

          requestAnimationFrame(() => {
            const li = [...list.children].find(
              (element) => element.dataset.id === task.id,
            );

            if (li) {
              li.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });

              li.classList.add("command-highlight");

              setTimeout(() => {
                li.classList.remove("command-highlight");
              }, 1500);
            }
          });
        },
      }));

    return [...commandItems, ...taskItems];
  }

  function drawResults() {
    commands = buildCommands(paletteInput.value);
    selectedIndex = Math.min(selectedIndex, Math.max(0, commands.length - 1));

    results.replaceChildren();

    if (!commands.length) {
      const empty = document.createElement("div");
      empty.className = "command-empty";
      empty.textContent = "Ничего не найдено";
      results.append(empty);
      return;
    }

    commands.forEach((command, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "command-item";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === selectedIndex));

      const icon = document.createElement("span");
      icon.className = "command-item-icon";
      icon.textContent = command.icon;

      const content = document.createElement("span");
      content.className = "command-item-content";

      const title = document.createElement("strong");
      title.textContent = command.title;

      const description = document.createElement("small");
      description.textContent = command.description;

      content.append(title, description);

      const hint = document.createElement("span");
      hint.className = "command-item-hint";
      hint.textContent = command.type === "task" ? "Задача" : "Команда";

      button.append(icon, content, hint);

      button.addEventListener("mouseenter", () => {
        selectedIndex = index;
        updateSelection();
      });

      button.addEventListener("click", () => execute(index));

      results.append(button);
    });
  }

  function updateSelection() {
    [...results.children].forEach((item, index) => {
      item.setAttribute("aria-selected", String(index === selectedIndex));
    });

    results.children[selectedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }

  function execute(index) {
    const command = commands[index];
    if (!command) return;

    closePalette();
    command.run();
  }

  function openPalette() {
    if (!palette.hidden) return;

    previousFocus = document.activeElement;
    palette.hidden = false;
    document.body.classList.add("palette-open");

    paletteInput.value = "";
    selectedIndex = 0;
    drawResults();

    requestAnimationFrame(() => paletteInput.focus());
  }

  function closePalette() {
    if (palette.hidden) return;

    palette.hidden = true;
    document.body.classList.remove("palette-open");

    if (previousFocus?.isConnected) {
      previousFocus.focus();
    }
  }

  paletteInput.addEventListener("input", () => {
    selectedIndex = 0;
    drawResults();
  });

  paletteInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, commands.length - 1);
      updateSelection();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      updateSelection();
    }

    if (event.key === "Enter") {
      event.preventDefault();
      execute(selectedIndex);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
    }
  });

  palette.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-palette]")) {
      closePalette();
    }
  });

  document.addEventListener("keydown", (event) => {
    const isShortcut =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

    if (isShortcut) {
      event.preventDefault();

      if (palette.hidden) openPalette();
      else closePalette();

      return;
    }

    if (event.key === "Escape" && !palette.hidden) {
      closePalette();
    }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("Taskflow: Service Worker не запущен", error);
      });
    });
  }

  let installPrompt = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    showInstallButton();
  });

  function showInstallButton() {
    if ($("#install-app")) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    const button = document.createElement("button");
    button.id = "install-app";
    button.type = "button";
    button.className = "install-app";

    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.textContent = "Установить приложение";

    button.append(icon, label);

    document.body.append(button);

    button.addEventListener("click", async () => {
      if (!installPrompt) return;

      button.disabled = true;

      try {
        await installPrompt.prompt();
        await installPrompt.userChoice;
      } catch (error) {
        console.warn("Taskflow: ошибка установки", error);
      } finally {
        installPrompt = null;
        button.remove();
      }
    });
  }

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    $("#install-app")?.remove();
  });

  render();
})();