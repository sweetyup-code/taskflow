(() => {
  "use strict";

  const MONTHS = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];

  const END = "(?=[\\s.,!?]|$)";
  const words = (w) => new RegExp("(^|\\s)(" + w + ")" + END, "gi");

  const CMD =
  /^(?:пожалуйста[\s,]+)?(?:добавь|добавить|запиши|записать|создай|создать|напомни|напомнить)(?:\s+мне)?(?:\s+задачу)?(?:[\s,:-]+|$)/i;

  const PRIO_RE = words("срочно|важно");
  const DAY_RE = words("сегодня|завтра|послезавтра");

  const DATE_RE = new RegExp(
    "(^|\\s)(\\d{1,2})\\s+(" + MONTHS.join("|") + ")" + END,
    "gi",
  );

  function toSmart(raw) {
    const tokens = [];

    let s = String(raw || "")
      .trim()
      .replace(CMD, "");

    s = s.replace(PRIO_RE, (m, sp, w) => {
      tokens.push("!" + w.toLowerCase());
      return sp;
    });

    s = s.replace(DAY_RE, (m, sp, w) => {
      tokens.push("@" + w.toLowerCase());
      return sp;
    });

    s = s.replace(DATE_RE, (m, sp, d, mo) => {
      tokens.push("@" + d + "." + (MONTHS.indexOf(mo.toLowerCase()) + 1));
      return sp;
    });

    s = s.replace(/\s+/g, " ").replace(/^[\s,.:;-]+|[\s,.!?:;-]+$/g, "");

    s = s.charAt(0).toUpperCase() + s.slice(1);

    return [s, ...tokens].join(" ").trim();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { toSmart };
  }

  if (typeof window !== "undefined") {
    window.TaskflowVoice = { toSmart };
  }
})();
