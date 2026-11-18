/**
 * Reusable modal dialog utility
 */
export function openModal(id, contentHtml, title = "") {
  let modal = document.getElementById(id);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = id;
    modal.className = "modal-backdrop";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="document.getElementById('${id}').classList.remove('open')">×</button>
      </div>
      <div class="modal-body">${contentHtml}</div>
    </div>
  `;

  modal.classList.add("open");
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open");
}
