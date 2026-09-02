package com.example.demo.controller;

import com.example.demo.service.HospitalService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final HospitalService hospitalService;

    public DashboardController(HospitalService hospitalService) {
        this.hospitalService = hospitalService;
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        return hospitalService.getDashboardStats();
    }
}
