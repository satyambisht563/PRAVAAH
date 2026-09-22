/**
 * complaintApi.js
 * Client-side API layer for Passenger Complaints & Inspection Scope Intelligence
 */
const ComplaintAPI = {
  async submitComplaint(payload) {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.complaint || null;
    } catch (err) {
      console.warn('[ComplaintAPI] submitComplaint fallback to client store:', err.message);
      if (typeof submitComplaintLocal === 'function') {
        return submitComplaintLocal(payload);
      }
      return null;
    }
  },

  async getComplaints(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const res = await fetch(`${CONFIG.API_BASE_URL}/complaints?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.complaints || [];
    } catch (err) {
      console.warn('[ComplaintAPI] getComplaints fallback:', err.message);
      return [];
    }
  },

  async getInspectionScopePreview(payload) {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/inspection-scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.inspectionScope || null;
    } catch (err) {
      if (typeof calculateInspectionScope === 'function') {
        return calculateInspectionScope(payload);
      }
      return null;
    }
  }
};
