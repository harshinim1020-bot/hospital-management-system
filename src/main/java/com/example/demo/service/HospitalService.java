package com.example.demo.service;

import com.example.demo.entity.Appointment;
import com.example.demo.entity.Doctor;
import com.example.demo.entity.MedicalRecord;
import com.example.demo.entity.Patient;
import com.example.demo.repository.AppointmentRepository;
import com.example.demo.repository.DoctorRepository;
import com.example.demo.repository.MedicalRecordRepository;
import com.example.demo.repository.PatientRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class HospitalService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;

    public HospitalService(PatientRepository patientRepository,
                           DoctorRepository doctorRepository,
                           AppointmentRepository appointmentRepository,
                           MedicalRecordRepository medicalRecordRepository) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.medicalRecordRepository = medicalRecordRepository;
    }

    @PostConstruct
    public void seedData() {
        if (doctorRepository.count() == 0) {
            // Seed Doctors
            Doctor d1 = doctorRepository.save(new Doctor("Dr. Evelyn Vasquez", "Cardiology", "+1-555-0199", "evelyn.v@medicure.com", "Mon, Wed, Fri (9:00 AM - 1:00 PM)"));
            Doctor d2 = doctorRepository.save(new Doctor("Dr. Marcus Chen", "Pediatrics", "+1-555-0142", "marcus.c@medicure.com", "Tue, Thu, Sat (10:00 AM - 4:00 PM)"));
            Doctor d3 = doctorRepository.save(new Doctor("Dr. Sarah Jenkins", "Neurology", "+1-555-0185", "sarah.j@medicure.com", "Mon, Tue, Thu (1:00 PM - 5:00 PM)"));
            Doctor d4 = doctorRepository.save(new Doctor("Dr. Alistair Vance", "Orthopedics", "+1-555-0120", "alistair.v@medicure.com", "Wed, Fri (2:00 PM - 6:00 PM)"));

            // Seed Patients
            Patient p1 = patientRepository.save(new Patient("Eleanor Vance", 34, "Female", "+1-555-0988", "O+", "742 Evergreen Terrace, Springfield"));
            Patient p2 = patientRepository.save(new Patient("Liam Gallagher", 29, "Male", "+1-555-0433", "A-", "121b Baker Street, London"));
            Patient p3 = patientRepository.save(new Patient("Sophia Rossi", 52, "Female", "+1-555-0811", "B+", "45 Via Roma, Milan"));
            Patient p4 = patientRepository.save(new Patient("Devon Harrison", 41, "Male", "+1-555-0277", "AB+", "89 Bayview Ave, San Francisco"));

            // Seed Appointments
            appointmentRepository.save(new Appointment(p1, d1, "2026-08-17", "09:30", "Scheduled", "Routine cardiovascular checkup"));
            appointmentRepository.save(new Appointment(p2, d2, "2026-08-17", "11:00", "Scheduled", "Follow-up pediatric consult"));
            appointmentRepository.save(new Appointment(p3, d3, "2026-08-18", "14:15", "Scheduled", "Neurological migraine assessment"));
            appointmentRepository.save(new Appointment(p4, d4, "2026-08-16", "15:00", "Completed", "Post-op knee inspection"));

            // Seed Medical Records / Billing
            medicalRecordRepository.save(new MedicalRecord(p1, d1, "Mild Hypertension", "Lisinopril 10mg once daily, reduce sodium intake.", "2026-08-10", 150.00, "Paid"));
            medicalRecordRepository.save(new MedicalRecord(p2, d2, "Acute Bronchitis", "Amoxicillin 500mg, rest, warm fluids.", "2026-08-12", 120.00, "Paid"));
            medicalRecordRepository.save(new MedicalRecord(p3, d3, "Chronic Migraine", "Sumatriptan 50mg, keep a headache log.", "2026-08-14", 250.00, "Unpaid"));
            medicalRecordRepository.save(new MedicalRecord(p4, d4, "Recovering ACL Tear", "Physical therapy twice weekly for 6 weeks.", "2026-08-16", 450.00, "Paid"));
        }
    }

    // ==================== PATIENT SERVICES ====================
    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    public Optional<Patient> getPatientById(Long id) {
        return patientRepository.findById(id);
    }

    public Patient savePatient(Patient patient) {
        return patientRepository.save(patient);
    }

    public Patient updatePatient(Long id, Patient updated) {
        return patientRepository.findById(id).map(p -> {
            p.setName(updated.getName());
            p.setAge(updated.getAge());
            p.setGender(updated.getGender());
            p.setContactNumber(updated.getContactNumber());
            p.setBloodGroup(updated.getBloodGroup());
            p.setAddress(updated.getAddress());
            return patientRepository.save(p);
        }).orElseThrow(() -> new RuntimeException("Patient not found with id " + id));
    }

    public void deletePatient(Long id) {
        patientRepository.deleteById(id);
    }

    // ==================== DOCTOR SERVICES ====================
    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    public Optional<Doctor> getDoctorById(Long id) {
        return doctorRepository.findById(id);
    }

    public Doctor saveDoctor(Doctor doctor) {
        return doctorRepository.save(doctor);
    }

    public void deleteDoctor(Long id) {
        doctorRepository.deleteById(id);
    }

    // ==================== APPOINTMENT SERVICES ====================
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    public Optional<Appointment> getAppointmentById(Long id) {
        return appointmentRepository.findById(id);
    }

    public Appointment saveAppointment(Appointment appointment) {
        // Verify patient and doctor exist
        Patient patient = patientRepository.findById(appointment.getPatient().getId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        Doctor doctor = doctorRepository.findById(appointment.getDoctor().getId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        if (appointment.getStatus() == null || appointment.getStatus().isEmpty()) {
            appointment.setStatus("Scheduled");
        }
        return appointmentRepository.save(appointment);
    }

    public Appointment updateAppointmentStatus(Long id, String status) {
        return appointmentRepository.findById(id).map(a -> {
            a.setStatus(status);
            return appointmentRepository.save(a);
        }).orElseThrow(() -> new RuntimeException("Appointment not found"));
    }

    public void deleteAppointment(Long id) {
        appointmentRepository.deleteById(id);
    }

    // ==================== MEDICAL RECORD SERVICES ====================
    public List<MedicalRecord> getAllRecords() {
        return medicalRecordRepository.findAll();
    }

    public MedicalRecord saveRecord(MedicalRecord record) {
        Patient patient = patientRepository.findById(record.getPatient().getId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        Doctor doctor = doctorRepository.findById(record.getDoctor().getId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        record.setPatient(patient);
        record.setDoctor(doctor);
        return medicalRecordRepository.save(record);
    }

    public MedicalRecord payBill(Long id) {
        return medicalRecordRepository.findById(id).map(r -> {
            r.setPaymentStatus("Paid");
            return medicalRecordRepository.save(r);
        }).orElseThrow(() -> new RuntimeException("Medical record not found"));
    }

    // ==================== DASHBOARD STATS ====================
    public Map<String, Object> getDashboardStats() {
        long totalPatients = patientRepository.count();
        long totalDoctors = doctorRepository.count();
        List<Appointment> appointments = appointmentRepository.findAll();
        
        long totalAppointments = appointments.size();
        long pendingAppointments = appointments.stream()
                .filter(a -> "Scheduled".equalsIgnoreCase(a.getStatus()))
                .count();

        List<MedicalRecord> records = medicalRecordRepository.findAll();
        double totalRevenue = 0.0;
        double outstandingRevenue = 0.0;

        for (MedicalRecord r : records) {
            if ("Paid".equalsIgnoreCase(r.getPaymentStatus())) {
                totalRevenue += r.getBillAmount();
            } else {
                outstandingRevenue += r.getBillAmount();
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPatients", totalPatients);
        stats.put("totalDoctors", totalDoctors);
        stats.put("totalAppointments", totalAppointments);
        stats.put("pendingAppointments", pendingAppointments);
        stats.put("totalRevenue", totalRevenue);
        stats.put("outstandingRevenue", outstandingRevenue);

        return stats;
    }
}
