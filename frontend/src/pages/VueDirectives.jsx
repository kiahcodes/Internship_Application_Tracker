import { useEffect, useRef } from "react";
import { createApp } from "vue";
import "./VueDirectives.css";

export function VueDirectives() {
  const mountRef = useRef(null);

  useEffect(() => {
    const app = createApp({
      data() {
        return {
          items: [
            { id: 1, text: "Update resume", date: "2026-09-10" },
            { id: 2, text: "Apply to Google internship", date: "2026-09-14" },
            { id: 3, text: "Prep for mock interview", date: "2026-09-20" },
          ],
          nextId: 4,
          draft: "",
        };
      },
      methods: {
        addItem() {
          const text = this.draft.trim();
          if (!text) return;
          this.items.push({
            id: this.nextId++,
            text,
            date: new Date().toISOString().slice(0, 10),
          });
          this.draft = "";
        },
        removeItem(id) {
          this.items = this.items.filter((item) => item.id !== id);
        },
      },
      template: `
        <div class="vd-grid">
          <section class="vd-card">
            <h2 class="vd-card-title">I. Click-to-uppercase directive</h2>
            <p class="vd-card-hint">Click the text below.</p>
            <p class="vd-demo-text" v-uppercase>transform me on click</p>
          </section>

          <section class="vd-card">
            <h2 class="vd-card-title">II. Dynamic list directive</h2>
            <p class="vd-card-hint">
              Each row is added reactively; a custom directive alternates its
              highlight as rows are added or removed.
            </p>
            <div class="vd-add-row">
              <input
                class="vd-input"
                v-model="draft"
                @keyup.enter="addItem"
                placeholder="Add a task"
              />
              <button class="vd-btn" @click="addItem">Add</button>
            </div>
            <ul class="vd-list">
              <li
                v-for="(item, index) in items"
                :key="item.id"
                v-highlight="index"
                class="vd-list-item"
              >
                <span>{{ item.text }}</span>
                <button class="vd-remove" @click="removeItem(item.id)">
                  &times;
                </button>
              </li>
            </ul>
          </section>

          <section class="vd-card">
            <h2 class="vd-card-title">III. Human-readable date directive</h2>
            <p class="vd-card-hint">
              Raw ISO dates from the task list above, formatted in place.
            </p>
            <ul class="vd-date-list">
              <li v-for="item in items" :key="item.id">
                <span>{{ item.text }}</span>
                <span class="vd-date" v-format-date="item.date"></span>
              </li>
            </ul>
          </section>
        </div>
      `,
    });

    app.directive("uppercase", {
      mounted(el) {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => {
          el.textContent = el.textContent.toUpperCase();
        });
      },
    });

    app.directive("highlight", {
      mounted(el, binding) {
        el.classList.toggle("vd-list-item-alt", binding.value % 2 === 1);
      },
      updated(el, binding) {
        el.classList.toggle("vd-list-item-alt", binding.value % 2 === 1);
      },
    });

    app.directive("format-date", {
      mounted(el, binding) {
        el.textContent = new Date(binding.value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      },
      updated(el, binding) {
        el.textContent = new Date(binding.value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      },
    });

    app.mount(mountRef.current);

    return () => app.unmount();
  }, []);

  return (
    <section className="vue-directives-page">
      <div className="vd-header">
        <h1 className="vd-title">Custom Directives</h1>
      </div>
      <div ref={mountRef}></div>
    </section>
  );
}

export default VueDirectives;
