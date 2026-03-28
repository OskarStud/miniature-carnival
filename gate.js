(function () {
  const PASSWORD = "2026";
  const STORAGE_KEY = "mc_gate_unlocked";

  const gate = document.getElementById("gate");
  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-password");
  const errorEl = document.getElementById("gate-error");

  if (!gate || !form || !input || !errorEl) return;

  function unlock() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    document.body.classList.remove("gate-active");
    gate.hidden = true;
    errorEl.textContent = "";
  }

  if (sessionStorage.getItem(STORAGE_KEY) === "1") {
    document.body.classList.remove("gate-active");
    gate.hidden = true;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.textContent = "";
    if (input.value === PASSWORD) {
      unlock();
      input.value = "";
    } else {
      errorEl.textContent = "Неверный пароль";
    }
  });
})();
