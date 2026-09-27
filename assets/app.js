(() => {
  "use strict";

  const cfg = window.DASHBOARD_CONFIG || {};

  const el = (id) => document.getElementById(id);

  function text(id, value) {
    const node = el(id);
    if (node) node.textContent = value ?? "unknown";
  }

  function fmtTime(value) {
    if (!value) return "暂无采样时间";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "时间格式无效" : d.toLocaleString();
  }

  function fmtCount(value) {
    return Number.isInteger(value) ? String(value) : "unknown";
  }

  function statusUrl() {
    if (cfg.mode === "demo") {
      return "./demo/status.json";
    }

    return `https://raw.githubusercontent.com/${cfg.publicOwner}/${cfg.publicRepo}/${cfg.dataBranch}/${cfg.dataPath}`;
  }

  function render(data) {
    text(
      "mode-note",
      data.mode === "demo"
        ? "当前为演示数据，不代表实验服务器实时状态。"
        : "当前显示经脱敏发布的实验状态。"
    );

    text("lab-status", data.worker?.state || "unknown");
    text(
      "lab-time",
      `节点 ${data.worker?.alias || "unknown"} · 采样 ${fmtTime(data.observed_at)}`
    );

    text(
      "task-status",
      `running ${fmtCount(data.queue?.running)}`
    );
    text(
      "task-counts",
      `queued ${fmtCount(data.queue?.queued)}`
    );

    text(
      "resident-status",
      data.resident?.process_state || "unknown"
    );
    text(
      "resident-detail",
      `request ${data.resident?.last_request_status || "unknown"} · residency ${data.resident?.residency || "unknown"}`
    );

    text("metrics", "公开模式不展示主机 IP、路径、用户名或内部环境信息。");

    const runs = el("runs");
    if (runs) {
      runs.replaceChildren();

      const items = Array.isArray(data.recent_runs) ? data.recent_runs : [];
      if (!items.length) {
        runs.textContent = "暂无可公开实验记录。";
      } else {
        for (const run of items) {
          const p = document.createElement("p");
          p.textContent =
            `${run.alias || "run"} · ${run.execution_status || "unknown"} · ${run.validation_status || "unknown"}`;
          runs.appendChild(p);
        }
      }
    }

    text(
      "updated-at",
      `发布：${fmtTime(data.published_at)}`
    );
  }

  function renderError(error) {
    text("mode-note", "状态数据读取失败。");
    text("lab-status", "unknown");
    text("task-status", "unknown");
    text("resident-status", "unknown");
    text("metrics", String(error));
    text("updated-at", "未加载");
  }

  async function refresh() {
    try {
      const response = await fetch(statusUrl(), {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.schema_version !== 1) {
        throw new Error("unsupported schema_version");
      }

      render(data);
    } catch (error) {
      renderError(error);
    }
  }

  const management = el("management-link");
  if (management) {
    management.href = cfg.managementUrl || "https://github.com/issues";
  }

  el("refresh")?.addEventListener("click", refresh);

  refresh();

  const interval = Math.max(
    30,
    Number(cfg.refreshSeconds) || 120
  ) * 1000;

  window.setInterval(refresh, interval);
})();
