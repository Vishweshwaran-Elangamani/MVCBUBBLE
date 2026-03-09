export default function ConfirmModal({ message, onConfirm, onCancel }) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Delete Workspace?</h3>
          <p className="modal-message">{message}</p>
          <div className="modal-actions">
            <button className="secondary-btn" onClick={onCancel}>
              Cancel
            </button>
            <button className="danger-btn" onClick={onConfirm}>
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    );
  }
  