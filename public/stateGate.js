const STATE_STORAGE_KEY = "publishearts_customer_state_v1";

const US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC"
];

const US_STATE_SET = new Set(US_STATE_CODES);

function normalizeStateCode(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  if (!US_STATE_SET.has(code)) {
    return "";
  }
  return code;
}

function getStateLabel(code) {
  return code ? `State: ${code}` : "Set State";
}

export function getCustomerState() {
  const raw = window.localStorage.getItem(STATE_STORAGE_KEY);
  return normalizeStateCode(raw);
}

export function setCustomerState(stateCode) {
  const normalized = normalizeStateCode(stateCode);
  if (!normalized) {
    window.localStorage.removeItem(STATE_STORAGE_KEY);
    return "";
  }
  window.localStorage.setItem(STATE_STORAGE_KEY, normalized);
  return normalized;
}

function buildStateOptions(selectEl, selectedCode) {
  if (!selectEl) {
    return;
  }

  selectEl.innerHTML = `
    <option value="">Select your state</option>
    ${US_STATE_CODES.map((code) => `<option value="${code}">${code}</option>`).join("")}
  `;
  if (selectedCode && US_STATE_SET.has(selectedCode)) {
    selectEl.value = selectedCode;
  }
}

export function setupStateGate({
  gateId = "state-gate",
  formId = "state-gate-form",
  selectId = "state-select",
  messageId = "state-gate-message",
  chipId = "state-chip",
  onStateChange
} = {}) {
  const gate = document.getElementById(gateId);
  const form = document.getElementById(formId);
  const select = document.getElementById(selectId);
  const message = document.getElementById(messageId);
  const chip = document.getElementById(chipId);

  const setMessage = (text = "", isError = false) => {
    if (!message) {
      return;
    }
    message.textContent = text;
    message.classList.toggle("error", Boolean(isError));
  };

  const close = () => {
    if (!gate) {
      return;
    }
    gate.classList.add("hidden");
    gate.setAttribute("aria-hidden", "true");
  };

  const open = () => {
    if (!gate) {
      return;
    }
    gate.classList.remove("hidden");
    gate.setAttribute("aria-hidden", "false");
    const current = getCustomerState();
    buildStateOptions(select, current);
    if (select) {
      select.focus();
    }
  };

  const refreshChip = () => {
    if (!chip) {
      return;
    }
    chip.textContent = getStateLabel(getCustomerState());
  };

  buildStateOptions(select, getCustomerState());
  refreshChip();

  if (form && select) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = setCustomerState(select.value);
      if (!selected) {
        setMessage("Please pick a valid U.S. state.", true);
        return;
      }
      setMessage("");
      refreshChip();
      close();
      if (typeof onStateChange === "function") {
        onStateChange(selected);
      }
    });
  }

  if (chip) {
    chip.addEventListener("click", () => {
      setMessage("");
      open();
    });
  }

  const existing = getCustomerState();
  if (existing) {
    close();
  } else {
    open();
  }

  return {
    open,
    close,
    getState: getCustomerState
  };
}
