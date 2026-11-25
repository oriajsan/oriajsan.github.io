/* ------------------------------------------------------------------
   Formulário de contato. Envia pelo Web3Forms (https://web3forms.com),
   que repassa a mensagem para o meu e-mail. Enquanto o campo access_key
   estiver vazio, abre o programa de e-mail de quem escreve, com a
   mensagem já preenchida. Textos em assets/i18n.js.
------------------------------------------------------------------- */
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const t = (key, vars) => window.I18N.t(key, vars);
  const status = document.getElementById("form-status");
  const submit = form.querySelector(".submit");
  const submitText = submit.querySelector("[data-i18n]");
  const fields = [...form.querySelectorAll("input[required], textarea[required]")];
  let lastStatus = null; // { key, kind }, para traduzir a mensagem se o idioma mudar

  function say(key, kind) {
    lastStatus = key ? { key, kind } : null;
    status.textContent = key ? t(key, { email: form.dataset.fallbackEmail }) : "";
    status.className = `form-status${kind ? " " + kind : ""}`;
  }
  window.I18N.onChange(() => { if (lastStatus) say(lastStatus.key, lastStatus.kind); });

  const valid = (f) => f.value.trim() !== "" && f.checkValidity();

  function validate() {
    let first = null;
    for (const f of fields) {
      f.setAttribute("aria-invalid", String(!valid(f)));
      if (!valid(f) && !first) first = f;
    }
    if (first) {
      say(first.type === "email" && first.value.trim() ? "contact.badEmail" : "contact.missing", "error");
      first.focus();
      return false;
    }
    return true;
  }

  fields.forEach((f) => f.addEventListener("input", () => {
    if (f.getAttribute("aria-invalid") === "true" && valid(f)) f.setAttribute("aria-invalid", "false");
  }));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (form.botcheck.checked) return; // robôs preenchem o campo escondido
    if (!validate()) return;

    const data = Object.fromEntries(new FormData(form));
    delete data.botcheck;
    data.subject = t("contact.subject");

    // Sem chave configurada: abre o e-mail de quem escreve
    if (!data.access_key) {
      const body = `${data.message}\n\n${data.name}\n${data.email}`;
      location.href = `mailto:${form.dataset.fallbackEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(body)}`;
      say("contact.mailto", "ok");
      return;
    }

    submit.disabled = true;
    submitText.textContent = t("contact.sending");
    say(null);
    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || res.status);
      form.reset();
      fields.forEach((f) => f.removeAttribute("aria-invalid"));
      say("contact.ok", "ok");
    } catch (e) {
      say("contact.fail", "error");
    } finally {
      submit.disabled = false;
      submitText.textContent = t("contact.send");
    }
  });
})();
