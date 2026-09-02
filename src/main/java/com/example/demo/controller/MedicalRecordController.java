package com.example.demo.controller;

import com.example.demo.entity.MedicalRecord;
import com.example.demo.service.HospitalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/records")
public class MedicalRecordController {

    private final HospitalService hospitalService;

    public MedicalRecordController(HospitalService hospitalService) {
        this.hospitalService = hospitalService;
    }

    @GetMapping
    public List<MedicalRecord> getAllRecords() {
        return hospitalService.getAllRecords();
    }

    @PostMapping
    public ResponseEntity<MedicalRecord> createRecord(@RequestBody MedicalRecord record) {
        try {
            return ResponseEntity.ok(hospitalService.saveRecord(record));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PutMapping("/{id}/pay")
    public ResponseEntity<MedicalRecord> payBill(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(hospitalService.payBill(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
