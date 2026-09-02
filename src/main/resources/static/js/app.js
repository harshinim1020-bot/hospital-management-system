// Global Variables
let patientsCache = [];
let doctorsCache = [];
let appointmentsCache = [];
let recordsCache = [];
let statsCache = {};
let revenueChart = null;
let activeRole = 'admin'; // active user role (admin, doctor, patient)

// ==========================================
// INITIALIZATION & TAB NAVIGATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme
    initTheme();

    // Set Live Clock
    updateLiveClock();
    setInterval(updateLiveClock, 1000);

    // Initialize Portal Role Access
    const savedRole = localStorage.getItem('user-role');
    if (savedRole) {
        document.getElementById('portal-splash').classList.add('hidden');
        applyRole(savedRole);
    } else {
        document.getElementById('portal-splash').classList.remove('hidden');
    }

    // Sidebar Navigation Click Handlers
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Setup Appointment Filters
    const filterBadges = document.querySelectorAll('.filter-badge');
    filterBadges.forEach(badge => {
        badge.addEventListener('click', () => {
            filterBadges.forEach(b => b.classList.remove('active'));
            badge.classList.add('active');
            const filterVal = badge.getAttribute('data-filter');
            renderAppointments(filterVal);
        });
    });

    // Run Lucide Icons replacement
    lucide.createIcons();
});

// Update Header clock
function updateLiveClock() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    document.getElementById('live-date').innerText = dateStr;
}

// Tab Switching Routing
function switchTab(tabId) {
    // Update menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update panels
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
        if (panel.id === `tab-${tabId}`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    // Update Title text
    let titleText = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    if (tabId === 'patients') {
        titleText = 'General';
    }
    document.getElementById('page-title').innerText = `${titleText} Panel`;

    // Fetch tab-specific data
    if (tabId === 'dashboard') {
        loadDashboardData();
    } else if (tabId === 'patients') {
        loadPatientsData();
    } else if (tabId === 'doctors') {
        loadDoctorsData();
    } else if (tabId === 'appointments') {
        loadAppointmentsData();
    } else if (tabId === 'billing') {
        loadBillingData();
    }
}

// ==========================================
// DATA FETCHING & API INTERACTION
// ==========================================

// Dashboard tab data loading
function loadDashboardData() {
    fetch('/api/dashboard/stats')
        .then(res => res.json())
        .then(stats => {
            statsCache = stats;
            document.getElementById('stat-patients').innerText = stats.totalPatients;
            document.getElementById('stat-doctors').innerText = stats.totalDoctors;
            document.getElementById('stat-appointments').innerText = stats.pendingAppointments;
            document.getElementById('stat-revenue').innerText = `$${stats.totalRevenue.toFixed(2)}`;

            renderRevenueChart(stats.totalRevenue, stats.outstandingRevenue);
        })
        .catch(err => showToast('Error loading dashboard stats', 'error'));

    // Fetch today's schedule for dashboard table
    fetch('/api/appointments')
        .then(res => res.json())
        .then(appointments => {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayAppointments = appointments.filter(a => a.appointmentDate === todayStr || a.status === 'Scheduled');
            const tbody = document.getElementById('dashboard-appointments-tbody');
            tbody.innerHTML = '';

            if (todayAppointments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="text-align: center; color: var(--text-secondary);">No scheduled tasks for today.</td></tr>`;
                return;
            }

            todayAppointments.slice(0, 5).forEach(appt => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${appt.patient.name}</strong></td>
                    <td>${appt.doctor.name}</td>
                    <td><i data-lucide="clock" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px; display: inline;"></i>${appt.appointmentTime}</td>
                    <td>${appt.reason}</td>
                    <td><span class="status-pill status-${appt.status.toLowerCase()}">${appt.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
            lucide.createIcons();
        });
}

// Load Patients
function loadPatientsData() {
    fetch('/api/patients')
        .then(res => res.json())
        .then(data => {
            patientsCache = data;
            renderPatients(data);
        })
        .catch(err => showToast('Error fetching patients list', 'error'));
}

// Render Patients Table
function renderPatients(patients) {
    const tbody = document.getElementById('patients-tbody');
    tbody.innerHTML = '';

    if (patients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">No patients registered.</td></tr>`;
        return;
    }

    patients.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${p.id}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.age}</td>
            <td>${p.gender}</td>
            <td>${p.contactNumber}</td>
            <td><span class="badge primary">${p.bloodGroup}</span></td>
            <td>${p.address}</td>
            <td>
                <div class="table-actions">
                    <button onclick="editPatient(${p.id})" title="Edit Details"><i data-lucide="edit-3"></i></button>
                    <button class="delete" onclick="deletePatient(${p.id})" title="Delete"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// Filter Patients client-side
function filterPatients() {
    const query = document.getElementById('patient-search').value.toLowerCase();
    const filtered = patientsCache.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.contactNumber.includes(query) ||
        p.bloodGroup.toLowerCase().includes(query)
    );
    renderPatients(filtered);
}

// Load Doctors
function loadDoctorsData() {
    fetch('/api/doctors')
        .then(res => res.json())
        .then(data => {
            doctorsCache = data;
            renderDoctors();
        })
        .catch(err => showToast('Error fetching doctor list', 'error'));
}

// Render Doctor Cards Grid
function renderDoctors() {
    const grid = document.getElementById('doctors-grid');
    grid.innerHTML = '';

    if (doctorsCache.length === 0) {
        grid.innerHTML = `<div class="span-all" style="text-align: center; width: 100%; color: var(--text-secondary);">No medical practitioners added.</div>`;
        return;
    }

    doctorsCache.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'doctor-card';
        // Get Initials
        const initials = doc.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('');

        div.innerHTML = `
            <button class="delete-doc-btn" onclick="deleteDoctor(${doc.id})" title="Delete Doctor"><i data-lucide="trash-2"></i></button>
            <span class="doc-badge">Active</span>
            <div class="doc-avatar">${initials}</div>
            <h4>${doc.name}</h4>
            <span class="doc-spec">${doc.specialization}</span>
            <div class="doc-meta">
                <div class="meta-row">
                    <i data-lucide="calendar"></i>
                    <span>${doc.availability}</span>
                </div>
                <div class="meta-row">
                    <i data-lucide="phone"></i>
                    <span>${doc.contactNumber}</span>
                </div>
                <div class="meta-row">
                    <i data-lucide="mail"></i>
                    <span>${doc.email}</span>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
    lucide.createIcons();
}

// Load Appointments
function loadAppointmentsData() {
    fetch('/api/appointments')
        .then(res => res.json())
        .then(data => {
            appointmentsCache = data;
            renderAppointments('all');
        })
        .catch(err => showToast('Error fetching appointments', 'error'));
}

// Render Appointments Table
function renderAppointments(filter) {
    const tbody = document.getElementById('appointments-tbody');
    tbody.innerHTML = '';

    let filtered = appointmentsCache;
    if (filter !== 'all') {
        filtered = appointmentsCache.filter(a => a.status === filter);
    }

    // Patient Portal filter: only see their own appointments
    if (activeRole === 'patient') {
        filtered = filtered.filter(a => a.patient.id === 1);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-secondary);">No appointments found.</td></tr>`;
        return;
    }

    filtered.forEach(appt => {
        const tr = document.createElement('tr');
        const statusSelectDisabled = activeRole === 'patient' ? 'disabled' : '';

        tr.innerHTML = `
            <td>#${appt.id}</td>
            <td><strong>${appt.patient.name}</strong></td>
            <td>${appt.doctor.name}</td>
            <td>${appt.appointmentDate}</td>
            <td>${appt.appointmentTime}</td>
            <td>${appt.reason}</td>
            <td><span class="status-pill status-${appt.status.toLowerCase()}">${appt.status}</span></td>
            <td>
                <select ${statusSelectDisabled} onchange="updateAppointmentStatus(${appt.id}, this.value)" style="padding: 4px 8px; border-radius: 4px; font-size: 13px;">
                    <option value="Scheduled" ${appt.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="Completed" ${appt.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    <option value="Cancelled" ${appt.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>
                <div class="table-actions">
                    <button class="delete" onclick="deleteAppointment(${appt.id})" title="Remove Appointment"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// Load Billing Data
function loadBillingData() {
    fetch('/api/records')
        .then(res => res.json())
        .then(data => {
            recordsCache = data;
            renderBilling();
        })
        .catch(err => showToast('Error fetching medical records', 'error'));
}

// Render Medical Records & Invoices Table
function renderBilling() {
    const tbody = document.getElementById('records-tbody');
    tbody.innerHTML = '';

    let filtered = recordsCache;
    // Patient Portal filter: only see their own medical history & invoices
    if (activeRole === 'patient') {
        filtered = recordsCache.filter(rec => rec.patient.id === 1);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-secondary);">No medical bills logged.</td></tr>`;
        return;
    }

    filtered.forEach(rec => {
        const tr = document.createElement('tr');
        const payBtn = rec.paymentStatus === 'Unpaid' 
            ? `<button class="btn btn-primary btn-sm" onclick="payBill(${rec.id})">Settle Bill</button>`
            : `<span style="color: var(--text-secondary); font-size: 13px; font-weight:600;"><i data-lucide="check-circle" style="width:14px; height:14px; color:hsl(var(--accent-emerald)); display:inline; vertical-align:middle; margin-right:4px;"></i>Settled</span>`;

        tr.innerHTML = `
            <td>#${rec.id}</td>
            <td><strong>${rec.patient.name}</strong></td>
            <td>${rec.doctor.name}</td>
            <td>${rec.treatmentDate}</td>
            <td>${rec.diagnosis}</td>
            <td>${rec.prescription}</td>
            <td><strong>$${rec.billAmount.toFixed(2)}</strong></td>
            <td><span class="status-pill status-${rec.paymentStatus.toLowerCase()}">${rec.paymentStatus}</span></td>
            <td>${payBtn}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// ==========================================
// SUBMIT HANDLERS (POST / PUT Requests)
// ==========================================

// Submit Patient Form (Create or Edit)
function handlePatientSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-patient-id').value;
    const patientData = {
        name: document.getElementById('p-name').value,
        age: parseInt(document.getElementById('p-age').value),
        gender: document.getElementById('p-gender').value,
        contactNumber: document.getElementById('p-contact').value,
        bloodGroup: document.getElementById('p-blood').value,
        address: document.getElementById('p-address').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/patients/${id}` : '/api/patients';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(data => {
        showToast(id ? 'Patient details updated' : 'Patient registered successfully', 'success');
        closeModal('patientModal');
        switchTab('patients');
    })
    .catch(err => showToast('Failed to save patient', 'error'));
}

// Submit Doctor Form
function handleDoctorSubmit(e) {
    e.preventDefault();
    const doctorData = {
        name: document.getElementById('d-name').value,
        specialization: document.getElementById('d-specialization').value,
        contactNumber: document.getElementById('d-contact').value,
        email: document.getElementById('d-email').value,
        availability: document.getElementById('d-availability').value
    };

    fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctorData)
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(data => {
        showToast('Doctor profile created successfully', 'success');
        closeModal('doctorModal');
        switchTab('doctors');
    })
    .catch(err => showToast('Failed to create doctor roster', 'error'));
}

// Submit Appointment Booking Form
function handleAppointmentSubmit(e) {
    e.preventDefault();
    const apptData = {
        patient: { id: parseInt(document.getElementById('a-patient').value) },
        doctor: { id: parseInt(document.getElementById('a-doctor').value) },
        appointmentDate: document.getElementById('a-date').value,
        appointmentTime: document.getElementById('a-time').value,
        reason: document.getElementById('a-reason').value
    };

    fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apptData)
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(data => {
        showToast('Appointment scheduled successfully', 'success');
        closeModal('appointmentModal');
        switchTab('appointments');
    })
    .catch(err => showToast('Failed to book appointment. Check details.', 'error'));
}

// Submit Medical Record Form
function handleRecordSubmit(e) {
    e.preventDefault();
    const recData = {
        patient: { id: parseInt(document.getElementById('r-patient').value) },
        doctor: { id: parseInt(document.getElementById('r-doctor').value) },
        treatmentDate: document.getElementById('r-date').value,
        billAmount: parseFloat(document.getElementById('r-bill').value),
        diagnosis: document.getElementById('r-diagnosis').value,
        prescription: document.getElementById('r-prescription').value,
        paymentStatus: document.getElementById('r-payment').value
    };

    fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recData)
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(data => {
        showToast('Treatment record logged & invoice issued', 'success');
        closeModal('recordModal');
        switchTab('billing');
    })
    .catch(err => showToast('Failed to save medical records', 'error'));
}

// ==========================================
// ACTIONS (DELETE & PUT Actions)
// ==========================================

// Edit Patient
function editPatient(id) {
    const patient = patientsCache.find(p => p.id === id);
    if (!patient) return;

    document.getElementById('patient-modal-title').innerText = 'Edit Patient Details';
    document.getElementById('edit-patient-id').value = patient.id;
    document.getElementById('p-name').value = patient.name;
    document.getElementById('p-age').value = patient.age;
    document.getElementById('p-gender').value = patient.gender;
    document.getElementById('p-contact').value = patient.contactNumber;
    document.getElementById('p-blood').value = patient.bloodGroup;
    document.getElementById('p-address').value = patient.address;

    openModal('patientModal');
}

// Delete Patient
function deletePatient(id) {
    if (!confirm('Are you sure you want to delete this patient profile? All history will be deleted.')) return;

    fetch(`/api/patients/${id}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) throw new Error();
            showToast('Patient deleted', 'info');
            loadPatientsData();
        })
        .catch(err => showToast('Could not delete patient', 'error'));
}

// Delete Doctor
function deleteDoctor(id) {
    if (!confirm('Are you sure you want to remove this practitioner?')) return;

    fetch(`/api/doctors/${id}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) throw new Error();
            showToast('Doctor profile removed', 'info');
            loadDoctorsData();
        })
        .catch(err => showToast('Could not delete doctor profile', 'error'));
}

// Cancel / Delete Appointment
function deleteAppointment(id) {
    if (!confirm('Cancel this scheduled appointment?')) return;

    fetch(`/api/appointments/${id}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) throw new Error();
            showToast('Appointment cancelled and removed', 'info');
            loadAppointmentsData();
        })
        .catch(err => showToast('Could not cancel appointment', 'error'));
}

// Update Appointment Status
function updateAppointmentStatus(id, newStatus) {
    fetch(`/api/appointments/${id}/status?status=${newStatus}`, { method: 'PUT' })
        .then(res => {
            if (!res.ok) throw new Error();
            showToast(`Appointment marked as ${newStatus}`, 'success');
            loadAppointmentsData();
        })
        .catch(err => showToast('Could not update status', 'error'));
}

// Pay Bill
function payBill(id) {
    fetch(`/api/records/${id}/pay`, { method: 'PUT' })
        .then(res => {
            if (!res.ok) throw new Error();
            showToast('Invoice settled successfully', 'success');
            loadBillingData();
        })
        .catch(err => showToast('Failed to record payment', 'error'));
}

// ==========================================
// MODAL MANAGEMENT CONTROLLER
// ==========================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('open');

    // Reset Form
    if (modalId === 'patientModal') {
        if (!document.getElementById('edit-patient-id').value) {
            document.getElementById('patient-modal-title').innerText = 'Register New Patient';
            document.getElementById('patient-form').reset();
        }
    } else {
        const form = modal.querySelector('form');
        if (form) form.reset();
    }

    // Seed drop downs for appointments/records modals
    if (modalId === 'appointmentModal' || modalId === 'recordModal') {
        populateDropdowns(modalId);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('open');
    if (modalId === 'patientModal') {
        document.getElementById('edit-patient-id').value = '';
    }
}

// Dynamic seeding of dropdown lists
function populateDropdowns(modalId) {
    const prefix = modalId === 'appointmentModal' ? 'a-' : 'r-';
    const patientSelect = document.getElementById(`${prefix}patient`);
    const doctorSelect = document.getElementById(`${prefix}doctor`);

    // Reset list
    patientSelect.innerHTML = '<option value="">Choose Patient</option>';
    doctorSelect.innerHTML = '<option value="">Choose Doctor</option>';

    // Set dates to today by default
    const dateInput = document.getElementById(`${prefix}date`);
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Fetch Patients
    fetch('/api/patients')
        .then(res => res.json())
        .then(patients => {
            patients.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.innerText = `${p.name} (Age: ${p.age})`;
                // Auto select Eleanor Vance if portal is patient
                if (activeRole === 'patient' && p.id === 1) {
                    opt.selected = true;
                }
                patientSelect.appendChild(opt);
            });
            if (activeRole === 'patient') {
                patientSelect.disabled = true;
            } else {
                patientSelect.disabled = false;
            }
        });

    // Fetch Doctors
    fetch('/api/doctors')
        .then(res => res.json())
        .then(doctors => {
            doctors.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = `${d.name} (${d.specialization})`;
                doctorSelect.appendChild(opt);
            });
        });
}

// ==========================================
// TOAST NOTIFICATIONS & CHARTS
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';

    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Trigger Animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Fade Out
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Render Chart.js financial stats
function renderRevenueChart(totalRevenue, outstandingRevenue) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const isDark = document.body.classList.contains('dark-mode');
    const labelColor = isDark ? '#94a3b8' : '#1e293b';

    // If chart exists, destroy it before rendering a new one to avoid overlay glitch
    if (revenueChart) {
        revenueChart.destroy();
    }

    if (totalRevenue === 0 && outstandingRevenue === 0) {
        // Draw blank empty chart data if nothing seeded
        totalRevenue = 1;
    }

    revenueChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Collected ($)', 'Outstanding ($)'],
            datasets: [{
                data: [totalRevenue, outstandingRevenue],
                backgroundColor: ['#10b981', '#f97316'],
                borderColor: isDark ? '#111a36' : '#ffffff',
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: labelColor,
                        font: {
                            family: 'Plus Jakarta Sans',
                            size: 13,
                            weight: '600'
                        },
                        padding: 20
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// ==========================================
// DARK / LIGHT THEME TOGGLE CONFIG
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        
        // Re-render chart to update colors
        if (statsCache && statsCache.totalRevenue !== undefined) {
            renderRevenueChart(statsCache.totalRevenue, statsCache.outstandingRevenue);
        }
    });
}

// ==========================================
// ROLE ACCESS PORTAL HANDLERS
// ==========================================
function selectRole(role) {
    localStorage.setItem('user-role', role);
    document.getElementById('portal-splash').classList.add('hidden');
    applyRole(role);
    showToast(`Welcome to ${role.toUpperCase()} Portal`, 'success');
}

function logoutRole() {
    localStorage.removeItem('user-role');
    document.getElementById('portal-splash').classList.remove('hidden');
    document.body.classList.remove('role-admin', 'role-doctor', 'role-patient');
    activeRole = '';
}

function applyRole(role) {
    activeRole = role;
    document.body.classList.remove('role-admin', 'role-doctor', 'role-patient');
    document.body.classList.add(`role-${role}`);

    const roleTitle = document.getElementById('user-role-title');
    const roleSub = document.getElementById('user-role-sub');
    const roleAvatar = document.getElementById('user-avatar-initials');

    if (role === 'admin') {
        roleTitle.innerText = 'Administrator';
        roleSub.innerText = 'Super User';
        roleAvatar.innerText = 'AD';
    } else if (role === 'doctor') {
        roleTitle.innerText = 'Dr. Evelyn Vasquez';
        roleSub.innerText = 'Cardiologist';
        roleAvatar.innerText = 'EV';
    } else if (role === 'patient') {
        roleTitle.innerText = 'Eleanor Vance';
        roleSub.innerText = 'Patient (#1)';
        roleAvatar.innerText = 'EV';
    }

    // Re-evaluate active navigation state
    const activeBtn = document.querySelector('.menu-item.active');
    if (activeBtn) {
        const tab = activeBtn.getAttribute('data-tab');
        switchTab(tab);
    } else {
        switchTab('dashboard');
    }
}
