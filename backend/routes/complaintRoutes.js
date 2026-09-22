const express = require('express');
const router = express.Router();
const complaintService = require('../services/complaintService');

// POST /api/complaints - submit new complaint
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: 'Complaint payload is required.' });
    }
    const complaint = complaintService.createComplaint(data);
    res.status(201).json({ success: true, message: 'Complaint filed successfully.', complaint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/complaints - list all complaints
router.get('/', (req, res) => {
  try {
    const filters = {
      train: req.query.train,
      status: req.query.status,
      category: req.query.category
    };
    const complaints = complaintService.getAllComplaints(filters);
    res.json({ success: true, count: complaints.length, complaints });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/complaints/inspection-scope - preview scope calculation
router.post('/inspection-scope', (req, res) => {
  try {
    const scope = complaintService.calculateInspectionScope(req.body);
    res.json({ success: true, inspectionScope: scope });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/complaints/:id
router.get('/:id', (req, res) => {
  try {
    const complaint = complaintService.getComplaintById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint ' + req.params.id + ' not found.' });
    }
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/complaints/:id
router.patch('/:id', (req, res) => {
  try {
    const updated = complaintService.updateComplaint(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Complaint ' + req.params.id + ' not found.' });
    }
    res.json({ success: true, complaint: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
