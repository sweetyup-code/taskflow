import { convertFromMediaStream } from "@timur00kh/whisper.wasm";

(() => {
  "use strict";

  const AUTO_MS = 1400;
  const SILENCE_MS = 1300;
  const NO_SPEECH_TIMEOUT = 8000;
  const SPEECH_THRESHOLD = 0.012;
  const SILENCE_THRESHOLD = 0.007;

  const btn = document.getElementById("mic");
  const input = document.getElementById("input");
  const form = document.getElementById("form");

  if (!btn || !input || !form) return;

  btn.hidden = false;

  const status = document.createElement("p");
  status.className = "voice-status";
  status.setAttribute("role", "status");
  status.hidden = true;
  form.after(status);

  let stream = null;
  let controller = null;
  let conversionPromise = null;
  let recording = false;
  let processing = false;
  let before = "";
  let autoTimer = 0;
  let statusTimer = 0;
  let silenceTimer = 0;
  let audioContext = null;
  let analyser = null;
  let audioBuffer = null;
  let speechDetected = false;
  let speechStartedAt = 0;
  let lastSoundAt = 0;

  const setStatus = (message, error = false, ttl = 0) => {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("err", error);

    if (message && ttl) {
      statusTimer = setTimeout(() => {
        status.textContent = "";
        status.hidden = true;
      }, ttl);
    }
  };

  const setButton = (active) => {
    btn.classList.toggle("listening", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.setAttribute(
      "aria-label",
      active ? "Остановить запись" : "Голосовой ввод",
    );
    btn.title = active ? "Остановить запись" : "Голосовой ввод (M)";
  };

  const cancelAuto = () => {
    clearTimeout(autoTimer);
    autoTimer = 0;
  };

  function stopMonitoring() {
    clearInterval(silenceTimer);
    silenceTimer = 0;

    if (audioContext) {
      audioContext.close().catch(() => {});
    }

    audioContext = null;
    analyser = null;
    audioBuffer = null;
  }

  function cleanup() {
    stopMonitoring();

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    stream = null;
    controller = null;
    conversionPromise = null;
    recording = false;
    processing = false;

    setButton(false);
  }

  function startSilenceDetection() {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioBuffer = new Float32Array(analyser.fftSize);

    speechDetected = false;
    speechStartedAt = 0;
    lastSoundAt = 0;

    silenceTimer = setInterval(() => {
      if (!recording || !analyser) return;

      analyser.getFloatTimeDomainData(audioBuffer);

      let sum = 0;

      for (let i = 0; i < audioBuffer.length; i++) {
        sum += audioBuffer[i] * audioBuffer[i];
      }

      const rms = Math.sqrt(sum / audioBuffer.length);
      const now = Date.now();

      if (rms >= SPEECH_THRESHOLD) {
        if (!speechDetected) {
          speechDetected = true;
          speechStartedAt = now;
          setStatus("Слушаю... Говорите");
        }

        lastSoundAt = now;
      } else if (speechDetected && rms >= SILENCE_THRESHOLD) {
        lastSoundAt = now;
      }

      if (
        speechDetected &&
        now - lastSoundAt >= SILENCE_MS &&
        now - speechStartedAt >= 500
      ) {
        setStatus("Речь закончена, распознаю...");
        stopRecording();
      }

      if (!speechDetected && now - recordingStartedAt >= NO_SPEECH_TIMEOUT) {
        setStatus("Не услышал речь — попробуйте ещё раз", true, 4000);
        stopRecording();
      }
    }, 100);
  }

  let recordingStartedAt = 0;

  async function startRecording() {
    if (recording || processing) return;

    if (!window.TaskflowWhisper) {
      setStatus("Голосовой ввод загружается — попробуйте через пару секунд");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Браузер не поддерживает микрофон", true, 4000);
      return;
    }

    cancelAuto();
    before = input.value.trim();

    try {
      setStatus("Запрашиваю доступ к микрофону...");

      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      controller = new AbortController();

      recording = true;
      recordingStartedAt = Date.now();

      setButton(true);
      setStatus("Слушаю... Говорите");
      navigator.vibrate?.(12);

      conversionPromise = convertFromMediaStream(
        stream,
        {
          signal: controller.signal,
          recordingDurationMs: 60000,
          logLevel: "ERROR",
        },
        {
          onProgress() {},
          onError(error) {
            console.error("Ошибка преобразования аудио:", error);
          },
        },
      );

      await audioContext?.resume?.();
      startSilenceDetection();
    } catch (error) {
      console.error("Ошибка микрофона:", error);
      setStatus("Ошибка микрофона: " + error.message, true, 5000);
      cleanup();
    }
  }

  async function transcribe(audioData) {
    const session = window.TaskflowWhisper.createSession();

    const transcription = session.streaming(audioData, {
      language: "ru",
      threads: 1,
      translate: false,
    });

    let result = "";

    for await (const segment of transcription) {
      result += segment.text;
    }

    return result.trim();
  }

  async function stopRecording() {
    if (!recording || !conversionPromise) return;

    recording = false;
    processing = true;
    stopMonitoring();
    setButton(false);

    try {
      controller.abort();

      const conversion = await conversionPromise;
      const audioData = conversion.audioData;

      if (!audioData?.length) {
        throw new Error("Аудиозапись пустая");
      }

      if (!speechDetected) {
        input.value = before;
        setStatus("Не услышал речь — попробуйте ещё раз", true, 4000);
        return;
      }

      setStatus("Распознаю речь...");

      const recognized = await transcribe(audioData);

      if (!recognized) {
        input.value = before;
        setStatus("Не удалось распознать речь", true, 4000);
        return;
      }

      const smart = window.TaskflowVoice?.toSmart
        ? window.TaskflowVoice.toSmart(recognized)
        : recognized;

      if (!smart.trim()) {
        input.value = before;
        setStatus("Не расслышал текст задачи", true, 4000);
        return;
      }

      input.value = [before, smart]
        .filter(Boolean)
        .join(" ")
        .slice(0, input.maxLength);

      input.dispatchEvent(new Event("input", { bubbles: true }));

      setStatus("Добавлю через секунду — нажмите на поле, чтобы изменить");

      autoTimer = setTimeout(() => {
        autoTimer = 0;

        if (!input.value.trim()) return;

        form.requestSubmit();

        if (input.value) {
          setStatus("Не получилось добавить задачу", true, 4000);
        } else {
          setStatus("Задача добавлена ✓", false, 2500);
        }
      }, AUTO_MS);
    } catch (error) {
      console.error("Ошибка Whisper:", error);
      input.value = before;
      setStatus("Ошибка распознавания: " + error.message, true, 6000);
    } finally {
      cleanup();
    }
  }

  function toggle() {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  btn.addEventListener("click", toggle);

  ["input", "keydown", "pointerdown"].forEach((eventName) => {
    input.addEventListener(eventName, () => {
      if (autoTimer) {
        cancelAuto();
        setStatus("");
      }
    });
  });

  form.addEventListener("submit", cancelAuto);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && recording) {
      input.value = before;
      cleanup();
      setStatus("");
      return;
    }

    const active = document.activeElement;
    const typing =
      /INPUT|TEXTAREA/.test(active.tagName) || active.isContentEditable;

    if (
      event.code === "KeyM" &&
      !typing &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      toggle();
    }
  });
})();
