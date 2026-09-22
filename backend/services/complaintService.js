/**
 * complaintService.js
 * PRAVAAH Backend Service for Passenger Complaints, Staff Accountability & Inspection Scope Intelligence
 */

const fs = require('fs');
const path = require('path');
const staffRoster = require('../data/staff_roster.json');
const complaintsFilePath = path.join(__dirname, '../data/complaints.json');

function loadComplaints() {
  try {
    if (fs.existsSync(complaintsFilePath)) {
      const raw = fs.readFileSync(complaintsFilePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading complaints:', err.message);
  }
  return [];
}

function saveComplaints(complaints) {
  try {
    fs.writeFileSync(complaintsFilePath, JSON.stringify(complaints, null, 2));
  } catch (err) {
    console.error('Error saving complaints:', err.message);
  }
}

function getStaffForCategory(category) {
  const cat = (category || '').toLowerCase();
  if (/clean|washroom|toilet|water|garbage|hygiene/.test(cat)) {
    return staffRoster.find(s => s.role.includes('OBHS')) || staffRoster[4];
  }
  if (/ac|fan|cooling|heat|temp|air conditioner/.test(cat)) {
    return staffRoster.find(s => s.role.includes('AC Coach')) || staffRoster[5];
  }
  if (/light|charging|switch|power|electrical/.test(cat)) {
    return staffRoster.find(s => s.role.includes('Electrical')) || staffRoster[6];
  }
  if (/safety|security|theft|chain|fight|drunk|unauthorized/.test(cat)) {
    return staffRoster.find(s => s.role.includes('RPF')) || staffRoster[7];
  }
  if (/food|pantry|meal|tea|catering/.test(cat)) {
    return staffRoster.find(s => s.role.includes('Pantry')) || staffRoster[8];
  }
  return staffRoster[0]; // Train Superintendent
}

/**
 * calculateInspectionScope(complaint)
 * Evaluates passenger class, coach, category, severity and returns dynamic inspection scope.
 */
function calculateInspectionScope(complaint) {
  const cat = (complaint.category || '').toLowerCase();
  const coach = (complaint.coach || '').toUpperCase();
  const pClass = (complaint.passengerClass || '').toUpperCase();
  const sev = (complaint.severity || 'medium').toLowerCase();

  const assigned = getStaffForCategory(complaint.category);

  // Determine scope based on category and severity:
  // If AC/Fan problem with high severity -> affects carriage block (MULTI_COACH)
  // If Cleanliness localized issue -> SINGLE_COACH
  // If Water supply or Security train-wide -> TRAIN_WIDE or MULTI_COACH
  let scopeType = 'SINGLE_COACH';
  let coachesToInspect = coach ? [coach] : ['B4'];
  let reason = `Localized complaint reported specifically for coach ${coach || 'B4'}.`;

  if (/ac|fan|cooling|heat|temp/.test(cat) && sev === 'high') {
    scopeType = 'MULTI_COACH';
    // If coach is B4, adjacent are B3, B4, B5
    const prefix = coach.replace(/\d+/g, '');
    const num = parseInt(coach.replace(/\D+/g, ''), 10);
    if (prefix && !isNaN(num)) {
      coachesToInspect = [
        `${prefix}${Math.max(1, num - 1)}`,
        `${prefix}${num}`,
        `${prefix}${num + 1}`
      ];
    } else {
      coachesToInspect = [coach || 'B3', 'B4', 'B5'];
    }
    reason = `Potential AC/service issue affecting adjacent coaches in ${pClass || '3A'} carriage block.`;
  } else if (/water/.test(cat) && (sev === 'high' || sev === 'critical')) {
    scopeType = 'MULTI_COACH';
    reason = `Water supply failure reported in coach ${coach}; checking adjacent coaches for overhead tank starvation.`;
  }

  const evaluationSteps = [
    'Complaint received',
    `Passenger class identified: ${pClass || '3A'}`,
    `Coach identified: ${coach || 'B4'}`,
    `Complaint category & severity evaluated: ${complaint.category || 'General'} (${sev.toUpperCase()})`,
    `Inspection scope determined: ${scopeType} (${coachesToInspect.length} coach${coachesToInspect.length > 1 ? 'es' : ''})`,
    `Staff/OBHS team assigned: ${assigned.name} (${assigned.role})`
  ];

  return {
    scopeType,
    coachesToInspect,
    numberOfCoaches: coachesToInspect.length,
    reason,
    evaluationSteps,
    assignedStaff: assigned
  };
}

function createComplaint(data) {
  const complaints = loadComplaints();
  const id = 'CMP-' + Date.now().toString(36).toUpperCase();
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  const inspectionScope = calculateInspectionScope(data);

  const newComplaint = {
    id,
    train: data.train || data.trainNumber || '12301',
    passengerClass: data.passengerClass || '3A',
    coach: data.coach || 'B4',
    category: data.category || 'Cleanliness',
    severity: (data.severity || 'medium').toLowerCase(),
    description: data.description || '',
    status: 'In Progress',
    timestamp: hhmm,
    inspectionScope: {
      scopeType: inspectionScope.scopeType,
      coachesToInspect: inspectionScope.coachesToInspect,
      numberOfCoaches: inspectionScope.numberOfCoaches,
      reason: inspectionScope.reason
    },
    assignedStaff: {
      name: inspectionScope.assignedStaff.name,
      role: inspectionScope.assignedStaff.role,
      badge: inspectionScope.assignedStaff.badge
    },
    evaluationSteps: inspectionScope.evaluationSteps,
    escalationLevel: 1
  };

  complaints.unshift(newComplaint);
  saveComplaints(complaints);
  return newComplaint;
}

function getAllComplaints(filters) {
  const complaints = loadComplaints();
  if (!filters) return complaints;
  return complaints.filter(c => {
    if (filters.train && c.train !== filters.train) return false;
    if (filters.status && c.status.toLowerCase() !== filters.status.toLowerCase()) return false;
    if (filters.category && c.category.toLowerCase() !== filters.category.toLowerCase()) return false;
    return true;
  });
}

function getComplaintById(id) {
  const complaints = loadComplaints();
  return complaints.find(c => c.id === id) || null;
}

function updateComplaint(id, updates) {
  const complaints = loadComplaints();
  const idx = complaints.findIndex(c => c.id === id);
  if (idx === -1) return null;
  complaints[idx] = { ...complaints[idx], ...updates };
  saveComplaints(complaints);
  return complaints[idx];
}

module.exports = {
  calculateInspectionScope,
  createComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaint
};
