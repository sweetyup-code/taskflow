"use strict";

const $ = (s) => document.querySelector(s);
const root = document.documentElement,
  KEY = "taskflow:v1";
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};
const list = $("#list"),
  input = $("#input"),
  prioBtn = $("#prio"),
  toast = $("#toast"),
  form = $("#form");
const PRIO = ["Обычный", "Важный", "Срочный"],
  rows = new Map();
let tasks = load(),
  filter = "all",
  prio = 0,
  trash = [],
  toastT,
  first = true;

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function load() {
  const raw = store.get(KEY);
  if (raw === null) {
    return [
      ["Нажмите на кружок — задача выполнена ✨", 1],
      ["Двойной клик по тексту — редактирование", 0],
      ["Тяните за ⠿, чтобы менять порядок", 0],
    ].map(([text, p]) => ({
      id: uid(),
      text,
      done: false,
      prio: p,
      due: null,
    }));
  }
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a)
      ? a
          .filter((t) => t && typeof t.text === "string")
          .map((t) => ({
            id: String(t.id || uid()),
            text: t.text.slice(0, 140),
            done: !!t.done,
            prio: [0, 1, 2].includes(t.prio) ? t.prio : 0,
            due: /^\d{4}-\d\d-\d\d$/.test(t.due) ? t.due : null,
            subtasks: Array.isArray(t.subtasks)
              ? t.subtasks
                  .filter((s) => s && typeof s.text === "string")
                  .map((s) => ({
                    id: String(s.id || uid()),
                    text: s.text.slice(0, 100),
                    done: !!s.done,
                  }))
              : [],
          }))
      : [];
  } catch {
    return [];
  }
}

const save = () => store.set(KEY, JSON.stringify(tasks));
const commit = () => {
  save();
  render();
};
const find = (li) => tasks.find((t) => t.id === li.dataset.id);

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const plural = (n, f) =>
  f[n % 100 > 10 && n % 100 < 15 ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)]];

function dueInfo(s) {
  const [y, m, d] = s.split("-").map(Number),
    date = new Date(y, m - 1, d);
  const diff = Math.round((date - today()) / 864e5);
  const fmt = date.toLocaleDateString("ru", { day: "numeric", month: "short" });
  return diff === 0
    ? ["Сегодня", 0]
    : diff === 1
      ? ["Завтра", 0]
      : diff < 0
        ? ["Просрочено: " + fmt, 1]
        : [fmt, 0];
}

function parse(raw) {
  let p = null,
    due = null;
  const text = raw
    .replace(/(^|\s)([!@])(\S+)/g, (m, sp, k, w) => {
      w = w.toLowerCase();

      if (k === "!") {
        if (/^(срочно|urgent|3)$/.test(w)) p = 2;
        else if (/^(важно|important|2)$/.test(w)) p = 1;
        else if (/^(обычно|normal|1)$/.test(w)) p = 0;
        else return m;
        return sp;
      }

      const d = today();

      if (/^(сегодня|today)$/.test(w)) {
      } else if (/^(завтра|tomorrow)$/.test(w)) {
        d.setDate(d.getDate() + 1);
      } else if (w === "послезавтра") {
        d.setDate(d.getDate() + 2);
      } else {
        const x = w.match(/^(\d{1,2})\.(\d{1,2})$/);
        if (!x) return m;

        d.setMonth(+x[2] - 1, +x[1]);
        if (d < today()) d.setFullYear(d.getFullYear() + 1);
      }

      due = iso(d);
      return sp;
    })
    .replace(/\s+/g, " ")
    .trim();

  return { text, prio: p, due };
}

function render() {
  const vis = tasks.filter(
    (t) => filter === "all" || (filter === "done") === t.done,
  );
  const ids = new Set(vis.map((t) => t.id));
  rows.forEach((li, id) => {
    if (!ids.has(id)) {
      rows.delete(id);
      leave(li);
    }
  });
  let prev = null;
  vis.forEach((t, i) => {
    let li = rows.get(t.id);
    if (!li) {
      li = $("#tpl").content.firstElementChild.cloneNode(true);
      li.dataset.id = t.id;
      li.style.setProperty("--d", first ? i * 55 + "ms" : "0ms");
      li.classList.add("enter");
      li.addEventListener("animationend", () => li.classList.remove("enter"), {
        once: true,
      });
      rows.set(t.id, li);
    }
    li.classList.toggle("done", t.done);
    li.dataset.p = t.prio;
    li.querySelector("input").checked = t.done;
    const tx = li.querySelector(".txt");
    if (tx.textContent !== t.text && tx.contentEditable !== "true")
      tx.textContent = t.text;
    const m = li.querySelector(".meta"),
      d = t.due && dueInfo(t.due);
    m.textContent = d ? d[0] : "";
    m.classList.toggle("late", !!(d && d[1] && !t.done));
    const ref = prev ? prev.nextElementSibling : list.firstElementChild;
    if (ref !== li) list.insertBefore(li, ref);
    prev = li;
  });
  first = false;
  list.classList.toggle("sortable", filter === "all");
  stats();
}

function leave(li) {
  li.style.height = li.offsetHeight + "px";
  void li.offsetHeight;
  li.classList.add("leave");
  setTimeout(() => li.remove(), reduce ? 0 : 360);
}

function stats() {
  const total = tasks.length,
    done = tasks.filter((t) => t.done).length,
    left = total - done;
  $("#stat").textContent = `${done} из ${total}`;
  $("#ring").style.strokeDashoffset = 113.1 * (1 - (total ? done / total : 0));
  $("#hint").textContent = !total
    ? "Добавьте первую задачу"
    : left
      ? `Осталось ${left} ${plural(left, ["задача", "задачи", "задач"])}`
      : "Всё сделано — отличная работа 🎉";
  document.querySelectorAll("#filters button").forEach((b) => {
    b.querySelector(".n").textContent = { all: total, active: left, done }[
      b.dataset.f
    ];
  });
  $("#clear").hidden = !done;
  const e = $("#empty");
  e.hidden = tasks.some(
    (t) => filter === "all" || (filter === "done") === t.done,
  );
  e.textContent = !total
    ? "Пока пусто. Начните с первой задачи ☝️"
    : filter === "done"
      ? "Выполненных задач пока нет"
      : "Здесь ничего нет — всё сделано!";
}

function add(raw) {
  const p = parse(raw);
  if (!p.text) return false;
  tasks.unshift({
    id: uid(),
    text: p.text,
    done: false,
    prio: p.prio ?? prio,
    due: p.due,
  });
  commit();
  return true;
}

function shake() {
  form.classList.remove("shake");
  void form.offsetWidth;
  form.classList.add("shake");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (add(input.value.trim())) {
    input.value = "";
    prio = 0;
    setPrio();
  } else shake();
  input.focus();
});

function setPrio() {
  prioBtn.dataset.p = prio;
  prioBtn.title = PRIO[prio];
  prioBtn.setAttribute("aria-label", "Приоритет: " + PRIO[prio].toLowerCase());
}

prioBtn.addEventListener("click", () => {
  prio = (prio + 1) % 3;
  setPrio();
  input.focus();
});

list.addEventListener("change", (e) => {
  if (e.target.type !== "checkbox") return;
  const li = e.target.closest(".task"),
    t = find(li);
  if (!t) return;
  t.done = e.target.checked;
  if (t.done && tasks.every((x) => x.done)) {
    const r = li.querySelector(".chk").getBoundingClientRect();
    burst(r.left + 14, r.top + 14);
  }
  commit();
});

list.addEventListener("click", (e) => {
  const b = e.target.closest(".del");
  if (!b) return;
  const i = tasks.findIndex((t) => t.id === b.closest(".task").dataset.id);
  if (i < 0) return;
  trash.push([{ t: tasks[i], i }]);
  tasks.splice(i, 1);
  commit();
  showToast("Задача удалена");
});

$("#clear").addEventListener("click", () => {
  const g = [];
  tasks.forEach((t, i) => {
    if (t.done) g.push({ t, i });
  });
  if (!g.length) return;
  trash.push(g);
  tasks = tasks.filter((t) => !t.done);
  commit();
  showToast(`Удалено выполненных: ${g.length}`);
});

function undo() {
  const g = trash.pop();
  if (!g) return;
  g.sort((a, b) => a.i - b.i).forEach(({ t, i }) =>
    tasks.splice(Math.min(i, tasks.length), 0, t),
  );
  commit();
  hideToast();
}

function showToast(msg) {
  $("#toastMsg").textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(hideToast, 6000);
}

function hideToast() {
  toast.classList.remove("show");
}

$("#undo").addEventListener("click", undo);

list.addEventListener("dblclick", (e) => {
  const x = e.target.closest(".txt");
  if (x) edit(x.closest(".task"));
});

function edit(li) {
  const t = find(li),
    el = li.querySelector(".txt");
  let cancel = false;
  el.contentEditable = "true";
  el.focus();
  const s = getSelection();
  s.selectAllChildren(el);
  s.collapseToEnd();
  el.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      el.blur();
    }
    if (e.key === "Escape") {
      cancel = true;
      el.blur();
    }
  };
  el.onblur = () => {
    el.contentEditable = "false";
    el.onblur = el.onkeydown = null;
    const p = parse(el.textContent);
    if (!cancel && p.text) {
      t.text = p.text.slice(0, 140);
      if (p.prio !== null) t.prio = p.prio;
      if (p.due) t.due = p.due;
      commit();
    } else el.textContent = t.text;
  };
}

let drag = null;

list.addEventListener("pointerdown", (e) => {
  const h = e.target.closest(".grip");
  if (!h || filter !== "all") return;
  e.preventDefault();
  drag = h.closest(".task");
  drag.classList.add("drag");
  h.setPointerCapture(e.pointerId);
});

list.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const x = list.getBoundingClientRect().left + 40;
  const over = document.elementFromPoint(x, e.clientY)?.closest(".task");
  if (over && over !== drag && !over.classList.contains("leave")) {
    const r = over.getBoundingClientRect();
    list.insertBefore(
      drag,
      e.clientY < r.top + r.height / 2 ? over : over.nextElementSibling,
    );
  }
});

function dropEnd() {
  if (!drag) return;
  drag.classList.remove("drag");
  const order = [...list.children]
    .filter((li) => !li.classList.contains("leave"))
    .map(find)
    .filter(Boolean);
  if (order.length === tasks.length) {
    tasks = order;
    save();
  }
  drag = null;
}

list.addEventListener("pointerup", dropEnd);
list.addEventListener("pointercancel", dropEnd);

$("#filters").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  filter = b.dataset.f;
  e.currentTarget.style.setProperty(
    "--i",
    ["all", "active", "done"].indexOf(filter),
  );
  e.currentTarget
    .querySelectorAll("button")
    .forEach((x) => x.setAttribute("aria-selected", x === b));
  render();
});

function setTheme(t, x, y) {
  const go = () => {
    root.dataset.theme = t;
    store.set("taskflow:theme", t);
  };
  if (!document.startViewTransition || reduce) return go();
  root.style.setProperty("--x", x + "px");
  root.style.setProperty("--y", y + "px");
  document.startViewTransition(go);
}

$("#theme").addEventListener("click", (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  setTheme(
    root.dataset.theme === "dark" ? "light" : "dark",
    r.left + r.width / 2,
    r.top + r.height / 2,
  );
});

const cv = $("#fx"),
  cx = cv.getContext("2d");
let parts = [],
  raf = 0;

const fit = () => {
  cv.width = innerWidth;
  cv.height = innerHeight;
};

fit();
addEventListener("resize", fit);

function burst(x, y) {
  if (reduce) return;
  const c = ["#16c7a9", "#ff7a59", "#2f6df6", "#f5b83d", "#ff4d6d"];
  for (let i = 0; i < 100; i++) {
    const a = Math.random() * Math.PI * 2,
      s = 4 + Math.random() * 9;
    parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 6,
      r: 3 + Math.random() * 4,
      c: c[i % 5],
      life: 1,
      rot: Math.random() * 6,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => p.life > 0 && p.y < cv.height + 40);
  parts.forEach((p) => {
    p.vy += 0.35;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += 0.2;
    p.life -= 0.011;
    cx.save();
    cx.globalAlpha = Math.max(p.life, 0);
    cx.fillStyle = p.c;
    cx.translate(p.x, p.y);
    cx.rotate(p.rot);
    cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
    cx.restore();
  });
  raf = parts.length ? requestAnimationFrame(tick) : 0;
  if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
}

addEventListener("keydown", (e) => {
  const a = document.activeElement;
  const typing = /INPUT|TEXTAREA/.test(a.tagName) || a.isContentEditable;
  if (e.code === "Slash" && !typing) {
    e.preventDefault();
    input.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ" && !typing) {
    e.preventDefault();
    undo();
  }
});

addEventListener("storage", (e) => {
  if (e.key === KEY && e.newValue !== null) {
    tasks = load();
    render();
  }
});

const h = new Date().getHours();
$("#greeting").textContent =
  (h < 5
    ? "Доброй ночи"
    : h < 12
      ? "Доброе утро"
      : h < 18
        ? "Добрый день"
        : "Добрый вечер") + "!";
$("#date").textContent = new Date().toLocaleDateString("ru", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

save();
render();